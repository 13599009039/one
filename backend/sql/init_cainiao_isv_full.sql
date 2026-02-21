-- ============================================================
-- 菜鸟ISV电子面单打印系统 - 完整数据库结构
-- 多租户 + 多仓库 + 同一快递多网点
-- ============================================================

USE ajkuaiji;

-- 1. 服务商配置表（全局只用1条）
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

-- 2. 租户表（你的客户）
CREATE TABLE IF NOT EXISTS `tenant` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_name` VARCHAR(100) NOT NULL COMMENT '租户名称',
  `contact` VARCHAR(32) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `status` TINYINT DEFAULT '1' COMMENT '1正常 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户信息';

-- 3. 租户仓库表
CREATE TABLE IF NOT EXISTS `tenant_warehouse` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `warehouse_name` VARCHAR(100) NOT NULL COMMENT '仓库名称',
  `contact` VARCHAR(32) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `is_default` TINYINT DEFAULT '0',
  `status` TINYINT DEFAULT '1',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户仓库';

-- 4. 租户物流账号绑定表（核心：同一快递多网点）
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
  `auth_expire` DATETIME DEFAULT NULL,
  `is_default` TINYINT DEFAULT '0',
  `status` TINYINT DEFAULT '1' COMMENT '1启用 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_tenant_cp` (`tenant_id`,`cp_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户物流账号（多网点）';

-- 5. 租户发货地址
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

-- 6. 电子面单记录表
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

-- 7. 打印日志表
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

-- 初始化服务商配置（ISV字段留空待填）
INSERT INTO `cainiao_isv_config` (`app_key`, `app_secret`, `env`, `status`) 
VALUES ('', '', 'prod', 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SELECT '✅ 菜鸟ISV完整数据表创建成功！共7张表' AS result;
