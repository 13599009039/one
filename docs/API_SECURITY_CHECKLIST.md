# API安全检查清单

## 已完成权限保护的API

### 用户认证相关
- [x] POST /api/users/login
- [x] POST /api/users/logout
- [x] POST /api/users/switch-company
- [x] GET /api/users/companies
- [x] GET /api/users/current

### 权限管理相关
- [x] GET /api/role-permissions/<int:role_id> (@require_company)
- [x] POST /api/role-permissions/assign (@require_company)
- [x] POST /api/user-roles/assign (@require_company)

### 客户管理相关
- [x] GET /api/customers/<int:customer_id>/orders (@require_company)
- [x] GET /api/customers/<int:customer_id>/followups (@require_company)

## 需要检查的API类别

### 订单管理API
- [ ] GET /api/orders
- [ ] POST /api/orders
- [ ] GET /api/orders/<int:id>
- [ ] PUT /api/orders/<int:id>
- [ ] DELETE /api/orders/<int:id>
- [ ] POST /api/orders/aftersale (已加强)

### 财务管理API
- [ ] GET /api/transactions
- [ ] POST /api/transactions
- [ ] POST /api/refunds (已加强)

### 库存管理API
- [ ] GET /api/inventory
- [ ] POST /api/inventory/in-out

### 产品管理API
- [ ] GET /api/products
- [ ] POST /api/products
- [ ] GET /api/products/<int:id>

### 供应商管理API
- [ ] GET /api/suppliers
- [ ] POST /api/suppliers

## 检查标准

每个业务API都应该满足：
1. 使用 @require_company 装饰器
2. 在SQL查询中包含 WHERE company_id=? 条件
3. 参数中接收 current_company_id 和 current_user_id
4. 对敏感操作添加额外的权限检查

## 优先级排序

**高优先级**（直接影响数据安全）：
- 订单管理API
- 财务管理API
- 客户管理API

**中优先级**（重要业务功能）：
- 产品管理API
- 库存管理API
- 供应商管理API

**低优先级**（辅助功能）：
- 统计报表API
- 系统配置API