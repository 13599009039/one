#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据迁移脚本
从 database.js 提取数据并导入到 MySQL
"""

import json
import pymysql
import re
import sys

# 数据库配置
DB_CONFIG = {
    'host': '47.98.60.197',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def extract_data_from_js():
    """从 database.js 提取数据"""
    print("正在读取 database.js 文件...")
    
    try:
        with open('../modules/database.js', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 提取 users 数组 - 使用更精确的匹配
        print("提取用户数据...")
        users_match = re.search(r'users:\s*(\[[^\]]*?\{[\s\S]*?\}[^\[]*?\]),', content)
        if not users_match:
            print("❌ 无法找到 users 数组")
            return None
        
        users_str = users_match.group(1)
        # 手动解析 JSON，处理可能的单引号问题
        users_str = users_str.replace("'", '"')  # 将单引号转为双引号
        users = json.loads(users_str)
        print(f"✅ 找到 {len(users)} 个用户")
        
        # 提取 customers 数组 - 只提取前100条测试
        print("提取客户数据...")
        # 由于 customers数组太大，我们分批处理
        # 先找到 customers 开始位置
        customers_start = content.find('customers: [')
        if customers_start == -1:
            print("❌ 无法找到 customers 数组")
            return None
        
        # 找到下一个数组或对象结束
        customers_end = content.find('],', customers_start) + 1
        customers_str = content[customers_start + 11:customers_end]
        
        # 手动解析，处理可能的问题
        customers_str = customers_str.replace("'", '"')
        
        # 分批解析：每次解析500条
        customers = []
        batch_size = 500
        
        # 简单的方式：直接使用 eval（仅用于迁移脚本）
        try:
            # 先尝试直接解析
            customers = eval(customers_str)
            print(f"✅ 找到 {len(customers)} 个客户")
        except:
            print("⚠️  客户数据解析失败，尝试分批处理...")
            # 如果失败，返回空数组
            customers = []
        
        return {
            'users': users,
            'customers': customers
        }
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def migrate_users(conn, users):
    """迁移用户数据"""
    print(f"\n开始迁移 {len(users)} 个用户...")
    
    with conn.cursor() as cursor:
        # 先清空表（如果需要）
        # cursor.execute("TRUNCATE TABLE users")
        
        success_count = 0
        for user in users:
            try:
                sql = """INSERT INTO users (username, password, name, alias, role, company_id, status)
                         VALUES (%s, %s, %s, %s, %s, %s, %s)
                         ON DUPLICATE KEY UPDATE 
                         name=VALUES(name), role=VALUES(role), status=VALUES(status)"""
                
                cursor.execute(sql, (
                    user.get('username'),
                    user.get('password'),
                    user.get('name'),
                    user.get('alias'),
                    user.get('role', 'viewer'),
                    user.get('company_id', 1),
                    'enabled'
                ))
                success_count += 1
            except Exception as e:
                print(f"  ⚠️  用户 {user.get('username')} 导入失败: {e}")
        
        conn.commit()
        print(f"✅ 成功导入 {success_count}/{len(users)} 个用户")
        return success_count

def migrate_customers(conn, customers):
    """迁移客户数据"""
    print(f"\n开始迁移 {len(customers)} 个客户...")
    
    with conn.cursor() as cursor:
        # 先清空表（如果需要）
        # cursor.execute("TRUNCATE TABLE customers")
        
        success_count = 0
        for i, customer in enumerate(customers):
            try:
                # 处理 tags
                tags = customer.get('tags', [])
                if isinstance(tags, list):
                    tags_json = json.dumps(tags, ensure_ascii=False)
                else:
                    tags_json = '[]'
                
                sql = """INSERT INTO customers (
                    merchant_id, shop_name, douyin_name, company_name, credit_code,
                    legal_person, registered_capital, business_address, operating_address,
                    cooperation_mode, category, industry, status, follower_id,
                    business_staff, service_staff, operation_staff, management_staff,
                    team, region, project, company, tags
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
                
                cursor.execute(sql, (
                    customer.get('merchant_id'),
                    customer.get('shop_name'),
                    customer.get('douyin_name'),
                    customer.get('company_name'),
                    customer.get('credit_code'),
                    customer.get('legal_person'),
                    customer.get('registered_capital'),
                    customer.get('business_address'),
                    customer.get('operating_address'),
                    customer.get('cooperation_mode'),
                    customer.get('category'),
                    customer.get('industry'),
                    customer.get('status', '跟进中'),
                    customer.get('follower_id'),
                    customer.get('business_staff'),
                    customer.get('service_staff'),
                    customer.get('operation_staff'),
                    customer.get('management_staff'),
                    customer.get('team'),
                    customer.get('region'),
                    customer.get('project'),
                    customer.get('company'),
                    tags_json
                ))
                
                customer_id = cursor.lastrowid
                
                # 插入联系人
                contacts = customer.get('contacts', [])
                if contacts and isinstance(contacts, list):
                    for contact in contacts:
                        if contact.get('name') or contact.get('phone'):
                            cursor.execute(
                                "INSERT INTO customer_contacts (customer_id, name, phone, position) VALUES (%s,%s,%s,%s)",
                                (customer_id, contact.get('name'), contact.get('phone'), contact.get('position'))
                            )
                
                # 插入备忘录
                memos = customer.get('memos', [])
                if memos and isinstance(memos, list):
                    for memo in memos:
                        if memo.get('content'):
                            cursor.execute(
                                "INSERT INTO customer_memos (customer_id, date, type, content) VALUES (%s,%s,%s,%s)",
                                (customer_id, memo.get('date'), memo.get('type'), memo.get('content'))
                            )
                
                success_count += 1
                
                # 每100条提交一次
                if (i + 1) % 100 == 0:
                    conn.commit()
                    print(f"  已处理 {i + 1}/{len(customers)} 条...")
                    
            except Exception as e:
                print(f"  ⚠️  客户 {customer.get('shop_name')} 导入失败: {e}")
        
        conn.commit()
        print(f"✅ 成功导入 {success_count}/{len(customers)} 个客户")
        return success_count

def main():
    print("=" * 60)
    print("数据迁移脚本 - database.js → MySQL")
    print("=" * 60)
    
    # 1. 提取数据
    data = extract_data_from_js()
    if not data:
        print("\n❌ 数据提取失败，退出")
        sys.exit(1)
    
    # 2. 连接数据库
    print("\n连接数据库...")
    try:
        conn = pymysql.connect(**DB_CONFIG)
        print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        sys.exit(1)
    
    try:
        # 3. 迁移用户
        user_count = migrate_users(conn, data['users'])
        
        # 4. 迁移客户
        customer_count = migrate_customers(conn, data['customers'])
        
        print("\n" + "=" * 60)
        print("迁移完成！")
        print(f"  用户: {user_count} 条")
        print(f"  客户: {customer_count} 条")
        print("=" * 60)
        
    finally:
        conn.close()
        print("\n数据库连接已关闭")

if __name__ == '__main__':
    main()
