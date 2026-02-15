# AJ快计财务管理系统 - 开发文档目录

> **文档版本**: v1.0  
> **最后更新**: 2026-02-15  
> **维护人**: 开发团队

---

## 📂 文档结构说明

### 📌 核心文档 (core/)
**说明**: 系统核心设计文档，所有开发人员必读，需严格保持与代码同步。  
**保护级别**: 🔒 仅项目负责人可修改，其他成员提PR审核后合并。

| 文档名 | 用途 | 更新频率 |
|--------|------|----------|
| [README.md](core/README.md) | 系统总体说明、架构设计、功能概览 | 架构变更时必更 |
| [DEV_CONFIG.md](core/DEV_CONFIG.md) | 开发环境配置、依赖安装、本地调试指南 | 环境变更时必更 |
| [PRODUCTION_GUIDE.md](core/PRODUCTION_GUIDE.md) | 生产部署流程、配置清单、运维指南 | 部署流程变更时必更 |
| [MULTI_TENANT_GUIDE.md](core/MULTI_TENANT_GUIDE.md) | 多租户架构说明、数据隔离机制 | 租户逻辑变更时必更 |

---

### 🔄 过程文档 (process/)
**说明**: 开发计划、任务管理、测试规范等动态文档，随开发进度迭代更新。  
**保护级别**: 🟡 开发成员可修改，需在提交时说明变更原因。

| 文档名 | 用途 | 更新时机 |
|--------|------|----------|
| [DEV_PLAN_SAAS_CONSOLE.md](process/DEV_PLAN_SAAS_CONSOLE.md) | SaaS控制台开发计划 | 功能开发/调整时同步更新状态 |
| [DEV_PLAN_ANALYTICS_SYSTEM.md](process/DEV_PLAN_ANALYTICS_SYSTEM.md) | 数据分析系统开发计划 | 分析模块开发时更新进度 |
| [DEV_PLAN_PERMISSION_SYSTEM.md](process/DEV_PLAN_PERMISSION_SYSTEM.md) | 权限系统开发计划 | 权限逻辑变更时更新 |
| [TASK_MANAGEMENT_IMPLEMENTATION.md](process/TASK_MANAGEMENT_IMPLEMENTATION.md) | 任务管理功能实现方案 | 任务模块开发时更新 |
| [TASK_MANAGEMENT_SYSTEM.md](process/TASK_MANAGEMENT_SYSTEM.md) | 任务管理系统设计 | 任务流程调整时更新 |
| [TESTING_PLAN.md](process/TESTING_PLAN.md) | 测试计划与用例 | 新增功能时补充测试用例 |

---

### 🔍 审计文档 (audit/)
**说明**: 系统审计报告、问题登记册、测试报告等归档文档，用于版本追溯。  
**保护级别**: 🔒 只增不改，新版本审计生成新文件，旧版本保留。

| 文档名 | 用途 | 生成时机 |
|--------|------|----------|
| [SYSTEM_AUDIT_REPORT_2026-02-15.md](audit/SYSTEM_AUDIT_REPORT_2026-02-15.md) | 系统全面审计报告 | 重大版本发布前 |
| [CODE_ISSUES_REGISTRY_v1.2_COMPLETE_AUDIT.md](audit/CODE_ISSUES_REGISTRY_v1.2_COMPLETE_AUDIT.md) | 代码问题登记册(最新版) | 问题解决后更新状态 |
| [AUDIT_WORK_SUMMARY_2026-02-13.md](audit/AUDIT_WORK_SUMMARY_2026-02-13.md) | 审计工作总结 | 审计完成后生成 |
| [SYSTEM_RECOVERY_DIAGNOSIS_2026-02-13.md](audit/SYSTEM_RECOVERY_DIAGNOSIS_2026-02-13.md) | 系统恢复诊断报告 | 故障恢复后生成 |
| [TEST_REPORT.md](audit/TEST_REPORT.md) | 测试报告 | 测试完成后更新 |

---

### 📦 归档文档 (archived/)
**说明**: 过时版本、临时文档、冗余文档存档，仅用于历史追溯，不再维护。  
**保护级别**: 🟢 只读，不允许修改，必要时可删除。

| 文档名 | 归档原因 |
|--------|----------|
| CODE_ISSUES_GROUPED_ANALYSIS.md | 已被v1.2版本替代 |
| CODE_ISSUES_REGISTRY_v1.0.md | 旧版问题登记册 |
| DEVELOPMENT_PLAN_OVERALL.md | 已拆分为具体模块计划 |
| DEVELOPMENT_PLAN_PERMISSION_AND_ANALYTICS.md | 空文档，无实际内容 |
| VERSION_SYNC_PLAN.md | 版本同步计划已完成 |
| UPGRADE_REPORT_v2.0.md | V2升级报告(已完成) |
| README_TEST.md | 测试用临时文档 |

---

## 🔄 文档更新约定

### 1️⃣ **同步更新原则**
**核心规则**: 代码变更与文档更新必须在同一次Git提交中完成，禁止"代码改了文档不改"。

**强制同步场景**:
- ✅ **功能开发**: 新增功能 → 更新对应开发计划文档状态
- ✅ **架构调整**: 架构变更 → 更新`core/README.md`架构设计部分
- ✅ **环境配置**: 依赖/配置变更 → 更新`core/DEV_CONFIG.md`
- ✅ **部署流程**: 部署方式调整 → 更新`core/PRODUCTION_GUIDE.md`
- ✅ **BUG修复**: 修复问题 → 更新`audit/CODE_ISSUES_REGISTRY_*.md`问题状态
- ✅ **审计待办**: 审计报告TODO落地 → 更新审计报告对应章节

**非强制场景**:
- 仅修改注释、代码格式调整、变量重命名等不影响功能的重构
- 临时调试代码、实验性代码(未合并到主分支)

---

### 2️⃣ **Git提交规范**

**提交信息格式**:
```
<类型>(<范围>): <简述>

[可选] 详细说明
[可选] 关联文档变更说明

类型:
- feat: 新功能
- fix: BUG修复
- docs: 仅文档更新
- refactor: 代码重构(不改变功能)
- perf: 性能优化
- test: 测试相关
- chore: 构建/工具配置变更
```

**示例1: 功能开发+文档更新**
```bash
git add modules/logistics.js docs/process/DEV_PLAN_SAAS_CONSOLE.md
git commit -m "feat(logistics): 完成物流订单批量打印功能

- 新增批量打印模态框
- 对接物流平台API
- 文档更新: DEV_PLAN_SAAS_CONSOLE.md 物流管理模块状态更新为'已完成'"
```

**示例2: BUG修复+问题登记册更新**
```bash
git add backend/app.py docs/audit/CODE_ISSUES_REGISTRY_v1.2_COMPLETE_AUDIT.md
git commit -m "fix(orders): 修复订单明细保存失败问题

- 修复order_items表插入时字段缺失问题
- 文档更新: CODE_ISSUES_REGISTRY #P0-3 标记为已解决"
```

**示例3: 架构调整+核心文档更新**
```bash
git add backend/app.py docs/core/README.md
git commit -m "refactor(auth): 重构多租户权限验证机制

- 统一使用装饰器@require_company进行租户隔离
- 文档更新: README.md 架构设计-权限系统章节更新"
```

---

### 3️⃣ **版本管理策略**

**分支管理**:
- `master`: 生产稳定版，每次发布打Tag
- `develop`: 开发主分支，功能开发完成后合并
- `feature/*`: 功能分支，开发新功能时从develop拉取

**版本打标签**:
```bash
# 重大版本发布时，代码和文档同步打Tag
git tag -a v3.0.0 -m "SaaS多租户架构上线"
git push origin v3.0.0
```

**文档回滚**:
```bash
# 查看文档变更历史
git log --oneline docs/core/README.md

# 回滚文档到指定版本
git checkout <commit-hash> -- docs/core/README.md
```

---

### 4️⃣ **协作规范**

**修改前必做**:
```bash
# 1. 拉取最新代码和文档
git pull origin master

# 2. 检查是否有冲突
git status

# 3. 修改文档前查看最新内容
cat docs/core/README.md
```

**核心文档修改流程**:
1. 非项目负责人修改核心文档需提交PR
2. PR描述中说明修改原因和影响范围
3. 项目负责人Review后合并

**冲突解决**:
```bash
# 如果出现文档冲突
git pull origin master  # 拉取最新版本
# 手动解决冲突后
git add docs/xxx.md
git commit -m "docs: 解决文档合并冲突"
```

---

## 📋 快速检查清单

**提交前自检**:
- [ ] 代码变更是否需要更新文档？(参考"同步更新原则")
- [ ] 文档变更是否已添加到Git暂存区？(`git add docs/xxx.md`)
- [ ] 提交信息是否包含文档变更说明？
- [ ] 核心文档修改是否已征得项目负责人同意？

**定期审查**:
- 每周检查一次`process/`开发计划文档与实际进度是否一致
- 每月生成一次系统审计报告，归档至`audit/`
- 每季度清理一次`archived/`归档文档，删除无价值临时文档

---

## 🔗 相关资源

- **Gitee仓库**: https://gitee.com/zhiweiweng/one
- **配置文件**: [.gitee_config](../.gitee_config)
- **问题反馈**: 提交Issue到Gitee仓库

---

**维护日志**:
- 2026-02-15: 初始化文档目录结构，建立文档更新约定
