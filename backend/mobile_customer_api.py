# -*- coding: utf-8 -*-
"""
移动端客户API（抖音商家系统版本）
提供客户列表、详情、搜索等接口
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
mobile_customer_bp = Blueprint('mobile_customer', __name__)

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
# 移动端客户列表API
# ============================================================

@mobile_customer_bp.route('/api/mobile/customers', methods=['GET'])
@require_mobile_auth
def mobile_get_customers(current_user_id, current_tenant_id, current_username):
    """
    获取客户列表（支持分页、搜索、排序）
    
    Query参数:
    - page: 页码，默认1
    - page_size: 每页数量，默认20
    - keyword: 搜索关键词（店铺名、抖音名、公司名）
    - sort_by: 排序字段（shop_name|created_at），默认created_at
    - sort_order: 排序方向（asc|desc），默认desc
    """
    try:
        # 1. 获取查询参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        keyword = request.args.get('keyword', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc').upper()
        
        # 限制每页最大数量
        page_size = min(page_size, 100)
        
        # 验证排序字段
        allowed_sort_fields = ['shop_name', 'created_at']
        if sort_by not in allowed_sort_fields:
            sort_by = 'created_at'
        
        if sort_order not in ['ASC', 'DESC']:
            sort_order = 'DESC'
        
        # 2. 构建SQL查询
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            # 基础WHERE条件
            where_conditions = ['c.company_id = %s']
            params = [current_tenant_id]
            
            # 搜索条件
            if keyword:
                where_conditions.append("""
                    (c.shop_name LIKE %s OR c.douyin_name LIKE %s OR c.company_name LIKE %s)
                """)
                keyword_pattern = f'%{keyword}%'
                params.extend([keyword_pattern, keyword_pattern, keyword_pattern])
            
            where_clause = ' AND '.join(where_conditions)
            
            # 查询总数
            cursor.execute(f"""
                SELECT COUNT(*) as total
                FROM customers c
                WHERE {where_clause}
            """, params)
            
            total = cursor.fetchone()['total']
            total_pages = (total + page_size - 1) // page_size
            
            # 查询列表数据
            offset = (page - 1) * page_size
            
            cursor.execute(f"""
                SELECT 
                    c.id,
                    c.shop_name,
                    c.douyin_name,
                    c.company_name,
                    c.legal_person,
                    c.business_address,
                    c.industry,
                    c.status,
                    c.follower_id,
                    c.business_staff,
                    c.service_staff,
                    c.operation_staff,
                    c.management_staff,
                    c.team,
                    c.region,
                    c.created_at,
                    c.updated_at,
                    (SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND company_id = %s) as order_count,
                    (SELECT MAX(order_date) FROM orders WHERE customer_id = c.id AND company_id = %s) as last_order_date,
                    (SELECT SUM(final_amount) FROM orders WHERE customer_id = c.id AND company_id = %s AND status != '已取消') as total_amount
                FROM customers c
                WHERE {where_clause}
                ORDER BY c.{sort_by} {sort_order}
                LIMIT %s OFFSET %s
            """, [current_tenant_id, current_tenant_id, current_tenant_id] + params + [page_size, offset])
            
            customers = cursor.fetchall()
            
            # 格式化返回数据
            customer_list = []
            for customer in customers:
                customer_list.append({
                    'id': customer['id'],
                    'shop_name': customer['shop_name'],
                    'douyin_name': customer['douyin_name'] or '',
                    'company_name': customer['company_name'] or '',
                    'legal_person': customer['legal_person'] or '',
                    'business_address': customer['business_address'] or '',
                    'industry': customer['industry'] or '',
                    'status': customer['status'] or '',
                    'follower_id': customer['follower_id'],
                    'business_staff': customer['business_staff'] or '',
                    'service_staff': customer['service_staff'] or '',
                    'operation_staff': customer['operation_staff'] or '',
                    'management_staff': customer['management_staff'] or '',
                    'team': customer['team'] or '',
                    'region': customer['region'] or '',
                    'order_count': customer['order_count'] or 0,
                    'last_order_date': customer['last_order_date'].isoformat() if customer['last_order_date'] else None,
                    'total_amount': float(customer['total_amount']) if customer['total_amount'] else 0.0,
                    'created_at': customer['created_at'].isoformat() if customer['created_at'] else None
                })
            
            return response_success(
                data={
                    'list': customer_list,
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
        import traceback
        error_msg = f"[Mobile Get Customers Error] {str(e)}\n{traceback.format_exc()}"
        print(error_msg, flush=True)
        with open('/root/ajkuaiji/backend/mobile_api_error.log', 'a') as f:
            f.write(f"\n{'='*60}\n{datetime.now()}\n{error_msg}\n")
        return response_error('获取客户列表失败', 'SERVER_ERROR', 500)


# ============================================================
# 移动端客户详情API
# ============================================================

@mobile_customer_bp.route('/api/mobile/customers/<int:customer_id>', methods=['GET'])
@require_mobile_auth
def mobile_get_customer_detail(customer_id, current_user_id, current_tenant_id, current_username):
    """
    获取客户详情（含最近订单）
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            # 1. 查询客户基本信息
            cursor.execute("""
                SELECT 
                    c.id,
                    c.merchant_id,
                    c.shop_name,
                    c.douyin_name,
                    c.company_name,
                    c.credit_code,
                    c.legal_person,
                    c.registered_capital,
                    c.business_address,
                    c.operating_address,
                    c.cooperation_mode,
                    c.category,
                    c.industry,
                    c.status,
                    c.follower_id,
                    c.business_staff,
                    c.service_staff,
                    c.operation_staff,
                    c.management_staff,
                    c.team,
                    c.region,
                    c.project,
                    c.company,
                    c.tags,
                    c.created_at,
                    c.updated_at,
                    (SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND company_id = %s) as order_count,
                    (SELECT SUM(final_amount) FROM orders WHERE customer_id = c.id AND company_id = %s AND status != '已取消') as total_amount,
                    (SELECT MAX(order_date) FROM orders WHERE customer_id = c.id AND company_id = %s) as last_order_date
                FROM customers c
                WHERE c.id = %s AND c.company_id = %s
                LIMIT 1
            """, (current_tenant_id, current_tenant_id, current_tenant_id, customer_id, current_tenant_id))
            
            customer = cursor.fetchone()
            
            if not customer:
                return response_error('客户不存在', 'CUSTOMER_NOT_FOUND', 404)
            
            # 2. 查询最近5笔订单
            cursor.execute("""
                SELECT 
                    o.id,
                    o.customer_name,
                    o.order_date,
                    o.final_amount,
                    o.status,
                    o.payment_status,
                    o.created_at
                FROM orders o
                WHERE o.customer_id = %s AND o.company_id = %s
                ORDER BY o.order_date DESC, o.created_at DESC
                LIMIT 5
            """, (customer_id, current_tenant_id))
            
            recent_orders = cursor.fetchall()
            
            # 格式化订单数据
            order_list = []
            for order in recent_orders:
                order_list.append({
                    'id': order['id'],
                    'customer_name': order['customer_name'],
                    'order_date': order['order_date'].isoformat() if order['order_date'] else None,
                    'final_amount': float(order['final_amount']) if order['final_amount'] else 0.0,
                    'status': order['status'],
                    'payment_status': order['payment_status'],
                    'created_at': order['created_at'].isoformat() if order['created_at'] else None
                })
            
            # 返回响应
            return response_success(
                data={
                    'customer': {
                        'id': customer['id'],
                        'merchant_id': customer['merchant_id'] or '',
                        'shop_name': customer['shop_name'],
                        'douyin_name': customer['douyin_name'] or '',
                        'company_name': customer['company_name'] or '',
                        'credit_code': customer['credit_code'] or '',
                        'legal_person': customer['legal_person'] or '',
                        'registered_capital': customer['registered_capital'] or '',
                        'business_address': customer['business_address'] or '',
                        'operating_address': customer['operating_address'] or '',
                        'cooperation_mode': customer['cooperation_mode'] or '',
                        'category': customer['category'] or '',
                        'industry': customer['industry'] or '',
                        'status': customer['status'] or '',
                        'business_staff': customer['business_staff'] or '',
                        'service_staff': customer['service_staff'] or '',
                        'operation_staff': customer['operation_staff'] or '',
                        'management_staff': customer['management_staff'] or '',
                        'team': customer['team'] or '',
                        'region': customer['region'] or '',
                        'project': customer['project'] or '',
                        'company': customer['company'] or '',
                        'tags': customer['tags'] or '',
                        'order_count': customer['order_count'] or 0,
                        'total_amount': float(customer['total_amount']) if customer['total_amount'] else 0.0,
                        'last_order_date': customer['last_order_date'].isoformat() if customer['last_order_date'] else None,
                        'created_at': customer['created_at'].isoformat() if customer['created_at'] else None,
                        'updated_at': customer['updated_at'].isoformat() if customer['updated_at'] else None
                    },
                    'recent_orders': order_list
                }
            )
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        import traceback
        error_msg = f"[Mobile Get Customer Detail Error] {str(e)}\n{traceback.format_exc()}"
        print(error_msg, flush=True)
        with open('/root/ajkuaiji/backend/mobile_api_error.log', 'a') as f:
            f.write(f"\n{'='*60}\n{datetime.now()}\n{error_msg}\n")
        return response_error('获取客户详情失败', 'SERVER_ERROR', 500)


# ============================================================
# 移动端客户搜索API（快速搜索）
# ============================================================

@mobile_customer_bp.route('/api/mobile/customers/search', methods=['GET'])
@require_mobile_auth
def mobile_search_customers(current_user_id, current_tenant_id, current_username):
    """
    快速搜索客户（用于下拉选择等场景）
    """
    try:
        # 1. 获取查询参数
        keyword = request.args.get('keyword', '').strip()
        limit = min(int(request.args.get('limit', 10)), 50)
        
        if not keyword:
            return response_error('搜索关键词不能为空', 'PARAM_ERROR')
        
        # 2. 执行搜索
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            keyword_pattern = f'%{keyword}%'
            
            cursor.execute("""
                SELECT 
                    c.id,
                    c.shop_name,
                    c.douyin_name,
                    c.company_name,
                    c.legal_person
                FROM customers c
                WHERE c.company_id = %s
                  AND (c.shop_name LIKE %s OR c.douyin_name LIKE %s OR c.company_name LIKE %s)
                  AND c.status != '已删除'
                ORDER BY c.shop_name ASC
                LIMIT %s
            """, (current_tenant_id, keyword_pattern, keyword_pattern, keyword_pattern, limit))
            
            customers = cursor.fetchall()
            
            # 格式化返回数据
            result_list = []
            for customer in customers:
                result_list.append({
                    'id': customer['id'],
                    'shop_name': customer['shop_name'],
                    'douyin_name': customer['douyin_name'] or '',
                    'company_name': customer['company_name'] or '',
                    'legal_person': customer['legal_person'] or ''
                })
            
            return response_success(data=result_list)
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        import traceback
        error_msg = f"[Mobile Search Customers Error] {str(e)}\n{traceback.format_exc()}"
        print(error_msg, flush=True)
        with open('/root/ajkuaiji/backend/mobile_api_error.log', 'a') as f:
            f.write(f"\n{'='*60}\n{datetime.now()}\n{error_msg}\n")
        return response_error('搜索客户失败', 'SERVER_ERROR', 500)
