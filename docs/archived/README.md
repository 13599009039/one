# 文档归档说明

本目录存放已过时、冗余、临时的文档，仅用于历史追溯，不再维护更新。

## 📦 归档文档列表

### 问题登记册归档
- `CODE_ISSUES_GROUPED_ANALYSIS.md` - 问题分组分析(已被v1.2版本替代)
- `CODE_ISSUES_REGISTRY_v1.0.md` - 问题登记册v1.0(已升级至v1.2)

### 开发计划归档
- `DEVELOPMENT_PLAN_OVERALL.md` - 总体开发计划(已拆分为具体模块计划)
- `DEVELOPMENT_PLAN_PERMISSION_AND_ANALYTICS.md` - 权限与分析计划(空文档)
- `VERSION_SYNC_PLAN.md` - 版本同步计划(已完成)

### 升级报告归档
- `UPGRADE_REPORT_v2.0.md` - V2升级报告(已完成,历史参考)

### 测试文档归档
- `README_TEST.md` - 测试用临时文档

## ⚠️ 使用说明

1. **只读存档**: 本目录文档仅供历史追溯,不允许修改
2. **版本回溯**: 需要查看历史版本时可参考这里的文档
3. **定期清理**: 每季度审查一次,删除完全无参考价值的文档
4. **禁止引用**: 新文档/代码中不应引用归档文档,请使用最新版本

## 🔍 查找历史版本

如需查看更早版本的文档:
```bash
# 查看文档变更历史
git log --oneline -- docs/archived/<文档名>

# 查看特定版本内容
git show <commit-hash>:docs/archived/<文档名>
```
