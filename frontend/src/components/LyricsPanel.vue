<template>
  <div class="lyrics-panel" v-if="visible" @click.self="close">
    <div class="lyrics-container">
      <!-- 背景封面 -->
      <div class="lyrics-bg" :style="coverStyle"></div>

      <!-- 左侧封面 -->
      <div class="lyrics-left">
        <div class="disc" :class="{ spinning: isPlaying }">
          <div class="disc-cover">
            <img v-if="cover" :src="cover" alt="cover" />
            <el-icon v-else :size="48"><Headset /></el-icon>
          </div>
        </div>
        <div class="song-meta">
          <h3>{{ title || '未知标题' }}</h3>
          <p>{{ artist || '未知歌手' }}</p>
        </div>
      </div>

      <!-- 右侧歌词 -->
      <div class="lyrics-right">
        <div class="lyrics-scroll" ref="lyricsRef">
          <div
            v-for="(line, i) in parsedLines"
            :key="i"
            class="lyrics-line"
            :class="{
              active: i === currentLine,
              near: Math.abs(i - currentLine) <= 2 && i !== currentLine
            }"
            :ref="el => { if (i === currentLine) activeLineEl = el }"
          >
            {{ line.text }}
          </div>
          <div v-if="parsedLines.length === 0" class="lyrics-empty">
            暂无歌词
          </div>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <div class="close-btn" @click="close">
        <el-icon :size="20"><Close /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Headset, Close } from '@element-plus/icons-vue'

const props = defineProps({
  visible: Boolean,
  lrc: { type: String, default: '' },
  title: { type: String, default: '' },
  artist: { type: String, default: '' },
  cover: { type: String, default: '' },
  currentTime: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const lyricsRef = ref(null)
const activeLineEl = ref(null)

const coverStyle = computed(() => {
  if (props.cover) {
    return { backgroundImage: `url(${props.cover})` }
  }
  return {}
})

// 解析 LRC 歌词
const parsedLines = computed(() => {
  if (!props.lrc) return []
  const lines = props.lrc.split('\n')
  const result = []
  const timeRe = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/
  for (const line of lines) {
    const m = line.match(timeRe)
    if (m) {
      const min = parseInt(m[1])
      const sec = parseInt(m[2])
      const ms = parseInt(m[3].padEnd(3, '0'))
      const time = min * 60 + sec + ms / 1000
      const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/, '').trim()
      if (text) result.push({ time, text })
    }
  }
  return result.sort((a, b) => a.time - b.time)
})

// 当前高亮行
const currentLine = computed(() => {
  if (parsedLines.value.length === 0) return -1
  let idx = -1
  for (let i = 0; i < parsedLines.value.length; i++) {
    if (parsedLines.value[i].time <= props.currentTime) {
      idx = i
    } else {
      break
    }
  }
  return idx
})

// 自动滚动到当前行
async function scrollToActive() {
  await nextTick()
  if (activeLineEl.value && lyricsRef.value) {
    const container = lyricsRef.value
    const el = activeLineEl.value
    const offset = el.offsetTop - container.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: offset, behavior: 'smooth' })
  }
}

watch(currentLine, scrollToActive)
watch(() => props.visible, (v) => { if (v) scrollToActive() })

function close() {
  emit('close')
}
</script>

<style scoped>
.lyrics-panel {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lyrics-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  position: relative;
  overflow: hidden;
}

/* 背景模糊封面 */
.lyrics-bg {
  position: absolute;
  top: -20%; left: -20%;
  width: 140%; height: 140%;
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(0.4);
  z-index: -1;
}

/* 左侧封面 */
.lyrics-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.disc {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #333 0%, #111 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
  animation: none;
}

.disc.spinning {
  animation: spin 20s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.disc-cover {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(135deg, #555 0%, #333 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  overflow: hidden;
}

.disc-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-meta {
  text-align: center;
}

.song-meta h3 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.song-meta p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* 右侧歌词 */
.lyrics-right {
  width: 400px;
  height: 400px;
}

.lyrics-scroll {
  height: 100%;
  overflow-y: auto;
  mask-image: linear-gradient(transparent 0%, #000 15%, #000 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(transparent 0%, #000 15%, #000 85%, transparent 100%);
  padding: 160px 0;
}

.lyrics-scroll::-webkit-scrollbar { width: 0; }

.lyrics-line {
  font-size: clamp(14px, 2.5vw, 18px);
  color: rgba(255, 255, 255, 0.3);
  line-height: 2.2;
  text-align: center;
  transition: all 0.4s ease;
  cursor: pointer;
  transform: scale(0.95);
}

.lyrics-line:hover {
  color: rgba(255, 255, 255, 0.5);
}

.lyrics-line.active {
  font-size: clamp(18px, 3.5vw, 26px);
  font-weight: 700;
  color: #fff;
  transform: scale(1);
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.lyrics-line.near {
  color: rgba(255, 255, 255, 0.6);
  transform: scale(0.98);
}

.lyrics-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  padding-top: 160px;
  font-size: 15px;
}

.close-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

@media (max-width: 768px) {
  .lyrics-container { flex-direction: column; gap: 16px; padding: 20px 0; }
  .disc { width: 140px; height: 140px; }
  .disc-cover { width: 90px; height: 90px; }
  .song-meta h3 { font-size: clamp(16px, 4vw, 20px); }
  .song-meta p { font-size: clamp(12px, 3vw, 14px); }
  .lyrics-right { width: 100%; height: 45vh; }
  .lyrics-line { font-size: clamp(15px, 4vw, 20px); }
  .lyrics-line.active { font-size: clamp(20px, 5.5vw, 30px); }
  .lyrics-line.near { font-size: clamp(17px, 4.5vw, 24px); }
  .close-btn { top: 12px; right: 12px; width: 36px; height: 36px; }
}
</style>
