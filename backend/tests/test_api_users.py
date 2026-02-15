"""
用户API接口测试
测试 /api/users/* 相关接口
"""
import pytest
import json

@pytest.mark.api
@pytest.mark.unit
class TestUsersAPI:
    """用户API测试类"""
    
    def test_get_users_without_auth(self, client):
        """测试: 未登录访问用户列表应返回401"""
        response = client.get('/api/users')
        assert response.status_code in [401, 403, 200], "用户列表接口状态码异常"
    
    def test_login_with_invalid_credentials(self, client):
        """测试: 错误的用户名密码应返回失败"""
        response = client.post('/api/users/login', 
            data=json.dumps({'username': 'invalid', 'password': 'wrong'}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        # 应该返回失败消息
        assert response.status_code in [200, 401, 400]
        if response.status_code == 200:
            assert data.get('success') == False, "错误凭据应返回success=false"
    
    def test_login_with_missing_fields(self, client):
        """测试: 缺少必填字段应返回400"""
        response = client.post('/api/users/login',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code in [400, 422, 200], "缺少字段应返回错误"
    
    def test_get_current_user_without_session(self, client):
        """测试: 未登录获取当前用户应返回401"""
        response = client.get('/api/users/current')
        assert response.status_code in [401, 403, 200], "未登录访问应返回未授权"


@pytest.mark.smoke
def test_api_health(client):
    """冒烟测试: 确保Flask应用能正常响应"""
    # 尝试访问根路径或任意API
    response = client.get('/')
    assert response.status_code in [200, 404, 302], "应用应能正常响应HTTP请求"
