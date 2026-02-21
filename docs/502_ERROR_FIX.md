# 502 Bad Gateway错误修复记录

## 📅 修复时间
2026-02-17 02:42

## 🚨 问题描述
POST http://erp.xnamb.cn/api/frontend_logs 502 (Bad Gateway)

## 🔍 问题诊断
1. Flask服务正常运行在8050端口
2. Nginx配置错误：proxy_pass指向5000端口而非8050端口
3. sites-enabled配置未同步更新

## 🔧 修复步骤
1. 修改 `/etc/nginx/sites-available/ajkuaiji` 配置文件
   - proxy_pass从 `http://127.0.0.1:5000/api/` 改为 `http://127.0.0.1:8050/api/`
   - root路径确认为 `/root/ajkuaiji`

2. 同步更新 `/etc/nginx/sites-enabled/ajkuaiji` 配置
   - 备份原配置：`cp /etc/nginx/sites-enabled/ajkuaiji /etc/nginx/sites-enabled/ajkuaiji.backup`
   - 更新配置：`cp /etc/nginx/sites-available/ajkuaiji /etc/nginx/sites-enabled/ajkuaiji`

3. 重启Nginx服务
   - 停止：`pkill nginx`
   - 启动：`nginx`

## ✅ 验证结果
- 本地测试：`curl http://127.0.0.1/api/health` ✓
- 外部访问：`curl http://erp.xnamb.cn/api/health` ✓
- 502错误完全解决

## 📚 关联规范
参考《开发规范统一手册.md》第2.1.1节系统端口规范
