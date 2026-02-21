# -*- coding: utf-8 -*-
"""
移动端统计API
提供概览、趋势、排行榜等统计接口
"""

from flask import Blueprint, request
import pymysql
from datetime import datetime, timedelta

# 导入移动端权限模块
from mobile_auth import (
    require_mobile_auth,
    response_success,
    response_error
)

# 创建Blueprint
mobile_statistics_bp = Blueprint('mobile_statistics', __name__)

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
# 移动端概览统计API
# ============================================================

@mobile_statistics_bp.route('/api/mobile/statistics/overview', methods=['GET'])
@require_mobile_auth
def mobile_get_overview(current_user_id, current_tenant_id, current_username):
    """
    获取概览统计数据（首页展示）
    
    请求头:
    Authorization: Bearer <token>
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "success",
        "data": {
            "today": {...},
            "month": {...},
            "total": {...}
        }
    }
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            # 1. 今日统计
            cursor.execute("""
                SELECT 
                    COUNT(*) as order_count,
                    IFNULL(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_amount
                FROM orders
                WHERE company_id = %s
                  AND IFNULL(order_type, 'normal') != 'aftersale'
                  AND order_date = CURDATE()
            """, (current_tenant_id,))
            
            today = cursor.fetchone()
            
            # 2. 本月统计
            cursor.execute("""
                SELECT 
                    COUNT(*) as order_count,
                    IFNULL(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_amount
                FROM orders
                WHERE company_id = %s
                  AND IFNULL(order_type, 'normal') != 'aftersale'
                  AND order_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            """, (current_tenant_id,))
            
            month = cursor.fetchone()
            
            # 3. 累计统计
            cursor.execute("""
                SELECT 
                    COUNT(*) as order_count,
                    IFNULL(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_amount
                FROM orders
                WHERE company_id = %s
                  AND IFNULL(order_type, 'normal') != 'aftersale'
            """, (current_tenant_id,))
            
            total = cursor.fetchone()
            
            # 4. 客户总数
            cursor.execute("""
                SELECT COUNT(*) as customer_count
                FROM customers
                WHERE company_id = %s AND status = 'active'
            """, (current_tenant_id,))
            
            customer_count = cursor.fetchone()['customer_count']
            
            return response_success(
                data={
                    'today': {
                        'order_count': today['order_count'] or 0,
                        'total_amount': float(today['total_amount']) if today['total_amount'] else 0.0
                    },
                    'month': {
                        'order_count': month['order_count'] or 0,
                        'total_amount': float(month['total_amount']) if month['total_amount'] else 0.0
                    },
                    'total': {
                        'order_count': total['order_count'] or 0,
                        'total_amount': float(total['total_amount']) if total['total_amount'] else 0.0,
                        'customer_count': customer_count or 0
                    }
                }
            )
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"[Mobile Get Overview Error] {str(e)}")
        return response_error('获取概览统计失败', 'SERVER_ERROR', 500)


# ============================================================
# 移动端趋势统计API
# ============================================================

@mobile_statistics_bp.route('/api/mobile/statistics/trend', methods=['GET'])
@require_mobile_auth
def mobile_get_trend(current_user_id, current_tenant_id, current_username):
    """
    获取趋势统计数据（用于图表展示）
    
    请求头:
    Authorization: Bearer <token>
    
    Query参数:
    - period: 统计周期（week|month|year），默认month
    - type: 统计类型（order_count|order_amount），默认order_amount
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "success",
        "data": [
            {"date": "2026-02-01", "value": 10000},
            {"date": "2026-02-02", "value": 15000},
            ...
        ]
    }
    """
    try:
        period = request.args.get('period', 'month').strip()
        stat_type = request.args.get('type', 'order_amount').strip()
        
        # 确定日期范围和分组格式
        if period == 'week':
            date_from = datetime.now() - timedelta(days=7)
            date_format = '%Y-%m-%d'
        elif period == 'year':
            date_from = datetime.now() - timedelta(days=365)
            date_format = '%Y-%m'
        else:  # month
            date_from = datetime.now() - timedelta(days=30)
            date_format = '%Y-%m-%d'
        
        # 确定统计字段
        if stat_type == 'order_count':
            stat_field = 'COUNT(*)'
        else:  # order_amount
            stat_field = 'IFNULL(SUM(CASE WHEN o.status != \'cancelled\' THEN o.total_amount ELSE 0 END), 0)'
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute(f"""
                SELECT 
                    DATE_FORMAT(o.order_date, %s) as date,
                    {stat_field} as value
                FROM orders o
                WHERE o.company_id = %s
                  AND IFNULL(o.order_type, 'normal') != 'aftersale'
                  AND o.order_date >= %s
                GROUP BY DATE_FORMAT(o.order_date, %s)
                ORDER BY date ASC
            """, (date_format, current_tenant_id, date_from.strftime('%Y-%m-%d'), date_format))
            
            trend_data = cursor.fetchall()
            
            # 格式化返回数据
            result_list = []
            for item in trend_data:
                result_list.append({
                    'date': item['date'],
                    'value': float(item['value']) if stat_type == 'order_amount' else item['value']
                })
            
            return response_success(data=result_list)
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"[Mobile Get Trend Error] {str(e)}")
        return response_error('获取趋势统计失败', 'SERVER_ERROR', 500)


# ============================================================
# 移动端排行榜API
# ============================================================

@mobile_statistics_bp.route('/api/mobile/statistics/ranking', methods=['GET'])
@require_mobile_auth
def mobile_get_ranking(current_user_id, current_tenant_id, current_username):
    """
    获取排行榜数据（客户排名、服务排名）
    
    请求头:
    Authorization: Bearer <token>
    
    Query参数:
    - type: 排行类型（customer|service），默认customer
    - period: 统计周期（month|year|all），默认month
    - limit: 返回数量，默认10，最大50
    
    响应:
    {
        "success": true,
        "code": "SUCCESS",
        "message": "success",
        "data": [
            {
                "rank": 1,
                "name": "客户名称",
                "value": 100000.00,
                "count": 50
            },
            ...
        ]
    }
    """
    try:
        ranking_type = request.args.get('type', 'customer').strip()
        period = request.args.get('period', 'month').strip()
        limit = min(int(request.args.get('limit', 10)), 50)
        
        # 确定日期范围
        date_condition = ""
        if period == 'month':
            date_condition = "AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
        elif period == 'year':
            date_condition = "AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)"
        # all: 无日期限制
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            if ranking_type == 'service':
                # 服务排行榜
                cursor.execute(f"""
                    SELECT 
                        @rank:=@rank+1 as rank,
                        oi.service_name as name,
                        SUM(oi.total_price) as value,
                        SUM(oi.quantity) as count
                    FROM order_items oi
                    INNER JOIN orders o ON oi.order_id = o.id
                    CROSS JOIN (SELECT @rank:=0) r
                    WHERE o.company_id = %s
                      AND IFNULL(o.order_type, 'normal') != 'aftersale'
                      AND o.status != 'cancelled'
                      {date_condition}
                    GROUP BY oi.service_name
                    ORDER BY value DESC
                    LIMIT %s
                """, (current_tenant_id, limit))
            else:
                # 客户排行榜（默认）
                cursor.execute(f"""
                    SELECT 
                        @rank:=@rank+1 as rank,
                        c.name,
                        IFNULL(SUM(o.total_amount), 0) as value,
                        COUNT(o.id) as count
                    FROM customers c
                    LEFT JOIN orders o ON c.id = o.customer_id 
                        AND o.company_id = %s 
                        AND IFNULL(o.order_type, 'normal') != 'aftersale'
                        AND o.status != 'cancelled'
                        {date_condition}
                    CROSS JOIN (SELECT @rank:=0) r
                    WHERE c.company_id = %s
                    GROUP BY c.id, c.name
                    HAVING value > 0
                    ORDER BY value DESC
                    LIMIT %s
                """, (current_tenant_id, current_tenant_id, limit))
            
            ranking_data = cursor.fetchall()
            
            # 格式化返回数据
            result_list = []
            for item in ranking_data:
                result_list.append({
                    'rank': item['rank'],
                    'name': item['name'],
                    'value': float(item['value']) if item['value'] else 0.0,
                    'count': float(item['count']) if ranking_type == 'service' else item['count']
                })
            
            return response_success(data=result_list)
            
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"[Mobile Get Ranking Error] {str(e)}")
        return response_error('获取排行榜失败', 'SERVER_ERROR', 500)
