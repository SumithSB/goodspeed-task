-- Conversation summarization: rolling summary + watermark of how many messages
-- have already been folded into it (incremental compaction).
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_message_count INT NOT NULL DEFAULT 0;

-- Usage / token tracking. One row per AI call (chat, embedding, router, summary).
-- `estimated` flags rows whose token counts are derived rather than provider-reported
-- (streamed chat completions don't return usage across all OpenAI-compatible providers).
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('chat', 'embedding', 'router', 'summary')),
  model TEXT,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  estimated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_user_id_idx ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS usage_events_user_created_idx ON usage_events(user_id, created_at DESC);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_events_select ON usage_events;
DROP POLICY IF EXISTS usage_events_insert ON usage_events;

CREATE POLICY usage_events_select ON usage_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY usage_events_insert ON usage_events FOR INSERT WITH CHECK (user_id = auth.uid());
