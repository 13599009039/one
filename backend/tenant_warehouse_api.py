# -*- coding: utf-8 -*-
"""
业务端 - 租户发货地址/仓库管理API
支持租户自主管理发货地址、设置默认地址
"""

from flask import Blueprint, request, session, jsonify
from functools import wraps
import pymysql

# 创建Blueprint
tenant_warehouse_bp = Blueprint('tenant_warehouse', __name__)

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

def require_tenant_auth(role=None):
    """租户权限装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'success': False, 'message': '未登录'}), 401
            
            tenant_id = session.get('company_id')
            if not tenant_id:
                return jsonify({'success': False, 'message': '未绑定租户'}), 403
            
            if role == 'admin':
                user_role = session.get('role', '')
                if user_role not in ['admin', 'super_admin']:
                    return jsonify({'success': False, 'message': '权限不足，需要管理员权限'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ============================================================
# 发货地址/仓库管理API
# ============================================================

@tenant_warehouse_bp.route('/api/tenant/warehouses', methods=['GET'])
@require_tenant_auth()
def get_warehouses():
    """获取当前租户的发货地址列表"""
    try:
        tenant_id = session.get('company_id')
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        sql = """
            SELECT 
                id, tenant_id, warehouse_name, contact, phone,
                province, city, district, address,
                is_default, status, created_at
            FROM tenant_warehouse
            WHERE tenant_id = %s AND status = 1
            ORDER BY is_default DESC, created_at DESC
        """
        
        cursor.execute(sql, [tenant_id])
        warehouses = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': warehouses,
            'total': len(warehouses)
        })
        
    except Exception as e:
        print(f"获取发货地址列表失败: {str(e)}")
        return jsonify({'success': False, 'message': f'获取失败: {str(e)}'}), 500


@tenant_warehouse_bp.route('/api/tenant/warehouses', methods=['POST'])
@require_tenant_auth(role='admin')
def create_warehouse():
    """新增发货地址"""
    try:
        tenant_id = session.get('company_id')
        data = request.json
        
        # 验证必填字段
        required_fields = ['warehouse_name', 'contact', 'phone', 'address']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'缺少必填字段: {field}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 如果设置为默认地址，先取消其他默认地址
        is_default = data.get('is_default', 0)
        if is_default:
            cursor.execute(
                "UPDATE tenant_warehouse SET is_default = 0 WHERE tenant_id = %s",
                [tenant_id]
            )
        
        # 插入新地址
        insert_sql = """
            INSERT INTO tenant_warehouse (
                tenant_id, warehouse_name, contact, phone,
                province, city, district, address, is_default, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(insert_sql, (
            tenant_id,
            data['warehouse_name'],
            data['contact'],
            data['phone'],
            data.get('province'),
            data.get('city'),
            data.get('district'),
            data['address'],
            is_default,
            1  # 启用状态
        ))
        
        warehouse_id = cursor.lastrowid
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '添加成功',
            'warehouse_id': warehouse_id
        })
        
    except Exception as e:
        print(f"创建发货地址失败: {str(e)}")
        return jsonify({'success': False, 'message': f'创建失败: {str(e)}'}), 500


@tenant_warehouse_bp.route('/api/tenant/warehouses/<int:warehouse_id>', methods=['PUT'])
@require_tenant_auth(role='admin')
def update_warehouse(warehouse_id):
    """编辑发货地址"""
    try:
        tenant_id = session.get('company_id')
        data = request.json
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 验证地址归属
        verify_sql = "SELECT id FROM tenant_warehouse WHERE id = %s AND tenant_id = %s"
        cursor.execute(verify_sql, (warehouse_id, tenant_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '地址不存在或无权限'}), 404
        
        # 更新字段
        update_fields = []
        params = []
        
        allowed_fields = [
            'warehouse_name', 'contact', 'phone',
            'province', 'city', 'district', 'address'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
        
        if not update_fields:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '没有可更新的字段'}), 400
        
        params.append(warehouse_id)
        params.append(tenant_id)
        
        update_sql = f"""
            UPDATE tenant_warehouse 
            SET {', '.join(update_fields)}
            WHERE id = %s AND tenant_id = %s
        """
        
        cursor.execute(update_sql, params)
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '更新成功'})
        
    except Exception as e:
        print(f"更新发货地址失败: {str(e)}")
        return jsonify({'success': False, 'message': f'更新失败: {str(e)}'}), 500


@tenant_warehouse_bp.route('/api/tenant/warehouses/<int:warehouse_id>', methods=['DELETE'])
@require_tenant_auth(role='admin')
def delete_warehouse(warehouse_id):
    """删除发货地址（软删除）"""
    try:
        tenant_id = session.get('company_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 验证地址归属
        verify_sql = "SELECT id, is_default FROM tenant_warehouse WHERE id = %s AND tenant_id = %s"
        cursor.execute(verify_sql, (warehouse_id, tenant_id))
        warehouse = cursor.fetchone()
        
        if not warehouse:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '地址不存在或无权限'}), 404
        
        # 如果是默认地址，提示需要先设置其他默认地址
        if warehouse[1]:  # is_default
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': '无法删除默认地址，请先设置其他地址为默认'
            }), 400
        
        # 软删除
        delete_sql = """
            UPDATE tenant_warehouse 
            SET status = 0
            WHERE id = %s AND tenant_id = %s
        """
        
        cursor.execute(delete_sql, (warehouse_id, tenant_id))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '删除成功'})
        
    except Exception as e:
        print(f"删除发货地址失败: {str(e)}")
        return jsonify({'success': False, 'message': f'删除失败: {str(e)}'}), 500


@tenant_warehouse_bp.route('/api/tenant/warehouses/<int:warehouse_id>/set_default', methods=['POST'])
@require_tenant_auth(role='admin')
def set_default_warehouse(warehouse_id):
    """设置为默认发货地址"""
    try:
        tenant_id = session.get('company_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 验证地址归属
        verify_sql = "SELECT id FROM tenant_warehouse WHERE id = %s AND tenant_id = %s AND status = 1"
        cursor.execute(verify_sql, (warehouse_id, tenant_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '地址不存在或无权限'}), 404
        
        # 取消当前默认地址
        cursor.execute(
            "UPDATE tenant_warehouse SET is_default = 0 WHERE tenant_id = %s",
            [tenant_id]
        )
        
        # 设置新的默认地址
        cursor.execute(
            "UPDATE tenant_warehouse SET is_default = 1 WHERE id = %s AND tenant_id = %s",
            (warehouse_id, tenant_id)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '设置成功'})
        
    except Exception as e:
        print(f"设置默认地址失败: {str(e)}")
        return jsonify({'success': False, 'message': f'设置失败: {str(e)}'}), 500


@tenant_warehouse_bp.route('/api/tenant/warehouses/default', methods=['GET'])
@require_tenant_auth()
def get_default_warehouse():
    """获取默认发货地址"""
    try:
        tenant_id = session.get('company_id')
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        sql = """
            SELECT 
                id, tenant_id, warehouse_name, contact, phone,
                province, city, district, address,
                is_default, status, created_at
            FROM tenant_warehouse
            WHERE tenant_id = %s AND is_default = 1 AND status = 1
            LIMIT 1
        """
        
        cursor.execute(sql, [tenant_id])
        warehouse = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not warehouse:
            return jsonify({
                'success': False,
                'message': '未设置默认发货地址'
            }), 404
        
        return jsonify({
            'success': True,
            'data': warehouse
        })
        
    except Exception as e:
        print(f"获取默认发货地址失败: {str(e)}")
        return jsonify({'success': False, 'message': f'获取失败: {str(e)}'}), 500
