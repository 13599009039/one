/**
 * Template Loader - 模板动态加载器
 * Version: 22.3
 * Description: 实现模板的动态加载、缓存管理和DOM注入
 */

// 全局模板缓存对象
const TemplateCache = {};

// 配置对象
const TemplateLoaderConfig = {
    version: '24.3',
    baseUrl: 'templates/',
    templates: [
        'modal-order-detail',
        'modal-order-add',
        'modal-sign-contract',
        'modal-category',
        'modal-transaction',
        'modal-batch-transaction',
        'modal-refund',
        'modal-payment',
        'modal-aftersales',
        'modal-aftersale-order'  // 新增：售后订单创建弹窗
        // 注意：任务相关模板使用Bootstrap样式，与项目Tailwind CSS冲突，暂时禁用
        // 'modal-task-pool',
        // 'modal-task-detail',
        // 'modal-task-assign',
        // 'modal-task-transfer',
        // 'modal-task-collaborator'
    ]
};

/**
 * 加载模板文件
 * @param {string} templateName - 模板名称（不含.html扩展名）
 * @returns {Promise<string>} - 返回模板HTML内容
 */
async function loadTemplate(templateName) {
    // 不使用缓存，每次都重新加载（避免模板缓存问题）
    // if (TemplateCache[templateName]) {
    //     console.log(`[TemplateLoader] Using cached template: ${templateName}`);
    //     return TemplateCache[templateName];
    // }

    try {
        // 构造URL（添加版本号和时间戳防止缓存）
        const timestamp = Date.now();
        const url = `${TemplateLoaderConfig.baseUrl}${templateName}.html?v=${TemplateLoaderConfig.version}&t=${timestamp}`;
        console.log(`[TemplateLoader] Fetching template: ${url}`);

        // Fetch请求
        const response = await fetch(url, { cache: 'no-store' });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 读取HTML内容
        const html = await response.text();
        
        // 存入缓存
        TemplateCache[templateName] = html;
        console.log(`[TemplateLoader] Template loaded and cached: ${templateName}`);
        
        return html;
    } catch (error) {
        console.error(`[TemplateLoader] Failed to load template: ${templateName}`, error);
        throw error;
    }
}

/**
 * 将模板HTML注入到DOM
 * @param {string} templateName - 模板名称
 * @param {string} html - 模板HTML内容
 */
function injectTemplate(templateName, html) {
    try {
        // 创建临时容器
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html.trim();
        
        // 获取所有子元素（一个模板文件可能包含多个模态框）
        const elements = Array.from(tempDiv.children);
        
        if (elements.length === 0) {
            throw new Error('Template is empty or invalid');
        }

        // 注入所有元素到body末尾
        const injectedIds = [];
        elements.forEach(el => {
            document.body.appendChild(el);
            injectedIds.push(el.id || '(no-id)');
        });
        console.log(`[TemplateLoader] Template injected: ${templateName}, IDs: ${injectedIds.join(', ')}`);
        
        return elements[0]; // 返回第一个元素保持兼容性
    } catch (error) {
        console.error(`[TemplateLoader] Failed to inject template: ${templateName}`, error);
        throw error;
    }
}

/**
 * 初始化模板加载器（加载所有模板）
 * @returns {Promise<void>}
 */
async function initTemplateLoader() {
    console.log('[TemplateLoader] Initializing...');
    const startTime = performance.now();

    try {
        // 确保DOM已就绪
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // 并行加载所有模板
        const loadPromises = TemplateLoaderConfig.templates.map(async (templateName) => {
            const html = await loadTemplate(templateName);
            return injectTemplate(templateName, html);
        });

        await Promise.all(loadPromises);

        const endTime = performance.now();
        console.log(`[TemplateLoader] All templates loaded in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
        console.error('[TemplateLoader] Initialization failed', error);
        throw error;
    }
}

// 导出API（兼容旧代码调用）
window.TemplateLoader = {
    init: initTemplateLoader,
    load: loadTemplate,
    inject: injectTemplate,
    cache: TemplateCache,
    config: TemplateLoaderConfig
};
