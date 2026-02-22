#!/bin/bash
# 爱佳会计系统管理脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/root/ajkuaiji"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
}

print_info() {
    echo -e "${BLUE}[i] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

# 显示菜单
show_menu() {
    clear
    echo "======================================"
    echo "   爱佳财务系统 - 管理控制台"
    echo "======================================"
    echo ""
    echo "1. 启动服务"
    echo "2. 停止服务"
    echo "3. 重启服务"
    echo "4. 查看服务状态"
    echo "5. 查看访问日志（最新20条）"
    echo "6. 查看错误日志（最新20条）"
    echo "7. 数据备份"
    echo "8. 数据恢复"
    echo "9. 清理浏览器缓存提示"
    echo "10. 系统信息"
    echo "0. 退出"
    echo ""
    echo -n "请选择操作 [0-10]: "
}

# 启动服务
start_service() {
    print_info "正在启动Nginx服务..."
    sudo systemctl start nginx
    if [ $? -eq 0 ]; then
        print_success "服务启动成功！"
        print_info "访问地址: http://47.98.60.197/financial_system.html"
    else
        print_error "服务启动失败"
    fi
}

# 停止服务
stop_service() {
    print_info "正在停止Nginx服务..."
    sudo systemctl stop nginx
    if [ $? -eq 0 ]; then
        print_success "服务已停止"
    else
        print_error "服务停止失败"
    fi
}

# 重启服务
restart_service() {
    print_info "正在重启Nginx服务..."
    sudo systemctl restart nginx
    if [ $? -eq 0 ]; then
        print_success "服务重启成功！"
        print_info "访问地址: http://47.98.60.197/financial_system.html"
    else
        print_error "服务重启失败"
    fi
}

# 查看服务状态
check_status() {
    print_info "Nginx服务状态："
    sudo systemctl status nginx --no-pager | head -15
    echo ""
    print_info "端口监听状态："
    sudo netstat -tlnp | grep :80
}

# 查看访问日志
view_access_log() {
    print_info "最新20条访问日志："
    sudo tail -20 /var/log/nginx/ajkuaiji_access.log
}

# 查看错误日志
view_error_log() {
    print_info "最新20条错误日志："
    sudo tail -20 /var/log/nginx/ajkuaiji_error.log
}

# 数据备份
backup_data() {
    BACKUP_DIR="/root/ajkuaiji_backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/ajkuaiji_backup_$TIMESTAMP.tar.gz"
    
    print_info "正在备份数据到: $BACKUP_FILE"
    
    tar -czf "$BACKUP_FILE" -C /root ajkuaiji
    
    if [ $? -eq 0 ]; then
        print_success "数据备份成功！"
        print_info "备份文件: $BACKUP_FILE"
        
        # 只保留最近5个备份
        cd "$BACKUP_DIR"
        ls -t ajkuaiji_backup_*.tar.gz | tail -n +6 | xargs -r rm
        print_info "已清理旧备份，保留最近5个"
    else
        print_error "数据备份失败"
    fi
}

# 数据恢复
restore_data() {
    BACKUP_DIR="/root/ajkuaiji_backups"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "备份目录不存在: $BACKUP_DIR"
        return
    fi
    
    print_info "可用的备份文件："
    ls -lht "$BACKUP_DIR"/ajkuaiji_backup_*.tar.gz | head -5
    
    echo ""
    echo -n "请输入要恢复的备份文件名（或按回车取消）: "
    read backup_file
    
    if [ -z "$backup_file" ]; then
        print_warning "取消恢复操作"
        return
    fi
    
    BACKUP_PATH="$BACKUP_DIR/$backup_file"
    
    if [ ! -f "$BACKUP_PATH" ]; then
        print_error "备份文件不存在: $BACKUP_PATH"
        return
    fi
    
    print_warning "警告：此操作将覆盖当前数据！"
    echo -n "确定要恢复吗？(yes/no): "
    read confirm
    
    if [ "$confirm" != "yes" ]; then
        print_warning "取消恢复操作"
        return
    fi
    
    print_info "正在恢复数据..."
    
    # 先备份当前数据
    mv /root/ajkuaiji /root/ajkuaiji_before_restore
    
    # 恢复备份
    tar -xzf "$BACKUP_PATH" -C /root
    
    if [ $? -eq 0 ]; then
        print_success "数据恢复成功！"
        rm -rf /root/ajkuaiji_before_restore
        restart_service
    else
        print_error "数据恢复失败，正在回滚..."
        rm -rf /root/ajkuaiji
        mv /root/ajkuaiji_before_restore /root/ajkuaiji
        print_info "已回滚到恢复前的状态"
    fi
}

# 清理缓存提示
clear_cache_tip() {
    print_info "清理浏览器缓存方法："
    echo ""
    echo "Chrome/Edge:"
    echo "  - 按 Ctrl+Shift+Delete"
    echo "  - 或者访问时按 Ctrl+Shift+R 强制刷新"
    echo ""
    echo "Firefox:"
    echo "  - 按 Ctrl+Shift+Delete"
    echo "  - 或者访问时按 Ctrl+F5 强制刷新"
    echo ""
    echo "Safari:"
    echo "  - 按 Cmd+Option+E 清空缓存"
    echo "  - 或者访问时按 Cmd+Shift+R 强制刷新"
}

# 系统信息
show_system_info() {
    print_info "系统信息"
    echo "----------------------------"
    echo "服务器IP: 47.98.60.197"
    echo "访问地址: http://47.98.60.197/financial_system.html"
    echo "项目目录: $PROJECT_DIR"
    echo "Nginx配置: /etc/nginx/sites-available/ajkuaiji"
    echo "访问日志: /var/log/nginx/ajkuaiji_access.log"
    echo "错误日志: /var/log/nginx/ajkuaiji_error.log"
    echo "备份目录: /root/ajkuaiji_backups"
    echo ""
    echo "磁盘使用："
    df -h | grep -E "Filesystem|/dev/vda"
    echo ""
    echo "内存使用："
    free -h
}

# 主循环
main() {
    while true; do
        show_menu
        read choice
        
        case $choice in
            1)
                start_service
                ;;
            2)
                stop_service
                ;;
            3)
                restart_service
                ;;
            4)
                check_status
                ;;
            5)
                view_access_log
                ;;
            6)
                view_error_log
                ;;
            7)
                backup_data
                ;;
            8)
                restore_data
                ;;
            9)
                clear_cache_tip
                ;;
            10)
                show_system_info
                ;;
            0)
                print_info "退出管理控制台"
                exit 0
                ;;
            *)
                print_error "无效选项，请重新选择"
                ;;
        esac
        
        echo ""
        echo -n "按回车键继续..."
        read
    done
}

# 运行主程序
main
