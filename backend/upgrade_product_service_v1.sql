-- =====================================================
-- 商品服务与库存管理系统升级脚本 v1.0
-- 执行前请先备份数据库!
-- =====================================================

-- =====================================================
-- 阶段3: 成本模块统一 - services表添加cost_items字段
-- =====================================================

-- 添加成本项JSON字段到services表
ALTER TABLE services ADD COLUMN IF NOT EXISTS cost_items JSON COMMENT '成本项配置JSON数组';

-- 添加运营成本字段（如果不存在）
ALTER TABLE services ADD COLUMN IF NOT EXISTS operation_cost DECIMAL(15,2) DEFAULT 0 COMMENT '运营成本';

-- =====================================================
-- 阶段4: 库存管理流程完善 - 创建库存单据表
-- =====================================================

-- 创建库存单据表
CREATE TABLE IF NOT EXISTS stock_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    doc_number VARCHAR(50) NOT NULL COMMENT '单据编号',
    doc_type ENUM('in','out','check','loss') NOT NULL COMMENT '单据类型:入库/出库/盘点/报损',
    product_id INT NOT NULL COMMENT '商品ID(关联services.id)',
    quantity INT NOT NULL DEFAULT 0 COMMENT '变动数量',
    before_stock INT DEFAULT 0 COMMENT '变动前库存',
    after_stock INT DEFAULT 0 COMMENT '变动后库存',
    unit_price DECIMAL(15,2) DEFAULT 0 COMMENT '单价',
    total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '总金额',
    reason TEXT COMMENT '原因/备注',
    status ENUM('draft','confirmed','cancelled') DEFAULT 'draft' COMMENT '单据状态:草稿/已确认/已取消',
    related_purchase_id INT DEFAULT NULL COMMENT '关联采购单ID',
    operator_id INT NOT NULL COMMENT '操作人ID',
    confirmed_by INT DEFAULT NULL COMMENT '确认人ID',
    confirmed_at DATETIME DEFAULT NULL COMMENT '确认时间',
    company_id INT NOT NULL COMMENT '所属公司ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_doc_number (doc_number),
    INDEX idx_product (product_id),
    INDEX idx_doc_type (doc_type),
    INDEX idx_status (status),
    INDEX idx_company (company_id),
    INDEX idx_created (created_at),
    FOREIGN KEY (product_id) REFERENCES services(id) ON DELETE RESTRICT,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存单据表';

-- =====================================================
-- 阶段5: 采购管理流程完善 - 扩展purchases表
-- =====================================================

-- 扩展purchases表字段
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(20) DEFAULT 'normal' COMMENT '采购类型';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS expected_delivery DATE DEFAULT NULL COMMENT '预计到货日期';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS actual_delivery DATE DEFAULT NULL COMMENT '实际到货日期';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS remark TEXT COMMENT '备注';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL COMMENT '创建人ID';

-- 创建采购明细表
CREATE TABLE IF NOT EXISTS purchase_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_id INT NOT NULL COMMENT '采购单ID',
    product_id INT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL DEFAULT 0 COMMENT '采购数量',
    unit_price DECIMAL(15,2) DEFAULT 0 COMMENT '采购单价',
    amount DECIMAL(15,2) DEFAULT 0 COMMENT '金额小计',
    received_quantity INT DEFAULT 0 COMMENT '已入库数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_purchase (purchase_id),
    INDEX idx_product (product_id),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES services(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购明细表';

-- =====================================================
-- 成本项关联表（可选：用于服务/商品的预设成本项）
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cost_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_id INT NOT NULL COMMENT '商品/服务ID',
    cost_name VARCHAR(100) NOT NULL COMMENT '成本项名称',
    calc_type ENUM('fixed','percent') DEFAULT 'fixed' COMMENT '计算方式:固定金额/按比例',
    calc_value DECIMAL(15,4) DEFAULT 0 COMMENT '计算值(金额或比例)',
    is_default BOOLEAN DEFAULT TRUE COMMENT '是否默认勾选',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_service (service_id),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品/服务成本项配置表';

-- =====================================================
-- 数据迁移: 现有成本类别数据
-- =====================================================

-- 这里不做数据迁移，因为原有成本类别体系可能继续使用
-- 新的成本项配置在前端保存时写入 services.cost_items 字段

-- =====================================================
-- P2-9修复: 添加盘点单据关联字段
-- =====================================================
ALTER TABLE stock_documents ADD COLUMN IF NOT EXISTS related_check_doc_id INT DEFAULT NULL COMMENT '关联盘点单据ID(盘盈/盘亏单据自动生成时)';

-- =====================================================
-- 完成提示
-- =====================================================
SELECT '商品服务与库存管理系统升级完成！' AS status;
