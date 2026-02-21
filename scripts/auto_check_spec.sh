#!/bin/bash
# auto_check_spec.sh - 自动规范检查脚本

echo "🔍 开始规范检查..."

# 1. 检查开发规范手册版本
SPEC_VERSION=$(grep "文档版本" /root/ajkuaiji/docs/开发规范统一手册.md | cut -d':' -f2 | tr -d ' ')
echo "📄 规范手册版本: $SPEC_VERSION"

# 2. 检查HTML标签闭合
HTML_ERRORS=$(grep -o '<[^>]*>' /root/ajkuaiji/financial_system.html | grep -E '^</' | wc -l)
OPEN_TAGS=$(grep -o '<[^/>]*>' /root/ajkuaiji/financial_system.html | grep -vE '</|/>' | wc -l)
CLOSED_TAGS=$(grep -o '</[^>]*>' /root/ajkuaiji/financial_system.html | wc -l)

echo "🏷️  HTML标签检查:"
echo "   开始标签: $OPEN_TAGS"
echo "   结束标签: $CLOSED_TAGS"
if [ $OPEN_TAGS -eq $CLOSED_TAGS ]; then
    echo "   ✅ HTML标签闭合正常"
else
    echo "   ❌ HTML标签闭合异常: 开始标签${OPEN_TAGS}个，结束标签${CLOSED_TAGS}个"
fi

# 3. 检查JavaScript函数导出
JS_EXPORTS=$(grep -r "window\..*=" /root/ajkuaiji/modules/ | wc -l)
echo "🔌 JavaScript全局函数导出: $JS_EXPORTS个"

# 4. 检查TODO/FIXME注释
TODO_COUNT=$(grep -r "TODO\|FIXME" /root/ajkuaiji/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
echo "📝 待处理注释: $TODO_COUNT个"

# 5. 检查前端日志错误
if [ -f "/var/log/ajkuaiji/frontend.log" ]; then
    RECENT_ERRORS=$(tail -100 /var/log/ajkuaiji/frontend.log | grep -c "ERROR\|❌" || echo 0)
    echo "🐛 最近前端错误: $RECENT_ERRORS个"
else
    echo "📋 前端日志文件不存在"
fi

# 6. 检查后端API健康状态
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8050/api/health 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "💚 后端API状态: 健康"
else
    echo "💔 后端API状态: 异常 (HTTP $HEALTH_CHECK)"
fi

# 7. 生成检查报告
REPORT_FILE="/root/ajkuaiji/docs/reports/spec_check_$(date +%Y%m%d_%H%M%S).md"
mkdir -p /root/ajkuaiji/docs/reports

cat > $REPORT_FILE << EOF
# 规范检查报告 - $(date)

## 检查时间
$(date)

## 检查结果摘要
- 规范手册版本: $SPEC_VERSION
- HTML标签闭合: $([ $OPEN_TAGS -eq $CLOSED_TAGS ] && echo "正常" || echo "异常")
- JavaScript导出函数: $JS_EXPORTS个
- 待处理注释: $TODO_COUNT个
- 最近前端错误: $RECENT_ERRORS个
- 后端API状态: $([ "$HEALTH_CHECK" = "200" ] && echo "健康" || echo "异常")

## 详细分析

### HTML结构检查
- 开始标签总数: $OPEN_TAGS
- 结束标签总数: $CLOSED_TAGS
- 状态: $([ $OPEN_TAGS -eq $CLOSED_TAGS ] && echo "✅ 正常" || echo "❌ 异常")

### JavaScript规范检查
- 全局函数导出数量: $JS_EXPORTS
- 建议: 确保所有onclick调用的函数都正确挂载到window对象

### 代码质量检查
- TODO/FIXME注释数量: $TODO_COUNT
- 建议: 定期清理技术债务

### 系统健康检查
- 前端错误数量: $RECENT_ERRORS
- 后端API状态: HTTP $HEALTH_CHECK

## 建议措施
1. $([ $OPEN_TAGS -ne $CLOSED_TAGS ] && echo "- 修复HTML标签闭合问题" || echo "- HTML结构良好")
2. $([ $TODO_COUNT -gt 0 ] && echo "- 处理待办注释" || echo "- 代码整洁度良好")
3. $([ $RECENT_ERRORS -gt 0 ] && echo "- 排查前端错误" || echo "- 前端运行稳定")
4. $([ "$HEALTH_CHECK" != "200" ] && echo "- 检查后端服务状态" || echo "- 后端服务正常")
EOF

echo "📝 检查报告已生成: $REPORT_FILE"
echo "✅ 规范检查完成"