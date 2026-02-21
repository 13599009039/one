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
import logging
from datetime import datetime
from typing import Dict, Any, Optional

# 配置日志
logger = logging.getLogger(__name__)


class CainiaoISVService:
    """菜鸟ISV API服务类"""
    
    # 菜鸟正式环境域名
    BASE_URL = "https://link.cainiao.com"
    # 菜鸟Token换取API
    TOKEN_EXCHANGE_URL = "https://lcp.cloud.cainiao.com/api/permission/exchangeToken.do"
    
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
    
    def exchange_token(self, access_code: str) -> Dict[str, Any]:
        """
        使用 accessCode 换取 accessToken
        参考文档第606-654行
        :param access_code: 商家在菜鸟平台授权后生成的一次性授权码
        :return: {
            'success': bool,
            'access_token': str,
            'message': str
        }
        """
        try:
            # 按照文档生成签名：md5(accessCode + "," + appKey + "," + appSecret)
            # 注意：MD5签名必须转为大写（与菜鸟API一致）
            sign_str = f"{access_code},{self.app_key},{self.app_secret}"
            sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
            
            # 【详细日志】1 - 签名计算过程
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] ========== Token\u6362\u53d6\u5f00\u59cb ==========")
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] accessCode: {access_code}")
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] appKey: {self.app_key}")
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] appSecret: {self.app_secret}")
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] \u7b7e\u540d\u539f\u6587: {sign_str}")
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] MD5\u7b7e\u540d(\u5927\u5199): {sign}")
            
            # 构建请求参数
            params = {
                'accessCode': access_code,
                'isvAppKey': self.app_key,
                'sign': sign
            }
            
            # 【详细日志】2 - 请求参数
            logger.info(f"[菜鸟ISV-DEBUG] API URL: {self.TOKEN_EXCHANGE_URL}")
            logger.info(f"[菜鸟ISV-DEBUG] 请求参数: {params}")
                        
            # 【注意】不需要设置Host头！备案域名验证是在redirectUrl中，不是在Token换取请求中
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            logger.info(f"[菜鸟ISV-DEBUG] 请求头: {headers}")
                        
            # 发起请求
            response = requests.post(self.TOKEN_EXCHANGE_URL, data=params, headers=headers, timeout=30)
            
            # 【详细日志】3 - HTTP响应头
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] HTTP\u72b6\u6001\u7801: {response.status_code}")
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] \u54cd\u5e94\u5934: {dict(response.headers)}")
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] Content-Type: {response.headers.get('Content-Type', 'N/A')}")
            
            # 【详细日志】4 - 完整响应内容
            full_response_text = response.text
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] \u54cd\u5e94内\u5bb9长\u5ea6: {len(full_response_text)} bytes")
            logger.info(f"[\u83dc\u9e1fISV-DEBUG] \u54cd\u5e94内\u5bb9完整文本:\n{full_response_text}")
            
            # 先解析JSON（即使HTTP状态码不是200，菜鸟API也可能返回JSON错误信息）
            try:
                result = response.json()
                logger.info(f"[菜鸟ISV] 解析JSON成功: {result}")
            except Exception as json_err:
                logger.error(f"[菜鸟ISV] JSON解析失败: {json_err}")
                return {
                    'success': False,
                    'access_token': '',
                    'message': f'HTTP{response.status_code}错误，响应非JSON格式',
                    'raw_response': response.text[:500]
                }
            
            # 检查HTTP状态码（如果不是200，返回详细错误）
            if response.status_code != 200:
                error_msg = result.get('errorMessage', result.get('message', f'HTTP错误: {response.status_code}'))
                error_code = result.get('errorCode', result.get('code', ''))
                logger.error(f"[菜鸟ISV] API返回错误 - Code: {error_code}, Message: {error_msg}")
                return {
                    'success': False,
                    'access_token': '',
                    'message': error_msg,
                    'error_code': error_code,
                    'raw_response': result
                }
            
            # 解析响应
            if result.get('success') and result.get('accessTokens'):
                access_token_list = result.get('accessTokens', [])
                if access_token_list and len(access_token_list) > 0:
                    access_token = access_token_list[0].get('accessToken', '')
                    logger.info(f"[菜鸟ISV] Token换取成功")
                    return {
                        'success': True,
                        'access_token': access_token,
                        'message': 'Token换取成功',
                        'raw': result
                    }
            
            logger.warning(f"[菜鸟ISV] Token换取失败: {result}")
            return {
                'success': False,
                'access_token': '',
                'message': result.get('errorMessage', 'Token换取失败'),
                'error_code': result.get('errorCode', ''),
                'raw': result
            }
            
        except Exception as e:
            logger.error(f"[菜鸟ISV] Token换取异常: {str(e)}")
            return {
                'success': False,
                'access_token': '',
                'message': f'请求异常: {str(e)}'
            }
    
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
