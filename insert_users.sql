-- 插入用户数据
INSERT INTO users (username, password, name, role, status) VALUES
('admin', 'admin123', '系统管理员', 'admin', 'enabled')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
role = VALUES(role),
status = VALUES(status);
