import { Request, Response } from 'express';
import db from '../db/db';
import { generateQuiz, saveQuiz, recordQuizAttempt } from '../services/quiz.service';

/**
 * @desc Get all quizzes for a user
 * @route GET /api/v1/quizzes
 * @protected
 */
export const getAllQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { subjectId, topicId, lessonId } = req.query;

    const whereClause: any = { userId };

    if (subjectId) whereClause.subjectId = subjectId as string;
    if (topicId) whereClause.topicId = topicId as string;
    if (lessonId) whereClause.lessonId = lessonId as string;

    const quizzes = await db.quiz.findMany({
      where: whereClause,
      include: {
        subject: {
          select: { name: true, color: true },
        },
        topic: {
          select: { name: true },
        },
        lesson: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return void res.json({
      success: true,
      quizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        questionCount: quiz.questionCount,
        subjectName: quiz.subject?.name,
        subjectColor: quiz.subject?.color,
        topicName: quiz.topic?.name,
        lessonTitle: quiz.lesson?.title,
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
      })),
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

/**
 * @desc Get a specific quiz by ID
 * @route GET /api/v1/quizzes/:id
 * @protected
 */
export const getQuizById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { includeAttempts } = req.query;

    const quiz = await db.quiz.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        subject: {
          select: { name: true, color: true },
        },
        topic: {
          select: { name: true },
        },
        lesson: {
          select: { title: true },
        },
      },
    });

    if (!quiz) {
      return void res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    if (includeAttempts !== 'true' && quiz.attempts) {
      quiz.attempts = [];
    }

    return void res.json({
      success: true,
      quiz,
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

/**
 * @desc Generate a quiz using AI
 * @route POST /api/v1/quizzes/generate
 * @protected
 */
export const generateQuizHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      subjectId,
      topicId,
      lessonId,
      difficulty,
      questionCount,
      title,
      description,
      saveToDb = false,
    } = req.body;

    if (!subjectId) {
      return void res.status(400).json({
        success: false,
        message: 'Subject ID is required',
      });
    }

    const subject = await db.subject.findFirst({
      where: {
        id: subjectId,
        userId,
      },
    });

    if (!subject) {
      return void res.status(404).json({
        success: false,
        message: 'Subject not found or not owned by user',
      });
    }

    const quizData = await generateQuiz(subjectId, {
      topicId,
      lessonId,
      difficulty,
      questionCount,
      title,
      description,
    });

    if (saveToDb) {
      const savedQuiz = await saveQuiz(quizData, userId, subjectId, topicId, lessonId);
      return void res.json({
        success: true,
        quiz: savedQuiz,
        message: 'Quiz generated and saved successfully',
      });
    }

    return void res.json({
      success: true,
      quiz: quizData,
      message: 'Quiz generated successfully',
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({
      success: false,
      message: 'Failed to generate quiz',
      error: (error as Error).message,
    });
  }
};

/**
 * @desc Create a quiz manually
 * @route POST /api/v1/quizzes
 * @protected
 */
export const createQuiz = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      title,
      description,
      difficulty,
      timeLimit,
      passingScore,
      subjectId,
      topicId,
      lessonId,
      questions,
    } = req.body;

    if (!title || !subjectId) {
      return void res.status(400).json({
        success: false,
        message: 'Title and subjectId are required',
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return void res.status(400).json({
        success: false,
        message: 'Questions must be a non-empty array',
      });
    }

    const quiz = await db.quiz.create({
      data: {
        title,
        description: description || '',
        difficulty: difficulty || 'Medium',
        questionCount: questions.length,
        timeLimit,
        passingScore: passingScore || 70,
        questions,
        attempts: [],
        userId,
        subjectId,
        topicId: topicId || null,
        lessonId: lessonId || null,
      },
    });

    return void res.status(201).json({
      success: true,
      quiz,
      message: 'Quiz created successfully',
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

/**
 * @desc Delete a quiz
 * @route DELETE /api/v1/quizzes/:id
 * @protected
 */
export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const quiz = await db.quiz.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!quiz) {
      return void res.status(404).json({
        success: false,
        message: 'Quiz not found or not owned by user',
      });
    }

    await db.quiz.delete({
      where: { id },
    });

    return void res.json({
      success: true,
      message: 'Quiz deleted successfully',
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

/**
 * @desc Submit a quiz attempt
 * @route POST /api/v1/quizzes/:id/attempt
 * @protected
 */
export const submitQuizAttempt = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id: quizId } = req.params;
    const { answers, startedAt } = req.body;

    if (!Array.isArray(answers)) {
      return void res.status(400).json({
        success: false,
        message: 'Answers must be an array',
      });
    }

    const attempt = await recordQuizAttempt(
      quizId,
      userId,
      answers,
      startedAt ? new Date(startedAt) : new Date()
    );

    return void res.json({
      success: true,
      attempt,
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
