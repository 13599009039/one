// 前端监测系统入口
import { createApp } from 'vue'
import FrontendMonitor from './FrontendMonitor.vue'

// 创建监测应用实例
const monitorApp = createApp(FrontendMonitor)

// 挂载监测面板
const mountMonitor = () => {
  // 创建容器元素
  const monitorContainer = document.createElement('div')
  monitorContainer.id = 'frontend-monitor-container'
  document.body.appendChild(monitorContainer)
  
  // 挂载应用
  monitorApp.mount('#frontend-monitor-container')
  
  console.log('🚀 前端监测系统已启动')
}

// 在开发环境下自动启动监测
if (process.env.NODE_ENV === 'development') {
  // 延迟启动，确保主应用已加载
  setTimeout(mountMonitor, 1000)
}

// 提供手动启动方法
window.startFrontendMonitor = mountMonitor

// 全局错误捕获增强
window.addEventListener('error', (event) => {
  console.error('🎯 全局错误捕获:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  })
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('🎯 Promise拒绝捕获:', {
    reason: event.reason,
    promise: event.promise
  })
})

// 网络请求拦截增强
const originalFetch = window.fetch
window.fetch = async function(...args) {
  const startTime = Date.now()
  const url = args[0]
  const options = args[1] || {}
  
  console.log('📡 网络请求发起:', {
    method: options.method || 'GET',
    url: url.toString(),
    timestamp: new Date().toISOString()
  })
  
  try {
    const response = await originalFetch.apply(this, args)
    const duration = Date.now() - startTime
    
    console.log('📡 网络请求响应:', {
      url: url.toString(),
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
    
    // 如果是登录相关的请求，更新登录状态
    if (url.includes('/auth/login') && response.ok) {
      const data = await response.clone().json()
      if (data.code === 0) {
        localStorage.setItem('mobile_token', data.data.token)
        console.log('✅ 登录成功，token已存储')
      }
    }
    
    return response
  } catch (error) {
    const duration = Date.now() - startTime
    
    console.error('📡 网络请求失败:', {
      url: url.toString(),
      error: error.message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
    
    throw error
  }
}

// Console增强
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
}

console.log = function(...args) {
  originalConsole.log.apply(console, args)
  // 可以在这里添加额外的日志处理
}

console.error = function(...args) {
  originalConsole.error.apply(console, args)
  // 错误自动上报或其他处理
}

export { mountMonitor }