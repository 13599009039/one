"""
多租户权限认证模块
统一管理租户权限验证逻辑
"""
from functools import wraps
from flask import session, jsonify


def require_tenant_auth(role=None):
    """
    租户权限装饰器
    
    功能：
    1. 验证用户登录状态
    2. 验证租户绑定（company_id）
    3. 验证用户角色权限（可选）
    
    参数：
        role (str): 需要的角色，支持 'admin'、'super_admin' 等
                   None表示只验证登录和租户绑定
    
    使用示例：
        @require_tenant_auth()  # 仅验证登录和租户
        def get_data():
            pass
        
        @require_tenant_auth(role='admin')  # 验证管理员权限
        def delete_data():
            pass
    
    返回：
        - 401: 未登录
        - 403: 未绑定租户或权限不足
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 1. 检查登录状态
            if 'user_id' not in session:
                return jsonify({
                    'success': False, 
                    'message': '未登录，请先登录'
                }), 401
            
            # 2. 检查租户绑定（使用company_id）
            company_id = session.get('company_id')
            if not company_id:
                return jsonify({
                    'success': False, 
                    'message': '未绑定租户，请联系管理员'
                }), 403
            
            # 3. 检查角色权限（如果指定了role参数）
            if role:
                user_role = session.get('role', '')
                
                # 定义角色层级
                role_hierarchy = {
                    'super_admin': 3,  # 最高权限
                    'admin': 2,        # 管理员
                    'user': 1          # 普通用户
                }
                
                required_level = role_hierarchy.get(role, 0)
                user_level = role_hierarchy.get(user_role, 0)
                
                if user_level < required_level:
                    return jsonify({
                        'success': False, 
                        'message': f'权限不足，需要{role}权限'
                    }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def get_current_tenant_id():
    """
    获取当前登录用户的租户ID
    
    返回：
        int: 租户ID（company_id）
        None: 未登录或未绑定租户
    """
    return session.get('company_id')


def get_current_user_id():
    """
    获取当前登录用户ID
    
    返回：
        int: 用户ID
        None: 未登录
    """
    return session.get('user_id')


def get_current_user_role():
    """
    获取当前登录用户角色
    
    返回：
        str: 用户角色（'super_admin', 'admin', 'user' 等）
        None: 未登录
    """
    return session.get('role')


def check_tenant_permission(tenant_id):
    """
    检查当前用户是否有权访问指定租户的数据
    
    参数：
        tenant_id (int): 要访问的租户ID
    
    返回：
        bool: True-有权限，False-无权限
    """
    current_tenant_id = get_current_tenant_id()
    user_role = get_current_user_role()
    
    # super_admin可以访问所有租户数据
    if user_role == 'super_admin':
        return True
    
    # 其他用户只能访问自己租户的数据
    return current_tenant_id == tenant_id
