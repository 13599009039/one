<template>
  <div class="login-container">
    <!-- Logo区域 -->
    <div class="logo-section">
      <div class="logo-circle">鲜鸟</div>
    </div>

    <!-- 登录表单 -->
    <van-form @submit="handleLogin" class="login-form">
      <div class="form-card">
        <van-field
          v-model="formData.username"
          name="username"
          placeholder="请输入手机号或用户名"
          :rules="[{ required: true, message: '' }]"
          :show-error-message="false"
          clearable
          class="input-field"
          @focus="handleInputFocus('username')"
          @blur="handleInputBlur('username')"
        />
        
        <van-field
          v-model="formData.password"
          name="password"
          type="password"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '' }]"
          :show-error-message="false"
          clearable
          class="input-field"
          @focus="handleInputFocus('password')"
          @blur="handleInputBlur('password')"
        />
        
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          :loading="loading"
          loading-text="登录中..."
          class="login-button"
        >
          登录
        </van-button>
        
        <div class="form-footer">
          <van-checkbox v-model="rememberMe">记住密码</van-checkbox>
          <a @click.prevent="handleForgetPassword" class="forget-password">忘记密码</a>
        </div>
      </div>
    </van-form>

    <!-- 底部信息 -->
    <div class="footer-info">
      <p class="copyright">© 2026 鲜鸟</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { login } from '@/api/auth'
import errorLogger from '@/utils/errorLogger'
import { showError, showSuccess } from '@/utils/toast'

const router = useRouter()

// 表单数据
const formData = ref({
  username: '',
  password: ''
})

const rememberMe = ref(false)
const loading = ref(false)
const focusedField = ref('')

// 输入框聚焦处理
const handleInputFocus = (field) => {
  focusedField.value = field
}

const handleInputBlur = () => {
  focusedField.value = ''
}

// 忘记密码处理
const handleForgetPassword = () => {
  showToast('请联系管理员重置密码')
}

// 登录处理
const handleLogin = async () => {
  try {
    loading.value = true
    
    console.log('[Login Start] Username:', formData.value.username)
    
    // 调用登录API
    const res = await login({
      username: formData.value.username,
      password: formData.value.password
    })
    
    console.log('[Login Success] Response:', res)
    
    // 保存Token和用户信息
    localStorage.setItem('mobile_erp_token', res.token)
    if (res.refresh_token) {
      localStorage.setItem('mobile_erp_refresh_token', res.refresh_token)
    }
    localStorage.setItem('mobile_erp_tenant_id', res.tenant.id)
    localStorage.setItem('mobile_erp_user_id', res.user.id)
    
    // 合并用户信息和公司信息
    const userWithCompany = {
      ...res.user,
      company_name: res.tenant.name,
      tenant_id: res.tenant.id
    }
    localStorage.setItem('mobile_erp_user', JSON.stringify(userWithCompany))
    localStorage.setItem('mobile_erp_tenant', JSON.stringify(res.tenant))
    
    // 更新错误日志收集器的用户信息
    errorLogger.updateUserInfo()
    
    // 记住密码
    if (rememberMe.value) {
      localStorage.setItem('mobile_erp_remember', JSON.stringify({
        username: formData.value.username,
        password: formData.value.password
      }))
    } else {
      localStorage.removeItem('mobile_erp_remember')
    }
    
    showSuccess('登录成功')
    
    // 跳转到主页
    setTimeout(() => {
      router.replace('/main/customer')
    }, 1500) // 延长显示时间
    
  } catch (error) {
    console.error('[Login Error]', error)
    loading.value = false // 确保loading状态重置
    
    // 特殊错误码处理
    let errorMessage = ''
    if (error.code === 'MOBILE_ACCESS_DENIED') {
      errorMessage = '请联系管理员开通移动端访问权限'
    } else if (error.code === 'USER_DISABLED') {
      errorMessage = '账号已被禁用，请联系管理员'
    } else if (error.code === 'COMPANY_DISABLED') {
      errorMessage = '您在该公司的权限已被停用'
    } else if (error.code === 'PASSWORD_ERROR') {
      errorMessage = '密码错误'
    } else if (error.code === 'USER_NOT_FOUND') {
      errorMessage = '用户不存在或未绑定公司'
    } else {
      errorMessage = error.message || '登录失败，请重试'
    }
    
    console.log('[Login Failed] Error Message:', errorMessage)
    showError(errorMessage)
    
    // 延迟重置loading状态，确保错误提示显示完整
    setTimeout(() => {
      loading.value = false
    }, 2000)
  }
}

// 页面加载时读取记住的密码
const loadRememberMe = () => {
  const remember = localStorage.getItem('mobile_erp_remember')
  if (remember) {
    try {
      const data = JSON.parse(remember)
      formData.value.username = data.username
      formData.value.password = data.password
      rememberMe.value = true
    } catch (error) {
      console.error('[Load Remember Error]', error)
    }
  }
}

// 初始化
loadRememberMe()
</script>

<style lang="less" scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.logo-section {
  text-align: center;
  margin-bottom: 64px; /* 增加间距以补偿删除标题的影响 */
  width: 100%;
  
  .logo-circle {
    width: 72px;
    height: 72px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

.login-form {
  width: 100%;
  max-width: 400px;
  
  .form-card {
    background: transparent;
    backdrop-filter: none;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
  }
  
  .input-field {
    background: #f5f5f5;
    border: none;
    border-radius: 25px;
    margin-bottom: 16px;
    transition: all 0.3s ease;
    height: 50px;
    overflow: hidden;
    
    &:focus-within {
      background: #fff;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }
    
    :deep(.van-cell) {
      width: 100%;
      padding: 0;
      background: transparent !important;
      height: 50px;
      border-radius: 0;
      
      &::after {
        display: none !important;
      }
    }
    
    :deep(.van-field__body) {
      width: 100%;
      padding: 0 20px;
      height: 50px;
      display: flex;
      align-items: center;
      background: transparent !important;
    }
    
    :deep(.van-field__control) {
      width: 100%;
      font-size: 16px;
      color: #333;
      line-height: 50px;
      background: transparent !important;
      border: none !important;
    }
    
    :deep(.van-field__control::placeholder) {
      color: #999;
      font-size: 16px;
    }
    
    :deep(.van-field__clear) {
      margin-right: 0;
      color: #999;
    }
    
    :deep(.van-field__error-message) {
      display: none;
    }
    
    :deep(.van-field__left-icon),
    :deep(.van-field__right-icon) {
      background: transparent !important;
    }
  }
  
  .form-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    
    .forget-password {
      font-size: 14px;
      color: #667eea;
      text-decoration: none;
      font-weight: 400;
      cursor: pointer;
    }
    
    :deep(.van-checkbox__label) {
      color: #6b7280;
      font-size: 14px;
      font-weight: 400;
    }
    
    :deep(.van-checkbox__icon) {
      font-size: 18px;
    }
    
    :deep(.van-checkbox__icon--checked) {
      background-color: #667eea;
      border-color: #667eea;
    }
  }
  
  .login-button {
    width: 100%;
    height: 50px;
    margin-top: 24px;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 500;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    transition: all 0.3s ease;
    border-radius: 12px;
    
    &:active {
      transform: scale(0.98);
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
    }
    
    :deep(.van-button__text) {
      color: #fff;
      font-weight: 500;
    }
  }
}


.footer-info {
  text-align: center;
  margin-top: 32px;
  padding: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  width: 100%;
  
  .copyright {
    margin: 0;
    font-weight: 400;
  }
}
</style>
