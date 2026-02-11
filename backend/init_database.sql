-- 财务流水账系统数据库表结构
-- 数据库: ajkuaiji

-- 1. 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `alias` VARCHAR(100),
  `role` VARCHAR(50) NOT NULL,
  `company_id` INT,
  `status` VARCHAR(20) DEFAULT 'enabled',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 客户/商家表
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `merchant_id` VARCHAR(100) UNIQUE,
  `shop_name` VARCHAR(200) NOT NULL,
  `douyin_name` VARCHAR(200),
  `company_name` VARCHAR(200),
  `credit_code` VARCHAR(100),
  `legal_person` VARCHAR(100),
  `registered_capital` VARCHAR(100),
  `business_address` TEXT,
  `operating_address` TEXT,
  `cooperation_mode` VARCHAR(100),
  `category` VARCHAR(100),
  `industry` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT '跟进中',
  `follower_id` INT,
  `business_staff` VARCHAR(100),
  `service_staff` VARCHAR(100),
  `operation_staff` VARCHAR(100),
  `management_staff` VARCHAR(100),
  `team` VARCHAR(100),
  `region` VARCHAR(100),
  `project` VARCHAR(100),
  `company` VARCHAR(200),
  `tags` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_merchant_id` (`merchant_id`),
  INDEX `idx_shop_name` (`shop_name`),
  INDEX `idx_follower_id` (`follower_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 客户联系人表
CREATE TABLE IF NOT EXISTS `customer_contacts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `name` VARCHAR(100),
  `phone` VARCHAR(50),
  `position` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  INDEX `idx_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 客户备忘录表
CREATE TABLE IF NOT EXISTS `customer_memos` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `date` DATE,
  `type` VARCHAR(50),
  `content` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  INDEX `idx_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 订单表
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `customer_id` INT,
  `order_date` DATE,
  `business_staff` VARCHAR(100),
  `service_staff` VARCHAR(100),
  `operation_staff` VARCHAR(100),
  `management_staff` VARCHAR(100),
  `team` VARCHAR(100),
  `region` VARCHAR(100),
  `project` VARCHAR(100),
  `company` VARCHAR(200),
  `contract_amount` DECIMAL(15,2) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT '进行中',
  `remarks` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  INDEX `idx_customer_id` (`customer_id`),
  INDEX `idx_order_date` (`order_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 订单商品/服务项表
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `service_name` VARCHAR(200),
  `service_type` VARCHAR(100),
  `price` DECIMAL(15,2) DEFAULT 0,
  `quantity` INT DEFAULT 1,
  `total` DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  INDEX `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 任务池表
CREATE TABLE IF NOT EXISTS `task_pool` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `status` VARCHAR(50) DEFAULT '待接单',
  `assigned_user_id` INT,
  `accepted_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 业务成本类别表
CREATE TABLE IF NOT EXISTS `cost_categories` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 任务成本明细表
CREATE TABLE IF NOT EXISTS `task_costs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `category_id` INT,
  `amount` DECIMAL(15,2) DEFAULT 0,
  `remark` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `task_pool`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `cost_categories`(`id`) ON DELETE SET NULL,
  INDEX `idx_task_id` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. 财务流水表
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `transaction_type` VARCHAR(50) NOT NULL,
  `transaction_date` DATE NOT NULL,
  `payer_bank` VARCHAR(200),
  `payer_name` VARCHAR(200),
  `payee_bank` VARCHAR(200),
  `payee_name` VARCHAR(200),
  `amount` DECIMAL(15,2) NOT NULL,
  `balance_after` DECIMAL(15,2),
  `purpose` VARCHAR(200),
  `remark` TEXT,
  `account_id` INT,
  `company_id` INT,
  `created_by` INT,
  `audit_status` VARCHAR(50) DEFAULT '待审核',
  `is_void` TINYINT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_transaction_date` (`transaction_date`),
  INDEX `idx_transaction_type` (`transaction_type`),
  INDEX `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. 公司表
CREATE TABLE IF NOT EXISTS `companies` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `short_name` VARCHAR(100),
  `contact_person` VARCHAR(100),
  `contact_phone` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'active',
  `service_start_date` DATE,
  `service_fee` DECIMAL(15,2),
  `service_cycle` INT,
  `service_end_date` DATE,
  `service_status` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. 账户表
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `company_id` INT,
  `bank_name` VARCHAR(200),
  `account_number` VARCHAR(100),
  `balance` DECIMAL(15,2) DEFAULT 0,
  `initial_balance` DECIMAL(15,2) DEFAULT 0,
  `account_type` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL,
  INDEX `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. 系统设置表
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `setting_key` VARCHAR(100) UNIQUE NOT NULL,
  `setting_value` TEXT,
  `description` VARCHAR(500),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入初始系统设置
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('system_name', '财务流水账系统', '系统名称'),
('system_version', '4.6', '系统版本'),
('company_name', '许昌爱佳网络科技有限公司', '公司名称'),
('cooperation_modes', '["短视频拍摄","直播代运营","广告投放","全案服务","其他"]', '合作模式列表'),
('industries', '["餐饮","零售","美容美发","汽车服务","教育培训","医疗健康","休闲娱乐","其他"]', '行业列表')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- 插入默认业务成本类别
INSERT INTO `cost_categories` (`name`, `description`) VALUES
('拍摄费', '视频拍摄相关费用'),
('投放费', '广告投放费用'),
('人员成本', '人员工资及劳务费'),
('设备租赁', '设备租赁费用'),
('其他', '其他业务成本')
ON DUPLICATE KEY UPDATE description=VALUES(description);
