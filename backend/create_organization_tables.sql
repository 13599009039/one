-- 创建部门、团队、岗位数据表
-- 执行时间：2026-02-09

-- 1. 部门表
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '部门ID',
  `name` VARCHAR(100) NOT NULL COMMENT '部门名称',
  `parent_id` INT DEFAULT NULL COMMENT '上级部门ID',
  `manager_id` INT DEFAULT NULL COMMENT '部门负责人ID',
  `description` TEXT COMMENT '部门描述',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active-启用, inactive-禁用',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_manager_id` (`manager_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表';

-- 2. 团队表
CREATE TABLE IF NOT EXISTS `teams` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '团队ID',
  `name` VARCHAR(100) NOT NULL COMMENT '团队名称',
  `department_id` INT DEFAULT NULL COMMENT '所属部门ID',
  `leader_id` INT DEFAULT NULL COMMENT '团队负责人ID',
  `description` TEXT COMMENT '团队描述',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active-启用, inactive-禁用',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_department_id` (`department_id`),
  INDEX `idx_leader_id` (`leader_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团队表';

-- 3. 岗位表
CREATE TABLE IF NOT EXISTS `positions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '岗位ID',
  `name` VARCHAR(100) NOT NULL COMMENT '岗位名称',
  `code` VARCHAR(50) UNIQUE COMMENT '岗位编码',
  `department_id` INT DEFAULT NULL COMMENT '所属部门ID',
  `level` VARCHAR(50) DEFAULT NULL COMMENT '岗位级别',
  `description` TEXT COMMENT '岗位描述',
  `requirements` TEXT COMMENT '任职要求',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active-启用, inactive-禁用',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_department_id` (`department_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位表';

-- 插入默认数据
INSERT INTO `departments` (`name`, `manager_id`, `description`, `status`) VALUES
('技术部', 1, '负责技术研发和系统维护', 'active'),
('运营部', 2, '负责业务运营和客户服务', 'active'),
('市场部', NULL, '负责市场推广和品牌建设', 'active'),
('财务部', NULL, '负责财务管理和成本控制', 'active');

INSERT INTO `teams` (`name`, `department_id`, `leader_id`, `description`, `status`) VALUES
('研发团队', 1, 1, '负责系统开发', 'active'),
('测试团队', 1, NULL, '负责质量保障', 'active'),
('客服团队', 2, 2, '负责客户服务', 'active'),
('销售团队', 2, NULL, '负责业务拓展', 'active');

INSERT INTO `positions` (`name`, `code`, `department_id`, `level`, `description`, `status`) VALUES
('技术总监', 'P001', 1, '高级', '负责技术团队管理', 'active'),
('高级工程师', 'P002', 1, '高级', '负责核心功能开发', 'active'),
('运营经理', 'P003', 2, '中级', '负责运营团队管理', 'active'),
('客服专员', 'P004', 2, '初级', '负责客户咨询服务', 'active'),
('财务主管', 'P005', 4, '中级', '负责财务核算', 'active');
