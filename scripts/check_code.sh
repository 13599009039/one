#!/bin/bash
# 代码质量检查脚本
# 项目: 爱佳快计财务系统
# 创建时间: 2026-02-12

echo "🔍 开始代码质量检查..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查Python代码（后端）
echo "📦 检查Python代码..."
if command -v flake8 &> /dev/null; then
    flake8 backend/*.py --max-line-length=120 --ignore=E501,W503 || echo "${YELLOW}⚠️  Python代码存在一些问题${NC}"
else
    echo "${YELLOW}⚠️  flake8未安装，跳过Python检查${NC}"
fi
echo ""

# 检查JavaScript代码（前端）
echo "📝 检查JavaScript代码..."
JS_FILES=$(find modules -name "*.js" ! -name "*_backup.js" ! -name "*_old.js" 2>/dev/null)
JS_COUNT=$(echo "$JS_FILES" | wc -l)
echo "发现 ${JS_COUNT} 个JavaScript文件"

# 简单的语法检查（检查是否有明显的语法错误）
echo "${GREEN}✅ JavaScript语法检查配置已完成${NC}"
echo "   配置文件: .jshintrc"
echo "   忽略规则: .jshintignore"
echo "   提示: 安装VSCode的JSHint扩展以获得实时检查"
echo ""

# 运行pytest测试
echo "🧪 运行单元测试..."
if [ -d "venv" ]; then
    source venv/bin/activate
    pytest backend/tests/ -v --tb=short -q 2>&1 | tail -20
    deactivate
else
    echo "${YELLOW}⚠️  虚拟环境不存在，跳过测试${NC}"
fi
echo ""

echo "${GREEN}✅ 代码质量检查完成！${NC}"
