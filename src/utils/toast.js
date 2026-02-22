/**
 * 统一提示工具
 * 所有提示统一使用顶部位置，确保用户能及时看到
 */
import { showSuccessToast, showFailToast, showToast } from 'vant'
import { nextTick } from 'vue'

/**
 * 显示顶部错误提示
 * @param {string} message - 错误信息
 * @param {number} duration - 显示时长，默认3000ms
 */
export const showError = (message, duration = 3000) => {
  // 使用nextTick确保DOM更新后显示
  nextTick(() => {
    showFailToast({
      message: message,
      position: 'top',
      duration: duration,
      teleport: 'body',
      className: 'top-error-toast'
    })
  })
}

/**
 * 显示顶部成功提示
 * @param {string} message - 成功信息
 * @param {number} duration - 显示时长，默认2000ms
 */
export const showSuccess = (message, duration = 2000) => {
  nextTick(() => {
    showSuccessToast({
      message: message,
      position: 'top',
      duration: duration,
      teleport: 'body',
      className: 'top-success-toast'
    })
  })
}

/**
 * 显示顶部普通提示
 * @param {string} message - 提示信息
 * @param {number} duration - 显示时长，默认2000ms
 */
export const showInfo = (message, duration = 2000) => {
  nextTick(() => {
    showToast({
      message: message,
      position: 'top',
      duration: duration,
      teleport: 'body',
      className: 'top-info-toast'
    })
  })
}

export default {
  showError,
  showSuccess,
  showInfo
}
