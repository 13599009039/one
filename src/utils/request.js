import axios from 'axios'
import { showFailToast } from 'vant'
import router from '@/router'
import errorLogger from './errorLogger'
import { showError } from './toast'

// 统一顶部错误提示函数（已迁移到toast.js，保留兼容）
const showTopError = showError

// 全局token刷新状态管理
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

// Token刷新函数
const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('mobile_erp_refresh_token')
    if (!refreshToken) {
      // 没有refresh_token，直接清除认证信息并跳转登录
      console.warn('[Token Refresh] No refresh token available, redirecting to login')
      localStorage.removeItem('mobile_erp_token')
      localStorage.removeItem('mobile_erp_user_id')
      localStorage.removeItem('mobile_erp_tenant_id')
      localStorage.removeItem('mobile_erp_user')
      localStorage.removeItem('mobile_erp_tenant')
      
      // 跳转登录页
      showTopError('登录已过期，请重新登录')
      router.push('/login')
      
      throw new Error('NO_REFRESH_TOKEN')
    }
    
    const response = await axios.post('/api/mobile/auth/refresh', {
      refresh_token: refreshToken
    }, {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://m.erp.xnamb.cn',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8'
      }
    })
    
    const { token, refresh_token: newRefreshToken } = response.data
    localStorage.setItem('mobile_erp_token', token)
    if (newRefreshToken) {
      localStorage.setItem('mobile_erp_refresh_token', newRefreshToken)
    }
    
    return token
  } catch (error) {
    console.error('[Token Refresh Error]', error)
    // 刷新失败，清除所有认证信息
    localStorage.removeItem('mobile_erp_token')
    localStorage.removeItem('mobile_erp_refresh_token')
    localStorage.removeItem('mobile_erp_user_id')
    localStorage.removeItem('mobile_erp_tenant_id')
    localStorage.removeItem('mobile_erp_user')
    localStorage.removeItem('mobile_erp_tenant')
    throw error
  }
}

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://m.erp.xnamb.cn',
  timeout: import.meta.env.VITE_API_TIMEOUT || 30000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 添加认证token
    const token = localStorage.getItem('mobile_erp_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    } else {
      // 如果是需要认证的接口但没有token，直接跳转登录
      // 注意：登录接口(/api/mobile/auth/login)除外
      const authRequiredPaths = [
        '/api/mobile/auth/userinfo',
        '/api/mobile/auth/logout',
        '/api/mobile/auth/refresh',
        '/api/common/',
        '/api/orders/'
      ]
      
      const requiresAuth = authRequiredPaths.some(path => 
        config.url.includes(path)
      )
      
      if (requiresAuth) {
        console.warn('[Auth Warning] No token found for protected route:', config.url)
        // 延迟跳转，避免干扰当前请求
        setTimeout(() => {
          window.location.href = '/#/login'
        }, 100)
        return Promise.reject(new Error('AUTH_REQUIRED'))
      }
    }
    
    // 添加租户ID
    const tenantId = localStorage.getItem('mobile_erp_tenant_id')
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId
    }
    
    // 添加用户ID
    const userId = localStorage.getItem('mobile_erp_user_id')
    if (userId) {
      config.headers['X-User-ID'] = userId
    }
    
    // 添加时间戳防止缓存
    config.headers['X-Requested-With'] = 'XMLHttpRequest'
    
    console.log('[API Request]', config.method?.toUpperCase(), config.url)
    return config
  },
  error => {
    console.error('[Request Interceptor Error]', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    const res = response.data
    
    console.log('[API Response]', response.config.url, res)
    
    // 标准化后端返回格式处理
    if (typeof res === 'object' && res !== null) {
      // 处理 { success: true, code: 'SUCCESS', message: '', data: {} } 格式
      if (res.success === false) {
        const errorMsg = res.message || res.msg || '请求失败'
        showTopError(errorMsg)
        return Promise.reject(new Error(errorMsg))
      }
      
      // 返回data字段或整个响应对象
      return res.data || res.result || res
    }
    
    return res
  },
  error => {
    console.error('[Response Error]', error)
    
    // 记录API错误到日志系统
    errorLogger.captureApiError(error)
    
    const originalRequest = error.config
    
    if (error.response) {
      const { status, data } = error.response
      
      // 401错误处理 - token过期自动刷新
      if (status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // 如果正在刷新，将请求加入队列等待
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
            return request(originalRequest)
          })
        }
        
        originalRequest._retry = true
        isRefreshing = true
        
        return refreshToken().then(newToken => {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          processQueue(null, newToken)
          isRefreshing = false
          return request(originalRequest)
        }).catch(refreshError => {
          processQueue(refreshError, null)
          isRefreshing = false
          
          // 刷新失败，跳转登录
          showTopError('登录已过期，请重新登录')
          localStorage.removeItem('mobile_erp_token')
          localStorage.removeItem('mobile_erp_refresh_token')
          localStorage.removeItem('mobile_erp_user_id')
          localStorage.removeItem('mobile_erp_tenant_id')
          router.push('/login')
          
          return Promise.reject(refreshError)
        })
      }
      
      switch (status) {
        case 403:
          showTopError(data?.message || data?.msg || '没有权限访问')
          break
        case 404:
          showTopError(data?.message || data?.msg || '请求的资源不存在')
          break
        case 500:
          showTopError(data?.message || data?.msg || '服务器内部错误')
          break
        default:
          showTopError(data?.message || data?.msg || `请求失败 (${status})`)
      }
    } else if (error.request) {
      // 网络错误
      showTopError('网络连接失败，请检查网络设置')
    } else {
      // 其他错误
      showTopError(error.message || '请求发生未知错误')
    }
    
    return Promise.reject(error)
  }
)

export default request
