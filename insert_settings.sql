-- 插入系统设置数据
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('company_name', '许昌爱佳网络科技有限公司', '公司名称'),
('date_format', 'YYYY-MM-DD', '日期格式'),
('currency_format', 'CNY', '货币格式'),
('enable_registration', 'false', '启用用户注册'),
('system_name', '企业财务流水账管理系统', '系统名称'),
('system_version', '1.0.0', '系统版本')
ON DUPLICATE KEY UPDATE
setting_value = VALUES(setting_value),
description = VALUES(description);
