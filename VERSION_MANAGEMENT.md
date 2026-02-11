# 财务管理系统 - 前端版本管理规范

## 📋 当前版本

**v11.0** (2026-02-09)
- 修复: database.js从2.5MB精简到44KB
- 清理: 移除所有海量模拟数据,只保留必要示例
- 统一: 所有JS模块版本号统一为v11.0

---

## 🔧 版本号管理规范(强制执行)

### 1. 统一版本原则
- ✅ **所有JS模块必须使用相同版本号**
- ❌ 禁止不同模块使用不同版本号

### 2. 版本号格式
- 格式: `v{major}.0`
- 示例: `v11.0`, `v12.0`, `v13.0`
- major为整数,每次全局更新递增1

### 3. 更新流程(每次修改JS文件后必须执行)

**步骤1: 确定新版本号**
```bash
# 当前版本 v11.0 → 下一版本 v12.0
```

**步骤2: 批量更新HTML中的版本号**
```bash
# 在 /root/ajkuaiji/financial_system.html 中
# 将所有 ?v=11.0 替换为 ?v=12.0
```

**步骤3: 更新版本说明注释**
```html
<!-- JS模块 - 统一版本v12.0 (2026-XX-XX 本次修复内容) -->
```

**步骤4: 重载Nginx**
```bash
sudo systemctl reload nginx
```

### 4. HTML中的标准格式

```html
<!-- 加载模块化的JavaScript文件 -->
<!-- JS模块 - 统一版本v11.0 (2026-02-09 修复database.js过大问题) -->
<script src="modules/api.js?v=11.0"></script>
<script src="modules/database.js?v=11.0"></script>
<script src="modules/login.js?v=11.0"></script>
<script src="modules/navigation.js?v=11.0"></script>
<script src="modules/dashboard.js?v=11.0"></script>
<script src="modules/transactions.js?v=11.0"></script>
<script src="modules/categories.js?v=11.0"></script>
<script src="modules/settings.js?v=11.0"></script>
<script src="modules/reports.js?v=11.0"></script>
<script src="modules/customers.js?v=11.0"></script>
<script src="modules/orders.js?v=11.0"></script>
<script src="modules/services.js?v=11.0"></script>
<script src="modules/inventory.js?v=11.0"></script>
<script src="modules/organization.js?v=11.0"></script>
<script src="modules/taskpool.js?v=11.0"></script>
<script src="modules/core.js?v=11.0"></script>
```

---

## 📝 版本更新历史

### v11.0 (2026-02-09)
**修复内容:**
- database.js文件从2.5MB精简到44KB(压缩98.3%)
- 清理getDefaultData()中的海量模拟数据
- customers数组: 0条(已对接API)
- users数组: 0条(已对接API)
- transactions数组: 1条示例
- 修复transactions.js语法错误(括号不匹配)
- 统一所有模块版本号为v11.0

**影响范围:**
- 所有前端JS模块
- 解决页面加载卡死/转圈问题
- 解决"db is not defined"错误

### v10.0 及之前
版本号混乱,不同模块使用v5.0~v17.0不等

---

## ⚠️ 常见问题

### Q1: 为什么要统一版本号?
**A:** 避免浏览器缓存混乱,确保所有模块同步更新

### Q2: 修改单个JS文件后是否需要更新所有版本号?
**A:** 是的,必须统一更新所有模块版本号,即使只修改了一个文件

### Q3: 如何验证版本号已生效?
**A:** 
1. 访问页面并强制刷新(Ctrl+Shift+R)
2. F12 → Network → 查看JS文件请求URL是否包含新版本号
3. 检查Console是否还有缓存相关错误

---

## 🔍 问题排查

如果页面出现以下错误:
- `Unexpected token '<', "<html>"`
- `Failed to load resource: 404`
- `is not valid JSON`

**解决方案:**
1. 检查HTML中所有`?v=`版本号是否一致
2. 递增版本号(如v11.0→v12.0)
3. 强制刷新浏览器(Ctrl+Shift+R)
4. 重载Nginx: `sudo systemctl reload nginx`
