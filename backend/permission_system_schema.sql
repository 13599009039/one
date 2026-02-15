-- ================================================================
-- 权限系统数据库表结构
-- 版本: v1.0
-- 创建日期: 2026-02-13
-- 说明: 为AJ快记财务系统提供完整的RBAC权限控制体系
-- 包含: 6张核心表 + 系统预设角色 + 系统预设权限
-- ================================================================

-- ================================================================
-- 1. 角色表 (roles)
-- 说明: 存储系统中的所有角色，支持系统级和公司级角色
-- ================================================================
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '角色代码（唯一标识）',
  `company_id` INT COMMENT '所属公司ID（NULL表示系统级角色）',
  `is_system` TINYINT DEFAULT 0 COMMENT '是否系统内置角色（1=是，0=否）',
  `description` TEXT COMMENT '角色描述',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态（active/inactive）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_code` (`code`),
  INDEX `idx_is_system` (`is_system`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- ================================================================
-- 2. 权限表 (permissions)
-- 说明: 存储系统中的所有权限点，支持4级权限控制
--       resource_type: menu(菜单), function(功能), data(数据), field(字段)
--       action: view(查看), create(创建), update(更新), delete(删除), 
--               export(导出), approve(审核), import(导入)
-- ================================================================
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '权限名称',
  `code` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限代码（唯一标识）',
  `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型（menu/function/data/field）',
  `resource_code` VARCHAR(100) COMMENT '资源代码（如 customers/orders/transactions）',
  `action` VARCHAR(50) COMMENT '操作类型（view/create/update/delete/export/approve）',
  `description` TEXT COMMENT '权限描述',
  `parent_id` INT COMMENT '父权限ID（用于树形结构）',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_code` (`code`),
  INDEX `idx_resource_type` (`resource_type`),
  INDEX `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- ================================================================
-- 3. 角色权限关联表 (role_permissions)
-- 说明: 多对多关系，一个角色可以有多个权限，一个权限可以分配给多个角色
-- ================================================================
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL COMMENT '角色ID',
  `permission_id` INT NOT NULL COMMENT '权限ID',
  `granted_by` INT COMMENT '授权人ID（users表的id）',
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- ================================================================
-- 4. 用户角色关联表 (user_roles)
-- 说明: 多对多关系，一个用户可以有多个角色
-- ================================================================
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID（users表的id）',
  `role_id` INT NOT NULL COMMENT '角色ID',
  `assigned_by` INT COMMENT '分配人ID（users表的id）',
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- ================================================================
-- 5. 数据权限规则表 (data_permissions)
-- 说明: 定义角色对不同资源的数据访问范围
--       scope_type: all(全公司), company(公司), department(部门), 
--                   team(团队), self(仅本人)
-- ================================================================
CREATE TABLE IF NOT EXISTS `data_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL COMMENT '角色ID',
  `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型（customers/orders/transactions等）',
  `scope_type` VARCHAR(50) NOT NULL COMMENT '权限范围（all/company/department/team/self）',
  `scope_value` VARCHAR(100) COMMENT '范围值（如部门ID、团队ID）',
  `filter_rules` JSON COMMENT '过滤规则（JSON格式，用于复杂的数据过滤）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_resource` (`role_id`, `resource_type`),
  INDEX `idx_scope_type` (`scope_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据权限规则表';

-- ================================================================
-- 6. 权限审计日志表 (permission_audit_log)
-- 说明: 记录所有权限相关的操作，用于安全审计
--       action_type: grant(授权), revoke(撤销), check(检查), deny(拒绝)
-- ================================================================
CREATE TABLE IF NOT EXISTS `permission_audit_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '操作用户ID',
  `company_id` INT COMMENT '所属公司ID',
  `action_type` VARCHAR(50) NOT NULL COMMENT '操作类型（grant/revoke/check/deny）',
  `resource_type` VARCHAR(50) COMMENT '资源类型（customers/orders等）',
  `resource_id` INT COMMENT '资源ID',
  `permission_code` VARCHAR(100) COMMENT '权限代码',
  `role_code` VARCHAR(50) COMMENT '角色代码',
  `result` VARCHAR(20) COMMENT '结果（success/denied/error）',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` VARCHAR(255) COMMENT '用户代理',
  `details` TEXT COMMENT '详细信息（JSON格式）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_action_type` (`action_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限审计日志表';

-- ================================================================
-- 系统预设角色数据
-- ================================================================
INSERT INTO `roles` (`name`, `code`, `is_system`, `description`, `status`) VALUES
('超级管理员', 'super_admin', 1, 'SaaS平台超级管理员，拥有所有权限', 'active'),
('企业管理员', 'company_admin', 1, '企业级管理员，可管理本公司所有数据和用户', 'active'),
('财务主管', 'financial_manager', 1, '财务部门主管，可查看和管理所有财务数据', 'active'),
('销售主管', 'sales_manager', 1, '销售部门主管，可查看和管理所有销售数据', 'active'),
('运营主管', 'operation_manager', 1, '运营部门主管，可查看和管理所有运营数据', 'active'),
('销售人员', 'sales_staff', 1, '销售人员，仅可查看和管理自己的客户和订单', 'active'),
('运营人员', 'operation_staff', 1, '运营人员，仅可查看和管理自己负责的任务', 'active'),
('财务人员', 'accountant', 1, '财务人员，可查看财务数据，部分编辑权限', 'active'),
('只读用户', 'viewer', 1, '只读权限，仅可查看数据，无编辑权限', 'active');

-- ================================================================
-- 系统预设权限数据 - 菜单权限
-- ================================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
-- 顶级菜单
('客户管理', 'menu:customers', 'menu', 'customers', 'view', '客户管理模块访问权限', NULL, 1),
('订单管理', 'menu:orders', 'menu', 'orders', 'view', '订单管理模块访问权限', NULL, 2),
('财务流水', 'menu:transactions', 'menu', 'transactions', 'view', '财务流水模块访问权限', NULL, 3),
('统计分析', 'menu:analytics', 'menu', 'analytics', 'view', '统计分析模块访问权限', NULL, 4),
('系统设置', 'menu:settings', 'menu', 'settings', 'view', '系统设置模块访问权限', NULL, 5),
('权限管理', 'menu:permissions', 'menu', 'permissions', 'view', '权限管理模块访问权限', NULL, 6);

-- ================================================================
-- 系统预设权限数据 - 客户管理功能权限
-- ================================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看客户列表', 'customers:view', 'function', 'customers', 'view', '查看客户列表权限', 1, 1),
('创建客户', 'customers:create', 'function', 'customers', 'create', '创建新客户权限', 1, 2),
('编辑客户', 'customers:update', 'function', 'customers', 'update', '编辑客户信息权限', 1, 3),
('删除客户', 'customers:delete', 'function', 'customers', 'delete', '删除客户权限', 1, 4),
('导出客户', 'customers:export', 'function', 'customers', 'export', '导出客户数据权限', 1, 5);

-- ================================================================
-- 系统预设权限数据 - 订单管理功能权限
-- ================================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看订单列表', 'orders:view', 'function', 'orders', 'view', '查看订单列表权限', 2, 1),
('创建订单', 'orders:create', 'function', 'orders', 'create', '创建新订单权限', 2, 2),
('编辑订单', 'orders:update', 'function', 'orders', 'update', '编辑订单信息权限', 2, 3),
('删除订单', 'orders:delete', 'function', 'orders', 'delete', '删除订单权限', 2, 4),
('导出订单', 'orders:export', 'function', 'orders', 'export', '导出订单数据权限', 2, 5),
('订单审核', 'orders:approve', 'function', 'orders', 'approve', '订单审核权限', 2, 6);

-- ================================================================
-- 系统预设权限数据 - 财务流水功能权限
-- ================================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看流水', 'transactions:view', 'function', 'transactions', 'view', '查看财务流水权限', 3, 1),
('创建流水', 'transactions:create', 'function', 'transactions', 'create', '创建财务流水权限', 3, 2),
('编辑流水', 'transactions:update', 'function', 'transactions', 'update', '编辑财务流水权限', 3, 3),
('删除流水', 'transactions:delete', 'function', 'transactions', 'delete', '删除财务流水权限', 3, 4),
('导出流水', 'transactions:export', 'function', 'transactions', 'export', '导出流水数据权限', 3, 5),
('流水审核', 'transactions:approve', 'function', 'transactions', 'approve', '财务流水审核权限', 3, 6),
('反审核流水', 'transactions:unapprove', 'function', 'transactions', 'unapprove', '财务流水反审核权限', 3, 7);

-- ================================================================
-- 系统预设权限数据 - 统计分析功能权限
-- ================================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看团队绩效', 'analytics:team', 'function', 'analytics', 'view', '查看团队绩效统计权限', 4, 1),
('查看人员绩效', 'analytics:staff', 'function', 'analytics', 'view', '查看人员绩效统计权限', 4, 2),
('查看客户分析', 'analytics:customer', 'function', 'analytics', 'view', '查看客户价值分析权限', 4, 3),
('查看财务分析', 'analytics:financial', 'function', 'analytics', 'view', '查看财务分析权限', 4, 4),
('导出统计报表', 'analytics:export', 'function', 'analytics', 'export', '导出统计报表权限', 4, 5);

-- ================================================================
-- 系统预设权限数据 - 系统设置功能权限
-- ================================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看系统设置', 'settings:view', 'function', 'settings', 'view', '查看系统设置权限', 5, 1),
('修改系统设置', 'settings:update', 'function', 'settings', 'update', '修改系统设置权限', 5, 2),
('用户管理', 'settings:users', 'function', 'settings', 'manage', '用户管理权限', 5, 3),
('组织架构管理', 'settings:organization', 'function', 'settings', 'manage', '组织架构管理权限', 5, 4);

-- ================================================================
-- 系统预设权限数据 - 权限管理功能权限
-- ================================================================
INSERT INTO `permissions` (`name`, `code`, `resource_type`, `resource_code`, `action`, `description`, `parent_id`, `sort_order`) VALUES
('查看角色', 'permissions:roles:view', 'funct