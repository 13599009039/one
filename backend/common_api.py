#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
共享API模块 - /api/common/*
提供移动端和PC端共同使用的系统配置、枚举值等
"""

from flask import Blueprint, jsonify, request
from datetime import datetime
import json

# 创建蓝图
common_api_bp = Blueprint('common_api', __name__)

# 系统枚举值定义
ENUMS_DATA = {
    # 订单状态枚举
    'order_status': [
        {'code': 'pending', 'text': '待处理', 'color': '#f59e0b'},
        {'code': 'confirmed', 'text': '已确认', 'color': '#3b82f6'},
        {'code': 'processing', 'text': '进行中', 'color': '#8b5cf6'},
        {'code': 'completed', 'text': '已完成', 'color': '#10b981'},
        {'code': 'cancelled', 'text': '已取消', 'color': '#ef4444'}
    ],
    
    # 客户类型枚举
    'customer_type': [
        {'code': 'enterprise', 'text': '企业客户'},
        {'code': 'personal', 'text': '个人客户'}
    ],
    
    # 客户等级枚举
    'customer_level': [
        {'code': 'normal', 'text': '普通客户', 'discount': 1.0},
        {'code': 'vip', 'text': 'VIP客户', 'discount': 0.95},
        {'code': 'svip', 'text': 'SVIP客户', 'discount': 0.90}
    ],
    
    # 支付状态枚举
    'payment_status': [
        {'code': 'unpaid', 'text': '未支付', 'color': '#f59e0b'},
        {'code': 'partial_paid', 'text': '部分支付', 'color': '#3b82f6'},
        {'code': 'paid', 'text': '已支付', 'color': '#10b981'}
    ],
    
    # 服务项目类型
    'service_item_type': [
        {'code': 'product', 'text': '商品'},
        {'code': 'service', 'text': '服务'}
    ],
    
    # 性别枚举
    'gender': [
        {'code': 'male', 'text': '男'},
        {'code': 'female', 'text': '女'},
        {'code': 'other', 'text': '其他'}
    ]
}

# 系统配置
SYSTEM_CONFIG = {
    'system_name': 'AJ快计ERP系统',
    'version': '2.6.0',
    'mobile_version': '1.0.0',
    'api_version': '1.0.0',
    'company_name': 'AJ快计科技有限公司',
    'support_email': 'support@xnamb.cn',
    'support_phone': '400-123-4567',
    'website': 'https://erp.xnamb.cn',
    'mobile_website': 'https://m.erp.xnamb.cn',
    'features': {
        'enable_inventory': True,
        'enable_logistics': True,
        'enable_projects': True,
        'enable_taskpool': True,
        'enable_analytics': True
    }
}

@common_api_bp.route('/api/common/enums', methods=['GET'])
def get_enums():
    """
    获取系统枚举值
    ---
    tags:
      - 公共接口
    responses:
      200:
        description: 成功返回枚举值
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 0
            message:
              type: string
              example: "success"
            data:
              type: object
              description: 枚举值字典
    """
    try:
        # 支持按类型过滤
        enum_type = request.args.get('type')
        
        if enum_type:
            if enum_type in ENUMS_DATA:
                data = {enum_type: ENUMS_DATA[enum_type]}
            else:
                return jsonify({
                    'code': 400,
                    'message': f'枚举类型 {enum_type} 不存在',
                    'data': {}
                }), 400
        else:
            data = ENUMS_DATA
        
        return jsonify({
            'code': 0,
            'message': 'success',
            'data': data,
            'timestamp': int(datetime.now().timestamp())
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': f'服务器内部错误: {str(e)}',
            'data': {}
        }), 500

@common_api_bp.route('/api/common/config', methods=['GET'])
def get_system_config():
    """
    获取系统配置信息
    ---
    tags:
      - 公共接口
    responses:
      200:
        description: 成功返回系统配置
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 0
            message:
              type: string
              example: "success"
            data:
              type: object
              description: 系统配置信息
    """
    try:
        return jsonify({
            'code': 0,
            'message': 'success',
            'data': SYSTEM_CONFIG,
            'timestamp': int(datetime.now().timestamp())
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': f'服务器内部错误: {str(e)}',
            'data': {}
        }), 500

@common_api_bp.route('/api/common/status', methods=['GET'])
def get_system_status():
    """
    获取系统运行状态
    ---
    tags:
      - 公共接口
    responses:
      200:
        description: 成功返回系统状态
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 0
            message:
              type: string
              example: "success"
            data:
              type: object
              description: 系统状态信息
    """
    try:
        import psutil
        import os
        
        # 获取系统资源使用情况
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        status_data = {
            'system': {
                'cpu_usage': f"{cpu_percent:.1f}%",
                'memory_usage': f"{memory.percent:.1f}%",
                'disk_usage': f"{(disk.used / disk.total * 100):.1f}%",
                'boot_time': datetime.fromtimestamp(psutil.boot_time()).strftime('%Y-%m-%d %H:%M:%S')
            },
            'application': {
                'pid': os.getpid(),
                'uptime': 'unknown',  # 需要在应用启动时记录
                'version': SYSTEM_CONFIG['version']
            },
            'services': {
                'database': 'unknown',  # 需要实际检测数据库连接
                'redis': 'unknown'      # 如果使用Redis的话
            }
        }
        
        return jsonify({
            'code': 0,
            'message': 'success',
            'data': status_data,
            'timestamp': int(datetime.now().timestamp())
        })
    except ImportError:
        # 如果没有安装psutil，则返回基础信息
        return jsonify({
            'code': 0,
            'message': 'success',
            'data': {
                'system': {
                    'status': 'running',
                    'version': SYSTEM_CONFIG['version']
                }
            },
            'timestamp': int(datetime.now().timestamp())
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': f'服务器内部错误: {str(e)}',
            'data': {}
        }), 500

@common_api_bp.route('/api/common/time', methods=['GET'])
def get_server_time():
    """
    获取服务器时间
    ---
    tags:
      - 公共接口
    responses:
      200:
        description: 成功返回服务器时间
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 0
            message:
              type: string
              example: "success"
            data:
              type: object
              properties:
                timestamp:
                  type: integer
                  description: Unix时间戳
                datetime:
                  type: string
                  description: 格式化时间字符串
    """
    try:
        now = datetime.now()
        return jsonify({
            'code': 0,
            'message': 'success',
            'data': {
                'timestamp': int(now.timestamp()),
                'datetime': now.strftime('%Y-%m-%d %H:%M:%S'),
                'timezone': 'Asia/Shanghai'
            },
            'timestamp': int(now.timestamp())
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': f'服务器内部错误: {str(e)}',
            'data': {}
        }), 500

# 注册蓝图时打印信息
def register_common_api(app):
    """注册公共API蓝图"""
    app.register_blueprint(common_api_bp)
    print("✅ 共享API已注册: /api/common/*")
    print("  - /api/common/enums      获取枚举值")
    print("  - /api/common/config     获取系统配置")
    print("  - /api/common/status     获取系统状态")
    print("  - /api/common/time       获取服务器时间")
