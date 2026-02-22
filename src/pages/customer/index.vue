<template>
  <div class="customer-page">
    <!-- 统一搜索栏 -->
    <div class="search-section">
      <div class="search-container">
        <van-icon name="search" class="search-icon" />
        <input 
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索店铺名称、抖音名"
          @keyup.enter="handleSearch"
        />
        <van-button 
          v-if="searchKeyword" 
          class="search-clear" 
          type="default" 
          size="small" 
          @click="handleClear"
        >
          清除
        </van-button>
      </div>
    </div>

    <!-- 客户列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        v-model:error="error"
        :finished="finished"
        finished-text="没有更多了"
        error-text="请求失败，点击重新加载"
        @load="onLoad"
      >
        <div 
          v-for="customer in customerList" 
          :key="customer.id" 
          class="customer-card"
          :class="getStatusClass(customer.status)"
          @click="goToDetail(customer.id)"
        >
          <!-- 状态指示器 -->
          <div class="status-indicator" :class="getStatusIndicatorClass(customer.status)"></div>
          
          <!-- 主要内容区域 -->
          <div class="card-content">
            <!-- 店铺头部信息 -->
            <div class="customer-header">
              <div class="shop-info">
                <div class="shop-name">
                  <van-icon name="shop-o" class="shop-icon" />
                  <span class="name-text">{{ customer.shop_name || '未命名店铺' }}</span>
                </div>
                <div class="status-badge" :class="getStatusBadgeClass(customer.status)">
                  <van-icon :name="getStatusIcon(customer.status)" />
                  <span>{{ customer.status || '未知' }}</span>
                </div>
              </div>
            </div>
            
            <!-- 店铺详细信息 -->
            <div class="customer-details">
              <div class="detail-item" v-if="customer.douyin_name">
                <van-icon name="video-o" class="detail-icon" />
                <span class="detail-text">抖音: {{ customer.douyin_name }}</span>
              </div>
              <div class="detail-item" v-if="customer.region">
                <van-icon name="location-o" class="detail-icon" />
                <span class="detail-text">{{ customer.region }}</span>
              </div>
              <div class="detail-item" v-if="customer.business_staff">
                <van-icon name="manager-o" class="detail-icon" />
                <span class="detail-text">业务: {{ customer.business_staff }}</span>
              </div>
            </div>
            
            <!-- 数据统计卡片 -->
            <div class="stats-container">
              <div class="stat-card">
                <div class="stat-header">
                  <van-icon name="orders-o" class="stat-icon" />
                  <span class="stat-title">订单数</span>
                </div>
                <div class="stat-number">{{ customer.order_count || 0 }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-header">
                  <van-icon name="gold-coin-o" class="stat-icon" />
                  <span class="stat-title">累计金额</span>
                </div>
                <div class="stat-amount">¥{{ formatCurrency(customer.total_amount || 0) }}</div>
              </div>
            </div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <!-- 空状态 -->
    <van-empty v-if="!loading && customerList.length === 0" description="暂无客户数据" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCustomerList } from '@/api/customer'
import { showError } from '@/utils/toast'

const router = useRouter()

// 搜索关键词
const searchKeyword = ref('')

// 列表数据
const customerList = ref([])
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const error = ref(false)

// 分页参数
const currentPage = ref(1)
const pageSize = ref(20)

// 加载客户列表
const loadCustomerList = async (isRefresh = false) => {
  try {
    if (isRefresh) {
      currentPage.value = 1
      customerList.value = []
      finished.value = false
    }

    loading.value = true
    error.value = false

    const params = {
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: searchKeyword.value
    }

    const res = await getCustomerList(params)
    
    const newList = res.list || res.customers || []
    
    if (isRefresh) {
      customerList.value = newList
    } else {
      customerList.value = [...customerList.value, ...newList]
    }

    // 判断是否还有更多数据
    if (newList.length < pageSize.value) {
      finished.value = true
    } else {
      currentPage.value++
    }

  } catch (err) {
    console.error('[Load Customer Error]', err)
    error.value = true
    showError(err.message || '加载失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 下拉刷新
const onRefresh = () => {
  loadCustomerList(true)
}

// 上拉加载
const onLoad = () => {
  loadCustomerList(false)
}

// 搜索
const handleSearch = () => {
  loadCustomerList(true)
}

// 清空搜索
const handleClear = () => {
  searchKeyword.value = ''
  loadCustomerList(true)
}

// 跳转到详情
const goToDetail = (id) => {
  router.push(`/customer/${id}`)
}

// 日期格式化
const formatDate = (dateStr) => {
  if (!dateStr) return '无'
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

// 状态样式类映射
const getStatusClass = (status) => {
  const classMap = {
    '跟进中': 'status-following',
    '已流失': 'status-lost',
    '已成交': 'status-success',
    '潜在客户': 'status-potential'
  }
  return classMap[status] || 'status-default'
}

// 状态指示器类映射
const getStatusIndicatorClass = (status) => {
  const indicatorMap = {
    '跟进中': 'indicator-following',
    '已流失': 'indicator-lost',
    '已成交': 'indicator-success',
    '潜在客户': 'indicator-potential'
  }
  return indicatorMap[status] || 'indicator-default'
}

// 状态徽章类映射
const getStatusBadgeClass = (status) => {
  const badgeMap = {
    '跟进中': 'badge-following',
    '已流失': 'badge-lost',
    '已成交': 'badge-success',
    '潜在客户': 'badge-potential'
  }
  return badgeMap[status] || 'badge-default'
}

// 状态图标映射
const getStatusIcon = (status) => {
  const iconMap = {
    '跟进中': 'underway-o',
    '已流失': 'warning-o',
    '已成交': 'checked',
    '潜在客户': 'question-o'
  }
  return iconMap[status] || 'info-o'
}

// 金额格式化
const formatCurrency = (amount) => {
  return Number(amount).toLocaleString()
}

// 页面加载时自动加载第一页数据
onMounted(() => {
  // 不需要调用，van-list会自动触发onLoad
})
</script>

<style lang="less" scoped>
.customer-page {
  min-height: 100vh;
  background: #f0f2f5;
  // 移除固定的padding-bottom，让主框架处理底部导航栏空间
}

// 搜索区域样式 - 与订单模块保持一致
.search-section {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #ffffff;
  padding: 12px 16px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.search-container {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border: 1px solid #e5e5e5;
  border-radius: 24px;
  padding: 0 16px;
  height: 48px;
}

.search-icon {
  color: #8c8c8c;
  font-size: 18px;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: #333333;
  height: 100%;
}

.search-input::placeholder {
  color: #999999;
}

.search-clear {
  margin-left: 8px;
  min-width: 56px;
  height: 32px;
  border-radius: 16px;
  font-size: 14px;
}

// 客户卡片容器
.customer-card {
  margin: 8px 16px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;
  
  &:active {
    transform: translateY(1px);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }
  
  // 状态指示器
  .status-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    border-radius: 12px 0 0 12px;
  }
}

// 不同状态的卡片样式
.status-following {
  background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
  border: 1px solid #e6f4ff;
  
  .status-indicator {
    background: linear-gradient(to bottom, #1677ff, #4096ff);
  }
}

.status-lost {
  background: linear-gradient(135deg, #ffffff 0%, #fff2f0 100%);
  border: 1px solid #ffece6;
  
  .status-indicator {
    background: linear-gradient(to bottom, #ff4d4f, #ff7875);
  }
}

.status-success {
  background: linear-gradient(135deg, #ffffff 0%, #f6ffed 100%);
  border: 1px solid #eaffd6;
  
  .status-indicator {
    background: linear-gradient(to bottom, #52c41a, #73d13d);
  }
}

.status-potential {
  background: linear-gradient(135deg, #ffffff 0%, #fffbe6 100%);
  border: 1px solid #fff1b8;
  
  .status-indicator {
    background: linear-gradient(to bottom, #faad14, #ffc53d);
  }
}

.status-default {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  
  .status-indicator {
    background: #d9d9d9;
  }
}

// 卡片内容区域
.card-content {
  padding: 12px 16px;
}

// 店铺头部信息
.customer-header {
  margin-bottom: 10px;
}

.shop-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.shop-name {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  
  .shop-icon {
    font-size: 16px;
    color: #1677ff;
    flex-shrink: 0;
  }
  
  .name-text {
    font-size: 15px;
    font-weight: 500;
    color: #1d1d1d;
    line-height: 1.3;
    word-break: break-word;
  }
}

// 状态徽章
.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  
  .van-icon {
    font-size: 12px;
  }
}

.badge-following {
  background: #e6f4ff;
  color: #1677ff;
  border: 1px solid #91caff;
}

.badge-lost {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.badge-success {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.badge-potential {
  background: #fffbe6;
  color: #faad14;
  border: 1px solid #ffe58f;
}

.badge-default {
  background: #f5f5f5;
  color: #8c8c8c;
  border: 1px solid #d9d9d9;
}

// 店铺详细信息
.customer-details {
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .detail-icon {
    font-size: 14px;
    color: #8c8c8c;
    flex-shrink: 0;
  }
  
  .detail-text {
    font-size: 12px;
    color: #595959;
    line-height: 1.4;
  }
}

// 数据统计容器
.stats-container {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.stat-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 6px;
  
  .stat-icon {
    font-size: 14px;
    color: #1677ff;
  }
  
  .stat-title {
    font-size: 11px;
    color: #8c8c8c;
    font-weight: 500;
  }
}

.stat-number {
  font-size: 18px;
  font-weight: 600;
  color: #1677ff;
  line-height: 1.2;
}

.stat-amount {
  font-size: 16px;
  font-weight: 600;
  color: #52c41a;
  line-height: 1.2;
}

// 响应式优化
@media (max-width: 375px) {
  .card-content {
    padding: 10px 12px;
  }
  
  .shop-name .name-text {
    font-size: 14px;
  }
  
  .stats-container {
    flex-direction: row;
    gap: 8px;
  }
  
  .stat-number, .stat-amount {
    font-size: 15px;
  }
  
  .customer-card {
    margin: 6px 12px;
  }
}

/* 统一搜索框样式 */
.search-section {
  padding: 12px 16px;
  background: #f5f5f5;
}

.search-clear {
  margin-top: 8px;
  width: 100%;
  height: 32px;
  border-radius: 16px;
  font-size: 14px;
}

:deep(.van-search) {
  padding: 0;
}

:deep(.van-search__content) {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  height: 40px;
}

:deep(.van-field__control) {
  font-size: 14px;
  color: #333333;
}
</style>
