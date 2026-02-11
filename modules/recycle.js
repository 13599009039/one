// 回收站模块

// 初始化回收站页面
function initRecyclePage() {
    renderRecycleList();
}

// 渲染回收站列表
async function renderRecycleList() {
    let services = [];
    let teams = [];
    
    try {
        console.log('📡 调用 API 加载回收站列表...');
        const [servicesResult, teamsResult] = await Promise.all([
            window.api.getRecycleServices(),
            window.api.getTeams()
        ]);
        
        if (servicesResult.success) {
            services = servicesResult.data || [];
            console.log(`✅ API加载回收站: ${services.length}条`);
        }
        if (teamsResult.success) {
            teams = teamsResult.data || [];
        }
    } catch (error) {
        console.warn('❌ API加载失败:', error);
        showToast('加载回收站数据失败', 'error');
        return;
    }
    
    // 创建团队映射
    const teamMap = {};
    teams.forEach(team => {
        teamMap[team.id] = team.name;
    });
    
    const tableBody = document.getElementById('recycleTableBody');
    if (!tableBody) return;
    
    if (services.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-trash-alt text-4xl mb-2 text-gray-300"></i>
                    <p>回收站为空</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = services.map(service => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${service.code || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${service.name || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${getItemTypeBadgeClass(service.item_type)}">
                    ${getItemTypeLabel(service.item_type)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${service.category || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${teamMap[service.team_id] || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ¥${parseFloat(service.retail_price || 0).toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                    已删除
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="restoreService(${service.id})" 
                        class="text-green-600 hover:text-green-900 hover:underline">
                    <i class="fas fa-undo"></i> 恢复
                </button>
                <button onclick="permanentDeleteService(${service.id})" 
                        class="text-red-600 hover:text-red-900 hover:underline ml-2">
                    <i class="fas fa-trash"></i> 永久删除
                </button>
            </td>
        </tr>
    `).join('');
}

// 获取商品类型标签样式
function getItemTypeBadgeClass(type) {
    switch (type) {
        case 'product': return 'bg-blue-100 text-blue-800';
        case 'service': return 'bg-green-100 text-green-800';
        case 'package': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// 获取商品类型标签文本
function getItemTypeLabel(type) {
    switch (type) {
        case 'product': return '商品';
        case 'service': return '服务';
        case 'package': return '服务包';
        default: return '未知';
    }
}

// 恢复商品
window.restoreService = async function(id) {
    if (!confirm('确定要恢复此商品/服务吗？恢复后将重新显示在服务列表中。')) return;
    
    try {
        console.log('📡 调用 API 恢复商品:', id);
        const result = await window.api.restoreService(id);
        
        if (result.success) {
            console.log('✅ 恢复成功');
            showToast('恢复成功', 'success');
            await renderRecycleList();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('❌ 恢复失败:', error);
        showToast(`恢复失败: ${error.message}`, 'error');
    }
};

// 永久删除商品
window.permanentDeleteService = async function(id) {
    if (!confirm('⚠️ 警告：此操作将永久删除该商品/服务，无法恢复！\n\n确定要永久删除吗？')) return;
    
    try {
        console.log('📡 调用 API 永久删除商品:', id);
        const result = await window.api.permanentDeleteService(id);
        
        if (result.success) {
            console.log('✅ 永久删除成功');
            showToast('永久删除成功', 'success');
            await renderRecycleList();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('❌ 永久删除失败:', error);
        showToast(`永久删除失败: ${error.message}`, 'error');
    }
};

// 刷新回收站列表
window.refreshRecycleList = function() {
    renderRecycleList();
};
