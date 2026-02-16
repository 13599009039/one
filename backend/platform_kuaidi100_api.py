#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快递100物流服务商API
提供配置管理、连接测试、订单创建等接口
所有接口需平台管理员权限
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps
import pymysql
from datetime import datetime
import json
from platform_kuaidi100_service import Kuaidi100Service

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

# 创建Blueprint
platform_kuaidi100_bp = Blueprint('platform_kuaidi100', __name__, url_prefix='/api/platform/kuaidi100')


# ==================== 权限装饰器 ====================

def require_platform_admin(f):
    """平台管理员权限装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        user_type = session.get('user_type')
        if user_type != 'platform_admin':
            return jsonify({
                'success': False,
                'message': '无权限访问此功能，需要平台管理员权限'
            }), 403

        return f(*args, **kwargs)
    return decorated_function


# ==================== 快递100账号配置 ====================

@platform_kuaidi100_bp.route('/config', methods=['GET'])
@require_platform_admin
def get_config():
    """获取快递100账号配置"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM platform_kuaidi100_config ORDER BY id DESC LIMIT 1")
        config = cursor.fetchone()
        
        if config:
            # 隐藏敏感信息
            config['auth_key'] = '******' if config.get('auth_key') else ''
            config['secret'] = '******' if config.get('secret') else ''
            config['callback_secret'] = '******' if config.get('callback_secret') else ''
            
            return jsonify({
                'success': True,
                'data': config
            })
        else:
            return jsonify({
                'success': True,
                'data': None,
                'message': '尚未配置'
            })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_kuaidi100_bp.route('/config', methods=['POST'])
@require_platform_admin
def save_config():
    """保存/更新快递100账号配置"""
    try:
        data = request.json
        customer = data.get('customer', '').strip()
        auth_key = data.get('auth_key', '').strip()
        secret = data.get('secret', '').strip()
        endpoint_url = data.get('endpoint_url', 'https://poll.kuaidi100.com').strip()
        sign_method = data.get('sign_method', 'md5')
        callback_url = data.get('callback_url', '').strip()
        callback_secret = data.get('callback_secret', '').strip()
        
        if not customer or not auth_key or not secret:
            return jsonify({'success': False, 'message': '客户编码、授权Key和签名密钥不能为空'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 检查是否已有配置
        cursor.execute("SELECT id FROM platform_kuaidi100_config LIMIT 1")
        existing = cursor.fetchone()
        
        if existing:
            # 更新配置（只在不是******时更新密钥）
            update_fields = [
                "customer=%s",
                "endpoint_url=%s",
                "sign_method=%s",
                "callback_url=%s",
                "status='enabled'",
                "updated_at=NOW()"
            ]
            update_values = [customer, endpoint_url, sign_method, callback_url]
            
            if auth_key and auth_key != '******':
                update_fields.append("auth_key=%s")
                update_values.append(auth_key)
            
            if secret and secret != '******':
                update_fields.append("secret=%s")
                update_values.append(secret)
            
            if callback_secret and callback_secret != '******':
                update_fields.append("callback_secret=%s")
                update_values.append(callback_secret)
            
            sql = f"UPDATE platform_kuaidi100_config SET {', '.join(update_fields)} WHERE id=%s"
            update_values.append(existing['id'])
            cursor.execute(sql, tuple(update_values))
        else:
            # 新增配置
            cursor.execute("""
                INSERT INTO platform_kuaidi100_config
                (customer, auth_key, secret, endpoint_url, sign_method, callback_url, callback_secret, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'enabled')
            """, (customer, auth_key, secret, endpoint_url, sign_method, callback_url, callback_secret))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': '配置保存成功'
        })
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_kuaidi100_bp.route('/config/test', methods=['POST'])
@require_platform_admin
def test_connection():
    """测试快递100接口连通性"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 读取配置
        cursor.execute("SELECT * FROM platform_kuaidi100_config ORDER BY id DESC LIMIT 1")
        config = cursor.fetchone()
        
        if not config:
            return jsonify({'success': False, 'message': '请先配置快递100账号信息'}), 400
        
        # 创建服务实例并测试
        service = Kuaidi100Service(
            customer=config['customer'],
            auth_key=config['auth_key'],
            secret=config['secret'],
            endpoint_url=config['endpoint_url']
        )
        
        result = service.test_connection()
        
        # 更新测试结果
        cursor.execute("""
            UPDATE platform_kuaidi100_config
            SET test_passed=%s, last_test_at=NOW(), test_error=%s
            WHERE id=%s
        """, (1 if result['success'] else 0, result.get('message', ''), config['id']))
        conn.commit()
        
        # 记录日志
        _log_api_call(cursor, 'test_connection', result, None, None)
        conn.commit()
        
        return jsonify(result)
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 物流查询接口 ====================

@platform_kuaidi100_bp.route('/query', methods=['POST'])
@require_platform_admin
def query_express():
    """实时查询物流轨迹"""
    try:
        data = request.json
        com = data.get('com')  # 快递公司编码
        num = data.get('num')  # 快递单号
        phone = data.get('phone', '')  # 手机号后四位（顺丰必填）
        
        if not com or not num:
            return jsonify({'success': False, 'message': '快递公司编码和单号不能为空'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 读取配置
        cursor.execute("SELECT * FROM platform_kuaidi100_config WHERE status='enabled' LIMIT 1")
        config = cursor.fetchone()
        
        if not config:
            return jsonify({'success': False, 'message': '快递100账号未配置'}), 400
        
        # 调用服务
        service = Kuaidi100Service(
            customer=config['customer'],
            auth_key=config['auth_key'],
            secret=config['secret'],
            endpoint_url=config['endpoint_url']
        )
        
        result = service.query_express(com, num, phone)
        
        # 记录日志
        _log_api_call(cursor, 'query_express', result, None, None)
        conn.commit()
        
        return jsonify(result)
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 工具函数 ====================

def _log_api_call(cursor, api_method, result, tenant_id=None, order_id=None):
    """记录API调用日志"""
    try:
        cursor.execute("""
            INSERT INTO platform_kuaidi100_logs
            (api_method, request_id, response_time, duration_ms, success, 
             response_code, response_message, error_type, tenant_id, order_id, response_data)
            VALUES (%s, %s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            api_method,
            result.get('request_id'),
            result.get('duration_ms'),
            1 if result.get('success') else 0,
            result.get('code'),
            result.get('message'),
            result.get('error_type'),
            tenant_id,
            order_id,
            json.dumps(result.get('data'), ensure_ascii=False) if result.get('data') else None
        ))
    except Exception as e:
        print(f"日志记录失败: {e}")


# ==================== 电子面单下单接口 ====================

@platform_kuaidi100_bp.route('/order/create', methods=['POST'])
@require_platform_admin
def create_waybill_order():
    """创建电子面单订单"""
    try:
        data = request.json
        
        # 必填字段验证
        required_fields = ['kuaidicom', 'recman_name', 'recman_mobile', 'recman_address',
                          'sendman_name', 'sendman_mobile', 'sendman_address']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'缺少必填字段: {field}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取快递100配置
        cursor.execute("SELECT * FROM platform_kuaidi100_config WHERE status='enabled' LIMIT 1")
        config = cursor.fetchone()
        
        if not config:
            return jsonify({'success': False, 'message': '快递100账号未配置'}), 400
        
        # 构造电子面单请求参数
        order_data = {
            'kuaidicom': data['kuaidicom'],
            'recMan': {
                'name': data['recman_name'],
                'mobile': data['recman_mobile'],
                'printAddr': data['recman_address']
            },
            'sendMan': {
                'name': data['sendman_name'],
                'mobile': data['sendman_mobile'],
                'printAddr': data['sendman_address']
            },
            'cargo': data.get('cargo', '商品'),
            'count': data.get('count', 1),
            'weight': data.get('weight'),
            'remark': data.get('remark', '')
        }
        
        # 调用服务创建面单
        service = Kuaidi100Service(
            customer=config['customer'],
            auth_key=config['auth_key'],
            secret=config['secret'],
            endpoint_url=config['endpoint_url']
        )
        
        result = service.create_waybill(order_data)
        
        # 保存订单到数据库
        if result['success']:
            order_id = result['data'].get('order_id', '')
            waybill_no = result['data'].get('waybill_no', '')
            
            cursor.execute("""
                INSERT INTO platform_kuaidi100_orders
                (order_id, kuaidicom, recman_name, recman_mobile, recman_printaddr,
                 sendman_name, sendman_mobile, sendman_printaddr, cargo, weight, 
                 remark, waybill_no, waybill_status, print_data, status, fee)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                order_id, data['kuaidicom'],
                data['recman_name'], data['recman_mobile'], data['recman_address'],
                data['sendman_name'], data['sendman_mobile'], data['sendman_address'],
                data.get('cargo'), data.get('weight'), data.get('remark'),
                waybill_no, 'unused',
                json.dumps(result['data'], ensure_ascii=False),
                'created', result['data'].get('fee')
            ))
            conn.commit()
        
        # 记录日志
        _log_api_call(cursor, 'create_waybill', result, None, None)
        conn.commit()
        
        return jsonify(result)
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 订单列表查询 ====================

@platform_kuaidi100_bp.route('/orders', methods=['GET'])
@require_platform_admin
def get_orders():
    """获取电子面单订单列表"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        status = request.args.get('status', '')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 构造查询条件
        where_clause = "1=1"
        params = []
        if status:
            where_clause += " AND status=%s"
            params.append(status)
        
        # 查询总数
        cursor.execute(f"SELECT COUNT(*) as total FROM platform_kuaidi100_orders WHERE {where_clause}", params)
        total = cursor.fetchone()['total']
        
        # 分页查询
        offset = (page - 1) * page_size
        cursor.execute(f"""
            SELECT * FROM platform_kuaidi100_orders 
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        
        orders = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'orders': orders,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()
