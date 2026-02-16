// 导航模块 - v2.0 顶部子菜单模式

// 子菜单配置（一级菜单对应的子菜单列表）
const subMenuConfig = {
    products: {
        title: '商品',
        items: [
            { id: 'products', icon: 'fa-cubes', name: '商品列表' },
            { id: 'productTemplates', icon: 'fa-cogs', name: '商品属性' },
            { id: 'suppliers', icon: 'fa-truck', name: '供应商管理' },
            { id: 'purchases', icon: 'fa-file-invoice', name: '采购单管理' },
            { id: 'inventory', icon: 'fa-boxes', name: '库存管理' }
        ]
    },
    services: {
        title: '服务',
        items: [
            { id: 'services', icon: 'fa-list-ul', name: '服务列表' },
            { id: 'servicePackages', icon: 'fa-layer-group', name: '服务包管理' },
            { id: 'recycle', icon: 'fa-trash-restore', name: '回收站' }
        ]
    },
    finance: {
        title: '财务',
        items: [
            { id: 'transactions', icon: 'fa-exchange-alt', name: '流水记录' },
            { id: 'reports', icon: 'fa-file-alt', name: '财务报表' },
            { id: 'accountConfig', icon: 'fa-university', name: '账户设置' },
            { id: 'costConfig', icon: 'fa-calculator', name: '业务成本设置' }
        ]
    },
    organization: {
        title: '组织',
        items: [
            { id: 'personnel', icon: 'fa-user-tie', name: '员工管理' },
            { id: 'department', icon: 'fa-building', name: '部门管理' },
            { id: 'team', icon: 'fa-user-friends', name: '团队管理' },
            { id: 'position', icon: 'fa-id-badge', name: '岗位管理' },
            { id: 'area', icon: 'fa-map-marked-alt', name: '区域管理' },
            { id: 'project', icon: 'fa-project-diagram', name: '项目管理' }
        ]
    },
    system: {
        title: '系统',
        items: [
            { id: 'basicConfig', icon: 'fa-sliders-h', name: '系统设置' },
            { id: 'categoryConfig', icon: 'fa-tags', name: '类别设置' },
            { id: 'backupConfig', icon: 'fa-database', name: '数据备份' }
        ]
    },
    logistics: {
        title: '物流',
        items: [
            { id: 'logisticsOrders', icon: 'fa-shipping-fast', name: '物流订单列表' },
            { id: 'logisticsConfig', icon: 'fa-cogs', name: '物流配置管理' },
            { id: 'logisticsTemplates', icon: 'fa-print', name: '面单打印模板' }
        ]
    }
};

// 当前活动的模块
let currentModule = null;
let currentSubPage = null;

// 导航初始化
function initNavigation() {
    console.log('[Navigation] 🚀 初始化导航模块 v2.0...');
    
    // 应用菜单权限控制
    if (window.PermissionManager && window.PermissionManager.initialized) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            window.PermissionManager.applyPermissionsToMenu(sidebar);
            console.log('[Navigation] ✅ 已应用菜单权限控制');
        }
    }
    
    // 一级菜单链接（无子菜单）
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const target = this.getAttribute('href')?.substring(1);
            if (!target) return;
            
            // 清除所有活动状态
            clearAllActiveStates();
            
            // 添加当前活动状态
            this.classList.add('active');
            
            // 隐藏顶部子菜单
            hideTopSubMenu();
            
            // 显示对应页面
            showPage(target);
            
            // 更新标题
            const pageName = this.querySelector('span')?.innerText || this.innerText.trim();
            updatePageTitle(pageName);
            
            currentModule = null;
            currentSubPage = target;
        });
    });
    
    // 一级菜单（有子菜单）- nav-parent
    const navParents = document.querySelectorAll('.nav-parent');
    navParents.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const module = this.getAttribute('data-module');
            if (!module || !subMenuConfig[module]) return;
            
            // 清除所有活动状态
            clearAllActiveStates();
            
            // 添加当前活动状态（一级菜单高亮）
            this.classList.add('parent-active');
            
            // 显示顶部子菜单
            showTopSubMenu(module);
            
            // 默认显示第一个子页面
            const firstSubPage = subMenuConfig[module].items[0];
            if (firstSubPage) {
                showPage(firstSubPage.id);
                updatePageTitle(firstSubPage.name);
                
                // 高亮第一个子菜单项
                setTimeout(() => {
                    const firstItem = document.querySelector(`#topSubMenuContainer [data-page="${firstSubPage.id}"]`);
                    if (firstItem) firstItem.classList.add('active');
                }, 10);
            }
            
            currentModule = module;
            currentSubPage = firstSubPage?.id;
        });
    });

    // 侧边栏折叠逻辑
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            if (sidebar.classList.contains('sidebar-expanded')) {
                sidebar.classList.remove('sidebar-expanded');
                sidebar.classList.add('sidebar-collapsed');
                if (toggleIcon) {
                    toggleIcon.classList.remove('fa-chevron-left');
                    toggleIcon.classList.add('fa-chevron-right');
                }
            } else {
                sidebar.classList.remove('sidebar-collapsed');
                sidebar.classList.add('sidebar-expanded');
                if (toggleIcon) {
                    toggleIcon.classList.remove('fa-chevron-right');
                    toggleIcon.classList.add('fa-chevron-left');
                }
            }
        });
    }
    
    console.log('[Navigation] ✅ 导航模块初始化完成');
}

// 清除所有活动状态
function clearAllActiveStates() {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-parent').forEach(l => l.classList.remove('parent-active'));
    document.querySelectorAll('.top-submenu-item').forEach(l => l.classList.remove('active'));
}

// 显示顶部子菜单
function showTopSubMenu(module) {
    const topSubMenu = document.getElementById('topSubMenu');
    const container = document.getElementById('topSubMenuContainer');
    
    if (!topSubMenu || !container || !subMenuConfig[module]) return;
    
    // 生成子菜单HTML
    const items = subMenuConfig[module].items;
    container.innerHTML = items.map(item => `
        <a href="javascript:void(0)" class="top-submenu-item" data-page="${item.id}" data-module="${module}">
            <i class="fas ${item.icon}"></i>
            <span>${item.name}</span>
        </a>
    `).join('');
    
    // 显示子菜单
    topSubMenu.classList.add('active');
    
    // 绑定子菜单点击事件
    container.querySelectorAll('.top-submenu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const pageId = this.getAttribute('data-page');
            const module = this.getAttribute('data-module');
            
            // 更新子菜单高亮
            container.querySelectorAll('.top-submenu-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // 显示页面
            showPage(pageId);
            
            // 更新标题
            const pageName = this.querySelector('span')?.innerText || this.innerText.trim();
            updatePageTitle(pageName);
            
            currentSubPage = pageId;
        });
    });
}

// 隐藏顶部子菜单
function hideTopSubMenu() {
    const topSubMenu = document.getElementById('topSubMenu');
    if (topSubMenu) {
        topSubMenu.classList.remove('active');
    }
}

// 更新页面标题
function updatePageTitle(title) {
    const titleEl = document.getElementById('currentPageTitle');
    if (titleEl) titleEl.innerText = title;
}

// 显示指定页面
function showPage(pageId) {
    // 所有页面ID列表（完整ID，不需要拼接Page后缀）
    const pages = [
        'homePage', 'dashboardPage', 'customersPage', 'ordersPage', 'orderRecyclePage', 'transactionsPage', 'reportsPage',
        // 商品管理（独立页面）
        'productsPage', 'productTemplates', 'suppliersPage', 'purchasesPage', 'inventoryPage',
        // 服务管理（独立页面）
        'servicesPage', 'servicePackagesPage', 'recyclePage',
        // 组织架构（独立页面）
        'personnelPage', 'departmentPage', 'teamPage', 'positionPage', 'areaPage', 'projectPage',
        // 系统配置（独立页面）
        'basicConfigPage', 'accountConfigPage', 'categoryConfigPage', 'backupConfigPage',
        // 任务池
        'taskPoolPage',
        // 业务成本设置
        'costConfigPage',
        // 物流管理（新增）
        'logisticsOrdersPage', 'logisticsConfigPage', 'logisticsTemplatesPage',
        // 旧设置页（兼容）
        'settingsPage'
    ];
    
    // 隐藏所有页面
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // 显示目标页面 - 如果pageId已包含Page后缀，直接使用；否则拼接
    let targetPageId = pageId.endsWith('Page') ? pageId : pageId + 'Page';
    
    // 特殊处理：某些页面ID不带Page后缀
    const specialPages = ['productTemplates'];
    if (specialPages.includes(pageId)) {
        targetPageId = pageId;
    }
    
    const pageEl = document.getElementById(targetPageId);
    if (pageEl) {
        pageEl.classList.remove('hidden');
    } else {
        console.warn(`页面元素未找到: ${targetPageId}`);
    }
    
    // 页面初始化逻辑
    switch(pageId) {
        case 'home':
            // 首页不需要初始化
            break;
        case 'dashboard':
            if (typeof initAnalyticsPage === 'function') initAnalyticsPage();
            break;
        case 'customers':
            if (typeof initCustomersPage === 'function') initCustomersPage();
            break;
        case 'orders':
            if (typeof initOrdersPage === 'function') initOrdersPage();
            break;
        case 'orderRecycle':
            if (typeof loadRecycleOrders === 'function') loadRecycleOrders();
            break;
        case 'taskPool':
            if (typeof TaskPoolModule !== 'undefined' && TaskPoolModule.init) {
                const currentUserId = window.currentUser?.id || 1;
                TaskPoolModule.init(currentUserId);
            }
            break;
        case 'transactions':
            if (typeof initTransactionsPage === 'function') initTransactionsPage();
            if (typeof loadTransactionData === 'function') loadTransactionData();
            break;
        case 'reports':
            if (typeof initReportsPage === 'function') initReportsPage();
            break;
        // 商品管理（独立页面）
        case 'products':
            if (typeof initProductsPage === 'function') initProductsPage();
            break;
        case 'productTemplates':
            if (typeof initProductTemplates === 'function') initProductTemplates();
            break;
        // 服务管理（独立页面）
        case 'services':
            if (typeof initServicesPage === 'function') initServicesPage();
            break;
        case 'servicePackages':
            if (typeof initServicePackagesPage === 'function') initServicePackagesPage();
            break;
        case 'recycle':
            if (typeof initRecyclePage === 'function') initRecyclePage();
            break;
        // 进销存管理
        case 'suppliers':
            if (typeof initSuppliersPage === 'function') initSuppliersPage();
            break;
        case 'purchases':
            if (typeof initPurchasesPage === 'function') initPurchasesPage();
            break;
        case 'inventory':
            if (typeof initInventoryPage === 'function') initInventoryPage();
            break;
        // 组织架构 - 独立页面
        case 'personnel':
            if (typeof initPersonnelPage === 'function') initPersonnelPage();
            break;
        case 'department':
            if (typeof initDepartmentPage === 'function') initDepartmentPage();
            break;
        case 'team':
            if (typeof initTeamPage === 'function') initTeamPage();
            break;
        case 'position':
            if (typeof initPositionPage === 'function') initPositionPage();
            break;
        case 'area':
            if (typeof initAreaPage === 'function') initAreaPage();
            break;
        case 'project':
            if (typeof initProjectsPage === 'function') initProjectsPage();
            break;
        // 系统配置 - 独立页面
        case 'basicConfig':
            if (typeof loadBasicConfigPage === 'function') loadBasicConfigPage();
            break;
        case 'accountConfig':
            if (typeof initAccountConfigPage === 'function') initAccountConfigPage();
            break;
        case 'categoryConfig':
            if (typeof initCategoryConfigPage === 'function') initCategoryConfigPage();
            break;
        case 'backupConfig':
            if (typeof initBackupConfigPage === 'function') initBackupConfigPage();
            break;
        // 业务成本设置
        case 'costConfig':
            if (typeof initCostConfigPage === 'function') initCostConfigPage();
            break;
        // 物流管理 - 独立页面
        case 'logisticsOrders':
            if (typeof initLogisticsOrdersPage === 'function') initLogisticsOrdersPage();
            break;
        case 'logisticsConfig':
            if (typeof initLogisticsConfigPage === 'function') initLogisticsConfigPage();
            break;
        case 'logisticsTemplates':
            if (typeof initLogisticsTemplatesPage === 'function') initLogisticsTemplatesPage();
            break;
        // 旧设置页（兼容）
        case 'settings':
            initSettingsPage();
            break;
    }
}

// 设置页面初始化
function initSettingsPage() {
    const settingsPage = document.getElementById('settingsPage');
    if (!settingsPage) return;
    
    settingsPage.classList.remove('hidden');
    
    const basicSettings = document.getElementById('basicSettings');
    if (basicSettings) {
        document.querySelectorAll('.settings-content').forEach(content => {
            content.classList.add('hidden');
        });
        basicSettings.classList.remove('hidden');
    }
    
    const tabLinks = document.querySelectorAll('#settingsPage nav a');
    if (tabLinks.length > 0) {
        tabLinks.forEach(link => {
            link.classList.remove('border-blue-500', 'text-blue-600');
            link.classList.add('border-transparent', 'text-gray-500', 'hover:border-gray-300', 'hover:text-gray-700');
        });
        const firstTab = tabLinks[0];
        firstTab.classList.remove('border-transparent', 'text-gray-500', 'hover:border-gray-300', 'hover:text-gray-700');
        firstTab.classList.add('border-blue-500', 'text-blue-600');
    }
}

// 简单的刷新当前页面功能（只用于services页面）
window.refreshServicesList = function() {
    if (typeof renderServicesList === 'function') {
        renderServicesList();
    }
};

// 全局导航函数（供其他模块调用）
window.navigateTo = function(pageId) {
    console.log('📍 导航至页面:', pageId);
    
    // 检查pageId属于哪个模块
    for (const [module, config] of Object.entries(subMenuConfig)) {
        const matchedItem = config.items.find(item => item.id === pageId);
        if (matchedItem) {
            // 清除所有活动状态
            clearAllActiveStates();
            
            // 高亮一级菜单
            const parentTab = document.querySelector(`[data-module="${module}"]`);
            if (parentTab) parentTab.classList.add('parent-active');
            
            // 显示顶部子菜单
            showTopSubMenu(module);
            
            // 显示页面
            showPage(pageId);
            updatePageTitle(matchedItem.name);
            
            // 高亮子菜单项
            setTimeout(() => {
                const subItem = document.querySelector(`#topSubMenuContainer [data-page="${pageId}"]`);
                if (subItem) subItem.classList.add('active');
            }, 10);
            
            currentModule = module;
            currentSubPage = pageId;
            return;
        }
    }
    
    // 没有匹配的模块，直接显示页面（无子菜单的一级页面）
    clearAllActiveStates();
    hideTopSubMenu();
    
    // 尝试高亮对应的一级菜单
    const navLink = document.querySelector(`.nav-link[href="#${pageId}"]`);
    if (navLink) navLink.classList.add('active');
    
    showPage(pageId);
    
    currentModule = null;
    currentSubPage = pageId;
};

// 获取当前模块
window.getCurrentModule = function() {
    return currentModule;
};

// 获取当前子页面
window.getCurrentSubPage = function() {
    return currentSubPage;
};
