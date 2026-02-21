-- 多租户隔离修复SQL
-- 用于验证所有表的company_id完整性

-- 1. 检查所有业务表是否有company_id
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'ajkuaiji'
AND COLUMN_NAME = 'company_id'
ORDER BY TABLE_NAME;

-- 2. 检查各表的company_id NULL值情况
SELECT 'accounts' as table_name, COUNT(*) as null_count FROM accounts WHERE company_id IS NULL
UNION ALL
SELECT 'roles', COUNT(*) FROM roles WHERE company_id IS NULL
UNION ALL
SELECT 'users', COUNT(*) FROM users WHERE company_id IS NULL;

-- 3. 修复历史数据的company_id
UPDATE accounts SET company_id = 1 WHERE company_id IS NULL;
UPDATE roles SET company_id = 1 WHERE company_id IS NULL;

-- 4. 为缺少company_id的表添加字段
-- ALTER TABLE system_upgrade_logs ADD COLUMN company_id INT DEFAULT 1 COMMENT '公司ID';
