<template>
  <div class="search-view">
    <div class="search-panel">
      <!-- 搜索框 -->
      <div class="search-bar">
        <el-input
          v-model="query"
          placeholder="搜索音乐、歌手、专辑"
          size="large"
          clearable
          @keyup.enter="doSearch"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" size="large" @click="doSearch" :loading="loading">搜索</el-button>
        <el-select v-model="limit" size="large" class="limit-select">
          <el-option :value="10" label="10条" />
          <el-option :value="20" label="20条" />
          <el-option :value="50" label="50条" />
          <el-option :value="100" label="100条" />
        </el-select>
      </div>

      <!-- 结果标题 -->
      <div class="panel-header" v-if="searched">
        <h2>搜索结果</h2>
        <span class="result-count" v-if="results.length > 0">共 {{ totalResults }} 首</span>
      </div>

      <!-- 搜索结果列表 -->
      <div class="song-table" v-loading="loading" element-loading-text="搜索中...">
        <div class="table-header">
          <div class="col-index"></div>
          <div class="col-title">歌曲</div>
          <div class="col-artist">歌手</div>
          <div class="col-actions"></div>
        </div>
        <div
          v-for="(song, index) in results"
          :key="song.id"
          class="table-row"
          :class="{ even: index % 2 === 0 }"
          @dblclick="playSong(index)"
        >
          <div class="col-index">{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="col-title">
            <span class="song-name">{{ song.title }}</span>
          </div>
          <div class="col-artist">{{ song.artist }}</div>
          <div class="col-actions">
            <el-button text size="small" @click.stop="playSong(index)" class="action-btn" :loading="song._loading">
              <el-icon><CaretRight /></el-icon>
            </el-button>
            <el-button text size="small" @click.stop="saveSong(index)" class="action-btn" :loading="song._saving">
              <el-icon><Download /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="results.length === 0 && !loading && searched" class="empty-state">
          <el-empty description="未找到相关歌曲" :image-size="80" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { CaretRight, Download, Search } from '@element-plus/icons-vue'
import { usePlayer } from '../composables/usePlayer.js'
import { apiFetch } from '../config.js'
import { ElMessage } from 'element-plus'

const route = useRoute()
const { setSongs, playSong: playerPlaySong } = usePlayer()

const query = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)
const limit = ref(20)
const totalResults = ref(0)

onMounted(() => {
  if (route.query.q) {
    query.value = route.query.q
    doSearch()
  }
})

watch(() => route.query.q, (newQ) => {
  if (newQ && newQ !== query.value) {
    query.value = newQ
    doSearch()
  }
})

async function doSearch() {
  if (!query.value.trim()) return
  loading.value = true
  searched.value = true
  try {
    const res = await apiFetch(`/api/search?q=${encodeURIComponent(query.value)}&limit=${limit.value}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    results.value = (data.results || []).map(s => ({ ...s, _loading: false, _saving: false }))
    totalResults.value = data.total || data.results?.length || 0
  } catch (err) {
    ElMessage.error('搜索失败：' + err.message)
    results.value = []
  } finally {
    loading.value = false
  }
}

async function playSong(index) {
  const song = results.value[index]
  if (!song) return
  song._loading = true
  try {
    const res = await apiFetch(`/api/search/${song.id}/play`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    if (!data.url) throw new Error('未获取到播放地址')

    const playerSongs = results.value.map(s => ({
      id: `online_${s.id}`,
      title: s.title,
      artist: s.artist,
      filepath: '',
      duration: '--:--',
      cover: '',
      lrc: '',
      _onlineId: s.id
    }))

    playerSongs[index].filepath = data.url
    playerSongs[index].title = data.title || song.title
    playerSongs[index].artist = data.artist || song.artist
    playerSongs[index].cover = data.cover
    playerSongs[index].lrc = data.lrc || ''

    setSongs(playerSongs)
    playerPlaySong(index)
  } catch (err) {
    ElMessage.error('播放失败：' + err.message)
  } finally {
    song._loading = false
  }
}

async function saveSong(index) {
  const song = results.value[index]
  if (!song) return
  song._saving = true
  try {
    const res = await apiFetch(`/api/search/${song.id}/play`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    if (!data.url) throw new Error('未获取到播放地址')

    const saveRes = await apiFetch('/api/songs/save-online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: data.url,
        title: data.title || song.title,
        artist: data.artist || song.artist,
        cover: data.cover,
        lrc: data.lrc
      })
    })
    const saveData = await saveRes.json()
    if (saveData.error) throw new Error(saveData.error)

    ElMessage.success('已保存到本地')
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
  } finally {
    song._saving = false
  }
}
</script>

<style scoped>
.search-view { padding: 20px; height: 100%; }
.search-panel { background: var(--ncm-bg-card); border-radius: 8px; box-shadow: var(--ncm-shadow); overflow: hidden; transition: background 0.3s; }
.panel-header { display: flex; align-items: baseline; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--ncm-border); }
.panel-header h2 { font-size: 18px; font-weight: 600; color: var(--ncm-text-primary); margin: 0; }
.result-count { font-size: 12px; color: var(--ncm-text-tertiary); }

.song-table { min-height: 200px; }
.table-header { display: flex; align-items: center; padding: 10px 20px; background: var(--ncm-bg-input); border-bottom: 1px solid var(--ncm-border); font-size: 12px; color: var(--ncm-text-tertiary); font-weight: 500; }
.table-row { display: flex; align-items: center; padding: 10px 20px; border-bottom: 1px solid var(--ncm-border-light); cursor: pointer; transition: background 0.12s; }
.table-row:hover { background: var(--ncm-bg-hover); }

.col-index { width: 40px; font-size: 13px; color: var(--ncm-text-placeholder); flex-shrink: 0; text-align: center; }
.col-title { flex: 1; min-width: 0; padding-right: 16px; }
.song-name { font-size: 13px; color: var(--ncm-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.col-artist { width: 120px; font-size: 13px; color: var(--ncm-text-secondary); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.col-actions { width: 80px; display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
.table-row:hover .col-actions { opacity: 1; }
.action-btn { color: var(--ncm-text-tertiary) !important; padding: 4px !important; }
.action-btn:hover { color: var(--ncm-primary) !important; }

.empty-state { padding: 60px 20px; }

/* 搜索框 */
.search-bar { display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid var(--ncm-border); }
.search-input { flex: 1; }
.limit-select { width: 100px; }
</style>
