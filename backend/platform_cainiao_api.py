#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SaaS平台物流控制台API
对接菜鸟物流云，管理快递订单
所有接口需平台管理员权限
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps
import pymysql
from datetime import datetime, date
import json
import uuid

# 数据库配置（与app.py保持一致）
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

# 创建Blueprint
platform_cainiao_bp = Blueprint('platform_cainiao', __name__, url_prefix='/api/platform/cainiao')


# ==================== 权限装饰器 ====================

def require_platform_admin(f):
    """
    平台管理员权限装饰器
    只允许平台管理员(backend/app.py 登录逻辑中的 user_type=platform_admin)访问
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. 检查是否登录
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': '请先登录'}), 401

        # 2. 检查用户类型是否为平台管理员
        user_type = session.get('user_type')
        if user_type != 'platform_admin':
            return jsonify({
                'success': False,
                'message': '无权限访问此功能，需要平台管理员权限'
            }), 403

        # 通过验证，继续执行
        return f(*args, **kwargs)
    return decorated_function


# ==================== 菜鸟账号配置 ====================

@platform_cainiao_bp.route('/config', methods=['GET'])
@require_platform_admin
def get_config():
    """获取菜鸟账号配置"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM platform_cainiao_config ORDER BY id DESC LIMIT 1")
        config = cursor.fetchone()
        
        if config:
            # 隐藏敏感信息
            if config.get('app_secret'):
                config['app_secret'] = '******'
            if config.get('callback_secret'):
                config['callback_secret'] = '******'
        
        return jsonify({
            'success': True,
            'data': config
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/config', methods=['POST'])
@require_platform_admin
def save_config():
    """保存/更新菜鸟账号配置"""
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 检查是否已有配置
        cursor.execute("SELECT id FROM platform_cainiao_config LIMIT 1")
        existing = cursor.fetchone()
        
        user_id = session.get('user_id')
        
        if existing:
            # 更新配置
            update_fields = []
            update_values = []
            
            if data.get('app_key'):
                update_fields.append('app_key=%s')
                update_values.append(data['app_key'])
            
            # 只有非******时才更新密钥
            if data.get('app_secret') and data['app_secret'] != '******':
                update_fields.append('app_secret=%s')
                update_values.append(data['app_secret'])
            
            if data.get('endpoint_url'):
                update_fields.append('endpoint_url=%s')
                update_values.append(data['endpoint_url'])
            
            if data.get('sign_method'):
                update_fields.append('sign_method=%s')
                update_values.append(data['sign_method'])
            
            if data.get('callback_url'):
                update_fields.append('callback_url=%s')
                update_values.append(data['callback_url'])
            
            if data.get('callback_secret') and data['callback_secret'] != '******':
                update_fields.append('callback_secret=%s')
                update_values.append(data['callback_secret'])
            
            if 'status' in data:
                update_fields.append('status=%s')
                update_values.append(data['status'])
            
            update_fields.append('updated_by=%s')
            update_values.append(user_id)
            
            update_values.append(existing['id'])
            
            cursor.execute(
                f"UPDATE platform_cainiao_config SET {', '.join(update_fields)} WHERE id=%s",
                update_values
            )
        else:
            # 新增配置
            cursor.execute("""
                INSERT INTO platform_cainiao_config 
                (app_key, app_secret, endpoint_url, sign_method, callback_url, callback_secret, status, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data.get('app_key'),
                data.get('app_secret'),
                data.get('endpoint_url', 'https://link.cainiao.com/gateway/link.do'),
                data.get('sign_method', 'md5'),
                data.get('callback_url'),
                data.get('callback_secret'),
                data.get('status', 'enabled'),
                user_id
            ))
        
        conn.commit()
        return jsonify({'success': True, 'message': '配置保存成功'})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/config/test', methods=['POST'])
@require_platform_admin
def test_connection():
    """测试接口连通性"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取配置
        cursor.execute("SELECT * FROM platform_cainiao_config LIMIT 1")
        config = cursor.fetchone()
        
        if not config:
            return jsonify({'success': False, 'message': '请先配置菜鸟账号'}), 400
        
        if not config.get('app_key') or not config.get('app_secret'):
            return jsonify({'success': False, 'message': 'AppKey或AppSecret未配置'}), 400
        
        # 导入服务类
        from platform_cainiao_service import CainiaoService
        
        service = CainiaoService(
            app_key=config['app_key'],
            app_secret=config['app_secret'],
            endpoint_url=config.get('endpoint_url'),
            sign_method=config.get('sign_method', 'md5')
        )
        
        result = service.test_connection()
        
        # 更新测试状态
        cursor.execute("""
            UPDATE platform_cainiao_config 
            SET test_passed=%s, last_test_at=%s, test_error=%s
            WHERE id=%s
        """, (
            1 if result['success'] else 0,
            datetime.now(),
            None if result['success'] else result.get('message'),
            config['id']
        ))
        conn.commit()
        
        return jsonify({
            'success': result['success'],
            'message': result['message'],
            'duration_ms': result.get('duration_ms', 0)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 快递规则配置 ====================

@platform_cainiao_bp.route('/rules', methods=['GET'])
@require_platform_admin
def get_rules():
    """获取规则列表"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        offset = (page - 1) * page_size
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取总数
        cursor.execute("SELECT COUNT(*) as total FROM platform_express_rules")
        total = cursor.fetchone()['total']
        
        # 获取列表
        cursor.execute("""
            SELECT * FROM platform_express_rules 
            ORDER BY is_default DESC, id DESC 
            LIMIT %s OFFSET %s
        """, (page_size, offset))
        rules = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'items': rules,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/rules', methods=['POST'])
@require_platform_admin
def create_rule():
    """新增规则"""
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 如果设为默认，先取消其他默认
        if data.get('is_default'):
            cursor.execute("UPDATE platform_express_rules SET is_default=0 WHERE is_default=1")
        
        cursor.execute("""
            INSERT INTO platform_express_rules 
            (rule_name, cp_code, cp_name, sender_name, sender_phone, 
             sender_province, sender_city, sender_district, sender_town, sender_address,
             service_type, pay_method, is_default, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('rule_name'),
            data.get('cp_code'),
            data.get('cp_name'),
            data.get('sender_name'),
            data.get('sender_phone'),
            data.get('sender_province'),
            data.get('sender_city'),
            data.get('sender_district'),
            data.get('sender_town'),
            data.get('sender_address'),
            data.get('service_type', 'STANDARD'),
            data.get('pay_method', 'PREPAY'),
            1 if data.get('is_default') else 0,
            data.get('status', 'enabled')
        ))
        
        conn.commit()
        return jsonify({'success': True, 'message': '规则创建成功', 'id': cursor.lastrowid})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/rules/<int:rule_id>', methods=['PUT'])
@require_platform_admin
def update_rule(rule_id):
    """更新规则"""
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 如果设为默认，先取消其他默认
        if data.get('is_default'):
            cursor.execute("UPDATE platform_express_rules SET is_default=0 WHERE is_default=1 AND id!=%s", (rule_id,))
        
        cursor.execute("""
            UPDATE platform_express_rules SET
            rule_name=%s, cp_code=%s, cp_name=%s, sender_name=%s, sender_phone=%s,
            sender_province=%s, sender_city=%s, sender_district=%s, sender_town=%s, sender_address=%s,
            service_type=%s, pay_method=%s, is_default=%s, status=%s
            WHERE id=%s
        """, (
            data.get('rule_name'),
            data.get('cp_code'),
            data.get('cp_name'),
            data.get('sender_name'),
            data.get('sender_phone'),
            data.get('sender_province'),
            data.get('sender_city'),
            data.get('sender_district'),
            data.get('sender_town'),
            data.get('sender_address'),
            data.get('service_type', 'STANDARD'),
            data.get('pay_method', 'PREPAY'),
            1 if data.get('is_default') else 0,
            data.get('status', 'enabled'),
            rule_id
        ))
        
        conn.commit()
        return jsonify({'success': True, 'message': '规则更新成功'})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/rules/<int:rule_id>', methods=['DELETE'])
@require_platform_admin
def delete_rule(rule_id):
    """删除规则"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM platform_express_rules WHERE id=%s", (rule_id,))
        conn.commit()
        
        return jsonify({'success': True, 'message': '规则已删除'})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 快递订单管理 ====================

@platform_cainiao_bp.route('/orders', methods=['GET'])
@require_platform_admin
def get_orders():
    """获取快递订单列表"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        offset = (page - 1) * page_size
        
        # 筛选条件
        status = request.args.get('status')
        tenant_id = request.args.get('tenant_id')
        cp_code = request.args.get('cp_code')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 构建查询条件
        conditions = ['1=1']
        params = []
        
        if status:
            conditions.append('status=%s')
            params.append(status)
        if tenant_id:
            conditions.append('tenant_id=%s')
            params.append(tenant_id)
        if cp_code:
            conditions.append('cp_code=%s')
            params.append(cp_code)
        if start_date:
            conditions.append('DATE(created_at)>=%s')
            params.append(start_date)
        if end_date:
            conditions.append('DATE(created_at)<=%s')
            params.append(end_date)
        if search:
            conditions.append('(waybill_no LIKE %s OR mail_no LIKE %s OR sender_name LIKE %s OR receiver_name LIKE %s)')
            search_param = f'%{search}%'
            params.extend([search_param, search_param, search_param, search_param])
        
        where_clause = ' AND '.join(conditions)
        
        # 获取总数
        cursor.execute(f"SELECT COUNT(*) as total FROM platform_express_orders WHERE {where_clause}", params)
        total = cursor.fetchone()['total']
        
        # 获取列表
        cursor.execute(f"""
            SELECT * FROM platform_express_orders 
            WHERE {where_clause}
            ORDER BY created_at DESC 
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        orders = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'items': json.loads(json.dumps(orders, default=json_serial)),
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/orders/<int:order_id>', methods=['GET'])
@require_platform_admin
def get_order_detail(order_id):
    """获取订单详情"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM platform_express_orders WHERE id=%s", (order_id,))
        order = cursor.fetchone()
        
        if not order:
            return jsonify({'success': False, 'message': '订单不存在'}), 404
        
        return jsonify({
            'success': True,
            'data': json.loads(json.dumps(order, default=json_serial))
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/orders/create', methods=['POST'])
@require_platform_admin
def create_order():
    """创建快递订单"""
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        user_id = session.get('user_id')
        
        # 校验必填字段
        required_fields = ['cp_code', 'sender_name', 'sender_phone', 'sender_province', 
                          'sender_city', 'sender_district', 'sender_address',
                          'receiver_name', 'receiver_phone', 'receiver_province',
                          'receiver_city', 'receiver_district', 'receiver_address']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'缺少必填字段: {field}'}), 400
        
        # 如果有租户ID，校验配额
        tenant_id = data.get('tenant_id')
        if tenant_id:
            cursor.execute("""
                SELECT * FROM platform_tenant_quota 
                WHERE tenant_id=%s AND status='enabled'
            """, (tenant_id,))
            quota = cursor.fetchone()
            
            if quota:
                if quota['monthly_used'] >= quota['monthly_free_quota']:
                    if not quota['overage_enabled']:
                        return jsonify({'success': False, 'message': '租户配额已用尽，不允许超额使用'}), 400
        
        # 创建订单
        cursor.execute("""
            INSERT INTO platform_express_orders 
            (cp_code, cp_name, sender_name, sender_phone, sender_province, sender_city, 
             sender_district, sender_town, sender_address, receiver_name, receiver_phone,
             receiver_province, receiver_city, receiver_district, receiver_town, receiver_address,
             goods_name, goods_count, weight, volume, remark, tenant_id, tenant_order_id,
             rule_id, status, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('cp_code'),
            data.get('cp_name'),
            data.get('sender_name'),
            data.get('sender_phone'),
            data.get('sender_province'),
            data.get('sender_city'),
            data.get('sender_district'),
            data.get('sender_town'),
            data.get('sender_address'),
            data.get('receiver_name'),
            data.get('receiver_phone'),
            data.get('receiver_province'),
            data.get('receiver_city'),
            data.get('receiver_district'),
            data.get('receiver_town'),
            data.get('receiver_address'),
            data.get('goods_name'),
            data.get('goods_count', 1),
            data.get('weight'),
            data.get('volume'),
            data.get('remark'),
            tenant_id,
            data.get('tenant_order_id'),
            data.get('rule_id'),
            'created',
            user_id
        ))
        
        order_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': '订单创建成功', 
            'id': order_id
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/orders/<int:order_id>/waybill', methods=['POST'])
@require_platform_admin
def get_order_waybill(order_id):
    """获取电子面单号"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取订单
        cursor.execute("SELECT * FROM platform_express_orders WHERE id=%s", (order_id,))
        order = cursor.fetchone()
        
        if not order:
            return jsonify({'success': False, 'message': '订单不存在'}), 404
        
        if order['waybill_no']:
            return jsonify({
                'success': True,
                'message': '已有面单号',
                'waybill_no': order['waybill_no']
            })
        
        # 获取菜鸟配置
        cursor.execute("SELECT * FROM platform_cainiao_config WHERE status='enabled' LIMIT 1")
        config = cursor.fetchone()
        
        if not config:
            return jsonify({'success': False, 'message': '菜鸟账号未配置'}), 400
        
        # 调用菜鸟API获取面单
        from platform_cainiao_service import CainiaoService
        
        service = CainiaoService(
            app_key=config['app_key'],
            app_secret=config['app_secret'],
            endpoint_url=config.get('endpoint_url'),
            sign_method=config.get('sign_method', 'md5')
        )
        
        sender = {
            'name': order['sender_name'],
            'phone': order['sender_phone'],
            'province': order['sender_province'],
            'city': order['sender_city'],
            'district': order['sender_district'],
            'town': order.get('sender_town'),
            'address': order['sender_address']
        }
        
        receiver = {
            'name': order['receiver_name'],
            'phone': order['receiver_phone'],
            'province': order['receiver_province'],
            'city': order['receiver_city'],
            'district': order['receiver_district'],
            'town': order.get('receiver_town'),
            'address': order['receiver_address']
        }
        
        result = service.get_waybill(
            sender=sender,
            receiver=receiver,
            cp_code=order['cp_code'],
            goods_name=order.get('goods_name'),
            weight=order.get('weight')
        )
        
        # 记录日志
        _log_api_call(cursor, 'TMS_WAYBILL_GET', result, order.get('tenant_id'), order_id)
        
        if result['success']:
            waybill_no = result['data'].get('waybillCode') if result.get('data') else None
            print_data = result.get('data')
            
            # 更新订单
            cursor.execute("""
                UPDATE platform_express_orders 
                SET waybill_no=%s, waybill_status='used', waybill_get_time=%s, 
                    print_data=%s, status='waybill_created'
                WHERE id=%s
            """, (waybill_no, datetime.now(), json.dumps(print_data), order_id))
            
            # 更新配额
            if order.get('tenant_id'):
                _update_tenant_quota(cursor, order['tenant_id'], order_id, waybill_no, order['cp_code'])
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': '面单获取成功',
                'waybill_no': waybill_no,
                'print_data': print_data
            })
        else:
            conn.commit()  # 保存日志
            return jsonify({
                'success': False,
                'message': f"面单获取失败: {result.get('message')}"
            }), 400
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/orders/<int:order_id>/cancel', methods=['POST'])
@require_platform_admin
def cancel_order(order_id):
    """取消订单"""
    try:
        data = request.json or {}
        reason = data.get('reason', '用户取消')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取订单
        cursor.execute("SELECT * FROM platform_express_orders WHERE id=%s", (order_id,))
        order = cursor.fetchone()
        
        if not order:
            return jsonify({'success': False, 'message': '订单不存在'}), 404
        
        # 检查状态
        cancellable_statuses = ['created', 'waybill_created']
        if order['status'] not in cancellable_statuses:
            return jsonify({'success': False, 'message': f"当前状态({order['status']})不允许取消"}), 400
        
        # 如果有菜鸟订单号，需要调用取消接口
        if order.get('cainiao_order_id'):
            cursor.execute("SELECT * FROM platform_cainiao_config WHERE status='enabled' LIMIT 1")
            config = cursor.fetchone()
            
            if config:
                from platform_cainiao_service import CainiaoService
                
                service = CainiaoService(
                    app_key=config['app_key'],
                    app_secret=config['app_secret'],
                    endpoint_url=config.get('endpoint_url'),
                    sign_method=config.get('sign_method', 'md5')
                )
                
                result = service.cancel_order(order['cainiao_order_id'], reason)
                _log_api_call(cursor, 'TMS_ORDER_CANCEL', result, order.get('tenant_id'), order_id)
                
                if not result['success']:
                    conn.commit()
                    return jsonify({
                        'success': False,
                        'message': f"取消失败: {result.get('message')}"
                    }), 400
        
        # 更新订单状态
        cursor.execute("""
            UPDATE platform_express_orders 
            SET status='cancelled', cancel_reason=%s, cancel_time=%s,
                waybill_status=CASE WHEN waybill_no IS NOT NULL THEN 'invalid' ELSE waybill_status END
            WHERE id=%s
        """, (reason, datetime.now(), order_id))
        
        conn.commit()
        
        return jsonify({'success': True, 'message': '订单已取消'})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 地址服务 ====================

@platform_cainiao_bp.route('/address/parse', methods=['POST'])
@require_platform_admin
def parse_address():
    """地址解析"""
    try:
        data = request.json
        address_text = data.get('address')
        
        if not address_text:
            return jsonify({'success': False, 'message': '请输入地址'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取配置
        cursor.execute("SELECT * FROM platform_cainiao_config WHERE status='enabled' LIMIT 1")
        config = cursor.fetchone()
        
        if not config:
            return jsonify({'success': False, 'message': '菜鸟账号未配置'}), 400
        
        from platform_cainiao_service import CainiaoService
        
        service = CainiaoService(
            app_key=config['app_key'],
            app_secret=config['app_secret'],
            endpoint_url=config.get('endpoint_url'),
            sign_method=config.get('sign_method', 'md5')
        )
        
        result = service.full_parse_address(address_text)
        _log_api_call(cursor, 'ADDRLIB_DIV_FULLPARSE', result)
        conn.commit()
        
        return jsonify({
            'success': result['success'],
            'message': result.get('message'),
            'data': result.get('data')
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/branch/find', methods=['POST'])
@require_platform_admin
def find_branch():
    """查询就近网点"""
    try:
        data = request.json
        
        required_fields = ['province', 'city', 'district', 'cp_code']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'缺少必填字段: {field}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取配置
        cursor.execute("SELECT * FROM platform_cainiao_config WHERE status='enabled' LIMIT 1")
        config = cursor.fetchone()
        
        if not config:
            return jsonify({'success': False, 'message': '菜鸟账号未配置'}), 400
        
        from platform_cainiao_service import CainiaoService
        
        service = CainiaoService(
            app_key=config['app_key'],
            app_secret=config['app_secret'],
            endpoint_url=config.get('endpoint_url'),
            sign_method=config.get('sign_method', 'md5')
        )
        
        result = service.find_send_branch(
            province=data['province'],
            city=data['city'],
            district=data['district'],
            cp_code=data['cp_code'],
            town=data.get('town'),
            detail_address=data.get('address')
        )
        
        _log_api_call(cursor, 'TMS_DISPATCH_FIND_SEND_BRANCH', result)
        conn.commit()
        
        return jsonify({
            'success': result['success'],
            'message': result.get('message'),
            'data': result.get('data')
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 租户配额管理 ====================

@platform_cainiao_bp.route('/quotas', methods=['GET'])
@require_platform_admin
def get_quotas():
    """获取租户配额列表"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        offset = (page - 1) * page_size
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取总数
        cursor.execute("SELECT COUNT(*) as total FROM platform_tenant_quota")
        total = cursor.fetchone()['total']
        
        # 获取列表（关联公司名称）
        cursor.execute("""
            SELECT q.*, c.name as company_name, c.short_name as company_short_name
            FROM platform_tenant_quota q
            LEFT JOIN companies c ON q.tenant_id = c.id
            ORDER BY q.id DESC
            LIMIT %s OFFSET %s
        """, (page_size, offset))
        quotas = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'items': json.loads(json.dumps(quotas, default=json_serial)),
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/quotas', methods=['POST'])
@require_platform_admin
def save_quota():
    """新增/更新配额"""
    try:
        data = request.json
        tenant_id = data.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'success': False, 'message': '请选择租户'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取租户名称
        cursor.execute("SELECT name FROM companies WHERE id=%s", (tenant_id,))
        company = cursor.fetchone()
        tenant_name = company['name'] if company else None
        
        # 检查是否已存在
        cursor.execute("SELECT id FROM platform_tenant_quota WHERE tenant_id=%s", (tenant_id,))
        existing = cursor.fetchone()
        
        if existing:
            # 更新
            cursor.execute("""
                UPDATE platform_tenant_quota SET
                tenant_name=%s, monthly_free_quota=%s, overage_enabled=%s,
                overage_price=%s, quota_reset_day=%s, status=%s
                WHERE tenant_id=%s
            """, (
                tenant_name,
                data.get('monthly_free_quota', 0),
                1 if data.get('overage_enabled') else 0,
                data.get('overage_price', 0),
                data.get('quota_reset_day', 1),
                data.get('status', 'enabled'),
                tenant_id
            ))
        else:
            # 新增
            cursor.execute("""
                INSERT INTO platform_tenant_quota
                (tenant_id, tenant_name, monthly_free_quota, overage_enabled,
                 overage_price, quota_reset_day, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                tenant_id,
                tenant_name,
                data.get('monthly_free_quota', 0),
                1 if data.get('overage_enabled') else 0,
                data.get('overage_price', 0),
                data.get('quota_reset_day', 1),
                data.get('status', 'enabled')
            ))
        
        conn.commit()
        return jsonify({'success': True, 'message': '配额保存成功'})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/quotas/<int:quota_id>', methods=['DELETE'])
@require_platform_admin
def delete_quota(quota_id):
    """删除配额"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM platform_tenant_quota WHERE id=%s", (quota_id,))
        conn.commit()
        
        return jsonify({'success': True, 'message': '配额已删除'})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/quotas/details', methods=['GET'])
@require_platform_admin
def get_quota_details():
    """获取配额使用明细"""
    try:
        tenant_id = request.args.get('tenant_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        offset = (page - 1) * page_size
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        conditions = ['1=1']
        params = []
        
        if tenant_id:
            conditions.append('d.tenant_id=%s')
            params.append(tenant_id)
        if start_date:
            conditions.append('DATE(d.created_at)>=%s')
            params.append(start_date)
        if end_date:
            conditions.append('DATE(d.created_at)<=%s')
            params.append(end_date)
        
        where_clause = ' AND '.join(conditions)
        
        # 获取总数
        cursor.execute(f"SELECT COUNT(*) as total FROM platform_tenant_quota_detail d WHERE {where_clause}", params)
        total = cursor.fetchone()['total']
        
        # 获取列表
        cursor.execute(f"""
            SELECT d.*, o.receiver_name, o.receiver_phone
            FROM platform_tenant_quota_detail d
            LEFT JOIN platform_express_orders o ON d.order_id = o.id
            WHERE {where_clause}
            ORDER BY d.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        details = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'items': json.loads(json.dumps(details, default=json_serial)),
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 调用日志 ====================

@platform_cainiao_bp.route('/logs', methods=['GET'])
@require_platform_admin
def get_logs():
    """获取调用日志"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        offset = (page - 1) * page_size
        
        # 筛选条件
        api_method = request.args.get('api_method')
        success = request.args.get('success')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        conditions = ['1=1']
        params = []
        
        if api_method:
            conditions.append('api_method=%s')
            params.append(api_method)
        if success is not None and success != '':
            conditions.append('success=%s')
            params.append(int(success))
        if start_date:
            conditions.append('DATE(request_time)>=%s')
            params.append(start_date)
        if end_date:
            conditions.append('DATE(request_time)<=%s')
            params.append(end_date)
        
        where_clause = ' AND '.join(conditions)
        
        # 获取总数
        cursor.execute(f"SELECT COUNT(*) as total FROM platform_cainiao_logs WHERE {where_clause}", params)
        total = cursor.fetchone()['total']
        
        # 获取列表
        cursor.execute(f"""
            SELECT id, api_method, api_version, request_id, request_time, 
                   response_code, response_msg, duration_ms, tenant_id, order_id, success, error_type
            FROM platform_cainiao_logs 
            WHERE {where_clause}
            ORDER BY request_time DESC 
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        logs = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'items': json.loads(json.dumps(logs, default=json_serial)),
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


@platform_cainiao_bp.route('/logs/<int:log_id>', methods=['GET'])
@require_platform_admin
def get_log_detail(log_id):
    """获取日志详情"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM platform_cainiao_logs WHERE id=%s", (log_id,))
        log = cursor.fetchone()
        
        if not log:
            return jsonify({'success': False, 'message': '日志不存在'}), 404
        
        return jsonify({
            'success': True,
            'data': json.loads(json.dumps(log, default=json_serial))
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 菜鸟回调 ====================

@platform_cainiao_bp.route('/callback', methods=['POST'])
def cainiao_callback():
    """
    接收菜鸟状态回调（Webhook）
    注意：此接口不需要平台管理员权限，需要验签
    """
    try:
        data = request.json or {}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取配置用于验签
        cursor.execute("SELECT * FROM platform_cainiao_config WHERE status='enabled' LIMIT 1")
        config = cursor.fetchone()
        
        if not config:
            return jsonify({'success': False, 'message': '配置不存在'}), 400
        
        # 验签（如果有签名）
        sign = data.get('sign') or request.headers.get('X-Cainiao-Sign')
        if sign and config.get('callback_secret'):
            from platform_cainiao_service import CainiaoService
            service = CainiaoService(
                app_key=config['app_key'],
                app_secret=config['callback_secret']
            )
            if not service.verify_callback_sign(data, sign):
                return jsonify({'success': False, 'message': '签名验证失败'}), 403
        
        # 幂等性检查
        cainiao_order_id = data.get('orderId') or data.get('cainiao_order_id')
        callback_type = data.get('type') or data.get('status') or 'unknown'
        callback_id = f"{cainiao_order_id}_{callback_type}"
        
        cursor.execute("""
            SELECT id FROM platform_callback_records WHERE callback_id=%s
        """, (callback_id,))
        
        if cursor.fetchone():
            # 已处理过，直接返回成功
            return jsonify({'success': True, 'message': '已处理'})
        
        # 记录回调
        cursor.execute("""
            INSERT INTO platform_callback_records
            (callback_id, callback_type, cainiao_order_id, processed, process_time, raw_data)
            VALUES (%s, %s, %s, 1, %s, %s)
        """, (callback_id, callback_type, cainiao_order_id, datetime.now(), json.dumps(data)))
        
        # 更新订单状态
        if cainiao_order_id:
            status_mapping = {
                'DISPATCHED': 'dispatched',
                'PICKED': 'picked',
                'IN_TRANSIT': 'in_transit',
                'DELIVERING': 'delivering',
                'SIGNED': 'signed',
                'REJECTED': 'rejected',
                'EXCEPTION': 'exception'
            }
            
            new_status = status_mapping.get(callback_type.upper())
            if new_status:
                cursor.execute("""
                    UPDATE platform_express_orders 
                    SET status=%s, status_desc=%s, last_track_time=%s, last_track_desc=%s
                    WHERE cainiao_order_id=%s
                """, (
                    new_status,
                    data.get('statusDesc'),
                    datetime.now(),
                    data.get('trackDesc'),
                    cainiao_order_id
                ))
                
                # 更新时间节点
                time_field_mapping = {
                    'dispatched': 'dispatch_time',
                    'picked': 'pick_time',
                    'signed': 'sign_time'
                }
                if new_status in time_field_mapping:
                    cursor.execute(f"""
                        UPDATE platform_express_orders 
                        SET {time_field_mapping[new_status]}=%s
                        WHERE cainiao_order_id=%s AND {time_field_mapping[new_status]} IS NULL
                    """, (datetime.now(), cainiao_order_id))
        
        conn.commit()
        return jsonify({'success': True, 'message': '处理成功'})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ==================== 辅助函数 ====================

def _log_api_call(cursor, api_method: str, result: dict, tenant_id: int = None, order_id: int = None):
    """记录API调用日志"""
    from platform_cainiao_service import mask_sensitive_data
    
    try:
        cursor.execute("""
            INSERT INTO platform_cainiao_logs
            (api_method, request_id, request_time, response_code, response_msg, 
             response_data, duration_ms, tenant_id, order_id, success, error_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            api_method,
            result.get('request_id'),
            datetime.now(),
            result.get('code'),
            result.get('message'),
            json.dumps(mask_sensitive_data(result.get('data') or {})),
            result.get('duration_ms'),
            tenant_id,
            order_id,
            1 if result.get('success') else 0,
            'business' if result.get('code') and result['code'] not in ['TIMEOUT', 'NETWORK_ERROR', 'SYSTEM_ERROR'] else result.get('code')
        ))
    except Exception as e:
        print(f"日志记录失败: {e}")


def _update_tenant_quota(cursor, tenant_id: int, order_id: int, waybill_no: str, cp_code: str):
    """更新租户配额"""
    try:
        # 获取配额配置
        cursor.execute("""
            SELECT * FROM platform_tenant_quota WHERE tenant_id=%s
        """, (tenant_id,))
        quota = cursor.fetchone()
        
        if not quota:
            return
        
        # 判断是正常配额还是超额
        is_overage = quota['monthly_used'] >= quota['monthly_free_quota']
        quota_type = 'overage' if is_overage else 'normal'
        amount = quota['overage_price'] if is_overage else 0
        
        # 更新配额计数
        if is_overage:
            cursor.execute("""
                UPDATE platform_tenant_quota 
                SET monthly_used=monthly_used+1, total_used=total_used+1,
                    overage_used=overage_used+1, overage_amount=overage_amount+%s
                WHERE tenant_id=%s
            """, (amount, tenant_id))
        else:
            cursor.execute("""
                UPDATE platform_tenant_quota 
                SET monthly_used=monthly_used+1, total_used=total_used+1
                WHERE tenant_id=%s
            """, (tenant_id,))
        
        # 记录明细
        cursor.execute("""
            INSERT INTO platform_tenant_quota_detail
            (tenant_id, order_id, quota_type, used_num, amount, waybill_no, cp_code)
            VALUES (%s, %s, %s, 1, %s, %s, %s)
        """, (tenant_id, order_id, quota_type, amount, waybill_no, cp_code))
        
    except Exception as e:
        print(f"配额更新失败: {e}")
