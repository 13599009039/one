# SaaS控制端物流模块开发规划

> 创建日期：2026-02-15  
> 状态：规划中  
> 版本：v1.0

---

## 一、项目概述

### 1.1 核心目标
为SaaS控制端（平台侧）新增「物流控制台」模块，实现平台作为ISV对接菜鸟物流云，为租户提供快递寄件服务。

### 1.2 业务链路
```
租户发起寄件请求 → 平台校验配额 → 平台调用菜鸟API → 快递员上门取件 → 菜鸟回调状态更新 → 平台同步给租户
```

### 1.3 核心原则
- **三层隔离**：数据表、接口、权限与租户端完全隔离
- **平台主体**：所有菜鸟API调用主体为平台ISV，非租户直接调用
- **完整日志**：每次接口调用、订单状态变更均需记录日志

---

## 二、菜鸟API对接范围

### 2.1 核心接口清单

| 序号 | API名称 | 用途 | 调用时机 |
|-----|---------|------|---------|
| 1 | `ADDRLIB_DIV_PARSE` | 地址解析（省市区识别） | 用户输入地址时 |
| 2 | `ADDRLIB_DIV_FULLPARSE` | 地址全解析（完整结构化） | 创建订单前 |
| 3 | `TMS_DISPATCH_FIND_SEND_BRANCH` | 查询就近寄件网点 | 创建订单前 |
| 4 | `TMS_WAYBILL_GET` | 电子面单获取（生成运单号） | 创建订单后、派单前 |
| 5 | `TMS_CREATE_ORDER_OFFLINE_NOTIFY` | 线下下单通知（创建快递订单） | 用户确认寄件时 |
| 6 | `TMS_ORDER_CANCEL` | 取消快递订单 | 用户发起取消时 |
| 7 | `TMS_UPDATE_ORDER_CALLBACK` | 订单状态回调（Webhook） | 菜鸟主动推送 |

### 2.2 接口调用流程图
```
┌─────────────────────────────────────────────────────────────────┐
│                        用户填写寄件信息                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: ADDRLIB_DIV_FULLPARSE                                  │
│  - 输入：用户填写的收寄件地址文本                                  │
│  - 输出：结构化的省/市/区/详细地址                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: TMS_DISPATCH_FIND_SEND_BRANCH                          │
│  - 输入：寄件人省市区、快递公司编码                                │
│  - 输出：网点编码、网点名称、联系电话                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: TMS_WAYBILL_GET                                        │
│  - 输入：寄收件人信息、网点编码、物品信息                          │
│  - 输出：电子面单号（waybill_no）                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: TMS_CREATE_ORDER_OFFLINE_NOTIFY                        │
│  - 输入：寄收件人信息、面单号、网点编码、物品信息                  │
│  - 输出：菜鸟订单号、预约状态                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  等待快递员上门取件                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: TMS_UPDATE_ORDER_CALLBACK (Webhook)                    │
│  - 菜鸟主动回调：已派单/已取件/运输中/已签收/异常                   │
│  - 平台接收并更新本地订单状态（幂等性处理）                      │
└─────────────────────────────────────────────────────────────────┘

                        │ 用户取消订单
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  TMS_ORDER_CANCEL（仅 created/waybill_created 状态可取消）      │
│  - 输入：菜鸟订单号、取消原因                                      │
│  - 输出：取消结果，面单号标记为 invalid                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、数据库设计

### 3.1 新增表清单（共7张，前缀 `platform_`）

| 序号 | 表名 | 用途 | 隔离说明 |
|-----|------|------|---------|
| 1 | `platform_cainiao_config` | 平台菜鸟账号配置 | 无company_id，平台级 |
| 2 | `platform_express_rules` | 快递规则配置（寄件人默认信息等） | 无company_id，平台级 |
| 3 | `platform_express_orders` | 快递订单表（核心） | 含tenant_id关联租户 |
| 4 | `platform_tenant_quota` | 租户配额管理 | 按tenant_id管理 |
| 5 | `platform_tenant_quota_detail` | 租户配额使用明细（新增） | 关联订单可追溯 |
| 6 | `platform_cainiao_logs` | 接口调用日志 | 完整记录所有API调用 |
| 7 | `platform_callback_records` | 回调幂等性记录（新增） | 防止重复处理 |

### 3.2 表结构详细定义

#### 3.2.1 platform_cainiao_config（平台菜鸟账号配置）
```sql
CREATE TABLE `platform_cainiao_config` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    
    -- 菜鸟账号信息
    `app_key` VARCHAR(200) NOT NULL COMMENT '菜鸟AppKey',
    `app_secret` VARCHAR(500) NOT NULL COMMENT '菜鸟AppSecret（加密存储）',
    `endpoint_url` VARCHAR(500) DEFAULT 'https://link.cainiao.com/gateway/link.do' COMMENT '接入点地址',
    `sign_method` VARCHAR(50) DEFAULT 'md5' COMMENT '签名方式: md5/hmac',
    
    -- 回调配置
    `callback_url` VARCHAR(500) COMMENT '状态回调地址（Webhook）',
    `callback_secret` VARCHAR(200) COMMENT '回调验签密钥',
    
    -- 状态
    `status` VARCHAR(20) DEFAULT 'enabled' COMMENT 'enabled/disabled',
    `test_passed` TINYINT(1) DEFAULT 0 COMMENT '连通性测试是否通过',
    `last_test_at` DATETIME DEFAULT NULL COMMENT '最后测试时间',
    `test_error` TEXT COMMENT '测试失败错误信息',
    
    -- 审计字段
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台菜鸟账号配置';
```

#### 3.2.2 platform_express_rules（快递规则配置）
```sql
CREATE TABLE `platform_express_rules` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `rule_name` VARCHAR(100) NOT NULL COMMENT '规则名称',
    
    -- 快递公司
    `cp_code` VARCHAR(50) NOT NULL COMMENT '快递公司编码（如YTO/ZTO/SF）',
    `cp_name` VARCHAR(100) COMMENT '快递公司名称',
    
    -- 默认寄件人信息
    `sender_name` VARCHAR(100) COMMENT '默认寄件人姓名',
    `sender_phone` VARCHAR(50) COMMENT '默认寄件人电话',
    `sender_province` VARCHAR(50) COMMENT '省',
    `sender_city` VARCHAR(50) COMMENT '市',
    `sender_district` VARCHAR(50) COMMENT '区',
    `sender_town` VARCHAR(50) COMMENT '镇/街道',
    `sender_address` VARCHAR(500) COMMENT '详细地址',
    
    -- 业务配置
    `service_type` VARCHAR(50) DEFAULT 'STANDARD' COMMENT '服务类型',
    `pay_method` VARCHAR(20) DEFAULT 'PREPAY' COMMENT '付款方式: PREPAY预付/COLLECT到付',
    
    -- 状态
    `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认规则',
    `status` VARCHAR(20) DEFAULT 'enabled',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_cp_code` (`cp_code`),
    INDEX `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快递规则配置';
```

#### 3.2.3 platform_express_orders（快递订单表）
```sql
CREATE TABLE `platform_express_orders` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    
    -- 菜鸟订单信息
    `cainiao_order_id` VARCHAR(100) COMMENT '菜鸟订单号',
    `mail_no` VARCHAR(100) COMMENT '快递运单号（取件后返回）',
    `cp_code` VARCHAR(50) NOT NULL COMMENT '快递公司编码',
    `cp_name` VARCHAR(100) COMMENT '快递公司名称',
    
    -- 电子面单信息（新增）
    `waybill_no` VARCHAR(100) COMMENT '电子面单号（TMS_WAYBILL_GET返回）',
    `waybill_status` VARCHAR(20) DEFAULT 'unused' COMMENT '面单状态：unused未使用/used已使用/invalid已作废',
    `waybill_get_time` DATETIME COMMENT '面单获取时间',
    `print_data` JSON COMMENT '面单打印数据（菜鸟返回）',
    
    -- 寄件人信息
    `sender_name` VARCHAR(100) NOT NULL,
    `sender_phone` VARCHAR(50) NOT NULL,
    `sender_province` VARCHAR(50),
    `sender_city` VARCHAR(50),
    `sender_district` VARCHAR(50),
    `sender_town` VARCHAR(50),
    `sender_address` VARCHAR(500),
    
    -- 收件人信息
    `receiver_name` VARCHAR(100) NOT NULL,
    `receiver_phone` VARCHAR(50) NOT NULL,
    `receiver_province` VARCHAR(50),
    `receiver_city` VARCHAR(50),
    `receiver_district` VARCHAR(50),
    `receiver_town` VARCHAR(50),
    `receiver_address` VARCHAR(500),
    
    -- 物品信息
    `goods_name` VARCHAR(200) COMMENT '物品名称',
    `goods_count` INT DEFAULT 1 COMMENT '物品数量',
    `weight` DECIMAL(10,3) COMMENT '重量(kg)',
    `volume` DECIMAL(10,3) COMMENT '体积(m³)',
    `remark` VARCHAR(500) COMMENT '备注',
    
    -- 网点信息
    `branch_code` VARCHAR(50) COMMENT '网点编码',
    `branch_name` VARCHAR(100) COMMENT '网点名称',
    `branch_phone` VARCHAR(50) COMMENT '网点电话',
    `courier_name` VARCHAR(50) COMMENT '快递员姓名',
    `courier_phone` VARCHAR(50) COMMENT '快递员电话',
    
    -- 订单状态（完善状态枚举）
    `status` VARCHAR(30) DEFAULT 'created' COMMENT '状态',
    `status_desc` VARCHAR(200) COMMENT '状态描述',
    `exception_reason` VARCHAR(500) COMMENT '异常原因',
    `cancel_reason` VARCHAR(500) COMMENT '取消原因',
    
    -- 状态枚举（完整版）：
    -- created: 已创建（待获取面单号）
    -- waybill_created: 已获取面单号（待派单）- 可取消
    -- dispatched: 已派单（快递员已接单）
    -- picked: 已取件（已扫码面单）
    -- in_transit: 运输中
    -- delivering: 派送中
    -- signed: 已签收
    -- rejected: 已拒收
    -- exception: 异常
    -- cancelled: 已取消（仅 created/waybill_created 状态可取消）
    
    -- 费用信息
    `freight` DECIMAL(10,2) DEFAULT 0.00 COMMENT '运费',
    `pay_method` VARCHAR(20) DEFAULT 'PREPAY' COMMENT '付款方式',
    
    -- 物流轨迹
    `track_info` JSON COMMENT '物流轨迹（JSON数组）',
    `last_track_time` DATETIME COMMENT '最后轨迹时间',
    `last_track_desc` VARCHAR(500) COMMENT '最后轨迹描述',
    
    -- 时间节点
    `waybill_time` DATETIME COMMENT '面单获取时间',
    `dispatch_time` DATETIME COMMENT '派单时间',
    `pick_time` DATETIME COMMENT '取件时间',
    `sign_time` DATETIME COMMENT '签收时间',
    `cancel_time` DATETIME COMMENT '取消时间',
    
    -- 关联信息
    `tenant_id` INT DEFAULT NULL COMMENT '关联租户ID',
    `tenant_order_id` INT DEFAULT NULL COMMENT '关联租户系统订单ID',
    `rule_id` INT DEFAULT NULL COMMENT '使用的规则ID',
    
    -- 审计字段
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    
    INDEX `idx_cainiao_order_id` (`cainiao_order_id`),
    INDEX `idx_mail_no` (`mail_no`),
    INDEX `idx_waybill_no` (`waybill_no`),
    INDEX `idx_waybill_status` (`waybill_status`),
    INDEX `idx_status` (`status`),
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_cp_code` (`cp_code`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台快递订单表';
```

#### 3.2.4 platform_tenant_quota（租户配额管理）
```sql
CREATE TABLE `platform_tenant_quota` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `tenant_id` INT NOT NULL COMMENT '租户ID（关联companies.id）',
    `tenant_name` VARCHAR(200) COMMENT '租户名称（冗余）',
    
    -- 配额设置
    `monthly_free_quota` INT DEFAULT 0 COMMENT '每月免费配额',
    `monthly_used` INT DEFAULT 0 COMMENT '本月已使用',
    `total_used` INT DEFAULT 0 COMMENT '累计使用总量',
    
    -- 超额计费
    `overage_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否允许超额',
    `overage_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '超额单价（元/单）',
    `overage_used` INT DEFAULT 0 COMMENT '本月超额使用',
    `overage_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '本月超额费用',
    
    -- 配额周期
    `quota_reset_day` INT DEFAULT 1 COMMENT '配额重置日（每月几号）',
    `last_reset_at` DATE DEFAULT NULL COMMENT '上次重置日期',
    
    -- 状态
    `status` VARCHAR(20) DEFAULT 'enabled' COMMENT 'enabled/disabled/suspended',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY `uk_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户物流配额管理';
```

#### 3.2.5 platform_cainiao_logs（接口调用日志）
```sql
CREATE TABLE `platform_cainiao_logs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    
    -- API信息
    `api_method` VARCHAR(100) NOT NULL COMMENT 'API方法名',
    `api_version` VARCHAR(20) COMMENT 'API版本',
    
    -- 请求信息
    `request_id` VARCHAR(100) COMMENT '请求唯一ID',
    `request_params` JSON COMMENT '请求参数（脱敏）',
    `request_time` DATETIME NOT NULL COMMENT '请求时间',
    
    -- 响应信息
    `response_code` VARCHAR(50) COMMENT '响应码',
    `response_sub_code` VARCHAR(50) COMMENT '子响应码',
    `response_msg` VARCHAR(500) COMMENT '响应消息',
    `response_data` JSON COMMENT '响应数据（脱敏）',
    `response_time` DATETIME COMMENT '响应时间',
    
    -- 性能指标
    `duration_ms` INT COMMENT '耗时(毫秒)',
    
    -- 关联信息
    `tenant_id` INT DEFAULT NULL COMMENT '关联租户',
    `order_id` INT DEFAULT NULL COMMENT '关联快递订单ID',
    
    -- 结果状态
    `success` TINYINT(1) DEFAULT 0 COMMENT '是否成功',
    `error_type` VARCHAR(50) COMMENT '错误类型: network/auth/business/system',
    `error_detail` TEXT COMMENT '错误详情',
    
    -- IP信息
    `client_ip` VARCHAR(50) COMMENT '客户端IP',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_api_method` (`api_method`),
    INDEX `idx_request_time` (`request_time`),
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_success` (`success`),
    INDEX `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜鸟接口调用日志';
```

#### 3.2.6 platform_tenant_quota_detail（租户配额使用明细）
```sql
CREATE TABLE `platform_tenant_quota_detail` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `tenant_id` INT NOT NULL COMMENT '租户ID',
    `order_id` INT NOT NULL COMMENT '关联快递订单ID',
    
    -- 配额类型
    `quota_type` VARCHAR(20) DEFAULT 'normal' COMMENT 'normal正常配额/overage超额',
    `used_num` INT DEFAULT 1 COMMENT '使用数量',
    `amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '费用（超额时）',
    
    -- 关联信息
    `waybill_no` VARCHAR(100) COMMENT '关联面单号',
    `cp_code` VARCHAR(50) COMMENT '快递公司',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_tenant_id` (`tenant_id`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户配额使用明细';
```

#### 3.2.7 platform_callback_records（回调幂等性记录）
```sql
CREATE TABLE `platform_callback_records` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    
    -- 回调唯一标识
    `callback_id` VARCHAR(200) NOT NULL COMMENT '回调唯一ID（cainiao_order_id + callback_type）',
    `callback_type` VARCHAR(50) COMMENT '回调类型',
    
    -- 关联信息
    `cainiao_order_id` VARCHAR(100) COMMENT '菜鸟订单号',
    `order_id` INT COMMENT '本地订单ID',
    
    -- 处理状态
    `processed` TINYINT(1) DEFAULT 1 COMMENT '是否已处理',
    `process_time` DATETIME COMMENT '处理时间',
    `process_result` VARCHAR(500) COMMENT '处理结果',
    
    -- 原始数据
    `raw_data` JSON COMMENT '原始回调数据',
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY `uk_callback_id` (`callback_id`),
    INDEX `idx_cainiao_order_id` (`cainiao_order_id`),
    INDEX `idx_order_id` (`order_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回调幂等性记录';
```

---

## 四、后端API设计

### 4.1 API路由规划

**前缀**：`/api/platform/cainiao`  
**权限**：所有接口需 `@require_platform_admin` 装饰器

| 序号 | 路径 | 方法 | 功能 | 请求参数 | 响应 |
|-----|------|------|------|---------|------|
| 1 | `/config` | GET | 获取菜鸟账号配置 | - | 配置详情 |
| 2 | `/config` | POST | 保存/更新配置 | app_key, app_secret等 | success |
| 3 | `/config/test` | POST | 测试接口连通性 | - | 测试结果 |
| 4 | `/rules` | GET | 获取规则列表 | page, page_size | 规则列表 |
| 5 | `/rules` | POST | 新增规则 | 规则字段 | 新规则ID |
| 6 | `/rules/<id>` | PUT | 更新规则 | 规则字段 | success |
| 7 | `/rules/<id>` | DELETE | 删除规则 | - | success |
| 8 | `/orders` | GET | 获取快递订单列表 | status, tenant_id, date等 | 订单列表 |
| 9 | `/orders/<id>` | GET | 获取订单详情+轨迹 | - | 订单详情 |
| 10 | `/orders/create` | POST | 创建快递订单 | 寄收件人信息 | 订单信息 |
| 11 | `/orders/<id>/waybill` | POST | 获取电子面单号 | - | 面单号+打印数据 |
| 12 | `/orders/<id>/cancel` | POST | 取消订单 | reason | success |
| 13 | `/address/parse` | POST | 地址解析 | address_text | 结构化地址 |
| 14 | `/branch/find` | POST | 查询就近网点 | province, city, district, cp_code | 网点列表 |
| 15 | `/quotas` | GET | 获取租户配额列表 | - | 配额列表 |
| 16 | `/quotas` | POST | 新增/更新配额 | tenant_id, quota等 | success |
| 17 | `/quotas/<id>` | DELETE | 删除配额 | - | success |
| 18 | `/quotas/details` | GET | 获取配额使用明细 | tenant_id, date_range | 明细列表 |
| 19 | `/logs` | GET | 获取调用日志 | api_method, success, date_range | 日志列表 |
| 20 | `/callback` | POST | 接收菜鸟回调 | 菜鸟回调数据 | success |

### 4.2 后端文件结构

```
backend/
├── platform_cainiao_api.py      # 新增：物流控制台API Blueprint
├── platform_cainiao_service.py  # 新增：菜鸟接口调用封装
└── app.py                       # 修改：注册新Blueprint
```

### 4.3 核心代码结构

#### platform_cainiao_api.py 骨架
```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SaaS平台物流控制台API
对接菜鸟物流云，管理快递订单
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import pymysql
from datetime import datetime
from platform_cainiao_service import CainiaoService

platform_cainiao_bp = Blueprint('platform_cainiao', __name__, url_prefix='/api/platform/cainiao')

# ==================== 菜鸟账号配置 ====================
@platform_cainiao_bp.route('/config', methods=['GET'])
@require_platform_admin
def get_config():
    """获取菜鸟账号配置"""
    pass

@platform_cainiao_bp.route('/config', methods=['POST'])
@require_platform_admin
def save_config():
    """保存菜鸟账号配置"""
    pass

@platform_cainiao_bp.route('/config/test', methods=['POST'])
@require_platform_admin
def test_connection():
    """测试接口连通性"""
    pass

# ==================== 快递规则配置 ====================
@platform_cainiao_bp.route('/rules', methods=['GET'])
@require_platform_admin
def get_rules():
    """获取规则列表"""
    pass

@platform_cainiao_bp.route('/rules', methods=['POST'])
@require_platform_admin
def create_rule():
    """新增规则"""
    pass

@platform_cainiao_bp.route('/rules/<int:rule_id>', methods=['PUT'])
@require_platform_admin
def update_rule(rule_id):
    """更新规则"""
    pass

@platform_cainiao_bp.route('/rules/<int:rule_id>', methods=['DELETE'])
@require_platform_admin
def delete_rule(rule_id):
    """删除规则"""
    pass

# ==================== 快递订单管理 ====================
@platform_cainiao_bp.route('/orders', methods=['GET'])
@require_platform_admin
def get_orders():
    """获取快递订单列表"""
    pass

@platform_cainiao_bp.route('/orders/<int:order_id>', methods=['GET'])
@require_platform_admin
def get_order_detail(order_id):
    """获取订单详情"""
    pass

@platform_cainiao_bp.route('/orders/create', methods=['POST'])
@require_platform_admin
def create_order():
    """创建快递订单"""
    # 1. 校验租户配额
    # 2. 调用地址解析
    # 3. 查询网点
    # 4. 调用菜鸟下单
    # 5. 保存订单到本地
    # 6. 记录日志
    pass

@platform_cainiao_bp.route('/orders/<int:order_id>/cancel', methods=['POST'])
@require_platform_admin
def cancel_order(order_id):
    """取消订单"""
    pass

# ==================== 地址服务 ====================
@platform_cainiao_bp.route('/address/parse', methods=['POST'])
@require_platform_admin
def parse_address():
    """地址解析"""
    pass

@platform_cainiao_bp.route('/branch/find', methods=['POST'])
@require_platform_admin
def find_branch():
    """查询就近网点"""
    pass

# ==================== 租户配额管理 ====================
@platform_cainiao_bp.route('/quotas', methods=['GET'])
@require_platform_admin
def get_quotas():
    """获取租户配额列表"""
    pass

@platform_cainiao_bp.route('/quotas', methods=['POST'])
@require_platform_admin
def save_quota():
    """新增/更新配额"""
    pass

@platform_cainiao_bp.route('/quotas/<int:quota_id>', methods=['DELETE'])
@require_platform_admin
def delete_quota(quota_id):
    """删除配额"""
    pass

# ==================== 调用日志 ====================
@platform_cainiao_bp.route('/logs', methods=['GET'])
@require_platform_admin
def get_logs():
    """获取调用日志"""
    pass

# ==================== 菜鸟回调 ====================
@platform_cainiao_bp.route('/callback', methods=['POST'])
def cainiao_callback():
    """接收菜鸟状态回调（Webhook）"""
    # 注意：此接口不需要平台管理员权限，需要验签
    pass
```

#### platform_cainiao_service.py 骨架
```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
菜鸟物流云API调用封装
"""

import hashlib
import hmac
import json
import time
import requests
from datetime import datetime

class CainiaoService:
    """菜鸟API调用服务"""
    
    def __init__(self, app_key, app_secret, endpoint_url, sign_method='md5'):
        self.app_key = app_key
        self.app_secret = app_secret
        self.endpoint_url = endpoint_url
        self.sign_method = sign_method
    
    def _generate_sign(self, params):
        """生成签名"""
        # 按参数名排序
        sorted_params = sorted(params.items())
        # 拼接字符串
        sign_str = self.app_secret
        for k, v in sorted_params:
            sign_str += f"{k}{v}"
        sign_str += self.app_secret
        
        if self.sign_method == 'md5':
            return hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
        elif self.sign_method == 'hmac':
            return hmac.new(
                self.app_secret.encode('utf-8'),
                sign_str.encode('utf-8'),
                hashlib.md5
            ).hexdigest().upper()
    
    def _call_api(self, method, biz_params):
        """调用菜鸟API"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        params = {
            'app_key': self.app_key,
            'method': method,
            'timestamp': timestamp,
            'format': 'json',
            'v': '1.0',
            'sign_method': self.sign_method,
            'logistics_interface': json.dumps(biz_params, ensure_ascii=False)
        }
        
        params['sign'] = self._generate_sign(params)
        
        start_time = time.time()
        try:
            response = requests.post(self.endpoint_url, data=params, timeout=30)
            response_data = response.json()
            duration_ms = int((time.time() - start_time) * 1000)
            
            return {
                'success': response_data.get('success', False),
                'code': response_data.get('errorCode'),
                'message': response_data.get('errorMsg'),
                'data': response_data.get('data'),
                'duration_ms': duration_ms
            }
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'code': 'NETWORK_ERROR',
                'message': str(e),
                'data': None,
                'duration_ms': duration_ms
            }
    
    def parse_address(self, address_text):
        """地址解析 - ADDRLIB_DIV_FULLPARSE"""
        return self._call_api('ADDRLIB_DIV_FULLPARSE', {
            'address': address_text
        })
    
    def find_branch(self, province, city, district, cp_code):
        """查询网点 - TMS_DISPATCH_FIND_SEND_BRANCH"""
        return self._call_api('TMS_DISPATCH_FIND_SEND_BRANCH', {
            'cpCode': cp_code,
            'province': province,
            'city': city,
            'district': district
        })
    
    def create_order(self, order_data):
        """创建快递订单 - TMS_CREATE_ORDER_OFFLINE_NOTIFY"""
        return self._call_api('TMS_CREATE_ORDER_OFFLINE_NOTIFY', order_data)
    
    def verify_callback_sign(self, data, sign):
        """验证回调签名"""
        # 根据菜鸟回调签名规则实现
        pass
```

---

## 五、前端开发设计

### 5.1 导航布局改造

#### 改造前
```
┌──────────────────────────────────────────────────────────┐
│  [Logo] 系统控制台   公司管理 | 用户管理 | 系统设置    [Admin] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                      内容区域                             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### 改造后
```
┌────────┬─────────────────────────────────────────────────┐
│        │                                                 │
│ [Logo] │              内容区域                            │
│        │                                                 │
│ ────── │                                                 │
│        │                                                 │
│ 公司管理│                                                 │
│ 用户管理│                                                 │
│ 系统设置│                                                 │
│        │                                                 │
│ ────── │                                                 │
│        │                                                 │
│ 物流控制│                                                 │
│  ├账号  │                                                 │
│  ├规则  │                                                 │
│  ├订单  │                                                 │
│  ├配额  │                                                 │
│  └日志  │                                                 │
│        │                                                 │
│ [折叠] │                                                 │
└────────┴─────────────────────────────────────────────────┘
```

### 5.2 导航配置结构
```javascript
const NAV_CONFIG = [
    {
        id: 'companies',
        icon: 'fa-building',
        label: '公司管理',
        module: 'companiesModule'
    },
    {
        id: 'users',
        icon: 'fa-users',
        label: '用户管理',
        module: 'usersModule'
    },
    {
        id: 'system',
        icon: 'fa-cog',
        label: '系统设置',
        module: 'systemModule'
    },
    {
        id: 'logistics',
        icon: 'fa-truck',
        label: '物流控制台',
        children: [
            { id: 'cainiao-config', icon: 'fa-key', label: '菜鸟账号', module: 'cainiaoConfigModule' },
            { id: 'express-rules', icon: 'fa-list-alt', label: '快递规则', module: 'expressRulesModule' },
            { id: 'express-orders', icon: 'fa-shipping-fast', label: '快递订单', module: 'expressOrdersModule' },
            { id: 'tenant-quotas', icon: 'fa-chart-pie', label: '租户配额', module: 'tenantQuotasModule' },
            { id: 'cainiao-logs', icon: 'fa-history', label: '调用日志', module: 'cainiaoLogsModule' }
        ]
    }
];
```

### 5.3 物流控制台子模块

#### 5.3.1 菜鸟账号配置页
**功能**：配置平台的菜鸟AppKey/AppSecret，测试连通性

**UI组件**：
- 表单：AppKey、AppSecret（密码框）、接入点地址、签名方式下拉
- 按钮：测试连通性、保存配置
- 状态显示：测试通过/失败、最后测试时间

#### 5.3.2 快递规则配置页
**功能**：配置不同快递公司的默认寄件人信息

**UI组件**：
- 规则列表表格（快递公司、默认寄件人、状态、操作）
- 新增/编辑规则模态框
- 设为默认按钮

#### 5.3.3 快递订单管理页
**功能**：创建快递订单、查看订单列表和物流轨迹

**UI组件**：
- 筛选栏：状态、快递公司、租户、日期范围
- 订单列表表格
- 创建订单模态框（寄收件人表单、地址解析、网点选择）
- 订单详情模态框（基本信息、物流轨迹时间线）

#### 5.3.4 租户配额管理页
**功能**：管理各租户的快递配额

**UI组件**：
- 配额列表表格（租户、月配额、已用、超额设置、状态）
- 新增/编辑配额模态框

#### 5.3.5 接口调用日志页
**功能**：查看菜鸟API调用历史

**UI组件**：
- 筛选栏：API方法、成功/失败、时间范围
- 日志列表表格（时间、API、耗时、状态、关联订单）
- 日志详情模态框（请求参数、响应数据）

### 5.4 前端文件修改清单

| 文件 | 修改类型 | 说明 |
|-----|---------|------|
| `console.html` | 大改 | 布局改造为左侧导航，新增物流模块HTML |
| `js/console.js` | 扩展 | 新增物流模块相关JS函数 |

---

## 六、开发阶段划分

### 阶段1：导航布局改造（预计0.5天）

**任务清单**：
- [ ] 1.1 修改console.html布局结构（顶部导航→左侧导航）
- [ ] 1.2 实现左侧导航栏样式（240px宽，紫色主题）
- [ ] 1.3 实现导航折叠/展开功能（折叠后60px，仅显示图标）
- [ ] 1.4 新增「物流控制台」一级菜单（含5个子菜单）
- [ ] 1.5 实现子菜单展开/收起交互
- [ ] 1.6 内容区域自适应导航栏宽度

**验收标准**：
- 左侧导航正常显示，折叠/展开功能正常
- 原有模块（公司管理、用户管理、系统设置）切换正常
- 物流控制台菜单可见，子菜单可展开

### 阶段2：数据库表创建（预计0.5天）

**任务清单**：
- [ ] 2.1 创建SQL文件 `init_platform_cainiao.sql`
- [ ] 2.2 创建 `platform_cainiao_config` 表
- [ ] 2.3 创建 `platform_express_rules` 表
- [ ] 2.4 创建 `platform_express_orders` 表
- [ ] 2.5 创建 `platform_tenant_quota` 表
- [ ] 2.6 创建 `platform_tenant_quota_detail` 表（配额明细）
- [ ] 2.7 创建 `platform_cainiao_logs` 表
- [ ] 2.8 创建 `platform_callback_records` 表（回调幂等性）
- [ ] 2.9 执行SQL并验证表结构

**验收标准**：
- 7张表创建成功，字段、索引完整
- 表之间无外键关联（保持隔离）

### 阶段3：后端API开发（预计1.5天）

**任务清单**：
- [ ] 3.1 创建 `platform_cainiao_api.py` Blueprint
- [ ] 3.2 创建 `platform_cainiao_service.py` 服务类
- [ ] 3.3 实现菜鸟账号配置CRUD（/config）
- [ ] 3.4 实现快递规则配置CRUD（/rules）
- [ ] 3.5 实现快递订单列表/详情（/orders）
- [ ] 3.6 实现创建订单API（/orders/create）
- [ ] 3.7 实现地址解析API（/address/parse）
- [ ] 3.8 实现网点查询API（/branch/find）
- [ ] 3.9 实现租户配额CRUD（/quotas）
- [ ] 3.10 实现调用日志查询（/logs）
- [ ] 3.11 实现菜鸟回调接口（/callback）
- [ ] 3.12 在app.py中注册Blueprint
- [ ] 3.13 API测试（Postman/curl）

**验收标准**：
- 所有API返回正确的JSON格式
- 权限验证生效（非管理员返回403）
- 日志记录完整

### 阶段4：前端页面开发（预计1.5天）

**任务清单**：
- [ ] 4.1 菜鸟账号配置页面 + 测试按钮
- [ ] 4.2 快递规则配置页面 + 新增/编辑模态框
- [ ] 4.3 快递订单列表页面 + 筛选功能
- [ ] 4.4 创建快递订单模态框（含地址解析）
- [ ] 4.5 订单详情模态框（含物流轨迹）
- [ ] 4.6 租户配额管理页面 + 编辑模态框
- [ ] 4.7 接口调用日志页面 + 详情模态框
- [ ] 4.8 JS函数实现（API调用、表单处理、列表渲染）

**验收标准**：
- 所有页面正常渲染
- 表单提交、列表筛选功能正常
- 模态框打开/关闭正常

### 阶段5：菜鸟接口对接（预计1天）

**任务清单**：
- [ ] 5.1 实现菜鸟签名算法
- [ ] 5.2 对接 ADDRLIB_DIV_FULLPARSE（地址解析）
- [ ] 5.3 对接 TMS_DISPATCH_FIND_SEND_BRANCH（网点查询）
- [ ] 5.4 对接 TMS_WAYBILL_GET（电子面单获取）
- [ ] 5.5 对接 TMS_CREATE_ORDER_OFFLINE_NOTIFY（下单）
- [ ] 5.6 对接 TMS_ORDER_CANCEL（取消订单）
- [ ] 5.7 实现回调验签逻辑
- [ ] 5.8 对接 TMS_UPDATE_ORDER_CALLBACK（回调处理+幂等性）
- [ ] 5.9 联调测试（真实环境）

**验收标准**：
- 地址解析返回结构化数据
- 网点查询返回可用网点
- 面单获取返回运单号
- 下单成功返回菜鸟订单号
- 取消订单正确更新状态和面单状态
- 回调能正确更新订单状态（幂等处理）

### 阶段6：联调测试与优化（预计0.5天）

**任务清单**：
- [ ] 6.1 完整流程测试（创建订单→取件→签收）
- [ ] 6.2 异常场景测试（网络超时、参数错误、配额不足）
- [ ] 6.3 日志记录检查
- [ ] 6.4 性能优化（缓存、分页）
- [ ] 6.5 代码审查与清理

**验收标准**：
- 完整业务流程跑通
- 异常场景有友好提示
- 无console.error、无未处理异常

---

## 七、隔离检查清单（开发红线）

### 7.1 数据表隔离
- [ ] 所有新表以 `platform_` 前缀命名
- [ ] 新表无 `company_id` 字段（平台级数据）
- [ ] 租户关联使用 `tenant_id` 字段
- [ ] 不修改任何 `logistics_*` 租户端表

### 7.2 接口隔离
- [ ] 所有接口路径以 `/api/platform/cainiao/` 开头
- [ ] 不使用 `/api/logistics/` 路径
- [ ] 不复用 `logistics_api.py` 中的任何函数

### 7.3 权限隔离
- [ ] 所有接口使用 `@require_platform_admin` 装饰器
- [ ] 回调接口使用签名验证（非管理员权限）
- [ ] 租户账号访问返回403

### 7.4 代码隔离
- [ ] 新增独立文件 `platform_cainiao_api.py`
- [ ] 新增独立文件 `platform_cainiao_service.py`
- [ ] 不修改 `logistics_api.py`

---

## 八、风险与注意事项

### 8.1 菜鸟接口风险
- **签名错误**：严格按文档实现签名算法，注意参数排序和编码
- **超时处理**：设置合理超时时间（30秒），做好重试机制
- **回调丢失**：实现回调幂等性处理，支持手动同步状态

### 8.2 数据安全
- **敏感信息加密**：AppSecret、Token等字段需加密存储
- **日志脱敏**：手机号、地址等敏感信息在日志中脱敏
- **回调验签**：必须验证菜鸟回调签名，防止伪造

### 8.3 业务风险
- **配额超限**：配额检查需原子性操作，防止并发超限
- **订单状态**：状态流转需严格校验，防止非法状态变更

---

## 九、后续扩展预留

### 9.1 租户端集成（Phase 2）
- 租户端发起寄件请求API
- 租户端查看自己的快递订单
- 租户端配额用量查询

### 9.2 多快递公司支持（Phase 3）
- 顺丰、京东等直连接口
- 快递100聚合接口
- 智能选择最优快递

### 9.3 报表统计（Phase 4）
- 快递订单统计报表
- 租户用量排行
- 费用结算报表

---

## 十、文档版本记录

| 版本 | 日期 | 修改内容 | 修改人 |
|-----|------|---------|-------|
| v1.0 | 2026-02-15 | 初始版本 | AI |
| v1.1 | 2026-02-15 | 合规性优化：新增面单管理、配额明细、回调幂等性 | AI |

---

*本文档为开发规划文档，后续开发过程中如有调整，请同步更新此文档。*
