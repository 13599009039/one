#!/bin/bash
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h 47.98.60.197 -u ajkuaiji -p'@HNzb5z75b16' ajkuaiji > $BACKUP_DIR/ajkuaiji_$DATE.sql 2>/dev/null
# 保留最近7天的备份
find $BACKUP_DIR -name "ajkuaiji_*.sql" -mtime +7 -delete
echo "$(date '+%Y-%m-%d %H:%M:%S') - 数据库备份完成: ajkuaiji_$DATE.sql" >> /var/log/db_backup.log
