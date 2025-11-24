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
      mode TEXT NOT NULL
    )
  `);

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
      mode
    FROM transcriptions
    ORDER BY date DESC
    LIMIT ?
  `);

  return stmt.all(limit) as TranscriptionRecord[];
};

export const deleteTranscription = (id: number): void => {
  const stmt = db.prepare('DELETE FROM transcriptions WHERE id = ?');
  stmt.run(id);
};

export const clearAllTranscriptions = (): void => {
  const stmt = db.prepare('DELETE FROM transcriptions');
  stmt.run();
};
