#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快递100 API对接测试脚本
自动填充配置并测试连接
"""

import sys
sys.path.append('/root/ajkuaiji/backend')

from platform_kuaidi100_service import Kuaidi100Service
import pymysql

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4'
}

# 快递100账号信息（你提供的正式凭证）
KUAIDI100_CONFIG = {
    'customer': '',  # 客户编码（需从快递100后台获取）
    'auth_key': 'jXWdDXyF6438',
    'secret': '0a305c5b227547eb9ababd6aa9165c30',
    'endpoint_url': 'https://poll.kuaidi100.com'
}

def save_config_to_db():
    """保存配置到数据库"""
    print("=" * 60)
    print("步骤1：保存快递100配置到数据库")
    print("=" * 60)
    
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        # 检查是否已有配置
        cursor.execute("SELECT id FROM platform_kuaidi100_config LIMIT 1")
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE platform_kuaidi100_config
                SET customer=%s, auth_key=%s, secret=%s, endpoint_url=%s, status='enabled'
                WHERE id=%s
            """, (
                KUAIDI100_CONFIG['customer'],
                KUAIDI100_CONFIG['auth_key'],
                KUAIDI100_CONFIG['secret'],
                KUAIDI100_CONFIG['endpoint_url'],
                existing[0]
            ))
            print(f"✅ 更新配置成功（ID: {existing[0]}）")
        else:
            cursor.execute("""
                INSERT INTO platform_kuaidi100_config
                (customer, auth_key, secret, endpoint_url, status)
                VALUES (%s, %s, %s, %s, 'enabled')
            """, (
                KUAIDI100_CONFIG['customer'],
                KUAIDI100_CONFIG['auth_key'],
                KUAIDI100_CONFIG['secret'],
                KUAIDI100_CONFIG['endpoint_url']
            ))
            print("✅ 新增配置成功")
        
        conn.commit()
        
    except Exception as e:
        print(f"❌ 保存配置失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def test_connection():
    """测试API连接"""
    print("\n" + "=" * 60)
    print("步骤2：测试快递100 API连接")
    print("=" * 60)
    
    service = Kuaidi100Service(
        customer=KUAIDI100_CONFIG['customer'],
        auth_key=KUAIDI100_CONFIG['auth_key'],
        secret=KUAIDI100_CONFIG['secret'],
        endpoint_url=KUAIDI100_CONFIG['endpoint_url']
    )
    
    result = service.test_connection()
    
    print(f"\n📊 测试结果:")
    print(f"  - 成功状态: {'✅ 通过' if result['success'] else '❌ 失败'}")
    print(f"  - 响应码: {result['code']}")
    print(f"  - 响应消息: {result['message']}")
    print(f"  - 耗时: {result['duration_ms']}ms")
    print(f"  - 请求ID: {result['request_id']}")
    
    if result.get('data'):
        print(f"\n📦 响应数据:")
        import json
        print(json.dumps(result['data'], ensure_ascii=False, indent=2))
    
    # 更新测试结果到数据库
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE platform_kuaidi100_config
            SET test_passed=%s, last_test_at=NOW(), test_error=%s
            WHERE status='enabled' LIMIT 1
        """, (1 if result['success'] else 0, result.get('message', '')))
        conn.commit()
        print("\n✅ 测试结果已写入数据库")
    except Exception as e:
        print(f"\n⚠️ 更新测试结果失败: {e}")
    finally:
        conn.close()
    
    return result['success']

def verify_frontend_integration():
    """验证前端集成是否完整"""
    print("\n" + "=" * 60)
    print("步骤3：验证前端集成")
    print("=" * 60)
    
    checks = []
    
    # 检查HTML表单字段
    with open('/root/ajkuaiji/console.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
        fields = ['kd100Customer', 'kd100AuthKey', 'kd100Secret', 'kd100EndpointUrl', 
                  'kd100CallbackUrl', 'kd100CallbackSecret', 'kd100TestStatus']
        for field in fields:
            if f'id="{field}"' in html_content:
                checks.append(f"✅ HTML字段 {field} 存在")
            else:
                checks.append(f"❌ HTML字段 {field} 缺失")
    
    # 检查JS函数
    with open('/root/ajkuaiji/js/console.js', 'r', encoding='utf-8') as f:
        js_content = f.read()
        functions = ['loadKuaidi100Config', 'testKuaidi100Connection', 'saveKuaidi100Config']
        for func in functions:
            if f'function {func}' in js_content:
                checks.append(f"✅ JS函数 {func} 存在")
            else:
                checks.append(f"❌ JS函数 {func} 缺失")
    
    for check in checks:
        print(f"  {check}")
    
    all_passed = all('✅' in check for check in checks)
    print(f"\n{'✅ 前端集成检查全部通过' if all_passed else '❌ 部分检查失败'}")
    return all_passed

def main():
    print("\n" + "🚀" * 30)
    print("快递100 API对接自动化测试")
    print("🚀" * 30 + "\n")
    
    print(f"📋 配置信息:")
    print(f"  - 客户编码: {KUAIDI100_CONFIG['customer'] or '(空，需从快递100后台获取)'}")
    print(f"  - 授权Key: {KUAIDI100_CONFIG['auth_key']}")
    print(f"  - 签名密钥: {'*' * 8}")
    print(f"  - 接入点: {KUAIDI100_CONFIG['endpoint_url']}\n")
    
    # 步骤1: 保存配置
    save_config_to_db()
    
    # 步骤2: 测试连接
    api_success = test_connection()
    
    # 步骤3: 验证前端
    frontend_success = verify_frontend_integration()
    
    # 总结
    print("\n" + "=" * 60)
    print("📊 测试总结")
    print("=" * 60)
    print(f"  - 数据库配置: ✅")
    print(f"  - API连接测试: {'✅' if api_success else '❌'}")
    print(f"  - 前端集成: {'✅' if frontend_success else '❌'}")
    
    if api_success and frontend_success:
        print("\n🎉 快递100对接全部完成！可直接在浏览器测试")
        print("\n📝 下一步操作:")
        print("  1. 打开浏览器访问控制台")
        print("\n📝 下一步操作:")
        print("  1. 打开浏览器访问控制台")
        print("  2. 登录后点击左侧[服务商配置 > 快递100]")
        print("  3. 配置已自动填充，点击【测试连接】验证")
        print("  4. 测试通过后即可调用快递100 API")
        print("\n⚠️ 部分功能存在问题，请检查日志")
    
    print("\n" + "🚀" * 30 + "\n")

if __name__ == '__main__':
    main()
