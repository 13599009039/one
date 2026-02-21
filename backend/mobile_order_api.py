# -*- coding: utf-8 -*-
"""
移动端订单API
提供订单列表、详情、搜索、统计等接口
"""

from flask import Blueprint, request
import pymysql
from datetime import datetime

# 导入移动端权限模块
from mobile_auth import (
    require_mobile_auth,
    response_success,
    response_error
)

# 创建Blueprint
mobile_order_bp = Blueprint('mobile_order', __name__)

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


# ============================================================
# 移动端订单列表API
# ============================================================

@mobile_order_bp.route('/api/mobile/orders', methods=['GET'])
@require_mobile_auth
def mobile_get_orders(current_user_id, current_tenant_id, current_username):
    """
    获取订单列表（支持分页、搜索、筛选、排序）
    
    请求头:
    Authorization: Bearer <token>
    
    Query参数:
    - page: 页码，默认1
    - page_size: 每页数量，默认20
    - keyword: 搜索关键词（订单号、客户名称）
    - status: 订单状态（pending|confirmed|shipped|completed|cancelled）
    - date_from: 开始日期（YYYY-MM-DD）
    - date_to: 结束日期（YYYY-MM-DD）
    - sort_by: 排序字段（order_date|total_amount|created_at），默认order_date
    - sort_order: 排序方向（asc|desc），默认desc
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "success",
        "data": {
            "list": [...],
            "total": 100,
            "page": 1,
            "page_size": 20,
            "total_pages": 5
        }
    }
    """
    try:
        # 1. 获取查询参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        keyword = request.args.get('keyword', '').strip()
        status = request.args.get('status', '').strip()
        date_from = request.args.get('date_from', '').strip()
        date_to = request.args.get('date_to', '').strip()
        sort_by = request.args.get('sort_by', 'order_date')
        sort_order = request.args.get('sort_order', 'desc').upper()
        
        # 限制每页最大数量
        page_size = min(page_size, 100)
        
        # 验证排序字段
        allowed_sort_fields = ['order_date', 'total_amount', 'created_at']
        if sort_by not in allowed_sort_fields:
            sort_by = 'order_date'
        
        if sort_order not in ['ASC', 'DESC']:
            sort_order = 'DESC'
        
        # 2. 构建SQL查询
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            # 基础WHERE条件
            where_conditions = ['o.company_id = %s', "IFNULL(o.order_type, 'normal') != 'aftersale'"]
            params = [current_tenant_id]
            
            # 搜索条件
            if keyword:
                where_conditions.append("""
                    (o.order_no LIKE %s OR c.name LIKE %s)
                """)
                keyword_pattern = f'%{keyword}%'
                params.extend([keyword_pattern, keyword_pattern])
            
            # 状态筛选
            if status:
                where_conditions.append('o.status = %s')
                params.append(status)
            
            # 日期筛选
            if date_from:
                where_conditions.append('o.order_date >= %s')
                params.append(date_from)
            
            if date_to:
                where_conditions.append('o.order_date <= %s')
                params.append(date_to)
            
            where_clause = ' AND '.join(where_conditions)
            
            # 查询总数
            cursor.execute(f"""
                SELECT COUNT(*) as total
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE {where_clause}
            """, params)
            
            total = cursor.fetchone()['total']
            total_pages = (total + page_size - 1) // page_size
            
            # 查询列表数据
            offset = (page - 1) * page_size
            
            cursor.execute(f"""
                SELECT 
                    o.id,
                    o.order_date,
                    o.customer_name,
                    o.final_amount as total_amount,
                    o.status,
                    o.payment_status,
                    o.remarks as remark,
                    o.created_at,
                    o.updated_at,
                    c.id as customer_id,
                    c.name as customer_name,
                    c.contact_person,
                    c.phone as customer_phone
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE {where_clause}
                ORDER BY o.{sort_by} {sort_order}
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            
            orders = cursor.fetchall()
            
            # 格式化返回数据
            order_list = []
            for order in orders:
                order_list.append({
                    'id': order['id'],
                    'order_no': order['order_no'],
                    'order_date': order['order_date'].isoformat() if order['order_date'] else None,
                    'total_amount': float(order['total_amount']),
                    'status': order['status'],
                    'remark': order['remark'],
                    'customer': {
                        'id': order['customer_id'],
                        'name': order['customer_name'],
                        'contact_person': order['contact_person'],
                        'phone': order['customer_phone']
                    },
                    'created_at': order['created_at'].isoformat() if order['created_at'] else None
                })
            
            return response_success(
                data={
                    'list': order_list,
                    'total': total,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': total_pages
                }
            )
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"[Mobile Get Orders Error] {str(e)}")
        return response_error('获取订单列表失败', 'SERVER_ERROR', 500)


# ============================================================
# 移动端订单详情API
# ============================================================

@mobile_order_bp.route('/api/mobile/orders/<int:order_id>', methods=['GET'])
@require_mobile_auth
def mobile_get_order_detail(order_id, current_user_id, current_tenant_id, current_username):
    """
    获取订单详情（含订单项）
    
    请求头:
    Authorization: Bearer <token>
    
    路径参数:
    - order_id: 订单ID
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "success",
        "data": {
            "order": {...},
            "items": [...]
        }
    }
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            # 1. 查询订单基本信息
            cursor.execute("""
                SELECT 
                    o.id,
                    o.order_no,
                    o.order_date,
                    o.total_amount,
                    o.status,
                    o.remark,
                    o.created_at,
                    o.updated_at,
                    c.id as customer_id,
                    c.name as customer_name,
                    c.contact_person,
                    c.phone as customer_phone,
                    c.address as customer_address
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = %s AND o.company_id = %s
                LIMIT 1
            """, (order_id, current_tenant_id))
            
            order = cursor.fetchone()
            
            if not order:
                return response_error('订单不存在', 'ORDER_NOT_FOUND', 404)
            
            # 2. 查询订单项
            cursor.execute("""
                SELECT 
                    oi.id,
                    oi.service_id,
                    oi.service_name,
                    oi.quantity,
                    oi.unit_price,
                    oi.total_price,
                    oi.remark,
                    s.unit,
                    s.category
                FROM order_items oi
                LEFT JOIN services s ON oi.service_id = s.id
                WHERE oi.order_id = %s
                ORDER BY oi.id ASC
            """, (order_id,))
            
            items = cursor.fetchall()
            
            # 格式化订单项数据
            item_list = []
            for item in items:
                item_list.append({
                    'id': item['id'],
                    'service_id': item['service_id'],
                    'service_name': item['service_name'],
                    'quantity': float(item['quantity']),
                    'unit_price': float(item['unit_price']),
                    'total_price': float(item['total_price']),
                    'unit': item['unit'],
                    'category': item['category'],
                    'remark': item['remark']
                })
            
            # 返回响应
            return response_success(
                data={
                    'order': {
                        'id': order['id'],
                        'order_no': order['order_no'],
                        'order_date': order['order_date'].isoformat() if order['order_date'] else None,
                        'total_amount': float(order['total_amount']),
                        'status': order['status'],
                        'remark': order['remark'],
                        'customer': {
                            'id': order['customer_id'],
                            'name': order['customer_name'],
                            'contact_person': order['contact_person'],
                            'phone': order['customer_phone'],
                            'address': order['customer_address']
                        },
                        'created_at': order['created_at'].isoformat() if order['created_at'] else None,
                        'updated_at': order['updated_at'].isoformat() if order['updated_at'] else None
                    },
                    'items': item_list
                }
            )
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"[Mobile Get Order Detail Error] {str(e)}")
        return response_error('获取订单详情失败', 'SERVER_ERROR', 500)


# ============================================================
# 移动端订单统计API
# ============================================================

@mobile_order_bp.route('/api/mobile/orders/statistics', methods=['GET'])
@require_mobile_auth
def mobile_get_order_statistics(current_user_id, current_tenant_id, current_username):
    """
    获取订单统计数据（用于首页展示）
    
    请求头:
    Authorization: Bearer <token>
    
    Query参数:
    - period: 统计周期（today|week|month|year），默认month
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "success",
        "data": {
            "total_count": 100,
            "total_amount": 500000.00,
            "pending_count": 10,
            "confirmed_count": 20,
            "shipped_count": 30,
            "completed_count": 40
        }
    }
    """
    try:
        period = request.args.get('period', 'month').strip()
        
        # 确定日期范围
        date_condition = ""
        if period == 'today':
            date_condition = "AND o.order_date = CURDATE()"
        elif period == 'week':
            date_condition = "AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
        elif period == 'month':
            date_condition = "AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
        elif period == 'year':
            date_condition = "AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)"
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            # 查询统计数据
            cursor.execute(f"""
                SELECT 
                    COUNT(*) as total_count,
                    IFNULL(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_amount,
                    SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN o.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
                    SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) as shipped_count,
                    SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_count
                FROM orders o
                WHERE o.company_id = %s
                  AND IFNULL(o.order_type, 'normal') != 'aftersale'
                  {date_condition}
            """, (current_tenant_id,))
            
            stats = cursor.fetchone()
            
            return response_success(
                data={
                    'total_count': stats['total_count'] or 0,
                    'total_amount': float(stats['total_amount']) if stats['total_amount'] else 0.0,
                    'pending_count': stats['pending_count'] or 0,
                    'confirmed_count': stats['confirmed_count'] or 0,
                    'shipped_count': stats['shipped_count'] or 0,
                    'completed_count': stats['completed_count'] or 0
                }
            )
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"[Mobile Get Order Statistics Error] {str(e)}")
        return response_error('获取订单统计失败', 'SERVER_ERROR', 500)
