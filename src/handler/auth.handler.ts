import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/db';

const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * @desc Register a new user
 * @route POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, standard, language, interests, selectedNeeds } = req.body;

    if (!email || !password || !name) {
      return void res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
      });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return void res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.create({
      data: { email, password: hashedPassword, name, standard, language, interests, selectedNeeds },
    });

    return void res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Login user and return JWT token
 * @route POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return void res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return void res.json({ success: true, token, user });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * @desc Get user profile
 * @route GET /api/v1/auth/me
 * @protected
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        stats: true,
      },
    });

    if (!user) {
      return void res.status(404).json({ success: false, message: 'User not found' });
    }

    const now = new Date();
    let updatedStreak = user.stats?.studyStreak || 0;
    let lastStudiedAt = user.stats?.lastStudiedAt;

    const currentStats = user.stats || {
      studyStreak: 0,
      completedLessons: 0,
      weeklyProgress: 0,
      quizAverage: null,
      lastStudiedAt: null,
    };

    if (lastStudiedAt) {
      const lastDate = new Date(lastStudiedAt);
      const differenceInDays = Math.floor(
        (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (differenceInDays === 1) {
        updatedStreak += 1;
      } else if (differenceInDays > 1) {
        updatedStreak = 1;
      }
    } else {
      updatedStreak = 1;
    }

    const updatedUserStats = await db.userStats.upsert({
      where: { userId },
      update: { studyStreak: updatedStreak, lastStudiedAt: now },
      create: {
        userId,
        studyStreak: 1,
        lastStudiedAt: now,
        completedLessons: 0,
        weeklyProgress: 0,
      },
      select: {
        id: true,
        studyStreak: true,
        completedLessons: true,
        weeklyProgress: true,
        quizAverage: true,
        lastStudiedAt: true,
        userId: true,
      }
    });

    return void res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        standard: user.standard,
        interests: user.interests,
        language: user.language,
        selectedNeeds: user.selectedNeeds,
        syllabusContent: user.syllabusContent,
        createdAt: user.createdAt,
        stats: updatedUserStats,
      },
    });
  } catch (error) {
    console.error(error);
    return void res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });

  return void res.json({ success: true, message: 'Logged out successfully' });
};
