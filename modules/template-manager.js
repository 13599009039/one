// 商品属性模板管理模块 (v17.5)

let currentEditTemplateId = null;
let currentEditFieldId = null;
let currentTemplateForFields = null; // 当前查看字段的模板

// 初始化模板管理页面
function initProductTemplates() {
    loadTemplatesList();
}

// ==================== 模板管理 ====================

// 加载模板列表
async function loadTemplatesList() {
    try {
        const result = await window.api.getProductTemplates();
        
        if (result.success) {
            const templates = result.data || [];
            renderTemplatesList(templates);
        } else {
            console.error('加载模板列表失败:', result.message);
            showToast('加载模板列表失败', 'error');
        }
    } catch (error) {
        console.error('加载模板列表异常:', error);
        showToast('加载模板列表异常', 'error');
    }
}

// 渲染模板列表
async function renderTemplatesList(templates) {
    const tbody = document.getElementById('templatesTableBody');
    
    if (!templates || templates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">暂无模板数据</td></tr>';
        return;
    }
    
    // 获取每个模板的字段数量
    const templatesWithFieldCount = await Promise.all(
        templates.map(async (template) => {
            try {
                const fieldsResult = await window.api.getTemplateFields(template.id);
                const fieldCount = fieldsResult.success ? (fieldsResult.data || []).length : 0;
                return { ...template, fieldCount };
            } catch (error) {
                return { ...template, fieldCount: 0 };
            }
        })
    );
    
    tbody.innerHTML = templatesWithFieldCount.map(template => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${template.type_name}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${template.type_code || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${template.description || '-'}</td>
            <td class="px-4 py-3 text-sm text-center text-gray-700">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${template.fieldCount} 个字段
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-center text-gray-500">${template.sort_order || 0}</td>
            <td class="px-4 py-3 text-sm text-center">
                <button onclick="viewTemplateFields(${template.id}, '${template.type_name}')" 
                        class="text-indigo-600 hover:text-indigo-900 mr-3" title="查看字段">
                    <i class="fas fa-list"></i>
                </button>
                <button onclick="editTemplate(${template.id})" 
                        class="text-blue-600 hover:text-blue-900 mr-3" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTemplate(${template.id})" 
                        class="text-red-600 hover:text-red-900" title="删除">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// 打开模板模态框（新增或编辑）
function openTemplateModal(templateId = null) {
    currentEditTemplateId = templateId;
    
    const modalHTML = `
        <div id="templateModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium">${templateId ? '编辑模板' : '新增模板'}</h3>
                    <button onclick="closeTemplateModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            类型名称 <span class="text-red-500">*</span>
                        </label>
                        <input type="text" id="templateName" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                               placeholder="如：电子设备、食品类">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            类型编码 <span class="text-red-500">*</span>
                        </label>
                        <input type="text" id="templateCode" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                               placeholder="如：electronics、food"
                               ${templateId ? 'readonly' : ''}>
                        ${templateId ? '<p class="text-xs text-gray-500 mt-1">编码不可修改</p>' : ''}
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <textarea id="templateDescription" rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  placeholder="模板用途说明..."></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">排序</label>
                        <input type="number" id="templateSortOrder" value="0"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                <div class="flex justify-end space-x-2 mt-6">
                    <button onclick="closeTemplateModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                        取消
                    </button>
                    <button onclick="saveTemplate()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 如果是编辑，加载数据
    if (templateId) {
        loadTemplateData(templateId);
    }
}

// 加载模板数据（编辑时）
async function loadTemplateData(templateId) {
    try {
        const result = await window.api.getProductTemplates();
        if (result.success) {
            const template = result.data.find(t => t.id === templateId);
            if (template) {
                document.getElementById('templateName').value = template.type_name;
                document.getElementById('templateCode').value = template.type_code || '';
                document.getElementById('templateDescription').value = template.description || '';
                document.getElementById('templateSortOrder').value = template.sort_order || 0;
            }
        }
    } catch (error) {
        console.error('加载模板数据失败:', error);
    }
}

// 关闭模板模态框
function closeTemplateModal() {
    const modal = document.getElementById('templateModal');
    if (modal) {
        modal.remove();
    }
    currentEditTemplateId = null;
}

// 保存模板
async function saveTemplate() {
    const name = document.getElementById('templateName').value.trim();
    const code = document.getElementById('templateCode').value.trim();
    const description = document.getElementById('templateDescription').value.trim();
    const sortOrder = document.getElementById('templateSortOrder').value;
    
    if (!name) {
        showToast('请输入类型名称', 'warning');
        return;
    }
    
    if (!code) {
        showToast('请输入类型编码', 'warning');
        return;
    }
    
    const data = {
        type_name: name,
        type_code: code,
        description: description,
        sort_order: parseInt(sortOrder) || 0
    };
    
    try {
        let result;
        if (currentEditTemplateId) {
            // 更新
            result = await window.api.updateProductTemplate(currentEditTemplateId, data);
        } else {
            // 新增
            result = await window.api.addProductTemplate(data);
        }
        
        if (result.success) {
            showToast(currentEditTemplateId ? '模板更新成功' : '模板创建成功', 'success');
            closeTemplateModal();
            loadTemplatesList();
        } else {
            showToast(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存模板失败:', error);
        showToast('保存模板失败', 'error');
    }
}

// 编辑模板
function editTemplate(templateId) {
    openTemplateModal(templateId);
}

// 删除模板
async function deleteTemplate(templateId) {
    if (!confirm('确定要删除此模板吗？删除后相关字段配置也将失效。')) {
        return;
    }
    
    try {
        const result = await window.api.deleteProductTemplate(templateId);
        if (result.success) {
            showToast('模板删除成功', 'success');
            loadTemplatesList();
        } else {
            showToast(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除模板失败:', error);
        showToast('删除模板失败', 'error');
    }
}

// ==================== 字段管理 ====================

// 查看模板字段
async function viewTemplateFields(templateId, templateName) {
    currentTemplateForFields = templateId;
    
    try {
        const result = await window.api.getTemplateFields(templateId);
        const fields = result.success ? (result.data || []) : [];
        
        const modalHTML = `
            <div id="fieldsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div class="relative top-10 mx-auto p-5 border w-5/6 max-w-5xl shadow-lg rounded-md bg-white">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium">${templateName} - 字段管理</h3>
                        <button onclick="closeFieldsModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-4">
                        <button onclick="openFieldModal()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                            <i class="fas fa-plus mr-2"></i>新增字段
                        </button>
                    </div>
                    
                    <div class="bg-white shadow rounded-lg overflow-hidden">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">字段名称</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">字段标签</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">字段类型</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">必填</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">默认值</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">排序</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                                </tr>
                            </thead>
                            <tbody id="fieldsTableBody" class="bg-white divide-y divide-gray-200">
                                ${renderFieldsTableRows(fields)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('加载字段列表失败:', error);
        showToast('加载字段列表失败', 'error');
    }
}

// 渲染字段表格行
function renderFieldsTableRows(fields) {
    if (!fields || fields.length === 0) {
        return '<tr><td colspan="7" class="text-center py-8 text-gray-500">暂无字段配置</td></tr>';
    }
    
    const fieldTypeMap = {
        'text': '文本',
        'number': '数字',
        'date': '日期',
        'select': '下拉选择',
        'textarea': '多行文本'
    };
    
    return fields.map(field => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm text-gray-900">${field.field_name}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${field.field_label}</td>
            <td class="px-4 py-3 text-sm text-gray-500">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    ${fieldTypeMap[field.field_type] || field.field_type}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-center">
                ${field.is_required ? '<span class="text-red-600"><i class="fas fa-check"></i></span>' : '-'}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">${field.default_value || '-'}</td>
            <td class="px-4 py-3 text-sm text-center text-gray-500">${field.sort_order || 0}</td>
            <td class="px-4 py-3 text-sm text-center">
                <button onclick="editField(${field.id})" class="text-blue-600 hover:text-blue-900 mr-3" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteField(${field.id})" class="text-red-600 hover:text-red-900" title="删除">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// 关闭字段列表模态框
function closeFieldsModal() {
    const modal = document.getElementById('fieldsModal');
    if (modal) {
        modal.remove();
    }
    currentTemplateForFields = null;
}

// 打开字段编辑模态框
function openFieldModal(fieldId = null) {
    currentEditFieldId = fieldId;
    
    const modalHTML = `
        <div id="fieldModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
            <div class="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium">${fieldId ? '编辑字段' : '新增字段'}</h3>
                    <button onclick="closeFieldModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                字段名称 <span class="text-red-500">*</span>
                            </label>
                            <input type="text" id="fieldName" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                   placeholder="如：shelf_life"
                                   ${fieldId ? 'readonly' : ''}>
                            ${fieldId ? '<p class="text-xs text-gray-500 mt-1">字段名不可修改</p>' : ''}
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                字段标签 <span class="text-red-500">*</span>
                            </label>
                            <input type="text" id="fieldLabel" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                   placeholder="如：保质期">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                字段类型 <span class="text-red-500">*</span>
                            </label>
                            <select id="fieldType" onchange="toggleFieldOptions()" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                                <option value="text">文本</option>
                                <option value="number">数字</option>
                                <option value="date">日期</option>
                                <option value="select">下拉选择</option>
                                <option value="textarea">多行文本</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">是否必填</label>
                            <select id="fieldRequired" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                                <option value="0">否</option>
                                <option value="1">是</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="fieldOptionsGroup" class="hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            下拉选项 <span class="text-gray-500 text-xs">(每行一个选项)</span>
                        </label>
                        <textarea id="fieldOptions" rows="4"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  placeholder="选项1\n选项2\n选项3"></textarea>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">默认值</label>
                            <input type="text" id="fieldDefaultValue" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">排序</label>
                            <input type="number" id="fieldSortOrder" value="0"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">占位符</label>
                        <input type="text" id="fieldPlaceholder" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                               placeholder="输入提示文字">
                    </div>
                </div>
                <div class="flex justify-end space-x-2 mt-6">
                    <button onclick="closeFieldModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                        取消
                    </button>
                    <button onclick="saveField()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 如果是编辑，加载数据
    if (fieldId) {
        loadFieldData(fieldId);
    }
}

// 切换字段选项显示
function toggleFieldOptions() {
    const fieldType = document.getElementById('fieldType').value;
    const optionsGroup = document.getElementById('fieldOptionsGroup');
    
    if (fieldType === 'select') {
        optionsGroup.classList.remove('hidden');
    } else {
        optionsGroup.classList.add('hidden');
    }
}

// 加载字段数据（编辑时）
async function loadFieldData(fieldId) {
    try {
        const result = await window.api.getTemplateFields(currentTemplateForFields);
        if (result.success) {
            const field = result.data.find(f => f.id === fieldId);
            if (field) {
                document.getElementById('fieldName').value = field.field_name;
                document.getElementById('fieldLabel').value = field.field_label;
                document.getElementById('fieldType').value = field.field_type;
                document.getElementById('fieldRequired').value = field.is_required ? '1' : '0';
                document.getElementById('fieldDefaultValue').value = field.default_value || '';
                document.getElementById('fieldSortOrder').value = field.sort_order || 0;
                document.getElementById('fieldPlaceholder').value = field.placeholder || '';
                
                // 处理选项
                if (field.field_type === 'select' && field.field_options) {
                    try {
                        const options = JSON.parse(field.field_options);
                        document.getElementById('fieldOptions').value = options.join('\n');
                    } catch (e) {
                        document.getElementById('fieldOptions').value = field.field_options;
                    }
                }
                
                toggleFieldOptions();
            }
        }
    } catch (error) {
        console.error('加载字段数据失败:', error);
    }
}

// 关闭字段编辑模态框
function closeFieldModal() {
    const modal = document.getElementById('fieldModal');
    if (modal) {
        modal.remove();
    }
    currentEditFieldId = null;
}

// 保存字段
async function saveField() {
    const fieldName = document.getElementById('fieldName').value.trim();
    const fieldLabel = document.getElementById('fieldLabel').value.trim();
    const fieldType = document.getElementById('fieldType').value;
    const isRequired = document.getElementById('fieldRequired').value;
    const defaultValue = document.getElementById('fieldDefaultValue').value.trim();
    const sortOrder = document.getElementById('fieldSortOrder').value;
    const placeholder = document.getElementById('fieldPlaceholder').value.trim();
    
    if (!fieldName) {
        showToast('请输入字段名称', 'warning');
        return;
    }
    
    if (!fieldLabel) {
        showToast('请输入字段标签', 'warning');
        return;
    }
    
    // 处理选项
    let fieldOptions = null;
    if (fieldType === 'select') {
        const optionsText = document.getElementById('fieldOptions').value.trim();
        if (!optionsText) {
            showToast('下拉选择类型必须配置选项', 'warning');
            return;
        }
        fieldOptions = optionsText.split('\n').filter(opt => opt.trim());
    }
    
    const data = {
        template_id: currentTemplateForFields,
        field_name: fieldName,
        field_label: fieldLabel,
        field_type: fieldType,
        field_options: fieldOptions,
        is_required: parseInt(isRequired),
        default_value: defaultValue,
        placeholder: placeholder,
        sort_order: parseInt(sortOrder) || 0
    };
    
    try {
        let result;
        if (currentEditFieldId) {
            // 更新
            result = await window.api.updateProductField(currentEditFieldId, data);
        } else {
            // 新增
            result = await window.api.addProductField(data);
        }
        
        if (result.success) {
            showToast(currentEditFieldId ? '字段更新成功' : '字段创建成功', 'success');
            closeFieldModal();
            
            // 重新加载字段列表
            const fieldsResult = await window.api.getTemplateFields(currentTemplateForFields);
            const fields = fieldsResult.success ? (fieldsResult.data || []) : [];
            document.getElementById('fieldsTableBody').innerHTML = renderFieldsTableRows(fields);
        } else {
            showToast(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存字段失败:', error);
        showToast('保存字段失败', 'error');
    }
}

// 编辑字段
function editField(fieldId) {
    openFieldModal(fieldId);
}

// 删除字段
async function deleteField(fieldId) {
    if (!confirm('确定要删除此字段吗？已关联的商品数据将保留但字段不再显示。')) {
        return;
    }
    
    try {
        const result = await window.api.deleteProductField(fieldId);
        if (result.success) {
            showToast('字段删除成功', 'success');
            
            // 重新加载字段列表
            const fieldsResult = await window.api.getTemplateFields(currentTemplateForFields);
            const fields = fieldsResult.success ? (fieldsResult.data || []) : [];
            document.getElementById('fieldsTableBody').innerHTML = renderFieldsTableRows(fields);
        } else {
            showToast(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除字段失败:', error);
        showToast('删除字段失败', 'error');
    }
}

// ==================== 导出函数 ====================

window.initProductTemplates = initProductTemplates;
window.openTemplateModal = openTemplateModal;
window.closeTemplateModal = closeTemplateModal;
window.saveTemplate = saveTemplate;
window.editTemplate = editTemplate;
window.deleteTemplate = deleteTemplate;
window.viewTemplateFields = viewTemplateFields;
window.closeFieldsModal = closeFieldsModal;
window.openFieldModal = openFieldModal;
window.closeFieldModal = closeFieldModal;
window.saveField = saveField;
window.editField = editField;
window.deleteField = deleteField;
window.toggleFieldOptions = toggleFieldOptions;
