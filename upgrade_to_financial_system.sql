-- 升级到完整财税账系统的数据库脚本

-- 1. 优化费用类别表
ALTER TABLE categories 
    ADD COLUMN category_type ENUM('income', 'expense') NOT NULL COMMENT '收入或支出类别',
    ADD COLUMN description VARCHAR(255) COMMENT '类别描述',
    DROP COLUMN category;

-- 2. 添加会计期间表
CREATE TABLE IF NOT EXISTS accounting_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    period_name VARCHAR(50) NOT NULL COMMENT '期间名称，如2023-01',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('open', 'closed') DEFAULT 'open' COMMENT '期间状态：open-打开，closed-关闭',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_period_company (company_id, period_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 添加会计科目表
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    account_code VARCHAR(20) NOT NULL COMMENT '科目代码',
    account_name VARCHAR(100) NOT NULL COMMENT '科目名称',
    account_type ENUM('asset', 'liability', 'equity', 'income', 'expense') NOT NULL COMMENT '科目类型',
    parent_id INT COMMENT '上级科目ID',
    description VARCHAR(255) COMMENT '科目描述',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_account_company (company_id, account_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 优化交易记录表，支持双记账法
ALTER TABLE transactions 
    CHANGE COLUMN transaction_type transaction_type ENUM('income', 'expense', 'transfer', 'refund', 'collection', 'payment') NOT NULL COMMENT '交易类型',
    ADD COLUMN debit_account_id INT COMMENT '借方科目ID',
    ADD COLUMN credit_account_id INT COMMENT '贷方科目ID',
    ADD COLUMN accounting_period_id INT COMMENT '会计期间ID',
    ADD COLUMN document_number VARCHAR(50) COMMENT '凭证号',
    ADD COLUMN posted_date DATE COMMENT '记账日期',
    ADD COLUMN status ENUM('draft', 'posted', 'cancelled') DEFAULT 'draft' COMMENT '交易状态',
    ADD COLUMN created_by INT COMMENT '创建人',
    ADD COLUMN posted_by INT COMMENT '记账人',
    ADD COLUMN attachment_path VARCHAR(255) COMMENT '附件路径',
    ADD FOREIGN KEY (debit_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    ADD FOREIGN KEY (credit_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    ADD FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id) ON DELETE SET NULL,
    ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL;

-- 5. 添加银行流水导入日志表
CREATE TABLE IF NOT EXISTS bank_import_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    account_id INT,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    imported_records INT DEFAULT 0 COMMENT '成功导入记录数',
    failed_records INT DEFAULT 0 COMMENT '导入失败记录数',
    status ENUM('success', 'failed', 'processing') DEFAULT 'processing',
    error_message TEXT COMMENT '错误信息',
    created_by INT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 添加财务报表模板表
CREATE TABLE IF NOT EXISTS report_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    report_type ENUM('balance_sheet', 'income_statement', 'cash_flow', 'equity') NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL COMMENT '模板内容，JSON格式',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 插入默认会计科目数据
INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, parent_id, description) VALUES
(NULL, '1001', '库存现金', 'asset', NULL, '企业的库存现金'),
(NULL, '1002', '银行存款', 'asset', NULL, '企业存入银行或其他金融机构的各种款项'),
(NULL, '1122', '应收账款', 'asset', NULL, '企业因销售商品、提供劳务等经营活动应收取的款项'),
(NULL, '1221', '其他应收款', 'asset', NULL, '企业除应收票据、应收账款、预付账款等以外的其他各种应收及暂付款项'),
(NULL, '1403', '原材料', 'asset', NULL, '企业库存的各种材料'),
(NULL, '1601', '固定资产', 'asset', NULL, '企业持有的固定资产原价'),
(NULL, '1602', '累计折旧', 'asset', NULL, '企业固定资产的累计折旧'),
(NULL, '2202', '应付账款', 'liability', NULL, '企业因购买材料、商品和接受劳务等经营活动应支付的款项'),
(NULL, '2211', '应付职工薪酬', 'liability', NULL, '企业根据有关规定应付给职工的各种薪酬'),
(NULL, '2221', '应交税费', 'liability', NULL, '企业按照税法等规定计算应交纳的各种税费'),
(NULL, '2241', '其他应付款', 'liability', NULL, '企业除应付票据、应付账款、预收账款、应付职工薪酬、应付利息、应付股利、应交税费、长期应付款等以外的其他各项应付、暂收的款项'),
(NULL, '4001', '实收资本', 'equity', NULL, '企业接受投资者投入的实收资本'),
(NULL, '4101', '盈余公积', 'equity', NULL, '企业从净利润中提取的盈余公积'),
(NULL, '4103', '本年利润', 'equity', NULL, '企业当期实现的净利润(或发生的净亏损)'),
(NULL, '4104', '利润分配', 'equity', NULL, '企业利润的分配(或亏损的弥补)和历年分配(或弥补)后的余额'),
(NULL, '5001', '主营业务收入', 'income', NULL, '企业确认的销售商品、提供劳务等主营业务的收入'),
(NULL, '5101', '其他业务收入', 'income', NULL, '企业确认的除主营业务活动以外的其他经营活动实现的收入'),
(NULL, '5201', '投资收益', 'income', NULL, '企业确认的投资收益或投资损失'),
(NULL, '6001', '主营业务成本', 'expense', NULL, '企业确认销售商品、提供劳务等主营业务收入时应结转的成本'),
(NULL, '6051', '其他业务成本', 'expense', NULL, '企业确认的除主营业务活动以外的其他经营活动所发生的支出'),
(NULL, '6301', '营业外支出', 'expense', NULL, '企业发生的各项营业外支出'),
(NULL, '6601', '销售费用', 'expense', NULL, '企业销售商品和材料、提供劳务的过程中发生的各种费用'),
(NULL, '6602', '管理费用', 'expense', NULL, '企业为组织和管理企业生产经营所发生的管理费用'),
(NULL, '6603', '财务费用', 'expense', NULL, '企业为筹集生产经营所需资金等而发生的筹资费用');

-- 8. 插入默认会计期间数据（当前年份的12个月份）
SET @current_year = YEAR(CURDATE());

INSERT INTO accounting_periods (company_id, period_name, start_date, end_date, status) VALUES
(NULL, CONCAT(@current_year, '-01'), CONCAT(@current_year, '-01-01'), CONCAT(@current_year, '-01-31'), 'open'),
(NULL, CONCAT(@current_year, '-02'), CONCAT(@current_year, '-02-01'), CONCAT(@current_year, '-02-28'), 'open'),
(NULL, CONCAT(@current_year, '-03'), CONCAT(@current_year, '-03-01'), CONCAT(@current_year, '-03-31'), 'open'),
(NULL, CONCAT(@current_year, '-04'), CONCAT(@current_year, '-04-01'), CONCAT(@current_year, '-04-30'), 'open'),
(NULL, CONCAT(@current_year, '-05'), CONCAT(@current_year, '-05-01'), CONCAT(@current_year, '-05-31'), 'open'),
(NULL, CONCAT(@current_year, '-06'), CONCAT(@current_year, '-06-01'), CONCAT(@current_year, '-06-30'), 'open'),
(NULL, CONCAT(@current_year, '-07'), CONCAT(@current_year, '-07-01'), CONCAT(@current_year, '-07-31'), 'open'),
(NULL, CONCAT(@current_year, '-08'), CONCAT(@current_year, '-08-01'), CONCAT(@current_year, '-08-31'), 'open'),
(NULL, CONCAT(@current_year, '-09'), CONCAT(@current_year, '-09-01'), CONCAT(@current_year, '-09-30'), 'open'),
(NULL, CONCAT(@current_year, '-10'), CONCAT(@current_year, '-10-01'), CONCAT(@current_year, '-10-31'), 'open'),
(NULL, CONCAT(@current_year, '-11'), CONCAT(@current_year, '-11-01'), CONCAT(@current_year, '-11-30'), 'open'),
(NULL, CONCAT(@current_year, '-12'), CONCAT(@current_year, '-12-01'), CONCAT(@current_year, '-12-31'), 'open');

-- 9. 插入默认财务报表模板
INSERT INTO report_templates (company_id, report_type, template_name, template_content, is_default) VALUES
(NULL, 'balance_sheet', '标准资产负债表', '{"title":"资产负债表","columns":["项目","期末余额","年初余额"],"sections":[{"name":"资产","accounts":[{"code":"1001","name":"库存现金"},{"code":"1002","name":"银行存款"},{"code":"1122","name":"应收账款"},{"code":"1221","name":"其他应收款"},{"code":"1403","name":"原材料"},{"code":"1601","name":"固定资产","subtract":"1602"}]}],"total_assets":"资产总计","liabilities":[{"code":"2202","name":"应付账款"},{"code":"2211","name":"应付职工薪酬"},{"code":"2221","name":"应交税费"},{"code":"2241","name":"其他应付款"}],"total_liabilities":"负债合计","equity":[{"code":"4001","name":"实收资本"},{"code":"4101","name":"盈余公积"},{"code":"4104","name":"利润分配"}],"total_equity":"所有者权益合计","total_liabilities_equity":"负债和所有者权益总计"}', TRUE),
(NULL, 'income_statement', '标准利润表', '{"title":"利润表","columns":["项目","本期金额","上期金额"],"sections":[{"name":"一、营业收入","accounts":[{"code":"5001","name":"主营业务收入"},{"code":"5101","name":"其他业务收入"}]},{"name":"减：营业成本","accounts":[{"code":"6001","name":"主营业务成本"},{"code":"6051","name":"其他业务成本"}]},{"name":"税金及附加"},{"name":"销售费用","accounts":[{"code":"6601","name":"销售费用"}]},{"name":"管理费用","accounts":[{"code":"6602","name":"管理费用"}]},{"name":"财务费用","accounts":[{"code":"6603","name":"财务费用"}]},{"name":"加：投资收益","accounts":[{"code":"5201","name":"投资收益"}]}],"total_operating_profit":"营业利润","total_profit_before_tax":"利润总额","total_net_profit":"净利润"}', TRUE);