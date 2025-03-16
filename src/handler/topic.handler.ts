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
    
    // Changed to query by userId directly
    const topics = await db.topic.findMany({
      where: {
        subjectId,
        userId,
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
    const userId = (req as any).userId;
    
    if (!name) {
      return void res.status(400).json({
        success: false,
        message: 'Topic name is required',
      });
    }
    
    const subject = await db.subject.findFirst({
      where: { 
        id: subjectId,
        userId, // Ensure subject belongs to user
      },
    });
    
    if (!subject) {
      return void res.status(404).json({
        success: false,
        message: 'Subject not found or not owned by user',
      });
    }
    
    const newTopic = await db.topic.create({
      data: {
        name,
        subjectId,
        userId, // Add userId to associate topic with user
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
    const userId = (req as any).userId;
    
    // Check if topic belongs to user before deleting
    const topic = await db.topic.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!topic) {
      return void res.status(404).json({
        success: false,
        message: 'Topic not found or not owned by user',
      });
    }
    
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