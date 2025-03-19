import { Request, Response } from 'express';
import db from '../db/db';
import { deleteEmbeddingsBySubject } from '../services/milvus';
import { generateLessonContent, extractTextFromPDF } from '../services/gemini.service';
import fs from 'fs/promises';
/**
 * @desc Upload syllabus PDF for a subject
 * @route POST /api/v1/pyos/subjects/syllabus
 * @protected
 */
export const uploadSyllabus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { subjectId } = req.body;

    if (!req.file) {
      return void res.status(400).json({
        success: false,
        message: 'No syllabus PDF file uploaded',
      });
    }

    const subject = await db.subject.findFirst({
      where: { id: subjectId, userId },
    });

    if (!subject) {
      await fs.unlink(req.file.path);

      return void res.status(404).json({
        success: false,
        message: 'Subject not found or not owned by user',
      });
    }

    if (subject.syllabusPath) {
      try {
        await fs.unlink(subject.syllabusPath);
      } catch (error) {
        console.warn('Failed to delete old syllabus file:', error);
      }
    }

    await db.subject.update({
      where: { id: subjectId },
      data: { syllabusPath: req.file.path },
    });

    return void res.status(200).json({
      success: true,
      message: 'Syllabus PDF uploaded successfully',
      syllabusPath: req.file.path,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Get syllabus PDF for a subject
 * @route GET /api/v1/pyos/subjects/:subjectId/syllabus
 * @protected
 */
export const getSyllabus = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const userId = (req as any).userId;

    const subject = await db.subject.findFirst({
      where: { id: subjectId, userId },
      select: { syllabusPath: true },
    });

    if (!subject || !subject.syllabusPath) {
      return void res.status(404).json({
        success: false,
        message: 'Subject or syllabus not found',
      });
    }

    return void res.download(subject.syllabusPath);
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subject = await db.subject.findUnique({
      where: {
        id: id,
      },
    });

    return void res.json({
      success: true,
      subject,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

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
        status: subject.status,
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
        status: 'PROCESSING',
        color: color || 'bg-blue-500',
        userId,
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

    await deleteEmbeddingsBySubject(id);

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

/**
 * @desc Generate lessons for a subject based on its syllabus PDF
 * @route GET /api/v1/pyos/subjects/:subjectId/lessons
 * @protected
 */
export const generateLessons = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { reset } = req.query;
    const userId = (req as any).userId;

    const subject = await db.subject.findFirst({
      where: { id: subjectId, userId },
      select: { syllabusPath: true, name: true, id: true },
    });

    if (!subject || !subject.syllabusPath) {
      return void res.status(404).json({
        success: false,
        message: 'Subject or syllabus not found',
      });
    }

    const existingLessons = await db.dataSource.findFirst({
      where: {
        subjectId: subject.id,
        userId,
        name: 'Generated Lessons',
        type: 'TEXT',
      },
    });

    if (existingLessons && existingLessons.content && reset !== 'true') {
      try {
        const lessons = JSON.parse(existingLessons.content);
        return void res.json({
          success: true,
          lessons,
          isNew: false,
        });
      } catch (err) {
        console.error('Error parsing stored lessons:', err);
      }
    }

    const lessons = await generateLessonContent(subject.syllabusPath, subject.id, subject.name);

    if (existingLessons) {
      await db.dataSource.update({
        where: { id: existingLessons.id },
        data: { content: JSON.stringify(lessons) },
      });
    } else {
      await db.dataSource.create({
        data: {
          name: 'Generated Lessons',
          type: 'TEXT',
          fileType: 'json',
          size: 0,
          subjectId: subject.id,
          description: `Auto-generated lessons for ${subject.name}`,
          content: JSON.stringify(lessons),
          source: 'SYSTEM',
          status: 'COMPLETED',
          userId,
        },
      });
    }
    await db.subject.update({
      where: { id: subjectId },
      data: {
        status: 'COMPLETED',
      },
    });
    return void res.json({
      success: true,
      lessons,
      isNew: true,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
