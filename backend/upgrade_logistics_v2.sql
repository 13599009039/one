-- ============================================================
-- 物流升级V2.0 - 数据库结构升级
-- 升级日期: 2026-02-16
-- ============================================================

USE ajkuaiji;

-- ============================================================
-- 1. 增强 tenant_logistics_account 表
-- ============================================================

-- 添加 auth_status 字段（授权状态）
ALTER TABLE `tenant_logistics_account` 
ADD COLUMN IF NOT EXISTS `auth_status` VARCHAR(20) DEFAULT 'unauthorized' 
COMMENT '授权状态: unauthorized未授权/authorized已授权/expired已过期' 
AFTER `auth_token`;

-- 添加索引优化查询
ALTER TABLE `tenant_logistics_account` 
ADD INDEX IF NOT EXISTS `idx_auth_status` (`auth_status`);

-- ============================================================
-- 2. 增强 tenant_warehouse 表
-- ============================================================

-- 添加省市区字段
ALTER TABLE `tenant_warehouse` 
ADD COLUMN IF NOT EXISTS `province` VARCHAR(50) DEFAULT NULL COMMENT '省份' AFTER `warehouse_name`,
ADD COLUMN IF NOT EXISTS `city` VARCHAR(50) DEFAULT NULL COMMENT '城市' AFTER `province`,
ADD COLUMN IF NOT EXISTS `district` VARCHAR(50) DEFAULT NULL COMMENT '区县' AFTER `city`;

-- 修改地址字段长度
ALTER TABLE `tenant_warehouse` 
MODIFY COLUMN `address` VARCHAR(500) DEFAULT NULL;

-- 添加字段：联系人名称（原来是contact）
ALTER TABLE `tenant_warehouse` 
ADD COLUMN IF NOT EXISTS `contact_name` VARCHAR(50) DEFAULT NULL COMMENT '联系人姓名' AFTER `warehouse_name`;

-- ============================================================
-- 3. 增强 orders 表（添加物流相关字段）
-- ============================================================

-- 添加物流账号ID
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `logistics_account_id` INT DEFAULT NULL COMMENT '物流账号ID' AFTER `company_id`;

-- 添加发货仓库ID
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `warehouse_id` INT DEFAULT NULL COMMENT '发货仓库ID' AFTER `logistics_account_id`;

-- 添加运单号
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `waybill_code` VARCHAR(100) DEFAULT NULL COMMENT '运单号' AFTER `warehouse_id`;

-- 添加发货时间
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `shipping_time` DATETIME DEFAULT NULL COMMENT '发货时间' AFTER `waybill_code`;

-- 添加收货信息（如果不存在）
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `receiver_name` VARCHAR(100) DEFAULT NULL COMMENT '收件人姓名' AFTER `shipping_time`,
ADD COLUMN IF NOT EXISTS `receiver_phone` VARCHAR(50) DEFAULT NULL COMMENT '收件人电话' AFTER `receiver_name`,
ADD COLUMN IF NOT EXISTS `receiver_province` VARCHAR(50) DEFAULT NULL COMMENT '收件人省份' AFTER `receiver_phone`,
ADD COLUMN IF NOT EXISTS `receiver_city` VARCHAR(50) DEFAULT NULL COMMENT '收件人城市' AFTER `receiver_province`,
ADD COLUMN IF NOT EXISTS `receiver_district` VARCHAR(50) DEFAULT NULL COMMENT '收件人区县' AFTER `receiver_city`,
ADD COLUMN IF NOT EXISTS `receiver_address` VARCHAR(500) DEFAULT NULL COMMENT '收件人详细地址' AFTER `receiver_district`;

-- 添加索引
ALTER TABLE `orders` 
ADD INDEX IF NOT EXISTS `idx_logistics_account` (`logistics_account_id`),
ADD INDEX IF NOT EXISTS `idx_warehouse` (`warehouse_id`),
ADD INDEX IF NOT EXISTS `idx_waybill_code` (`waybill_code`);

-- ============================================================
-- 4. 创建缺失的表（如果不存在）
-- ============================================================

-- 确保所有菜鸟ISV相关表都已创建
-- （如果已存在则跳过）

CREATE TABLE IF NOT EXISTS `cainiao_isv_config` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `app_key` VARCHAR(64) NOT NULL COMMENT '菜鸟ISV应用AppKey',
  `app_secret` VARCHAR(128) NOT NULL COMMENT '密钥',
  `callback_url` VARCHAR(255) DEFAULT NULL COMMENT '授权回调地址',
  `env` VARCHAR(32) DEFAULT 'prod' COMMENT '环境：test/prod',
  `status` TINYINT DEFAULT '1' COMMENT '1启用 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜鸟ISV服务商配置';

CREATE TABLE IF NOT EXISTS `tenant` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_name` VARCHAR(100) NOT NULL COMMENT '租户名称',
  `contact` VARCHAR(32) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `status` TINYINT DEFAULT '1' COMMENT '1正常 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户信息';

CREATE TABLE IF NOT EXISTS `tenant_warehouse` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `warehouse_name` VARCHAR(100) NOT NULL COMMENT '仓库名称',
  `contact_name` VARCHAR(50) DEFAULT NULL COMMENT '联系人姓名',
  `contact` VARCHAR(32) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `province` VARCHAR(50) DEFAULT NULL COMMENT '省份',
  `city` VARCHAR(50) DEFAULT NULL COMMENT '城市',
  `district` VARCHAR(50) DEFAULT NULL COMMENT '区县',
  `address` VARCHAR(500) DEFAULT NULL,
  `is_default` TINYINT DEFAULT '0',
  `status` TINYINT DEFAULT '1',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户仓库';

CREATE TABLE IF NOT EXISTS `tenant_logistics_account` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `warehouse_id` BIGINT DEFAULT NULL COMMENT '所属仓库',
  `cp_code` VARCHAR(32) NOT NULL COMMENT '快递编码 ZTO/YTO/YD等',
  `cp_name` VARCHAR(32) NOT NULL COMMENT '快递名称',
  `branch_name` VARCHAR(100) DEFAULT NULL COMMENT '网点/分部名称',
  `partner_id` VARCHAR(64) DEFAULT NULL COMMENT '快递客户编码',
  `account` VARCHAR(64) DEFAULT NULL COMMENT '账号',
  `password` TEXT DEFAULT NULL COMMENT '密码/密钥加密存储',
  `auth_token` TEXT DEFAULT NULL COMMENT '菜鸟授权Token',
  `auth_status` VARCHAR(20) DEFAULT 'unauthorized' COMMENT '授权状态',
  `auth_expire` DATETIME DEFAULT NULL,
  `is_default` TINYINT DEFAULT '0',
  `status` TINYINT DEFAULT '1' COMMENT '1启用 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_tenant_cp` (`tenant_id`,`cp_code`),
  KEY `idx_auth_status` (`auth_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户物流账号（多网点）';

CREATE TABLE IF NOT EXISTS `tenant_shipping_address` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `warehouse_id` BIGINT DEFAULT NULL,
  `logistics_account_id` BIGINT DEFAULT NULL COMMENT '绑定的物流账号',
  `sender_name` VARCHAR(32) NOT NULL,
  `sender_phone` VARCHAR(32) NOT NULL,
  `province` VARCHAR(32) DEFAULT NULL,
  `city` VARCHAR(32) DEFAULT NULL,
  `area` VARCHAR(32) DEFAULT NULL,
  `address` VARCHAR(255) NOT NULL,
  `is_default` TINYINT DEFAULT '0',
  `status` TINYINT DEFAULT '1',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发货地址';

CREATE TABLE IF NOT EXISTS `waybill_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `order_no` VARCHAR(64) NOT NULL COMMENT '订单号',
  `logistics_account_id` BIGINT NOT NULL,
  `cp_code` VARCHAR(32) NOT NULL,
  `waybill_code` VARCHAR(64) DEFAULT NULL COMMENT '运单号',
  `print_data` LONGTEXT COMMENT '打印数据',
  `receiver_name` VARCHAR(32) DEFAULT NULL,
  `receiver_phone` VARCHAR(32) DEFAULT NULL,
  `receiver_address` VARCHAR(255) DEFAULT NULL,
  `print_status` TINYINT DEFAULT '0' COMMENT '0未打印 1已打印 2打印失败',
  `print_time` DATETIME DEFAULT NULL,
  `cancel_status` TINYINT DEFAULT '0' COMMENT '0正常 1已取消',
  `cancel_time` DATETIME DEFAULT NULL,
  `confirm_status` TINYINT DEFAULT '0' COMMENT '0未发货 1已发货',
  `confirm_time` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_order_no` (`order_no`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_waybill` (`waybill_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='电子面单记录';

CREATE TABLE IF NOT EXISTS `print_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `waybill_id` BIGINT NOT NULL,
  `order_no` VARCHAR(64) NOT NULL,
  `printer_name` VARCHAR(100) DEFAULT NULL,
  `operate_type` VARCHAR(32) DEFAULT NULL COMMENT 'single/batch/reprint',
  `status` TINYINT DEFAULT '0' COMMENT '1成功 0失败',
  `error_msg` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_order` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印日志';

-- ============================================================
-- 5. 数据迁移和优化
-- ============================================================

-- 如果有现有订单，初始化物流状态
-- UPDATE `orders` SET `status` = '待发货' WHERE `status` = '进行中' AND `waybill_code` IS NULL;

SELECT '✅ 物流升级V2.0数据库结构升级完成！' AS result;
SELECT '✅ 新增字段：orders表增加物流相关字段' AS result;
SELECT '✅ 表结构检查：所有物流相关表已就绪' AS result;
