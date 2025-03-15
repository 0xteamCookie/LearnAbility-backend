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
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', ''],
    });
    const bufferOutput = await textSplitter.createDocuments([extractedText]);
    const output = bufferOutput.map((chunk, index) => ({
      pageContent: chunk.pageContent,
      metadata: { chunk_id: index },
    }));
    await insertEmbeddings(output, userId);
    // Update the existing record instead of creating a new one
    await db.dataSource.update({
      where: { id: dataSourceId },
      data: {
        content: extractedText,
        status: DataSourceStatus.COMPLETED,
      },
    });
  } catch (error) {
    console.error(`Error processing file ${file.originalname}:`, error);

    // Update with error status instead of creating a new record
    await db.dataSource.update({
      where: { id: dataSourceId },
      data: {
        content: `Error processing: ${(error as Error).message}`,
        status: DataSourceStatus.ERROR,
      },
    });

    throw error;
  }
};

/**
 * @desc Create a new data source session with documents
 * @route POST /api/v1/data-sources
 * @protected
 */
export const createDataSource = async (req: Request, res: Response) => {
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

/**
 * @desc Get all data sources for a user
 * @route GET /api/v1/data-sources
 * @protected
 */
export const getDataSources = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { sessionId } = req.query;

    let whereClause: any = { userId };

    if (sessionId) {
      whereClause.source = { contains: `|session:${sessionId}` };
    }

    const dataSources = await db.dataSource.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const processedSources = dataSources.map((ds) => {
      const source = ds.source.includes('|session:') ? ds.source.split('|session:')[0] : ds.source;

      return {
        id: ds.id,
        type: ds.type,
        source,
        status: ds.status,
        createdAt: ds.createdAt,

        sessionId: ds.source.includes('|session:') ? ds.source.split('|session:')[1] : null,
      };
    });

    return void res.json({
      success: true,
      dataSources: processedSources,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Get a specific data source
 * @route GET /api/v1/data-sources/:id
 * @protected
 */
export const getDataSourceById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const dataSource = await db.dataSource.findUnique({
      where: { id, userId },
    });

    if (!dataSource) {
      return void res.status(404).json({ success: false, message: 'Data source not found' });
    }

    let sessionId = null;
    let cleanSource = dataSource.source;

    if (dataSource.source.includes('|session:')) {
      const parts = dataSource.source.split('|session:');
      cleanSource = parts[0];
      sessionId = parts[1];
    }

    return void res.json({
      success: true,
      dataSource: {
        id: dataSource.id,
        type: dataSource.type,
        source: cleanSource,
        content: dataSource.content,
        status: dataSource.status,
        createdAt: dataSource.createdAt,
        sessionId,
      },
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Get status of all documents in a session
 * @route GET /api/v1/data-sources/sessions/:sessionId
 * @protected
 */
export const getSessionStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { sessionId } = req.params;

    if (!sessionId) {
      return void res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const dataSources = await db.dataSource.findMany({
      where: {
        userId,
        source: { contains: `|session:${sessionId}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completed = dataSources.filter((ds) => ds.status === DataSourceStatus.COMPLETED).length;
    const processing = dataSources.filter((ds) => ds.status === DataSourceStatus.PROCESSING).length;
    const error = dataSources.filter((ds) => ds.status === DataSourceStatus.ERROR).length;
    const total = dataSources.length;

    const sources = dataSources.map((ds) => ({
      id: ds.id,
      type: ds.type,
      source: ds.source.split('|session:')[0],
      status: ds.status,
      createdAt: ds.createdAt,
    }));

    return void res.json({
      success: true,
      sessionId,
      status: {
        completed,
        processing,
        error,
        total,
        isComplete: processing === 0,
      },
      sources,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
