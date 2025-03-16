import { Request, Response } from 'express';
import db from '../db/db';
import path from 'path';

/**
 * @desc Get all materials
 * @route GET /api/v1/pyos/materials
 * @protected
 */
export const getAllMaterials = async (req: Request, res: Response) => {
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

    const materials = await db.material.findMany({
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
      materials: materials.map((material) => ({
        id: material.id,
        name: material.name,
        type: material.type,
        size: material.size,
        uploadDate: material.uploadDate,
        subjectId: material.subjectId,
        subjectName: material.subject.name,
        subjectColor: material.subject.color,
        topicId: material.topicId,
        topicName: material.topic?.name,
        description: material.description,
        tags: material.tags.map((mt) => mt.tag.name),
        thumbnail: material.thumbnail,
        status: material.status,
        progress: material.progress,
        url: material.url,
        source: material.source,
        sourceUrl: material.sourceUrl,
        aiProcessed: material.aiProcessed,
        aiSummary: material.aiSummary,
        aiKeyPoints: material.aiKeyPoints,
      })),
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Create a new material
 * @route POST /api/v1/pyos/materials
 * @protected
 */
export const createMaterial = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      name,
      type,
      subjectId,
      topicId,
      description,
      tags,
      source,
      sourceUrl,
      aiSummary,
      aiKeyPoints,
    } = req.body;

    if (!name || !type || !subjectId || !source) {
      return void res.status(400).json({
        success: false,
        message: 'Name, type, subjectId, and source are required',
      });
    }

    const subject = await db.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      return void res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    if (topicId) {
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

    let tagArray = Array.isArray(tags) ? tags : tags ? [tags] : [];

    let size = 0;
    let url = null;
    let thumbnail = null;

    if (req.file) {
      size = req.file.size;
      url = `/uploads/${req.file.filename}`;

      thumbnail = url;
    }

    const material = await db.material.create({
      data: {
        name,
        type,
        size,
        subjectId,
        topicId: topicId || null,
        description,
        thumbnail,
        url,
        source,
        sourceUrl,
        aiProcessed: !!aiSummary,
        aiSummary,
        aiKeyPoints: aiKeyPoints || [],
        userId,
        status: req.file ? 'processing' : 'ready',
      },
    });

    if (tagArray.length > 0) {
      for (const tagName of tagArray) {
        let tag = await db.tag.findFirst({
          where: { name: tagName.toLowerCase().trim() },
        });

        if (!tag) {
          tag = await db.tag.create({
            data: { name: tagName.toLowerCase().trim() },
          });
        }

        await db.materialTag.create({
          data: {
            materialId: material.id,
            tagId: tag.id,
          },
        });
      }
    }

    return void res.status(201).json({
      success: true,
      material,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Get material by id
 * @route GET /api/v1/pyos/materials/:id
 * @protected
 */
export const getMaterialById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const material = await db.material.findFirst({
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

    if (!material) {
      return void res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    return void res.json({
      success: true,
      material: {
        ...material,
        tags: material.tags.map((mt) => mt.tag.name),
      },
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Update material
 * @route PUT /api/v1/pyos/materials/:id
 * @protected
 */
export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const {
      name,
      subjectId,
      topicId,
      description,
      tags,
      status,
      progress,
      aiSummary,
      aiKeyPoints,
    } = req.body;

    const existingMaterial = await db.material.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingMaterial) {
      return void res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    const updatedMaterial = await db.material.update({
      where: { id },
      data: {
        name: name,
        subjectId: subjectId,
        topicId: topicId,
        description: description,
        status: status,
        progress: progress,
        aiSummary: aiSummary,
        aiKeyPoints: aiKeyPoints || [],
        aiProcessed: !!aiSummary,
      },
    });

    if (tags) {
      await db.materialTag.deleteMany({
        where: { materialId: id },
      });

      let tagArray = Array.isArray(tags) ? tags : [tags];

      for (const tagName of tagArray) {
        let tag = await db.tag.findFirst({
          where: { name: tagName.toLowerCase().trim() },
        });

        if (!tag) {
          tag = await db.tag.create({
            data: { name: tagName.toLowerCase().trim() },
          });
        }

        await db.materialTag.create({
          data: {
            materialId: id,
            tagId: tag.id,
          },
        });
      }
    }

    return void res.json({
      success: true,
      material: updatedMaterial,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Delete material
 * @route DELETE /api/v1/pyos/materials/:id
 * @protected
 */
export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const material = await db.material.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!material) {
      return void res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    await db.material.delete({
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
