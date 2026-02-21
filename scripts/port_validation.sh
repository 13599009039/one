#!/bin/bash
# /root/ajkuaiji/scripts/port_validation.sh
# 端口配置一致性检查工具

echo "🔍 开始端口配置检查..."

# 1. 检查Flask端口配置
echo "1. 检查Flask端口配置..."
FLASK_PORT=$(grep -o "port=[0-9]*" /root/ajkuaiji/backend/app.py | cut -d'=' -f2)
if [ "$FLASK_PORT" != "8050" ]; then
    echo "❌ Flask端口配置错误: 当前$FLASK_PORT, 应为8050"
else
    echo "✅ Flask端口配置正确: $FLASK_PORT"
fi

# 2. 检查Nginx代理配置
echo "2. 检查Nginx代理配置..."
NGINX_PROXY=$(grep -o "proxy_pass.*:[0-9]*" /etc/nginx/sites-available/ajkuaiji | head -1)
if [[ "$NGINX_PROXY" == *":8050"* ]]; then
    echo "✅ Nginx代理配置正确: $NGINX_PROXY"
else
    echo "❌ Nginx代理配置错误: $NGINX_PROXY"
fi

# 3. 检查端口监听状态
echo "3. 检查端口监听状态..."
if lsof -i :8050 > /dev/null 2>&1; then
    echo "✅ 端口8050正在监听"
    PORT_PID=$(lsof -ti :8050)
    echo "   进程PID: $PORT_PID"
else
    echo "❌ 端口8050未监听"
fi

# 4. 检查预留端口占用情况
echo "4. 检查预留端口占用情况..."
RESERVED_PORTS=(8052 8053 8054 8100 8101 8200 8300)
for port in "${RESERVED_PORTS[@]}"; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "⚠️  预留端口 $port 已被占用"
        lsof -i :$port | tail -n +2
    else
        echo "✅ 预留端口 $port 可用"
    fi
done

echo "✅ 端口检查完成！"