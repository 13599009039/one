// 区域管理模块
// 管理公司区域信息

/**
 * 初始化区域页面
 */
function initAreasPage() {
    loadAreasData();
}

/**
 * 加载区域列表
 */
async function loadAreasData() {
    try {
        const result = await window.api.getAreas();
        if (result.success) {
            renderAreasTable(result.data || []);
        } else {
            showNotification('加载区域列表失败', 'error');
        }
    } catch (error) {
        console.error('加载区域列表异常:', error);
        showNotification('加载区域列表异常', 'error');
    }
}

/**
 * 渲染区域表格
 */
function renderAreasTable(areas) {
    const tbody = document.getElementById('areasTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (areas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-map-marked-alt text-4xl mb-2 opacity-30"></i>
                    <p>暂无区域数据</p>
                    <button onclick="openAreaModal()" class="mt-2 text-blue-600 hover:text-blue-800">
                        <i class="fas fa-plus mr-1"></i>立即添加
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    areas.forEach(area => {
        const statusClass = area.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
        const statusText = area.status === 'active' ? '正常' : '停用';
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${area.name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${area.code || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${area.manager || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${area.phone || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${area.remark || '-'}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${statusText}</span>
            </td>
            <td class="px-4 py-3 text-center text-sm">
                <button onclick="editArea(${area.id})" class="text-blue-600 hover:text-blue-900 mr-2" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteArea(${area.id})" class="text-red-600 hover:text-red-900" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * 打开区域模态框（新增）
 */
window.openAreaModal = function() {
    document.getElementById('areaModalTitle').textContent = '新增区域';
    document.getElementById('areaForm').reset();
    document.getElementById('areaId').value = '';
    document.getElementById('areaStatus').value = 'active';
    document.getElementById('areaModal').classList.remove('hidden');
};

/**
 * 关闭区域模态框
 */
window.closeAreaModal = function() {
    document.getElementById('areaModal').classList.add('hidden');
    document.getElementById('areaForm').reset();
};

/**
 * 编辑区域
 */
window.editArea = async function(id) {
    try {
        const result = await window.api.getArea(id);
        if (result.success && result.data) {
            const area = result.data;
            document.getElementById('areaModalTitle').textContent = '编辑区域';
            document.getElementById('areaId').value = area.id;
            document.getElementById('areaName').value = area.name || '';
            document.getElementById('areaCode').value = area.code || '';
            document.getElementById('areaManager').value = area.manager || '';
            document.getElementById('areaPhone').value = area.phone || '';
            document.getElementById('areaRemark').value = area.remark || '';
            document.getElementById('areaStatus').value = area.status || 'active';
            document.getElementById('areaModal').classList.remove('hidden');
        } else {
            showNotification('获取区域信息失败', 'error');
        }
    } catch (error) {
        console.error('编辑区域异常:', error);
        showNotification('编辑区域异常', 'error');
    }
};

/**
 * 保存区域
 */
window.saveArea = async function(event) {
    event.preventDefault();
    
    const areaId = document.getElementById('areaId').value;
    const areaData = {
        name: document.getElementById('areaName').value.trim(),
        code: document.getElementById('areaCode').value.trim(),
        manager: document.getElementById('areaManager').value.trim(),
        phone: document.getElementById('areaPhone').value.trim(),
        remark: document.getElementById('areaRemark').value.trim(),
        status: document.getElementById('areaStatus').value
    };
    
    if (!areaData.name) {
        showNotification('请输入区域名称', 'error');
        return;
    }
    
    try {
        let result;
        if (areaId) {
            // 更新
            result = await window.api.updateArea(areaId, areaData);
        } else {
            // 新增
            result = await window.api.addArea(areaData);
        }
        
        if (result.success) {
            showNotification(areaId ? '区域更新成功' : '区域创建成功', 'success');
            closeAreaModal();
            loadAreasData();
        } else {
            showNotification(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存区域异常:', error);
        showNotification('保存区域异常', 'error');
    }
};

/**
 * 删除区域
 */
window.deleteArea = async function(id) {
    if (!confirm('确定要删除此区域吗？删除后无法恢复。')) {
        return;
    }
    
    try {
        const result = await window.api.deleteArea(id);
        if (result.success) {
            showNotification('区域删除成功', 'success');
            loadAreasData();
        } else {
            showNotification(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除区域异常:', error);
        showNotification('删除区域异常', 'error');
    }
};

// 监听页面切换事件
document.addEventListener('DOMContentLoaded', function() {
    // 页面切换时初始化
    const observer = new MutationObserver(function(mutations) {
        const areaPage = document.getElementById('areaPage');
        if (areaPage && !areaPage.classList.contains('hidden')) {
            initAreasPage();
            observer.disconnect();
        }
    });
    
    const areaPage = document.getElementById('areaPage');
    if (areaPage) {
        observer.observe(areaPage, { attributes: true, attributeFilter: ['class'] });
    }
});
