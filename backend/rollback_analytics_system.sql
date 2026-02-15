-- ============================================
-- 统计分析系统回滚脚本
-- 版本: v1.0
-- 创建日期: 2026-02-13
-- 功能: 安全删除统计分析系统相关数据库对象
-- ============================================

-- ============================================
-- 警告：执行前请务必备份数据库！
-- ============================================

-- 1. 删除视图（先删除依赖）
DROP VIEW IF EXISTS v_staff_performance_detail;
DROP VIEW IF EXISTS v_customer_analytics_detail;
DROP VIEW IF EXISTS v_company_analytics;

-- 2. 删除表（按外键依赖顺序）
DROP TABLE IF EXISTS analytics_calculation_log;
DROP TABLE IF EXISTS staff_performance;
DROP TABLE IF EXISTS customer_analytics;
DROP TABLE IF EXISTS analytics_summary;

-- 3. 清理配置项
DELETE FROM system_config WHERE config_key = 'analytics_system_version';

-- ============================================
-- 回滚完成
-- ============================================
-- 执行方式: mysql -u root -p ajkuaiji < rollback_analytics_system.sql
-- ============================================
