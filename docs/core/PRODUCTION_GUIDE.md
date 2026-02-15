# 财务管理系统 - 生产环境运维手册

## 📋 核心问题 - 登录失败502错误

### 根本原因
**Flask API服务未启动** 导致:
1. Nginx反向代理 `/api/` 请求到 `http://127.0.0.1:5000` 时返回 **502 Bad Gateway**
2. 前端收到HTML错误页面而非JSON
3. 触发错误: `SyntaxError: Unexpected token '<', "<html>" is not valid JSON`
4. 登录功能完全失效

### 固定解决方案
**服务器重启后,必须按以下顺序启动所有服务:**

---

## ✅ 一键启动(推荐)

**执行以下命令:**
```bash
cd /root/ajkuaiji
./start_production.sh
```

**脚本会自动:**
1. 启动MySQL数据库
2. 启动Flask API服务
3. 启动Nginx服务
4. 验证所有服务可用性
5. 显示访问地址和日志位置

---

## 🔧 手动启动(逐步执行)

### 步骤1: 启动MySQL
```bash
sudo systemctl start mysql
sudo systemctl status mysql
```
**预期**: `Active: active (running)`

### 步骤2: 启动Flask API服务
```bash
cd /root/ajkuaiji/backend
source venv/bin/activate
nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &
```

**验证API启动成功:**
```bash
ps aux | grep "python.*app.py" | grep -v grep
```
**预期**: 显示进程ID

**测试API登录接口:**
```bash
curl -X POST http://127.0.0.1:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```
**预期输出(JSON格式):**
```json
{"success":true,"user":{...}}
```

**❌ 错误输出(HTML格式):**
```html
<!DOCTYPE html><html>...
```

### 步骤3: 启动Nginx
```bash
sudo systemctl start nginx
sudo systemctl status nginx
```
**预期**: `Active: active (running)`

### 步骤4: 验证外网访问
```bash
curl -X POST http://47.98.60.197/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```
**预期**: 返回JSON而非HTML

---

## 🔍 问题排查流程

### 问题: 登录时报错 "is not valid JSON" 或 "502 Bad Gateway"

**排查步骤:**

**1. 检查Flask API服务是否运行**
```bash
ps aux | grep "python.*app.py" | grep -v grep
```

**如果无输出** → API未启动,执行:
```bash
cd /root/ajkuaiji/backend
source venv/bin/activate
nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &
```

**2. 检查API响应格式**
```bash
curl -X POST http://127.0.0.1:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

**正确响应:** 
```json
{"success":true,"user":{...}}
```

**错误响应(HTML):**
```html
<!DOCTYPE html>...
```
→ API服务未正常启动,检查日志: `tail -f /var/log/ajkuaiji-api.log`

**3. 检查Nginx反向代理配置**
```bash
cat /etc/nginx/sites-available/ajkuaiji | grep -A 5 "location /api"
```

**预期配置:**
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    ...
}
```

**4. 检查MySQL服务**
```bash
sudo systemctl status mysql
```
如未启动: `sudo systemctl start mysql`

---

## 📊 服务状态检查

### 一键检查所有服务
```bash
echo "=== MySQL ===" && systemctl status mysql | head -3
echo "" && echo "=== Flask API ===" && ps aux | grep "python.*app.py" | grep -v grep
echo "" && echo "=== Nginx ===" && systemctl status nginx | head -3
```

### 查看日志
```bash
# API日志
tail -f /var/log/ajkuaiji-api.log

# Nginx访问日志
tail -f /var/log/nginx/ajkuaiji_access.log

# Nginx错误日志
tail -f /var/log/nginx/ajkuaiji_error.log
```

---

## 🚀 服务管理命令

### MySQL
```bash
sudo systemctl start mysql      # 启动
sudo systemctl stop mysql       # 停止
sudo systemctl restart mysql    # 重启
sudo systemctl status mysql     # 状态
```

### Flask API
```bash
# 启动
cd /root/ajkuaiji/backend && source venv/bin/activate
nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &

# 停止
pkill -f "python.*app.py"

# 重启
pkill -f "python.*app.py" && sleep 2
cd /root/ajkuaiji/backend && source venv/bin/activate
nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &

# 查看进程
ps aux | grep "python.*app.py" | grep -v grep
```

### Nginx
```bash
sudo systemctl start nginx      # 启动
sudo systemctl stop nginx       # 停止
sudo systemctl reload nginx     # 热重载配置
sudo systemctl restart nginx    # 重启
sudo systemctl status nginx     # 状态
```

---

## ⚠️ 常见错误及解决方案

### 错误1: `502 Bad Gateway`
**原因**: Flask API服务未启动  
**解决**: 
```bash
cd /root/ajkuaiji/backend && source venv/bin/activate
nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &
```

### 错误2: `is not valid JSON`
**原因**: API返回HTML而非JSON  
**解决**: 检查API服务是否正常运行,查看API日志

### 错误3: `Connection refused`
**原因**: Nginx未启动或配置错误  
**解决**: 
```bash
sudo systemctl start nginx
nginx -t  # 检查配置
```

### 错误4: `Can't connect to MySQL server`
**原因**: MySQL服务未启动  
**解决**: 
```bash
sudo systemctl start mysql
```

---

## 📄 重要文件位置

| 类型 | 路径 |
|------|------|
| 一键启动脚本 | `/root/ajkuaiji/start_production.sh` |
| Flask应用 | `/root/ajkuaiji/backend/app.py` |
| Python虚拟环境 | `/root/ajkuaiji/backend/venv/` |
| Nginx配置 | `/etc/nginx/sites-available/ajkuaiji` |
| API日志 | `/var/log/ajkuaiji-api.log` |
| Nginx访问日志 | `/var/log/nginx/ajkuaiji_access.log` |
| Nginx错误日志 | `/var/log/nginx/ajkuaiji_error.log` |
| 前端文件 | `/root/ajkuaiji/` |

---

## 🎯 服务器重启后的完整流程

**场景**: 服务器重启或断电后,所有服务停止

**解决方案**: 执行一键启动脚本
```bash
cd /root/ajkuaiji
./start_production.sh
```

**或手动执行:**
1. 启动MySQL: `sudo systemctl start mysql`
2. 启动API: `cd /root/ajkuaiji/backend && source venv/bin/activate && nohup python3 app.py > /var/log/ajkuaiji-api.log 2>&1 &`
3. 启动Nginx: `sudo systemctl start nginx`
4. 验证: 访问 http://47.98.60.197/financial_system.html

---

## 🔐 默认登录凭据

- **用户名**: `admin`
- **密码**: `123456`

---

## 📞 技术支持

如遇到其他问题,请提供:
1. 错误截图(包括浏览器Console)
2. API日志: `tail -100 /var/log/ajkuaiji-api.log`
3. Nginx错误日志: `tail -100 /var/log/nginx/ajkuaiji_error.log`
