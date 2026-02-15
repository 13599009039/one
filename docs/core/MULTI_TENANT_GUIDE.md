# 多租户数据隔离开发规范

## 📋 目录
- [核心原则](#核心原则)
- [数据库设计规范](#数据库设计规范)
- [API开发规范](#api开发规范)
- [前端开发规范](#前端开发规范)
- [测试检查清单](#测试检查清单)
- [常见问题](#常见问题)

---

## 🎯 核心原则

### 三层隔离机制

```
┌─────────────────────────────────────────────┐
│  1. Session层: 获取当前公司ID               │
│     company_id = session.get('company_id')  │
├─────────────────────────────────────────────┤
│  2. SQL层: 强制添加公司过滤                 │
│     WHERE company_id = %s                   │
├─────────────────────────────────────────────┤
│  3. 权限层: 验证数据归属                    │
│     检查操作对象是否属于当前公司             │
└─────────────────────────────────────────────┘
```

---

## 💾 数据库设计规范

### 1. 表结构要求

**所有业务表必须包含 `company_id` 字段:**

```sql
CREATE TABLE your_business_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL COMMENT '公司ID',
    -- 其他业务字段 ...
    
    -- 索引
    INDEX idx_company_id (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) COMMENT='业务表';
```

### 2. 需要隔离的表类型

✅ **必须隔离:**
- 客户数据 (customers, customer_contacts, customer_memos)
- 订单数据 (orders, order_items, order_aftersales)
- 财务数据 (transactions, accounts, purchases)
- 项目数据 (projects, tasks, task_pool)
- 商品服务 (services, suppliers, inventory_transactions)
- 统计数据 (analytics_summary, staff_performance)
- 组织架构 (teams, departments, positions)

❌ **不需要隔离:**
- 系统表 (users, companies, permissions, roles)
- 全局配置 (system_config, system_settings)

### 3. 历史数据修复

```sql
-- 检查NULL值
SELECT COUNT(*) FROM your_table WHERE company_id IS NULL;

-- 修复NULL值(谨慎操作,确认默认公司ID)
UPDATE your_table SET company_id = 1 WHERE company_id IS NULL;
```

---

## 🔌 API开发规范

### 1. 查询列表API (GET /api/resource)

**标准模板:**
```python
@app.route('/api/resources', methods=['GET'])
def get_resources():
    """获取资源列表 - ✅ 多租户隔离"""
    try:
        # ✅ 第一步: 获取当前公司ID
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 第二步: SQL强制添加company_id过滤
            where_clauses = ["company_id=%s"]
            params = [company_id]
            
            # 其他筛选条件...
            if search:
                where_clauses.append("name LIKE %s")
                params.append(f"%{search}%")
            
            where_sql = " AND ".join(where_clauses)
            
            # ✅ 查询时必须包含company_id过滤
            cursor.execute(
                f"SELECT * FROM resources WHERE {where_sql} ORDER BY created_at DESC",
                params
            )
            data = cursor.fetchall()
        
        conn.close()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
```

### 2. 查询单条API (GET /api/resource/:id)

**标准模板:**
```python
@app.route('/api/resources/<int:resource_id>', methods=['GET'])
def get_resource(resource_id):
    """获取单条资源 - ✅ 多租户隔离"""
    try:
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 同时过滤id和company_id
            cursor.execute(
                "SELECT * FROM resources WHERE id=%s AND company_id=%s",
                (resource_id, company_id)
            )
            data = cursor.fetchone()
        
        conn.close()
        
        if data:
            return jsonify({'success': True, 'data': data})
        else:
            return jsonify({'success': False, 'message': '资源不存在或无权限'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
```

### 3. 创建API (POST /api/resource)

**标准模板:**
```python
@app.route('/api/resources', methods=['POST'])
def add_resource():
    """创建资源 - ✅ 自动添加company_id"""
    try:
        data = request.json
        # ✅ 从session获取company_id,不信任前端传值
        company_id = session.get('company_id', 1)
        current_user_id = session.get('user_id')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ SQL INSERT时强制设置company_id
            cursor.execute("""
                INSERT INTO resources (name, company_id, created_by)
                VALUES (%s, %s, %s)
            """, (data.get('name'), company_id, current_user_id))
            
            resource_id = cursor.lastrowid
            conn.commit()
        
        conn.close()
        return jsonify({'success': True, 'id': resource_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
```

### 4. 更新API (PUT /api/resource/:id)

**标准模板:**
```python
@app.route('/api/resources/<int:resource_id>', methods=['PUT'])
def update_resource(resource_id):
    """更新资源 - ✅ 验证归属权限"""
    try:
        data = request.json
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 第一步: 检查资源是否属于当前公司
            cursor.execute(
                "SELECT id FROM resources WHERE id=%s AND company_id=%s",
                (resource_id, company_id)
            )
            resource = cursor.fetchone()
            
            if not resource:
                return jsonify({'success': False, 'message': '资源不存在或无权限'}), 404
            
            # ✅ 第二步: 执行更新(WHERE条件必须包含company_id)
            cursor.execute("""
                UPDATE resources 
                SET name=%s, updated_at=NOW()
                WHERE id=%s AND company_id=%s
            """, (data.get('name'), resource_id, company_id))
            
            conn.commit()
        
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
```

### 5. 删除API (DELETE /api/resource/:id)

**标准模板:**
```python
@app.route('/api/resources/<int:resource_id>', methods=['DELETE'])
def delete_resource(resource_id):
    """删除资源 - ✅ 软删除+权限校验"""
    try:
        company_id = session.get('company_id', 1)
        current_user_id = session.get('user_id')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 软删除时验证company_id
            cursor.execute("""
                UPDATE resources 
                SET is_deleted=1, deleted_by=%s, deleted_at=NOW()
                WHERE id=%s AND company_id=%s
            """, (current_user_id, resource_id, company_id))
            
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'message': '资源不存在或无权限'}), 404
            
            conn.commit()
        
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
```

---

## 🎨 前端开发规范

### 1. 不要在前端传递company_id

❌ **错误做法:**
```javascript
// 前端不应该传company_id
const orderData = {
    customer_id: customerId,
    company_id: currentCompanyId,  // ❌ 不要这样做
    items: items
};
```

✅ **正确做法:**
```javascript
// 后端从session自动获取company_id
const orderData = {
    customer_id: customerId,
    items: items
};
```

### 2. 错误处理

前端应该正确处理权限错误:

```javascript
try {
    const response = await fetch('/api/resources/123', {
        credentials: 'include'
    });
    
    const result = await response.json();
    
    if (!result.success) {
        if (response.status === 404) {
            alert('资源不存在或无权限访问');
        } else {
            alert(result.message);
        }
    }
} catch (error) {
    console.error('请求失败:', error);
}
```

---

## ✅ 测试检查清单

### 1. 数据库层检查

```sql
-- 检查表是否有company_id字段
DESCRIBE your_table;

-- 检查是否有NULL值
SELECT COUNT(*) FROM your_table WHERE company_id IS NULL;

-- 检查数据分布
SELECT company_id, COUNT(*) FROM your_table GROUP BY company_id;
```

### 2. API层检查

使用提供的检查脚本:
```bash
python3 /root/ajkuaiji/check_company_isolation.py
```

### 3. 功能测试

- [ ] 创建测试公司A和公司B
- [ ] 在公司A创建数据
- [ ] 切换到公司B
- [ ] 验证看不到公司A的数据
- [ ] 尝试直接访问公司A数据的ID(应返回404)
- [ ] 切换回公司A
- [ ] 验证数据仍然存在

---

## ❓ 常见问题

### Q1: 什么时候需要添加company_id过滤?

**A:** 所有业务数据的增删改查都需要。判断标准:
- 这个数据是否属于某个公司?
- 不同公司是否需要看到不同的数据?
- 如果答案是"是",就必须添加隔离。

### Q2: users表需要company_id吗?

**A:** users表比较特殊:
- users表记录所有用户(可能属于多个公司)
- user_companies表记录用户与公司的关联关系
- 查询某公司的用户时,通过user_companies表关联

```sql
-- 查询某公司的用户
SELECT u.* 
FROM users u
JOIN user_companies uc ON u.id = uc.user_id
WHERE uc.company_id = 1 AND uc.status = 'active'
```

### Q3: 统计API需要隔离吗?

**A:** 必须!统计数据也要按公司隔离:

```python
# ❌ 错误 - 统计了所有公司的数据
SELECT COUNT(*) FROM orders WHERE status='完成'

# ✅ 正确 - 只统计当前公司的数据
SELECT COUNT(*) FROM orders 
WHERE company_id=%s AND status='完成'
```

### Q4: 如何处理跨公司的数据?

**A:** 特殊场景需要特殊处理:
- 系统管理员查看所有数据: 使用super_admin权限绕过company_id过滤
- 公司间数据共享: 通过专门的共享表(如shared_resources)实现
- 集团统计: 通过公司层级关系(parent_company_id)汇总

### Q5: 测试环境如何验证?

**A:** 创建测试脚本:

```python
# test_isolation.py
import requests

session_a = requests.Session()
session_b = requests.Session()

# 登录公司A
session_a.post('http://localhost:5000/api/users/login', json={
    'username': 'company_a_admin',
    'password': 'password'
})

# 登录公司B
session_b.post('http://localhost:5000/api/users/login', json={
    'username': 'company_b_admin',
    'password': 'password'
})

# 公司A创建数据
res = session_a.post('http://localhost:5000/api/orders', json={
    'customer_id': 1,
    'items': [...]
})
order_id = res.json()['id']

# 公司B尝试访问公司A的订单(应该404)
res = session_b.get(f'http://localhost:5000/api/orders/{order_id}')
assert res.status_code == 404, "隔离失败!公司B能看到公司A的数据!"

print("✅ 隔离测试通过")
```

---

## 📚 相关文档

- [数据库设计文档](./docs/database.md)
- [API开发规范](./docs/api-guide.md)
- [权限系统设计](./docs/permissions.md)

---

## 🔄 版本历史

- v1.0 (2026-02-13) - 初始版本,建立多租户隔离规范
- v1.1 (2026-02-13) - 添加测试检查清单和常见问题

---

**⚠️ 重要提醒:**
- 所有新增API必须经过隔离检查才能上线
- 每周运行一次检查脚本验证隔离完整性
- 发现隔离问题立即修复,不要拖延
