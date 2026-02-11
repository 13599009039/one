// 导航模块

// 导航初始化
function initNavigation() {
    // 一级菜单链接
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const target = this.getAttribute('href')?.substring(1);
            if (!target) return;
            
            // 移除所有活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.submenu-link').forEach(l => l.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            
            // 显示对应页面
            showPage(target);
            
            // 更新标题
            const pageName = this.querySelector('span')?.innerText || this.innerText.trim();
            const titleEl = document.getElementById('currentPageTitle');
            if (titleEl) titleEl.innerText = pageName;
        });
    });
    
    // 二级菜单链接
    const submenuLinks = document.querySelectorAll('.submenu-link');
    submenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const target = this.getAttribute('href')?.substring(1);
            if (!target) return;
            
            // 移除所有活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            submenuLinks.forEach(l => l.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            // 父级菜单也高亮
            const parentMenu = this.closest('.nav-item-group')?.querySelector('.nav-link');
            if (parentMenu) parentMenu.classList.add('active');
            
            // 显示对应页面
            showPage(target);
            
            // 更新标题
            const pageName = this.querySelector('span')?.innerText || this.innerText.trim();
            const titleEl = document.getElementById('currentPageTitle');
            if (titleEl) titleEl.innerText = pageName;
        });
    });
    
    // 二级菜单折叠展开
    const menuToggles = document.querySelectorAll('.menu-toggle');
    menuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const submenu = this.nextElementSibling;
            const icon = this.querySelector('.toggle-icon');
            
            if (submenu && submenu.classList.contains('submenu')) {
                submenu.classList.toggle('hidden');
                if (icon) {
                    icon.classList.toggle('fa-chevron-down');
                    icon.classList.toggle('fa-chevron-up');
                }
            }
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
                // 折叠时隐藏所有二级菜单
                document.querySelectorAll('.submenu').forEach(sub => sub.classList.add('hidden'));
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
}

// 显示指定页面
function showPage(pageId) {
    // 所有页面ID列表
    const pages = [
        'dashboardPage', 'customersPage', 'ordersPage', 'transactionsPage', 'reportsPage',
        // 商品管理(统一v14.0)
        'servicesPage', 'recyclePage',
        // 进销存管理
        'suppliersPage', 'purchasesPage', 'inventoryPage',
        // 组织架构（独立页面）
        'personnelPage', 'departmentPage', 'teamPage', 'positionPage',
        // 系统配置（独立页面）
        'basicConfigPage', 'accountConfigPage', 'categoryConfigPage', 'backupConfigPage',
        // 任务池
        'taskPoolPage',
        // 业务成本设置
        'costConfigPage',
        // 旧设置页（兼容）
        'settingsPage'
    ];
    
    // 隐藏所有页面
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // 显示目标页面
    const pageEl = document.getElementById(pageId + 'Page');
    if (pageEl) {
        pageEl.classList.remove('hidden');
    }
    
    // 页面初始化逻辑
    switch(pageId) {
        case 'dashboard':
            if (typeof initDashboard === 'function') initDashboard();
            break;
        case 'customers':
            if (typeof initCustomersPage === 'function') initCustomersPage();
            break;
        case 'orders':
            if (typeof initOrdersPage === 'function') initOrdersPage();
            break;
        case 'transactions':
            if (typeof initTransactionsPage === 'function') initTransactionsPage();
            if (typeof loadTransactionData === 'function') loadTransactionData();
            break;
        case 'reports':
            if (typeof initReportsPage === 'function') initReportsPage();
            break;
        // 商品管理(统一v14.0)
        case 'services':
            if (typeof initServicesPage === 'function') initServicesPage();
            break;
        case 'recycle':
            if (typeof initRecyclePage === 'function') initRecyclePage();
            break;
        case 'productTemplates':
            if (typeof initProductTemplates === 'function') initProductTemplates();
            break;
        case 'servicePackages':
            // 【废弃】重定向到services
            console.warn('servicePackages路由已废弃,重定向到services');
            window.location.hash = '#services';
            return;
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
        // 系统配置 - 独立页面
        case 'basicConfig':
            if (typeof initBasicConfigPage === 'function') initBasicConfigPage();
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
        // 任务池
        case 'taskPool':
            if (typeof initTaskPoolPage === 'function') initTaskPoolPage();
            break;
        // 业务成本设置
        case 'costConfig':
            if (typeof initCostConfigPage === 'function') initCostConfigPage();
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