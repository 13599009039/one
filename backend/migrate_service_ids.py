#!/usr/bin/env python3
"""
订单商品明细service_id数据迁移脚本
根据service_name反向匹配services表，填充service_id字段
"""
import pymysql

DB_CONFIG = {
    'host': 'localhost',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def migrate():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # 1. 获取所有service_id为NULL的订单明细
            cursor.execute("SELECT id, service_name FROM order_items WHERE service_id IS NULL")
            items = cursor.fetchall()
            
            print(f"📊 找到{len(items)}条需要迁移的订单明细")
            
            updated = 0
            not_found = 0
            
            for item in items:
                item_id = item['id']
                service_name = item['service_name']
                
                # 2. 根据service_name在services表中查找
                cursor.execute("SELECT id FROM services WHERE name LIKE %s LIMIT 1", (f"%{service_name}%",))
                service = cursor.fetchone()
                
                if service:
                    # 3. 更新service_id
                    cursor.execute("UPDATE order_items SET service_id=%s WHERE id=%s", 
                                 (service['id'], item_id))
                    print(f"✅ 更新 order_item #{item_id}: {service_name} -> service_id={service['id']}")
                    updated += 1
                else:
                    print(f"⚠️  未找到匹配服务: {service_name}")
                    not_found += 1
            
            conn.commit()
            print(f"\n🎉 迁移完成！")
            print(f"   成功更新: {updated}条")
            print(f"   未找到匹配: {not_found}条")
            
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
