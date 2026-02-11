#!/bin/bash
# 企业资源计划管理系统 - 生产环境一键启动脚本
# 用途: 服务器重启后快速恢复所有服务

set -e

echo "========================================"
echo "  企业资源计划管理系统 - 生产环境启动"
echo "========================================"
echo ""

# 1. 启动MySQL
echo "📊 [1/3] 启动MySQL数据库..."
sudo systemctl start mysql
sleep 2
if systemctl is-active --quiet mysql; then
    echo "✅ MySQL已启动"
else
    echo "❌ MySQL启动失败,请检查日志"
    exit 1
fi

# 2. 启动Flask API
echo ""
echo "🔧 [2/3] 启动Flask API服务..."
cd /root/ajkuaiji/backend
source venv/bin/activate
nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &
sleep 3

API_PID=$(ps aux | grep "python.*app.py" | grep -v grep | awk '{print $2}')
if [ -n "$API_PID" ]; then
    echo "✅ Flask API已启动 (PID: $API_PID)"
else
    echo "❌ Flask API启动失败,请检查日志: /var/log/ajkuaiji-api.log"
    exit 1
fi

# 3. 启动Nginx
echo ""
echo "🌐 [3/3] 启动Nginx..."
sudo systemctl start nginx
sleep 1
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx已启动"
else
    echo "❌ Nginx启动失败"
    exit 1
fi

# 验证服务
echo ""
echo "========================================"
echo "  验证服务可用性"
echo "========================================"

echo ""
echo "🔍 测试API登录接口..."
LOGIN_RESPONSE=$(curl -s -X POST http://127.0.0.1:5000/api/users/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"123456"}' | grep -o '"success":true' || echo "")

if [ -n "$LOGIN_RESPONSE" ]; then
    echo "✅ API登录接口正常"
else
    echo "❌ API登录接口异常"
    exit 1
fi

echo ""
echo "🔍 测试外网访问..."
EXTERNAL_HTTP=$(curl -I http://47.98.60.197/financial_system.html 2>&1 | grep "HTTP.*200" || echo "")
if [ -n "$EXTERNAL_HTTP" ]; then
    echo "✅ 外网访问正常"
else
    echo "⚠️  外网访问可能存在问题"
fi

echo ""
echo "========================================"
echo "  ✅ 所有服务已启动完成"
echo "========================================"
echo ""
echo "📋 服务状态:"
echo "   - MySQL:  ✅ 运行中"
echo "   - Flask:  ✅ 运行中 (PID: $API_PID)"
echo "   - Nginx:  ✅ 运行中"
echo ""
echo "🌐 访问地址:"
echo "   http://47.98.60.197/financial_system.html"
echo ""
echo "📄 日志位置:"
echo "   - API日志: /var/log/ajkuaiji-api.log"
echo "   - Nginx日志: /var/log/nginx/ajkuaiji_*.log"
echo ""
