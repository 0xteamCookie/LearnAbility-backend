import { z } from 'zod';

export const lessonIdParamSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid('Invalid Lesson ID format'),
  }),
});

export const trackActivitySchema = z.object({
  body: z.object({
    durationMinutes: z.number().int().positive('Duration must be a positive integer'),
    activityType: z.string().optional(),
  }),
});

export const updateQuizScoreSchema = z.object({
  body: z.object({
    quizId: z.string().uuid('Invalid Quiz ID format'),
    score: z.number().min(0, 'Score cannot be negative'),
  }),
});

export type LessonIdParamInput = z.infer<typeof lessonIdParamSchema>['params'];
export type TrackActivityInput = z.infer<typeof trackActivitySchema>['body'];
export type UpdateQuizScoreInput = z.infer<typeof updateQuizScoreSchema>['body'];
