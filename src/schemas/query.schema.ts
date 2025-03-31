import { z } from 'zod';

export const queryInputSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query cannot be empty'),
    subjectId: z.string().uuid('Invalid Subject ID format').optional(),
  }),
});

export type QueryInput = z.infer<typeof queryInputSchema>['body'];
