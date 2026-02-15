-- =====================================================
-- 商品服务与库存管理系统回滚脚本 v1.0
-- 此脚本用于回滚 upgrade_product_service_v1.sql 的更改
-- 执行前请先备份数据库!
-- =====================================================

-- =====================================================
-- 警告: 此脚本会删除数据，请确保已备份!
-- =====================================================

-- 检查是否有备份
SELECT '警告: 即将执行回滚操作，请确保已备份数据库!' AS warning;

-- =====================================================
-- 步骤1: 备份当前数据到临时表
-- =====================================================

-- 备份 stock_documents 数据
CREATE TABLE IF NOT EXISTS stock_documents_backup AS 
SELECT * FROM stock_documents;

-- 备份 purchase_items 数据
CREATE TABLE IF NOT EXISTS purchase_items_backup AS 
SELECT * FROM purchase_items;

-- 备份 service_cost_items 数据(如果存在)
CREATE TABLE IF NOT EXISTS service_cost_items_backup AS 
SELECT * FROM service_cost_items WHERE 1=0;

-- 插入现有数据到备份表
INSERT INTO service_cost_items_backup SELECT * FROM service_cost_items 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_cost_items');

-- =====================================================
-- 步骤2: 删除新增的表
-- =====================================================

-- 注意: 根据外键依赖顺序删除

-- 删除库存单据表
DROP TABLE IF EXISTS stock_documents;

-- 删除采购明细表
DROP TABLE IF EXISTS purchase_items;

-- 删除服务成本项表
DROP TABLE IF EXISTS service_cost_items;

-- 删除迁移日志表
DROP TABLE IF EXISTS migration_logs;

-- =====================================================
-- 步骤3: 恢复 services 表原有结构
-- =====================================================

-- 删除新增的字段
ALTER TABLE services DROP COLUMN IF EXISTS cost_items;
ALTER TABLE services DROP COLUMN IF EXISTS operation_cost;

-- =====================================================
-- 步骤4: 恢复 purchases 表原有结构
-- =====================================================

-- 如果 purchases 表有新增字段，在此删除
-- ALTER TABLE purchases DROP COLUMN IF EXISTS xxx;

-- =====================================================
-- 回滚完成报告
-- =====================================================

SELECT '=== 回滚完成报告 ===' AS report_header;

SELECT 'stock_documents_backup' AS backup_table, COUNT(*) AS record_count FROM stock_documents_backup
UNION ALL
SELECT 'purchase_items_backup', COUNT(*) FROM purchase_items_backup
UNION ALL
SELECT 'service_cost_items_backup', COUNT(*) FROM service_cost_items_backup;

SELECT '回滚完成! 备份数据保存在 *_backup 表中。' AS status;

-- =====================================================
-- 如果需要恢复数据，执行以下语句(需手动确认)
-- =====================================================
-- 
-- -- 恢复 stock_documents
-- CREATE TABLE stock_documents AS SELECT * FROM stock_documents_backup;
-- 
-- -- 恢复 purchase_items
-- CREATE TABLE purchase_items AS SELECT * FROM purchase_items_backup;
-- 
-- -- 恢复 service_cost_items
-- CREATE TABLE service_cost_items AS SELECT * FROM service_cost_items_backup;
-- 
-- =====================================================
