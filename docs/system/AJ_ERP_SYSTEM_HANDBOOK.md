# AJ_ERP_SYSTEM_HANDBOOK.md (系统手册)
# AJ快计ERP系统 - 系统手册

**文档版本**: v1.0  
**创建日期**: 2026-02-17  
**文档类型**: 系统手册  
**适用范围**: 系统管理员、运维人员、技术支持  

---

## 📋 系统部署指南

### 环境准备

#### 服务器配置要求
- **操作系统**: Linux Ubuntu 24.04 LTS
- **CPU**: 4核以上
- **内存**: 8GB以上
- **存储**: 100GB SSD以上
- **网络**: 公网IP，开放80/443端口

#### 软件环境
```bash
# 系统依赖
apt update && apt upgrade -y
apt install -y nginx mysql-server python3 python3-pip git

# Python虚拟环境
python3 -m venv /root/ajkuaiji-env-39
source /root/ajkuaiji-env-39/bin/activate
pip install flask pymysql

# 宝塔面板（可选）
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh
bash install.sh
```

### 系统安装步骤

#### 1. 代码部署
```bash
# 克隆代码仓库
cd /root
git clone <repository-url> ajkuaiji
cd ajkuaiji

# 安装Python依赖
source /root/ajkuaiji-env-39/bin/activate
pip install -r backend/requirements.txt
```

#### 2. 数据库配置
```sql
-- 创建数据库
CREATE DATABASE ajkuaiji CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'ajkuaiji'@'localhost' IDENTIFIED BY '@HNzb5z75b16';
GRANT ALL PRIVILEGES ON ajkuaiji.* TO 'ajkuaiji'@'localhost';
FLUSH PRIVILEGES;

-- 导入初始数据
USE ajkuaiji;
SOURCE /root/ajkuaiji/database/schema.sql;
SOURCE /root/ajkuaiji/database/initial_data.sql;
```

#### 3. Nginx配置
```nginx
# /etc/nginx/sites-available/ajkuaiji
server {
    listen 80;
    server_name erp.xnamb.cn;
    
    # API反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:8050/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件服务
    location / {
        root /root/ajkuaiji;
        index financial_system.html;
        try_files $uri $uri/ /financial_system.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /root/ajkuaiji;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 4. 启动服务
```bash
# 启动Flask应用
cd /root/ajkuaiji/backend
nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &

# 启动Nginx
systemctl start nginx
systemctl enable nginx

# 验证服务
curl http://localhost:8050/api/health
curl http://erp.xnamb.cn/api/health
```

---

## 🔧 系统运维手册

### 日常监控

#### 1. 服务状态检查
```bash
# 检查Flask服务
ps aux | grep "python.*app.py"
netstat -tuln | grep 8050

# 检查Nginx服务
systemctl status nginx
nginx -t

# 检查MySQL服务
systemctl status mysql
mysql -u ajkuaiji -p'@HNzb5z75b16' -e "SELECT 1;"
```

#### 2. 日志监控
```bash
# 前端日志
tail -f /var/log/ajkuaiji/frontend.log

# 后端日志
tail -f /var/log/ajkuaiji-api.log

# Nginx访问日志
tail -f /var/log/nginx/access.log

# Nginx错误日志
tail -f /var/log/nginx/error.log
```

#### 3. 性能监控
```bash
# 系统资源使用
htop
df -h
free -m

# 数据库性能
mysql -u ajkuaiji -p'@HNzb5z75b16' -e "SHOW PROCESSLIST;"
mysql -u ajkuaiji -p'@HNzb5z75b16' -e "SHOW STATUS LIKE 'Threads_connected';"
```

### 常见问题处理

#### 问题1: 500 Internal Server Error
```bash
# 诊断步骤
1. 检查后端日志: tail -100 /var/log/ajkuaiji-api.log
2. 检查数据库连接: mysql -u ajkuaiji -p'@HNzb5z75b16' -e "SELECT 1;"
3. 重启Flask服务: pkill -f "python.*app.py" && cd /root/ajkuaiji/backend && nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &

# 预防措施
- 定期检查数据库连接池
- 监控内存使用情况
- 设置自动重启脚本
```

#### 问题2: 502 Bad Gateway
```bash
# 诊断步骤
1. 检查Flask服务是否运行: netstat -tuln | grep 8050
2. 检查Nginx配置: nginx -t
3. 检查端口占用: lsof -i:8050

# 解决方案
# 重启Flask服务
pkill -9 -f "python3_exec.*app.py"
cd /root/ajkuaiji/backend
nohup ./python3_exec app.py > /var/log/ajkuaiji-api-new.log 2>&1 &

# 重启Nginx
nginx -s reload
```

#### 问题3: 前端页面加载缓慢
```bash
# 诊断步骤
1. 检查网络连接: ping erp.xnamb.cn
2. 检查静态资源: curl -I http://erp.xnamb.cn/css/style.css
3. 检查浏览器控制台错误

# 优化建议
- 启用Nginx gzip压缩
- 配置CDN加速
- 优化图片资源大小
- 启用浏览器缓存
```

### 数据备份与恢复

#### 1. 自动备份脚本
```bash
#!/bin/bash
# /root/backup_ajkuaiji.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# 数据库备份
mysqldump -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji > $BACKUP_DIR/ajkuaiji_db_$DATE.sql

# 代码备份
tar -czf $BACKUP_DIR/ajkuaiji_code_$DATE.tar.gz -C /root ajkuaiji

# 日志备份
tar -czf $BACKUP_DIR/ajkuaiji_logs_$DATE.tar.gz -C /var/log ajkuaiji*

# 清理7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

#### 2. 恢复流程
```bash
# 恢复数据库
mysql -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji < /root/backups/ajkuaiji_db_20260217_120000.sql

# 恢复代码
cd /root
tar -xzf /root/backups/ajkuaiji_code_20260217_120000.tar.gz

# 重启服务
systemctl restart nginx
pkill -f "python.*app.py"
cd /root/ajkuaiji/backend && nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &
```

---

## 🛠️ 故障诊断手册

### 前端故障诊断

#### 诊断流程
1. **浏览器控制台检查**
   ```javascript
   // 打开F12开发者工具
   // 检查Console面板的JavaScript错误
   // 检查Network面板的API请求状态
   // 检查Elements面板的DOM结构
   ```

2. **前端日志检查**
   ```bash
   # 查看前端日志文件
   tail -f /var/log/ajkuaiji/frontend.log
   
   # 搜索错误关键词
   grep "ERROR\|❌\|failed" /var/log/ajkuaiji/frontend.log
   ```

3. **UI状态验证**
   ```javascript
   // 在浏览器Console中执行
   // 检查页面容器
   document.querySelectorAll('[id$="Page"]');
   
   // 检查隐藏元素
   document.querySelectorAll('.hidden');
   
   // 检查特定元素是否存在
   document.getElementById('myModal');
   ```

### 后端故障诊断

#### 诊断流程
1. **服务状态检查**
   ```bash
   # 检查Flask API服务
   systemctl status ajkuaiji-api
   
   # 检查进程
   ps aux | grep "python.*app.py"
   
   # 检查端口占用
   netstat -tunlp | grep 8050
   ```

2. **后端日志检查**
   ```bash
   # 查看API日志
   tail -f /var/log/ajkuaiji-api.log
   
   # 查看系统服务日志
   journalctl -u ajkuaiji-api -f
   
   # 搜索错误
   grep "ERROR\|Exception\|Traceback" /var/log/ajkuaiji-api.log
   ```

3. **数据库连接检查**
   ```bash
   # 测试数据库连接
   mysql -u ajkuaiji -p'@HNzb5z75b16' -e "SELECT 1;"
   
   # 检查MySQL服务
   systemctl status mysql
   ```

### 网络故障诊断

#### 诊断流程
1. **网络连通性检查**
   ```bash
   # 检查服务器连通性
   ping 47.98.60.197
   
   # 检查端口开放
   telnet 47.98.60.197 80
   telnet 47.98.60.197 443
   
   # 检查DNS解析
   nslookup erp.xnamb.cn
   ```

2. **SSL证书检查**
   ```bash
   # 检查SSL证书有效期
   openssl x509 -in /path/to/certificate.crt -text -noout | grep "Not After"
   
   # 检查证书链
   openssl s_client -connect erp.xnamb.cn:443 -showcerts
   ```

---

## 📊 性能优化指南

### 前端性能优化

#### 1. 资源优化
```html
<!-- 启用gzip压缩 -->
gzip on;
gzip_types text/css application/javascript application/json;

<!-- 启用浏览器缓存 -->
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

<!-- 合并CSS/JS文件 -->
<!-- 使用CDN加速静态资源 -->
```

#### 2. 代码优化
```javascript
// 减少DOM操作
// 使用事件委托
// 避免内存泄漏
// 合理使用异步加载
```

### 后端性能优化

#### 1. 数据库优化
```sql
-- 添加必要索引
ALTER TABLE orders ADD INDEX idx_tenant_created (tenant_id, created_at);
ALTER TABLE customers ADD INDEX idx_tenant_status (tenant_id, status);

-- 优化慢查询
EXPLAIN SELECT * FROM orders WHERE tenant_id = 1 AND status = 'pending';

-- 定期清理历史数据
DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

#### 2. 应用优化
```python
# 使用连接池
from flask import g
import pymysql.pool

# 启用缓存
from flask_caching import Cache
cache = Cache(config={'CACHE_TYPE': 'simple'})

# 异步处理耗时操作
from celery import Celery
```

### 系统层面优化

#### 1. Nginx优化
```nginx
# 调整worker进程数
worker_processes auto;

# 调整连接数限制
events {
    worker_connections 1024;
}

# 启用HTTP/2
listen 443 ssl http2;
```

#### 2. 系统优化
```bash
# 调整文件描述符限制
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# 调整TCP参数
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
```

---

## 🔒 安全加固指南

### 系统安全

#### 1. 防火墙配置
```bash
# 启用ufw防火墙
ufw enable
ufw default deny incoming
ufw default allow outgoing

# 开放必要端口
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3306/tcp from 127.0.0.1

# 限制SSH访问
ufw limit ssh
```

#### 2. SSH安全
```bash
# 禁用root登录
PermitRootLogin no

# 更改默认端口
Port 2222

# 禁用密码登录
PasswordAuthentication no

# 限制登录用户
AllowUsers deploy-user
```

### 应用安全

#### 1. 输入验证
```python
# 防止SQL注入
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# 防止XSS攻击
from markupsafe import escape
safe_input = escape(user_input)

# 防止CSRF攻击
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)
```

#### 2. 权限控制
```python
# 强制多租户隔离
@require_tenant_auth
def get_orders():
    tenant_id = session.get('tenant_id')
    # 查询必须包含tenant_id过滤
    sql = "SELECT * FROM orders WHERE tenant_id = %s"
```

### 数据安全

#### 1. 数据加密
```python
# 敏感数据加密存储
from cryptography.fernet import Fernet
key = Fernet.generate_key()
cipher_suite = Fernet(key)

# 密码哈希
from werkzeug.security import generate_password_hash, check_password_hash
hashed_password = generate_password_hash(password)
```

#### 2. 备份加密
```bash
# 加密备份文件
gpg --symmetric --cipher-algo AES256 backup.sql
```

---

## 📈 监控告警配置

### 基础监控

#### 1. 系统监控脚本
```bash
#!/bin/bash
# /root/monitor_system.sh

# CPU使用率
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if (( $(echo "$cpu_usage > 80" | bc -l) )); then
    echo "CPU usage is high: $cpu_usage%" | mail -s "High CPU Alert" admin@example.com
fi

# 内存使用率
mem_usage=$(free | grep Mem | awk '{printf("%.2f"), $3/$2 * 100.0}')
if (( $(echo "$mem_usage > 85" | bc -l) )); then
    echo "Memory usage is high: $mem_usage%" | mail -s "High Memory Alert" admin@example.com
fi

# 磁盘使用率
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $disk_usage -gt 90 ]; then
    echo "Disk usage is high: $disk_usage%" | mail -s "High Disk Alert" admin@example.com
fi
```

#### 2. 服务监控
```bash
#!/bin/bash
# /root/monitor_services.sh

# 检查Flask服务
if ! pgrep -f "python.*app.py" > /dev/null; then
    echo "Flask service is down" | mail -s "Service Down Alert" admin@example.com
    # 重启服务
    cd /root/ajkuaiji/backend && nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &
fi

# 检查Nginx服务
if ! systemctl is-active --quiet nginx; then
    echo "Nginx service is down" | mail -s "Service Down Alert" admin@example.com
    systemctl start nginx
fi
```

### 日志分析

#### 1. 错误日志监控
```bash
#!/bin/bash
# /root/monitor_errors.sh

# 监控前端错误
tail -100 /var/log/ajkuaiji/frontend.log | grep "ERROR" > /tmp/frontend_errors.txt
if [ -s /tmp/frontend_errors.txt ]; then
    mail -s "Frontend Errors Detected" admin@example.com < /tmp/frontend_errors.txt
fi

# 监控后端错误
tail -100 /var/log/ajkuaiji-api.log | grep "ERROR\|Exception" > /tmp/backend_errors.txt
if [ -s /tmp/backend_errors.txt ]; then
    mail -s "Backend Errors Detected" admin@example.com < /tmp/backend_errors.txt
fi
```

---

## 🆘 应急响应预案

### 一级故障（系统完全不可用）

#### 响应流程
1. **立即响应**（5分钟内）
   - 确认故障范围
   - 通知相关人员
   - 启动应急预案

2. **故障诊断**（15分钟内）
   - 检查服务器状态
   - 检查网络连通性
   - 检查服务进程

3. **恢复操作**（30分钟内）
   ```bash
   # 紧急重启所有服务
   systemctl restart nginx
   pkill -9 -f "python.*app.py"
   systemctl restart mysql
   
   # 启动应用
   cd /root/ajkuaiji/backend
   nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &
   ```

4. **验证恢复**（10分钟内）
   - 访问系统首页
   - 测试核心功能
   - 监控系统状态

### 二级故障（部分功能异常）

#### 响应流程
1. **快速诊断**（10分钟内）
   - 确定异常功能模块
   - 检查相关日志
   - 分析影响范围

2. **针对性修复**（1小时内）
   ```bash
   # 根据具体问题执行相应修复
   # 如：重启特定服务、修复配置文件、回滚代码等
   ```

3. **验证测试**（30分钟内）
   - 测试修复功能
   - 验证相关模块
   - 监控系统稳定性

### 三级故障（性能下降）

#### 响应流程
1. **性能分析**（30分钟内）
   ```bash
   # 分析系统瓶颈
   top -p $(pgrep -f "python.*app.py")
   mysql -u ajkuaiji -p'@HNzb5z75b16' -e "SHOW PROCESSLIST;"
   ```

2. **优化调整**（2小时内）
   - 调整系统参数
   - 优化数据库查询
   - 清理缓存数据

3. **效果验证**（1小时内）
   - 监控性能指标
   - 对比优化前后
   - 持续观察稳定性

---

**文档维护**: 系统运维团队  
**最后更新**: 2026-02-17