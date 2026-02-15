# 开发配置文档 (Development Configuration)

**项目**: 企业资源计划管理系统 (ERP)  
**版本**: 14.0  
**最后更新**: 2026年2月11日  
**目的**: 快速同步开发环境配置，支持多客户端开发

---

## 🖥️ 服务器信息

### 生产服务器

| 项目 | 配置 |
|------|------|
| **服务器IP** | 47.98.60.197 |
| **操作系统** | Linux Ubuntu 24.04 |
| **项目路径** | /root/ajkuaiji |
| **访问地址** | http://47.98.60.197/financial_system.html |
| **控制台地址** | http://47.98.60.197/console.html |

### SSH登录

```bash
ssh root@47.98.60.197
# 密码: [请在安全的地方记录]
```

---

## 🗄️ 数据库配置

### MySQL数据库

```python
DB_CONFIG = {
    'host': '47.98.60.197',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'port': 3306,
    'charset': 'utf8mb4'
}
```

### 连接命令

```bash
mysql -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji
```

### 数据库表列表（24张表）

1. users - 用户表
2. customers - 客户表
3. customer_contacts - 客户联系人表
4. customer_memos - 客户备忘录表
5. orders - 订单表
6. order_items - 订单明细表
7. task_pool - 任务池表
8. task_costs - 任务成本表
9. cost_categories - 成本类别表
10. transactions - 财务流水表
11. transaction_categories - 流水分类表
12. companies - 公司表
13. accounts - 账户表
14. departments - 部门表
15. teams - 团队表
16. positions - 岗位表
17. services - 服务项表
18. suppliers - 供应商表
19. purchases - 采购表
20. product_custom_fields - 商品自定义字段表
21. product_custom_field_values - 商品自定义字段值表
22. product_type_templates - 商品类型模板表
23. system_settings - 系统设置表
24. tasks - 任务表

---

## 🔧 技术栈

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.12.3 | 后端语言 |
| Flask | 2.3.3 | Web框架 |
| PyMySQL | 1.1.0 | MySQL驱动 |
| Flask-CORS | 4.0.0 | 跨域支持 |
| Gunicorn | 21.2.0 | WSGI服务器 |
| MySQL | 8.0.36 | 数据库 |
| Nginx | 1.24.0 | Web服务器 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| JavaScript | ES6+ | 业务逻辑 |
| HTML5 | - | 页面结构 |
| Tailwind CSS | 2.2.19 | UI样式 |
| Font Awesome | 6.0.0 | 图标库 |
| Chart.js | 3.7.0 | 数据可视化 |

---

## 📂 项目结构

```
/root/ajkuaiji/
├── financial_system.html          # 主系统入口
├── console.html                    # 超级控制台入口
├── DEV_CONFIG.md                   # 开发配置文档（本文件）
├── 系统说明文档.md                  # 系统说明文档
├── PRODUCTION_GUIDE.md             # 生产运维手册
├── modules/                        # 前端JavaScript模块
│   ├── api.js                     # API接口封装
│   ├── core.js                    # 核心初始化
│   ├── database.js                # 数据管理
│   ├── login.js                   # 登录模块
│   ├── navigation.js              # 导航菜单
│   ├── dashboard.js               # 仪表盘
│   ├── customers.js               # 客户管理
│   ├── orders.js                  # 订单管理
│   ├── taskpool.js                # 任务池
│   ├── transactions.js            # 财务流水
│   ├── categories.js              # 流水分类
│   ├── organization.js            # 组织架构
│   ├── services.js                # 服务项管理
│   ├── inventory.js               # 库存管理
│   ├── reports.js                 # 报表
│   ├── settings.js                # 系统设置
│   ├── recycle.js                 # 回收站
│   ├── template-manager.js        # 模板管理
│   └── user-menu.js               # 用户菜单
├── backend/                        # 后端Python代码
│   ├── app.py                     # Flask主应用（1657行）
│   ├── requirements.txt           # Python依赖
│   ├── venv/                      # Python虚拟环境
│   ├── init_database.sql          # 数据库初始化
│   ├── create_tables.sql          # 建表SQL
│   ├── migrate_data.py            # 数据迁移脚本
│   └── product_template_api.py    # 商品模板API
├── start_production.sh             # 生产环境一键启动脚本
├── ajkuaiji-api.service           # systemd服务配置
└── shangjaimingxi.csv             # 原始商家数据
```

---

## 🚀 服务管理

### 三大核心服务

#### 1. MySQL数据库

```bash
# 启动
sudo systemctl start mysql

# 停止
sudo systemctl stop mysql

# 重启
sudo systemctl restart mysql

# 查看状态
sudo systemctl status mysql

# 开机自启（已配置）
sudo systemctl enable mysql
```

#### 2. Nginx Web服务器

```bash
# 启动
sudo systemctl start nginx

# 停止
sudo systemctl stop nginx

# 重启
sudo systemctl restart nginx

# 重载配置（不中断服务）
sudo systemctl reload nginx

# 测试配置
sudo nginx -t

# 查看状态
sudo systemctl status nginx

# 开机自启（已配置）
sudo systemctl enable nginx
```

**Nginx配置文件位置**:
- 配置文件: `/etc/nginx/sites-available/ajkuaiji`
- 软链接: `/etc/nginx/sites-enabled/ajkuaiji`

#### 3. Flask API服务

```bash
# 启动
sudo systemctl start ajkuaiji-api

# 停止
sudo systemctl stop ajkuaiji-api

# 重启
sudo systemctl restart ajkuaiji-api

# 查看状态
sudo systemctl status ajkuaiji-api

# 开机自启（已配置）
sudo systemctl enable ajkuaiji-api

# 查看日志
tail -f /var/log/ajkuaiji-api.log

# 查看进程
ps aux | grep "python.*app.py"
```

**手动启动方式**:
```bash
cd /root/ajkuaiji/backend
source venv/bin/activate
nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &
```

### 一键启动所有服务

```bash
cd /root/ajkuaiji
./start_production.sh
```

---

## 📝 日志文件位置

| 服务 | 日志文件路径 |
|------|-------------|
| Flask API | `/var/log/ajkuaiji-api.log` |
| Nginx访问日志 | `/var/log/nginx/ajkuaiji_access.log` |
| Nginx错误日志 | `/var/log/nginx/ajkuaiji_error.log` |
| MySQL错误日志 | `/var/log/mysql/error.log` |
| 系统服务日志 | `journalctl -u ajkuaiji-api` |

### 查看日志命令

```bash
# 实时查看API日志
tail -f /var/log/ajkuaiji-api.log

# 查看最近100行API日志
tail -100 /var/log/ajkuaiji-api.log

# 实时查看Nginx访问日志
tail -f /var/log/nginx/ajkuaiji_access.log

# 查看系统服务日志
journalctl -u ajkuaiji-api -f
```

---

## 🔐 默认账户信息

### 系统管理员账户

```
用户名: admin
密码: 123456
角色: super_admin
```

⚠️ **重要**: 生产环境务必修改默认密码！

---

## 🛠️ 开发环境准备

### 首次配置步骤

1. **SSH连接服务器**
   ```bash
   ssh root@47.98.60.197
   ```

2. **验证服务状态**
   ```bash
   systemctl status mysql
   systemctl status nginx
   systemctl status ajkuaiji-api
   ```

3. **进入项目目录**
   ```bash
   cd /root/ajkuaiji
   ```

4. **激活Python虚拟环境**
   ```bash
   cd backend
   source venv/bin/activate
   ```

5. **测试数据库连接**
   ```bash
   mysql -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' -e "SELECT 'OK' as status;"
   ```

6. **测试API接口**
   ```bash
   curl http://127.0.0.1:5000/api/health
   ```

---

## 🔄 代码更新流程

### 更新后端代码

```bash
# 1. 备份当前版本
cd /root/ajkuaiji/backend
cp app.py app.py.backup_$(date +%Y%m%d_%H%M%S)

# 2. 编辑代码
vim app.py

# 3. 重启API服务
sudo systemctl restart ajkuaiji-api

# 4. 验证服务正常
systemctl status ajkuaiji-api
tail -f /var/log/ajkuaiji-api.log
```

### 更新前端代码

```bash
# 1. 备份
cd /root/ajkuaiji/modules
cp customers.js customers.js.backup_$(date +%Y%m%d_%H%M%S)

# 2. 编辑代码
vim customers.js

# 3. 清除浏览器缓存
# 用户端按 Ctrl+Shift+R 强制刷新

# 4. 验证功能
# 在浏览器中测试修改的功能
```

### 更新Nginx配置

```bash
# 1. 备份配置
sudo cp /etc/nginx/sites-available/ajkuaiji /etc/nginx/sites-available/ajkuaiji.backup

# 2. 编辑配置
sudo vim /etc/nginx/sites-available/ajkuaiji

# 3. 测试配置
sudo nginx -t

# 4. 重载配置
sudo systemctl reload nginx
```

---

## 📦 数据备份与恢复

### 手动备份数据库

```bash
# 备份所有数据
mysqldump -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji > backup_$(date +%Y%m%d).sql

# 备份并压缩
mysqldump -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji | gzip > backup_$(date +%Y%m%d).sql.gz

# 备份到指定目录
mkdir -p /root/backups
mysqldump -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji | gzip > /root/backups/ajkuaiji_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 恢复数据库

```bash
# 恢复未压缩的备份
mysql -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji < backup_20260211.sql

# 恢复压缩的备份
gunzip < backup_20260211.sql.gz | mysql -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji
```

### 自动备份（已配置crontab）

备份脚本位置: `/root/backup_db.sh`

```bash
# 查看定时任务
crontab -l

# 编辑定时任务
crontab -e
```

---

## 🐛 常见问题快速排查

### 问题1: 登录失败返回502错误

**原因**: Flask API服务未启动

**解决**:
```bash
# 检查API服务
systemctl status ajkuaiji-api

# 如果未运行，启动服务
sudo systemctl start ajkuaiji-api

# 查看错误日志
tail -50 /var/log/ajkuaiji-api.log
```

### 问题2: 数据库连接失败

**原因**: MySQL服务未启动或连接配置错误

**解决**:
```bash
# 检查MySQL服务
systemctl status mysql

# 测试连接
mysql -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' -e "SELECT 1;"

# 查看MySQL错误日志
tail -50 /var/log/mysql/error.log
```

### 问题3: Nginx返回404

**原因**: 静态文件路径错误或Nginx未启动

**解决**:
```bash
# 检查Nginx状态
systemctl status nginx

# 测试配置
sudo nginx -t

# 查看错误日志
tail -50 /var/log/nginx/ajkuaiji_error.log

# 检查文件是否存在
ls -la /root/ajkuaiji/financial_system.html
```

### 问题4: 服务器重启后系统无法访问

**原因**: 服务未自动启动

**解决**:
```bash
# 一键启动所有服务
cd /root/ajkuaiji
./start_production.sh

# 或手动启动
sudo systemctl start mysql
sudo systemctl start ajkuaiji-api
sudo systemctl start nginx
```

---

## 📊 性能监控

### 查看系统资源

```bash
# CPU和内存使用
top

# 磁盘使用
df -h

# 查看特定进程资源占用
ps aux | grep python
ps aux | grep nginx
ps aux | grep mysql
```

### API性能测试

```bash
# 测试登录接口
curl -X POST http://127.0.0.1:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' \
  -w "\nTime: %{time_total}s\n"

# 批量请求压力测试（需安装ab工具）
ab -n 100 -c 10 http://127.0.0.1:5000/api/health
```

---

## 🔒 安全注意事项

1. ✅ **定期更新密码**: 每3个月更换一次数据库密码和管理员密码
2. ✅ **备份数据**: 每天自动备份数据库
3. ✅ **监控日志**: 定期检查错误日志和访问日志
4. ✅ **防火墙配置**: 只开放必要端口（80, 443, 22, 3306）
5. ❌ **不要在代码中硬编码密码**: 使用环境变量或配置文件
6. ❌ **不要在公共仓库提交敏感信息**: 使用.gitignore排除配置文件

---

## 📞 技术支持联系方式

**开发团队**: 许昌爱佳网络科技有限公司  
**项目负责人**: [填写负责人信息]  
**技术支持**: [填写支持联系方式]

---

## 📝 更新记录

| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|----------|--------|
| 2026-02-11 | 1.0 | 初始版本，创建开发配置文档 | AI Assistant |

---

**文档状态**: ✅ 已完成  
**适用版本**: v14.0+  
**最后更新**: 2026年2月11日
