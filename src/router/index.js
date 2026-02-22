import { createRouter, createWebHistory } from 'vue-router'
import errorLogger from '@/utils/errorLogger'

const routes = [
  {
    path: '/',
    redirect: '/main/customer'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/index.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/main',
    name: 'Main',
    component: () => import('@/pages/main/index.vue'),
    meta: { title: '首页', requiresAuth: true },
    children: [
      {
        path: 'customer',
        name: 'Customer',
        component: () => import('@/pages/customer/index.vue'),
        meta: { title: '客户', requiresAuth: true }
      },
      {
        path: 'order',
        name: 'Order',
        component: () => import('@/pages/order/index.vue'),
        meta: { title: '订单', requiresAuth: true }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/pages/statistics/index.vue'),
        meta: { title: '统计', requiresAuth: true }
      },
      {
        path: 'mine',
        name: 'Mine',
        component: () => import('@/pages/mine/index.vue'),
        meta: { title: '我的', requiresAuth: true }
      }
    ]
  },
  {
    path: '/order/detail/:id',
    name: 'OrderDetail',
    component: () => import('@/pages/order/detail.vue'),
    meta: { title: '订单详情', requiresAuth: true }
  },
  {
    path: '/order/create',
    name: 'OrderCreate',
    component: () => import('@/pages/order/create.vue'),
    meta: { title: '创建订单', requiresAuth: true }
  },
  {
    path: '/order/payment/:id',
    name: 'OrderPayment',
    component: () => import('@/pages/order/payment.vue'),
    meta: { title: '订单收款', requiresAuth: true }
  },
  {
    path: '/customer/detail/:id',
    name: 'CustomerDetail',
    component: () => import('@/pages/customer/detail.vue'),
    meta: { title: '客户详情', requiresAuth: true }
  },
  {
    path: '/test-popup',
    name: 'TestPopup',
    component: () => import('@/pages/test-popup.vue'),
    meta: { title: '弹窗测试', requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 记录路由切换开始时间
  to.meta._startTime = Date.now()
  
  document.title = to.meta.title || 'ERP移动端'
  
  const token = localStorage.getItem('mobile_erp_token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

// 监控页面加载性能
router.afterEach((to, from) => {
  // 计算路由切换时间
  const loadTime = Date.now() - (to.meta._startTime || 0)
  
  // 如果加载时间超过3秒，记录为性能问题
  if (loadTime > 3000) {
    errorLogger.capturePerformance('PageLoad', loadTime, 3000)
  }
  
  // 在下一个tick检测Navigation Timing API
  setTimeout(() => {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart
      
      if (pageLoadTime > 0 && pageLoadTime > 5000) {
        errorLogger.capturePerformance('FullPageLoad', pageLoadTime, 5000)
      }
    }
  }, 0)
})

export default router
