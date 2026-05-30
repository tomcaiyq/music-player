import { Router } from 'express';

const router = Router();

// 健康检查接口
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as healthRouter };
