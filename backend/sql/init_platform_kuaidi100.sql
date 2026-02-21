-- ==========================================
-- 快递100物流服务商配置表
-- ==========================================

USE ajkuaiji;

-- 快递100账号配置表
CREATE TABLE IF NOT EXISTS `platform_kuaidi100_config` (
  `id` INT(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `customer` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '客户编码（快递100分配）',
  `auth_key` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '授权Key',
  `secret` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '签名密钥',
  `endpoint_url` VARCHAR(500) NOT NULL DEFAULT 'https://poll.kuaidi100.com' COMMENT 'API接入点地址',
  `sign_method` VARCHAR(20) NOT NULL DEFAULT 'md5' COMMENT '签名方式：md5/hmac',
  `callback_url` VARCHAR(500) DEFAULT '' COMMENT '回调地址（订阅推送）',
  `callback_secret` VARCHAR(255) DEFAULT '' COMMENT '回调验签密钥',
  `test_passed` TINYINT(1) DEFAULT 0 COMMENT '连接测试是否通过：0未通过 1已通过',
  `last_test_at` DATETIME DEFAULT NULL COMMENT '最后测试时间',
  `test_error` TEXT COMMENT '测试失败错误信息',
  `status` VARCHAR(20) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled/disabled',
  `remark` TEXT COMMENT '备注说明',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快递100账号配置表';

-- 快递100电子面单订单表（与platform_express_orders对应）
CREATE TABLE IF NOT EXISTS `platform_kuaidi100_orders` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '快递100订单号',
  `kuaidicom` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '快递公司编码（如顺丰SF）',
  `recman_name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '收件人姓名',
  `recman_mobile` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '收件人手机',
  `recman_printaddr` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '收件人地址',
  `sendman_name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '寄件人姓名',
  `sendman_mobile` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '寄件人手机',
  `sendman_printaddr` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '寄件人地址',
  `cargo` VARCHAR(200) DEFAULT '' COMMENT '物品名称',
  `weight` DECIMAL(10,2) DEFAULT NULL COMMENT '重量（kg）',
  `remark` VARCHAR(500) DEFAULT '' COMMENT '备注',
  `waybill_no` VARCHAR(100) DEFAULT '' COMMENT '快递单号',
  `waybill_status` VARCHAR(20) DEFAULT 'unused' COMMENT '面单状态：unused/used/invalid',
  `print_data` TEXT COMMENT '电子面单打印数据（JSON）',
  `status` VARCHAR(50) NOT NULL DEFAULT 'created' COMMENT '订单状态',
  `tenant_id` INT(11) DEFAULT NULL COMMENT '关联租户ID',
  `tenant_order_id` BIGINT(20) DEFAULT NULL COMMENT '关联租户订单ID',
  `fee` DECIMAL(10,2) DEFAULT NULL COMMENT '运费',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_waybill_no` (`waybill_no`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快递100电子面单订单表';

-- 快递100API调用日志表
CREATE TABLE IF NOT EXISTS `platform_kuaidi100_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `api_method` VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'API方法名',
  `request_id` VARCHAR(100) DEFAULT '' COMMENT '请求唯一ID',
  `request_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '请求时间',
  `response_time` DATETIME DEFAULT NULL COMMENT '响应时间',
  `duration_ms` INT(11) DEFAULT NULL COMMENT '耗时（毫秒）',
  `success` TINYINT(1) DEFAULT 0 COMMENT '是否成功：0失败 1成功',
  `response_code` VARCHAR(50) DEFAULT '' COMMENT '响应码',
  `response_message` TEXT COMMENT '响应消息',
  `error_type` VARCHAR(50) DEFAULT '' COMMENT '错误类型',
  `tenant_id` INT(11) DEFAULT NULL COMMENT '关联租户',
  `order_id` BIGINT(20) DEFAULT NULL COMMENT '关联订单',
  `request_data` TEXT COMMENT '请求数据（脱敏后）',
  `response_data` TEXT COMMENT '响应数据（脱敏后）',
  PRIMARY KEY (`id`),
  KEY `idx_api_method` (`api_method`),
  KEY `idx_request_time` (`request_time`),
  KEY `idx_success` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快递100API调用日志表';

SELECT '✅ 快递100数据库表创建完成！共3张表：platform_kuaidi100_config、platform_kuaidi100_orders、platform_kuaidi100_logs' AS result;
