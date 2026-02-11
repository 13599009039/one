-- 添加公司表
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    address VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 添加用户-公司关联表
CREATE TABLE IF NOT EXISTS user_company (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_id INT NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_company (user_id, company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 修改现有表，添加company_id外键
ALTER TABLE accounts ADD COLUMN company_id INT;
ALTER TABLE transactions ADD COLUMN company_id INT;
ALTER TABLE categories ADD COLUMN company_id INT;

-- 插入默认公司数据
INSERT INTO companies (company_name, short_name, contact_person, contact_phone, status) VALUES
('许昌爱佳网络科技有限公司', '爱佳网络', '张总', '13800138000', 'active'),
('许昌雷韵文化传媒有限公司', '雷韵文化', '李总', '13900139000', 'active')
ON DUPLICATE KEY UPDATE
short_name = VALUES(short_name),
contact_person = VALUES(contact_person),
contact_phone = VALUES(contact_phone),
status = VALUES(status);

-- 插入用户-公司关联数据
INSERT INTO user_company (user_id, company_id, role, status) VALUES
(1, 1, 'admin', 'active'),
(1, 2, 'admin', 'active')
ON DUPLICATE KEY UPDATE
role = VALUES(role),
status = VALUES(status);

-- 更新现有数据的company_id
UPDATE accounts SET company_id = 1 WHERE id = 1;
UPDATE accounts SET company_id = 2 WHERE id = 2;
UPDATE transactions SET company_id = 1;
UPDATE categories SET company_id = 1;
