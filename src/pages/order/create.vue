<template>
  <div class="order-create-page">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="创建订单"
      left-arrow
      @click-left="goBack"
    />

    <!-- 创建订单表单 -->
    <div class="form-container">
      <!-- 客户信息卡片 -->
      <div class="form-card">
        <div class="card-header">
          <van-icon name="contact" class="header-icon" />
          <span class="header-title">客户信息</span>
        </div>
        <div class="card-content">
          <van-field
            v-model="selectedCustomerName"
            label="客户名称"
            placeholder="请选择客户"
            readonly
            required
            @click="showCustomerPicker = true"
          >
            <template #right-icon>
              <van-icon name="arrow-down" />
            </template>
          </van-field>
          <van-field
            v-model="formData.contact_person"
            label="联系人"
            placeholder="自动填充"
            readonly
          />
          <van-field
            v-model="formData.phone"
            label="联系电话"
            placeholder="自动填充"
            readonly
          />
        </div>
      </div>

      <!-- 服务项目卡片 -->
      <div class="form-card">
        <div class="card-header">
          <van-icon name="orders-o" class="header-icon" />
          <span class="header-title">服务项目</span>
        </div>
        <div class="card-content">
          <div class="items-section">
            <div 
              v-for="(item, index) in formData.items" 
              :key="index" 
              class="item-card"
            >
              <van-field
                v-model="item.product_name"
                label="商品名称"
                placeholder="请选择商品"
                readonly
                required
                @click="openProductPicker(index)"
              >
                <template #right-icon>
                  <van-icon name="arrow-down" />
                </template>
              </van-field>
              
              <div class="item-details">
                <van-field
                  v-model.number="item.quantity"
                  label="数量"
                  placeholder="请输入数量"
                  type="number"
                  required
                />
                <van-field
                  v-model.number="item.unit_price"
                  label="单价"
                  placeholder="自动填充"
                  type="digit"
                  readonly
                />
              </div>
              
              <div class="item-total">
                小计: ¥{{ formatAmount(item.quantity * item.unit_price) }}
              </div>
              
              <van-button 
                v-if="formData.items.length > 1"
                class="remove-item"
                type="danger"
                size="small"
                @click="removeItem(index)"
              >
                删除项目
              </van-button>
            </div>
            
            <van-button 
              class="add-item"
              type="default"
              block
              @click="addItem"
            >
              + 添加服务项目
            </van-button>
          </div>
        </div>
      </div>

      <!-- 金额调整卡片 -->
      <div class="form-card">
        <div class="card-header">
          <van-icon name="balance-o" class="header-icon" />
          <span class="header-title">金额调整</span>
        </div>
        <div class="card-content">
          <van-field
            v-model.number="formData.adjustment"
            label="议价/加减价"
            placeholder="请输入调整金额"
            type="digit"
          />
          <van-cell title="最终成交金额">
            <template #value>
              <span class="final-amount">¥{{ formatAmount(finalAmount) }}</span>
            </template>
          </van-cell>
        </div>
      </div>

      <!-- 备注信息卡片 -->
      <div class="form-card">
        <div class="card-header">
          <van-icon name="edit" class="header-icon" />
          <span class="header-title">备注信息</span>
        </div>
        <div class="card-content">
          <van-field
            v-model="formData.remark"
            label="订单备注"
            type="textarea"
            placeholder="请输入订单备注"
            rows="3"
          />
        </div>
      </div>

      <!-- 提交按钮区域 -->
      <div class="submit-section">
        <div class="draft-actions" v-if="formData.customer_id">
          <van-button 
            class="draft-save-btn"
            type="default" 
            size="small"
            @click="manualSaveDraft"
          >
            保存草稿
          </van-button>
          <van-button 
            v-if="hasExistingDraft"
            class="draft-clear-btn"
            type="default" 
            size="small"
            @click="clearCurrentDraft"
          >
            清除草稿
          </van-button>
        </div>
        
        <van-button 
          type="primary" 
          block 
          size="large"
          :loading="submitting"
          @click="submitOrder"
        >
          创建订单
        </van-button>
      </div>
    </div>

    <!-- 客户选择弹窗 -->
    <van-popup 
      v-model:show="showCustomerPicker" 
      position="bottom" 
      round
      :style="{ height: '60%' }"
    >
      <div class="customer-picker">
        <div class="picker-header">
          <span>选择客户</span>
          <van-icon name="cross" @click="showCustomerPicker = false" />
        </div>
        
        <div class="picker-search">
          <van-search
            v-model="customerSearchKeyword"
            placeholder="搜索客户名称"
            @search="searchCustomers"
            @clear="loadCustomerOptions"
          />
        </div>
        
        <div class="picker-list">
          <van-loading v-if="customerLoading" class="loading-center">加载中...</van-loading>
          <van-empty v-else-if="customerOptions.length === 0" description="暂无客户数据" />
          <div 
            v-else
            v-for="customer in customerOptions" 
            :key="customer.id"
            class="customer-item"
            @click="selectCustomer(customer)"
          >
            <div class="customer-info">
              <div class="customer-name">{{ customer.name }}</div>
              <div class="customer-contact">{{ customer.contact_person }} - {{ customer.phone }}</div>
            </div>
            <van-icon name="success" v-if="selectedCustomerId === customer.id" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 商品选择弹窗 -->
    <van-popup 
      v-model:show="showProductPicker" 
      position="bottom" 
      round
      :style="{ height: '60%' }"
    >
      <div class="product-picker">
        <div class="picker-header">
          <span>选择商品/服务</span>
          <van-icon name="cross" @click="showProductPicker = false" />
        </div>
        
        <div class="picker-search">
          <van-search
            v-model="productSearchKeyword"
            placeholder="搜索商品名称"
            @search="searchProductsFunc"
            @clear="loadProductOptions"
          />
        </div>
        
        <div class="picker-list">
          <van-loading v-if="productLoading" class="loading-center">加载中...</van-loading>
          <van-empty v-else-if="productOptions.length === 0" description="暂无商品数据" />
          <div 
            v-else
            v-for="product in productOptions" 
            :key="product.id"
            class="product-item"
            @click="selectProduct(product)"
          >
            <div class="product-info">
              <div class="product-name">{{ product.name }}</div>
              <div class="product-price">¥{{ formatAmount(product.price) }}/{{ product.unit }}</div>
              <div class="product-category" v-if="product.category">{{ product.category }}</div>
            </div>
            <van-icon name="success" v-if="currentItemIndex !== null && formData.items[currentItemIndex]?.product_id === product.id" />
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { showError, showSuccess } from '@/utils/toast'
import { getCustomerOptions, searchCustomers } from '@/api/customer'
import { getProductOptions, searchProducts } from '@/api/product'
import { saveDraft, loadDraft, clearDraft, hasDraft, getDraftSummary } from '@/utils/draftManager'

const router = useRouter()

// 表单数据
const formData = ref({
  customer_id: '',
  customer_name: '',
  contact_person: '',
  phone: '',
  items: [
    {
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      unit: '个'
    }
  ],
  adjustment: 0,
  remark: ''
})

// 客户选择相关
const showCustomerPicker = ref(false)
const selectedCustomerId = ref('')
const selectedCustomerName = ref('')
const customerOptions = ref([])
const customerSearchKeyword = ref('')
const customerLoading = ref(false)

// 商品选择相关
const showProductPicker = ref(false)
const currentItemIndex = ref(null)
const productOptions = ref([])
const productSearchKeyword = ref('')
const productLoading = ref(false)

// 草稿相关
const hasExistingDraft = ref(false)
const draftSummary = ref(null)
const autoSaveTimer = ref(null)

// 提交状态
const submitting = ref(false)

// 计算最终金额
const finalAmount = computed(() => {
  const itemsTotal = formData.value.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price)
  }, 0)
  return itemsTotal + (formData.value.adjustment || 0)
})

// 加载客户选项
const loadCustomerOptions = async () => {
  try {
    customerLoading.value = true
    const res = await getCustomerOptions({ page: 1, page_size: 100 })
    
    // 处理不同响应格式
    if (Array.isArray(res)) {
      customerOptions.value = res
    } else if (res && typeof res === 'object') {
      customerOptions.value = res.customers || res.data || []
    } else {
      customerOptions.value = []
    }
    
  } catch (error) {
    console.error('[Load Customer Options Error]', error)
    customerOptions.value = []
  } finally {
    customerLoading.value = false
  }
}

// 搜索客户
const searchCustomersFunc = async () => {
  if (!customerSearchKeyword.value.trim()) {
    loadCustomerOptions()
    return
  }
  
  try {
    customerLoading.value = true
    const res = await searchCustomers(customerSearchKeyword.value)
    
    if (Array.isArray(res)) {
      customerOptions.value = res
    } else if (res && typeof res === 'object') {
      customerOptions.value = res.customers || res.data || []
    } else {
      customerOptions.value = []
    }
    
  } catch (error) {
    console.error('[Search Customers Error]', error)
    customerOptions.value = []
  } finally {
    customerLoading.value = false
  }
}

// 选择客户
const selectCustomer = (customer) => {
  selectedCustomerId.value = customer.id
  selectedCustomerName.value = customer.name
  formData.value.customer_id = customer.id
  formData.value.customer_name = customer.name
  formData.value.contact_person = customer.contact_person || ''
  formData.value.phone = customer.phone || ''
  showCustomerPicker.value = false
}

// 打开商品选择器
const openProductPicker = (index) => {
  currentItemIndex.value = index
  showProductPicker.value = true
  loadProductOptions()
}

// 加载商品选项
const loadProductOptions = async () => {
  try {
    productLoading.value = true
    const res = await getProductOptions({ page: 1, page_size: 100 })
    
    if (Array.isArray(res)) {
      productOptions.value = res
    } else if (res && typeof res === 'object') {
      productOptions.value = res.products || res.data || []
    } else {
      productOptions.value = []
    }
    
  } catch (error) {
    console.error('[Load Product Options Error]', error)
    productOptions.value = []
  } finally {
    productLoading.value = false
  }
}

// 搜索商品
const searchProductsFunc = async () => {
  if (!productSearchKeyword.value.trim()) {
    loadProductOptions()
    return
  }
  
  try {
    productLoading.value = true
    const res = await searchProducts(productSearchKeyword.value)
    
    if (Array.isArray(res)) {
      productOptions.value = res
    } else if (res && typeof res === 'object') {
      productOptions.value = res.products || res.data || []
    } else {
      productOptions.value = []
    }
    
  } catch (error) {
    console.error('[Search Products Error]', error)
    productOptions.value = []
  } finally {
    productLoading.value = false
  }
}

// 选择商品
const selectProduct = (product) => {
  if (currentItemIndex.value !== null) {
    const item = formData.value.items[currentItemIndex.value]
    item.product_id = product.id
    item.product_name = product.name
    item.unit_price = product.price || 0
    item.unit = product.unit || '个'
    
    // 如果是第一个项目且数量为1，则自动设置数量为商品默认数量
    if (currentItemIndex.value === 0 && item.quantity === 1 && product.default_quantity) {
      item.quantity = product.default_quantity
    }
  }
  
  showProductPicker.value = false
  currentItemIndex.value = null
}

// 页面加载时初始化
onMounted(() => {
  checkExistingDraft()
  loadCustomerOptions()
  startAutoSave()
})

// 页面卸载时清理
onUnmounted(() => {
  stopAutoSave()
})

// 检查现有草稿
const checkExistingDraft = () => {
  hasExistingDraft.value = hasDraft()
  if (hasExistingDraft.value) {
    draftSummary.value = getDraftSummary()
    showConfirmDialog({
      title: '发现未完成的订单草稿',
      message: `客户: ${draftSummary.value.customerName}
商品: ${draftSummary.value.itemCount}项
金额: ¥${draftSummary.value.totalAmount.toFixed(2)}
保存于: ${draftSummary.value.savedTime}

是否继续编辑?`,
      confirmButtonText: '继续编辑',
      cancelButtonText: '重新开始'
    }).then(() => {
      loadDraftData()
    }).catch(() => {
      clearDraft()
      hasExistingDraft.value = false
      draftSummary.value = null
    })
  }
}

// 加载草稿数据
const loadDraftData = () => {
  const draft = loadDraft()
  if (draft) {
    formData.value = {
      ...draft,
      // 确保items结构正确
      items: draft.items.map(item => ({
        product_id: item.product_id || '',
        product_name: item.product_name || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        unit: item.unit || '个'
      }))
    }
    
    // 更新选择状态
    if (draft.customer_id) {
      selectedCustomerId.value = draft.customer_id
      selectedCustomerName.value = draft.customer_name || ''
    }
    
    showSuccess('草稿加载成功')
  }
}

// 开始自动保存
const startAutoSave = () => {
  // 每30秒自动保存一次
  autoSaveTimer.value = setInterval(() => {
    if (formData.value.customer_id) {
      saveDraft(formData.value)
    }
  }, 30000)
}

// 停止自动保存
const stopAutoSave = () => {
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
    autoSaveTimer.value = null
  }
}

// 手动保存草稿
const manualSaveDraft = () => {
  if (!formData.value.customer_id) {
    showError('请先选择客户')
    return
  }
  
  const success = saveDraft(formData.value)
  if (success) {
    showSuccess('草稿保存成功')
  } else {
    showError('草稿保存失败')
  }
}

// 清除草稿
const clearCurrentDraft = () => {
  clearDraft()
  hasExistingDraft.value = false
  draftSummary.value = null
  showSuccess('草稿已清除')
}

// 添加服务项目
const addItem = () => {
  formData.value.items.push({
    product_id: '',
    product_name: '',
    quantity: 1,
    unit_price: 0,
    unit: '个'
  })
}

// 删除服务项目
const removeItem = (index) => {
  if (formData.value.items.length > 1) {
    formData.value.items.splice(index, 1)
  }
}

// 格式化金额
const formatAmount = (amount) => {
  return Number(amount || 0).toFixed(2)
}

// 返回
const goBack = () => {
  router.back()
}

// 提交订单
const submitOrder = async () => {
  try {
    // 验证必填字段
    if (!formData.value.customer_id) {
      showError('请选择客户')
      return
    }
    
    const hasEmptyItem = formData.value.items.some(item => !item.product_id)
    if (hasEmptyItem) {
      showError('请选择所有商品')
      return
    }

    submitting.value = true
    
    // 这里应该是调用创建订单API
    // await createOrderAPI(formData.value)
    
    // 模拟提交延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    showSuccess('订单创建成功')
    
    // 提交成功后清除草稿
    clearDraft()
    
    router.replace('/main/order')
    
  } catch (error) {
    showError(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less" scoped>
.order-create-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.form-container {
  padding: 16px;
  padding-bottom: 32px;
}

:deep(.van-cell-group) {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.van-cell-group__title) {
  padding-left: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.items-section {
  padding: 16px;
}

.item-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.item-details {
  display: flex;
  gap: 12px;
  margin: 12px 0;
}

.item-details :deep(.van-cell) {
  flex: 1;
}

.item-total {
  text-align: right;
  font-size: 16px;
  font-weight: 500;
  color: #1677ff;
  margin: 8px 0;
}

.remove-item {
  margin-top: 8px;
}

.add-item {
  margin-top: 8px;
  height: 44px;
}

.final-amount {
  font-size: 18px;
  font-weight: 500;
  color: #1677ff;
}

.submit-section {
  margin-top: 24px;
  padding: 0 16px;
}

:deep(.van-button--large) {
  height: 48px;
  font-size: 16px;
}

:deep(.van-field__label) {
  width: 90px;
}

/* 客户选择器样式 */
.customer-picker {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 16px;
  font-weight: 500;
}

.picker-search {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.customer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f8f8f8;
  cursor: pointer;
  transition: background-color 0.2s;
}

.customer-item:hover {
  background-color: #f5f5f5;
}

.customer-info {
  flex: 1;
}

.customer-name {
  font-size: 16px;
  color: #333;
  margin-bottom: 4px;
}

.customer-contact {
  font-size: 14px;
  color: #666;
}

.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

/* 商品选择器样式 */
.product-picker {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f8f8f8;
  cursor: pointer;
  transition: background-color 0.2s;
}

.product-item:hover {
  background-color: #f5f5f5;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 16px;
  color: #333;
  margin-bottom: 4px;
}

.product-price {
  font-size: 14px;
  color: #1677ff;
  font-weight: 500;
  margin-bottom: 2px;
}

.product-category {
  font-size: 12px;
  color: #999;
}

/* 草稿操作样式 */
.draft-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  justify-content: center;
}

.draft-save-btn, .draft-clear-btn {
  min-width: 100px;
  height: 36px;
  border: 1px solid #1677ff;
  color: #1677ff;
}

.draft-clear-btn {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

:deep(.van-button--large) {
  height: 48px;
  font-size: 16px;
}

/* 新增的卡片式布局样式 */
.form-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(90deg, #f0f8ff 0%, #e6f4ff 100%);
  border-bottom: 1px solid #e6f4ff;
}

.header-icon {
  font-size: 18px;
  color: #1677ff;
  margin-right: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #1677ff;
}

.card-content {
  padding: 16px;
}

/* 响应式优化 */
@media (max-width: 375px) {
  .form-container {
    padding: 12px;
    padding-bottom: 100px;
  }
  
  .card-content {
    padding: 12px;
  }
  
  .item-details {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>