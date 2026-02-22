#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
移动端ERP后端服务
独立运行的Flask应用，提供移动端专用API
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
import pymysql
from datetime import datetime, date, timedelta
import json

# 导入配置
from config import config

# 导入移动端API模块
from mobile_auth_api import mobile_auth_bp
from mobile_customer_api import mobile_customer_bp
from mobile_order_api import mobile_order_bp
from mobile_statistics_api import mobile_statistics_bp
from mobile_log_api import mobile_log_bp

# 创建Flask应用
app = Flask(__name__)
app.secret_key = config.SECRET_KEY

# 配置CORS
CORS(app, supports_credentials=config.CORS_SUPPORTS_CREDENTIALS, origins=config.CORS_ORIGINS)

# 数据库配置
DB_CONFIG = config.DB_CONFIG.copy()
DB_CONFIG['cursorclass'] = pymysql.cursors.DictCursor

def get_db_connection():
    """获取数据库连接"""
    return pymysql.connect(**DB_CONFIG)

def json_serial(obj):
    """JSON序列化日期时间对象"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

# 注册Blueprint路由
app.register_blueprint(mobile_auth_bp)
app.register_blueprint(mobile_customer_bp)
app.register_blueprint(mobile_order_bp)
app.register_blueprint(mobile_statistics_bp)
app.register_blueprint(mobile_log_bp)

# 健康检查接口
@app.route('/api/mobile/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'success': True,
        'service': 'mobile-erp-backend',
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    }), 200

# 错误处理
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': '接口不存在',
        'error': 'NOT_FOUND'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': '服务器内部错误',
        'error': 'INTERNAL_SERVER_ERROR'
    }), 500

# 请求日志
@app.before_request
def log_request():
    """记录请求日志"""
    if request.path.startswith('/api/mobile/'):
        app.logger.info(f"{request.method} {request.path} - {request.remote_addr}")

@app.after_request
def after_request(response):
    """添加响应头"""
    response.headers['X-Service'] = 'mobile-erp-backend'
    return response

if __name__ == '__main__':
    # 生产环境使用gunicorn或uwsgi运行，这里仅用于开发测试
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
        threaded=config.THREADED
    )
