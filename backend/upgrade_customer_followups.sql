-- 客户跟进记录表升级脚本
-- 创建独立的跟进记录表，与原有备忘录（customer_memos）分离

-- 1. 创建客户跟进记录表
CREATE TABLE IF NOT EXISTS `customer_followups` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    `customer_id` INT NOT NULL COMMENT '客户ID',
    `type` VARCHAR(50) NOT NULL COMMENT '跟进方式：电话沟通/微信沟通/线下拜访/视频会议/邮件沟通/其他',
    `content` TEXT NOT NULL COMMENT '跟进内容',
    `followup_time` DATETIME NOT NULL COMMENT '跟进时间',
    `user_id` INT COMMENT '跟进人ID',
    `next_followup_date` DATE COMMENT '下次跟进提醒日期',
    `company_id` INT NOT NULL DEFAULT 1 COMMENT '公司ID（多租户）',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_company_id` (`company_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_followup_time` (`followup_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户跟进记录表';

-- 2. 迁移现有备忘录数据到跟进记录表（可选，如需保留历史数据）
-- INSERT INTO customer_followups (customer_id, type, content, followup_time, company_id, created_at)
-- SELECT customer_id, type, content, date, 
--        COALESCE((SELECT company_id FROM customers WHERE customers.id = customer_memos.customer_id LIMIT 1), 1),
--        created_at
-- FROM customer_memos WHERE type IN ('跟进记录', '洽谈结果', '电话沟通');
