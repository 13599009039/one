# 深度统计分析系统开发计划

**版本**: v1.0  
**创建日期**: 2026年2月13日  
**状态**: 规划中  
**优先级**: P1（战略功能）

---

## 📋 目录

1. [系统概述](#系统概述)
2. [统计维度设计](#统计维度设计)
3. [数据库设计](#数据库设计)
4. [指标体系](#指标体系)
5. [功能开发清单](#功能开发清单)
6. [技术实现方案](#技术实现方案)

---

## 系统概述

### 业务背景

针对抖音本地生活服务商场景，建立多维度、精细化的统计分析体系，支持团队、人员、项目、客户等多个维度的数据分析，为管理决策提供数据支撑。

### 核心目标

1. **多维度统计**: 支持团队、人员、项目、客户、时间等多维交叉分析
2. **人效分析**: 计算个人、团队、公司的人效指标
3. **客户价值分析**: 客户生命周期价值(LTV)、客单价、投产比等
4. **成本利润分析**: 精细化成本核算，项目级、客户级利润分析
5. **趋势预测**: 基于历史数据的趋势预测和预警

---

## 统计维度设计

### 1. 组织维度

```
公司(Company)
  └─ 团队(Team)
      └─ 人员(Staff)
```

#### 统计指标
- **团队级**
  - 月度销售额
  - 月度成本
  - 月度利润
  - 毛利率
  - 客户数量
  - 订单数量
  - 人均产值
  - 人均利润

- **人员级**
  - 个人销售额
  - 个人跟进客户数
  - 个人签单数
  - 个人成交率
  - 个人客单价
  - 个人人效

### 2. 客户维度

#### 统计指标
- 客户总投入成本
- 客户总产生利润
- 客户投产比（ROI）
- 客户生命周期价值（LTV）
- 客户续费率
- 客户流失率
- 客单价

### 3. 项目维度

#### 统计指标
- 项目总销售额
- 项目总成本
- 项目利润
- 项目周期
- 项目人效

### 4. 时间维度

#### 统计周期
- 日报
- 周报
- 月报
- 季报
- 年报

---

## 数据库设计

### 1. analytics_summary（统计汇总表）

```sql
CREATE TABLE IF NOT EXISTS `analytics_summary` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `dimension_type` VARCHAR(50) NOT NULL COMMENT '维度类型（company/team/staff/customer/project）',
  `dimension_id` INT NOT NULL COMMENT '维度ID',
  `period_type` VARCHAR(20) NOT NULL COMMENT '统计周期（day/week/month/quarter/year）',
  `period_value` VARCHAR(20) NOT NULL COMMENT '周期值（如2026-02）',
  `start_date` DATE NOT NULL COMMENT '开始日期',
  `end_date` DATE NOT NULL COMMENT '结束日期',
  
  -- 销售指标
  `total_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '总销售额',
  `total_orders` INT DEFAULT 0 COMMENT '订单数',
  `avg_order_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '平均订单金额',
  `new_customers` INT DEFAULT 0 COMMENT '新增客户数',
  
  -- 成本指标
  `total_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '总成本',
  `filming_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '拍摄成本',
  `advertising_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '投放成本',
  `personnel_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '人员成本',
  `other_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '其他成本',
  
  -- 利润指标
  `gross_profit` DECIMAL(15,2) DEFAULT 0 COMMENT '毛利润',
  `profit_margin` DECIMAL(10,2) DEFAULT 0 COMMENT '毛利率(%)',
  `net_profit` DECIMAL(15,2) DEFAULT 0 COMMENT '净利润',
  
  -- 人效指标
  `staff_count` INT DEFAULT 0 COMMENT '人员数量',
  `per_capita_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '人均销售额',
  `per_capita_profit` DECIMAL(15,2) DEFAULT 0 COMMENT '人均利润',
  
  -- 客户指标
  `active_customers` INT DEFAULT 0 COMMENT '活跃客户数',
  `customer_retention_rate` DECIMAL(10,2) DEFAULT 0 COMMENT '客户留存率(%)',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_analytics` (`dimension_type`, `dimension_id`, `period_type`, `period_value`),
  INDEX `idx_company_period` (`company_id`, `period_type`, `period_value`),
  INDEX `idx_dimension` (`dimension_type`, `dimension_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统计汇总表';
```

### 2. customer_analytics（客户维度统计表）

```sql
CREATE TABLE IF NOT EXISTS `customer_analytics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL COMMENT '客户ID',
  `company_id` INT NOT NULL COMMENT '公司ID',
  
  -- 累计指标
  `total_orders` INT DEFAULT 0 COMMENT '累计订单数',
  `total_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '累计销售额',
  `total_cost` DECIMAL(15,2) DEFAULT 0 COMMENT '累计成本',
  `total_profit` DECIMAL(15,2) DEFAULT 0 COMMENT '累计利润',
  
  -- 客户价值指标
  `ltv` DECIMAL(15,2) DEFAULT 0 COMMENT '客户生命周期价值',
  `roi` DECIMAL(10,2) DEFAULT 0 COMMENT '投资回报率(%)',
  `avg_order_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '平均订单金额',
  
  -- 时间指标
  `first_order_date` DATE COMMENT '首次下单日期',
  `last_order_date` DATE COMMENT '最近下单日期',
  `customer_lifecycle_days` INT DEFAULT 0 COMMENT '客户生命周期（天）',
  
  -- 活跃度指标
  `is_active` TINYINT DEFAULT 1 COMMENT '是否活跃',
  `last_contact_date` DATE COMMENT '最后联系日期',
  `contact_frequency` INT DEFAULT 0 COMMENT '联系频次',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_customer` (`customer_id`),
  INDEX `idx_company_id` (`company_id`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户维度统计表';
```

### 3. staff_performance（员工绩效表）

```sql
CREATE TABLE IF NOT EXISTS `staff_performance` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `company_id` INT NOT NULL COMMENT '公司ID',
  `team_id` INT COMMENT '团队ID',
  `period_type` VARCHAR(20) NOT NULL COMMENT '统计周期',
  `period_value` VARCHAR(20) NOT NULL COMMENT '周期值',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  
  -- 业务指标
  `new_customers` INT DEFAULT 0 COMMENT '新增客户数',
  `follow_customers` INT DEFAULT 0 COMMENT '跟进客户数',
  `signed_orders` INT DEFAULT 0 COMMENT '签单数',
  `total_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '总销售额',
  `completed_tasks` INT DEFAULT 0 COMMENT '完成任务数',
  
  -- 效率指标
  `conversion_rate` DECIMAL(10,2) DEFAULT 0 COMMENT '成交转化率(%)',
  `avg_order_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '平均订单金额',
  `per_capita_sales` DECIMAL(15,2) DEFAULT 0 COMMENT '人均产值',
  
  -- 成本利润
  `cost` DECIMAL(15,2) DEFAULT 0 COMMENT '成本',
  `profit` DECIMAL(15,2) DEFAULT 0 COMMENT '利润',
  `profit_margin` DECIMAL(10,2) DEFAULT 0 COMMENT '利润率(%)',
  
  -- 客户质量
  `customer_satisfaction` DECIMAL(10,2) DEFAULT 0 COMMENT '客户满意度',
  `customer_complaints` INT DEFAULT 0 COMMENT '客户投诉数',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_staff_period` (`user_id`, `period_type`, `period_value`),
  INDEX `idx_company_period` (`company_id`, `period_type`, `period_value`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工绩效表';
```

---

## 指标体系

### 1. 销售指标

#### 1.1 销售额指标
```sql
-- 总销售额（特定周期）
SELECT SUM(contract_amount) as total_sales
FROM orders
WHERE order_date BETWEEN '2026-02-01' AND '2026-02-28'
  AND status != '已取消';

-- 团队销售额
SELECT team, SUM(contract_amount) as team_sales
FROM orders
WHERE order_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY team;

-- 个人销售额
SELECT business_staff_id, u.name, SUM(o.contract_amount) as personal_sales
FROM orders o
JOIN users u ON o.business_staff_id = u.id
WHERE o.order_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY business_staff_id;
```

#### 1.2 客单价
```sql
-- 整体客单价
SELECT AVG(contract_amount) as avg_order_amount
FROM orders
WHERE order_date BETWEEN '2026-02-01' AND '2026-02-28';

-- 个人客单价
SELECT business_staff_id, u.name, 
       AVG(o.contract_amount) as avg_order_amount,
       COUNT(*) as order_count
FROM orders o
JOIN users u ON o.business_staff_id = u.id
WHERE o.order_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY business_staff_id;
```

### 2. 成本指标

#### 2.1 成本分类统计
```sql
-- 按成本类别汇总
SELECT 
    cc.name as cost_category,
    SUM(tc.amount) as total_amount
FROM task_costs tc
JOIN cost_categories cc ON tc.category_id = cc.id
JOIN task_pool tp ON tc.task_id = tp.id
JOIN orders o ON tp.order_id = o.id
WHERE o.order_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY cc.name;

-- 拍摄成本占比
SELECT 
    SUM(CASE WHEN cc.name = '拍摄费' THEN tc.amount ELSE 0 END) as filming_cost,
    SUM(CASE WHEN cc.name = '投放费' THEN tc.amount ELSE 0 END) as advertising_cost,
    SUM(tc.amount) as total_cost
FROM task_costs tc
JOIN cost_categories cc ON tc.category_id = cc.id;
```

#### 2.2 客户级成本
```sql
-- 每个客户的总投入成本
SELECT 
    c.id as customer_id,
    c.shop_name,
    SUM(tc.amount) as total_cost,
    COUNT(DISTINCT o.id) as order_count
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN task_pool tp ON o.id = tp.order_id
JOIN task_costs tc ON tp.id = tc.task_id
GROUP BY c.id;
```

### 3. 利润指标

#### 3.1 毛利润
```sql
-- 订单级毛利润
SELECT 
    o.id,
    o.order_number,
    o.contract_amount as sales,
    COALESCE(SUM(tc.amount), 0) as cost,
    o.contract_amount - COALESCE(SUM(tc.amount), 0) as gross_profit,
    CASE 
        WHEN o.contract_amount > 0 
        THEN ((o.contract_amount - COALESCE(SUM(tc.amount), 0)) / o.contract_amount * 100)
        ELSE 0 
    END as profit_margin
FROM orders o
LEFT JOIN task_pool tp ON o.id = tp.order_id
LEFT JOIN task_costs tc ON tp.id = tc.task_id
GROUP BY o.id;
```

#### 3.2 客户级利润
```sql
-- 每个客户的累计利润
SELECT 
    c.id as customer_id,
    c.shop_name,
    SUM(o.contract_amount) as total_sales,
    COALESCE(SUM(tc.amount), 0) as total_cost,
    SUM(o.contract_amount) - COALESCE(SUM(tc.amount), 0) as total_profit,
    CASE 
        WHEN SUM(o.contract_amount) > 0 
        THEN (SUM(o.contract_amount) - COALESCE(SUM(tc.amount), 0)) / SUM(o.contract_amount) * 100
        ELSE 0 
    END as profit_margin
FROM customers c
JOIN orders o ON c.id = o.customer_id
LEFT JOIN task_pool tp ON o.id = tp.order_id
LEFT JOIN task_costs tc ON tp.id = tc.task_id
GROUP BY c.id;
```

### 4. 人效指标

#### 4.1 人均产值
```sql
-- 团队人均产值
SELECT 
    team,
    SUM(contract_amount) as team_sales,
    COUNT(DISTINCT business_staff_id) as staff_count,
    SUM(contract_amount) / COUNT(DISTINCT business_staff_id) as per_capita_sales
FROM orders
WHERE order_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY team;

-- 个人产值
SELECT 
    u.id,
    u.name,
    SUM(o.contract_amount) as personal_sales,
    COUNT(o.id) as order_count,
    SUM(o.contract_amount) / COUNT(o.id) as avg_order_amount
FROM users u
LEFT JOIN orders o ON u.id = o.business_staff_id 
    AND o.order_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY u.id;
```

#### 4.2 人均利润
```sql
-- 团队人均利润
SELECT 
    team,
    SUM(o.contract_amount) - COALESCE(SUM(tc.amount), 0) as team_profit,
    COUNT(DISTINCT business_staff_id) as staff_count,
    (SUM(o.contract_amount) - COALESCE(SUM(tc.amount), 0)) / COUNT(DISTINCT business_staff_id) as per_capita_profit
FROM orders o
LEFT JOIN task_pool tp ON o.id = tp.order_id
LEFT JOIN task_costs tc ON tp.id = tc.task_id
WHERE o.order_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY team;
```

### 5. 客户价值指标

#### 5.1 客户生命周期价值（LTV）
```sql
-- 计算每个客户的LTV
SELECT 
    c.id,
    c.shop_name,
    MIN(o.order_date) as first_order_date,
    MAX(o.order_date) as last_order_date,
    DATEDIFF(MAX(o.order_date), MIN(o.order_date)) as lifecycle_days,
    COUNT(o.id) as total_orders,
    SUM(o.contract_amount) as total_sales,
    AVG(o.contract_amount) as avg_order_amount,
    SUM(o.contract_amount) / NULLIF(DATEDIFF(MAX(o.order_date), MIN(o.order_date)), 0) * 365 as annualized_value
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.id;
```

#### 5.2 客户投产比（ROI）
```sql
-- 客户ROI = (总销售额 - 总成本) / 总成本 * 100%
SELECT 
    c.id,
    c.shop_name,
    SUM(o.contract_amount) as total_sales,
    COALESCE(SUM(tc.amount), 0) as total_cost,
    CASE 
        WHEN COALESCE(SUM(tc.amount), 0) > 0 
        THEN (SUM(o.contract_amount) - COALESCE(SUM(tc.amount), 0)) / COALESCE(SUM(tc.amount), 0) * 100
        ELSE 0 
    END as roi_percentage
FROM customers c
JOIN orders o ON c.id = o.customer_id
LEFT JOIN task_pool tp ON o.id = tp.order_id
LEFT JOIN task_costs tc ON tp.id = tc.task_id
GROUP BY c.id;
```

---

## 功能开发清单

### Phase 1: 团队维度统计（2周）

#### 1.1 团队概览仪表盘
- [ ] 团队销售额趋势图（月度/季度）
- [ ] 团队成本分析图
- [ ] 团队利润率对比
- [ ] 团队人效排行榜

#### 1.2 团队详细报表
- [ ] 团队月报生成
- [ ] 团队成员业绩对比
- [ ] 团队客户分布
- [ ] 团队订单分析

### Phase 2: 人员维度统计（2周）

#### 2.1 个人绩效仪表盘
- [ ] 个人销售额统计
- [ ] 个人客户数统计
- [ ] 个人签单数和成交率
- [ ] 个人客单价分析

#### 2.2 人效分析
- [ ] 个人人均产值计算
- [ ] 个人人均利润计算
- [ ] 个人工作效率分析（任务完成率）
- [ ] 个人成长曲线（月度趋势）

### Phase 3: 客户维度统计（2周）

#### 3.1 客户价值分析
- [ ] 客户LTV计算
- [ ] 客户ROI计算
- [ ] 客户分级（A/B/C级）
- [ ] 客户画像（行业/规模/消费习惯）

#### 3.2 客户成本分析
- [ ] 单客户总投入成本
- [ ] 单客户总利润
- [ ] 客户盈亏分析
- [ ] 高价值客户识别

### Phase 4: 项目维度统计（1周）

#### 4.1 项目绩效分析
- [ ] 项目销售额统计
- [ ] 项目成本统计
- [ ] 项目利润率
- [ ] 项目周期分析

#### 4.2 项目人效
- [ ] 项目参与人数
- [ ] 项目人均产值
- [ ] 项目人均利润

### Phase 5: 综合报表与预测（2周）

#### 5.1 综合报表
- [ ] 公司月度经营报表
- [ ] 公司季度报表
- [ ] 年度总结报表
- [ ] 对标分析报表

#### 5.2 数据可视化
- [ ] 销售趋势预测图
- [ ] 成本占比饼图
- [ ] 人效对比柱状图
- [ ] 客户价值散点图

#### 5.3 数据导出
- [ ] Excel报表导出
- [ ] PDF报表导出
- [ ] 图表导出（PNG/SVG）

---

## 技术实现方案

### 1. 数据统计计算引擎

```python
# backend/analytics_engine.py
class AnalyticsEngine:
    """统计分析引擎"""
    
    def __init__(self, db_connection):
        self.db = db_connection
    
    def calculate_team_performance(self, team_id, start_date, end_date):
        """
        计算团队绩效
        
        返回:
        {
            'sales': 总销售额,
            'cost': 总成本,
            'profit': 总利润,
            'profit_margin': 利润率,
            'order_count': 订单数,
            'customer_count': 客户数,
            'staff_count': 人员数,
            'per_capita_sales': 人均销售额,
            'per_capita_profit': 人均利润
        }
        """
        cursor = self.db.cursor()
        
        # 销售数据
        sql_sales = """
            SELECT 
                COUNT(DISTINCT o.id) as order_count,
                SUM(o.contract_amount) as total_sales,
                COUNT(DISTINCT o.customer_id) as customer_count,
                COUNT(DISTINCT o.business_staff_id) as staff_count
            FROM orders o
            WHERE o.team = %s
              AND o.order_date BETWEEN %s AND %s
              AND o.status != '已取消'
        """
        cursor.execute(sql_sales, (team_id, start_date, end_date))
        sales_data = cursor.fetchone()
        
        # 成本数据
        sql_cost = """
            SELECT SUM(tc.amount) as total_cost
            FROM task_costs tc
            JOIN task_pool tp ON tc.task_id = tp.id
            JOIN orders o ON tp.order_id = o.id
            WHERE o.team = %s
              AND o.order_date BETWEEN %s AND %s
        """
        cursor.execute(sql_cost, (team_id, start_date, end_date))
        cost_data = cursor.fetchone()
        
        # 计算指标
        total_sales = sales_data['total_sales'] or 0
        total_cost = cost_data['total_cost'] or 0
        staff_count = sales_data['staff_count'] or 1
        
        result = {
            'sales': total_sales,
            'cost': total_cost,
            'profit': total_sales - total_cost,
            'profit_margin': ((total_sales - total_cost) / total_sales * 100) if total_sales > 0 else 0,
            'order_count': sales_data['order_count'],
            'customer_count': sales_data['customer_count'],
            'staff_count': staff_count,
            'per_capita_sales': total_sales / staff_count,
            'per_capita_profit': (total_sales - total_cost) / staff_count
        }
        
        cursor.close()
        return result
    
    def calculate_customer_ltv(self, customer_id):
        """计算客户生命周期价值"""
        cursor = self.db.cursor()
        
        sql = """
            SELECT 
                c.id,
                c.shop_name,
                MIN(o.order_date) as first_order_date,
                MAX(o.order_date) as last_order_date,
                DATEDIFF(MAX(o.order_date), MIN(o.order_date)) as lifecycle_days,
                COUNT(o.id) as total_orders,
                SUM(o.contract_amount) as total_sales,
                AVG(o.contract_amount) as avg_order_amount
            FROM customers c
            JOIN orders o ON c.id = o.customer_id
            WHERE c.id = %s
            GROUP BY c.id
        """
        cursor.execute(sql, (customer_id,))
        data = cursor.fetchone()
        
        if not data:
            return None
        
        # 计算年化价值
        lifecycle_days = data['lifecycle_days'] or 1
        annualized_value = (data['total_sales'] / lifecycle_days) * 365 if lifecycle_days > 0 else 0
        
        result = {
            'customer_id': data['id'],
            'shop_name': data['shop_name'],
            'first_order_date': data['first_order_date'],
            'last_order_date': data['last_order_date'],
            'lifecycle_days': lifecycle_days,
            'total_orders': data['total_orders'],
            'total_sales': data['total_sales'],
            'avg_order_amount': data['avg_order_amount'],
            'annualized_value': annualized_value,
            'ltv': annualized_value * 3  # 假设客户生命周期3年
        }
        
        cursor.close()
        return result
```

### 2. 定时统计任务

```python
# backend/cron_jobs.py
from apscheduler.schedulers.background import BackgroundScheduler

def daily_analytics_job():
    """每日统计任务"""
    print("执行每日统计...")
    
    # 统计昨日数据
    yesterday = (datetime.now() - timedelta(days=1)).date()
    
    # 1. 团队统计
    teams = get_all_teams()
    for team in teams:
        calculate_and_save_team_analytics(team.id, yesterday, yesterday)
    
    # 2. 人员统计
    users = get_all_users()
    for user in users:
        calculate_and_save_staff_performance(user.id, yesterday, yesterday)
    
    print("每日统计完成")

def monthly_analytics_job():
    """每月统计任务"""
    print("执行每月统计...")
    
    # 统计上个月数据
    last_month = (datetime.now().replace(day=1) - timedelta(days=1))
    start_date = last_month.replace(day=1)
    end_date = last_month
    
    # 生成月报
    generate_monthly_report(start_date, end_date)
    
    print("每月统计完成")

# 启动定时任务
scheduler = BackgroundScheduler()
scheduler.add_job(daily_analytics_job, 'cron', hour=1, minute=0)  # 每天凌晨1点
scheduler.add_job(monthly_analytics_job, 'cron', day=1, hour=2, minute=0)  # 每月1号凌晨2点
scheduler.start()
```

### 3. 前端可视化

```javascript
// modules/analytics.js
class AnalyticsModule {
    /**
     * 渲染团队绩效对比图
     */
    async renderTeamPerformanceChart() {
        // 获取数据
        const response = await fetch('/api/analytics/team-performance?period=month');
        const data = await response.json();
        
        // 使用Chart.js渲染柱状图
        const ctx = document.getElementById('teamPerformanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.teams.map(t => t.name),
                datasets: [
                    {
                        label: '销售额',
                        data: data.teams.map(t => t.sales),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)'
                    },
                    {
                        label: '利润',
                        data: data.teams.map(t => t.profit),
                        backgroundColor: 'rgba(75, 192, 192, 0.5)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '团队绩效对比'
                    }
                }
            }
        });
    }
    
    /**
     * 渲染客户价值散点图
     */
    async renderCustomerValueScatter() {
        const response = await fetch('/api/analytics/customer-value');
        const data = await response.json();
        
        const ctx = document.getElementById('customerValueChart').getContext('2d');
        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '客户价值分布',
                    data: data.customers.map(c => ({
                        x: c.total_sales,  // X轴：总销售额
                        y: c.total_profit  // Y轴：总利润
                    })),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '客户价值分布（销售额 vs 利润）'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '总销售额（元）'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '总利润（元）'
                        }
                    }
                }
            }
        });
    }
}
```

---

## API接口清单

### 1. 团队统计API

```python
# GET /api/analytics/team/{team_id}/performance
# 参数: start_date, end_date
# 返回: 团队绩效数据

@app.route('/api/analytics/team/<int:team_id>/performance', methods=['GET'])
def get_team_performance(team_id):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    engine = AnalyticsEngine(get_db_connection())
    result = engine.calculate_team_performance(team_id, start_date, end_date)
    
    return jsonify({'success': True, 'data': result})
```

### 2. 人员绩效API

```python
# GET /api/analytics/staff/{user_id}/performance
# 参数: period_type, period_value
# 返回: 员工绩效数据

@app.route('/api/analytics/staff/<int:user_id>/performance', methods=['GET'])
def get_staff_performance(user_id):
    period_type = request.args.get('period_type', 'month')
    period_value = request.args.get('period_value')
    
    # 查询绩效表
    result = query_staff_performance(user_id, period_type, period_value)
    
    return jsonify({'success': True, 'data': result})
```

### 3. 客户价值API

```python
# GET /api/analytics/customer/{customer_id}/value
# 返回: 客户LTV、ROI等指标

@app.route('/api/analytics/customer/<int:customer_id>/value', methods=['GET'])
def get_customer_value(customer_id):
    engine = AnalyticsEngine(get_db_connection())
    
    ltv = engine.calculate_customer_ltv(customer_id)
    roi = engine.calculate_customer_roi(customer_id)
    
    return jsonify({
        'success': True,
        'data': {
            'ltv': ltv,
            'roi': roi
        }
    })
```

---

## 报表模板

### 1. 月度经营报表

```
═══════════════════════════════════════════
        XX公司 2026年2月 经营月报
═══════════════════════════════════════════

一、销售概况
  - 总销售额: ¥158,000
  - 订单数: 23单
  - 新增客户: 15家
  - 平均客单价: ¥6,870

二、成本分析
  - 总成本: ¥95,000
  - 拍摄成本: ¥45,000 (47.4%)
  - 投放成本: ¥38,000 (40.0%)
  - 人员成本: ¥8,000 (8.4%)
  - 其他成本: ¥4,000 (4.2%)

三、利润指标
  - 毛利润: ¥63,000
  - 毛利率: 39.9%
  - 净利润: ¥55,000 (扣除管理费用)

四、团队绩效
  - 商务一组: 销售¥75,000, 利润¥32,000
  - 商务二组: 销售¥58,000, 利润¥20,000
  - 商务三组: 销售¥25,000, 利润¥11,000

五、人效分析
  - 总人数: 18人
  - 人均销售额: ¥8,778
  - 人均利润: ¥3,500

六、TOP表现
  - 销售冠军: 张三 (¥35,000)
  - 利润冠军: 李四 (¥18,000)
  - 签单冠军: 王五 (8单)
```

---

**开发周期**: 9周  
**预计上线**: 2026年4月  
**下一步**: 与权限系统并行开发，优先完成团队和人员统计功能
