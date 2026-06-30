"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginatedDocumentsSchema = exports.userProfileSchema = exports.sendMessageSchema = exports.createConversationSchema = exports.conversationSchema = exports.messageSchema = exports.updateDocumentSchema = exports.createDocumentSchema = exports.documentSchema = exports.citationSchema = void 0;
const zod_1 = require("zod");
exports.citationSchema = zod_1.z.object({
    chunkId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    documentTitle: zod_1.z.string(),
    excerpt: zod_1.z.string(),
    score: zod_1.z.number(),
    index: zod_1.z.number().int().positive(),
});
exports.documentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    content: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    sourceType: zod_1.z.enum(['manual', 'upload']),
    sourceFilename: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.createDocumentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
    content: zod_1.z.string().min(1),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.updateDocumentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    content: zod_1.z.string().min(1).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.messageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    conversationId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    role: zod_1.z.enum(['user', 'assistant', 'system']),
    content: zod_1.z.string(),
    citations: zod_1.z.array(exports.citationSchema).nullable(),
    createdAt: zod_1.z.string(),
});
exports.conversationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.createConversationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
});
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(10000),
});
exports.userProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email().optional(),
});
exports.paginatedDocumentsSchema = zod_1.z.object({
    items: zod_1.z.array(exports.documentSchema),
    total: zod_1.z.number().int(),
    page: zod_1.z.number().int(),
    pageSize: zod_1.z.number().int(),
});
//# sourceMappingURL=schemas.js.map