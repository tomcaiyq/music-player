export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({ error: '数据冲突，请重试' });
  }

  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误'
  });
}
