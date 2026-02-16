#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财务流水账系统后端 API
Flask + MySQL
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
import pymysql
import json
from datetime import datetime, date, timedelta
import os
from functools import wraps
import secrets

app = Flask(__name__)

# Session配置
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

CORS(app, supports_credentials=True)  # 允许跨域请求并支持凭证

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def get_db_connection():
    """获取数据库连接"""
    return pymysql.connect(**DB_CONFIG)

def json_serial(obj):
    """JSON序列化日期时间对象"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


# ==================== 权限验证装饰器 ====================

def require_login(f):
    """要求用户登录"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': '未登录'}), 401
        return f(*args, **kwargs)
    return decorated_function


def require_company(f):
    """
    要求租户用户登录且已选择公司（多租户隔离）
    
    功能:
    1. 验证用户已登录
    2. 验证用户类型为租户用户(非平台管理员)
    3. 验证已选择公司
    4. 验证用户在该公司的权限状态
    5. 自动注入: current_company_id, current_user_id
    
    适用于: 所有业务API(租户数据API)
    禁止: 平台管理员访问业务API
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. 检查登录
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 2. 检查用户类型
        user_type = session.get('user_type', 'tenant_user')
        if user_type == 'platform_admin':
            return jsonify({
                'success': False, 
                'message': '平台管理员无权访问业务API,请使用控制台'
            }), 403
        
        # 3. 检查公司
        company_id = session.get('company_id')
        if not company_id:
            return jsonify({
                'success': False, 
                'message': '请先选择公司'
            }), 400
        
        # 4. 验证用户在该公司的权限(从user_companies表)
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT status FROM user_companies
                    WHERE user_id=%s AND company_id=%s
                """, (user_id, company_id))
                result = cur.fetchone()
            
            if not result:
                return jsonify({
                    'success': False, 
                    'message': '您不属于该公司,无权访问'
                }), 403
            
            if result['status'] != 'active':
                return jsonify({
                    'success': False, 
                    'message': '您在该公司的权限已被停用'
                }), 403
        finally:
            conn.close()
        
        # 5. 注入参数供业务函数使用
        kwargs['current_company_id'] = company_id
        kwargs['current_user_id'] = user_id
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_platform_admin(f):
    """
    要求平台管理员登录
    
    功能:
    1. 验证用户已登录
    2. 验证用户类型为平台管理员
    3. 验证users表中is_platform_admin=1
    4. 自动注入: current_admin_id
    
    适用于: 控制台API (/api/admin/*)
    禁止: 租户用户访问控制台API
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. 检查登录
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        # 2. 检查用户类型
        user_type = session.get('user_type')
        if user_type != 'platform_admin':
            return jsonify({
                'success': False, 
                'message': '需要平台管理员权限,租户用户无权访问控制台'
            }), 403
        
        # 3. 验证用户是平台管理员(从users表)
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT is_platform_admin, status FROM users
                    WHERE id=%s
                """, (user_id,))
                result = cur.fetchone()
            
            if not result:
                return jsonify({
                    'success': False, 
                    'message': '用户不存在'
                }), 403
            
            if result['is_platform_admin'] != 1:
                return jsonify({
                    'success': False, 
                    'message': '平台管理员验证失败'
                }), 403
            
            if result['status'] != 'enabled':
                return jsonify({
                    'success': False, 
                    'message': '账号已被停用'
                }), 403
        finally:
            conn.close()
        
        # 4. 注入参数供控制台API使用
        kwargs['current_admin_id'] = user_id
        
        return f(*args, **kwargs)
    
    return decorated_function


# ==================== 权限验证装饰器 ====================

def _get_request_user_id():
    """从Session/Header/请求体中获取用户ID（优先使用后端Session）"""
    # 1) 优先使用后端登录会话
    user_id = session.get('user_id')
    if user_id:
        return user_id

    # 2) 兼容旧逻辑：从请求头获取
    user_id = request.headers.get('X-User-Id')
    if user_id:
        return user_id

    # 3) 兼容部分接口：从请求体中获取
    data = request.get_json(silent=True) or {}
    return data.get('created_by') or data.get('user_id')


def _user_has_permission(user_id, resource=None, action=None, permission_code=None):
    """基于RBAC表结构检查用户是否具备某个权限

    优先逻辑：
    1) users.role 为 admin/superadmin → 直接放行（兼容老版本）
    2) user_roles + roles + role_permissions + permissions → 检查权限点
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 查询用户基础信息
            cursor.execute("SELECT id, role FROM users WHERE id=%s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return False, '用户不存在', None

            role = user.get('role')

            # 兼容旧角色：admin / superadmin 直接拥有全部权限
            if role in ('admin', 'superadmin'):
                return True, None, role

            # 查询用户绑定的角色
            cursor.execute(
                """
                SELECT r.id, r.code, r.is_system
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = %s
                """,
                (user_id,)
            )
            roles = cursor.fetchall() or []

            # 拥有系统级角色（如 super_admin / company_admin）则直接放行
            for r in roles:
                if r.get('code') in ('super_admin', 'company_admin'):
                    return True, None, r.get('code')

            # 计算权限代码
            if not permission_code and resource and action:
                permission_code = f"{resource}:{action}"

            if not permission_code:
                return False, '未指定权限点', role

            # 基于用户角色 → 角色权限 → 权限点 检查是否存在对应记录
            cursor.execute(
                """
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN role_permissions rp ON rp.role_id = r.id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = %s
                  AND (p.code = %s OR (p.resource_code = %s AND p.action = %s))
                LIMIT 1
                """,
                (user_id, permission_code, resource or None, action or None),
            )
            row = cursor.fetchone()

            if row:
                return True, None, role
            else:
                return False, f'权限不足：缺少 {permission_code} 权限', role
    finally:
        conn.close()


def require_permission(resource, action):
    """权限验证装饰器

    Args:
        resource: 资源模块（transactions/orders/inventory/costs等）
        action: 操作类型（view/create/update/delete/refund等）

    Usage:
        @require_permission('transactions', 'create')
        def add_transaction():
            pass
    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                user_id = _get_request_user_id()
                if not user_id:
                    return jsonify({'success': False, 'message': '未登录或未提供用户身份信息'}), 401

                has_perm, error_message, role = _user_has_permission(
                    user_id=user_id,
                    resource=resource,
                    action=action,
                )

                if has_perm:
                    return f(*args, **kwargs)
                else:
                    return jsonify({
                        'success': False,
                        'message': error_message or f'权限不足：没有 {resource}.{action} 权限'
                    }), 403

            except Exception as e:
                return jsonify({'success': False, 'message': f'权限验证失败：{str(e)}'}), 500

        return decorated_function

    return decorator

# ==================== 用户相关接口 ====================

@app.route('/api/users/login', methods=['POST'])
def login():
    """
    统一登录入口(支持平台用户+租户用户)
    
    逻辑:
    1. 验证用户名密码
    2. 检查用户类型(is_platform_admin)
    3. 平台用户 → 跳转控制台(console.html)
    4. 租户用户 → 加载公司列表 → 跳转业务系统(financial_system.html)
    """
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 查询用户基本信息(包含is_platform_admin字段)
            sql = """
                SELECT id, username, password, name, role, status, is_platform_admin, company_id
                FROM users 
                WHERE username=%s AND status='enabled'
            """
            cursor.execute(sql, (username,))
            user = cursor.fetchone()
            
            if not user:
                conn.close()
                return jsonify({'success': False, 'message': '用户不存在或已被停用'}), 401
            
            # 验证密码
            if user['password'] != password:
                conn.close()
                return jsonify({'success': False, 'message': '密码错误'}), 401
            
            user_id = user['id']
            
            # ========== 分支1: 平台管理员登录 ==========
            if user['is_platform_admin'] == 1:
                conn.close()
                
                # 存储Session
                session['user_id'] = user_id
                session['username'] = user['username']
                session['name'] = user['name']
                session['role'] = user['role']
                session['user_type'] = 'platform_admin'  # 关键标识
                session['company_id'] = 0  # 平台公司ID
                session.permanent = True
                
                return jsonify({
                    'success': True,
                    'user_type': 'platform_admin',
                    'redirect_url': '/console.html',
                    'user': {
                        'id': user_id,
                        'username': user['username'],
                        'name': user['name'],
                        'role': user['role']
                    },
                    'message': '欢迎登录控制台'
                })
            
            # ========== 分支2: 租户用户登录 ==========
            # 查询用户的所有active公司(包含主公司有效性检测)
            cursor.execute("""
                SELECT 
                    c.id, c.name, c.short_name, c.status, 
                    uc.is_primary, uc.role, uc.status as user_status
                FROM companies c
                INNER JOIN user_companies uc ON c.id = uc.company_id
                WHERE uc.user_id = %s AND uc.status = 'active'
                ORDER BY uc.is_primary DESC, c.id
            """, (user_id,))
            companies = cursor.fetchall()
            
            # 关键检查: 如果没有active公司,拒绝登录(账号全部停用)
            if len(companies) == 0:
                conn.close()
                return jsonify({
                    'success': False, 
                    'message': '该账号已停用或无可用公司,请联系管理员'
                }), 403
            
            # 关键检查: 如果主公司失效(被停用),自动切换到第一个active公司
            has_primary = any(c['is_primary'] for c in companies)
            current_company = None
            
            if not has_primary:
                # 主公司失效,将第一个active公司设为主公司
                new_primary_id = companies[0]['id']
                
                cursor.execute("""
                    UPDATE user_companies 
                    SET is_primary = (company_id = %s)
                    WHERE user_id = %s
                """, (new_primary_id, user_id))
                
                cursor.execute("""
                    UPDATE users SET company_id = %s WHERE id = %s
                """, (new_primary_id, user_id))
                
                companies[0]['is_primary'] = True
                current_company = companies[0]
                conn.commit()
                
                import logging
                logging.warning(f"用户{user_id}的主公司已自动切换为{new_primary_id}")
            else:
                # 找到主公司
                current_company = next(c for c in companies if c['is_primary'])
        
        conn.close()
        
        # 存储Session(租户用户)
        session['user_id'] = user_id
        session['username'] = user['username']
        session['name'] = user['name']
        session['role'] = user['role']
        session['user_type'] = 'tenant_user'  # 关键标识
        session['company_id'] = current_company['id']  # 当前公司ID(主公司)
        session['company_name'] = current_company['name']
        session.permanent = True  # 启用持久化Session(7天)
        
        return jsonify({
            'success': True,
            'user_type': 'tenant_user',
            'redirect_url': '/financial_system.html',
            'user': {
                'id': user_id,
                'username': user['username'],
                'name': user['name'],
                'role': user['role']
            },
            'current_company': current_company,
            'companies': companies,
            'total_companies': len(companies),
            'message': f'欢迎登录 {current_company["name"]}'
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'登录失败: {str(e)}'}), 500

@app.route('/api/users/logout', methods=['POST'])
def logout():
    """用户登出"""
    session.clear()
    return jsonify({'success': True, 'message': '登出成功'})


@app.route('/api/users/switch-company', methods=['POST'])
def switch_company():
    """切换当前公司"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    try:
        data = request.json
        company_id = data.get('company_id')
        
        if not company_id:
            return jsonify({'success': False, 'message': '缺少公司ID'}), 400
        
        user_id = session['user_id']
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 检查用户是否有该公司权限
            cursor.execute("""
                SELECT uc.id, uc.role, c.name, c.short_name
                FROM user_companies uc
                JOIN companies c ON uc.company_id = c.id
                WHERE uc.user_id = %s AND uc.company_id = %s AND uc.status = 'active'
            """, (user_id, company_id))
            uc = cursor.fetchone()
            
            if not uc:
                conn.close()
                return jsonify({'success': False, 'message': '无该公司权限或公司已停用'}), 403
            
            # 更新Session中的当前公司
            session['company_id'] = company_id
            session['current_company_name'] = uc['name']
            
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '切换成功',
            'data': {
                'company_id': company_id,
                'company_name': uc['name'],
                'role': uc['role']
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/users/companies', methods=['GET'])
def get_user_companies():
    """获取当前用户的所有公司"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    try:
        user_id = session['user_id']
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT c.id, c.name, c.short_name, c.status, uc.is_primary, uc.role, uc.status as user_status
                FROM companies c
                JOIN user_companies uc ON c.id = uc.company_id
                WHERE uc.user_id = %s AND uc.status = 'active'
                ORDER BY uc.is_primary DESC, c.id
            """, (user_id,))
            companies = cursor.fetchall()
            
        conn.close()
        
        return jsonify({
            'success': True,
            'data': companies,
            'current_company_id': session.get('company_id')
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/users/current', methods=['GET'])
def get_current_user():
    """获取当前登录用户信息"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'})
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id=%s", (session['user_id'],))
            user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({'success': True, 'user': user})
        else:
            session.clear()
            return jsonify({'success': False, 'message': '用户不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users', methods=['GET'])
@require_company
def get_users(current_company_id=None, current_user_id=None):
    """获取当前公司的用户列表（多租户隔离）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 通过user_companies表查询当前公司的用户
            sql = """
                SELECT 
                    u.id, u.username, u.name, u.alias, u.role, u.status,
                    u.phone, u.email, u.position, u.position_id, 
                    u.department, u.department_id, u.team_id, 
                    u.project, u.project_id, u.area, u.area_id,
                    uc.role as company_role,
                    uc.is_primary
                FROM users u
                INNER JOIN user_companies uc ON u.id = uc.user_id
                WHERE uc.company_id = %s AND uc.status = 'active'
                ORDER BY u.id
            """
            cursor.execute(sql, (current_company_id,))
            users = cursor.fetchall()
            
            # ✅ 为每个用户查询所属团队列表（一人多团队）
            for user in users:
                cursor.execute("""
                    SELECT ut.team_id, ut.is_primary, t.name as team_name
                    FROM user_teams ut
                    LEFT JOIN teams t ON ut.team_id = t.id
                    WHERE ut.user_id = %s AND ut.company_id = %s
                    ORDER BY ut.is_primary DESC, ut.id ASC
                """, (user['id'], current_company_id))
                user['teams'] = cursor.fetchall()
                
                # ✅ 为每个用户查询所属区域列表（一人多区域）
                cursor.execute("""
                    SELECT ua.area_id, ua.is_primary, a.name as area_name
                    FROM user_areas ua
                    LEFT JOIN areas a ON ua.area_id = a.id
                    WHERE ua.user_id = %s AND ua.company_id = %s
                    ORDER BY ua.is_primary DESC, ua.id ASC
                """, (user['id'], current_company_id))
                user['areas'] = cursor.fetchall()
                
        conn.close()
        
        return jsonify({'success': True, 'data': users})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users/<int:user_id>/teams', methods=['GET'])
@require_company
def get_user_teams(user_id, current_company_id=None, current_user_id=None):
    """获取指定用户的团队列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT ut.team_id, ut.is_primary, t.name as team_name
                FROM user_teams ut
                LEFT JOIN teams t ON ut.team_id = t.id
                WHERE ut.user_id = %s AND ut.company_id = %s
                ORDER BY ut.is_primary DESC, ut.id ASC
            """, (user_id, current_company_id))
            teams = cursor.fetchall()
            
            # 同时获取用户的默认项目
            cursor.execute("SELECT project_id FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            project_id = user['project_id'] if user else None
            
        conn.close()
        return jsonify({
            'success': True, 
            'data': {
                'teams': teams,
                'project_id': project_id
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users/<int:user_id>/teams', methods=['PUT'])
@require_company  
def update_user_teams(user_id, current_company_id=None, current_user_id=None):
    """更新用户的团队列表（一人多团队）"""
    try:
        data = request.json
        team_ids = data.get('team_ids', [])
        primary_team_id = data.get('primary_team_id')
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 1. 删除用户现有团队关联
                cursor.execute("DELETE FROM user_teams WHERE user_id = %s AND company_id = %s", 
                             (user_id, current_company_id))
                
                # 2. 添加新的团队关联
                for team_id in team_ids:
                    is_primary = 1 if team_id == primary_team_id else 0
                    cursor.execute("""
                        INSERT INTO user_teams (user_id, team_id, is_primary, company_id)
                        VALUES (%s, %s, %s, %s)
                    """, (user_id, team_id, is_primary, current_company_id))
                
                # 3. 同时更新users表的team_id为主团队（兼容旧逻辑）
                if primary_team_id:
                    cursor.execute("UPDATE users SET team_id = %s WHERE id = %s", 
                                 (primary_team_id, user_id))
                
            conn.commit()
        finally:
            conn.close()
            
        return jsonify({'success': True, 'message': '团队更新成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users/<int:user_id>/areas', methods=['GET'])
@require_company
def get_user_areas(user_id, current_company_id=None, current_user_id=None):
    """获取指定用户的区域列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT ua.area_id, ua.is_primary, a.name as area_name
                FROM user_areas ua
                LEFT JOIN areas a ON ua.area_id = a.id
                WHERE ua.user_id = %s AND ua.company_id = %s
                ORDER BY ua.is_primary DESC, ua.id ASC
            """, (user_id, current_company_id))
            areas = cursor.fetchall()
            
        conn.close()
        return jsonify({'success': True, 'data': {'areas': areas}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users/<int:user_id>/areas', methods=['PUT'])
@require_company  
def update_user_areas(user_id, current_company_id=None, current_user_id=None):
    """更新用户的区域列表（一人多区域）"""
    try:
        data = request.json
        area_ids = data.get('area_ids', [])
        primary_area_id = data.get('primary_area_id')
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 1. 删除用户现有区域关联
                cursor.execute("DELETE FROM user_areas WHERE user_id = %s AND company_id = %s", 
                             (user_id, current_company_id))
                
                # 2. 添加新的区域关联
                for area_id in area_ids:
                    is_primary = 1 if area_id == primary_area_id else 0
                    cursor.execute("""
                        INSERT INTO user_areas (user_id, area_id, is_primary, company_id)
                        VALUES (%s, %s, %s, %s)
                    """, (user_id, area_id, is_primary, current_company_id))
                
                # 3. 同时更新users表的area_id为主区域（兼容旧逻辑）
                if primary_area_id:
                    cursor.execute("UPDATE users SET area_id = %s WHERE id = %s", 
                                 (primary_area_id, user_id))
                
            conn.commit()
        finally:
            conn.close()
            
        return jsonify({'success': True, 'message': '区域更新成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users', methods=['POST'])
@require_company
def add_user(current_company_id=None, current_user_id=None):
    """添加用户到当前公司（多租户隔离）"""
    try:
        data = request.json
        conn = get_db_connection()
        
        try:
            with conn.cursor() as cursor:
                # 1. 检查用户名是否已存在
                cursor.execute("SELECT id FROM users WHERE username=%s", (data['username'],))
                existing = cursor.fetchone()
                
                if existing:
                    return jsonify({'success': False, 'message': '用户名已存在'}), 400
                
                # 2. 创建用户(不设置company_id)
                sql = """INSERT INTO users (username, password, name, alias, role, status, 
                         phone, email, position_id, department_id, team_id, project_id, area_id)
                         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
                cursor.execute(sql, (
                    data['username'], data['password'], data['name'],
                    data.get('alias'), data.get('role', 'user'), 'enabled',
                    data.get('phone'), data.get('email'),
                    data.get('position_id'), data.get('department_id'), data.get('team_id'),
                    data.get('project_id'), data.get('area_id')
                ))
                user_id = cursor.lastrowid
                
                # 3. 在user_companies表建立关联
                cursor.execute("""
                    INSERT INTO user_companies (user_id, company_id, role, status)
                    VALUES (%s, %s, %s, 'active')
                """, (user_id, current_company_id, data.get('role', 'user')))
                
                conn.commit()
            
            return jsonify({'success': True, 'id': user_id})
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@require_company
def update_user(user_id, current_company_id=None, current_user_id=None):
    """更新用户信息（多租户隔离）"""
    try:
        data = request.json
        conn = get_db_connection()
        
        try:
            with conn.cursor() as cursor:
                # 验证用户是否属于当前公司
                cursor.execute("""
                    SELECT id FROM user_companies 
                    WHERE user_id=%s AND company_id=%s AND status='active'
                """, (user_id, current_company_id))
                
                if not cursor.fetchone():
                    return jsonify({'success': False, 'message': '无权修改该用户'}), 403
                
                # ✅ 修复：只更新提供的字段，而不是全部字段
                update_fields = []
                params = []
                
                if 'name' in data:
                    update_fields.append('name=%s')
                    params.append(data['name'])
                
                if 'alias' in data:
                    update_fields.append('alias=%s')
                    params.append(data.get('alias'))
                
                if 'role' in data:
                    update_fields.append('role=%s')
                    params.append(data['role'])
                
                # 移除company_id更新(多租户架构不应修改此字段)
                
                if 'status' in data:
                    update_fields.append('status=%s')
                    params.append(data.get('status'))
                
                if 'password' in data:
                    update_fields.append('password=%s')
                    params.append(data['password'])
                
                if 'phone' in data:
                    update_fields.append('phone=%s')
                    params.append(data.get('phone'))
                
                if 'email' in data:
                    update_fields.append('email=%s')
                    params.append(data.get('email'))
                
                if 'position_id' in data:
                    update_fields.append('position_id=%s')
                    params.append(data.get('position_id'))
                
                if 'department_id' in data:
                    update_fields.append('department_id=%s')
                    params.append(data.get('department_id'))
                
                if 'team_id' in data:
                    update_fields.append('team_id=%s')
                    params.append(data.get('team_id'))
                
                if 'project_id' in data:
                    update_fields.append('project_id=%s')
                    params.append(data.get('project_id'))
                
                if 'area_id' in data:
                    update_fields.append('area_id=%s')
                    params.append(data.get('area_id'))
                
                if not update_fields:
                    return jsonify({'success': False, 'message': '没有要更新的字段'})
                
                params.append(user_id)
                sql = f"UPDATE users SET {', '.join(update_fields)} WHERE id=%s"
                cursor.execute(sql, params)
                conn.commit()
            
            return jsonify({'success': True})
        finally:
            conn.close()
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


# ==================== 权限与角色管理接口 ====================


def _get_user_permissions(user_id):
    """获取指定用户的有效权限列表（基于user_roles/roles/role_permissions/permissions）"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT p.code, p.name, p.resource_type, p.resource_code, p.action
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN role_permissions rp ON rp.role_id = r.id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = %s
                ORDER BY p.code
                """,
                (user_id,),
            )
            permissions = cursor.fetchall() or []
        return permissions
    finally:
        conn.close()


@app.route('/api/user-permissions/current', methods=['GET'])
def get_current_user_permissions():
    """获取当前登录用户的权限列表"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401

    try:
        user_id = session['user_id']
        permissions = _get_user_permissions(user_id)
        codes = [p.get('code') for p in permissions if p.get('code')]
        return jsonify({'success': True, 'data': permissions, 'codes': codes})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/user-permissions/<int:user_id>', methods=['GET'])
def get_user_permissions(user_id):
    """获取指定用户的权限列表（用于管理界面查看）"""
    try:
        permissions = _get_user_permissions(user_id)
        codes = [p.get('code') for p in permissions if p.get('code')]
        return jsonify({'success': True, 'data': permissions, 'codes': codes})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/permissions/check', methods=['POST'])
def check_permission():
    """检查当前请求用户是否具备某个权限

    请求体支持两种传参方式：
    - 方式1：permission_code（如 "transactions:create"）
    - 方式2：resource + action（如 resource="transactions", action="create"）
    """
    try:
        user_id = _get_request_user_id()
        if not user_id:
            return jsonify({'success': False, 'message': '未登录或未提供用户身份信息'}), 401

        data = request.get_json(silent=True) or {}
        permission_code = data.get('permission_code')
        resource = data.get('resource')
        action = data.get('action')

        has_perm, error_message, role = _user_has_permission(
            user_id=user_id,
            resource=resource,
            action=action,
            permission_code=permission_code,
        )

        effective_code = permission_code or (f"{resource}:{action}" if resource and action else None)

        return jsonify({
            'success': True,
            'data': {
                'has_permission': bool(has_perm),
                'permission_code': effective_code,
                'role': role,
                'message': None if has_perm else (error_message or '权限不足'),
            },
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/roles', methods=['GET'])
def get_roles():
    """获取角色列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM roles ORDER BY is_system DESC, id ASC")
            roles = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': roles})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/roles', methods=['POST'])
def create_role():
    """创建新角色（不区分系统/企业，主要用于企业自定义角色）"""
    try:
        data = request.get_json(silent=True) or {}
        name = data.get('name')
        code = data.get('code')
        description = data.get('description')
        company_id = data.get('company_id')

        if not name or not code:
            return jsonify({'success': False, 'message': 'name 和 code 不能为空'}), 400

        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO roles (name, code, description, company_id, is_system, status) VALUES (%s, %s, %s, %s, %s, %s)",
                (name, code, description, company_id, 0, 'active'),
            )
            conn.commit()
            role_id = cursor.lastrowid
        conn.close()

        return jsonify({'success': True, 'id': role_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/roles/<int:role_id>', methods=['PUT'])
def update_role(role_id):
    """更新角色信息"""
    try:
        data = request.get_json(silent=True) or {}
        fields = []
        params = []

        if 'name' in data:
            fields.append('name=%s')
            params.append(data.get('name'))
        if 'description' in data:
            fields.append('description=%s')
            params.append(data.get('description'))
        if 'status' in data:
            fields.append('status=%s')
            params.append(data.get('status'))

        if not fields:
            return jsonify({'success': False, 'message': '没有要更新的字段'}), 400

        params.append(role_id)

        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = f"UPDATE roles SET {', '.join(fields)} WHERE id=%s"
            cursor.execute(sql, params)
            conn.commit()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/roles/<int:role_id>', methods=['DELETE'])
def delete_role(role_id):
    """删除角色（会级联删除角色-权限关联，但不会影响user_roles）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM role_permissions WHERE role_id=%s", (role_id,))
            cursor.execute("DELETE FROM roles WHERE id=%s", (role_id,))
            conn.commit()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/permissions', methods=['GET'])
def get_all_permissions():
    """获取所有权限点（用于前端构建权限分配界面）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, name, code, resource_type, resource_code, action, description, parent_id, sort_order FROM permissions ORDER BY resource_type, code"
            )
            permissions = cursor.fetchall()
        conn.close()

        return jsonify({'success': True, 'data': permissions})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/role-permissions/<int:role_id>', methods=['GET'])
def get_role_permissions(role_id):
    """获取角色已分配的权限列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.id, p.name, p.code, p.resource_type, p.description
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                WHERE rp.role_id = %s
                ORDER BY p.resource_type, p.code
            """, (role_id,))
            permissions = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': permissions})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/role-permissions/assign', methods=['POST'])
def assign_role_permissions():
    """为角色分配权限

    请求体示例:
    {
        "role_id": 2,
        "permission_codes": ["transactions:view", "transactions:create"]
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        role_id = data.get('role_id')
        permission_codes = data.get('permission_codes') or []

        if not role_id:
            return jsonify({'success': False, 'message': 'role_id 不能为空'}), 400

        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 查询权限ID
            perm_ids = []
            if permission_codes:
                format_strings = ','.join(['%s'] * len(permission_codes))
                cursor.execute(
                    f"SELECT id FROM permissions WHERE code IN ({format_strings})",
                    tuple(permission_codes),
                )
                rows = cursor.fetchall() or []
                perm_ids = [row['id'] for row in rows]

            # 清空旧的角色权限关联
            cursor.execute("DELETE FROM role_permissions WHERE role_id=%s", (role_id,))

            # 重新插入角色权限关联
            for pid in perm_ids:
                cursor.execute(
                    "INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (%s, %s, %s)",
                    (role_id, pid, session.get('user_id')),
                )

            conn.commit()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/user-roles/assign', methods=['POST'])
def assign_user_roles():
    """为用户分配角色

    请求体示例：
    {
        "user_id": 1,
        "role_ids": [2, 3]
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get('user_id')
        role_ids = data.get('role_ids') or []

        if not user_id:
            return jsonify({'success': False, 'message': 'user_id 不能为空'}), 400

        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 清空旧的用户角色关联
            cursor.execute("DELETE FROM user_roles WHERE user_id=%s", (user_id,))

            # 重新插入用户角色关联
            for rid in role_ids:
                cursor.execute(
                    "INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (%s, %s, %s)",
                    (user_id, rid, session.get('user_id')),
                )

            conn.commit()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/user-roles/<int:user_id>', methods=['GET'])
def get_user_roles(user_id):
    """获取用户的角色列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT r.id, r.name, r.code, r.description, r.is_system, r.status
                FROM roles r
                INNER JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = %s
                ORDER BY r.id
            """, (user_id,))
            roles = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': roles})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== 客户相关接口 ====================

@app.route('/api/customers', methods=['GET'])
@require_company
def get_customers(current_company_id=None, current_user_id=None):
    """获取客户列表（多租户隔离）"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '')
        ids = request.args.get('ids', '')  # ✅ 新增: 支持按ID批量查询
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 构建查询条件（强制添加company_id）
            where_clauses = ["company_id = %s"]
            params = [current_company_id]
            
            # ✅ 新增: 支持按ID列表查询
            if ids:
                id_list = [int(id.strip()) for id in ids.split(',') if id.strip().isdigit()]
                if id_list:
                    placeholders = ','.join(['%s'] * len(id_list))
                    where_clauses.append(f"id IN ({placeholders})")
                    params.extend(id_list)
            
            if search:
                where_clauses.append("(shop_name LIKE %s OR merchant_id LIKE %s OR industry LIKE %s)")
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern, search_pattern])
            
            if status_filter:
                where_clauses.append("status = %s")
                params.append(status_filter)
            
            where_sql = " AND ".join(where_clauses)
            
            # 获取总数
            cursor.execute(f"SELECT COUNT(*) as total FROM customers WHERE {where_sql}", params)
            total = cursor.fetchone()['total']
            
            # 获取分页数据
            offset = (page - 1) * page_size
            params.extend([page_size, offset])
            cursor.execute(f"SELECT * FROM customers WHERE {where_sql} ORDER BY id DESC LIMIT %s OFFSET %s", params)
            customers = cursor.fetchall()
            
            # 获取每个客户的联系人和备忘录
            for customer in customers:
                customer_id = customer['id']
                
                # 获取联系人
                cursor.execute("SELECT name, phone, position FROM customer_contacts WHERE customer_id=%s", (customer_id,))
                customer['contacts'] = cursor.fetchall()
                
                # 获取备忘录
                cursor.execute("SELECT date, type, content FROM customer_memos WHERE customer_id=%s", (customer_id,))
                customer['memos'] = cursor.fetchall()
                
                # 处理tags
                if customer.get('tags'):
                    try:
                        customer['tags'] = json.loads(customer['tags'])
                    except:
                        customer['tags'] = []
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': customers,
            'total': total,
            'page': page,
            'page_size': page_size
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    """获取单个客户详情"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 获取客户信息及跟进人名称
            cursor.execute("""
                SELECT c.*, u.name as follower_name 
                FROM customers c 
                LEFT JOIN users u ON c.follower_id = u.id
                WHERE c.id=%s
            """, (customer_id,))
            customer = cursor.fetchone()
            
            if customer:
                # 获取联系人
                cursor.execute("SELECT name, phone, position FROM customer_contacts WHERE customer_id=%s", (customer_id,))
                customer['contacts'] = cursor.fetchall()
                
                # 获取备忘录
                cursor.execute("SELECT date, type, content FROM customer_memos WHERE customer_id=%s", (customer_id,))
                customer['memos'] = cursor.fetchall()
                
                # 处理tags
                if customer.get('tags'):
                    try:
                        customer['tags'] = json.loads(customer['tags'])
                    except:
                        customer['tags'] = []
        
        conn.close()
        
        if customer:
            return jsonify({'success': True, 'data': customer})
        else:
            return jsonify({'success': False, 'message': '客户不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 客户详情页相关API ====================

@app.route('/api/customers/<int:customer_id>/stats', methods=['GET'])
@require_company
def get_customer_stats(customer_id, current_company_id=None, current_user_id=None):
    """获取客户统计数据"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 获取订单统计（paid_amount为已收款，unpaid_amount为待收款）
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(final_amount), 0) as total_amount,
                    COALESCE(SUM(unpaid_amount), 0) as pending_amount,
                    MAX(order_date) as last_order_date
                FROM orders 
                WHERE customer_id = %s AND company_id = %s AND is_deleted = 0
            """, (customer_id, current_company_id))
            order_stats = cursor.fetchone()
            
            # 获取本月订单统计
            cursor.execute("""
                SELECT 
                    COUNT(*) as month_orders,
                    COALESCE(SUM(final_amount), 0) as month_amount
                FROM orders 
                WHERE customer_id = %s AND company_id = %s AND is_deleted = 0
                  AND YEAR(order_date) = YEAR(CURDATE()) AND MONTH(order_date) = MONTH(CURDATE())
            """, (customer_id, current_company_id))
            month_stats = cursor.fetchone()
            
            # 获取最后跟进日期（优先从customer_followups表，降级到customer_memos）
            try:
                cursor.execute("""
                    SELECT MAX(followup_time) as last_followup_date
                    FROM customer_followups 
                    WHERE customer_id = %s AND company_id = %s
                """, (customer_id, current_company_id))
                followup_result = cursor.fetchone()
                
                # 如果新表没有数据，尝试从旧表查询
                if not followup_result or not followup_result['last_followup_date']:
                    cursor.execute("""
                        SELECT MAX(date) as last_followup_date
                        FROM customer_memos 
                        WHERE customer_id = %s
                    """, (customer_id,))
                    followup_result = cursor.fetchone()
            except Exception:
                # 新表不存在，降级到旧表
                cursor.execute("""
                    SELECT MAX(date) as last_followup_date
                    FROM customer_memos 
                    WHERE customer_id = %s
                """, (customer_id,))
                followup_result = cursor.fetchone()
            
            # 获取最后一笔有效订单的归属信息（负责团队、业务人员、归属项目）
            cursor.execute("""
                SELECT team, business_staff, project
                FROM orders 
                WHERE customer_id = %s AND company_id = %s AND is_deleted = 0
                ORDER BY order_date DESC, created_at DESC
                LIMIT 1
            """, (customer_id, current_company_id))
            last_order_info = cursor.fetchone()
            
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'total_orders': order_stats['total_orders'] if order_stats else 0,
                'total_amount': float(order_stats['total_amount'] or 0) if order_stats else 0,
                'pending_amount': float(order_stats['pending_amount'] or 0) if order_stats else 0,
                'last_order_date': str(order_stats['last_order_date']) if order_stats and order_stats['last_order_date'] else '-',
                'month_orders': month_stats['month_orders'] if month_stats else 0,
                'month_amount': float(month_stats['month_amount'] or 0) if month_stats else 0,
                'last_followup_date': str(followup_result['last_followup_date'])[:10] if followup_result and followup_result['last_followup_date'] else '-',
                'balance': 0,  # 预留客户余额字段
                # 归属信息（从最后一笔有效订单提取）
                'responsible_team': last_order_info['team'] if last_order_info and last_order_info['team'] else '-',
                'business_person': last_order_info['business_staff'] if last_order_info and last_order_info['business_staff'] else '-',
                'project': last_order_info['project'] if last_order_info and last_order_info['project'] else '-'
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/customers/<int:customer_id>/orders', methods=['GET'])
@require_company
def get_customer_orders(customer_id, current_company_id=None, current_user_id=None):
    """获取客户订单列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id, order_date, final_amount, received_amount, payment_status,
                    GROUP_CONCAT(
                        DISTINCT CONCAT(
                            COALESCE(oi.product_name, oi.service_name, '')
                        ) SEPARATOR ', '
                    ) as items_summary
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.customer_id = %s AND o.company_id = %s AND o.is_deleted = 0
                GROUP BY o.id
                ORDER BY o.order_date DESC
                LIMIT 50
            """, (customer_id, current_company_id))
            orders = cursor.fetchall()
            
        conn.close()
        
        return jsonify({'success': True, 'data': orders})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/customers/<int:customer_id>/followups', methods=['GET'])
@require_company
def get_customer_followups(customer_id, current_company_id=None, current_user_id=None):
    """获取客户跟进记录"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 优先从customer_followups表查询，如果表不存在则降级到customer_memos
            try:
                cursor.execute("""
                    SELECT 
                        cf.id, cf.type, cf.content, cf.followup_time as created_at,
                        cf.next_followup_date, cf.user_id,
                        u.name as creator_name
                    FROM customer_followups cf
                    LEFT JOIN users u ON cf.user_id = u.id
                    WHERE cf.customer_id = %s AND cf.company_id = %s
                    ORDER BY cf.followup_time DESC
                    LIMIT 50
                """, (customer_id, current_company_id))
                followups = cursor.fetchall()
            except Exception:
                # 降级：从旧的备忘录表查询
                cursor.execute("""
                    SELECT 
                        cm.id, cm.type, cm.content, cm.date as created_at,
                        NULL as next_followup_date, cm.created_by as user_id,
                        u.name as creator_name
                    FROM customer_memos cm
                    LEFT JOIN users u ON cm.created_by = u.id
                    WHERE cm.customer_id = %s
                    ORDER BY cm.date DESC
                    LIMIT 50
                """, (customer_id,))
                followups = cursor.fetchall()
            
        conn.close()
        
        return jsonify({'success': True, 'data': followups or []})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e), 'data': []})

@app.route('/api/customers/<int:customer_id>/followups', methods=['POST'])
@require_company
def add_customer_followup(customer_id, current_company_id=None, current_user_id=None):
    """添加客户跟进记录"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO customer_followups 
                (customer_id, type, content, followup_time, user_id, next_followup_date, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                customer_id,
                data.get('type'),
                data.get('content'),
                data.get('followup_time'),
                data.get('user_id') or current_user_id,
                data.get('next_followup_date') or None,
                current_company_id
            ))
            followup_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'data': {'id': followup_id}, 'message': '添加成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/followups/<int:followup_id>', methods=['PUT'])
@require_company
def update_customer_followup(followup_id, current_company_id=None, current_user_id=None):
    """更新客户跟进记录"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE customer_followups 
                SET type = %s, content = %s, followup_time = %s, user_id = %s, next_followup_date = %s
                WHERE id = %s AND company_id = %s
            """, (
                data.get('type'),
                data.get('content'),
                data.get('followup_time'),
                data.get('user_id'),
                data.get('next_followup_date') or None,
                followup_id,
                current_company_id
            ))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '更新成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/followups/<int:followup_id>', methods=['DELETE'])
@require_company
def delete_customer_followup(followup_id, current_company_id=None, current_user_id=None):
    """删除客户跟进记录"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                DELETE FROM customer_followups 
                WHERE id = %s AND company_id = %s
            """, (followup_id, current_company_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '删除成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/customers/<int:customer_id>/payments', methods=['GET'])
@require_company
def get_customer_payments(customer_id, current_company_id=None, current_user_id=None):
    """获取客户收款记录"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 从流水表获取收款记录
            cursor.execute("""
                SELECT 
                    t.id, t.date as payment_date, t.amount, t.category as payment_method,
                    CONCAT('订单#', o.id) as order_info
                FROM transactions t
                LEFT JOIN orders o ON t.order_id = o.id
                WHERE t.customer_id = %s AND t.company_id = %s AND t.type = 'income'
                ORDER BY t.date DESC
                LIMIT 50
            """, (customer_id, current_company_id))
            payments = cursor.fetchall()
            
        conn.close()
        
        return jsonify({'success': True, 'data': payments})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/customers', methods=['POST'])
@require_company
def add_customer(current_company_id=None, current_user_id=None):
    """添加客户（多租户隔离）"""
    try:
        data = request.json
        conn = get_db_connection()
        
        # 检查商家ID唯一性（限定当前公司范围）
        if data.get('merchant_id'):
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM customers WHERE merchant_id=%s AND company_id=%s",
                    (data['merchant_id'], current_company_id)
                )
                if cursor.fetchone():
                    conn.close()
                    return jsonify({'success': False, 'message': '商家ID已存在'})
        
        with conn.cursor() as cursor:
            # 插入客户基本信息（强制添加company_id）
            sql = """INSERT INTO customers (
                merchant_id, shop_name, douyin_name, company_name, credit_code,
                legal_person, registered_capital, business_address, operating_address,
                cooperation_mode, category, industry, status, follower_id,
                business_staff, service_staff, operation_staff, management_staff,
                team, region, project, company, tags, company_id
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
            
            tags = json.dumps(data.get('tags', []))
            
            cursor.execute(sql, (
                data.get('merchant_id'), data['shop_name'], data.get('douyin_name'),
                data.get('company_name'), data.get('credit_code'), data.get('legal_person'),
                data.get('registered_capital'), data.get('business_address'),
                data.get('operating_address'), data.get('cooperation_mode'),
                data.get('category'), data.get('industry'), data.get('status', '跟进中'),
                data.get('follower_id'), data.get('business_staff'), data.get('service_staff'),
                data.get('operation_staff'), data.get('management_staff'), data.get('team'),
                data.get('region'), data.get('project'), data.get('company'), tags,
                current_company_id  # 强制添加当前公司ID
            ))
            customer_id = cursor.lastrowid
            
            # 插入联系人
            if data.get('contacts'):
                for contact in data['contacts']:
                    if contact.get('name') or contact.get('phone'):
                        cursor.execute(
                            "INSERT INTO customer_contacts (customer_id, name, phone, position) VALUES (%s,%s,%s,%s)",
                            (customer_id, contact.get('name'), contact.get('phone'), contact.get('position'))
                        )
            
            # 插入备忘录
            if data.get('memos'):
                for memo in data['memos']:
                    if memo.get('content'):
                        cursor.execute(
                            "INSERT INTO customer_memos (customer_id, date, type, content) VALUES (%s,%s,%s,%s)",
                            (customer_id, memo.get('date'), memo.get('type'), memo.get('content'))
                        )
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': customer_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """更新客户"""
    try:
        data = request.json
        conn = get_db_connection()
        
        # 检查商家ID唯一性（排除自己）
        if data.get('merchant_id'):
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM customers WHERE merchant_id=%s AND id!=%s", 
                             (data['merchant_id'], customer_id))
                if cursor.fetchone():
                    conn.close()
                    return jsonify({'success': False, 'message': '商家ID已存在'})
        
        with conn.cursor() as cursor:
            # 更新客户基本信息
            sql = """UPDATE customers SET
                merchant_id=%s, shop_name=%s, douyin_name=%s, company_name=%s, credit_code=%s,
                legal_person=%s, registered_capital=%s, business_address=%s, operating_address=%s,
                cooperation_mode=%s, category=%s, industry=%s, status=%s, follower_id=%s,
                business_staff=%s, service_staff=%s, operation_staff=%s, management_staff=%s,
                team=%s, region=%s, project=%s, company=%s, tags=%s
                WHERE id=%s"""
            
            tags = json.dumps(data.get('tags', []))
            
            cursor.execute(sql, (
                data.get('merchant_id'), data['shop_name'], data.get('douyin_name'),
                data.get('company_name'), data.get('credit_code'), data.get('legal_person'),
                data.get('registered_capital'), data.get('business_address'),
                data.get('operating_address'), data.get('cooperation_mode'),
                data.get('category'), data.get('industry'), data.get('status', '跟进中'),
                data.get('follower_id'), data.get('business_staff'), data.get('service_staff'),
                data.get('operation_staff'), data.get('management_staff'), data.get('team'),
                data.get('region'), data.get('project'), data.get('company'), tags, customer_id
            ))
            
            # 删除旧的联系人和备忘录
            cursor.execute("DELETE FROM customer_contacts WHERE customer_id=%s", (customer_id,))
            cursor.execute("DELETE FROM customer_memos WHERE customer_id=%s", (customer_id,))
            
            # 插入新的联系人
            if data.get('contacts'):
                for contact in data['contacts']:
                    if contact.get('name') or contact.get('phone'):
                        cursor.execute(
                            "INSERT INTO customer_contacts (customer_id, name, phone, position) VALUES (%s,%s,%s,%s)",
                            (customer_id, contact.get('name'), contact.get('phone'), contact.get('position'))
                        )
            
            # 插入新的备忘录
            if data.get('memos'):
                for memo in data['memos']:
                    if memo.get('content'):
                        cursor.execute(
                            "INSERT INTO customer_memos (customer_id, date, type, content) VALUES (%s,%s,%s,%s)",
                            (customer_id, memo.get('date'), memo.get('type'), memo.get('content'))
                        )
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """删除客户"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM customers WHERE id=%s", (customer_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 系统设置接口 ====================

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """获取系统设置"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM system_settings")
            settings_list = cursor.fetchall()
        conn.close()
        
        # 转换为字典格式
        settings = {}
        for item in settings_list:
            key = item['setting_key']
            value = item['setting_value']
            # 尝试解析JSON
            try:
                value = json.loads(value)
            except:
                pass
            settings[key] = value
        
        return jsonify({'success': True, 'data': settings})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 组织架构相关接口 ====================

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """获取部门列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM departments WHERE status='active' ORDER BY sort_order, id")
            departments = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': departments})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/departments', methods=['POST'])
def add_department():
    """添加部门"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """INSERT INTO departments (name, parent_id, manager_id, description, status, sort_order)
                     VALUES (%s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data['name'], data.get('parent_id'), data.get('manager_id'),
                data.get('description'), 'active', data.get('sort_order', 0)
            ))
            conn.commit()
            dept_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'success': True, 'id': dept_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/departments/<int:dept_id>', methods=['PUT'])
def update_department(dept_id):
    """更新部门"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """UPDATE departments SET name=%s, parent_id=%s, manager_id=%s,
                     description=%s, sort_order=%s WHERE id=%s"""
            cursor.execute(sql, (
                data['name'], data.get('parent_id'), data.get('manager_id'),
                data.get('description'), data.get('sort_order', 0), dept_id
            ))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/departments/<int:dept_id>', methods=['DELETE'])
def delete_department(dept_id):
    """删除部门（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE departments SET status='inactive' WHERE id=%s"
            cursor.execute(sql, (dept_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """获取团队列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM teams WHERE status='active' ORDER BY sort_order, id")
            teams = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': teams})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/teams', methods=['POST'])
def add_team():
    """添加团队"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """INSERT INTO teams (name, department_id, leader_id, description, status, sort_order)
                     VALUES (%s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data['name'], data.get('department_id'), data.get('leader_id'),
                data.get('description'), 'active', data.get('sort_order', 0)
            ))
            conn.commit()
            team_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'success': True, 'id': team_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/teams/<int:team_id>', methods=['PUT'])
def update_team(team_id):
    """更新团队"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """UPDATE teams SET name=%s, department_id=%s, leader_id=%s,
                     description=%s, sort_order=%s WHERE id=%s"""
            cursor.execute(sql, (
                data['name'], data.get('department_id'), data.get('leader_id'),
                data.get('description'), data.get('sort_order', 0), team_id
            ))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/teams/<int:team_id>', methods=['DELETE'])
def delete_team(team_id):
    """删除团队（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE teams SET status='inactive' WHERE id=%s"
            cursor.execute(sql, (team_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/positions', methods=['GET'])
def get_positions():
    """获取岗位列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM positions WHERE status='active' ORDER BY sort_order, id")
            positions = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': positions})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/positions', methods=['POST'])
def add_position():
    """添加岗位"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """INSERT INTO positions (name, code, department_id, level, description, requirements, status, sort_order)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data['name'], data.get('code'), data.get('department_id'),
                data.get('level'), data.get('description'), data.get('requirements'),
                'active', data.get('sort_order', 0)
            ))
            conn.commit()
            pos_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'success': True, 'id': pos_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/positions/<int:pos_id>', methods=['PUT'])
def update_position(pos_id):
    """更新岗位"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """UPDATE positions SET name=%s, code=%s, department_id=%s, level=%s,
                     description=%s, requirements=%s, sort_order=%s WHERE id=%s"""
            cursor.execute(sql, (
                data['name'], data.get('code'), data.get('department_id'),
                data.get('level'), data.get('description'), data.get('requirements'),
                data.get('sort_order', 0), pos_id
            ))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/positions/<int:pos_id>', methods=['DELETE'])
def delete_position(pos_id):
    """删除岗位（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE positions SET status='inactive' WHERE id=%s"
            cursor.execute(sql, (pos_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 区域管理相关接口 ====================

@app.route('/api/areas', methods=['GET'])
def get_areas():
    """获取区域列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM areas ORDER BY id DESC")
            areas = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': areas})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/areas/<int:area_id>', methods=['GET'])
def get_area(area_id):
    """获取单个区域详情"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM areas WHERE id=%s", (area_id,))
            area = cursor.fetchone()
        conn.close()
        if area:
            return jsonify({'success': True, 'data': area})
        else:
            return jsonify({'success': False, 'message': '区域不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/areas', methods=['POST'])
def add_area():
    """添加区域"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """INSERT INTO areas (name, code, manager, phone, remark, status)
                     VALUES (%s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data.get('name'),
                data.get('code'),
                data.get('manager'),
                data.get('phone'),
                data.get('remark'),
                data.get('status', 'active')
            ))
            area_id = cursor.lastrowid
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': area_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/areas/<int:area_id>', methods=['PUT'])
def update_area(area_id):
    """更新区域"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """UPDATE areas SET name=%s, code=%s, manager=%s, phone=%s, remark=%s, status=%s
                     WHERE id=%s"""
            cursor.execute(sql, (
                data.get('name'),
                data.get('code'),
                data.get('manager'),
                data.get('phone'),
                data.get('remark'),
                data.get('status', 'active'),
                area_id
            ))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/areas/<int:area_id>', methods=['DELETE'])
def delete_area(area_id):
    """删除区域（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE areas SET status='inactive' WHERE id=%s"
            cursor.execute(sql, (area_id,))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 项目管理相关接口 ====================

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """获取项目列表 - ✅ 多租户隔离"""
    try:
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM projects WHERE company_id=%s ORDER BY created_at DESC", (company_id,))
            projects = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': projects})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """获取单个项目详情"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM projects WHERE id=%s", (project_id,))
            project = cursor.fetchone()
        conn.close()
        if project:
            return jsonify({'success': True, 'data': project})
        else:
            return jsonify({'success': False, 'message': '项目不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/projects', methods=['POST'])
def add_project():
    """添加项目"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 如果没有提供编号，自动生成
            code = data.get('code')
            if not code:
                cursor.execute("SELECT MAX(id) as max_id FROM projects")
                result = cursor.fetchone()
                max_id = result['max_id'] if result['max_id'] else 0
                code = f'PRJ{str(max_id + 1).zfill(4)}'
            
            sql = """INSERT INTO projects (name, code, manager, budget, start_date, end_date, description, status)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data.get('name'),
                code,
                data.get('manager'),
                data.get('budget', 0),
                data.get('start_date') or None,
                data.get('end_date') or None,
                data.get('description'),
                data.get('status', 'planning')
            ))
            project_id = cursor.lastrowid
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': project_id, 'code': code})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    """更新项目"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """UPDATE projects SET name=%s, code=%s, manager=%s, budget=%s, 
                     start_date=%s, end_date=%s, description=%s, status=%s WHERE id=%s"""
            cursor.execute(sql, (
                data.get('name'),
                data.get('code'),
                data.get('manager'),
                data.get('budget', 0),
                data.get('start_date') or None,
                data.get('end_date') or None,
                data.get('description'),
                data.get('status', 'planning'),
                project_id
            ))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """删除项目（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE projects SET status='cancelled' WHERE id=%s"
            cursor.execute(sql, (project_id,))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 订单管理相关接口 ====================

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """获取订单列表（支持分页、搜索、筛选）"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        customer_id = request.args.get('customer_id', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        date_type = request.args.get('date_type', 'order_date')  # order_date订单日期 / contract_sign_date签约日期
        is_audited = request.args.get('is_audited', '')  # 审核状态筛选
        order_type = request.args.get('order_type', '')  # 新增：订单类型筛选 sale/aftersale
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 获取当前公司ID
            company_id = session.get('company_id', 1)
                    
            # 构建查询条件（使用表别名o避免JOIN后列名歧义）
            where_clauses = ["o.is_deleted=0", "o.company_id=%s"]  # ✅ 添加公司隔离
            params = [company_id]
            
            if search:
                where_clauses.append("(o.customer_name LIKE %s OR o.id LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])
            
            if status:
                where_clauses.append("o.status=%s")
                params.append(status)
            
            if customer_id:
                where_clauses.append("o.customer_id=%s")
                params.append(customer_id)
            
            # 审核状态筛选
            if is_audited:
                where_clauses.append("o.is_audited=%s")
                params.append(int(is_audited))
            
            # 新增：订单类型筛选
            if order_type:
                where_clauses.append("o.order_type=%s")
                params.append(order_type)
            
            # 日期筛选（根据date_type决定按订单日期还是签约日期）
            if start_date:
                if date_type == 'contract_sign_date':
                    where_clauses.append("o.contract_sign_date >= %s")
                else:
                    where_clauses.append("o.order_date >= %s")
                params.append(start_date)
            
            if end_date:
                if date_type == 'contract_sign_date':
                    where_clauses.append("o.contract_sign_date <= %s")
                else:
                    where_clauses.append("o.order_date <= %s")
                params.append(end_date)
            
            where_sql = " AND ".join(where_clauses)
            
            # 查询总数（使用o表别名）
            count_sql = f"SELECT COUNT(*) as total FROM orders o WHERE {where_sql}"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']
            
            # 分页查询 - ✅ JOIN customers表获取客户名称，新增关联原订单查询
            offset = (page - 1) * page_size
            data_sql = f"""SELECT o.*, c.shop_name as customer_shop_name,
                                  po.id as parent_order_number
                         FROM orders o 
                         LEFT JOIN customers c ON o.customer_id = c.id
                         LEFT JOIN orders po ON o.parent_order_id = po.id
                         WHERE {where_sql} 
                         ORDER BY o.created_at DESC LIMIT %s OFFSET %s"""
            cursor.execute(data_sql, params + [page_size, offset])
            orders = cursor.fetchall()
            
            # 为每个订单添加第一个商品的服务名称，并检查是否有关联售后订单
            for order in orders:
                cursor.execute("""
                    SELECT oi.service_name, s.name as service_real_name 
                    FROM order_items oi 
                    LEFT JOIN services s ON oi.service_id = s.id 
                    WHERE oi.order_id=%s 
                    LIMIT 1
                """, (order['id'],))
                item = cursor.fetchone()
                if item:
                    # 优先使用services表中的名称，其次使用order_items中的名称
                    order['service_name'] = item['service_real_name'] or item['service_name']
                else:
                    order['service_name'] = '自定义服务'
                
                # 检查原订单是否有关联的售后订单（仅对非售后订单检查）
                if order.get('order_type') != 'aftersale':
                    cursor.execute("""
                        SELECT COUNT(*) as aftersale_count 
                        FROM orders 
                        WHERE parent_order_id = %s AND is_deleted = 0
                    """, (order['id'],))
                    aftersale_result = cursor.fetchone()
                    order['has_aftersale'] = (aftersale_result.get('aftersale_count', 0) or 0) > 0
                else:
                    order['has_aftersale'] = False
        conn.close()
        
        return jsonify({'success': True, 'data': orders, 'total': total})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """获取订单详情（含收款记录）"""
    try:
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 获取订单主信息（JOIN客户表获取客户名称）- ✅ 添加公司过滤
            cursor.execute("""
                SELECT o.*, c.shop_name as customer_name
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id=%s AND o.company_id=%s
            """, (order_id, company_id))
            order = cursor.fetchone()
            
            if order:
                # 获取订单明细
                cursor.execute("SELECT * FROM order_items WHERE order_id=%s", (order_id,))
                order['items'] = cursor.fetchall()
                
                # 如果是售后订单，获取关联的原订单基本信息
                if order.get('order_type') == 'aftersale' and order.get('parent_order_id'):
                    cursor.execute("""
                        SELECT id, customer_name, order_date, final_amount, status
                        FROM orders WHERE id=%s
                    """, (order['parent_order_id'],))
                    parent_order = cursor.fetchone()
                    if parent_order:
                        order['parent_order_info'] = parent_order
                
                # 如果是销售订单，查询关联的售后订单列表
                if order.get('order_type') == 'sale' or not order.get('order_type'):
                    cursor.execute("""
                        SELECT id, aftersale_type, status, created_at, final_amount
                        FROM orders WHERE parent_order_id=%s AND is_deleted=0
                        ORDER BY created_at DESC
                    """, (order_id,))
                    order['aftersale_orders'] = cursor.fetchall()
                
                # P1-6优化：获取订单的收款记录
                cursor.execute("""
                    SELECT t.*, u.name as operator_name
                    FROM transactions t
                    LEFT JOIN users u ON t.created_by = u.id
                    WHERE t.order_id=%s AND t.is_void=0
                    ORDER BY t.transaction_date DESC
                """, (order_id,))
                order['payment_records'] = cursor.fetchall()
                
                # 计算收款统计
                cursor.execute("""
                    SELECT 
                        SUM(CASE WHEN is_refund=0 THEN amount ELSE 0 END) as total_paid,
                        SUM(CASE WHEN is_refund=1 THEN ABS(amount) ELSE 0 END) as total_refund
                    FROM transactions 
                    WHERE order_id=%s AND is_void=0
                """, (order_id,))
                payment_stat = cursor.fetchone()
                order['total_paid'] = float(payment_stat['total_paid'] or 0)
                order['total_refund'] = float(payment_stat['total_refund'] or 0)
                order['net_paid'] = order['total_paid'] - order['total_refund']
                
                # 计算已收款、应收款（✅ 使用final_amount作为订单总金额基准）
                # final_amount = 商品原价合计 + 议价/加价/减价金额 = 最终成交金额
                final_amount = float(order.get('final_amount') or order.get('contract_amount') or 0)
                order['paid_amount'] = order['net_paid']  # 已收款 = 净收款额
                order['unpaid_amount'] = final_amount - order['net_paid']  # 待收款 = 最终成交金额 - 净收款额
                
                # 收款状态判断（基于最终成交金额）
                # 未收款：累计已收金额为 0
                # 部分收款：累计已收金额 > 0 且 待收金额 > 0
                # 已收款：累计已收金额 ≥ 订单最终成交金额（且订单最终成交金额 > 0）
                if order['net_paid'] <= 0:
                    order['payment_status'] = '未收款'
                elif final_amount > 0 and order['net_paid'] >= final_amount:
                    order['payment_status'] = '已收款'
                else:
                    order['payment_status'] = '部分收款'
                
                # P2-4优化：获取订单的售后记录
                cursor.execute("""
                    SELECT a.*, u.name as operator_name
                    FROM order_aftersales a
                    LEFT JOIN users u ON a.created_by = u.id
                    WHERE a.order_id=%s
                    ORDER BY a.created_at DESC
                """, (order_id,))
                order['aftersales_records'] = cursor.fetchall()
                
        conn.close()
        
        if order:
            return jsonify({'success': True, 'data': order})
        else:
            return jsonify({'success': False, 'message': '订单不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders', methods=['POST'])
def add_order():
    """添加订单"""
    try:
        data = request.json
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            # ✅ 验证customer_id存在性
            customer_id = data.get('customer_id')
            if customer_id:
                cursor.execute("SELECT id, shop_name FROM customers WHERE id=%s", (customer_id,))
                customer = cursor.fetchone()
                if not customer:
                    return jsonify({'success': False, 'message': '客户不存在，请先创建客户'}), 400
                customer_name = customer['shop_name']
            else:
                return jsonify({'success': False, 'message': '缺少客户ID'}), 400
            
            # 插入订单主表（匹配实际表结构 - 完整53字段，新增customer_name）
            sql = """INSERT INTO orders (customer_id, customer_name, order_date, 
                     business_staff, business_staff_id,
                     service_staff, service_staff_id,
                     operation_staff, operation_staff_id,
                     management_staff, management_staff_id,
                     team, team_id,
                     department_id, position_id,
                     region, region_id,
                     project, project_id,
                     company,
                     contract_number, contract_sign_date, no_contract_required,
                     contract_amount, total_amount, total_cost,
                     discount_type, discount_percent, discount_amount,
                     negotiation_amount, final_transaction_price,
                     extra_cost_type, extra_cost_name, extra_cost_amount,
                     final_amount, final_cost, status, remarks)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            
            # 处理remarks：如果是list则转为json字符串
            remarks_data = data.get('remarks', [])
            if isinstance(remarks_data, list):
                remarks_str = json.dumps(remarks_data, ensure_ascii=False)
            else:
                remarks_str = str(remarks_data) if remarks_data else None
            
            cursor.execute(sql, (
                customer_id,
                customer_name,
                data.get('order_date'),
                data.get('business_staff'),
                data.get('business_staff_id'),
                data.get('service_staff'),
                data.get('service_staff_id'),
                data.get('operation_staff'),
                data.get('operation_staff_id'),
                data.get('management_staff'),
                data.get('management_staff_id'),
                data.get('team'),
                data.get('team_id'),
                data.get('department_id'),
                data.get('position_id'),
                data.get('region'),
                data.get('region_id'),
                data.get('project'),
                data.get('project_id'),
                data.get('company'),
                data.get('contract_number'),
                data.get('contract_sign_date'),
                data.get('no_contract_required', False),
                data.get('contract_amount', 0),
                data.get('total_amount', 0),
                data.get('total_cost', 0),
                data.get('discount_type', 'percent'),
                data.get('discount_percent', 100.00),
                data.get('discount_amount', 0),
                data.get('negotiation_amount', 0),
                data.get('final_transaction_price', 0),
                data.get('extra_cost_type', ''),
                data.get('extra_cost_name', ''),
                data.get('extra_cost_amount', 0),
                data.get('final_amount', 0),
                data.get('final_cost', 0),
                data.get('status', '待签约'),
                remarks_str
            ))
            order_id = cursor.lastrowid
            
            # 插入订单明细（order_items表）
            if 'items' in data and data['items']:
                item_sql = """INSERT INTO order_items (order_id, service_id, service_name, service_type, price, quantity, total)
                             VALUES (%s, %s, %s, %s, %s, %s, %s)"""
                for item in data['items']:
                    cursor.execute(item_sql, (
                        order_id,
                        item.get('service_id'),  # 新增：保存service_id
                        item.get('service_name'),
                        '服务',  # 默认类型
                        item.get('price', 0),
                        item.get('quantity', 1),
                        item.get('subtotal', 0)
                    ))
            
            conn.commit()
        conn.close()
        
        # ✅ 记录创建订单操作日志
        log_order_operation(order_id, 'create', remark=f'创建订单，客户: {customer_name}')
        
        return jsonify({'success': True, 'data': {'id': order_id}})
    except Exception as e:
        import traceback
        app.logger.error(f'订单创建错误: {str(e)}\n{traceback.format_exc()}')
        return jsonify({'success': False, 'message': str(e)})

# ========== 售后订单API ==========

@app.route('/api/orders/aftersale', methods=['POST'])
def create_aftersale_order():
    """创建售后订单（作为独立订单，关联原销售订单）"""
    try:
        data = request.json
        parent_order_id = data.get('parent_order_id')
        aftersale_type = data.get('aftersale_type')
        aftersale_reason = data.get('aftersale_reason', '')
        
        if not parent_order_id:
            return jsonify({'success': False, 'message': '缺少原订单ID'}), 400
        if not aftersale_type:
            return jsonify({'success': False, 'message': '缺少售后类型'}), 400
        
        conn = get_db_connection()
        company_id = session.get('company_id', 1)
        
        with conn.cursor() as cursor:
            # 验证原订单存在且属于当前公司
            cursor.execute("""
                SELECT id, customer_id, customer_name, business_staff, business_staff_id,
                       service_staff, service_staff_id, operation_staff, operation_staff_id,
                       team, team_id, project, project_id, company
                FROM orders WHERE id=%s AND company_id=%s AND is_deleted=0
            """, (parent_order_id, company_id))
            parent_order = cursor.fetchone()
            
            if not parent_order:
                return jsonify({'success': False, 'message': '原订单不存在'}), 404
            
            # 处理remarks：如果是list则转为json字符串
            remarks_data = data.get('remarks', [])
            if isinstance(remarks_data, list):
                remarks_str = json.dumps(remarks_data, ensure_ascii=False)
            else:
                remarks_str = str(remarks_data) if remarks_data else None
            
            # 创建售后订单（继承原订单的客户和团队信息）
            sql = """INSERT INTO orders (
                order_type, parent_order_id, aftersale_type, aftersale_reason,
                customer_id, customer_name, order_date,
                business_staff, business_staff_id,
                service_staff, service_staff_id,
                operation_staff, operation_staff_id,
                team, team_id,
                project, project_id,
                company, company_id,
                total_amount, total_cost,
                negotiation_amount, final_transaction_price,
                final_amount, final_cost,
                status, remarks
            ) VALUES (
                'aftersale', %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s
            )"""
            
            cursor.execute(sql, (
                parent_order_id,
                aftersale_type,
                aftersale_reason,
                parent_order['customer_id'],
                parent_order['customer_name'],
                data.get('order_date'),
                data.get('business_staff') or parent_order['business_staff'],
                data.get('business_staff_id') or parent_order['business_staff_id'],
                data.get('service_staff') or parent_order['service_staff'],
                data.get('service_staff_id') or parent_order['service_staff_id'],
                data.get('operation_staff') or parent_order['operation_staff'],
                data.get('operation_staff_id') or parent_order['operation_staff_id'],
                data.get('team') or parent_order['team'],
                data.get('team_id') or parent_order['team_id'],
                data.get('project') or parent_order['project'],
                data.get('project_id') or parent_order['project_id'],
                parent_order['company'],
                company_id,
                data.get('total_amount', 0),
                data.get('total_cost', 0),
                data.get('negotiation_amount', 0),
                data.get('final_transaction_price', 0),
                data.get('final_amount', 0),
                data.get('final_cost', 0),
                data.get('status', '处理中'),
                remarks_str
            ))
            order_id = cursor.lastrowid
            
            # 插入订单明细（优先继承原订单的服务项目，若前端未传则自动复制）
            if 'items' in data and data['items']:
                # 前端显式传入的items
                item_sql = """INSERT INTO order_items (order_id, service_id, service_name, service_type, price, quantity, total)
                             VALUES (%s, %s, %s, %s, %s, %s, %s)"""
                for item in data['items']:
                    cursor.execute(item_sql, (
                        order_id,
                        item.get('service_id'),
                        item.get('service_name'),
                        '服务',
                        item.get('price', 0),
                        item.get('quantity', 1),
                        item.get('subtotal', 0)
                    ))
            else:
                # 自动继承原订单的服务项目
                cursor.execute("""
                    INSERT INTO order_items (order_id, service_id, service_name, service_type, price, quantity, total)
                    SELECT %s, service_id, service_name, service_type, price, quantity, total
                    FROM order_items WHERE order_id = %s
                """, (order_id, parent_order_id))
            
            conn.commit()
        conn.close()
        
        # 记录创建售后订单操作日志
        log_order_operation(order_id, 'create', remark=f'创建售后订单，关联原订单: {parent_order_id}，类型: {aftersale_type}')
        
        return jsonify({'success': True, 'data': {'id': order_id, 'parent_order_id': parent_order_id}})
    except Exception as e:
        import traceback
        app.logger.error(f'售后订单创建错误: {str(e)}\n{traceback.format_exc()}')
        return jsonify({'success': False, 'message': str(e)})

# ========== 批量订单登记API ==========

@app.route('/api/orders/batch/draft', methods=['GET'])
@require_company
def get_batch_draft(current_company_id=None, current_user_id=None):
    """获取当前用户的批量订单草稿"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, draft_data, created_at, updated_at 
                FROM order_batch_drafts 
                WHERE user_id = %s AND company_id = %s
                ORDER BY updated_at DESC LIMIT 1
            """, (current_user_id, current_company_id))
            draft = cursor.fetchone()
        conn.close()
        
        if draft:
            return jsonify({
                'success': True, 
                'data': {
                    'id': draft['id'],
                    'draft_data': draft['draft_data'],
                    'created_at': str(draft['created_at']),
                    'updated_at': str(draft['updated_at'])
                }
            })
        else:
            return jsonify({'success': True, 'data': None})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/batch/draft', methods=['POST'])
@require_company
def save_batch_draft(current_company_id=None, current_user_id=None):
    """保存批量订单草稿"""
    try:
        data = request.json
        draft_data = data.get('draft_data', [])
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 检查是否已有草稿
            cursor.execute("""
                SELECT id FROM order_batch_drafts 
                WHERE user_id = %s AND company_id = %s LIMIT 1
            """, (current_user_id, current_company_id))
            existing = cursor.fetchone()
            
            import json
            if existing:
                # 更新现有草稿
                cursor.execute("""
                    UPDATE order_batch_drafts 
                    SET draft_data = %s, updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps(draft_data, ensure_ascii=False), existing['id']))
                draft_id = existing['id']
            else:
                # 创建新草稿
                cursor.execute("""
                    INSERT INTO order_batch_drafts (user_id, company_id, draft_data)
                    VALUES (%s, %s, %s)
                """, (current_user_id, current_company_id, json.dumps(draft_data, ensure_ascii=False)))
                draft_id = cursor.lastrowid
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'data': {'id': draft_id}, 'message': '草稿已保存'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/batch/draft', methods=['DELETE'])
@require_company
def delete_batch_draft(current_company_id=None, current_user_id=None):
    """删除批量订单草稿"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                DELETE FROM order_batch_drafts 
                WHERE user_id = %s AND company_id = %s
            """, (current_user_id, current_company_id))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '草稿已删除'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/batch/validate-customers', methods=['POST'])
@require_company
def validate_batch_customers(current_company_id=None, current_user_id=None):
    """批量校验客户是否存在"""
    try:
        data = request.json
        customer_names = data.get('customer_names', [])
        
        if not customer_names:
            return jsonify({'success': True, 'data': {'existing': {}, 'missing': []}})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 查询已存在的客户
            placeholders = ','.join(['%s'] * len(customer_names))
            cursor.execute(f"""
                SELECT id, shop_name FROM customers 
                WHERE company_id = %s AND is_deleted = 0 AND shop_name IN ({placeholders})
            """, [current_company_id] + customer_names)
            existing_customers = cursor.fetchall()
        conn.close()
        
        # 构建结果
        existing_map = {c['shop_name']: c['id'] for c in existing_customers}
        missing = [name for name in customer_names if name not in existing_map]
        
        return jsonify({
            'success': True, 
            'data': {
                'existing': existing_map,
                'missing': missing
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/batch/submit', methods=['POST'])
@require_company
def submit_batch_orders(current_company_id=None, current_user_id=None):
    """批量提交订单"""
    try:
        data = request.json
        orders = data.get('orders', [])
        
        if not orders:
            return jsonify({'success': False, 'message': '订单列表为空'})
        
        conn = get_db_connection()
        results = {'success': [], 'failed': []}
        
        with conn.cursor() as cursor:
            for idx, order_data in enumerate(orders):
                try:
                    # 校验必填字段
                    customer_id = order_data.get('customer_id')
                    order_date = order_data.get('order_date')
                    
                    if not customer_id:
                        results['failed'].append({'index': idx, 'reason': '客户ID为空'})
                        continue
                    if not order_date:
                        results['failed'].append({'index': idx, 'reason': '下单日期为空'})
                        continue
                    
                    # 获取商品信息
                    items = order_data.get('items', [])
                    if not items:
                        results['failed'].append({'index': idx, 'reason': '商品/服务项目为空'})
                        continue
                    
                    # 计算金额
                    total_amount = sum(float(item.get('amount', 0)) for item in items)
                    final_amount = float(order_data.get('final_amount', total_amount))
                    
                    # 插入订单主表
                    cursor.execute("""
                        INSERT INTO orders (
                            customer_id, company_id, order_date, contract_amount, final_amount,
                            paid_amount, unpaid_amount, payment_status,
                            team, team_id, business_staff, business_staff_id, project, project_id,
                            remark, created_by, is_deleted
                        ) VALUES (
                            %s, %s, %s, %s, %s, 0, %s, '未收款',
                            %s, %s, %s, %s, %s, %s, %s, %s, 0
                        )
                    """, (
                        customer_id, current_company_id, order_date, total_amount, final_amount,
                        final_amount,
                        order_data.get('team', ''), order_data.get('team_id'),
                        order_data.get('business_staff', ''), order_data.get('business_staff_id'),
                        order_data.get('project', ''), order_data.get('project_id'),
                        order_data.get('remark', ''), current_user_id
                    ))
                    order_id = cursor.lastrowid
                    
                    # 插入订单明细
                    for item in items:
                        item_type = item.get('type', 'product')
                        cursor.execute("""
                            INSERT INTO order_items (
                                order_id, type, product_id, product_name, service_id, service_name,
                                quantity, unit_price, amount
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            order_id, item_type,
                            item.get('product_id') if item_type == 'product' else None,
                            item.get('name', '') if item_type == 'product' else None,
                            item.get('service_id') if item_type == 'service' else None,
                            item.get('name', '') if item_type == 'service' else None,
                            item.get('quantity', 1), item.get('unit_price', 0), item.get('amount', 0)
                        ))
                    
                    results['success'].append({'index': idx, 'order_id': order_id})
                    
                except Exception as item_error:
                    results['failed'].append({'index': idx, 'reason': str(item_error)})
            
            conn.commit()
            
            # 如果有成功的订单，删除草稿
            if results['success']:
                cursor.execute("""
                    DELETE FROM order_batch_drafts 
                    WHERE user_id = %s AND company_id = %s
                """, (current_user_id, current_company_id))
                conn.commit()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': results,
            'message': f"成功创建 {len(results['success'])} 条订单，失败 {len(results['failed'])} 条"
        })
    except Exception as e:
        import traceback
        app.logger.error(f'批量订单提交错误: {traceback.format_exc()}')
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    """更新订单（仅未审核订单可修改）"""
    try:
        data = request.json
        app.logger.info(f"订单更新请求 order_id={order_id}, customer_id={data.get('customer_id')}, items数量={len(data.get('items', []))}")
        
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            # ✅ 检查审核状态和公司权限
            cursor.execute("SELECT is_audited FROM orders WHERE id=%s AND company_id=%s", (order_id, company_id))
            order = cursor.fetchone()
            if not order:
                return jsonify({'success': False, 'message': '订单不存在或无权限'})
            if order['is_audited'] == 1:
                return jsonify({'success': False, 'message': '已审核订单不可修改，请先反审核'})
            
            # 更新订单主表（完整字段）
            sql = """UPDATE orders SET 
                     customer_id=%s, 
                     order_date=%s, 
                     total_amount=%s,
                     contract_amount=%s,
                     contract_number=%s,
                     contract_sign_date=%s,
                     no_contract_required=%s,
                     total_cost=%s,
                     discount_type=%s,
                     discount_percent=%s,
                     discount_amount=%s,
                     negotiation_amount=%s,
                     final_transaction_price=%s,
                     extra_cost_type=%s,
                     extra_cost_name=%s,
                     extra_cost_amount=%s,
                     final_amount=%s,
                     final_cost=%s,
                     status=%s, 
                     business_staff=%s,
                     business_staff_id=%s,
                     service_staff=%s,
                     service_staff_id=%s,
                     operation_staff=%s,
                     operation_staff_id=%s,
                     management_staff=%s,
                     management_staff_id=%s,
                     team=%s,
                     team_id=%s,
                     department_id=%s,
                     position_id=%s,
                     region=%s,
                     region_id=%s,
                     project=%s,
                     project_id=%s,
                     company=%s,
                     remarks=%s 
                     WHERE id=%s"""
            
            # 将remarks列表转为JSON字符串
            import json
            remarks_json = json.dumps(data.get('remarks', []), ensure_ascii=False)
            
            cursor.execute(sql, (
                data.get('customer_id'),
                data.get('order_date'),
                data.get('total_amount', 0),
                data.get('contract_amount', 0),
                data.get('contract_number'),
                data.get('contract_sign_date'),
                data.get('no_contract_required', False),
                data.get('total_cost', 0),
                data.get('discount_type', 'percent'),
                data.get('discount_percent', 100.00),
                data.get('discount_amount', 0),
                data.get('negotiation_amount', 0),
                data.get('final_transaction_price', 0),
                data.get('extra_cost_type', ''),
                data.get('extra_cost_name', ''),
                data.get('extra_cost_amount', 0),
                data.get('final_amount', 0),
                data.get('final_cost', 0),
                data.get('status', '待签约'),
                data.get('business_staff'),
                data.get('business_staff_id'),
                data.get('service_staff'),
                data.get('service_staff_id'),
                data.get('operation_staff'),
                data.get('operation_staff_id'),
                data.get('management_staff'),
                data.get('management_staff_id'),
                data.get('team'),
                data.get('team_id'),
                data.get('department_id'),
                data.get('position_id'),
                data.get('region'),
                data.get('region_id'),
                data.get('project'),
                data.get('project_id'),
                data.get('company'),
                remarks_json,
                order_id
            ))
            
            # 删除旧的订单明细
            cursor.execute("DELETE FROM order_items WHERE order_id=%s", (order_id,))
            
            # 插入新的订单明细
            if 'items' in data and data['items']:
                item_sql = """INSERT INTO order_items 
                             (order_id, service_id, service_name, service_type, price, quantity, total, supply_price)
                             VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
                for item in data['items']:
                    cursor.execute(item_sql, (
                        order_id,
                        item.get('service_id'),
                        item.get('service_name'),
                        '服务',  # 默认类型
                        item.get('price', 0),
                        item.get('quantity', 1),
                        item.get('subtotal', 0),
                        item.get('supply_price', 0)
                    ))
                    app.logger.debug(f"已插入明细: service_id={item.get('service_id')}, name={item.get('service_name')}")
            else:
                app.logger.warning("订单更新没有items数据")
            
            conn.commit()
            
            # 验证保存结果
            cursor.execute("SELECT COUNT(*) as cnt FROM order_items WHERE order_id=%s", (order_id,))
            saved_count = cursor.fetchone()['cnt']
            app.logger.info(f"订单 #{order_id} 明细更新完成，共 {saved_count} 条")
        conn.close()
        
        # ✅ 记录编辑订单操作日志
        log_order_operation(order_id, 'edit', remark='编辑订单信息')
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    """删除订单（软删除）。仅允许删除未审核订单"""
    try:
        # 获取当前用户ID和公司ID
        current_user_id = session.get('user_id')
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 检查审核状态和公司权限
            cursor.execute(
                "SELECT is_audited, business_audit_status, finance_audit_status FROM orders WHERE id=%s AND company_id=%s",
                (order_id, company_id)
            )
            order = cursor.fetchone()
            
            if not order:
                return jsonify({'success': False, 'message': '订单不存在'})
            
            # 检查业务审核状态
            if order['business_audit_status'] == 1:
                return jsonify({
                    'success': False, 
                    'message': '已业务审核订单不可删除，请先反审核'
                })
            
            # 检查财务审核状态
            if order['finance_audit_status'] == 1:
                return jsonify({
                    'success': False, 
                    'message': '已财务审核订单不可删除，请先反审核'
                })
            
            # 兼容旧的单审核字段
            if order['is_audited'] == 1:
                return jsonify({
                    'success': False, 
                    'message': '已审核订单不可删除，请先反审核'
                })
            
            # 执行软删除
            sql = "UPDATE orders SET is_deleted=1, deleted_by=%s, deleted_at=NOW() WHERE id=%s"
            cursor.execute(sql, (current_user_id, order_id))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/audit', methods=['POST'])
def audit_order(order_id):
    """审核订单"""
    try:
        # 获取当前用户ID
        current_user_id = session.get('user_id')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE orders SET is_audited=1, audited_by=%s, audited_at=NOW() WHERE id=%s"
            cursor.execute(sql, (current_user_id, order_id))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/unaudit', methods=['POST'])
def unaudit_order(order_id):
    """反审核订单（兼容旧API，映射到反业务审核）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE orders SET is_audited=0, audited_by=NULL, audited_at=NULL WHERE id=%s"
            cursor.execute(sql, (order_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 双审核机制 API ====================

@app.route('/api/orders/<int:order_id>/audit-business', methods=['POST'])
def audit_business(order_id):
    """业务审核订单（审核通过后自动创建任务池记录）"""
    try:
        # 获取当前用户ID和公司ID
        current_user_id = session.get('user_id')
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 检查订单是否存在且属于当前公司
            cursor.execute("SELECT id, business_audit_status, customer_name FROM orders WHERE id=%s AND company_id=%s", (order_id, company_id))
            order = cursor.fetchone()
            if not order:
                return jsonify({'success': False, 'message': '订单不存在'})
            
            if order['business_audit_status'] == 1:
                return jsonify({'success': False, 'message': '订单已业务审核，不可重复审核'})
            
            # 业务审核
            sql = "UPDATE orders SET business_audit_status=1, business_audited_by=%s, business_audited_at=NOW(), is_audited=1 WHERE id=%s"
            cursor.execute(sql, (current_user_id, order_id))
            
            # 自动创建任务池记录
            cursor.execute("""
                INSERT INTO task_pool 
                (order_id, status, source_type, priority, description, requirements, created_at)
                VALUES (%s, '待接单', '订单审核', '中', %s, %s, NOW())
            """, (
                order_id,
                f'订单ID：{order["id"]}，客户：{order["customer_name"]}',
                '请按照订单要求完成服务任务'
            ))
            
            conn.commit()
        conn.close()
        
        # ✅ 记录业务审核操作日志
        log_order_operation(order_id, 'business_audit', remark='业务审核通过')
        
        return jsonify({'success': True, 'message': '审核成功，任务已自动创建'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/audit-finance', methods=['POST'])
def audit_finance(order_id):
    """财务审核订单（必须先业务审核）"""
    try:
        # 获取当前用户ID和公司ID
        current_user_id = session.get('user_id')
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 检查订单是否存在且已业务审核
            cursor.execute("SELECT id, business_audit_status, finance_audit_status FROM orders WHERE id=%s AND company_id=%s", (order_id, company_id))
            order = cursor.fetchone()
            if not order:
                return jsonify({'success': False, 'message': '订单不存在'})
            
            # 兼容旧数据：is_audited=1也认为已业务审核
            cursor.execute("SELECT is_audited FROM orders WHERE id=%s AND company_id=%s", (order_id, company_id))
            is_audited = cursor.fetchone()['is_audited']
            
            if order['business_audit_status'] != 1 and is_audited != 1:
                return jsonify({'success': False, 'message': '请先进行业务审核'})
            
            if order['finance_audit_status'] == 1:
                return jsonify({'success': False, 'message': '订单已财务审核，不可重复审核'})
            
            # 财务审核
            sql = "UPDATE orders SET finance_audit_status=1, finance_audited_by=%s, finance_audited_at=NOW() WHERE id=%s"
            cursor.execute(sql, (current_user_id, order_id))
            conn.commit()
        conn.close()
        
        # ✅ 记录财务审核操作日志
        log_order_operation(order_id, 'finance_audit', remark='财务审核通过')
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/unaudit-business', methods=['POST'])
def unaudit_business(order_id):
    """反业务审核订单"""
    try:
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 检查是否已财务审核
            cursor.execute("SELECT finance_audit_status FROM orders WHERE id=%s AND company_id=%s", (order_id, company_id))
            order = cursor.fetchone()
            if order and order['finance_audit_status'] == 1:
                return jsonify({'success': False, 'message': '请先反财务审核'})
            
            # 反业务审核
            sql = "UPDATE orders SET business_audit_status=0, business_audited_by=NULL, business_audited_at=NULL, is_audited=0, audited_by=NULL, audited_at=NULL WHERE id=%s"
            cursor.execute(sql, (order_id,))
            conn.commit()
        conn.close()
        
        # ✅ 记录反业务审核操作日志
        log_order_operation(order_id, 'business_unaudit', remark='反业务审核')
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/unaudit-finance', methods=['POST'])
def unaudit_finance(order_id):
    """反财务审核订单（回到业务审核状态）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 反财务审核，保留业务审核状态
            sql = "UPDATE orders SET finance_audit_status=0, finance_audited_by=NULL, finance_audited_at=NULL WHERE id=%s"
            cursor.execute(sql, (order_id,))
            conn.commit()
        conn.close()
        
        # ✅ 记录反财务审核操作日志
        log_order_operation(order_id, 'finance_unaudit', remark='反财务审核')
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 订单操作日志 API ====================

def log_order_operation(order_id, operation_type, changes=None, remark=None):
    """
    记录订单操作日志
    :param order_id: 订单ID
    :param operation_type: 操作类型 (create/edit/business_audit/business_unaudit/finance_audit/finance_unaudit/delete/void)
    :param changes: 变更详情字典 {field: {old: xxx, new: yyy}}
    :param remark: 操作备注/审核意见
    """
    try:
        operator_id = session.get('user_id')
        operator_name = session.get('user_name', '')
        company_id = session.get('company_id', 1)
        
        if not operator_id:
            return False
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            changes_json = json.dumps(changes, ensure_ascii=False) if changes else None
            cursor.execute("""
                INSERT INTO order_operation_logs 
                (order_id, operation_type, operator_id, operator_name, changes_json, remark, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (order_id, operation_type, operator_id, operator_name, changes_json, remark, company_id))
            conn.commit()
        conn.close()
        return True
    except Exception as e:
        app.logger.error(f'记录操作日志失败: {e}')
        return False

@app.route('/api/orders/<int:order_id>/operation-logs', methods=['GET'])
def get_order_operation_logs(order_id):
    """获取订单操作日志列表"""
    try:
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, order_id, operation_type, operator_id, operator_name,
                       operation_time, changes_json, remark
                FROM order_operation_logs
                WHERE order_id = %s AND company_id = %s
                ORDER BY operation_time DESC
            """, (order_id, company_id))
            logs = cursor.fetchall()
        conn.close()
        
        # 转换操作类型为中文显示
        operation_type_map = {
            'create': '创建订单',
            'edit': '编辑订单',
            'business_audit': '业务审核',
            'business_unaudit': '反业务审核',
            'finance_audit': '财务审核',
            'finance_unaudit': '反财务审核',
            'delete': '删除订单',
            'void': '作废订单'
        }
        
        for log in logs:
            log['operation_type_text'] = operation_type_map.get(log['operation_type'], log['operation_type'])
            # 解析changes_json
            if log['changes_json']:
                try:
                    log['changes'] = json.loads(log['changes_json'])
                except:
                    log['changes'] = None
            else:
                log['changes'] = None
        
        return jsonify({'success': True, 'data': logs})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/restore', methods=['POST'])
def restore_order(order_id):
    """恢复订单（从回收站恢复）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE orders SET is_deleted=0, deleted_by=NULL, deleted_at=NULL WHERE id=%s"
            cursor.execute(sql, (order_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/recycle', methods=['GET'])
def get_recycle_orders():
    """获取回收站订单列表（支持分页）"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        search = request.args.get('search', '')
        
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 构建查询条件 - ✅ 添加公司隔离
            where_clauses = ["is_deleted=1", "company_id=%s"]
            params = [company_id]
            
            if search:
                where_clauses.append("(customer_name LIKE %s OR id LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])
            
            where_sql = " AND ".join(where_clauses)
            
            # 查询总数
            count_sql = f"SELECT COUNT(*) as total FROM orders WHERE {where_sql}"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']
            
            # 分页查询
            offset = (page - 1) * page_size
            data_sql = f"SELECT * FROM orders WHERE {where_sql} ORDER BY deleted_at DESC LIMIT %s OFFSET %s"
            cursor.execute(data_sql, params + [page_size, offset])
            orders = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': orders, 'total': total})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/export', methods=['GET'])
def export_orders():
    """导出订单（Excel格式）"""
    try:
        # 获取筛选条件
        status = request.args.get('status', '')
        customer_id = request.args.get('customer_id', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        date_type = request.args.get('date_type', 'order_date')
        is_audited = request.args.get('is_audited', '')
        
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 构建查询条件 - ✅ 添加公司隔离
            where_clauses = ["is_deleted=0", "company_id=%s"]
            params = [company_id]
            
            if status:
                where_clauses.append("status=%s")
                params.append(status)
            
            if customer_id:
                where_clauses.append("customer_id=%s")
                params.append(customer_id)
            
            if is_audited:
                where_clauses.append("is_audited=%s")
                params.append(int(is_audited))
            
            if start_date:
                if date_type == 'contract_sign_date':
                    where_clauses.append("contract_sign_date >= %s")
                else:
                    where_clauses.append("order_date >= %s")
                params.append(start_date)
            
            if end_date:
                if date_type == 'contract_sign_date':
                    where_clauses.append("contract_sign_date <= %s")
                else:
                    where_clauses.append("order_date <= %s")
                params.append(end_date)
            
            where_sql = " AND ".join(where_clauses)
            
            # 查询所有符合条件的订单
            data_sql = f"SELECT * FROM orders WHERE {where_sql} ORDER BY created_at DESC"
            cursor.execute(data_sql, params)
            orders = cursor.fetchall()
        conn.close()
        
        # 注：这里返回JSON数据，前端负责转换为Excel
        # 如需后端生成Excel，可使用openpyxl库
        return jsonify({
            'success': True, 
            'data': orders,
            'message': '订单数据获取成功，请前端处理为Excel'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 财务流水相关接口 ====================

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """获取财务流水列表（支持分页、搜索、筛选）"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        search = request.args.get('search', '')
        transaction_type = request.args.get('type', '')  # 收入/支出
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # ✅ 获取当前公司ID
            company_id = session.get('company_id', 1)
            
            # 构建查询条件
            where_clauses = ["company_id=%s"]  # ✅ 添加公司隔离
            params = [company_id]
            
            if search:
                where_clauses.append("(payer_name LIKE %s OR payee_name LIKE %s OR purpose LIKE %s OR remark LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param, search_param, search_param])
            
            if transaction_type:
                where_clauses.append("transaction_type=%s")
                params.append(transaction_type)
            
            if start_date:
                where_clauses.append("transaction_date >= %s")
                params.append(start_date)
            
            if end_date:
                where_clauses.append("transaction_date <= %s")
                params.append(end_date)
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
            
            # 查询总数
            count_sql = f"SELECT COUNT(*) as total FROM transactions WHERE {where_sql}"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']
            
            # 分页查询
            offset = (page - 1) * page_size
            data_sql = f"SELECT * FROM transactions WHERE {where_sql} ORDER BY transaction_date DESC, id DESC LIMIT %s OFFSET %s"
            cursor.execute(data_sql, params + [page_size, offset])
            transactions = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': transactions, 'total': total})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    """添加财务流水（支持订单关联和退款标识）"""
    try:
        data = request.json
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            # P1-5优化：支持订单关联和退款标识
            sql = """INSERT INTO transactions (transaction_type, transaction_date, payer_bank, payer_name, 
                     payee_bank, payee_name, amount, purpose, remark, account_id, company_id, order_id,
                     is_refund, refund_type, original_order_id, created_by)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data.get('transaction_type'),
                data.get('transaction_date'),
                data.get('payer_bank'),
                data.get('payer_name'),
                data.get('payee_bank'),
                data.get('payee_name'),
                data.get('amount'),
                data.get('purpose'),
                data.get('remark'),
                data.get('account_id'),
                data.get('company_id'),
                data.get('order_id'),  # 关联订单ID
                data.get('is_refund', 0),  # 是否退款，默认0
                data.get('refund_type'),  # 退款类型
                data.get('original_order_id'),  # 原订单ID
                data.get('created_by')
            ))
            transaction_id = cursor.lastrowid
            
            # 如果关联了订单，更新订单的收款状态
            order_id = data.get('order_id')
            if order_id and data.get('is_refund', 0) == 0:  # 非退款流水才更新收款状态
                # 计算该订单的总收款金额
                cursor.execute("""
                    SELECT SUM(amount) as paid 
                    FROM transactions 
                    WHERE order_id=%s AND is_refund=0 AND is_void=0
                """, (order_id,))
                result = cursor.fetchone()
                paid_amount = result['paid'] if result and result['paid'] else 0
                
                # 获取订单最终成交金额（✅ 使用final_amount代替contract_amount）
                cursor.execute("SELECT final_amount, contract_amount FROM orders WHERE id=%s", (order_id,))
                order = cursor.fetchone()
                if order:
                    # 优先使用final_amount，其次使用contract_amount
                    final_amount = order['final_amount'] if order['final_amount'] else order['contract_amount']
                    final_amount = final_amount or 0
                    unpaid_amount = final_amount - paid_amount
                    
                    # 收款状态判断（基于最终成交金额）
                    # 未收款：累计已收金额为 0
                    # 部分收款：累计已收金额 > 0 且 待收金额 > 0
                    # 已收款：累计已收金额 ≥ 订单最终成交金额（且订单最终成交金额 > 0）
                    if paid_amount == 0:
                        payment_status = '未收款'
                    elif final_amount > 0 and paid_amount >= final_amount:
                        payment_status = '已收款'
                    else:
                        payment_status = '部分收款'
                    
                    # 更新订单收款状态
                    cursor.execute("""
                        UPDATE orders 
                        SET paid_amount=%s, unpaid_amount=%s, payment_status=%s 
                        WHERE id=%s
                    """, (paid_amount, unpaid_amount, payment_status, order_id))
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': transaction_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """获取单条流水详情"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM transactions WHERE id=%s", (transaction_id,))
            transaction = cursor.fetchone()
        conn.close()
        
        if transaction:
            return jsonify({'success': True, 'data': transaction})
        else:
            return jsonify({'success': False, 'message': '流水记录不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """更新流水记录"""
    try:
        data = request.json
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            sql = """UPDATE transactions SET transaction_type=%s, transaction_date=%s, 
                     payer_bank=%s, payer_name=%s, payee_bank=%s, payee_name=%s,
                     amount=%s, purpose=%s, remark=%s, account_id=%s, company_id=%s
                     WHERE id=%s"""
            cursor.execute(sql, (
                data.get('transaction_type'),
                data.get('transaction_date'),
                data.get('payer_bank'),
                data.get('payer_name'),
                data.get('payee_bank'),
                data.get('payee_name'),
                data.get('amount'),
                data.get('purpose'),
                data.get('remark'),
                data.get('account_id'),
                data.get('company_id'),
                transaction_id
            ))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """删除流水记录（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 软删除：设置 is_void 为 1
            cursor.execute("UPDATE transactions SET is_void=1 WHERE id=%s", (transaction_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/transactions/batch', methods=['POST'])
def batch_add_transactions():
    """批量添加流水记录"""
    try:
        data_list = request.json.get('transactions', [])
        if not data_list:
            return jsonify({'success': False, 'message': '数据为空'})
        
        conn = get_db_connection()
        success_count = 0
        
        with conn.cursor() as cursor:
            for data in data_list:
                try:
                    sql = """INSERT INTO transactions (transaction_type, transaction_date, payer_bank, payer_name, 
                             payee_bank, payee_name, amount, purpose, remark, account_id, company_id, created_by)
                             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
                    cursor.execute(sql, (
                        data.get('transaction_type'),
                        data.get('transaction_date'),
                        data.get('payer_bank'),
                        data.get('payer_name'),
                        data.get('payee_bank'),
                        data.get('payee_name'),
                        data.get('amount'),
                        data.get('purpose'),
                        data.get('remark'),
                        data.get('account_id'),
                        data.get('company_id'),
                        data.get('created_by')
                    ))
                    success_count += 1
                except Exception as e:
                    app.logger.error(f"批量添加失败: {str(e)}")
                    continue
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'count': success_count})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 账户管理相关接口 ====================

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    """获取账户列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM accounts WHERE status='active' ORDER BY id")
            accounts = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': accounts})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/accounts', methods=['POST'])
def add_account():
    """添加账户"""
    try:
        data = request.json
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            sql = """INSERT INTO accounts (name, company_id, bank_name, account_number, 
                     balance, initial_balance, account_type, status)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data.get('name'),
                data.get('company_id'),
                data.get('bank_name'),
                data.get('account_number'),
                data.get('balance', 0),
                data.get('initial_balance', 0),
                data.get('account_type'),
                data.get('status', 'active')
            ))
            account_id = cursor.lastrowid
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': account_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/accounts/<int:account_id>', methods=['GET'])
def get_account(account_id):
    """获取单个账户详情"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM accounts WHERE id=%s", (account_id,))
            account = cursor.fetchone()
        conn.close()
        
        if account:
            return jsonify({'success': True, 'data': account})
        else:
            return jsonify({'success': False, 'message': '账户不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/accounts/<int:account_id>', methods=['PUT'])
def update_account(account_id):
    """更新账户信息"""
    try:
        data = request.json
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            sql = """UPDATE accounts SET name=%s, company_id=%s, bank_name=%s, 
                     account_number=%s, balance=%s, account_type=%s, status=%s
                     WHERE id=%s"""
            cursor.execute(sql, (
                data.get('name'),
                data.get('company_id'),
                data.get('bank_name'),
                data.get('account_number'),
                data.get('balance'),
                data.get('account_type'),
                data.get('status'),
                account_id
            ))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/accounts/<int:account_id>', methods=['DELETE'])
def delete_account(account_id):
    """删除账户（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE accounts SET status='inactive' WHERE id=%s", (account_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 公司管理相关接口 ====================

@app.route('/api/companies', methods=['GET'])
def get_companies():
    """获取公司列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM companies WHERE status='active' ORDER BY id")
            companies = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': companies})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/companies', methods=['POST'])
def add_company():
    """添加公司"""
    try:
        data = request.json
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            sql = """INSERT INTO companies (name, short_name, contact_person, contact_phone, 
                     service_start_date, service_fee, service_cycle, status)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data.get('name'),
                data.get('short_name'),
                data.get('contact_person'),
                data.get('contact_phone'),
                data.get('service_start_date'),
                data.get('service_fee'),
                data.get('service_cycle'),
                data.get('status', 'active')
            ))
            company_id = cursor.lastrowid
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': company_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/companies/<int:company_id>', methods=['PUT'])
def update_company(company_id):
    """更新公司信息"""
    try:
        data = request.json
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            sql = """UPDATE companies SET name=%s, short_name=%s, contact_person=%s, 
                     contact_phone=%s, service_start_date=%s, service_fee=%s, 
                     service_cycle=%s, status=%s WHERE id=%s"""
            cursor.execute(sql, (
                data.get('name'),
                data.get('short_name'),
                data.get('contact_person'),
                data.get('contact_phone'),
                data.get('service_start_date'),
                data.get('service_fee'),
                data.get('service_cycle'),
                data.get('status'),
                company_id
            ))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/companies/<int:company_id>', methods=['DELETE'])
def delete_company(company_id):
    """删除公司（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE companies SET status='inactive' WHERE id=%s", (company_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 分类管理相关接口 ====================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """获取分类列表"""
    try:
        category_type = request.args.get('type', '')  # income/expense
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if category_type:
                cursor.execute("SELECT * FROM transaction_categories WHERE type=%s AND status='active' ORDER BY sort_order", (category_type,))
            else:
                cursor.execute("SELECT * FROM transaction_categories WHERE status='active' ORDER BY type, sort_order")
            categories = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': categories})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/categories', methods=['POST'])
def add_category():
    """添加分类"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "INSERT INTO transaction_categories (name, type, parent_id, description, sort_order, status) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(sql, (data.get('name'), data.get('type'), data.get('parent_id'), data.get('description'), data.get('sort_order', 0), data.get('status', 'active')))
            category_id = cursor.lastrowid
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': category_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 服务商品管理相关接口 ====================

@app.route('/api/services', methods=['GET'])
def get_services():
    """获取服务列表 - ✅ 多租户隔离 + item_type过滤"""
    try:
        company_id = session.get('company_id', 1)
        item_type = request.args.get('type', '')  # 支持按类型过滤: product/service/package
        
        app.logger.debug(f"[API /api/services] 查询参数: company_id={company_id}, item_type='{item_type}'")
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if item_type:
                # 指定类型过滤
                cursor.execute(
                    "SELECT * FROM services WHERE company_id=%s AND status='active' AND item_type=%s ORDER BY id",
                    (company_id, item_type)
                )
            else:
                # 返回所有类型
                cursor.execute(
                    "SELECT * FROM services WHERE company_id=%s AND status='active' ORDER BY id",
                    (company_id,)
                )
            services = cursor.fetchall()
            
            app.logger.debug(f"[API] 查询services结果: {len(services)}条记录")
            if len(services) == 0 and item_type:
                # 检查是否有数据但item_type不匹配
                cursor.execute("SELECT id, name, item_type, status FROM services WHERE company_id=%s LIMIT 5", (company_id,))
                sample = cursor.fetchall()
                print(f"⚠️ [调试] 该公司所有服务样本: {sample}")
        conn.close()
        
        # ✅ 修复: 转换Decimal字段为float,避免前端收到字符串
        price_fields = ['price', 'internal_price', 'cost_price', 'supply_price', 
                       'retail_price', 'wholesale_price', 'agent_price']
        for service in services:
            for field in price_fields:
                if field in service and service[field] is not None:
                    service[field] = float(service[field])
        
        return jsonify({'success': True, 'data': services})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services', methods=['POST'])
def add_service():
    """新增服务/商品/服务包（完整字段支持）"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 构建字段列表
            fields = ['name', 'type', 'category', 'description', 'status']
            values = [
                data.get('name'),
                data.get('type', 'service'),
                data.get('category'),
                data.get('description'),
                data.get('status', 'active')
            ]
            
            # 可选字段
            optional_fields = {
                'code': data.get('code'),
                'item_type': data.get('item_type', 'service'),
                'team_id': data.get('team_id'),
                'unit': data.get('unit', '次'),
                'price': data.get('price', 0),
                'internal_price': data.get('internal_price', 0),
                'cost_price': data.get('cost_price', 0),
                'supply_price': data.get('supply_price', 0),
                'operation_cost': data.get('operation_cost', 0),
                'retail_price': data.get('retail_price', 0),
                'wholesale_price': data.get('wholesale_price', 0),
                'agent_price': data.get('agent_price', 0),
                'stock': data.get('stock'),
                'min_stock': data.get('min_stock'),
                'package_items': json.dumps(data.get('package_items')) if data.get('package_items') else None
            }
            
            for field, value in optional_fields.items():
                if value is not None:
                    fields.append(field)
                    values.append(value)
            
            sql = f"INSERT INTO services ({', '.join(fields)}) VALUES ({', '.join(['%s'] * len(fields))})"
            cursor.execute(sql, values)
            service_id = cursor.lastrowid
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': service_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services/<int:service_id>', methods=['PUT'])
def update_service(service_id):
    """更新服务/商品/服务包（P2优化：自动记录价格历史）"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # P2-5: 先查询当前价格和成本价，用于价格历史记录
            cursor.execute("SELECT price, cost_price FROM services WHERE id=%s", (service_id,))
            old_service = cursor.fetchone()
            old_price = old_service['price'] if old_service else None
            old_cost_price = old_service['cost_price'] if old_service else None
            
            update_fields = []
            params = []
            
            # 字段映射
            field_mapping = {
                'name': 'name', 'code': 'code', 'type': 'type', 'item_type': 'item_type',
                'category': 'category', 'team_id': 'team_id', 'unit': 'unit',
                'description': 'description', 'status': 'status',
                'price': 'price', 'internal_price': 'internal_price',
                'cost_price': 'cost_price', 'supply_price': 'supply_price',
                'operation_cost': 'operation_cost', 'retail_price': 'retail_price',
                'wholesale_price': 'wholesale_price', 'agent_price': 'agent_price',
                'stock': 'stock', 'min_stock': 'min_stock'
            }
            
            for key, field in field_mapping.items():
                if key in data:
                    update_fields.append(f'{field}=%s')
                    params.append(data[key])
            
            # 特殊JSON字段
            if 'package_items' in data:
                update_fields.append('package_items=%s')
                params.append(json.dumps(data['package_items']) if data['package_items'] else None)
            
            if not update_fields:
                return jsonify({'success': False, 'message': '没有要更新的字段'})
            
            params.append(service_id)
            sql = f"UPDATE services SET {', '.join(update_fields)} WHERE id=%s"
            cursor.execute(sql, params)
            
            # P2-5: 如果价格或成本价发生变更，记录到价格历史表
            new_price = data.get('price')
            new_cost_price = data.get('cost_price')
            price_changed = new_price is not None and str(old_price) != str(new_price)
            cost_changed = new_cost_price is not None and str(old_cost_price) != str(new_cost_price)
            
            if price_changed or cost_changed:
                from datetime import date
                history_sql = """
                    INSERT INTO service_price_history 
                    (service_id, old_price, new_price, old_cost_price, new_cost_price, 
                     effective_date, change_reason, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(history_sql, (
                    service_id,
                    old_price,
                    new_price if price_changed else old_price,
                    old_cost_price,
                    new_cost_price if cost_changed else old_cost_price,
                    data.get('effective_date', date.today()),
                    data.get('change_reason', '价格调整'),
                    data.get('updated_by', 1)
                ))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services/<int:service_id>', methods=['DELETE'])
def delete_service(service_id):
    """删除服务/商品/服务包（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE services SET status='deleted' WHERE id=%s", (service_id,))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services/<int:service_id>/price-history', methods=['GET'])
def get_service_price_history(service_id):
    """P4-3-4: 获取服务项价格历史记录"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """
                SELECT h.*, u.name as operator_name
                FROM service_price_history h
                LEFT JOIN users u ON h.created_by = u.id
                WHERE h.service_id = %s
                ORDER BY h.created_at DESC
            """
            cursor.execute(sql, (service_id,))
            history = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': history})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services/recycle', methods=['GET'])
def get_recycle_services():
    """获取回收站中的商品/服务（status='deleted'）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM services WHERE status='deleted' ORDER BY id DESC")
            services = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': services})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services/<int:service_id>/restore', methods=['PUT'])
def restore_service(service_id):
    """恢复商品/服务（status改为active）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE services SET status='active' WHERE id=%s", (service_id,))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services/<int:service_id>/permanent', methods=['DELETE'])
def permanent_delete_service(service_id):
    """永久删除商品/服务（真正删除数据）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM services WHERE id=%s", (service_id,))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 库存管理相关接口 ====================

def generate_stock_doc_number(doc_type):
    """生成库存单据编号"""
    prefix_map = {
        'in': 'RK',    # 入库
        'out': 'CK',   # 出库
        'check': 'PD', # 盘点
        'loss': 'BS'   # 报损
    }
    prefix = prefix_map.get(doc_type, 'ST')
    from datetime import datetime
    return f"{prefix}{datetime.now().strftime('%Y%m%d%H%M%S')}"

@app.route('/api/stock/documents', methods=['GET'])
def get_stock_documents():
    """获取库存单据列表 - 多租户隔离"""
    try:
        company_id = session.get('company_id', 1)
        doc_type = request.args.get('doc_type', '')
        status = request.args.get('status', '')
        product_id = request.args.get('product_id', '')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """
                SELECT d.*, s.name as product_name, s.code as product_code,
                       u1.name as operator_name, u2.name as confirmed_by_name
                FROM stock_documents d
                LEFT JOIN services s ON d.product_id = s.id
                LEFT JOIN users u1 ON d.operator_id = u1.id
                LEFT JOIN users u2 ON d.confirmed_by = u2.id
                WHERE d.company_id = %s
            """
            params = [company_id]
            
            if doc_type:
                sql += " AND d.doc_type = %s"
                params.append(doc_type)
            if status:
                sql += " AND d.status = %s"
                params.append(status)
            if product_id:
                sql += " AND d.product_id = %s"
                params.append(product_id)
            
            sql += " ORDER BY d.created_at DESC"
            cursor.execute(sql, params)
            documents = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': documents})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/stock/documents', methods=['POST'])
def create_stock_document():
    """创建库存单据（入库/出库/盘点/报损）"""
    try:
        data = request.json
        company_id = session.get('company_id', 1)
        user_id = session.get('user_id', 1)
        
        doc_type = data.get('doc_type')
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 0))
        unit_price = float(data.get('unit_price', 0))
        reason = data.get('reason', '')
        related_purchase_id = data.get('related_purchase_id')
        
        if not doc_type or not product_id:
            return jsonify({'success': False, 'message': '单据类型和商品ID必填'})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 获取商品当前库存
            cursor.execute("SELECT stock FROM services WHERE id=%s", (product_id,))
            product = cursor.fetchone()
            before_stock = int(product['stock'] or 0) if product else 0
            
            # 生成单据编号
            doc_number = generate_stock_doc_number(doc_type)
            
            sql = """
                INSERT INTO stock_documents 
                (doc_number, doc_type, product_id, quantity, before_stock, unit_price, 
                 total_amount, reason, status, related_purchase_id, operator_id, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'draft', %s, %s, %s)
            """
            cursor.execute(sql, (
                doc_number, doc_type, product_id, quantity, before_stock, unit_price,
                quantity * unit_price, reason, related_purchase_id, user_id, company_id
            ))
            doc_id = cursor.lastrowid
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': doc_id, 'doc_number': doc_number})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# 【P0-4修复】单据操作权限校验函数
def check_document_permission(cursor, doc_operator_id, user_id, company_id):
    """校验用户是否有权操作单据
    1. 管理员(role='admin') → 允许
    2. 单据创建人 → 允许
    3. 创建人所属团队负责人 → 允许
    4. 其他 → 拒绝
    """
    # 查询当前用户信息
    cursor.execute("SELECT id, role, team_id, is_team_leader FROM users WHERE id=%s AND company_id=%s", (user_id, company_id))
    user = cursor.fetchone()
    if not user:
        return False, '用户不存在'
    
    # 1. 管理员允许
    if user.get('role') == 'admin':
        return True, None
    
    # 2. 单据创建人允许
    if doc_operator_id == user_id:
        return True, None
    
    # 3. 检查是否为创建人的团队负责人
    if user.get('is_team_leader'):
        cursor.execute("SELECT team_id FROM users WHERE id=%s", (doc_operator_id,))
        creator = cursor.fetchone()
        if creator and creator.get('team_id') == user.get('team_id'):
            return True, None
    
    return False, '无操作权限，仅单据创建人、团队负责人或管理员可操作'

@app.route('/api/stock/documents/<int:doc_id>/confirm', methods=['PUT'])
def confirm_stock_document(doc_id):
    """确认库存单据（此时真正变更库存）"""
    try:
        user_id = session.get('user_id', 1)
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 获取单据信息
            cursor.execute("SELECT * FROM stock_documents WHERE id=%s AND company_id=%s", (doc_id, company_id))
            doc = cursor.fetchone()
            
            if not doc:
                return jsonify({'success': False, 'message': '单据不存在或无权访问'})
            if doc['status'] != 'draft':
                return jsonify({'success': False, 'message': '只能确认草稿状态的单据'})
            
            # 【P0-4修复】权限校验
            has_perm, err_msg = check_document_permission(cursor, doc['operator_id'], user_id, company_id)
            if not has_perm:
                return jsonify({'success': False, 'message': err_msg})
            
            # 计算库存变更
            product_id = doc['product_id']
            quantity = doc['quantity']
            doc_type = doc['doc_type']
            reason = doc.get('reason', '')
            
            # 【P1-5修复】获取force参数
            data = request.json or {}
            force = data.get('force', False)
            
            # 获取当前库存
            cursor.execute("SELECT stock FROM services WHERE id=%s", (product_id,))
            product = cursor.fetchone()
            current_stock = int(product['stock'] or 0)
            
            # 【P1-5修复】库存不足校验
            if doc_type in ('out', 'loss') and current_stock < quantity:
                if not force:
                    return jsonify({
                        'success': False, 
                        'message': f'库存不足（当前库存：{current_stock}），无法出库',
                        'insufficient_stock': True,
                        'current_stock': current_stock
                    })
            
            # 根据单据类型计算新库存
            if doc_type == 'in':  # 入库
                new_stock = current_stock + quantity
            elif doc_type == 'out':  # 出库
                if force:
                    new_stock = current_stock - quantity  # 强制出库允许负库存
                else:
                    new_stock = max(0, current_stock - quantity)
            elif doc_type == 'check':  # 盘点
                new_stock = quantity  # 盘点后库存直接设为盘点数量
            elif doc_type == 'loss':  # 报损
                if force:
                    new_stock = current_stock - quantity  # 强制报损允许负库存
                else:
                    new_stock = max(0, current_stock - quantity)
            else:
                new_stock = current_stock
            
            # 【P1-5修复】如果是强制出库，追加备注
            if force and doc_type in ('out', 'loss') and current_stock < quantity:
                new_reason = reason + '（强制出库，库存不足）' if reason else '强制出库（库存不足）'
                cursor.execute("UPDATE stock_documents SET reason=%s WHERE id=%s", (new_reason, doc_id))
            
            # 【P2-9修复】盘点差异自动生成单据
            diff_doc_id = None
            if doc_type == 'check':
                book_stock = current_stock  # 账面库存
                actual_stock = quantity     # 实际盘点库存
                diff = actual_stock - book_stock
                
                if diff != 0:
                    # 生成差异单据
                    if diff > 0:
                        # 盘盈：自动创建入库单据
                        diff_doc_type = 'in'
                        diff_reason = f'盘点盘盈（差异：+{diff}）- 关联盘点单#{doc_id}'
                    else:
                        # 盘亏：自动创建出库单据
                        diff_doc_type = 'out'
                        diff_reason = f'盘点盘亏（差异：{diff}）- 关联盘点单#{doc_id}'
                    
                    diff_quantity = abs(diff)
                    diff_doc_number = generate_stock_doc_number(diff_doc_type)
                    
                    cursor.execute("""
                        INSERT INTO stock_documents 
                        (doc_number, doc_type, product_id, quantity, before_stock, after_stock,
                         reason, status, related_check_doc_id, operator_id, confirmed_by, confirmed_at, company_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 'confirmed', %s, %s, %s, NOW(), %s)
                    """, (
                        diff_doc_number, diff_doc_type, product_id, diff_quantity,
                        book_stock, actual_stock, diff_reason, doc_id, user_id, user_id, company_id
                    ))
                    diff_doc_id = cursor.lastrowid
            
            # 更新商品库存
            cursor.execute("UPDATE services SET stock=%s WHERE id=%s", (new_stock, product_id))
            
            # 更新单据状态
            from datetime import datetime
            cursor.execute("""
                UPDATE stock_documents 
                SET status='confirmed', after_stock=%s, confirmed_by=%s, confirmed_at=%s
                WHERE id=%s
            """, (new_stock, user_id, datetime.now(), doc_id))
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'new_stock': new_stock, 'diff_doc_id': diff_doc_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/stock/documents/<int:doc_id>', methods=['DELETE'])
def cancel_stock_document(doc_id):
    """取消库存单据"""
    try:
        user_id = session.get('user_id', 1)
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM stock_documents WHERE id=%s AND company_id=%s", (doc_id, company_id))
            doc = cursor.fetchone()
            
            if not doc:
                return jsonify({'success': False, 'message': '单据不存在或无权访问'})
            if doc['status'] == 'confirmed':
                return jsonify({'success': False, 'message': '已确认的单据不能取消'})
            
            # 【P0-4修复】权限校验
            has_perm, err_msg = check_document_permission(cursor, doc['operator_id'], user_id, company_id)
            if not has_perm:
                return jsonify({'success': False, 'message': err_msg})
            
            cursor.execute("UPDATE stock_documents SET status='cancelled' WHERE id=%s", (doc_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/stock/warnings', methods=['GET'])
def get_stock_warnings():
    """获取库存预警商品列表 - 多租户隔离"""
    try:
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """
                SELECT id, name, code, category, stock, min_stock
                FROM services 
                WHERE company_id = %s 
                  AND item_type = 'product' 
                  AND status = 'active'
                  AND stock <= COALESCE(min_stock, 10)
                ORDER BY stock ASC
            """
            cursor.execute(sql, (company_id,))
            products = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': products})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 采购管理扩展接口 ====================

@app.route('/api/purchases/<int:purchase_id>/items', methods=['GET'])
def get_purchase_items(purchase_id):
    """获取采购单明细"""
    try:
        # 【P0-3修复】添加多租户隔离
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 先验证采购单属于当前公司
            cursor.execute("SELECT id FROM purchases WHERE id=%s AND company_id=%s", (purchase_id, company_id))
            purchase = cursor.fetchone()
            if not purchase:
                return jsonify({'success': False, 'message': '采购单不存在或无权访问'})
            
            sql = """
                SELECT pi.*, s.name as product_name, s.code as product_code
                FROM purchase_items pi
                LEFT JOIN services s ON pi.product_id = s.id
                WHERE pi.purchase_id = %s
                ORDER BY pi.id
            """
            cursor.execute(sql, (purchase_id,))
            items = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': items})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/purchases/<int:purchase_id>/receive', methods=['PUT'])
def receive_purchase(purchase_id):
    """采购入库（关联库存单据）"""
    try:
        data = request.json
        items = data.get('items', [])  # [{product_id, quantity, unit_price}]
        company_id = session.get('company_id', 1)
        user_id = session.get('user_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            for item in items:
                product_id = item.get('product_id')
                quantity = int(item.get('quantity', 0))
                unit_price = float(item.get('unit_price', 0))
                
                if quantity <= 0:
                    continue
                
                # 获取当前库存
                cursor.execute("SELECT stock FROM services WHERE id=%s", (product_id,))
                product = cursor.fetchone()
                before_stock = int(product['stock'] or 0) if product else 0
                
                # 创建入库单据
                doc_number = generate_stock_doc_number('in')
                sql = """
                    INSERT INTO stock_documents 
                    (doc_number, doc_type, product_id, quantity, before_stock, after_stock,
                     unit_price, total_amount, reason, status, related_purchase_id, 
                     operator_id, confirmed_by, confirmed_at, company_id)
                    VALUES (%s, 'in', %s, %s, %s, %s, %s, %s, %s, 'confirmed', %s, %s, %s, NOW(), %s)
                """
                new_stock = before_stock + quantity
                cursor.execute(sql, (
                    doc_number, product_id, quantity, before_stock, new_stock,
                    unit_price, quantity * unit_price, f'采购入库-采购单#{purchase_id}',
                    purchase_id, user_id, user_id, company_id
                ))
                
                # 更新商品库存
                cursor.execute("UPDATE services SET stock=%s WHERE id=%s", (new_stock, product_id))
                
                # 更新采购明细的已入库数量
                cursor.execute("""
                    UPDATE purchase_items 
                    SET received_quantity = received_quantity + %s 
                    WHERE purchase_id=%s AND product_id=%s
                """, (quantity, purchase_id, product_id))
            
            # 更新采购单实际到货时间
            from datetime import datetime
            cursor.execute("""
                UPDATE purchases SET actual_delivery=%s WHERE id=%s
            """, (datetime.now().date(), purchase_id))
            
            # 【P0-2修复】校验采购单是否全部入库完成，自动更新状态
            cursor.execute("""
                SELECT COUNT(*) as total, 
                       SUM(CASE WHEN received_quantity >= quantity THEN 1 ELSE 0 END) as completed
                FROM purchase_items WHERE purchase_id=%s
            """, (purchase_id,))
            status_check = cursor.fetchone()
            
            if status_check and status_check['total'] > 0:
                if status_check['completed'] == status_check['total']:
                    # 所有明细已全部入库，更新采购单状态为“已完成”
                    cursor.execute("""
                        UPDATE purchases SET status='已完成' WHERE id=%s
                    """, (purchase_id,))
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 任务池管理相关接口 ====================

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        status = request.args.get('status', '')
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if status:
                cursor.execute("SELECT * FROM tasks WHERE status=%s ORDER BY created_at DESC", (status,))
            else:
                cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC")
            tasks = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': tasks})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/tasks', methods=['POST'])
def add_task():
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "INSERT INTO tasks (title, description, order_id, publisher_id, status, budget, deadline) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(sql, (data.get('title'), data.get('description'), data.get('order_id'), data.get('publisher_id'), data.get('status', 'pending'), data.get('budget'), data.get('deadline')))
            task_id = cursor.lastrowid
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': task_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/tasks/<int:task_id>/accept', methods=['PUT'])
def accept_task(task_id):
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE tasks SET assignee_id=%s, status='in_progress' WHERE id=%s", (data.get('assignee_id'), task_id))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 进销存管理相关接口 ====================

@app.route('/api/suppliers', methods=['GET'])
def get_suppliers():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM suppliers WHERE status='active' ORDER BY id")
            suppliers = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': suppliers})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/suppliers', methods=['POST'])
def add_supplier():
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "INSERT INTO suppliers (name, contact_person, contact_phone, address, status) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(sql, (data.get('name'), data.get('contact_person'), data.get('contact_phone'), data.get('address'), data.get('status', 'active')))
            supplier_id = cursor.lastrowid
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': supplier_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/suppliers/<int:supplier_id>', methods=['DELETE'])
def delete_supplier(supplier_id):
    """删除供应商（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE suppliers SET status='deleted' WHERE id=%s", (supplier_id,))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/purchases', methods=['GET'])
def get_purchases():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM purchases ORDER BY purchase_date DESC")
            purchases = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': purchases})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/purchases', methods=['POST'])
def add_purchase():
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "INSERT INTO purchases (purchase_number, supplier_id, total_amount, purchase_date, status) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(sql, (data.get('purchase_number'), data.get('supplier_id'), data.get('total_amount'), data.get('purchase_date'), data.get('status', 'pending')))
            purchase_id = cursor.lastrowid
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': purchase_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/purchases/<int:purchase_id>/warehouse', methods=['POST'])
def warehouse_purchase(purchase_id):
    """采购单入库"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 更新采购单状态
            cursor.execute("UPDATE purchases SET status='已入库' WHERE id=%s", (purchase_id,))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 系统设置管理相关接口 ====================

@app.route('/api/system-settings', methods=['GET'])
def get_system_settings():
    """获取所有系统设置"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT setting_key, setting_value FROM system_settings ORDER BY id")
            settings_list = cursor.fetchall()
        conn.close()
        
        # 转换为key-value对象
        settings = {}
        for item in settings_list:
            key = item['setting_key']
            value = item['setting_value']
            # 尝试解析JSON
            try:
                import json
                settings[key] = json.loads(value)
            except:
                settings[key] = value
        
        return jsonify({'success': True, 'data': settings})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/system-settings/<setting_key>', methods=['PUT'])
def update_system_setting(setting_key):
    """更新单个系统设置"""
    try:
        data = request.json
        setting_value = data.get('value')
        
        # 如果是list或dict，转换为JSON字符串
        if isinstance(setting_value, (list, dict)):
            import json
            setting_value = json.dumps(setting_value, ensure_ascii=False)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE system_settings SET setting_value=%s WHERE setting_key=%s", 
                         (setting_value, setting_key))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/system-settings', methods=['POST'])
def add_system_setting():
    """添加系统设置项"""
    try:
        data = request.json
        setting_key = data.get('key')
        setting_value = data.get('value')
        description = data.get('description', '')
        
        # 如果是list或dict，转换为JSON字符串
        if isinstance(setting_value, (list, dict)):
            import json
            setting_value = json.dumps(setting_value, ensure_ascii=False)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "INSERT INTO system_settings (setting_key, setting_value, description) VALUES (%s, %s, %s)"
            cursor.execute(sql, (setting_key, setting_value, description))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 健康检查 ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({'success': True, 'message': 'API is running'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 商品属性模板管理 ====================

@app.route('/api/product-templates', methods=['GET'])
def get_product_templates():
    """获取商品类型模板列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM product_type_templates WHERE is_active=1 ORDER BY sort_order")
            templates = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': templates})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/product-templates/<int:template_id>/fields', methods=['GET'])
def get_template_fields(template_id):
    """获取模板的自定义字段"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM product_custom_fields WHERE template_id=%s ORDER BY sort_order",
                (template_id,)
            )
            fields = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': fields})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services/<int:service_id>/custom-fields', methods=['POST'])
def save_service_custom_fields(service_id):
    """保存商品的自定义字段值（批量）"""
    try:
        data = request.json
        custom_fields = data.get('custom_fields', {})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            for field_id, field_value in custom_fields.items():
                sql = """INSERT INTO product_custom_field_values 
                         (service_id, field_id, field_value) 
                         VALUES (%s, %s, %s)
                         ON DUPLICATE KEY UPDATE field_value=%s"""
                cursor.execute(sql, (service_id, field_id, field_value, field_value))
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/services/<int:service_id>/custom-fields', methods=['GET'])
def get_service_custom_fields(service_id):
    """获取商品的自定义字段值"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """SELECT cfv.field_id, cfv.field_value, cf.field_name, cf.field_label, cf.field_type
                     FROM product_custom_field_values cfv
                     JOIN product_custom_fields cf ON cfv.field_id = cf.id
                     WHERE cfv.service_id = %s"""
            cursor.execute(sql, (service_id,))
            fields = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': fields})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== P1-7: 退款流水专用接口 ====================

@app.route('/api/refunds', methods=['POST'])
@require_permission('transactions', 'refund')
def create_refund():
    """创建退款流水（专用接口，自动设置退款标识）"""
    try:
        data = request.json
        order_id = data.get('order_id')
        refund_amount = data.get('refund_amount')
        refund_type = data.get('refund_type', '全额退款')
        refund_reason = data.get('refund_reason', '')
        account_id = data.get('account_id')
        transaction_date = data.get('transaction_date')
        created_by = data.get('created_by')
        
        if not all([order_id, refund_amount, account_id, transaction_date]):
            return jsonify({'success': False, 'message': '缺少必要参数'})
        
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            # 获取订单信息
            cursor.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
            order = cursor.fetchone()
            if not order:
                return jsonify({'success': False, 'message': '订单不存在'})
            
            # 创建退款流水（金额为负数）
            sql = """INSERT INTO transactions (
                transaction_type, transaction_date, payer_bank, payer_name,
                payee_bank, payee_name, amount, purpose, remark, 
                account_id, company_id, order_id,
                is_refund, refund_type, original_order_id, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            
            cursor.execute(sql, (
                '往账',  # 退款是往账（支出）
                transaction_date,
                '',  # 付款银行
                order['company'],  # 付款方（公司）
                '',  # 收款银行
                '客户',  # 收款方（客户）
                -abs(float(refund_amount)),  # 金额为负数
                f'订单退款 - {refund_type}',
                refund_reason,
                account_id,
                order.get('company_id', 1),
                order_id,
                1,  # is_refund=1
                refund_type,
                order_id,  # original_order_id
                created_by
            ))
            refund_id = cursor.lastrowid
            
            # 重新计算订单的收款状态
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN is_refund=0 THEN amount ELSE 0 END) as total_paid,
                    SUM(CASE WHEN is_refund=1 THEN ABS(amount) ELSE 0 END) as total_refund
                FROM transactions 
                WHERE order_id=%s AND is_void=0
            """, (order_id,))
            payment_stat = cursor.fetchone()
            total_paid = payment_stat['total_paid'] if payment_stat['total_paid'] else 0
            total_refund = payment_stat['total_refund'] if payment_stat['total_refund'] else 0
            net_paid = total_paid - total_refund
            
            contract_amount = order['contract_amount']
            unpaid_amount = contract_amount - net_paid
            
            # 确定订单状态
            if net_paid == 0:
                if total_refund >= contract_amount:
                    order_status = '已退款'
                    payment_status = '未收款'
                else:
                    order_status = order['status']
                    payment_status = '未收款'
            elif net_paid >= contract_amount:
                payment_status = '已收款'
                order_status = order['status']
            else:
                if total_refund > 0:
                    order_status = '部分退款'
                    payment_status = '部分收款'
                else:
                    payment_status = '部分收款'
                    order_status = order['status']
            
            # 更新订单状态
            cursor.execute("""
                UPDATE orders 
                SET paid_amount=%s, unpaid_amount=%s, payment_status=%s, status=%s
                WHERE id=%s
            """, (net_paid, unpaid_amount, payment_status, order_status, order_id))
            
            conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'id': refund_id,
            'message': f'退款成功，退款金额：¥{abs(float(refund_amount))}'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/refunds', methods=['GET'])
def get_order_refunds(order_id):
    """获取订单的所有退款记录"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT t.*, u.name as operator_name
                FROM transactions t
                LEFT JOIN users u ON t.created_by = u.id
                WHERE t.order_id=%s AND t.is_refund=1 AND t.is_void=0
                ORDER BY t.transaction_date DESC
            """, (order_id,))
            refunds = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': refunds})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== P2-2: 订单收款API ====================

@app.route('/api/payments', methods=['POST'])
@require_permission('orders', 'payment')
def create_payment():
    """创建订单收款记录"""
    try:
        data = request.json
        order_id = data.get('order_id')
        payment_amount = data.get('payment_amount')
        payment_date = data.get('payment_date')
        payment_method = data.get('payment_method', '银行转账')
        account_id = data.get('account_id')
        remark = data.get('remark', '')
        created_by = data.get('created_by')
        
        if not all([order_id, payment_amount, payment_date, account_id]):
            return jsonify({'success': False, 'message': '缺少必要参数'})
        
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            # 获取订单信息
            cursor.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
            order = cursor.fetchone()
            if not order:
                return jsonify({'success': False, 'message': '订单不存在'})
            
            # 创建收款流水（来账）
            sql = """INSERT INTO transactions (
                transaction_type, transaction_date, payer_bank, payer_name,
                payee_bank, payee_name, amount, purpose, remark,
                account_id, company_id, order_id, created_by, is_refund
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            
            cursor.execute(sql, (
                '来账',  # 收款是来账（收入）
                payment_date,
                '',  # 付款银行
                '客户',  # 付款方（客户）
                '',  # 收款银行
                order.get('company', '我司'),  # 收款方（公司）
                abs(float(payment_amount)),  # 金额为正数
                f'订单收款 - {payment_method}',
                remark,
                account_id,
                order.get('company_id', 1),  # company_id
                order_id,
                created_by,
                0  # is_refund=0（非退款）
            ))
            payment_id = cursor.lastrowid
            
            # 重新计算订单的收款状态
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN is_refund=0 THEN amount ELSE 0 END) as total_paid,
                    SUM(CASE WHEN is_refund=1 THEN ABS(amount) ELSE 0 END) as total_refund
                FROM transactions 
                WHERE order_id=%s AND is_void=0
            """, (order_id,))
            payment_result = cursor.fetchone()
            total_paid = float(payment_result['total_paid'] or 0)
            total_refund = float(payment_result['total_refund'] or 0)
            net_paid = total_paid - total_refund
            contract_amount = float(order['contract_amount'] or 0)
            unpaid_amount = contract_amount - net_paid
            
            # 判断收款状态
            if net_paid <= 0:
                payment_status = '未收款'
                order_status = order['status']
            elif net_paid >= contract_amount:
                payment_status = '已收款'
                order_status = '已收款'
            else:
                payment_status = '部分收款'
                order_status = order['status']
            
            # 更新订单状态
            cursor.execute("""
                UPDATE orders 
                SET paid_amount=%s, unpaid_amount=%s, payment_status=%s, status=%s
                WHERE id=%s
            """, (net_paid, unpaid_amount, payment_status, order_status, order_id))
            
            conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'id': payment_id,
            'message': f'收款成功，收款金额：¥{abs(float(payment_amount))}'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/payments', methods=['GET'])
def get_order_payments(order_id):
    """获取订单的所有收款记录"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT t.*, u.name as operator_name
                FROM transactions t
                LEFT JOIN users u ON t.created_by = u.id
                WHERE t.order_id=%s AND t.is_refund=0 AND t.is_void=0
                ORDER BY t.transaction_date DESC
            """, (order_id,))
            payments = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': payments})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== P2-3: 售后登记API ====================

@app.route('/api/aftersales', methods=['POST'])
@require_permission('orders', 'aftersales')
def create_aftersales():
    """创建售后服务记录"""
    try:
        data = request.json
        order_id = data.get('order_id')
        aftersales_type = data.get('aftersales_type')
        aftersales_amount = data.get('aftersales_amount', 0)
        account_id = data.get('account_id')
        content = data.get('content', '')
        created_by = data.get('created_by')
        
        if not all([order_id, aftersales_type]):
            return jsonify({'success': False, 'message': '缺少必要参数'})
        
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            # 检查订单是否存在
            cursor.execute("SELECT id FROM orders WHERE id=%s", (order_id,))
            if not cursor.fetchone():
                return jsonify({'success': False, 'message': '订单不存在'})
            
            # 插入售后记录
            sql = """INSERT INTO order_aftersales (
                order_id, aftersales_type, aftersales_amount, account_id, content, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s)"""
            
            cursor.execute(sql, (
                order_id,
                aftersales_type,
                aftersales_amount,
                account_id,
                content,
                created_by
            ))
            aftersales_id = cursor.lastrowid
            
            # 如果是退款申请且有退款金额，可以选择性创建退款流水
            # 这里暂时只记录售后，不自动创建退款流水
            # 退款流水由用户在退款API中手动创建
            
            conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'id': aftersales_id,
            'message': '售后记录创建成功'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/aftersales', methods=['GET'])
def get_order_aftersales(order_id):
    """获取订单的所有售后记录"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT a.*, u.name as operator_name
                FROM order_aftersales a
                LEFT JOIN users u ON a.created_by = u.id
                WHERE a.order_id=%s
                ORDER BY a.created_at DESC
            """, (order_id,))
            aftersales = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': aftersales})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== P2优化：库存管理API ====================

@app.route('/api/inventory/in', methods=['POST'])
@require_permission('inventory', 'purchase')
def inventory_in():
    """库存入库（采购入库）"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 查询当前库存
            cursor.execute("SELECT stock FROM services WHERE id=%s", (data['material_id'],))
            material = cursor.fetchone()
            stock_before = material['stock'] if material and material['stock'] else 0
            stock_after = stock_before + data['quantity']
            
            # 插入库存流水
            cursor.execute("""
                INSERT INTO inventory_transactions 
                (material_id, transaction_type, quantity, unit_price, total_amount,
                 stock_before, stock_after, related_type, related_id, remark, operator_id, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data['material_id'], '入库', data['quantity'],
                data.get('unit_price'), data.get('total_amount'),
                stock_before, stock_after,
                data.get('related_type', '采购'), data.get('related_id'),
                data.get('remark'), data.get('operator_id', 1), data.get('company_id', 1)
            ))
            
            # 更新services表库存
            cursor.execute("UPDATE services SET stock=%s WHERE id=%s", (stock_after, data['material_id']))
            conn.commit()
            
        conn.close()
        return jsonify({'success': True, 'stock_after': stock_after})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/inventory/out', methods=['POST'])
@require_permission('inventory', 'dispatch')
def inventory_out():
    """库存出库（任务出库）"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 查询当前库存
            cursor.execute("SELECT stock FROM services WHERE id=%s", (data['material_id'],))
            material = cursor.fetchone()
            stock_before = material['stock'] if material and material['stock'] else 0
            
            # 库存不足检查
            if stock_before < data['quantity']:
                return jsonify({'success': False, 'message': f'库存不足，当前库存：{stock_before}'})
            
            stock_after = stock_before - data['quantity']
            
            # 插入库存流水（出库数量为负数）
            cursor.execute("""
                INSERT INTO inventory_transactions 
                (material_id, transaction_type, quantity, unit_price, total_amount,
                 stock_before, stock_after, related_type, related_id, remark, operator_id, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data['material_id'], '出库', -data['quantity'],
                data.get('unit_price'), data.get('total_amount'),
                stock_before, stock_after,
                data.get('related_type', '任务'), data.get('related_id'),
                data.get('remark'), data.get('operator_id', 1), data.get('company_id', 1)
            ))
            
            # 更新services表库存
            cursor.execute("UPDATE services SET stock=%s WHERE id=%s", (stock_after, data['material_id']))
            conn.commit()
            
        conn.close()
        return jsonify({'success': True, 'stock_after': stock_after})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/inventory/adjust', methods=['POST'])
@require_permission('inventory', 'adjust')
def inventory_adjust():
    """库存盘点调整"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 查询当前库存
            cursor.execute("SELECT stock FROM services WHERE id=%s", (data['material_id'],))
            material = cursor.fetchone()
            stock_before = material['stock'] if material and material['stock'] else 0
            stock_after = data['stock_after']
            quantity_diff = stock_after - stock_before
            
            # 插入库存流水
            cursor.execute("""
                INSERT INTO inventory_transactions 
                (material_id, transaction_type, quantity, stock_before, stock_after,
                 related_type, remark, operator_id, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data['material_id'], '盘点', quantity_diff,
                stock_before, stock_after, '盘点',
                data.get('remark'), data.get('operator_id', 1), data.get('company_id', 1)
            ))
            
            # 更新services表库存
            cursor.execute("UPDATE services SET stock=%s WHERE id=%s", (stock_after, data['material_id']))
            conn.commit()
            
        conn.close()
        return jsonify({'success': True, 'stock_before': stock_before, 'stock_after': stock_after})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/inventory/transactions', methods=['GET'])
def get_inventory_transactions():
    """查询库存流水"""
    try:
        material_id = request.args.get('material_id')
        transaction_type = request.args.get('transaction_type')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """
                SELECT it.*, s.name as material_name, u.name as operator_name
                FROM inventory_transactions it
                LEFT JOIN services s ON it.material_id = s.id
                LEFT JOIN users u ON it.operator_id = u.id
                WHERE 1=1
            """
            params = []
            
            if material_id:
                sql += " AND it.material_id=%s"
                params.append(material_id)
            
            if transaction_type:
                sql += " AND it.transaction_type=%s"
                params.append(transaction_type)
            
            if start_date:
                sql += " AND it.operated_at >= %s"
                params.append(start_date)
            
            if end_date:
                sql += " AND it.operated_at <= %s"
                params.append(end_date)
            
            sql += " ORDER BY it.operated_at DESC LIMIT 100"
            cursor.execute(sql, params)
            transactions = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': transactions})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== P2补充：任务成本管理API ====================

@app.route('/api/tasks/<int:task_id>/costs', methods=['POST'])
@require_permission('costs', 'create')
def add_task_cost(task_id):
    """添加任务成本（自动记录变更日志）"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 插入成本记录
            cursor.execute("""
                INSERT INTO task_costs 
                (task_id, category_id, amount, remark, created_by)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                task_id,
                data.get('category_id'),
                data.get('amount'),
                data.get('remark'),
                data.get('created_by', 1)
            ))
            cost_id = cursor.lastrowid
            
            # 记录到变更日志表
            cursor.execute("""
                INSERT INTO cost_change_logs 
                (task_id, cost_id, change_type, new_amount, new_category_id, 
                 new_remark, change_reason, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                task_id, cost_id, '新增',
                data.get('amount'), data.get('category_id'),
                data.get('remark'), '添加任务成本',
                data.get('created_by', 1)
            ))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': cost_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/tasks/<int:task_id>/costs', methods=['GET'])
def get_task_costs(task_id):
    """获取任务成本列表（含成本类别名称）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT tc.*, cc.name as category_name, u.name as creator_name
                FROM task_costs tc
                LEFT JOIN cost_categories cc ON tc.category_id = cc.id
                LEFT JOIN users u ON tc.created_by = u.id
                WHERE tc.task_id = %s
                ORDER BY tc.created_at DESC
            """, (task_id,))
            costs = cursor.fetchall()
            
            # 计算总成本
            cursor.execute("""
                SELECT SUM(amount) as total FROM task_costs WHERE task_id=%s
            """, (task_id,))
            result = cursor.fetchone()
            total = result['total'] if result and result['total'] else 0
            
        conn.close()
        return jsonify({'success': True, 'data': costs, 'total': float(total)})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/tasks/<int:task_id>/costs/<int:cost_id>', methods=['DELETE'])
@require_permission('costs', 'delete')
def delete_task_cost(task_id, cost_id):
    """删除成本记录（记录变更日志）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 查询原成本数据
            cursor.execute("""
                SELECT * FROM task_costs WHERE id=%s AND task_id=%s
            """, (cost_id, task_id))
            old_cost = cursor.fetchone()
            
            if not old_cost:
                return jsonify({'success': False, 'message': '成本记录不存在'})
            
            # 记录删除日志
            cursor.execute("""
                INSERT INTO cost_change_logs 
                (task_id, cost_id, change_type, old_amount, old_category_id, 
                 old_remark, change_reason, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                task_id, cost_id, '删除',
                old_cost['amount'], old_cost['category_id'],
                old_cost['remark'], '删除任务成本', 1
            ))
            
            # 删除成本记录
            cursor.execute("DELETE FROM task_costs WHERE id=%s", (cost_id,))
            conn.commit()
            
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/tasks/<int:task_id>/costs/<int:cost_id>', methods=['PUT'])
@require_permission('costs', 'update')
def update_task_cost(task_id, cost_id):
    """修改成本记录（记录变更日志）"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 查询原成本数据
            cursor.execute("""
                SELECT * FROM task_costs WHERE id=%s AND task_id=%s
            """, (cost_id, task_id))
            old_cost = cursor.fetchone()
            
            if not old_cost:
                return jsonify({'success': False, 'message': '成本记录不存在'})
            
            # 更新成本记录
            cursor.execute("""
                UPDATE task_costs 
                SET category_id=%s, amount=%s, remark=%s, updated_by=%s
                WHERE id=%s
            """, (
                data.get('category_id', old_cost['category_id']),
                data.get('amount', old_cost['amount']),
                data.get('remark', old_cost['remark']),
                data.get('updated_by', 1),
                cost_id
            ))
            
            # 记录变更日志
            cursor.execute("""
                INSERT INTO cost_change_logs 
                (task_id, cost_id, change_type, 
                 old_amount, new_amount, old_category_id, new_category_id,
                 old_remark, new_remark, change_reason, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                task_id, cost_id, '修改',
                old_cost['amount'], data.get('amount', old_cost['amount']),
                old_cost['category_id'], data.get('category_id', old_cost['category_id']),
                old_cost['remark'], data.get('remark', old_cost['remark']),
                data.get('change_reason', '修改任务成本'),
                data.get('updated_by', 1)
            ))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== P4补充：成本变更日志查询API ====================

@app.route('/api/cost-change-logs', methods=['GET'])
def get_cost_change_logs():
    """查询成本变更日志（支持日期筛选）"""
    try:
        task_id = request.args.get('task_id')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """
                SELECT ccl.*, u.name as operator_name, cc.name as old_category_name,
                       cc2.name as new_category_name
                FROM cost_change_logs ccl
                LEFT JOIN users u ON ccl.created_by = u.id
                LEFT JOIN cost_categories cc ON ccl.old_category_id = cc.id
                LEFT JOIN cost_categories cc2 ON ccl.new_category_id = cc2.id
                WHERE 1=1
            """
            params = []
            
            if task_id:
                sql += " AND ccl.task_id=%s"
                params.append(task_id)
            
            if start_date:
                sql += " AND ccl.created_at >= %s"
                params.append(start_date)
            
            if end_date:
                sql += " AND ccl.created_at <= %s"
                params.append(end_date)
            
            sql += " ORDER BY ccl.created_at DESC LIMIT 100"
            cursor.execute(sql, params)
            logs = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': logs})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 任务管理系统API ====================

@app.route('/api/task-pool', methods=['GET'])
def get_task_pool():
    """
    获取任务池列表
    参数:
        view: 视图类型 (available-待领取, my-我的任务, all-全部任务)
        user_id: 当前用户ID
        status: 任务状态筛选
        priority: 优先级筛选
    """
    try:
        view = request.args.get('view', 'available')  # available, my, all
        user_id = request.args.get('user_id')
        status = request.args.get('status', '')
        priority = request.args.get('priority', '')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if view == 'available':
                # 待领取任务:状态为"待接单"且无人分配
                sql = """
                    SELECT tp.*, o.id as order_id, o.customer_name, o.total_amount,
                           COUNT(ta.id) as participant_count
                    FROM task_pool tp
                    LEFT JOIN orders o ON tp.order_id = o.id
                    LEFT JOIN task_assignments ta ON tp.id = ta.task_pool_id AND ta.is_active=1
                    WHERE tp.status='待接单' AND tp.assigned_user_id IS NULL
                """
            elif view == 'my':
                # 我的任务:我作为主责人或协作人参与的任务
                if not user_id:
                    return jsonify({'success': False, 'message': '缺少user_id参数'})
                sql = f"""
                    SELECT DISTINCT tp.*, o.id as order_id, o.customer_name, o.total_amount,
                           ta.role_type, ta.assignment_type,
                           COUNT(ta2.id) as participant_count
                    FROM task_pool tp
                    LEFT JOIN orders o ON tp.order_id = o.id
                    INNER JOIN task_assignments ta ON tp.id = ta.task_pool_id 
                        AND ta.user_id={user_id} AND ta.is_active=1
                    LEFT JOIN task_assignments ta2 ON tp.id = ta2.task_pool_id AND ta2.is_active=1
                    WHERE tp.status NOT IN ('已完成', '已放弃', '已拒绝')
                """
            else:  # all
                # 全部任务
                sql = """
                    SELECT tp.*, o.id as order_id, o.customer_name, o.total_amount,
                           u.name as assigned_user_name,
                           COUNT(ta.id) as participant_count
                    FROM task_pool tp
                    LEFT JOIN orders o ON tp.order_id = o.id
                    LEFT JOIN users u ON tp.assigned_user_id = u.id
                    LEFT JOIN task_assignments ta ON tp.id = ta.task_pool_id AND ta.is_active=1
                    WHERE 1=1
                """
            
            # 添加状态筛选
            if status:
                sql += f" AND tp.status='{status}'"
            
            # 添加优先级筛选
            if priority:
                sql += f" AND tp.priority='{priority}'"
            
            sql += " GROUP BY tp.id ORDER BY tp.priority DESC, tp.created_at DESC"
            
            cursor.execute(sql)
            tasks = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': tasks})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/task-pool/<int:task_id>/claim', methods=['POST'])
def claim_task(task_id):
    """
    服务人员主动领取任务
    参数:
        user_id: 领取人ID
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': '缺少user_id参数'})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 检查任务状态
            cursor.execute("SELECT * FROM task_pool WHERE id=%s", (task_id,))
            task = cursor.fetchone()
            
            if not task:
                return jsonify({'success': False, 'message': '任务不存在'})
            
            if task['status'] != '待接单':
                return jsonify({'success': False, 'message': '任务状态不允许领取'})
            
            # 更新任务池状态
            cursor.execute("""
                UPDATE task_pool 
                SET status='已接单', assigned_user_id=%s, accepted_at=NOW()
                WHERE id=%s
            """, (user_id, task_id))
            
            # 创建任务分配记录(主责人)
            cursor.execute("""
                INSERT INTO task_assignments 
                (task_pool_id, user_id, role_type, assignment_type, assigned_at, accepted_at)
                VALUES (%s, %s, '主责人', '自主领取', NOW(), NOW())
            """, (task_id, user_id))
            
            # 记录操作日志
            cursor.execute("""
                INSERT INTO task_operation_logs 
                (task_pool_id, user_id, operation_type, new_value, remark)
                VALUES (%s, %s, '领取', %s, '服务人员主动领取任务')
            """, (task_id, user_id, f'状态: 待接单 → 已接单'))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '任务领取成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/task-pool/<int:task_id>/assign', methods=['POST'])
def assign_task(task_id):
    """
    业务人员指派任务
    参数:
        user_id: 被指派人ID
        assigned_by: 指派人ID
        role_type: 角色类型(主责人/协作人,默认主责人)
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        assigned_by = data.get('assigned_by')
        role_type = data.get('role_type', '主责人')
        
        if not user_id or not assigned_by:
            return jsonify({'success': False, 'message': '缺少必要参数'})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 检查任务状态
            cursor.execute("SELECT * FROM task_pool WHERE id=%s", (task_id,))
            task = cursor.fetchone()
            
            if not task:
                return jsonify({'success': False, 'message': '任务不存在'})
            
            # 更新任务池状态(如果是待接单状态)
            if task['status'] == '待接单':
                cursor.execute("""
                    UPDATE task_pool 
                    SET status='已接单', assigned_user_id=%s, accepted_at=NOW()
                    WHERE id=%s
                """, (user_id, task_id))
            
            # 创建任务分配记录
            cursor.execute("""
                INSERT INTO task_assignments 
                (task_pool_id, user_id, role_type, assigned_by, assignment_type, assigned_at, accepted_at)
                VALUES (%s, %s, %s, %s, '业务指派', NOW(), NOW())
            """, (task_id, user_id, role_type, assigned_by))
            
            # 记录操作日志
            cursor.execute("""
                INSERT INTO task_operation_logs 
                (task_pool_id, user_id, operation_type, new_value, remark)
                VALUES (%s, %s, '指派', %s, '业务人员指派任务')
            """, (task_id, assigned_by, f'指派给用户{user_id},角色:{role_type}'))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '任务指派成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/task-pool/<int:task_id>/transfer', methods=['POST'])
def transfer_task(task_id):
    """
    任务转交
    参数:
        from_user_id: 转出人ID
        to_user_id: 接收人ID
        transfer_reason: 转交原因
        transfer_note: 转交备注
    """
    try:
        data = request.json
        from_user_id = data.get('from_user_id')
        to_user_id = data.get('to_user_id')
        transfer_reason = data.get('transfer_reason', '')
        transfer_note = data.get('transfer_note', '')
        
        if not from_user_id or not to_user_id:
            return jsonify({'success': False, 'message': '缺少必要参数'})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 检查转出人是否是任务的主责人
            cursor.execute("""
                SELECT * FROM task_assignments 
                WHERE task_pool_id=%s AND user_id=%s AND role_type='主责人' AND is_active=1
            """, (task_id, from_user_id))
            assignment = cursor.fetchone()
            
            if not assignment:
                return jsonify({'success': False, 'message': '只有主责人才能转交任务'})
            
            # 将原主责人标记为无效
            cursor.execute("""
                UPDATE task_assignments SET is_active=0 WHERE id=%s
            """, (assignment['id'],))
            
            # 创建新的任务分配记录(新主责人)
            cursor.execute("""
                INSERT INTO task_assignments 
                (task_pool_id, user_id, role_type, assigned_by, assignment_type, assigned_at, accepted_at)
                VALUES (%s, %s, '主责人', %s, '被转交', NOW(), NOW())
            """, (task_id, to_user_id, from_user_id))
            
            # 更新task_pool的assigned_user_id
            cursor.execute("""
                UPDATE task_pool SET assigned_user_id=%s WHERE id=%s
            """, (to_user_id, task_id))
            
            # 记录转交日志
            cursor.execute("""
                INSERT INTO task_transfer_logs 
                (task_pool_id, from_user_id, to_user_id, transfer_reason, transfer_note, transferred_at, accepted_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """, (task_id, from_user_id, to_user_id, transfer_reason, transfer_note))
            
            # 记录操作日志
            cursor.execute("""
                INSERT INTO task_operation_logs 
                (task_pool_id, user_id, operation_type, old_value, new_value, remark)
                VALUES (%s, %s, '转交', %s, %s, %s)
            """, (task_id, from_user_id, f'原主责人:{from_user_id}', f'新主责人:{to_user_id}', transfer_reason))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '任务转交成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/task-pool/<int:task_id>/collaborators', methods=['POST'])
def add_collaborator(task_id):
    """
    添加协作人
    参数:
        user_id: 协作人ID
        assigned_by: 添加人ID(通常是主责人)
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        assigned_by = data.get('assigned_by')
        
        if not user_id or not assigned_by:
            return jsonify({'success': False, 'message': '缺少必要参数'})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 检查是否已经是参与人
            cursor.execute("""
                SELECT * FROM task_assignments 
                WHERE task_pool_id=%s AND user_id=%s AND is_active=1
            """, (task_id, user_id))
            existing = cursor.fetchone()
            
            if existing:
                return jsonify({'success': False, 'message': '该用户已是任务参与人'})
            
            # 添加协作人
            cursor.execute("""
                INSERT INTO task_assignments 
                (task_pool_id, user_id, role_type, assigned_by, assignment_type, assigned_at, accepted_at)
                VALUES (%s, %s, '协作人', %s, '被邀请', NOW(), NOW())
            """, (task_id, user_id, assigned_by))
            
            # 记录操作日志
            cursor.execute("""
                INSERT INTO task_operation_logs 
                (task_pool_id, user_id, operation_type, new_value, remark)
                VALUES (%s, %s, '添加协作人', %s, '添加任务协作人')
            """, (task_id, assigned_by, f'协作人:{user_id}'))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '协作人添加成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/task-pool/<int:task_id>/abandon', methods=['POST'])
def abandon_task(task_id):
    """
    放弃任务(任务回到待领取状态)
    参数:
        user_id: 放弃人ID
        abandon_reason: 放弃原因
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        abandon_reason = data.get('abandon_reason', '')
        
        if not user_id:
            return jsonify({'success': False, 'message': '缺少user_id参数'})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 检查用户是否是主责人
            cursor.execute("""
                SELECT * FROM task_assignments 
                WHERE task_pool_id=%s AND user_id=%s AND role_type='主责人' AND is_active=1
            """, (task_id, user_id))
            assignment = cursor.fetchone()
            
            if not assignment:
                return jsonify({'success': False, 'message': '只有主责人才能放弃任务'})
            
            # 更新任务状态
            cursor.execute("""
                UPDATE task_pool 
                SET status='待接单', assigned_user_id=NULL, 
                    abandon_reason=%s, abandon_by=%s, abandon_at=NOW()
                WHERE id=%s
            """, (abandon_reason, user_id, task_id))
            
            # 将所有参与人标记为无效
            cursor.execute("""
                UPDATE task_assignments SET is_active=0 WHERE task_pool_id=%s
            """, (task_id,))
            
            # 记录操作日志
            cursor.execute("""
                INSERT INTO task_operation_logs 
                (task_pool_id, user_id, operation_type, old_value, new_value, remark)
                VALUES (%s, %s, '放弃', %s, %s, %s)
            """, (task_id, user_id, '已接单/进行中', '待接单', abandon_reason))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '任务已放弃并回到任务池'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/task-pool/<int:task_id>/status', methods=['PUT'])
def update_task_status(task_id):
    """
    更新任务状态
    参数:
        status: 新状态(进行中/待验收/已完成)
        user_id: 操作人ID
        remark: 备注
    """
    try:
        data = request.json
        status = data.get('status')
        user_id = data.get('user_id')
        remark = data.get('remark', '')
        
        if not status or not user_id:
            return jsonify({'success': False, 'message': '缺少必要参数'})
        
        allowed_statuses = ['进行中', '待验收', '已完成']
        if status not in allowed_statuses:
            return jsonify({'success': False, 'message': f'状态必须是:{",".join(allowed_statuses)}'})
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 获取当前状态
            cursor.execute("SELECT status FROM task_pool WHERE id=%s", (task_id,))
            task = cursor.fetchone()
            if not task:
                return jsonify({'success': False, 'message': '任务不存在'})
            
            old_status = task['status']
            
            # 更新任务状态
            update_sql = "UPDATE task_pool SET status=%s"
            params = [status]
            
            if status == '已完成':
                update_sql += ", completed_at=NOW()"
            
            update_sql += " WHERE id=%s"
            params.append(task_id)
            
            cursor.execute(update_sql, params)
            
            # 记录操作日志
            cursor.execute("""
                INSERT INTO task_operation_logs 
                (task_pool_id, user_id, operation_type, old_value, new_value, remark)
                VALUES (%s, %s, '更新状态', %s, %s, %s)
            """, (task_id, user_id, old_status, status, remark))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '任务状态更新成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/task-pool/<int:task_id>/detail', methods=['GET'])
def get_task_detail(task_id):
    """
    获取任务详情(包含订单信息、参与人、操作历史)
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 获取任务基本信息
            cursor.execute("""
                SELECT tp.*, o.id as order_id, o.customer_name, o.total_amount, o.status as order_status
                FROM task_pool tp
                LEFT JOIN orders o ON tp.order_id = o.id
                WHERE tp.id=%s
            """, (task_id,))
            task = cursor.fetchone()
            
            if not task:
                return jsonify({'success': False, 'message': '任务不存在'})
            
            # 获取参与人列表
            cursor.execute("""
                SELECT ta.*, u.name as user_name, u2.name as assigned_by_name
                FROM task_assignments ta
                LEFT JOIN users u ON ta.user_id = u.id
                LEFT JOIN users u2 ON ta.assigned_by = u2.id
                WHERE ta.task_pool_id=%s AND ta.is_active=1
                ORDER BY FIELD(ta.role_type, '主责人', '协作人')
            """, (task_id,))
            participants = cursor.fetchall()
            
            # 获取操作历史
            cursor.execute("""
                SELECT tol.*, u.name as operator_name
                FROM task_operation_logs tol
                LEFT JOIN users u ON tol.user_id = u.id
                WHERE tol.task_pool_id=%s
                ORDER BY tol.created_at DESC
                LIMIT 50
            """, (task_id,))
            logs = cursor.fetchall()
            
            # 获取转交历史
            cursor.execute("""
                SELECT ttl.*, u1.name as from_user_name, u2.name as to_user_name
                FROM task_transfer_logs ttl
                LEFT JOIN users u1 ON ttl.from_user_id = u1.id
                LEFT JOIN users u2 ON ttl.to_user_id = u2.id
                WHERE ttl.task_pool_id=%s
                ORDER BY ttl.transferred_at DESC
            """, (task_id,))
            transfer_logs = cursor.fetchall()
            
        conn.close()
        return jsonify({
            'success': True,
            'data': {
                'task': task,
                'participants': participants,
                'logs': logs,
                'transfer_logs': transfer_logs
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 订单其他成本管理接口 ====================

# 获取订单的其他成本列表
@app.route('/api/orders/<int:order_id>/other-costs', methods=['GET'])
def get_order_other_costs(order_id):
    """
    获取指定订单的其他成本列表
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor(pymysql.cursors.DictCursor)
        
        # 查询订单其他成本
        query = """
            SELECT id, order_id, cost_name, cost_amount, cost_note, 
                   created_at, updated_at
            FROM order_other_costs
            WHERE order_id = %s
            ORDER BY created_at ASC
        """
        cursor.execute(query, (order_id,))
        costs = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': costs
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# 添加订单其他成本
@app.route('/api/orders/<int:order_id>/other-costs', methods=['POST'])
def add_order_other_cost(order_id):
    """
    为订单添加其他成本
    """
    try:
        data = request.get_json()
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # 插入成本记录
        query = """
            INSERT INTO order_other_costs 
            (order_id, cost_name, cost_amount, cost_note)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(query, (
            order_id,
            data.get('cost_name'),
            data.get('cost_amount', 0),
            data.get('cost_note', '')
        ))
        
        connection.commit()
        cost_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': '其他成本添加成功',
            'data': {'id': cost_id}
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# 更新订单其他成本
@app.route('/api/orders/<int:order_id>/other-costs/<int:cost_id>', methods=['PUT'])
def update_order_other_cost(order_id, cost_id):
    """
    更新订单其他成本
    """
    try:
        data = request.get_json()
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # 更新成本记录
        query = """
            UPDATE order_other_costs
            SET cost_name = %s, cost_amount = %s, cost_note = %s
            WHERE id = %s AND order_id = %s
        """
        cursor.execute(query, (
            data.get('cost_name'),
            data.get('cost_amount', 0),
            data.get('cost_note', ''),
            cost_id,
            order_id
        ))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': '其他成本更新成功'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# 删除订单其他成本
@app.route('/api/orders/<int:order_id>/other-costs/<int:cost_id>', methods=['DELETE'])
def delete_order_other_cost(order_id, cost_id):
    """
    删除订单其他成本
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # 删除成本记录
        query = "DELETE FROM order_other_costs WHERE id = %s AND order_id = %s"
        cursor.execute(query, (cost_id, order_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': '其他成本删除成功'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 订单成本模板与成本管理接口 ====================

@app.route('/api/cost-categories', methods=['GET'])
@require_company
def get_cost_categories(current_company_id=None, current_user_id=None):
    """获取成本类别列表（业务成本设置），用于订单成本勾选模板"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, description, calc_type, default_value, base_field, sort_order, status
                FROM cost_categories 
                WHERE company_id = %s AND (status = 'active' OR status IS NULL)
                ORDER BY sort_order, id
            """, (current_company_id,))
            categories = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': categories})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/cost-categories', methods=['POST'])
@require_company
def create_cost_category(current_company_id=None, current_user_id=None):
    """创建成本类别"""
    try:
        data = request.get_json()
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO cost_categories (name, description, calc_type, default_value, base_field, sort_order, status, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, 'active', %s)
            """, (
                data.get('name'),
                data.get('description', ''),
                data.get('calc_type', 'fixed'),
                data.get('default_value', 0),
                data.get('base_field', 'final_amount'),
                data.get('sort_order', 0),
                current_company_id
            ))
            conn.commit()
            category_id = cursor.lastrowid
        conn.close()
        return jsonify({'success': True, 'data': {'id': category_id}, 'message': '成本类别创建成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/cost-categories/<int:category_id>', methods=['PUT'])
@require_company
def update_cost_category(category_id, current_company_id=None, current_user_id=None):
    """更新成本类别"""
    try:
        data = request.get_json()
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE cost_categories 
                SET name = %s, description = %s, calc_type = %s, default_value = %s, base_field = %s, sort_order = %s
                WHERE id = %s AND company_id = %s
            """, (
                data.get('name'),
                data.get('description', ''),
                data.get('calc_type', 'fixed'),
                data.get('default_value', 0),
                data.get('base_field', 'final_amount'),
                data.get('sort_order', 0),
                category_id,
                current_company_id
            ))
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '成本类别更新成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 订单稳定成本API ====================

@app.route('/api/orders/<int:order_id>/stable-costs', methods=['GET'])
@require_company
def get_order_stable_costs(order_id, current_company_id=None, current_user_id=None):
    """获取订单的稳定成本列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT osc.*, cc.name as category_name, cc.calc_type as template_calc_type
                FROM order_stable_costs osc
                LEFT JOIN cost_categories cc ON osc.category_id = cc.id
                WHERE osc.order_id = %s AND osc.company_id = %s
                ORDER BY osc.id
            """, (order_id, current_company_id))
            costs = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': costs})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/stable-costs', methods=['POST'])
@require_company
def save_order_stable_costs(order_id, current_company_id=None, current_user_id=None):
    """保存订单的稳定成本（批量替换）"""
    try:
        data = request.get_json()
        costs = data.get('costs', [])
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 先删除原有记录
            cursor.execute("DELETE FROM order_stable_costs WHERE order_id = %s AND company_id = %s", 
                          (order_id, current_company_id))
            
            # 插入新记录
            for cost in costs:
                cursor.execute("""
                    INSERT INTO order_stable_costs 
                    (order_id, category_id, calc_type, base_value, rate, amount, is_manual, company_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    order_id,
                    cost.get('category_id'),
                    cost.get('calc_type', 'fixed'),
                    cost.get('base_value', 0),
                    cost.get('rate', 0),
                    cost.get('amount', 0),
                    cost.get('is_manual', 0),
                    current_company_id
                ))
            
            # 更新订单汇总
            total_stable = sum(float(c.get('amount', 0)) for c in costs)
            cursor.execute("UPDATE orders SET stable_cost = %s WHERE id = %s", (total_stable, order_id))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '稳定成本保存成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 订单特殊成本API ====================

@app.route('/api/orders/<int:order_id>/special-costs', methods=['GET'])
@require_company
def get_order_special_costs(order_id, current_company_id=None, current_user_id=None):
    """获取订单的特殊成本列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, order_id, name, amount, remark, created_at
                FROM order_special_costs
                WHERE order_id = %s AND company_id = %s
                ORDER BY id
            """, (order_id, current_company_id))
            costs = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': costs})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/special-costs', methods=['POST'])
@require_company
def save_order_special_costs(order_id, current_company_id=None, current_user_id=None):
    """保存订单的特殊成本（批量替换）"""
    try:
        data = request.get_json()
        costs = data.get('costs', [])
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 先删除原有记录
            cursor.execute("DELETE FROM order_special_costs WHERE order_id = %s AND company_id = %s", 
                          (order_id, current_company_id))
            
            # 插入新记录
            for cost in costs:
                if cost.get('name') and float(cost.get('amount', 0)) > 0:
                    cursor.execute("""
                        INSERT INTO order_special_costs (order_id, name, amount, remark, company_id)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        order_id,
                        cost.get('name'),
                        cost.get('amount', 0),
                        cost.get('remark', ''),
                        current_company_id
                    ))
            
            # 更新订单汇总
            total_special = sum(float(c.get('amount', 0)) for c in costs if c.get('name'))
            cursor.execute("UPDATE orders SET special_cost = %s WHERE id = %s", (total_special, order_id))
            
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '特殊成本保存成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 统计分析API ====================
# 导入统计引擎
from analytics_engine import AnalyticsEngine

# 初始化统计引擎
analytics_engine = AnalyticsEngine(DB_CONFIG)

@app.route('/api/analytics/calculate-monthly', methods=['POST'])
def calculate_monthly_analytics():
    """
    触发月度统计计算
    请求体: {"year": 2026, "month": 2, "company_id": 1}
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    data = request.get_json(silent=True) or {}
    year = data.get('year')
    month = data.get('month')
    company_id = data.get('company_id', 1)
    
    if not year or not month:
        return jsonify({'success': False, 'message': '缺少年份或月份参数'}), 400
    
    try:
        # 记录计算日志
        period_value = f"{year}-{month:02d}"
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO analytics_calculation_log 
                (company_id, calculation_type, period_value, status, start_time)
                VALUES (%s, 'monthly', %s, 'running', NOW())
            """, (company_id, period_value))
            log_id = cursor.lastrowid
            conn.commit()
        conn.close()
        
        # 执行统计计算
        start_time = datetime.now()
        result = analytics_engine.calculate_monthly_summary(company_id, year, month)
        
        # 保存公司整体统计
        analytics_engine.save_analytics_summary(
            'company', company_id, 'month', period_value,
            result['company'].get('start_date', f"{year}-{month:02d}-01"),
            result['company'].get('end_date', f"{year}-{month:02d}-28"),
            result['company'],
            company_id
        )
        
        # 保存团队统计
        for team in result.get('teams', []):
            # 假设team_id使用team名称的哈希值（简化处理）
            team_id = hash(team['team']) % 10000
            analytics_engine.save_analytics_summary(
                'team', team_id, 'month', period_value,
                f"{year}-{month:02d}-01", f"{year}-{month:02d}-28",
                team, company_id
            )
        
        # 保存人员统计
        for staff in result.get('staff', []):
            analytics_engine.save_staff_performance(
                staff['user_id'], 'month', period_value,
                f"{year}-{month:02d}-01", f"{year}-{month:02d}-28",
                staff, company_id
            )
        
        # 更新计算日志
        duration = int((datetime.now() - start_time).total_seconds())
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE analytics_calculation_log
                SET status = 'success', end_time = NOW(), 
                    duration_seconds = %s, records_processed = %s
                WHERE id = %s
            """, (duration, len(result['teams']) + len(result['staff']) + 1, log_id))
            conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'{period_value} 月度统计计算完成',
            'data': {
                'duration_seconds': duration,
                'records_processed': len(result['teams']) + len(result['staff']) + 1
            }
        })
    
    except Exception as e:
        # 更新计算日志为失败
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE analytics_calculation_log
                    SET status = 'failed', end_time = NOW(), error_message = %s
                    WHERE id = %s
                """, (str(e), log_id))
                conn.commit()
            conn.close()
        except:
            pass
        
        return jsonify({'success': False, 'message': f'统计计算失败: {str(e)}'}), 500


@app.route('/api/analytics/summary', methods=['GET'])
def get_analytics_summary():
    """
    查询统计汇总数据 - ✅ 支持自动计算
    参数: dimension_type, dimension_id, period_type, period_value
    示例: /api/analytics/summary?dimension_type=company&dimension_id=1&period_type=month&period_value=2026-02
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    dimension_type = request.args.get('dimension_type', 'company')
    dimension_id = request.args.get('dimension_id', type=int)
    period_type = request.args.get('period_type', 'month')
    period_value = request.args.get('period_value')
    
    # ✅ 从session获取company_id
    company_id = session.get('company_id', 1)
    if dimension_id is None:
        dimension_id = company_id
    
    if not period_value:
        return jsonify({'success': False, 'message': '缺少period_value参数'}), 400
    
    try:
        # ✅ 直接实时计算,不再依赖缓存表
        if dimension_type == 'company':
            year, month = map(int, period_value.split('-'))
            result = analytics_engine.calculate_monthly_summary(company_id, year, month)
            
            if result and result.get('company'):
                data = result['company']
                # 添加额外字段
                data['dimension_type'] = 'company'
                data['dimension_id'] = company_id
                data['period_type'] = 'month'
                data['period_value'] = period_value
                return jsonify({'success': True, 'data': data})
            else:
                return jsonify({'success': True, 'data': None, 'message': '暂无统计数据'})
        else:
            return jsonify({'success': False, 'message': f'不支持的维度类型: {dimension_type}'}), 400
    
    except Exception as e:
        print(f'[Analytics] 统计计算失败: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'计算失败: {str(e)}'}), 500


@app.route('/api/analytics/team-summary', methods=['GET'])
def get_team_analytics_summary():
    """
    查询所有团队的统计数据 - ✅ 支持自动计算
    参数: period_type, period_value
    示例: /api/analytics/team-summary?period_type=month&period_value=2026-02
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    period_type = request.args.get('period_type', 'month')
    period_value = request.args.get('period_value')
    company_id = session.get('company_id', 1)
    
    if not period_value:
        return jsonify({'success': False, 'message': '缺少period_value参数'}), 400
    
    try:
        # ✅ 直接实时计算团队数据
        year, month = map(int, period_value.split('-'))
        result = analytics_engine.calculate_monthly_summary(company_id, year, month)
        
        teams = result.get('teams', []) if result else []
        return jsonify({'success': True, 'data': teams})
    
    except Exception as e:
        print(f'[Analytics] 团队统计计算失败: {e}')
        return jsonify({'success': False, 'message': f'计算失败: {str(e)}'}), 500


@app.route('/api/analytics/staff-performance', methods=['GET'])
def get_staff_performance():
    """
    查询员工绩效数据 - ✅ 支持自动计算 + 角色筛选
    参数: user_id (可选), role (可选: business/operation/service), period_type, period_value
    示例: /api/analytics/staff-performance?period_type=month&period_value=2026-02&role=operation
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    user_id = request.args.get('user_id', type=int)
    role = request.args.get('role', 'business')  # 默认业务人员
    department = request.args.get('department', '')  # 兼容旧参数
    period_type = request.args.get('period_type', 'month')
    period_value = request.args.get('period_value')
    company_id = session.get('company_id', 1)
    
    if not period_value:
        return jsonify({'success': False, 'message': '缺少period_value参数'}), 400
    
    try:
        # ✅ 直接实时计算员工数据
        year, month = map(int, period_value.split('-'))
        result = analytics_engine.calculate_monthly_summary(company_id, year, month)
        
        # 根据角色选择数据源
        if role == 'operation':
            staff_list = result.get('operation_staff', []) if result else []
        elif role == 'service':
            staff_list = result.get('service_staff', []) if result else []
        else:
            staff_list = result.get('staff', []) if result else []
        
        # ✅ 兼容旧的部门筛选参数
        if department:
            staff_list = [s for s in staff_list if s.get('department') == department]
        
        if user_id:
            # 查询单个员工
            staff = next((s for s in staff_list if s.get('user_id') == user_id), None)
            if staff:
                return jsonify({'success': True, 'data': staff})
            else:
                return jsonify({'success': False, 'message': '未找到绩效数据'}), 404
        else:
            # 返回所有员工
            return jsonify({'success': True, 'data': staff_list})
    
    except Exception as e:
        print(f'[Analytics] 员工绩效计算失败: {e}')
        return jsonify({'success': False, 'message': f'计算失败: {str(e)}'}), 500


@app.route('/api/analytics/customer-value', methods=['GET'])
def get_customer_value_analytics():
    """
    查询客户价值分析
    参数: customer_id (可选)
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    customer_id = request.args.get('customer_id', type=int)
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if customer_id:
                # 查询单个客户
                cursor.execute("""
                    SELECT * FROM v_customer_analytics_detail
                    WHERE customer_id = %s
                """, (customer_id,))
                result = cursor.fetchone()
                conn.close()
                
                if result:
                    return jsonify({'success': True, 'data': result})
                else:
                    return jsonify({'success': False, 'message': '未找到客户数据'}), 404
            else:
                # 查询所有客户（TOP 100按LTV排序）
                cursor.execute("""
                    SELECT * FROM v_customer_analytics_detail
                    ORDER BY ltv DESC
                    LIMIT 100
                """)
                results = cursor.fetchall()
                conn.close()
                
                return jsonify({'success': True, 'data': results})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'查询失败: {str(e)}'}), 500


@app.route('/api/analytics/calculate-customer', methods=['POST'])
def calculate_customer_analytics():
    """
    计算客户价值分析
    请求体: {"customer_ids": [1,2,3]} 或 {"all": true}
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    data = request.get_json(silent=True) or {}
    customer_ids = data.get('customer_ids', [])
    calculate_all = data.get('all', False)
    company_id = data.get('company_id', 1)
    
    try:
        conn = get_db_connection()
        
        # 如果需要计算所有客户
        if calculate_all:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM customers")
                customer_ids = [row['id'] for row in cursor.fetchall()]
        
        conn.close()
        
        if not customer_ids:
            return jsonify({'success': False, 'message': '无客户数据'}), 400
        
        # 批量计算客户价值
        success_count = 0
        for cid in customer_ids:
            try:
                result = analytics_engine.calculate_customer_analytics(cid)
                analytics_engine.save_customer_analytics(cid, result, company_id)
                success_count += 1
            except Exception as e:
                print(f"客户 {cid} 计算失败: {e}")
        
        return jsonify({
            'success': True,
            'message': f'成功计算 {success_count}/{len(customer_ids)} 个客户的价值分析'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'计算失败: {str(e)}'}), 500


# ==================== 系统配置管理 ====================

@app.route('/api/system-config', methods=['GET'])
def get_system_config():
    """获取系统配置"""
    try:
        config_keys = request.args.getlist('keys')  # 可指定获取特定配置
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if config_keys:
                placeholders = ','.join(['%s'] * len(config_keys))
                sql = f"SELECT config_key, config_value FROM system_config WHERE config_key IN ({placeholders})"
                cursor.execute(sql, config_keys)
            else:
                cursor.execute("SELECT config_key, config_value FROM system_config")
            
            results = cursor.fetchall()
        conn.close()
        
        # 转换为字典格式
        config_dict = {row['config_key']: row['config_value'] for row in results}
        
        return jsonify({
            'success': True,
            'data': config_dict
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/system-config', methods=['POST'])
def save_system_config():
    """保存系统配置"""
    try:
        data = request.json
        config_updates = data.get('config', {})
        
        if not config_updates:
            return jsonify({'success': False, 'message': '配置数据为空'}), 400
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            for key, value in config_updates.items():
                cursor.execute("""
                    INSERT INTO system_config (config_key, config_value) 
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE config_value=%s, updated_at=CURRENT_TIMESTAMP
                """, (key, value, value))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '配置保存成功'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== 成员邀请API ====================

@app.route('/api/invite/generate', methods=['POST'])
def generate_invite_link():
    """生成成员邀请链接"""
    try:
        # 获取当前用户的公司ID
        company_id = session.get('company_id', 1)
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        data = request.get_json(silent=True) or {}
        # 可选：预设角色
        preset_role_id = data.get('role_id')
        # 可选：有效天数（默认7天）
        expire_days = data.get('expire_days', 7)
        
        import uuid
        import hashlib
        from datetime import datetime, timedelta
        
        # 生成唯一邀请码（使用UUID + 公司ID + 时间戳）
        raw_token = f"{uuid.uuid4()}-{company_id}-{datetime.now().timestamp()}"
        invite_token = hashlib.sha256(raw_token.encode()).hexdigest()[:32]
        
        # 计算过期时间
        expire_at = datetime.now() + timedelta(days=expire_days)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 插入邀请记录
            cursor.execute("""
                INSERT INTO invitations (
                    invite_token, company_id, created_by, preset_role_id, 
                    expire_at, status, created_at
                ) VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
            """, (invite_token, company_id, user_id, preset_role_id, expire_at))
            conn.commit()
            
            invite_id = cursor.lastrowid
            
            # 获取公司名称
            cursor.execute("SELECT name FROM companies WHERE id = %s", (company_id,))
            company = cursor.fetchone()
            company_name = company['name'] if company else '未知公司'
            
        conn.close()
        
        # 构建邀请链接
        invite_url = f"/invite.html?token={invite_token}"
        
        return jsonify({
            'success': True,
            'data': {
                'invite_id': invite_id,
                'invite_token': invite_token,
                'invite_url': invite_url,
                'company_name': company_name,
                'expire_at': expire_at.isoformat(),
                'expire_days': expire_days
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/invite/verify', methods=['POST'])
def verify_invite_token():
    """验证邀请链接"""
    try:
        data = request.get_json(silent=True) or {}
        invite_token = data.get('token')
        
        if not invite_token:
            return jsonify({'success': False, 'message': '缺少邀请令牌'}), 400
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT i.*, c.name as company_name, c.short_name
                FROM invitations i
                LEFT JOIN companies c ON i.company_id = c.id
                WHERE i.invite_token = %s
            """, (invite_token,))
            invitation = cursor.fetchone()
            
            if not invitation:
                return jsonify({'success': False, 'message': '邀请链接无效'}), 404
            
            if invitation['status'] == 'used':
                return jsonify({'success': False, 'message': '该邀请链接已被使用'}), 400
            
            if invitation['status'] == 'cancelled':
                return jsonify({'success': False, 'message': '该邀请链接已取消'}), 400
            
            from datetime import datetime
            if invitation['expire_at'] < datetime.now():
                return jsonify({'success': False, 'message': '邀请链接已过期'}), 400
            
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'company_id': invitation['company_id'],
                'company_name': invitation['company_name'],
                'short_name': invitation['short_name'],
                'preset_role_id': invitation['preset_role_id']
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/invite/accept', methods=['POST'])
def accept_invitation():
    """接受邀请并创建账号"""
    try:
        data = request.get_json(silent=True) or {}
        invite_token = data.get('token')
        username = data.get('username')
        password = data.get('password')
        name = data.get('name')
        phone = data.get('phone', '')
        email = data.get('email', '')
        
        if not all([invite_token, username, password, name]):
            return jsonify({'success': False, 'message': '缺少必填字段'}), 400
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 验证邀请令牌
                cursor.execute("""
                    SELECT * FROM invitations 
                    WHERE invite_token = %s AND status = 'pending'
                """, (invite_token,))
                invitation = cursor.fetchone()
                
                if not invitation:
                    return jsonify({'success': False, 'message': '邀请链接无效或已使用'}), 400
                
                from datetime import datetime
                if invitation['expire_at'] < datetime.now():
                    return jsonify({'success': False, 'message': '邀请链接已过期'}), 400
                
                company_id = invitation['company_id']
                preset_role_id = invitation['preset_role_id']
                
                # 检查用户名是否已存在
                cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': '用户名已存在'}), 400
                
                # 创建用户
                import uuid
                user_uuid = str(uuid.uuid4())
                
                cursor.execute("""
                    INSERT INTO users (
                        username, password, name, phone, email,
                        role, status, uuid
                    ) VALUES (%s, %s, %s, %s, %s, 'user', 'enabled', %s)
                """, (username, password, name, phone, email, user_uuid))
                
                user_id = cursor.lastrowid
                
                # 建立用户-公司关联
                cursor.execute("""
                    INSERT INTO user_companies (
                        user_id, company_id, role, is_primary, status
                    ) VALUES (%s, %s, 'user', TRUE, 'active')
                """, (user_id, company_id))
                
                # 如果有预设角色，分配角色
                if preset_role_id:
                    cursor.execute("""
                        INSERT INTO user_roles (user_id, role_id)
                        VALUES (%s, %s)
                    """, (user_id, preset_role_id))
                
                # 更新邀请状态
                cursor.execute("""
                    UPDATE invitations 
                    SET status = 'used', used_by = %s, used_at = NOW()
                    WHERE id = %s
                """, (user_id, invitation['id']))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '账号创建成功',
                    'data': {
                        'user_id': user_id,
                        'username': username,
                        'company_id': company_id
                    }
                }), 201
                
        finally:
            conn.close()
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/invite/list', methods=['GET'])
def list_invitations():
    """获取公司的邀请列表"""
    try:
        company_id = session.get('company_id', 1)
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT i.*, u.name as created_by_name, u2.name as used_by_name
                FROM invitations i
                LEFT JOIN users u ON i.created_by = u.id
                LEFT JOIN users u2 ON i.used_by = u2.id
                WHERE i.company_id = %s
                ORDER BY i.created_at DESC
                LIMIT 50
            """, (company_id,))
            invitations = cursor.fetchall()
            
            # 转换日期时间为字符串
            from datetime import datetime
            for inv in invitations:
                if inv.get('expire_at'):
                    inv['expire_at'] = inv['expire_at'].isoformat()
                if inv.get('created_at'):
                    inv['created_at'] = inv['created_at'].isoformat()
                if inv.get('used_at'):
                    inv['used_at'] = inv['used_at'].isoformat()
                    
        conn.close()
        
        return jsonify({'success': True, 'data': invitations})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== 注册控制台API Blueprint ====================
try:
    from console_api import console_bp
    app.register_blueprint(console_bp)
    print("✅ 控制台API已注册: /api/admin/*")
except ImportError as e:
    print(f"⚠️ 控制台API注册失败: {e}")

# ==================== 注册开通流程API Blueprint ====================
try:
    from onboarding_api import onboarding_bp
    app.register_blueprint(onboarding_bp)
    print("✅ 开通流程API已注册: /api/onboarding/*")
except ImportError as e:
    print(f"⚠️ 开通流程API注册失败: {e}")

# ==================== 注册物流管理API ====================
try:
    from logistics_api import register_logistics_routes
    register_logistics_routes(app, get_db_connection, require_company)
    print("✅ 物流管理API已注册: /api/logistics/*")
except ImportError as e:
    print(f"⚠️ 物流管理API注册失败: {e}")
except Exception as e:
    print(f"⚠️ 物流管理API注册异常: {e}")

# ==================== 注册平台物流控制台API Blueprint ====================
try:
    from platform_cainiao_api import platform_cainiao_bp
    app.register_blueprint(platform_cainiao_bp)
    print("✅ 平台物流控制台API已注册: /api/platform/cainiao/*")
except ImportError as e:
    print(f"⚠️ 平台物流控制台API注册失败: {e}")
except Exception as e:
    print(f"⚠️ 平台物流控制台API注册异常: {e}")

# ==================== 注册快递100 API Blueprint ====================
try:
    from platform_kuaidi100_api import platform_kuaidi100_bp
    app.register_blueprint(platform_kuaidi100_bp)
    print("✅ 快递100 API已注册: /api/platform/kuaidi100/*")
except ImportError as e:
    print(f"⚠️ 快递100 API注册失败: {e}")
except Exception as e:
    print(f"⚠️ 快递100 API注册异常: {e}")

# ==================== 注册菜鸟ISV API Blueprint ====================
try:
    from cainiao_isv_api import cainiao_isv_bp
    app.register_blueprint(cainiao_isv_bp)
    print("✅ 菜鸟ISV API已注册: /api/cainiao_isv/*")
except ImportError as e:
    print(f"⚠️ 菜鸟ISV API注册失败: {e}")
except Exception as e:
    print(f"⚠️ 菜鸟ISV API注册异常: {e}")

# ==================== 注册租户物流账号管理API ====================
try:
    from tenant_logistics_api import tenant_logistics_bp
    app.register_blueprint(tenant_logistics_bp)
    print("✅ 租户物流账号API已注册: /api/tenant/logistics_accounts/*")
except ImportError as e:
    print(f"⚠️ 租户物流账号API注册失败: {e}")
except Exception as e:
    print(f"⚠️ 租户物流账号API注册异常: {e}")

# ==================== 注册租户仓库/发货地址管理API ====================
try:
    from tenant_warehouse_api import tenant_warehouse_bp
    app.register_blueprint(tenant_warehouse_bp)
    print("✅ 租户仓库/发货地址API已注册: /api/tenant/warehouses/*")
except ImportError as e:
    print(f"⚠️ 租户仓库/发货地址API注册失败: {e}")
except Exception as e:
    print(f"⚠️ 租户仓库/发货地址API注册异常: {e}")

# ==================== 注册前端日志接收API ====================
try:
    from frontend_logs_api import frontend_logs_bp
    app.register_blueprint(frontend_logs_bp)
    print("✅ 前端日志接收API已注册: /api/frontend_logs/*")
except ImportError as e:
    print(f"⚠️ 前端日志接收API注册失败: {e}")
except Exception as e:
    print(f"⚠️ 前端日志接收API注册异常: {e}")


if __name__ == '__main__':
    # 端口配置（遵循系统端口规范）
    import os
    FLASK_PORT = int(os.getenv('FLASK_PORT', 8050))  # 默认8050，避开5000端口冲突
    
    # 生产环境使用 gunicorn 启动,这里仅用于开发测试
    app.run(host='0.0.0.0', port=FLASK_PORT, debug=False)


