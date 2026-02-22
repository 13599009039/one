<template>
  <div class="order-detail-page">
    <!-- 顶部标题栏（统一风格） -->
    <div class="unified-header">
      <div class="header-left" @click="goBack">
        <van-icon name="arrow-left" />
      </div>
      <div class="header-title">{{ isEditing ? '编辑订单' : '订单详情' }}</div>
      <div class="header-right">
        <template v-if="isEditing">
          <span class="action-btn cancel-btn" @click="handleCancel">取消</span>
        </template>
        <template v-else>
          <span class="action-btn" @click="handleEdit">编辑</span>
        </template>
      </div>
    </div>

    <!-- 加载中 -->
    <van-loading v-if="loading" class="loading-container" vertical>加载中...</van-loading>

    <!-- 错误提示 -->
    <van-empty v-else-if="error" description="订单不存在或已被删除" />

    <!-- 订单详情内容 -->
    <div v-else class="detail-content">
      <!-- 顶部状态栏 -->
      <div class="status-header">
        <div class="header-top">
          <span class="order-number">{{ orderData.order_no }}</span>
          <div class="status-tags">
            <!-- 审核状态 -->
            <van-tag 
              v-if="orderData.business_review_status" 
              :type="getReviewStatusType(orderData.business_review_status)" 
              size="medium"
            >
              业务{{ orderData.business_review_status }}
            </van-tag>
            <van-tag 
              v-if="orderData.finance_review_status" 
              :type="getReviewStatusType(orderData.finance_review_status)" 
              size="medium"
            >
              财务{{ orderData.finance_review_status }}
            </van-tag>
            <!-- 收款状态 -->
            <van-tag type="warning" size="medium" v-if="orderData.payment_status === '未收款'">未收款</van-tag>
            <van-tag type="success" size="medium" v-else-if="orderData.payment_status === '已收款'">已收款</van-tag>
            <van-tag type="primary" size="medium" v-else-if="orderData.payment_status === '部分收款'">部分收款</van-tag>
          </div>
        </div>
      </div>
    
      <!-- 核心信息卡片：客户 + 金额（首屏展示） -->
      <div class="core-info-section">
        <!-- 客户信息 -->
        <div class="customer-info">
          <div class="customer-name">{{ orderData.customer_name }}</div>
          <div class="order-date">下单日期：{{ formatDate(orderData.order_date) }}</div>
        </div>
        
        <!-- 金额汇总（突出显示） -->
        <div class="amount-highlight">
          <div class="final-amount">
            <span class="amount-value">¥{{ formatAmount(orderData.final_amount || 0) }}</span>
            <span class="amount-label">成交金额</span>
          </div>
          <div class="payment-status">
            <span class="received">已收 ¥{{ formatAmount(orderData.received_amount || 0) }}</span>
            <span class="divider">/</span>
            <span class="unpaid">待收 ¥{{ formatAmount((orderData.final_amount || 0) - (orderData.received_amount || 0)) }}</span>
          </div>
          <div class="amount-detail">
            <span>商品原价 ¥{{ formatAmount(orderData.original_amount || 0) }}</span>
            <span class="negotiation" v-if="orderData.negotiation_amount">
              议价 <span :class="{'negative': parseFloat(orderData.negotiation_amount) < 0}">
                ¥{{ formatAmount(orderData.negotiation_amount || 0) }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- 商品/服务项目卡片 -->
      <div class="info-section">
        <div class="section-title">
          <van-icon name="shopping-cart-o" />
          <span>商品/服务项目</span>
          <van-button v-if="isEditing" type="primary" size="small" @click="addOrderItem" class="add-btn">
            <van-icon name="plus" />添加
          </van-button>
        </div>
        <div class="items-container" v-if="orderData.items && orderData.items.length > 0">
          <div v-for="(item, index) in orderData.items" :key="index" class="item-card-compact">
            <div class="item-header">
              <span class="item-name">{{ item.service_name }}</span>
              <van-icon v-if="isEditing" name="delete-o" class="delete-icon" @click="deleteOrderItem(index)" />
            </div>
            <div class="item-info-grid">
              <div class="info-item">
                <span class="label">类型</span>
                <span class="value">{{ item.category || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">数量</span>
                <span class="value">{{ item.quantity }} {{ item.unit || '' }}</span>
              </div>
              <div class="info-item">
                <span class="label">单价</span>
                <span class="value price">¥{{ formatAmount(item.unit_price) }}</span>
              </div>
              <div class="info-item">
                <span class="label">金额</span>
                <span class="value total-price">¥{{ formatAmount(item.total_price) }}</span>
              </div>
            </div>
          </div>
        </div>
        <van-empty v-else description="暂无商品/服务项目" />
      </div>

      <!-- 内部信息卡片（次要信息，放在最后） -->
      <div class="info-section internal-info">
        <div class="section-title">
          <van-icon name="manager-o" />
          <span>内部信息</span>
        </div>
        <div class="internal-grid">
          <div class="grid-item" v-if="orderData.business_staff_name || isEditing">
            <span class="label">业务人员</span>
            <span class="value">{{ orderData.business_staff_name || '未分配' }}</span>
          </div>
          <div class="grid-item" v-if="orderData.service_staff_name || isEditing">
            <span class="label">服务人员</span>
            <span class="value">{{ orderData.service_staff_name || '未分配' }}</span>
          </div>
          <div class="grid-item" v-if="orderData.operation_staff_name || isEditing">
            <span class="label">运营人员</span>
            <span class="value">{{ orderData.operation_staff_name || '未分配' }}</span>
          </div>
          <div class="grid-item" v-if="orderData.team_name || isEditing">
            <span class="label">负责团队</span>
            <span class="value">{{ orderData.team_name || '未分配' }}</span>
          </div>
          <div class="grid-item" v-if="orderData.project_name || isEditing">
            <span class="label">归属项目</span>
            <span class="value">{{ orderData.project_name || '未分配' }}</span>
          </div>
          <div class="grid-item full-width" v-if="orderData.remarks">
            <span class="label">订单备注</span>
            <span class="value">{{ orderData.remarks || '暂无备注' }}</span>
          </div>
        </div>
      </div>

      <!-- 收款记录卡片 -->
      <div class="info-section" v-if="paymentRecords.length > 0">
        <div class="section-title">
          <van-icon name="paid" />
          <span>收款记录</span>
        </div>
        <div class="payment-records">
          <div v-for="payment in paymentRecords" :key="payment.id" class="payment-record-item">
            <div class="payment-info">
              <div class="payment-time">{{ formatDate(payment.transaction_date) }}</div>
              <div class="payment-method">{{ payment.type || '收款' }}</div>
              <div class="payment-operator" v-if="payment.operator_name">操作人：{{ payment.operator_name }}</div>
            </div>
            <div class="payment-amount success">¥{{ formatAmount(payment.amount) }}</div>
          </div>
        </div>
      </div>
      
      <!-- 底部操作区 -->
      <div class="unified-action-bar" v-if="!isEditing">
        <!-- 次要操作按钮（4列网格） -->
        <div class="secondary-actions">
          <van-button plain type="primary" @click="handlePayment" class="action-btn-small">收款</van-button>
          <van-button plain type="primary" @click="handleEdit" class="action-btn-small">编辑订单</van-button>
          <van-button plain type="primary" @click="handleAfterSale" class="action-btn-small">售后登记</van-button>
          <!-- 业务审核/反审核 -->
          <van-button 
            v-if="orderData.business_review_status !== '已审核'" 
            plain 
            type="primary" 
            @click="handleBusinessReview" 
            class="action-btn-small"
          >
            业务审核
          </van-button>
          <van-button 
            v-else
            plain 
            type="warning" 
            @click="handleBusinessUnreview" 
            class="action-btn-small"
          >
            业务反审核
          </van-button>
          <!-- 财务审核/反审核 -->
          <van-button 
            v-if="orderData.finance_review_status !== '已审核'" 
            plain 
            type="primary" 
            @click="handleFinanceReview" 
            class="action-btn-small"
          >
            财务审核
          </van-button>
          <van-button 
            v-else
            plain 
            type="warning" 
            @click="handleFinanceUnreview" 
            class="action-btn-small"
          >
            财务反审核
          </van-button>
        </div>
      </div>

      <!-- 编辑模式底部操作区 -->
      <div class="unified-action-bar" v-else>
        <van-button 
          type="primary" 
          size="large" 
          block 
          @click="handleSave"
          class="primary-action-btn"
        >
          提交修改
        </van-button>
        <div class="secondary-actions">
          <van-button plain @click="handleCancel" class="action-btn-small cancel">取消</van-button>
          <van-button plain type="primary" @click="handleSaveDraft" class="action-btn-small">保存草稿</van-button>
        </div>
      </div>

      <!-- 收款记录卡片（暂时隐藏） -->
      <div class="info-section" v-if="false">
        <div class="section-title">
          <van-icon name="paid" />
          <span>收款记录</span>
        </div>
        <div class="payment-records">
          <div v-for="payment in payments" :key="payment.id" class="payment-item">
            <div class="payment-info">
              <div class="payment-date">{{ formatDateTime(payment.payment_date) }}</div>
              <div class="payment-method">{{ payment.payment_method }}</div>
            </div>
            <div class="payment-amount">¥{{ formatAmount(payment.amount) }}</div>
          </div>
          <van-empty v-if="payments.length === 0" description="暂无收款记录" />
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="bottom-actions" v-if="!isEditing">
        <van-button type="primary" size="large" block @click="goToPayment">
          <van-icon name="cash-back-record" />
          收款
        </van-button>
      </div>
    </div>

    <!-- 客户选择器 -->
    <van-popup v-model:show="showCustomerSelect" position="bottom" round>
      <van-picker
        :columns="customerOptions"
        @confirm="onCustomerConfirm"
        @cancel="showCustomerSelect = false"
      />
    </van-popup>

    <!-- 人员选择器 -->
    <van-popup v-model:show="showStaffSelect" position="bottom" round>
      <van-picker
        :columns="staffOptions"
        @confirm="onStaffConfirm"
        @cancel="showStaffSelect = false"
      />
    </van-popup>

    <!-- 团队选择器 -->
    <van-popup v-model:show="showTeamSelect" position="bottom" round>
      <van-picker
        :columns="teamOptions"
        @confirm="onTeamConfirm"
        @cancel="showTeamSelect = false"
      />
    </van-popup>

    <!-- 项目选择器 -->
    <van-popup v-model:show="showProjectSelect" position="bottom" round>
      <van-picker
        :columns="projectOptions"
        @confirm="onProjectConfirm"
        @cancel="showProjectSelect = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showSuccessToast, showConfirmDialog, showDialog } from 'vant'
import { getOrderDetail, updateOrder } from '@/api/order'
import { getCustomerList } from '@/api/customer'
import { getStaffList } from '@/api/staff'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const orderId = route.params.id
const loading = ref(true)
const error = ref(false)
const isEditing = ref(false)

// 订单数据
const orderData = ref({
  id: null,
  order_no: '',
  customer_id: null,
  customer_name: '',
  order_date: '',
  business_staff_id: null,
  service_staff_id: null,
  operation_staff_id: null,
  team_id: null,
  project_id: null,
  remarks: '',
  status: 'pending',
  payment_status: 'unpaid',
  negotiation_amount: 0,
  received_amount: 0,
  items: []
})

// 选择器数据
const customerOptions = ref([])
const staffOptions = ref([])
const teamOptions = ref([])
const projectOptions = ref([])

// 选择器显示状态
const showCustomerSelect = ref(false)
const showStaffSelect = ref(false)
const showTeamSelect = ref(false)
const showProjectSelect = ref(false)

// 当前选择的人员类型
const currentStaffType = ref('')

// 收款记录
const paymentRecords = ref([])

// 计算属性
const originalAmount = computed(() => {
  return orderData.value.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
})

const finalAmount = computed(() => {
  return originalAmount.value + parseFloat(orderData.value.negotiation_amount || 0)
})

const unpaidAmount = computed(() => {
  return finalAmount.value - parseFloat(orderData.value.received_amount || 0)
})

// 加载订单详情
const loadOrderDetail = async () => {
  try {
    loading.value = true
    const res = await getOrderDetail(orderId)
    
    if (res && res.id) {
      orderData.value = {
        ...res,
        items: res.items || []
      }
      // 加载收款记录
      await loadPaymentRecords()
    } else {
      error.value = true
    }
  } catch (err) {
    console.error('[Load Order Detail Error]', err)
    error.value = true
    showToast('加载订单详情失败')
  } finally {
    loading.value = false
  }
}

// 加载收款记录
const loadPaymentRecords = async () => {
  try {
    const response = await request.get(`/api/orders/${orderId}/payments`)
    if (response.success && response.data) {
      paymentRecords.value = response.data
    }
  } catch (err) {
    console.error('[Load Payment Records Error]', err)
    // 收款记录加载失败不影响页面显示
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '无'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化日期时间
const formatDateTime = (dateStr) => {
  if (!dateStr) return '无'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 格式化金额
const formatAmount = (amount) => {
  if (!amount) return '0.00'
  return Number(amount).toFixed(2)
}

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    'pending': 'warning',
    'confirmed': 'primary',
    'in_progress': 'primary',
    'completed': 'success',
    'cancelled': 'danger'
  }
  return statusMap[status] || 'default'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待确认',
    'confirmed': '已确认',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

// 获取支付状态类型
const getPaymentStatusType = (status) => {
  const statusMap = {
    'unpaid': 'warning',
    'partial': 'primary',
    'paid': 'success'
  }
  return statusMap[status] || 'default'
}

// 获取支付状态文本
const getPaymentStatusText = (status) => {
  const statusMap = {
    'unpaid': '未收款',
    'partial': '部分收款',
    'paid': '已收全款'
  }
  return statusMap[status] || status
}

// 获取人员名称
const getStaffName = (staffId) => {
  if (!staffId) return '未分配'
  const staff = staffOptions.value.find(s => s.value === staffId)
  return staff ? staff.text : '未知人员'
}

// 获取团队名称
const getTeamName = (teamId) => {
  if (!teamId) return '未分配'
  const team = teamOptions.value.find(t => t.value === teamId)
  return team ? team.text : '未知团队'
}

// 获取项目名称
const getProjectName = (projectId) => {
  if (!projectId) return '无'
  const project = projectOptions.value.find(p => p.value === projectId)
  return project ? project.text : '未知项目'
}

// 处理编辑
const handleEdit = () => {
  isEditing.value = true
  // 加载选择器数据
  loadCustomers()
  loadStaff()
  loadTeams()
  loadProjects()
}

// 处理保存
const handleSave = async () => {
  try {
    await showConfirmDialog({
      title: '确认保存',
      message: '确定要保存修改吗？'
    })
    
    // 调用保存API
    await updateOrder(orderId, orderData.value)
    showSuccessToast('保存成功')
    isEditing.value = false
    
    // 重新加载数据
    await loadOrderDetail()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('[Save Order Error]', err)
      showToast('保存失败')
    }
  }
}

// 加载客户列表
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ page: 1, page_size: 100 })
    customerOptions.value = res.list.map(c => ({
      text: c.shop_name,
      value: c.id
    }))
  } catch (err) {
    console.error('[Load Customers Error]', err)
  }
}

// 加载人员列表
const loadStaff = async () => {
  try {
    const res = await getStaffList({ page: 1, page_size: 100 })
    staffOptions.value = res.list.map(s => ({
      text: s.name,
      value: s.id
    }))
  } catch (err) {
    console.error('[Load Staff Error]', err)
  }
}

// 加载团队列表
const loadTeams = async () => {
  // TODO: 实现团队列表API
  teamOptions.value = [
    { text: '业务团队', value: 1 },
    { text: '技术团队', value: 2 }
  ]
}

// 加载项目列表
const loadProjects = async () => {
  // TODO: 实现项目列表API
  projectOptions.value = [
    { text: '默认项目', value: 1 },
    { text: '项目A', value: 2 }
  ]
}

// 显示客户选择器
const showCustomerPicker = () => {
  showCustomerSelect.value = true
}

// 显示人员选择器
const showStaffPicker = (type) => {
  currentStaffType.value = type
  showStaffSelect.value = true
}

// 显示团队选择器
const showTeamPicker = () => {
  showTeamSelect.value = true
}

// 显示项目选择器
const showProjectPicker = () => {
  showProjectSelect.value = true
}

// 客户选择确认
const onCustomerConfirm = ({ selectedValues, selectedOptions }) => {
  orderData.value.customer_id = selectedValues[0]
  orderData.value.customer_name = selectedOptions[0].text
  showCustomerSelect.value = false
}

// 人员选择确认
const onStaffConfirm = ({ selectedValues, selectedOptions }) => {
  const fieldMap = {
    'business': 'business_staff_id',
    'service': 'service_staff_id',
    'operation': 'operation_staff_id'
  }
  orderData.value[fieldMap[currentStaffType.value]] = selectedValues[0]
  showStaffSelect.value = false
}

// 团队选择确认
const onTeamConfirm = ({ selectedValues }) => {
  orderData.value.team_id = selectedValues[0]
  showTeamSelect.value = false
}

// 项目选择确认
const onProjectConfirm = ({ selectedValues }) => {
  orderData.value.project_id = selectedValues[0]
  showProjectSelect.value = false
}

// 添加订单项目
const addOrderItem = () => {
  orderData.value.items.push({
    product_name: '新项目',
    item_type: 'product',
    quantity: 1,
    unit_price: 0,
    amount: 0
  })
}

// 删除订单项目
const deleteOrderItem = (index) => {
  orderData.value.items.splice(index, 1)
}

// 计算项目金额
const calculateItemAmount = (item) => {
  item.amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
}

// 获取审核状态对应的tag类型
const getReviewStatusType = (status) => {
  const typeMap = {
    '待审核': 'warning',
    '已审核': 'success',
    '已驳回': 'danger'
  }
  return typeMap[status] || 'default'
}

// 跳转到收款页面
const handlePayment = () => {
  console.log('[Handle Payment] 跳转到收款页面')
  router.push(`/order/payment/${orderId}`)
}

// 处理售后登记
const handleAfterSale = () => {
  console.log('[Handle After Sale] 跳转到售后登记页面')
  showToast('售后登记功能开发中')
}

// 处理业务审核
const handleBusinessReview = async () => {
  console.log('[Handle Business Review] 业务审核')
  
  try {
    // 使用showConfirmDialog确保弹窗式确认
    await showConfirmDialog({
      title: '业务审核',
      message: '确认通过业务审核吗？',
      confirmButtonText: '通过',
      cancelButtonText: '取消',
      confirmButtonColor: '#1677FF',
      cancelButtonColor: '#666666',
      closeOnClickOverlay: true,
      className: 'review-dialog'
    })
    
    // 用户确认后，调用审核API
    const response = await request.post(`/api/mobile/orders/${orderId}/business-review`, {
      review_result: 'pass',
      tenant_id: parseInt(localStorage.getItem('mobile_erp_tenant_id'))
    })
    
    if (response.success) {
      showSuccessToast('业务审核通过')
      loadOrderDetail()
    } else {
      showToast(response.message || '审核失败')
    }
  } catch (err) {
    // 用户点击取消时不显示错误
    if (err === 'cancel' || err?.message === 'cancel') {
      console.log('[Business Review] 用户取消审核')
      return
    }
    
    console.error('[Business Review Error]', err)
    
    if (err.response?.status === 404) {
      showToast(`审核接口不存在，请联系后端开发配置：/api/mobile/orders/${orderId}/business-review`)
    } else if (err.response?.status === 403) {
      showToast('您无权限执行该审核操作，请确认所属角色/公司')
    } else {
      showToast('审核失败，请稍后重试')
    }
  }
}

// 处理业务反审核
const handleBusinessUnreview = async () => {
  console.log('[Handle Business Unreview] 业务反审核')
  
  try {
    // 确认弹窗
    await showDialog({
      title: '业务反审核',
      message: '确定要撤销该审核吗？撤销后订单将回到待审核状态',
      showCancelButton: true,
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    
    // 调用反审核API - 按规范传参（简化参数）
    const response = await request.post(`/api/mobile/orders/${orderId}/business-unreview`, {
      tenant_id: parseInt(localStorage.getItem('mobile_erp_tenant_id'))  // 必传租户ID
    })
    
    if (response.success) {
      showSuccessToast('业务反审核成功')
      loadOrderDetail() // 刷新订单详情
    } else {
      showToast(response.message || '反审核失败')
    }
  } catch (err) {
    console.error('[Business Unreview Error]', err)
    
    // 精准异常处理
    if (err.response?.status === 404) {
      showToast(`反审核接口不存在，请联系后端开发配置：/api/mobile/orders/${orderId}/business-unreview`)
    } else if (err.response?.status === 403) {
      showToast('您无权限执行该反审核操作，请确认所属角色/公司')
    } else if (err.response?.status === 500) {
      showToast('服务器内部错误，反审核失败，请稍后重试')
    } else {
      showToast('反审核失败，请稍后重试')
    }
  }
}

// 处理财务审核
const handleFinanceReview = async () => {
  console.log('[Handle Finance Review] 财务审核')
  
  try {
    // 使用showConfirmDialog确保弹窗式确认
    await showConfirmDialog({
      title: '财务审核',
      message: '确认通过财务审核吗？',
      confirmButtonText: '通过',
      cancelButtonText: '取消',
      confirmButtonColor: '#1677FF',
      cancelButtonColor: '#666666',
      closeOnClickOverlay: true,
      className: 'review-dialog'
    })
    
    // 用户确认后，调用审核API
    const response = await request.post(`/api/mobile/orders/${orderId}/finance-review`, {
      review_result: 'pass',
      tenant_id: parseInt(localStorage.getItem('mobile_erp_tenant_id'))
    })
    
    if (response.success) {
      showSuccessToast('财务审核通过')
      loadOrderDetail()
    } else {
      showToast(response.message || '审核失败')
    }
  } catch (err) {
    // 用户点击取消时不显示错误
    if (err === 'cancel' || err?.message === 'cancel') {
      console.log('[Finance Review] 用户取消审核')
      return
    }
    
    console.error('[Finance Review Error]', err)
    
    if (err.response?.status === 404) {
      showToast(`审核接口不存在，请联系后端开发配置：/api/mobile/orders/${orderId}/finance-review`)
    } else if (err.response?.status === 403) {
      showToast('您无权限执行该审核操作，请确认所属角色/公司')
    } else {
      showToast('审核失败，请稍后重试')
    }
  }
}

// 处理财务反审核
const handleFinanceUnreview = async () => {
  console.log('[Handle Finance Unreview] 财务反审核')
  
  try {
    // 确认弹窗
    await showDialog({
      title: '财务反审核',
      message: '确定要撤销该审核吗？撤销后订单将回到待审核状态',
      showCancelButton: true,
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    
    // 调用反审核API - 按规范传参（简化参数）
    const response = await request.post(`/api/mobile/orders/${orderId}/finance-unreview`, {
      tenant_id: parseInt(localStorage.getItem('mobile_erp_tenant_id'))  // 必传租户ID
    })
    
    if (response.success) {
      showSuccessToast('财务反审核成功')
      loadOrderDetail() // 刷新订单详情
    } else {
      showToast(response.message || '反审核失败')
    }
  } catch (err) {
    console.error('[Finance Unreview Error]', err)
    
    // 精准异常处理
    if (err.response?.status === 404) {
      showToast(`反审核接口不存在，请联系后端开发配置：/api/mobile/orders/${orderId}/finance-unreview`)
    } else if (err.response?.status === 403) {
      showToast('您无权限执行该反审核操作，请确认所属角色/公司')
    } else if (err.response?.status === 500) {
      showToast('服务器内部错误，反审核失败，请稍后重试')
    } else {
      showToast('反审核失败，请稍后重试')
    }
  }
}

// 处理取消编辑
const handleCancel = () => {
  console.log('[Handle Cancel] 取消编辑')
  // 检查是否有未保存的修改
  if (hasUnsavedChanges.value) {
    showDialog({
      title: '提示',
      message: '是否保存当前编辑内容？',
      showCancelButton: true,
      confirmButtonText: '保存草稿',
      cancelButtonText: '放弃修改'
    }).then(() => {
      // 保存草稿
      handleSaveDraft()
      isEditing.value = false
    }).catch(() => {
      // 放弃修改
      isEditing.value = false
      loadOrderDetail()
    })
  } else {
    isEditing.value = false
  }
}

// 保存草稿
const handleSaveDraft = () => {
  console.log('[Handle Save Draft] 保存草稿')
  try {
    // 将当前编辑内容保存到 localStorage
    const draft = {
      orderId: orderId,
      data: orderData.value,
      timestamp: new Date().getTime()
    }
    localStorage.setItem(`order_draft_${orderId}`, JSON.stringify(draft))
    showToast('草稿已保存')
  } catch (error) {
    console.error('[Save Draft Error]', error)
    showToast('保存草稿失败')
  }
}

// 检查是否有未保存的修改
const hasUnsavedChanges = ref(false)

// 返回
const goBack = () => {
  router.back()
}

// 页面加载
onMounted(() => {
  loadOrderDetail()
})
</script>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 160px;
}

/* 统一风格顶部标题栏 */
.unified-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 48px;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #EEEEEE;
}

.header-left {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  
  .van-icon {
    font-size: 20px;
    color: #333;
  }
}

.header-title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.header-right {
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  
  .action-btn {
    font-size: 14px;
    color: #1677FF;
    cursor: pointer;
    padding: 4px 8px;
    
    &.cancel-btn {
      color: #999;
    }
  }
}

/* 旧样式（保留兼容） */
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

.save-text {
  color: #1989fa;
  font-size: 14px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.detail-content {
  background: #F5F7FA;
  min-height: calc(100vh - 46px);
  padding: 0;
  padding-bottom: 140px;
}

/* 顶部状态栏 */
.status-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 12px;
  margin: 16px;
  color: white;
  
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .order-number {
    font-size: 16px;
    font-weight: 600;
  }
  
  .status-tags {
    display: flex;
    gap: 8px;
  }
}

.status-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  color: #fff;
}

.order-number {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.status-tags {
  display: flex;
  gap: 8px;
}

/* 信息卡片模块 */
.info-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin: 0 16px 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
  
  .van-icon {
    font-size: 18px;
    color: #1677FF;
  }
  
  .add-btn {
    margin-left: auto;
  }
}

.info-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #333;
  
  .van-icon {
    font-size: 18px;
    color: #1989fa;
  }
  
  .add-btn {
    margin-left: auto;
  }
}

/* 核心信息区（客户+金额，首屏展示） */
.core-info-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin: 0 16px 12px;
}

.customer-info {
  margin-bottom: 16px;
  
  .customer-name {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  .order-date {
    font-size: 14px;
    color: #666;
  }
}

.amount-highlight {
  .final-amount {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 12px;
    
    .amount-value {
      font-size: 24px;
      font-weight: 600;
      color: #1677FF;
    }
    
    .amount-label {
      font-size: 14px;
      color: #666;
    }
  }
  
  .payment-status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    
    .received {
      color: #52C41A;
      font-weight: 500;
    }
    
    .divider {
      color: #999;
    }
    
    .unpaid {
      color: #FF4D4F;
      font-weight: 500;
    }
  }
  
  .amount-detail {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: #666;
    
    .negotiation {
      .negative {
        color: #FF4D4F;
      }
    }
  }
}

/* 商品项目紧凑卡片 */
.item-card-compact {
  background: #F5F7FA;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .item-header {
    margin-bottom: 12px;
    
    .item-name {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }
  }
}

.item-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .label {
      font-size: 14px;
      color: #666;
    }
    
    .value {
      font-size: 14px;
      color: #333;
      
      &.price {
        color: #1677FF;
      }
      
      &.total-price {
        font-weight: 600;
        color: #1677FF;
        font-size: 15px;
      }
    }
  }
}

/* 内部信息两列网格 */
.internal-info {
  .internal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    
    .grid-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      &.full-width {
        grid-column: 1 / -1;
      }
      
      .label {
        font-size: 14px;
        color: #666;
      }
      
      .value {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }
    }
  }
}

.order-items-list {
  .order-item {
    background: #f7f8fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .item-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }
  
  .delete-icon {
    font-size: 18px;
    color: #ee0a24;
  }
  
  .item-details {
    font-size: 13px;
  }
  
  .item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    
    .label {
      color: #646566;
    }
    
    .value {
      color: #323233;
      
      &.amount {
        font-weight: 500;
        color: #1989fa;
      }
    }
  }
}

.amount-card {
  .amount-summary {
    font-size: 14px;
  }
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    
    &:not(:last-child) {
      border-bottom: 1px solid #f0f0f0;
    }
    
    .label {
      color: #646566;
    }
    
    .value {
      color: #323233;
      font-weight: 500;
      
      &.total {
        font-size: 18px;
        color: #1989fa;
      }
      
      &.success {
        color: #07c160;
      }
      
      &.warning {
        color: #ff976a;
      }
      
      &.negative {
        color: #ee0a24;
      }
    }
  }
  
  .negotiation-row {
    .van-field {
      text-align: right;
    }
  }
  
  .total-row {
    background: #f7f8fa;
    margin: 8px -16px;
    padding: 12px 16px !important;
  }
  
  .divider {
    height: 1px;
    background: #ebedf0;
    margin: 8px 0;
  }
}

.payment-records {
  .payment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #f7f8fa;
    border-radius: 8px;
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .payment-info {
    .payment-date {
      font-size: 14px;
      color: #323233;
      margin-bottom: 4px;
    }
    
    .payment-method {
      font-size: 12px;
      color: #969799;
    }
  }
  
  .payment-amount {
    font-size: 16px;
    font-weight: 500;
    color: #07c160;
  }
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
  z-index: 99;
}

/* 商品/服务项目列表样式 */
.items-container {
  .item-card {
    background: #F5F7FA;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    .item-name {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }
    
    .delete-icon {
      font-size: 18px;
      color: #FF4D4F;
      cursor: pointer;
    }
  }
  
  .item-info {
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .label {
        font-size: 14px;
        color: #666;
      }
      
      .value {
        font-size: 14px;
        color: #333;
        
        &.price {
          color: #1677FF;
        }
        
        &.total-price {
          font-weight: 600;
          color: #1677FF;
          font-size: 16px;
        }
      }
    }
  }
}

/* 金额汇总样式 */
.amount-section {
  .amount-details {
    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #F0F0F0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .label {
        font-size: 16px;
        color: #333;
      }
      
      .value {
        font-size: 16px;
        color: #333;
        
        &.negative {
          color: #FF4D4F;
        }
        
        &.highlight {
          font-size: 18px;
          font-weight: 600;
          color: #1677FF;
        }
        
        &.success {
          color: #52C41A;
          font-weight: 500;
        }
        
        &.warning {
          color: #FF4D4F;
          font-weight: 500;
        }
      }
      
      &.final {
        padding: 16px 0;
        background: #F5F7FA;
        margin: 8px -16px;
        padding-left: 16px;
        padding-right: 16px;
        border: none;
      }
    }
    
    .divider-line {
      height: 1px;
      background: #E8E8E8;
      margin: 12px 0;
    }
  }
}

/* 底部操作栏（旧样式，保留兼容） */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px 12px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 100;
  
  .van-button {
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .secondary-actions {
    display: flex;
    gap: 12px;
    
    .van-button {
      flex: 1;
      margin-bottom: 0;
    }
  }
}

/* 统一风格底部操作栏 */
.unified-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 10px 16px;
  border-top: 1px solid #EEEEEE;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 100;
  
  .secondary-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    
    .action-btn-small {
      height: 44px;  /* 符合移动端触摸友好规范 ≥44px */
      font-size: 13px;
      border-radius: 4px;
      border: 1px solid #1677FF;
      color: #1677FF;
      padding: 0;
      background: transparent;
      
      &.cancel {
        border-color: #999;
        color: #999;
      }
      
      &:active {
        background: #E6F2FF;
      }
    }
  }
  
  /* 编辑模式：两列布局 */
  &:has(.cancel) .secondary-actions {
    grid-template-columns: 1fr 1fr;
  }
}

/* 收款记录 */
.payment-records {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.payment-record-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background: #F5F7FA;
  border-radius: 4px;
}

.payment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  .payment-time {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }
  
  .payment-method {
    font-size: 13px;
    color: #666;
  }
  
  .payment-operator {
    font-size: 12px;
    color: #999;
  }
}

.payment-amount {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  
  &.success {
    color: #52C41A;
  }
}

</style>
