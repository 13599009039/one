// 简单测试脚本，用于检查系统设置功能

console.log('=== 系统设置功能测试 ===');

// 检查DOM元素是否存在
const settingsPage = document.getElementById('settingsPage');
const basicSettings = document.getElementById('basicSettings');
const tabLinks = document.querySelectorAll('#settingsPage nav a');

console.log('settingsPage 存在:', !!settingsPage);
console.log('basicSettings 存在:', !!basicSettings);
console.log('选项卡数量:', tabLinks.length);

// 检查核心函数是否存在
console.log('initSettingsPage 函数存在:', typeof initSettingsPage === 'function');
console.log('handleTabChange 函数存在:', typeof handleTabChange === 'function');
console.log('loadSystemSettings 函数存在:', typeof loadSystemSettings === 'function');

// 检查类别管理函数是否存在
console.log('initCategoriesPage 函数存在:', typeof window.initCategoriesPage === 'function');

// 如果所有元素和函数都存在，尝试初始化设置页面
if (settingsPage && basicSettings && typeof initSettingsPage === 'function') {
    console.log('尝试初始化设置页面...');
    try {
        initSettingsPage();
        console.log('设置页面初始化成功！');
        
        // 显示设置页面
        settingsPage.classList.remove('hidden');
        console.log('设置页面已显示');
        
    } catch (error) {
        console.error('初始化设置页面时出错:', error);
    }
} else {
    console.error('缺少必要的元素或函数，无法初始化设置页面');
}

console.log('=== 测试完成 ===');
