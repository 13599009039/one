# 任务管理系统设计文档

## 一、系统概述

任务管理系统用于管理业务审核通过后的订单服务任务,支持服务人员领取任务、业务人员指派任务、任务转交、多人协作等功能。

## 二、数据库设计

### 2.1 task_pool表(任务池主表)

已有字段(17个):
- `id`: 任务ID(主键)
- `order_id`: 关联订单ID
- `status`: 任务状态(待接单/已接单/进行中/待验收/已完成/已放弃/已拒绝)
- `assigned_user_id`: 主责人ID
- `accepted_at`: 接单时间
- `completed_at`: 完成时间
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `source_type`: 任务来源(订单审核/手动创建等)
- `priority`: 优先级(低/中/高/紧急)
- `deadline`: 截止日期
- `abandon_reason`: 放弃原因
- `abandon_by`: 放弃人ID
- `abandon_at`: 放弃时间
- `reject_reason`: 拒绝原因
- `description`: 任务描述
- `requirements`: 任务要求
- `attachments`: 附件(JSON格式)

### 2.2 task_assignments表(任务分配记录表)

支持多人协作,记录所有参与人:
- `id`: 记录ID(主键)
- `task_pool_id`: 任务池ID
- `user_id`: 参与人ID
- `role_type`: 角色类型(主责人/协作人)
- `assigned_by`: 分配人ID
- `assignment_type`: 分配方式(自主领取/业务指派/被转交/被邀请)
- `assigned_at`: 分配时间
- `accepted_at`: 接受时间
- `is_active`: 是否有效(1-有效, 0-已失效)
- `created_at`: 创建时间

### 2.3 task_transfer_logs表(任务转交记录表)

记录任务转交历史:
- `id`: 记录ID(主键)
- `task_pool_id`: 任务池ID
- `from_user_id`: 转出人ID
- `to_user_id`: 接收人ID
- `transfer_reason`: 转交原因
- `transfer_note`: 转交备注
- `transferred_at`: 转交时间
- `accepted_at`: 接受时间
- `created_at`: 创建时间

### 2.4 task_operation_logs表(任务操作日志表)

记录所有任务操作:
- `id`: 记录ID(主键)
- `task_pool_id`: 任务池ID
- `user_id`: 操作人ID
- `operation_type`: 操作类型(创建/领取/指派/转交/添加协作人/移除协作人/更新状态/更新优先级/放弃/拒绝/完成)
- `old_value`: 旧值
- `new_value`: 新值
- `remark`: 备注
- `created_at`: 创建时间

## 三、API接口设计

### 3.1 GET /api/task-pool - 获取任务列表

**参数:**
- `view`: 视图类型
  - `available`: 待领取任务(状态为"待接单"且无人分配)
  - `my`: 我的任务(我作为主责人或协作人参与的任务)
  - `all`: 全部任务
- `user_id`: 当前用户ID(view=my时必填)
- `status`: 任务状态筛选(可选)
- `priority`: 优先级筛选(可选)

**返回:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_id": 10,
      "status": "待接单",
      "priority": "中",
      "customer_name": "张三",
      "total_amount": 5000.00,
      "description": "订单ID:10,客户:张三",
      "participant_count": 0,
      "created_at": "2026-02-12 22:00:00"
    }
  ]
}
```

### 3.2 POST /api/task-pool/{id}/claim - 服务人员领取任务

**参数:**
```json
{
  "user_id": 5
}
```

**功能:**
- 更新任务状态为"已接单"
- 设置assigned_user_id
- 创建task_assignments记录(角色:主责人,方式:自主领取)
- 记录操作日志

**返回:**
```json
{
  "success": true,
  "message": "任务领取成功"
}
```

### 3.3 POST /api/task-pool/{id}/assign - 业务人员指派任务

**参数:**
```json
{
  "user_id": 5,
  "assigned_by": 1,
  "role_type": "主责人"
}
```

**功能:**
- 如果任务状态是"待接单",更新为"已接单"
- 创建task_assignments记录
- 记录操作日志

**返回:**
```json
{
  "success": true,
  "message": "任务指派成功"
}
```

### 3.4 POST /api/task-pool/{id}/transfer - 任务转交

**参数:**
```json
{
  "from_user_id": 5,
  "to_user_id": 6,
  "transfer_reason": "工作量大,需要转交",
  "transfer_note": "请尽快处理"
}
```

**功能:**
- 验证转出人是主责人
- 将原主责人标记为无效
- 创建新的主责人记录
- 更新task_pool的assigned_user_id
- 记录task_transfer_logs
- 记录操作日志

**限制:** 只有主责人才能转交任务

**返回:**
```json
{
  "success": true,
  "message": "任务转交成功"
}
```

### 3.5 POST /api/task-pool/{id}/collaborators - 添加协作人

**参数:**
```json
{
  "user_id": 7,
  "assigned_by": 5
}
```

**功能:**
- 检查用户是否已是参与人
- 创建task_assignments记录(角色:协作人,方式:被邀请)
- 记录操作日志

**返回:**
```json
{
  "success": true,
  "message": "协作人添加成功"
}
```

### 3.6 POST /api/task-pool/{id}/abandon - 放弃任务

**参数:**
```json
{
  "user_id": 5,
  "abandon_reason": "时间冲突,无法完成"
}
```

**功能:**
- 验证操作人是主责人
- 更新任务状态为"待接单"
- 清空assigned_user_id
- 设置abandon相关字段
- 将所有参与人标记为无效
- 记录操作日志

**限制:** 只有主责人才能放弃任务

**返回:**
```json
{
  "success": true,
  "message": "任务已放弃并回到任务池"
}
```

### 3.7 PUT /api/task-pool/{id}/status - 更新任务状态

**参数:**
```json
{
  "status": "进行中",
  "user_id": 5,
  "remark": "开始处理任务"
}
```

**允许的状态:** 进行中/待验收/已完成

**功能:**
- 更新任务状态
- 如果状态为"已完成",设置completed_at
- 记录操作日志

**返回:**
```json
{
  "success": true,
  "message": "任务状态更新成功"
}
```

### 3.8 GET /api/task-pool/{id}/detail - 获取任务详情

**返回:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "order_id": 10,
      "status": "已接单",
      "customer_name": "张三",
      "total_amount": 5000.00,
      "description": "订单ID:10,客户:张三",
      "order_status": "已审核"
    },
    "participants": [
      {
        "user_id": 5,
        "user_name": "李四",
        "role_type": "主责人",
        "assignment_type": "自主领取",
        "assigned_at": "2026-02-12 22:05:00"
      },
      {
        "user_id": 7,
        "user_name": "王五",
        "role_type": "协作人",
        "assignment_type": "被邀请",
        "assigned_by_name": "李四",
        "assigned_at": "2026-02-12 22:10:00"
      }
    ],
    "logs": [
      {
        "operation_type": "添加协作人",
        "operator_name": "李四",
        "new_value": "协作人:7",
        "created_at": "2026-02-12 22:10:00"
      },
      {
        "operation_type": "领取",
        "operator_name": "李四",
        "new_value": "状态: 待接单 → 已接单",
        "created_at": "2026-02-12 22:05:00"
      }
    ],
    "transfer_logs": []
  }
}
```

### 3.9 POST /api/orders/{id}/audit-business - 业务审核(触发器)

**功能扩展:**
- 原有功能:审核订单,设置business_audit_status=1
- **新增功能:自动创建task_pool记录**
  - order_id: 订单ID
  - status: 待接单
  - source_type: 订单审核
  - priority: 中
  - description: 订单ID:{id},客户:{customer_name}
  - requirements: 请按照订单要求完成服务任务

**返回:**
```json
{
  "success": true,
  "message": "审核成功,任务已自动创建"
}
```

## 四、业务流程

### 4.1 任务创建流程

1. 业务人员审核订单(POST /api/orders/{id}/audit-business)
2. 系统自动创建task_pool记录,状态为"待接单"
3. 任务进入任务池,等待服务人员领取

### 4.2 服务人员领取任务流程

1. 服务人员查看待领取任务列表(GET /api/task-pool?view=available)
2. 选择任务并领取(POST /api/task-pool/{id}/claim)
3. 系统更新任务状态为"已接单",创建分配记录

### 4.3 业务人员指派任务流程

1. 业务人员查看待领取任务列表(GET /api/task-pool?view=available)
2. 选择服务人员并指派(POST /api/task-pool/{id}/assign)
3. 系统更新任务状态,创建分配记录

### 4.4 任务转交流程

1. 主责人发起转交(POST /api/task-pool/{id}/transfer)
2. 系统验证主责人身份
3. 将原主责人标记为无效
4. 创建新的主责人记录
5. 记录转交日志

### 4.5 多人协作流程

1. 主责人添加协作人(POST /api/task-pool/{id}/collaborators)
2. 系统创建协作人分配记录
3. 协作人可以查看任务详情
4. 协作人参与任务但不能转交或放弃任务

### 4.6 放弃任务流程

1. 主责人放弃任务(POST /api/task-pool/{id}/abandon)
2. 系统将任务状态重置为"待接单"
3. 清空assigned_user_id
4. 将所有参与人标记为无效
5. 任务回到任务池,可被其他人领取

### 4.7 任务完成流程

1. 服务人员更新任务状态(PUT /api/task-pool/{id}/status)
   - 进行中 → 待验收 → 已完成
2. 系统记录状态变更日志
3. 任务完成后不可再修改

## 五、权限设计

### 5.1 服务人员权限
- 查看待领取任务
- 领取任务
- 查看我的任务
- 更新任务状态
- 转交任务(仅主责人)
- 添加协作人(仅主责人)
- 放弃任务(仅主责人)

### 5.2 业务人员权限
- 查看所有任务
- 指派任务
- 审核订单(触发任务创建)

### 5.3 管理员权限
- 所有权限

## 六、统计视图

### 6.1 v_task_statistics(任务统计视图)

```sql
CREATE OR REPLACE VIEW v_task_statistics AS
SELECT 
    tp.id,
    tp.order_id,
    tp.status,
    tp.priority,
    tp.source_type,
    tp.assigned_user_id,
    o.customer_name,
    o.total_amount,
    u.name as assigned_user_name,
    COUNT(DISTINCT ta.id) as participant_count,
    TIMESTAMPDIFF(HOUR, tp.created_at, COALESCE(tp.completed_at, NOW())) as duration_hours
FROM task_pool tp
LEFT JOIN orders o ON tp.order_id = o.id
LEFT JOIN users u ON tp.assigned_user_id = u.id
LEFT JOIN task_assignments ta ON tp.id = ta.task_pool_id AND ta.is_active=1
GROUP BY tp.id;
```

## 七、实施总结

### 已完成工作:
1. ✅ 数据库表结构设计与创建
   - task_pool表扩展(17个字段)
   - task_assignments表(多人协作支持)
   - task_transfer_logs表(转交历史)
   - task_operation_logs表(操作审计)

2. ✅ 后端API实现(9个接口)
   - 任务列表API(3种视图)
   - 领取任务API
   - 指派任务API
   - 转交任务API
   - 添加协作人API
   - 放弃任务API
   - 更新状态API
   - 任务详情API
   - 订单审核触发器

3. ✅ 业务逻辑实现
   - 任务状态机
   - 角色权限控制
   - 多人协作机制
   - 操作日志记录

### 待完成工作:
1. ⏳ 前端UI开发
   - 任务列表页面(3个Tab:待领取/进行中/已完成)
   - 任务详情模态框
   - 任务操作按钮组

2. ⏳ 功能测试
   - 完整业务流程验证
   - 多人协作测试
   - 边界情况测试

## 八、注意事项

1. **任务状态流转**
   - 待接单 → 已接单 → 进行中 → 待验收 → 已完成
   - 已放弃状态会重置为待接单
   - 已完成状态不可逆

2. **权限控制**
   - 只有主责人可以转交任务
   - 只有主责人可以放弃任务
   - 只有主责人可以添加协作人

3. **数据一致性**
   - task_pool的assigned_user_id应与task_assignments的主责人一致
   - 放弃任务时需同时清理所有分配记录
   - 转交任务时需同时更新task_pool和task_assignments

4. **审计日志**
   - 所有操作都会记录在task_operation_logs
   - 转交操作额外记录在task_transfer_logs
   - 日志不可删除或修改

---

**文档版本:** v1.0  
**创建日期:** 2026-02-12  
**最后更新:** 2026-02-12  
**作者:** AI助手
