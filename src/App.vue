<template>
  <div id="app" class="mobile-erp-app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  console.log('[Mobile ERP] App mounted')
  
  // 防止iOS双击缩放
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, { passive: false })
  
  // 防止长按弹出菜单
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })
})
</script>

<style lang="less">
.mobile-erp-app {
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  
  // 顶部安全区域适配
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  
  // 底部安全区域由 van-tabbar 组件处理
}
</style>
