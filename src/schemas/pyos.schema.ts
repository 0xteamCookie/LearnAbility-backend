import { z } from 'zod';

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Subject name cannot be empty'),
    description: z.string().optional(),
  }),
});

export const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Tag name cannot be empty'),
  }),
});

export const subjectIdParamSchema = z.object({
  params: z.object({
    subjectId: z.string().uuid('Invalid Subject ID format'),
  }),
});

export const subjectLessonIdParamSchema = z.object({
  params: z.object({
    subjectId: z.string().uuid('Invalid Subject ID format'),
    lessonId: z.string().uuid('Invalid Lesson ID format'),
  }),
});

export const subjectIdBodySchema = z.object({
  body: z.object({
    subjectId: z.string().uuid('Subject ID must be a valid UUID'),
  }),
});

export const optionalSubjectIdBodySchema = z.object({
  body: z.object({
    subjectId: z.string().uuid('Subject ID must be a valid UUID').optional(),
  }),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>['body'];
export type CreateTagInput = z.infer<typeof createTagSchema>['body'];
export type SubjectIdParamInput = z.infer<typeof subjectIdParamSchema>['params'];
export type SubjectLessonIdParamInput = z.infer<typeof subjectLessonIdParamSchema>['params'];
export type SubjectIdBodyInput = z.infer<typeof subjectIdBodySchema>['body'];
export type OptionalSubjectIdBodyInput = z.infer<typeof optionalSubjectIdBodySchema>['body'];
