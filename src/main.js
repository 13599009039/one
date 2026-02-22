import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { setupVant } from './plugins/vant'
import errorLogger from '@/utils/errorLogger'
import '@/styles/index.less'

// 引入前端监测系统
import './monitor'

const app = createApp(App)

// 配置Vant UI组件库
setupVant(app)

// 配置路由
app.use(router)

// 全局错误处理 - 捕获Vue组件错误
app.config.errorHandler = (err, instance, info) => {
  console.error('[Global Error]', err, info)
  errorLogger.captureVueError(err, instance, info)
}

// 捕获全局JS错误
window.onerror = (message, source, lineno, colno, error) => {
  errorLogger.captureJsError(message, source, lineno, colno, error)
  return false // 继续执行浏览器默认错误处理
}

// 捕获未处理的Promise错误
window.addEventListener('unhandledrejection', (event) => {
  errorLogger.captureUnhandledRejection(event)
})

app.mount('#app')
