<template>
  <div class="statistics-page">
    <!-- 下拉刷新 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <!-- 加载中 -->
      <van-loading v-if="loading" class="loading-container" vertical>加载中...</van-loading>

      <!-- 统计内容 -->
      <div v-else class="statistics-content">
        <!-- 概览统计 -->
        <div class="overview-section">
          <div class="section-title">数据概览</div>
          
          <!-- 今日数据 -->
          <div class="stat-card highlight">
            <div class="card-title">今日数据</div>
            <div class="stat-grid">
              <div class="stat-item">
                <div class="stat-value">{{ overview.today?.order_count || 0 }}</div>
                <div class="stat-label">订单数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">¥{{ formatAmount(overview.today?.total_amount) }}</div>
                <div class="stat-label">订单金额</div>
              </div>
            </div>
          </div>

          <!-- 本月数据 -->
          <div class="stat-card">
            <div class="card-title">本月数据</div>
            <div class="stat-grid">
              <div class="stat-item">
                <div class="stat-value">{{ overview.month?.order_count || 0 }}</div>
                <div class="stat-label">订单数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">¥{{ formatAmount(overview.month?.total_amount) }}</div>
                <div class="stat-label">订单金额</div>
              </div>
            </div>
          </div>

          <!-- 累计数据 -->
          <div class="stat-card">
            <div class="card-title">累计数据</div>
            <div class="stat-grid three-cols">
              <div class="stat-item">
                <div class="stat-value">{{ overview.total?.order_count || 0 }}</div>
                <div class="stat-label">订单数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ overview.total?.customer_count || 0 }}</div>
                <div class="stat-label">客户数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">¥{{ formatAmount(overview.total?.total_amount) }}</div>
                <div class="stat-label">订单金额</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 趋势图表 -->
        <div class="trend-section" v-if="!trendLoading">
          <div class="section-title">数据趋势</div>
          
          <!-- 订单金额趋势 -->
          <div class="chart-card">
            <TrendChart
              :data="orderTrendData"
              type="line"
              title="近7天订单金额"
              unit="¥"
              color="#7c3aed"
              :show-area="true"
              height="280px"
            />
          </div>
          
          <!-- 订单数量趋势 -->
          <div class="chart-card">
            <TrendChart
              :data="customerTrendData"
              type="bar"
              title="近7天订单数量"
              unit=""
              color="#10b981"
              :show-area="false"
              height="280px"
            />
          </div>
        </div>

        <!-- 排行榜切换 -->
        <div class="ranking-section">
          <van-tabs v-model:active="activeRankingTab" @change="handleRankingTabChange">
            <van-tab title="客户排行" name="customer" />
            <van-tab title="服务排行" name="service" />
          </van-tabs>

          <!-- 排行榜列表 -->
          <div class="ranking-list">
            <div v-for="item in rankingList" :key="item.rank" class="ranking-item">
              <div class="rank-badge" :class="getRankClass(item.rank)">
                {{ item.rank }}
              </div>
              <div class="rank-info">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-meta">
                  <span v-if="activeRankingTab === 'customer'">{{ item.count }} 笔订单</span>
                  <span v-else>{{ item.count }} {{ getServiceUnit(item.name) }}</span>
                </div>
              </div>
              <div class="rank-value">¥{{ formatAmount(item.value) }}</div>
            </div>

            <!-- 空状态 -->
            <van-empty v-if="rankingList.length === 0" description="暂无排行数据" />
          </div>
        </div>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOverview, getTrend, getRanking } from '@/api/statistics'
import TrendChart from '@/components/TrendChart.vue'
import { showError } from '@/utils/toast'

// 数据状态
const loading = ref(true)
const refreshing = ref(false)
const overview = ref({
  today: {},
  month: {},
  total: {}
})

// 排行榜
const activeRankingTab = ref('customer')
const rankingList = ref([])

// 趋势图表数据
const trendLoading = ref(false)
const orderTrendData = ref([])  // 订单金额趋势
const customerTrendData = ref([])  // 订单数量趋势

// 加载概览数据
const loadOverview = async () => {
  try {
    const res = await getOverview()
    overview.value = res
  } catch (err) {
    console.error('[Load Overview Error]', err)
    showError(err.message || '加载概览数据失败')
  }
}

// 加载趋势数据
const loadTrendData = async () => {
  try {
    trendLoading.value = true
    
    // 并行加载订单趋势和客户趋势
    const [orderRes, customerRes] = await Promise.all([
      getTrend({ period: 'week', type: 'order_amount' }),
      getTrend({ period: 'week', type: 'order_count' })
    ])
    
    orderTrendData.value = orderRes.data || []
    customerTrendData.value = customerRes.data || []
  } catch (err) {
    console.error('[Load Trend Error]', err)
  } finally {
    trendLoading.value = false
  }
}

// 加载排行榜数据
const loadRanking = async () => {
  try {
    const res = await getRanking({
      type: activeRankingTab.value,
      period: 'month',
      limit: 10
    })
    rankingList.value = res || []
  } catch (err) {
    console.error('[Load Ranking Error]', err)
    showError(err.message || '加载排行榜失败')
  }
}

// 加载所有数据
const loadAllData = async () => {
  try {
    loading.value = true
    await Promise.all([loadOverview(), loadTrendData(), loadRanking()])
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 下拉刷新
const onRefresh = () => {
  loadAllData()
}

// 排行榜Tab切换
const handleRankingTabChange = () => {
  loadRanking()
}

// 获取排名样式
const getRankClass = (rank) => {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}

// 获取服务单位
const getServiceUnit = (serviceName) => {
  // 简单判断,可根据实际情况扩展
  if (serviceName.includes('时') || serviceName.includes('小时')) return '小时'
  if (serviceName.includes('天') || serviceName.includes('日')) return '天'
  if (serviceName.includes('次') || serviceName.includes('服务')) return '次'
  return '个'
}

// 金额格式化
const formatAmount = (amount) => {
  if (!amount) return '0.00'
  return Number(amount).toFixed(2)
}

// 页面加载
onMounted(() => {
  loadAllData()
})
</script>

<style lang="less" scoped>
.statistics-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 60px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.statistics-content {
  padding-bottom: 20px;
}

// 概览区域
.overview-section {
  padding: 0 16px;
}

.section-title {
  padding: 16px 0 12px;
  font-size: 16px;
  font-weight: 500;
  color: #262626;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &.highlight {
    background: linear-gradient(135deg, #1677FF 0%, #0958d9 100%);
    color: #fff;

    .card-title {
      color: #fff;
      opacity: 0.9;
    }

    .stat-label {
      color: #fff;
      opacity: 0.8;
    }

    .stat-value {
      color: #fff;
    }
  }
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #8c8c8c;
  margin-bottom: 12px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  &.three-cols {
    grid-template-columns: repeat(3, 1fr);
  }
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
}

/* 趋势图表区域 */
.trend-section {
  margin-bottom: 16px;
}

.chart-card {
  background: #FFFFFF;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 排行榜区域 */
.ranking-section {
  margin-top: 12px;
  background: #fff;
}

:deep(.van-tabs) {
  .van-tabs__line {
    background: #1677FF;
  }

  .van-tab--active {
    color: #1677FF;
    font-weight: 500;
  }
}

.ranking-list {
  padding: 12px 16px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f8f8f8;
  border-radius: 8px;
  transition: background 0.2s;

  &:active {
    background: #f0f0f0;
  }
}

.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  background: #e0e0e0;
  color: #666;
  flex-shrink: 0;
  margin-right: 12px;

  &.gold {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
  }

  &.silver {
    background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
    color: #666;
    box-shadow: 0 2px 8px rgba(192, 192, 192, 0.3);
  }

  &.bronze {
    background: linear-gradient(135deg, #cd7f32 0%, #e8a87c 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(205, 127, 50, 0.3);
  }
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 15px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-meta {
  font-size: 12px;
  color: #8c8c8c;
}

.rank-value {
  font-size: 16px;
  font-weight: 600;
  color: #1677FF;
  flex-shrink: 0;
  margin-left: 12px;
}
</style>
