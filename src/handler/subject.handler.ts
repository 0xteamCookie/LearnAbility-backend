import { Request, Response } from 'express';
import db from '../db/db';

/**
 * @desc Get all subjects for a user
 * @route GET /api/v1/pyos/subjects
 * @protected
 */
export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Changed to query by userId directly instead of through dataSources
    const subjects = await db.subject.findMany({
      where: {
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
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        color: subject.color,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
        materialCount: subject._count.dataSources,
      })),
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Create a new subject
 * @route POST /api/v1/pyos/subjects
 * @protected
 */
export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const userId = (req as any).userId;
    
    if (!name) {
      return void res.status(400).json({
        success: false,
        message: 'Subject name is required',
      });
    }
    
    const newSubject = await db.subject.create({
      data: {
        name,
        color: color || 'bg-blue-500',
        userId, // Add userId to associate subject with user
      },
    });
    
    return void res.status(201).json({
      success: true,
      subject: newSubject,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Delete a subject
 * @route DELETE /api/v1/pyos/subjects/:id
 * @protected
 */
export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    
    // Check if subject belongs to user before deleting
    const subject = await db.subject.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!subject) {
      return void res.status(404).json({
        success: false,
        message: 'Subject not found or not owned by user',
      });
    }
    
    await db.subject.delete({
      where: { id },
    });
    
    return void res.json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};