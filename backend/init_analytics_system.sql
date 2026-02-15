-- ============================================
-- 统计分析系统数据库初始化脚本
-- 版本: v1.0
-- 创建日期: 2026-02-13
-- 功能: 多维度统计分析（团队/人员/客户/项目）
-- ============================================

-- ============================================
-- 1. 统计汇总表（核心表）
-- ============================================
CREATE TABLE IF NOT EXISTS `analytics_summary` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `dimension_type` VARCHAR(50) NOT NULL COMMENT '维度类型（company/team/staff/customer/project）',
  `dimension_id` INT NOT NULL COMMENT '维度ID',
  `period_type` VARCHAR(20) NOT NULL COMMENT '统计周期（day/week/month/quarter/year）',
  `period_value` VARCHAR(20) NOT NULL COMMENT '周期值（如2026-02）',
  `start_date` DATE NOT NULL COMMENT '开始日期',
  `end_date` DATE NOT NULL COMMENT '结束日期',
  
  -- 销售指标
  `total_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '总销售额',
  `total_orders` INT DEFAULT 0 COMMENT '订单数',
  `avg_order_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '平均订单金额',
  `new_customers` INT DEFAULT 0 COMMENT '新增客户数',
  
  -- 成本指标
  `total_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '总成本',
  `filming_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '拍摄成本',
  `advertising_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '投放成本',
  `personnel_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '人员成本',
  `other_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '其他成本',
  
  -- 利润指标
  `gross_profit` DECIMAL(15,2) DEFAULT 0 COMMENT '毛利润',
  `profit_margin` DECIMAL(10,2) DEFAULT 0 COMMENT '毛利率(%)',
  `net_profit` DECIMAL(15,2) DEFAULT 0 COMMENT '净利润',
  
  -- 人效指标
  `staff_count` INT DEFAULT 0 COMMENT '人员数量',
  `per_capita_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '人均销售额',
  `per_capita_profit` DECIMAL(15,2) DEFAULT 0 COMMENT '人均利润',
  
  -- 客户指标
  `active_customers` INT DEFAULT 0 COMMENT '活跃客户数',
  `customer_retention_rate` DECIMAL(10,2) DEFAULT 0 COMMENT '客户留存率(%)',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_analytics` (`dimension_type`, `dimension_id`, `period_type`, `period_value`),
  INDEX `idx_company_period` (`company_id`, `period_type`, `period_value`),
  INDEX `idx_dimension` (`dimension_type`, `dimension_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统计汇总表';


-- ============================================
-- 2. 客户维度统计表
-- ============================================
CREATE TABLE IF NOT EXISTS `customer_analytics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL COMMENT '客户ID',
  `company_id` INT NOT NULL COMMENT '公司ID',
  
  -- 累计指标
  `total_orders` INT DEFAULT 0 COMMENT '累计订单数',
  `total_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '累计销售额',
  `total_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '累计成本',
  `total_profit` DECIMAL(15,2) DEFAULT 0 COMMENT '累计利润',
  
  -- 客户价值指标
  `ltv` DECIMAL(15,2) DEFAULT 0 COMMENT '客户生命周期价值',
  `roi` DECIMAL(10,2) DEFAULT 0 COMMENT '投资回报率(%)',
  `avg_order_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '平均订单金额',
  
  -- 时间指标
  `first_order_date` DATE COMMENT '首次下单日期',
  `last_order_date` DATE COMMENT '最近下单日期',
  `customer_lifecycle_days` INT DEFAULT 0 COMMENT '客户生命周期（天）',
  
  -- 活跃度指标
  `is_active` TINYINT DEFAULT 1 COMMENT '是否活跃',
  `last_contact_date` DATE COMMENT '最后联系日期',
  `contact_frequency` INT DEFAULT 0 COMMENT '联系频次',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_customer` (`customer_id`),
  INDEX `idx_company_id` (`company_id`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户维度统计表';


-- ============================================
-- 3. 员工绩效表
-- ============================================
CREATE TABLE IF NOT EXISTS `staff_performance` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `company_id` INT NOT NULL COMMENT '公司ID',
  `team_id` INT COMMENT '团队ID',
  `period_type` VARCHAR(20) NOT NULL COMMENT '统计周期（day/week/month/quarter/year）',
  `period_value` VARCHAR(20) NOT NULL COMMENT '周期值（如2026-02）',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  
  -- 业务指标
  `new_customers` INT DEFAULT 0 COMMENT '新增客户数',
  `follow_customers` INT DEFAULT 0 COMMENT '跟进客户数',
  `signed_orders` INT DEFAULT 0 COMMENT '签单数',
  `total_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '总销售额',
  `completed_tasks` INT DEFAULT 0 COMMENT '完成任务数',
  
  -- 效率指标
  `conversion_rate` DECIMAL(10,2) DEFAULT 0 COMMENT '成交转化率(%)',
  `avg_order_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '平均订单金额',
  `per_capita_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '人均产值',
  
  -- 成本利润
  `cost` DECIMAL(15,2) DEFAULT 0 COMMENT '成本',
  `profit` DECIMAL(15,2) DEFAULT 0 COMMENT '利润',
  `profit_margin` DECIMAL(10,2) DEFAULT 0 COMMENT '利润率(%)',
  
  -- 客户质量
  `customer_satisfaction` DECIMAL(10,2) DEFAULT 0 COMMENT '客户满意度',
  `customer_complaints` INT DEFAULT 0 COMMENT '客户投诉数',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_staff_period` (`user_id`, `period_type`, `period_value`),
  INDEX `idx_company_period` (`company_id`, `period_type`, `period_value`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工绩效表';


-- ============================================
-- 4. 统计计算日志表（用于追踪计算任务）
-- ============================================
CREATE TABLE IF NOT EXISTS `analytics_calculation_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `calculation_type` VARCHAR(50) NOT NULL COMMENT '计算类型（daily/weekly/monthly/manual）',
  `dimension_type` VARCHAR(50) COMMENT '维度类型',
  `period_value` VARCHAR(20) COMMENT '周期值',
  `status` VARCHAR(20) NOT NULL COMMENT '状态（running/success/failed）',
  `start_time` TIMESTAMP NULL COMMENT '开始时间',
  `end_time` TIMESTAMP NULL COMMENT '结束时间',
  `duration_seconds` INT DEFAULT 0 COMMENT '耗时（秒）',
  `records_processed` INT DEFAULT 0 COMMENT '处理记录数',
  `error_message` TEXT COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_company_time` (`company_id`, `created_at`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统计计算日志表';


-- ============================================
-- 5. 数据权限控制视图（多租户隔离）
-- ============================================

-- 先删除旧视图（避免冲突）
DROP VIEW IF EXISTS v_company_analytics;
DROP VIEW IF EXISTS v_customer_analytics_detail;
DROP VIEW IF EXISTS v_staff_performance_detail;

-- 公司级统计视图（仅查看本公司数据）
CREATE VIEW v_company_analytics AS
SELECT 
    a.*,
    c.name as company_name
FROM analytics_summary a
LEFT JOIN companies c ON a.company_id = c.id;

-- 客户分析视图（带客户基础信息）
CREATE VIEW v_customer_analytics_detail AS
SELECT 
    ca.*,
    c.shop_name,
    c.company_name,
    c.douyin_name,
    c.legal_person,
    c.business_staff,
    c.service_staff,
    c.operation_staff,
    c.team,
    c.region,
    c.status as customer_status,
    u.name as follower_name
FROM customer_analytics ca
JOIN customers c ON ca.customer_id = c.id
LEFT JOIN users u ON c.follower_id = u.id;

-- 员工绩效视图（带人员基础信息）
CREATE VIEW v_staff_performance_detail AS
SELECT 
    sp.*,
    u.name as staff_name,
    u.department,
    u.position
FROM staff_performance sp
JOIN users u ON sp.user_id = u.id;


-- ============================================
-- 6. 预设示例数据（可选，用于测试）
-- ============================================

-- 注意：实际生产环境中，统计数据由后端计算引擎生成
-- 这里仅提供示例数据结构，方便开发测试

-- 示例：2026年2月公司整体统计
-- INSERT INTO analytics_summary (
--     company_id, dimension_type, dimension_id, period_type, period_value, 
--     start_date, end_date, total_sales, total_orders, avg_order_amount, 
--     total_cost, gross_profit, profit_margin, staff_count, per_capita_sales
-- ) VALUES (
--     1, 'company', 1, 'month', '2026-02', 
--     '2026-02-01', '2026-02-28', 500000.00, 20, 25000.00, 
--     350000.00, 150000.00, 30.00, 10, 50000.00
-- );


-- ============================================
-- 7. 初始化完成标记
-- ============================================
INSERT INTO system_config (config_key, config_value, description, created_at) 
VALUES (
    'analytics_system_version', 
    '1.0.0', 
    '统计分析系统版本号', 
    NOW()
) ON DUPLICATE KEY UPDATE 
    config_value = '1.0.0',
    updated_at = NOW();

-- ============================================
-- 初始化完成
-- ============================================
-- 执行方式: mysql -u root -p ajkuaiji < init_analytics_system.sql
-- 回滚方式: 见 rollback_analytics_system.sql
-- ============================================
