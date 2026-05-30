import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { parseFile } from 'music-metadata';
import { db } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 上传目录：优先使用 ELECTRON_DATA_PATH（用户数据目录），否则用项目内 backend/uploads
const uploadsDir = process.env.ELECTRON_DATA_PATH
  ? path.join(process.env.ELECTRON_DATA_PATH, 'uploads')
  : path.join(__dirname, '..', 'uploads');

// 确保 uploads 目录存在
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = Router();

// ===== 具体路由必须在 /:id 之前 =====

// 保存网络歌曲到本地
router.post('/save-online', async (req, res) => {
  try {
    const { url, title, artist, cover, lrc } = req.body;
    if (!url) return res.status(400).json({ error: '缺少音频 URL' });

    const filename = uuidv4() + '.mp3';
    const filepath = path.join(uploadsDir, filename);

    // 下载音频文件
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) throw new Error('下载失败');

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    // 提取音频时长
    let duration = null;
    try {
      const metadata = await parseFile(filepath);
      if (metadata.format.duration) {
        const totalSec = Math.round(metadata.format.duration);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        duration = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      }
    } catch (e) {
      console.warn('Failed to extract duration:', e.message);
    }

    // 保存歌词文件
    if (lrc) {
      const lrcPath = path.join(uploadsDir, filename.replace('.mp3', '.lrc'));
      fs.writeFileSync(lrcPath, lrc, 'utf-8');
    }

    // 保存封面
    let coverPath = '';
    if (cover) {
      try {
        const coverResp = await fetch(cover);
        if (coverResp.ok) {
          const coverFilename = uuidv4() + '.jpg';
          const coverFilepath = path.join(uploadsDir, coverFilename);
          fs.writeFileSync(coverFilepath, Buffer.from(await coverResp.arrayBuffer()));
          coverPath = `/uploads/${coverFilename}`;
        }
      } catch { /* ignore cover errors */ }
    }

    // 插入数据库
    const result = db.prepare(`
      INSERT INTO songs (filename, title, artist, album, duration, filepath, cover)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(filename, title || '未知标题', artist || '未知歌手', '', duration, `/uploads/${filename}`, coverPath);

    res.json({ id: result.lastInsertRowid, message: '保存成功' });
  } catch (error) {
    console.error('Save online error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取歌曲歌词
router.get('/:id/lrc', (req, res) => {
  try {
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(parseInt(req.params.id));
    if (!song) return res.status(404).json({ error: '歌曲不存在' });

    const lrcPath = path.join(uploadsDir, song.filename.replace(/\.\w+$/, '.lrc'));
    if (fs.existsSync(lrcPath)) {
      const lrc = fs.readFileSync(lrcPath, 'utf-8');
      res.json({ lrc });
    } else {
      res.json({ lrc: '' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取歌曲列表
router.get('/list', (req, res) => {
  try {
    const songs = db.prepare('SELECT * FROM songs ORDER BY added_at DESC').all();
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取收藏列表
router.get('/favorites', (req, res) => {
  try {
    const favorites = db.prepare(`
      SELECT s.*, f.added_at
      FROM songs s
      JOIN favorites f ON s.id = f.song_id
      ORDER BY f.added_at DESC
    `).all();
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取播放历史（去重，每首歌只保留最近一次）
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = db.prepare(`
      SELECT s.*, MAX(h.played_at) as played_at
      FROM play_history h
      JOIN songs s ON h.song_id = s.id
      GROUP BY h.song_id
      ORDER BY played_at DESC
      LIMIT ?
    `).all(limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 添加播放记录
router.post('/history', (req, res) => {
  try {
    const songId = parseInt(req.body.songId);
    const result = db.prepare('INSERT INTO play_history (song_id) VALUES (?)').run(songId);
    res.json({ id: result.lastInsertRowid, message: '播放记录已保存' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 参数路由放后面 =====

// 获取歌曲详情
router.get('/:id', (req, res) => {
  try {
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(parseInt(req.params.id));
    if (!song) return res.status(404).json({ error: '歌曲不存在' });
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 添加收藏
router.post('/:id/favorite', (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const exists = db.prepare('SELECT * FROM favorites WHERE song_id = ?').get(songId);
    if (exists) return res.status(400).json({ error: '已收藏' });

    const result = db.prepare('INSERT INTO favorites (song_id) VALUES (?)').run(songId);
    res.json({ id: result.lastInsertRowid, message: '收藏成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取消收藏
router.delete('/:id/favorite', (req, res) => {
  try {
    db.prepare('DELETE FROM favorites WHERE song_id = ?').run(parseInt(req.params.id));
    res.json({ message: '取消收藏成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除歌曲
router.delete('/:id', (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    db.prepare('DELETE FROM favorites WHERE song_id = ?').run(songId);
    db.prepare('DELETE FROM play_history WHERE song_id = ?').run(songId);
    db.prepare('DELETE FROM songs WHERE id = ?').run(songId);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { router as songsRouter };
