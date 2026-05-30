/**
 * API 配置
 *
 * 优先级（从高到低）：
 * 1. localStorage 中 'api_server' 的值（运行时修改，无需重新构建）
 * 2. 环境变量 VITE_API_BASE（构建时注入）
 * 3. 空字符串（使用相对路径，适用于 Electron/Vite proxy）
 */
export const API_BASE = (() => {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('api_server')
    if (stored) return stored
  }
  return import.meta.env.VITE_API_BASE || ''
})()

/**
 * 设置后端服务器地址（供外部调用）
 */
export function setApiServer(url) {
  localStorage.setItem('api_server', url)
}

export function getApiServer() {
  return API_BASE
}

/**
 * 带 baseURL 的 fetch 封装，用法与原生 fetch 一致
 */
export function apiFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
  return fetch(fullUrl, options)
}

/**
 * 将相对路径（如 /uploads/xxx.mp3）转为完整 URL
 * 已是完整 URL 的路径原样返回
 */
export function resolveUrl(path) {
  if (!path || path.startsWith('http') || path.startsWith('blob:')) return path
  return `${API_BASE}${path}`
}
