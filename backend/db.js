import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库目录：优先使用 ELECTRON_DATA_PATH（用户数据目录），否则用项目内 backend/data
const dataDir = process.env.ELECTRON_DATA_PATH
  || path.join(__dirname, 'data');

// 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'music.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration TEXT,
    filepath TEXT NOT NULL,
    cover TEXT DEFAULT '',
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 兼容旧数据库：添加 cover 列
try { db.exec('ALTER TABLE songs ADD COLUMN cover TEXT DEFAULT ""'); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs(id)
  )
`);

export { db };
