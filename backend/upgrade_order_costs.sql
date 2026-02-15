-- 订单成本功能升级脚本
-- 版本: v24.3.1
-- 功能: 支持稳定必要成本（模板勾选）+ 特殊一次性成本

-- 1. 扩展成本类别表（业务成本设置），添加计算规则字段
ALTER TABLE cost_categories 
    ADD COLUMN IF NOT EXISTS `calc_type` VARCHAR(20) DEFAULT 'fixed' COMMENT '计算类型: fixed(固定金额), percent(按比例)',
    ADD COLUMN IF NOT EXISTS `default_value` DECIMAL(15,4) DEFAULT 0 COMMENT '默认值: 固定金额或百分比',
    ADD COLUMN IF NOT EXISTS `base_field` VARCHAR(50) DEFAULT 'final_amount' COMMENT '百分比计算基准: final_amount(成交价), total_amount(商品总额)',
    ADD COLUMN IF NOT EXISTS `sort_order` INT DEFAULT 0 COMMENT '排序',
    ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive';

-- 2. 创建订单稳定成本表（关联成本模板）
CREATE TABLE IF NOT EXISTS `order_stable_costs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `order_id` INT NOT NULL COMMENT '订单ID',
    `category_id` INT NOT NULL COMMENT '成本类别ID',
    `calc_type` VARCHAR(20) NOT NULL COMMENT '计算类型: fixed/percent',
    `base_value` DECIMAL(15,2) DEFAULT 0 COMMENT '计算基准金额',
    `rate` DECIMAL(10,4) DEFAULT 0 COMMENT '比例值（百分比时使用）',
    `amount` DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '最终金额',
    `is_manual` TINYINT DEFAULT 0 COMMENT '是否手动修改: 0=自动计算, 1=手动修改',
    `company_id` INT NOT NULL COMMENT '公司ID',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_order` (`order_id`),
    INDEX `idx_category` (`category_id`),
    INDEX `idx_company` (`company_id`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `cost_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单稳定成本（模板成本）';

-- 3. 创建订单特殊成本表（一次性成本，手动录入）
CREATE TABLE IF NOT EXISTS `order_special_costs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `order_id` INT NOT NULL COMMENT '订单ID',
    `name` VARCHAR(200) NOT NULL COMMENT '成本名称',
    `amount` DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '金额',
    `remark` TEXT COMMENT '备注',
    `company_id` INT NOT NULL COMMENT '公司ID',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_order` (`order_id`),
    INDEX `idx_company` (`company_id`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单特殊成本（一次性成本）';

-- 4. 订单表添加成本汇总字段（冗余存储，提升查询性能）
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS `product_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '商品成本',
    ADD COLUMN IF NOT EXISTS `stable_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '稳定成本合计',
    ADD COLUMN IF NOT EXISTS `special_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '特殊成本合计';

-- 5. 更新已有成本类别，设置默认计算规则
UPDATE cost_categories SET calc_type = 'fixed', default_value = 0, status = 'active' WHERE calc_type IS NULL;
