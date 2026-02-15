# 测试和代码检查指南

## 📋 项目测试框架

### 测试工具
- **后端测试**: pytest + pytest-flask
- **代码检查**: JSHint (前端) + flake8 (后端)
- **覆盖率**: pytest-cov

---

## 🚀 快速开始

### 1. 安装测试环境

```bash
# 创建虚拟环境
cd /root/ajkuaiji
python3 -m venv venv
source venv/bin/activate

# 安装测试依赖
pip install pytest pytest-flask pytest-cov flask flask-cors pymysql
```

### 2. 运行测试

```bash
# 运行所有测试
pytest

# 运行特定测试文件
pytest backend/tests/test_api_users.py

# 运行特定测试用例
pytest backend/tests/test_api_users.py::test_api_health

# 带覆盖率报告
pytest --cov=backend --cov-report=html
```

### 3. 查看测试报告

```bash
# 测试覆盖率HTML报告
firefox htmlcov/index.html  # 或其他浏览器
```

---

## 📂 测试文件结构

```
ajkuaiji/
├── pytest.ini                      # pytest配置
├── backend/
│   └── tests/
│       ├── conftest.py            # pytest fixtures
│       └── test_api_users.py      # 用户API测试
└── scripts/
    └── check_code.sh              # 代码检查脚本
```

---

## 🔍 代码检查

### 运行完整检查

```bash
cd /root/ajkuaiji
./scripts/check_code.sh
```

### JavaScript代码检查

项目已配置 `.jshintrc` 和 `.jshintignore`。

**VSCode用户**: 安装 [JSHint扩展](https://marketplace.visualstudio.com/items?itemName=dbaeumer.jshint) 获得实时检查。

**手动检查** (需要安装jshint):
```bash
npm install -g jshint
jshint modules/*.js
```

### Python代码检查

```bash
# 安装flake8
pip install flake8

# 检查代码
flake8 backend/*.py --max-line-length=120
```

---

## ✅ 测试标记

项目使用pytest markers进行测试分类:

- `@pytest.mark.unit` - 单元测试
- `@pytest.mark.integration` - 集成测试
- `@pytest.mark.api` - API接口测试
- `@pytest.mark.smoke` - 冒烟测试
- `@pytest.mark.slow` - 慢速测试

### 运行特定类型的测试

```bash
# 只运行单元测试
pytest -m unit

# 只运行API测试
pytest -m api

# 只运行冒烟测试
pytest -m smoke
```

---

## 📝 编写测试示例

### 基本API测试

```python
import pytest
import json

@pytest.mark.api
def test_get_users(client):
    """测试获取用户列表"""
    response = client.get('/api/users')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
```

### 使用fixtures

```python
def test_with_auth(client, auth_headers):
    """测试需要认证的API"""
    response = client.get('/api/users/current', headers=auth_headers)
    assert response.status_code == 200
```

---

## 🎯 最佳实践

1. **测试先行**: 新功能开发前先编写测试用例
2. **保持覆盖率**: 目标覆盖率 > 80%
3. **快速测试**: 单元测试应在1秒内完成
4. **独立测试**: 每个测试应独立运行,互不依赖
5. **清晰命名**: 测试函数名应描述测试内容

---

## 🐛 CI/CD集成

将以下命令添加到CI/CD pipeline:

```bash
# 运行测试并生成报告
pytest --cov=backend --cov-report=xml --junitxml=test-results.xml

# 检查代码质量
flake8 backend/*.py --max-line-length=120
```

---

## 📚 更多资源

- [pytest文档](https://docs.pytest.org/)
- [pytest-flask文档](https://pytest-flask.readthedocs.io/)
- [JSHint文档](https://jshint.com/docs/)
- [Flask测试指南](https://flask.palletsprojects.com/testing/)

---

**最后更新**: 2026-02-12  
**维护者**: AI Assistant
