-- =====================================================
-- 成本项历史数据迁移脚本 v1.0
-- 执行前请先备份数据库!
-- =====================================================

-- 创建迁移日志表
CREATE TABLE IF NOT EXISTS migration_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    migration_name VARCHAR(100) NOT NULL,
    source_table VARCHAR(50),
    source_id INT,
    target_table VARCHAR(50),
    target_id INT,
    status ENUM('success', 'failed') DEFAULT 'success',
    error_message TEXT,
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据迁移日志表';

-- =====================================================
-- 步骤1: 从 order_stable_costs 迁移基础成本数据
-- =====================================================

-- 创建 service_cost_items 表(如果不存在)
CREATE TABLE IF NOT EXISTS service_cost_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_id INT NOT NULL COMMENT '关联服务/商品ID',
    cost_category_id INT DEFAULT NULL COMMENT '成本类别ID',
    cost_name VARCHAR(100) NOT NULL COMMENT '成本项名称',
    cost_type ENUM('base', 'supplement') DEFAULT 'base' COMMENT '成本类型:基础/补充',
    calculation_type ENUM('fixed', 'ratio') DEFAULT 'fixed' COMMENT '计算方式:固定金额/比例',
    amount DECIMAL(15,2) DEFAULT 0 COMMENT '固定金额',
    ratio DECIMAL(5,2) DEFAULT 0 COMMENT '百分比(如果按比例计算)',
    is_default BOOLEAN DEFAULT TRUE COMMENT '是否默认勾选',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_service (service_id),
    INDEX idx_cost_type (cost_type),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务成本项配置表';

-- 迁移 order_stable_costs 到 service_cost_items (基础成本)
-- 注意: 只有当 order_stable_costs 表存在时执行
INSERT INTO service_cost_items (service_id, cost_category_id, cost_name, cost_type, calculation_type, amount, is_default, sort_order)
SELECT DISTINCT
    o.service_id,
    osc.cost_category_id,
    COALESCE(cc.name, '成本项'),
    'base',
    COALESCE(cc.calculation_type, 'fixed'),
    osc.amount,
    TRUE,
    0
FROM order_stable_costs osc
JOIN orders o ON osc.order_id = o.id
LEFT JOIN cost_categories cc ON osc.cost_category_id = cc.id
WHERE NOT EXISTS (
    SELECT 1 FROM service_cost_items sci 
    WHERE sci.service_id = o.service_id 
    AND sci.cost_category_id = osc.cost_category_id
);

-- 记录迁移日志
INSERT INTO migration_logs (migration_name, source_table, target_table, status)
SELECT 'stable_costs_migration', 'order_stable_costs', 'service_cost_items', 
       IF(ROW_COUNT() > 0, 'success', 'success') 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_stable_costs');

-- =====================================================
-- 步骤2: 从 order_other_costs 迁移补充成本数据
-- =====================================================

INSERT INTO service_cost_items (service_id, cost_name, cost_type, calculation_type, amount, is_default, sort_order)
SELECT DISTINCT
    o.service_id,
    ooc.name,
    'supplement',
    'fixed',
    ooc.amount,
    FALSE,
    1
FROM order_other_costs ooc
JOIN orders o ON ooc.order_id = o.id
WHERE NOT EXISTS (
    SELECT 1 FROM service_cost_items sci 
    WHERE sci.service_id = o.service_id 
    AND sci.cost_name = ooc.name
);

-- 记录迁移日志
INSERT INTO migration_logs (migration_name, source_table, target_table, status)
SELECT 'other_costs_migration', 'order_other_costs', 'service_cost_items',
       IF(ROW_COUNT() > 0, 'success', 'success')
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_other_costs');

-- =====================================================
-- 步骤3: 生成迁移报告
-- =====================================================

-- 统计迁移结果
SELECT '=== 成本项迁移报告 ===' AS report_header;

SELECT 
    '基础成本项迁移' AS migration_type,
    (SELECT COUNT(*) FROM service_cost_items WHERE cost_type = 'base') AS migrated_count;

SELECT 
    '补充成本项迁移' AS migration_type,
    (SELECT COUNT(*) FROM service_cost_items WHERE cost_type = 'supplement') AS migrated_count;

SELECT 
    migration_name,
    source_table,
    target_table,
    status,
    COUNT(*) as record_count,
    MIN(migrated_at) as migration_time
FROM migration_logs
WHERE migration_name IN ('stable_costs_migration', 'other_costs_migration')
GROUP BY migration_name, source_table, target_table, status;

-- =====================================================
-- 验证脚本
-- =====================================================

-- 检查数据一致性
SELECT '=== 数据一致性校验 ===' AS verification_header;

-- 校验基础成本数量
SELECT 
    '基础成本' AS cost_type,
    (SELECT COUNT(DISTINCT service_id) FROM service_cost_items WHERE cost_type = 'base') AS services_with_cost;

-- 校验补充成本数量
SELECT 
    '补充成本' AS cost_type,
    (SELECT COUNT(DISTINCT service_id) FROM service_cost_items WHERE cost_type = 'supplement') AS services_with_cost;

SELECT '成本项历史数据迁移完成!' AS status;
