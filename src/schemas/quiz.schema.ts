import { z } from 'zod';

const QuestionInputSchema = z
  .object({
    text: z.string().min(1, 'Question text cannot be empty'),
    options: z.array(z.string().min(1)).min(2, 'Must provide at least two options'),
    correctAnswer: z.string().min(1, 'Correct answer cannot be empty'),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    explanation: z.string().nullable().optional(),
  })
  .refine((data) => data.options.includes(data.correctAnswer), {
    message: 'Correct answer must be one of the options',
    path: ['correctAnswer'],
  });

export const createQuizSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, 'Quiz title cannot be empty'),
      subjectId: z.string().uuid().nullable().optional(),
      lessonId: z.string().uuid().nullable().optional(),
      description: z.string().nullable().optional(),
      difficulty: z.string().optional().default('Medium'),
      questions: z.array(QuestionInputSchema).min(1, 'Quiz must have at least one question'),
    })
    .refine((data) => data.subjectId || data.lessonId, {
      message: 'Either subjectId or lessonId must be provided',
      path: ['subjectId'],
    }),
});

export const generateQuizSchema = z.object({
  body: z
    .object({
      subjectId: z.string().uuid().nullable().optional(),
      lessonId: z.string().uuid().nullable().optional(),
      topic: z.string().min(1).nullable().optional(),
      numQuestions: z.number().int().positive().max(20).nullable().optional().default(5),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).nullable().optional(),
    })
    .refine((data) => data.subjectId || data.lessonId, {
      message: 'Either subjectId or lessonId must be provided',
      path: ['subjectId'],
    }),
});

export const submitQuizAttemptSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Quiz ID format'),
  }),
  body: z.object({
    answers: z
      .array(
        z.object({
          questionId: z.string().min(1),
          answerId: z.string().min(1, 'Selected answer cannot be empty'),
        })
      )
      .min(1, 'Must submit at least one answer'),
  }),
});

export const quizIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>['body'];
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>['body'];
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>['body'];
export type QuizIdParamInput = z.infer<typeof quizIdParamSchema>['params'];
