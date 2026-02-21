# ERP系统日志监测与UI验证使用指南

## 📋 目录
1. [快速开始](#快速开始)
2. [日志监控](#日志监控)
3. [UI验证](#ui验证)
4. [开发流程](#开发流程)
5. [故障排查](#故障排查)

---

## 🚀 快速开始

### 1. 启动日志监控
```bash
# 方法1：直接运行（前台）
cd /root/ajkuaiji
./scripts/monitor_logs.sh

# 方法2：后台运行
nohup ./scripts/monitor_logs.sh > /tmp/monitor.log 2>&1 &

# 方法3：使用screen（推荐）
screen -S log-monitor
./scripts/monitor_logs.sh
# 按 Ctrl+A, D 分离会话
# screen -r log-monitor 重新连接
```

### 2. UI可视化验证
在浏览器控制台执行：
```javascript
// 方法1：手动验证
uiValidator.validateLogisticsModule()

// 方法2：自动验证（每30秒）
uiValidator.autoValidate(30000)

// 方法3：检查单个元素
uiValidator.checkElement('#logisticsAccountModal', '物流账号模态框')
```

---

## 📊 日志监控

### 监控内容
- ✅ API错误（500/400/403/404）
- ✅ Python异常（Exception/Traceback）
- ✅ 前端错误（Error/undefined/null）
- ✅ 系统级错误（CRITICAL）
- ⚠️ 警告信息（WARNING）

### 日志文件位置
```
/var/log/ajkuaiji-api.log          # Flask API日志
/var/log/ajkuaiji/frontend.log     # 前端操作日志
/var/log/ajkuaiji_error.log        # 系统错误日志
```

### 查看历史日志
```bash
# 查看最近100行API日志
tail -n 100 /var/log/ajkuaiji-api.log

# 查看含有ERROR的日志
grep -i "error" /var/log/ajkuaiji-api.log | tail -20

# 查看特定时间段的日志
journalctl -u ajkuaiji --since "1 hour ago"

# 实时查看日志（不过滤）
tail -f /var/log/ajkuaiji-api.log
```

---

## 🔍 UI验证

### 验证报告解读

**输出示例**：
```
🔍 物流模块UI验证报告
📋 验证页面...
✅ logisticsAccountsPage: 正常显示
⚠️ logisticsOrdersPage: 当前隐藏
❌ logisticsConfigPage: 不存在

🔘 验证按钮...
✅ 新增账号: 正常
❌ 授权: 不存在 (#authButton)

📈 验证总结:
总检查项: 25
错误数: 3
警告数: 5
```

### 验证配置文件
编辑 `/root/ajkuaiji/scripts/ui_validation.js` 中的 `UI_VALIDATION_CONFIG` 对象添加新的验证项：

```javascript
const UI_VALIDATION_CONFIG = {
    logistics: {
        pages: ['logisticsAccountsPage'],
        buttons: {
            '新增账号': 'button:contains("新增账号")'
        }
    }
};
```

---

## 🛠️ 开发流程（必须遵循）

### 标准开发流程

#### **Phase 1: 代码开发**
1. 修改代码（HTML/JS/Python）
2. 检查重复定义
   ```bash
   grep -n "window.openAddLogisticsAccountModal" modules/logistics_tenant.js
   ```

#### **Phase 2: 启动监控**
```bash
# 新开终端窗口
cd /root/ajkuaiji
./scripts/monitor_logs.sh
```

#### **Phase 3: 清除缓存**
- 浏览器按 `Ctrl + Shift + Delete`
- 勾选"缓存的图片和文件"
- 点击"清除数据"

#### **Phase 4: 强制刷新**
- 按 `Ctrl + F5` (Windows)
- 或 `Cmd + Shift + R` (Mac)

#### **Phase 5: UI验证**
打开浏览器控制台（F12），执行：
```javascript
uiValidator.validateLogisticsModule()
```

检查输出：
- ❌ 错误数 > 0 → **必须修复**
- ⚠️ 警告数 > 3 → **建议检查**
- ✅ 全部正常 → **可以测试**

#### **Phase 6: 截图验证**
- 截取关键界面
- 对比HTML代码与实际显示
- 确认字段顺序、按钮文本、样式一致

#### **Phase 7: 功能测试**
- 测试核心功能（新增/编辑/删除）
- 观察日志监控输出
- 验证API请求和响应

---

## 🐛 故障排查

### 问题1：界面与代码不一致

**症状**：截图显示旧版本界面

**排查步骤**：
```bash
# 1. 检查是否有重复定义
cd /root/ajkuaiji
grep -rn "openAddLogisticsAccountModal" modules/

# 2. 检查HTML模态框是否存在
grep -n "logisticsAccountModal" financial_system.html

# 3. 检查浏览器缓存
# 打开控制台 → Application → Clear storage → Clear site data

# 4. 检查文件修改时间
stat modules/logistics_tenant.js
```

**解决方案**：
1. 删除重复的函数定义
2. 清除浏览器缓存
3. 强制刷新页面（Ctrl+F5）

---

### 问题2：点击按钮无反应

**症状**：点击按钮后没有任何响应

**排查步骤**：
```javascript
// 1. 在控制台检查元素是否存在
document.querySelector('#logisticsAccountModal')

// 2. 检查函数是否定义
typeof openAddLogisticsAccountModal

// 3. 检查是否有JS错误
// 查看控制台 Console 标签页

// 4. 检查事件绑定
$('#addButton').data('events')  // jQuery
```

**解决方案**：
1. 确认元素ID正确
2. 检查函数已导出到window对象
3. 查看控制台错误信息并修复

---

### 问题3：API请求失败

**症状**：前端请求返回400/500错误

**排查步骤**：
```bash
# 1. 查看API日志
tail -n 50 /var/log/ajkuaiji-api.log | grep -E "POST|400|500"

# 2. 检查后端路由是否注册
grep -rn "@.*route.*logistics_accounts" backend/

# 3. 检查字段映射
# 前端发送的字段 vs 后端接收的字段

# 4. 测试API接口
curl -X POST http://localhost:5000/api/tenant/logistics_accounts \
  -H "Content-Type: application/json" \
  -d '{"cp_code":"TEST","cp_name":"测试"}'
```

**解决方案**：
1. 修正前后端字段不一致
2. 确认必填字段已传递
3. 检查后端Blueprint是否注册

---

## 📈 监控数据分析

### 正常指标
- API响应时间 < 500ms
- 前端错误率 < 1%
- 每秒请求数 < 100

### 异常指标（需关注）
- ❌ 出现大量500错误
- ❌ 频繁的undefined/null错误
- ❌ 请求超时（>5s）
- ⚠️ 重复的警告信息

### 告警阈值
```bash
# 1分钟内出现10次以上相同错误
tail -n 1000 /var/log/ajkuaiji-api.log | grep -c "某个错误" 

# 如果返回 >= 10，说明异常
```

---

## 🔧 维护建议

### 每日检查
- [ ] 查看日志监控输出
- [ ] 运行UI验证脚本
- [ ] 检查错误数和警告数

### 每周清理
```bash
# 清理旧日志（保留最近7天）
find /var/log/ajkuaiji* -mtime +7 -delete

# 压缩历史日志
gzip /var/log/ajkuaiji-api.log.1
```

### 性能优化
- 监控脚本资源占用 < 5% CPU
- 日志文件大小 < 100MB
- UI验证执行时间 < 2秒

---

## 📞 常见命令速查

```bash
# 启动日志监控
./scripts/monitor_logs.sh

# 停止监控（如在后台运行）
pkill -f monitor_logs.sh

# 查看进程
ps aux | grep monitor_logs

# 查看实时日志
tail -f /var/log/ajkuaiji-api.log

# 搜索特定错误
grep -i "logistics" /var/log/ajkuaiji-api.log | tail -20

# UI验证（浏览器控制台）
uiValidator.validateLogisticsModule()
uiValidator.autoValidate(30000)
```

---

## ✅ 最佳实践总结

1. **开发前**：启动日志监控
2. **开发中**：实时观察日志输出
3. **开发后**：运行UI验证
4. **测试前**：清除缓存 + 强制刷新
5. **测试中**：截图验证UI一致性
6. **测试后**：检查日志无错误
7. **上线前**：完整回归测试

---

## 📝 问题反馈

如发现监控脚本问题或需要添加新的验证项，请：
1. 记录问题现象和日志输出
2. 保存错误截图
3. 提供复现步骤
