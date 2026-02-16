#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
菜鸟ISV API快速测试脚本
用于验证API配置和连接是否正常
"""

from cainiao_isv_service import CainiaoISVService
import json

# ========== 配置区域（请填写你的ISV凭证） ==========
APP_KEY = ""  # 填写你的菜鸟ISV AppKey
APP_SECRET = ""  # 填写你的菜鸟ISV AppSecret
ENV = "test"  # test测试环境 / prod生产环境

# ========== 测试数据 ==========
test_order_data = {
    "cpCode": "YTO",  # 圆通速递
    "orderCode": "TEST" + str(int(time.time())),  # 测试订单号
    "sender": {
        "name": "张三",
        "phone": "13800138000",
        "province": "浙江省",
        "city": "杭州市",
        "area": "余杭区",
        "address": "文一西路969号"
    },
    "receiver": {
        "name": "李四",
        "phone": "13900139000",
        "province": "广东省",
        "city": "深圳市",
        "area": "南山区",
        "address": "科技园南区深南大道9999号"
    },
    "cargo": {
        "weight": 1.0,
        "count": 1
    }
}


def test_cainiao_connection():
    """测试菜鸟API连接"""
    
    print("=" * 60)
    print("菜鸟ISV API连接测试")
    print("=" * 60)
    
    # 1. 检查配置
    if not APP_KEY or not APP_SECRET:
        print("❌ 错误：请先配置APP_KEY和APP_SECRET")
        print("\n请在脚本开头填写你的菜鸟ISV凭证：")
        print("  APP_KEY = '你的AppKey'")
        print("  APP_SECRET = '你的AppSecret'")
        return False
    
    print(f"\n✅ 配置检查通过")
    print(f"   AppKey: {APP_KEY[:8]}***")
    print(f"   环境: {ENV}")
    
    # 2. 初始化服务
    try:
        service = CainiaoISVService(
            app_key=APP_KEY,
            app_secret=APP_SECRET,
            env=ENV
        )
        print(f"\n✅ 菜鸟服务初始化成功")
        print(f"   接口地址: {service.BASE_URL}")
    except Exception as e:
        print(f"\n❌ 服务初始化失败: {e}")
        return False
    
    # 3. 测试签名生成
    try:
        test_params = {
            'app_key': APP_KEY,
            'timestamp': '1234567890',
            'v': '1.0',
            'format': 'json',
            'data': '{"test":"data"}'
        }
        sign = service._generate_sign(test_params)
        print(f"\n✅ 签名生成成功")
        print(f"   签名: {sign[:16]}...")
    except Exception as e:
        print(f"\n❌ 签名生成失败: {e}")
        return False
    
    # 4. 测试API请求（查询快递公司列表 - 不需要授权）
    print("\n" + "=" * 60)
    print("测试API请求：查询支持的快递公司列表")
    print("=" * 60)
    
    try:
        result = service._make_request('/express/query', {})
        print(f"\n📊 API响应:")
        print(f"   成功: {result.get('success', False)}")
        print(f"   状态码: {result.get('code', 'N/A')}")
        print(f"   消息: {result.get('message', 'N/A')}")
        
        if result.get('success'):
            print(f"\n✅ API连接测试通过！")
            return True
        else:
            print(f"\n⚠️ API返回失败，但连接正常")
            print(f"   完整响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            return True  # 连接正常，只是业务逻辑失败
    except Exception as e:
        print(f"\n❌ API请求失败: {e}")
        return False


def test_get_waybill():
    """测试获取电子面单（需要先有物流账号授权）"""
    
    print("\n" + "=" * 60)
    print("测试获取电子面单")
    print("=" * 60)
    
    if not APP_KEY or not APP_SECRET:
        print("❌ 错误：请先配置APP_KEY和APP_SECRET")
        return False
    
    service = CainiaoISVService(APP_KEY, APP_SECRET, ENV)
    
    try:
        import time
        test_order_data['orderCode'] = "TEST" + str(int(time.time()))
        
        result = service.get_waybill(test_order_data)
        
        print(f"\n📊 获取面单结果:")
        print(f"   成功: {result.get('success', False)}")
        print(f"   状态码: {result.get('code', 'N/A')}")
        print(f"   消息: {result.get('message', 'N/A')}")
        
        if result.get('success'):
            print(f"\n✅ 面单获取成功！")
            print(f"   运单号: {result.get('data', {}).get('waybill_code', 'N/A')}")
        else:
            print(f"\n⚠️ 面单获取失败（可能需要先授权物流账号）")
            print(f"   完整响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        return result.get('success', False)
    except Exception as e:
        print(f"\n❌ 面单获取异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试流程"""
    
    print("\n" + "=" * 60)
    print("🚀 菜鸟ISV API完整测试")
    print("=" * 60)
    
    # 测试1：连接测试
    connection_ok = test_cainiao_connection()
    
    if not connection_ok:
        print("\n❌ 连接测试失败，请检查配置")
        return
    
    # 测试2：获取面单（可选，需要授权）
    print("\n" + "=" * 60)
    print("是否测试获取电子面单？")
    print("注意：需要先在系统中完成物流账号授权")
    print("=" * 60)
    
    test_waybill = input("\n输入 y 继续测试面单获取，其他键跳过: ").lower()
    
    if test_waybill == 'y':
        test_get_waybill()
    else:
        print("\n⏭️ 跳过面单获取测试")
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)


if __name__ == '__main__':
    main()
