#!/bin/bash
# 性能监测脚本
# 使用方法: bash performance_check.sh

echo "=== 移动端与PC端性能监测 ==="
echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. 检查移动端打包体积
echo "1. 移动端打包体积"
if [ -d "/root/mobile-erp/dist" ]; then
    echo "   打包体积: $(du -sh /root/mobile-erp/dist 2>/dev/null | awk '{print $1}')"
    
    # 统计资源文件
    JS_SIZE=$(find /root/mobile-erp/dist -name "*.js" -exec du -ch {} + 2>/dev/null | grep total | awk '{print $1}')
    CSS_SIZE=$(find /root/mobile-erp/dist -name "*.css" -exec du -ch {} + 2>/dev/null | grep total | awk '{print $1}')
    echo "   - JS文件总大小: ${JS_SIZE:-0}"
    echo "   - CSS文件总大小: ${CSS_SIZE:-0}"
else
    echo "   ⚠️  移动端未构建"
fi
echo ""

# 2. 检查PC端移动适配代码体积
echo "2. PC端移动适配代码体积"
if [ -d "/root/ajkuaiji/mobile" ]; then
    PC_MOBILE_SIZE=$(du -sh /root/ajkuaiji/mobile 2>/dev/null | awk '{print $1}')
    echo "   移动适配代码: ${PC_MOBILE_SIZE}"
    echo "   ⚠️  建议移除以优化PC端加载性能"
else
    echo "   ✅ PC端已移除移动适配代码"
fi
echo ""

# 3. 测试API响应时间（如果服务运行）
echo "3. API响应时间测试"

# 检查服务是否运行
if pgrep -f "python.*app.py" > /dev/null 2>&1; then
    echo "   后端服务: ✅ 运行中"
    
    # 测试移动端API
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8050/api/mobile/statistics/overview > /dev/null 2>&1; then
        MOBILE_API_TIME=$(curl -o /dev/null -s -w "%{time_total}s" http://127.0.0.1:8050/api/mobile/statistics/overview 2>/dev/null)
        echo "   - 移动端API: ${MOBILE_API_TIME}"
    else
        echo "   - 移动端API: ⚠️  无响应"
    fi
else
    echo "   后端服务: ⚠️  未运行"
fi
echo ""

# 4. 检查文件数量
echo "4. 项目文件统计"
PC_FILE_COUNT=$(find /root/ajkuaiji -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) 2>/dev/null | wc -l)
MOBILE_SRC_COUNT=$(find /root/mobile-erp/src -type f \( -name "*.js" -o -name "*.vue" -o -name "*.css" -o -name "*.less" \) 2>/dev/null | wc -l)

echo "   - PC端代码文件: ${PC_FILE_COUNT} 个"
echo "   - 移动端源码文件: ${MOBILE_SRC_COUNT} 个"
echo ""

# 5. 总结
echo "=== 性能评估总结 ==="
echo "详细报告: /root/ajkuaiji/docs/移动端与PC端融合状态监测报告.md"
echo ""
