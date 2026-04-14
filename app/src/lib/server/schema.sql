-- Freemium model schema for K2K3.ai
-- Tracks anonymous sessions, registered users, and usage statistics.
-- Auth0 handles authentication (JWT-based sessions), so no sessions table is needed.

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id TEXT PRIMARY KEY,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  anonymous_session_id TEXT
);

CREATE TABLE IF NOT EXISTS user_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  sources TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote TEXT NOT NULL,
  feedback_text TEXT,
  question TEXT,
  answer TEXT,
  sources TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
