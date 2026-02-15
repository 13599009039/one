# 全局权限控制系统开发计划

**版本**: v1.0  
**创建日期**: 2026年2月13日  
**状态**: 规划中  
**优先级**: P0（核心功能）

---

## 📋 目录

1. [系统概述](#系统概述)
2. [权限模型设计](#权限模型设计)
3. [数据库设计](#数据库设计)
4. [功能开发清单](#功能开发清单)
5. [开发路线图](#开发路线图)
6. [技术实现方案](#技术实现方案)

---

## 系统概述

### 业务背景

当前系统已具备基础RBAC（基于角色的访问控制）模型，但权限粒度较粗，无法满足SaaS化销售的精细权限控制需求。需要建立一套完整的、可配置的、多租户隔离的全局权限系统。

### 核心目标

1. **细粒度权限控制**: 支持到菜单、功能、数据行级别的权限控制
2. **多租户数据隔离**: 企业客户数据完全隔离，防止越权访问
3. **可视化权限配置**: 提供GUI界面进行权限分配，无需修改代码
4. **审计日志**: 记录所有权限变更和敏感操作
5. **性能优化**: 权限判断不影响系统响应速度

---

## 权限模型设计

### RBAC增强模型

```
用户(User) ←→ 角色(Role) ←→ 权限(Permission) ←→ 资源(Resource)
     ↓                              ↓
   部门/团队                      操作类型
  (Department)                   (Action)
```

### 权限层级

#### 1. 菜单级权限
- 控制用户可见的菜单项
- 例如：财务人员只能看到"财务流水"、"报表"菜单

#### 2. 功能级权限
- 控制具体功能按钮的可见性和可操作性
- 例如：普通用户可查看订单，但无法删除订单

#### 3. 数据级权限
- 控制用户可访问的数据范围
- 例如：销售人员只能看到自己跟进的客户

#### 4. 字段级权限
- 控制敏感字段的可见性
- 例如：非财务人员无法看到客户的合同金额

---

## 数据库设计

### 1. roles（角色表）

```sql
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '角色代码',
  `company_id` INT COMMENT '所属公司ID（NULL表示系统级角色）',
  `description` TEXT COMMENT '角色描述',
  `is_system` TINYINT DEFAULT 0 COMMENT '是否系统内置角色',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';
```

**预设系统角色**:
- `super_admin`: 超级管理员（SaaS平台级）
- `company_admin`: 企业管理员
- `financial_manager`: 财务主管
- `sales_manager`: 销售主管
- `operation_manager`: 运营主管
- `sales_staff`: 销售人员
- `operation_staff`: 运营人员
- `viewer`: 只读用户

### 2. permissions（权限表）

```sql
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '权限名称',
  `code` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限代码',
  `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型（menu/function/data/field）',
  `resource_code` VARCHAR(100) COMMENT '资源代码',
  `action` VARCHAR(50) COMMENT '操作类型（view/create/update/delete/export/approve）',
  `description` TEXT COMMENT '权限描述',
  `parent_id` INT COMMENT '父权限ID（用于树形结构）',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_code` (`code`),
  INDEX `idx_resource_type` (`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';
```

### 3. role_permissions（角色权限关联表）

```sql
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL COMMENT '角色ID',
  `permission_id` INT NOT NULL COMMENT '权限ID',
  `granted_by` INT COMMENT '授权人ID',
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';
```

### 4. user_roles（用户角色关联表）

```sql
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `role_id` INT NOT NULL COMMENT '角色ID',
  `assigned_by` INT COMMENT '分配人ID',
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';
```

### 5. data_permissions（数据权限规则表）

```sql
CREATE TABLE IF NOT EXISTS `data_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL COMMENT '角色ID',
  `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型（customers/orders/transactions等）',
  `scope_type` VARCHAR(50) NOT NULL COMMENT '权限范围（all/company/department/team/self）',
  `scope_value` VARCHAR(100) COMMENT '范围值（如部门ID、团队ID）',
  `filter_rules` JSON COMMENT '过滤规则（JSON格式）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_resource` (`role_id`, `resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据权限规则表';
```

### 6. permission_audit_log（权限审计日志表）

```sql
CREATE TABLE IF NOT EXISTS `permission_audit_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '操作用户ID',
  `company_id` INT COMMENT '所属公司ID',
  `action_type` VARCHAR(50) NOT NULL COMMENT '操作类型（grant/revoke/check）',
  `resource_type` VARCHAR(50) COMMENT '资源类型',
  `resource_id` INT COMMENT '资源ID',
  `permission_code` VARCHAR(100) COMMENT '权限代码',
  `result` VARCHAR(20) COMMENT '结果（success/denied）',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` VARCHAR(255) COMMENT '用户代理',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限审计日志表';
```

---

## 功能开发清单

### Phase 1: 基础权限框架（2周）

#### 1.1 数据库初始化
- [ ] 创建权限相关表结构（roles, permissions, role_permissions等）
- [ ] 导入系统预设角色
- [ ] 导入系统预设权限
- [ ] 迁移现有用户的角色数据

#### 1.2 后端API开发
- [ ] `POST /api/permissions/check` - 权限检查接口
- [ ] `GET /api/roles` - 获取角色列表
- [ ] `POST /api/roles` - 创建角色
- [ ] `PUT /api/roles/{id}` - 更新角色
- [ ] `DELETE /api/roles/{id}` - 删除角色
- [ ] `GET /api/permissions` - 获取权限列表
- [ ] `POST /api/role-permissions` - 分配权限给角色
- [ ] `GET /api/user-permissions/{user_id}` - 获取用户的所有权限

#### 1.3 权限中间件
- [ ] 开发Python装饰器 `@require_permission('permission_code')`
- [ ] 集成到现有API路由中
- [ ] 权限缓存机制（Redis或内存缓存）

### Phase 2: 前端权限控制（2周）

#### 2.1 JavaScript权限工具库
```javascript
// modules/permission-manager.js
class PermissionManager {
    // 检查用户是否有指定权限
    async hasPermission(permissionCode) {}
    
    // 批量检查权限
    async hasPermissions(permissionCodes) {}
    
    // 获取当前用户的所有权限
    async getCurrentUserPermissions() {}
    
    // 根据权限显示/隐藏DOM元素
    applyPermissionsToUI() {}
    
    // 权限缓存
    cachePermissions(permissions) {}
}
```

#### 2.2 页面权限控制
- [ ] 菜单权限控制（navigation.js改造）
- [ ] 按钮权限控制（根据权限显示/隐藏按钮）
- [ ] 数据列表权限过滤（前端过滤+后端验证）

#### 2.3 指令式权限控制
```html
<!-- HTML元素权限控制 -->
<button data-permission="order:delete" onclick="deleteOrder()">删除订单</button>
<div data-permission="financial:view">财务数据</div>
```

### Phase 3: 可视化权限管理（2周）

#### 3.1 角色管理界面
- [ ] 角色列表页面（/root/ajkuaiji/templates/admin-roles.html）
- [ ] 角色创建/编辑表单
- [ ] 角色权限分配界面（树形复选框）
- [ ] 角色用户列表

#### 3.2 权限分配界面
- [ ] 权限树形结构展示
- [ ] 权限搜索功能
- [ ] 批量授权/撤销

#### 3.3 用户权限查看
- [ ] 用户详情页显示已分配角色
- [ ] 用户详情页显示有效权限列表
- [ ] 权限继承关系可视化

### Phase 4: 数据级权限（2周）

#### 4.1 数据范围定义
```javascript
// 数据权限范围示例
const dataScopeTypes = {
    ALL: 'all',           // 全部数据
    COMPANY: 'company',   // 本公司数据
    DEPARTMENT: 'dept',   // 本部门数据
    TEAM: 'team',         // 本团队数据
    SELF: 'self'          // 仅自己的数据
};
```

#### 4.2 SQL过滤器生成
- [ ] 根据用户权限自动生成WHERE条件
- [ ] 客户数据过滤（customers表）
- [ ] 订单数据过滤（orders表）
- [ ] 财务流水过滤（transactions表）

#### 4.3 前端数据过滤
- [ ] API响应数据二次过滤
- [ ] 列表数据权限标记

### Phase 5: 审计与监控（1周）

#### 5.1 权限审计日志
- [ ] 记录所有权限检查操作
- [ ] 记录权限授予/撤销操作
- [ ] 记录敏感数据访问

#### 5.2 审计日志查询
- [ ] 审计日志查询界面
- [ ] 按用户/时间/操作类型筛选
- [ ] 导出审计日志

---

## 开发路线图

### 时间规划（总计9周）

```
Week 1-2: Phase 1 - 基础权限框架
  ├─ Week 1: 数据库设计 + API开发
  └─ Week 2: 权限中间件 + 单元测试

Week 3-4: Phase 2 - 前端权限控制
  ├─ Week 3: JavaScript工具库开发
  └─ Week 4: 页面权限集成

Week 5-6: Phase 3 - 可视化权限管理
  ├─ Week 5: 角色管理界面
  └─ Week 6: 权限分配界面

Week 7-8: Phase 4 - 数据级权限
  ├─ Week 7: 数据范围定义 + SQL过滤
  └─ Week 8: 前端数据过滤 + 测试

Week 9: Phase 5 - 审计与监控
  └─ Week 9: 审计日志 + 查询界面
```

### 里程碑

- **M1 (Week 2)**: 基础权限框架完成，支持API级权限检查
- **M2 (Week 4)**: 前端权限控制完成，菜单/按钮根据权限显示
- **M3 (Week 6)**: 可视化权限管理完成，管理员可配置权限
- **M4 (Week 8)**: 数据级权限完成，用户只能看到被授权的数据
- **M5 (Week 9)**: 审计日志完成，系统上线ready

---

## 技术实现方案

### 1. 后端权限检查装饰器

```python
# backend/decorators.py
from functools import wraps
from flask import session, jsonify

def require_permission(permission_code):
    """
    权限检查装饰器
    用法: @require_permission('customer:delete')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'success': False, 'message': '未登录'}), 401
            
            # 检查权限
            if not check_user_permission(user_id, permission_code):
                return jsonify({'success': False, 'message': '权限不足'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def check_user_permission(user_id, permission_code):
    """检查用户是否有指定权限"""
    # 从缓存中获取用户权限
    cached_permissions = get_cached_permissions(user_id)
    if cached_permissions:
        return permission_code in cached_permissions
    
    # 从数据库查询
    conn = get_db_connection()
    cursor = conn.cursor()
    sql = """
        SELECT COUNT(*) as cnt FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = %s AND p.code = %s
    """
    cursor.execute(sql, (user_id, permission_code))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    
    has_permission = result['cnt'] > 0
    
    # 缓存权限（有效期1小时）
    cache_user_permissions(user_id, permission_code, has_permission)
    
    return has_permission
```

### 2. 前端权限管理器

```javascript
// modules/permission-manager.js
class PermissionManager {
    constructor() {
        this.permissions = null;
        this.cacheExpiry = 3600000; // 1小时
        this.cacheKey = 'user_permissions_cache';
    }

    /**
     * 初始化权限管理器
     */
    async init() {
        console.log('[PermissionManager] 🔐 初始化权限管理器');
        await this.loadPermissions();
        this.applyPermissionsToUI();
    }

    /**
     * 从API加载当前用户权限
     */
    async loadPermissions() {
        // 先尝试从缓存加载
        const cached = this.getCachedPermissions();
        if (cached) {
            this.permissions = cached;
            console.log('[PermissionManager] ✅ 从缓存加载权限', this.permissions.length);
            return;
        }

        // 从API加载
        try {
            const response = await fetch('/api/user-permissions/current');
            const result = await response.json();
            if (result.success) {
                this.permissions = result.data.map(p => p.code);
                this.cachePermissions(this.permissions);
                console.log('[PermissionManager] ✅ 从API加载权限', this.permissions.length);
            }
        } catch (error) {
            console.error('[PermissionManager] ❌ 加载权限失败', error);
            this.permissions = [];
        }
    }

    /**
     * 检查是否有指定权限
     */
    hasPermission(permissionCode) {
        if (!this.permissions) return false;
        return this.permissions.includes(permissionCode);
    }

    /**
     * 批量检查权限（满足任意一个即可）
     */
    hasAnyPermission(permissionCodes) {
        return permissionCodes.some(code => this.hasPermission(code));
    }

    /**
     * 批量检查权限（必须全部满足）
     */
    hasAllPermissions(permissionCodes) {
        return permissionCodes.every(code => this.hasPermission(code));
    }

    /**
     * 根据权限控制UI元素显示/隐藏
     */
    applyPermissionsToUI() {
        // 查找所有带权限标记的元素
        const elements = document.querySelectorAll('[data-permission]');
        elements.forEach(element => {
            const requiredPermission = element.getAttribute('data-permission');
            if (!this.hasPermission(requiredPermission)) {
                element.style.display = 'none';
            }
        });
    }

    /**
     * 缓存权限到LocalStorage
     */
    cachePermissions(permissions) {
        const cacheData = {
            permissions: permissions,
            timestamp: Date.now()
        };
        localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    }

    /**
     * 从缓存获取权限
     */
    getCachedPermissions() {
        const cached = localStorage.getItem(this.cacheKey);
        if (!cached) return null;

        try {
            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;
            if (age < this.cacheExpiry) {
                return cacheData.permissions;
            }
        } catch (error) {
            console.error('[PermissionManager] ❌ 解析缓存失败', error);
        }
        return null;
    }

    /**
     * 清除权限缓存
     */
    clearCache() {
        localStorage.removeItem(this.cacheKey);
    }
}

// 全局实例
window.PermissionManager = new PermissionManager();
```

### 3. 数据权限SQL生成器

```python
# backend/permission_filter.py
def apply_data_permission_filter(user_id, resource_type, base_sql):
    """
    为SQL查询添加数据权限过滤条件
    
    参数:
        user_id: 用户ID
        resource_type: 资源类型（customers/orders/transactions）
        base_sql: 基础SQL语句
    
    返回:
        添加权限过滤后的SQL
    """
    # 获取用户的数据权限范围
    scope = get_user_data_scope(user_id, resource_type)
    
    if scope['scope_type'] == 'all':
        # 全部数据权限，不添加过滤
        return base_sql
    
    elif scope['scope_type'] == 'company':
        # 本公司数据权限
        company_id = scope['company_id']
        return f"{base_sql} AND company_id = {company_id}"
    
    elif scope['scope_type'] == 'department':
        # 本部门数据权限
        dept_id = scope['department_id']
        return f"{base_sql} AND department_id = {dept_id}"
    
    elif scope['scope_type'] == 'self':
        # 仅自己的数据权限
        if resource_type == 'customers':
            return f"{base_sql} AND follower_id = {user_id}"
        elif resource_type == 'orders':
            return f"{base_sql} AND (business_staff_id = {user_id} OR service_staff_id = {user_id})"
    
    return base_sql
```

---

## 预设权限列表

### 菜单权限

| 权限代码 | 权限名称 | 说明 |
|---------|---------|------|
| menu:dashboard | 仪表盘菜单 | 查看仪表盘 |
| menu:customers | 客户管理菜单 | 查看客户模块 |
| menu:orders | 订单管理菜单 | 查看订单模块 |
| menu:taskpool | 任务池菜单 | 查看任务池 |
| menu:transactions | 财务流水菜单 | 查看财务模块 |
| menu:reports | 报表菜单 | 查看报表 |
| menu:organization | 组织架构菜单 | 查看组织架构 |
| menu:settings | 系统设置菜单 | 查看系统设置 |

### 功能权限

| 权限代码 | 权限名称 | 说明 |
|---------|---------|------|
| customer:view | 查看客户 | 查看客户列表和详情 |
| customer:create | 创建客户 | 新增客户 |
| customer:update | 更新客户 | 编辑客户信息 |
| customer:delete | 删除客户 | 删除客户 |
| customer:export | 导出客户 | 导出客户数据 |
| order:view | 查看订单 | 查看订单列表和详情 |
| order:create | 创建订单 | 新增订单 |
| order:update | 更新订单 | 编辑订单 |
| order:delete | 删除订单 | 删除订单 |
| order:approve | 审批订单 | 订单审批 |
| transaction:view | 查看流水 | 查看财务流水 |
| transaction:create | 登记流水 | 新增流水记录 |
| transaction:approve | 审核流水 | 流水审核 |
| transaction:void | 作废流水 | 流水作废 |
| task:view | 查看任务 | 查看任务池 |
| task:accept | 接单 | 接任务 |
| task:cost | 登记成本 | 登记任务成本 |
| user:manage | 管理用户 | 用户增删改 |
| role:manage | 管理角色 | 角色权限配置 |

---

**下一步**: 继续创建统计分析系统开发计划文档
