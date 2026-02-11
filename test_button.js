// 测试批量登记按钮的功能
console.log('=== 开始测试批量登记按钮 ===');

// 检查按钮是否存在
const batchButton = document.getElementById('batchTransactionBtn');
console.log('批量登记按钮元素:', batchButton);

if (batchButton) {
    console.log('按钮存在');
    
    // 检查按钮是否有点击事件监听器
    // 获取事件监听器
    const listeners = getEventListeners(batchButton);
    console.log('按钮的点击事件监听器:', listeners.click);
    
    // 手动触发点击事件
    console.log('尝试手动触发点击事件...');
    batchButton.click();
} else {
    console.log('按钮不存在');
    
    // 检查页面上是否有类似的按钮
    const allButtons = document.querySelectorAll('button');
    console.log('页面上所有按钮:', allButtons);
    
    // 查找包含"批量登记"文本的按钮
    const batchButtons = Array.from(allButtons).filter(btn => 
        btn.textContent.includes('批量登记')
    );
    console.log('包含"批量登记"文本的按钮:', batchButtons);
}

// 检查模态框是否存在
const modal = document.getElementById('batchTransactionModal');
console.log('批量登记模态框:', modal);

console.log('=== 测试结束 ===');