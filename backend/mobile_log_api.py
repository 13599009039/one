# -*- coding: utf-8 -*-
"""
移动端日志API
提供错误日志记录和查询接口
"""

from flask import Blueprint, request, jsonify
import pymysql
from datetime import datetime, timedelta
import json

# 导入认证模块
from mobile_auth import require_mobile_auth

# 创建Blueprint
mobile_log_bp = Blueprint('mobile_log', __name__)

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

@mobile_log_bp.route('/api/mobile/logs/error', methods=['POST'])
def log_error():
    """
    记录错误日志
    前端捕获的错误、API错误、性能问题等都通过此接口记录
    注意：此接口不需要认证，因为错误可能在登录前或Token失效时发生
    """
    try:
        data = request.json
        
        # 提取基础信息
        error_type = data.get('error_type', 'js_error')
        error_level = data.get('error_level', 'error')
        error_message = data.get('error_message', '')
        error_stack = data.get('error_stack')
        
        # 提取页面信息
        page_url = data.get('page_url')
        user_agent = request.headers.get('User-Agent')
        
        # 提取设备和浏览器信息
        device_info = data.get('device_info')
        browser_info = data.get('browser_info')
        
        # 提取API错误信息
        api_url = data.get('api_url')
        api_method = data.get('api_method')
        api_status = data.get('api_status')
        api_response = data.get('api_response')
        
        # 提取性能指标
        performance_metric = data.get('performance_metric')
        if performance_metric and isinstance(performance_metric, dict):
            performance_metric = json.dumps(performance_metric)
        
        # 提取上下文数据
        context_data = data.get('context_data')
        if context_data and isinstance(context_data, dict):
            context_data = json.dumps(context_data)
        
        # 提取用户信息（可能为空）
        company_id = data.get('company_id', 0)
        user_id = data.get('user_id')
        
        # 插入数据库
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sql = """
                    INSERT INTO mobile_error_logs (
                        company_id, user_id, error_type, error_level,
                        error_message, error_stack, page_url, user_agent,
                        device_info, browser_info, api_url, api_method,
                        api_status, api_response, performance_metric, context_data
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """
                cursor.execute(sql, (
                    company_id, user_id, error_type, error_level,
                    error_message, error_stack, page_url, user_agent,
                    device_info, browser_info, api_url, api_method,
                    api_status, api_response, performance_metric, context_data
                ))
                conn.commit()
                log_id = cursor.lastrowid
                
                return jsonify({
                    'success': True,
                    'message': '日志记录成功',
                    'log_id': log_id
                }), 200
        finally:
            conn.close()
            
    except Exception as e:
        print(f'[日志API错误] {str(e)}')
        return jsonify({
            'success': False,
            'message': f'日志记录失败：{str(e)}'
        }), 500


@mobile_log_bp.route('/api/mobile/logs', methods=['GET'])
@require_mobile_auth
def get_logs():
    """
    查询错误日志
    支持分页、筛选、统计
    需要管理员权限
    """
    try:
        # 获取查询参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        error_type = request.args.get('error_type')
        error_level = request.args.get('error_level')
        is_resolved = request.args.get('is_resolved')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 构建查询条件
        conditions = []
        params = []
        
        # 获取当前用户的公司ID
        company_id = request.mobile_user.get('company_id')
        conditions.append('company_id = %s')
        params.append(company_id)
        
        if error_type:
            conditions.append('error_type = %s')
            params.append(error_type)
        
        if error_level:
            conditions.append('error_level = %s')
            params.append(error_level)
        
        if is_resolved is not None:
            conditions.append('is_resolved = %s')
            params.append(1 if is_resolved == 'true' else 0)
        
        if start_date:
            conditions.append('created_at >= %s')
            params.append(start_date)
        
        if end_date:
            conditions.append('created_at <= %s')
            params.append(end_date)
        
        where_clause = ' AND '.join(conditions) if conditions else '1=1'
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 查询总数
                count_sql = f'SELECT COUNT(*) as total FROM mobile_error_logs WHERE {where_clause}'
                cursor.execute(count_sql, params)
                total = cursor.fetchone()['total']
                
                # 查询日志列表
                list_sql = f"""
                    SELECT 
                        id, company_id, user_id, error_type, error_level,
                        error_message, error_stack, page_url, 
                        api_url, api_method, api_status,
                        is_resolved, created_at
                    FROM mobile_error_logs
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """
                cursor.execute(list_sql, params + [page_size, offset])
                logs = cursor.fetchall()
                
                # 转换日期时间为字符串
                for log in logs:
                    if log.get('created_at'):
                        log['created_at'] = log['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                
                return jsonify({
                    'success': True,
                    'data': {
                        'logs': logs,
                        'total': total,
                        'page': page,
                        'page_size': page_size,
                        'total_pages': (total + page_size - 1) // page_size
                    }
                }), 200
        finally:
            conn.close()
            
    except Exception as e:
        print(f'[日志查询错误] {str(e)}')
        return jsonify({
            'success': False,
            'message': f'日志查询失败：{str(e)}'
        }), 500


@mobile_log_bp.route('/api/mobile/logs/<int:log_id>', methods=['GET'])
@require_mobile_auth
def get_log_detail(log_id):
    """
    获取日志详情
    """
    try:
        company_id = request.mobile_user.get('company_id')
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sql = """
                    SELECT * FROM mobile_error_logs
                    WHERE id = %s AND company_id = %s
                """
                cursor.execute(sql, (log_id, company_id))
                log = cursor.fetchone()
                
                if not log:
                    return jsonify({
                        'success': False,
                        'message': '日志不存在'
                    }), 404
                
                # 转换日期时间
                if log.get('created_at'):
                    log['created_at'] = log['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                if log.get('updated_at'):
                    log['updated_at'] = log['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                if log.get('resolved_at'):
                    log['resolved_at'] = log['resolved_at'].strftime('%Y-%m-%d %H:%M:%S')
                
                return jsonify({
                    'success': True,
                    'data': log
                }), 200
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取日志详情失败：{str(e)}'
        }), 500


@mobile_log_bp.route('/api/mobile/logs/<int:log_id>/resolve', methods=['PUT'])
@require_mobile_auth
def resolve_log(log_id):
    """
    标记日志为已解决
    """
    try:
        data = request.json
        resolve_note = data.get('resolve_note', '')
        
        company_id = request.mobile_user.get('company_id')
        user_id = request.mobile_user.get('id')
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 检查日志是否存在
                cursor.execute(
                    'SELECT id FROM mobile_error_logs WHERE id = %s AND company_id = %s',
                    (log_id, company_id)
                )
                if not cursor.fetchone():
                    return jsonify({
                        'success': False,
                        'message': '日志不存在'
                    }), 404
                
                # 更新日志状态
                sql = """
                    UPDATE mobile_error_logs
                    SET is_resolved = 1,
                        resolved_at = %s,
                        resolved_by = %s,
                        resolve_note = %s
                    WHERE id = %s
                """
                cursor.execute(sql, (datetime.now(), user_id, resolve_note, log_id))
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': '日志已标记为已解决'
                }), 200
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'标记失败：{str(e)}'
        }), 500


@mobile_log_bp.route('/api/mobile/logs/statistics', methods=['GET'])
@require_mobile_auth
def get_statistics():
    """
    获取日志统计信息
    """
    try:
        company_id = request.mobile_user.get('company_id')
        days = int(request.args.get('days', 7))  # 默认查询最近7天
        
        start_date = datetime.now() - timedelta(days=days)
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 按错误类型统计
                cursor.execute("""
                    SELECT error_type, COUNT(*) as count
                    FROM mobile_error_logs
                    WHERE company_id = %s AND created_at >= %s
                    GROUP BY error_type
                """, (company_id, start_date))
                by_type = cursor.fetchall()
                
                # 按错误级别统计
                cursor.execute("""
                    SELECT error_level, COUNT(*) as count
                    FROM mobile_error_logs
                    WHERE company_id = %s AND created_at >= %s
                    GROUP BY error_level
                """, (company_id, start_date))
                by_level = cursor.fetchall()
                
                # 按日期统计
                cursor.execute("""
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM mobile_error_logs
                    WHERE company_id = %s AND created_at >= %s
                    GROUP BY DATE(created_at)
                    ORDER BY date
                """, (company_id, start_date))
                by_date = cursor.fetchall()
                
                # 转换日期
                for item in by_date:
                    if item.get('date'):
                        item['date'] = item['date'].strftime('%Y-%m-%d')
                
                # 高频错误Top10
                cursor.execute("""
                    SELECT error_message, COUNT(*) as count
                    FROM mobile_error_logs
                    WHERE company_id = %s AND created_at >= %s
                    GROUP BY error_message
                    ORDER BY count DESC
                    LIMIT 10
                """, (company_id, start_date))
                top_errors = cursor.fetchall()
                
                return jsonify({
                    'success': True,
                    'data': {
                        'by_type': by_type,
                        'by_level': by_level,
                        'by_date': by_date,
                        'top_errors': top_errors
                    }
                }), 200
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'统计失败：{str(e)}'
        }), 500
