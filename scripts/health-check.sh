#!/bin/bash
#
# 移动端ERP系统健康检查脚本
# 用途：定期检查系统各组件的运行状态
# 使用：./health-check.sh
# 建议：添加到crontab，每5分钟执行一次
#

# 配置
FLASK_PORT=8050
DOMAIN="m.erp.xnamb.cn"
LOG_FILE="/var/log/mobile-erp-health.log"

# 时间戳
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 日志函数
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# 检查Flask服务
check_flask() {
    if pgrep -f "flask.*${FLASK_PORT}" > /dev/null; then
        log "[OK] Flask服务运行正常（端口${FLASK_PORT}）"
        return 0
    else
        log "[ERROR] Flask服务未运行在端口${FLASK_PORT}"
        # 尝试自动重启
        log "[INFO] 尝试自动重启Flask服务..."
        cd /root/ajkuaiji/backend
        nohup python app.py > flask.log 2>&1 &
        sleep 3
        if pgrep -f "flask.*${FLASK_PORT}" > /dev/null; then
            log "[OK] Flask服务已成功重启"
            return 0
        else
            log "[ERROR] Flask服务重启失败，请人工介入"
            return 1
        fi
    fi
}

# 检查Nginx服务
check_nginx() {
    if systemctl is-active --quiet nginx; then
        log "[OK] Nginx服务运行正常"
        return 0
    else
        log "[ERROR] Nginx服务未运行"
        # 尝试自动重启
        log "[INFO] 尝试自动重启Nginx服务..."
        systemctl start nginx
        if systemctl is-active --quiet nginx; then
            log "[OK] Nginx服务已成功重启"
            return 0
        else
            log "[ERROR] Nginx服务重启失败，请人工介入"
            return 1
        fi
    fi
}

# 检查API连通性
check_api() {
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/api/health" --max-time 10)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        log "[OK] API接口可访问（HTTP ${HTTP_CODE}）"
        return 0
    else
        log "[ERROR] API接口不可访问（HTTP ${HTTP_CODE}）"
        return 1
    fi
}

# 检查主页访问
check_homepage() {
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/" --max-time 10)
    if [ "$HTTP_CODE" = "200" ]; then
        log "[OK] 主页访问正常（HTTP ${HTTP_CODE}）"
        return 0
    else
        log "[ERROR] 主页访问异常（HTTP ${HTTP_CODE}）"
        return 1
    fi
}

# 检查磁盘空间
check_disk() {
    DISK_USAGE=$(df -h /root | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        log "[OK] 磁盘空间充足（已使用${DISK_USAGE}%）"
        return 0
    elif [ "$DISK_USAGE" -lt 90 ]; then
        log "[WARNING] 磁盘空间不足（已使用${DISK_USAGE}%）"
        return 0
    else
        log "[ERROR] 磁盘空间严重不足（已使用${DISK_USAGE}%）"
        return 1
    fi
}

# 主函数
main() {
    log "=== 开始健康检查 ==="
    
    ERROR_COUNT=0
    
    check_flask || ((ERROR_COUNT++))
    check_nginx || ((ERROR_COUNT++))
    check_api || ((ERROR_COUNT++))
    check_homepage || ((ERROR_COUNT++))
    check_disk || ((ERROR_COUNT++))
    
    if [ $ERROR_COUNT -eq 0 ]; then
        log "[SUMMARY] 所有检查通过 ✓"
    else
        log "[SUMMARY] 发现 ${ERROR_COUNT} 个问题 ✗"
    fi
    
    log "=== 健康检查完成 ==="
    echo ""
}

# 执行检查
main
