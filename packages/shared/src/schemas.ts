import { z } from 'zod';

export const citationSchema = z.object({
  chunkId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentTitle: z.string(),
  excerpt: z.string(),
  score: z.number(),
  index: z.number().int().positive(),
});

export type Citation = z.infer<typeof citationSchema>;

export const documentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  sourceType: z.enum(['manual', 'upload']),
  sourceFilename: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Document = z.infer<typeof documentSchema>;

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  citations: z.array(citationSchema).nullable(),
  createdAt: z.string(),
});

export type Message = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const paginatedDocumentsSchema = z.object({
  items: z.array(documentSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type PaginatedDocuments = z.infer<typeof paginatedDocumentsSchema>;

export const paginatedConversationsSchema = z.object({
  items: z.array(conversationSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type PaginatedConversations = z.infer<typeof paginatedConversationsSchema>;

export const usageKindSchema = z.enum(['chat', 'embedding', 'router', 'summary']);
export type UsageKind = z.infer<typeof usageKindSchema>;

export const usageEventSchema = z.object({
  id: z.string().uuid(),
  kind: usageKindSchema,
  model: z.string().nullable(),
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
  estimated: z.boolean(),
  createdAt: z.string(),
});

export type UsageEvent = z.infer<typeof usageEventSchema>;

export const usageSummarySchema = z.object({
  totalTokens: z.number().int(),
  totalEvents: z.number().int(),
  byKind: z.array(
    z.object({
      kind: usageKindSchema,
      totalTokens: z.number().int(),
      events: z.number().int(),
    }),
  ),
  recent: z.array(usageEventSchema),
});

export type UsageSummary = z.infer<typeof usageSummarySchema>;
