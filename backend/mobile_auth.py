# -*- coding: utf-8 -*-
"""
移动端权限认证模块
专为移动端设计，支持更长的Token过期时间
"""

from functools import wraps
from flask import request, jsonify
import jwt
import datetime
from typing import Optional, Tuple

# JWT密钥配置
JWT_SECRET = 'mobile_erp_secret_key_2026'  # 生产环境应使用环境变量
JWT_ALGORITHM = 'HS256'

# Token过期配置（移动端：30天，PC端：7天）
MOBILE_TOKEN_EXPIRE_DAYS = 30


def create_mobile_token(user_id: int, tenant_id: int, username: str) -> str:
    """
    创建移动端JWT Token
    
    参数：
        user_id: 用户ID
        tenant_id: 租户ID（company_id）
        username: 用户名
    
    返回：
        str: JWT Token
    """
    payload = {
        'user_id': user_id,
        'tenant_id': tenant_id,
        'username': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=MOBILE_TOKEN_EXPIRE_DAYS),
        'iat': datetime.datetime.utcnow()
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_mobile_token(token: str) -> Optional[dict]:
    """
    解析移动端JWT Token
    
    参数：
        token: JWT Token字符串
    
    返回：
        dict: Token payload，包含user_id、tenant_id、username
        None: Token无效或已过期
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token已过期
    except jwt.InvalidTokenError:
        return None  # Token无效


def get_mobile_token_from_request() -> Optional[str]:
    """
    从请求中获取Token
    
    支持两种方式：
    1. Header: Authorization: Bearer <token>
    2. Query: ?token=<token>
    
    返回：
        str: Token字符串
        None: 未找到Token
    """
    # 方式1: 从Authorization Header获取
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    
    # 方式2: 从Query参数获取
    token = request.args.get('token')
    if token:
        return token
    
    return None


def require_mobile_auth(f):
    """
    移动端权限装饰器
    
    功能：
    1. 验证JWT Token有效性
    2. 自动注入: current_user_id, current_tenant_id, current_username
    
    使用示例：
        @mobile_api_bp.route('/api/mobile/orders', methods=['GET'])
        @require_mobile_auth
        def get_orders(current_user_id, current_tenant_id, current_username):
            # 业务逻辑
            pass
    
    返回：
        - 401: Token缺失、无效或已过期
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. 获取Token
        token = get_mobile_token_from_request()
        if not token:
            return jsonify({
                'success': False,
                'code': 'TOKEN_MISSING',
                'message': 'Token缺失，请先登录'
            }), 401
        
        # 2. 解析Token
        payload = decode_mobile_token(token)
        if not payload:
            return jsonify({
                'success': False,
                'code': 'TOKEN_INVALID',
                'message': 'Token无效或已过期，请重新登录'
            }), 401
        
        # 3. 注入参数供业务函数使用
        kwargs['current_user_id'] = payload['user_id']
        kwargs['current_tenant_id'] = payload['tenant_id']
        kwargs['current_username'] = payload.get('username', '')
        
        return f(*args, **kwargs)
    
    return decorated_function


def response_success(data=None, message='success'):
    """
    统一成功响应格式
    
    参数：
        data: 返回数据
        message: 提示信息
    
    返回：
        JSON响应对象
    """
    return jsonify({
        'success': True,
        'code': 'SUCCESS',
        'message': message,
        'data': data
    })


def response_error(message: str, code: str = 'ERROR', status_code: int = 400):
    """
    统一错误响应格式
    
    参数：
        message: 错误信息
        code: 错误代码
        status_code: HTTP状态码
    
    返回：
        JSON响应对象和HTTP状态码
    """
    return jsonify({
        'success': False,
        'code': code,
        'message': message,
        'data': None
    }), status_code
