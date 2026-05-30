import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { songsRouter } from './routes/songs.js';
import { searchRouter } from './routes/search.js';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Electron 打包后通过环境变量传递基础路径
const basePath = process.env.APP_BASE_PATH || path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的文件）
const uploadsDir = process.env.ELECTRON_DATA_PATH
  ? path.join(process.env.ELECTRON_DATA_PATH, 'uploads')
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// API 路由
app.use('/api/songs', songsRouter);
app.use('/api/search', searchRouter);
app.use('/api', healthRouter);

// 前端静态文件（生产模式）
const frontendDist = path.join(basePath, 'frontend', 'dist');
app.use(express.static(frontendDist));

// SPA 回退
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 音乐播放器后端运行在 http://0.0.0.0:${PORT}`);
  console.log('📋 列表接口：GET /api/songs/list');
  console.log('❤️ 收藏接口：GET /api/songs/favorites');
});
