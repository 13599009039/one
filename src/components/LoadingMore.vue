<template>
  <div class="loading-more" :class="{ 'is-loading': loading }">
    <van-loading v-if="loading" size="20">加载中...</van-loading>
    <span v-else-if="finished" class="finished-text">{{ finishedText }}</span>
    <span v-else-if="error" class="error-text">{{ errorText }}</span>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  finished: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  finishedText: {
    type: String,
    default: '没有更多了'
  },
  errorText: {
    type: String,
    default: '加载失败，点击重试'
  }
})

const emit = defineEmits(['reload'])

const handleReload = () => {
  emit('reload')
}
</script>

<style lang="less" scoped>
.loading-more {
  padding: 16px 0;
  text-align: center;
  font-size: 14px;
  color: #969799;
  
  &.is-loading {
    :deep(.van-loading__text) {
      margin-left: 8px;
    }
  }
  
  .finished-text {
    color: #969799;
  }
  
  .error-text {
    color: #ee0a24;
    cursor: pointer;
    
    &:active {
      opacity: 0.7;
    }
  }
}
</style>
