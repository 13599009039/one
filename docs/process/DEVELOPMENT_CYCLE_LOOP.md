# 规范驱动的开发闭环流程

> **文档版本**: v1.0  
> **创建日期**: 2026-02-16  
> **适用范围**: 前端、后端、UI、物流模块开发  
> **重要性**: 🔴 强制执行 - 所有开发人员必遵循环流程

---

## 🔄 开发闭环流程概述

建立"**规范检查 → 生成报告 → 依赖规范生成提示词 → 生成待办 → 循环升级**"的标准化开发闭环，确保系统持续高质量演进。

---

## 📋 标准开发循环流程

### 第一步：规范检查 (Specification Check)

**执行频率**: 每次开发前、每周例行检查

**检查内容**:
1. ✅ 开发规范统一手册是否最新
2. ✅ 代码风格是否符合规范
3. ✅ 命名约定是否统一
4. ✅ 架构设计是否合理
5. ✅ 安全规范是否遵守

**检查工具**:
```bash
# 1. 检查开发规范手册版本
cat /root/ajkuaiji/docs/开发规范统一手册.md | grep "文档版本"

# 2. 代码风格检查
eslint --config .eslintrc.js modules/

# 3. 命名规范检查
grep -r "function [a-z][a-zA-Z]*[A-Z]" modules/  # 驼峰命名检查

# 4. 安全检查
bandit -r backend/  # Python安全扫描
```

### 第二步：生成报告 (Generate Report)

**报告类型**:
1. **代码质量报告**
2. **功能完整性报告** 
3. **性能分析报告**
4. **安全扫描报告**
5. **用户体验报告**

**报告模板**:
```markdown
# 开发周期报告 - YYYY-MM-DD

## 📊 本期概览
- 周期: YYYY-MM-DD 至 YYYY-MM-DD
- 开发人员: [姓名]
- 完成任务数: X/X
- 代码提交数: X次

## ✅ 已完成工作
1. [任务ID] 功能描述 - 状态: 完成
2. [任务ID] 功能描述 - 状态: 完成

## ⚠️ 发现问题
1. **问题类型**: [代码质量/功能缺陷/性能问题]
   - **描述**: 具体问题描述
   - **影响**: 对系统的影响程度
   - **优先级**: [P0/P1/P2]

## 📈 数据指标
- 代码行数: +X/-Y
- Bug修复数: X个
- 新增功能: X个
- 测试覆盖率: XX%

## 🎯 下期计划
1. [待办ID] 待完成任务 - 预估时间: X天
2. [待办ID] 待完成任务 - 预估时间: X天
```

### 第三步：依赖规范生成提示词 (Generate Prompt Based on Spec)

**提示词生成规则**:
1. **基于规范手册**: 引用具体条款编号
2. **明确约束条件**: 列出技术限制和要求
3. **定义输出格式**: 指定期望的结果形式
4. **设置验收标准**: 明确完成标志

**标准提示词模板**:
```
【核心场景】：[具体开发场景]
【背景信息】：
1. 当前系统状态：[现状描述]
2. 已完成动作：[已完成工作]
3. 核心痛点：[需要解决的问题]
【具体需求】：
1. [具体要求1]
2. [具体要求2]  
3. [具体要求3]
【约束条件】：
1. 必须遵循《开发规范统一手册》第X章X节
2. [技术约束1]
3. [业务约束2]
【不需要】：
1. [明确排除的内容1]
2. [明确排除的内容2]
【输出要求】：
1. 按[指定格式]输出
2. 包含[必要元素]
3. 符合[验收标准]
```

### 第四步：生成待办 (Generate Todo Items)

**待办项分级**:
- **P0**: 致命问题，必须立即修复
- **P1**: 严重问题，需要尽快处理  
- **P2**: 一般问题，按计划处理
- **P3**: 优化建议，择机处理

**待办项格式**:
```markdown
- [PRIORITY] ID:task_id CONTENT:任务描述
  - 预估工时: X小时
  - 依赖关系: [前置任务]
  - 验收标准: [完成标志]
  - 相关文档: [文档链接]
```

### 第五步：循环升级 (Loop Upgrade)

**升级机制**:
1. **自动执行**: 基于日志和监控自动触发
2. **人工触发**: 开发人员主动启动检查
3. **定时执行**: 每日/每周定期运行

**升级流程**:
```
发现问题 → 评估优先级 → 生成待办 → 分配任务 → 执行开发 → 验证结果 → 更新规范
     ↑                                                              ↓
     └─────────────────────── 反馈改进 ←─────────────────────────────┘
```

---

## 🛠️ 自动化工具支持

### 1. 规范检查自动化脚本

```bash
#!/bin/bash
# auto_check_spec.sh - 自动规范检查脚本

echo "🔍 开始规范检查..."

# 1. 检查开发规范手册版本
SPEC_VERSION=$(grep "文档版本" /root/ajkuaiji/docs/开发规范统一手册.md | cut -d':' -f2 | tr -d ' ')
echo "📄 规范手册版本: $SPEC_VERSION"

# 2. 代码风格检查
echo "🎨 执行代码风格检查..."
eslint --quiet modules/ 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 代码风格检查通过"
else
    echo "❌ 代码风格存在问题"
fi

# 3. 安全扫描
echo "🛡️ 执行安全扫描..."
bandit -r backend/ --quiet 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 安全扫描通过"
else
    echo "⚠️ 发现安全风险"
fi

# 4. 生成检查报告
REPORT_FILE="/root/ajkuaiji/docs/reports/spec_check_$(date +%Y%m%d_%H%M%S).md"
cat > $REPORT_FILE << EOF
# 规范检查报告 - $(date)

## 检查时间
$(date)

## 检查结果
- 规范手册版本: $SPEC_VERSION
- 代码风格: [通过/不通过]
- 安全扫描: [通过/不通过]

## 发现问题
[在此列出发现的具体问题]

## 建议措施
[在此列出改进建议]
EOF

echo "📝 检查报告已生成: $REPORT_FILE"
```

### 2. 待办项自动生成脚本

```python
#!/usr/bin/env python3
# auto_generate_todo.py - 待办项自动生成

import json
import re
from datetime import datetime

def analyze_code_issues():
    """分析代码中的问题并生成待办项"""
    todos = []
    
    # 1. 检查TODO/FIXME注释
    todo_pattern = r'(TODO|FIXME):\s*(.+?)\s*$'
    
    # 2. 检查重复代码
    # 3. 检查性能瓶颈
    # 4. 检查安全漏洞
    
    return todos

def generate_todo_report(todos):
    """生成待办项报告"""
    report = {
        "generated_at": datetime.now().isoformat(),
        "total_items": len(todos),
        "by_priority": {},
        "items": todos
    }
    
    # 按优先级分组
    for todo in todos:
        priority = todo.get("priority", "P3")
        if priority not in report["by_priority"]:
            report["by_priority"][priority] = []
        report["by_priority"][priority].append(todo)
    
    return report

if __name__ == "__main__":
    todos = analyze_code_issues()
    report = generate_todo_report(todos)
    
    # 保存报告
    with open(f'/root/ajkuaiji/docs/reports/todo_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json', 'w') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 生成待办报告，共{len(todos)}项任务")
```

### 3. 循环升级监控脚本

```bash
#!/bin/bash
# dev_cycle_monitor.sh - 开发循环监控

while true; do
    echo "🔄 执行开发循环检查 - $(date)"
    
    # 1. 运行规范检查
    /root/ajkuaiji/scripts/auto_check_spec.sh
    
    # 2. 分析前端日志
    ERROR_COUNT=$(tail -100 /var/log/ajkuaiji/frontend.log | grep -c "ERROR\|❌" || echo 0)
    if [ $ERROR_COUNT -gt 0 ]; then
        echo "🚨 发现 $ERROR_COUNT 个前端错误，触发自动修复..."
        # 调用自动修复脚本
    fi
    
    # 3. 检查后端健康状态
    HEALTH_STATUS=$(curl -s http://localhost:8050/api/health | jq -r '.status' 2>/dev/null || echo "unknown")
    if [ "$HEALTH_STATUS" != "healthy" ]; then
        echo "⚠️ 后端服务状态异常: $HEALTH_STATUS"
    fi
    
    # 4. 生成周期报告
    echo "📊 生成开发周期报告..."
    
    # 休眠一段时间后继续
    sleep 300  # 5分钟检查一次
done
```

---

## 📈 质量指标跟踪

### 核心指标
| 指标 | 目标值 | 当前值 | 趋势 |
|------|--------|--------|------|
| 代码规范符合率 | ≥95% | 92% | ↑ |
| Bug修复及时率 | ≥90% | 85% | ↑ |
| 自动化测试覆盖率 | ≥80% | 65% | ↑ |
| 用户满意度 | ≥4.5/5 | 4.2 | ↑ |

### 改进措施
1. **每日代码审查**: 确保规范符合率达标
2. **Bug响应机制**: 建立快速修复通道
3. **测试用例补充**: 逐步提升测试覆盖率
4. **用户反馈收集**: 定期调研用户满意度

---

## 🎯 实施计划

### 第一阶段：基础建设 (1-2周)
- [ ] 部署自动化检查工具
- [ ] 建立报告生成机制
- [ ] 完善待办项管理体系

### 第二阶段：流程优化 (2-4周)
- [ ] 优化提示词生成质量
- [ ] 提升自动化程度
- [ ] 建立知识库积累

### 第三阶段：智能升级 (1-2月)
- [ ] 引入AI辅助代码审查
- [ ] 实现智能问题预测
- [ ] 建立自适应优化机制

---

## 📚 相关文档

- [开发规范统一手册](../开发规范统一手册.md)
- [物流升级V2.0](../物流升级V2.0.md)
- [系统审计报告](../audit/)
- [API接口文档](../core/API_DOCUMENTATION.md)

---

**维护人**: 开发团队  
**更新周期**: 每月评审更新  
**最后更新**: 2026-02-16