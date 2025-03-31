import db from '../db/db';

/**
 * Get analytics for a specific quiz
 */
export const getQuizAnalytics = async (quizId: string, userId: string) => {
  const quiz = await db.quiz.findFirst({
    where: {
      id: quizId,
      userId,
    },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const attempts = (quiz.attempts || []) as any[];

  if (attempts.length === 0) {
    return {
      attemptsCount: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      passRate: 0,
      questionAnalytics: [],
      progressTrend: [],
    };
  }

  const averageScore = attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length;
  const bestScore = Math.max(...attempts.map((a) => a.percentage));
  const worstScore = Math.min(...attempts.map((a) => a.percentage));
  const passRate = (attempts.filter((a) => a.passed).length / attempts.length) * 100;

  const questions = (quiz.questions || []) as any[];
  const questionAnalytics = questions.map((q) => {
    const questionAttempts = attempts.flatMap((a) =>
      a.answers.filter((ans: any) => ans.questionId === q.id)
    );

    const correctCount = questionAttempts.filter((a: any) => a.isCorrect).length;
    const attemptCount = questionAttempts.length;

    return {
      questionId: q.id,
      content: q.content,
      correctRate: attemptCount > 0 ? (correctCount / attemptCount) * 100 : 0,
      attemptCount,
    };
  });

  const progressTrend = attempts.map((a) => ({
    date: a.completedAt,
    score: a.percentage,
    passed: a.passed,
  }));

  return {
    attemptsCount: attempts.length,
    averageScore,
    bestScore,
    worstScore,
    passRate,
    questionAnalytics,
    progressTrend,
  };
};

/**
 * Get overall quiz analytics for a user
 */
export const getUserQuizAnalytics = async (userId: string) => {
  const quizzes = await db.quiz.findMany({
    where: {
      userId,
    },
  });

  if (quizzes.length === 0) {
    return {
      totalQuizzes: 0,
      completedQuizzes: 0,
      averageScore: 0,
      subjectPerformance: [],
      recentActivity: [],
    };
  }

  const quizzesWithAttempts = quizzes.filter((q) => {
    const attempts = (q.attempts || []) as any[];
    return attempts.length > 0;
  });

  let totalScore = 0;
  let totalAttempts = 0;

  quizzes.forEach((q) => {
    const attempts = (q.attempts || []) as any[];
    if (attempts.length > 0) {
      totalScore += attempts.reduce((sum, a) => sum + a.percentage, 0);
      totalAttempts += attempts.length;
    }
  });

  const averageScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;

  const subjectPerformance: Record<string, { count: number; totalScore: number }> = {};

  for (const quiz of quizzes) {
    if (!quiz.subjectId) continue;

    const attempts = (quiz.attempts || []) as any[];
    if (attempts.length === 0) continue;

    const subjectKey = quiz.subjectId;

    if (!subjectPerformance[subjectKey]) {
      subjectPerformance[subjectKey] = { count: 0, totalScore: 0 };
    }

    attempts.forEach((a) => {
      subjectPerformance[subjectKey].count++;
      subjectPerformance[subjectKey].totalScore += a.percentage;
    });
  }

  const subjectsWithNames = await Promise.all(
    Object.keys(subjectPerformance).map(async (subjectId) => {
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
        select: { name: true, color: true },
      });

      const { count, totalScore } = subjectPerformance[subjectId];
      return {
        subjectId,
        subjectName: subject?.name || 'Unknown',
        subjectColor: subject?.color || 'bg-gray-500',
        averageScore: count > 0 ? totalScore / count : 0,
        attemptCount: count,
      };
    })
  );

  const allAttempts = quizzes.flatMap((q) => {
    const attempts = (q.attempts || []) as any[];
    return attempts.map((a) => ({
      ...a,
      quizId: q.id,
      quizTitle: q.title,
    }));
  });

  const recentActivity = allAttempts
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 10);

  return {
    totalQuizzes: quizzes.length,
    completedQuizzes: quizzesWithAttempts.length,
    averageScore,
    subjectPerformance: subjectsWithNames,
    recentActivity,
  };
};
