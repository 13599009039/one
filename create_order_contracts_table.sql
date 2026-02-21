-- 订单合同表
CREATE TABLE IF NOT EXISTS order_contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT '订单 ID',
    file_path VARCHAR(500) NOT NULL COMMENT '文件相对路径',
    original_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
    file_type VARCHAR(10) NOT NULL COMMENT '文件扩展名',
    uploaded_by INT COMMENT '上传人用户 ID',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    downloaded_count INT DEFAULT 0 COMMENT '下载次数',
    INDEX idx_order_id (order_id),
    INDEX idx_uploaded_by (uploaded_by),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单合同附件表';
