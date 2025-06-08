import { Request, Response } from 'express';
import db from '../db/db';
import { deleteEmbeddingsBySubject } from '../services/milvus';
import { generateLessonContent, generateLessonContentSpecific } from '../services/gemini.service';
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

    let isNew = true;
    let lessons = [];

    if (existingLessons && existingLessons.content && reset !== 'true') {
      try {
        lessons = JSON.parse(existingLessons.content);
        isNew = false;
      } catch (err) {
        console.error('Error parsing stored lessons:', err);
        isNew = true;
      }
    }

    if (isNew || reset === 'true') {
      lessons = await generateLessonContent(subject.syllabusPath, subject.id, subject.name);

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
    }

    if (lessons && lessons.length > 0) {
      const existingLessonRecords = await db.lesson.findMany({
        where: { subjectId: subject.id, userId },
        select: { id: true, title: true },
      });

      const existingLessonMap = new Map();
      existingLessonRecords.forEach((lesson) => {
        existingLessonMap.set(lesson.title, lesson.id);
      });

      const lessonIdMap = new Map();

      for (const lesson of lessons) {
        const existingId = existingLessonMap.get(lesson.title);

        if (existingId) {
          const updatedLesson = await db.lesson.update({
            where: { id: existingId },
            data: {
              title: lesson.title,
              description: lesson.description,
              duration: lesson.duration || '30 min',
              level: lesson.level || 'Beginner',
              order: lesson.order || 1,
              image: lesson.image,
            },
          });
          lessonIdMap.set(lesson.id, updatedLesson.id);
        } else {
          const newLesson = await db.lesson.create({
            data: {
              title: lesson.title,
              description: lesson.description,
              duration: lesson.duration || '30 min',
              level: lesson.level || 'Beginner',
              order: lesson.order || 1,
              image: lesson.image,
              subjectId: subject.id,
              userId,
            },
          });
          lessonIdMap.set(lesson.id, newLesson.id);
        }
      }

      for (const lesson of lessons) {
        if (lesson.prerequisites && lesson.prerequisites.length > 0) {
          const dbLessonId = lessonIdMap.get(lesson.id);

          if (dbLessonId) {
            const prerequisiteIds = lesson.prerequisites
              .map((prereqId: string | number) => lessonIdMap.get(prereqId))
              .filter((id: string | undefined): id is string => !!id);

            if (prerequisiteIds.length > 0) {
              await db.lesson.update({
                where: { id: dbLessonId },
                data: {
                  prerequisites: {
                    connect: prerequisiteIds.map((id: string) => ({ id })),
                  },
                },
              });
            }
          }
        }
      }

      const dbLessons = await db.lesson.findMany({
        where: { subjectId: subject.id, userId },
        include: {
          prerequisites: {
            select: { id: true, title: true },
          },
        },
        orderBy: { order: 'asc' },
      });

      await db.subject.update({
        where: { id: subjectId },
        data: {
          status: 'COMPLETED',
        },
      });

      return void res.json({
        success: true,
        lessons: dbLessons,
        rawLessons: lessons,
        isNew,
      });
    }

    return void res.status(500).json({
      success: false,
      message: 'Failed to process lessons',
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Generate detailed content for a lesson
 * @route GET /api/v1/pyos/:subjectId/:lessonId
 * @protected
 */
export const generateLessonsC = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { reset } = req.query;
    const userId = (req as any).userId;

    // Fetch user details to get language preference
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });

    // Determine target language: user's preference or default to 'en'
    const targetLanguage = user?.language || 'en';

    const lesson = await db.lesson.findFirst({
      where: { id: lessonId },
      select: { id: true, title: true, description: true, subjectId: true },
    });

    if (!lesson) {
      return void res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const existingContent = await db.dataSource.findFirst({
      where: {
        lessonId: lessonId,
        userId,
        name: 'Generated Lesson Content',
        type: 'TEXT',
      },
    });

    if (existingContent && existingContent.content && reset !== 'true') {
      try {
        const content = JSON.parse(existingContent.content);
        return void res.json({
          success: true,
          content,
          isNew: false,
        });
      } catch (err) {
        console.error('Error parsing stored lesson content:', err);
      }
    }

    const detailedContent = await generateLessonContentSpecific(
      lesson.id,
      lesson.title,
      lesson.description,
      targetLanguage
    );

    if (existingContent) {
      await db.dataSource.update({
        where: { id: existingContent.id },
        data: { content: JSON.stringify(detailedContent) },
      });
    } else {
      await db.dataSource.create({
        data: {
          name: 'Generated Lesson Content',
          type: 'TEXT',
          fileType: 'json',
          size: 0,
          lessonId: lesson.id,
          subjectId: lesson.subjectId,
          description: `Auto-generated detailed content for ${lesson.title}`,
          content: JSON.stringify(detailedContent),
          source: 'SYSTEM',
          status: 'COMPLETED',
          userId,
        },
      });
    }

    return void res.json({
      success: true,
      content: detailedContent,
      isNew: true,
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
