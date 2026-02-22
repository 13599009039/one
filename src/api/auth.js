import request from '@/utils/request'

/**
 * 移动端登录
 */
export function login(data) {
  console.log('[API Auth] Login request data:', data)
  
  return request({
    url: '/api/mobile/auth/login',
    method: 'POST',
    data
  }).then(response => {
    // 登录成功后保存token和refresh_token
    if (response.token) {
      localStorage.setItem('mobile_erp_token', response.token)
    }
    if (response.refresh_token) {
      localStorage.setItem('mobile_erp_refresh_token', response.refresh_token)
    }
    return response
  }).catch(error => {
    console.error('[API Auth] Login error caught:', error)
    
    // 如果是网络错误或服务器错误，提供更详细的错误信息
    if (error.code === 'NETWORK_ERROR') {
      throw new Error('网络连接失败，请检查网络设置')
    } else if (error.response?.status === 500) {
      throw new Error('服务器内部错误，请稍后重试')
    } else if (error.response?.status === 404) {
      throw new Error('登录接口不存在，请联系管理员')
    } else {
      // 保持原有错误对象，但添加更多上下文信息
      const enhancedError = new Error(error.message || '登录失败')
      enhancedError.originalError = error
      enhancedError.code = error.code || 'LOGIN_FAILED'
      throw enhancedError
    }
  })
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return request({
    url: '/api/mobile/auth/userinfo',
    method: 'GET'
  })
}

/**
 * 退出登录
 */
export function logout() {
  return request({
    url: '/api/mobile/auth/logout',
    method: 'POST'
  })
}
