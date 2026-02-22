/**
 * 草稿管理工具类
 * 负责订单创建页面的草稿数据本地存储和同步
 */

const DRAFT_KEY = 'order_create_draft'
const DRAFT_TIMESTAMP_KEY = 'order_create_draft_timestamp'

/**
 * 保存草稿数据
 * @param {Object} draftData - 草稿数据
 */
export function saveDraft(draftData) {
  try {
    const draftWithTimestamp = {
      ...draftData,
      savedAt: new Date().toISOString(),
      version: '1.0'
    }
    
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftWithTimestamp))
    localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString())
    
    console.log('[Draft Manager] 草稿保存成功', draftWithTimestamp)
    return true
  } catch (error) {
    console.error('[Draft Manager] 草稿保存失败', error)
    return false
  }
}

/**
 * 加载草稿数据
 * @returns {Object|null} 草稿数据或null
 */
export function loadDraft() {
  try {
    const draftJson = localStorage.getItem(DRAFT_KEY)
    if (!draftJson) {
      return null
    }
    
    const draftData = JSON.parse(draftJson)
    
    // 验证数据完整性
    if (!isValidDraft(draftData)) {
      console.warn('[Draft Manager] 草稿数据不完整，已清除')
      clearDraft()
      return null
    }
    
    console.log('[Draft Manager] 草稿加载成功', draftData)
    return draftData
  } catch (error) {
    console.error('[Draft Manager] 草稿加载失败', error)
    clearDraft()
    return null
  }
}

/**
 * 清除草稿数据
 */
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(DRAFT_TIMESTAMP_KEY)
    console.log('[Draft Manager] 草稿已清除')
    return true
  } catch (error) {
    console.error('[Draft Manager] 草稿清除失败', error)
    return false
  }
}

/**
 * 检查是否存在草稿
 * @returns {boolean} 是否存在草稿
 */
export function hasDraft() {
  return !!localStorage.getItem(DRAFT_KEY)
}

/**
 * 获取草稿保存时间
 * @returns {string|null} 保存时间ISO字符串或null
 */
export function getDraftSavedTime() {
  try {
    const draftJson = localStorage.getItem(DRAFT_KEY)
    if (!draftJson) return null
    
    const draftData = JSON.parse(draftJson)
    return draftData.savedAt || null
  } catch (error) {
    console.error('[Draft Manager] 获取保存时间失败', error)
    return null
  }
}

/**
 * 验证草稿数据完整性
 * @param {Object} draftData - 草稿数据
 * @returns {boolean} 是否有效
 */
function isValidDraft(draftData) {
  if (!draftData || typeof draftData !== 'object') {
    return false
  }
  
  // 检查必需字段
  const requiredFields = ['customer_id', 'items']
  for (const field of requiredFields) {
    if (!(field in draftData)) {
      return false
    }
  }
  
  // 检查items数组
  if (!Array.isArray(draftData.items)) {
    return false
  }
  
  // 检查每个item的必需字段
  for (const item of draftData.items) {
    if (!item.product_id || !item.quantity || !item.unit_price) {
      return false
    }
  }
  
  return true
}

/**
 * 格式化显示草稿保存时间
 * @param {string} isoTime - ISO时间字符串
 * @returns {string} 格式化的时间显示
 */
export function formatDraftTime(isoTime) {
  if (!isoTime) return ''
  
  try {
    const date = new Date(isoTime)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMinutes < 1) {
      return '刚刚'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  } catch (error) {
    return '未知时间'
  }
}

/**
 * 获取草稿摘要信息（用于显示提示）
 * @returns {Object} 草稿摘要
 */
export function getDraftSummary() {
  const draft = loadDraft()
  if (!draft) return null
  
  return {
    customerName: draft.customer_name || '未选择客户',
    itemCount: draft.items ? draft.items.length : 0,
    totalAmount: draft.items ? 
      draft.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) + (draft.adjustment || 0) : 0,
    savedTime: formatDraftTime(draft.savedAt)
  }
}

export default {
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
  getDraftSavedTime,
  formatDraftTime,
  getDraftSummary
}