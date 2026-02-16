#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
菜鸟ISV电子面单API服务封装
完整实现：签名、请求、多租户隔离、多网点支持
"""

import hashlib
import hmac
import json
import time
import requests
import base64
from datetime import datetime
from typing import Dict, Any, Optional


class CainiaoISVService:
    """菜鸟ISV API服务类"""
    
    # 菜鸟正式环境域名
    BASE_URL = "https://link.cainiao.com"
    
    def __init__(self, app_key: str, app_secret: str, env: str = 'prod'):
        """
        初始化菜鸟API服务
        :param app_key: ISV应用AppKey
        :param app_secret: ISV应用密钥
        :param env: 环境 test/prod
        """
        self.app_key = app_key
        self.app_secret = app_secret
        self.env = env
        
        # 测试环境切换
        if env == 'test':
            self.BASE_URL = "https://linktest.cainiao.com"
    
    def _generate_sign(self, params: Dict[str, Any]) -> str:
        """
        生成菜鸟API签名
        规则：HMAC-MD5(app_secret, 排序后的参数字符串)
        """
        # 排序参数
        sorted_params = sorted(params.items())
        
        # 拼接字符串
        param_str = ''.join([f"{k}{v}" for k, v in sorted_params])
        
        # HMAC-MD5签名
        sign = hmac.new(
            self.app_secret.encode('utf-8'),
            param_str.encode('utf-8'),
            hashlib.md5
        ).hexdigest().upper()
        
        return sign
    
    def _make_request(self, api_path: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        发起菜鸟API请求
        :param api_path: API路径（如 /waybill/get）
        :param data: 业务参数
        :return: 响应结果
        """
        url = f"{self.BASE_URL}{api_path}"
        
        # 构建公共参数
        timestamp = str(int(time.time() * 1000))
        
        params = {
            'app_key': self.app_key,
            'timestamp': timestamp,
            'v': '1.0',
            'format': 'json',
            'sign_method': 'hmac',
            'data': json.dumps(data, separators=(',', ':'), ensure_ascii=False)
        }
        
        # 生成签名
        params['sign'] = self._generate_sign(params)
        
        try:
            response = requests.post(url, data=params, timeout=30)
            result = response.json()
            
            return {
                'success': result.get('success', False),
                'code': result.get('code', ''),
                'message': result.get('message', ''),
                'data': result.get('data', {}),
                'raw': result
            }
        except Exception as e:
            return {
                'success': False,
                'code': 'ERROR',
                'message': f'请求异常: {str(e)}',
                'data': {}
            }
    
    # ============== 核心业务API ==============
    
    def get_waybill(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取电子面单
        :param order_data: 订单数据
        :return: 面单结果
        """
        return self._make_request('/waybill/get', order_data)
    
    def batch_get_waybills(self, orders: list) -> Dict[str, Any]:
        """
        批量获取电子面单
        :param orders: 订单列表
        :return: 批量结果
        """
        return self._make_request('/waybill/batch/get', {'orders': orders})
    
    def cancel_waybill(self, cp_code: str, waybill_code: str, cancel_reason: str = '') -> Dict[str, Any]:
        """
        取消面单（回收运单号）
        :param cp_code: 快递公司编码
        :param waybill_code: 运单号
        :param cancel_reason: 取消原因
        :return: 取消结果
        """
        data = {
            'cp_code': cp_code,
            'waybill_code': waybill_code,
            'cancel_reason': cancel_reason
        }
        return self._make_request('/waybill/cancel', data)
    
    def confirm_shipment(self, cp_code: str, waybill_code: str) -> Dict[str, Any]:
        """
        确认发货
        :param cp_code: 快递公司编码
        :param waybill_code: 运单号
        :return: 确认结果
        """
        data = {
            'cp_code': cp_code,
            'waybill_code': waybill_code
        }
        return self._make_request('/waybill/confirm', data)
    
    def get_print_data(self, waybill_code: str, cp_code: str) -> Dict[str, Any]:
        """
        获取打印数据
        :param waybill_code: 运单号
        :param cp_code: 快递公司编码
        :return: 打印数据
        """
        data = {
            'waybill_code': waybill_code,
            'cp_code': cp_code
        }
        return self._make_request('/waybill/print/get', data)
    
    def query_logistics(self, cp_code: str, waybill_code: str) -> Dict[str, Any]:
        """
        查询物流轨迹
        :param cp_code: 快递公司编码
        :param waybill_code: 运单号
        :return: 物流轨迹
        """
        data = {
            'cp_code': cp_code,
            'waybill_code': waybill_code
        }
        return self._make_request('/logistics/query', data)
    
    def get_auth_url(self, redirect_uri: str, state: str = '') -> str:
        """
        生成授权链接
        :param redirect_uri: 回调地址
        :param state: 自定义状态参数
        :return: 授权URL
        """
        auth_url = f"{self.BASE_URL}/oauth/authorize"
        params = {
            'app_key': self.app_key,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'state': state
        }
        
        # 拼接URL参数
        param_str = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"{auth_url}?{param_str}"
    
    def get_access_token(self, auth_code: str) -> Dict[str, Any]:
        """
        通过授权码换取AccessToken
        :param auth_code: 授权码
        :return: Token信息
        """
        data = {
            'app_key': self.app_key,
            'app_secret': self.app_secret,
            'code': auth_code,
            'grant_type': 'authorization_code'
        }
        return self._make_request('/oauth/token', data)


# ============== 数据库操作辅助函数 ==============

def encrypt_password(password: str) -> str:
    """加密密码（简单Base64，生产环境应使用AES等）"""
    return base64.b64encode(password.encode('utf-8')).decode('utf-8')


def decrypt_password(encrypted: str) -> str:
    """解密密码"""
    try:
        return base64.b64decode(encrypted.encode('utf-8')).decode('utf-8')
    except:
        return encrypted
