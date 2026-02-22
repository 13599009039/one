# 错误日志收集器使用示例

## 自动捕获

错误日志收集器会自动捕获以下类型的错误：

1. **Vue组件错误** - 通过 `app.config.errorHandler` 自动捕获
2. **API请求错误** - 通过 Axios interceptor 自动捕获
3. **全局JS错误** - 通过 `window.onerror` 自动捕获
4. **未处理的Promise错误** - 通过 `window.onunhandledrejection` 自动捕获
5. **页面加载性能问题** - 通过路由守卫自动监控

## 手动记录错误

在某些业务场景中，你可能需要手动记录错误或警告信息：

```javascript
import errorLogger from '@/utils/errorLogger'

// 记录一般错误
errorLogger.logError('用户操作失败：删除订单时发生错误', 'error')

// 记录警告
errorLogger.logError('用户尝试访问无权限的功能', 'warning')

// 记录带额外数据的错误
errorLogger.logError('数据格式错误', 'error', {
  performance: {
    dataSize: 1024,
    parseTime: 350
  }
})
```

## 在登录后更新用户信息

登录成功后，需要更新错误日志收集器的用户信息：

```javascript
import errorLogger from '@/utils/errorLogger'

// 登录成功后
localStorage.setItem('mobile_erp_tenant_id', res.tenant.id)
localStorage.setItem('mobile_erp_user_id', res.user.id)

// 更新日志收集器
errorLogger.updateUserInfo()
```

## 监控自定义性能指标

```javascript
import errorLogger from '@/utils/errorLogger'

// 监控某个操作的性能
const startTime = Date.now()

try {
  // 执行复杂操作
  await complexOperation()
  
  const duration = Date.now() - startTime
  
  // 如果超过2秒，记录为性能问题
  errorLogger.capturePerformance('ComplexOperation', duration, 2000)
} catch (error) {
  // 错误会被自动捕获
  throw error
}
```

## 临时禁用日志收集

在某些场景（如测试环境）可能需要临时禁用日志收集：

```javascript
import errorLogger from '@/utils/errorLogger'

// 禁用
errorLogger.isEnabled = false

// 启用
errorLogger.isEnabled = true
```

## 错误类型说明

日志系统记录的错误类型包括：

- `vue_error` - Vue组件错误
- `api_error` - API请求错误
- `js_error` - JavaScript错误
- `performance` - 性能问题
- `manual` - 手动记录的错误

## 错误级别说明

- `error` - 错误级别（默认）
- `warning` - 警告级别
- `info` - 信息级别

## 查看日志

日志会自动上报到后端 `/api/mobile/logs/error` 接口，可以在PC端控制台的"移动端日志"菜单中查看。
