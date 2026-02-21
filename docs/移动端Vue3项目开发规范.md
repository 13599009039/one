# 移动端Vue3独立项目开发规范

> **文档版本**: v1.0  
> **创建日期**: 2026-02-19  
> **适用范围**: 移动端独立Vue3项目 (mobile-erp)  
> **维护人**: 开发团队  
> **重要性**: 🔴 强制执行

---

## 一、架构设计规范

### 1.1 项目定位

**独立Vue3项目，与PC端完全解耦**

- ✅ **独立代码库**: `/root/mobile-erp` 独立目录
- ✅ **独立技术栈**: Vue3 + Vant + Vite
- ✅ **独立API**: `/api/mobile/*` 专用前缀
- ✅ **独立域名**: `m.erp.xnamb.cn`
- ✅ **独立部署**: 独立构建、独立Nginx配置

### 1.2 技术栈标准

| 技术 | 版本 | 用途 | 必选/可选 |
|-----|------|------|----------|
| Vue | 3.3.0+ | 核心框架 | ✅ 必选 |
| Vant | 4.6.0+ | UI组件库 | ✅ 必选 |
| Vite | 4.4.0+ | 构建工具 | ✅ 必选 |
| Vue Router | 4.2.0+ | 路由管理 | ✅ 必选 |
| Axios | 1.6.0+ | HTTP客户端 | ✅ 必选 |
| ECharts | 5.4.3+ | 数据可视化 | ⚠️ 可选 |
| Pinia | - | 状态管理 | ⚠️ 暂不使用 |

### 1.3 项目结构规范

```
mobile-erp/
├── src/
│   ├── api/              # API接口封装（按模块划分）
│   │   ├── auth.js       # 认证API
│   │   ├── customer.js   # 客户API
│   │   ├── order.js      # 订单API
│   │   └── statistics.js # 统计API
│   ├── components/       # 公共组件
│   │   ├── EmptyState.vue
│   │   ├── LoadingMore.vue
│   │   └── StatusTag.vue
│   ├── pages/            # 页面组件（按模块划分）
│   │   ├── login/        # 登录模块
│   │   ├── main/         # 主框架模块
│   │   ├── customer/     # 客户模块
│   │   ├── order/        # 订单模块
│   │   ├── statistics/   # 统计模块
│   │   └── mine/         # 我的模块
│   ├── router/           # 路由配置
│   │   └── index.js
│   ├── styles/           # 样式文件
│   │   ├── variable.less # 变量定义
│   │   └── common.less   # 公共样式
│   ├── utils/            # 工具函数
│   │   ├── request.js    # HTTP请求封装
│   │   └── storage.js    # 本地存储封装
│   ├── plugins/          # 插件配置
│   ├── App.vue           # 根组件
│   └── main.js           # 入口文件
├── public/               # 静态资源
│   ├── favicon.ico
│   └── favicon.svg
├── dist/                 # 构建产物
├── vite.config.js        # Vite配置
├── package.json          # 依赖配置
├── .eslintrc.js          # ESLint配置
└── README.md             # 项目说明
```

---

## 二、Vue3开发规范

### 2.1 Composition API规范 ✅

**强制使用 `<script setup>` 语法糖**

```vue
<template>
  <div class="page">
    <!-- 页面内容 -->
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// 响应式数据
const loading = ref(false)
const formData = reactive({
  username: '',
  password: ''
})

// 计算属性
const isFormValid = computed(() => {
  return formData.username && formData.password
})

// 方法
const handleSubmit = () => {
  // 提交逻辑
}

// 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<style scoped>
.page {
  /* 样式 */
}
</style>
```

### 2.2 组件命名规范

**文件命名**: PascalCase (大驼峰)
```
EmptyState.vue       ✅ 正确
LoadingMore.vue      ✅ 正确
empty-state.vue      ❌ 错误
emptystate.vue       ❌ 错误
```

**组件引用**: PascalCase
```vue
<script setup>
import EmptyState from '@/components/EmptyState.vue'
</script>

<template>
  <EmptyState />   <!-- ✅ 正确 -->
  <empty-state />  <!-- ❌ 错误 -->
</template>
```

### 2.3 Props定义规范

```vue
<script setup>
import { defineProps } from 'vue'

// ✅ 推荐：完整的Props定义
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'pending',
    validator: (value) => ['pending', 'success', 'error'].includes(value)
  },
  count: {
    type: Number,
    default: 0
  }
})
</script>
```

### 2.4 Emits定义规范

```vue
<script setup>
import { defineEmits } from 'vue'

// ✅ 推荐：声明式Emits
const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const handleClick = () => {
  emit('submit', { id: 123 })
}
</script>
```

---

## 三、Vant组件使用规范

### 3.1 按需引入组件 ✅

```javascript
// ✅ 推荐：按需引入
import { Button, Toast, Dialog } from 'vant'

// ❌ 不推荐：全局引入
import Vant from 'vant'
```

### 3.2 常用组件规范

#### 导航栏 (van-nav-bar)
```vue
<van-nav-bar 
  title="订单详情" 
  left-arrow 
  @click-left="goBack"
/>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const goBack = () => router.back()
</script>
```

#### 列表 (van-list)
```vue
<van-list
  v-model:loading="loading"
  :finished="finished"
  finished-text="没有更多了"
  @load="onLoad"
>
  <div v-for="item in list" :key="item.id">
    <!-- 列表项内容 -->
  </div>
</van-list>

<script setup>
import { ref } from 'vue'

const list = ref([])
const loading = ref(false)
const finished = ref(false)

const onLoad = async () => {
  // 加载数据
  const data = await fetchData()
  list.value = [...list.value, ...data]
  loading.value = false
  if (data.length === 0) finished.value = true
}
</script>
```

#### 下拉刷新 (van-pull-refresh)
```vue
<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
  <!-- 内容 -->
</van-pull-refresh>

<script setup>
import { ref } from 'vue'

const refreshing = ref(false)

const onRefresh = async () => {
  // 刷新数据
  await fetchData()
  refreshing.value = false
}
</script>
```

---

## 四、API开发规范

### 4.1 移动端API前缀规范 ✅

**统一前缀**: `/api/mobile/*`

```
POST   /api/mobile/auth/login          # 移动端登录
POST   /api/mobile/auth/logout         # 移动端退出
GET    /api/mobile/customers            # 客户列表
GET    /api/mobile/customers/:id        # 客户详情
GET    /api/mobile/orders               # 订单列表
GET    /api/mobile/orders/:id           # 订单详情
GET    /api/mobile/statistics/overview  # 统计概览
GET    /api/mobile/statistics/ranking   # 排行榜
```

### 4.2 API封装规范 ✅

**目录结构**: `/src/api/`

```javascript
// src/api/customer.js
import request from '@/utils/request'

/**
 * 获取客户列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.keyword - 搜索关键词
 * @returns {Promise} 客户列表数据
 */
export function getCustomerList(params) {
  return request({
    url: '/api/mobile/customers',
    method: 'GET',
    params
  })
}

/**
 * 获取客户详情
 * @param {number} id - 客户ID
 * @returns {Promise} 客户详情数据
 */
export function getCustomerDetail(id) {
  return request({
    url: `/api/mobile/customers/${id}`,
    method: 'GET'
  })
}
```

### 4.3 HTTP请求封装规范 ✅

**文件**: `/src/utils/request.js`

```javascript
import axios from 'axios'
import { Toast } from 'vant'
import router from '@/router'

const request = axios.create({
  baseURL: '',
  timeout: 30000
})

// 请求拦截器 - 自动添加Token
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('mobile_erp_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理
request.interceptors.response.use(
  response => {
    const res = response.data
    
    // 业务逻辑成功
    if (res.success) {
      return res.data
    }
    
    // 业务逻辑失败
    Toast.fail(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  error => {
    console.error('[Request Error]', error)
    
    // Token过期，跳转登录
    if (error.response?.status === 401) {
      localStorage.removeItem('mobile_erp_token')
      router.replace('/login')
      Toast.fail('登录已过期，请重新登录')
      return Promise.reject(error)
    }
    
    // 网络错误
    Toast.fail(error.message || '网络请求失败')
    return Promise.reject(error)
  }
)

export default request
```

---

## 五、路由配置规范

### 5.1 路由结构规范 ✅

**文件**: `/src/router/index.js`

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/index.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/main',
    name: 'Main',
    component: () => import('@/pages/main/index.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'customer',
        name: 'Customer',
        component: () => import('@/pages/customer/index.vue')
      },
      {
        path: 'order',
        name: 'Order',
        component: () => import('@/pages/order/index.vue')
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/pages/statistics/index.vue')
      },
      {
        path: 'mine',
        name: 'Mine',
        component: () => import('@/pages/mine/index.vue')
      }
    ]
  },
  {
    path: '/customer/detail/:id',
    name: 'CustomerDetail',
    component: () => import('@/pages/customer/detail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/order/detail/:id',
    name: 'OrderDetail',
    component: () => import('@/pages/order/detail.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 登录验证
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('mobile_erp_token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/main/customer')
  } else {
    next()
  }
})

export default router
```

### 5.2 路由命名规范

- ✅ **name**: PascalCase (大驼峰)
- ✅ **path**: kebab-case (短横线)

```javascript
{
  path: '/customer/detail/:id',  // ✅ 路径用短横线
  name: 'CustomerDetail',        // ✅ 名称用大驼峰
  component: () => import('@/pages/customer/detail.vue')
}
```

---

## 六、状态管理规范

### 6.1 LocalStorage存储规范 ✅

**命名前缀**: `mobile_erp_`

```javascript
// ✅ 推荐：带前缀的Key
localStorage.setItem('mobile_erp_token', token)
localStorage.setItem('mobile_erp_tenant_id', tenantId)
localStorage.setItem('mobile_erp_user', JSON.stringify(user))

// ❌ 不推荐：无前缀的Key
localStorage.setItem('token', token)
localStorage.setItem('user', JSON.stringify(user))
```

### 6.2 Token管理规范

**Token生命周期**: 30天

```javascript
// 登录成功保存Token
localStorage.setItem('mobile_erp_token', res.token)
localStorage.setItem('mobile_erp_tenant_id', res.tenant.id)
localStorage.setItem('mobile_erp_user', JSON.stringify(res.user))
localStorage.setItem('mobile_erp_tenant', JSON.stringify(res.tenant))

// 退出登录清除Token
localStorage.removeItem('mobile_erp_token')
localStorage.removeItem('mobile_erp_tenant_id')
localStorage.removeItem('mobile_erp_user')
localStorage.removeItem('mobile_erp_tenant', JSON.stringify(res.tenant))

// 清除缓存（保留登录信息）
const handleClearCache = () => {
  const token = localStorage.getItem('mobile_erp_token')
  const tenantId = localStorage.getItem('mobile_erp_tenant_id')
  const user = localStorage.getItem('mobile_erp_user')
  const tenant = localStorage.getItem('mobile_erp_tenant')
  
  localStorage.clear()
  
  if (token) localStorage.setItem('mobile_erp_token', token)
  if (tenantId) localStorage.setItem('mobile_erp_tenant_id', tenantId)
  if (user) localStorage.setItem('mobile_erp_user', user)
  if (tenant) localStorage.setItem('mobile_erp_tenant', tenant)
}
```

---

## 七、样式开发规范

### 7.1 CSS Scoped规范 ✅

**所有组件样式必须使用scoped**

```vue
<style scoped>
.page {
  padding: 16px;
  background: #f5f5f5;
}
</style>
```

### 7.2 变量定义规范

**文件**: `/src/styles/variable.less`

```less
// 主题色
@primary-color: #9333ea;     // 紫色主题
@success-color: #10b981;     // 成功色
@warning-color: #f59e0b;     // 警告色
@danger-color: #ef4444;      // 危险色

// 文字颜色
@text-primary: #1f2937;      // 主要文字
@text-secondary: #6b7280;    // 次要文字
@text-placeholder: #9ca3af;  // 占位文字

// 背景色
@bg-page: #f5f5f5;           // 页面背景
@bg-card: #ffffff;           // 卡片背景

// 间距
@spacing-xs: 4px;
@spacing-sm: 8px;
@spacing-md: 16px;
@spacing-lg: 24px;
@spacing-xl: 32px;
```

### 7.3 卡片化布局规范

**移动端列表卡片**:

```vue
<style scoped>
.card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.card-body {
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
}
</style>
```

---

## 八、部署配置规范

### 8.1 Vite配置规范 ✅

**文件**: `/root/mobile-erp/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  server: {
    port: 8090,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8050',
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'vant-vendor': ['vant'],
          'echarts-vendor': ['echarts']
        }
      }
    }
  }
})
```

### 8.2 Nginx配置规范 ✅

**文件**: `/etc/nginx/sites-available/m.erp.xnamb.cn`

```nginx
server {
    listen 80;
    server_name m.erp.xnamb.cn;

    # 日志配置
    access_log /var/log/nginx/m.erp.xnamb.cn.access.log;
    error_log /var/log/nginx/m.erp.xnamb.cn.error.log;

    # Vue3构建产物
    root /root/mobile-erp/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1k;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript 
               application/xml+rss application/rss+xml 
               font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    # Vue路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API反向代理到Flask
    location /api/ {
        proxy_pass http://127.0.0.1:8050/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
```

### 8.3 构建部署流程 ✅

```bash
# 1. 安装依赖
cd /root/mobile-erp
npm install

# 2. 构建生产版本
npm run build

# 3. 配置Nginx
cp /tmp/m.erp.xnamb.cn.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/m.erp.xnamb.cn /etc/nginx/sites-enabled/

# 4. 设置文件权限
chmod 755 /root
chmod -R 755 /root/mobile-erp/dist

# 5. 测试Nginx配置
nginx -t

# 6. 重载Nginx
systemctl reload nginx

# 7. 验证访问
curl -I http://m.erp.xnamb.cn
```

---

## 九、后端API开发规范

### 9.1 移动端API模块化 ✅

**Blueprint规范**:

```python
# mobile_customer_api.py
from flask import Blueprint, request
from functools import wraps

mobile_customer_bp = Blueprint('mobile_customer', __name__, 
                                url_prefix='/api/mobile/customers')

@mobile_customer_bp.route('', methods=['GET'])
@require_mobile_auth
def mobile_get_customer_list(current_user_id, current_tenant_id, current_username):
    """
    获取客户列表（移动端优化）
    
    Query参数:
    - page: 页码，默认1
    - page_size: 每页数量，默认20，最大100
    - keyword: 搜索关键词（可选）
    
    响应:
    {
      "success": true,
      "data": {
        "list": [...],
        "total": 100,
        "page": 1,
        "page_size": 20
      }
    }
    """
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 20)), 100)
    keyword = request.args.get('keyword', '').strip()
    
    # 查询逻辑...
    return response_success(data={'list': customers, 'total': total})
```

### 9.2 Token认证中间件 ✅

```python
import jwt
import time
from functools import wraps
from flask import request

JWT_SECRET = 'your-secret-key'

def require_mobile_auth(f):
    """
    移动端API认证装饰器
    
    功能:
    1. 验证Authorization Header
    2. 解析JWT Token
    3. 验证Token有效期
    4. 注入用户信息到函数参数
    
    注入参数:
    - current_user_id: 当前用户ID
    - current_tenant_id: 当前租户ID
    - current_username: 当前用户名
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. 验证Authorization Header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return response_error('UNAUTHORIZED', '未提供有效的Token')
        
        # 2. 解析JWT Token
        try:
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return response_error('TOKEN_EXPIRED', 'Token已过期')
        except jwt.InvalidTokenError:
            return response_error('INVALID_TOKEN', '无效的Token')
        
        # 3. 验证Token有效期
        if payload['exp'] < time.time():
            return response_error('TOKEN_EXPIRED', 'Token已过期')
        
        # 4. 注入用户信息
        kwargs['current_user_id'] = payload['user_id']
        kwargs['current_tenant_id'] = payload['tenant_id']
        kwargs['current_username'] = payload['username']
        
        return f(*args, **kwargs)
    return decorated_function
```

### 9.3 租户隔离规范 ✅

**所有查询SQL必须包含租户隔离条件**:

```python
# ✅ 正确：包含租户隔离
cursor.execute("""
    SELECT * FROM customers
    WHERE company_id = %s
    AND name LIKE %s
    ORDER BY id DESC
    LIMIT %s OFFSET %s
""", (current_tenant_id, f'%{keyword}%', page_size, offset))

# ❌ 错误：缺少租户隔离
cursor.execute("""
    SELECT * FROM customers
    WHERE name LIKE %s
    ORDER BY id DESC
""", (f'%{keyword}%',))
```

### 9.4 数据精简优化 ✅

**移动端API返回精简字段，减少流量消耗**:

```python
# ✅ 移动端：精简字段
cursor.execute("""
    SELECT 
        c.id, c.name, c.contact_person, c.phone,
        COUNT(o.id) as order_count,
        SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END) as total_amount
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    WHERE c.company_id = %s
    GROUP BY c.id
""")

# ❌ PC端：完整字段（不适合移动端）
cursor.execute("""
    SELECT c.*, u.username as created_by_name, ...
    FROM customers c
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.company_id = %s
""")
```

---

## 十、测试规范

### 10.1 联调测试计划

**测试范围**: 所有移动端功能模块

#### 测试1: 登录流程
- [ ] 输入正确用户名密码登录成功
- [ ] 输入错误密码登录失败提示
- [ ] 记住密码功能正常
- [ ] Token自动保存
- [ ] 登录后跳转主页

#### 测试2: 客户模块
- [ ] 客户列表分页加载正常
- [ ] 下拉刷新功能正常
- [ ] 搜索功能正常
- [ ] 点击进入客户详情
- [ ] 客户详情信息展示完整
- [ ] 客户最近订单列表正常

#### 测试3: 订单模块
- [ ] 订单列表分页加载正常
- [ ] Tab状态筛选正常
- [ ] 下拉刷新功能正常
- [ ] 状态标签颜色正确
- [ ] 点击进入订单详情
- [ ] 订单详情信息展示完整
- [ ] 订单项列表展示正常

#### 测试4: 统计模块
- [ ] 数据概览卡片数据正确
- [ ] 排行榜切换正常
- [ ] 勋章效果显示正确
- [ ] 下拉刷新数据更新

#### 测试5: 我的页面
- [ ] 用户信息展示正确
- [ ] 清除缓存功能正常
- [ ] 关于我们弹窗正常
- [ ] 退出登录功能正常

#### 测试6: 跨页面导航
- [ ] 底部Tab切换正常
- [ ] 页面路由跳转正常
- [ ] 返回按钮功能正常
- [ ] 路由守卫验证正常

#### 测试7: API测试
- [ ] Token认证正常
- [ ] 租户隔离正常
- [ ] 错误处理正常
- [ ] 响应时间合理

#### 测试8: 性能测试
- [ ] 首屏加载速度 <3s
- [ ] 列表滚动流畅
- [ ] 页面切换流畅
- [ ] 静态资源缓存正常

---

## 十一、开发工作流

### 11.1 本地开发流程

```bash
# 1. 启动开发服务器
cd /root/mobile-erp
npm run dev

# 2. 访问开发环境
http://localhost:8090

# 3. 代码修改自动热更新
# Vite HMR自动刷新页面
```

### 11.2 Git工作流

```bash
# 1. 创建功能分支
git checkout -b feature/customer-detail

# 2. 开发完成后提交
git add .
git commit -m "feat: 完成客户详情页开发"

# 3. 推送到远程
git push origin feature/customer-detail

# 4. 合并到主分支
git checkout main
git merge feature/customer-detail
```

### 11.3 版本发布流程

```bash
# 1. 更新版本号
# package.json: "version": "1.1.0"

# 2. 构建生产版本
npm run build

# 3. 部署到服务器
# 按照8.3构建部署流程执行

# 4. 打Tag
git tag mobile-v1.1.0
git push origin mobile-v1.1.0
```

---

## 十二、常见问题FAQ

### Q1: 为什么选择独立Vue3项目而不是PC端响应式？

**A**: 
1. **技术栈解耦**: 移动端使用Vue3+Vant，PC端使用原生JS+Tailwind
2. **版本独立**: 移动端和PC端可以独立迭代，互不影响
3. **性能优化**: 移动端专用API，数据精简，加载更快
4. **代码可维护**: 代码结构清晰，易于维护和扩展

### Q2: 移动端API为什么使用 `/api/mobile/*` 前缀？

**A**:
1. **清晰区分**: 明确区分PC端API和移动端API
2. **独立优化**: 移动端API可以单独优化（数据精简、字段裁剪）
3. **权限隔离**: 移动端API使用JWT Token，PC端使用Session
4. **监控统计**: 便于单独监控移动端API性能

### Q3: 为什么不使用Pinia状态管理？

**A**:
当前阶段状态简单，使用localStorage + ref/reactive已足够。未来若状态复杂，再引入Pinia。

### Q4: 移动端支持哪些浏览器？

**A**:
- iOS Safari 12+
- Android Chrome 80+
- 微信内置浏览器
- 其他现代移动浏览器

### Q5: 如何调试移动端页面？

**A**:
1. Chrome DevTools 移动端模拟器
2. 真机调试 (Charles/Fiddler抓包)
3. vConsole 前端日志插件

---

**文档结束**

如有疑问，请联系开发团队。
