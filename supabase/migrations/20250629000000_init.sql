-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'upload')),
  source_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX documents_user_id_idx ON documents(user_id);

-- Document chunks with embeddings
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  token_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX document_chunks_user_id_idx ON document_chunks(user_id);
CREATE INDEX document_chunks_document_id_idx ON document_chunks(document_id);
CREATE INDEX document_chunks_embedding_idx ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX conversations_user_id_idx ON conversations(user_id);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX messages_user_id_idx ON messages(user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON documents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY documents_update ON documents FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY documents_delete ON documents FOR DELETE USING (user_id = auth.uid());

CREATE POLICY document_chunks_select ON document_chunks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY document_chunks_insert ON document_chunks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY document_chunks_update ON document_chunks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY document_chunks_delete ON document_chunks FOR DELETE USING (user_id = auth.uid());

CREATE POLICY conversations_select ON conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY conversations_insert ON conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY conversations_update ON conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY conversations_delete ON conversations FOR DELETE USING (user_id = auth.uid());

CREATE POLICY messages_select ON messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY messages_update ON messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY messages_delete ON messages FOR DELETE USING (user_id = auth.uid());

-- Vector similarity search RPC
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  min_score FLOAT DEFAULT 0.2
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    d.title AS document_title,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.user_id = auth.uid()
    AND (1 - (dc.embedding <=> query_embedding)) >= min_score
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
