import db from '../db/db';
import { Prisma } from '@prisma/client';
import {
  differenceInDays,
  startOfWeek,
  isWithinInterval,
  format,
  getWeek,
  getYear,
} from 'date-fns';

/**
 * Update user study streak
 * Increments streak if user studied on consecutive days
 * Resets streak if user missed a day
 */
export const updateStudyStreak = async (userId: string): Promise<void> => {
  try {
    const userStats = await getOrCreateUserStats(userId);
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const lastStudied = userStats.lastStudiedAt;

    // Current streak value
    let newStreak = userStats.studyStreak;

    console.log('[STREAK] Processing streak update:', {
      userId,
      currentStreak: newStreak,
      lastStudiedAt: lastStudied,
      currentTime: now,
    });

    if (!lastStudied) {
      // First time studying
      console.log('[STREAK] First time studying, setting streak to 1');
      newStreak = 1;
    } else {
      // Get the date portion of the last study time
      const lastStudiedDate = format(lastStudied, 'yyyy-MM-dd');

      // If already studied today, don't update the streak
      if (lastStudiedDate === today) {
        console.log('[STREAK] Already studied today, no change to streak');
        return;
      }

      // Calculate days between last study and today
      const daysSinceLastStudy = differenceInDays(now, lastStudied);
      console.log('[STREAK] Days since last study:', daysSinceLastStudy);

      if (daysSinceLastStudy === 1) {
        // Consecutive day, increment streak
        newStreak += 1;
        console.log('[STREAK] Consecutive day, incrementing streak to:', newStreak);
      } else {
        // Missed a day, reset streak
        newStreak = 1;
        console.log('[STREAK] Missed day(s), resetting streak to 1');
      }
    }

    // Update the database with new streak value
    await db.userStats.update({
      where: { userId },
      data: {
        studyStreak: newStreak,
        lastStudiedAt: now,
      },
    });

    console.log('[STREAK] Successfully updated streak to:', newStreak);
  } catch (error) {
    console.error('[STREAK] Error updating study streak:', error);
  }
};

/**
 * Update completed lessons count
 */
export const incrementCompletedLessons = async (userId: string): Promise<void> => {
  try {
    await getOrCreateUserStats(userId);

    await db.userStats.update({
      where: { userId },
      data: {
        completedLessons: { increment: 1 },
        lastStudiedAt: new Date(),
      },
    });

    console.log('[LESSONS] Incremented completed lessons for user:', userId);

    // Also update study streak when completing a lesson
    await updateStudyStreak(userId);
    // Also update weekly progress
    await updateWeeklyProgress(userId, 10); // Increment by fixed amount for completing a lesson
  } catch (error) {
    console.error('[LESSONS] Error incrementing completed lessons:', error);
  }
};

/**
 * Update weekly progress
 * @param amount - Amount to increment weekly progress by
 */
export const updateWeeklyProgress = async (userId: string, amount: number): Promise<void> => {
  try {
    const userStats = await getOrCreateUserStats(userId);
    const now = new Date();

    // Get current week identifier (year-weekNum)
    const currentYear = getYear(now);
    const currentWeek = getWeek(now);
    const currentWeekId = `${currentYear}-${currentWeek}`;

    // Get week identifier from last study session
    const lastStudied = userStats.lastStudiedAt;
    const lastWeekId = lastStudied ? `${getYear(lastStudied)}-${getWeek(lastStudied)}` : null;

    console.log('[WEEKLY] Processing weekly progress:', {
      userId,
      currentWeekId,
      lastWeekId,
      currentProgress: userStats.weeklyProgress,
      incrementAmount: amount,
    });

    // Reset weekly progress if it's a new week
    if (!lastWeekId || lastWeekId !== currentWeekId) {
      console.log('[WEEKLY] New week detected, resetting progress to:', amount);
      await db.userStats.update({
        where: { userId },
        data: {
          weeklyProgress: amount,
          lastStudiedAt: now,
        },
      });
    } else {
      // Increment existing weekly progress
      const newProgress = userStats.weeklyProgress + amount;
      console.log(
        '[WEEKLY] Same week, incrementing progress from',
        userStats.weeklyProgress,
        'to',
        newProgress
      );
      await db.userStats.update({
        where: { userId },
        data: {
          weeklyProgress: { increment: amount },
          lastStudiedAt: now,
        },
      });
    }

    console.log('[WEEKLY] Weekly progress update completed');
  } catch (error) {
    console.error('[WEEKLY] Error updating weekly progress:', error);
  }
};

/**
 * Update quiz average
 */
export const updateQuizAverage = async (userId: string, newQuizScore: number): Promise<void> => {
  try {
    const userStats = await getOrCreateUserStats(userId);

    // Get count of completed quizzes (those with attempts)
    const completedQuizzes = await db.quiz.count({
      where: {
        userId,
        attempts: { not: Prisma.JsonNull },
      },
    });

    // Calculate new average
    let newAverage = newQuizScore;

    if (userStats.quizAverage) {
      // If there's an existing average, use a weighted calculation
      newAverage =
        (userStats.quizAverage * (completedQuizzes - 1) + newQuizScore) / completedQuizzes;
    }

    console.log('[QUIZ] Updating quiz average:', {
      userId,
      oldAverage: userStats.quizAverage,
      newScore: newQuizScore,
      completedQuizzes,
      newAverage,
    });

    await db.userStats.update({
      where: { userId },
      data: {
        quizAverage: newAverage,
        lastStudiedAt: new Date(),
      },
    });

    // Also update study streak when completing a quiz
    await updateStudyStreak(userId);
    // Also update weekly progress
    await updateWeeklyProgress(userId, 15); // Quizzes give more progress
  } catch (error) {
    console.error('[QUIZ] Error updating quiz average:', error);
  }
};

/**
 * Update lastStudiedAt timestamp
 */
export const updateLastStudiedAt = async (userId: string): Promise<void> => {
  try {
    await getOrCreateUserStats(userId);
    const now = new Date();

    console.log('[TIMESTAMP] Updating last studied timestamp for user:', userId);

    await db.userStats.update({
      where: { userId },
      data: {
        lastStudiedAt: now,
      },
    });

    // Also update study streak
    await updateStudyStreak(userId);
  } catch (error) {
    console.error('[TIMESTAMP] Error updating last studied timestamp:', error);
  }
};

/**
 * Helper function to get or create user stats
 */
export const getOrCreateUserStats = async (userId: string) => {
  let userStats = await db.userStats.findUnique({
    where: { userId },
  });

  if (!userStats) {
    console.log('[STATS] Creating new stats record for user:', userId);
    userStats = await db.userStats.create({
      data: {
        userId,
        studyStreak: 0,
        completedLessons: 0,
        weeklyProgress: 0,
      },
    });
  }

  return userStats;
};
