<template>
  <div class="ncm-app">
    <!-- 顶部标题栏 -->
    <header class="ncm-header">
      <div class="header-left">
        <div class="logo">
          <el-icon :size="22"><Headset /></el-icon>
          <span>云音乐</span>
        </div>
      </div>
    </header>

    <!-- 主体区域 -->
    <div class="ncm-body">
      <!-- 左侧导航 -->
      <aside class="ncm-sidebar">
        <div class="sidebar-section">
          <div class="section-title">在线</div>
          <el-menu :default-active="activeRoute" router>
            <el-menu-item index="/search">
              <el-icon><Search /></el-icon>
              <span>发现音乐</span>
            </el-menu-item>
          </el-menu>
        </div>
        <div class="sidebar-section">
          <div class="section-title">我的音乐</div>
          <el-menu :default-active="activeRoute" router>
            <el-menu-item index="/">
              <el-icon><HomeFilled /></el-icon>
              <span>音乐列表</span>
            </el-menu-item>
            <el-menu-item index="/?tab=favorites">
              <el-icon><Star /></el-icon>
              <span>我喜欢的</span>
            </el-menu-item>
            <el-menu-item index="/?tab=recent">
              <el-icon><Clock /></el-icon>
              <span>最近播放</span>
            </el-menu-item>
          </el-menu>
        </div>
        <!-- 服务器配置 -->
        <div class="sidebar-section server-config">
          <div class="section-title">服务器</div>
          <div class="server-input-wrap">
            <el-input
              v-model="serverUrl"
              placeholder="http://IP:3001"
              size="small"
              clearable
              @change="onServerChange"
              class="server-input"
            />
          </div>
        </div>
      </aside>

      <!-- 主内容 -->
      <main class="ncm-main">
        <router-view />
      </main>
    </div>

    <!-- 底部播放器 -->
    <footer class="ncm-player-bar" :class="{ active: playerState.currentSong }">
      <!-- 歌曲信息 -->
      <div class="bar-song" v-if="playerState.currentSong">
        <div class="bar-cover">
          <el-icon :size="20"><Headset /></el-icon>
        </div>
        <div class="bar-info">
          <div class="bar-title">{{ playerState.currentSong.title || playerState.currentSong.filename }}</div>
          <div class="bar-artist">{{ playerState.currentSong.artist || '未知歌手' }}</div>
        </div>
        <el-button text size="small" @click="toggleFavoriteCurrent" class="bar-fav-btn">
          <el-icon :size="16" :class="{ 'is-fav': isCurrentFavorite }">
            <StarFilled />
          </el-icon>
        </el-button>
      </div>
      <div class="bar-song empty" v-else>
        <div class="bar-cover empty-cover">
          <el-icon :size="20"><Headset /></el-icon>
        </div>
        <div class="bar-info">
          <div class="bar-title">未在播放</div>
        </div>
      </div>

      <!-- 播放控制 -->
      <div class="bar-controls">
        <div class="control-buttons">
          <el-button text circle size="small" @click="prevSong">
            <el-icon :size="18"><Back /></el-icon>
          </el-button>
          <el-button
            type="primary"
            circle
            size="default"
            class="play-btn-main"
            @click="togglePlay"
          >
            <el-icon :size="20" v-if="!playerState.isPlaying"><CaretRight /></el-icon>
            <el-icon :size="20" v-else><VideoPause /></el-icon>
          </el-button>
          <el-button text circle size="small" @click="nextSong">
            <el-icon :size="18"><Right /></el-icon>
          </el-button>
        </div>
        <div class="progress-row">
          <span class="time-text">{{ formatTime(currentPos) }}</span>
          <el-slider
            v-model="seekPos"
            :max="durationMax"
            :show-tooltip="false"
            size="small"
            class="bar-slider"
            @mousedown="seeking = true"
            @change="onSeek"
          />
          <span class="time-text">{{ formatTime(durationMax) }}</span>
        </div>
      </div>

      <!-- 右侧工具 -->
      <div class="bar-tools">
        <div class="volume-wrap">
          <el-button text circle size="small">
            <el-icon :size="16" v-if="volume > 0"><Mute /></el-icon>
            <el-icon :size="16" v-else><CloseBold /></el-icon>
          </el-button>
          <el-slider
            v-model="volume"
            :max="1"
            :step="0.01"
            :show-tooltip="false"
            size="small"
            class="vol-slider"
          />
        </div>
        <el-button text circle size="small" @click="showPlaylist = !showPlaylist" class="playlist-btn">
          <el-icon :size="16"><List /></el-icon>
        </el-button>
        <el-button text circle size="small" @click="showLyrics = !showLyrics" class="playlist-btn" :class="{ 'is-active': showLyrics }">
          <el-icon :size="16"><Document /></el-icon>
        </el-button>
      </div>

      <!-- 播放列表弹出 -->
      <div v-if="showPlaylist" class="playlist-popup">
          <div class="popup-header">
            <span>播放列表 ({{ playerState.songs.length }})</span>
            <el-button text size="small" @click="clearAll">
              <el-icon><Delete /></el-icon> 清空
            </el-button>
          </div>
          <div class="popup-list">
            <div
              v-for="(song, idx) in playerState.songs"
              :key="song.id || idx"
              :class="{ active: idx === playerState.currentIndex }"
              class="popup-item"
              @click="playAt(idx)"
            >
              <div class="item-main">
                <span class="item-name">{{ song.title || song.filename }}</span>
                <span class="item-sep">-</span>
                <span class="item-artist">{{ song.artist || '未知歌手' }}</span>
              </div>
              <span class="item-dur">{{ song.duration || '--:--' }}</span>
            </div>
            <el-empty v-if="playerState.songs.length === 0" description="暂无歌曲" :image-size="48" />
          </div>
        </div>
    </footer>

    <!-- 歌词面板 -->
    <LyricsPanel
      :visible="showLyrics"
      :lrc="currentLrc"
      :title="playerState.currentSong?.title"
      :artist="playerState.currentSong?.artist"
      :cover="playerState.currentSong?.cover"
      :currentTime="currentPos"
      :isPlaying="playerState.isPlaying"
      @close="showLyrics = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Headset, HomeFilled, Star, StarFilled, Clock,
  CaretRight, VideoPause, Back, Right, Mute, CloseBold, List, Delete, Search, Document
} from '@element-plus/icons-vue'
import { usePlayer } from './composables/usePlayer.js'
import { apiFetch, resolveUrl, getApiServer, setApiServer } from './config.js'
import LyricsPanel from './components/LyricsPanel.vue'

const route = useRoute()

// 服务器地址配置
const serverUrl = ref(getApiServer())
function onServerChange(val) {
  setApiServer(val || '')
  if (val) {
    ElMessage.success('服务器地址已更新，刷新页面生效')
  }
}
const activeRoute = computed(() => {
  if (route.query.tab === 'favorites') return '/?tab=favorites'
  if (route.query.tab === 'recent') return '/?tab=recent'
  return route.path
})

const showPlaylist = ref(false)

const {
  state: playerState,
  rawState,
  registerInstance,
  setPlaying
} = usePlayer()

const showLyrics = ref(false)
const currentLrc = ref('')

// 获取歌词
async function fetchLrc(song) {
  if (!song) { currentLrc.value = ''; return }
  if (song.lrc) { currentLrc.value = song.lrc; return }
  if (song.id && !String(song.id).startsWith('online_')) {
    try {
      const res = await apiFetch(`/api/songs/${song.id}/lrc`)
      const data = await res.json()
      currentLrc.value = data.lrc || ''
    } catch { currentLrc.value = '' }
  } else {
    currentLrc.value = ''
  }
}

watch(() => playerState.currentSong, (song) => { fetchLrc(song) }, { immediate: true })

const player = new Audio()
player.volume = 0.7
const currentPos = ref(0)
const seekPos = ref(0)
const volume = ref(0.7)
const seeking = ref(false)
const durationMax = computed(() => playerState.currentSong?.durationSeconds || player.duration || 0)

const favorites = ref(new Set())
const isCurrentFavorite = computed(() => {
  if (!playerState.currentSong) return false
  return favorites.value.has(playerState.currentSong.id)
})

player.addEventListener('play', () => { setPlaying(true) })
player.addEventListener('pause', () => { setPlaying(false) })
player.addEventListener('ended', () => nextSong())
player.addEventListener('timeupdate', () => {
  if (!seeking.value) {
    currentPos.value = player.currentTime
    seekPos.value = player.currentTime
  }
})
player.addEventListener('loadedmetadata', () => {
  if (rawState.currentSong) {
    rawState.currentSong.durationSeconds = player.duration
  }
})

onMounted(async () => {
  registerInstance({ playSong, togglePlay })
  await loadFavorites()
})

onUnmounted(() => {
  player.pause()
  player.src = ''
})

function playSong(index) {
  if (rawState.songs.length === 0 || index < 0 || index >= rawState.songs.length) return
  const song = rawState.songs[index]
  rawState.currentIndex = index
  rawState.currentSong = song
  player.src = resolveUrl(song.filepath)
  player.play()
}

function togglePlay() {
  if (!rawState.currentSong) return
  if (player.paused) player.play()
  else player.pause()
}

function prevSong() {
  if (rawState.songs.length === 0) return
  const i = rawState.currentIndex > 0 ? rawState.currentIndex - 1 : rawState.songs.length - 1
  rawState.currentIndex = i
  rawState.currentSong = rawState.songs[i]
  player.src = resolveUrl(rawState.songs[i].filepath)
  player.play()
}

function nextSong() {
  if (rawState.songs.length === 0) return
  const i = (rawState.currentIndex + 1) % rawState.songs.length
  rawState.currentIndex = i
  rawState.currentSong = rawState.songs[i]
  player.src = resolveUrl(rawState.songs[i].filepath)
  player.play()
}

function onSeek() {
  player.currentTime = seekPos.value
  currentPos.value = seekPos.value
  seeking.value = false
}

function clearAll() {
  player.pause()
  player.src = ''
  rawState.songs = []
  rawState.currentSong = null
  rawState.currentIndex = -1
  currentPos.value = 0
  seekPos.value = 0
  showPlaylist.value = false
}

function playAt(idx) {
  rawState.currentIndex = idx
  rawState.currentSong = rawState.songs[idx]
  player.src = resolveUrl(rawState.songs[idx].filepath)
  player.play()
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function loadFavorites() {
  try {
    const res = await apiFetch('/api/songs/favorites')
    const list = await res.json()
    favorites.value = new Set(list.map(s => s.id))
  } catch (e) { /* ignore */ }
}

async function toggleFavoriteCurrent() {
  if (!playerState.currentSong) return
  const id = playerState.currentSong.id
  try {
    if (favorites.value.has(id)) {
      await apiFetch(`/api/songs/${id}/favorite`, { method: 'DELETE' })
      favorites.value.delete(id)
    } else {
      await apiFetch(`/api/songs/${id}/favorite`, { method: 'POST' })
      favorites.value.add(id)
    }
    // trigger reactivity
    favorites.value = new Set(favorites.value)
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

watch(volume, (v) => { if (player) player.volume = v })

// Expose playSong for child components
defineExpose({ playSong, togglePlay })
</script>

<style scoped>
.ncm-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ncm-bg-main);
}

/* ===== 顶部栏 ===== */
.ncm-header {
  height: 50px;
  background: var(--ncm-bg-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  -webkit-app-region: no-drag;
}

.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  white-space: nowrap;
}

/* ===== 主体 ===== */
.ncm-body { display: flex; flex: 1; min-height: 0; }

/* ===== 侧边栏 ===== */
.ncm-sidebar {
  width: 200px;
  background: var(--ncm-bg-sidebar);
  border-right: 1px solid var(--ncm-border);
  flex-shrink: 0;
  overflow-y: auto;
  padding-top: 8px;
  transition: background 0.3s;
}

.sidebar-section { margin-bottom: 4px; }

.section-title {
  padding: 12px 20px 6px;
  font-size: 12px;
  color: var(--ncm-text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ncm-sidebar .el-menu { background: transparent; }
.ncm-sidebar .el-menu-item { height: 40px; line-height: 40px; font-size: 13px; padding-left: 20px !important; margin: 0 8px; border-radius: 8px; color: var(--ncm-text-secondary); }
.ncm-sidebar .el-menu-item:hover { background: var(--ncm-bg-hover) !important; }
.ncm-sidebar .el-menu-item.is-active { background: var(--ncm-bg-hover) !important; color: var(--ncm-primary) !important; font-weight: 500; }

/* ===== 主内容 ===== */
.ncm-main {
  flex: 1;
  background: var(--ncm-bg-main);
  overflow-y: auto;
  padding-bottom: var(--player-bar-height);
  transition: background 0.3s;
}

/* ===== 底部播放器 ===== */
.ncm-player-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: var(--player-bar-height);
  background: var(--ncm-bg-player);
  border-top: 1px solid var(--ncm-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 1000;
  gap: 16px;
  transition: background 0.3s, transform 0.3s;
  transform: translateY(100%);
}

.ncm-player-bar.active {
  transform: translateY(0);
}

/* 歌曲信息 */
.bar-song { display: flex; align-items: center; gap: 12px; width: 240px; flex-shrink: 0; }
.bar-cover { width: 44px; height: 44px; background: linear-gradient(135deg, var(--ncm-text-tertiary) 0%, var(--ncm-text-placeholder) 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--ncm-text-inverse-sub); flex-shrink: 0; }
.empty-cover { opacity: 0.5; }
.bar-info { min-width: 0; flex: 1; }
.bar-title { font-size: 13px; color: var(--ncm-text-inverse); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }
.bar-artist { font-size: 12px; color: var(--ncm-text-inverse-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-fav-btn { color: var(--ncm-text-inverse-sub) !important; padding: 4px !important; }
.bar-fav-btn .is-fav { color: var(--ncm-primary) !important; }

/* 播放控制 */
.bar-controls { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
.control-buttons { display: flex; align-items: center; gap: 12px; }
.control-buttons .el-button { color: var(--ncm-text-inverse) !important; }
.control-buttons .el-button:hover { color: #fff !important; }

.play-btn-main { background: var(--ncm-primary) !important; border-color: var(--ncm-primary) !important; width: 36px !important; height: 36px !important; }
.play-btn-main:hover { background: var(--ncm-primary-hover) !important; border-color: var(--ncm-primary-hover) !important; }

.progress-row { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 600px; }
.time-text { font-size: 11px; color: var(--ncm-text-inverse-sub); width: 40px; text-align: center; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.bar-slider { flex: 1; }
.bar-slider :deep(.el-slider__runway) { background: var(--ncm-text-placeholder) !important; }

/* 右侧工具 */
.bar-tools { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.volume-wrap { display: flex; align-items: center; gap: 2px; }
.volume-wrap .el-button { color: var(--ncm-text-inverse-sub) !important; }
.vol-slider { width: 72px; }
.vol-slider :deep(.el-slider__runway) { background: var(--ncm-text-placeholder) !important; }
.playlist-btn { color: var(--ncm-text-inverse-sub) !important; }
.playlist-btn.is-active { color: var(--ncm-primary) !important; }

/* ===== 播放列表弹窗 ===== */
.playlist-popup {
  position: absolute;
  bottom: 100%; right: 20px;
  width: 360px; max-height: 420px;
  background: var(--ncm-bg-playlist);
  border: 1px solid var(--ncm-border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--ncm-border); font-size: 13px; color: var(--ncm-text-inverse); }
.popup-header .el-button { color: var(--ncm-text-inverse-sub) !important; }
.popup-list { overflow-y: auto; flex: 1; }
.popup-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; cursor: pointer; transition: background 0.15s; }
.popup-item:hover { background: var(--ncm-bg-hover); }
.popup-item.active { background: var(--ncm-bg-active); }
.popup-item.active .item-name { color: var(--ncm-primary); }
.item-main { min-width: 0; display: flex; align-items: center; gap: 4px; flex: 1; }
.item-name { font-size: 13px; color: var(--ncm-text-inverse); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-sep { color: var(--ncm-text-inverse-sub); font-size: 12px; }
.item-artist { font-size: 12px; color: var(--ncm-text-inverse-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-dur { font-size: 11px; color: var(--ncm-text-inverse-sub); margin-left: 12px; flex-shrink: 0; }

/* 服务器配置 */
.server-config { padding-bottom: 16px; border-top: 1px solid var(--ncm-border); margin-top: 4px; }
.server-input-wrap { padding: 8px 12px; }
.server-input :deep(.el-input__inner) { font-size: 11px; height: 28px; }

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .ncm-sidebar { width: 56px; }
  .section-title, .ncm-sidebar .el-menu-item span { display: none; }
  .ncm-sidebar .el-menu-item { padding-left: 0 !important; justify-content: center; }
  .search-box { width: 140px; }
  .bar-song { width: 140px; }
  .playlist-popup { width: calc(100vw - 40px); right: 20px; }
}
</style>
