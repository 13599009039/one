/**
 * ERP系统UI可视化验证脚本
 * 作者: Qoder AI
 * 用途: 自动检测界面元素是否存在和功能是否正常
 */

// ==================== UI验证配置 ====================
const UI_VALIDATION_CONFIG = {
    // 物流模块相关元素
    logistics: {
        pages: ['logisticsAccountsPage', 'logisticsOrdersPage', 'logisticsConfigPage'],
        buttons: {
            '新增账号': '#logisticsAccountsPage button:contains("新增账号")',
            '刷新': '#logisticsAccountsPage button:contains("刷新")',
            '授权': 'button[title="授权"]',
            '测试连接': 'button[title="测试连接"]',
            '编辑': 'button[title="编辑"]',
            '删除': 'button[title="删除"]'
        },
        modals: {
            '物流账号模态框': '#logisticsAccountModal:not(.hidden)',
            '授权回调页面': '#authCallbackPage'  // 如果存在的话
        },
        tables: {
            '账号列表表格': '#logisticsAccountsTableBody tr',
            '订单列表表格': '#logisticsOrdersTableBody tr'
        }
    },
    
    // 导航菜单
    navigation: {
        '物流菜单项': 'li[data-menu-id="logistics"]',
        '物流子菜单': '.submenu[data-parent="logistics"]',
        '物流账号管理': 'li[data-submenu="logisticsAccounts"]'
    },
    
    // 表单元素
    forms: {
        '账号名称输入框': '#accountName',
        '快递公司下拉框': '#expressCompanySelect',
        '网点编码输入框': '#branchCode',
        '客户编码输入框': '#customerCode',
        'API Key输入框': '#apiKey',
        'API Secret输入框': '#apiSecret',
        '设为默认复选框': '#isDefault'
    }
};

// ==================== 验证工具函数 ====================

/**
 * 检查元素是否存在
 * @param {string} selector - CSS选择器
 * @param {string} description - 元素描述
 * @returns {Object} 验证结果
 */
function checkElement(selector, description) {
    try {
        const element = document.querySelector(selector);
        return {
            exists: !!element,
            element: element,
            selector: selector,
            description: description,
            visible: element ? element.offsetParent !== null : false
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message,
            selector: selector,
            description: description
        };
    }
}

/**
 * 检查多个元素
 * @param {Object} elements - 元素配置对象
 * @returns {Array} 验证结果数组
 */
function checkElements(elements) {
    const results = [];
    for (const [name, selector] of Object.entries(elements)) {
        results.push(checkElement(selector, name));
    }
    return results;
}

/**
 * 验证页面完整性
 * @param {string} pageId - 页面ID
 * @returns {Object} 页面验证结果
 */
function validatePage(pageId) {
    const pageElement = document.getElementById(pageId);
    
    if (!pageElement) {
        return {
            pageId: pageId,
            exists: false,
            error: `页面容器 #${pageId} 不存在`
        };
    }
    
    return {
        pageId: pageId,
        exists: true,
        visible: pageElement.offsetParent !== null,
        className: pageElement.className,
        childCount: pageElement.children.length
    };
}

/**
 * 验证物流模块整体状态
 * @returns {Object} 完整验证报告
 */
function validateLogisticsModule() {
    console.group('🔍 物流模块UI验证报告');
    
    const report = {
        timestamp: new Date().toISOString(),
        pages: {},
        elements: {},
        errors: [],
        warnings: []
    };
    
    // 1. 验证页面
    console.log('📋 验证页面...');
    for (const pageId of UI_VALIDATION_CONFIG.logistics.pages) {
        const result = validatePage(pageId);
        report.pages[pageId] = result;
        
        if (!result.exists) {
            report.errors.push(`页面缺失: ${pageId}`);
            console.error(`❌ ${pageId}: 不存在`);
        } else if (!result.visible) {
            report.warnings.push(`页面隐藏: ${pageId}`);
            console.warn(`⚠️ ${pageId}: 当前隐藏`);
        } else {
            console.log(`✅ ${pageId}: 正常显示`);
        }
    }
    
    // 2. 验证按钮
    console.log('\n🔘 验证按钮...');
    const buttonResults = checkElements(UI_VALIDATION_CONFIG.logistics.buttons);
    report.elements.buttons = buttonResults;
    
    buttonResults.forEach(result => {
        if (!result.exists) {
            report.errors.push(`按钮缺失: ${result.description}`);
            console.error(`❌ ${result.description}: 不存在 (${result.selector})`);
        } else if (!result.visible) {
            report.warnings.push(`按钮隐藏: ${result.description}`);
            console.warn(`⚠️ ${result.description}: 当前隐藏`);
        } else {
            console.log(`✅ ${result.description}: 正常`);
        }
    });
    
    // 3. 验证模态框
    console.log('\n🎭 验证模态框...');
    const modalResults = checkElements(UI_VALIDATION_CONFIG.logistics.modals);
    report.elements.modals = modalResults;
    
    modalResults.forEach(result => {
        if (result.exists && result.visible) {
            console.log(`✅ ${result.description}: 已打开`);
        } else if (result.exists && !result.visible) {
            console.log(`ℹ️ ${result.description}: 已关闭`);
        } else {
            report.warnings.push(`模态框缺失: ${result.description}`);
            console.warn(`⚠️ ${result.description}: 不存在`);
        }
    });
    
    // 4. 验证表格
    console.log('\n📊 验证表格...');
    const tableResults = checkElements(UI_VALIDATION_CONFIG.logistics.tables);
    report.elements.tables = tableResults;
    
    tableResults.forEach(result => {
        if (result.exists) {
            const rowCount = result.element.querySelectorAll('tr').length;
            console.log(`✅ ${result.description}: ${rowCount} 行`);
        } else {
            report.errors.push(`表格缺失: ${result.description}`);
            console.error(`❌ ${result.description}: 不存在`);
        }
    });
    
    // 5. 验证表单元素
    console.log('\n📝 验证表单元素...');
    const formResults = checkElements(UI_VALIDATION_CONFIG.forms);
    report.elements.forms = formResults;
    
    formResults.forEach(result => {
        if (!result.exists) {
            report.errors.push(`表单元素缺失: ${result.description}`);
            console.error(`❌ ${result.description}: 不存在`);
        } else {
            console.log(`✅ ${result.description}: 正常`);
        }
    });
    
    // 6. 总结
    console.log('\n📈 验证总结:');
    console.log(`总检查项: ${Object.keys(report.pages).length + 
                          Object.keys(report.elements.buttons || {}).length + 
                          Object.keys(report.elements.modals || {}).length + 
                          Object.keys(report.elements.tables || {}).length + 
                          Object.keys(report.elements.forms || {}).length}`);
    console.log(`错误数: ${report.errors.length}`);
    console.log(`警告数: ${report.warnings.length}`);
    
    if (report.errors.length === 0 && report.warnings.length === 0) {
        console.log('%c🎉 所有UI元素正常!', 'color: green; font-size: 16px; font-weight: bold;');
    } else if (report.errors.length > 0) {
        console.log('%c🚨 存在严重问题，请检查!', 'color: red; font-size: 16px; font-weight: bold;');
    } else {
        console.log('%c⚠️ 存在警告，建议检查', 'color: orange; font-size: 14px;');
    }
    
    console.groupEnd();
    
    return report;
}

/**
 * 自动运行验证（定时检查）
 * @param {number} interval - 检查间隔（毫秒）
 */
function autoValidate(interval = 30000) {
    console.log(`🕒 启动自动UI验证，间隔: ${interval/1000}秒`);
    
    // 立即执行一次
    validateLogisticsModule();
    
    // 定时执行
    setInterval(() => {
        console.log('\n🔄 自动验证执行...');
        validateLogisticsModule();
    }, interval);
}

/**
 * 导出验证函数到全局作用域
 */
window.uiValidator = {
    validateLogisticsModule: validateLogisticsModule,
    validatePage: validatePage,
    checkElement: checkElement,
    checkElements: checkElements,
    autoValidate: autoValidate,
    config: UI_VALIDATION_CONFIG
};

// 页面加载完成后自动运行一次验证
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 页面加载完成，准备UI验证...');
    setTimeout(() => {
        validateLogisticsModule();
    }, 2000); // 等待2秒确保所有元素加载完成
});

console.log('✅ UI验证脚本已加载，可用命令:');
console.log('- uiValidator.validateLogisticsModule()  // 手动验证');
console.log('- uiValidator.autoValidate(30000)       // 自动验证(30秒间隔)');
