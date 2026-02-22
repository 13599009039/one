<template>
  <div class="main-container">
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <router-view />
    </div>

    <!-- 底部导航栏 -->
    <div class="bottom-navigation">
      <div 
        class="nav-item" 
        :class="{ active: active === 0 }"
        @click="navigateTo('customer')"
      >
        <van-icon name="friends-o" />
        <span>客户</span>
      </div>
      <div 
        class="nav-item" 
        :class="{ active: active === 1 }"
        @click="navigateTo('order')"
      >
        <van-icon name="orders-o" />
        <span>订单</span>
      </div>
      <div class="nav-plus" @click="createOrder">
        <van-icon name="plus" />
      </div>
      <div 
        class="nav-item" 
        :class="{ active: active === 2 }"
        @click="navigateTo('statistics')"
      >
        <van-icon name="bar-chart-o" />
        <span>统计</span>
      </div>
      <div 
        class="nav-item" 
        :class="{ active: active === 3 }"
        @click="navigateTo('mine')"
      >
        <van-icon name="user-o" />
        <span>我的</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const active = ref(0)

// Tab切换映射
const tabRoutes = {
  'customer': '/main/customer',
  'order': '/main/order',
  'statistics': '/main/statistics',
  'mine': '/main/mine'
}

const tabMap = {
  '/main/customer': 0,
  '/main/order': 1,
  '/main/statistics': 2,
  '/main/mine': 3
}

// 导航处理
const navigateTo = (name) => {
  console.log('[Navigate To]', name)
  const routePath = tabRoutes[name]
  if (routePath && routePath !== route.path) {
    router.push(routePath)
  }
}

// 创建新订单
const createOrder = () => {
  console.log('[Create Order]')
  router.push('/order/create')
}

// 监听路由变化更新active状态
watch(() => route.path, (newPath) => {
  active.value = tabMap[newPath] || 0
})

// 初始化active值
onMounted(() => {
  const currentPath = route.path
  active.value = tabMap[currentPath] || 0
})
</script>

<style lang="less" scoped>
.main-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  // 确保容器占满整个视口
  position: relative;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  // 为底部导航栏留出适当空间
  padding-bottom: 76px;
  // 确保内容不会被导航栏遮挡
  position: relative;
  z-index: 1;
}

// 底部导航栏样式
.bottom-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #ffffff;
  display: flex;
  border-top: 1px solid #ebedf0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 100;
  // 安全区域适配
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  cursor: pointer;
  transition: all 0.3s ease;
  
  .van-icon {
    font-size: 24px;
    margin-bottom: 6px;
    color: #646566;
  }
  
  span {
    font-size: 16px;  /* 从14px进一步加大到16px */
    color: #646566;
  }
  
  &.active {
    .van-icon {
      color: #1677ff;
    }
    
    span {
      color: #1677ff;
      font-weight: 500;
    }
  }
  
  &:active {
    background: #f5f5f5;
  }
}

/* 新增订单按钮 */
.nav-plus {
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -20px;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 101;  /* 确保在最上层 */
  position: relative;  /* 确保z-index生效 */
  
  .van-icon {
    font-size: 28px;
    color: #ffffff;
  }
  
  &:active {
    transform: scale(0.95);
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.4);
  }
}

:deep(.van-tabbar-item__icon) {
  font-size: 22px;
}

:deep(.van-tabbar-item__text) {
  font-size: 12px;
}

:deep(.van-tabbar-item--active) {
  color: #1677FF;
}
</style>
