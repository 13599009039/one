-- =====================================================
-- 任务管理系统数据库扩展脚本
-- 版本: v1.0
-- 创建日期: 2026-02-12
-- 功能：支持任务领取、指派、转交、多人协作
-- =====================================================

-- 1. 创建任务分配记录表（支持多人协作）
CREATE TABLE IF NOT EXISTS `task_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_pool_id` int NOT NULL COMMENT '任务池ID（关联task_pool表）',
  `user_id` int NOT NULL COMMENT '参与人ID（关联users表）',
  `role_type` enum('主责人','协作人') NOT NULL DEFAULT '协作人' COMMENT '角色类型',
  `assigned_by` int DEFAULT NULL COMMENT '分配人ID',
  `assignment_type` enum('自主领取','业务指派','被转交','被邀请') NOT NULL COMMENT '分配方式',
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
  `accepted_at` timestamp NULL DEFAULT NULL COMMENT '接受时间',
  `is_active` tinyint(1) DEFAULT 1 COMMENT '是否有效（转交后失效）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_pool_id` (`task_pool_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_assignment_type` (`assignment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务分配记录表（支持多人协作）';

-- 2. 创建任务转交记录表
CREATE TABLE IF NOT EXISTS `task_transfer_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_pool_id` int NOT NULL COMMENT '任务池ID',
  `from_user_id` int NOT NULL COMMENT '转出人ID',
  `to_user_id` int NOT NULL COMMENT '接收人ID',
  `transfer_reason` varchar(500) DEFAULT NULL COMMENT '转交原因',
  `transfer_note` text COMMENT '转交备注',
  `transferred_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '转交时间',
  `accepted_at` timestamp NULL DEFAULT NULL COMMENT '接受时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_pool_id` (`task_pool_id`),
  KEY `idx_from_user` (`from_user_id`),
  KEY `idx_to_user` (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务转交记录表';

-- 3. 扩展task_pool表：添加新字段
-- 注意：MySQL不支持IF NOT EXISTS，执行前需检查字段是否已存在
-- 如果已存在会报错，可忽略或单独执行
ALTER TABLE `task_pool` ADD COLUMN `source_type` varchar(50) DEFAULT '订单审核' COMMENT '任务来源类型';
ALTER TABLE `task_pool` ADD COLUMN `priority` enum('低','中','高','紧急') DEFAULT '中' COMMENT '任务优先级';
ALTER TABLE `task_pool` ADD COLUMN `deadline` date DEFAULT NULL COMMENT '截止日期';
ALTER TABLE `task_pool` ADD COLUMN `abandon_reason` varchar(500) DEFAULT NULL COMMENT '放弃原因';
ALTER TABLE `task_pool` ADD COLUMN `abandon_by` int DEFAULT NULL COMMENT '放弃人ID';
ALTER TABLE `task_pool` ADD COLUMN `abandon_at` timestamp NULL DEFAULT NULL COMMENT '放弃时间';
ALTER TABLE `task_pool` ADD COLUMN `reject_reason` varchar(500) DEFAULT NULL COMMENT '拒绝原因';
ALTER TABLE `task_pool` ADD COLUMN `description` text COMMENT '任务描述';
ALTER TABLE `task_pool` ADD COLUMN `requirements` text COMMENT '任务要求（JSON格式）';
ALTER TABLE `task_pool` ADD COLUMN `attachments` text COMMENT '附件列表（JSON格式）';

-- 4. 修改task_pool表状态字段（扩展更多状态）
ALTER TABLE `task_pool` 
  MODIFY COLUMN `status` enum('待接单','已接单','进行中','待验收','已完成','已放弃','已拒绝') DEFAULT '待接单' COMMENT '任务状态';

-- 5. 添加索引优化查询性能
ALTER TABLE `task_pool` ADD INDEX `idx_source_type` (`source_type`);
ALTER TABLE `task_pool` ADD INDEX `idx_priority` (`priority`);
ALTER TABLE `task_pool` ADD INDEX `idx_deadline` (`deadline`);

-- 6. 创建任务操作日志表（记录所有操作历史）
CREATE TABLE IF NOT EXISTS `task_operation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_pool_id` int NOT NULL COMMENT '任务池ID',
  `user_id` int NOT NULL COMMENT '操作人ID',
  `operation_type` enum('创建','领取','指派','转交','添加协作人','移除协作人','更新状态','更新优先级','放弃','拒绝','完成') NOT NULL COMMENT '操作类型',
  `old_value` text COMMENT '原值（JSON格式）',
  `new_value` text COMMENT '新值（JSON格式）',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注说明',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_task_pool_id` (`task_pool_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_operation_type` (`operation_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务操作日志表';

-- 7. 创建任务统计视图（方便查询）
CREATE OR REPLACE VIEW `v_task_statistics` AS
SELECT 
  tp.id,
  tp.order_id,
  o.customer_id,
  c.shop_name AS customer_name,
  tp.status,
  tp.priority,
  tp.deadline,
  tp.assigned_user_id AS main_assignee_id,
  u.name AS main_assignee_name,
  GROUP_CONCAT(DISTINCT ta.user_id) AS collaborator_ids,
  GROUP_CONCAT(DISTINCT u2.name) AS collaborator_names,
  COUNT(DISTINCT ta.user_id) AS collaborator_count,
  tp.created_at,
  tp.updated_at,
  DATEDIFF(NOW(), tp.created_at) AS days_elapsed,
  CASE 
    WHEN tp.deadline IS NULL THEN NULL
    WHEN tp.deadline < CURDATE() THEN '已逾期'
    WHEN tp.deadline = CURDATE() THEN '今天到期'
    WHEN DATEDIFF(tp.deadline, CURDATE()) <= 3 THEN '即将到期'
    ELSE '正常'
  END AS deadline_status
FROM task_pool tp
LEFT JOIN orders o ON tp.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN users u ON tp.assigned_user_id = u.id
LEFT JOIN task_assignments ta ON tp.id = ta.task_pool_id AND ta.is_active = 1 AND ta.role_type = '协作人'
LEFT JOIN users u2 ON ta.user_id = u2.id
GROUP BY tp.id;

-- =====================================================
-- 初始化数据
-- =====================================================

-- 为现有task_pool记录添加默认值
UPDATE `task_pool` 
SET 
  `source_type` = '订单审核',
  `priority` = '中'
WHERE `source_type` IS NULL;

-- =====================================================
-- 完成
-- =====================================================
