/**
 * 移动端错误日志收集器
 * 负责捕获并上报各类错误到后端
 */

import axios from 'axios'

class ErrorLogger {
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://m.erp.xnamb.cn'
    this.tenantId = null
    this.userId = null
    this.isEnabled = false // 暂时禁用日志记录，避免404错误
    
    // 获取租户和用户信息
    this.updateUserInfo()
  }

  /**
   * 更新用户信息（登录后调用）
   */
  updateUserInfo() {
    this.tenantId = localStorage.getItem('mobile_erp_tenant_id')
    this.userId = localStorage.getItem('mobile_erp_user_id')
  }

  /**
   * 上报错误日志到后端
   */
  async reportError(errorData) {
    if (!this.isEnabled) return

    try {
      // 构建请求数据
      const logData = {
        company_id: this.tenantId || 0,
        user_id: this.userId || null,
        error_type: errorData.type,
        error_level: errorData.level || 'error',
        error_message: errorData.message,
        error_stack: errorData.stack,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        device_info: this.getDeviceInfo(),
        browser_info: this.getBrowserInfo(),
        api_url: errorData.apiUrl,
        api_method: errorData.apiMethod,
        api_status: errorData.apiStatus,
        api_response: errorData.apiResponse,
        performance_metric: errorData.performance
      }

      // 发送日志（不需要认证）
      await axios.post(`${this.apiUrl}/api/mobile/logs/error`, logData, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (err) {
      // 日志上报失败不影响业务，仅在控制台输出
      console.error('[ErrorLogger] 日志上报失败:', err)
    }
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo() {
    const ua = navigator.userAgent
    let device = 'Unknown'
    
    if (/Android/i.test(ua)) {
      device = 'Android'
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      device = 'iOS'
    } else if (/Windows/i.test(ua)) {
      device = 'Windows'
    } else if (/Mac/i.test(ua)) {
      device = 'MacOS'
    }
    
    return JSON.stringify({
      device,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio || 1
    })
  }

  /**
   * 获取浏览器信息
   */
  getBrowserInfo() {
    const ua = navigator.userAgent
    let browser = 'Unknown'
    let version = ''
    
    if (/Chrome\/(\d+)/.test(ua)) {
      browser = 'Chrome'
      version = RegExp.$1
    } else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
      browser = 'Safari'
      version = RegExp.$1
    } else if (/Firefox\/(\d+)/.test(ua)) {
      browser = 'Firefox'
      version = RegExp.$1
    }
    
    return JSON.stringify({
      browser,
      version,
      language: navigator.language,
      online: navigator.onLine
    })
  }

  /**
   * 捕获Vue错误
   */
  captureVueError(err, instance, info) {
    console.error('[Vue Error]', err, info)
    
    this.reportError({
      type: 'vue_error',
      level: 'error',
      message: err.message || String(err),
      stack: err.stack || '',
      performance: {
        component: instance?.$options?.name || 'Unknown',
        lifecycle: info
      }
    })
  }

  /**
   * 捕获API错误
   */
  captureApiError(error) {
    console.error('[API Error]', error)
    
    const errorData = {
      type: 'api_error',
      level: 'error',
      message: error.message || 'API请求失败',
      stack: error.stack || '',
      apiUrl: error.config?.url || '',
      apiMethod: error.config?.method?.toUpperCase() || '',
      apiStatus: error.response?.status || 0,
      apiResponse: JSON.stringify({
        data: error.response?.data || null,
        statusText: error.response?.statusText || ''
      })
    }
    
    this.reportError(errorData)
  }

  /**
   * 捕获全局JS错误
   */
  captureJsError(message, source, lineno, colno, error) {
    console.error('[JS Error]', message, source, lineno, colno, error)
    
    this.reportError({
      type: 'js_error',
      level: 'error',
      message: message || 'JavaScript Error',
      stack: error?.stack || `at ${source}:${lineno}:${colno}`
    })
  }

  /**
   * 捕获未处理的Promise错误
   */
  captureUnhandledRejection(event) {
    console.error('[Unhandled Rejection]', event.reason)
    
    const reason = event.reason
    this.reportError({
      type: 'js_error',
      level: 'error',
      message: reason?.message || String(reason) || 'Unhandled Promise Rejection',
      stack: reason?.stack || ''
    })
  }

  /**
   * 捕获性能问题
   */
  capturePerformance(metricName, metricValue, threshold) {
    if (metricValue > threshold) {
      console.warn(`[Performance] ${metricName}超过阈值: ${metricValue}ms > ${threshold}ms`)
      
      this.reportError({
        type: 'performance',
        level: 'warning',
        message: `${metricName}超过阈值: ${metricValue}ms`,
        stack: '',
        performance: {
          metric: metricName,
          value: metricValue,
          threshold: threshold
        }
      })
    }
  }

  /**
   * 手动记录错误（供业务代码调用）
   */
  logError(message, level = 'error', extraData = {}) {
    this.reportError({
      type: 'manual',
      level,
      message,
      stack: new Error().stack || '',
      ...extraData
    })
  }
}

// 单例模式
const errorLogger = new ErrorLogger()

export default errorLogger
