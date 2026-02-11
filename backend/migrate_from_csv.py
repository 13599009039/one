#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从CSV文件直接导入数据到MySQL
"""

import csv
import pymysql
import sys

# 数据库配置
DB_CONFIG = {
    'host': '47.98.60.197',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4'
}

def migrate_users(conn):
    """插入默认管理员用户"""
    print("\n插入默认用户...")
    
    default_users = [
        ('admin', '123456', '系统管理员', None, 'super_admin', 1),
        ('ajadmin', '123456', 'AJ管理员', None, 'admin', 1),
        ('zhangsan', '123456', '张三', '小张', 'operation', 1),
        ('lisi', '123456', '李四', '小李', 'financial', 1),
        ('wangwu', '123456', '王五', '小王', 'operation', 1),
        ('zhaoliu', '123456', '赵六', '小赵', 'viewer', 1),
    ]
    
    with conn.cursor() as cursor:
        for user in default_users:
            try:
                sql = """INSERT INTO users (username, password, name, alias, role, company_id, status)
                         VALUES (%s, %s, %s, %s, %s, %s, 'enabled')
                         ON DUPLICATE KEY UPDATE name=VALUES(name)"""
                cursor.execute(sql, user)
            except Exception as e:
                print(f"  ⚠️  用户 {user[0]} 插入失败: {e}")
        
        conn.commit()
        print(f"✅ 默认用户插入完成")

def migrate_customers_from_csv(conn):
    """从CSV文件导入客户数据"""
    csv_file = '../shangjaimingxi.csv'
    
    print(f"\n开始从 {csv_file} 导入客户数据...")
    
    try:
        with open(csv_file, 'r', encoding='gbk') as f:
            reader = csv.DictReader(f)
            
            success_count = 0
            error_count = 0
            
            with conn.cursor() as cursor:
                for i, row in enumerate(reader):
                    try:
                        sql = """INSERT INTO customers (
                            merchant_id, shop_name, douyin_name, legal_person,
                            cooperation_mode, industry, status, follower_id,
                            business_staff, team, region, company
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
                        
                        # 从CSV提取字段
                        merchant_id = row.get('商家ID') or row.get('商家id')
                        shop_name = row.get('店铺名称') or row.get('商家名称')
                        douyin_name = row.get('抖音号')
                        legal_person = row.get('法人') or row.get('联系人')
                        cooperation_mode = row.get('合作模式') or row.get('业务类型')
                        industry = row.get('行业') or row.get('类目')
                        follower_username = row.get('跟进人') or row.get('对接人')
                        business_staff = follower_username
                        team = row.get('团队') or row.get('所属团队')
                        region = row.get('地区') or row.get('区域')
                        company = row.get('公司') or '许昌爱佳'
                        
                        if not shop_name:
                            continue
                        
                        cursor.execute(sql, (
                            merchant_id,
                            shop_name,
                            douyin_name,
                            legal_person,
                            cooperation_mode,
                            industry,
                            '跟进中',
                            1,  # 默认跟进人ID
                            business_staff,
                            team,
                            region,
                            company
                        ))
                        
                        success_count += 1
                        
                        # 每100条提交一次
                        if (i + 1) % 100 == 0:
                            conn.commit()
                            print(f"  已处理 {i + 1} 条...")
                            
                    except Exception as e:
                        error_count += 1
                        if error_count <= 5:  # 只打印前5个错误
                            print(f"  ⚠️  第 {i+1} 行导入失败: {e}")
                
                conn.commit()
                print(f"\n✅ 成功导入 {success_count} 个客户")
                if error_count > 0:
                    print(f"⚠️  {error_count} 条记录导入失败")
                
                return success_count
                
    except FileNotFoundError:
        print(f"❌ 文件未找到: {csv_file}")
        return 0
    except Exception as e:
        print(f"❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()
        return 0

def main():
    print("=" * 60)
    print("数据迁移脚本 - CSV → MySQL")
    print("=" * 60)
    
    # 连接数据库
    print("\n连接数据库...")
    try:
        conn = pymysql.connect(**DB_CONFIG)
        print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        sys.exit(1)
    
    try:
        # 1. 插入默认用户
        migrate_users(conn)
        
        # 2. 从CSV导入客户
        customer_count = migrate_customers_from_csv(conn)
        
        print("\n" + "=" * 60)
        print("迁移完成！")
        print(f"  用户: 6 个默认用户")
        print(f"  客户: {customer_count} 条")
        print("=" * 60)
        
    finally:
        conn.close()
        print("\n数据库连接已关闭")

if __name__ == '__main__':
    main()
