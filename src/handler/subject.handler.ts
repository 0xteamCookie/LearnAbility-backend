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
    
    const subjects = await db.subject.findMany({
      where: {
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