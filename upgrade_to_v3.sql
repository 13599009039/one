-- 企业财务流水账管理系统 V3.0 数据库升级脚本

-- 1. 修改公司表结构
ALTER TABLE companies
ADD COLUMN service_start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN service_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN referrer VARCHAR(100),
ADD COLUMN converter VARCHAR(100),
ADD COLUMN service_person VARCHAR(100),
ADD COLUMN service_cycle INT DEFAULT 12,
ADD COLUMN service_end_date DATE DEFAULT DATE_ADD(CURRENT_DATE, INTERVAL 12 MONTH),
ADD COLUMN service_status ENUM('试用', '付费', '到期', '暂停', '禁用') DEFAULT '试用';

-- 2. 创建流水附件表
CREATE TABLE IF NOT EXISTS transaction_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    is_compensated TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 创建操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operator_id INT NOT NULL,
    company_id INT,
    target_type VARCHAR(50) NOT NULL,
    target_id INT NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    content_before TEXT,
    content_after TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 修改账户表，添加期初余额
ALTER TABLE accounts
ADD COLUMN initial_balance DECIMAL(10,2) DEFAULT 0.00,
MODIFY COLUMN balance DECIMAL(10,2) DEFAULT 0.00;

-- 5. 修改交易记录表
ALTER TABLE transactions
MODIFY COLUMN transaction_type ENUM('收入', '支出', '内部转账', '退款', '代收款', '代付款') NOT NULL,
ADD COLUMN attachment_ids VARCHAR(255),
ADD COLUMN is_void TINYINT DEFAULT 0,
ADD COLUMN void_reason TEXT,
ADD COLUMN created_by INT NOT NULL,
ADD COLUMN audit_status ENUM('未审核', '已审核', '审核拒绝') DEFAULT '未审核',
ADD COLUMN audit_by INT,
ADD COLUMN audit_time TIMESTAMP,
ADD COLUMN audit_remark TEXT,
ADD COLUMN transfer_account_id INT,
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
FOREIGN KEY (audit_by) REFERENCES users(id) ON DELETE SET NULL,
FOREIGN KEY (transfer_account_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- 6. 修改用户表，扩展角色
ALTER TABLE users
MODIFY COLUMN role ENUM('superadmin', 'admin', 'financial_entry', 'financial_view', 'financial_audit') DEFAULT 'financial_entry';

-- 7. 创建会计期间表
CREATE TABLE IF NOT EXISTS accounting_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    period_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('未结账', '已结账') DEFAULT '未结账',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 修改费用类别表，改为公司级管理
ALTER TABLE categories
ADD COLUMN company_id INT,
ADD COLUMN created_by INT NOT NULL,
ADD COLUMN is_deleted TINYINT DEFAULT 0,
DROP INDEX unique_income_type,
ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- 9. 创建常用往来方表
CREATE TABLE IF NOT EXISTS frequent_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_type ENUM('收入', '支出') NOT NULL,
    bank_name VARCHAR(100),
    account_number VARCHAR(100),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY (company_id, contact_name, contact_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. 创建流水模板表
CREATE TABLE IF NOT EXISTS transaction_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    transaction_type ENUM('收入', '支出', '内部转账', '退款', '代收款', '代付款') NOT NULL,
    data JSON NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. 创建索引优化查询
CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transactions_audit_status ON transactions(audit_status);
CREATE INDEX idx_transactions_is_void ON transactions(is_void);
CREATE INDEX idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);
CREATE INDEX idx_operation_logs_company_id ON operation_logs(company_id);
CREATE INDEX idx_operation_logs_operator_id ON operation_logs(operator_id);
CREATE INDEX idx_operation_logs_target ON operation_logs(target_type, target_id);
CREATE INDEX idx_accounts_company_id ON accounts(company_id);
CREATE INDEX idx_categories_company_id ON categories(company_id);
CREATE INDEX idx_accounting_periods_company_id ON accounting_periods(company_id);
CREATE INDEX idx_frequent_contacts_company_id ON frequent_contacts(company_id);
CREATE INDEX idx_transaction_templates_company_id ON transaction_templates(company_id);

-- 12. 初始化数据
-- 为现有公司设置默认服务日期
UPDATE companies SET service_start_date = created_at, service_end_date = DATE_ADD(created_at, INTERVAL 12 MONTH);

-- 为现有交易记录设置创建人（默认第一个管理员）
UPDATE transactions t 
JOIN users u ON u.company_id = t.company_id AND u.role = 'admin'
SET t.created_by = u.id;

-- 创建默认会计期间
INSERT INTO accounting_periods (company_id, period_name, start_date, end_date, created_by)
SELECT c.id, CONCAT(YEAR(CURRENT_DATE), '-', LPAD(MONTH(CURRENT_DATE), 2, '0')), 
       DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), 
       LAST_DAY(CURRENT_DATE), 
       (SELECT id FROM users WHERE company_id = c.id AND role = 'admin' LIMIT 1)
FROM companies c;

-- 更新现有交易记录的会计期间
UPDATE transactions t
JOIN accounting_periods ap ON t.company_id = ap.company_id
SET t.accounting_period_id = ap.id
WHERE t.transaction_date BETWEEN ap.start_date AND ap.end_date;

-- 初始化账户期初余额（将现有balance设为initial_balance）
UPDATE accounts SET initial_balance = balance;

-- 为现有类别添加公司ID
UPDATE categories c
SET company_id = (SELECT id FROM companies LIMIT 1);

-- 添加系统设置
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
('expire_remind_days', '7', '服务到期提前提醒天数'),
('attachment_required', '0', '是否要求上传附件'),
('auto_audit', '0', '是否自动审核'),
('decimal_places', '2', '金额小数位数'),
('date_format', 'YYYY-MM-DD', '日期格式');

-- 升级完成