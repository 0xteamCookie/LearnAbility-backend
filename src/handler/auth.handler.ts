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
    const { email, password, name, interests, standard } = req.body;

    if (!email || !password || !name || !interests || !standard) {
      return void res.status(400).json({
        success: false,
        message: 'Email, password, name , interests and standard are required',
      });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return void res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.create({
      data: { email, password: hashedPassword, name, interests, standard },
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
    const user = await db.user.findUnique({ where: { id: (req as any).userId } });

    if (!user) {
      return void res.status(404).json({ success: false, message: 'User not found' });
    }

    return void res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests,
        standard: user.standard,
        syllabusContent: user.syllabusContent,
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
