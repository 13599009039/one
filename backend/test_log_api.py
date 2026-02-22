#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试移动端日志系统
模拟各种类型的错误日志上报
"""

import requests
import json
from datetime import datetime

API_BASE_URL = "http://localhost:8051"

def test_error_log():
    """测试错误日志记录接口"""
    
    print("=" * 60)
    print("测试移动端日志系统")
    print("=" * 60)
    
    # 测试1: Vue错误
    print("\n[测试1] 上报Vue组件错误...")
    log_data = {
        "company_id": 1,
        "user_id": 1,
        "error_type": "vue_error",
        "error_level": "error",
        "error_message": "Cannot read property 'name' of undefined",
        "error_stack": "TypeError: Cannot read property 'name' of undefined\n    at CustomerList.vue:45\n    at Array.map",
        "page_url": "http://m.erp.xnamb.cn/main/customer",
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        "device_info": json.dumps({
            "device": "iOS",
            "screen": "375x812",
            "viewport": "375x667",
            "pixelRatio": 2
        }),
        "browser_info": json.dumps({
            "browser": "Safari",
            "version": "15",
            "language": "zh-CN",
            "online": True
        }),
        "performance_metric": json.dumps({
            "component": "CustomerList",
            "lifecycle": "mounted"
        })
    }
    
    response = requests.post(f"{API_BASE_URL}/api/mobile/logs/error", json=log_data)
    print(f"响应状态: {response.status_code}")
    print(f"响应内容: {response.json()}")
    
    # 测试2: API错误
    print("\n[测试2] 上报API请求错误...")
    log_data = {
        "company_id": 1,
        "user_id": 1,
        "error_type": "api_error",
        "error_level": "error",
        "error_message": "API请求失败",
        "error_stack": "Error: Request failed with status code 500",
        "page_url": "http://m.erp.xnamb.cn/main/order",
        "user_agent": "Mozilla/5.0 (Linux; Android 11; SM-G991B)",
        "device_info": json.dumps({
            "device": "Android",
            "screen": "360x780"
        }),
        "browser_info": json.dumps({
            "browser": "Chrome",
            "version": "96"
        }),
        "api_url": "/api/mobile/orders",
        "api_method": "GET",
        "api_status": 500,
        "api_response": json.dumps({
            "error": "Internal Server Error"
        })
    }
    
    response = requests.post(f"{API_BASE_URL}/api/mobile/logs/error", json=log_data)
    print(f"响应状态: {response.status_code}")
    print(f"响应内容: {response.json()}")
    
    # 测试3: JavaScript错误
    print("\n[测试3] 上报JavaScript错误...")
    log_data = {
        "company_id": 1,
        "user_id": 1,
        "error_type": "js_error",
        "error_level": "error",
        "error_message": "Uncaught ReferenceError: calculateTotal is not defined",
        "error_stack": "ReferenceError: calculateTotal is not defined\n    at order.vue:120:15",
        "page_url": "http://m.erp.xnamb.cn/order/detail/123",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    response = requests.post(f"{API_BASE_URL}/api/mobile/logs/error", json=log_data)
    print(f"响应状态: {response.status_code}")
    print(f"响应内容: {response.json()}")
    
    # 测试4: 性能问题
    print("\n[测试4] 上报性能问题...")
    log_data = {
        "company_id": 1,
        "user_id": 1,
        "error_type": "performance",
        "error_level": "warning",
        "error_message": "PageLoad超过阈值: 5234ms",
        "error_stack": "",
        "page_url": "http://m.erp.xnamb.cn/main/statistics",
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
        "performance_metric": json.dumps({
            "metric": "PageLoad",
            "value": 5234,
            "threshold": 3000
        })
    }
    
    response = requests.post(f"{API_BASE_URL}/api/mobile/logs/error", json=log_data)
    print(f"响应状态: {response.status_code}")
    print(f"响应内容: {response.json()}")
    
    # 测试5: 查询日志列表
    print("\n[测试5] 查询日志列表（需要登录）...")
    print("提示: 需要先登录获取token才能查询日志")
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)

if __name__ == "__main__":
    test_error_log()
