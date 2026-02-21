#!/bin/bash
# 实时监控ERP系统日志脚本
# 作者: Qoder AI
# 用途: 实时检测错误、警告和异常行为

echo "🚀 启动ERP系统实时日志监控..."
echo "监控时间: $(date)"
echo "=========================================="

# 日志文件路径
API_LOG="/var/log/ajkuaiji-api.log"
FRONTEND_LOG="/var/log/ajkuaiji/frontend.log"
ERROR_LOG="/var/log/ajkuaiji_error.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查日志文件是否存在
check_log_files() {
    echo -e "${BLUE}[检查] 验证日志文件...${NC}"
    for log in "$API_LOG" "$FRONTEND_LOG" "$ERROR_LOG"; do
        if [[ -f "$log" ]]; then
            echo -e "${GREEN}✓${NC} $log 存在"
        else
            echo -e "${YELLOW}⚠${NC} $log 不存在"
        fi
    done
    echo ""
}

# 监控API错误
monitor_api_errors() {
    echo -e "${BLUE}[监控] API错误日志...${NC}"
    tail -f "$API_LOG" | while read line; do
        # 检测错误关键词
        if echo "$line" | grep -E "(ERROR|Exception|Traceback|500|400|401|403|404)" -q; then
            echo -e "${RED}[API错误] $(date '+%H:%M:%S')${NC} $line"
        elif echo "$line" | grep -E "(WARNING|warn)" -q; then
            echo -e "${YELLOW}[API警告] $(date '+%H:%M:%S')${NC} $line"
        fi
    done
}

# 监控前端错误
monitor_frontend_errors() {
    echo -e "${BLUE}[监控] 前端错误日志...${NC}"
    tail -f "$FRONTEND_LOG" | while read line; do
        if echo "$line" | grep -E "(error|Error|UI|DOM|undefined|null)" -q; then
            echo -e "${RED}[前端错误] $(date '+%H:%M:%S')${NC} $line"
        elif echo "$line" | grep -E "(warning|Warning)" -q; then
            echo -e "${YELLOW}[前端警告] $(date '+%H:%M:%S')${NC} $line"
        fi
    done
}

# 监控系统错误
monitor_system_errors() {
    echo -e "${BLUE}[监控] 系统错误日志...${NC}"
    tail -f "$ERROR_LOG" | while read line; do
        if echo "$line" | grep -E "(ERROR|Exception|Traceback|CRITICAL)" -q; then
            echo -e "${RED}[系统错误] $(date '+%H:%M:%S')${NC} $line"
        fi
    done
}

# 主监控循环
main_monitor() {
    check_log_files
    
    echo -e "${GREEN}开始实时监控...${NC}"
    echo "按 Ctrl+C 停止监控"
    echo ""
    
    # 启动多个监控进程
    monitor_api_errors &
    API_PID=$!
    
    monitor_frontend_errors &
    FRONTEND_PID=$!
    
    monitor_system_errors &
    SYSTEM_PID=$!
    
    # 等待中断信号
    trap "echo -e '\n${YELLOW}停止监控...${NC}'; kill $API_PID $FRONTEND_PID $SYSTEM_PID 2>/dev/null; exit 0" INT
    
    # 保持运行
    wait
}

# 执行主函数
main_monitor
