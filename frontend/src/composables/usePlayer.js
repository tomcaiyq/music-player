import { reactive, readonly } from 'vue'

const state = reactive({
  songs: [],
  currentSong: null,
  currentIndex: -1,
  isPlaying: false
})

const playerInstance = { el: null }

export function usePlayer() {
  function setSongs(songs) {
    state.songs = songs
  }

  function playSong(index) {
    if (state.songs.length === 0 || index < 0 || index >= state.songs.length) return
    state.currentIndex = index
    state.currentSong = state.songs[index]
    if (playerInstance.el) {
      playerInstance.el.playSong(index)
    }
  }

  function playSongById(songId) {
    const index = state.songs.findIndex(s => s.id === songId)
    if (index !== -1) playSong(index)
  }

  function togglePlay() {
    if (playerInstance.el) {
      playerInstance.el.togglePlay()
    }
  }

  function registerInstance(instance) {
    playerInstance.el = instance
  }

  function setPlaying(playing) {
    state.isPlaying = playing
  }

  return {
    state: readonly(state),
    rawState: state,
    setSongs,
    playSong,
    playSongById,
    togglePlay,
    registerInstance,
    setPlaying
  }
}
