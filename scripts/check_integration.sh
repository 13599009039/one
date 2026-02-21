#!/bin/bash
# 移动端与PC端融合状态检查工具
# 使用方法: ./check_integration.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印标题
print_title() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# 打印成功信息
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 打印警告信息
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 打印错误信息
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 打印信息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查计数器
SUCCESS_COUNT=0
WARNING_COUNT=0
ERROR_COUNT=0

print_title "移动端与PC端融合状态检查"
echo -e "检查时间: $(date '+%Y-%m-%d %H:%M:%S')\n"

# ======== 1. 检查项目目录结构 ========
print_title "1. 项目目录结构检查"

if [ -d "/root/ajkuaiji" ]; then
    print_success "PC端项目存在: /root/ajkuaiji"
    ((SUCCESS_COUNT++))
else
    print_error "PC端项目不存在: /root/ajkuaiji"
    ((ERROR_COUNT++))
fi

if [ -d "/root/mobile-erp" ]; then
    print_success "移动端项目存在: /root/mobile-erp"
    ((SUCCESS_COUNT++))
else
    print_error "移动端项目不存在: /root/mobile-erp"
    ((ERROR_COUNT++))
fi

# ======== 2. 检查PC端移动适配代码 ========
print_title "2. PC端移动适配代码检查"

if [ -d "/root/ajkuaiji/mobile" ]; then
    print_warning "PC端包含移动适配目录（建议移除以实现彻底解耦）"
    echo -e "\n   目录内容:"
    ls -lh /root/ajkuaiji/mobile/ | tail -n +2 | awk '{print "   - " $9 " (" $5 ")"}'
    
    # 统计文件数量
    JS_COUNT=$(find /root/ajkuaiji/mobile/js -type f -name "*.js" 2>/dev/null | wc -l)
    CSS_COUNT=$(find /root/ajkuaiji/mobile/css -type f -name "*.css" 2>/dev/null | wc -l)
    echo -e "\n   统计: ${JS_COUNT} 个JS文件, ${CSS_COUNT} 个CSS文件"
    ((WARNING_COUNT++))
else
    print_success "PC端已移除移动适配代码（彻底解耦）"
    ((SUCCESS_COUNT++))
fi

# 检查PC端HTML是否引用移动端资源
if [ -f "/root/ajkuaiji/financial_system.html" ]; then
    MOBILE_REF_COUNT=$(grep -c "mobile/" /root/ajkuaiji/financial_system.html 2>/dev/null || echo "0")
    if [ "$MOBILE_REF_COUNT" -gt 0 ]; then
        print_warning "PC端HTML包含 ${MOBILE_REF_COUNT} 处移动端资源引用"
        ((WARNING_COUNT++))
    else
        print_success "PC端HTML未引用移动端资源"
        ((SUCCESS_COUNT++))
    fi
fi

# ======== 3. 检查移动端独立性 ========
print_title "3. 移动端独立性检查"

if [ -d "/root/mobile-erp/dist" ]; then
    DIST_SIZE=$(du -sh /root/mobile-erp/dist 2>/dev/null | awk '{print $1}')
    print_success "移动端已完成构建，打包体积: ${DIST_SIZE}"
    
    # 检查是否有index.html
    if [ -f "/root/mobile-erp/dist/index.html" ]; then
        print_success "移动端入口文件存在: index.html"
        ((SUCCESS_COUNT++))
    else
        print_error "移动端入口文件缺失: index.html"
        ((ERROR_COUNT++))
    fi
    
    ((SUCCESS_COUNT++))
else
    print_warning "移动端未构建或dist目录不存在"
    print_info "执行构建: cd /root/mobile-erp && npm run build"
    ((WARNING_COUNT++))
fi

# 检查移动端配置文件
if [ -f "/root/mobile-erp/vite.config.js" ]; then
    print_success "Vite配置文件存在"
    ((SUCCESS_COUNT++))
else
    print_error "Vite配置文件缺失"
    ((ERROR_COUNT++))
fi

# ======== 4. 检查API路径规范 ========
print_title "4. API路径规范检查"

if [ -d "/root/ajkuaiji/backend" ]; then
    MOBILE_API_COUNT=$(grep -r "'/api/mobile/" /root/ajkuaiji/backend/*.py 2>/dev/null | wc -l)
    TENANT_API_COUNT=$(grep -r "'/api/tenant/" /root/ajkuaiji/backend/*.py 2>/dev/null | wc -l)
    COMMON_API_COUNT=$(grep -r "'/api/common/" /root/ajkuaiji/backend/*.py 2>/dev/null | wc -l)
    
    if [ "$MOBILE_API_COUNT" -gt 0 ]; then
        print_success "移动端API端点: ${MOBILE_API_COUNT} 个"
        ((SUCCESS_COUNT++))
    else
        print_warning "未检测到移动端API端点"
        ((WARNING_COUNT++))
    fi
    
    if [ "$TENANT_API_COUNT" -gt 0 ]; then
        print_success "PC端API端点: ${TENANT_API_COUNT} 个"
        ((SUCCESS_COUNT++))
    else
        print_warning "未检测到PC端API端点"
        ((WARNING_COUNT++))
    fi
    
    if [ "$COMMON_API_COUNT" -gt 0 ]; then
        print_success "共享API端点: ${COMMON_API_COUNT} 个"
        ((SUCCESS_COUNT++))
    else
        print_warning "共享API层未实现（建议创建 /api/common/* 用于枚举值、配置等）"
        ((WARNING_COUNT++))
    fi
else
    print_error "后端目录不存在: /root/ajkuaiji/backend"
    ((ERROR_COUNT++))
fi

# ======== 5. 检查Nginx配置 ========
print_title "5. Nginx配置检查"

NGINX_CONFIGS=$(find /etc/nginx -type f -name "*.conf" 2>/dev/null || echo "")

if [ -n "$NGINX_CONFIGS" ]; then
    # 检查移动端域名配置
    if grep -q "m.erp.xnamb.cn" $NGINX_CONFIGS 2>/dev/null; then
        print_success "Nginx已配置移动端域名: m.erp.xnamb.cn"
        ((SUCCESS_COUNT++))
    else
        print_warning "Nginx未配置移动端域名"
        ((WARNING_COUNT++))
    fi
    
    # 检查PC端域名配置
    if grep -q "erp.xnamb.cn" $NGINX_CONFIGS 2>/dev/null; then
        print_success "Nginx已配置PC端域名: erp.xnamb.cn"
        ((SUCCESS_COUNT++))
    else
        print_warning "Nginx未配置PC端域名"
        ((WARNING_COUNT++))
    fi
    
    # 检查是否有User-Agent分流配置
    if grep -q "http_user_agent" $NGINX_CONFIGS 2>/dev/null; then
        print_success "Nginx已配置User-Agent检测（智能分流）"
        ((SUCCESS_COUNT++))
    else
        print_warning "Nginx未配置User-Agent检测（建议添加移动设备自动分流）"
        ((WARNING_COUNT++))
    fi
else
    print_warning "未找到Nginx配置文件（可能需要sudo权限）"
    ((WARNING_COUNT++))
fi

# ======== 6. 检查后端服务状态 ========
print_title "6. 后端服务状态检查"

# 检查Flask服务是否运行
if pgrep -f "python.*app.py" > /dev/null 2>&1; then
    print_success "Flask后端服务正在运行"
    
    # 获取进程信息
    FLASK_PID=$(pgrep -f "python.*app.py" | head -1)
    FLASK_PORT=$(netstat -tnlp 2>/dev/null | grep "$FLASK_PID" | awk '{print $4}' | cut -d: -f2 | head -1 || echo "未知")
    print_info "进程PID: ${FLASK_PID}, 监听端口: ${FLASK_PORT}"
    ((SUCCESS_COUNT++))
else
    print_warning "Flask后端服务未运行"
    print_info "启动命令: cd /root/ajkuaiji && python backend/app.py"
    ((WARNING_COUNT++))
fi

# ======== 7. 检查移动端Token管理 ========
print_title "7. Token管理独立性检查"

# 检查移动端Token存储代码
if [ -f "/root/mobile-erp/src/router/index.js" ]; then
    if grep -q "mobile_erp_token" /root/mobile-erp/src/router/index.js; then
        print_success "移动端使用独立Token标识: mobile_erp_token"
        ((SUCCESS_COUNT++))
    else
        print_warning "移动端Token标识可能未独立"
        ((WARNING_COUNT++))
    fi
fi

# 检查后端Token前缀
if [ -f "/root/ajkuaiji/backend/mobile_auth_api.py" ]; then
    if grep -q "Bearer_Mobile" /root/ajkuaiji/backend/mobile_auth_api.py; then
        print_success "后端支持移动端Token前缀: Bearer_Mobile"
        ((SUCCESS_COUNT++))
    else
        print_warning "后端未检测到移动端专用Token前缀"
        ((WARNING_COUNT++))
    fi
fi

# ======== 8. 检查设备检测逻辑 ========
print_title "8. 设备检测逻辑检查"

MOBILE_CHECK_COUNT=0

# 检查PC端移动检测
if [ -f "/root/ajkuaiji/mobile/js/utils.js" ]; then
    if grep -q "window.innerWidth < 768" /root/ajkuaiji/mobile/js/utils.js; then
        ((MOBILE_CHECK_COUNT++))
    fi
fi

# 检查PC端HTML移动检测
if [ -f "/root/ajkuaiji/financial_system.html" ]; then
    if grep -q "isMobileOrSmallScreen" /root/ajkuaiji/financial_system.html; then
        ((MOBILE_CHECK_COUNT++))
    fi
fi

if [ "$MOBILE_CHECK_COUNT" -gt 0 ]; then
    print_warning "PC端包含 ${MOBILE_CHECK_COUNT} 处设备检测逻辑（存在冗余）"
    ((WARNING_COUNT++))
else
    print_success "PC端未包含移动设备检测逻辑（已解耦）"
    ((SUCCESS_COUNT++))
fi

# ======== 9. 生成总结报告 ========
print_title "检查总结"

TOTAL_CHECKS=$((SUCCESS_COUNT + WARNING_COUNT + ERROR_COUNT))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($SUCCESS_COUNT/$TOTAL_CHECKS)*100}")

echo -e "${GREEN}✅ 通过: ${SUCCESS_COUNT}${NC}"
echo -e "${YELLOW}⚠️  警告: ${WARNING_COUNT}${NC}"
echo -e "${RED}❌ 错误: ${ERROR_COUNT}${NC}"
echo -e "\n总检查项: ${TOTAL_CHECKS}, 通过率: ${SUCCESS_RATE}%"

# 评级
if [ "$ERROR_COUNT" -eq 0 ] && [ "$WARNING_COUNT" -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 融合状态: 优秀 (A)${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
elif [ "$ERROR_COUNT" -eq 0 ] && [ "$WARNING_COUNT" -le 3 ]; then
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}👍 融合状态: 良好 (B)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
elif [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚡ 融合状态: 一般 (C) - 需要优化${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "\n${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}🚨 融合状态: 需改进 (D) - 存在严重问题${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

# ======== 10. 生成优化建议 ========
print_title "优化建议"

if [ -d "/root/ajkuaiji/mobile" ]; then
    echo "1. 建议移除PC端移动适配代码以实现彻底解耦"
    echo "   命令: rm -rf /root/ajkuaiji/mobile/"
fi

if grep -q "mobile/" /root/ajkuaiji/financial_system.html 2>/dev/null; then
    echo "2. 建议从PC端HTML移除移动端资源引用"
    echo "   文件: /root/ajkuaiji/financial_system.html"
fi

if ! grep -q "http_user_agent" /etc/nginx -r 2>/dev/null; then
    echo "3. 建议配置Nginx User-Agent智能分流"
    echo "   参考: /root/ajkuaiji/docs/移动端与PC端融合状态监测报告.md"
fi

COMMON_API_COUNT=$(grep -r "'/api/common/" /root/ajkuaiji/backend/*.py 2>/dev/null | wc -l)
if [ "$COMMON_API_COUNT" -eq 0 ]; then
    echo "4. 建议创建共享API层 /api/common/*"
    echo "   用途: 枚举值、系统配置等两端共享数据"
fi

echo -e "\n详细报告: /root/ajkuaiji/docs/移动端与PC端融合状态监测报告.md"

echo ""
