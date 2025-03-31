import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.authToken || req.headers?.authorization?.split(' ')[1];
  if (!token) {
    return void res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    return void res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
