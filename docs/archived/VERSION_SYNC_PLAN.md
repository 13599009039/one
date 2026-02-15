# 企业资源计划管理系统 - 版本同步与长期维护计划

**创建时间**: 2026-02-12  
**状态**: 执行中 ✅  
**目标**: 彻底解决版本不一致问题，建立长期维护机制

---

## 🚨 **问题分析**

### **当前问题**
1. ✅ **创建新订单报错** - `Unknown column 'company_id' in 'field list'`（已修复）
2. ✅ **登记收款无反应** - 前端调用本地数据库，未调用后端API（已修复）
3. ⚠️ **JS版本号不一致** - 最低v1.0，最高v23.19，跨度22个版本
4. ⚠️ **API字段不一致** - add_order/update_order字段差异导致频繁报错
5. ⚠️ **无版本管理机制** - 缺少统一版本号，修改时容易遗漏

---

## 📊 **当前版本审计报告**

### **JS模块版本分布（2026-02-12）**

| 文件 | 当前版本 | 最后修改内容 | 状态 |
|------|---------|------------|------|
| api.js | v17.8 | API封装函数 | ⚠️ 需审计 |
| utils.js | v20.1 | 统一错误处理工具函数 | ✅ 较新 |
| database.js | v17.5 | 已废弃（仅保留兼容） | ⚠️ 待清理 |
| login.js | v17.5 | 登录逻辑 | ⚠️ 需审计 |
| user-menu.js | v17.5 | 用户菜单 | ⚠️ 需审计 |
| navigation.js | v17.9 | 导航菜单 | ⚠️ 需审计 |
| dashboard.js | v17.5 | 仪表盘 | ⚠️ 需审计 |
| transactions.js | v20.3 | 财务流水管理 | ✅ 较新 |
| categories.js | v17.5 | 分类管理 | ⚠️ 需审计 |
| settings.js | v17.5 | 系统设置 | ⚠️ 需审计 |
| reports.js | v17.5 | 报表统计 | ⚠️ 需审计 |
| customers.js | v17.6 | 客户管理 | ⚠️ 需审计 |
| **orders.js** | **v23.19** | 订单管理（刚修复savePayment） | ✅ 最新 |
| services.js | v17.5 | 服务项管理 | ⚠️ 需审计 |
| template-manager.js | v17.5 | 模板管理 | ⚠️ 需审计 |
| recycle.js | v17.5 | 回收站 | ⚠️ 需审计 |
| inventory.js | v17.5 | 库存管理 | ⚠️ 需审计 |
| organization.js | v17.6 | 组织架构管理 | ⚠️ 需审计 |
| areas.js | v1.0 | 区域设置 | ⚠️ 需审计 |
| projects.js | v1.0 | 项目设置 | ⚠️ 需审计 |
| taskpool.js | v17.5 | 任务池 | ⚠️ 需审计 |
| template-loader.js | v22.8 | 模板动态加载器 | ✅ 较新 |
| core.js | v17.5 | 核心初始化 | ⚠️ 需审计 |

**版本跨度**: v1.0 ~ v23.19（22个版本）  
**需审计文件**: 19个  
**已知最新**: 3个（utils.js, orders.js, template-loader.js, transactions.js）

---

## 🎯 **执行计划（分4阶段）**

### **阶段1: 紧急修复（已完成✅）**

- [x] **修复1**: 创建订单报错 - 删除add_order API中的company_id字段
- [x] **修复2**: 登记收款无反应 - savePayment改用fetch调用后端API
- [x] **重启服务**: Flask后端服务已重启（PID 47296）

---

### **阶段2: API字段一致性检查（今天完成）**

#### **目标**: 确保所有订单相关API的字段完全一致

#### **检查清单**

| API接口 | 方法 | 需检查字段 | 状态 |
|---------|------|-----------|------|
| `/api/orders` | POST | 26个字段（不含company_id） | ✅ 已修复 |
| `/api/orders/<id>` | PUT | 26个字段（不含company_id） | ✅ 已修复 |
| `/api/orders` | GET | 返回字段完整性 | ⚠️ 待检查 |
| `/api/orders/<id>` | GET | 返回字段完整性 | ⚠️ 待检查 |
| `/api/orders/<id>/audit` | POST | 审核字段 | ⚠️ 待检查 |
| `/api/orders/<id>/unaudit` | POST | 反审核字段 | ⚠️ 待检查 |
| `/api/orders/<id>` | DELETE | 软删除字段 | ⚠️ 待检查 |
| `/api/orders/recycle` | GET | 回收站字段 | ⚠️ 待检查 |
| `/api/orders/<id>/restore` | POST | 恢复字段 | ⚠️ 待检查 |
| `/api/payments` | POST | 收款字段 | ✅ 已修复 |
| `/api/orders/<id>/payments` | GET | 收款记录字段 | ⚠️ 待检查 |

#### **检查方法**

```bash
# 1. 检查orders表实际字段
mysql -u root -pYing1@0514.. ajkuaiji -e "DESC orders;"

# 2. 搜索所有orders API
grep -n "@app.route.*orders" /root/ajkuaiji/backend/app.py

# 3. 逐个检查SQL字段与表结构一致性
# 4. 记录所有不一致的地方
# 5. 批量修复
```

---

### **阶段3: JS模块版本统一（明天完成）**

#### **目标**: 将所有JS模块版本号统一到v24.0

#### **统一方案**

**方案A: 全部统一到v24.0**（推荐✅）
- 优点：简单直接，一次性解决
- 缺点：无法区分哪些文件真的有修改
- 适用场景：当前情况（版本混乱）

**方案B: 按模块功能分组**
- 基础模块: v24.0（api.js, utils.js, database.js, login.js, core.js）
- 业务模块: v24.1（orders.js, customers.js, transactions.js）
- UI模块: v24.2（dashboard.js, navigation.js, template-loader.js）
- 优点：版本号有意义
- 缺点：管理复杂

**决定**: 采用方案A，全部统一到v24.0

#### **执行步骤**

```bash
# 1. 全局替换financial_system.html中的版本号
sed -i 's/\.js?v=[0-9.]\+/.js?v=24.0/g' /root/ajkuaiji/financial_system.html

# 2. 验证替换结果
grep "modules/.*\.js?v=" /root/ajkuaiji/financial_system.html

# 3. 清理浏览器缓存测试
# 4. 记录修改到文档
```

---

### **阶段4: 建立版本管理机制（长期）**

#### **目标**: 避免未来再次出现版本不一致问题

#### **机制1: 统一版本号文件（推荐✅）**

创建 `/root/ajkuaiji/VERSION.json`：

```json
{
  "system_version": "v24.0",
  "release_date": "2026-02-12",
  "modules": {
    "frontend": {
      "js_version": "24.0",
      "css_version": "24.0",
      "template_version": "22.8"
    },
    "backend": {
      "api_version": "24.0",
      "database_version": "20.0"
    }
  },
  "changelog": [
    {
      "date": "2026-02-12",
      "version": "24.0",
      "changes": [
        "修复创建订单company_id字段不存在问题",
        "修复登记收款调用本地数据库问题",
        "统一所有JS模块版本号到v24.0"
      ]
    }
  ]
}
```

#### **机制2: 自动版本注入脚本**

创建 `/root/ajkuaiji/scripts/update_version.py`：

```python
#!/usr/bin/env python3
"""
自动更新所有JS/CSS版本号
用法: python3 scripts/update_version.py 24.0
"""
import sys
import re
import json
from pathlib import Path

def update_versions(new_version):
    # 读取VERSION.json
    with open('VERSION.json', 'r') as f:
        config = json.load(f)
    
    # 更新版本号
    config['modules']['frontend']['js_version'] = new_version
    config['system_version'] = f'v{new_version}'
    
    # 写回VERSION.json
    with open('VERSION.json', 'w') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    # 替换financial_system.html中的版本号
    html_file = Path('financial_system.html')
    content = html_file.read_text()
    content = re.sub(r'\.js\?v=[0-9.]+', f'.js?v={new_version}', content)
    content = re.sub(r'\.css\?v=[0-9.]+', f'.css?v={new_version}', content)
    html_file.write_text(content)
    
    print(f'✅ 版本号已更新到 v{new_version}')
    print(f'✅ 修改文件: VERSION.json, financial_system.html')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('用法: python3 update_version.py 24.0')
        sys.exit(1)
    
    new_version = sys.argv[1]
    update_versions(new_version)
```

#### **机制3: Git钩子自动检查**

创建 `.git/hooks/pre-commit`：

```bash
#!/bin/bash
# 提交前检查版本号一致性

version_count=$(grep -o '\.js?v=[0-9.]\+' financial_system.html | sort -u | wc -l)

if [ "$version_count" -gt 1 ]; then
    echo "❌ 错误: 检测到多个不同的JS版本号！"
    grep -o '\.js?v=[0-9.]\+' financial_system.html | sort -u
    echo "请运行: python3 scripts/update_version.py <版本号>"
    exit 1
fi

echo "✅ 版本号一致性检查通过"
```

#### **机制4: 修改规范**

**规则**: 修改任何JS文件后必须执行：

```bash
# 1. 修改代码
vim modules/orders.js

# 2. 更新全局版本号
python3 scripts/update_version.py 24.1

# 3. 测试验证
# 4. Git提交
git add .
git commit -m "feat: 更新订单模块到v24.1"
```

---

## 📋 **检查清单（逐项完成）**

### **今天必须完成（2026-02-12）**

- [x] ✅ 紧急修复：创建订单报错（company_id问题）
- [x] ✅ 紧急修复：登记收款无反应（savePayment问题）
- [ ] ⏳ 检查所有orders相关API字段一致性（11个接口）
- [ ] ⏳ 修复所有发现的字段不一致问题
- [ ] ⏳ 统一所有JS版本号到v24.0
- [ ] ⏳ 测试核心功能（创建订单、编辑订单、登记收款）

### **明天完成（2026-02-13）**

- [ ] 📝 创建VERSION.json文件
- [ ] 📝 创建update_version.py脚本
- [ ] 📝 创建Git钩子检查脚本
- [ ] 📝 更新系统说明文档（记录版本管理机制）
- [ ] 🧪 全面回归测试（所有业务流程）

---

## 🔍 **详细执行记录**

### **2026-02-12 紧急修复**

#### **修复1: 创建订单报错**

**问题**: `Unknown column 'company_id' in 'field list'`

**根本原因**:
- orders表中只有`company`字段（varchar(200)）
- 但add_order API的SQL插入了`company_id`字段
- 导致MySQL报错字段不存在

**修复操作**:
```python
# 文件: /root/ajkuaiji/backend/app.py 第1144-1227行
# 修改前SQL (第1159行):
company, company_id,
VALUES (%s, %s, ..., %s, %s, ...)  # 27个占位符

# 修改后SQL:
company,
VALUES (%s, %s, ..., %s, ...)  # 26个占位符

# 修改前参数 (第1187行):
data.get('company'),
data.get('company_id'),  # ❌ 多余

# 修改后参数:
data.get('company'),  # ✅ 正确
```

**后端重启**:
```bash
pkill -f "python3 /root/ajkuaiji/backend/app.py"
cd /root/ajkuaiji/backend && nohup python3 app.py > /tmp/flask_backend.log 2>&1 &
# PID: 47296
```

**测试验证**: ⏳ 待用户测试创建新订单

---

#### **修复2: 登记收款无反应**

**问题**: 点击"确认登记"按钮无反应，收款记录未保存

**根本原因**:
- `savePayment`函数调用本地数据库函数 `db.addOrderPayment()`
- 系统已迁移到MySQL，本地数据库已废弃
- 导致数据无法保存到服务器

**修复操作**:
```javascript
// 文件: /root/ajkuaiji/modules/orders.js 第1591-1630行

// 修改前 (第1623行):
const result = db.addOrderPayment(orderId, { amount, date, type, account_id, notes });

// 修改后 (第1625-1646行):
const response = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        order_id: orderId,
        payment_amount: amount,
        payment_date: date,
        payment_method: type,
        account_id: account_id,
        remark: notes,
        created_by: window.currentUserId || 1
    })
});

const result = await response.json();
```

**版本更新**:
```html
<!-- 文件: /root/ajkuaiji/financial_system.html 第29行 -->
<!-- 修改前: -->
<script src="modules/orders.js?v=23.18"></script>

<!-- 修改后: -->
<script src="modules/orders.js?v=23.19"></script>
```

**测试验证**: ⏳ 待用户测试登记收款功能

---

### **2026-02-12 API一致性检查（进行中）**

#### **检查方法**

```bash
# 步骤1: 获取orders表实际字段
mysql -u root -pYing1@0514.. ajkuaiji -e "DESC orders;" > /tmp/orders_fields.txt

# 步骤2: 提取所有orders API
grep -n "def.*order" /root/ajkuaiji/backend/app.py > /tmp/order_apis.txt

# 步骤3: 逐个API检查SQL字段
# - add_order (POST /api/orders) ✅ 已修复
# - update_order (PUT /api/orders/<id>) ✅ 已修复
# - get_orders (GET /api/orders) ⏳ 待检查
# - get_order (GET /api/orders/<id>) ⏳ 待检查
# - audit_order (POST /api/orders/<id>/audit) ⏳ 待检查
# ... 其他接口
```

**当前进度**: 2/11 ✅

---

## 🎯 **成功标准**

### **短期目标（本周）**

- [ ] 所有orders API字段与数据库完全一致
- [ ] 所有JS模块版本号统一到v24.0
- [ ] 创建订单、登记收款功能完全正常
- [ ] 无浏览器Console错误

### **长期目标（本月）**

- [ ] VERSION.json文件建立
- [ ] 自动版本更新脚本完成
- [ ] Git钩子检查机制生效
- [ ] 团队成员掌握版本管理规范

---

## 📞 **问题反馈**

如果发现任何问题，请记录：

1. **问题现象**: 具体操作步骤和报错信息
2. **Console日志**: 浏览器F12 Console的完整输出
3. **Network请求**: F12 Network中失败的API请求详情
4. **数据库状态**: 相关表的数据快照

**记录模板**:
```markdown
## 问题X: [简短描述]

**发现时间**: 2026-02-XX HH:MM
**操作步骤**: 
1. xxx
2. xxx

**报错信息**:
​```
[粘贴完整错误]
​```

**相关文件**: 
- frontend: modules/xxx.js
- backend: app.py line XXX
- database: xxx表
```

---

**文档维护**: 每次修复后更新此文档  
**最后更新**: 2026-02-12 21:40
