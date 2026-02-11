#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财务流水账系统后端 API
Flask + MySQL
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import json
from datetime import datetime, date
import os
from functools import wraps

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 数据库配置
DB_CONFIG = {
    'host': '47.98.60.197',
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

def require_permission(resource, action):
    """
    权限验证装饰器
    
    Args:
        resource: 资源模块（transactions/inventory/costs/orders）
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
                # 从请求中获取用户ID（假设前端在header中传递user_id）
                user_id = request.headers.get('X-User-Id') or request.json.get('created_by') or request.json.get('user_id')
                
                if not user_id:
                    return jsonify({'success': False, 'message': '未提供用户身份信息'}), 401
                
                # 查询用户角色
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT role FROM users WHERE id=%s", (user_id,))
                    user = cursor.fetchone()
                    
                    if not user:
                        conn.close()
                        return jsonify({'success': False, 'message': '用户不存在'}), 401
                    
                    role = user['role']
                    
                    # admin角色拥有所有权限
                    if role == 'admin':
                        conn.close()
                        return f(*args, **kwargs)
                    
                    # 检查角色是否有指定权限
                    cursor.execute("""
                        SELECT rp.id 
                        FROM role_permissions rp
                        LEFT JOIN permissions p ON rp.permission_id = p.id
                        WHERE rp.role = %s AND p.resource = %s AND p.action = %s
                    """, (role, resource, action))
                    
                    permission = cursor.fetchone()
                    conn.close()
                    
                    if permission:
                        return f(*args, **kwargs)
                    else:
                        return jsonify({
                            'success': False, 
                            'message': f'权限不足：您的角色({role})没有{resource}.{action}权限'
                        }), 403
                        
            except Exception as e:
                return jsonify({'success': False, 'message': f'权限验证失败：{str(e)}'}), 500
                
        return decorated_function
    return decorator

# ==================== 用户相关接口 ====================

@app.route('/api/users/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "SELECT * FROM users WHERE username=%s AND password=%s AND status='enabled'"
            cursor.execute(sql, (username, password))
            user = cursor.fetchone()
            
        conn.close()
        
        if user:
            return jsonify({'success': True, 'user': user})
        else:
            return jsonify({'success': False, 'message': '用户名或密码错误'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users', methods=['GET'])
def get_users():
    """获取用户列表"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE status='enabled'")
            users = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': users})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users', methods=['POST'])
def add_user():
    """添加用户"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """INSERT INTO users (username, password, name, alias, role, company_id, status)
                     VALUES (%s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data['username'], data['password'], data['name'],
                data.get('alias'), data['role'], data.get('company_id'), 'enabled'
            ))
            conn.commit()
            user_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'success': True, 'id': user_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """更新用户"""
    try:
        data = request.json
        conn = get_db_connection()
        with conn.cursor() as cursor:
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
            
            if 'company_id' in data:
                update_fields.append('company_id=%s')
                params.append(data.get('company_id'))
            
            if 'status' in data:
                update_fields.append('status=%s')
                params.append(data.get('status'))
            
            if 'password' in data:
                update_fields.append('password=%s')
                params.append(data['password'])
            
            if not update_fields:
                return jsonify({'success': False, 'message': '没有要更新的字段'})
            
            params.append(user_id)
            sql = f"UPDATE users SET {', '.join(update_fields)} WHERE id=%s"
            cursor.execute(sql, params)
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== 客户相关接口 ====================

@app.route('/api/customers', methods=['GET'])
def get_customers():
    """获取客户列表"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '')
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 构建查询条件
            where_clauses = []
            params = []
            
            if search:
                where_clauses.append("(shop_name LIKE %s OR merchant_id LIKE %s OR industry LIKE %s)")
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern, search_pattern])
            
            if status_filter:
                where_clauses.append("status = %s")
                params.append(status_filter)
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
            
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
            cursor.execute("SELECT * FROM customers WHERE id=%s", (customer_id,))
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

@app.route('/api/customers', methods=['POST'])
def add_customer():
    """添加客户"""
    try:
        data = request.json
        conn = get_db_connection()
        
        # 检查商家ID唯一性
        if data.get('merchant_id'):
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM customers WHERE merchant_id=%s", (data['merchant_id'],))
                if cursor.fetchone():
                    conn.close()
                    return jsonify({'success': False, 'message': '商家ID已存在'})
        
        with conn.cursor() as cursor:
            # 插入客户基本信息
            sql = """INSERT INTO customers (
                merchant_id, shop_name, douyin_name, company_name, credit_code,
                legal_person, registered_capital, business_address, operating_address,
                cooperation_mode, category, industry, status, follower_id,
                business_staff, service_staff, operation_staff, management_staff,
                team, region, project, company, tags
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
            
            tags = json.dumps(data.get('tags', []))
            
            cursor.execute(sql, (
                data.get('merchant_id'), data['shop_name'], data.get('douyin_name'),
                data.get('company_name'), data.get('credit_code'), data.get('legal_person'),
                data.get('registered_capital'), data.get('business_address'),
                data.get('operating_address'), data.get('cooperation_mode'),
                data.get('category'), data.get('industry'), data.get('status', '跟进中'),
                data.get('follower_id'), data.get('business_staff'), data.get('service_staff'),
                data.get('operation_staff'), data.get('management_staff'), data.get('team'),
                data.get('region'), data.get('project'), data.get('company'), tags
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
        date_type = request.args.get('date_type', 'contract_date')  # contract_date签约日期 / completion_date完成日期
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 构建查询条件
            where_clauses = []
            params = []
            
            if search:
                where_clauses.append("(order_number LIKE %s OR customer_name LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])
            
            if status:
                where_clauses.append("status=%s")
                params.append(status)
            
            if customer_id:
                where_clauses.append("customer_id=%s")
                params.append(customer_id)
            
            # 日期筛选（根据date_type决定按签约日期还是完成日期）
            if start_date:
                if date_type == 'completion_date':
                    where_clauses.append("completion_date >= %s")
                else:
                    where_clauses.append("contract_date >= %s")
                params.append(start_date)
            
            if end_date:
                if date_type == 'completion_date':
                    where_clauses.append("completion_date <= %s")
                else:
                    where_clauses.append("contract_date <= %s")
                params.append(end_date)
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
            
            # 查询总数
            count_sql = f"SELECT COUNT(*) as total FROM orders WHERE {where_sql}"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']
            
            # 分页查询
            offset = (page - 1) * page_size
            data_sql = f"SELECT * FROM orders WHERE {where_sql} ORDER BY created_at DESC LIMIT %s OFFSET %s"
            cursor.execute(data_sql, params + [page_size, offset])
            orders = cursor.fetchall()
        conn.close()
        
        return jsonify({'success': True, 'data': orders, 'total': total})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """获取订单详情（含收款记录）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 获取订单主信息
            cursor.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
            order = cursor.fetchone()
            
            if order:
                # 获取订单明细
                cursor.execute("SELECT * FROM order_items WHERE order_id=%s", (order_id,))
                order['items'] = cursor.fetchall()
                
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
                order['total_paid'] = payment_stat['total_paid'] if payment_stat['total_paid'] else 0
                order['total_refund'] = payment_stat['total_refund'] if payment_stat['total_refund'] else 0
                order['net_paid'] = order['total_paid'] - order['total_refund']
                
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
            # 插入订单主表
            sql = """INSERT INTO orders (order_number, customer_id, customer_name, order_date, 
                     total_amount, status, payment_method, remarks, created_by)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (
                data.get('order_number'),
                data.get('customer_id'),
                data.get('customer_name'),
                data.get('order_date'),
                data.get('total_amount', 0),
                data.get('status', '待确认'),
                data.get('payment_method'),
                data.get('remarks'),
                data.get('created_by', 1)
            ))
            order_id = cursor.lastrowid
            
            # 插入订单明细
            if 'items' in data and data['items']:
                item_sql = """INSERT INTO order_items (order_id, service_name, quantity, unit_price, amount)
                             VALUES (%s, %s, %s, %s, %s)"""
                for item in data['items']:
                    cursor.execute(item_sql, (
                        order_id,
                        item.get('service_name'),
                        item.get('quantity', 1),
                        item.get('unit_price', 0),
                        item.get('amount', 0)
                    ))
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': order_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    """更新订单"""
    try:
        data = request.json
        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            # 更新订单主表
            sql = """UPDATE orders SET customer_name=%s, order_date=%s, total_amount=%s,
                     status=%s, payment_method=%s, remarks=%s WHERE id=%s"""
            cursor.execute(sql, (
                data.get('customer_name'),
                data.get('order_date'),
                data.get('total_amount', 0),
                data.get('status'),
                data.get('payment_method'),
                data.get('remarks'),
                order_id
            ))
            
            # 删除旧的订单明细
            cursor.execute("DELETE FROM order_items WHERE order_id=%s", (order_id,))
            
            # 插入新的订单明细
            if 'items' in data and data['items']:
                item_sql = """INSERT INTO order_items (order_id, service_name, quantity, unit_price, amount)
                             VALUES (%s, %s, %s, %s, %s)"""
                for item in data['items']:
                    cursor.execute(item_sql, (
                        order_id,
                        item.get('service_name'),
                        item.get('quantity', 1),
                        item.get('unit_price', 0),
                        item.get('amount', 0)
                    ))
            
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    """删除订单（软删除）"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "UPDATE orders SET status='已取消' WHERE id=%s"
            cursor.execute(sql, (order_id,))
            conn.commit()
        conn.close()
        
        return jsonify({'success': True})
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
            # 构建查询条件
            where_clauses = []
            params = []
            
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
                
                # 获取订单合同金额
                cursor.execute("SELECT contract_amount FROM orders WHERE id=%s", (order_id,))
                order = cursor.fetchone()
                if order:
                    contract_amount = order['contract_amount']
                    unpaid_amount = contract_amount - paid_amount
                    
                    # 确定收款状态
                    if paid_amount == 0:
                        payment_status = '未收款'
                    elif paid_amount >= contract_amount:
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
                    print(f"批量添加失败: {str(e)}")
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
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM services WHERE status='active' ORDER BY id")
            services = cursor.fetchall()
        conn.close()
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

if __name__ == '__main__':
    # 生产环境使用 gunicorn 启动，这里仅用于开发测试
    app.run(host='0.0.0.0', port=5000, debug=False)

