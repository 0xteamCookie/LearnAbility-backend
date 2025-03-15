import { Request, Response } from 'express';
import db from '../db/db';

export const showUserFeed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await db.user.findUnique({
      where: { id: userId },
    });
    return void res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
