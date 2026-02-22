# -*- coding: utf-8 -*-
"""
移动端认证API
提供登录、退出、Token刷新等接口
"""

from flask import Blueprint, request
import pymysql
import hashlib
from datetime import datetime

# 导入移动端权限模块
from mobile_auth import (
    create_mobile_token,
    decode_mobile_token,
    get_mobile_token_from_request,
    require_mobile_auth,
    response_success,
    response_error
)

# 创建Blueprint
mobile_auth_bp = Blueprint('mobile_auth', __name__)

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4'
}

def get_db_connection():
    """获取数据库连接"""
    return pymysql.connect(**DB_CONFIG)


# ============================================================
# 移动端登录API
# ============================================================

@mobile_auth_bp.route('/api/mobile/auth/login', methods=['POST'])
def mobile_login():
    """
    移动端用户登录
    
    请求体:
    {
        "username": "13800138000",   // 手机号或用户名
        "password": "123456"          // 明文密码
    }
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "登录成功",
        "data": {
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "user": {
                "id": 123,
                "username": "zhangsan",
                "realname": "张三",
                "phone": "13800138000",
                "email": "zhangsan@example.com",
                "role": "admin"
            },
            "tenant": {
                "id": 1,
                "name": "示例公司",
                "industry": "零售"
            }
        }
    }
    """
    try:
        # 1. 获取请求参数
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return response_error('用户名和密码不能为空', 'PARAM_ERROR')
        
        # 2. 查询用户信息
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            # 查询用户（支持手机号或用户名登录）
            cursor.execute("""
                SELECT 
                    u.id, u.username, u.password, u.name, u.phone, 
                    u.email, u.status, uc.company_id, uc.role, uc.status as user_company_status,
                    c.name as company_name, c.industry, c.mobile_access
                FROM users u
                LEFT JOIN user_companies uc ON u.id = uc.user_id
                LEFT JOIN companies c ON uc.company_id = c.id
                WHERE (u.username = %s OR u.phone = %s)
                  AND uc.status = 'active'
                  AND c.status = 'active'
                LIMIT 1
            """, (username, username))
            
            user = cursor.fetchone()
            
            if not user:
                return response_error('用户不存在或未绑定公司', 'USER_NOT_FOUND', 404)
            
            # 3. 验证用户状态
            if user['status'] != 'enabled':
                return response_error('账号已被禁用，请联系管理员', 'USER_DISABLED', 403)
            
            if user['user_company_status'] != 'active':
                return response_error('您在该公司的权限已被停用', 'COMPANY_DISABLED', 403)
            
            # 4. 验证移动端访问权限
            if not user.get('mobile_access', 1):  # 默认值为1（允许）
                return response_error('请联系管理员开通移动端访问权限', 'MOBILE_ACCESS_DENIED', 403)
            
            # 5. 验证密码（明文对比，与PC端一致）
            if user['password'] != password:
                return response_error('密码错误', 'PASSWORD_ERROR', 401)
            
            # 6. 生成移动端Token（30天过期）
            token = create_mobile_token(
                user_id=user['id'],
                tenant_id=user['company_id'],
                username=user['username']
            )
            
            # 7. 记录登录日志
            try:
                cursor.execute("""
                    INSERT INTO login_logs 
                    (user_id, company_id, login_time, ip_address, device_type, platform)
                    VALUES (%s, %s, NOW(), %s, 'mobile', 'mobile_erp')
                """, (
                    user['id'],
                    user['company_id'],
                    request.remote_addr
                ))
                conn.commit()
            except Exception as log_error:
                print(f"[Mobile Login] 登录日志记录失败: {log_error}")
                # 登录日志失败不影响登录流程
            
            # 8. 返回成功响应
            return response_success(
                data={
                    'token': token,
                    'user': {
                        'id': user['id'],
                        'username': user['username'],
                        'name': user['name'],
                        'phone': user['phone'],
                        'email': user['email'],
                        'role': user['role']
                    },
                    'tenant': {
                        'id': user['company_id'],
                        'name': user['company_name'],
                        'industry': user['industry']
                    }
                },
                message='登录成功'
            )
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"[Mobile Login Error] {str(e)}")
        return response_error(f'登录失败: {str(e)}', 'SERVER_ERROR', 500)


# ============================================================
# 移动端退出API
# ============================================================

@mobile_auth_bp.route('/api/mobile/auth/logout', methods=['POST'])
@require_mobile_auth
def mobile_logout(current_user_id, current_tenant_id, current_username):
    """
    移动端用户退出
    
    请求头:
    Authorization: Bearer <token>
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "退出成功"
    }
    """
    try:
        # 移动端使用JWT Token，无需服务端清理Session
        # 客户端删除本地Token即可
        
        # 可选：记录退出日志
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO login_logs 
                (user_id, company_id, logout_time, platform)
                VALUES (%s, %s, NOW(), 'mobile_erp')
            """, (current_user_id, current_tenant_id))
            conn.commit()
        except Exception as log_error:
            print(f"[Mobile Logout] 退出日志记录失败: {log_error}")
        finally:
            cursor.close()
            conn.close()
        
        return response_success(message='退出成功')
    
    except Exception as e:
        print(f"[Mobile Logout Error] {str(e)}")
        return response_error('退出失败', 'SERVER_ERROR', 500)


# ============================================================
# 移动端Token刷新API
# ============================================================

@mobile_auth_bp.route('/api/mobile/auth/refresh', methods=['POST'])
def mobile_refresh_token():
    """
    刷新移动端Token
    
    请求头:
    Authorization: Bearer <old_token>
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "Token刷新成功",
        "data": {
            "token": "new_jwt_token_string"
        }
    }
    """
    try:
        # 1. 获取旧Token
        old_token = get_mobile_token_from_request()
        if not old_token:
            return response_error('Token缺失', 'TOKEN_MISSING', 401)
        
        # 2. 解析旧Token（允许过期Token刷新，7天内）
        payload = decode_mobile_token(old_token)
        if not payload:
            return response_error('Token无效或已过期超过30天', 'TOKEN_EXPIRED', 401)
        
        # 3. 验证用户仍然有效
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    u.id, u.username, u.status, 
                    uc.company_id, uc.status as user_company_status
                FROM users u
                LEFT JOIN user_companies uc ON u.id = uc.user_id
                WHERE u.id = %s AND uc.company_id = %s
                LIMIT 1
            """, (payload['user_id'], payload['tenant_id']))
            
            user = cursor.fetchone()
            
            if not user:
                return response_error('用户不存在', 'USER_NOT_FOUND', 404)
            
            if user['status'] != 'active':
                return response_error('账号已被禁用', 'USER_DISABLED', 403)
            
            if user['user_company_status'] != 'active':
                return response_error('公司权限已被停用', 'COMPANY_DISABLED', 403)
            
            # 4. 生成新Token
            new_token = create_mobile_token(
                user_id=user['id'],
                tenant_id=user['company_id'],
                username=user['username']
            )
            
            return response_success(
                data={'token': new_token},
                message='Token刷新成功'
            )
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"[Mobile Refresh Token Error] {str(e)}")
        return response_error('Token刷新失败', 'SERVER_ERROR', 500)


# ============================================================
# 移动端用户信息API
# ============================================================

@mobile_auth_bp.route('/api/mobile/auth/userinfo', methods=['GET'])
@require_mobile_auth
def mobile_get_userinfo(current_user_id, current_tenant_id, current_username):
    """
    获取当前登录用户信息
    
    请求头:
    Authorization: Bearer <token>
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "success",
        "data": {
            "user": {
                "id": 123,
                "username": "zhangsan",
                "realname": "张三",
                "phone": "13800138000",
                "email": "zhangsan@example.com",
                "role": "admin",
                "avatar": null
            },
            "tenant": {
                "id": 1,
                "name": "示例公司",
                "industry": "零售"
            }
        }
    }
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    u.id, u.username, u.name, u.phone, u.email,
                    uc.role, uc.company_id,
                    c.name as company_name, c.industry
                FROM users u
                LEFT JOIN user_companies uc ON u.id = uc.user_id
                LEFT JOIN companies c ON uc.company_id = c.id
                WHERE u.id = %s AND uc.company_id = %s
                LIMIT 1
            """, (current_user_id, current_tenant_id))
            
            user = cursor.fetchone()
            
            if not user:
                return response_error('用户信息不存在', 'USER_NOT_FOUND', 404)
            
            return response_success(
                data={
                    'user': {
                        'id': user['id'],
                        'username': user['username'],
                        'name': user['name'] or '',
                        'phone': user['phone'] or '',
                        'email': user['email'] or '',
                        'role': user['role'] or ''
                    },
                    'tenant': {
                        'id': user['company_id'],
                        'name': user['company_name'],
                        'industry': user['industry'] or ''
                    }
                }
            )
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        import traceback
        error_msg = f"[Mobile Get Userinfo Error] {str(e)}\n{traceback.format_exc()}"
        print(error_msg, flush=True)
        with open('/root/ajkuaiji/backend/mobile_api_error.log', 'a') as f:
            f.write(f"\n{'='*60}\n{datetime.now()}\n{error_msg}\n")
        return response_error('获取用户信息失败', 'SERVER_ERROR', 500)
