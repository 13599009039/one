#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
租户开通流程API
处理新租户的自助开通、主账号创建、初始化配置
"""

from flask import Blueprint, request, jsonify, session
import pymysql
from datetime import datetime
import hashlib

onboarding_bp = Blueprint('onboarding', __name__, url_prefix='/api/onboarding')

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


# ==================== 开通流程API ====================

@onboarding_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """验证开通令牌"""
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({'success': False, 'message': '缺少令牌'}), 400
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 查询令牌对应的公司
                sql = """
                    SELECT id, name, short_name, onboarding_status, onboarding_completed_at
                    FROM companies
                    WHERE onboarding_token = %s
                """
                cursor.execute(sql, (token,))
                company = cursor.fetchone()
                
                if not company:
                    return jsonify({'success': False, 'message': '令牌无效或已失效'}), 404
                
                if company['onboarding_status'] == 'completed':
                    return jsonify({
                        'success': False, 
                        'message': '该公司已完成开通',
                        'completed_at': company['onboarding_completed_at']
                    }), 400
                
                return jsonify({
                    'success': True,
                    'data': {
                        'company_id': company['id'],
                        'company_name': company['name'],
                        'short_name': company['short_name'],
                        'status': company['onboarding_status']
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'验证失败：{str(e)}'}), 500


@onboarding_bp.route('/create-admin', methods=['POST'])
def create_admin():
    """创建主账号"""
    try:
        data = request.json
        token = data.get('token')
        username = data.get('username')
        password = data.get('password')
        name = data.get('name')
        phone = data.get('phone', '')
        email = data.get('email', '')
        
        # 验证必填字段
        if not all([token, username, password, name]):
            return jsonify({'success': False, 'message': '缺少必填字段'}), 400
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 验证令牌
                cursor.execute("""
                    SELECT id, name, onboarding_status 
                    FROM companies 
                    WHERE onboarding_token = %s
                """, (token,))
                company = cursor.fetchone()
                
                if not company:
                    return jsonify({'success': False, 'message': '令牌无效'}), 404
                
                if company['onboarding_status'] == 'completed':
                    return jsonify({'success': False, 'message': '该公司已完成开通'}), 400
                
                company_id = company['id']
                
                # 检查用户名是否已存在（全局唯一）
                cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': '用户名已存在'}), 400
                
                # 创建用户（主账号）
                # 注意：这里密码应该加密存储，但为了兼容现有系统暂时明文
                import uuid
                user_uuid = str(uuid.uuid4())
                
                cursor.execute("""
                    INSERT INTO users (
                        username, password, name, phone, email,
                        role, status, uuid
                    ) VALUES (%s, %s, %s, %s, %s, 'admin', 'enabled', %s)
                """, (username, password, name, phone, email, user_uuid))
                
                user_id = cursor.lastrowid
                
                # 在user_companies表中建立关联（设为主公司）
                cursor.execute("""
                    INSERT INTO user_companies (
                        user_id, company_id, role, is_primary, status
                    ) VALUES (%s, %s, 'admin', TRUE, 'active')
                """, (user_id, company_id))
                
                # 更新公司的admin_user_id
                cursor.execute("""
                    UPDATE companies 
                    SET admin_user_id = %s, onboarding_status = 'in_progress'
                    WHERE id = %s
                """, (user_id, company_id))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '主账号创建成功',
                    'data': {
                        'user_id': user_id,
                        'username': username,
                        'company_id': company_id
                    }
                }), 201
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'创建失败：{str(e)}'}), 500


@onboarding_bp.route('/init-basic-data', methods=['POST'])
def init_basic_data():
    """初始化基础数据（部门、角色等）"""
    try:
        data = request.json
        token = data.get('token')
        basic_data = data.get('data', {})
        
        if not token:
            return jsonify({'success': False, 'message': '缺少令牌'}), 400
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 验证令牌
                cursor.execute("""
                    SELECT id FROM companies 
                    WHERE onboarding_token = %s AND onboarding_status != 'completed'
                """, (token,))
                company = cursor.fetchone()
                
                if not company:
                    return jsonify({'success': False, 'message': '令牌无效或已完成开通'}), 404
                
                company_id = company['id']
                
                # 初始化部门数据（如果提供）
                departments = basic_data.get('departments', [])
                if departments:
                    for dept in departments:
                        cursor.execute("""
                            INSERT INTO departments (name, company_id, status)
                            VALUES (%s, %s, 'active')
                        """, (dept.get('name'), company_id))
                
                # 初始化角色数据（如果提供）
                roles = basic_data.get('roles', [])
                if roles:
                    for role in roles:
                        cursor.execute("""
                            INSERT INTO roles (name, code, company_id, status)
                            VALUES (%s, %s, %s, 'active')
                        """, (role.get('name'), role.get('code'), company_id))
                
                # 初始化账户科目（如果提供）
                accounts = basic_data.get('accounts', [])
                if accounts:
                    for account in accounts:
                        cursor.execute("""
                            INSERT INTO accounts (
                                account_code, account_name, account_type, 
                                parent_code, company_id, status
                            ) VALUES (%s, %s, %s, %s, %s, 'active')
                        """, (
                            account.get('code'),
                            account.get('name'),
                            account.get('type'),
                            account.get('parent_code'),
                            company_id
                        ))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '基础数据初始化成功',
                    'data': {
                        'departments_count': len(departments),
                        'roles_count': len(roles),
                        'accounts_count': len(accounts)
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'初始化失败：{str(e)}'}), 500


@onboarding_bp.route('/complete', methods=['POST'])
def complete_onboarding():
    """完成开通流程"""
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({'success': False, 'message': '缺少令牌'}), 400
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 验证令牌并获取公司信息
                cursor.execute("""
                    SELECT id, name, admin_user_id 
                    FROM companies 
                    WHERE onboarding_token = %s
                """, (token,))
                company = cursor.fetchone()
                
                if not company:
                    return jsonify({'success': False, 'message': '令牌无效'}), 404
                
                if not company['admin_user_id']:
                    return jsonify({'success': False, 'message': '尚未创建主账号'}), 400
                
                # 更新公司开通状态
                cursor.execute("""
                    UPDATE companies 
                    SET onboarding_status = 'completed',
                        onboarding_completed_at = NOW(),
                        onboarding_token = NULL,
                        status = 'active'
                    WHERE id = %s
                """, (company['id'],))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '开通完成',
                    'data': {
                        'company_id': company['id'],
                        'company_name': company['name'],
                        'redirect_url': '/financial_system.html'
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'完成开通失败：{str(e)}'}), 500


@onboarding_bp.route('/check-username', methods=['POST'])
def check_username():
    """检查用户名是否可用（全局唯一性检查）"""
    try:
        data = request.json
        username = data.get('username')
        
        if not username:
            return jsonify({'success': False, 'message': '缺少用户名'}), 400
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
                exists = cursor.fetchone() is not None
                
                return jsonify({
                    'success': True,
                    'data': {
                        'username': username,
                        'available': not exists
                    }
                }), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'检查失败：{str(e)}'}), 500
