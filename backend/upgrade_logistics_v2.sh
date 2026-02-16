#!/bin/bash
# 物流模块 V2.0 数据库升级脚本（安全版本）
# 检查字段是否存在，不存在才添加

MYSQL_USER="ajkuaiji"
MYSQL_PASS="@HNzb5z75b16"
MYSQL_DB="ajkuaiji"

echo "开始物流模块V2.0数据库升级..."

# 函数：添加字段（如果不存在）
add_column_if_not_exists() {
    TABLE=$1
    COLUMN=$2
    DEFINITION=$3
    
    # 检查字段是否存在
    EXIST=$(mysql -u${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -sN -e \
        "SELECT COUNT(*) FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA='${MYSQL_DB}' AND TABLE_NAME='${TABLE}' AND COLUMN_NAME='${COLUMN}'")
    
    if [ "$EXIST" -eq "0" ]; then
        echo "添加字段: ${TABLE}.${COLUMN}"
        mysql -u${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e \
            "ALTER TABLE \`${TABLE}\` ADD COLUMN \`${COLUMN}\` ${DEFINITION};" 2>&1
        if [ $? -eq 0 ]; then
            echo "✅ ${TABLE}.${COLUMN} 添加成功"
        else
            echo "❌ ${TABLE}.${COLUMN} 添加失败"
        fi
    else
        echo "⏭️  字段已存在: ${TABLE}.${COLUMN}"
    fi
}

# 1. 增强 tenant_logistics_account 表
echo ""
echo "=== 1. 增强 tenant_logistics_account 表 ==="
add_column_if_not_exists "tenant_logistics_account" "auth_status" "VARCHAR(20) DEFAULT 'unauthorized' COMMENT '授权状态'"

# 2. 增强 tenant_warehouse 表
echo ""
echo "=== 2. 增强 tenant_warehouse 表 ==="
add_column_if_not_exists "tenant_warehouse" "province" "VARCHAR(50) DEFAULT NULL COMMENT '省份'"
add_column_if_not_exists "tenant_warehouse" "city" "VARCHAR(50) DEFAULT NULL COMMENT '城市'"
add_column_if_not_exists "tenant_warehouse" "district" "VARCHAR(50) DEFAULT NULL COMMENT '区县'"

# 3. 增强 orders 表
echo ""
echo "=== 3. 增强 orders 表（添加物流字段） ==="
add_column_if_not_exists "orders" "logistics_account_id" "INT DEFAULT NULL COMMENT '物流账号ID'"
add_column_if_not_exists "orders" "warehouse_id" "INT DEFAULT NULL COMMENT '发货仓库ID'"
add_column_if_not_exists "orders" "waybill_code" "VARCHAR(100) DEFAULT NULL COMMENT '运单号'"
add_column_if_not_exists "orders" "shipping_time" "DATETIME DEFAULT NULL COMMENT '发货时间'"
add_column_if_not_exists "orders" "receiver_name" "VARCHAR(100) DEFAULT NULL COMMENT '收件人姓名'"
add_column_if_not_exists "orders" "receiver_phone" "VARCHAR(50) DEFAULT NULL COMMENT '收件人电话'"
add_column_if_not_exists "orders" "receiver_province" "VARCHAR(50) DEFAULT NULL COMMENT '收件人省份'"
add_column_if_not_exists "orders" "receiver_city" "VARCHAR(50) DEFAULT NULL COMMENT '收件人城市'"
add_column_if_not_exists "orders" "receiver_district" "VARCHAR(50) DEFAULT NULL COMMENT '收件人区县'"
add_column_if_not_exists "orders" "receiver_address" "VARCHAR(500) DEFAULT NULL COMMENT '收件人详细地址'"

echo ""
echo "✅ 数据库升级完成！"
