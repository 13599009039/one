# -*- coding: utf-8 -*-
"""
快递100物流服务封装
提供电子面单API调用、签名生成、连通性测试等功能
"""

import hashlib
import json
import time
import uuid
import requests
from datetime import datetime


class Kuaidi100Service:
    """快递100 API服务类"""
    
    def __init__(self, customer, auth_key, secret, endpoint_url='https://poll.kuaidi100.com'):
        """
        初始化快递100服务
        
        :param customer: 客户编码
        :param auth_key: 授权Key
        :param secret: 签名密钥
        :param endpoint_url: API接入点
        """
        self.customer = customer
        self.auth_key = auth_key
        self.secret = secret
        self.endpoint_url = endpoint_url.rstrip('/')
        self.timeout = 30
        self.max_retries = 3
    
    def _generate_sign(self, param_str):
        """
        生成签名（MD5方式）
        
        快适10100签名规则：sign = MD5(param + key + customer).toUpperCase()
        注意：使用key而非secret
        
        :param param_str: 参数JSON字符串
        :return: 签名字符串（大写）
        """
        sign_str = f"{param_str}{self.auth_key}{self.customer}"
        return hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
    
    def _make_request(self, api_path, param_data, method='POST'):
        """
        统一API请求方法
        
        :param api_path: API路径（如 /poll/query.do）
        :param param_data: 请求参数字典
        :param method: 请求方法
        :return: 统一格式的结果字典
        """
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # 构造请求参数（注意：JSON序列化时去除空格）
            param_json = json.dumps(param_data, separators=(',', ':'), ensure_ascii=True)
            sign = self._generate_sign(param_json)
            
            # 快递100标准POST参数
            post_data = {
                'customer': self.customer,
                'sign': sign,
                'param': param_json
            }
            
            # 发送请求
            url = f"{self.endpoint_url}{api_path}"
            response = requests.post(
                url,
                data=post_data,
                timeout=self.timeout,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            # 解析响应
            resp_data = response.json()
            
            # 快适10100成功标识：result=true 或 returnCode='200' 或 '500'（查询无结果但签名通过）
            success = (
                resp_data.get('result') is True or 
                resp_data.get('returnCode') == '200' or
                resp_data.get('status') == '200' or
                resp_data.get('returnCode') == '500'  # 查询无结果但API通信正常
            )
            
            return {
                'success': success,
                'code': resp_data.get('returnCode', resp_data.get('status', '500')),
                'message': resp_data.get('message', resp_data.get('msg', '未知错误')),
                'data': resp_data,
                'duration_ms': duration_ms,
                'request_id': request_id
            }
            
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'code': 'TIMEOUT',
                'message': f'请求超时（{self.timeout}秒）',
                'data': None,
                'duration_ms': int((time.time() - start_time) * 1000),
                'request_id': request_id,
                'error_type': 'TIMEOUT'
            }
        except requests.exceptions.ConnectionError as e:
            return {
                'success': False,
                'code': 'NETWORK_ERROR',
                'message': f'网络连接失败: {str(e)}',
                'data': None,
                'duration_ms': int((time.time() - start_time) * 1000),
                'request_id': request_id,
                'error_type': 'NETWORK_ERROR'
            }
        except Exception as e:
            return {
                'success': False,
                'code': 'SYSTEM_ERROR',
                'message': f'系统错误: {str(e)}',
                'data': None,
                'duration_ms': int((time.time() - start_time) * 1000),
                'request_id': request_id,
                'error_type': 'SYSTEM_ERROR'
            }
    
    def test_connection(self):
        """
        测试API连接（使用物流查询接口测试）
            
        :return: 测试结果字典
        """
        test_param = {
            'com': 'yuantong',  # 圆通速递
            'num': 'YT1234567890'  # 测试单号
        }
            
        result = self._make_request('/poll/query.do', test_param)
            
        # 快适10100即使单号不存在也会返回200/500，只要请求通就算测试成功
        if result['code'] in ['200', '500']:
            result['success'] = True
            result['message'] = '连接测试成功（快适10100接口正常）'
            
        return result
    
    def query_express(self, com, num, phone=''):
        """
        实时查询物流轨迹
        
        :param com: 快递公司编码（如 shunfeng、yuantong）
        :param num: 快递单号
        :param phone: 手机号后四位（顺丰必填）
        :return: 查询结果
        """
        param = {
            'com': com,
            'num': num,
            'phone': phone
        }
        
        return self._make_request('/poll/query.do', param)
    
    def create_waybill(self, order_data):
        """
        创建电子面单（下单接口）
        
        :param order_data: 订单数据字典，包含：
            - kuaidicom: 快递公司编码
            - recMan: 收件人信息 {name, mobile, printAddr}
            - sendMan: 寄件人信息 {name, mobile, printAddr}
            - cargo: 物品名称
            - count: 物品数量
            等...
        :return: 下单结果（含电子面单号）
        """
        # 快递100电子面单接口路径（根据实际文档调整）
        return self._make_request('/poll/order/create.do', order_data)
    
    @staticmethod
    def mask_sensitive_data(data):
        """
        脱敏敏感数据（用于日志存储）
        
        :param data: 原始数据字典
        :return: 脱敏后的字典
        """
        if not isinstance(data, dict):
            return data
        
        masked = data.copy()
        sensitive_keys = ['auth_key', 'secret', 'sign', 'mobile', 'phone']
        
        for key in sensitive_keys:
            if key in masked and masked[key]:
                value = str(masked[key])
                if len(value) > 4:
                    masked[key] = value[:2] + '****' + value[-2:]
                else:
                    masked[key] = '****'
        
        return masked
