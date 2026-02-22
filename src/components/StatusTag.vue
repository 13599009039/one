<template>
  <van-tag 
    :type="tagType"
    :color="customColor"
    :text-color="textColor"
    :size="size"
    :plain="plain"
    :round="round"
  >
    {{ text }}
  </van-tag>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  statusMap: {
    type: Object,
    default: () => ({})
  },
  size: {
    type: String,
    default: 'medium'
  },
  plain: {
    type: Boolean,
    default: false
  },
  round: {
    type: Boolean,
    default: true
  }
})

// 默认状态映射
const defaultStatusMap = {
  pending: { text: '待处理', type: 'warning', color: '', textColor: '' },
  processing: { text: '处理中', type: 'primary', color: '', textColor: '' },
  success: { text: '已完成', type: 'success', color: '', textColor: '' },
  failed: { text: '失败', type: 'danger', color: '', textColor: '' },
  cancelled: { text: '已取消', type: 'default', color: '', textColor: '' }
}

// 合并用户自定义映射
const finalStatusMap = computed(() => ({
  ...defaultStatusMap,
  ...props.statusMap
}))

// 当前状态配置
const currentStatus = computed(() => {
  return finalStatusMap.value[props.status] || defaultStatusMap.pending
})

// 标签类型
const tagType = computed(() => currentStatus.value.type)

// 自定义颜色
const customColor = computed(() => currentStatus.value.color)

// 文本颜色
const textColor = computed(() => currentStatus.value.textColor)

// 显示文本
const text = computed(() => currentStatus.value.text)
</script>
