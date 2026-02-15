-- 物流管理系统数据库表结构
-- 创建日期: 2026-02-13
-- 模块说明: 支持物流订单跟踪、多物流平台接口授权配置、快递面单打印
-- 多租户隔离: 所有表均包含company_id字段，严格按租户隔离数据

-- ==============================================================================
-- 1. 物流平台配置表 (logistics_config)
-- 存储各租户的物流平台授权配置信息（敏感信息加密存储）
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `logistics_config` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `company_id` INT NOT NULL COMMENT '租户ID（核心隔离字段）',
    `platform` VARCHAR(50) NOT NULL COMMENT '物流平台标识: cainiao/jd/sf/doudian/pdd/xiaohongshu/wxshop/kuaidi100',
    `platform_name` VARCHAR(100) NOT NULL COMMENT '平台显示名称',
    `shop_id` VARCHAR(100) DEFAULT NULL COMMENT '店铺ID（电商平台多店铺场景）',
    `shop_name` VARCHAR(200) DEFAULT NULL COMMENT '店铺名称',
    
    -- 通用配置字段（加密存储）
    `app_key` VARCHAR(500) DEFAULT NULL COMMENT 'AppKey/API账号',
    `app_secret` VARCHAR(500) DEFAULT NULL COMMENT 'AppSecret/API密码（加密）',
    `access_token` VARCHAR(1000) DEFAULT NULL COMMENT '授权Token（加密）',
    `refresh_token` VARCHAR(1000) DEFAULT NULL COMMENT '刷新Token（加密）',
    `token_expires_at` DATETIME DEFAULT NULL COMMENT 'Token过期时间',
    
    -- 平台特有配置（JSON格式存储扩展字段）
    `extra_config` JSON DEFAULT NULL COMMENT '平台特有配置项（如仓库编码、月结账号等）',
    
    -- 状态控制
    `status` VARCHAR(20) DEFAULT 'enabled' COMMENT '状态: enabled/disabled',
    `last_sync_at` DATETIME DEFAULT NULL COMMENT '最后同步时间',
    `sync_error` TEXT DEFAULT NULL COMMENT '最近同步错误信息',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL COMMENT '创建人ID',
    `updated_by` INT DEFAULT NULL COMMENT '更新人ID',
    
    INDEX `idx_company_id` (`company_id`),
    INDEX `idx_platform` (`platform`),
    INDEX `idx_company_platform` (`company_id`, `platform`),
    INDEX `idx_status` (`status`),
    UNIQUE KEY `uk_company_platform_shop` (`company_id`, `platform`, `shop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流平台配置表';

-- ==============================================================================
-- 2. 物流订单表 (logistics_orders)
-- 存储物流订单信息，关联系统销售订单
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `logistics_orders` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `company_id` INT NOT NULL COMMENT '租户ID（核心隔离字段）',
    `order_id` INT DEFAULT NULL COMMENT '关联系统订单ID',
    `order_no` VARCHAR(100) DEFAULT NULL COMMENT '系统订单编号（冗余便于查询）',
    
    -- 物流基础信息
    `logistics_no` VARCHAR(100) DEFAULT NULL COMMENT '物流运单号',
    `platform` VARCHAR(50) NOT NULL COMMENT '物流平台标识',
    `platform_name` VARCHAR(100) DEFAULT NULL COMMENT '物流平台显示名称',
    `carrier` VARCHAR(100) DEFAULT NULL COMMENT '承运商（如顺丰、中通等）',
    `carrier_code` VARCHAR(50) DEFAULT NULL COMMENT '承运商编码',
    
    -- 收件人信息（脱敏存储）
    `receiver_name` VARCHAR(100) DEFAULT NULL COMMENT '收件人姓名',
    `receiver_phone` VARCHAR(50) DEFAULT NULL COMMENT '收件人手机号',
    `receiver_province` VARCHAR(50) DEFAULT NULL COMMENT '省',
    `receiver_city` VARCHAR(50) DEFAULT NULL COMMENT '市',
    `receiver_district` VARCHAR(50) DEFAULT NULL COMMENT '区',
    `receiver_address` VARCHAR(500) DEFAULT NULL COMMENT '详细地址',
    
    -- 寄件人信息
    `sender_name` VARCHAR(100) DEFAULT NULL COMMENT '寄件人姓名',
    `sender_phone` VARCHAR(50) DEFAULT NULL COMMENT '寄件人手机号',
    `sender_address` VARCHAR(500) DEFAULT NULL COMMENT '寄件人地址',
    
    -- 物流状态
    `status` VARCHAR(50) DEFAULT 'pending' COMMENT '状态: pending待发货/shipped已发货/in_transit运输中/delivered已签收/exception异常/returned退回',
    `status_desc` VARCHAR(200) DEFAULT NULL COMMENT '状态描述',
    `exception_reason` VARCHAR(500) DEFAULT NULL COMMENT '异常原因',
    
    -- 物流轨迹（JSON数组）
    `track_info` JSON DEFAULT NULL COMMENT '物流轨迹信息（JSON数组）',
    `last_track_time` DATETIME DEFAULT NULL COMMENT '最后轨迹时间',
    `last_track_desc` VARCHAR(500) DEFAULT NULL COMMENT '最后轨迹描述',
    
    -- 费用信息
    `freight` DECIMAL(10,2) DEFAULT 0.00 COMMENT '运费',
    `weight` DECIMAL(10,3) DEFAULT NULL COMMENT '重量(kg)',
    `volume` DECIMAL(10,3) DEFAULT NULL COMMENT '体积(m³)',
    
    -- 面单信息
    `waybill_printed` TINYINT(1) DEFAULT 0 COMMENT '是否已打印面单',
    `waybill_print_count` INT DEFAULT 0 COMMENT '面单打印次数',
    `last_print_at` DATETIME DEFAULT NULL COMMENT '最后打印时间',
    `print_template_id` INT DEFAULT NULL COMMENT '打印模板ID',
    
    -- 时间节点
    `ship_time` DATETIME DEFAULT NULL COMMENT '发货时间',
    `deliver_time` DATETIME DEFAULT NULL COMMENT '签收时间',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL COMMENT '创建人ID',
    
    INDEX `idx_company_id` (`company_id`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_logistics_no` (`logistics_no`),
    INDEX `idx_platform` (`platform`),
    INDEX `idx_status` (`status`),
    INDEX `idx_company_status` (`company_id`, `status`),
    INDEX `idx_ship_time` (`ship_time`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流订单表';

-- ==============================================================================
-- 3. 面单打印模板表 (print_templates)
-- 存储各租户的面单打印模板配置
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `print_templates` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `company_id` INT NOT NULL COMMENT '租户ID（核心隔离字段）',
    `name` VARCHAR(200) NOT NULL COMMENT '模板名称',
    `carrier` VARCHAR(100) DEFAULT NULL COMMENT '适用承运商',
    `carrier_code` VARCHAR(50) DEFAULT NULL COMMENT '承运商编码',
    
    -- 快递100相关
    `kuaidi100_template_id` VARCHAR(100) DEFAULT NULL COMMENT '快递100模板ID',
    
    -- 模板配置（JSON格式）
    `template_config` JSON DEFAULT NULL COMMENT '模板配置（字段显示/位置/字体等）',
    
    -- 纸张规格
    `paper_width` INT DEFAULT 100 COMMENT '纸张宽度(mm)',
    `paper_height` INT DEFAULT 180 COMMENT '纸张高度(mm)',
    
    -- 状态
    `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认模板',
    `status` VARCHAR(20) DEFAULT 'enabled' COMMENT '状态: enabled/disabled',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    
    INDEX `idx_company_id` (`company_id`),
    INDEX `idx_carrier` (`carrier`),
    INDEX `idx_company_carrier` (`company_id`, `carrier`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='面单打印模板表';

-- ==============================================================================
-- 4. 物流平台元数据表 (logistics_platforms)
-- 存储系统支持的物流平台基础信息（系统级，非租户级）
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `logistics_platforms` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `platform_code` VARCHAR(50) UNIQUE NOT NULL COMMENT '平台编码',
    `platform_name` VARCHAR(100) NOT NULL COMMENT '平台名称',
    `platform_type` VARCHAR(50) DEFAULT NULL COMMENT '平台类型: express快递/ecommerce电商',
    `logo_url` VARCHAR(500) DEFAULT NULL COMMENT 'Logo URL',
    `api_doc_url` VARCHAR(500) DEFAULT NULL COMMENT 'API文档链接',
    
    -- 配置项元数据（JSON描述该平台需要哪些配置项）
    `config_fields` JSON DEFAULT NULL COMMENT '配置字段定义',
    
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `status` VARCHAR(20) DEFAULT 'enabled' COMMENT '状态',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流平台元数据表';

-- ==============================================================================
-- 5. 物流操作日志表 (logistics_logs)
-- 记录物流相关操作日志
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `logistics_logs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `company_id` INT NOT NULL,
    `logistics_order_id` INT DEFAULT NULL COMMENT '物流订单ID',
    `action` VARCHAR(100) NOT NULL COMMENT '操作类型: create/ship/print/sync/exception',
    `action_desc` VARCHAR(500) DEFAULT NULL COMMENT '操作描述',
    `operator_id` INT DEFAULT NULL COMMENT '操作人ID',
    `operator_name` VARCHAR(100) DEFAULT NULL COMMENT '操作人姓名',
    `request_data` JSON DEFAULT NULL COMMENT '请求数据',
    `response_data` JSON DEFAULT NULL COMMENT '响应数据',
    `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_company_id` (`company_id`),
    INDEX `idx_logistics_order_id` (`logistics_order_id`),
    INDEX `idx_action` (`action`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流操作日志表';

-- ==============================================================================
-- 初始化物流平台元数据
-- ==============================================================================
INSERT INTO `logistics_platforms` (`platform_code`, `platform_name`, `platform_type`, `config_fields`, `sort_order`) VALUES
-- 快递平台
('cainiao', '菜鸟物流', 'express', JSON_OBJECT(
    'fields', JSON_ARRAY(
        JSON_OBJECT('key', 'app_key', 'label', 'AppKey', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_secret', 'label', 'AppSecret', 'type', 'password', 'required', true),
        JSON_OBJECT('key', 'warehouse_code', 'label', '仓库编码', 'type', 'text', 'required', false),
        JSON_OBJECT('key', 'callback_url', 'label', '授权回调地址', 'type', 'text', 'required', false)
    )
), 1),
('jd', '京东物流', 'express', JSON_OBJECT(
    'fields', JSON_ARRAY(
        JSON_OBJECT('key', 'app_key', 'label', 'API账号', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_secret', 'label', 'API密码', 'type', 'password', 'required', true),
        JSON_OBJECT('key', 'merchant_id', 'label', '京东物流商户ID', 'type', 'text', 'required', true)
    )
), 2),
('sf', '顺丰速运', 'express', JSON_OBJECT(
    'fields', JSON_ARRAY(
        JSON_OBJECT('key', 'app_key', 'label', '客户编码', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_secret', 'label', 'API密钥', 'type', 'password', 'required', true),
        JSON_OBJECT('key', 'monthly_account', 'label', '顺丰月结账号', 'type', 'text', 'required', false)
    )
), 3),

-- 电商平台
('doudian', '抖店', 'ecommerce', JSON_OBJECT(
    'fields', JSON_ARRAY(
        JSON_OBJECT('key', 'shop_id', 'label', '店铺ID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_key', 'label', 'AppID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_secret', 'label', 'AppSecret', 'type', 'password', 'required', true),
        JSON_OBJECT('key', 'access_token', 'label', '授权Token', 'type', 'password', 'required', true)
    ),
    'multi_shop', true
), 10),
('pdd', '拼多多', 'ecommerce', JSON_OBJECT(
    'fields', JSON_ARRAY(
        JSON_OBJECT('key', 'shop_id', 'label', '店铺ID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_key', 'label', 'AppID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_secret', 'label', 'AppSecret', 'type', 'password', 'required', true),
        JSON_OBJECT('key', 'access_token', 'label', '授权Token', 'type', 'password', 'required', true)
    ),
    'multi_shop', true
), 11),
('xiaohongshu', '小红书', 'ecommerce', JSON_OBJECT(
    'fields', JSON_ARRAY(
        JSON_OBJECT('key', 'shop_id', 'label', '店铺ID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_key', 'label', 'AppID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_secret', 'label', 'AppSecret', 'type', 'password', 'required', true),
        JSON_OBJECT('key', 'access_token', 'label', '授权Token', 'type', 'password', 'required', true)
    ),
    'multi_shop', true
), 12),
('wxshop', '视频号小店', 'ecommerce', JSON_OBJECT(
    'fields', JSON_ARRAY(
        JSON_OBJECT('key', 'shop_id', 'label', '店铺ID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_key', 'label', 'AppID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'app_secret', 'label', 'AppSecret', 'type', 'password', 'required', true),
        JSON_OBJECT('key', 'access_token', 'label', '授权Token', 'type', 'password', 'required', true)
    ),
    'multi_shop', true
), 13),

-- 面单打印/物流查询
('kuaidi100', '快递100', 'express', JSON_OBJECT(
    'fields', JSON_ARRAY(
        JSON_OBJECT('key', 'app_key', 'label', 'APIKey', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'customer_id', 'label', '用户ID', 'type', 'text', 'required', true),
        JSON_OBJECT('key', 'template_id', 'label', '打印模板ID', 'type', 'text', 'required', false)
    )
), 20)
ON DUPLICATE KEY UPDATE `platform_name` = VALUES(`platform_name`);

-- ==============================================================================
-- 添加权限点
-- ==============================================================================
INSERT INTO `permissions` (`code`, `name`, `module`, `description`) VALUES
('logistics:view', '查看物流订单', 'logistics', '查看物流订单列表和详情'),
('logistics:create', '创建物流订单', 'logistics', '创建新的物流订单'),
('logistics:edit', '编辑物流订单', 'logistics', '编辑物流订单信息'),
('logistics:delete', '删除物流订单', 'logistics', '删除物流订单'),
('logistics:print', '打印面单', 'logistics', '打印快递面单'),
('logistics:config', '物流配置管理', 'logistics', '管理物流平台配置'),
('logistics:template', '面单模板管理', 'logistics', '管理面单打印模板')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ==============================================================================
-- 为管理员角色赋予物流权限
-- ==============================================================================
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id 
FROM `roles` r, `permissions` p 
WHERE r.code IN ('super_admin', 'company_admin') 
AND p.code LIKE 'logistics:%'
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);
