import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export interface TranscriptionRecord {
  id: number;
  date: string;
  originalText: string;
  finalText: string;
  language: string;
  mode: string;
  favorite: boolean;
}

export const initDatabase = () => {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'wishperpro.db');

  db = new Database(dbPath);

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create transcriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      original_text TEXT NOT NULL,
      final_text TEXT NOT NULL,
      language TEXT NOT NULL,
      mode TEXT NOT NULL,
      favorite INTEGER DEFAULT 0
    )
  `);

  // Migration: Add favorite column if it doesn't exist
  try {
    db.exec(`ALTER TABLE transcriptions ADD COLUMN favorite INTEGER DEFAULT 0`);
    console.log('Added favorite column to transcriptions table');
  } catch {
    // Column already exists, ignore
  }

  console.log('Database initialized at:', dbPath);
};

export const saveApiKey = (apiKey: string): void => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value)
    VALUES (?, ?)
  `);
  stmt.run('openai_api_key', apiKey);
};

export const getApiKey = (): string | null => {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get('openai_api_key') as { value: string } | undefined;
  return row?.value || null;
};

export const saveHotkey = (hotkey: string): void => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value)
    VALUES (?, ?)
  `);
  stmt.run('recording_hotkey', hotkey);
};

export const getHotkey = (): string => {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get('recording_hotkey') as { value: string } | undefined;
  return row?.value || 'CommandOrControl+Shift+R';
};

export const saveTranscription = (
  originalText: string,
  finalText: string,
  language: string,
  mode: string
): void => {
  const stmt = db.prepare(`
    INSERT INTO transcriptions (date, original_text, final_text, language, mode)
    VALUES (?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  stmt.run(now, originalText, finalText, language, mode);
};

export const getTranscriptions = (limit: number = 50): TranscriptionRecord[] => {
  const stmt = db.prepare(`
    SELECT
      id,
      date,
      original_text as originalText,
      final_text as finalText,
      language,
      mode,
      favorite
    FROM transcriptions
    ORDER BY favorite DESC, date DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as Array<Omit<TranscriptionRecord, 'favorite'> & { favorite: number }>;
  return rows.map(row => ({ ...row, favorite: row.favorite === 1 }));
};

export const deleteTranscription = (id: number): void => {
  const stmt = db.prepare('DELETE FROM transcriptions WHERE id = ?');
  stmt.run(id);
};

export const toggleFavorite = (id: number): boolean => {
  const getStmt = db.prepare('SELECT favorite FROM transcriptions WHERE id = ?');
  const row = getStmt.get(id) as { favorite: number } | undefined;
  const newValue = row?.favorite === 1 ? 0 : 1;

  const updateStmt = db.prepare('UPDATE transcriptions SET favorite = ? WHERE id = ?');
  updateStmt.run(newValue, id);

  return newValue === 1;
};

export const updateTranscription = (id: number, finalText: string): void => {
  const stmt = db.prepare('UPDATE transcriptions SET final_text = ? WHERE id = ?');
  stmt.run(finalText, id);
};

export const clearAllTranscriptions = (): void => {
  const stmt = db.prepare('DELETE FROM transcriptions');
  stmt.run();
};

export const saveGptModel = (model: string): void => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value)
    VALUES (?, ?)
  `);
  stmt.run('gpt_model', model);
};

export const getGptModel = (): string => {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get('gpt_model') as { value: string } | undefined;
  return row?.value || 'gpt-4o'; // Default to gpt-4o
};

export const saveWhisperModel = (model: string): void => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value)
    VALUES (?, ?)
  `);
  stmt.run('whisper_model', model);
};

export const getWhisperModel = (): string => {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get('whisper_model') as { value: string } | undefined;
  return row?.value || 'gpt-4o-mini-transcribe'; // Default to new faster model
};

export const saveOverlayPosition = (x: number, y: number): void => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value)
    VALUES (?, ?)
  `);
  stmt.run('overlay_position', JSON.stringify({ x, y }));
};

export const getOverlayPosition = (): { x: number; y: number } | null => {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get('overlay_position') as { value: string } | undefined;
  if (row?.value) {
    try {
      return JSON.parse(row.value);
    } catch {
      return null;
    }
  }
  return null;
};

export const saveSourceLanguage = (language: string): void => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value)
    VALUES (?, ?)
  `);
  stmt.run('source_language', language);
};

export const getSourceLanguage = (): string => {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get('source_language') as { value: string } | undefined;
  return row?.value || 'pt'; // Default to Portuguese for backward compatibility
};
