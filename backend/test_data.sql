-- 系统功能测试 - 测试数据准备脚本
-- 版本: 14.1
-- 日期: 2026-02-11

-- ========================================
-- 1. 创建测试用户账户
-- ========================================

INSERT INTO users (username, password, name, alias, role, company_id, status) VALUES
('test_admin', '123456', '测试管理员', '管理员A', 'admin', 1, 'enabled'),
('test_finance', '123456', '测试财务', '财务小李', 'financial', 1, 'enabled'),
('test_operation', '123456', '测试运营', '运营小王', 'operation', 1, 'enabled'),
('test_viewer', '123456', '测试观察员', '观察员', 'viewer', 1, 'enabled')
ON DUPLICATE KEY UPDATE status='enabled';

-- ========================================
-- 2. 创建测试客户
-- ========================================

INSERT INTO customers (
    merchant_id, shop_name, douyin_name, company_name, 
    industry, status, follower_id, business_staff, 
    service_staff, operation_staff, team, region, company
) VALUES
('TEST001', 'XX餐厅', 'XX餐厅官方', 'XX餐饮管理有限公司', 
 '餐饮', '合作中', (SELECT id FROM users WHERE username='test_operation' LIMIT 1), 
 '测试运营', '测试运营', '测试运营', '测试组', '许昌', '许昌爱佳'),

('TEST002', 'YY美容院', 'YY美容', 'YY美容管理有限公司', 
 '美容美发', '合作中', (SELECT id FROM users WHERE username='test_operation' LIMIT 1), 
 '测试运营', '测试运营', '测试运营', '测试组', '许昌', '许昌爱佳'),

('TEST003', 'ZZ汽修店', 'ZZ汽修', 'ZZ汽车维修有限公司', 
 '汽车服务', '跟进中', (SELECT id FROM users WHERE username='test_operation' LIMIT 1), 
 '测试运营', '测试运营', '测试运营', '测试组', '许昌', '许昌爱佳')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- ========================================
-- 3. 创建测试服务项
-- ========================================

INSERT INTO services (
    name, type, price, cost_price, description, status
) VALUES
('短视频拍摄', 'service', 3000.00, 1500.00, '10条短视频拍摄制作', 'active'),
('直播代运营', 'service', 5000.00, 2500.00, '每月30场直播代运营', 'active'),
('广告投放', 'service', 8000.00, 5000.00, '包含投放费和制作费', 'active')
ON DUPLICATE KEY UPDATE status='active';

-- ========================================
-- 4. 创建测试账户
-- ========================================

INSERT INTO accounts (
    name, company_id, bank_name, account_number, 
    balance, initial_balance, account_type, status
) VALUES
('测试银行账户', 1, '中国工商银行', '6222021234567890', 
 50000.00, 50000.00, '银行账户', 'active')
ON DUPLICATE KEY UPDATE status='active';

-- ========================================
-- 5. 场景1: 先收款后签约 - 预收款流水
-- ========================================

-- 2026-02-01 收到预付款
INSERT INTO transactions (
    transaction_type, transaction_date, payer_name, payee_name,
    amount, balance_after, purpose, account_id, company_id, 
    created_by, audit_status
) VALUES
('来账', '2026-02-01', 'XX餐厅', '许昌爱佳网络科技有限公司',
 5000.00, 55000.00, '短视频拍摄预付款', 
 (SELECT id FROM accounts WHERE name='测试银行账户' LIMIT 1), 1,
 (SELECT id FROM users WHERE username='test_operation' LIMIT 1), '已审核');

-- ========================================
-- 6. 场景1: 创建订单（关联预收款）
-- ========================================

-- 2026-02-05 签订合同
INSERT INTO orders (
    customer_id, order_date, business_staff, service_staff,
    operation_staff, team, region, company, 
    contract_amount, status, remarks
) VALUES
((SELECT id FROM customers WHERE merchant_id='TEST001' LIMIT 1),
 '2026-02-05', '测试运营', '测试运营', '测试运营',
 '测试组', '许昌', '许昌爱佳',
 5000.00, '进行中', '场景1测试：先收款后签约，已收预付款5000元');

-- 添加订单明细
INSERT INTO order_items (order_id, service_name, service_type, price, quantity, total)
VALUES
((SELECT id FROM orders WHERE remarks LIKE '%场景1测试%' LIMIT 1),
 '短视频拍摄', '基础套餐', 3000.00, 1, 3000.00),
((SELECT id FROM orders WHERE remarks LIKE '%场景1测试%' LIMIT 1),
 '直播代运营', '月度套餐', 2000.00, 1, 2000.00);

-- ========================================
-- 7. 场景2: 先签约后收款 - 创建订单（未收款）
-- ========================================

-- 2026-02-01 先签订合同
INSERT INTO orders (
    customer_id, order_date, business_staff, service_staff,
    operation_staff, team, region, company,
    contract_amount, status, remarks
) VALUES
((SELECT id FROM customers WHERE merchant_id='TEST002' LIMIT 1),
 '2026-02-01', '测试运营', '测试运营', '测试运营',
 '测试组', '许昌', '许昌爱佳',
 8000.00, '进行中', '场景2测试：先签约后收款，应收账款8000元');

-- 添加订单明细
INSERT INTO order_items (order_id, service_name, service_type, price, quantity, total)
VALUES
((SELECT id FROM orders WHERE remarks LIKE '%场景2测试%' LIMIT 1),
 '广告投放', '按效果付费', 8000.00, 1, 8000.00);

-- ========================================
-- 8. 创建成本类别
-- ========================================

INSERT INTO cost_categories (name, description) VALUES
('拍摄费', '外请摄影师、摄像师费用'),
('投放费', '广告投放、DOU+等推广费用'),
('人员成本', '内部人员工时成本'),
('设备租赁', '设备租赁或折旧费用'),
('其他成本', '其他杂项成本')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- ========================================
-- 9. 创建测试供应商
-- ========================================

INSERT INTO suppliers (name, contact_person, contact_phone, category, status)
VALUES
('设备供应商A', '张经理', '13800138001', '设备租赁', 'active'),
('物料供应商B', '李经理', '13800138002', '消耗品', 'active')
ON DUPLICATE KEY UPDATE status='active';

-- ========================================
-- 测试数据准备完成
-- ========================================

-- 查询验证
SELECT 'users' as table_name, COUNT(*) as count FROM users WHERE username LIKE 'test_%'
UNION ALL
SELECT 'customers', COUNT(*) FROM customers WHERE merchant_id LIKE 'TEST%'
UNION ALL
SELECT 'services', COUNT(*) FROM services WHERE name IN ('短视频拍摄', '直播代运营', '广告投放')
UNION ALL
SELECT 'orders', COUNT(*) FROM orders WHERE remarks LIKE '%场景%测试%'
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions WHERE payer_name='XX餐厅';
