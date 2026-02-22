#!/bin/bash

echo "🔍 移动端开发环境状态检查"
echo "================================"

# 检查开发服务器
echo "1. 检查开发服务器状态..."
if curl -s http://localhost:8090 >/dev/null 2>&1; then
    echo "✅ 开发服务器运行正常 (http://localhost:8090)"
else
    echo "❌ 开发服务器未运行"
    echo "   启动命令: cd /root/mobile-erp && npm run dev"
fi

# 检查后端API
echo -e "\n2. 检查后端API状态..."
if curl -s http://127.0.0.1:8051/api/health >/dev/null 2>&1; then
    echo "✅ 后端API运行正常 (http://127.0.0.1:8051)"
else
    echo "❌ 后端API未响应"
    echo "   检查宝塔面板中的Python项目状态"
fi

# 检查端口占用
echo -e "\n3. 检查端口占用情况..."
echo "   8090端口 (开发服务器):"
lsof -i :8090 2>/dev/null || echo "   未被占用"

echo "   8051端口 (后端API):"
lsof -i :8051 2>/dev/null || echo "   未被占用"

# 检查进程
echo -e "\n4. 检查相关进程..."
echo "   Node.js进程:"
ps aux | grep "node.*vite" | grep -v grep || echo "   未找到"

echo "   Python进程:"
ps aux | grep "python.*app.py" | grep -v grep || echo "   未找到"

# 检查文件
echo -e "\n5. 检查关键文件..."
[ -f "/root/mobile-erp/src/main.js" ] && echo "✅ main.js 存在" || echo "❌ main.js 不存在"
[ -f "/root/mobile-erp/src/monitor/FrontendMonitor.vue" ] && echo "✅ 监测组件存在" || echo "❌ 监测组件不存在"
[ -f "/root/ajkuaiji/backend/app.py" ] && echo "✅ 后端API存在" || echo "❌ 后端API不存在"

# 检查网络连接
echo -e "\n6. 网络连接测试..."
echo "   本地访问测试:"
curl -s -w "HTTP状态: %{http_code}\n" http://localhost:8090 -o /dev/null

echo "   API健康检查:"
curl -s -w "HTTP状态: %{http_code}\n" http://127.0.0.1:8051/api/health -o /dev/null

# 检查登录接口
echo -e "\n7. 登录接口测试..."
LOGIN_RESPONSE=$(curl -s -X POST http://127.0.0.1:8051/api/mobile/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"123456"}')

if [[ $LOGIN_RESPONSE == *"code\":0"* ]]; then
    echo "✅ 登录接口正常"
    echo "   响应: $(echo $LOGIN_RESPONSE | cut -c1-100)..."
else
    echo "❌ 登录接口异常"
    echo "   响应: $LOGIN_RESPONSE"
fi

echo -e "\n================================"
echo "💡 建议操作:"
echo "1. 访问 http://localhost:8090/login-test.html 进行登录测试"
echo "2. 打开开发者工具查看控制台日志"
echo "3. 检查是否有前端监测面板显示"
echo "4. 如有问题，请查看具体错误信息"