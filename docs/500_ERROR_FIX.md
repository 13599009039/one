# 500 Internal Server Error修复记录

## 📅 修复时间
2026-02-17 02:45

## 🚨 问题描述
GET http://erp.xnamb.cn/ 500 (Internal Server Error)

## 🔍 问题诊断
通过日志分析发现：
1. **Permission denied错误**: Nginx无法访问`/root/ajkuaiji/financial_system.html`
2. **重定向循环**: 由于权限问题导致内部重定向循环
3. **符号链接问题**: root路径使用符号链接`/root/ajkuaiji` → `/www/wwwroot/ajkuaiji`

## 🔧 修复步骤
1. 修改Nginx配置文件`/etc/nginx/sites-available/ajkuaiji`
   - 将`root /root/ajkuaiji;`改为`root /www/wwwroot/ajkuaiji;`
   - 避免使用符号链接造成的权限和路径解析问题

2. 同步更新配置
   - `cp /etc/nginx/sites-available/ajkuaiji /etc/nginx/sites-enabled/ajkuaiji`

3. 重启Nginx服务
   - `pkill nginx && nginx`

## ✅ 验证结果
- 本地测试：`curl http://127.0.0.1/` 返回200 OK
- 外部访问：`curl http://erp.xnamb.cn/` 返回200 OK
- 500错误完全解决

## 📚 经验教训
- 避免在Nginx配置中使用符号链接作为root路径
- 直接使用实际物理路径更加稳定可靠
- 权限问题往往会导致500 Internal Server Error

## ⚠️ 注意事项
favicon.ico文件不存在属于正常现象，不影响系统主要功能
