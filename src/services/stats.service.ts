import db from '../db/db';
import { Prisma } from '@prisma/client';
import { differenceInDays, startOfWeek, isWithinInterval } from 'date-fns';

/**
 * Update user study streak
 * Increments streak if user studied on consecutive days
 * Resets streak if user missed a day
 */
export const updateStudyStreak = async (userId: string): Promise<void> => {
  try {
    const userStats = await getOrCreateUserStats(userId);
    const now = new Date();
    const lastStudied = userStats.lastStudiedAt;

    let newStreak = userStats.studyStreak;

    if (!lastStudied) {
      // First time studying
      newStreak = 1;
    } else {
      const daysSinceLastStudy = differenceInDays(now, lastStudied);

      if (daysSinceLastStudy === 0) {
        // Already recorded today
        return;
      } else if (daysSinceLastStudy === 1) {
        // Consecutive day, increment streak
        newStreak += 1;
      } else {
        // Missed a day, reset streak
        newStreak = 1;
      }
    }

    await db.userStats.update({
      where: { userId },
      data: {
        studyStreak: newStreak,
        lastStudiedAt: now,
      },
    });
  } catch (error) {
    console.error('Error updating study streak:', error);
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

    // Also update study streak when completing a lesson
    await updateStudyStreak(userId);
    // Also update weekly progress
    await updateWeeklyProgress(userId, 10); // Increment by fixed amount
  } catch (error) {
    console.error('Error incrementing completed lessons:', error);
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
    const currentWeekStart = startOfWeek(now);
    const lastStudied = userStats.lastStudiedAt;

    // Reset weekly progress if it's a new week
    if (
      lastStudied &&
      !isWithinInterval(lastStudied, {
        start: currentWeekStart,
        end: now,
      })
    ) {
      await db.userStats.update({
        where: { userId },
        data: {
          weeklyProgress: amount,
          lastStudiedAt: now,
        },
      });
    } else {
      // Increment existing weekly progress
      await db.userStats.update({
        where: { userId },
        data: {
          weeklyProgress: { increment: amount },
          lastStudiedAt: now,
        },
      });
    }

    // Also update study streak
    await updateStudyStreak(userId);
  } catch (error) {
    console.error('Error updating weekly progress:', error);
  }
};

/**
 * Update quiz average
 */
export const updateQuizAverage = async (userId: string, newQuizScore: number): Promise<void> => {
  try {
    const userStats = await getOrCreateUserStats(userId);

    const currentAverage = userStats.quizAverage || 0;
    const completedQuizzes = await db.quiz.count({
      where: {
        userId,
        attempts: { not: Prisma.JsonNull },
      },
    });

    // Calculate new average
    const newAverage =
      currentAverage === 0
        ? newQuizScore
        : (currentAverage * (completedQuizzes - 1) + newQuizScore) / completedQuizzes;

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
    console.error('Error updating quiz average:', error);
  }
};

/**
 * Update lastStudiedAt timestamp
 */
export const updateLastStudiedAt = async (userId: string): Promise<void> => {
  try {
    await getOrCreateUserStats(userId);

    await db.userStats.update({
      where: { userId },
      data: {
        lastStudiedAt: new Date(),
      },
    });

    // Also update study streak
    await updateStudyStreak(userId);
  } catch (error) {
    console.error('Error updating last studied timestamp:', error);
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
