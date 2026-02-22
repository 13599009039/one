<template>
  <div class="empty-state">
    <van-empty :image="image" :description="description">
      <van-button v-if="buttonText" round type="primary" @click="handleClick">
        {{ buttonText }}
      </van-button>
    </van-empty>
  </div>
</template>

<script setup>
defineProps({
  image: {
    type: String,
    default: 'default'
  },
  description: {
    type: String,
    default: '暂无数据'
  },
  buttonText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>

<style lang="less" scoped>
.empty-state {
  padding: 40px 0;
}
</style>
