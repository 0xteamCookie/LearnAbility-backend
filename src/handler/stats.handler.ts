import { Request, Response } from 'express';
import db from '../db/db';

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
