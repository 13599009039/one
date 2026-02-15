#!/usr/bin/env python3
"""诊断services表数据"""
import pymysql
from db_config import DB_CONFIG

conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
with conn.cursor() as cursor:
    # 1. 查询所有服务数据的基本信息
    cursor.execute('SELECT id, name, item_type, type, status, company_id FROM services LIMIT 20')
    services = cursor.fetchall()
    print('='*60)
    print('📦 [诊断] services表数据采样 (前20条):')
    print('='*60)
    for s in services:
        item_type_val = s.get("item_type")
        type_val = s.get("type")
        print(f'  id={s["id"]:3}, company_id={s["company_id"]}, item_type="{item_type_val}"({type(item_type_val).__name__}), type="{type_val}", status="{s["status"]}", name="{s["name"][:20]}"')
    
    # 2. 统计各类型数量
    cursor.execute('SELECT item_type, type, status, company_id, COUNT(*) as cnt FROM services GROUP BY item_type, type, status, company_id')
    stats = cursor.fetchall()
    print('')
    print('='*60)
    print('📊 [统计] 按 item_type/type/status/company_id 分组:')
    print('='*60)
    for s in stats:
        print(f'  item_type="{s["item_type"]}", type="{s["type"]}", status="{s["status"]}", company_id={s["company_id"]}, count={s["cnt"]}')

conn.close()
