"""
pytest 配置文件 - 提供测试fixtures
"""
import pytest
import sys
import os

# 添加backend目录到Python路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app as flask_app

@pytest.fixture
def app():
    """创建Flask应用测试实例"""
    flask_app.config.update({
        'TESTING': True,
        'DEBUG': False,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',  # 使用内存数据库
    })
    
    yield flask_app

@pytest.fixture
def client(app):
    """创建测试客户端"""
    return app.test_client()

@pytest.fixture
def runner(app):
    """创建CLI运行器"""
    return app.test_cli_runner()

@pytest.fixture
def auth_headers():
    """返回认证头（模拟登录状态）"""
    return {
        'Content-Type': 'application/json',
        'Cookie': 'session_id=test_session'
    }
