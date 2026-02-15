#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SaaS平台控制台API
用于平台管理员管理租户公司和用户
"""

from flask import Blueprint, request, jsonify, session
import pymysql
from datetime import datetime, date
import secrets
import uuid as uuid_lib

console_bp = Blueprint('console', __name__, url_prefix='/api/admin')

# 数据库配置（从app.py继承）
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

def require_platform_admin(f):
    """平台管理员权限验证装饰器"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: 实现平台管理员权限验证
        # 目前暂时允许所有请求（开发阶段）
        admin_id = session.get('admin_id')
        if not admin_id:
            # 临时方案：检查是否是superadmin角色的用户
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'success': False, 'message': '未登录'}), 401
            
            conn = get_db_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT role FROM users WHERE id=%s", (user_id,))
                    user = cursor.fetchone()
                    if not user or user['role'] not in ('admin', 'superadmin'):
                        return jsonify({'success': False, 'message': '无权限访问'}), 403
            finally:
                conn.close()
        
        return f(*args, **kwargs)
    return decorated_function


# ==================== 公司管理API ====================

@console_bp.route('/companies', methods=['GET'])
@require_platform_admin
def get_companies():
    """获取公司列表（支持搜索和分页）"""
    try:
        # 获取查询参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '')
        
        offset = (page - 1) * page_size
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 构建查询条件
                where_conditions = []
                params = []
                
                if search:
                    where_conditions.append("(name LIKE %s OR short_name LIKE %s OR contact_person LIKE %s)")
                    search_pattern = f"%{search}%"
                    params.extend([search_pattern, search_pattern, search_pattern])
                
                if status:
                    where_conditions.append("status = %s")
                    params.append(status)
                
                where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
                
                # 查询总数
                count_sql = f"SELECT COUNT(*) as total FROM companies WHERE {where_clause}"
                cursor.execute(count_sql, params)
                total = cursor.fetchone()['total']
                
                # 查询列表
                list_sql = f"""
                    SELECT 
                        c.*,
                        u.username as admin_username,
                        u.name as admin_name,
                        (SELECT COUNT(*) FROM user_companies uc WHERE uc.company_id = c.id AND uc.status = 'active') as active_users
                    FROM companies c
                    LEFT JOIN users u ON c.admin_user_id = u.id
                    WHERE {where_clause}
                    ORDER BY c.created_at DESC
                    LIMIT %s OFFSET %s
                """
                cursor.execute(list_sql, params + [page_size, offset])
                companies = cursor.fetchall()
                
                return jsonify({
                    'success': True,
                    'data': {
                        'items': companies,
                        'total': total,
                        'page': page,
                        'page_size': page_size,
                        'total_pages': (total + page_size - 1) // page_size
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取公司列表失败：{str(e)}'}), 500


@console_bp.route('/companies/<int:company_id>', methods=['GET'])
@require_platform_admin
def get_company_detail(company_id):
    """获取公司详情"""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sql = """
                    SELECT 
                        c.*,
                        u.username as admin_username,
                        u.name as admin_name,
                        u.phone as admin_phone,
                        u.email as admin_email
                    FROM companies c
                    LEFT JOIN users u ON c.admin_user_id = u.id
                    WHERE c.id = %s
                """
                cursor.execute(sql, (company_id,))
                company = cursor.fetchone()
                
                if not company:
                    return jsonify({'success': False, 'message': '公司不存在'}), 404
                
                # 查询用户数统计
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_users,
                        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
                        SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled_users
                    FROM user_companies
                    WHERE company_id = %s
                """, (company_id,))
                user_stats = cursor.fetchone()
                company.update(user_stats)
                
                return jsonify({
                    'success': True,
                    'data': company
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取公司详情失败：{str(e)}'}), 500


@console_bp.route('/companies', methods=['POST'])
@require_platform_admin
def create_company():
    """创建新公司（租户）"""
    try:
        data = request.json
        required_fields = ['name']
        
        # 验证必填字段
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'缺少必填字段：{field}'}), 400
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 检查公司名称是否已存在
                cursor.execute("SELECT id FROM companies WHERE name = %s", (data['name'],))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': '公司名称已存在'}), 400
                
                # 生成开通令牌
                onboarding_token = secrets.token_urlsafe(32)
                
                # 插入公司记录
                sql = """
                    INSERT INTO companies (
                        name, short_name, contact_person, contact_phone, 
                        status, onboarding_status, onboarding_token,
                        tax_number, address, industry, employee_count,
                        service_start_date, service_end_date,
                        traffic_staff, business_staff, service_staff, notes
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """
                cursor.execute(sql, (
                    data['name'],
                    data.get('short_name', ''),
                    data.get('contact_person', ''),
                    data.get('contact_phone', ''),
                    data.get('status', 'active'),
                    'pending',  # 初始状态为待开通
                    onboarding_token,
                    data.get('tax_number', ''),
                    data.get('address', ''),
                    data.get('industry', ''),
                    data.get('employee_count', 0),
                    data.get('service_start_date'),
                    data.get('service_end_date'),
                    data.get('traffic_staff', ''),
                    data.get('business_staff', ''),
                    data.get('service_staff', ''),
                    data.get('notes', '')
                ))
                
                company_id = cursor.lastrowid
                conn.commit()
                
                # 查询新创建的公司
                cursor.execute("SELECT * FROM companies WHERE id = %s", (company_id,))
                new_company = cursor.fetchone()
                
                return jsonify({
                    'success': True,
                    'message': '公司创建成功',
                    'data': new_company
                }), 201
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'创建公司失败：{str(e)}'}), 500


@console_bp.route('/companies/<int:company_id>', methods=['PUT'])
@require_platform_admin
def update_company(company_id):
    """更新公司信息"""
    try:
        data = request.json
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 检查公司是否存在
                cursor.execute("SELECT id FROM companies WHERE id = %s", (company_id,))
                if not cursor.fetchone():
                    return jsonify({'success': False, 'message': '公司不存在'}), 404
                
                # 构建更新字段
                update_fields = []
                params = []
                
                allowed_fields = [
                    'name', 'short_name', 'contact_person', 'contact_phone',
                    'status', 'tax_number', 'address', 'industry', 'employee_count',
                    'service_start_date', 'service_end_date', 'service_fee', 'service_cycle',
                    'traffic_staff', 'business_staff', 'service_staff', 'notes', 'renewal_status'
                ]
                
                for field in allowed_fields:
                    if field in data:
                        update_fields.append(f"{field} = %s")
                        params.append(data[field])
                
                if not update_fields:
                    return jsonify({'success': False, 'message': '没有需要更新的字段'}), 400
                
                params.append(company_id)
                sql = f"UPDATE companies SET {', '.join(update_fields)} WHERE id = %s"
                cursor.execute(sql, params)
                conn.commit()
                
                # 查询更新后的公司
                cursor.execute("SELECT * FROM companies WHERE id = %s", (company_id,))
                updated_company = cursor.fetchone()
                
                return jsonify({
                    'success': True,
                    'message': '公司信息更新成功',
                    'data': updated_company
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'更新公司失败：{str(e)}'}), 500


@console_bp.route('/companies/<int:company_id>', methods=['DELETE'])
@require_platform_admin
def delete_company(company_id):
    """删除公司（软删除）"""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 检查公司是否存在
                cursor.execute("SELECT id, status FROM companies WHERE id = %s", (company_id,))
                company = cursor.fetchone()
                if not company:
                    return jsonify({'success': False, 'message': '公司不存在'}), 404
                
                # 检查是否有活跃用户
                cursor.execute("""
                    SELECT COUNT(*) as active_count 
                    FROM user_companies 
                    WHERE company_id = %s AND status = 'active'
                """, (company_id,))
                result = cursor.fetchone()
                if result['active_count'] > 0:
                    return jsonify({
                        'success': False, 
                        'message': f'该公司还有{result["active_count"]}个活跃用户，请先停用所有用户'
                    }), 400
                
                # 软删除：修改状态为suspended
                cursor.execute(
                    "UPDATE companies SET status = 'suspended' WHERE id = %s",
                    (company_id,)
                )
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '公司已停用'
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'删除公司失败：{str(e)}'}), 500


@console_bp.route('/companies/<int:company_id>/generate-token', methods=['POST'])
@require_platform_admin
def generate_onboarding_token(company_id):
    """为公司生成新的开通令牌"""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 检查公司是否存在
                cursor.execute("SELECT id, name, onboarding_status FROM companies WHERE id = %s", (company_id,))
                company = cursor.fetchone()
                if not company:
                    return jsonify({'success': False, 'message': '公司不存在'}), 404
                
                # 生成新令牌
                new_token = secrets.token_urlsafe(32)
                
                # 更新公司令牌
                cursor.execute("""
                    UPDATE companies 
                    SET onboarding_token = %s, onboarding_status = 'pending'
                    WHERE id = %s
                """, (new_token, company_id))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '开通令牌已生成',
                    'data': {
                        'company_id': company_id,
                        'company_name': company['name'],
                        'token': new_token,
                        'onboarding_url': f'/onboarding.html?token={new_token}'
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'生成令牌失败：{str(e)}'}), 500



@console_bp.route('/companies/<int:company_id>/generate-onboarding', methods=['POST'])
@require_platform_admin
def generate_onboarding_link(company_id):
    """生成公司开通链接"""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 检查公司是否存在
                cursor.execute("SELECT id, name, onboarding_token FROM companies WHERE id = %s", (company_id,))
                company = cursor.fetchone()
                if not company:
                    return jsonify({'success': False, 'message': '公司不存在'}), 404
                
                # 如果没有token或需要重新生成
                token = company.get('onboarding_token')
                if not token:
                    token = secrets.token_urlsafe(32)
                    cursor.execute(
                        "UPDATE companies SET onboarding_token = %s, onboarding_status = 'pending' WHERE id = %s",
                        (token, company_id)
                    )
                    conn.commit()
                
                # 生成开通链接（需要根据实际域名调整）
                # TODO: 从配置中读取域名
                base_url = "http://47.98.60.197"
                onboarding_url = f"{base_url}/onboarding.html?token={token}"
                
                return jsonify({
                    'success': True,
                    'data': {
                        'token': token,
                        'url': onboarding_url,
                        'company_name': company['name']
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'生成开通链接失败：{str(e)}'}), 500


# ==================== 用户管理API ====================

@console_bp.route('/users', methods=['GET'])
@require_platform_admin
def get_users():
    """获取用户列表（支持搜索和分页）"""
    try:
        # 获取查询参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        search = request.args.get('search', '').strip()
        company_id = request.args.get('company_id', '')
        status = request.args.get('status', '')
        
        offset = (page - 1) * page_size
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 构建查询条件
                where_conditions = []
                params = []
                
                if search:
                    where_conditions.append("(u.username LIKE %s OR u.name LIKE %s OR u.phone LIKE %s)")
                    search_pattern = f"%{search}%"
                    params.extend([search_pattern, search_pattern, search_pattern])
                
                if company_id:
                    where_conditions.append("uc.company_id = %s")
                    params.append(company_id)
                
                if status:
                    where_conditions.append("u.status = %s")
                    params.append(status)
                
                where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
                
                # 查询总数
                count_sql = f"""
                    SELECT COUNT(DISTINCT u.id) as total 
                    FROM users u
                    LEFT JOIN user_companies uc ON u.id = uc.user_id
                    WHERE {where_clause}
                """
                cursor.execute(count_sql, params)
                total = cursor.fetchone()['total']
                
                # 查询列表
                list_sql = f"""
                    SELECT 
                        u.*,
                        GROUP_CONCAT(DISTINCT c.name) as company_names,
                        COUNT(DISTINCT uc.company_id) as company_count
                    FROM users u
                    LEFT JOIN user_companies uc ON u.id = uc.user_id
                    LEFT JOIN companies c ON uc.company_id = c.id
                    WHERE {where_clause}
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                    LIMIT %s OFFSET %s
                """
                cursor.execute(list_sql, params + [page_size, offset])
                users = cursor.fetchall()
                
                # 隐藏密码
                for user in users:
                    user.pop('password', None)
                
                return jsonify({
                    'success': True,
                    'data': {
                        'items': users,
                        'total': total,
                        'page': page,
                        'page_size': page_size,
                        'total_pages': (total + page_size - 1) // page_size
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取用户列表失败：{str(e)}'}), 500


@console_bp.route('/users/<int:user_id>', methods=['GET'])
@require_platform_admin
def get_user_detail(user_id):
    """获取用户详情"""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 查询用户基本信息
                cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                user = cursor.fetchone()
                
                if not user:
                    return jsonify({'success': False, 'message': '用户不存在'}), 404
                
                # 隐藏密码
                user.pop('password', None)
                
                # 查询用户的公司关联
                cursor.execute("""
                    SELECT 
                        uc.*,
                        c.name as company_name,
                        c.short_name as company_short_name,
                        c.status as company_status
                    FROM user_companies uc
                    JOIN companies c ON uc.company_id = c.id
                    WHERE uc.user_id = %s
                    ORDER BY uc.is_primary DESC, uc.joined_at DESC
                """, (user_id,))
                companies = cursor.fetchall()
                user['companies'] = companies
                
                return jsonify({
                    'success': True,
                    'data': user
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取用户详情失败：{str(e)}'}), 500


@console_bp.route('/users/<int:user_id>/companies', methods=['POST'])
@require_platform_admin
def add_user_company(user_id):
    """为用户添加公司权限"""
    try:
        data = request.json
        company_id = data.get('company_id')
        role = data.get('role', 'user')
        is_primary = data.get('is_primary', False)
        
        if not company_id:
            return jsonify({'success': False, 'message': '缺少公司ID'}), 400
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 检查用户是否存在
                cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
                if not cursor.fetchone():
                    return jsonify({'success': False, 'message': '用户不存在'}), 404
                
                # 检查公司是否存在
                cursor.execute("SELECT id FROM companies WHERE id = %s", (company_id,))
                if not cursor.fetchone():
                    return jsonify({'success': False, 'message': '公司不存在'}), 404
                
                # 检查是否已关联
                cursor.execute("""
                    SELECT id FROM user_companies 
                    WHERE user_id = %s AND company_id = %s
                """, (user_id, company_id))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': '该用户已关联此公司'}), 400
                
                # 如果设置为主公司，先取消其他主公司标记
                if is_primary:
                    cursor.execute("""
                        UPDATE user_companies SET is_primary = FALSE 
                        WHERE user_id = %s
                    """, (user_id,))
                
                # 添加关联
                cursor.execute("""
                    INSERT INTO user_companies (user_id, company_id, role, is_primary, status)
                    VALUES (%s, %s, %s, %s, 'active')
                """, (user_id, company_id, role, is_primary))
                
                # 如果是主公司，更新users表
                if is_primary:
                    cursor.execute("""
                        UPDATE users SET company_id = %s WHERE id = %s
                    """, (company_id, user_id))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '添加公司权限成功'
                }), 201
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'添加公司权限失败：{str(e)}'}), 500


@console_bp.route('/users/<int:user_id>/companies/<int:company_id>', methods=['DELETE'])
@require_platform_admin
def remove_user_company(user_id, company_id):
    """移除用户的公司权限（停用）"""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 检查关联是否存在
                cursor.execute("""
                    SELECT id, is_primary FROM user_companies 
                    WHERE user_id = %s AND company_id = %s
                """, (user_id, company_id))
                uc = cursor.fetchone()
                
                if not uc:
                    return jsonify({'success': False, 'message': '未找到该用户的公司权限'}), 404
                
                # 停用权限
                cursor.execute("""
                    UPDATE user_companies 
                    SET status = 'disabled', disabled_at = NOW()
                    WHERE user_id = %s AND company_id = %s
                """, (user_id, company_id))
                
                # 如果是主公司，需要处理主公司切换
                if uc['is_primary']:
                    # 查找其他active公司
                    cursor.execute("""
                        SELECT company_id FROM user_companies
                        WHERE user_id = %s AND status = 'active'
                        ORDER BY company_id
                        LIMIT 1
                    """, (user_id,))
                    other_company = cursor.fetchone()
                    
                    if other_company:
                        # 切换到其他公司
                        new_primary_id = other_company['company_id']
                        cursor.execute("""
                            UPDATE user_companies SET is_primary = TRUE
                            WHERE user_id = %s AND company_id = %s
                        """, (user_id, new_primary_id))
                        cursor.execute("""
                            UPDATE users SET company_id = %s WHERE id = %s
                        """, (new_primary_id, user_id))
                    else:
                        # 没有其他公司，停用用户
                        cursor.execute("""
                            UPDATE users 
                            SET company_id = NULL, status = 'disabled'
                            WHERE id = %s
                        """, (user_id,))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '已停用用户在该公司的权限'
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'移除公司权限失败：{str(e)}'}), 500


# ==================== 系统配置API ====================

@console_bp.route('/system-config', methods=['GET'])
@require_platform_admin
def get_system_config():
    """获取系统配置"""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 查询统计数据
                cursor.execute("SELECT COUNT(*) as total FROM companies WHERE status = 'active'")
                active_companies = cursor.fetchone()['total']
                
                cursor.execute("SELECT COUNT(*) as total FROM companies")
                total_companies = cursor.fetchone()['total']
                
                cursor.execute("SELECT COUNT(DISTINCT user_id) as total FROM user_companies WHERE status = 'active'")
                active_users = cursor.fetchone()['total']
                
                cursor.execute("SELECT COUNT(*) as total FROM users")
                total_users = cursor.fetchone()['total']
                
                return jsonify({
                    'success': True,
                    'data': {
                        'statistics': {
                            'active_companies': active_companies,
                            'total_companies': total_companies,
                            'active_users': active_users,
                            'total_users': total_users
                        }
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取系统配置失败：{str(e)}'}), 500
