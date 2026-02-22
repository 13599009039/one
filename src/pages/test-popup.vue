<template>
  <div class="test-page">
    <h2>弹窗测试页面</h2>
    
    <van-button type="primary" @click="showTestPopup">显示测试弹窗</van-button>
    
    <van-popup v-model:show="showPopup" position="center" :style="{ width: '80%', maxWidth: '300px' }" round>
      <div style="padding: 20px; text-align: center;">
        <h3>测试弹窗</h3>
        <p>这是一个测试弹窗内容</p>
        <van-button type="primary" @click="showPopup = false">关闭</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showPopup = ref(false)

const showTestPopup = () => {
  console.log('显示测试弹窗')
  showPopup.value = true
}
</script>

<style scoped>
.test-page {
  padding: 20px;
  text-align: center;
}
</style>