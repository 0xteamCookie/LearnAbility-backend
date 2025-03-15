import { Request, Response } from 'express';
import db from '../db/db';
import { DataSourceStatus, DataSourceType } from '@prisma/client';
import { extractTextFromDocument } from '../services/gemini.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { insertEmbeddings } from '../services/milvus';

/**
 * Process a file asynchronously and update the existing record
 */
const processFileAsync = async (
  file: Express.Multer.File,
  dataSourceId: string,
  userId: string,
  sessionId?: string
): Promise<void> => {
  try {
    const filePath = file.path;

    // Extract text from document
    const extractedText = await extractTextFromDocument(filePath);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { syllabusContent: true }, // Fetch existing content
    });

    await db.user.update({
      where: { id: userId },
      data: {
        syllabusContent: (user?.syllabusContent || '') + extractedText,
      },
    });
  } catch (error) {
    console.error(`Error processing file ${file.originalname}:`, error);
    throw error;
  }
};

/**
 * @desc Create a new data source session with documents
 * @route POST /api/v1/data-sources
 * @protected
 */
export const uploadSyllabus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const sessionId = req.body.sessionId || `session-${Date.now()}`;

    // Handle multiple files
    if (req.files && Array.isArray(req.files)) {
      const files = req.files as Express.Multer.File[];

      // Create initial records with PROCESSING status
      const dataSourceIds = await Promise.all(
        files.map(async (file) => {
          const initialDataSource = await db.dataSource.create({
            data: {
              type: DataSourceType.TEXT,
              source: `${file.originalname}|session:${sessionId}`,
              content: null,
              status: DataSourceStatus.PROCESSING,
              userId,
            },
          });
          return initialDataSource.id;
        })
      );

      // Start processing each file in background
      for (const [index, file] of files.entries()) {
        const dataSourceId = dataSourceIds[index];

        // Process file and update the same record (don't create new one)
        processFileAsync(file, dataSourceId, userId, sessionId).catch((error) => {
          console.error(`Background processing error for ${file.originalname}:`, error);
        });
      }

      return void res.status(202).json({
        success: true,
        message: `Processing ${files.length} documents in the background`,
        dataSourceIds,
        sessionId,
      });
    }
    // Handle single file
    else if (req.file) {
      const file = req.file;

      // Create initial record with PROCESSING status
      const dataSource = await db.dataSource.create({
        data: {
          type: DataSourceType.TEXT,
          source: `${file.originalname}|session:${sessionId}`,
          content: null,
          status: DataSourceStatus.PROCESSING,
          userId,
        },
      });

      // Process file and update the same record
      processFileAsync(file, dataSource.id, userId, sessionId).catch((error) => {
        console.error(`Background processing error for ${file.originalname}:`, error);
      });

      return void res.status(202).json({
        success: true,
        message: 'Document processing started',
        dataSourceId: dataSource.id,
        sessionId,
      });
    }
    // Handle direct JSON input (no files)
    else {
      const { type, source, content } = req.body;

      if (!type || !source) {
        return void res.status(400).json({
          success: false,
          message: 'Type and source are required',
        });
      }

      if (!Object.values(DataSourceType).includes(type)) {
        return void res.status(400).json({
          success: false,
          message: `Type must be one of: ${Object.values(DataSourceType).join(', ')}`,
        });
      }

      // Create data source directly with COMPLETED status
      const dataSource = await db.dataSource.create({
        data: {
          type,
          source: sessionId ? `${source}|session:${sessionId}` : source,
          content: content || null,
          status: DataSourceStatus.COMPLETED,
          userId,
        },
      });

      return void res.status(201).json({
        success: true,
        message: 'Data source created successfully',
        dataSourceId: dataSource.id,
        sessionId,
      });
    }
  } catch (error) {
    console.error(error);
    return void res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: (error as Error).message,
    });
  }
};
