#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
移动端ERP后端配置文件
"""

import os

class Config:
    """基础配置"""
    # Flask配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'mobile_erp_secret_key_2024'
    
    # 服务配置
    HOST = '0.0.0.0'
    PORT = 8051
    DEBUG = False
    THREADED = True
    
    # 数据库配置
    DB_CONFIG = {
        'host': os.environ.get('DB_HOST') or 'localhost',
        'user': os.environ.get('DB_USER') or 'ajkuaiji',
        'password': os.environ.get('DB_PASSWORD') or '@HNzb5z75b16',
        'database': os.environ.get('DB_NAME') or 'ajkuaiji',
        'charset': 'utf8mb4',
        'cursorclass': 'DictCursor'
    }
    
    # CORS配置
    CORS_ORIGINS = [
        'http://m.erp.xnamb.cn',
        'https://m.erp.xnamb.cn',
        'http://localhost:5173'
    ]
    CORS_SUPPORTS_CREDENTIALS = True
    
    # API配置
    API_PREFIX = '/api/mobile'
    
    # 日志配置
    LOG_LEVEL = 'INFO'
    LOG_FILE = '/var/log/mobile-erp/backend.log'
    
    # Token配置
    TOKEN_EXPIRE_HOURS = 24
    REFRESH_TOKEN_EXPIRE_DAYS = 7

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    LOG_LEVEL = 'WARNING'

# 根据环境变量选择配置
config_env = os.environ.get('FLASK_ENV', 'production')
if config_env == 'development':
    config = DevelopmentConfig
else:
    config = ProductionConfig
