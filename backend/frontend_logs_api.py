#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
前端日志接收API
功能：接收前端上报的日志，写入文件供实时查看
版本：v1.0.0
创建日期：2026-02-16
"""

from flask import Blueprint, request, jsonify, session
from datetime import datetime
import os
import json
from functools import wraps

def require_login(f):
    """基础登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': '未登录'}), 401
        return f(*args, **kwargs)
    return decorated_function

frontend_logs_bp = Blueprint('frontend_logs', __name__)

# 日志文件路径
LOG_DIR = '/var/log/ajkuaiji'
FRONTEND_LOG_FILE = os.path.join(LOG_DIR, 'frontend.log')

# 确保日志目录存在
os.makedirs(LOG_DIR, exist_ok=True)

@frontend_logs_bp.route('/api/frontend_logs', methods=['POST'])
# 前端日志接口不需要登录校验，否则登录前的错误无法上报
def receive_frontend_logs():
    """
    接收前端日志
    
    请求体:
    {
        "logs": [
            {
                "timestamp": "2026-02-16T12:00:00.000Z",
                "level": "api|error|warn|info",
                "message": "GET /api/orders 200",
                "url": "https://erp.xnamb.cn/...",
                "userAgent": "Mozilla/...",
                "data": "{...}"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        logs = data.get('logs', [])
        
        if not logs:
            return jsonify({'success': False, 'message': '日志为空'}), 400
        
        # 写入日志文件
        with open(FRONTEND_LOG_FILE, 'a', encoding='utf-8') as f:
            for log in logs:
                log_line = format_log_entry(log)
                f.write(log_line + '\n')
        
        return jsonify({
            'success': True,
            'message': f'已记录 {len(logs)} 条日志'
        })
        
    except Exception as e:
        print(f'❌ [FrontendLogs] 接收日志失败: {e}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


def format_log_entry(log):
    """
    格式化日志条目
    
    输出格式:
    [2026-02-16 12:00:00] [API] GET /api/orders | status:200 duration:50ms | url:https://...
    """
    timestamp = log.get('timestamp', datetime.now().isoformat())
    level = log.get('level', 'info').upper()
    message = log.get('message', '')
    url = log.get('url', '')
    data = log.get('data', '{}')
    
    # 解析附加数据
    try:
        data_obj = json.loads(data) if isinstance(data, str) else data
        data_str = ' | '.join([f'{k}:{v}' for k, v in data_obj.items()])
    except:
        data_str = data
    
    # 格式化时间
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        time_str = dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        time_str = timestamp
    
    # 组装日志行
    parts = [
        f'[{time_str}]',
        f'[{level}]',
        message
    ]
    
    if data_str:
        parts.append(f'| {data_str}')
    
    if url and 'erp.xnamb.cn' in url:
        # 只记录路径部分
        page = url.split('erp.xnamb.cn')[-1]
        parts.append(f'| page:{page}')
    
    return ' '.join(parts)


# 提供实时日志查看API
@frontend_logs_bp.route('/api/frontend_logs/view', methods=['GET'])
@require_login
def view_frontend_logs():
    """
    查看前端日志（最近500行）
    
    参数:
    - lines: 返回行数，默认500
    - level: 过滤日志级别 (api/error/warn/info)
    """
    try:
        lines = int(request.args.get('lines', 500))
        level_filter = request.args.get('level', '').upper()
        
        if not os.path.exists(FRONTEND_LOG_FILE):
            return jsonify({
                'success': True,
                'logs': [],
                'message': '暂无日志'
            })
        
        # 读取最后N行
        with open(FRONTEND_LOG_FILE, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:]
        
        # 过滤日志级别
        if level_filter:
            recent_lines = [
                line for line in recent_lines 
                if f'[{level_filter}]' in line
            ]
        
        return jsonify({
            'success': True,
            'logs': [line.strip() for line in recent_lines],
            'total': len(recent_lines)
        })
        
    except Exception as e:
        print(f'❌ [FrontendLogs] 读取日志失败: {e}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


print('✅ 前端日志接收API模块已加载')
