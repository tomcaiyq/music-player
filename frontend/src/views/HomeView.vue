<template>
  <div class="home-view">
    <el-row :gutter="isMobile ? 0 : 20">
      <!-- 左侧歌曲列表 -->
      <el-col :span="isMobile ? 24 : 18">
        <div class="list-panel">
          <!-- 列表头 -->
          <div class="list-toolbar">
            <div class="toolbar-left">
              <h2 v-if="route.query.tab === 'favorites'">我喜欢的</h2>
              <h2 v-else-if="route.query.tab === 'recent'">最近播放</h2>
              <h2 v-else>音乐列表</h2>
              <span class="song-count">共 {{ displaySongs.length }} 首</span>
            </div>
            <div class="toolbar-right">
              <el-button type="primary" size="small" @click="playAll" :disabled="displaySongs.length === 0">
                <el-icon><CaretRight /></el-icon> 播放全部
              </el-button>
            </div>
          </div>

          <!-- 表格 -->
          <div class="song-table" v-loading="loading" element-loading-text="加载中...">
            <!-- 桌面端表头 -->
            <div v-if="!isMobile" class="table-header">
              <div class="col-index"></div>
              <div class="col-title">歌曲</div>
              <div class="col-artist">歌手</div>
              <div class="col-album">专辑</div>
              <div class="col-duration">时长</div>
              <div class="col-actions"></div>
            </div>
            <div
              v-for="(song, index) in displaySongs"
              :key="song.id"
              class="table-row"
              :class="{
                active: song.id === playerState.currentSong?.id,
                even: index % 2 === 0,
                'is-mobile': isMobile
              }"
              @dblclick="playAt(index)"
              @click="isMobile && playAt(index)"
            >
              <div class="col-index">
                <span v-if="song.id !== playerState.currentSong?.id">{{ String(index + 1).padStart(2, '0') }}</span>
                <el-icon v-else class="playing-icon"><Headset /></el-icon>
              </div>
              <div class="col-title">
                <span class="song-name">{{ song.title || song.filename }}</span>
                <!-- 移动端：歌手名跟在标题下面 -->
                <span v-if="isMobile" class="song-artist-mobile">{{ song.artist || '未知歌手' }}</span>
              </div>
              <div v-if="!isMobile" class="col-artist">{{ song.artist || '未知歌手' }}</div>
              <div v-if="!isMobile" class="col-album">{{ song.album || '-' }}</div>
              <div class="col-duration">{{ song.duration || '--:--' }}</div>
              <div class="col-actions" :class="{ 'mobile-visible': isMobile }">
                <el-button text size="small" @click.stop="playAt(index)" class="action-btn">
                  <el-icon><CaretRight /></el-icon>
                </el-button>
                <el-button text size="small" @click.stop="toggleFavorite(song)" class="action-btn fav-btn">
                  <el-icon :class="{ 'is-fav': isFavorite(song.id) }"><StarFilled /></el-icon>
                </el-button>
                <el-button v-if="!isMobile" text size="small" @click.stop="deleteSong(song.id)" class="action-btn del-btn">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="displaySongs.length === 0 && !loading" class="empty-state">
              <el-empty description="还没有任何音乐" :image-size="80" />
            </div>
          </div>
        </div>
      </el-col>

      <!-- 右侧收藏（桌面端） -->
      <el-col v-if="!isMobile" :span="6">
        <div class="side-panel">
          <div class="side-card">
            <div class="card-title">
              <el-icon :size="14" style="color: #C20C0C;"><StarFilled /></el-icon>
              <span>我喜欢的音乐</span>
            </div>
            <div class="card-body">
              <div v-if="favorites.length === 0" class="empty-fav">
                <span>暂无收藏</span>
              </div>
              <div v-else class="fav-list">
                <div
                  v-for="song in favorites.slice(0, 10)"
                  :key="song.id"
                  class="fav-item"
                  @click="playById(song.id)"
                  :class="{ active: song.id === playerState.currentSong?.id }"
                >
                  <div class="fav-info">
                    <span class="fav-name">{{ song.title || song.filename }}</span>
                    <span class="fav-artist">{{ song.artist || '未知歌手' }}</span>
                  </div>
                  <span class="fav-dur">{{ song.duration || '' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 最近播放 -->
          <div class="side-card">
            <div class="card-title">
              <el-icon :size="14" style="color: #999;"><Clock /></el-icon>
              <span>最近播放</span>
            </div>
            <div class="card-body">
              <div v-if="recentPlayed.length === 0" class="empty-fav">
                <span>暂无播放记录</span>
              </div>
              <div v-else class="fav-list">
                <div
                  v-for="song in recentPlayed.slice(0, 8)"
                  :key="song.id"
                  class="fav-item"
                  @click="playById(song.id)"
                >
                  <div class="fav-info">
                    <span class="fav-name">{{ song.title || song.filename }}</span>
                    <span class="fav-artist">{{ song.artist || '未知歌手' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { StarFilled, Delete, CaretRight, Clock, Headset } from '@element-plus/icons-vue'
import { usePlayer } from '../composables/usePlayer.js'
import { useMobile } from '../composables/useMobile.js'
import { apiFetch } from '../config.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const { isMobile } = useMobile()

// 根据 tab 参数显示不同列表
const displaySongs = computed(() => {
  if (route.query.tab === 'favorites') return favorites.value
  if (route.query.tab === 'recent') return recentPlayed.value
  return songs.value
})

const {
  state: playerState,
  rawState,
  setSongs,
  playSong: playerPlaySong,
  playSongById: playerPlaySongById
} = usePlayer()

const songs = ref([])
const favorites = ref([])
const recentPlayed = ref([])
const loading = ref(false)

onMounted(async () => {
  await Promise.all([loadSongs(), loadFavorites(), loadRecent()])
})

// 监听 tab 变化，刷新数据
watch(() => route.query.tab, async (tab) => {
  if (tab === 'favorites') await loadFavorites()
  else if (tab === 'recent') await loadRecent()
})

async function loadSongs() {
  loading.value = true
  try {
    const res = await apiFetch('/api/songs/list')
    const data = await res.json()
    songs.value = Array.isArray(data) ? data : []
    setSongs(songs.value)
  } catch {
    ElMessage.error('加载歌曲列表失败')
  } finally {
    loading.value = false
  }
}

async function loadFavorites() {
  try {
    const res = await apiFetch('/api/songs/favorites')
    const data = await res.json()
    favorites.value = Array.isArray(data) ? data : []
  } catch { /* ignore */ }
}

async function loadRecent() {
  try {
    const res = await apiFetch('/api/songs/history?limit=10')
    const data = await res.json()
    recentPlayed.value = Array.isArray(data) ? data : []
  } catch { /* ignore */ }
}

function isFavorite(id) {
  return favorites.value.some(s => s.id === id)
}

function playAll() {
  setSongs(songs.value)
  playerPlaySong(0)
}

function playAt(index) {
  setSongs(songs.value)
  playerPlaySong(index)
  recordHistory(songs.value[index])
}

function playById(id) {
  setSongs(songs.value)
  playerPlaySongById(id)
  const song = songs.value.find(s => s.id === id)
  if (song) recordHistory(song)
}

async function recordHistory(song) {
  try {
    await apiFetch('/api/songs/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: song.id })
    })
  } catch (e) { /* ignore */ }
}

async function toggleFavorite(song) {
  try {
    if (isFavorite(song.id)) {
      await apiFetch(`/api/songs/${song.id}/favorite`, { method: 'DELETE' })
      favorites.value = favorites.value.filter(s => s.id !== song.id)
      ElMessage.success('已取消收藏')
    } else {
      await apiFetch(`/api/songs/${song.id}/favorite`, { method: 'POST' })
      await loadFavorites()
      ElMessage.success('已添加到我喜欢的音乐')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function deleteSong(id) {
  try {
    await ElMessageBox.confirm('确定要删除这首歌曲吗？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    const res = await apiFetch(`/api/songs/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '请求失败')
    ElMessage.success('删除成功')
    await Promise.all([loadSongs(), loadFavorites()])
  } catch (e) {
    ElMessage.error('删除失败：' + (e.message || '未知错误'))
  }
}
</script>

<style scoped>
.home-view { padding: 20px; height: 100%; }

/* ===== 列表面板 ===== */
.list-panel { background: var(--ncm-bg-card); border-radius: 8px; overflow: hidden; box-shadow: var(--ncm-shadow); transition: background 0.3s; }
.list-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--ncm-border); }
.toolbar-left { display: flex; align-items: baseline; gap: 10px; }
.toolbar-left h2 { font-size: 18px; font-weight: 600; color: var(--ncm-text-primary); margin: 0; }
.song-count { font-size: 12px; color: var(--ncm-text-tertiary); }

/* ===== 表格 ===== */
.song-table { min-height: 200px; }
.table-header { display: flex; align-items: center; padding: 10px 20px; background: var(--ncm-bg-input); border-bottom: 1px solid var(--ncm-border); font-size: 12px; color: var(--ncm-text-tertiary); font-weight: 500; }
.table-row { display: flex; align-items: center; padding: 10px 20px; border-bottom: 1px solid var(--ncm-border-light); cursor: pointer; transition: background 0.12s; }
.table-row:hover { background: var(--ncm-bg-hover); }
.table-row.active { background: var(--ncm-bg-active); }
.table-row.active .song-name { color: var(--ncm-primary); }
.table-row.active .col-index { color: var(--ncm-primary); }

.col-index { width: 40px; font-size: 13px; color: var(--ncm-text-placeholder); flex-shrink: 0; text-align: center; }
.playing-icon { color: var(--ncm-primary); animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.col-title { flex: 1; min-width: 0; padding-right: 16px; }
.song-name { font-size: 13px; color: var(--ncm-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.col-artist { width: 120px; font-size: 13px; color: var(--ncm-text-secondary); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-album { width: 140px; font-size: 12px; color: var(--ncm-text-tertiary); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-duration { width: 60px; font-size: 12px; color: var(--ncm-text-tertiary); flex-shrink: 0; text-align: right; }

.col-actions { width: 90px; display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
.table-row:hover .col-actions { opacity: 1; }
.action-btn { color: var(--ncm-text-tertiary) !important; padding: 4px !important; }
.action-btn:hover { color: var(--ncm-text-primary) !important; }
.fav-btn .is-fav { color: var(--ncm-primary) !important; }
.del-btn:hover { color: #F56C6C !important; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; }

/* ===== 右侧面板 ===== */
.side-panel { display: flex; flex-direction: column; gap: 16px; }
.side-card { background: var(--ncm-bg-card); border-radius: 8px; box-shadow: var(--ncm-shadow); overflow: hidden; transition: background 0.3s; }
.card-title { display: flex; align-items: center; gap: 6px; padding: 14px 16px; font-size: 14px; font-weight: 500; color: var(--ncm-text-primary); border-bottom: 1px solid var(--ncm-border); }
.card-body { padding: 4px 0; }
.empty-fav { padding: 30px 16px; text-align: center; font-size: 13px; color: var(--ncm-text-placeholder); }
.fav-list { max-height: 360px; overflow-y: auto; }
.fav-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; cursor: pointer; transition: background 0.12s; }
.fav-item:hover { background: var(--ncm-bg-hover); }
.fav-item.active .fav-name { color: var(--ncm-primary); }
.fav-info { min-width: 0; flex: 1; }
.fav-name { display: block; font-size: 13px; color: var(--ncm-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fav-artist { display: block; font-size: 11px; color: var(--ncm-text-tertiary); margin-top: 2px; }
.fav-dur { font-size: 11px; color: var(--ncm-text-placeholder); margin-left: 12px; flex-shrink: 0; }

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .home-view { padding: 0; }
  .list-panel { border-radius: 0; box-shadow: none; }
  .list-toolbar { padding: 12px 16px; }
  .toolbar-left h2 { font-size: 16px; }

  .table-row.is-mobile {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 10px;
  }

  .table-row.is-mobile .col-index {
    width: 28px;
    font-size: 12px;
    flex-shrink: 0;
    text-align: center;
  }

  .table-row.is-mobile .col-title {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .song-artist-mobile {
    font-size: 11px;
    color: var(--ncm-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table-row.is-mobile .col-duration {
    width: 40px;
    font-size: 11px;
    flex-shrink: 0;
    text-align: right;
  }

  .col-actions.mobile-visible {
    opacity: 1 !important;
    width: auto;
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
  }
  .col-actions.mobile-visible .action-btn { padding: 8px !important; }
  .col-actions.mobile-visible .action-btn:active { opacity: 0.6; }

  .col-album { display: none; }
}
</style>
