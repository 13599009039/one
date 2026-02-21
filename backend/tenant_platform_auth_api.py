"""
平台授权管理API - 租户端
功能: 管理电商平台物流授权（菜鸟、京东、拼多多、抖店、淘宝、小红书等）
版本: 1.0.0
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps
import pymysql
import traceback
from datetime import datetime
from tenant_auth import require_tenant_auth  # 使用统一的权限验证

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

# 创建蓝图
tenant_platform_auth_bp = Blueprint('tenant_platform_auth', __name__)

# ================= 平台授权CRUD接口 =================

@tenant_platform_auth_bp.route('/api/tenant/platform_authorizations', methods=['GET'])
@require_tenant_auth()
def get_platform_authorizations():
    """获取平台授权列表"""
    tenant_id = session.get('company_id')
    platform_type = request.args.get('platform_type', '')
    auth_status = request.args.get('auth_status', '')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 构建查询条件
        where_conditions = [f"tenant_id = {tenant_id}"]
        if platform_type:
            where_conditions.append(f"platform_type = '{platform_type}'")
        if auth_status != '':
            where_conditions.append(f"auth_status = {auth_status}")
        
        where_clause = ' AND '.join(where_conditions)
        
        query = f"""
            SELECT 
                id, tenant_id, platform_type, auth_name, shop_name,
                access_token, refresh_token, expire_time, 
                auth_status, auth_time, is_enabled, remark,
                created_at, updated_at
            FROM tenant_platform_authorizations
            WHERE {where_clause}
            ORDER BY created_at DESC
        """
        
        cursor.execute(query)
        authorizations = cursor.fetchall()
        
        # 格式化时间字段
        for auth in authorizations:
            if auth.get('created_at'):
                auth['created_at'] = auth['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            if auth.get('updated_at'):
                auth['updated_at'] = auth['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
            if auth.get('auth_time'):
                auth['auth_time'] = auth['auth_time'].strftime('%Y-%m-%d %H:%M:%S')
            if auth.get('expire_time'):
                auth['expire_time'] = auth['expire_time'].strftime('%Y-%m-%d %H:%M:%S')
            
            # 隐藏敏感信息
            if auth.get('access_token'):
                auth['access_token'] = auth['access_token'][:10] + '***'
            if auth.get('refresh_token'):
                auth['refresh_token'] = auth['refresh_token'][:10] + '***'
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': authorizations,
            'total': len(authorizations)
        })
        
    except Exception as e:
        print(f"[PlatformAuth] 获取授权列表失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'获取授权列表失败: {str(e)}'}), 500


@tenant_platform_auth_bp.route('/api/tenant/platform_authorizations', methods=['POST'])
@require_tenant_auth()
def create_platform_authorization():
    """创建平台授权记录"""
    tenant_id = session.get('company_id')
    data = request.json
    
    auth_name = data.get('auth_name', '').strip()
    platform_type = data.get('platform_type', '').strip()
    remark = data.get('remark', '').strip()
    
    if not auth_name or not platform_type:
        return jsonify({'success': False, 'message': '授权名称和平台类型不能为空'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 创建授权记录
        insert_query = """
            INSERT INTO tenant_platform_authorizations (
                tenant_id, platform_type, auth_name, remark,
                auth_status, is_enabled, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, 0, 1, NOW(), NOW())
        """
        
        cursor.execute(insert_query, (tenant_id, platform_type, auth_name, remark))
        auth_id = cursor.lastrowid
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '创建成功',
            'data': {'id': auth_id}
        })
        
    except Exception as e:
        print(f"[PlatformAuth] 创建授权失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'创建授权失败: {str(e)}'}), 500


@tenant_platform_auth_bp.route('/api/tenant/platform_authorizations/<int:auth_id>', methods=['PUT'])
@require_tenant_auth()
def update_platform_authorization(auth_id):
    """更新平台授权记录"""
    tenant_id = session.get('company_id')
    data = request.json
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 验证所属权限
        cursor.execute(
            "SELECT id FROM tenant_platform_authorizations WHERE id = %s AND tenant_id = %s",
            (auth_id, tenant_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '授权不存在或无权访问'}), 404
        
        # 更新字段
        update_fields = []
        params = []
        
        if 'auth_name' in data:
            update_fields.append("auth_name = %s")
            params.append(data['auth_name'])
        if 'remark' in data:
            update_fields.append("remark = %s")
            params.append(data['remark'])
        if 'shop_name' in data:
            update_fields.append("shop_name = %s")
            params.append(data['shop_name'])
        if 'access_code' in data:
            update_fields.append("access_code = %s")
            params.append(data['access_code'])
        
        if not update_fields:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '没有需要更新的字段'}), 400
        
        update_fields.append("updated_at = NOW()")
        params.append(auth_id)
        params.append(tenant_id)
        
        update_query = f"""
            UPDATE tenant_platform_authorizations
            SET {', '.join(update_fields)}
            WHERE id = %s AND tenant_id = %s
        """
        
        cursor.execute(update_query, params)
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '更新成功'})
        
    except Exception as e:
        print(f"[PlatformAuth] 更新授权失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'更新授权失败: {str(e)}'}), 500


@tenant_platform_auth_bp.route('/api/tenant/platform_authorizations/<int:auth_id>/toggle', methods=['PUT'])
@require_tenant_auth()
def toggle_platform_authorization_status(auth_id):
    """切换授权启用状态"""
    tenant_id = session.get('company_id')
    data = request.json
    is_enabled = data.get('is_enabled', 1)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            UPDATE tenant_platform_authorizations
            SET is_enabled = %s, updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
            """,
            (is_enabled, auth_id, tenant_id)
        )
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '授权不存在或无权访问'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '状态更新成功'})
        
    except Exception as e:
        print(f"[PlatformAuth] 切换状态失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'切换状态失败: {str(e)}'}), 500


@tenant_platform_auth_bp.route('/api/tenant/platform_authorizations/<int:auth_id>', methods=['DELETE'])
@require_tenant_auth()
def delete_platform_authorization(auth_id):
    """删除平台授权"""
    tenant_id = session.get('company_id')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "DELETE FROM tenant_platform_authorizations WHERE id = %s AND tenant_id = %s",
            (auth_id, tenant_id)
        )
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '授权不存在或无权访问'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '删除成功'})
        
    except Exception as e:
        print(f"[PlatformAuth] 删除授权失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'删除授权失败: {str(e)}'}), 500


# ================= 授权信息更新接口 =================

@tenant_platform_auth_bp.route('/api/tenant/platform_authorizations/<int:auth_id>/auth_info', methods=['PUT'])
@require_tenant_auth()
def update_platform_auth_info(auth_id):
    """更新授权信息（由授权回调调用）"""
    tenant_id = session.get('company_id')
    data = request.json
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 验证所属权限
        cursor.execute(
            "SELECT id FROM tenant_platform_authorizations WHERE id = %s AND tenant_id = %s",
            (auth_id, tenant_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '授权不存在或无权访问'}), 404
        
        # 更新授权信息
        cursor.execute(
            """
            UPDATE tenant_platform_authorizations
            SET access_token = %s, refresh_token = %s, expire_time = %s,
                shop_name = %s, auth_status = 1, auth_time = NOW(), updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
            """,
            (
                data.get('access_token'),
                data.get('refresh_token'),
                data.get('expire_time'),
                data.get('shop_name'),
                auth_id,
                tenant_id
            )
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '授权信息更新成功'})
        
    except Exception as e:
        print(f"[PlatformAuth] 更新授权信息失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'更新授权信息失败: {str(e)}'}), 500
