// 项目管理模块
// 管理公司项目信息，与订单关联

/**
 * 初始化项目页面
 */
function initProjectsPage() {
    loadProjectsData();
}

/**
 * 加载项目列表
 */
async function loadProjectsData() {
    try {
        const response = await fetch('/api/projects', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            renderProjectsTable(result.data || []);
        } else {
            showNotification('加载项目列表失败', 'error');
        }
    } catch (error) {
        console.error('加载项目列表异常:', error);
        showNotification('加载项目列表异常', 'error');
    }
}

/**
 * 渲染项目表格
 */
function renderProjectsTable(projects) {
    const tbody = document.getElementById('projectsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (projects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-project-diagram text-4xl mb-2 opacity-30"></i>
                    <p>暂无项目数据</p>
                    <button onclick="openProjectModal()" class="mt-2 text-blue-600 hover:text-blue-800">
                        <i class="fas fa-plus mr-1"></i>立即添加
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    projects.forEach(project => {
        const statusMap = {
            'planning': { class: 'bg-gray-100 text-gray-800', text: '计划中' },
            'active': { class: 'bg-green-100 text-green-800', text: '进行中' },
            'paused': { class: 'bg-yellow-100 text-yellow-800', text: '暂停' },
            'completed': { class: 'bg-blue-100 text-blue-800', text: '已完成' },
            'cancelled': { class: 'bg-red-100 text-red-800', text: '已取消' }
        };
        const status = statusMap[project.status] || statusMap['planning'];
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900 font-medium">${project.name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${project.code || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${project.manager || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${project.start_date || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${project.end_date || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${project.budget ? '¥' + parseFloat(project.budget).toLocaleString('zh-CN', {minimumFractionDigits: 2}) : '-'}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${status.class}">${status.text}</span>
            </td>
            <td class="px-4 py-3 text-center text-sm">
                <button onclick="editProject(${project.id})" class="text-blue-600 hover:text-blue-900 mr-2" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteProject(${project.id})" class="text-red-600 hover:text-red-900" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * 打开项目模态框（新增）
 */
window.openProjectModal = function() {
    document.getElementById('projectModalTitle').textContent = '新增项目';
    document.getElementById('projectForm').reset();
    document.getElementById('projectId').value = '';
    document.getElementById('projectStatus').value = 'planning';
    document.getElementById('projectModal').classList.remove('hidden');
};

/**
 * 关闭项目模态框
 */
window.closeProjectModal = function() {
    document.getElementById('projectModal').classList.add('hidden');
    document.getElementById('projectForm').reset();
};

/**
 * 编辑项目
 */
window.editProject = async function(id) {
    try {
        const response = await fetch(`/api/projects/${id}`, {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success && result.data) {
            const project = result.data;
            document.getElementById('projectModalTitle').textContent = '编辑项目';
            document.getElementById('projectId').value = project.id;
            document.getElementById('projectName').value = project.name || '';
            document.getElementById('projectCode').value = project.code || '';
            document.getElementById('projectManager').value = project.manager || '';
            document.getElementById('projectBudget').value = project.budget || '';
            document.getElementById('projectStartDate').value = project.start_date || '';
            document.getElementById('projectEndDate').value = project.end_date || '';
            document.getElementById('projectDescription').value = project.description || '';
            document.getElementById('projectStatus').value = project.status || 'planning';
            document.getElementById('projectModal').classList.remove('hidden');
        } else {
            showNotification('获取项目信息失败', 'error');
        }
    } catch (error) {
        console.error('编辑项目异常:', error);
        showNotification('编辑项目异常', 'error');
    }
};

/**
 * 保存项目
 */
window.saveProject = async function(event) {
    event.preventDefault();
    
    const projectId = document.getElementById('projectId').value;
    const projectData = {
        name: document.getElementById('projectName').value.trim(),
        code: document.getElementById('projectCode').value.trim(),
        manager: document.getElementById('projectManager').value.trim(),
        budget: document.getElementById('projectBudget').value || 0,
        start_date: document.getElementById('projectStartDate').value,
        end_date: document.getElementById('projectEndDate').value,
        description: document.getElementById('projectDescription').value.trim(),
        status: document.getElementById('projectStatus').value
    };
    
    if (!projectData.name) {
        showNotification('请输入项目名称', 'error');
        return;
    }
    
    try {
        let response, result;
        if (projectId) {
            // 更新
            response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(projectData)
            });
        } else {
            // 新增
            response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(projectData)
            });
        }
        
        result = await response.json();
        if (result.success) {
            showNotification(projectId ? '项目更新成功' : '项目创建成功', 'success');
            closeProjectModal();
            loadProjectsData();
        } else {
            showNotification(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存项目异常:', error);
        showNotification('保存项目异常', 'error');
    }
};

/**
 * 删除项目
 */
window.deleteProject = async function(id) {
    if (!confirm('确定要删除此项目吗？删除后无法恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            showNotification('项目删除成功', 'success');
            loadProjectsData();
        } else {
            showNotification(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除项目异常:', error);
        showNotification('删除项目异常', 'error');
    }
};

// 监听页面切换事件
document.addEventListener('DOMContentLoaded', function() {
    // 页面切换时初始化
    const observer = new MutationObserver(function(mutations) {
        const projectPage = document.getElementById('projectPage');
        if (projectPage && !projectPage.classList.contains('hidden')) {
            initProjectsPage();
            observer.disconnect();
        }
    });
    
    const projectPage = document.getElementById('projectPage');
    if (projectPage) {
        observer.observe(projectPage, { attributes: true, attributeFilter: ['class'] });
    }
});
