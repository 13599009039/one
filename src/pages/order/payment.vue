<template>
  <div class="payment-page">
    <!-- 顶部标题栏 -->
    <div class="unified-header">
      <div class="header-left" @click="goBack">
        <van-icon name="arrow-left" />
      </div>
      <div class="header-title">订单收款</div>
      <div class="header-right"></div>
    </div>

    <!-- 加载中 -->
    <van-loading v-if="loading" class="loading-container" vertical>加载中...</van-loading>

    <!-- 错误提示 -->
    <van-empty v-else-if="error" description="订单不存在或已被删除" />

    <!-- 收款内容 -->
    <div v-else class="payment-content">
      <!-- 订单信息卡片 -->
      <div class="order-info-card">
        <div class="info-row">
          <span class="label">客户名称</span>
          <span class="value">{{ orderData.customer_name }}</span>
        </div>
        <div class="info-row">
          <span class="label">订单号</span>
          <span class="value">{{ orderData.order_no }}</span>
        </div>
        <div class="amount-row">
          <div class="amount-item">
            <span class="label">待收金额</span>
            <span class="amount danger">¥{{ formatAmount(unpaidAmount) }}</span>
          </div>
          <div class="amount-item">
            <span class="label">已收/成交</span>
            <span class="amount-detail">¥{{ formatAmount(orderData.received_amount || 0) }} / ¥{{ formatAmount(orderData.final_amount || 0) }}</span>
          </div>
        </div>
      </div>

      <!-- 收款明细标题 -->
      <div class="section-header">
        <span>收款明细</span>
        <van-button 
          type="primary" 
          size="small" 
          @click="addPaymentItem"
          :disabled="unpaidAmount <= 0"
        >
          + 添加收款
        </van-button>
      </div>

      <!-- 收款明细列表 -->
      <div class="payment-items">
        <div 
          v-for="(item, index) in paymentItems" 
          :key="index" 
          class="payment-item-card"
        >
          <div class="card-header">
            <span class="item-title">收款明细 {{ index + 1 }}</span>
            <van-icon 
              v-if="paymentItems.length > 1"
              name="delete-o" 
              @click="removePaymentItem(index)"
              class="delete-icon"
            />
          </div>

          <!-- 收款金额 -->
          <div class="form-item">
            <div class="form-label">收款金额 <span class="required">*</span></div>
            <van-field
              v-model="item.amount"
              type="number"
              placeholder="请输入收款金额"
              :rules="[{ required: true, message: '请输入收款金额' }]"
            >
              <template #button>
                <span class="unit">元</span>
              </template>
            </van-field>
          </div>

          <!-- 收款类型 -->
          <div class="form-item">
            <div class="form-label">收款类型 <span class="required">*</span></div>
            <div class="type-buttons">
              <van-button 
                v-for="type in paymentTypes" 
                :key="type.id"
                :type="paymentItems[currentItemIndex]?.type === type.name ? 'primary' : 'default'"
                size="small"
                @click="selectPaymentType(currentItemIndex, type)"
                class="type-btn"
                :loading="paymentTypesLoading"
              >
                {{ type.name }}
              </van-button>
            </div>
            <div v-if="paymentTypesLoading" class="loading-tip">加载中...</div>
            <div v-else-if="paymentTypes.length === 0" class="error-tip">暂无可选收款类型</div>
          </div>

          <!-- 收款账户 -->
          <div class="form-item">
            <div class="form-label">收款账户 <span class="required">*</span></div>
            <van-field
              v-model="item.accountText"
              readonly
              placeholder="请选择收款账户"
              @click="showAccountSheet = true"
              right-icon="arrow-down"
              :disabled="bankAccountsLoading"
            />
            <div v-if="bankAccountsLoading" class="loading-tip">账户加载中...</div>
            <div v-else-if="bankAccounts.length === 0" class="error-tip">暂无可选账户</div>
          </div>

          <!-- 收款时间 -->
          <div class="form-item">
            <div class="form-label">收款时间 <span class="required">*</span></div>
            <van-field
              v-model="item.dateText"
              readonly
              placeholder="请选择收款时间"
              @click="showDatePicker(index)"
              right-icon="arrow-down"
            />
          </div>

          <!-- 收款备注 -->
          <div class="form-item notes-item">
            <div class="form-label">备注（选填）</div>
            <van-field
              v-model="item.notes"
              type="textarea"
              placeholder="请输入收款备注"
              rows="4"
              autosize
              maxlength="200"
              show-word-limit
              class="notes-textarea"
            />
          </div>
        </div>
      </div>

      <!-- 底部操作区 -->
      <div class="bottom-actions">
        <van-button 
          plain 
          @click="goBack" 
          class="cancel-btn"
        >
          取消
        </van-button>
        <van-button 
          type="primary" 
          @click="handleSubmit" 
          class="submit-btn"
          :loading="submitting"
        >
          确认收款
        </van-button>
      </div>
    </div>

    <!-- 账户选择ActionSheet -->
    <van-action-sheet 
      v-model:show="showAccountSheet" 
      :actions="bankAccounts.map(account => ({
        name: `${account.name} (余额: ¥${formatAmount(account.balance)})`,
        subname: account.name,
        account: account
      }))"
      cancel-text="取消"
      @select="onAccountSelect"
      @cancel="showAccountSheet = false"
      :round="true"
    />

    <!-- 日期选择器 -->
    <van-popup v-model:show="showDatePickerFlag" position="bottom" round>
      <van-date-picker
        v-model="currentDate"
        @confirm="onDateConfirm"
        @cancel="showDatePickerFlag = false"
        :min-date="minDate"
        :max-date="maxDate"
      />
    </van-popup>

    <!-- 账户选择器 -->
    <van-popup v-model:show="showAccountPickerFlag" position="bottom" round>
      <van-picker
        :columns="accountOptions"
        @confirm="onAccountConfirm"
        @cancel="showAccountPickerFlag = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showSuccessToast, showDialog } from 'vant'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const orderId = route.params.id

// 数据状态
const loading = ref(true)
const error = ref(false)
const submitting = ref(false)
const orderData = ref({})

// 收款明细列表
const paymentItems = ref([])

// 当前操作的明细索引
const currentItemIndex = ref(0)

// 收款类型数据（从接口获取）
const paymentTypes = ref([])
const paymentTypesLoading = ref(false)

// 收款账户数据（从接口获取）
const bankAccounts = ref([])
const bankAccountsLoading = ref(false)

// ActionSheet状态
const showAccountSheet = ref(false)

// 日期选择器状态
const showDatePickerFlag = ref(false)

// 账户选择器状态（备用）
const showAccountPickerFlag = ref(false)

// 日期选择器
const currentDate = ref(new Date())
const minDate = ref(new Date(2020, 0, 1))
const maxDate = ref(new Date(2030, 11, 31))

// 计算待收金额
const unpaidAmount = computed(() => {
  return (orderData.value.final_amount || 0) - (orderData.value.received_amount || 0)
})

// 格式化金额
const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0.00'
  return parseFloat(amount).toFixed(2)
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 创建新的收款明细
const createPaymentItem = () => {
  const today = new Date().toISOString().split('T')[0]
  return {
    amount: '',
    type: '',
    typeText: '',
    account_id: null,
    accountText: '',
    date: today,
    dateText: formatDate(today),
    notes: ''
  }
}

// 添加收款明细
const addPaymentItem = () => {
  if (unpaidAmount.value <= 0) {
    showToast('订单已全部收款')
    return
  }
  paymentItems.value.push(createPaymentItem())
}

// 删除收款明细
const removePaymentItem = (index) => {
  showDialog({
    title: '删除确认',
    message: '确认删除？',
    showCancelButton: true,
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    paymentItems.value.splice(index, 1)
  }).catch(() => {
    // 取消删除
  })
}

// 加载收款类型数据
const loadPaymentTypes = async () => {
  try {
    paymentTypesLoading.value = true
    const response = await request.get('/api/common/payment-types')
    
    // 兼容两种响应格式
    if (response && (response.success || response.code === 0)) {
      paymentTypes.value = response.data || response
    } else if (Array.isArray(response)) {
      paymentTypes.value = response
    } else {
      console.error('[Load Payment Types] Invalid response:', response)
      paymentTypes.value = []
    }
  } catch (err) {
    console.error('[Load Payment Types Error]', err)
    paymentTypes.value = []
  } finally {
    paymentTypesLoading.value = false
  }
}

// 加载收款账户数据
const loadBankAccounts = async () => {
  try {
    bankAccountsLoading.value = true
    const response = await request.get('/api/common/bank-accounts')
    
    // 兼容两种响应格式
    if (response && (response.success || response.code === 0)) {
      bankAccounts.value = response.data || []
    } else if (Array.isArray(response)) {
      bankAccounts.value = response
    } else {
      console.error('[Load Bank Accounts] Invalid response:', response)
      bankAccounts.value = []
    }
  } catch (err) {
    console.error('[Load Bank Accounts Error]', err)
    bankAccounts.value = []
  } finally {
    bankAccountsLoading.value = false
  }
}

// 选择收款账户
const selectBankAccount = (index, account) => {
  const item = paymentItems.value[index]
  item.account_id = account.id
  item.accountText = `${account.name} (余额: ¥${formatAmount(account.balance)})`
  showAccountSheet.value = false
}

// 选择收款类型
const selectPaymentType = (index, typeObj) => {
  const item = paymentItems.value[index]
  item.type = typeObj.name
  item.typeText = typeObj.name
}

// 显示日期选择器
const showDatePicker = (index) => {
  currentItemIndex.value = index
  const item = paymentItems.value[index]
  if (item.date) {
    currentDate.value = new Date(item.date)
  }
  showDatePickerFlag.value = true
}

// 显示账户选择器（改为ActionSheet）
const showAccountPicker = (index) => {
  currentItemIndex.value = index
  showAccountSheet.value = true
}

// 日期确认
const onDateConfirm = ({ selectedValues }) => {
  const year = selectedValues[0]
  const month = String(selectedValues[1]).padStart(2, '0')
  const day = String(selectedValues[2]).padStart(2, '0')
  const dateString = `${year}-${month}-${day}`
  
  const item = paymentItems.value[currentItemIndex.value]
  item.date = dateString
  item.dateText = dateString
  showDatePickerFlag.value = false
}

// 账户选择确认
const onAccountSelect = (action) => {
  const account = action.account
  const item = paymentItems.value[currentItemIndex.value]
  item.account_id = account.id
  item.accountText = `${account.name} (余额: ¥${formatAmount(account.balance)})`
  showAccountSheet.value = false
}

// 加载订单详情
const loadOrderDetail = async () => {
  try {
    loading.value = true
    const response = await request.get(`/api/mobile/orders/${orderId}`)
    
    // request拦截器已返回data，response直接就是订单数据
    if (response && response.id) {
      orderData.value = response
      // 初始化第一条收款明细，默认填充待收金额
      const firstItem = createPaymentItem()
      firstItem.amount = formatAmount(unpaidAmount.value)
      paymentItems.value = [firstItem]
    } else {
      error.value = true
      showToast('订单不存在或已被删除')
    }
  } catch (err) {
    console.error('[Load Order Error]', err)
    error.value = true
    
    // 根据错误类型给出不同提示
    if (err.response?.status === 403) {
      showToast('您无权限访问该订单，请确认所属公司')
    } else if (err.response?.status === 404) {
      showToast('订单不存在或已被删除')
    } else {
      showToast('获取订单信息失败')
    }
  } finally {
    loading.value = false
  }
}

// 加载账户列表
const loadAccounts = async () => {
  try {
    const response = await request.get('/api/accounts')
    // request拦截器已返回data，response直接就是账户数组
    if (response && Array.isArray(response)) {
      accounts.value = response
      accountOptions.value = response.map(acc => ({
        text: `${acc.name} (余额: ¥${formatAmount(acc.balance || 0)})`,
        value: acc.id
      }))
    }
  } catch (err) {
    console.error('[Load Accounts Error]', err)
    showToast('加载账户列表失败，请刷新重试')
  }
}

// 提交收款
const handleSubmit = async () => {
  // 数据校验
  if (paymentItems.value.length === 0) {
    showToast('请至少添加一条收款明细')
    return
  }

  // 校验每条明细
  let totalAmount = 0
  for (let i = 0; i < paymentItems.value.length; i++) {
    const item = paymentItems.value[i]
    const amount = parseFloat(item.amount)
    
    if (isNaN(amount) || amount <= 0) {
      showToast(`收款明细${i + 1}：请输入有效的收款金额`)
      return
    }
    
    if (!item.type) {
      showToast(`收款明细${i + 1}：请选择收款类型`)
      return
    }
    
    if (!item.account_id) {
      showToast(`收款明细${i + 1}：请选择收款账户`)
      return
    }
    
    if (!item.date) {
      showToast(`收款明细${i + 1}：请选择收款时间`)
      return
    }
    
    totalAmount += amount
  }
  
  // 校验总金额不超过待收金额
  if (totalAmount > unpaidAmount.value) {
    showToast(`收款总额¥${formatAmount(totalAmount)}不能大于待收金额¥${formatAmount(unpaidAmount.value)}`)
    return
  }
  
  try {
    submitting.value = true
    
    // 批量提交收款记录
    for (const item of paymentItems.value) {
      await request.post('/api/payments', {
        order_id: orderId,
        payment_amount: parseFloat(item.amount),
        payment_date: item.date,
        payment_method: item.type,
        account_id: item.account_id,
        remark: item.notes,
        created_by: localStorage.getItem('mobile_erp_user_id') || 1
      })
    }
    
    showSuccessToast(`成功登记${paymentItems.value.length}笔收款`)
    setTimeout(() => {
      router.back()
    }, 1500)
  } catch (err) {
    console.error('[Submit Payment Error]', err)
  } finally {
    submitting.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 页面加载
onMounted(async () => {
  console.log('[Payment Page] 订单ID:', orderId)
  await Promise.all([
    loadOrderDetail(),
    loadPaymentTypes(),
    loadBankAccounts()
  ])
})
</script>

<style scoped>
.payment-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 80px;
}

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
}

.header-left .van-icon {
  font-size: 20px;
  color: #333;
}

.header-title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.header-right {
  width: 40px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.payment-content {
  padding: 12px;
}

.order-info-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #F5F7FA;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font-size: 14px;
  color: #666;
}

.info-row .value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid #F5F7FA;
}

.amount-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.amount-item .label {
  font-size: 12px;
  color: #999;
}

.amount-item .amount {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.amount-item .amount.danger {
  color: #FF4D4F;
}

.amount-item .amount-detail {
  font-size: 14px;
  color: #666;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px;
}

.section-header span {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.payment-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.payment-item-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #F5F7FA;
}

.card-header .item-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.card-header .delete-icon {
  font-size: 18px;
  color: #FF4D4F;
  cursor: pointer;
}

.form-item {
  margin-bottom: 12px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-label .required {
  color: #FF4D4F;
  margin-left: 2px;
}

.unit {
  font-size: 14px;
  color: #666;
}

/* 收款类型按钮样式 */
.type-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-btn {
  flex: 1;
  min-width: 80px;
}

.loading-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.error-tip {
  font-size: 12px;
  color: #ff4d4f;
  margin-top: 4px;
}

/* 备注栏样式优化 */
.notes-item {
  margin-bottom: 16px;
}

.notes-textarea {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.notes-textarea :deep(.van-field__control) {
  min-height: 80px;
  line-height: 1.5;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 10px 16px;
  border-top: 1px solid #EEEEEE;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 100;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cancel-btn {
  height: 44px;  /* 符合移动端触摸友好规范 ≥44px */
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #999;
  color: #999;
  background: transparent;
}

.submit-btn {
  height: 44px;  /* 符合移动端触摸友好规范 ≥44px */
  font-size: 14px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(22, 119, 255, 0.15);
}
</style>
