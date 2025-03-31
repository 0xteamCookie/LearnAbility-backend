import { Request, Response } from 'express';
import db from '../db/db';
import {
  updateStudyStreak,
  incrementCompletedLessons,
  updateWeeklyProgress,
  updateQuizAverage,
  updateLastStudiedAt,
  getOrCreateUserStats,
} from '../services/stats.service';

/**
 * @desc Get user stats
 * @route GET /api/v1/stats
 * @protected
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const userStats = await getOrCreateUserStats(userId);

    return void res.json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return void res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};

/**
 * @desc Mark a lesson as completed
 * @route POST /api/v1/stats/lesson/:lessonId/complete
 * @protected
 */
export const markLessonCompleted = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { lessonId } = req.params;

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return void res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    await db.lesson.update({
      where: { id: lessonId },
      data: { progress: 100 },
    });

    await incrementCompletedLessons(userId);

    return void res.json({
      success: true,
      message: 'Lesson marked as completed',
    });
  } catch (error) {
    console.error('Error marking lesson as completed:', error);
    return void res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};

/**
 * @desc Track study activity
 * @route POST /api/v1/stats/track
 * @protected
 */
export const trackStudyActivity = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { activityType, duration } = req.body;

    await updateLastStudiedAt(userId);

    if (duration && typeof duration === 'number') {
      await updateWeeklyProgress(userId, Math.floor(duration / 5));
    }

    return void res.json({
      success: true,
      message: 'Study activity tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking study activity:', error);
    return void res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};

/**
 * @desc Update quiz score
 * @route POST /api/v1/stats/quiz
 * @protected
 */
export const updateQuizScore = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { quizScore } = req.body;

    if (typeof quizScore !== 'number' || quizScore < 0 || quizScore > 100) {
      return void res.status(400).json({
        success: false,
        message: 'Invalid quiz score. Must be a number between 0 and 100.',
      });
    }

    await updateQuizAverage(userId, quizScore);

    return void res.json({
      success: true,
      message: 'Quiz score recorded successfully',
    });
  } catch (error) {
    console.error('Error updating quiz score:', error);
    return void res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};
