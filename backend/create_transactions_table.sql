-- 财务流水表
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '流水ID',
  `transaction_date` DATE NOT NULL COMMENT '交易日期',
  `type` VARCHAR(20) NOT NULL COMMENT '类型：收入/支出',
  `amount` DECIMAL(15,2) NOT NULL COMMENT '金额',
  `category` VARCHAR(100) DEFAULT NULL COMMENT '分类',
  `account_id` INT DEFAULT NULL COMMENT '账户ID',
  `account_name` VARCHAR(100) DEFAULT NULL COMMENT '账户名称',
  `customer_id` INT DEFAULT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(200) DEFAULT NULL COMMENT '客户名称',
  `order_id` VARCHAR(100) DEFAULT NULL COMMENT '关联订单ID',
  `payment_method` VARCHAR(50) DEFAULT NULL COMMENT '支付方式：现金/转账/支付宝/微信等',
  `description` TEXT COMMENT '备注说明',
  `created_by` VARCHAR(100) DEFAULT NULL COMMENT '创建人',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_date` (`transaction_date`),
  INDEX `idx_type` (`type`),
  INDEX `idx_category` (`category`),
  INDEX `idx_account` (`account_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务流水表';

-- 插入测试数据
INSERT INTO `transactions` (`transaction_date`, `type`, `amount`, `category`, `account_name`, `customer_name`, `payment_method`, `description`, `created_by`) VALUES
('2026-01-05', '收入', 50000.00, '订单收款', '公司账户', '北京宏远科技', '银行转账', '订单首款50%', '张伟'),
('2026-01-08', '支出', 3500.00, '员工工资', '公司账户', NULL, '银行转账', '1月份工资', '李娜'),
('2026-01-10', '收入', 8000.00, '服务费', '支付宝', '上海明达贸易', '支付宝', '短视频拍摄服务', '王强'),
('2026-01-12', '支出', 1200.00, '办公费用', '现金', NULL, '现金', '购买办公用品', '张伟'),
('2026-01-15', '收入', 50000.00, '订单收款', '公司账户', '北京宏远科技', '银行转账', '订单尾款50%', '张伟'),
('2026-01-18', '支出', 5000.00, '推广费用', '微信', NULL, '微信', '抖音广告投放', '李娜'),
('2026-01-20', '收入', 12000.00, '订单收款', '公司账户', '深圳创新公司', '银行转账', '直播代运营月费', '王强'),
('2026-01-22', '支出', 800.00, '交通费', '现金', NULL, '现金', '客户拜访出差', '张伟'),
('2026-01-25', '收入', 6000.00, '服务费', '支付宝', '广州联创集团', '支付宝', '咨询服务费', '李娜'),
('2026-01-28', '支出', 15000.00, '外包费用', '公司账户', NULL, '银行转账', '视频后期制作', '王强'),
('2026-02-01', '收入', 30000.00, '订单收款', '公司账户', '成都天府科技', '银行转账', '年度服务包首款', '张伟'),
('2026-02-03', '支出', 2000.00, '办公费用', '公司账户', NULL, '银行转账', '续费企业邮箱', '李娜'),
('2026-02-05', '收入', 8500.00, '服务费', '微信', '杭州西湖传媒', '微信', '短视频拍摄', '王强'),
('2026-02-08', '支出', 4500.00, '员工工资', '公司账户', NULL, '银行转账', '2月份工资', '张伟');
