import { Router } from 'express';

const router = Router();
const BASE = 'https://www.gequhai.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// GET /api/search?q=关键词&limit=30
router.get('/', async (req, res) => {
  try {
    const q = req.query.q;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    if (!q) return res.status(400).json({ error: '请提供搜索关键词' });

    const allResults = [];
    const seen = new Set();
    let page = 1;
    let totalPages = 1;

    while (allResults.length < limit && page <= totalPages && page <= 10) {
      const html = await fetch(`${BASE}/s/${encodeURIComponent(q)}?page=${page}`, {
        headers: { 'User-Agent': UA }
      }).then(r => r.text());

      const rowRe = /<tr>\s*<td[^>]*>(\d+)<\/td>\s*<td>\s*<a href="(\/play\/\d+)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
      let m;
      while ((m = rowRe.exec(html)) !== null) {
        const id = m[2].replace('/play/', '');
        if (!seen.has(id)) {
          seen.add(id);
          allResults.push({
            id,
            title: m[3].replace(/<[^>]*>/g, '').trim(),
            artist: m[4].replace(/<[^>]*>/g, '').trim()
          });
        }
      }

      if (page === 1) {
        // 从"尾页"链接提取总页数
        const tailMatch = html.match(/href="[^"]*\?page=(\d+)"[^>]*>尾页/);
        if (tailMatch) {
          totalPages = parseInt(tailMatch[1]);
        } else {
          // 尝试匹配"共 X 页"
          const pageMatch = html.match(/共\s*(\d+)\s*页/);
          totalPages = pageMatch ? parseInt(pageMatch[1]) : 1;
        }
      }
      page++;
    }

    res.json({ results: allResults.slice(0, limit), total: allResults.length });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: '搜索失败' });
  }
});

// GET /api/search/:id/play
router.get('/:id/play', async (req, res) => {
  try {
    const id = req.params.id;

    // 1. Fetch the play page to get song metadata and play_id
    const html = await fetch(`${BASE}/play/${id}`, {
      headers: { 'User-Agent': UA }
    }).then(r => r.text());

    const title = extractVar(html, 'mp3_title') || '未知标题';
    const artist = extractVar(html, 'mp3_author') || '未知歌手';
    const cover = extractVar(html, 'mp3_cover') || '';
    const playId = extractVar(html, 'play_id') || '';

    // 2. Extract lyrics
    let lrc = '';
    const lrcMatch = html.match(/<div[^>]*id="content-lrc2"[^>]*>([\s\S]*?)<\/div>/);
    if (lrcMatch) {
      lrc = lrcMatch[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>/g, '').trim();
    }

    // 3. Get the actual MP3 URL via gequhai's internal API
    let audioUrl = '';
    if (playId) {
      try {
        const apiRes = await fetch(`${BASE}/api/music`, {
          method: 'POST',
          headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Custom-Header': 'SecretKey'
          },
          body: `id=${encodeURIComponent(playId)}&type=0`
        }).then(r => r.json());

        if (apiRes.code === 200 && apiRes.data?.url) {
          audioUrl = apiRes.data.url;
        }
      } catch (e) {
        console.error('Music API error:', e.message);
      }
    }

    // 4. Fallback: try mp3_url from page JS
    if (!audioUrl) {
      audioUrl = extractVar(html, 'mp3_url') || '';
    }

    res.json({ id, title, artist, cover, url: audioUrl, lrc });
  } catch (err) {
    console.error('Play error:', err.message);
    res.status(500).json({ error: '获取歌曲信息失败' });
  }
});

function extractVar(html, name) {
  const re = new RegExp(`window\\.${name}\\s*=\\s*'([^']*)'`);
  const m = html.match(re);
  return m ? m[1] : '';
}

export { router as searchRouter };
