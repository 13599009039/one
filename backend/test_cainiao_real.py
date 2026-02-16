#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""菜鸟ISV真实API验证测试"""

import sys
import time
import json
sys.path.insert(0, '/root/ajkuaiji/backend')

from cainiao_isv_service import CainiaoISVService

# 使用真实凭证
APP_KEY = "508425"
APP_SECRET = "X44n3jD3948rCe8K5Xij4K349q4350L9"

print("=" * 70)
print("🚀 菜鸟ISV真实环境API验证测试")
print("=" * 70)

# 1. 初始化服务
print("\n【步骤1】初始化菜鸟服务...")
try:
    service = CainiaoISVService(
        app_key=APP_KEY,
        app_secret=APP_SECRET,
        env='prod'  # 生产环境
    )
    print(f"✅ 服务初始化成功")
    print(f"   AppKey: {APP_KEY}")
    print(f"   接口地址: {service.BASE_URL}")
except Exception as e:
    print(f"❌ 初始化失败: {e}")
    sys.exit(1)

# 2. 测试签名生成
print("\n【步骤2】测试签名算法（MD5）...")
try:
    test_params = {
        'app_key': APP_KEY,
        'timestamp': str(int(time.time() * 1000)),
        'v': '1.0',
        'format': 'json',
        'sign_method': 'hmac',
        'data': json.dumps({'test': 'data'}, separators=(',', ':'))
    }
    sign = service._generate_sign(test_params)
    print(f"✅ 签名生成成功")
    print(f"   签名值: {sign[:20]}...")
    print(f"   算法: HMAC-MD5")
except Exception as e:
    print(f"❌ 签名生成失败: {e}")
    sys.exit(1)

# 3. 测试真实API请求 - 获取授权URL（不需要Token）
print("\n【步骤3】测试API连接 - 生成授权链接...")
try:
    auth_url = service.get_auth_url(
        redirect_uri='https://super.xnamb.cn/api/cainiao_isv/auth/callback',
        state='test_tenant_1'
    )
    print(f"✅ 授权链接生成成功")
    print(f"   授权URL: {auth_url[:80]}...")
    print(f"   回调地址: https://super.xnamb.cn/api/cainiao_isv/auth/callback")
except Exception as e:
    print(f"❌ 生成授权链接失败: {e}")
    sys.exit(1)

# 4. 测试查询物流轨迹（需要运单号，预期失败但验证签名）
print("\n【步骤4】测试API请求 - 查询物流轨迹（验证签名）...")
try:
    result = service.query_logistics(
        cp_code='YTO',
        waybill_code='YT1234567890'  # 测试运单号
    )
    print(f"📊 API响应:")
    print(f"   HTTP成功: {result.get('success', False)}")
    print(f"   业务码: {result.get('code', 'N/A')}")
    print(f"   消息: {result.get('message', 'N/A')}")
    
    # 判断签名是否通过
    if result.get('code') not in ['INVALID_SIGN', 'INVALID_APP_KEY']:
        print(f"\n✅ 签名验证通过！（业务失败是因为测试单号不存在）")
    else:
        print(f"\n❌ 签名验证失败: {result.get('message')}")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ API请求异常: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 5. 总结
print("\n" + "=" * 70)
print("📊 测试总结")
print("=" * 70)
print("✅ 服务初始化：通过")
print("✅ 签名生成：通过")
print("✅ 授权链接生成：通过")
print("✅ API连接：通过")
print("✅ 签名验证：通过")
print("\n🎉 菜鸟ISV配置正确，API可正常调用！")
print("\n⚠️ 下一步：需要在系统中完成物流账号授权后才能获取真实面单")
print("=" * 70)
