# 界面UI基本规范

## 一、HTML页面结构规范

### 1.1 页面容器隔离原则

**【强制】每个功能页面必须有独立的容器，且容器必须正确闭合**

#### 错误示例 ❌

```html
<!-- 发货地址页面 -->
<div id="warehousePage" class="hidden">
    <h1>发货地址管理</h1>
    <table>
        <tbody id="warehousesTableBody">
            <!-- 内容 -->
        </tbody>
    </table>
</div>
<!-- ❌ 错误：这段内容在容器外，会全局显示 -->
<p>暂无打印模板，请点击"新增模板"创建</p>
</div>
```

**问题说明**：
- `<p>暂无打印模板</p>` 在 `</div>` 闭合标签之后
- 该内容不属于任何页面容器，导致在所有页面都显示
- 多余的闭合标签破坏HTML结构

#### 正确示例 ✅

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

### 1.2 页面容器命名规范

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
- `warehousesPage` - 发货地址页面（注意：应为warehousesPage而非warehousePage）

### 1.3 页面隐藏/显示机制

**【强制】使用 `hidden` 类控制页面显示隐藏**

```html
<!-- 默认隐藏 -->
<div id="customersPage" class="hidden fade-in">
    <!-- 页面内容 -->
</div>
```

**JavaScript控制**：
```javascript
// 显示页面
document.getElementById('customersPage').classList.remove('hidden');

// 隐藏页面
document.getElementById('customersPage').classList.add('hidden');
```

### 1.4 HTML标签闭合检查清单

**【强制】每次添加HTML结构后必须检查以下项目**

1. ✅ 每个 `<div>` 都有对应的 `</div>`
2. ✅ 每个 `<table>` 都有对应的 `</table>`
3. ✅ 每个 `<tbody>` 都有对应的 `</tbody>`
4. ✅ 每个 `<tr>` 都有对应的 `</tr>`
5. ✅ 每个 `<td>` 都有对应的 `</td>`
6. ✅ 页面容器的闭合标签后不应有该页面的内容
7. ✅ 不应出现多余的闭合标签

**检查工具**：
```bash
# 检查HTML标签是否配对
grep -o '<div\|</div' file.html | wc -l

# 使用HTML验证工具
npm install -g html-validate
html-validate financial_system.html
```

---

## 二、页面内容归属规范

### 2.1 内容归属原则

**【强制】所有UI元素必须归属于明确的页面容器**

**归属检查表**：

| 元素类型 | 正确归属 | 错误归属 |
|---------|---------|---------|
| 页面标题 | ✅ 在页面容器内 | ❌ 在容器外 |
| 表格数据 | ✅ 在对应页面的tbody内 | ❌ 在其他页面的表格内 |
| 空状态提示 | ✅ 在对应页面容器内 | ❌ 在所有页面都显示 |
| 按钮操作 | ✅ 在对应页面容器内 | ❌ 在全局显示 |
| 模态框 | ✅ 在body根节点下（独立） | ❌ 在页面容器内 |

### 2.2 模态框归属规范

**【推荐】模态框应放在 `<body>` 根节点下，或通过JavaScript动态创建**

```html
<!-- ❌ 错误：模态框在页面容器内 -->
<div id="customersPage" class="hidden">
    <h1>客户管理</h1>
    <div id="addCustomerModal" class="modal">
        <!-- 模态框内容 -->
    </div>
</div>

<!-- ✅ 正确：模态框独立于页面容器 -->
<div id="customersPage" class="hidden">
    <h1>客户管理</h1>
</div>

<!-- 模态框在body根节点下 -->
<div id="addCustomerModal" class="modal hidden">
    <!-- 模态框内容 -->
</div>
```

**或者通过JavaScript动态创建**：
```javascript
function openAddCustomerModal() {
    const modalHTML = `
        <div id="addCustomerModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center px-4 hidden modal" style="z-index: 10000 !important;">
            <!-- 模态框内容 -->
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    openModal('addCustomerModal');
}
```

---

## 三、常见问题与解决方案

### 3.1 问题：内容在所有页面都显示

**症状**：
- 某个页面的提示/按钮/表格在其他页面也显示
- 例如：物流模板的提示在客户页面显示

**根因**：
- 内容的HTML标签在页面容器的闭合标签 `</div>` 之后
- HTML结构错误，标签未正确闭合

**解决方案**：
1. 检查内容所属的页面容器
2. 确保内容在 `<div id="xxxPage">` 和 `</div>` 之间
3. 删除多余的闭合标签

### 3.2 问题：页面切换后内容残留

**症状**：
- 切换到新页面后，旧页面的内容仍然显示

**根因**：
- 页面容器的 `hidden` 类未正确添加/移除
- 多个页面的 `hidden` 类同时被移除

**解决方案**：
```javascript
// 正确的页面切换逻辑
function showPage(pageId) {
    // 1. 隐藏所有页面
    const allPages = ['customersPage', 'ordersPage', 'logisticsPage'];
    allPages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // 2. 显示目标页面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
}
```

### 3.3 问题：模态框在特定页面无法显示

**症状**：
- 模态框在某些页面无法显示或被遮挡

**根因**：
- 模态框的 `z-index` 设置不正确
- 模态框被页面容器的样式影响

**解决方案**：
```html
<!-- 确保模态框有最高的z-index -->
<div id="myModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center px-4 hidden modal" style="z-index: 10000 !important;">
    <!-- 模态框内容 -->
</div>
```

---

## 四、开发流程规范

### 4.1 新增页面流程

**【强制】添加新页面必须按以下步骤操作**

1. **在HTML中添加页面容器**
   ```html
   <div id="newFeaturePage" class="hidden fade-in">
       <div class="mb-8">
           <h1 class="text-3xl font-bold">新功能页面</h1>
       </div>
       <!-- 页面内容 -->
   </div>
   ```

2. **在navigation.js中注册页面ID**
   ```javascript
   const pages = [
       'homePage', 'customersPage', 'ordersPage',
       'newFeaturePage' // 新增页面
   ];
   ```

3. **验证HTML结构**
   - 使用浏览器开发者工具检查HTML结构
   - 确认页面容器正确闭合
   - 确认没有内容溢出到容器外

4. **测试页面切换**
   - 切换到新页面，检查是否正常显示
   - 切换到其他页面，检查新页面内容是否隐藏
   - 检查是否有内容残留或错位

### 4.2 修改现有页面流程

**【强制】修改页面内容必须遵循以下原则**

1. **确认修改范围**
   - 定位要修改内容所属的页面容器ID
   - 确保修改在该容器的 `<div id="xxxPage">` 和 `</div>` 之间

2. **保持结构完整**
   - 不要删除页面容器的闭合标签
   - 不要在闭合标签后添加内容
   - 保持HTML缩进一致

3. **修改后验证**
   - 检查浏览器控制台是否有HTML错误
   - 在所有相关页面进行可视化测试
   - 确认修改只影响目标页面

### 4.3 删除页面流程

**【推荐】删除废弃页面时的注意事项**

1. ✅ 删除整个页面容器（从 `<div id="xxxPage">` 到对应的 `</div>`）
2. ✅ 删除navigation.js中的页面ID注册
3. ✅ 删除相关的JavaScript初始化函数
4. ✅ 删除相关的模态框（如果独立存在）
5. ❌ 不要只删除部分内容，留下空容器或垃圾代码

---

## 五、质量检查工具

### 5.1 HTML结构检查脚本

```bash
#!/bin/bash
# check_html_structure.sh

FILE="financial_system.html"

echo "=== 检查页面容器 ==="
grep -n 'id=".*Page"' $FILE

echo -e "\n=== 检查hidden类使用 ==="
grep -n 'class=".*hidden' $FILE | head -20

echo -e "\n=== 检查可能的结构错误 ==="
# 查找闭合标签后的内容（可能的溢出）
grep -B 2 -A 2 '</div>.*<p\|</div>.*<button\|</div>.*<table' $FILE
```

### 5.2 浏览器开发者工具检查

**【推荐】使用Chrome DevTools检查**

1. **Elements面板**
   - 查看HTML结构树
   - 检查页面容器是否正确嵌套
   - 查找不在任何容器内的元素

2. **Console面板**
   - 查看是否有HTML语法错误
   - 执行命令检查隐藏元素：
     ```javascript
     // 查找所有.hidden元素
     document.querySelectorAll('.hidden')
     
     // 查找所有页面容器
     document.querySelectorAll('[id$="Page"]')
     ```

3. **手动验证**
   - 逐个切换页面
   - 观察每个页面是否只显示该页面的内容
   - 检查是否有内容在所有页面都显示

---

## 六、本次问题复盘

### 6.1 问题描述

**问题现象**：
- 在客户管理页面（customersPage）底部显示"暂无打印模板，请点击'新增模板'创建"
- 该提示属于物流模块的打印模板功能
- 该提示在所有页面都显示

**问题根因**：
```html
<!-- financial_system.html 第2438-2448行 -->
</tbody>
</table>
</div>
</div>
<!-- ❌ 错误：以下内容在页面容器外 -->
<p>暂无打印模板，请点击"新增模板"创建</p>
</td>
</tr>
</tbody>
</table>
</div>
</div>
```

**问题分析**：
1. 第2441行：发货地址页面容器正确闭合
2. 第2442行：**`<p>暂无打印模板</p>` 在容器外**，成为全局元素
3. 第2443-2448行：多余的闭合标签，破坏HTML结构
4. 该提示应属于 `logisticsTemplatesPage`，但该页面在HTML中不存在

### 6.2 修复方案

**步骤1：删除垃圾代码**
```diff
</tbody>
</table>
</div>
</div>
-<p>暂无打印模板，请点击"新增模板"创建</p>
-</td>
-</tr>
-</tbody>
-</table>
-</div>
-</div>

<!-- 系统设置页面 -->
```

**步骤2：验证修复**
- 刷新页面，检查客户管理页面
- 确认"暂无打印模板"提示不再显示
- 检查其他页面是否正常

### 6.3 预防措施

**【强制】今后开发必须遵循以下规则**

1. ✅ **每次提交代码前验证HTML结构**
2. ✅ **使用浏览器开发者工具检查Elements树**
3. ✅ **在所有相关页面进行可视化测试**
4. ✅ **删除废弃代码时删除完整的容器，不留残余**
5. ✅ **模态框内容通过JavaScript动态创建，避免污染HTML**
6. ✅ **定期运行HTML结构检查脚本**

---

## 七、相关文档

- [前端与后端故障标准化诊断流程](../development_practice_specification.md)
- [模态框与组件开发规范](../development_practice_specification.md)
- [物流模块HTML/JS/API三要素同步更新](../common_pitfalls_experience.md)

---

**文档版本**：v1.0  
**最后更新**：2026-02-16  
**维护者**：开发团队  
**问题反馈**：发现类似问题请及时更新本文档
