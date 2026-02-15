-- 成员邀请表
-- 用于存储邀请链接信息

CREATE TABLE IF NOT EXISTS `invitations` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `invite_token` VARCHAR(64) UNIQUE NOT NULL COMMENT '邀请令牌',
    `company_id` INT NOT NULL COMMENT '邀请所属公司',
    `created_by` INT NOT NULL COMMENT '创建人ID',
    `preset_role_id` INT NULL COMMENT '预设角色ID',
    `expire_at` DATETIME NOT NULL COMMENT '过期时间',
    `status` ENUM('pending', 'used', 'cancelled', 'expired') DEFAULT 'pending' COMMENT '状态',
    `used_by` INT NULL COMMENT '使用人ID',
    `used_at` DATETIME NULL COMMENT '使用时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_token` (`invite_token`),
    INDEX `idx_company` (`company_id`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`preset_role_id`) REFERENCES `roles`(`id`),
    FOREIGN KEY (`used_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成员邀请表';
