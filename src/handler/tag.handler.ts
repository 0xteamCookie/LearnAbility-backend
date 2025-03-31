import { Request, Response } from 'express';
import db from '../db/db';

/**
 * @desc Get all tags
 * @route GET /api/v1/pyos/tags
 * @protected
 */
export const getAllTags = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const tags = await db.tag.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: { dataSources: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return void res.json({
      success: true,
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        materialCount: tag._count.dataSources,
      })),
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Create a new tag
 * @route POST /api/v1/pyos/tags
 * @protected
 */
export const createTag = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = (req as any).userId;

    if (!name) {
      return void res.status(400).json({
        success: false,
        message: 'Tag name is required',
      });
    }

    let tag = await db.tag.findFirst({
      where: {
        name: name.toLowerCase().trim(),
        userId,
      },
    });

    if (tag) {
      return void res.json({
        success: true,
        tag,
        message: 'Tag already exists',
      });
    }

    tag = await db.tag.create({
      data: {
        name: name.toLowerCase().trim(),
        userId,
      },
    });

    return void res.status(201).json({
      success: true,
      tag,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Delete a tag
 * @route DELETE /api/v1/pyos/tags/:id
 * @protected
 */
export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const tag = await db.tag.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!tag) {
      return void res.status(404).json({
        success: false,
        message: 'Tag not found or not owned by user',
      });
    }

    await db.tag.delete({
      where: { id },
    });

    return void res.json({
      success: true,
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
