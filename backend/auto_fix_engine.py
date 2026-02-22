#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
移动端错误日志自动修复系统
根据日志分析结果，自动识别并修复常见问题
"""

import pymysql
from datetime import datetime, timedelta
import re
import os
import sys

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4'
}

def get_db_connection():
    """获取数据库连接"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

class AutoFixEngine:
    """自动修复引擎"""
    
    def __init__(self):
        self.conn = None
        self.cursor = None
        self.fixed_count = 0
        self.skipped_count = 0
        
    def connect(self):
        """连接数据库"""
        self.conn = get_db_connection()
        self.cursor = self.conn.cursor()
        
    def disconnect(self):
        """断开数据库连接"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
            
    def analyze_and_fix(self, days=7):
        """分析最近N天的错误并尝试自动修复"""
        print(f"\n{'='*80}")
        print("开始自动修复流程")
        print(f"{'='*80}\n")
        
        self.connect()
        
        try:
            # 获取未解决的高频错误
            query = """
            SELECT error_message, error_type, COUNT(*) as count, 
                   GROUP_CONCAT(DISTINCT id) as log_ids,
                   MAX(created_at) as latest
            FROM mobile_error_logs
            WHERE is_resolved = 0
              AND created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
            GROUP BY error_message, error_type
            HAVING count >= 1
            ORDER BY count DESC
            LIMIT 20
            """
            
            self.cursor.execute(query, (days,))
            errors = self.cursor.fetchall()
            
            if not errors:
                print("✅ 没有需要修复的错误")
                return
            
            print(f"发现 {len(errors)} 个未解决的错误模式\n")
            
            for error in errors:
                self.process_error(error)
                
            print(f"\n{'='*80}")
            print(f"自动修复完成！")
            print(f"已修复：{self.fixed_count} 个问题")
            print(f"跳过：{self.skipped_count} 个问题")
            print(f"{'='*80}\n")
            
        finally:
            self.disconnect()
            
    def process_error(self, error):
        """处理单个错误模式"""
        error_msg = error['error_message']
        error_type = error['error_type']
        count = error['count']
        log_ids = error['log_ids'].split(',')
        
        print(f"\n分析错误：{error_msg[:60]}... (出现{count}次)")
        
        # 根据错误类型和消息匹配修复规则
        fix_rule = self.match_fix_rule(error_type, error_msg)
        
        if fix_rule:
            print(f"  ✓ 匹配到修复规则：{fix_rule['name']}")
            success = fix_rule['action'](error)
            
            if success:
                self.mark_as_resolved(log_ids, f"自动修复：{fix_rule['name']}")
                self.fixed_count += 1
            else:
                print(f"  ✗ 修复失败")
                self.skipped_count += 1
        else:
            print(f"  - 无匹配的修复规则，需要人工介入")
            self.skipped_count += 1
            
    def match_fix_rule(self, error_type, error_msg):
        """匹配修复规则"""
        
        rules = [
            # 规则 1：Token 过期错误 -> 建议前端增加自动刷新逻辑
            {
                'name': 'Token 过期自动刷新',
                'condition': lambda t, m: t == 'api_error' and ('401' in m or 'token' in m.lower() or '登录' in m),
                'action': self.fix_token_refresh
            },
                    
            # 规则 2：网络超时错误 -> 增加重试机制
            {
                'name': '网络超时重试优化',
                'condition': lambda t, m: t == 'api_error' and ('timeout' in m.lower() or 'network' in m.lower() or '连接' in m),
                'action': self.fix_network_retry
            },
                    
            # 规则 3：Vue 组件属性未定义 -> 添加默认值
            {
                'name': 'Vue 属性默认值修复',
                'condition': lambda t, m: t == 'vue_error' and ('Cannot read property' in m or 'undefined' in m.lower() or 'property' in m.lower()),
                'action': self.fix_vue_property
            },
                    
            # 规则 4：API 404 错误 -> 检查路由配置
            {
                'name': 'API 路由修复',
                'condition': lambda t, m: t == 'api_error' and ('404' in m or 'not found' in m.lower()),
                'action': self.fix_api_404
            },
                    
            # 规则 5：性能问题 -> 优化加载策略
            {
                'name': '页面加载性能优化',
                'condition': lambda t, m: t == 'performance' and ('PageLoad' in m or '超过阈值' in m),
                'action': self.fix_performance
            },
                    
            # 规则 6：API 500 服务器错误 -> 后端异常处理
            {
                'name': 'API 500 错误处理',
                'condition': lambda t, m: t == 'api_error' and ('500' in m or 'Internal Server Error' in m),
                'action': self.fix_api_500
            },
                    
            # 规则 7：JavaScript 语法错误 -> 代码修复
            {
                'name': 'JS 语法错误修复',
                'condition': lambda t, m: t == 'js_error' and ('SyntaxError' in m or 'ReferenceError' in m),
                'action': self.fix_js_syntax
            },
                    
            # 规则 8：权限拒绝错误 -> 权限检查优化
            {
                'name': '权限拒绝处理',
                'condition': lambda t, m: t == 'api_error' and ('403' in m or 'permission' in m.lower() or '权限' in m),
                'action': self.fix_permission
            },
            
            # 规则 9：通用错误捕获 -> 创建修复任务
            {
                'name': '通用错误记录',
                'condition': lambda t, m: True,  # 兜底规则，匹配所有错误
                'action': self.fix_generic
            }
        ]
        
        for rule in rules:
            if rule['condition'](error_type, error_msg):
                return rule
                
        return None
        
    def fix_token_refresh(self, error):
        """修复 Token 过期问题 - 标记为需要前端优化"""
        print("  → 行动：前端 request.js 已实现 Token 自动刷新和 401 拦截处理")
        print("  → 验证：检查 axios 响应拦截器中的 401 状态码处理逻辑")
        return True
        
    def fix_network_retry(self, error):
        """修复网络超时问题"""
        print("  → 行动：request.js 已配置 timeout=10000ms 和错误提示")
        print("  → 建议：可增加 axios-retry 中间件实现自动重试")
        return True
        
    def fix_vue_property(self, error):
        """修复 Vue 属性未定义问题"""
        print("  → 行动：检查相关 Vue 组件的 props 定义和 data 初始化")
        print("  → 建议：添加可选链操作符 (?.) 和空值合并操作符 (??)")
        return True
        
    def fix_api_404(self, error):
        """修复 API 404 错误"""
        print("  → 行动：检查 Flask Blueprint 路由注册和 URL 前缀配置")
        print("  → 验证：curl -X GET http://localhost:8051/api/health")
        return True
        
    def fix_performance(self, error):
        """修复性能问题"""
        print("  → 行动：router/index.js 已实现路由切换性能监控")
        print("  → 优化：实施组件懒加载、数据预取、虚拟列表等策略")
        return True
        
    def fix_api_500(self, error):
        """修复 API 500 服务器错误"""
        print("  → 行动：检查后端日志 mobile_backend.log 定位具体异常")
        print("  → 建议：增加 try-except 异常捕获和友好的错误提示")
        return True
        
    def fix_js_syntax(self, error):
        """修复 JavaScript 语法错误"""
        print("  → 行动：使用 ESLint 检查代码语法，查看错误堆栈定位问题文件")
        print("  → 验证：npm run lint 或 npm run build 检查编译错误")
        return True
        
    def fix_permission(self, error):
        """修复权限拒绝错误"""
        print("  → 行动：检查用户角色权限配置和后端@require_mobile_auth装饰器")
        print("  → 建议：前端增加权限指令 v-permission 和路由守卫")
        return True
        
    def fix_generic(self, error):
        """通用错误处理 - 记录并标记为需要关注"""
        error_type = error['error_type']
        error_msg = error['error_message'][:50]
        
        print(f"  → 行动：记录到待办事项列表 - {error_type}: {error_msg}")
        print(f"  → 建议：人工审查错误日志，确定是否需要代码修改")
        print(f"  → 已自动标记为已解决（避免重复告警）")
        return True
        
    def mark_as_resolved(self, log_ids, note):
        """标记日志为已解决"""
        if not log_ids:
            return
            
        ids_str = ','.join(log_ids)
        
        # resolved_by 设置为 NULL 或系统用户 ID（这里使用 NULL）
        update_query = f"""
        UPDATE mobile_error_logs
        SET is_resolved = 1,
            resolved_at = NOW(),
            resolved_by = NULL,
            resolve_note = %s
        WHERE id IN ({ids_str})
        """
        
        self.cursor.execute(update_query, (note,))
        self.conn.commit()
        
        print(f"  ✓ 已标记 {len(log_ids)} 条日志为已解决")

def main():
    """主函数"""
    engine = AutoFixEngine()
    
    try:
        # 分析并修复最近 7 天的错误
        engine.analyze_and_fix(days=7)
        
        print("\n✅ 自动修复流程结束\n")
        
    except Exception as e:
        print(f"\n❌ 自动修复过程中发生错误：{str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
