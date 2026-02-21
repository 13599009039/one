-- ============================================================
-- SaaS平台物流控制台数据库表
-- 用于菜鸟物流云对接
-- 创建日期: 2026-02-15
-- ============================================================

-- 1. 平台菜鸟账号配置表
CREATE TABLE IF NOT EXISTS `platform_cainiao_config` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    
    -- 菜鸟账号信息
    `app_key` VARCHAR(200) NOT NULL COMMENT '菜鸟AppKey',
    `app_secret` VARCHAR(500) NOT NULL COMMENT '菜鸟AppSecret（加密存储）',
    `endpoint_url` VARCHAR(500) DEFAULT 'https://link.cainiao.com/gateway/link.do' COMMENT '接入点地址',
    `sign_method` VARCHAR(50) DEFAULT 'md5' COMMENT '签名方式: md5/hmac',
    
    -- 回调配置
    `callback_url` VARCHAR(500) COMMENT '状态回调地址（Webhook）',
    `callback_secret` VARCHAR(200) COMMENT '回调验签密钥',
    
    -- 状态
    `status` VARCHAR(20) DEFAULT 'enabled' COMMENT 'enabled/disabled',
    `test_passed` TINYINT(1) DEFAULT 0 COMMENT '连通性测试是否通过',
    `last_test_at` DATETIME DEFAULT NULL COMMENT '最后测试时间',
    `test_error` TEXT COMMENT '测试失败错误信息',
    
    -- 审计字段
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台菜鸟账号配置';


-- 2. 快递规则配置表
CREATE TABLE IF NOT EXISTS `platform_express_rules` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `rule_name` VARCHAR(100) NOT NULL COMMENT '规则名称',
    
    -- 快递公司
    `cp_code` VARCHAR(50) NOT NULL COMMENT '快递公司编码（如YTO/ZTO/SF）',
    `cp_name` VARCHAR(100) COMMENT '快递公司名称',
    
    -- 默认寄件人信息
    `sender_name` VARCHAR(100) COMMENT '默认寄件人姓名',
    `sender_phone` VARCHAR(50) COMMENT '默认寄件人电话',
    `sender_province` VARCHAR(50) COMMENT '省',
    `sender_city` VARCHAR(50) COMMENT '市',
    `sender_district` VARCHAR(50) COMMENT '区',
    `sender_town` VARCHAR(50) COMMENT '镇/街道',
    `sender_address` VARCHAR(500) COMMENT '详细地址',
    
    -- 业务配置
    `service_type` VARCHAR(50) DEFAULT 'STANDARD' COMMENT '服务类型',
    `pay_method` VARCHAR(20) DEFAULT 'PREPAY' COMMENT '付款方式: PREPAY预付/COLLECT到付',
    
    -- 状态
    `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认规则',
    `status` VARCHAR(20) DEFAULT 'enabled',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_cp_code` (`cp_code`),
    INDEX `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快递规则配置';


-- 3. 快递订单表（核心表）
CREATE TABLE IF NOT EXISTS `platform_express_orders` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    
    -- 菜鸟订单信息
    `cainiao_order_id` VARCHAR(100) COMMENT '菜鸟订单号',
    `mail_no` VARCHAR(100) COMMENT '快递运单号（取件后返回）',
    `cp_code` VARCHAR(50) NOT NULL COMMENT '快递公司编码',
    `cp_name` VARCHAR(100) COMMENT '快递公司名称',
    
    -- 电子面单信息
    `waybill_no` VARCHAR(100) COMMENT '电子面单号（TMS_WAYBILL_GET返回）',
    `waybill_status` VARCHAR(20) DEFAULT 'unused' COMMENT '面单状态：unused未使用/used已使用/invalid已作废',
    `waybill_get_time` DATETIME COMMENT '面单获取时间',
    `print_data` JSON COMMENT '面单打印数据（菜鸟返回）',
    
    -- 寄件人信息
    `sender_name` VARCHAR(100) NOT NULL,
    `sender_phone` VARCHAR(50) NOT NULL,
    `sender_province` VARCHAR(50),
    `sender_city` VARCHAR(50),
    `sender_district` VARCHAR(50),
    `sender_town` VARCHAR(50),
    `sender_address` VARCHAR(500),
    
    -- 收件人信息
    `receiver_name` VARCHAR(100) NOT NULL,
    `receiver_phone` VARCHAR(50) NOT NULL,
    `receiver_province` VARCHAR(50),
    `receiver_city` VARCHAR(50),
    `receiver_district` VARCHAR(50),
    `receiver_town` VARCHAR(50),
    `receiver_address` VARCHAR(500),
    
    -- 物品信息
    `goods_name` VARCHAR(200) COMMENT '物品名称',
    `goods_count` INT DEFAULT 1 COMMENT '物品数量',
    `weight` DECIMAL(10,3) COMMENT '重量(kg)',
    `volume` DECIMAL(10,3) COMMENT '体积(m³)',
    `remark` VARCHAR(500) COMMENT '备注',
    
    -- 网点信息
    `branch_code` VARCHAR(50) COMMENT '网点编码',
    `branch_name` VARCHAR(100) COMMENT '网点名称',
    `branch_phone` VARCHAR(50) COMMENT '网点电话',
    `courier_name` VARCHAR(50) COMMENT '快递员姓名',
    `courier_phone` VARCHAR(50) COMMENT '快递员电话',
    
    -- 订单状态
    -- 状态枚举：
    -- created: 已创建（待获取面单号）
    -- waybill_created: 已获取面单号（待派单）- 可取消
    -- dispatched: 已派单（快递员已接单）
    -- picked: 已取件（已扫码面单）
    -- in_transit: 运输中
    -- delivering: 派送中
    -- signed: 已签收
    -- rejected: 已拒收
    -- exception: 异常
    -- cancelled: 已取消（仅 created/waybill_created 状态可取消）
    `status` VARCHAR(30) DEFAULT 'created' COMMENT '状态',
    `status_desc` VARCHAR(200) COMMENT '状态描述',
    `exception_reason` VARCHAR(500) COMMENT '异常原因',
    `cancel_reason` VARCHAR(500) COMMENT '取消原因',
    
    -- 费用信息
    `freight` DECIMAL(10,2) DEFAULT 0.00 COMMENT '运费',
    `pay_method` VARCHAR(20) DEFAULT 'PREPAY' COMMENT '付款方式',
    
    -- 物流轨迹
    `track_info` JSON COMMENT '物流轨迹（JSON数组）',
    `last_track_time` DATETIME COMMENT '最后轨迹时间',
    `last_track_desc` VARCHAR(500) COMMENT '最后轨迹描述',
    
    -- 时间节点
    `waybill_time` DATETIME COMMENT '面单获取时间',
    `dispatch_time` DATETIME COMMENT '派单时间',
    `pick_time` DATETIME COMMENT '取件时间',
    `sign_time` DATETIME COMMENT '签收时间',
    `cancel_time` DATETIME COMMENT '取消时间',
    
    -- 关联信息
    `tenant_id` INT DEFAULT NULL COMMENT '关联租户ID',
    `tenant_order_id` INT DEFAULT NULL COMMENT '关联租户系统订单ID',
    `rule_id` INT DEFAULT NULL COMMENT '使用的规则ID',
    
    -- 审计字段
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    
    INDEX `idx_cainiao_order_id` (`cainiao_order_id`),
    INDEX `idx_mail_no` (`mail_no`),
    INDEX `idx_waybill_no` (`waybill_no`),
    INDEX `idx_waybill_status` (`waybill_status`),
    INDEX `idx_status` (`status`),
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_cp_code` (`cp_code`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台快递订单表';


-- 4. 租户配额管理表
CREATE TABLE IF NOT EXISTS `platform_tenant_quota` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `tenant_id` INT NOT NULL COMMENT '租户ID（关联companies.id）',
    `tenant_name` VARCHAR(200) COMMENT '租户名称（冗余）',
    
    -- 配额设置
    `monthly_free_quota` INT DEFAULT 0 COMMENT '每月免费配额',
    `monthly_used` INT DEFAULT 0 COMMENT '本月已使用',
    `total_used` INT DEFAULT 0 COMMENT '累计使用总量',
    
    -- 超额计费
    `overage_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否允许超额',
    `overage_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '超额单价（元/单）',
    `overage_used` INT DEFAULT 0 COMMENT '本月超额使用',
    `overage_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '本月超额费用',
    
    -- 配额周期
    `quota_reset_day` INT DEFAULT 1 COMMENT '配额重置日（每月几号）',
    `last_reset_at` DATE DEFAULT NULL COMMENT '上次重置日期',
    
    -- 状态
    `status` VARCHAR(20) DEFAULT 'enabled' COMMENT 'enabled/disabled/suspended',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY `uk_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户物流配额管理';


-- 5. 租户配额使用明细表
CREATE TABLE IF NOT EXISTS `platform_tenant_quota_detail` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `tenant_id` INT NOT NULL COMMENT '租户ID',
    `order_id` INT NOT NULL COMMENT '关联快递订单ID',
    
    -- 配额类型
    `quota_type` VARCHAR(20) DEFAULT 'normal' COMMENT 'normal正常配额/overage超额',
    `used_num` INT DEFAULT 1 COMMENT '使用数量',
    `amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '费用（超额时）',
    
    -- 关联信息
    `waybill_no` VARCHAR(100) COMMENT '关联面单号',
    `cp_code` VARCHAR(50) COMMENT '快递公司',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户配额使用明细';


-- 6. 菜鸟接口调用日志表
CREATE TABLE IF NOT EXISTS `platform_cainiao_logs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    
    -- API信息
    `api_method` VARCHAR(100) NOT NULL COMMENT 'API方法名',
    `api_version` VARCHAR(20) COMMENT 'API版本',
    
    -- 请求信息
    `request_id` VARCHAR(100) COMMENT '请求唯一ID',
    `request_params` JSON COMMENT '请求参数（脱敏）',
    `request_time` DATETIME NOT NULL COMMENT '请求时间',
    
    -- 响应信息
    `response_code` VARCHAR(50) COMMENT '响应码',
    `response_sub_code` VARCHAR(50) COMMENT '子响应码',
    `response_msg` VARCHAR(500) COMMENT '响应消息',
    `response_data` JSON COMMENT '响应数据（脱敏）',
    `response_time` DATETIME COMMENT '响应时间',
    
    -- 性能指标
    `duration_ms` INT COMMENT '耗时(毫秒)',
    
    -- 关联信息
    `tenant_id` INT DEFAULT NULL COMMENT '关联租户',
    `order_id` INT DEFAULT NULL COMMENT '关联快递订单ID',
    
    -- 结果状态
    `success` TINYINT(1) DEFAULT 0 COMMENT '是否成功',
    `error_type` VARCHAR(50) COMMENT '错误类型: network/auth/business/system',
    `error_detail` TEXT COMMENT '错误详情',
    
    -- IP信息
    `client_ip` VARCHAR(50) COMMENT '客户端IP',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_api_method` (`api_method`),
    INDEX `idx_request_time` (`request_time`),
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_success` (`success`),
    INDEX `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜鸟接口调用日志';


-- 7. 回调幂等性记录表
CREATE TABLE IF NOT EXISTS `platform_callback_records` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    
    -- 回调唯一标识
    `callback_id` VARCHAR(200) NOT NULL COMMENT '回调唯一ID（cainiao_order_id + callback_type）',
    `callback_type` VARCHAR(50) COMMENT '回调类型',
    
    -- 关联信息
    `cainiao_order_id` VARCHAR(100) COMMENT '菜鸟订单号',
    `order_id` INT COMMENT '本地订单ID',
    
    -- 处理状态
    `processed` TINYINT(1) DEFAULT 1 COMMENT '是否已处理',
    `process_time` DATETIME COMMENT '处理时间',
    `process_result` VARCHAR(500) COMMENT '处理结果',
    
    -- 原始数据
    `raw_data` JSON COMMENT '原始回调数据',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY `uk_callback_id` (`callback_id`),
    INDEX `idx_cainiao_order_id` (`cainiao_order_id`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回调幂等性记录';


-- 执行完成提示
SELECT '平台物流控制台数据库表创建完成' AS message;
