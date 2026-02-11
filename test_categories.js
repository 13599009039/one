// 测试类别设置功能
console.log('=== 开始测试类别设置功能 ===');

// 模拟用户登录
function simulateLogin() {
    console.log('模拟用户登录...');
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify({ username: 'testuser', role: 'admin' }));
    
    // 隐藏登录页面，显示主页面
    const loginPage = document.getElementById('loginPage');
    const mainPage = document.getElementById('mainPage');
    
    if (loginPage && mainPage) {
        loginPage.style.display = 'none';
        mainPage.style.display = 'block';
        console.log('登录成功，显示主页面');
    } else {
        console.error('页面元素未找到');
    }
}

// 测试切换到系统设置
function testNavigateToSettings() {
    console.log('测试切换到系统设置...');
    const settingsTab = document.getElementById('settingsTab');
    
    if (settingsTab) {
        settingsTab.click();
        console.log('切换到系统设置页面');
        
        // 等待页面切换完成
        setTimeout(testNavigateToCategories, 500);
    } else {
        console.error('设置标签页未找到');
        console.log('settingsTab:', settingsTab);
        
        // 检查是否能找到任何元素
        const allATags = document.querySelectorAll('a');
        console.log('所有a标签:', allATags);
        
        // 尝试查找导航标签
        const navTabs = document.querySelectorAll('#mainPage header a');
        console.log('导航标签:', navTabs);
    }
}

// 测试切换到类别设置
function testNavigateToCategories() {
    console.log('测试切换到类别设置...');
    const categoriesTab = document.querySelector('#settingsPage nav a[data-tab="categories"]');
    
    if (categoriesTab) {
        categoriesTab.click();
        console.log('切换到类别设置页面');
        
        // 等待页面加载完成
        setTimeout(testCategoryManagement, 1000);
    } else {
        console.error('类别设置标签页未找到');
    }
}

// 测试类别管理功能
function testCategoryManagement() {
    console.log('测试类别管理功能...');
    
    // 检查类别表格是否存在
    const categoriesTable = document.getElementById('categoriesTable');
    if (categoriesTable) {
        console.log('类别表格存在');
    } else {
        console.error('类别表格未找到');
        return;
    }
    
    // 检查添加类别按钮是否存在
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        console.log('添加类别按钮存在');
    } else {
        console.error('添加类别按钮未找到');
        return;
    }
    
    // 检查表格内容是否正确渲染
    const categoriesTableBody = document.getElementById('categoriesTableBody');
    if (categoriesTableBody && categoriesTableBody.children.length > 0) {
        console.log('类别数据已正确渲染，共', categoriesTableBody.children.length, '条记录');
    } else {
        console.error('类别数据未渲染');
        return;
    }
    
    console.log('=== 类别设置功能测试完成 ===');
}

// 执行测试
document.addEventListener('DOMContentLoaded', function() {
    simulateLogin();
    testNavigateToSettings();
});
