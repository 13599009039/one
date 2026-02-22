<template>
  <div class="frontend-monitor">
    <!-- 监测面板 -->
    <div class="monitor-panel">
      <div class="panel-header">
        <h3>🚀 前端状态监测面板</h3>
        <div class="status-indicators">
          <span class="indicator" :class="{ active: isDevServerRunning }">
            开发服务: {{ isDevServerRunning ? '🟢 运行中' : '🔴 未启动' }}
          </span>
          <span class="indicator" :class="{ active: isLoggedIn }">
            登录状态: {{ isLoggedIn ? '🟢 已登录' : '🔴 未登录' }}
          </span>
          <span class="indicator" :class="{ active: hasApiConnection }">
            API连接: {{ hasApiConnection ? '🟢 正常' : '🔴 异常' }}
          </span>
        </div>
      </div>

      <!-- 实时日志 -->
      <div class="log-container">
        <h4>📋 实时日志</h4>
        <div class="logs" ref="logContainer">
          <div 
            v-for="(log, index) in logs" 
            :key="index" 
            :class="['log-item', log.type]"
          >
            <span class="timestamp">[{{ log.time }}]</span>
            <span class="type">[{{ log.type.toUpperCase() }}]</span>
            <span class="message">{{ log.message }}</span>
          </div>
        </div>
        <button @click="clearLogs" class="clear-btn">清空日志</button>
      </div>

      <!-- 网络请求监测 -->
      <div class="network-monitor">
        <h4>🌐 网络请求监测</h4>
        <div class="requests">
          <div 
            v-for="req in recentRequests" 
            :key="req.id"
            class="request-item"
            :class="{ failed: req.status >= 400 }"
          >
            <span class="method">{{ req.method }}</span>
            <span class="url">{{ req.url }}</span>
            <span class="status">{{ req.status }}</span>
            <span class="time">{{ req.duration }}ms</span>
          </div>
        </div>
      </div>

      <!-- 错误追踪 -->
      <div class="error-tracker">
        <h4>🚨 错误追踪</h4>
        <div class="errors">
          <div 
            v-for="error in errors" 
            :key="error.id"
            class="error-item"
          >
            <div class="error-title">{{ error.title }}</div>
            <div class="error-message">{{ error.message }}</div>
            <div class="error-stack" v-if="error.stack">{{ error.stack }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// 状态变量
const isDevServerRunning = ref(false)
const isLoggedIn = ref(false)
const hasApiConnection = ref(false)
const logs = ref([])
const recentRequests = ref([])
const errors = ref([])
const logContainer = ref(null)

// 添加日志
const addLog = (type, message) => {
  const now = new Date()
  const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
  
  logs.value.push({
    id: Date.now(),
    time: timeStr,
    type,
    message
  })
  
  // 保持最新的100条日志
  if (logs.value.length > 100) {
    logs.value.shift()
  }
  
  // 滚动到底部
  setTimeout(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  }, 0)
}

// 清空日志
const clearLogs = () => {
  logs.value = []
}

// 监测开发服务器状态
const checkDevServer = async () => {
  try {
    const response = await fetch('http://localhost:8090')
    isDevServerRunning.value = response.ok
    addLog('info', `开发服务器状态检查: ${response.ok ? '正常' : '异常'}`)
  } catch (error) {
    isDevServerRunning.value = false
    addLog('error', `开发服务器连接失败: ${error.message}`)
  }
}

// 监测登录状态
const checkLoginStatus = () => {
  const token = localStorage.getItem('mobile_token')
  isLoggedIn.value = !!token
  addLog('info', `登录状态检查: ${isLoggedIn.value ? '已登录' : '未登录'}`)
}

// 监测API连接
const checkApiConnection = async () => {
  try {
    const response = await fetch('http://127.0.0.1:8051/api/health')
    hasApiConnection.value = response.ok
    addLog('info', `API连接检查: ${response.ok ? '正常' : '异常'}`)
  } catch (error) {
    hasApiConnection.value = false
    addLog('error', `API连接失败: ${error.message}`)
  }
}

// 拦截网络请求
const interceptRequests = () => {
  const originalFetch = window.fetch
  
  window.fetch = async function(...args) {
    const startTime = Date.now()
    const url = args[0]
    const options = args[1] || {}
    
    try {
      const response = await originalFetch.apply(this, args)
      const duration = Date.now() - startTime
      
      // 记录请求
      recentRequests.value.unshift({
        id: Date.now(),
        method: options.method || 'GET',
        url: url.toString(),
        status: response.status,
        duration
      })
      
      // 保持最新的20个请求
      if (recentRequests.value.length > 20) {
        recentRequests.value.pop()
      }
      
      addLog('network', `${options.method || 'GET'} ${url} -> ${response.status} (${duration}ms)`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      recentRequests.value.unshift({
        id: Date.now(),
        method: options.method || 'GET',
        url: url.toString(),
        status: 'ERROR',
        duration
      })
      
      if (recentRequests.value.length > 20) {
        recentRequests.value.pop()
      }
      
      addLog('error', `网络请求失败: ${options.method || 'GET'} ${url} -> ${error.message}`)
      throw error
    }
  }
}

// 捕获全局错误
const captureErrors = () => {
  window.addEventListener('error', (event) => {
    errors.value.unshift({
      id: Date.now(),
      title: 'JavaScript错误',
      message: event.message,
      stack: event.error?.stack
    })
    
    if (errors.value.length > 10) {
      errors.value.pop()
    }
    
    addLog('error', `JavaScript错误: ${event.message}`)
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    errors.value.unshift({
      id: Date.now(),
      title: '未处理的Promise拒绝',
      message: event.reason?.message || event.reason,
      stack: event.reason?.stack
    })
    
    if (errors.value.length > 10) {
      errors.value.pop()
    }
    
    addLog('error', `Promise错误: ${event.reason?.message || event.reason}`)
  })
}

// 定期检查状态
let checkInterval

onMounted(() => {
  addLog('info', '前端监测系统已启动')
  
  // 立即检查一次
  checkDevServer()
  checkLoginStatus()
  checkApiConnection()
  
  // 设置定期检查
  checkInterval = setInterval(() => {
    checkDevServer()
    checkLoginStatus()
    checkApiConnection()
  }, 5000)
  
  // 设置拦截器
  interceptRequests()
  captureErrors()
})

onBeforeUnmount(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
  addLog('info', '前端监测系统已停止')
})
</script>

<style scoped>
.frontend-monitor {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 400px;
  max-height: 90vh;
  background: #1e1e1e;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 9999;
  font-family: monospace;
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #444;
}

.panel-header h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #4ecdc4;
}

.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.indicator {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  background: #444;
  transition: all 0.3s;
}

.indicator.active {
  background: #2ecc71;
}

.log-container {
  padding: 16px;
  border-bottom: 1px solid #444;
}

.log-container h4 {
  margin: 0 0 12px 0;
  color: #4ecdc4;
  font-size: 14px;
}

.logs {
  height: 200px;
  overflow-y: auto;
  background: #000;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  margin-bottom: 8px;
}

.log-item {
  margin-bottom: 4px;
  word-break: break-all;
}

.log-item.info { color: #3498db; }
.log-item.error { color: #e74c3c; }
.log-item.warn { color: #f39c12; }
.log-item.network { color: #9b59b6; }

.timestamp {
  color: #7f8c8d;
  margin-right: 8px;
}

.type {
  margin-right: 8px;
  font-weight: bold;
}

.clear-btn {
  padding: 4px 8px;
  background: #34495e;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.clear-btn:hover {
  background: #2c3e50;
}

.network-monitor {
  padding: 16px;
  border-bottom: 1px solid #444;
}

.network-monitor h4 {
  margin: 0 0 12px 0;
  color: #4ecdc4;
  font-size: 14px;
}

.requests {
  max-height: 150px;
  overflow-y: auto;
}

.request-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  background: #2d2d2d;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 11px;
}

.request-item.failed {
  background: #3e2723;
  border-left: 3px solid #e74c3c;
}

.method {
  width: 50px;
  font-weight: bold;
}

.url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0 8px;
}

.status {
  width: 40px;
  text-align: center;
}

.time {
  width: 60px;
  text-align: right;
  color: #7f8c8d;
}

.error-tracker {
  padding: 16px;
}

.error-tracker h4 {
  margin: 0 0 12px 0;
  color: #4ecdc4;
  font-size: 14px;
}

.errors {
  max-height: 150px;
  overflow-y: auto;
}

.error-item {
  background: #3e2723;
  border-left: 3px solid #e74c3c;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 12px;
}

.error-title {
  font-weight: bold;
  color: #e74c3c;
  margin-bottom: 4px;
}

.error-message {
  color: #ecf0f1;
  margin-bottom: 8px;
}

.error-stack {
  background: #000;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 10px;
  max-height: 100px;
  overflow-y: auto;
  color: #bdc3c7;
}
</style>