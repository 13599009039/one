# AJ_ERP_EXECUTION_STANDARDS.md (执行标准)
# AJ快计ERP系统 - 执行标准文档

**文档版本**: v1.0  
**创建日期**: 2026-02-17  
**文档类型**: 执行标准  
**适用范围**: 前端开发、后端开发、UI设计、测试人员  

---

## 📌 当前系统关键记忆索引

### 🚨 用户偏好记忆（必须严格遵守）

#### 1. 批量修复自主连续执行规范
**要求**: 当用户要求批量修复时，AI必须自主连续执行，禁止中断提问，直至同类问题全部处理完成。

#### 2. 可视化测试数据过程同步需求
**要求**: 用户希望在可视化测试过程中实现数据过程的实时同步，替代截图识别方式，以提升问题定位效率。

**已实现方案**:
- **前端日志系统**: `/root/ajkuaiji/modules/utils.js` - fetch拦截器、console.error拦截器
- **后端日志API**: `/root/ajkuaiji/backend/frontend_logs_api.py`
- **日志文件**: `/var/log/ajkuaiji/frontend.log`
- **UI状态监控**: `logUIState()`, `logPageSwitch()`, `logModalState()`

#### 3. 日志驱动的自动化修复响应模式
**要求**: AI需基于日志自动识别报错和未完成流程，并主动执行修复与补全，无需等待用户逐条指令；响应应聚焦问题闭环，优先呈现可执行的修复动作。

#### 4. 日志驱动的前端可视化问题诊断规范
**要求**: 当用户反馈前端可视化异常（如模态框/模块未显示）且AI无法直视UI时，须主动结合操作日志、浏览器控制台错误、网络请求状态、DOM节点是否存在等可观测信号进行交叉验证，构建'日志线索→渲染行为'的诊断逻辑链。

#### 5. 协作测试节奏偏好
**要求**: 用户倾向在功能逻辑全部更新完成后统一测试，AI应在完整实现变更后主动告知'已更新完毕，可测试'，而非分步确认。

---

## 📚 开发规范标准

### 第一部分：前端开发规范

#### 1.1 HTML页面结构规范

##### 1.1.1 页面容器隔离原则
**【强制】每个功能页面必须有独立的容器，且容器必须正确闭合**

**✅ 正确示例**:
```html
<!-- 发货地址页面 -->
<div id="warehousePage" class="hidden">
    <h1>发货地址管理</h1>
    <table>
        <tbody id="warehousesTableBody">
            <!-- 内容 -->
        </tbody>
    </table>
    <!-- ✅ 空状态提示在容器内 -->
    <div class="text-center py-8">
        <p>暂无数据</p>
    </div>
</div>

<!-- 物流模板页面 - 独立容器 -->
<div id="logisticsTemplatesPage" class="hidden">
    <h1>打印模板管理</h1>
    <!-- ✅ 该页面的提示在自己的容器内 -->
    <div class="text-center py-8">
        <p>暂无打印模板，请点击"新增模板"创建</p>
    </div>
</div>
```

##### 1.1.2 页面容器命名规范
**【强制】所有页面容器必须遵循统一的命名规范**

```html
<!-- 标准格式 -->
<div id="[模块名]Page" class="hidden fade-in">
    <!-- 页面内容 -->
</div>
```

**命名示例**：
- `customersPage` - 客户管理页面
- `ordersPage` - 订单管理页面
- `logisticsConfigPage` - 物流配置页面
- `warehousesPage` - 发货地址页面

##### 1.1.3 HTML标签闭合检查清单
**【强制】每次添加HTML结构后必须检查以下项目**

1. ✅ 每个 `<div>` 都有对应的 `</div>`
2. ✅ 每个 `<table>` 都有对应的 `</table>`
3. ✅ 每个 `<tbody>` 都有对应的 `</tbody>`
4. ✅ 每个 `<tr>` 都有对应的 `</tr>`
5. ✅ 每个 `<td>` 都有对应的 `</td>`
6. ✅ 页面容器的闭合标签后不应有该页面的内容
7. ✅ 不应出现多余的闭合标签

#### 1.2 JavaScript开发规范

##### 1.2.1 全局函数导出规范
**【强制】HTML中onclick调用的函数必须挂载到window对象**

```javascript
// ❌ 错误：函数未全局导出，HTML onclick无法访问
function openAddWarehouseModal() {
    // ...
}

// ✅ 正确：函数挂载到window对象
window.openAddWarehouseModal = function() {
    // ...
};
```

##### 1.2.2 DOM元素检查规范
**【强制】操作DOM前必须先检查元素是否存在**

```javascript
// ❌ 错误：直接操作可能不存在的元素
document.getElementById('myModal').classList.remove('hidden');

// ✅ 正确：先检查元素存在性
const modal = document.getElementById('myModal');
if (modal) {
    modal.classList.remove('hidden');
    console.log('✅ 模态框已打开: myModal');
} else {
    console.error('❌ 模态框不存在: myModal');
    if (window.logModalState) {
        window.logModalState('myModal', 'error', 'Modal element not found');
    }
}
```

#### 1.3 CSS样式规范

##### 1.3.1 框架选择规范
**【强制】系统使用Tailwind CSS，禁止使用Bootstrap类名**

```html
<!-- ❌ 错误：使用Bootstrap类名 -->
<div class="modal">
    <div class="modal-dialog">
        <div class="modal-content">
            <input class="form-control" />
        </div>
    </div>
</div>

<!-- ✅ 正确：使用Tailwind CSS类名 -->
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
    <div class="relative w-full max-w-lg shadow-lg rounded-md bg-white p-5">
        <input class="w-full border border-gray-300 rounded-md py-2 px-3" />
    </div>
</div>
```

##### 1.3.2 页面层级体系规范
**【强制】建立统一的页面层级体系，确保所有UI元素正确显示**

###### 层级体系标准
```
层级范围      | 元素类型              | z-index值     | 说明
-------------|---------------------|--------------|------
0-99         | 页面基础内容          | 0-99         | 默认层级，页面主要内容
100-999      | 页面浮动元素          | 100-999      | 下拉菜单、悬浮提示、固定导航栏
1000-1999    | 次级弹窗/浮层         | 1000-1999    | 提示框、确认框、下拉选择器
2000-9999    | 主要模态框            | 2000-9999    | 主要业务模态框、表单弹窗
10000+       | 系统级弹窗            | 10000+       | 加载遮罩、系统提示、全屏模态框
```

###### 模态框z-index规范
```html
<!-- ✅ 正确：使用标准模态框层级 -->
<div id="myModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center px-4 hidden modal" style="z-index: 2500 !important;">
    <!-- 模态框内容 -->
</div>

<!-- ❌ 错误：层级不符合规范 -->
<div id="wrongModal" style="z-index: 100;">层级过低</div>
<div id="conflictModal" style="z-index: 15000;">层级过高，可能与其他系统元素冲突</div>
```

#### 1.4 模态框开发规范

##### 1.4.1 模态框创建方式
**【推荐】通过JavaScript动态创建模态框，避免污染HTML**

```javascript
window.openAddCustomerModal = function() {
    // 检查模态框是否已存在，避免重复创建
    let existingModal = document.getElementById('add-customer-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="add-customer-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center px-4 hidden modal" style="z-index: 10000 !important;">
            <div class="relative w-full max-w-lg shadow-lg rounded-md bg-white p-5 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4 pb-3 border-b">
                    <h3 class="text-lg font-bold text-gray-900">
                        <i class="fas fa-plus mr-2 text-blue-600"></i>新增客户
                    </h3>
                    <button type="button" class="text-gray-400 hover:text-gray-500" onclick="closeModal('add-customer-modal')">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="add-customer-form" class="space-y-4">
                    <!-- 表单内容 -->
                </form>
                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button type="button" class="px-4 py-2 border rounded-md" onclick="closeModal('add-customer-modal')">取消</button>
                    <button type="submit" form="add-customer-form" class="px-4 py-2 bg-blue-600 text-white rounded-md">保存</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    openModal('add-customer-modal');
};
```

##### 1.4.2 模态框尺寸规范
**【强制】统一模态框尺寸标准，确保界面一致性和用户体验**

| 模态框类型 | 尺寸规格 | 适用场景 | 布局方式 |
|-----------|----------|----------|----------|
| **简单信息展示** | max-w-md (约384px) | 确认框、提示框 | 单列布局 |
| **表单输入** | max-w-lg (约512px) | 客户添加、简单编辑 | 单列布局 |
| **复杂业务操作** | **1100px × 749px** | **订单创建、售后处理** | **三段式布局** |
| **数据分析展示** | max-w-4xl (约896px) | 报表查看、统计分析 | 双列或多列布局 |

---

### 第二部分：后端开发规范

#### 2.1 系统端口规范

##### 2.1.1 端口分配原则
**【强制】系统端口必须避开常用端口，使用专用端口段**

###### 禁止使用的常用端口（易冲突）
```
❌ 5000  - Flask默认端口，macOS AirPlay占用
❌ 8000  - Django默认端口
❌ 8080  - Tomcat/Nginx备用端口
❌ 3000  - Node.js/React开发端口
❌ 3306  - MySQL默认端口
❌ 6379  - Redis默认端口
❌ 27017 - MongoDB默认端口
```

###### ✅ 本系统端口分配表（强制执行）
| 服务名称 | 端口 | 协议 | 说明 | 状态 | 访问地址 |
|---------|------|------|------|------|----------|
| **Flask API服务** | **8050** | HTTP | 主后端API服务 | ✅ 正式 | http://127.0.0.1:8050 |
| Nginx主服务 | 80 | HTTP | 前端页面 | ✅ 正式 | http://47.98.60.197 |
| Nginx SSL服务 | 443 | HTTPS | SSL加密 | ✅ 正式 | https://erp.xnamb.cn |
| MySQL数据库 | 3306 | TCP | 数据库服务 | ✅ 正式 | localhost:3306 |

#### 2.2 Flask API开发规范

##### 2.2.1 Blueprint注册规范
**【强制】注册Blueprint必须包含异常捕获和状态日志**

```python
# ❌ 错误：无异常捕获
app.register_blueprint(tenant_logistics_bp)

# ✅ 正确：包含异常捕获和日志
try:
    app.register_blueprint(tenant_logistics_bp)
    print('✅ [Blueprint] tenant_logistics_bp 注册成功')
except Exception as e:
    print(f'❌ [Blueprint] tenant_logistics_bp 注册失败: {e}')
```

##### 2.2.2 API响应格式规范
**【强制】所有API必须返回统一的JSON格式**

```python
# 成功响应
{
    "success": True,
    "data": {...},
    "message": "操作成功"
}

# 失败响应
{
    "success": False,
    "message": "错误描述",
    "error_code": "ERR_001"  # 可选
}
```

##### 2.2.3 数据库配置规范
**【强制】所有API必须使用统一的DB_CONFIG**

```python
# 统一数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'ajkuaiji',
    'password': '@HNzb5z75b16',
    'database': 'ajkuaiji',
    'charset': 'utf8mb4'
}

# ✅ 正确：使用统一配置
conn = pymysql.connect(**DB_CONFIG)
```

#### 2.3 权限与租户隔离规范

##### 2.3.1 租户权限装饰器规范
**【强制】所有租户API必须使用@require_tenant_auth装饰器**

```python
from functools import wraps
from flask import session, jsonify

def require_tenant_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        tenant_id = session.get('tenant_id')
        if not tenant_id:
            return jsonify({
                'success': False,
                'message': '未登录或租户信息缺失'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

# 使用示例
@tenant_logistics_bp.route('/api/tenant/warehouses', methods=['GET'])
@require_tenant_auth
def get_warehouses():
    tenant_id = session.get('tenant_id')
    # 业务逻辑，自动基于tenant_id隔离数据
    pass
```

---

### 第三部分：数据库规范

#### 3.1 表结构设计规范

##### 3.1.1 多租户字段规范
**【强制】所有业务表必须包含tenant_id或company_id字段**

```sql
-- 标准业务表结构
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,           -- 租户ID（必须）
    order_no VARCHAR(50) UNIQUE,      -- 订单号
    customer_id INT,                  -- 客户ID
    amount DECIMAL(10,2),             -- 金额
    status VARCHAR(20),               -- 状态
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant_id (tenant_id),   -- 必须建立索引
    INDEX idx_created_at (created_at)
);
```

##### 3.1.2 字段命名规范
**【强制】字段命名必须清晰、准确、符合业务含义**

- ✅ `customer_name` - 客户姓名
- ✅ `order_amount` - 订单金额
- ✅ `created_at` - 创建时间
- ❌ `name` - 含义不明
- ❌ `money` - 不够专业
- ❌ `time` - 不够具体

#### 3.2 SQL编写规范

##### 3.2.1 参数化查询规范
**【强制】禁止SQL拼接，必须使用参数化查询**

```python
# ❌ 错误：SQL拼接（SQL注入风险）
sql = f"SELECT * FROM users WHERE username = '{username}'"

# ✅ 正确：参数化查询
sql = "SELECT * FROM users WHERE username = %s"
cursor.execute(sql, (username,))
```

##### 3.2.2 多租户查询规范
**【强制】所有查询必须包含租户过滤条件**

```python
# ❌ 错误：未过滤租户
sql = "SELECT * FROM orders WHERE status = 'pending'"

# ✅ 正确：包含租户过滤
sql = "SELECT * FROM orders WHERE tenant_id = %s AND status = 'pending'"
cursor.execute(sql, (tenant_id,))
```

---

### 第四部分：Git协作规范

#### 4.1 提交信息规范

##### 4.1.1 提交格式
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

##### 4.1.2 提交示例
```bash
# 功能开发
git commit -m "feat(logistics): 完成省市区三级联动选择器

- 添加CHINA_REGIONS数据对象
- 实现initWarehouseRegionSelector()函数
- 补全河南省、浙江省等6个省份的完整城市数据
- 修正34处数据错误"

# BUG修复
git commit -m "fix(ui): 删除页面容器外的垃圾HTML

【问题】客户页面底部显示物流模板提示
【根因】HTML内容在页面容器闭合标签之后
【修复】删除第2442-2448行的孤立元素和多余闭合标签"
```

#### 4.2 分支管理规范

##### 4.2.1 分支命名规范
```
feature/功能名称     # 新功能开发
fix/问题描述        # BUG修复
hotfix/紧急修复      # 紧急线上修复
release/版本号      # 发布版本
```

---

### 第五部分：测试规范

#### 5.1 前端测试规范

##### 5.1.1 UI组件测试
**【强制】每个新功能必须包含基本的UI测试**

```javascript
// 基础UI测试模板
function testNewFeature() {
    // 1. 测试元素是否存在
    const element = document.getElementById('new-feature-element');
    if (!element) {
        console.error('❌ 元素不存在');
        return false;
    }
    
    // 2. 测试功能是否正常
    try {
        // 执行功能测试
        element.click();
        console.log('✅ 功能测试通过');
        return true;
    } catch (error) {
        console.error('❌ 功能测试失败:', error);
        return false;
    }
}
```

#### 5.2 后端测试规范

##### 5.2.1 API接口测试
**【强制】每个新API必须包含测试用例**

```python
# API测试模板
def test_new_api():
    """测试新API接口"""
    # 1. 测试未授权访问
    response = client.get('/api/new-endpoint')
    assert response.status_code == 401
    
    # 2. 测试正常访问
    login_and_get_token()  # 假设的登录函数
    response = client.get('/api/new-endpoint', headers=headers)
    assert response.status_code == 200
    assert response.json['success'] == True
    
    print('✅ API测试通过')
```

---

## 📝 文档维护

**文档版本**: v1.0  
**创建日期**: 2026-02-17  
**最后更新**: 2026-02-17  
**维护周期**: 每周检查一次，重大变更立即更新  
**维护人**: 开发团队

**更新记录**:
| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|---------|--------|
| 2026-02-17 | v1.0 | 初始版本，整合所有开发规范 | AI Assistant |

---

**重要提示**: 本文档为强制执行规范，所有开发人员必须严格遵守。违反规范导致的问题需要负责修复并更新相关文档。