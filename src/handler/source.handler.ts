import { Request, Response } from 'express';
import db from '../db/db';
import { DataSourceStatus, DataSourceType } from '@prisma/client';
import { extractTextFromDocument } from '../services/gemini.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { insertEmbeddings } from '../services/milvus';
import path from 'path';

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
    console.log(output);
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
 * @desc Create a new data source
 * @route POST /api/v1/data-sources
 * @protected
 */
export const createDataSource = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      name,
      type,
      subjectId,
      topicId,
      description,
      tags,
      source = 'upload',
      sourceUrl,
      content,
    } = req.body;

    if (!name || !type) {
      return void res.status(400).json({
        success: false,
        message: 'Name and type are required',
      });
    }

    if (subjectId) {
      // Check if subject exists
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
      });

      if (!subject) {
        return void res.status(404).json({
          success: false,
          message: 'Subject not found',
        });
      }
    }

    if (topicId) {
      // Check if topic exists
      const topic = await db.topic.findUnique({
        where: { id: topicId },
      });

      if (!topic) {
        return void res.status(404).json({
          success: false,
          message: 'Topic not found',
        });
      }
    }

    let size = 0;
    let url = null;
    let thumbnail = null;
    let fileType = '';

    // Handle file upload
    if (req.file) {
      size = req.file.size;
      fileType = path.extname(req.file.originalname).replace('.', '');
      url = `/uploads/${req.file.filename}`;
      thumbnail = url; // Use the file as thumbnail (simplified)
    }

    // Create data source
    const dataSource = await db.dataSource.create({
      data: {
        name,
        type: type as DataSourceType,
        fileType,
        size,
        subjectId: subjectId || null,
        topicId: topicId || null,
        description,
        thumbnail,
        url,
        source,
        sourceUrl,
        content: content || null,
        status: req.file ? DataSourceStatus.PROCESSING : DataSourceStatus.READY,
        userId,
      },
    });

    // Process tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];

      for (const tagName of tagArray) {
        // Find or create tag
        let tag = await db.tag.findFirst({
          where: { name: tagName.toLowerCase().trim() },
        });

        if (!tag) {
          tag = await db.tag.create({
            data: { name: tagName.toLowerCase().trim() },
          });
        }

        // Create association
        await db.dataSourceTag.create({
          data: {
            dataSourceId: dataSource.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Start processing file if uploaded
    if (req.file) {
      processFileAsync(req.file, dataSource.id, userId).catch((error) => {
        console.error(`Background processing error for ${req.file?.originalname}:`, error);
      });
    }

    return void res.status(201).json({
      success: true,
      material: dataSource,
    });
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
 * @desc Get all data sources/materials
 * @route GET /api/v1/data-sources
 * @protected
 */
export const getAllDataSources = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { subjectId, topicId, tags, type, status } = req.query;

    const whereClause: any = { userId };

    if (subjectId) whereClause.subjectId = subjectId as string;
    if (topicId) whereClause.topicId = topicId as string;
    if (type) whereClause.type = type as string;
    if (status) whereClause.status = status as string;

    if (tags) {
      whereClause.tags = {
        some: {
          tag: {
            name: {
              in: Array.isArray(tags) ? tags : [tags as string],
            },
          },
        },
      };
    }

    const dataSources = await db.dataSource.findMany({
      where: whereClause,
      include: {
        subject: true,
        topic: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { uploadDate: 'desc' },
    });

    return void res.json({
      success: true,
      materials: dataSources.map((dataSource) => ({
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type,
        size: dataSource.size,
        uploadDate: dataSource.uploadDate,
        subjectId: dataSource.subjectId,
        subjectName: dataSource.subject?.name,
        subjectColor: dataSource.subject?.color,
        topicId: dataSource.topicId,
        topicName: dataSource.topic?.name,
        description: dataSource.description,
        tags: dataSource.tags.map((dt) => dt.tag.name),
        thumbnail: dataSource.thumbnail,
        status: dataSource.status,
        progress: dataSource.progress,
        url: dataSource.url,
        source: dataSource.source,
        sourceUrl: dataSource.sourceUrl,
        contentPreview: dataSource.content ? dataSource.content.substring(0, 150) + '...' : null,
        hasContent: !!dataSource.content,
      })),
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Get data source by id
 * @route GET /api/v1/data-sources/:id
 * @protected
 */
export const getDataSourceById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const dataSource = await db.dataSource.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        subject: true,
        topic: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!dataSource) {
      return void res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    return void res.json({
      success: true,
      material: {
        ...dataSource,
        tags: dataSource.tags.map((dt) => dt.tag.name),
      },
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Delete data source
 * @route DELETE /api/v1/data-sources/:id
 * @protected
 */
export const deleteDataSource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const dataSource = await db.dataSource.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!dataSource) {
      return void res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    // Delete related tags first
    await db.dataSourceTag.deleteMany({
      where: { dataSourceId: id },
    });

    // Delete the data source
    await db.dataSource.delete({
      where: { id },
    });

    return void res.json({
      success: true,
      message: 'Material deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
