-- ============================================================================
-- 多租户SaaS系统数据库升级脚本 v2.0
-- 创建日期: 2026-02-14
-- 说明: 升级现有单租户系统为多租户SaaS架构
-- 
-- 执行前备份: mysqldump -uajkuaiji -p ajkuaiji > backup_$(date +%Y%m%d).sql
-- 执行命令: mysql -uajkuaiji -p'@HNzb5z75b16' ajkuaiji < upgrade_multitenant_v2.sql
-- ============================================================================

USE ajkuaiji;

-- ============================================================================
-- Phase 1: 用户体系升级
-- 目标: 支持用户全局唯一、多公司关联、第三方登录
-- ============================================================================

-- 1.1 创建用户-公司关联表（多对多）
CREATE TABLE IF NOT EXISTS `user_companies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `company_id` INT NOT NULL COMMENT '公司ID',
  `role` VARCHAR(50) DEFAULT 'user' COMMENT '在该公司的角色',
  `is_primary` BOOLEAN DEFAULT FALSE COMMENT '是否为主公司（登录后默认进入）',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active/disabled/pending',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `disabled_at` TIMESTAMP NULL COMMENT '停用时间',
  `disabled_by` INT NULL COMMENT '停用操作人ID',
  `notes` TEXT COMMENT '备注',
  
  UNIQUE KEY `uk_user_company` (`user_id`, `company_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_company` (`company_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_uc_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uc_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户-公司关联表（多对多）';

-- 1.2 迁移现有用户数据到user_companies
INSERT IGNORE INTO user_companies (user_id, company_id, is_primary, status, role)
SELECT id, company_id, TRUE, status, role
FROM users
WHERE company_id IS NOT NULL;

-- 1.3 users表添加第三方登录字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  `uuid` VARCHAR(36) UNIQUE COMMENT '全局唯一UUID';
  
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  `dingtalk_openid` VARCHAR(100) UNIQUE COMMENT '钉钉OpenID';
  
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  `wechat_openid` VARCHAR(100) UNIQUE COMMENT '微信OpenID';
  
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  `feishu_open_id` VARCHAR(100) UNIQUE COMMENT '飞书OpenID';
  
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  `login_type` VARCHAR(20) DEFAULT 'password' COMMENT '登录方式：password/dingtalk/wechat/feishu';
  
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  `last_login_at` TIMESTAMP NULL COMMENT '最后登录时间';
  
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  `last_login_company_id` INT NULL COMMENT '最后登录的公司ID';

-- 1.4 为所有用户生成UUID
UPDATE users SET uuid = UUID() WHERE uuid IS NULL OR uuid = '';

-- 1.5 创建第三方账号绑定表
CREATE TABLE IF NOT EXISTS `user_oauth_bindings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `provider` VARCHAR(20) NOT NULL COMMENT '提供商：dingtalk/wechat/feishu',
  `open_id` VARCHAR(100) NOT NULL COMMENT '第三方OpenID',
  `union_id` VARCHAR(100) COMMENT '第三方UnionID',
  `access_token` TEXT COMMENT '访问令牌',
  `refresh_token` TEXT COMMENT '刷新令牌',
  `expires_at` TIMESTAMP NULL COMMENT '令牌过期时间',
  `nickname` VARCHAR(100) COMMENT '第三方昵称',
  `avatar_url` VARCHAR(255) COMMENT '头像URL',
  `raw_data` JSON COMMENT '原始数据',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_provider_openid` (`provider`, `open_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_oauth_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='第三方账号绑定表';

-- ============================================================================
-- Phase 2: 数据隔离升级 - 添加company_id字段（35张表）
-- 目标: 确保所有业务数据按公司隔离
-- ============================================================================

-- 2.1 核心业务表（第一优先级）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1 COMMENT '所属公司ID';
ALTER TABLE customers ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE order_items ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE services ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE services ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE suppliers ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_company (company_id);

-- 2.2 组织架构表
ALTER TABLE departments ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE departments ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE teams ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE positions ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE positions ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE projects ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE areas ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE areas ADD INDEX IF NOT EXISTS idx_company (company_id);

-- 2.3 任务系统表
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE tasks ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE task_pool ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE task_pool ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE task_assignments ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE task_costs ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE task_costs ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE task_operation_logs ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE task_operation_logs ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE task_transfer_logs ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE task_transfer_logs ADD INDEX IF NOT EXISTS idx_company (company_id);

-- 2.4 配置类表
ALTER TABLE cost_categories ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE cost_categories ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE transaction_categories ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE transaction_categories ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE product_custom_fields ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE product_custom_fields ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE product_type_templates ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE product_type_templates ADD INDEX IF NOT EXISTS idx_company (company_id);

-- 2.5 其他业务表
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE customer_contacts ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE customer_memos ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE customer_memos ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE order_aftersales ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE order_aftersales ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE order_other_costs ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE order_other_costs ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE product_custom_field_values ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE product_custom_field_values ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE service_price_history ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE service_price_history ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE cost_change_logs ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE cost_change_logs ADD INDEX IF NOT EXISTS idx_company (company_id);

ALTER TABLE data_permissions ADD COLUMN IF NOT EXISTS company_id INT NOT NULL DEFAULT 1;
ALTER TABLE data_permissions ADD INDEX IF NOT EXISTS idx_company (company_id);

-- ============================================================================
-- Phase 3: companies表完善
-- 目标: 增强公司管理功能
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  `onboarding_status` VARCHAR(20) DEFAULT 'pending' COMMENT '开通状态: pending/completed';
  
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  `onboarding_token` VARCHAR(100) COMMENT '租户开通令牌（一次性）';
  
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  `onboarding_completed_at` TIMESTAMP NULL COMMENT '开通完成时间';
  
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  `admin_user_id` INT COMMENT '主账号用户ID';
  
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  `tax_number` VARCHAR(50) COMMENT '统一社会信用代码/税号';
  
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  `address` VARCHAR(255) COMMENT '公司地址';
  
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  `industry` VARCHAR(100) COMMENT '所属行业';
  
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  `employee_count` INT COMMENT '员工数量';

-- ============================================================================
-- Phase 4: 创建升级日志表
-- 目标: 记录升级过程，便于回滚
-- ============================================================================

CREATE TABLE IF NOT EXISTS `system_upgrade_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version` VARCHAR(20) NOT NULL COMMENT '升级版本',
  `phase` VARCHAR(50) NOT NULL COMMENT '阶段',
  `description` TEXT COMMENT '描述',
  `status` VARCHAR(20) DEFAULT 'success' COMMENT 'success/failed',
  `executed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY `idx_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统升级日志';

-- 记录本次升级
INSERT INTO system_upgrade_logs (version, phase, description) VALUES
('v2.0', 'Phase1', '用户体系升级：创建user_companies、添加OAuth字段'),
('v2.0', 'Phase2', '数据隔离：35张表添加company_id字段'),
('v2.0', 'Phase3', 'companies表完善：添加开通流程字段');

-- ============================================================================
-- 升级完成
-- ============================================================================

SELECT '✅ 数据库升级完成！' as message;
SELECT '请检查以下内容:' as next_steps;
SELECT '1. 验证user_companies表数据是否正确' as step_1;
SELECT '2. 验证所有表是否添加了company_id字段' as step_2;
SELECT '3. 检查索引是否创建成功' as step_3;
SELECT '4. 备份升级后的数据库' as step_4;
