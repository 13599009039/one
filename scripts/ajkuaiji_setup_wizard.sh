#!/bin/bash
# 爱佳财务系统 - 首次使用配置向导

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════╗"
    echo "║   爱佳财务系统 - 首次使用配置向导         ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 步骤1: 欢迎信息
step1_welcome() {
    print_header
    echo ""
    echo -e "${CYAN}欢迎使用爱佳财务系统！${NC}"
    echo ""
    echo "本向导将引导您完成首次配置，大约需要5-10分钟。"
    echo ""
    echo "配置内容包括："
    echo "  1. 修改管理员密码"
    echo "  2. 配置公司信息"
    echo "  3. 创建初始用户"
    echo "  4. 进行数据备份"
    echo "  5. 测试系统功能"
    echo ""
    echo -n "准备好了吗？按回车开始..."
    read
}

# 步骤2: 安全检查
step2_security_check() {
    print_header
    echo -e "${YELLOW}步骤 1/5: 安全检查${NC}"
    echo ""
    
    print_info "正在检查系统配置..."
    echo ""
    
    # 检查Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx服务运行正常"
    else
        print_error "Nginx服务未运行"
        echo -n "是否现在启动？(y/n): "
        read start_nginx
        if [ "$start_nginx" = "y" ]; then
            sudo systemctl start nginx
            print_success "Nginx已启动"
        fi
    fi
    
    # 检查访问
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/financial_system.html | grep -q "200"; then
        print_success "系统可以正常访问"
    else
        print_warning "系统访问可能有问题，请检查配置"
    fi
    
    # 检查备份目录
    if [ ! -d "/root/ajkuaiji_backups" ]; then
        mkdir -p /root/ajkuaiji_backups
        print_success "已创建备份目录"
    else
        print_success "备份目录已存在"
    fi
    
    echo ""
    echo -n "按回车继续..."
    read
}

# 步骤3: 修改管理员密码
step3_change_password() {
    print_header
    echo -e "${YELLOW}步骤 2/5: 修改管理员密码${NC}"
    echo ""
    
    print_warning "当前管理员密码为默认密码(123456)，强烈建议修改！"
    echo ""
    
    echo -n "是否要修改管理员密码？(y/n): "
    read change_pwd
    
    if [ "$change_pwd" != "y" ]; then
        print_warning "已跳过密码修改，请稍后手动修改！"
        echo -n "按回车继续..."
        read
        return
    fi
    
    echo ""
    echo "请设置新密码（建议8位以上，包含字母、数字和特殊字符）"
    echo -n "新密码: "
    read -s new_password
    echo ""
    echo -n "确认密码: "
    read -s confirm_password
    echo ""
    
    if [ "$new_password" != "$confirm_password" ]; then
        print_error "两次密码输入不一致！"
        echo -n "按回车重试..."
        read
        step3_change_password
        return
    fi
    
    if [ ${#new_password} -lt 6 ]; then
        print_error "密码长度不能少于6位！"
        echo -n "按回车重试..."
        read
        step3_change_password
        return
    fi
    
    print_info "正在修改密码..."
    
    # 备份原文件
    cp /root/ajkuaiji/modules/database.js /root/ajkuaiji/modules/database.js.backup
    
    # 替换密码（简单示例，实际应该更安全）
    sed -i "s/username: \"admin\", password: \"123456\"/username: \"admin\", password: \"$new_password\"/g" /root/ajkuaiji/modules/database.js
    
    print_success "管理员密码已修改！"
    print_info "新密码: $new_password"
    print_warning "请务必记住新密码，并妥善保管！"
    
    echo ""
    echo -n "按回车继续..."
    read
}

# 步骤4: 配置公司信息
step4_company_config() {
    print_header
    echo -e "${YELLOW}步骤 3/5: 配置公司信息${NC}"
    echo ""
    
    echo "当前默认公司："
    echo "  • 许昌爱佳网络科技有限公司"
    echo "  • 许昌雷韵文化传媒有限公司"
    echo ""
    
    echo -n "是否需要修改公司信息？(y/n): "
    read modify_company
    
    if [ "$modify_company" != "y" ]; then
        print_info "已跳过公司信息配置"
        echo -n "按回车继续..."
        read
        return
    fi
    
    print_info "请在系统中通过【系统设置】→【公司管理】进行修改"
    print_info "或直接编辑文件: /root/ajkuaiji/modules/database.js"
    
    echo ""
    echo -n "按回车继续..."
    read
}

# 步骤5: 创建数据备份
step5_backup() {
    print_header
    echo -e "${YELLOW}步骤 4/5: 创建初始备份${NC}"
    echo ""
    
    print_info "正在创建系统初始备份..."
    echo ""
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="/root/ajkuaiji_backups/ajkuaiji_initial_backup_$TIMESTAMP.tar.gz"
    
    tar -czf "$BACKUP_FILE" -C /root ajkuaiji 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "备份创建成功！"
        print_info "备份文件: $BACKUP_FILE"
        
        # 显示备份大小
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        print_info "备份大小: $BACKUP_SIZE"
    else
        print_error "备份创建失败"
    fi
    
    echo ""
    echo -n "按回车继续..."
    read
}

# 步骤6: 访问测试
step6_test() {
    print_header
    echo -e "${YELLOW}步骤 5/5: 访问测试${NC}"
    echo ""
    
    print_info "系统访问信息："
    echo ""
    echo -e "  ${GREEN}访问地址:${NC} http://47.98.60.197/financial_system.html"
    echo ""
    echo -e "  ${GREEN}管理员账号:${NC}"
    echo "    用户名: admin"
    echo "    密码: (您刚才设置的新密码)"
    echo ""
    echo -e "  ${GREEN}其他测试账号:${NC}"
    echo "    ajadmin / 123456 (公司管理员)"
    echo "    ajentry / 123456 (财务录入员)"
    echo "    ajview  / 123456 (财务查看员)"
    echo ""
    
    print_warning "提示: 首次访问可能需要清除浏览器缓存 (Ctrl+Shift+R)"
    
    echo ""
    echo -n "按回车继续..."
    read
}

# 步骤7: 完成配置
step7_finish() {
    print_header
    echo -e "${GREEN}✓ 配置完成！${NC}"
    echo ""
    
    echo "═══════════════════════════════════════════"
    echo ""
    echo -e "${CYAN}重要信息摘要：${NC}"
    echo ""
    echo "📋 访问地址:"
    echo "   http://47.98.60.197/financial_system.html"
    echo ""
    echo "👤 管理员账号:"
    echo "   用户名: admin"
    echo "   密码: (您设置的新密码)"
    echo ""
    echo "🛠 管理工具:"
    echo "   /root/ajkuaiji_manager.sh"
    echo ""
    echo "📚 文档位置:"
    echo "   /root/ajkuaiji_deployment_guide.md (部署指南)"
    echo "   /root/ajkuaiji_user_permissions.md (权限配置)"
    echo ""
    echo "💾 备份目录:"
    echo "   /root/ajkuaiji_backups/"
    echo ""
    echo "═══════════════════════════════════════════"
    echo ""
    
    print_info "下一步建议："
    echo ""
    echo "  1. 在浏览器中访问系统"
    echo "  2. 使用admin账号登录"
    echo "  3. 修改其他测试账号的密码"
    echo "  4. 添加实际使用的用户账号"
    echo "  5. 录入公司真实数据"
    echo "  6. 配置定时备份任务"
    echo ""
    
    print_success "系统已准备就绪，祝您使用愉快！"
    echo ""
}

# 主流程
main() {
    step1_welcome
    step2_security_check
    step3_change_password
    step4_company_config
    step5_backup
    step6_test
    step7_finish
}

# 运行
main
