import { Request, Response } from 'express';
import db from '../db/db';
import { 
  updateStudyStreak, 
  incrementCompletedLessons, 
  updateWeeklyProgress,
  updateQuizAverage,
  updateLastStudiedAt
} from '../services/stats.service';

export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userStats = await db.userStats.findUnique({
      where: { userId },
    });
    if (!userStats) {
      return void res.json({
        message: 'User stats not found',
      });
    }
    return void res.json({
      data: userStats,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return void res.status(500).json({
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};

export const markLessonCompleted = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { lessonId } = req.params;
    
    // Verify lesson exists
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId }
    });
    
    if (!lesson) {
      return void res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }
    
    // Update lesson progress to 100
    await db.lesson.update({
      where: { id: lessonId },
      data: { progress: 100 }
    });
    
    // Increment completed lessons count
    await incrementCompletedLessons(userId);
    
    return void res.json({
      success: true,
      message: 'Lesson marked as completed'
    });
  } catch (error) {
    console.error('Error marking lesson as completed:', error);
    return void res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message
    });
  }
};

export const trackStudyActivity = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { activityType, duration } = req.body;
    
    // Update last studied timestamp
    await updateLastStudiedAt(userId);
    
    // Update weekly progress based on duration (in minutes)
    if (duration && typeof duration === 'number') {
      await updateWeeklyProgress(userId, Math.floor(duration / 5)); // 1 progress point per 5 minutes
    }
    
    return void res.json({
      success: true,
      message: 'Study activity tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking study activity:', error);
    return void res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message
    });
  }
};