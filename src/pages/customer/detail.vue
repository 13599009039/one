<template>
  <div class="customer-detail-page">
    <van-nav-bar
      title="客户详情"
      left-arrow
      @click-left="$router.back()"
    />
    
    <!-- 加载中 -->
    <van-loading v-if="loading" size="24px" vertical class="page-loading">加载中...</van-loading>
    
    <!-- 内容区域 -->
    <div v-else-if="customerInfo" class="detail-content">
      <!-- 客户基本信息 -->
      <div class="info-section">
        <div class="section-header">
          <van-icon name="user-circle-o" />
          <span>基本信息</span>
        </div>
        <van-cell-group inset>
          <van-cell title="店铺名称" :value="customerInfo.shop_name || '未设置'" />
          <van-cell v-if="customerInfo.douyin_name" title="抖音账号" :value="customerInfo.douyin_name" />
          <van-cell v-if="customerInfo.company_name" title="公司名称" :value="customerInfo.company_name" />
          <van-cell v-if="customerInfo.legal_person" title="法人代表" :value="customerInfo.legal_person" />
          <van-cell title="客户状态">
            <template #value>
              <van-tag v-if="customerInfo.status === '跟进中'" type="primary">跟进中</van-tag>
              <van-tag v-else-if="customerInfo.status === '已成交'" type="success">已成交</van-tag>
              <van-tag v-else-if="customerInfo.status === '已流失'" type="danger">已流失</van-tag>
              <van-tag v-else-if="customerInfo.status === '潜在客户'" type="warning">潜在客户</van-tag>
              <van-tag v-else type="default">{{ customerInfo.status || '未知' }}</van-tag>
            </template>
          </van-cell>
          <van-cell v-if="customerInfo.region" title="所属地区" :value="customerInfo.region" />
          <van-cell v-if="customerInfo.industry" title="所属行业" :value="customerInfo.industry" />
        </van-cell-group>
      </div>

      <!-- 商务信息 -->
      <div class="info-section">
        <div class="section-header">
          <van-icon name="manager-o" />
          <span>商务信息</span>
        </div>
        <van-cell-group inset>
          <van-cell v-if="customerInfo.business_staff" title="业务人员" :value="customerInfo.business_staff" />
          <van-cell v-if="customerInfo.service_staff" title="客服人员" :value="customerInfo.service_staff" />
          <van-cell v-if="customerInfo.operation_staff" title="运营人员" :value="customerInfo.operation_staff" />
          <van-cell v-if="customerInfo.management_staff" title="管理人员" :value="customerInfo.management_staff" />
          <van-cell v-if="customerInfo.team" title="所属团队" :value="customerInfo.team" />
          <van-cell v-if="customerInfo.project" title="归属项目" :value="customerInfo.project" />
        </van-cell-group>
      </div>

      <!-- 企业信息 -->
      <div v-if="customerInfo.credit_code || customerInfo.registered_capital || customerInfo.business_address" class="info-section">
        <div class="section-header">
          <van-icon name="building-o" />
          <span>企业信息</span>
        </div>
        <van-cell-group inset>
          <van-cell v-if="customerInfo.credit_code" title="统一社会信用代码" :value="customerInfo.credit_code" />
          <van-cell v-if="customerInfo.registered_capital" title="注册资本" :value="customerInfo.registered_capital" />
          <van-cell v-if="customerInfo.business_address" title="注册地址" :value="customerInfo.business_address" />
          <van-cell v-if="customerInfo.operating_address" title="经营地址" :value="customerInfo.operating_address" />
        </van-cell-group>
      </div>

      <!-- 合作信息 -->
      <div v-if="customerInfo.cooperation_mode || customerInfo.category" class="info-section">
        <div class="section-header">
          <van-icon name="friends-o" />
          <span>合作信息</span>
        </div>
        <van-cell-group inset>
          <van-cell v-if="customerInfo.cooperation_mode" title="合作模式" :value="customerInfo.cooperation_mode" />
          <van-cell v-if="customerInfo.category" title="客户类别" :value="customerInfo.category" />
        </van-cell-group>
      </div>

      <!-- 订单统计 -->
      <div class="info-section">
        <div class="section-header">
          <van-icon name="chart-trending-o" />
          <span>订单统计</span>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <van-icon name="orders-o" />
            </div>
            <div class="stat-value">{{ customerInfo.order_count || 0 }}</div>
            <div class="stat-label">总订单数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <van-icon name="gold-coin-o" />
            </div>
            <div class="stat-value">￥{{ formatAmount(customerInfo.total_amount || 0) }}</div>
            <div class="stat-label">总交易额</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <van-icon name="clock-o" />
            </div>
            <div class="stat-value">{{ customerInfo.last_order_date ? formatDate(customerInfo.last_order_date) : '无' }}</div>
            <div class="stat-label">最近订单</div>
          </div>
        </div>
        
        <!-- 统计趋势图占位 -->
        <div v-if="customerInfo.order_count > 0" class="trend-placeholder">
          <div class="trend-header">
            <van-icon name="bar-chart-o" />
            <span>订单趋势</span>
          </div>
          <div class="trend-chart">
            <div class="chart-placeholder">
              <van-icon name="chart-o" size="32" />
              <div class="chart-text">趋势图表开发中</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近订单 -->
      <div class="info-section">
        <div class="section-header">
          <van-icon name="orders-o" />
          <span>最近订单</span>
          <van-button v-if="recentOrders.length > 0" type="primary" size="small" plain @click="goToOrderList">查看全部</van-button>
        </div>
        
        <van-empty v-if="recentOrders.length === 0" description="还没有订单" />
        
        <div v-else class="order-list">
          <div v-for="order in recentOrders" :key="order.id" class="order-item" @click="goToOrderDetail(order.id)">
            <div class="order-header">
              <div class="order-number">订单号: {{ order.order_number }}</div>
            </div>
            <div class="order-info">
              <div class="info-row">
                <span class="label">订单日期:</span>
                <span class="value">{{ formatDate(order.order_date) }}</span>
              </div>
              <div class="info-row">
                <span class="label">订单金额:</span>
                <span class="value price">￥{{ formatAmount(order.total_amount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 备注信息 -->
      <div v-if="customerInfo.tags" class="info-section">
        <div class="section-header">
          <van-icon name="label-o" />
          <span>客户标签</span>
        </div>
        <div class="tags-container">
          <van-tag v-for="tag in customerInfo.tags.split(',')" :key="tag" type="primary" plain>
            {{ tag.trim() }}
          </van-tag>
        </div>
      </div>

      <!-- 备注信息 -->
      <div v-if="customerInfo.notes" class="info-section">
        <div class="section-header">
          <van-icon name="notes-o" />
          <span>备注信息</span>
        </div>
        <van-cell-group inset>
          <van-cell>
            <div class="notes-content">{{ customerInfo.notes }}</div>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 系统信息 -->
      <div class="info-section">
        <div class="section-header">
          <van-icon name="info-o" />
          <span>系统信息</span>
        </div>
        <van-cell-group inset>
          <van-cell title="客户ID" :value="customerInfo.id.toString()" />
          <van-cell title="创建时间" :value="customerInfo.created_at ? formatDate(customerInfo.created_at) : '未知'" />
          <van-cell title="更新时间" :value="customerInfo.updated_at ? formatDate(customerInfo.updated_at) : '未知'" />
          <van-cell v-if="customerInfo.merchant_id" title="商户ID" :value="customerInfo.merchant_id" />
        </van-cell-group>
      </div>
    </div>
    
    <!-- 错误状态 -->
    <van-empty v-else description="客户信息加载失败" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCustomerDetail } from '@/api/customer'
import { showError } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const customerId = route.params.id

// 数据状态
const loading = ref(true)
const customerInfo = ref(null)
const recentOrders = ref([])

// 加载客户详情
const loadCustomerDetail = async () => {
  try {
    loading.value = true
    const res = await getCustomerDetail(customerId)
    
    customerInfo.value = res.customer || res
    recentOrders.value = res.recent_orders || []
    
  } catch (error) {
    console.error('[Load Customer Detail Error]', error)
    showError(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 跳转到订单列表
const goToOrderList = () => {
  router.push({
    path: '/main/order',
    query: { customer_id: customerId }
  })
}

// 跳转到订单详情
const goToOrderDetail = (orderId) => {
  router.push(`/order/detail/${orderId}`)
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
  loadCustomerDetail()
})
</script>

<style lang="less" scoped>
.customer-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 16px;
}

.page-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.detail-content {
  padding: 16px;
}

.info-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  
  .van-icon {
    color: #667eea;
    font-size: 20px;
  }
  
  span {
    flex: 1;
  }
}

.phone-link {
  color: #667eea;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  background: #fff;
  padding: 16px 12px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
}

.stat-icon {
  margin-bottom: 8px;
  
  .van-icon {
    font-size: 24px;
    color: #667eea;
  }
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  word-break: break-all;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.trend-placeholder {
  margin-top: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.trend-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  
  .van-icon {
    color: #667eea;
  }
}

.trend-chart {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
  color: #ccc;
  
  .chart-text {
    margin-top: 8px;
    font-size: 13px;
  }
}

.tags-container {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  .van-tag {
    margin: 0 6px 8px 0;
  }
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-number {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  
  .label {
    color: #999;
  }
  
  .value {
    color: #666;
    
    &.price {
      color: #f56c6c;
      font-weight: 500;
    }
  }
}

.notes-content {
  padding: 12px;
  line-height: 1.6;
  color: #666;
  background: #f9f9f9;
  border-radius: 4px;
  word-break: break-all;
}
</style>
