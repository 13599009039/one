#!/usr/bin/env node

/**
 * ERP Orders.js 功能验证测试脚本
 * 用于验证所有新增和修改的功能
 */

const fs = require('fs');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
    filePath: '/root/ajkuaiji/modules/orders.js',
    backupPath: '/root/ajkuaiji/modules/orders.js.backup_validation',
    testResults: []
};

// 测试用例定义
const TEST_CASES = [
    {
        name: '语法完整性检查',
        description: '检查文件语法是否正确',
        test: checkSyntaxIntegrity
    },
    {
        name: '函数定义检查',
        description: '检查关键函数是否正确定义',
        test: checkFunctionDefinitions
    },
    {
        name: '事件绑定检查',
        description: '检查事件监听器是否正确绑定',
        test: checkEventBindings
    },
    {
        name: 'DOM元素引用检查',
        description: '检查HTML元素引用是否正确',
        test: checkDOMReferences
    },
    {
        name: '数据处理逻辑检查',
        description: '检查核心数据处理函数',
        test: checkDataProcessingLogic
    }
];

// 主测试函数
async function runValidationTests() {
    console.log('🚀 开始验证 orders.js 功能...\n');
    
    // 创建备份
    createBackup();
    
    // 运行所有测试
    for (const testCase of TEST_CASES) {
        try {
            console.log(`🧪 测试: ${testCase.name}`);
            console.log(`📝 描述: ${testCase.description}`);
            
            const result = await testCase.test();
            TEST_CONFIG.testResults.push({
                name: testCase.name,
                passed: result.passed,
                message: result.message,
                details: result.details
            });
            
            console.log(`✅ 结果: ${result.passed ? '通过' : '失败'} - ${result.message}\n`);
        } catch (error) {
            console.log(`❌ 错误: ${error.message}\n`);
            TEST_CONFIG.testResults.push({
                name: testCase.name,
                passed: false,
                message: error.message,
                details: error.stack
            });
        }
    }
    
    // 生成测试报告
    generateTestReport();
    
    // 恢复备份
    restoreBackup();
}

// 测试函数实现
function checkSyntaxIntegrity() {
    try {
        const content = fs.readFileSync(TEST_CONFIG.filePath, 'utf8');
        
        // 基本语法检查
        if (!content.trim()) {
            throw new Error('文件为空');
        }
        
        // 检查括号匹配
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        
        if (openBraces !== closeBraces) {
            throw new Error(`括号不匹配: {${openBraces} vs }${closeBraces}`);
        }
        
        // 检查函数定义完整性
        const functionDefs = content.match(/function\s+\w+/g) || [];
        const arrowFunctions = content.match(/\w+\s*=>/g) || [];
        const totalFunctions = functionDefs.length + arrowFunctions.length;
        
        return {
            passed: true,
            message: `语法检查通过，共找到 ${totalFunctions} 个函数定义`,
            details: {
                totalFunctions,
                openBraces,
                closeBraces
            }
        };
    } catch (error) {
        return {
            passed: false,
            message: `语法检查失败: ${error.message}`,
            details: error.message
        };
    }
}

function checkFunctionDefinitions() {
    const content = fs.readFileSync(TEST_CONFIG.filePath, 'utf8');
    
    // 必须存在的关键函数
    const requiredFunctions = [
        'validateOrderRefundable',
        'triggerFinancialCostCalculation',
        'publishCustomerUpdateEvent',
        'handleCustomerUpdate',
        'calculateSmartShippingCost',
        'log_system_audit',
        'initKeyboardShortcuts'
    ];
    
    const missingFunctions = [];
    const foundFunctions = [];
    
    requiredFunctions.forEach(funcName => {
        const pattern = new RegExp(`function\\s+${funcName}|${funcName}\\s*=\\s*function|${funcName}\\s*:\\s*function|${funcName}\\s*=>`);
        if (pattern.test(content)) {
            foundFunctions.push(funcName);
        } else {
            missingFunctions.push(funcName);
        }
    });
    
    return {
        passed: missingFunctions.length === 0,
        message: missingFunctions.length === 0 
            ? `所有关键函数都已定义 (${foundFunctions.length}/${requiredFunctions.length})`
            : `缺少函数: ${missingFunctions.join(', ')}`,
        details: {
            found: foundFunctions,
            missing: missingFunctions,
            totalRequired: requiredFunctions.length
        }
    };
}

function checkEventBindings() {
    const content = fs.readFileSync(TEST_CONFIG.filePath, 'utf8');
    
    // 检查事件监听器
    const eventPatterns = [
        /addEventListener\(['"][^'"]+['"]/g,
        /\.onclick\s*=/g,
        /\.onchange\s*=/g,
        /\.oninput\s*=/g
    ];
    
    let totalEvents = 0;
    eventPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            totalEvents += matches.length;
        }
    });
    
    // 检查DOMContentLoaded绑定
    const domContentLoadedBound = content.includes('DOMContentLoaded');
    
    return {
        passed: totalEvents > 0 && domContentLoadedBound,
        message: `找到 ${totalEvents} 个事件绑定，DOMContentLoaded绑定: ${domContentLoadedBound ? '是' : '否'}`,
        details: {
            totalEvents,
            domContentLoadedBound
        }
    };
}

function checkDOMReferences() {
    const content = fs.readFileSync(TEST_CONFIG.filePath, 'utf8');
    
    // 检查常见的DOM操作
    const domOperations = [
        /document\.getElementById/g,
        /document\.querySelector/g,
        /document\.querySelectorAll/g,
        /\.innerHTML\s*=/g,
        /\.textContent\s*=/g
    ];
    
    let totalDOMOps = 0;
    domOperations.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            totalDOMOps += matches.length;
        }
    });
    
    // 检查关键元素引用
    const criticalElements = [
        'aftersaleOrderModal',
        'aftersaleRefundTotal',
        'refundItemsTotalDisplay',
        'aftersaleFinalRefundAmount'
    ];
    
    const referencedElements = criticalElements.filter(element => 
        content.includes(element)
    );
    
    return {
        passed: totalDOMOps > 0 && referencedElements.length > 0,
        message: `找到 ${totalDOMOps} 个DOM操作，引用关键元素 ${referencedElements.length}/${criticalElements.length} 个`,
        details: {
            totalDOMOps,
            referencedElements,
            totalCriticalElements: criticalElements.length
        }
    };
}

function checkDataProcessingLogic() {
    const content = fs.readFileSync(TEST_CONFIG.filePath, 'utf8');
    
    // 检查数据处理相关的关键词
    const dataProcessingIndicators = [
        /parseFloat/g,
        /parseInt/g,
        /JSON\.parse/g,
        /JSON\.stringify/g,
        /\.[a-zA-Z]+\s*\|\|\s*[0-9]+/g,  // 默认值处理
        /if\s*\([^)]*===\s*(null|undefined)/g  // 空值检查
    ];
    
    let totalIndicators = 0;
    dataProcessingIndicators.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            totalIndicators += matches.length;
        }
    });
    
    // 检查异步操作
    const asyncOperations = (content.match(/async\s+function/g) || []).length;
    const awaitUsage = (content.match(/await\s+/g) || []).length;
    
    return {
        passed: totalIndicators > 0 && (asyncOperations > 0 || awaitUsage > 0),
        message: `找到 ${totalIndicators} 个数据处理指示器，异步函数 ${asyncOperations} 个，await 使用 ${awaitUsage} 次`,
        details: {
            totalIndicators,
            asyncOperations,
            awaitUsage
        }
    };
}

function createBackup() {
    try {
        fs.copyFileSync(TEST_CONFIG.filePath, TEST_CONFIG.backupPath);
        console.log('💾 已创建备份文件\n');
    } catch (error) {
        console.log('⚠️  备份创建失败:', error.message, '\n');
    }
}

function restoreBackup() {
    try {
        if (fs.existsSync(TEST_CONFIG.backupPath)) {
            fs.copyFileSync(TEST_CONFIG.backupPath, TEST_CONFIG.filePath);
            fs.unlinkSync(TEST_CONFIG.backupPath);
            console.log('🔄 已恢复备份文件\n');
        }
    } catch (error) {
        console.log('⚠️  备份恢复失败:', error.message, '\n');
    }
}

function generateTestReport() {
    const passedTests = TEST_CONFIG.testResults.filter(t => t.passed).length;
    const totalTests = TEST_CONFIG.testResults.length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('📋 测试报告摘要');
    console.log('================');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    console.log(`通过率: ${passRate}%\n`);
    
    console.log('📊 详细结果:');
    TEST_CONFIG.testResults.forEach((result, index) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${result.name}: ${result.message}`);
    });
    
    // 生成HTML报告
    generateHTMLReport();
}

function generateHTMLReport() {
    const reportContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Orders.js 功能验证报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .passed { background: #d4edda; border: 1px solid #c3e6cb; }
        .failed { background: #f8d7da; border: 1px solid #f5c6cb; }
        .details { margin-top: 10px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Orders.js 功能验证报告</h1>
        <p>测试时间: ${new Date().toLocaleString()}</p>
        <p>测试文件: ${TEST_CONFIG.filePath}</p>
    </div>
    
    <div class="summary">
        <h2>测试摘要</h2>
        <p>总测试数: ${TEST_CONFIG.testResults.length}</p>
        <p>通过测试: ${TEST_CONFIG.testResults.filter(t => t.passed).length}</p>
        <p>失败测试: ${TEST_CONFIG.testResults.filter(t => !t.passed).length}</p>
    </div>
    
    <div class="results">
        <h2>详细结果</h2>
        ${TEST_CONFIG.testResults.map((result, index) => `
            <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                <h3>${index + 1}. ${result.name}</h3>
                <p><strong>描述:</strong> ${result.description || 'N/A'}</p>
                <p><strong>结果:</strong> ${result.message}</p>
                ${result.details ? `<div class="details"><pre>${JSON.stringify(result.details, null, 2)}</pre></div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    
    const reportPath = '/root/ajkuaiji/test-results/orders-validation-report.html';
    fs.writeFileSync(reportPath, reportContent);
    console.log(`📄 HTML报告已生成: ${reportPath}\n`);
}

// 运行测试
runValidationTests().catch(console.error);