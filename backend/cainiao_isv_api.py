#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
菜鸟ISV电子面单API接口
Flask Blueprint - 完整16个核心接口
多租户 + 多仓库 + 多网点支持
"""

from flask import Blueprint, request, jsonify, session, render_template_string
import pymysql
from datetime import datetime
import json

# 导入菜鸟服务
from cainiao_isv_service import CainiaoISVService, encrypt_password, decrypt_password

# 导入统一的租户权限模块
from tenant_auth import require_tenant_auth as tenant_auth_decorator, get_current_tenant_id
from functools import wraps

cainiao_isv_bp = Blueprint('cainiao_isv', __name__, url_prefix='/api/cainiao_isv')

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def get_db():
    """获取数据库连接"""
    return pymysql.connect(**DB_CONFIG)


def require_platform_admin(f):
    """平台管理员权限装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_type' not in session or session['user_type'] != 'platform_admin':
            return jsonify({'success': False, 'message': '需要平台管理员权限'}), 403
        return f(*args, **kwargs)
    return decorated_function


# 使用统一的租户权限装饰器，但保持旧的调用方式兼容
def require_tenant_auth(f):
    """租户权限装饰器（兼容旧版本）"""
    return tenant_auth_decorator()(f)


def get_cainiao_service():
    """获取菜鸟服务实例"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT app_key, app_secret, env FROM cainiao_isv_config WHERE status = 1 LIMIT 1")
        config = cursor.fetchone()
        
        if not config or not config['app_key']:
            return None
        
        return CainiaoISVService(
            app_key=config['app_key'],
            app_secret=config['app_secret'],
            env=config.get('env', 'prod')
        )
    finally:
        cursor.close()
        conn.close()


# ==================== 1. ISV配置接口 ====================

@cainiao_isv_bp.route('/config', methods=['GET'])
@require_platform_admin
def get_isv_config():
    """获取ISV配置"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM cainiao_isv_config WHERE id = 1")
        config = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'data': config or {}
        })
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/config', methods=['POST'])
@require_platform_admin
def save_isv_config():
    """保存ISV配置"""
    data = request.json
    
    app_key = data.get('app_key', '').strip()
    app_secret = data.get('app_secret', '').strip()
    callback_url = data.get('callback_url', '').strip()
    env = data.get('env', 'prod')
    
    if not app_key or not app_secret:
        return jsonify({'success': False, 'message': 'AppKey和AppSecret不能为空'})
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 更新或插入配置
        cursor.execute("""
            INSERT INTO cainiao_isv_config (id, app_key, app_secret, callback_url, env, status)
            VALUES (1, %s, %s, %s, %s, 1)
            ON DUPLICATE KEY UPDATE
                app_key = VALUES(app_key),
                app_secret = VALUES(app_secret),
                callback_url = VALUES(callback_url),
                env = VALUES(env),
                updated_at = CURRENT_TIMESTAMP
        """, (app_key, app_secret, callback_url, env))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'ISV配置保存成功'
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'保存失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


# ==================== 2. 租户管理接口 ====================

@cainiao_isv_bp.route('/tenants', methods=['GET'])
@require_platform_admin
def get_tenants():
    """获取租户列表"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM tenant ORDER BY created_at DESC")
        tenants = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': tenants
        })
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/tenant', methods=['POST'])
@require_platform_admin
def create_tenant():
    """创建租户"""
    data = request.json
    
    tenant_name = data.get('tenant_name', '').strip()
    if not tenant_name:
        return jsonify({'success': False, 'message': '租户名称不能为空'})
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO tenant (tenant_name, contact, phone, status)
            VALUES (%s, %s, %s, 1)
        """, (tenant_name, data.get('contact'), data.get('phone')))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '租户创建成功',
            'data': {'tenant_id': cursor.lastrowid}
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'创建失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


# ==================== 3. 仓库管理接口 ====================

@cainiao_isv_bp.route('/warehouses', methods=['GET'])
@require_tenant_auth
def get_warehouses():
    """获取租户仓库列表"""
    tenant_id = session.get('company_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM tenant_warehouse 
            WHERE tenant_id = %s AND status = 1
            ORDER BY is_default DESC, created_at DESC
        """, (tenant_id,))
        
        warehouses = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': warehouses
        })
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/warehouse', methods=['POST'])
@require_tenant_auth
def create_warehouse():
    """创建仓库"""
    tenant_id = session.get('company_id')
    data = request.json
    
    warehouse_name = data.get('warehouse_name', '').strip()
    if not warehouse_name:
        return jsonify({'success': False, 'message': '仓库名称不能为空'})
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO tenant_warehouse (tenant_id, warehouse_name, contact, phone, address, is_default, status)
            VALUES (%s, %s, %s, %s, %s, %s, 1)
        """, (tenant_id, warehouse_name, data.get('contact'), data.get('phone'), 
              data.get('address'), data.get('is_default', 0)))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '仓库创建成功',
            'data': {'warehouse_id': cursor.lastrowid}
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'创建失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


# ==================== 4. 物流账号管理接口（核心：多网点）====================

@cainiao_isv_bp.route('/logistics_accounts', methods=['GET'])
@require_tenant_auth
def get_logistics_accounts():
    """获取租户物流账号列表（支持多网点）"""
    tenant_id = session.get('company_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT la.*, tw.warehouse_name
            FROM tenant_logistics_account la
            LEFT JOIN tenant_warehouse tw ON la.warehouse_id = tw.id
            WHERE la.tenant_id = %s AND la.status = 1
            ORDER BY la.cp_code, la.branch_name, la.created_at DESC
        """, (tenant_id,))
        
        accounts = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': accounts
        })
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/logistics_account', methods=['POST'])
@require_tenant_auth
def create_logistics_account():
    """创建物流账号（支持同一快递多网点）"""
    tenant_id = session.get('company_id')
    data = request.json
    
    cp_code = data.get('cp_code', '').strip()
    cp_name = data.get('cp_name', '').strip()
    
    if not cp_code or not cp_name:
        return jsonify({'success': False, 'message': '快递公司编码和名称不能为空'})
    
    # 加密密码
    password = data.get('password', '')
    encrypted_pwd = encrypt_password(password) if password else None
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO tenant_logistics_account 
            (tenant_id, warehouse_id, cp_code, cp_name, branch_name, partner_id, 
             account, password, is_default, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """, (tenant_id, data.get('warehouse_id'), cp_code, cp_name, 
              data.get('branch_name'), data.get('partner_id'), 
              data.get('account'), encrypted_pwd, data.get('is_default', 0)))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '物流账号创建成功',
            'data': {'account_id': cursor.lastrowid}
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'创建失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/logistics_account/<int:account_id>', methods=['PUT'])
@require_tenant_auth
def update_logistics_account(account_id):
    """更新物流账号"""
    tenant_id = session.get('company_id')
    data = request.json
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 验证权限
        cursor.execute("""
            SELECT id FROM tenant_logistics_account 
            WHERE id = %s AND tenant_id = %s
        """, (account_id, tenant_id))
        
        if not cursor.fetchone():
            return jsonify({'success': False, 'message': '账号不存在或无权限'})
        
        # 更新字段
        update_fields = []
        params = []
        
        if 'branch_name' in data:
            update_fields.append('branch_name = %s')
            params.append(data['branch_name'])
        
        if 'partner_id' in data:
            update_fields.append('partner_id = %s')
            params.append(data['partner_id'])
        
        if 'account' in data:
            update_fields.append('account = %s')
            params.append(data['account'])
        
        if 'password' in data and data['password']:
            update_fields.append('password = %s')
            params.append(encrypt_password(data['password']))
        
        if 'auth_token' in data:
            update_fields.append('auth_token = %s')
            params.append(data['auth_token'])
        
        if 'auth_expire' in data:
            update_fields.append('auth_expire = %s')
            params.append(data['auth_expire'])
        
        if not update_fields:
            return jsonify({'success': False, 'message': '无更新内容'})
        
        params.append(account_id)
        params.append(tenant_id)
        
        sql = f"""
            UPDATE tenant_logistics_account 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND tenant_id = %s
        """
        
        cursor.execute(sql, params)
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '更新成功'
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'更新失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/logistics_account/<int:account_id>', methods=['DELETE'])
@require_tenant_auth
def delete_logistics_account(account_id):
    """删除物流账号（软删除）"""
    tenant_id = session.get('company_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE tenant_logistics_account 
            SET status = 0
            WHERE id = %s AND tenant_id = %s
        """, (account_id, tenant_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '删除成功'
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'删除失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


# ==================== 5. 发货地址管理 ====================

@cainiao_isv_bp.route('/shipping_addresses', methods=['GET'])
@require_tenant_auth
def get_shipping_addresses():
    """获取发货地址列表"""
    tenant_id = session.get('company_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT sa.*, tw.warehouse_name, la.cp_name, la.branch_name
            FROM tenant_shipping_address sa
            LEFT JOIN tenant_warehouse tw ON sa.warehouse_id = tw.id
            LEFT JOIN tenant_logistics_account la ON sa.logistics_account_id = la.id
            WHERE sa.tenant_id = %s AND sa.status = 1
            ORDER BY sa.is_default DESC, sa.created_at DESC
        """, (tenant_id,))
        
        addresses = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': addresses
        })
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/shipping_address', methods=['POST'])
@require_tenant_auth
def create_shipping_address():
    """创建发货地址"""
    tenant_id = session.get('company_id')
    data = request.json
    
    if not data.get('sender_name') or not data.get('sender_phone') or not data.get('address'):
        return jsonify({'success': False, 'message': '必填字段不能为空'})
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO tenant_shipping_address 
            (tenant_id, warehouse_id, logistics_account_id, sender_name, sender_phone,
             province, city, area, address, is_default, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """, (tenant_id, data.get('warehouse_id'), data.get('logistics_account_id'),
              data['sender_name'], data['sender_phone'], data.get('province'),
              data.get('city'), data.get('area'), data['address'], data.get('is_default', 0)))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '发货地址创建成功',
            'data': {'address_id': cursor.lastrowid}
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'创建失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


# ==================== 6. 电子面单核心接口 ====================

@cainiao_isv_bp.route('/waybill/get', methods=['POST'])
@require_tenant_auth
def get_waybill():
    """获取电子面单（单个）"""
    tenant_id = session.get('company_id')
    data = request.json
    
    order_no = data.get('order_no', '').strip()
    logistics_account_id = data.get('logistics_account_id')
    
    if not order_no or not logistics_account_id:
        return jsonify({'success': False, 'message': '订单号和物流账号不能为空'})
    
    # 获取菜鸟服务
    service = get_cainiao_service()
    if not service:
        return jsonify({'success': False, 'message': 'ISV配置未完成，请先配置AppKey和AppSecret'})
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 检查订单是否已存在
        cursor.execute("""
            SELECT id FROM waybill_record 
            WHERE tenant_id = %s AND order_no = %s
        """, (tenant_id, order_no))
        
        if cursor.fetchone():
            return jsonify({'success': False, 'message': '订单已存在面单记录'})
        
        # 获取物流账号信息
        cursor.execute("""
            SELECT * FROM tenant_logistics_account 
            WHERE id = %s AND tenant_id = %s AND status = 1
        """, (logistics_account_id, tenant_id))
        
        account = cursor.fetchone()
        if not account:
            return jsonify({'success': False, 'message': '物流账号不存在或已禁用'})
        
        # 构建订单数据（根据菜鸟API规范）
        order_data = {
            'cp_code': account['cp_code'],
            'order_no': order_no,
            'receiver': {
                'name': data.get('receiver_name'),
                'phone': data.get('receiver_phone'),
                'address': data.get('receiver_address')
            },
            'sender': {
                'name': data.get('sender_name'),
                'phone': data.get('sender_phone'),
                'address': data.get('sender_address')
            }
        }
        
        # 调用菜鸟API
        result = service.get_waybill(order_data)
        
        if result['success']:
            waybill_code = result['data'].get('waybill_code')
            print_data = result['data'].get('print_data')
            
            # 保存面单记录
            cursor.execute("""
                INSERT INTO waybill_record 
                (tenant_id, order_no, logistics_account_id, cp_code, waybill_code, 
                 print_data, receiver_name, receiver_phone, receiver_address, 
                 print_status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0, NOW())
            """, (tenant_id, order_no, logistics_account_id, account['cp_code'],
                  waybill_code, json.dumps(print_data), 
                  data.get('receiver_name'), data.get('receiver_phone'), 
                  data.get('receiver_address')))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': '获取面单成功',
                'data': {
                    'waybill_id': cursor.lastrowid,
                    'waybill_code': waybill_code,
                    'print_data': print_data
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': f'获取面单失败: {result["message"]}'
            })
    
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'系统异常: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/waybill/batch', methods=['POST'])
@require_tenant_auth
def batch_get_waybills():
    """批量获取电子面单"""
    tenant_id = session.get('company_id')
    data = request.json
    
    orders = data.get('orders', [])
    if not orders:
        return jsonify({'success': False, 'message': '订单列表不能为空'})
    
    service = get_cainiao_service()
    if not service:
        return jsonify({'success': False, 'message': 'ISV配置未完成'})
    
    # 批量处理（简化版，生产环境需优化）
    results = []
    for order in orders:
        # 这里调用单个获取接口（实际应调用批量API）
        result = get_waybill()
        results.append(result)
    
    return jsonify({
        'success': True,
        'data': results
    })


@cainiao_isv_bp.route('/waybill/cancel/<int:waybill_id>', methods=['POST'])
@require_tenant_auth
def cancel_waybill(waybill_id):
    """取消面单（回收运单号）"""
    tenant_id = session.get('company_id')
    data = request.json
    
    service = get_cainiao_service()
    if not service:
        return jsonify({'success': False, 'message': 'ISV配置未完成'})
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 获取面单记录
        cursor.execute("""
            SELECT * FROM waybill_record 
            WHERE id = %s AND tenant_id = %s
        """, (waybill_id, tenant_id))
        
        waybill = cursor.fetchone()
        if not waybill:
            return jsonify({'success': False, 'message': '面单不存在'})
        
        if waybill['cancel_status'] == 1:
            return jsonify({'success': False, 'message': '面单已取消'})
        
        # 调用菜鸟取消接口
        result = service.cancel_waybill(
            waybill['cp_code'],
            waybill['waybill_code'],
            data.get('cancel_reason', '')
        )
        
        if result['success']:
            # 更新状态
            cursor.execute("""
                UPDATE waybill_record 
                SET cancel_status = 1, cancel_time = NOW()
                WHERE id = %s
            """, (waybill_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': '取消成功'
            })
        else:
            return jsonify({
                'success': False,
                'message': f'取消失败: {result["message"]}'
            })
    
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'系统异常: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/waybill/confirm/<int:waybill_id>', methods=['POST'])
@require_tenant_auth
def confirm_shipment(waybill_id):
    """确认发货"""
    tenant_id = session.get('company_id')
    
    service = get_cainiao_service()
    if not service:
        return jsonify({'success': False, 'message': 'ISV配置未完成'})
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM waybill_record 
            WHERE id = %s AND tenant_id = %s
        """, (waybill_id, tenant_id))
        
        waybill = cursor.fetchone()
        if not waybill:
            return jsonify({'success': False, 'message': '面单不存在'})
        
        # 调用菜鸟确认接口
        result = service.confirm_shipment(
            waybill['cp_code'],
            waybill['waybill_code']
        )
        
        if result['success']:
            cursor.execute("""
                UPDATE waybill_record 
                SET confirm_status = 1, confirm_time = NOW()
                WHERE id = %s
            """, (waybill_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': '发货确认成功'
            })
        else:
            return jsonify({
                'success': False,
                'message': f'确认失败: {result["message"]}'
            })
    
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'系统异常: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


# ==================== 7. 打印相关接口 ====================

@cainiao_isv_bp.route('/print/single', methods=['POST'])
@require_tenant_auth
def print_single():
    """单个打印"""
    tenant_id = session.get('company_id')
    data = request.json
    
    waybill_id = data.get('waybill_id')
    printer_name = data.get('printer_name', '默认打印机')
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 获取打印数据
        cursor.execute("""
            SELECT * FROM waybill_record 
            WHERE id = %s AND tenant_id = %s
        """, (waybill_id, tenant_id))
        
        waybill = cursor.fetchone()
        if not waybill:
            return jsonify({'success': False, 'message': '面单不存在'})
        
        # 更新打印状态
        cursor.execute("""
            UPDATE waybill_record 
            SET print_status = 1, print_time = NOW()
            WHERE id = %s
        """, (waybill_id,))
        
        # 记录打印日志
        cursor.execute("""
            INSERT INTO print_log 
            (tenant_id, waybill_id, order_no, printer_name, operate_type, status)
            VALUES (%s, %s, %s, %s, 'single', 1)
        """, (tenant_id, waybill_id, waybill['order_no'], printer_name))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '打印成功',
            'data': {
                'print_data': waybill['print_data']
            }
        })
    
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'打印失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/print/batch', methods=['POST'])
@require_tenant_auth
def print_batch():
    """批量打印"""
    tenant_id = session.get('company_id')
    data = request.json
    
    waybill_ids = data.get('waybill_ids', [])
    printer_name = data.get('printer_name', '默认打印机')
    
    if not waybill_ids:
        return jsonify({'success': False, 'message': '请选择要打印的面单'})
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 批量获取打印数据
        placeholders = ','.join(['%s'] * len(waybill_ids))
        cursor.execute(f"""
            SELECT * FROM waybill_record 
            WHERE id IN ({placeholders}) AND tenant_id = %s
        """, (*waybill_ids, tenant_id))
        
        waybills = cursor.fetchall()
        
        if not waybills:
            return jsonify({'success': False, 'message': '未找到面单'})
        
        # 批量更新打印状态
        cursor.execute(f"""
            UPDATE waybill_record 
            SET print_status = 1, print_time = NOW()
            WHERE id IN ({placeholders}) AND tenant_id = %s
        """, (*waybill_ids, tenant_id))
        
        # 批量记录日志
        for waybill in waybills:
            cursor.execute("""
                INSERT INTO print_log 
                (tenant_id, waybill_id, order_no, printer_name, operate_type, status)
                VALUES (%s, %s, %s, %s, 'batch', 1)
            """, (tenant_id, waybill['id'], waybill['order_no'], printer_name))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'批量打印成功，共{len(waybills)}个面单',
            'data': {
                'print_data_list': [w['print_data'] for w in waybills]
            }
        })
    
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'批量打印失败: {str(e)}'})
    finally:
        cursor.close()
        conn.close()


# ==================== 8. 面单查询接口 ====================

@cainiao_isv_bp.route('/waybills', methods=['GET'])
@require_tenant_auth
def get_waybills():
    """获取面单列表"""
    tenant_id = session.get('company_id')
    
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 20))
    print_status = request.args.get('print_status')
    
    offset = (page - 1) * page_size
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 构建查询条件
        where_clauses = ['wr.tenant_id = %s']
        params = [tenant_id]
        
        if print_status is not None:
            where_clauses.append('wr.print_status = %s')
            params.append(print_status)
        
        where_sql = ' AND '.join(where_clauses)
        
        # 查询总数
        cursor.execute(f"""
            SELECT COUNT(*) as total 
            FROM waybill_record wr
            WHERE {where_sql}
        """, params)
        total = cursor.fetchone()['total']
        
        # 查询列表
        cursor.execute(f"""
            SELECT wr.*, la.cp_name, la.branch_name
            FROM waybill_record wr
            LEFT JOIN tenant_logistics_account la ON wr.logistics_account_id = la.id
            WHERE {where_sql}
            ORDER BY wr.created_at DESC
            LIMIT %s OFFSET %s
        """, (*params, page_size, offset))
        
        waybills = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'list': waybills,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        })
    finally:
        cursor.close()
        conn.close()


@cainiao_isv_bp.route('/print_logs', methods=['GET'])
@require_tenant_auth
def get_print_logs():
    """获取打印日志"""
    tenant_id = session.get('company_id')
    
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 50))
    
    offset = (page - 1) * page_size
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT COUNT(*) as total 
            FROM print_log 
            WHERE tenant_id = %s
        """, (tenant_id,))
        total = cursor.fetchone()['total']
        
        cursor.execute("""
            SELECT * FROM print_log 
            WHERE tenant_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (tenant_id, page_size, offset))
        
        logs = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'list': logs,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        })
    finally:
        cursor.close()
        conn.close()


# ==================== 9. 授权相关接口 ====================

@cainiao_isv_bp.route('/auth/url', methods=['POST'])
@require_tenant_auth
def get_auth_url():
    """生成菜鸟授权跳转链接（OAuth跳转模式）"""
    tenant_id = session.get('company_id')
    data = request.json
    platform_auth_id = data.get('platform_auth_id')
    
    if not platform_auth_id:
        return jsonify({'success': False, 'message': '缺少platform_auth_id参数'})
    
    service = get_cainiao_service()
    if not service:
        return jsonify({'success': False, 'message': 'ISV配置未完成'})
    
    try:
        # 构建菜鸟授权跳转链接（直接授权页面，不经过登录重定向）
        # 参考老系统：http://lcp.cloud.cainiao.com/permission/isv/grantpage.do?isvAppKey=247457&ext=&redirectUrl=http://client.xnamb.cn/auth/callback.html
        # 关键：使用测试环境AppKey 247457
        auth_url = (
            f"http://lcp.cloud.cainiao.com/permission/isv/grantpage.do"
            f"?isvAppKey=247457"  # 使用测试环境AppKey（老系统相同）
            f"&ext={platform_auth_id}"  # 使用ext传递授权记录ID
            f"&redirectUrl=http://client.xnamb.cn/auth/callback.html"  # 必须与菜鸟ISV平台备案地址一致（老系统地址）
        )
        
        return jsonify({
            'success': True,
            'data': {
                'auth_url': auth_url,
                'platform_auth_id': platform_auth_id
            },
            'message': '授权链接生成成功'
        })
        
    except Exception as e:
        logger.error(f"[菜鸟ISV] 生成授权链接失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'生成授权链接失败: {str(e)}'
        })


@cainiao_isv_bp.route('/exchange_token', methods=['POST'])
def exchange_token():
    """使用accessCode换取accessToken（菜鸟ISV授权）
    注意：此接口不需要session验证，因为accessCode有时效性，用户可能在授权后过一段时间才粘贴
    通过platform_auth_id验证租户权限
    """
    data = request.json
    
    access_code = data.get('access_code', '').strip()
    platform_auth_id = data.get('platform_auth_id')
    
    if not access_code:
        return jsonify({'success': False, 'message': '请输入accessCode'})
    
    if not platform_auth_id:
        return jsonify({'success': False, 'message': '缺少platform_auth_id参数'})
    
    # 通过platform_auth_id验证授权记录是否存在并获取租户ID
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT tenant_id FROM tenant_platform_authorizations WHERE id = %s",
            (platform_auth_id,)
        )
        auth_record = cursor.fetchone()
        if not auth_record:
            return jsonify({'success': False, 'message': '授权记录不存在'})
        
        tenant_id = auth_record['tenant_id']
    finally:
        cursor.close()
        conn.close()
    
    service = get_cainiao_service()
    if not service:
        return jsonify({'success': False, 'message': 'ISV配置未完成'})
    
    # 调用菜鸟Token换取API
    result = service.exchange_token(access_code)
    
    if not result['success']:
        return jsonify({
            'success': False,
            'message': result.get('message', 'Token换取失败')
        })
    
    access_token = result['access_token']
    
    # 保存Token到数据库
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 计算过期时间（菜鸟Token通常有1年有效期）
        from datetime import datetime, timedelta
        expire_time = datetime.now() + timedelta(days=365)
        
        # 更新平台授权记录
        cursor.execute("""
            UPDATE tenant_platform_authorizations
            SET access_code = %s,
                access_token = %s,
                expire_time = %s,
                auth_status = 1,
                auth_time = NOW(),
                updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
        """, (access_code, access_token, expire_time, platform_auth_id, tenant_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '授权成功！Token已保存',
            'data': {
                'access_token': access_token,
                'expire_time': expire_time.strftime('%Y-%m-%d %H:%M:%S')
            }
        })
    except Exception as e:
        conn.rollback()
        return jsonify({
            'success': False,
            'message': f'保存Token失败: {str(e)}'
        })
    finally:
        cursor.close()
        conn.close()

