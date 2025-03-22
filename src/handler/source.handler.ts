import { Request, Response } from 'express';
import db from '../db/db';
import { DataSourceStatus, DataSourceType } from '@prisma/client';
import { extractTextFromDocument } from '../services/gemini.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { insertEmbeddings, deleteEmbeddingsByDataSource } from '../services/milvus';
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

    const dataSource = await db.dataSource.findUnique({
      where: { id: dataSourceId },
      select: { subjectId: true},
    });

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
    await insertEmbeddings(output, userId, {
      subjectId: dataSource?.subjectId || undefined,
      dataSourceId,
    });

    await db.dataSource.update({
      where: { id: dataSourceId },
      data: {
        content: extractedText,
        status: DataSourceStatus.COMPLETED,
      },
    });
  } catch (error) {
    console.error(`Error processing file ${file.originalname}:`, error);

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
      subjectId,
      description,
      tags,
      source = 'upload',
      sourceUrl,
      content,
    } = req.body;

    if (subjectId) {
      const subject = await db.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return void res.status(404).json({
          success: false,
          message: 'Subject not found',
        });
      }
    }

    const getFileType = (filename: string): DataSourceType => {
      const ext = path.extname(filename).toLowerCase();

      if (['.pdf'].includes(ext)) return DataSourceType.PDF;
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return DataSourceType.IMAGE;
      if (['.doc', '.docx', '.txt', '.rtf'].includes(ext)) return DataSourceType.DOCS;

      return DataSourceType.TEXT;
    };

    if (req.files && Array.isArray(req.files)) {
      const files = req.files as Express.Multer.File[];
      const materials = [];

      for (const file of files) {
        const name = req.body.name || file.originalname;
        const type = req.body.type || getFileType(file.originalname);
        const fileType = path.extname(file.originalname).replace('.', '');
        const size = file.size;
        const url = `/uploads/${file.filename}`;
        const thumbnail = url;

        const dataSource = await db.dataSource.create({
          data: {
            name,
            type: type as DataSourceType,
            fileType,
            size,
            subjectId: subjectId || null,
            description,
            thumbnail,
            url,
            source,
            sourceUrl,
            content: content || null,
            status: DataSourceStatus.PROCESSING,
            userId,
          },
        });

        if (tags) {
          const tagArray = Array.isArray(tags) ? tags : [tags];
          for (const tagName of tagArray) {
            let tag = await db.tag.findFirst({
              where: {
                name: tagName.toLowerCase().trim(),
                userId,
              },
            });

            if (!tag) {
              tag = await db.tag.create({
                data: {
                  name: tagName.toLowerCase().trim(),
                  userId,
                },
              });
            }

            await db.dataSourceTag.create({
              data: { dataSourceId: dataSource.id, tagId: tag.id },
            });
          }
        }

        processFileAsync(file, dataSource.id, userId).catch((error) => {
          console.error(`Background processing error for ${file.originalname}:`, error);
        });

        materials.push(dataSource);
      }

      return void res.status(201).json({
        success: true,
        message: `Successfully uploaded ${materials.length} files`,
        materials,
      });
    } else if (req.file) {
      const file = req.file;
      const name = req.body.name || file.originalname;
      const type = req.body.type || getFileType(file.originalname);
      const fileType = path.extname(file.originalname).replace('.', '');
      const size = file.size;
      const url = `/uploads/${file.filename}`;
      const thumbnail = url;

      const dataSource = await db.dataSource.create({
        data: {
          name,
          type: type as DataSourceType,
          fileType,
          size,
          subjectId: subjectId || null,
          description,
          thumbnail,
          url,
          source,
          sourceUrl,
          content: content || null,
          status: DataSourceStatus.PROCESSING,
          userId,
        },
      });

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        for (const tagName of tagArray) {
          let tag = await db.tag.findFirst({
            where: {
              name: tagName.toLowerCase().trim(),
              userId,
            },
          });

          if (!tag) {
            tag = await db.tag.create({
              data: {
                name: tagName.toLowerCase().trim(),
                userId,
              },
            });
          }

          await db.dataSourceTag.create({
            data: { dataSourceId: dataSource.id, tagId: tag.id },
          });
        }
      }

      console.log('Processing file:', file.originalname);
      processFileAsync(file, dataSource.id, userId).catch((error) => {
        console.error(`Background processing error for ${file.originalname}:`, error);
      });

      return void res.status(201).json({
        success: true,
        material: dataSource,
      });
    } else if (content) {
      if (!req.body.name || !req.body.type) {
        return void res.status(400).json({
          success: false,
          message: 'Name and type are required when providing direct content',
        });
      }

      const dataSource = await db.dataSource.create({
        data: {
          name: req.body.name,
          type: req.body.type as DataSourceType,
          fileType: '',
          size: 0,
          subjectId: subjectId || null,
          description,
          thumbnail: null,
          url: null,
          source,
          sourceUrl,
          content,
          status: DataSourceStatus.READY,
          userId,
        },
      });

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        for (const tagName of tagArray) {
          let tag = await db.tag.findFirst({
            where: {
              name: tagName.toLowerCase().trim(),
              userId,
            },
          });

          if (!tag) {
            tag = await db.tag.create({
              data: {
                name: tagName.toLowerCase().trim(),
                userId,
              },
            });
          }

          await db.dataSourceTag.create({
            data: { dataSourceId: dataSource.id, tagId: tag.id },
          });
        }
      }

      return void res.status(201).json({
        success: true,
        material: dataSource,
      });
    } else {
      return void res.status(400).json({
        success: false,
        message: 'Either a file or content must be provided',
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
 * @desc Get all data sources/materials
 * @route GET /api/v1/data-sources
 * @protected
 */
export const getAllDataSources = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { subjectId, tags, type, status } = req.query;

    const whereClause: any = { userId };

    if (subjectId) whereClause.subjectId = subjectId as string;
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
        fileType: dataSource.fileType,
        size: dataSource.size,
        uploadDate: dataSource.uploadDate,
        subjectId: dataSource.subjectId,
        subjectName: dataSource.subject?.name,
        subjectColor: dataSource.subject?.color,
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

    await db.dataSourceTag.deleteMany({
      where: { dataSourceId: id },
    });

    await deleteEmbeddingsByDataSource(id);

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
