#!/bin/bash
# 融合状态快速检查脚本
# 使用方法: bash quick_check.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "移动端与PC端融合状态快速检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

SUCCESS=0
WARNING=0
ERROR=0

# 1. 项目存在性
echo "【1/8】项目目录检查"
if [ -d "/root/ajkuaiji" ] && [ -d "/root/mobile-erp" ]; then
    echo "  ✅ PC端和移动端项目均存在"
    ((SUCCESS++))
else
    echo "  ❌ 项目目录缺失"
    ((ERROR++))
fi
echo ""

# 2. 混合架构检查
echo "【2/8】混合架构检查"
if [ -d "/root/ajkuaiji/mobile" ]; then
    echo "  ⚠️  PC端包含移动适配代码（建议移除）"
    echo "     大小: $(du -sh /root/ajkuaiji/mobile 2>/dev/null | awk '{print $1}')"
    ((WARNING++))
else
    echo "  ✅ PC端已实现彻底解耦"
    ((SUCCESS++))
fi
echo ""

# 3. 移动端构建状态
echo "【3/8】移动端构建状态"
if [ -d "/root/mobile-erp/dist" ]; then
    echo "  ✅ 移动端已构建"
    echo "     体积: $(du -sh /root/mobile-erp/dist 2>/dev/null | awk '{print $1}')"
    ((SUCCESS++))
else
    echo "  ⚠️  移动端未构建"
    ((WARNING++))
fi
echo ""

# 4. API规范检查
echo "【4/8】API规范检查"
MOBILE_API=$(grep -r "'/api/mobile/" /root/ajkuaiji/backend/*.py 2>/dev/null | wc -l)
TENANT_API=$(grep -r "'/api/tenant/" /root/ajkuaiji/backend/*.py 2>/dev/null | wc -l)
COMMON_API=$(grep -r "'/api/common/" /root/ajkuaiji/backend/*.py 2>/dev/null | wc -l)

echo "  - 移动端API: ${MOBILE_API} 个"
echo "  - PC端API: ${TENANT_API} 个"
echo "  - 共享API: ${COMMON_API} 个"

if [ "$MOBILE_API" -gt 0 ] && [ "$TENANT_API" -gt 0 ]; then
    echo "  ✅ API前缀规范执行良好"
    ((SUCCESS++))
else
    echo "  ⚠️  API规范需完善"
    ((WARNING++))
fi

if [ "$COMMON_API" -eq 0 ]; then
    echo "  ⚠️  建议创建共享API层 /api/common/*"
    ((WARNING++))
fi
echo ""

# 5. Nginx配置检查
echo "【5/8】Nginx配置检查"
if grep -q "m.erp.xnamb.cn" /etc/nginx -r 2>/dev/null; then
    echo "  ✅ 移动端域名已配置"
    ((SUCCESS++))
else
    echo "  ⚠️  移动端域名未配置"
    ((WARNING++))
fi

if grep -q "http_user_agent" /etc/nginx -r 2>/dev/null; then
    echo "  ✅ 已配置User-Agent智能分流"
    ((SUCCESS++))
else
    echo "  ⚠️  建议配置自动分流"
    ((WARNING++))
fi
echo ""

# 6. 后端服务状态
echo "【6/8】后端服务状态"
if pgrep -f "python.*app.py" > /dev/null 2>&1; then
    FLASK_PORT=$(netstat -tnlp 2>/dev/null | grep "$(pgrep -f 'python.*app.py' | head -1)" | awk '{print $4}' | cut -d: -f2 | head -1 || echo "未知")
    echo "  ✅ Flask服务运行中 (端口: ${FLASK_PORT})"
    ((SUCCESS++))
else
    echo "  ⚠️  Flask服务未运行"
    ((WARNING++))
fi
echo ""

# 7. Token独立性检查
echo "【7/8】Token独立性检查"
if grep -q "mobile_erp_token" /root/mobile-erp/src/router/index.js 2>/dev/null; then
    echo "  ✅ 移动端使用独立Token标识"
    ((SUCCESS++))
else
    echo "  ⚠️  Token独立性未确认"
    ((WARNING++))
fi
echo ""

# 8. 性能快速检测
echo "【8/8】性能快速检测"
if pgrep -f "python.*app.py" > /dev/null 2>&1; then
    API_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://127.0.0.1:8050/api/mobile/statistics/overview 2>/dev/null)
    if [ -n "$API_TIME" ]; then
        echo "  - API响应时间: ${API_TIME}s"
        if (( $(echo "$API_TIME < 0.5" | bc -l 2>/dev/null || echo "1") )); then
            echo "  ✅ API性能优秀"
            ((SUCCESS++))
        else
            echo "  ⚠️  API性能需优化"
            ((WARNING++))
        fi
    fi
else
    echo "  - API响应时间: 服务未运行"
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "检查结果汇总"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 通过: ${SUCCESS}"
echo "⚠️  警告: ${WARNING}"
echo "❌ 错误: ${ERROR}"
echo ""

# 评级
TOTAL=$((SUCCESS + WARNING + ERROR))
if [ "$TOTAL" -gt 0 ]; then
    SCORE=$(awk "BEGIN {printf \"%.1f\", ($SUCCESS/$TOTAL)*100}")
    echo "通过率: ${SCORE}%"
    
    if [ "$ERROR" -eq 0 ] && [ "$WARNING" -le 2 ]; then
        echo "融合状态: 🎉 优秀 (A)"
    elif [ "$ERROR" -eq 0 ] && [ "$WARNING" -le 5 ]; then
        echo "融合状态: 👍 良好 (B)"
    elif [ "$ERROR" -eq 0 ]; then
        echo "融合状态: ⚡ 一般 (C)"
    else
        echo "融合状态: 🚨 需改进 (D)"
    fi
fi
echo ""

# 优化建议
if [ "$WARNING" -gt 0 ] || [ "$ERROR" -gt 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "快速优化建议"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -d "/root/ajkuaiji/mobile" ]; then
        echo "1️⃣  移除PC端移动适配代码"
        echo "   rm -rf /root/ajkuaiji/mobile/"
    fi
    
    if [ "$COMMON_API" -eq 0 ]; then
        echo "2️⃣  创建共享API层"
        echo "   参考: /root/ajkuaiji/docs/移动端与PC端融合状态监测报告.md"
    fi
    
    if ! grep -q "http_user_agent" /etc/nginx -r 2>/dev/null; then
        echo "3️⃣  配置Nginx智能分流"
        echo "   参考: /root/ajkuaiji/docs/移动端与PC端融合状态监测报告.md"
    fi
    
    echo ""
fi

echo "详细报告: /root/ajkuaiji/docs/移动端与PC端融合状态监测报告.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
