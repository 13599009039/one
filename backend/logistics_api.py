#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
物流管理 API 模块
功能: 物流订单管理、物流平台配置、面单打印模板
多租户隔离: 所有数据按company_id严格隔离
"""

from flask import request, jsonify, session
import json
from datetime import datetime
from functools import wraps
import base64
from cryptography.fernet import Fernet
import os

# 加密密钥管理（生产环境应从安全的密钥管理服务获取）
ENCRYPTION_KEY = os.environ.get('LOGISTICS_ENCRYPTION_KEY', Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY if isinstance(ENCRYPTION_KEY, bytes) else ENCRYPTION_KEY.encode())

def encrypt_sensitive(data):
    """加密敏感数据"""
    if not data:
        return None
    try:
        return cipher_suite.encrypt(data.encode()).decode()
    except Exception:
        return data

def decrypt_sensitive(data):
    """解密敏感数据"""
    if not data:
        return None
    try:
        return cipher_suite.decrypt(data.encode()).decode()
    except Exception:
        return data

def mask_phone(phone):
    """脱敏手机号（隐藏中间4位）"""
    if not phone or len(phone) < 7:
        return phone
    return phone[:3] + '****' + phone[-4:]

def mask_address(address):
    """脱敏地址（隐藏详细门牌号）"""
    if not address:
        return address
    # 保留到区/镇级别，隐藏具体门牌号
    for keyword in ['号', '栋', '单元', '室', '楼']:
        idx = address.find(keyword)
        if idx > 0:
            return address[:idx+1] + '***'
    return address[:min(len(address), 30)] + '...' if len(address) > 30 else address


def register_logistics_routes(app, get_db_connection, require_company):
    """注册物流管理相关路由"""
    
    # ==============================================================================
    # 物流平台元数据 API
    # ==============================================================================
    
    @app.route('/api/logistics/platforms', methods=['GET'])
    @require_company
    def get_logistics_platforms(current_company_id=None, current_user_id=None):
        """获取所有支持的物流平台列表（含配置状态）"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 获取平台元数据
            cursor.execute("""
                SELECT 
                    lp.id, lp.platform_code, lp.platform_name, lp.platform_type,
                    lp.logo_url, lp.api_doc_url, lp.config_fields, lp.sort_order
                FROM logistics_platforms lp
                WHERE lp.status = 'enabled'
                ORDER BY lp.sort_order, lp.id
            """)
            platforms = cursor.fetchall()
            
            # 获取当前租户已配置的平台
            cursor.execute("""
                SELECT platform, shop_id, shop_name, status
                FROM logistics_config
                WHERE company_id = %s
            """, (current_company_id,))
            configs = cursor.fetchall()
            
            # 构建配置状态映射
            config_map = {}
            for cfg in configs:
                key = cfg['platform']
                if key not in config_map:
                    config_map[key] = []
                config_map[key].append({
                    'shop_id': cfg['shop_id'],
                    'shop_name': cfg['shop_name'],
                    'status': cfg['status']
                })
            
            # 合并结果
            result = []
            for p in platforms:
                platform_code = p['platform_code']
                config_fields = p['config_fields']
                if isinstance(config_fields, str):
                    config_fields = json.loads(config_fields)
                
                configured_shops = config_map.get(platform_code, [])
                is_configured = len(configured_shops) > 0
                
                result.append({
                    'id': p['id'],
                    'platform_code': platform_code,
                    'platform_name': p['platform_name'],
                    'platform_type': p['platform_type'],
                    'logo_url': p['logo_url'],
                    'api_doc_url': p['api_doc_url'],
                    'config_fields': config_fields,
                    'is_configured': is_configured,
                    'configured_shops': configured_shops
                })
            
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'data': result})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    # ==============================================================================
    # 物流配置管理 API
    # ==============================================================================
    
    @app.route('/api/logistics/config', methods=['GET'])
    @require_company
    def get_logistics_config(current_company_id=None, current_user_id=None):
        """获取当前租户的物流配置列表"""
        try:
            platform = request.args.get('platform', '')
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            sql = """
                SELECT 
                    lc.id, lc.platform, lc.platform_name, lc.shop_id, lc.shop_name,
                    lc.app_key, lc.extra_config, lc.status,
                    lc.last_sync_at, lc.sync_error,
                    lc.created_at, lc.updated_at
                FROM logistics_config lc
                WHERE lc.company_id = %s
            """
            params = [current_company_id]
            
            if platform:
                sql += " AND lc.platform = %s"
                params.append(platform)
            
            sql += " ORDER BY lc.platform, lc.created_at"
            
            cursor.execute(sql, params)
            configs = cursor.fetchall()
            
            # 处理敏感字段（不返回secret/token等）
            result = []
            for cfg in configs:
                extra_config = cfg['extra_config']
                if isinstance(extra_config, str):
                    extra_config = json.loads(extra_config) if extra_config else {}
                
                result.append({
                    'id': cfg['id'],
                    'platform': cfg['platform'],
                    'platform_name': cfg['platform_name'],
                    'shop_id': cfg['shop_id'],
                    'shop_name': cfg['shop_name'],
                    'app_key': cfg['app_key'],  # 显示AppKey用于识别
                    'extra_config': extra_config,
                    'status': cfg['status'],
                    'last_sync_at': cfg['last_sync_at'].isoformat() if cfg['last_sync_at'] else None,
                    'sync_error': cfg['sync_error'],
                    'created_at': cfg['created_at'].isoformat() if cfg['created_at'] else None,
                    'updated_at': cfg['updated_at'].isoformat() if cfg['updated_at'] else None
                })
            
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'data': result})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/config', methods=['POST'])
    @require_company
    def save_logistics_config(current_company_id=None, current_user_id=None):
        """保存物流配置（新增或更新）"""
        try:
            data = request.get_json()
            
            platform = data.get('platform')
            platform_name = data.get('platform_name')
            shop_id = data.get('shop_id')
            shop_name = data.get('shop_name')
            app_key = data.get('app_key')
            app_secret = data.get('app_secret')
            access_token = data.get('access_token')
            refresh_token = data.get('refresh_token')
            extra_config = data.get('extra_config', {})
            config_id = data.get('id')
            
            if not platform:
                return jsonify({'success': False, 'message': '请选择物流平台'}), 400
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 加密敏感信息
            encrypted_secret = encrypt_sensitive(app_secret) if app_secret else None
            encrypted_token = encrypt_sensitive(access_token) if access_token else None
            encrypted_refresh = encrypt_sensitive(refresh_token) if refresh_token else None
            
            if config_id:
                # 更新现有配置
                update_fields = [
                    "platform_name = %s",
                    "shop_id = %s",
                    "shop_name = %s",
                    "app_key = %s",
                    "extra_config = %s",
                    "updated_by = %s",
                    "updated_at = NOW()"
                ]
                params = [platform_name, shop_id, shop_name, app_key, 
                         json.dumps(extra_config) if extra_config else None,
                         current_user_id]
                
                # 只有提供了新值才更新敏感字段
                if app_secret:
                    update_fields.append("app_secret = %s")
                    params.append(encrypted_secret)
                if access_token:
                    update_fields.append("access_token = %s")
                    params.append(encrypted_token)
                if refresh_token:
                    update_fields.append("refresh_token = %s")
                    params.append(encrypted_refresh)
                
                params.extend([config_id, current_company_id])
                
                sql = f"""
                    UPDATE logistics_config 
                    SET {', '.join(update_fields)}
                    WHERE id = %s AND company_id = %s
                """
                cursor.execute(sql, params)
                
            else:
                # 检查是否已存在相同配置
                cursor.execute("""
                    SELECT id FROM logistics_config 
                    WHERE company_id = %s AND platform = %s AND (shop_id = %s OR (shop_id IS NULL AND %s IS NULL))
                """, (current_company_id, platform, shop_id, shop_id))
                
                if cursor.fetchone():
                    cursor.close()
                    conn.close()
                    return jsonify({'success': False, 'message': '该平台配置已存在'}), 400
                
                # 新增配置
                cursor.execute("""
                    INSERT INTO logistics_config 
                    (company_id, platform, platform_name, shop_id, shop_name, 
                     app_key, app_secret, access_token, refresh_token, extra_config,
                     status, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'enabled', %s)
                """, (current_company_id, platform, platform_name, shop_id, shop_name,
                      app_key, encrypted_secret, encrypted_token, encrypted_refresh,
                      json.dumps(extra_config) if extra_config else None,
                      current_user_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': '配置保存成功'})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/config/<int:config_id>', methods=['DELETE'])
    @require_company
    def delete_logistics_config(config_id, current_company_id=None, current_user_id=None):
        """删除物流配置"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                DELETE FROM logistics_config 
                WHERE id = %s AND company_id = %s
            """, (config_id, current_company_id))
            
            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return jsonify({'success': False, 'message': '配置不存在或无权删除'}), 404
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': '配置删除成功'})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/config/<int:config_id>/toggle', methods=['POST'])
    @require_company
    def toggle_logistics_config(config_id, current_company_id=None, current_user_id=None):
        """启用/禁用物流配置"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 获取当前状态
            cursor.execute("""
                SELECT status FROM logistics_config 
                WHERE id = %s AND company_id = %s
            """, (config_id, current_company_id))
            
            result = cursor.fetchone()
            if not result:
                cursor.close()
                conn.close()
                return jsonify({'success': False, 'message': '配置不存在'}), 404
            
            new_status = 'disabled' if result['status'] == 'enabled' else 'enabled'
            
            cursor.execute("""
                UPDATE logistics_config 
                SET status = %s, updated_by = %s, updated_at = NOW()
                WHERE id = %s AND company_id = %s
            """, (new_status, current_user_id, config_id, current_company_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True, 
                'message': f'配置已{"启用" if new_status == "enabled" else "禁用"}',
                'status': new_status
            })
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/config/export', methods=['GET'])
    @require_company
    def export_logistics_config(current_company_id=None, current_user_id=None):
        """导出当前租户的物流配置（备份）"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    platform, platform_name, shop_id, shop_name,
                    app_key, app_secret, access_token, refresh_token,
                    extra_config, status
                FROM logistics_config
                WHERE company_id = %s
            """, (current_company_id,))
            
            configs = cursor.fetchall()
            
            # 导出时保留加密的敏感信息
            export_data = {
                'version': '1.0',
                'export_time': datetime.now().isoformat(),
                'company_id': current_company_id,
                'configs': []
            }
            
            for cfg in configs:
                extra_config = cfg['extra_config']
                if isinstance(extra_config, str):
                    extra_config = json.loads(extra_config) if extra_config else {}
                    
                export_data['configs'].append({
                    'platform': cfg['platform'],
                    'platform_name': cfg['platform_name'],
                    'shop_id': cfg['shop_id'],
                    'shop_name': cfg['shop_name'],
                    'app_key': cfg['app_key'],
                    'app_secret': cfg['app_secret'],
                    'access_token': cfg['access_token'],
                    'refresh_token': cfg['refresh_token'],
                    'extra_config': extra_config,
                    'status': cfg['status']
                })
            
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'data': export_data})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/config/import', methods=['POST'])
    @require_company
    def import_logistics_config(current_company_id=None, current_user_id=None):
        """导入物流配置（恢复备份）"""
        try:
            data = request.get_json()
            import_data = data.get('data', {})
            
            if not import_data or 'configs' not in import_data:
                return jsonify({'success': False, 'message': '无效的导入数据'}), 400
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            imported_count = 0
            skipped_count = 0
            
            for cfg in import_data['configs']:
                # 检查是否已存在
                cursor.execute("""
                    SELECT id FROM logistics_config 
                    WHERE company_id = %s AND platform = %s 
                    AND (shop_id = %s OR (shop_id IS NULL AND %s IS NULL))
                """, (current_company_id, cfg['platform'], cfg.get('shop_id'), cfg.get('shop_id')))
                
                if cursor.fetchone():
                    skipped_count += 1
                    continue
                
                # 导入配置
                cursor.execute("""
                    INSERT INTO logistics_config 
                    (company_id, platform, platform_name, shop_id, shop_name,
                     app_key, app_secret, access_token, refresh_token, extra_config,
                     status, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    current_company_id, cfg['platform'], cfg.get('platform_name'),
                    cfg.get('shop_id'), cfg.get('shop_name'), cfg.get('app_key'),
                    cfg.get('app_secret'), cfg.get('access_token'), cfg.get('refresh_token'),
                    json.dumps(cfg.get('extra_config')) if cfg.get('extra_config') else None,
                    cfg.get('status', 'enabled'), current_user_id
                ))
                imported_count += 1
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True, 
                'message': f'导入完成: {imported_count}条成功, {skipped_count}条跳过(已存在)'
            })
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    # ==============================================================================
    # 物流订单 API
    # ==============================================================================
    
    @app.route('/api/logistics/orders', methods=['GET'])
    @require_company
    def get_logistics_orders(current_company_id=None, current_user_id=None):
        """获取物流订单列表"""
        try:
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 20))
            status = request.args.get('status', '')
            platform = request.args.get('platform', '')
            search = request.args.get('search', '')
            
            offset = (page - 1) * page_size
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 构建查询条件
            where_clauses = ["lo.company_id = %s"]
            params = [current_company_id]
            
            if status:
                where_clauses.append("lo.status = %s")
                params.append(status)
            
            if platform:
                where_clauses.append("lo.platform = %s")
                params.append(platform)
            
            if search:
                where_clauses.append("""
                    (lo.logistics_no LIKE %s OR lo.order_no LIKE %s 
                     OR lo.receiver_name LIKE %s OR lo.receiver_phone LIKE %s)
                """)
                search_pattern = f'%{search}%'
                params.extend([search_pattern] * 4)
            
            where_sql = " AND ".join(where_clauses)
            
            # 查询总数
            cursor.execute(f"""
                SELECT COUNT(*) as total FROM logistics_orders lo
                WHERE {where_sql}
            """, params)
            total = cursor.fetchone()['total']
            
            # 查询数据
            params.extend([page_size, offset])
            cursor.execute(f"""
                SELECT 
                    lo.id, lo.order_id, lo.order_no, lo.logistics_no,
                    lo.platform, lo.platform_name, lo.carrier, lo.carrier_code,
                    lo.receiver_name, lo.receiver_phone, 
                    lo.receiver_province, lo.receiver_city, lo.receiver_district, lo.receiver_address,
                    lo.status, lo.status_desc, lo.exception_reason,
                    lo.last_track_time, lo.last_track_desc,
                    lo.freight, lo.weight,
                    lo.waybill_printed, lo.waybill_print_count, lo.last_print_at,
                    lo.ship_time, lo.deliver_time,
                    lo.created_at
                FROM logistics_orders lo
                WHERE {where_sql}
                ORDER BY lo.created_at DESC
                LIMIT %s OFFSET %s
            """, params)
            
            orders = cursor.fetchall()
            
            # 处理数据脱敏
            result = []
            for order in orders:
                result.append({
                    'id': order['id'],
                    'order_id': order['order_id'],
                    'order_no': order['order_no'],
                    'logistics_no': order['logistics_no'],
                    'platform': order['platform'],
                    'platform_name': order['platform_name'],
                    'carrier': order['carrier'],
                    'carrier_code': order['carrier_code'],
                    'receiver_name': order['receiver_name'],
                    'receiver_phone': mask_phone(order['receiver_phone']),  # 脱敏
                    'receiver_address': f"{order['receiver_province'] or ''}{order['receiver_city'] or ''}{order['receiver_district'] or ''}" + mask_address(order['receiver_address']),
                    'status': order['status'],
                    'status_desc': order['status_desc'],
                    'exception_reason': order['exception_reason'],
                    'last_track_time': order['last_track_time'].isoformat() if order['last_track_time'] else None,
                    'last_track_desc': order['last_track_desc'],
                    'freight': float(order['freight']) if order['freight'] else 0,
                    'weight': float(order['weight']) if order['weight'] else None,
                    'waybill_printed': bool(order['waybill_printed']),
                    'waybill_print_count': order['waybill_print_count'],
                    'last_print_at': order['last_print_at'].isoformat() if order['last_print_at'] else None,
                    'ship_time': order['ship_time'].isoformat() if order['ship_time'] else None,
                    'deliver_time': order['deliver_time'].isoformat() if order['deliver_time'] else None,
                    'created_at': order['created_at'].isoformat() if order['created_at'] else None
                })
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'data': result,
                'total': total,
                'page': page,
                'page_size': page_size
            })
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/orders/<int:order_id>/track', methods=['GET'])
    @require_company
    def get_logistics_track(order_id, current_company_id=None, current_user_id=None):
        """获取物流轨迹详情"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    id, logistics_no, platform, carrier, carrier_code,
                    status, status_desc, track_info,
                    receiver_name, receiver_phone, receiver_address,
                    ship_time, deliver_time
                FROM logistics_orders
                WHERE id = %s AND company_id = %s
            """, (order_id, current_company_id))
            
            order = cursor.fetchone()
            
            if not order:
                cursor.close()
                conn.close()
                return jsonify({'success': False, 'message': '物流订单不存在'}), 404
            
            # 解析轨迹信息
            track_info = order['track_info']
            if isinstance(track_info, str):
                track_info = json.loads(track_info) if track_info else []
            
            result = {
                'id': order['id'],
                'logistics_no': order['logistics_no'],
                'platform': order['platform'],
                'carrier': order['carrier'],
                'carrier_code': order['carrier_code'],
                'status': order['status'],
                'status_desc': order['status_desc'],
                'receiver_name': order['receiver_name'],
                'receiver_phone': mask_phone(order['receiver_phone']),
                'receiver_address': mask_address(order['receiver_address']),
                'ship_time': order['ship_time'].isoformat() if order['ship_time'] else None,
                'deliver_time': order['deliver_time'].isoformat() if order['deliver_time'] else None,
                'track_list': track_info or []
            }
            
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'data': result})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/orders', methods=['POST'])
    @require_company
    def create_logistics_order(current_company_id=None, current_user_id=None):
        """创建物流订单"""
        try:
            data = request.get_json()
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 生成订单号
            order_no = data.get('order_no') or f"LO{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            cursor.execute("""
                INSERT INTO logistics_orders
                (company_id, order_id, order_no, logistics_no, platform, platform_name,
                 carrier, carrier_code, receiver_name, receiver_phone,
                 receiver_province, receiver_city, receiver_district, receiver_address,
                 sender_name, sender_phone, sender_address,
                 status, freight, weight, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s, %s, %s)
            """, (
                current_company_id,
                data.get('order_id'),
                order_no,
                data.get('logistics_no'),
                data.get('platform'),
                data.get('platform_name'),
                data.get('carrier'),
                data.get('carrier_code'),
                data.get('receiver_name'),
                data.get('receiver_phone'),
                data.get('receiver_province'),
                data.get('receiver_city'),
                data.get('receiver_district'),
                data.get('receiver_address'),
                data.get('sender_name'),
                data.get('sender_phone'),
                data.get('sender_address'),
                data.get('freight', 0),
                data.get('weight'),
                current_user_id
            ))
            
            new_id = cursor.lastrowid
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': '物流订单创建成功',
                'data': {'id': new_id, 'order_no': order_no}
            })
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/orders/<int:order_id>/ship', methods=['POST'])
    @require_company
    def ship_logistics_order(order_id, current_company_id=None, current_user_id=None):
        """发货（更新运单号和状态）"""
        try:
            data = request.get_json()
            logistics_no = data.get('logistics_no')
            carrier = data.get('carrier')
            carrier_code = data.get('carrier_code')
            
            if not logistics_no:
                return jsonify({'success': False, 'message': '请填写运单号'}), 400
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE logistics_orders
                SET logistics_no = %s, carrier = %s, carrier_code = %s,
                    status = 'shipped', status_desc = '已发货',
                    ship_time = NOW()
                WHERE id = %s AND company_id = %s AND status = 'pending'
            """, (logistics_no, carrier, carrier_code, order_id, current_company_id))
            
            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return jsonify({'success': False, 'message': '订单不存在或已发货'}), 400
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': '发货成功'})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/orders/<int:order_id>/exception', methods=['POST'])
    @require_company
    def mark_logistics_exception(order_id, current_company_id=None, current_user_id=None):
        """标记物流异常"""
        try:
            data = request.get_json()
            reason = data.get('reason', '未知异常')
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE logistics_orders
                SET status = 'exception', exception_reason = %s
                WHERE id = %s AND company_id = %s
            """, (reason, order_id, current_company_id))
            
            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return jsonify({'success': False, 'message': '订单不存在'}), 404
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': '已标记为异常'})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    # ==============================================================================
    # 面单打印模板 API
    # ==============================================================================
    
    @app.route('/api/logistics/templates', methods=['GET'])
    @require_company
    def get_print_templates(current_company_id=None, current_user_id=None):
        """获取面单打印模板列表"""
        try:
            carrier = request.args.get('carrier', '')
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            sql = """
                SELECT 
                    id, name, carrier, carrier_code, kuaidi100_template_id,
                    template_config, paper_width, paper_height,
                    is_default, status, created_at, updated_at
                FROM print_templates
                WHERE company_id = %s
            """
            params = [current_company_id]
            
            if carrier:
                sql += " AND carrier = %s"
                params.append(carrier)
            
            sql += " ORDER BY is_default DESC, created_at DESC"
            
            cursor.execute(sql, params)
            templates = cursor.fetchall()
            
            result = []
            for tpl in templates:
                template_config = tpl['template_config']
                if isinstance(template_config, str):
                    template_config = json.loads(template_config) if template_config else {}
                
                result.append({
                    'id': tpl['id'],
                    'name': tpl['name'],
                    'carrier': tpl['carrier'],
                    'carrier_code': tpl['carrier_code'],
                    'kuaidi100_template_id': tpl['kuaidi100_template_id'],
                    'template_config': template_config,
                    'paper_width': tpl['paper_width'],
                    'paper_height': tpl['paper_height'],
                    'is_default': bool(tpl['is_default']),
                    'status': tpl['status'],
                    'created_at': tpl['created_at'].isoformat() if tpl['created_at'] else None,
                    'updated_at': tpl['updated_at'].isoformat() if tpl['updated_at'] else None
                })
            
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'data': result})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/templates', methods=['POST'])
    @require_company
    def save_print_template(current_company_id=None, current_user_id=None):
        """保存面单打印模板"""
        try:
            data = request.get_json()
            
            name = data.get('name')
            if not name:
                return jsonify({'success': False, 'message': '请填写模板名称'}), 400
            
            template_id = data.get('id')
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            template_config = json.dumps(data.get('template_config', {}))
            
            if template_id:
                # 更新
                cursor.execute("""
                    UPDATE print_templates
                    SET name = %s, carrier = %s, carrier_code = %s,
                        kuaidi100_template_id = %s, template_config = %s,
                        paper_width = %s, paper_height = %s,
                        updated_by = %s, updated_at = NOW()
                    WHERE id = %s AND company_id = %s
                """, (
                    name, data.get('carrier'), data.get('carrier_code'),
                    data.get('kuaidi100_template_id'), template_config,
                    data.get('paper_width', 100), data.get('paper_height', 180),
                    current_user_id, template_id, current_company_id
                ))
            else:
                # 新增
                cursor.execute("""
                    INSERT INTO print_templates
                    (company_id, name, carrier, carrier_code, kuaidi100_template_id,
                     template_config, paper_width, paper_height, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    current_company_id, name, data.get('carrier'), data.get('carrier_code'),
                    data.get('kuaidi100_template_id'), template_config,
                    data.get('paper_width', 100), data.get('paper_height', 180),
                    current_user_id
                ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': '模板保存成功'})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/templates/<int:template_id>', methods=['DELETE'])
    @require_company
    def delete_print_template(template_id, current_company_id=None, current_user_id=None):
        """删除面单打印模板"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                DELETE FROM print_templates
                WHERE id = %s AND company_id = %s
            """, (template_id, current_company_id))
            
            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return jsonify({'success': False, 'message': '模板不存在'}), 404
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': '模板删除成功'})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/templates/<int:template_id>/default', methods=['POST'])
    @require_company
    def set_default_template(template_id, current_company_id=None, current_user_id=None):
        """设为默认模板"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 先取消其他默认
            cursor.execute("""
                UPDATE print_templates
                SET is_default = 0
                WHERE company_id = %s
            """, (current_company_id,))
            
            # 设置新默认
            cursor.execute("""
                UPDATE print_templates
                SET is_default = 1
                WHERE id = %s AND company_id = %s
            """, (template_id, current_company_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': '已设为默认模板'})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    # ==============================================================================
    # 面单打印 API
    # ==============================================================================
    
    @app.route('/api/logistics/orders/<int:order_id>/print', methods=['POST'])
    @require_company
    def print_waybill(order_id, current_company_id=None, current_user_id=None):
        """打印面单"""
        try:
            data = request.get_json()
            template_id = data.get('template_id')
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 获取物流订单信息
            cursor.execute("""
                SELECT * FROM logistics_orders
                WHERE id = %s AND company_id = %s
            """, (order_id, current_company_id))
            
            order = cursor.fetchone()
            if not order:
                cursor.close()
                conn.close()
                return jsonify({'success': False, 'message': '订单不存在'}), 404
            
            # 获取打印模板（如果指定了模板ID）
            template_config = None
            if template_id:
                cursor.execute("""
                    SELECT * FROM print_templates
                    WHERE id = %s AND company_id = %s
                """, (template_id, current_company_id))
                template = cursor.fetchone()
                if template:
                    template_config = template['template_config']
            
            # 获取快递100配置
            cursor.execute("""
                SELECT * FROM logistics_config
                WHERE company_id = %s AND platform = 'kuaidi100' AND status = 'enabled'
            """, (current_company_id,))
            
            kuaidi100_config = cursor.fetchone()
            
            # 更新打印次数
            cursor.execute("""
                UPDATE logistics_orders
                SET waybill_printed = 1, 
                    waybill_print_count = waybill_print_count + 1,
                    last_print_at = NOW(),
                    print_template_id = %s
                WHERE id = %s
            """, (template_id, order_id))
            
            conn.commit()
            
            # 构建打印数据（实际打印需要调用快递100接口）
            print_data = {
                'order_id': order_id,
                'logistics_no': order['logistics_no'],
                'carrier': order['carrier'],
                'sender': {
                    'name': order['sender_name'],
                    'phone': order['sender_phone'],
                    'address': order['sender_address']
                },
                'receiver': {
                    'name': order['receiver_name'],
                    'phone': order['receiver_phone'],
                    'province': order['receiver_province'],
                    'city': order['receiver_city'],
                    'district': order['receiver_district'],
                    'address': order['receiver_address']
                },
                'template_config': template_config,
                'kuaidi100_configured': bool(kuaidi100_config)
            }
            
            cursor.close()
            conn.close()
            
            # 注意：实际打印需要调用快递100的打印接口
            # 这里返回打印数据供前端处理（可能需要打开打印预览或直接调用打印机）
            return jsonify({
                'success': True,
                'message': '打印任务已提交',
                'data': print_data
            })
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @app.route('/api/logistics/orders/batch-print', methods=['POST'])
    @require_company
    def batch_print_waybill(current_company_id=None, current_user_id=None):
        """批量打印面单"""
        try:
            data = request.get_json()
            order_ids = data.get('order_ids', [])
            template_id = data.get('template_id')
            
            if not order_ids:
                return jsonify({'success': False, 'message': '请选择要打印的订单'}), 400
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 获取订单列表
            placeholders = ','.join(['%s'] * len(order_ids))
            params = [current_company_id] + order_ids
            
            cursor.execute(f"""
                SELECT * FROM logistics_orders
                WHERE company_id = %s AND id IN ({placeholders})
            """, params)
            
            orders = cursor.fetchall()
            
            if not orders:
                cursor.close()
                conn.close()
                return jsonify({'success': False, 'message': '未找到有效订单'}), 404
            
            # 更新打印次数
            cursor.execute(f"""
                UPDATE logistics_orders
                SET waybill_printed = 1, 
                    waybill_print_count = waybill_print_count + 1,
                    last_print_at = NOW(),
                    print_template_id = %s
                WHERE company_id = %s AND id IN ({placeholders})
            """, [template_id, current_company_id] + order_ids)
            
            conn.commit()
            
            # 构建批量打印数据
            print_data_list = []
            for order in orders:
                print_data_list.append({
                    'order_id': order['id'],
                    'logistics_no': order['logistics_no'],
                    'carrier': order['carrier'],
                    'sender': {
                        'name': order['sender_name'],
                        'phone': order['sender_phone'],
                        'address': order['sender_address']
                    },
                    'receiver': {
                        'name': order['receiver_name'],
                        'phone': order['receiver_phone'],
                        'province': order['receiver_province'],
                        'city': order['receiver_city'],
                        'district': order['receiver_district'],
                        'address': order['receiver_address']
                    }
                })
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': f'批量打印任务已提交，共{len(print_data_list)}单',
                'data': print_data_list
            })
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    # ==============================================================================
    # 统一物流接口调用函数（供内部使用）
    # ==============================================================================
    
    @app.route('/api/logistics/call', methods=['POST'])
    @require_company
    def call_logistics_api(current_company_id=None, current_user_id=None):
        """
        统一物流接口调用入口
        封装callLogisticsApi(platform, action, params)
        """
        try:
            data = request.get_json()
            platform = data.get('platform')
            action = data.get('action')
            params = data.get('params', {})
            
            if not platform or not action:
                return jsonify({'success': False, 'message': '缺少platform或action参数'}), 400
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 获取该平台的配置
            shop_id = params.get('shop_id')
            
            sql = """
                SELECT * FROM logistics_config
                WHERE company_id = %s AND platform = %s AND status = 'enabled'
            """
            query_params = [current_company_id, platform]
            
            if shop_id:
                sql += " AND shop_id = %s"
                query_params.append(shop_id)
            
            sql += " LIMIT 1"
            
            cursor.execute(sql, query_params)
            config = cursor.fetchone()
            
            if not config:
                cursor.close()
                conn.close()
                return jsonify({
                    'success': False, 
                    'message': f'{platform}平台未配置或已禁用'
                }), 400
            
            # 解密敏感配置
            api_config = {
                'app_key': config['app_key'],
                'app_secret': decrypt_sensitive(config['app_secret']),
                'access_token': decrypt_sensitive(config['access_token']),
                'refresh_token': decrypt_sensitive(config['refresh_token']),
                'extra_config': json.loads(config['extra_config']) if config['extra_config'] else {}
            }
            
            cursor.close()
            conn.close()
            
            # 根据平台和动作调用对应的接口
            # 注意：实际实现需要对接各物流平台的SDK/API
            # 这里返回模拟响应，实际项目需要实现具体的API对接逻辑
            
            result = {
                'platform': platform,
                'action': action,
                'status': 'mock_success',
                'message': f'接口调用成功（模拟响应，实际需对接{platform} API）',
                'data': {
                    'request_params': params,
                    'config_loaded': True
                }
            }
            
            return jsonify({'success': True, 'data': result})
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    print("[Logistics API] 物流管理路由注册完成")
