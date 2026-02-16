#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
菜鸟物流云API调用封装
作为ISV调用菜鸟API，为租户提供物流服务
"""

import hashlib
import hmac
import json
import time
import uuid
import requests
from datetime import datetime
from typing import Dict, Any, Optional


class CainiaoService:
    """菜鸟API调用服务"""
    
    def __init__(self, app_key: str, app_secret: str, endpoint_url: str = None, sign_method: str = 'md5'):
        """
        初始化菜鸟服务
        
        Args:
            app_key: 菜鸟AppKey
            app_secret: 菜鸟AppSecret
            endpoint_url: 接入点地址
            sign_method: 签名方式 md5/hmac
        """
        self.app_key = app_key
        self.app_secret = app_secret
        self.endpoint_url = endpoint_url or 'https://link.cainiao.com/gateway/link.do'
        self.sign_method = sign_method
        self.timeout = 30  # 请求超时时间（秒）
        self.retry_times = 3  # 重试次数
    
    def _generate_sign(self, params: Dict[str, Any]) -> str:
        """
        生成签名
        
        Args:
            params: 请求参数字典
            
        Returns:
            签名字符串（大写）
        """
        # 按参数名排序
        sorted_params = sorted(params.items())
        
        # 拼接字符串: secret + key1value1key2value2... + secret
        sign_str = self.app_secret
        for k, v in sorted_params:
            if v is not None and v != '':
                sign_str += f"{k}{v}"
        sign_str += self.app_secret
        
        if self.sign_method == 'md5':
            return hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
        elif self.sign_method == 'hmac':
            return hmac.new(
                self.app_secret.encode('utf-8'),
                sign_str.encode('utf-8'),
                hashlib.md5
            ).hexdigest().upper()
        else:
            raise ValueError(f"Unsupported sign method: {self.sign_method}")
    
    def _call_api(self, method: str, biz_params: Dict[str, Any], retry: int = 0) -> Dict[str, Any]:
        """
        调用菜鸟API（带重试机制）
        
        Args:
            method: API方法名
            biz_params: 业务参数
            retry: 当前重试次数
            
        Returns:
            API响应结果
        """
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        request_id = str(uuid.uuid4()).replace('-', '')
        
        params = {
            'app_key': self.app_key,
            'method': method,
            'timestamp': timestamp,
            'format': 'json',
            'v': '1.0',
            'sign_method': self.sign_method,
            'logistics_interface': json.dumps(biz_params, ensure_ascii=False)
        }
        
        params['sign'] = self._generate_sign(params)
        
        start_time = time.time()
        try:
            response = requests.post(
                self.endpoint_url, 
                data=params, 
                timeout=self.timeout,
                headers={'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'}
            )
            response_data = response.json()
            duration_ms = int((time.time() - start_time) * 1000)
            
            return {
                'success': response_data.get('success', False),
                'code': response_data.get('errorCode'),
                'message': response_data.get('errorMsg'),
                'data': response_data.get('data'),
                'duration_ms': duration_ms,
                'request_id': request_id
            }
            
        except requests.exceptions.Timeout:
            if retry < self.retry_times - 1:
                time.sleep(1 * (retry + 1))  # 指数退避
                return self._call_api(method, biz_params, retry + 1)
            
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'code': 'TIMEOUT',
                'message': f'API调用超时，已重试{retry + 1}次',
                'data': None,
                'duration_ms': duration_ms,
                'request_id': request_id
            }
            
        except requests.exceptions.ConnectionError:
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'code': 'NETWORK_ERROR',
                'message': '网络连接错误',
                'data': None,
                'duration_ms': duration_ms,
                'request_id': request_id
            }
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'code': 'SYSTEM_ERROR',
                'message': str(e),
                'data': None,
                'duration_ms': duration_ms,
                'request_id': request_id
            }
    
    # ==================== 地址服务 ====================
    
    def parse_address(self, address_text: str) -> Dict[str, Any]:
        """
        地址解析（简单解析）
        API: ADDRLIB_DIV_PARSE
        
        Args:
            address_text: 地址文本
            
        Returns:
            解析结果
        """
        return self._call_api('ADDRLIB_DIV_PARSE', {
            'address': address_text
        })
    
    def full_parse_address(self, address_text: str) -> Dict[str, Any]:
        """
        地址全解析（完整结构化）
        API: ADDRLIB_DIV_FULLPARSE
        
        Args:
            address_text: 地址文本（如：北京市朝阳区望京SOHO 13812345678 张三）
            
        Returns:
            解析结果，包含省/市/区/街道/详细地址/姓名/电话
        """
        return self._call_api('ADDRLIB_DIV_FULLPARSE', {
            'address': address_text
        })
    
    # ==================== 网点服务 ====================
    
    def find_send_branch(self, province: str, city: str, district: str, cp_code: str, 
                         town: str = None, detail_address: str = None) -> Dict[str, Any]:
        """
        查询就近寄件网点
        API: TMS_DISPATCH_FIND_SEND_BRANCH
        
        Args:
            province: 省
            city: 市
            district: 区
            cp_code: 快递公司编码（如 YTO/ZTO/SF）
            town: 镇/街道（可选）
            detail_address: 详细地址（可选）
            
        Returns:
            网点信息，包含网点编码、名称、联系电话
        """
        biz_params = {
            'cpCode': cp_code,
            'province': province,
            'city': city,
            'district': district
        }
        if town:
            biz_params['town'] = town
        if detail_address:
            biz_params['detailAddress'] = detail_address
            
        return self._call_api('TMS_DISPATCH_FIND_SEND_BRANCH', biz_params)
    
    # ==================== 电子面单服务 ====================
    
    def get_waybill(self, sender: Dict, receiver: Dict, cp_code: str, 
                    goods_name: str = None, weight: float = None) -> Dict[str, Any]:
        """
        获取电子面单号
        API: TMS_WAYBILL_GET
        
        Args:
            sender: 寄件人信息 {name, phone, province, city, district, address, town?}
            receiver: 收件人信息 {name, phone, province, city, district, address, town?}
            cp_code: 快递公司编码
            goods_name: 物品名称
            weight: 重量(kg)
            
        Returns:
            面单信息，包含面单号、打印数据
        """
        biz_params = {
            'cpCode': cp_code,
            'sender': {
                'name': sender.get('name'),
                'mobile': sender.get('phone'),
                'province': sender.get('province'),
                'city': sender.get('city'),
                'district': sender.get('district'),
                'detail': sender.get('address'),
            },
            'receiver': {
                'name': receiver.get('name'),
                'mobile': receiver.get('phone'),
                'province': receiver.get('province'),
                'city': receiver.get('city'),
                'district': receiver.get('district'),
                'detail': receiver.get('address'),
            }
        }
        
        if sender.get('town'):
            biz_params['sender']['town'] = sender['town']
        if receiver.get('town'):
            biz_params['receiver']['town'] = receiver['town']
        if goods_name:
            biz_params['goodsName'] = goods_name
        if weight:
            biz_params['weight'] = weight
            
        return self._call_api('TMS_WAYBILL_GET', biz_params)
    
    # ==================== 订单服务 ====================
    
    def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建快递订单（线下下单通知）
        API: TMS_CREATE_ORDER_OFFLINE_NOTIFY
        
        Args:
            order_data: 订单数据，包含：
                - waybill_no: 面单号
                - cp_code: 快递公司编码
                - sender: 寄件人信息
                - receiver: 收件人信息
                - goods_name: 物品名称
                - weight: 重量
                - branch_code: 网点编码
                
        Returns:
            订单创建结果，包含菜鸟订单号
        """
        biz_params = {
            'mailNo': order_data.get('waybill_no'),
            'cpCode': order_data.get('cp_code'),
            'sender': {
                'name': order_data['sender'].get('name'),
                'mobile': order_data['sender'].get('phone'),
                'province': order_data['sender'].get('province'),
                'city': order_data['sender'].get('city'),
                'district': order_data['sender'].get('district'),
                'detail': order_data['sender'].get('address'),
            },
            'receiver': {
                'name': order_data['receiver'].get('name'),
                'mobile': order_data['receiver'].get('phone'),
                'province': order_data['receiver'].get('province'),
                'city': order_data['receiver'].get('city'),
                'district': order_data['receiver'].get('district'),
                'detail': order_data['receiver'].get('address'),
            }
        }
        
        # 可选字段
        if order_data.get('goods_name'):
            biz_params['goodsName'] = order_data['goods_name']
        if order_data.get('weight'):
            biz_params['weight'] = order_data['weight']
        if order_data.get('branch_code'):
            biz_params['sendBranchCode'] = order_data['branch_code']
        if order_data.get('remark'):
            biz_params['remark'] = order_data['remark']
            
        return self._call_api('TMS_CREATE_ORDER_OFFLINE_NOTIFY', biz_params)
    
    def cancel_order(self, cainiao_order_id: str, reason: str = None) -> Dict[str, Any]:
        """
        取消快递订单
        API: TMS_ORDER_CANCEL
        
        Args:
            cainiao_order_id: 菜鸟订单号
            reason: 取消原因
            
        Returns:
            取消结果
        """
        biz_params = {
            'orderId': cainiao_order_id
        }
        if reason:
            biz_params['cancelReason'] = reason
            
        return self._call_api('TMS_ORDER_CANCEL', biz_params)
    
    # ==================== 回调验签 ====================
    
    def verify_callback_sign(self, data: Dict[str, Any], sign: str) -> bool:
        """
        验证回调签名
        
        Args:
            data: 回调数据
            sign: 回调签名
            
        Returns:
            签名是否有效
        """
        # 根据菜鸟回调签名规则实现
        # 通常是对data进行排序拼接后计算签名
        try:
            # 拼接字符串
            sorted_data = sorted(data.items())
            sign_str = self.app_secret
            for k, v in sorted_data:
                if k != 'sign' and v is not None and v != '':
                    sign_str += f"{k}{v}"
            sign_str += self.app_secret
            
            # 计算签名
            calculated_sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
            return calculated_sign == sign.upper()
        except Exception:
            return False
    
    # ==================== 连通性测试 ====================
    
    def test_connection(self) -> Dict[str, Any]:
        """
        测试API连通性
        通过调用地址解析接口测试
        
        Returns:
            测试结果
        """
        try:
            result = self.parse_address('北京市朝阳区')
            return {
                'success': True,
                'message': '连接成功',
                'duration_ms': result.get('duration_ms', 0)
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'连接失败: {str(e)}',
                'duration_ms': 0
            }


# 数据脱敏工具
def mask_sensitive_data(data: Dict[str, Any], fields_to_mask: list = None) -> Dict[str, Any]:
    """
    对敏感数据进行脱敏处理
    
    Args:
        data: 原始数据
        fields_to_mask: 需要脱敏的字段列表
        
    Returns:
        脱敏后的数据
    """
    if fields_to_mask is None:
        fields_to_mask = ['phone', 'mobile', 'app_secret', 'password', 'token']
    
    if not isinstance(data, dict):
        return data
    
    masked = {}
    for k, v in data.items():
        if k.lower() in fields_to_mask or any(f in k.lower() for f in fields_to_mask):
            if isinstance(v, str) and len(v) > 4:
                masked[k] = v[:3] + '*' * (len(v) - 4) + v[-1:]
            else:
                masked[k] = '***'
        elif isinstance(v, dict):
            masked[k] = mask_sensitive_data(v, fields_to_mask)
        elif isinstance(v, list):
            masked[k] = [mask_sensitive_data(item, fields_to_mask) if isinstance(item, dict) else item for item in v]
        else:
            masked[k] = v
    
    return masked
