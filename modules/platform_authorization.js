/**
 * 平台授权管理模块 (platform_authorization.js)
 * 功能: 管理电商平台物流授权（菜鸟、京东、拼多多、抖店、淘宝、小红书等）
 * 版本: 1.0.0
 * 对接后端: tenant_platform_auth_api.py
 */

// ===================== 平台授权管理 =====================

/**
 * 初始化平台授权管理页面
 */
async function initPlatformAuthorizationPage() {
    console.log('[PlatformAuth] 初始化平台授权管理页面');
    await loadPlatformFilters();
    await loadPlatformAuthorizations();
}

/**
 * 加载平台筛选选项
 */
async function loadPlatformFilters() {
    const platformFilter = document.getElementById('platformFilter');
    if (!platformFilter) return;
    
    const platforms = [
        { code: 'CAINIAO', name: '菜鸟电子面单' },
        { code: 'JD', name: '京东物流' },
        { code: 'PDD', name: '拼多多' },
        { code: 'DOUYIN', name: '抖店' },
        { code: 'TAOBAO', name: '淘宝' },
        { code: 'XIAOHONGSHU', name: '小红书' }
    ];
    
    platforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform.code;
        option.textContent = platform.name;
        platformFilter.appendChild(option);
    });
}

/**
 * 加载平台授权列表
 */
async function loadPlatformAuthorizations() {
    const container = document.getElementById('platformAuthTableBody');
    if (!container) {
        console.warn('[PlatformAuth] 授权表格容器不存在');
        return;
    }
    
    container.innerHTML = `
        <tr>
            <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
            </td>
        </tr>
    `;
    
    try {
        const platformFilter = document.getElementById('platformFilter')?.value || '';
        const authStatusFilter = document.getElementById('platformAuthStatusFilter')?.value || '';
        
        const params = new URLSearchParams();
        if (platformFilter) params.append('platform_type', platformFilter);
        if (authStatusFilter) params.append('auth_status', authStatusFilter);
        
        const response = await fetch(`/api/tenant/platform_authorizations?${params.toString()}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[PlatformAuth] 授权列表:', result);
        
        if (result.success && result.data) {
            renderPlatformAuthorizations(result.data);
        } else {
            container.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-red-500">
                        ${result.message || '加载失败'}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('[PlatformAuth] 加载授权列表失败:', error);
        
        container.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center">
                    <div class="text-red-500 mb-2">
                        <i class="fas fa-exclamation-circle mr-2"></i>网络错误，请稍后重试
                    </div>
                    <button onclick="loadPlatformAuthorizations()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-redo mr-1"></i>重试
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * 渲染平台授权列表
 */
function renderPlatformAuthorizations(authorizations) {
    const container = document.getElementById('platformAuthTableBody');
    if (!container) return;
    
    if (!authorizations || authorizations.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-box-open text-4xl mb-4 text-gray-300"></i>
                    <p>暂无授权记录，点击右上角"新增授权"开始配置</p>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = authorizations.map(auth => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm text-gray-900">${auth.auth_name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${getPlatformName(auth.platform_type)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${auth.shop_name || '-'}</td>
            <td class="px-4 py-3 text-sm">
                ${auth.auth_status === 1 
                    ? '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✅ 已授权</span>' 
                    : '<span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">❌ 未授权</span>'}
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${auth.auth_time || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${auth.expire_time || '-'}</td>
            <td class="px-4 py-3 text-sm">
                ${auth.is_enabled === 1 
                    ? '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">启用</span>' 
                    : '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">禁用</span>'}
            </td>
            <td class="px-4 py-3 text-sm text-right space-x-2">
                ${auth.auth_status !== 1 ? `
                    <span class="text-gray-400" title="请使用新增授权功能输入accessCode">
                        <i class="fas fa-info-circle"></i> 未授权
                    </span>
                ` : `
                    <button onclick="reauthorizePlatform(${auth.id}, '${auth.platform_type}')" 
                            class="text-green-600 hover:text-green-800" title="重新授权">
                        <i class="fas fa-sync-alt"></i> 重新授权
                    </button>
                `}
                <button onclick="togglePlatformAuthStatus(${auth.id}, ${auth.is_enabled})" 
                        class="text-yellow-600 hover:text-yellow-800" title="${auth.is_enabled === 1 ? '禁用' : '启用'}">
                    <i class="fas fa-power-off"></i>
                </button>
                <button onclick="deletePlatformAuth(${auth.id})" 
                        class="text-red-600 hover:text-red-800" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * 获取平台中文名称
 */
function getPlatformName(platformType) {
    const platformNames = {
        'CAINIAO': '菜鸟电子面单',
        'JD': '京东物流',
        'PDD': '拼多多',
        'DOUYIN': '抖店',
        'TAOBAO': '淘宝',
        'XIAOHONGSHU': '小红书'
    };
    return platformNames[platformType] || platformType;
}

/**
 * 打开新增平台授权模态框
 */
function openAddPlatformAuthModal() {
    const modal = document.getElementById('platformAuthModal');
    if (!modal) {
        console.error('[PlatformAuth] 模态框元素不存在');
        return;
    }
    
    // 重置表单
    document.getElementById('platformAuthForm').reset();
    document.getElementById('platformAuthId').value = '';
    document.getElementById('platformAuthModalTitle').textContent = '新增平台授权';
    document.getElementById('platformDescBox').style.display = 'none';
    
    modal.classList.remove('hidden');
}

/**
 * 关闭平台授权模态框
 */
function closePlatformAuthModal() {
    const modal = document.getElementById('platformAuthModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * 平台类型变化事件 - 显示/隐藏accessCode输入框
 */
function onPlatformTypeChange() {
    const platformType = document.getElementById('platformTypeSelect').value;
    const descBox = document.getElementById('platformDescBox');
    const descText = document.getElementById('platformDescText');
    const accessCodeBox = document.getElementById('accessCodeBox');
    
    if (!platformType) {
        descBox.style.display = 'none';
        if (accessCodeBox) accessCodeBox.style.display = 'none';
        return;
    }
    
    // 菜鸟平台显示accessCode输入框，其他平台显示教程
    if (platformType === 'CAINIAO') {
        descText.textContent = '菜鸟电子面单使用ISV授权模式，点击下方按钮打开授权页面后，复制授权码并粘贴到输入框';
        if (accessCodeBox) accessCodeBox.style.display = 'block';
    } else {
        const platformDescriptions = {
            'JD': '京东物流使用OAuth授权模式，需登录京东开放平台授权',
            'PDD': '拼多多使用OAuth授权模式，需登录拼多多开放平台授权',
            'DOUYIN': '抖店使用OAuth授权模式，需登录抖音开放平台授权',
            'TAOBAO': '淘宝使用OAuth授权模式，需登录淘宝开放平台授权',
            'XIAOHONGSHU': '小红书使用OAuth授权模式，需登录小红书开放平台授权'
        };
        descText.textContent = platformDescriptions[platformType] || '';
        if (accessCodeBox) accessCodeBox.style.display = 'none';
    }
    
    descBox.style.display = 'block';
}

/**
 * 打开菜鸟授权页面（新窗口）
 * 注意：必须使用与后端ISV配置一致的AppKey
 * 流程：1.先创建授权记录 → 2.获取记录ID → 3.把ID传给菜鸟ext参数 → 4.打开授权页面
 */
async function openCainiaoAuthPage() {
    console.log('[PlatformAuth] 打开菜鸟授权页面');
    
    // 获取当前表单信息
    const authName = document.getElementById('platformAuthName').value.trim();
    
    // 校验授权名称
    if (!authName) {
        showNotification('请先输入授权名称', 'warning');
        return;
    }
    
    try {
        // 第一步：先创建授权记录，获取授权ID
        console.log('[PlatformAuth] 步骤1: 创建授权记录...');
        const createResponse = await fetch('/api/tenant/platform_authorizations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            
            body: JSON.stringify({
                auth_name: authName,
                platform_type: 'CAINIAO',
                remark: document.getElementById('platformAuthRemark').value.trim() || ''
            })
        });
        
        const createResult = await createResponse.json();
        console.log('[PlatformAuth] 创建响应:', createResult);
        
        if (!createResult.success || !createResult.data || !createResult.data.id) {
            showNotification(createResult.message || '创建授权记录失败', 'error');
            return;
        }
        
        const authId = createResult.data.id;
        console.log('[PlatformAuth] 授权记录ID:', authId);
        
        // 保存授权ID到表单，以便后续提交accessCode时使用
        document.getElementById('platformAuthId').value = authId;
        
        // 第二步：构建授权链接（将authId放在ext参数中）
        const appKey = '439525';  // 鲜鸟AppKey
        const redirectUrl = encodeURIComponent('http://client.xnamb.cn/auth/callback.html');
        const authUrl = `http://lcp.cloud.cainiao.com/permission/isv/grantpage.do?isvAppKey=${appKey}&ext=${authId}&redirectUrl=${redirectUrl}`;
        
        console.log('[PlatformAuth] 授权链接:', authUrl);
        
        // 第三步：打开菜鸟授权页面
        const authWindow = window.open(
            authUrl,
            'cainiao_auth',
            'width=1000,height=700,left=100,top=50,scrollbars=yes'
        );
        
        if (!authWindow) {
            showNotification('弹窗被拦截，请允许弹窗后重试', 'warning');
            return;
        }
        
        showNotification('已打开菜鸟授权页面，请登录并授权后，复制accessCode回来粘贴', 'info');
        
    } catch (error) {
        console.error('[PlatformAuth] 打开授权页面失败:', error);
        showNotification('打开授权页面失败: ' + error.message, 'error');
    }
}

/**
 * 保存并授权（手动输入accessCode模式）
 */
async function savePlatformAuthAndAuthorize() {
    console.log('[PlatformAuth] 开始保存并授权...');
    
    const authId = document.getElementById('platformAuthId').value;
    const authName = document.getElementById('platformAuthName').value.trim();
    const platformType = document.getElementById('platformTypeSelect').value;
    const remark = document.getElementById('platformAuthRemark').value.trim();
    const accessCode = document.getElementById('platformAccessCode')?.value.trim() || '';
    
    console.log('[PlatformAuth] 表单数据:', { authId, authName, platformType, remark, accessCode });
    
    // 基本校验
    if (!authId) {
        showNotification('请先点击"打开菜鸟授权页面"按钮', 'warning');
        return;
    }
    
    // 菜鸟平台必须填写accessCode
    if (platformType === 'CAINIAO' && !accessCode) {
        showNotification('请输入菜鸟授权码(accessCode)', 'warning');
        document.getElementById('platformAccessCode')?.focus();
        return;
    }
    
    try {
        // 步骤1: 更新授权记录，添加accessCode
        const updateResponse = await fetch(`/api/tenant/platform_authorizations/${authId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_code: accessCode })
        });
        
        const updateResult = await updateResponse.json();
        console.log('[PlatformAuth] 更新响应:', updateResult);
        
        if (!updateResult.success) {
            showNotification(updateResult.message || '更新accessCode失败', 'error');
            return;
        }
        
        // 步骤2: 调用Token换取接口
        console.log('[PlatformAuth] 调用Token换取接口...');
            
            const tokenResponse = await fetch('/api/cainiao_isv/exchange_token', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_code: accessCode,
                    platform_auth_id: authId
                })
            });
            
            const tokenResult = await tokenResponse.json();
            console.log('[PlatformAuth] Token换取结果:', tokenResult);
            
            if (tokenResult.success) {
                showNotification('授权成功！', 'success');
                closePlatformAuthModal();
                loadPlatformAuthorizations();
            } else {
                showNotification('授权失败: ' + (tokenResult.message || '未知错误'), 'error');
            }
        
    } catch (error) {
        console.error('[PlatformAuth] 保存失败:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

/**
 * 执行平台授权（仅用于重新授权，新增时通过保存接口直接处理）
 */
async function authorizePlatform(authId, platformType) {
    console.log('[PlatformAuth] 开始授权流程:', authId, platformType);
    
    if (platformType === 'CAINIAO') {
        // 菜鸟平台重新授权需要打开模态框填写accessCode
        const accessCode = prompt('请输入从菜鸟平台获取的授权码(accessCode):');
        
        if (!accessCode || !accessCode.trim()) {
            showNotification('未输入授权码', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/cainiao_isv/exchange_token', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_code: accessCode.trim(),
                    platform_auth_id: authId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('授权成功！', 'success');
                loadPlatformAuthorizations();
            } else {
                showNotification(result.message || 'Token换取失败', 'error');
            }
        } catch (error) {
            console.error('[PlatformAuth] 授权失败:', error);
            showNotification('网络错误，请稍后重试', 'error');
        }
    } else {
        // 其他平台后续实现
        showNotification(`${getPlatformName(platformType)}授权功能开发中...`, 'info');
    }
}

/**
 * 重新授权
 */
async function reauthorizePlatform(authId, platformType) {
    if (!confirm('确定要重新授权吗？这将使用新的授权信息覆盖现有授权。')) {
        return;
    }
    await authorizePlatform(authId, platformType);
}

/**
 * 切换启用状态
 */
async function togglePlatformAuthStatus(authId, currentStatus) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? '启用' : '禁用';
    
    if (!confirm(`确定要${action}此授权吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tenant/platform_authorizations/${authId}/toggle`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_enabled: newStatus })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`${action}成功`, 'success');
            loadPlatformAuthorizations();
        } else {
            showNotification(result.message || `${action}失败`, 'error');
        }
    } catch (error) {
        console.error('[PlatformAuth] 切换状态失败:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

/**
 * 删除平台授权
 */
async function deletePlatformAuth(authId) {
    if (!confirm('确定要删除此授权吗？删除后无法恢复！')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tenant/platform_authorizations/${authId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('删除成功', 'success');
            loadPlatformAuthorizations();
        } else {
            showNotification(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('[PlatformAuth] 删除失败:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 页面初始化时加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('platformAuthorizationPage')) {
            initPlatformAuthorizationPage();
        }
    });
} else {
    if (document.getElementById('platformAuthorizationPage')) {
        initPlatformAuthorizationPage();
    }
}
