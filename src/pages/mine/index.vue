<template>
  <div class="mine-page">
    <!-- 用户信息头部 -->
    <div class="user-header">
      <div class="user-avatar">
        <div class="avatar-inner">
          {{ getAvatarText(userInfo.username) }}
        </div>
      </div>
      <div class="user-info">
        <div class="user-name">{{ userInfo.username || '未登录' }}</div>
        <div class="user-company">{{ userInfo.company_name || '暂无公司信息' }}</div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div class="page-content">
      <!-- 账户信息卡片 -->
      <div class="info-card">
        <div class="card-header">
          <van-icon name="contact" class="header-icon" />
          <span class="header-title">账户信息</span>
        </div>
        
        <!-- 切换公司入口 -->
        <div class="company-switch-row" @click="showCompanyPicker">
          <div class="switch-label">切换公司</div>
          <div class="switch-value">
            <span class="company-name">{{ userInfo.company_name || '请选择公司' }}</span>
            <van-icon name="arrow" class="arrow-icon" />
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- 账户详情 -->
        <div class="info-item">
          <div class="item-label">用户名称</div>
          <div class="item-value">{{ userInfo.username || '-' }}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="info-item">
          <div class="item-label">所属公司</div>
          <div class="item-value">{{ userInfo.company_name || '-' }}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="info-item">
          <div class="item-label">租户ID</div>
          <div class="item-value">{{ userInfo.tenant_id || '-' }}</div>
        </div>
      </div>

      <!-- 系统设置卡片 -->
      <div class="settings-card">
        <div class="card-header">
          <van-icon name="setting-o" class="header-icon" />
          <span class="header-title">系统设置</span>
        </div>
        
        <div class="setting-item" @click="handleClearCache">
          <div class="item-content">
            <van-icon name="delete-o" class="item-icon" />
            <span class="item-text">清除缓存</span>
          </div>
          <van-icon name="arrow" class="arrow-icon" />
        </div>
        
        <div class="divider"></div>
        
        <div class="setting-item" @click="handleAbout">
          <div class="item-content">
            <van-icon name="info-o" class="item-icon" />
            <span class="item-text">关于我们</span>
          </div>
          <van-icon name="arrow" class="arrow-icon" />
        </div>
      </div>

      <!-- 退出登录卡片 -->
      <div class="logout-card" @click="handleLogout">
        <van-icon name="warning-o" class="logout-icon" />
        <span class="logout-text">退出登录</span>
      </div>
    </div>

    <!-- 公司选择弹窗 -->
    <van-popup 
      v-model:show="showPicker" 
      position="center"
      round
      :style="{ width: '80%', maxWidth: '300px' }"
      :z-index="2000"
    >
      <div class="popup-card">
        <div class="popup-header">
          <div class="popup-title">选择公司</div>
          <van-icon name="cross" @click="showPicker = false" class="close-icon" />
        </div>
        <div class="popup-content">
          <div 
            v-for="company in companyList" 
            :key="company.id"
            class="company-option"
            :class="{ active: company.id == userInfo.tenant_id }"
            @click="selectCompanyOption(company)"
          >
            <van-icon 
              name="checked" 
              v-if="company.id == userInfo.tenant_id" 
              class="check-icon"
            />
            <span class="company-name-text">{{ company.name }}</span>
          </div>
        </div>
        <div class="popup-footer">
          <van-button 
            type="primary" 
            block 
            @click="confirmCompanySelection"
            class="confirm-btn"
          >
            确定
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, showSuccessToast } from 'vant'
import { logout } from '@/api/auth'
import request from '@/utils/request'
import { showError } from '@/utils/toast'

const router = useRouter()

// 用户信息
const userInfo = ref({
  username: '',
  company_name: '',
  tenant_id: ''
})

// 公司列表和弹窗控制
const companyList = ref([])
const showPicker = ref(false)
const tempSelectedCompany = ref(null)

// 获取头像文字
const getAvatarText = (username) => {
  if (!username) return 'U'
  return username.charAt(0).toLowerCase()
}

// 显示公司选择器
const showCompanyPicker = async () => {
  console.log('[DEBUG] showCompanyPicker called')
  console.log('[DEBUG] showPicker before:', showPicker.value)
  
  try {
    // 从API获取用户的公司列表
    const response = await request({
      url: '/api/mobile/user/companies',
      method: 'GET'
    })
    
    if (response && Array.isArray(response)) {
      companyList.value = response.map(item => ({
        id: item.company_id,
        name: item.company_name
      }))
    } else {
      companyList.value = []
    }
    
    tempSelectedCompany.value = userInfo.value.tenant_id
    showPicker.value = true
    
    console.log('[DEBUG] showPicker after:', showPicker.value)
    console.log('[DEBUG] companyList:', companyList.value)
  } catch (error) {
    console.error('[DEBUG] 获取公司列表失败:', error)
    showError('获取公司列表失败')
  }
}

// 选择公司选项（临时选择）
const selectCompanyOption = (company) => {
  console.log('[DEBUG] selectCompanyOption:', company)
  tempSelectedCompany.value = company.id
}

// 确认公司选择
const confirmCompanySelection = () => {
  console.log('[DEBUG] confirmCompanySelection, tempSelectedCompany:', tempSelectedCompany.value)
  
  if (tempSelectedCompany.value) {
    const selectedCompany = companyList.value.find(c => c.id == tempSelectedCompany.value)
    if (selectedCompany) {
      onSelectCompany(selectedCompany)
    }
  }
  showPicker.value = false
}

// 选择公司
const onSelectCompany = (company) => {
  try {
    console.log('[DEBUG] onSelectCompany:', company)
    
    // 更新用户信息
    userInfo.value.company_name = company.name
    userInfo.value.tenant_id = company.id
    
    // 更新本地存储
    const userStr = localStorage.getItem('mobile_erp_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      user.company_name = company.name
      user.companyName = company.name
      user.tenant_id = company.id
      user.companyId = company.id
      localStorage.setItem('mobile_erp_user', JSON.stringify(user))
    }
    
    localStorage.setItem('mobile_erp_tenant_id', company.id.toString())
    
    showSuccessToast('切换成功')
  } catch (error) {
    console.error('[Switch Company Error]', error)
    showError('切换失败')
  }
}

// 加载用户信息
const loadUserInfo = () => {
  try {
    const userStr = localStorage.getItem('mobile_erp_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      userInfo.value = {
        username: user.username || user.name || '',
        company_name: user.company_name || user.companyName || '',
        tenant_id: user.tenant_id || user.companyId || localStorage.getItem('mobile_erp_tenant_id') || ''
      }
    }
  } catch (error) {
    console.error('[Load User Info Error]', error)
  }
}

// 清除缓存
const handleClearCache = () => {
  Dialog.confirm({
    title: '清除缓存',
    message: '确定要清除所有缓存数据吗？'
  }).then(() => {
    const token = localStorage.getItem('mobile_erp_token')
    const tenantId = localStorage.getItem('mobile_erp_tenant_id')
    const user = localStorage.getItem('mobile_erp_user')
    
    localStorage.clear()
    
    if (token) localStorage.setItem('mobile_erp_token', token)
    if (tenantId) localStorage.setItem('mobile_erp_tenant_id', tenantId)
    if (user) localStorage.setItem('mobile_erp_user', user)
    
    showSuccessToast('缓存已清除')
  }).catch(() => {})
}

// 关于我们
const handleAbout = () => {
  Dialog.alert({
    title: '关于我们',
    message: 'ERP移动端 v1.0.0\n\n一款专为企业打造的移动办公应用，\n支持订单管理、客户管理、数据统计等功能。\n\n技术支持: Vue3 + Vant4',
    confirmButtonText: '我知道了'
  })
}

// 退出登录
const handleLogout = () => {
  Dialog.confirm({
    title: '退出登录',
    message: '确定要退出登录吗？'
  }).then(async () => {
    try {
      await logout()
    } catch (error) {
      console.error('[Logout Error]', error)
    } finally {
      localStorage.removeItem('mobile_erp_token')
      localStorage.removeItem('mobile_erp_tenant_id')
      localStorage.removeItem('mobile_erp_user')
      
      showSuccessToast('已退出登录')
      router.replace('/login')
    }
  }).catch(() => {})
}

// 页面加载
onMounted(() => {
  loadUserInfo()
})
</script>

<style lang="less" scoped>
.mine-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

// 用户信息头部
.user-header {
  background: linear-gradient(135deg, #6A5ACD 0%, #9370DB 100%);
  padding: 40px 16px 30px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
  height: 80px;
  flex-shrink: 0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #E6E6FA;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-inner {
  font-size: 16px;
  font-weight: 500;
  color: #6A5ACD;
  text-transform: uppercase;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-company {
  font-size: 14px;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 页面内容
.page-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

// 卡片通用样式
.info-card, .settings-card {
  background: #FFFFFF;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 16px 16px 12px;
  font-weight: 500;
  color: #333;
  font-size: 16px;
}

.header-icon {
  margin-right: 8px;
  color: #1677FF;
}

// 分割线
.divider {
  height: 1px;
  background: #F0F0F0;
  margin: 0 16px;
}

// 信息项样式
.info-item {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-label {
  font-size: 14px;
  color: #666;
}

.item-value {
  font-size: 16px;
  color: #333;
  text-align: right;
  flex: 1;
  margin-left: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 公司切换行
.company-switch-row {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.company-switch-row:active {
  background-color: #F5F5F5;
}

.switch-label {
  font-size: 16px;
  color: #333;
}

.switch-value {
  display: flex;
  align-items: center;
  color: #1677FF;
}

.company-name {
  font-size: 16px;
  margin-right: 8px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  font-size: 14px;
  color: #999;
}

// 设置项样式
.setting-item {
  padding: 0 16px;
  height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.setting-item:active {
  background-color: #F5F5F5;
}

.item-content {
  display: flex;
  align-items: center;
}

.item-icon {
  font-size: 16px;
  color: #333;
  margin-right: 12px;
}

.item-text {
  font-size: 16px;
  color: #333;
}

// 退出登录卡片
.logout-card {
  background: linear-gradient(135deg, #FF4D4F 0%, #F53F3F 100%);
  border-radius: 8px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: auto;  /* 自动推到底部 */
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.logout-card:active {
  opacity: 0.8;
}

.logout-icon {
  font-size: 16px;
  color: #FFFFFF;
  margin-right: 8px;
}

.logout-text {
  font-size: 16px;
  color: #FFFFFF;
  font-weight: 500;
}

// 弹窗样式
.popup-card {
  background: #FFFFFF;
  border-radius: 8px;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.popup-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.close-icon {
  font-size: 20px;
  color: #999;
  cursor: pointer;
}

.popup-content {
  padding: 8px 0;
  max-height: 300px;
  overflow-y: auto;
}

.company-option {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.company-option:active {
  background-color: #F5F5F5;
}

.company-option.active {
  background-color: #f0f8ff;
}

.check-icon {
  margin-right: 12px;
  color: #1677FF;
}

.company-name-text {
  font-size: 16px;
  color: #333;
}

.popup-footer {
  padding: 16px;
  border-top: 1px solid #F0F0F0;
}

.confirm-btn {
  height: 40px;
  border-radius: 4px;
}

// 版本信息
.version-info {
  text-align: center;
  padding: 32px 16px 16px;
  font-size: 12px;
  color: #999;
  line-height: 1.8;
  margin-top: 16px;
}
</style>