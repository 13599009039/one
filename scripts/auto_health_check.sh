#!/bin/bash
# AJ快计 - 自动化健康监测脚本
# 功能：自动检测服务状态、日志错误、性能指标
# 运行频率：每5分钟执行一次（crontab）
# 位置：/root/ajkuaiji/scripts/auto_health_check.sh

set -e

# 配置
LOG_FILE="/var/log/ajkuaiji/health_check.log"
ALERT_FILE="/var/log/ajkuaiji/health_alerts.log"
FRONTEND_LOG="/var/log/ajkuaiji/frontend.log"
BACKEND_LOG="/var/log/ajkuaiji-api.log"

# 确保日志目录存在
mkdir -p /var/log/ajkuaiji

# 记录日志函数
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" | tee -a "$LOG_FILE" "$ALERT_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" | tee -a "$LOG_FILE" "$ALERT_FILE"
}

# ==================== 1. 服务状态检查 ====================
check_services() {
    log_info "========== 开始服务状态检查 =========="
    
    # 检查MySQL
    if systemctl is-active --quiet mysql; then
        log_info "✅ MySQL服务运行正常"
    else
        log_error "❌ MySQL服务未运行"
        systemctl start mysql && log_info "已尝试启动MySQL"
    fi
    
    # 检查Nginx
    if systemctl is-active --quiet nginx; then
        log_info "✅ Nginx服务运行正常"
    else
        log_error "❌ Nginx服务未运行"
        systemctl start nginx && log_info "已尝试启动Nginx"
    fi
    
    # 检查Flask API
    if systemctl is-active --quiet ajkuaiji-api; then
        log_info "✅ Flask API服务运行正常"
    else
        log_error "❌ Flask API服务未运行"
        systemctl start ajkuaiji-api && log_info "已尝试启动Flask API"
    fi
}

# ==================== 2. 日志错误检查 ====================
check_logs() {
    log_info "========== 开始日志错误检查 =========="
    
    # 检查前端日志（最近5分钟的错误）
    if [ -f "$FRONTEND_LOG" ]; then
        FRONTEND_ERRORS=$(grep -c "ERROR\|❌" "$FRONTEND_LOG" 2>/dev/null | tail -100 || echo 0)
        if [ "$FRONTEND_ERRORS" -gt 10 ]; then
            log_warning "⚠️ 前端日志发现 $FRONTEND_ERRORS 个错误（最近100行）"
            # 输出最近5个错误
            grep "ERROR\|❌" "$FRONTEND_LOG" | tail -5 >> "$ALERT_FILE"
        else
            log_info "✅ 前端日志无异常错误"
        fi
    fi
    
    # 检查后端日志（最近5分钟的错误）
    if [ -f "$BACKEND_LOG" ]; then
        BACKEND_ERRORS=$(grep -c "ERROR\|Exception\|Traceback" "$BACKEND_LOG" 2>/dev/null | tail -100 || echo 0)
        if [ "$BACKEND_ERRORS" -gt 5 ]; then
            log_warning "⚠️ 后端日志发现 $BACKEND_ERRORS 个错误（最近100行）"
            # 输出最近3个错误
            grep "ERROR\|Exception" "$BACKEND_LOG" | tail -3 >> "$ALERT_FILE"
        else
            log_info "✅ 后端日志无异常错误"
        fi
    fi
}

# ==================== 3. API健康检查 ====================
check_api_health() {
    log_info "========== 开始API健康检查 =========="
    
    # 检查API是否响应
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_info "✅ API健康检查通过（HTTP 200）"
    else
        log_error "❌ API健康检查失败（HTTP $HTTP_CODE）"
        # 尝试重启API服务
        systemctl restart ajkuaiji-api
        log_warning "已重启Flask API服务"
    fi
}

# ==================== 4. 磁盘空间检查 ====================
check_disk_space() {
    log_info "========== 开始磁盘空间检查 =========="
    
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt 80 ]; then
        log_warning "⚠️ 磁盘使用率过高: ${DISK_USAGE}%"
        # 清理旧日志（保留最近7天）
        find /var/log/ajkuaiji -name "*.log" -mtime +7 -delete
        log_info "已清理7天前的旧日志"
    else
        log_info "✅ 磁盘空间充足（使用率: ${DISK_USAGE}%）"
    fi
}

# ==================== 5. 数据库连接检查 ====================
check_database() {
    log_info "========== 开始数据库连接检查 =========="
    
    DB_STATUS=$(mysql -u ajkuaiji -p'@HNzb5z75b16' -e "SELECT 1;" 2>&1)
    
    if echo "$DB_STATUS" | grep -q "1"; then
        log_info "✅ 数据库连接正常"
    else
        log_error "❌ 数据库连接失败"
    fi
}

# ==================== 6. 性能指标监控 ====================
check_performance() {
    log_info "========== 开始性能指标监控 =========="
    
    # CPU使用率
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    log_info "CPU使用率: ${CPU_USAGE}%"
    
    # 内存使用率
    MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d. -f1)
    log_info "内存使用率: ${MEM_USAGE}%"
    
    if [ "$MEM_USAGE" -gt 80 ]; then
        log_warning "⚠️ 内存使用率过高: ${MEM_USAGE}%"
    fi
    
    # Flask进程数
    FLASK_PROCS=$(ps aux | grep "python.*app.py" | grep -v grep | wc -l)
    log_info "Flask进程数: $FLASK_PROCS"
    
    if [ "$FLASK_PROCS" -eq 0 ]; then
        log_error "❌ Flask进程不存在"
        systemctl start ajkuaiji-api
    fi
}

# ==================== 主执行流程 ====================
main() {
    log_info "#################### 开始自动化健康检查 ####################"
    
    # 执行所有检查
    check_services
    check_logs
    check_api_health
    check_disk_space
    check_database
    check_performance
    
    log_info "#################### 健康检查完成 ####################"
    echo "" >> "$LOG_FILE"
}

# 执行主函数
main
