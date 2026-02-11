-- 插入账户数据
INSERT INTO accounts (name, company_name, bank_name, account_number, balance, status) VALUES
('中国银行-爱佳公户', '许昌爱佳网络科技有限公司', '中国银行股份有限公司许昌分行', '1234567890', 118184.78, 'active'),
('工商银行-雷韵公户', '许昌雷韵文化传媒有限公司', '中国工商银行股份有限公司许昌建安支行', '0987654321', 0.00, 'active')
ON DUPLICATE KEY UPDATE
company_name = VALUES(company_name),
bank_name = VALUES(bank_name),
account_number = VALUES(account_number),
balance = VALUES(balance),
status = VALUES(status);
