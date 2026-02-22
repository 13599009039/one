#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
移动端日志分析脚本
自动分析错误日志，生成统计报告
"""

import pymysql
from datetime import datetime, timedelta
from collections import Counter
import json

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

def analyze_error_frequency(days=7):
    """分析高频错误（最近N天）"""
    print(f"\n{'='*80}")
    print(f"高频错误分析（最近{days}天）")
    print(f"{'='*80}\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 查询最近N天的错误
        query = """
        SELECT error_message, error_type, error_level, COUNT(*) as count
        FROM mobile_error_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
        GROUP BY error_message, error_type, error_level
        ORDER BY count DESC
        LIMIT 20
        """
        
        cursor.execute(query, (days,))
        results = cursor.fetchall()
        
        if not results:
            print("暂无错误记录")
            return
        
        print(f"{'排名':<6} {'次数':<8} {'类型':<15} {'级别':<10} {'错误信息'}")
        print("-" * 80)
        
        for idx, row in enumerate(results, 1):
            error_msg = row['error_message'][:50] + '...' if len(row['error_message']) > 50 else row['error_message']
            print(f"{idx:<6} {row['count']:<8} {row['error_type']:<15} {row['error_level']:<10} {error_msg}")
        
        # 返回高频错误列表
        return results
        
    finally:
        cursor.close()
        conn.close()

def analyze_error_trend(days=7):
    """分析错误趋势"""
    print(f"\n{'='*80}")
    print(f"错误趋势分析（最近{days}天）")
    print(f"{'='*80}\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
        SELECT DATE(created_at) as date, error_level, COUNT(*) as count
        FROM mobile_error_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
        GROUP BY DATE(created_at), error_level
        ORDER BY date DESC
        """
        
        cursor.execute(query, (days,))
        results = cursor.fetchall()
        
        if not results:
            print("暂无错误记录")
            return
        
        # 按日期分组
        date_stats = {}
        for row in results:
            date_str = row['date'].strftime('%Y-%m-%d')
            if date_str not in date_stats:
                date_stats[date_str] = {'error': 0, 'warning': 0, 'info': 0}
            date_stats[date_str][row['error_level']] = row['count']
        
        print(f"{'日期':<12} {'错误':<8} {'警告':<8} {'信息':<8} {'总计'}")
        print("-" * 50)
        
        for date_str in sorted(date_stats.keys(), reverse=True):
            stats = date_stats[date_str]
            total = stats['error'] + stats['warning'] + stats['info']
            print(f"{date_str:<12} {stats['error']:<8} {stats['warning']:<8} {stats['info']:<8} {total}")
        
    finally:
        cursor.close()
        conn.close()

def analyze_error_by_page():
    """按页面分析错误分布"""
    print(f"\n{'='*80}")
    print("页面错误分布分析")
    print(f"{'='*80}\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
        SELECT page_url, error_type, COUNT(*) as count
        FROM mobile_error_logs
        WHERE page_url IS NOT NULL AND page_url != ''
        GROUP BY page_url, error_type
        ORDER BY count DESC
        LIMIT 10
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        if not results:
            print("暂无页面错误记录")
            return
        
        print(f"{'页面URL':<50} {'类型':<15} {'次数'}")
        print("-" * 80)
        
        for row in results:
            page_url = row['page_url'][:45] + '...' if len(row['page_url']) > 45 else row['page_url']
            print(f"{page_url:<50} {row['error_type']:<15} {row['count']}")
        
    finally:
        cursor.close()
        conn.close()

def analyze_unresolved_errors():
    """分析未解决的错误"""
    print(f"\n{'='*80}")
    print("未解决错误统计")
    print(f"{'='*80}\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 统计未解决的高频错误
        query = """
        SELECT error_message, error_type, COUNT(*) as count, MAX(created_at) as latest
        FROM mobile_error_logs
        WHERE is_resolved = 0
        GROUP BY error_message, error_type
        ORDER BY count DESC
        LIMIT 15
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        if not results:
            print("✅ 所有错误已解决或暂无错误记录")
            return
        
        print(f"{'次数':<8} {'最后发生':<20} {'类型':<15} {'错误信息'}")
        print("-" * 100)
        
        for row in results:
            error_msg = row['error_message'][:60] + '...' if len(row['error_message']) > 60 else row['error_message']
            latest_time = row['latest'].strftime('%Y-%m-%d %H:%M:%S')
            print(f"{row['count']:<8} {latest_time:<20} {row['error_type']:<15} {error_msg}")
        
        # 返回未解决错误列表
        return results
        
    finally:
        cursor.close()
        conn.close()

def analyze_api_errors():
    """分析API错误"""
    print(f"\n{'='*80}")
    print("API错误分析")
    print(f"{'='*80}\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
        SELECT api_url, api_method, api_status, COUNT(*) as count
        FROM mobile_error_logs
        WHERE error_type = 'api_error' AND api_url IS NOT NULL
        GROUP BY api_url, api_method, api_status
        ORDER BY count DESC
        LIMIT 10
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        if not results:
            print("暂无API错误记录")
            return
        
        print(f"{'API路径':<40} {'方法':<8} {'状态码':<10} {'次数'}")
        print("-" * 70)
        
        for row in results:
            api_url = row['api_url'][:35] + '...' if len(row['api_url']) > 35 else row['api_url']
            print(f"{api_url:<40} {row['api_method']:<8} {row['api_status']:<10} {row['count']}")
        
    finally:
        cursor.close()
        conn.close()

def analyze_performance_issues():
    """分析性能问题"""
    print(f"\n{'='*80}")
    print("性能问题分析")
    print(f"{'='*80}\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
        SELECT performance_metric, COUNT(*) as count
        FROM mobile_error_logs
        WHERE error_type = 'performance' AND performance_metric IS NOT NULL
        ORDER BY count DESC
        LIMIT 10
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        if not results:
            print("✅ 暂无性能问题记录")
            return
        
        print(f"{'性能指标':<60} {'次数'}")
        print("-" * 70)
        
        for row in results:
            try:
                metric = json.loads(row['performance_metric'])
                metric_str = f"{metric.get('metric', 'Unknown')}: {metric.get('value', 0)}ms (阈值: {metric.get('threshold', 0)}ms)"
            except:
                metric_str = str(row['performance_metric'])[:55]
            
            print(f"{metric_str:<60} {row['count']}")
        
    finally:
        cursor.close()
        conn.close()

def generate_summary_report():
    """生成汇总报告"""
    print(f"\n{'='*80}")
    print("日志汇总报告")
    print(f"{'='*80}\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 总错误数
        cursor.execute("SELECT COUNT(*) as total FROM mobile_error_logs")
        total = cursor.fetchone()['total']
        
        # 未解决错误数
        cursor.execute("SELECT COUNT(*) as unresolved FROM mobile_error_logs WHERE is_resolved = 0")
        unresolved = cursor.fetchone()['unresolved']
        
        # 按类型统计
        cursor.execute("""
            SELECT error_type, COUNT(*) as count
            FROM mobile_error_logs
            GROUP BY error_type
            ORDER BY count DESC
        """)
        by_type = cursor.fetchall()
        
        # 按级别统计
        cursor.execute("""
            SELECT error_level, COUNT(*) as count
            FROM mobile_error_logs
            GROUP BY error_level
            ORDER BY count DESC
        """)
        by_level = cursor.fetchall()
        
        # 最近24小时错误数
        cursor.execute("""
            SELECT COUNT(*) as recent
            FROM mobile_error_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        """)
        recent_24h = cursor.fetchone()['recent']
        
        print(f"总错误记录数: {total}")
        print(f"未解决错误数: {unresolved} ({unresolved/total*100:.1f}%)" if total > 0 else "未解决错误数: 0")
        print(f"最近24小时错误: {recent_24h}")
        print()
        
        print("按类型分布:")
        for row in by_type:
            print(f"  {row['error_type']:<15} : {row['count']}")
        print()
        
        print("按级别分布:")
        for row in by_level:
            print(f"  {row['error_level']:<10} : {row['count']}")
        
    finally:
        cursor.close()
        conn.close()

def main():
    """主函数"""
    print("\n" + "="*80)
    print("移动端错误日志分析报告")
    print(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    try:
        # 汇总报告
        generate_summary_report()
        
        # 高频错误分析
        analyze_error_frequency(days=7)
        
        # 错误趋势
        analyze_error_trend(days=7)
        
        # 未解决错误
        analyze_unresolved_errors()
        
        # 页面错误分布
        analyze_error_by_page()
        
        # API错误
        analyze_api_errors()
        
        # 性能问题
        analyze_performance_issues()
        
        print(f"\n{'='*80}")
        print("分析完成！")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"\n❌ 分析过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
