-- ============================================================
-- 物流模块 V2.0 数据库升级脚本
-- 修复版本：移除 IF NOT EXISTS 语法（MySQL ALTER TABLE不支持）
-- 执行时如果字段已存在会报错，可忽略
-- ============================================================

USE `ajkuaiji`;

-- 1. 增强 tenant_logistics_account 表（添加授权状态字段）
-- 如果字段已存在则跳过此步骤
ALTER TABLE `tenant_logistics_account` 
ADD COLUMN `auth_status` VARCHAR(20) DEFAULT 'unauthorized' COMMENT '授权状态: unauthorized未授权/authorized已授权/expired已过期';

ALTER TABLE `tenant_logistics_account` 
ADD COLUMN `auth_expire` DATETIME DEFAULT NULL COMMENT '授权过期时间';

-- 2. 增强 tenant_warehouse 表（添加省市区字段）
ALTER TABLE `tenant_warehouse` 
ADD COLUMN `province` VARCHAR(50) DEFAULT NULL COMMENT '省份';

ALTER TABLE `tenant_warehouse` 
ADD COLUMN `city` VARCHAR(50) DEFAULT NULL COMMENT '城市';

ALTER TABLE `tenant_warehouse` 
ADD COLUMN `district` VARCHAR(50) DEFAULT NULL COMMENT '区县';

-- 3. 增强 orders 表（添加物流相关字段）
ALTER TABLE `orders` 
ADD COLUMN `logistics_account_id` INT DEFAULT NULL COMMENT '物流账号ID';

ALTER TABLE `orders` 
ADD COLUMN `warehouse_id` INT DEFAULT NULL COMMENT '发货仓库ID';

ALTER TABLE `orders` 
ADD COLUMN `waybill_code` VARCHAR(100) DEFAULT NULL COMMENT '运单号';

ALTER TABLE `orders` 
ADD COLUMN `shipping_time` DATETIME DEFAULT NULL COMMENT '发货时间';

ALTER TABLE `orders` 
ADD COLUMN `receiver_name` VARCHAR(100) DEFAULT NULL COMMENT '收件人姓名';

ALTER TABLE `orders` 
ADD COLUMN `receiver_phone` VARCHAR(50) DEFAULT NULL COMMENT '收件人电话';

ALTER TABLE `orders` 
ADD COLUMN `receiver_province` VARCHAR(50) DEFAULT NULL COMMENT '收件人省份';

ALTER TABLE `orders` 
ADD COLUMN `receiver_city` VARCHAR(50) DEFAULT NULL COMMENT '收件人城市';

ALTER TABLE `orders` 
ADD COLUMN `receiver_district` VARCHAR(50) DEFAULT NULL COMMENT '收件人区县';

ALTER TABLE `orders` 
ADD COLUMN `receiver_address` VARCHAR(500) DEFAULT NULL COMMENT '收件人详细地址';

-- 完成
SELECT '✅ 数据库升级完成！' AS result;
