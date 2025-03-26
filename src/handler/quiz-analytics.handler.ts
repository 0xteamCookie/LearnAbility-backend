import { Request, Response } from 'express';
import { getQuizAnalytics, getUserQuizAnalytics } from '../services/quiz-analytics.service';

/**
 * @desc Get analytics for a specific quiz
 * @route GET /api/v1/analytics/quizzes/:id
 * @protected
 */
export const getQuizAnalyticsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id: quizId } = req.params;

    const analytics = await getQuizAnalytics(quizId, userId);

    return void res.json({
      success: true,
      analytics,
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
 * @desc Get overall quiz analytics for a user
 * @route GET /api/v1/analytics/quizzes
 * @protected
 */
export const getUserQuizAnalyticsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const analytics = await getUserQuizAnalytics(userId);

    return void res.json({
      success: true,
      analytics,
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
