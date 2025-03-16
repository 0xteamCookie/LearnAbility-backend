import { Request, Response } from 'express';
import db from '../db/db';
import { DataSourceStatus, DataSourceType } from '@prisma/client';
import { extractTextFromDocument } from '../services/gemini.service';
import path from 'path';

/**
 * Process a syllabus file asynchronously and update user's syllabus content
 */
const processFileAsync = async (
  file: Express.Multer.File,
  dataSourceId: string,
  userId: string,
  sessionId?: string
): Promise<void> => {
  try {
    const filePath = file.path;

    const extractedText = await extractTextFromDocument(filePath);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { syllabusContent: true },
    });

    await db.user.update({
      where: { id: userId },
      data: {
        syllabusContent: (user?.syllabusContent || '') + extractedText,
      },
    });

    await db.dataSource.update({
      where: { id: dataSourceId },
      data: {
        status: DataSourceStatus.COMPLETED,
        content: extractedText,
      },
    });
  } catch (error) {
    console.error(`Error processing file ${file.originalname}:`, error);

    await db.dataSource.update({
      where: { id: dataSourceId },
      data: {
        status: DataSourceStatus.ERROR,
        content: `Error processing: ${(error as Error).message}`,
      },
    });

    throw error;
  }
};

/**
 * @desc Upload syllabus documents and process them
 * @route POST /api/v1/syllabus
 * @protected
 */
export const uploadSyllabus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const sessionId = req.body.sessionId || `session-${Date.now()}`;
    const { type, source, content, description, tags } = req.body;

    const getFileType = (filename: string): DataSourceType => {
      const ext = path.extname(filename).toLowerCase();

      if (['.pdf'].includes(ext)) return DataSourceType.PDF;
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return DataSourceType.IMAGE;
      if (['.doc', '.docx', '.txt', '.rtf'].includes(ext)) return DataSourceType.DOCS;
      if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) return DataSourceType.VIDEO;
      if (['.mp3', '.wav', '.ogg'].includes(ext)) return DataSourceType.AUDIO;

      return DataSourceType.TEXT;
    };

    if (req.files && Array.isArray(req.files)) {
      const files = req.files as Express.Multer.File[];
      const dataSources = [];

      for (const file of files) {
        const fileType = path.extname(file.originalname).replace('.', '');
        const detectedType = getFileType(file.originalname);
        const size = file.size;
        const url = `/uploads/${file.filename}`;
        const thumbnail = url;

        const dataSource = await db.dataSource.create({
          data: {
            name: file.originalname || `Syllabus Document ${Date.now()}`,
            fileType,
            type: detectedType,
            size,
            source: `${file.originalname}|session:${sessionId}`,
            sourceUrl: null,
            url,
            thumbnail,
            description,
            content: null,
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
                userId, // Only check for existing tags for this user
              },
            });
        
            if (!tag) {
              tag = await db.tag.create({
                data: { 
                  name: tagName.toLowerCase().trim(),
                  userId, // Associate tag with user
                },
              });
            }
        
            await db.dataSourceTag.create({
              data: { dataSourceId: dataSource.id, tagId: tag.id },
            });
          }
        }

        processFileAsync(file, dataSource.id, userId, sessionId).catch((error) => {
          console.error(`Background processing error for ${file.originalname}:`, error);
        });

        dataSources.push(dataSource);
      }

      return void res.status(202).json({
        success: true,
        message: `Processing ${files.length} syllabus documents in the background`,
        dataSources,
        sessionId,
      });
    } else if (req.file) {
      const file = req.file;
      const fileType = path.extname(file.originalname).replace('.', '');
      const detectedType = getFileType(file.originalname);
      const size = file.size;
      const url = `/uploads/${file.filename}`;
      const thumbnail = url;

      const dataSource = await db.dataSource.create({
        data: {
          name: file.originalname || `Syllabus Document ${Date.now()}`,
          fileType,
          type: detectedType,
          size,
          source: `${file.originalname}|session:${sessionId}`,
          sourceUrl: null,
          url,
          thumbnail,
          description,
          content: null,
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
              userId, // Only check for existing tags for this user
            },
          });
      
          if (!tag) {
            tag = await db.tag.create({
              data: { 
                name: tagName.toLowerCase().trim(),
                userId, // Associate tag with user
              },
            });
          }
      
          await db.dataSourceTag.create({
            data: { dataSourceId: dataSource.id, tagId: tag.id },
          });
        }
      }

      console.log('Processing syllabus file:', file.originalname);
      processFileAsync(file, dataSource.id, userId, sessionId).catch((error) => {
        console.error(`Background processing error for ${file.originalname}:`, error);
      });

      return void res.status(202).json({
        success: true,
        message: 'Syllabus document processing started',
        dataSource,
        sessionId,
      });
    } else if (content) {
      if (!type) {
        return void res.status(400).json({
          success: false,
          message: 'Type is required when providing direct content',
        });
      }

      if (!Object.values(DataSourceType).includes(type as DataSourceType)) {
        return void res.status(400).json({
          success: false,
          message: `Type must be one of: ${Object.values(DataSourceType).join(', ')}`,
        });
      }

      const documentName = source || `Manual Syllabus ${Date.now()}`;

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { syllabusContent: true },
      });

      await db.user.update({
        where: { id: userId },
        data: {
          syllabusContent: (user?.syllabusContent || '') + content,
        },
      });

      const dataSource = await db.dataSource.create({
        data: {
          name: documentName,
          fileType: '',
          type: type as DataSourceType,
          size: content.length,
          source: sessionId ? `${documentName}|session:${sessionId}` : documentName,
          sourceUrl: null,
          url: null,
          thumbnail: null,
          description,
          content,
          status: DataSourceStatus.COMPLETED,
          userId,
        },
      });

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        for (const tagName of tagArray) {
          let tag = await db.tag.findFirst({
            where: { 
              name: tagName.toLowerCase().trim(),
              userId, // Only check for existing tags for this user
            },
          });
      
          if (!tag) {
            tag = await db.tag.create({
              data: { 
                name: tagName.toLowerCase().trim(),
                userId, // Associate tag with user
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
        message: 'Syllabus content added successfully',
        dataSource,
        sessionId,
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
 * @desc Get syllabus content for the user
 * @route GET /api/v1/syllabus
 * @protected
 */
export const getSyllabusContent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { syllabusContent: true },
    });

    if (!user) {
      return void res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const dataSources = await db.dataSource.findMany({
      where: {
        userId,
        source: {
          contains: 'session:',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return void res.json({
      success: true,
      syllabusContent: user.syllabusContent || '',
      dataSources,
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
