"""
统计分析计算引擎
版本: v1.0
创建日期: 2026-02-13
功能: 多维度统计数据计算（团队/人员/客户/项目）
"""

import pymysql
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Tuple, Optional

class AnalyticsEngine:
    """统计分析计算引擎"""
    
    def __init__(self, db_config: Dict):
        """
        初始化统计引擎
        Args:
            db_config: 数据库配置字典
        """
        self.db_config = db_config
    
    def get_connection(self):
        """获取数据库连接"""
        return pymysql.connect(**self.db_config)
    
    def calculate_monthly_summary(self, company_id: int, year: int, month: int) -> Dict:
        """
        计算月度统计汇总
        Args:
            company_id: 公司ID
            year: 年份
            month: 月份
        Returns:
            统计结果字典
        """
        start_date = f"{year}-{month:02d}-01"
        
        # 计算月末日期
        if month == 12:
            end_year = year + 1
            end_month = 1
        else:
            end_year = year
            end_month = month + 1
        end_date = f"{end_year}-{end_month:02d}-01"
        
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                # 公司整体统计
                summary = self._calculate_company_summary(
                    cursor, company_id, start_date, end_date
                )
                
                # 团队维度统计
                team_summary = self._calculate_team_summary(
                    cursor, company_id, start_date, end_date
                )
                
                # 业务人员统计
                staff_summary = self._calculate_staff_summary(
                    cursor, company_id, start_date, end_date
                )
                
                # 运营人员统计
                operation_staff = self._calculate_operation_staff_summary(
                    cursor, company_id, start_date, end_date
                )
                
                # 服务人员统计
                service_staff = self._calculate_service_staff_summary(
                    cursor, company_id, start_date, end_date
                )
                
                return {
                    'company': summary,
                    'teams': team_summary,
                    'staff': staff_summary,
                    'operation_staff': operation_staff,
                    'service_staff': service_staff,
                    'period': f"{year}-{month:02d}"
                }
        finally:
            conn.close()
    
    def _calculate_company_summary(self, cursor, company_id: int, 
                                   start_date: str, end_date: str) -> Dict:
        """
        计算公司整体统计
        统计口径：使用 final_amount（订单最终成交金额）作为销售额
        final_amount = 商品原价合计 + 议价/加价/减价金额
        """
        # 销售额、成本、费用统计 - ✅ 使用final_amount作为销售额口径
        cursor.execute("""
            SELECT 
                COUNT(id) as total_orders,
                SUM(COALESCE(final_amount, contract_amount, 0)) as total_sales,
                AVG(COALESCE(final_amount, contract_amount, 0)) as avg_order_amount,
                COUNT(DISTINCT customer_id) as active_customers,
                SUM(expense_amount) as total_expense
            FROM orders
            WHERE company_id = %s
              AND order_date >= %s AND order_date < %s
              AND status != '已取消'
              AND is_deleted = 0
              AND (order_type IS NULL OR order_type != 'aftersale')
        """, (company_id, start_date, end_date))
        sales_data = cursor.fetchone() or {}
        
        # 成本统计 - ✅ 从task_costs表计算
        cursor.execute("""
            SELECT 
                SUM(tc.amount) as total_cost
            FROM task_costs tc
            JOIN task_pool tp ON tc.task_id = tp.id
            JOIN orders o ON tp.order_id = o.id
            WHERE o.company_id = %s
              AND o.order_date >= %s AND o.order_date < %s
              AND o.is_deleted = 0
        """, (company_id, start_date, end_date))
        cost_data = cursor.fetchone() or {}
        
        # 人员统计 - ✅ 通过user_companies表过滤公司人员
        cursor.execute("""
            SELECT COUNT(DISTINCT u.id) as staff_count
            FROM users u
            JOIN user_companies uc ON u.id = uc.user_id
            WHERE uc.company_id = %s AND uc.status = 'active'
        """, (company_id,))
        staff_data = cursor.fetchone() or {}
        
        # 计算指标
        total_sales = Decimal(sales_data.get('total_sales') or 0)
        total_cost = Decimal(cost_data.get('total_cost') or 0)
        total_expense = Decimal(sales_data.get('total_expense') or 0)
        gross_profit = total_sales - total_cost - total_expense
        profit_margin = (gross_profit / total_sales * 100) if total_sales > 0 else Decimal(0)
        
        staff_count = int(staff_data.get('staff_count') or 1)
        per_capita_sales = total_sales / staff_count if staff_count > 0 else Decimal(0)
        per_capita_profit = gross_profit / staff_count if staff_count > 0 else Decimal(0)
        
        return {
            'total_sales': float(total_sales),
            'total_orders': int(sales_data.get('total_orders') or 0),
            'avg_order_amount': float(sales_data.get('avg_order_amount') or 0),
            'total_cost': float(total_cost),
            'total_expense': float(total_expense),
            'gross_profit': float(gross_profit),
            'profit_margin': float(profit_margin),
            'staff_count': staff_count,
            'per_capita_sales': float(per_capita_sales),
            'per_capita_profit': float(per_capita_profit),
            'active_customers': int(sales_data.get('active_customers') or 0)
        }
    
    def _calculate_team_summary(self, cursor, company_id: int,
                               start_date: str, end_date: str) -> List[Dict]:
        """
        计算团队维度统计
        统计口径：使用 final_amount（订单最终成交金额）作为销售额
        """
        # ✅ 使用final_amount作为销售额口径
        cursor.execute("""
            SELECT 
                o.team,
                COUNT(o.id) as total_orders,
                SUM(COALESCE(o.final_amount, o.contract_amount, 0)) as total_sales,
                AVG(COALESCE(o.final_amount, o.contract_amount, 0)) as avg_order_amount,
                SUM(o.expense_amount) as total_expense,
                COUNT(DISTINCT o.business_staff_id) as staff_count,
                COUNT(DISTINCT o.customer_id) as customer_count
            FROM orders o
            WHERE o.company_id = %s
              AND o.order_date >= %s AND o.order_date < %s
              AND o.status != '已取消'
              AND o.is_deleted = 0
              AND (o.order_type IS NULL OR o.order_type != 'aftersale')
            GROUP BY o.team
        """, (company_id, start_date, end_date))
        
        teams = cursor.fetchall() or []
        result = []
        
        for team in teams:
            team_name = team.get('team') or '未分配'
            
            # 查询团队成本
            cursor.execute("""
                SELECT SUM(tc.amount) as total_cost
                FROM task_costs tc
                JOIN task_pool tp ON tc.task_id = tp.id
                JOIN orders o ON tp.order_id = o.id
                WHERE o.company_id = %s
                  AND o.team = %s
                  AND o.order_date >= %s AND o.order_date < %s
                  AND o.is_deleted = 0
            """, (company_id, team_name, start_date, end_date))
            cost_data = cursor.fetchone() or {}
            
            total_sales = Decimal(team.get('total_sales') or 0)
            total_cost = Decimal(cost_data.get('total_cost') or 0)
            total_expense = Decimal(team.get('total_expense') or 0)
            gross_profit = total_sales - total_cost - total_expense
            profit_margin = (gross_profit / total_sales * 100) if total_sales > 0 else Decimal(0)
            
            staff_count = int(team.get('staff_count') or 1)
            per_capita_sales = total_sales / staff_count if staff_count > 0 else Decimal(0)
            per_capita_profit = gross_profit / staff_count if staff_count > 0 else Decimal(0)
            
            result.append({
                'team': team_name,
                'total_sales': float(total_sales),
                'total_orders': int(team.get('total_orders') or 0),
                'avg_order_amount': float(team.get('avg_order_amount') or 0),
                'total_cost': float(total_cost),
                'total_expense': float(total_expense),
                'gross_profit': float(gross_profit),
                'profit_margin': float(profit_margin),
                'staff_count': staff_count,
                'per_capita_sales': float(per_capita_sales),
                'per_capita_profit': float(per_capita_profit),
                'customer_count': int(team.get('customer_count') or 0)
            })
        
        return result
    
    def _calculate_staff_summary(self, cursor, company_id: int,
                                start_date: str, end_date: str) -> List[Dict]:
        """
        计算人员维度统计
        统计口径：使用 final_amount（订单最终成交金额）作为销售额
        """
        # ✅ 使用final_amount作为销售额口径
        cursor.execute("""
            SELECT 
                u.id as user_id,
                u.name as staff_name,
                u.department,
                u.position,
                COUNT(o.id) as signed_orders,
                SUM(COALESCE(o.final_amount, o.contract_amount, 0)) as total_sales,
                AVG(COALESCE(o.final_amount, o.contract_amount, 0)) as avg_order_amount,
                SUM(o.expense_amount) as total_expense,
                COUNT(DISTINCT o.customer_id) as follow_customers
            FROM users u
            JOIN user_companies uc ON u.id = uc.user_id AND uc.company_id = %s AND uc.status = 'active'
            LEFT JOIN orders o ON u.id = o.business_staff_id
              AND o.company_id = %s
              AND o.order_date >= %s AND o.order_date < %s
              AND o.status != '已取消'
              AND o.is_deleted = 0
              AND (o.order_type IS NULL OR o.order_type != 'aftersale')
            GROUP BY u.id
            HAVING COUNT(o.id) > 0
        """, (company_id, company_id, start_date, end_date))
        
        staff_list = cursor.fetchall() or []
        result = []
        
        for staff in staff_list:
            user_id = staff.get('user_id')
            
            # 查询个人成本
            cursor.execute("""
                SELECT SUM(tc.amount) as total_cost
                FROM task_costs tc
                JOIN task_pool tp ON tc.task_id = tp.id
                JOIN orders o ON tp.order_id = o.id
                WHERE o.company_id = %s
                  AND o.business_staff_id = %s
                  AND o.order_date >= %s AND o.order_date < %s
                  AND o.is_deleted = 0
            """, (company_id, user_id, start_date, end_date))
            cost_data = cursor.fetchone() or {}
            
            # 查询新增客户数 - ✅ 添加company_id过滤
            cursor.execute("""
                SELECT COUNT(*) as new_customers
                FROM customers
                WHERE company_id = %s
                  AND follower_id = %s
                  AND created_at >= %s AND created_at < %s
            """, (company_id, user_id, start_date, end_date))
            new_customer_data = cursor.fetchone() or {}
            
            total_sales = Decimal(staff.get('total_sales') or 0)
            total_cost = Decimal(cost_data.get('total_cost') or 0)
            total_expense = Decimal(staff.get('total_expense') or 0)
            profit = total_sales - total_cost - total_expense
            profit_margin = (profit / total_sales * 100) if total_sales > 0 else Decimal(0)
            
            signed_orders = int(staff.get('signed_orders') or 0)
            follow_customers = int(staff.get('follow_customers') or 0)
            conversion_rate = (signed_orders / follow_customers * 100) if follow_customers > 0 else Decimal(0)
            
            result.append({
                'user_id': user_id,
                'staff_name': staff.get('staff_name'),
                'department': staff.get('department'),
                'position': staff.get('position'),
                'new_customers': int(new_customer_data.get('new_customers') or 0),
                'follow_customers': follow_customers,
                'signed_orders': signed_orders,
                'total_sales': float(total_sales),
                'avg_order_amount': float(staff.get('avg_order_amount') or 0),
                'conversion_rate': float(conversion_rate),
                'cost': float(total_cost),
                'expense': float(total_expense),
                'profit': float(profit),
                'profit_margin': float(profit_margin)
            })
        
        return result
    
    def _calculate_operation_staff_summary(self, cursor, company_id: int,
                                           start_date: str, end_date: str) -> List[Dict]:
        """
        计算运营人员维度统计 - 按订单的operation_staff_id关联
        统计口径：使用 final_amount（订单最终成交金额）作为销售额
        """
        cursor.execute("""
            SELECT 
                u.id as user_id,
                u.name as staff_name,
                u.department,
                u.position,
                COUNT(o.id) as order_count,
                SUM(COALESCE(o.final_amount, o.contract_amount, 0)) as total_sales,
                SUM(o.expense_amount) as total_expense
            FROM users u
            JOIN user_companies uc ON u.id = uc.user_id AND uc.company_id = %s AND uc.status = 'active'
            LEFT JOIN orders o ON u.id = o.operation_staff_id
              AND o.company_id = %s
              AND o.order_date >= %s AND o.order_date < %s
              AND o.status != '已取消'
              AND o.is_deleted = 0
              AND (o.order_type IS NULL OR o.order_type != 'aftersale')
            GROUP BY u.id
            HAVING COUNT(o.id) > 0
        """, (company_id, company_id, start_date, end_date))
        
        staff_list = cursor.fetchall() or []
        result = []
        
        for staff in staff_list:
            user_id = staff.get('user_id')
            
            # 查询成本
            cursor.execute("""
                SELECT SUM(tc.amount) as total_cost
                FROM task_costs tc
                JOIN task_pool tp ON tc.task_id = tp.id
                JOIN orders o ON tp.order_id = o.id
                WHERE o.company_id = %s
                  AND o.operation_staff_id = %s
                  AND o.order_date >= %s AND o.order_date < %s
                  AND o.is_deleted = 0
            """, (company_id, user_id, start_date, end_date))
            cost_data = cursor.fetchone() or {}
            
            total_sales = Decimal(staff.get('total_sales') or 0)
            total_cost = Decimal(cost_data.get('total_cost') or 0)
            total_expense = Decimal(staff.get('total_expense') or 0)
            profit = total_sales - total_cost - total_expense
            
            result.append({
                'user_id': staff.get('user_id'),
                'staff_name': staff.get('staff_name'),
                'department': staff.get('department'),
                'position': staff.get('position'),
                'order_count': int(staff.get('order_count') or 0),
                'total_sales': float(total_sales),
                'cost': float(total_cost),
                'expense': float(total_expense),
                'profit': float(profit)
            })
        
        return result
    
    def _calculate_service_staff_summary(self, cursor, company_id: int,
                                         start_date: str, end_date: str) -> List[Dict]:
        """
        计算服务人员维度统计 - 按订单的service_staff_id关联
        统计口径：使用 final_amount（订单最终成交金额）作为销售额
        """
        cursor.execute("""
            SELECT 
                u.id as user_id,
                u.name as staff_name,
                u.department,
                u.position,
                COUNT(o.id) as order_count,
                SUM(COALESCE(o.final_amount, o.contract_amount, 0)) as total_sales,
                SUM(o.expense_amount) as total_expense
            FROM users u
            JOIN user_companies uc ON u.id = uc.user_id AND uc.company_id = %s AND uc.status = 'active'
            LEFT JOIN orders o ON u.id = o.service_staff_id
              AND o.company_id = %s
              AND o.order_date >= %s AND o.order_date < %s
              AND o.status != '已取消'
              AND o.is_deleted = 0
              AND (o.order_type IS NULL OR o.order_type != 'aftersale')
            GROUP BY u.id
            HAVING COUNT(o.id) > 0
        """, (company_id, company_id, start_date, end_date))
        
        staff_list = cursor.fetchall() or []
        result = []
        
        for staff in staff_list:
            user_id = staff.get('user_id')
            
            # 查询成本
            cursor.execute("""
                SELECT SUM(tc.amount) as total_cost
                FROM task_costs tc
                JOIN task_pool tp ON tc.task_id = tp.id
                JOIN orders o ON tp.order_id = o.id
                WHERE o.company_id = %s
                  AND o.service_staff_id = %s
                  AND o.order_date >= %s AND o.order_date < %s
                  AND o.is_deleted = 0
            """, (company_id, user_id, start_date, end_date))
            cost_data = cursor.fetchone() or {}
            
            total_sales = Decimal(staff.get('total_sales') or 0)
            total_cost = Decimal(cost_data.get('total_cost') or 0)
            total_expense = Decimal(staff.get('total_expense') or 0)
            profit = total_sales - total_cost - total_expense
            
            result.append({
                'user_id': staff.get('user_id'),
                'staff_name': staff.get('staff_name'),
                'department': staff.get('department'),
                'position': staff.get('position'),
                'order_count': int(staff.get('order_count') or 0),
                'total_sales': float(total_sales),
                'cost': float(total_cost),
                'expense': float(total_expense),
                'profit': float(profit)
            })
        
        return result
    
    def calculate_customer_analytics(self, customer_id: int) -> Dict:
        """
        计算单个客户的价值分析
        统计口径：使用 final_amount（订单最终成交金额）作为销售额
        Args:
            customer_id: 客户ID
        Returns:
            客户统计结果
        """
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                # 基础统计 - ✅ 使用final_amount作为销售额口径
                cursor.execute("""
                    SELECT 
                        COUNT(id) as total_orders,
                        SUM(COALESCE(final_amount, contract_amount, 0)) as total_sales,
                        AVG(COALESCE(final_amount, contract_amount, 0)) as avg_order_amount,
                        MIN(order_date) as first_order_date,
                        MAX(order_date) as last_order_date
                    FROM orders
                    WHERE customer_id = %s AND status != '已取消'
                """, (customer_id,))
                order_data = cursor.fetchone() or {}
                
                # 成本统计
                cursor.execute("""
                    SELECT SUM(tc.amount) as total_cost
                    FROM task_costs tc
                    JOIN task_pool tp ON tc.task_id = tp.id
                    JOIN orders o ON tp.order_id = o.id
                    WHERE o.customer_id = %s
                """, (customer_id,))
                cost_data = cursor.fetchone() or {}
                
                total_sales = Decimal(order_data.get('total_sales') or 0)
                total_cost = Decimal(cost_data.get('total_cost') or 0)
                total_profit = total_sales - total_cost
                
                roi = (total_profit / total_cost * 100) if total_cost > 0 else Decimal(0)
                
                # 客户生命周期
                first_order = order_data.get('first_order_date')
                last_order = order_data.get('last_order_date')
                if first_order and last_order:
                    lifecycle_days = (last_order - first_order).days
                else:
                    lifecycle_days = 0
                
                # LTV估算（简化版：历史总销售额）
                ltv = total_sales
                
                return {
                    'customer_id': customer_id,
                    'total_orders': int(order_data.get('total_orders') or 0),
                    'total_sales': float(total_sales),
                    'total_cost': float(total_cost),
                    'total_profit': float(total_profit),
                    'avg_order_amount': float(order_data.get('avg_order_amount') or 0),
                    'ltv': float(ltv),
                    'roi': float(roi),
                    'first_order_date': first_order.strftime('%Y-%m-%d') if first_order else None,
                    'last_order_date': last_order.strftime('%Y-%m-%d') if last_order else None,
                    'customer_lifecycle_days': lifecycle_days,
                    'is_active': 1 if last_order and (datetime.now().date() - last_order).days < 90 else 0
                }
        finally:
            conn.close()
    
    def save_analytics_summary(self, dimension_type: str, dimension_id: int,
                               period_type: str, period_value: str,
                               start_date: str, end_date: str,
                               data: Dict, company_id: int = 1):
        """
        保存统计汇总到数据库
        Args:
            dimension_type: 维度类型（company/team/staff/customer/project）
            dimension_id: 维度ID
            period_type: 统计周期（month/quarter/year）
            period_value: 周期值（如2026-02）
            start_date: 开始日期
            end_date: 结束日期
            data: 统计数据字典
            company_id: 公司ID
        """
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO analytics_summary (
                        company_id, dimension_type, dimension_id,
                        period_type, period_value, start_date, end_date,
                        total_sales, total_orders, avg_order_amount, new_customers,
                        total_cost, filming_cost, advertising_cost, personnel_cost, other_cost,
                        gross_profit, profit_margin, net_profit,
                        staff_count, per_capita_sales, per_capita_profit,
                        active_customers, customer_retention_rate
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s
                    )
                    ON DUPLICATE KEY UPDATE
                        total_sales = VALUES(total_sales),
                        total_orders = VALUES(total_orders),
                        avg_order_amount = VALUES(avg_order_amount),
                        new_customers = VALUES(new_customers),
                        total_cost = VALUES(total_cost),
                        filming_cost = VALUES(filming_cost),
                        advertising_cost = VALUES(advertising_cost),
                        personnel_cost = VALUES(personnel_cost),
                        other_cost = VALUES(other_cost),
                        gross_profit = VALUES(gross_profit),
                        profit_margin = VALUES(profit_margin),
                        net_profit = VALUES(net_profit),
                        staff_count = VALUES(staff_count),
                        per_capita_sales = VALUES(per_capita_sales),
                        per_capita_profit = VALUES(per_capita_profit),
                        active_customers = VALUES(active_customers),
                        customer_retention_rate = VALUES(customer_retention_rate),
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    company_id, dimension_type, dimension_id,
                    period_type, period_value, start_date, end_date,
                    data.get('total_sales', 0),
                    data.get('total_orders', 0),
                    data.get('avg_order_amount', 0),
                    data.get('new_customers', 0),
                    data.get('total_cost', 0),
                    data.get('filming_cost', 0),
                    data.get('advertising_cost', 0),
                    data.get('personnel_cost', 0),
                    data.get('other_cost', 0),
                    data.get('gross_profit', 0),
                    data.get('profit_margin', 0),
                    data.get('net_profit', data.get('gross_profit', 0)),  # 简化：净利润=毛利润
                    data.get('staff_count', 0),
                    data.get('per_capita_sales', 0),
                    data.get('per_capita_profit', 0),
                    data.get('active_customers', 0),
                    data.get('customer_retention_rate', 0)
                ))
                conn.commit()
        finally:
            conn.close()
    
    def save_customer_analytics(self, customer_id: int, data: Dict, company_id: int = 1):
        """
        保存客户分析数据
        """
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO customer_analytics (
                        customer_id, company_id,
                        total_orders, total_sales, total_cost, total_profit,
                        ltv, roi, avg_order_amount,
                        first_order_date, last_order_date, customer_lifecycle_days,
                        is_active
                    ) VALUES (
                        %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s
                    )
                    ON DUPLICATE KEY UPDATE
                        total_orders = VALUES(total_orders),
                        total_sales = VALUES(total_sales),
                        total_cost = VALUES(total_cost),
                        total_profit = VALUES(total_profit),
                        ltv = VALUES(ltv),
                        roi = VALUES(roi),
                        avg_order_amount = VALUES(avg_order_amount),
                        first_order_date = VALUES(first_order_date),
                        last_order_date = VALUES(last_order_date),
                        customer_lifecycle_days = VALUES(customer_lifecycle_days),
                        is_active = VALUES(is_active),
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    customer_id, company_id,
                    data.get('total_orders', 0),
                    data.get('total_sales', 0),
                    data.get('total_cost', 0),
                    data.get('total_profit', 0),
                    data.get('ltv', 0),
                    data.get('roi', 0),
                    data.get('avg_order_amount', 0),
                    data.get('first_order_date'),
                    data.get('last_order_date'),
                    data.get('customer_lifecycle_days', 0),
                    data.get('is_active', 0)
                ))
                conn.commit()
        finally:
            conn.close()
    
    def save_staff_performance(self, user_id: int, period_type: str, period_value: str,
                              start_date: str, end_date: str, data: Dict, company_id: int = 1):
        """
        保存员工绩效数据
        """
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO staff_performance (
                        user_id, company_id, period_type, period_value,
                        start_date, end_date,
                        new_customers, follow_customers, signed_orders,
                        total_sales, avg_order_amount, conversion_rate,
                        cost, profit, profit_margin
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s
                    )
                    ON DUPLICATE KEY UPDATE
                        new_customers = VALUES(new_customers),
                        follow_customers = VALUES(follow_customers),
                        signed_orders = VALUES(signed_orders),
                        total_sales = VALUES(total_sales),
                        avg_order_amount = VALUES(avg_order_amount),
                        conversion_rate = VALUES(conversion_rate),
                        cost = VALUES(cost),
                        profit = VALUES(profit),
                        profit_margin = VALUES(profit_margin),
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    user_id, company_id, period_type, period_value,
                    start_date, end_date,
                    data.get('new_customers', 0),
                    data.get('follow_customers', 0),
                    data.get('signed_orders', 0),
                    data.get('total_sales', 0),
                    data.get('avg_order_amount', 0),
                    data.get('conversion_rate', 0),
                    data.get('cost', 0),
                    data.get('profit', 0),
                    data.get('profit_margin', 0)
                ))
                conn.commit()
        finally:
            conn.close()
