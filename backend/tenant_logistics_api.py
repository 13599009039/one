# -*- coding: utf-8 -*-
"""
业务端 - 租户物流账号管理API
支持租户自主管理物流账号、完成菜鸟授权
"""

from flask import Blueprint, request, session, jsonify
from functools import wraps
import pymysql
import hashlib
import hmac
import time
import urllib.parse

# 创建Blueprint
tenant_logistics_bp = Blueprint('tenant_logistics', __name__)

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
            # 检查登录状态
            if 'user_id' not in session:
                return jsonify({'success': False, 'message': '未登录'}), 401
            
            # 检查租户ID
            tenant_id = session.get('company_id')  # 使用company_id作为tenant_id
            if not tenant_id:
                return jsonify({'success': False, 'message': '未绑定租户'}), 403
            
            # 检查角色权限（如果需要）
            if role == 'admin':
                user_role = session.get('role', '')
                if user_role not in ['admin', 'super_admin']:
                    return jsonify({'success': False, 'message': '权限不足，需要管理员权限'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ============================================================
# 物流账号管理API
# ============================================================

@tenant_logistics_bp.route('/api/tenant/logistics_accounts', methods=['GET'])
@require_tenant_auth()
def get_logistics_accounts():
    """获取当前租户的物流账号列表"""
    try:
        tenant_id = session.get('company_id')
        
        # 查询参数
        cp_code = request.args.get('cp_code')  # 快递公司编码
        auth_status = request.args.get('auth_status')  # 授权状态
        status = request.args.get('status', '1')  # 启用状态
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 构建SQL查询
        sql = """
            SELECT 
                id, tenant_id, warehouse_id, cp_code, cp_name, 
                branch_name, partner_id, account, 
                auth_token, auth_status, auth_expire,
                is_default, status, created_at, updated_at
            FROM tenant_logistics_account
            WHERE tenant_id = %s
        """
        params = [tenant_id]
        
        # 添加筛选条件
        if cp_code:
            sql += " AND cp_code = %s"
            params.append(cp_code)
        
        if auth_status:
            sql += " AND auth_status = %s"
            params.append(auth_status)
        
        if status:
            sql += " AND status = %s"
            params.append(status)
        
        sql += " ORDER BY is_default DESC, created_at DESC"
        
        cursor.execute(sql, params)
        accounts = cursor.fetchall()
        
        # 隐藏敏感信息
        for account in accounts:
            if account.get('partner_id'):
                # 只显示前4位，其余用***代替
                account['partner_id'] = account['partner_id'][:4] + '***' if len(account['partner_id']) > 4 else account['partner_id']
            # 移除密码和完整token
            account.pop('password', None)
            if account.get('auth_token'):
                account['has_token'] = True
                account['auth_token'] = '***'  # 隐藏完整token
            else:
                account['has_token'] = False
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': accounts,
            'total': len(accounts)
        })
        
    except Exception as e:
        print(f"获取物流账号列表失败: {str(e)}")
        return jsonify({'success': False, 'message': f'获取失败: {str(e)}'}), 500


@tenant_logistics_bp.route('/api/tenant/logistics_accounts', methods=['POST'])
@require_tenant_auth(role='admin')
def create_logistics_account():
    """新增物流账号"""
    try:
        tenant_id = session.get('company_id')
        data = request.json
        
        # 验证必填字段
        required_fields = ['cp_code', 'cp_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'缺少必填字段: {field}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 检查是否已存在相同的物流账号（同一快递公司+同一网点）
        check_sql = """
            SELECT id FROM tenant_logistics_account 
            WHERE tenant_id = %s AND cp_code = %s AND branch_name = %s AND status = 1
        """
        cursor.execute(check_sql, (
            tenant_id, 
            data['cp_code'], 
            data.get('branch_name', '默认网点')
        ))
        existing = cursor.fetchone()
        
        if existing:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False, 
                'message': '该快递公司的该网点已存在，请勿重复添加'
            }), 400
        
        # 插入新物流账号
        insert_sql = """
            INSERT INTO tenant_logistics_account (
                tenant_id, warehouse_id, cp_code, cp_name, branch_name,
                partner_id, account, password, auth_status, is_default, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(insert_sql, (
            tenant_id,
            data.get('warehouse_id'),
            data['cp_code'],
            data['cp_name'],
            data.get('branch_name', '默认网点'),
            data.get('partner_id'),
            data.get('account'),
            data.get('password'),  # TODO: 加密存储
            'unauthorized',  # 初始状态为未授权
            data.get('is_default', 0),
            1  # 启用状态
        ))
        
        account_id = cursor.lastrowid
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '添加成功',
            'account_id': account_id
        })
        
    except Exception as e:
        print(f"创建物流账号失败: {str(e)}")
        return jsonify({'success': False, 'message': f'创建失败: {str(e)}'}), 500


@tenant_logistics_bp.route('/api/tenant/logistics_accounts/<int:account_id>', methods=['PUT'])
@require_tenant_auth(role='admin')
def update_logistics_account(account_id):
    """编辑物流账号"""
    try:
        tenant_id = session.get('company_id')
        data = request.json
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 验证账号归属
        verify_sql = "SELECT id FROM tenant_logistics_account WHERE id = %s AND tenant_id = %s"
        cursor.execute(verify_sql, (account_id, tenant_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '账号不存在或无权限'}), 404
        
        # 更新字段
        update_fields = []
        params = []
        
        allowed_fields = ['cp_name', 'branch_name', 'partner_id', 'account', 'password', 'warehouse_id']
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
        
        if not update_fields:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '没有可更新的字段'}), 400
        
        params.append(account_id)
        params.append(tenant_id)
        
        update_sql = f"""
            UPDATE tenant_logistics_account 
            SET {', '.join(update_fields)}, updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
        """
        
        cursor.execute(update_sql, params)
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '更新成功'})
        
    except Exception as e:
        print(f"更新物流账号失败: {str(e)}")
        return jsonify({'success': False, 'message': f'更新失败: {str(e)}'}), 500


@tenant_logistics_bp.route('/api/tenant/logistics_accounts/<int:account_id>', methods=['DELETE'])
@require_tenant_auth(role='admin')
def delete_logistics_account(account_id):
    """删除物流账号（软删除）"""
    try:
        tenant_id = session.get('company_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 验证账号归属
        verify_sql = "SELECT id FROM tenant_logistics_account WHERE id = %s AND tenant_id = %s"
        cursor.execute(verify_sql, (account_id, tenant_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '账号不存在或无权限'}), 404
        
        # 软删除（设置status=0）
        delete_sql = """
            UPDATE tenant_logistics_account 
            SET status = 0, updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
        """
        
        cursor.execute(delete_sql, (account_id, tenant_id))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '删除成功'})
        
    except Exception as e:
        print(f"删除物流账号失败: {str(e)}")
        return jsonify({'success': False, 'message': f'删除失败: {str(e)}'}), 500


@tenant_logistics_bp.route('/api/tenant/logistics_accounts/<int:account_id>/auth', methods=['POST'])
@require_tenant_auth(role='admin')
def generate_auth_url(account_id):
    """生成菜鸟授权链接"""
    try:
        tenant_id = session.get('company_id')
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 验证账号归属
        verify_sql = """
            SELECT id, cp_code, cp_name, partner_id 
            FROM tenant_logistics_account 
            WHERE id = %s AND tenant_id = %s AND status = 1
        """
        cursor.execute(verify_sql, (account_id, tenant_id))
        account = cursor.fetchone()
        
        if not account:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': '账号不存在或无权限'}), 404
        
        # 获取ISV配置
        cursor.execute("SELECT app_key, app_secret, callback_url FROM cainiao_isv_config WHERE status = 1 LIMIT 1")
        isv_config = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not isv_config or not isv_config['app_key']:
            return jsonify({'success': False, 'message': 'ISV配置未完成，请联系平台管理员'}), 500
        
        # 生成state参数（用于回调时识别租户和账号）
        state = f"tenant_{tenant_id}_account_{account_id}"
        
        # 构建菜鸟授权URL
        # 参考菜鸟文档: https://link.cainiao.com/doc/
        auth_params = {
            'client_id': isv_config['app_key'],
            'redirect_uri': isv_config['callback_url'] or 'https://super.xnamb.cn/api/cainiao_isv/auth/callback',
            'response_type': 'code',
            'state': state,
            'scope': 'all'  # 请求的权限范围
        }
        
        # 菜鸟授权地址
        auth_url = 'https://link.cainiao.com/oauth/authorize?' + urllib.parse.urlencode(auth_params)
        
        return jsonify({
            'success': True,
            'auth_url': auth_url,
            'account_id': account_id,
            'state': state
        })
        
    except Exception as e:
        print(f"生成授权链接失败: {str(e)}")
        return jsonify({'success': False, 'message': f'生成授权链接失败: {str(e)}'}), 500


@tenant_logistics_bp.route('/api/tenant/logistics_accounts/<int:account_id>/test', methods=['POST'])
@require_tenant_auth(role='admin')
def test_logistics_account(account_id):
    """测试物流账号连接（检查授权状态）"""
    try:
        tenant_id = session.get('company_id')
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询账号信息
        cursor.execute("""
            SELECT id, cp_code, cp_name, auth_status, auth_token, auth_expire
            FROM tenant_logistics_account 
            WHERE id = %s AND tenant_id = %s AND status = 1
        """, (account_id, tenant_id))
        
        account = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not account:
            return jsonify({'success': False, 'message': '账号不存在或无权限'}), 404
        
        # 检查授权状态
        if account['auth_status'] != 'authorized':
            return jsonify({
                'success': False,
                'message': '账号未授权',
                'auth_status': account['auth_status']
            })
        
        # 检查token是否过期
        if account['auth_expire']:
            import datetime
            if account['auth_expire'] < datetime.datetime.now():
                return jsonify({
                    'success': False,
                    'message': '授权已过期，请重新授权',
                    'auth_status': 'expired'
                })
        
        # TODO: 调用菜鸟API测试连接
        # 暂时只检查授权状态
        
        return jsonify({
            'success': True,
            'message': '连接正常',
            'auth_status': account['auth_status'],
            'cp_name': account['cp_name']
        })
        
    except Exception as e:
        print(f"测试连接失败: {str(e)}")
        return jsonify({'success': False, 'message': f'测试失败: {str(e)}'}), 500


# ============================================================
# 快递公司枚举API
# ============================================================

@tenant_logistics_bp.route('/api/tenant/express_companies', methods=['GET'])
@require_tenant_auth()
def get_express_companies():
    """获取支持的快递公司列表"""
    companies = [
        {'code': 'ZTO', 'name': '中通快递'},
        {'code': 'YTO', 'name': '圆通快递'},
        {'code': 'YD', 'name': '韵达快递'},
        {'code': 'SF', 'name': '顺丰速运'},
        {'code': 'STO', 'name': '申通快递'},
        {'code': 'HTKY', 'name': '百世快递'},
        {'code': 'JD', 'name': '京东物流'},
        {'code': 'EMS', 'name': 'EMS'},
        {'code': 'YZPY', 'name': '邮政快递包裹'},
        {'code': 'DBL', 'name': '德邦快递'},
    ]
    
    return jsonify({
        'success': True,
        'data': companies
    })
