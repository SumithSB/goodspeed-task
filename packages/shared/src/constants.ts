export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const DEFAULT_TOP_K = 5;
export const DEFAULT_MIN_SCORE = 0.2;
/** App-layer gate — chunks below this are not passed to the chat LLM. */
export const DEFAULT_RELEVANCE_THRESHOLD = 0.35;
export const DEFAULT_CHUNK_SIZE = 2000;
export const DEFAULT_CHUNK_OVERLAP = 250;
export const EMBEDDING_DIMENSION = 1536;

// Chat context-window management. Recent turns are kept verbatim; older turns are
// folded into a rolling per-conversation summary once they fall outside this window.
export const DEFAULT_CHAT_RECENT_TURNS = 6;
export const DEFAULT_CHAT_HISTORY_TOKEN_BUDGET = 1500;
