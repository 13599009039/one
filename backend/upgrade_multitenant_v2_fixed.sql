-- ============================================================================
-- 多租户SaaS系统数据库升级脚本 v2.0 (Fixed)
-- 创建日期: 2026-02-14
-- 说明: 升级现有单租户系统为多租户SaaS架构
-- 
-- 执行前备份: mysqldump -uajkuaiji -p ajkuaiji > backup_$(date +%Y%m%d).sql
-- 执行命令: mysql -uajkuaiji -p'@HNzb5z75b16' ajkuaiji < upgrade_multitenant_v2_fixed.sql
-- ============================================================================

USE ajkuaiji;

SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ALLOW_INVALID_DATES';

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

-- 1.3 users表添加第三方登录字段（安全方式）
SET @dbname = DATABASE();
SET @tablename = 'users';

-- 添加uuid字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'uuid'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE users ADD COLUMN `uuid` VARCHAR(36) UNIQUE COMMENT ''全局唯一UUID''',
  'SELECT ''Column uuid already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加dingtalk_openid字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'dingtalk_openid'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE users ADD COLUMN `dingtalk_openid` VARCHAR(100) UNIQUE COMMENT ''钉钉OpenID''',
  'SELECT ''Column dingtalk_openid already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加wechat_openid字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'wechat_openid'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE users ADD COLUMN `wechat_openid` VARCHAR(100) UNIQUE COMMENT ''微信OpenID''',
  'SELECT ''Column wechat_openid already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加feishu_open_id字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'feishu_open_id'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE users ADD COLUMN `feishu_open_id` VARCHAR(100) UNIQUE COMMENT ''飞书OpenID''',
  'SELECT ''Column feishu_open_id already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加login_type字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'login_type'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE users ADD COLUMN `login_type` VARCHAR(20) DEFAULT ''password'' COMMENT ''登录方式：password/dingtalk/wechat/feishu''',
  'SELECT ''Column login_type already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加last_login_at字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'last_login_at'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE users ADD COLUMN `last_login_at` TIMESTAMP NULL COMMENT ''最后登录时间''',
  'SELECT ''Column last_login_at already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加last_login_company_id字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'last_login_company_id'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE users ADD COLUMN `last_login_company_id` INT NULL COMMENT ''最后登录的公司ID''',
  'SELECT ''Column last_login_company_id already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

-- 创建辅助存储过程：安全添加company_id字段和索引
DELIMITER $$

DROP PROCEDURE IF EXISTS add_company_id_column$$
CREATE PROCEDURE add_company_id_column(IN table_name VARCHAR(64))
BEGIN
    DECLARE column_count INT;
    DECLARE index_count INT;
    
    -- 检查字段是否存在
    SELECT COUNT(*) INTO column_count
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = table_name 
    AND COLUMN_NAME = 'company_id';
    
    -- 如果字段不存在，添加字段
    IF column_count = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `company_id` INT NOT NULL DEFAULT 1 COMMENT ''所属公司ID''');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
    
    -- 检查索引是否存在
    SELECT COUNT(*) INTO index_count
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = table_name 
    AND INDEX_NAME = 'idx_company';
    
    -- 如果索引不存在，添加索引
    IF index_count = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', table_name, '` ADD INDEX `idx_company` (`company_id`)');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- 2.1 核心业务表（第一优先级）
CALL add_company_id_column('customers');
CALL add_company_id_column('orders');
CALL add_company_id_column('order_items');
CALL add_company_id_column('services');
CALL add_company_id_column('suppliers');
CALL add_company_id_column('purchases');

-- 2.2 组织架构表
CALL add_company_id_column('departments');
CALL add_company_id_column('teams');
CALL add_company_id_column('positions');
CALL add_company_id_column('projects');
CALL add_company_id_column('areas');

-- 2.3 任务系统表
CALL add_company_id_column('tasks');
CALL add_company_id_column('task_pool');
CALL add_company_id_column('task_assignments');
CALL add_company_id_column('task_costs');
CALL add_company_id_column('task_operation_logs');
CALL add_company_id_column('task_transfer_logs');

-- 2.4 配置类表
CALL add_company_id_column('cost_categories');
CALL add_company_id_column('transaction_categories');
CALL add_company_id_column('product_custom_fields');
CALL add_company_id_column('product_type_templates');

-- 2.5 其他业务表
CALL add_company_id_column('customer_contacts');
CALL add_company_id_column('customer_memos');
CALL add_company_id_column('order_aftersales');
CALL add_company_id_column('order_other_costs');
CALL add_company_id_column('product_custom_field_values');
CALL add_company_id_column('service_price_history');
CALL add_company_id_column('cost_change_logs');
CALL add_company_id_column('data_permissions');

-- 清理存储过程
DROP PROCEDURE IF EXISTS add_company_id_column;

-- ============================================================================
-- Phase 3: companies表完善
-- 目标: 增强公司管理功能
-- ============================================================================

SET @tablename = 'companies';

-- 添加onboarding_status字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'onboarding_status'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE companies ADD COLUMN `onboarding_status` VARCHAR(20) DEFAULT ''pending'' COMMENT ''开通状态: pending/completed''',
  'SELECT ''Column onboarding_status already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加onboarding_token字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'onboarding_token'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE companies ADD COLUMN `onboarding_token` VARCHAR(100) COMMENT ''租户开通令牌（一次性）''',
  'SELECT ''Column onboarding_token already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加onboarding_completed_at字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'onboarding_completed_at'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE companies ADD COLUMN `onboarding_completed_at` TIMESTAMP NULL COMMENT ''开通完成时间''',
  'SELECT ''Column onboarding_completed_at already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加admin_user_id字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'admin_user_id'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE companies ADD COLUMN `admin_user_id` INT COMMENT ''主账号用户ID''',
  'SELECT ''Column admin_user_id already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加tax_number字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'tax_number'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE companies ADD COLUMN `tax_number` VARCHAR(50) COMMENT ''统一社会信用代码/税号''',
  'SELECT ''Column tax_number already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加address字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'address'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE companies ADD COLUMN `address` VARCHAR(255) COMMENT ''公司地址''',
  'SELECT ''Column address already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加industry字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'industry'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE companies ADD COLUMN `industry` VARCHAR(100) COMMENT ''所属行业''',
  'SELECT ''Column industry already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加employee_count字段
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'employee_count'
);
SET @sql_text = IF(@column_exists = 0, 
  'ALTER TABLE companies ADD COLUMN `employee_count` INT COMMENT ''员工数量''',
  'SELECT ''Column employee_count already exists'' AS Info'
);
PREPARE stmt FROM @sql_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

SET SQL_MODE=@OLD_SQL_MODE;

-- ============================================================================
-- 升级完成
-- ============================================================================

SELECT '✅ 数据库升级完成！' as message;
SELECT '请检查以下内容:' as next_steps;
SELECT '1. 验证user_companies表数据是否正确' as step_1;
SELECT '2. 验证所有表是否添加了company_id字段' as step_2;
SELECT '3. 检查索引是否创建成功' as step_3;
SELECT '4. 备份升级后的数据库' as step_4;
