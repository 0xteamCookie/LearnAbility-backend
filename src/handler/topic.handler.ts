import { Request, Response } from 'express';
import db from '../db/db';

/**
 * @desc Get all topics for a subject
 * @route GET /api/v1/pyos/subjects/:subjectId/topics
 * @protected
 */
export const getSubjectTopics = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const userId = (req as any).userId;
    
    const topics = await db.topic.findMany({
      where: {
        subjectId,
        dataSources: {
          some: {
            userId,
          },
        },
      },
      include: {
        _count: {
          select: { dataSources: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return void res.json({
      success: true,
      topics: topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        subjectId: topic.subjectId,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
        materialCount: topic._count.dataSources,
      })),
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Create a new topic
 * @route POST /api/v1/pyos/subjects/:subjectId/topics
 * @protected
 */
export const createTopic = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return void res.status(400).json({
        success: false,
        message: 'Topic name is required',
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
    
    const newTopic = await db.topic.create({
      data: {
        name,
        subjectId,
      },
    });
    
    return void res.status(201).json({
      success: true,
      topic: newTopic,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Delete a topic
 * @route DELETE /api/v1/pyos/topics/:id
 * @protected
 */
export const deleteTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.topic.delete({
      where: { id },
    });
    
    return void res.json({
      success: true,
      message: 'Topic deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};