<template>
  <div class="order-page">
    <!-- 搜索栏 -->
    <div class="search-section">
      <div class="search-container">
        <van-icon name="search" class="search-icon" />
        <input 
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索订单号、客户名称"
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

    <!-- 日期筛选栏 -->
    <div class="date-filter-section">
      <div class="date-filter-container">
        <van-button 
          :type="dateFilter === 'all' ? 'primary' : 'default'"
          size="small"
          @click="handleDateFilter('all')"
        >
          全部
        </van-button>
        <van-button 
          :type="dateFilter === 'today' ? 'primary' : 'default'"
          size="small"
          @click="handleDateFilter('today')"
        >
          今天
        </van-button>
        <van-button 
          :type="dateFilter === 'yesterday' ? 'primary' : 'default'"
          size="small"
          @click="handleDateFilter('yesterday')"
        >
          昨天
        </van-button>
        <van-button 
          :type="dateFilter === 'week' ? 'primary' : 'default'"
          size="small"
          @click="handleDateFilter('week')"
        >
          本周
        </van-button>
        <van-button 
          :type="dateFilter === 'month' ? 'primary' : 'default'"
          size="small"
          @click="handleDateFilter('month')"
        >
          本月
        </van-button>
        <van-button 
          :type="dateFilter === 'custom' ? 'primary' : 'default'"
          size="small"
          icon="calender-o"
          @click="showDatePicker = true"
        >
          筛选
        </van-button>
      </div>
    </div>

    <!-- 订单列表 -->
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
          v-for="order in orderList" 
          :key="order.id" 
          class="order-card"
          @click="goToDetail(order.id)"
        >
          <!-- 客户信息区 -->
          <div class="customer-section">
            <div class="customer-name">{{ order.customer_name || '未知客户' }}</div>
          </div>
          
          <!-- 数据展示区 -->
          <div class="data-section">
            <div class="data-row">
              <span class="order-id">订单号: {{ order.order_no || order.id }}</span>
              <span class="order-date">{{ formatDate(order.order_date) }}</span>
            </div>
            <div class="data-row">
              <span class="deal-amount">¥{{ formatAmount(order.total_amount || 0) }}</span>
              <span class="received-amount">已收¥{{ formatAmount(order.received_amount || 0) }}</span>
            </div>
          </div>
          
          <!-- 操作按钮区 -->
          <div class="action-section">
            <van-button 
              class="action-btn edit-btn" 
              type="default" 
              size="small" 
              plain
              icon="edit"
              @click.stop="handleEdit(order.id)"
            >
              编辑
            </van-button>
            <van-button 
              class="action-btn payment-btn" 
              type="primary" 
              size="small"
              icon="cash-back-record"
              @click.stop="handlePayment(order.id)"
            >
              收款
            </van-button>
            <van-button 
              class="action-btn aftersale-btn" 
              type="warning" 
              size="small"
              plain
              icon="after-sale"
              @click.stop="handleAfterSale(order.id)"
            >
              售后
            </van-button>
            <van-button 
              class="action-btn audit-btn" 
              type="success" 
              size="small"
              plain
              icon="checked"
              @click.stop="handleAudit(order.id)"
            >
              业审
            </van-button>
            <van-button 
              class="action-btn delete-btn" 
              type="danger" 
              size="small"
              plain
              icon="delete-o"
              @click.stop="handleDelete(order)"
            >
              删除
            </van-button>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <!-- 空状态 -->
    <div v-if="!loading && orderList.length === 0" class="empty-state">
      <van-empty 
        v-if="error" 
        description="请求失败，点击重新加载" 
        image="error"
      >
        <van-button 
          round 
          type="primary" 
          class="retry-button"
          @click="loadOrderList(true)"
        >
          重新加载
        </van-button>
      </van-empty>
      <van-empty 
        v-else
        description="暂无订单数据" 
        image="order"
      />
    </div>

    <!-- 日期选择器弹窗 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-datetime-picker
        v-model="startDate"
        type="date"
        title="选择开始日期"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onStartDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>
    
    <van-popup v-model:show="showEndDatePicker" position="bottom" round>
      <van-datetime-picker
        v-model="endDate"
        type="date"
        title="选择结束日期"
        :min-date="startDate"
        :max-date="maxDate"
        @confirm="onEndDateConfirm"
        @cancel="showEndDatePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showFailToast, showToast, showSuccessToast, showConfirmDialog } from 'vant'
import { getOrderList } from '@/api/order'

const router = useRouter()
const route = useRoute()

// 搜索关键词
const searchKeyword = ref('')

// 日期筛选
const dateFilter = ref('all')
const showDatePicker = ref(false)
const showEndDatePicker = ref(false)
const startDate = ref(new Date())
const endDate = ref(new Date())
const minDate = ref(new Date(2020, 0, 1))
const maxDate = ref(new Date())
const dateFrom = ref('')
const dateTo = ref('')

// 列表数据
const orderList = ref([])
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const error = ref(false)

// 分页参数
const currentPage = ref(1)
const pageSize = ref(20)

// 加载订单列表
const loadOrderList = async (isRefresh = false) => {
  try {
    if (isRefresh) {
      currentPage.value = 1
      orderList.value = []
      finished.value = false
    }

    loading.value = true
    error.value = false

    const params = {
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: searchKeyword.value
    }

    // 如果有客户ID参数（从客户详情页跳转过来）
    if (route.query.customer_id) {
      params.customer_id = route.query.customer_id
    }
    
    // 添加日期筛选参数
    if (dateFrom.value) {
      params.date_from = dateFrom.value
    }
    if (dateTo.value) {
      params.date_to = dateTo.value
    }

    console.log('[Load Order List]', params)
    const res = await getOrderList(params)
    
    // 处理不同的响应格式
    let newList = []
    let total = 0
    
    if (Array.isArray(res)) {
      // 直接返回数组格式
      newList = res
      total = res.length
    } else if (res && typeof res === 'object') {
      // 对象格式 { list: [], total: 0 } 或 { data: { list: [], total: 0 } }
      if (res.data && typeof res.data === 'object') {
        // API返回格式: { code: 'SUCCESS', data: { list: [], total: 0 } }
        newList = res.data.list || res.data.orders || []
        total = res.data.total || res.data.count || newList.length
      } else {
        // 直接格式: { list: [], total: 0 }
        newList = res.list || res.orders || []
        total = res.total || res.count || newList.length
      }
    } else {
      newList = []
      total = 0
    }
    
    if (isRefresh) {
      orderList.value = newList
    } else {
      orderList.value = [...orderList.value, ...newList]
    }

    // 判断是否还有更多数据
    if (newList.length < pageSize.value || orderList.value.length >= total) {
      finished.value = true
    } else {
      currentPage.value++
    }

    console.log('[Order List Loaded]', {
      currentCount: orderList.value.length,
      newCount: newList.length,
      total: total,
      finished: finished.value
    })

  } catch (err) {
    console.error('[Load Order Error]', err)
    error.value = true
    // 错误已在拦截器中处理，这里只需设置状态
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 下拉刷新
const onRefresh = () => {
  loadOrderList(true)
}

// 上拉加载
const onLoad = () => {
  loadOrderList(false)
}

// 搜索
const handleSearch = () => {
  loadOrderList(true)
}

// 清空搜索
const handleClear = () => {
  searchKeyword.value = ''
  loadOrderList(true)
}

// 跳转到详情（点击卡片）
const goToDetail = (id) => {
  router.push(`/order/detail/${id}`)
}

// 处理编辑
const handleEdit = (id) => {
  router.push(`/order/detail/${id}`)
}

// 处理收款
const handlePayment = (id) => {
  router.push(`/order/payment/${id}`)
}

// 处理售后
const handleAfterSale = (id) => {
  showToast('售后功能开发中')
  // TODO: 跳转到售后页面
  // router.push(`/order/aftersale/${id}`)
}

// 处理业审
const handleAudit = (id) => {
  showToast('业审功能开发中')
  // TODO: 实现业审功能
}

// 处理删除
const handleDelete = async (order) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除订单 ${order.order_no || order.id} 吗？`
    })
    
    // TODO: 调用删除API
    showSuccessToast('删除成功')
    loadOrderList(true)
  } catch (err) {
    // 用户取消
  }
}

// 跳转到收款（兼容旧代码）
const goToPayment = (id) => {
  router.push(`/order/payment/${id}`)
}

// 日期筛选处理
const handleDateFilter = (type) => {
  dateFilter.value = type
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  switch (type) {
    case 'all':
      // 清空日期筛选，显示全部
      dateFrom.value = ''
      dateTo.value = ''
      break
    case 'today':
      dateFrom.value = formatDateForAPI(today)
      dateTo.value = formatDateForAPI(today)
      break
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      dateFrom.value = formatDateForAPI(yesterday)
      dateTo.value = formatDateForAPI(yesterday)
      break
    case 'week':
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      dateFrom.value = formatDateForAPI(weekStart)
      dateTo.value = formatDateForAPI(today)
      break
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      dateFrom.value = formatDateForAPI(monthStart)
      dateTo.value = formatDateForAPI(today)
      break
  }
  
  if (type !== 'custom') {
    loadOrderList(true)
  }
}

// 开始日期确认
const onStartDateConfirm = () => {
  showDatePicker.value = false
  showEndDatePicker.value = true
}

// 结束日期确认
const onEndDateConfirm = () => {
  showEndDatePicker.value = false
  dateFilter.value = 'custom'
  dateFrom.value = formatDateForAPI(startDate.value)
  dateTo.value = formatDateForAPI(endDate.value)
  loadOrderList(true)
}

// 格式化日期为API格式(YYYY-MM-DD)
const formatDateForAPI = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 金额格式化
const formatAmount = (amount) => {
  if (!amount) return '0.00'
  return Number(amount).toFixed(2)
}

// 日期格式化
const formatDate = (dateStr) => {
  if (!dateStr) return '无'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 页面加载
onMounted(() => {
  // 不需要调用，van-list会自动触发onLoad
})
</script>

<style lang="less" scoped>
.order-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(50px + env(safe-area-inset-bottom));
}

.search-section {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #ffffff;
  padding: 12px 16px 0;  /* 底部padding移除，与筛选栏融合 */
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
  margin-bottom: 8px;  /* 搜索框底部间距 */
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

.date-filter-section {
  background: #ffffff;
  padding: 0 16px 12px;  /* 顶部padding移除，与搜索栏融合 */
  position: sticky;
  top: 72px;
  z-index: 99;
}

.date-filter-container {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.date-filter-container::-webkit-scrollbar {
  display: none;
}

.date-filter-container .van-button {
  flex-shrink: 0;
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  border-radius: 16px;
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

.order-card {
  background: #ffffff;
  margin: 12px 16px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }
}

.customer-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.customer-name {
  font-size: 16px;
  font-weight: 500;
  color: #333333;
}

.status-tag {
  background-color: #52c41a !important;
  color: #ffffff !important;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
}

.data-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.order-id {
  color: #666666;
}

.order-date {
  color: #666666;
}

.deal-amount {
  font-size: 18px;
  font-weight: 500;
  color: #1677ff;
}

.received-amount {
  color: #52c41a;
  font-weight: 400;
}

.action-section {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.action-btn {
  flex: 0 0 calc(33.33% - 4px);
  height: 32px;
  border-radius: 4px;
  font-size: 12px;
  padding: 0 8px;
}

.action-btn .van-icon {
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

:deep(.van-empty) {
  padding-top: 100px;
}

:deep(.van-pull-refresh) {
  overflow: visible;
}

:deep(.van-list) {
  padding-bottom: 16px;
}

.empty-state {
  padding: 40px 16px;
}

.retry-button {
  margin-top: 16px;
  height: 40px;
  width: 120px;
}

:deep(.van-empty) {
  padding: 32px 0;
}

:deep(.van-empty__image) {
  width: 120px;
  height: 120px;
}
</style>
