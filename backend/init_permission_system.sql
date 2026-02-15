-- =====================================================
-- 权限系统数据库表结构
-- Version: 1.0.0
-- Created: 2026-02-13
-- Purpose: 实现RBAC增强权限控制系统
-- =====================================================

-- =====================================================
-- 1. 角色表 (roles)
-- =====================================================
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '角色代码',
  `description` TEXT COMMENT '角色描述',
  `company_id` INT COMMENT '所属公司ID（NULL表示系统级角色）',
  `is_system` TINYINT DEFAULT 0 COMMENT '是否系统内置角色（1=是，0=否）',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态（active/inactive）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- =====================================================
-- 2. 权限表 (permissions)
-- =====================================================
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
  INDEX `idx_resource_type` (`resource_type`),
  INDEX `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- =====================================================
-- 3. 角色权限关联表 (role_permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL COMMENT '角色ID',
  `permission_id` INT NOT NULL COMMENT '权限ID',
  `granted_by` INT COMMENT '授权人ID',
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- =====================================================
-- 4. 用户角色关联表 (user_roles)
-- =====================================================
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `role_id` INT NOT NULL COMMENT '角色ID',
  `assigned_by` INT COMMENT '分配人ID',
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- =====================================================
-- 5. 数据权限规则表 (data_permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS `data_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL COMMENT '角色ID',
  `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型（customers/orders/transactions等）',
  `scope_type` VARCHAR(50) NOT NULL COMMENT '权限范围（all/company/department/team/self）',
  `scope_value` VARCHAR(100) COMMENT '范围值（如部门ID、团队ID）',
  `filter_rules` JSON COMMENT '过滤规则（JSON格式）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_resource` (`role_id`, `resource_type`),
  INDEX `idx_scope_type` (`scope_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据权限规则表';

-- =====================================================
-- 6. 权限审计日志表 (permission_audit_log)
-- =====================================================
CREATE TABLE IF NOT EXISTS `permission_audit_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '操作用户ID',
  `company_id` INT COMMENT '所属公司ID',
  `action_type` VARCHAR(50) NOT NULL COMMENT '操作类型（grant/revoke/check/denied）',
  `resource_type` VARCHAR(50) COMMENT '资源类型',
  `resource_id` INT COMMENT '资源ID',
  `permission_code` VARCHAR(100) COMMENT '权限代码',
  `result` VARCHAR(20) COMMENT '结果（success/denied）',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` VARCHAR(255) COMMENT '用户代理',
  `details` JSON COMMENT '详细信息（JSON格式）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_action_type` (`action_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限审计日志表';

-- =====================================================
-- 预设系统角色数据
-- =====================================================
INSERT INTO `roles` (`name`, `code`, `description`, `company_id`, `is_system`, `status`) VALUES
('超级管理员', 'super_admin', 'SaaS平台超级管理员，拥有所有权限', NULL, 1, 'active'),
('企业管理员', 'company_admin', '企业管理员，拥有企业内所有权限', NULL, 1, 'active'),
('财务主管', 'financial_manager', '财务主管，管理财务流水、报表等', NULL, 1, 'active'),
('销售主管', 'sales_manager', '销售主管，管理订单、客户等', NULL, 1, 'active'),
('运营主管', 'operation_manager', '运营主管，管理运营数据', NULL, 1, 'active'),
('销售人员', 'sales_staff', '销售人员，查看和管理自己的客户订单', NULL, 1, 'active'),
('运营人员', 'operation_staff', '运营人员，查看和管理自己的任务', NULL, 1, 'active'),
('只读用户', 'viewer', '只读用户，只能查看数据不能修改', NULL, 1, 'active');

-- =====================================================
-- 预设权限数据 - 菜单权限
-- =====================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
-- 一级菜单权限
('财务流水菜单', 'menu:transactions', 'menu', 'transactions', 'view', '访问财务流水模块', NULL, 1),
('订单管理菜单', 'menu:orders', 'menu', 'orders', 'view', '访问订单管理模块', NULL, 2),
('客户管理菜单', 'menu:customers', 'menu', 'customers', 'view', '访问客户管理模块', NULL, 3),
('统计分析菜单', 'menu:analytics', 'menu', 'analytics', 'view', '访问统计分析模块', NULL, 4),
('权限管理菜单', 'menu:permissions', 'menu', 'permissions', 'view', '访问权限管理模块', NULL, 5),
('系统设置菜单', 'menu:settings', 'menu', 'settings', 'view', '访问系统设置模块', NULL, 6);

-- =====================================================
-- 预设权限数据 - 功能权限（财务流水）
-- =====================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看流水', 'transaction:view', 'function', 'transactions', 'view', '查看财务流水记录', 1, 1),
('创建流水', 'transaction:create', 'function', 'transactions', 'create', '创建财务流水记录', 1, 2),
('编辑流水', 'transaction:update', 'function', 'transactions', 'update', '编辑财务流水记录', 1, 3),
('删除流水', 'transaction:delete', 'function', 'transactions', 'delete', '删除财务流水记录', 1, 4),
('导出流水', 'transaction:export', 'function', 'transactions', 'export', '导出财务流水数据', 1, 5),
('审核流水', 'transaction:approve', 'function', 'transactions', 'approve', '审核财务流水记录', 1, 6),
('反审核流水', 'transaction:unapprove', 'function', 'transactions', 'unapprove', '反审核财务流水记录', 1, 7);

-- =====================================================
-- 预设权限数据 - 功能权限（订单管理）
-- =====================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看订单', 'order:view', 'function', 'orders', 'view', '查看订单记录', 2, 1),
('创建订单', 'order:create', 'function', 'orders', 'create', '创建订单记录', 2, 2),
('编辑订单', 'order:update', 'function', 'orders', 'update', '编辑订单记录', 2, 3),
('删除订单', 'order:delete', 'function', 'orders', 'delete', '删除订单记录', 2, 4),
('导出订单', 'order:export', 'function', 'orders', 'export', '导出订单数据', 2, 5),
('审核订单', 'order:approve', 'function', 'orders', 'approve', '审核订单（一审）', 2, 6),
('终审订单', 'order:final_approve', 'function', 'orders', 'final_approve', '订单终审（二审）', 2, 7);

-- =====================================================
-- 预设权限数据 - 功能权限（客户管理）
-- =====================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看客户', 'customer:view', 'function', 'customers', 'view', '查看客户信息', 3, 1),
('创建客户', 'customer:create', 'function', 'customers', 'create', '创建客户信息', 3, 2),
('编辑客户', 'customer:update', 'function', 'customers', 'update', '编辑客户信息', 3, 3),
('删除客户', 'customer:delete', 'function', 'customers', 'delete', '删除客户信息', 3, 4),
('导出客户', 'customer:export', 'function', 'customers', 'export', '导出客户数据', 3, 5),
('查看客户备忘', 'customer:view_memo', 'function', 'customers', 'view', '查看客户备忘录', 3, 6),
('编辑客户备忘', 'customer:edit_memo', 'function', 'customers', 'update', '编辑客户备忘录', 3, 7);

-- =====================================================
-- 预设权限数据 - 功能权限（统计分析）
-- =====================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看团队统计', 'analytics:team', 'function', 'analytics', 'view', '查看团队绩效统计', 4, 1),
('查看人员统计', 'analytics:staff', 'function', 'analytics', 'view', '查看人员绩效统计', 4, 2),
('查看客户统计', 'analytics:customer', 'function', 'analytics', 'view', '查看客户价值分析', 4, 3),
('查看项目统计', 'analytics:project', 'function', 'analytics', 'view', '查看项目统计分析', 4, 4),
('导出统计报表', 'analytics:export', 'function', 'analytics', 'export', '导出统计分析报表', 4, 5);

-- =====================================================
-- 预设权限数据 - 功能权限（权限管理）
-- =====================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看角色', 'role:view', 'function', 'roles', 'view', '查看角色列表', 5, 1),
('创建角色', 'role:create', 'function', 'roles', 'create', '创建新角色', 5, 2),
('编辑角色', 'role:update', 'function', 'roles', 'update', '编辑角色信息', 5, 3),
('删除角色', 'role:delete', 'function', 'roles', 'delete', '删除角色', 5, 4),
('分配权限', 'role:assign_permission', 'function', 'roles', 'update', '为角色分配权限', 5, 5),
('分配用户角色', 'user:assign_role', 'function', 'users', 'update', '为用户分配角色', 5, 6),
('查看审计日志', 'permission:view_audit', 'function', 'permissions', 'view', '查看权限审计日志', 5, 7);

-- =====================================================
-- 预设权限数据 - 功能权限（系统设置）
-- =====================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看系统设置', 'system:view_settings', 'function', 'system', 'view', '查看系统设置', 6, 1),
('编辑系统设置', 'system:update_settings', 'function', 'system', 'update', '修改系统设置', 6, 2),
('用户管理', 'system:manage_users', 'function', 'system', 'update', '管理系统用户', 6, 3),
('公司管理', 'system:manage_company', 'function', 'system', 'update', '管理公司信息', 6, 4);

-- =====================================================
-- 角色权限关联 - 超级管理员（拥有所有权限）
-- =====================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 1, `id`, 1 FROM `permissions`;

-- =====================================================
-- 角色权限关联 - 企业管理员
-- =====================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 2, `id`, 1 FROM `permissions`
WHERE `code` IN (
  'menu:transactions', 'menu:orders', 'menu:customers', 'menu:analytics', 'menu:settings',
  'transaction:view', 'transaction:create', 'transaction:update', 'transaction:delete', 'transaction:export', 'transaction:approve', 'transaction:unapprove',
  'order:view', 'order:create', 'order:update', 'order:delete', 'order:export', 'order:approve', 'order:final_approve',
  'customer:view', 'customer:create', 'customer:update', 'customer:delete', 'customer:export', 'customer:view_memo', 'customer:edit_memo',
  'analytics:team', 'analytics:staff', 'analytics:customer', 'analytics:project', 'analytics:export',
  'system:view_settings', 'system:update_settings', 'system:manage_users', 'system:manage_company'
);

-- =====================================================
-- 角色权限关联 - 财务主管
-- =====================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 3, `id`, 1 FROM `permissions`
WHERE `code` IN (
  'menu:transactions', 'menu:orders', 'menu:analytics',
  'transaction:view', 'transaction:create', 'transaction:update', 'transaction:delete', 'transaction:export', 'transaction:approve', 'transaction:unapprove',
  'order:view', 'order:approve',
  'analytics:team', 'analytics:staff', 'analytics:project', 'analytics:export'
);

-- =====================================================
-- 角色权限关联 - 销售主管
-- =====================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 4, `id`, 1 FROM `permissions`
WHERE `code` IN (
  'menu:orders', 'menu:customers', 'menu:analytics',
  'order:view', 'order:create', 'order:update', 'order:delete', 'order:export', 'order:approve',
  'customer:view', 'customer:create', 'customer:update', 'customer:delete', 'customer:export', 'customer:view_memo', 'customer:edit_memo',
  'analytics:team', 'analytics:staff', 'analytics:customer', 'analytics:export'
);

-- =====================================================
-- 角色权限关联 - 运营主管
-- =====================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 5, `id`, 1 FROM `permissions`
WHERE `code` IN (
  'menu:orders', 'menu:customers', 'menu:analytics',
  'order:view', 'order:create', 'order:update', 'order:export',
  'customer:view', 'customer:create', 'customer:update', 'customer:view_memo', 'customer:edit_memo',
  'analytics:team', 'analytics:staff', 'analytics:project', 'analytics:export'
);

-- =====================================================
-- 角色权限关联 - 销售人员
-- =====================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 6, `id`, 1 FROM `permissions`
WHERE `code` IN (
  'menu:orders', 'menu:customers',
  'order:view', 'order:create', 'order:update',
  'customer:view', 'customer:create', 'customer:update', 'customer:view_memo', 'customer:edit_memo'
);

-- =====================================================
-- 角色权限关联 - 运营人员
-- =====================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 7, `id`, 1 FROM `permissions`
WHERE `code` IN (
  'menu:orders', 'menu:customers',
  'order:view', 'order:update',
  'customer:view', 'customer:update', 'customer:view_memo', 'customer:edit_memo'
);

-- =====================================================
-- 角色权限关联 - 只读用户
-- =====================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 8, `id`, 1 FROM `permissions`
WHERE `code` IN (
  'menu:transactions', 'menu:orders', 'menu:customers', 'menu:analytics',
  'transaction:view',
  'order:view',
  'customer:view', 'customer:view_memo',
  'analytics:team', 'analytics:staff', 'analytics:customer', 'analytics:project'
);

-- =====================================================
-- 数据权限预设 - 销售人员（只能看自己的数据）
-- =====================================================
INSERT INTO `data_permissions` (`role_id`, `resource_type`, `scope_type`, `scope_value`, `filter_rules`)
VALUES
(6, 'orders', 'self', NULL, '{"field": "business_staff_id", "operator": "equals", "value": "$user_id"}'),
(6, 'customers', 'self', NULL, '{"field": "follower_id", "operator": "equals", "value": "$user_id"}');

-- =====================================================
-- 数据权限预设 - 运营人员（只能看自己的数据）
-- =====================================================
INSERT INTO `data_permissions` (`role_id`, `resource_type`, `scope_type`, `scope_value`, `filter_rules`)
VALUES
(7, 'orders', 'self', NULL, '{"field": "operation_staff_id", "operator": "equals", "value": "$user_id"}'),
(7, 'customers', 'self', NULL, '{"field": "operation_staff", "operator": "equals", "value": "$user_name"}');

-- =====================================================
-- 数据权限预设 - 销售主管（可以看团队数据）
-- =====================================================
INSERT INTO `data_permissions` (`role_id`, `resource_type`, `scope_type`, `scope_value`, `filter_rules`)
VALUES
(4, 'orders', 'team', NULL, '{"field": "team", "operator": "equals", "value": "$user_team"}'),
(4, 'customers', 'team', NULL, '{"field": "team", "operator": "equals", "value": "$user_team"}');

-- =====================================================
-- 数据权限预设 - 运营主管（可以看团队数据）
-- =====================================================
INSERT INTO `data_permissions` (`role_id`, `resource_type`, `scope_type`, `scope_value`, `filter_rules`)
VALUES
(5, 'orders', 'team', NULL, '{"field": "team", "operator": "equals", "value": "$user_team"}'),
(5, 'customers', 'team', NULL, '{"field": "team", "operator": "equals", "value": "$user_team"}');

-- =====================================================
-- 数据权限预设 - 财务主管/企业管理员（可以看全公司数据）
-- =====================================================
INSERT INTO `data_permissions` (`role_id`, `resource_type`, `scope_type`, `scope_value`, `filter_rules`)
VALUES
(2, 'orders', 'company', NULL, '{"field": "company_id", "operator": "equals", "value": "$company_id"}'),
(2, 'customers', 'company', NULL, '{"field": "company_id", "operator": "equals", "value": "$company_id"}'),
(2, 'transactions', 'company', NULL, '{"field": "company_id", "operator": "equals", "value": "$company_id"}'),
(3, 'orders', 'company', NULL, '{"field": "company_id", "operator": "equals", "value": "$company_id"}'),
(3, 'customers', 'company', NULL, '{"field": "company_id", "operator": "equals", "value": "$company_id"}'),
(3, 'transactions', 'company', NULL, '{"field": "company_id", "operator": "equals", "value": "$company_id"}');

-- =====================================================
-- 完成提示
-- =====================================================
-- 权限系统表结构和预设数据初始化完成
-- 
-- 已创建的表：
--   1. roles (角色表) - 8个预设角色
--   2. permissions (权限表) - 47个预设权限
--   3. role_permissions (角色权限关联表) - 已配置各角色权限
--   4. user_roles (用户角色关联表)
--   5. data_permissions (数据权限规则表) - 已配置数据范围过滤
--   6. permission_audit_log (权限审计日志表)
--
-- 下一步：
--   1. 运行此SQL文件初始化权限系统
--   2. 为现有用户分配角色（user_roles表）
--   3. 开发后端权限检查API
--   4. 开发前端权限管理工具
-- =====================================================
