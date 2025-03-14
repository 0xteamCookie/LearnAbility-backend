import { Request, Response } from 'express';
import db from '../db/db';
import { DataSourceStatus, DataSourceType } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { extractTextFromImage, extractTextFromPDF } from '../services/vision.service';

/**
 * @desc Create a new data source (handles both direct content and file uploads)
 * @route POST /api/v1/data-sources
 * @protected
 */
export const createDataSource = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (req.file) {
      const file = req.file;
      const filePath = file.path;
      let extractedText = '';

      try {
        if (file.mimetype === 'application/pdf') {
          extractedText = await extractTextFromPDF(filePath);
        } else if (file.mimetype.startsWith('image/')) {
          extractedText = await extractTextFromImage(filePath);
        }

        const dataSource = await db.dataSource.create({
          data: {
            type: DataSourceType.TEXT,
            source: file.originalname,
            content: extractedText,
            status: DataSourceStatus.COMPLETED,
            userId,
          },
        });

        return void res.status(201).json({
          success: true,
          message: 'Document processed successfully',
          dataSource: {
            id: dataSource.id,
            type: dataSource.type,
            source: dataSource.source,
            status: dataSource.status,
          },
        });
      } catch (error) {
        console.error('Error processing file:', error);
        return void res.status(500).json({
          success: false,
          message: 'Failed to process uploaded file',
        });
      }
    } else {
      const { type, source } = req.body;

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

      const dataSource = await db.dataSource.create({
        data: {
          type,
          source,
          content: req.body.content || null,
          status: DataSourceStatus.PROCESSING,
          userId,
        },
      });

      await db.dataSource.update({
        where: { id: dataSource.id },
        data: { status: DataSourceStatus.COMPLETED },
      });

      return void res.status(201).json({
        success: true,
        message: 'Data source created successfully',
        dataSource: {
          id: dataSource.id,
          type: dataSource.type,
          source: dataSource.source,
          status: DataSourceStatus.COMPLETED,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
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

    const dataSources = await db.dataSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return void res.json({
      success: true,
      dataSources: dataSources.map((ds) => ({
        id: ds.id,
        type: ds.type,
        source: ds.source,
        status: ds.status,
        createdAt: ds.createdAt,
      })),
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

    return void res.json({
      success: true,
      dataSource: {
        id: dataSource.id,
        type: dataSource.type,
        source: dataSource.source,
        content: dataSource.content,
        status: dataSource.status,
        createdAt: dataSource.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
