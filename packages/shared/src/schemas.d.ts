import { z } from 'zod';
export declare const citationSchema: z.ZodObject<{
    chunkId: z.ZodString;
    documentId: z.ZodString;
    documentTitle: z.ZodString;
    excerpt: z.ZodString;
    score: z.ZodNumber;
    index: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    chunkId: string;
    documentId: string;
    documentTitle: string;
    excerpt: string;
    score: number;
    index: number;
}, {
    chunkId: string;
    documentId: string;
    documentTitle: string;
    excerpt: string;
    score: number;
    index: number;
}>;
export type Citation = z.infer<typeof citationSchema>;
export declare const documentSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    title: z.ZodString;
    content: z.ZodString;
    tags: z.ZodArray<z.ZodString, "many">;
    sourceType: z.ZodEnum<["manual", "upload"]>;
    sourceFilename: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    title: string;
    content: string;
    tags: string[];
    sourceType: "manual" | "upload";
    sourceFilename: string | null;
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    userId: string;
    title: string;
    content: string;
    tags: string[];
    sourceType: "manual" | "upload";
    sourceFilename: string | null;
    createdAt: string;
    updatedAt: string;
}>;
export type Document = z.infer<typeof documentSchema>;
export declare const createDocumentSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    tags: string[];
}, {
    title: string;
    content: string;
    tags?: string[] | undefined;
}>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export declare const updateDocumentSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    content?: string | undefined;
    tags?: string[] | undefined;
}, {
    title?: string | undefined;
    content?: string | undefined;
    tags?: string[] | undefined;
}>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export declare const messageSchema: z.ZodObject<{
    id: z.ZodString;
    conversationId: z.ZodString;
    userId: z.ZodString;
    role: z.ZodEnum<["user", "assistant", "system"]>;
    content: z.ZodString;
    citations: z.ZodNullable<z.ZodArray<z.ZodObject<{
        chunkId: z.ZodString;
        documentId: z.ZodString;
        documentTitle: z.ZodString;
        excerpt: z.ZodString;
        score: z.ZodNumber;
        index: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        chunkId: string;
        documentId: string;
        documentTitle: string;
        excerpt: string;
        score: number;
        index: number;
    }, {
        chunkId: string;
        documentId: string;
        documentTitle: string;
        excerpt: string;
        score: number;
        index: number;
    }>, "many">>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    content: string;
    createdAt: string;
    conversationId: string;
    role: "system" | "user" | "assistant";
    citations: {
        chunkId: string;
        documentId: string;
        documentTitle: string;
        excerpt: string;
        score: number;
        index: number;
    }[] | null;
}, {
    id: string;
    userId: string;
    content: string;
    createdAt: string;
    conversationId: string;
    role: "system" | "user" | "assistant";
    citations: {
        chunkId: string;
        documentId: string;
        documentTitle: string;
        excerpt: string;
        score: number;
        index: number;
    }[] | null;
}>;
export type Message = z.infer<typeof messageSchema>;
export declare const conversationSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    title: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}>;
export type Conversation = z.infer<typeof conversationSchema>;
export declare const createConversationSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
}, {
    title?: string | undefined;
}>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export declare const sendMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export declare const userProfileSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email?: string | undefined;
}, {
    id: string;
    email?: string | undefined;
}>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export declare const paginatedDocumentsSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        title: z.ZodString;
        content: z.ZodString;
        tags: z.ZodArray<z.ZodString, "many">;
        sourceType: z.ZodEnum<["manual", "upload"]>;
        sourceFilename: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        userId: string;
        title: string;
        content: string;
        tags: string[];
        sourceType: "manual" | "upload";
        sourceFilename: string | null;
        createdAt: string;
        updatedAt: string;
    }, {
        id: string;
        userId: string;
        title: string;
        content: string;
        tags: string[];
        sourceType: "manual" | "upload";
        sourceFilename: string | null;
        createdAt: string;
        updatedAt: string;
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        userId: string;
        title: string;
        content: string;
        tags: string[];
        sourceType: "manual" | "upload";
        sourceFilename: string | null;
        createdAt: string;
        updatedAt: string;
    }[];
    total: number;
    page: number;
    pageSize: number;
}, {
    items: {
        id: string;
        userId: string;
        title: string;
        content: string;
        tags: string[];
        sourceType: "manual" | "upload";
        sourceFilename: string | null;
        createdAt: string;
        updatedAt: string;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export type PaginatedDocuments = z.infer<typeof paginatedDocumentsSchema>;
