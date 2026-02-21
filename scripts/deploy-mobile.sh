#!/bin/bash
#
# 移动端部署脚本
# 用途：自动化移动端项目的构建和部署流程
# 使用：./deploy-mobile.sh
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
FLASK_PORT=8050
MOBILE_DIR="/root/mobile-erp"
NGINX_CONFIG="/etc/nginx/sites-enabled/m.erp.xnamb.cn"
DOMAIN="m.erp.xnamb.cn"

echo "========================================"
echo "     移动端ERP系统部署脚本"
echo "========================================"
echo ""

# 1. 检查Flask服务
echo -e "${YELLOW}[1/6]${NC} 检查Flask服务状态..."
if pgrep -f "flask.*${FLASK_PORT}" > /dev/null; then
    echo -e "${GREEN}✓${NC} Flask服务运行正常（端口${FLASK_PORT}）"
else
    echo -e "${RED}✗${NC} Flask服务未运行在端口${FLASK_PORT}"
    echo "正在尝试启动Flask服务..."
    cd /root/ajkuaiji/backend
    nohup python app.py > flask.log 2>&1 &
    sleep 3
    if pgrep -f "flask.*${FLASK_PORT}" > /dev/null; then
        echo -e "${GREEN}✓${NC} Flask服务启动成功"
    else
        echo -e "${RED}✗${NC} Flask服务启动失败，请检查日志"
        exit 1
    fi
fi

# 2. 检查Nginx配置
echo -e "${YELLOW}[2/6]${NC} 验证Nginx配置..."
if nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Nginx配置语法正确"
else
    echo -e "${RED}✗${NC} Nginx配置错误"
    nginx -t
    exit 1
fi

# 检查端口配置
if grep -q "proxy_pass.*${FLASK_PORT}" "${NGINX_CONFIG}"; then
    echo -e "${GREEN}✓${NC} Nginx API代理配置正确（端口${FLASK_PORT}）"
else
    echo -e "${RED}✗${NC} Nginx API代理端口配置错误"
    echo "请检查配置文件：${NGINX_CONFIG}"
    exit 1
fi

# 3. 备份当前版本
echo -e "${YELLOW}[3/6]${NC} 备份当前版本..."
BACKUP_DIR="/root/ajkuaiji/backup/mobile-erp/$(date +%Y%m%d_%H%M%S)"
if [ -d "${MOBILE_DIR}/dist" ]; then
    mkdir -p "${BACKUP_DIR}"
    cp -r "${MOBILE_DIR}/dist" "${BACKUP_DIR}/"
    echo -e "${GREEN}✓${NC} 备份完成：${BACKUP_DIR}"
else
    echo -e "${YELLOW}!${NC} 未找到dist目录，跳过备份"
fi

# 4. 构建移动端项目
echo -e "${YELLOW}[4/6]${NC} 构建移动端项目..."
cd "${MOBILE_DIR}"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 清理旧构建产物
if [ -d "dist" ]; then
    rm -rf dist
    echo "已清理旧构建产物"
fi

# 执行构建
echo "正在构建..."
if npm run build; then
    echo -e "${GREEN}✓${NC} 构建成功"
else
    echo -e "${RED}✗${NC} 构建失败"
    exit 1
fi

# 验证构建产物
if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}✗${NC} 构建产物不完整"
    exit 1
fi

# 5. 重新加载Nginx
echo -e "${YELLOW}[5/6]${NC} 重新加载Nginx..."
if systemctl reload nginx; then
    echo -e "${GREEN}✓${NC} Nginx重新加载成功"
else
    echo -e "${RED}✗${NC} Nginx重新加载失败"
    exit 1
fi

# 6. 验证部署
echo -e "${YELLOW}[6/6]${NC} 验证部署..."
sleep 2

# 检查主页
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} 主页访问正常（HTTP ${HTTP_CODE}）"
else
    echo -e "${RED}✗${NC} 主页访问异常（HTTP ${HTTP_CODE}）"
    exit 1
fi

# 检查API
API_RESPONSE=$(curl -s -X POST "http://${DOMAIN}/api/mobile/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$API_RESPONSE" = "401" ] || [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} API接口正常（HTTP ${API_RESPONSE}）"
else
    echo -e "${RED}✗${NC} API接口异常（HTTP ${API_RESPONSE}）"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}     ✓ 部署成功！${NC}"
echo "========================================"
echo ""
echo "访问地址：http://${DOMAIN}/"
echo "备份位置：${BACKUP_DIR}"
echo ""
echo "提示：如果浏览器显示旧版本，请按 Ctrl+Shift+R 强制刷新"
echo ""
