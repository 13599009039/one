// 通用工具函数模块
// 版本：v1.2 (新增前端日志上报)
// 创建日期：2026-02-12
// 更新日期：2026-02-16

// ✅ 初始化 Utils 工具对象
if (!window.Utils) {
    window.Utils = {};
    console.log('✅ Utils 工具对象已初始化');
}

// ===================== 前端日志上报系统 =====================

/**
 * 前端日志缓冲队列（避免频繁请求）
 */
const logBuffer = [];
let logTimer = null;

/**
 * 发送日志到服务器
 * @param {string} level - 日志级别: info/warn/error/api
 * @param {string} message - 日志消息
 * @param {Object} data - 附加数据
 */
function sendLogToServer(level, message, data = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        url: window.location.href,
        userAgent: navigator.userAgent,
        data: JSON.stringify(data)
    };
    
    logBuffer.push(logEntry);
    
    // 批量发送（500ms内的日志合并发送）
    clearTimeout(logTimer);
    logTimer = setTimeout(() => {
        if (logBuffer.length === 0) return;
        
        const logsToSend = [...logBuffer];
        logBuffer.length = 0;
        
        fetch('/api/frontend_logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs: logsToSend }),
            credentials: 'include'
        }).catch(err => {
            // 静默失败，避免死循环
            console.warn('[日志上报] 失败:', err.message);
        });
    }, 500);
}

// ===================== UI可视化状态监控 =====================

/**
 * 记录UI状态变化（供后端监控可视化层）
 * @param {string} action - 操作类型: click/show/hide/render
 * @param {string} target - 目标元素/模块
 * @param {Object} details - 详细信息
 */
window.logUIState = function(action, target, details = {}) {
    const uiLog = {
        action,
        target,
        visible: details.visible !== undefined ? details.visible : null,
        classList: details.classList || null,
        display: details.display || null,
        innerHTML: details.innerHTML ? (details.innerHTML.substring(0, 100) + '...') : null
    };
    
    sendLogToServer('info', `[UI] ${action} ${target}`, uiLog);
    console.log(`👁️ [UI监控] ${action} ${target}`, details);
};

/**
 * 监控页面切换
 */
window.logPageSwitch = function(fromPage, toPage) {
    sendLogToServer('info', `[UI] 页面切换: ${fromPage} -> ${toPage}`, {
        from: fromPage,
        to: toPage,
        timestamp: Date.now()
    });
    console.log(`🔄 [UI监控] 页面切换: ${fromPage} -> ${toPage}`);
};

/**
 * 监控模态框状态
 */
window.logModalState = function(modalId, state, error = null) {
    const modal = document.getElementById(modalId);
    sendLogToServer('info', `[UI] 模态框 ${modalId} ${state}`, {
        modalId,
        state,
        exists: !!modal,
        visible: modal ? !modal.classList.contains('hidden') : false,
        error
    });
    console.log(`📋 [UI监控] 模态框 ${modalId} ${state}`);
};

/**
 * 拦戮fetch API，自动记录请求和响应
 */
if (window.fetch && !window._fetchIntercepted) {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, options = {}] = args;
        const startTime = Date.now();
        
        try {
            const response = await originalFetch(...args);
            const duration = Date.now() - startTime;
            
            // 记录API请求
            sendLogToServer('api', `${options.method || 'GET'} ${url}`, {
                status: response.status,
                duration: `${duration}ms`,
                ok: response.ok
            });
            
            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // 记录API错误
            sendLogToServer('error', `${options.method || 'GET'} ${url} 失败`, {
                error: error.message,
                duration: `${duration}ms`
            });
            
            throw error;
        }
    };
    window._fetchIntercepted = true;
    console.log('✅ fetch拦截器已启用，API请求将自动上报');
}

/**
 * 拦截console.error，自动上报前端错误
 */
if (!window._consoleIntercepted) {
    const originalError = console.error;
    console.error = function(...args) {
        // 调用原始console.error
        originalError.apply(console, args);
        
        // 上报到服务器
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        sendLogToServer('error', message);
    };
    window._consoleIntercepted = true;
    console.log('✅ console.error拦截器已启用，错误将自动上报');
}

/**
 * 全局错误监听
 */
window.addEventListener('error', (event) => {
    sendLogToServer('error', `全局错误: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    sendLogToServer('error', `未捕获的Promise错误: ${event.reason}`);
});

console.log('✅ 前端日志上报系统已启动');

// ===================== 原有工具函数 =====================

/**
 * 统一API错误处理函数
 * @param {Error} error - 错误对象
 * @param {string} operationName - 操作名称（如：保存订单、加载客户）
 * @param {Object} options - 可选配置
 * @param {boolean} options.silent - 是否静默模式（不显示通知）
 * @param {Function} options.onError - 自定义错误处理回调
 * @returns {void}
 */
function handleApiError(error, operationName = '操作', options = {}) {
    const { silent = false, onError } = options;
    
    // 记录错误日志
    console.error(`❌ API ${operationName}失败:`, error);
    
    // 提取错误信息
    let errorMessage = error.message || '未知错误';
    
    // 针对常见错误类型提供友好提示
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络';
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = '登录已过期，请重新登录';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = '没有操作权限';
    } else if (error.message.includes('404')) {
        errorMessage = '请求的资源不存在';
    } else if (error.message.includes('500')) {
        errorMessage = '服务器内部错误';
    }
    
    // 显示错误通知
    if (!silent) {
        const notification = `${operationName}失败: ${errorMessage}`;
        if (window.showNotification) {
            window.showNotification(notification, 'error');
        } else {
            alert(notification);
        }
    }
    
    // 执行自定义错误处理
    if (typeof onError === 'function') {
        onError(error, errorMessage);
    }
}

/**
 * 封装API调用的统一错误处理
 * @param {Function} apiCall - API调用函数（返回Promise）
 * @param {string} operationName - 操作名称
 * @param {Object} options - 可选配置
 * @returns {Promise<any>} 返回API结果或null
 */
async function withErrorHandling(apiCall, operationName = '操作', options = {}) {
    try {
        const result = await apiCall();
        
        // 检查API返回结果
        if (result && result.success) {
            return result;
        } else {
            throw new Error(result?.message || 'API返回失败');
        }
    } catch (error) {
        handleApiError(error, operationName, options);
        return null;
    }
}

/**
 * 批量API调用错误处理
 * @param {Array<{call: Function, name: string}>} apiCalls - API调用配置数组
 * @param {Object} options - 可选配置
 * @returns {Promise<Array>} 返回结果数组
 */
async function withBatchErrorHandling(apiCalls, options = {}) {
    const results = await Promise.allSettled(
        apiCalls.map(({ call, name }) => withErrorHandling(call, name, options))
    );
    
    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            console.error(`批量调用失败 [${apiCalls[index].name}]:`, result.reason);
            return null;
        }
    });
}

/**
 * 表单验证辅助函数
 * @param {Object} data - 表单数据对象
 * @param {Array<{field: string, label: string, required: boolean}>} rules - 验证规则
 * @returns {Object} {valid: boolean, errors: Array<string>}
 */
function validateForm(data, rules) {
    const errors = [];
    
    rules.forEach(rule => {
        const value = data[rule.field];
        
        // 必填验证
        if (rule.required && (!value || value.toString().trim() === '')) {
            errors.push(`请填写${rule.label}`);
        }
        
        // 自定义验证函数
        if (rule.validator && typeof rule.validator === 'function') {
            const validResult = rule.validator(value, data);
            if (validResult !== true) {
                errors.push(validResult || `${rule.label}验证失败`);
            }
        }
    });
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * 显示表单验证错误
 * @param {Array<string>} errors - 错误信息数组
 */
function showValidationErrors(errors) {
    if (errors.length === 0) return;
    
    const message = errors.join('；');
    if (window.showNotification) {
        window.showNotification(message, 'error');
    } else {
        alert(message);
    }
}

/**
 * 日期格式化函数
 * @param {Date|string} date - 日期对象或字符串
 * @param {string} format - 格式字符串（默认：YYYY-MM-DD）
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 金额格式化函数
 * @param {number} amount - 金额
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的金额字符串
 */
function formatCurrency(amount, options = {}) {
    const {
        prefix = '¥',
        decimals = 2,
        locale = 'zh-CN'
    } = options;
    
    if (amount === null || amount === undefined) return '-';
    
    const formattedAmount = Number(amount).toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    
    return `${prefix}${formattedAmount}`;
}

/**
 * 防抖函数
 * @param {Function} func - 需要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 需要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 导出工具函数（兼容全局和模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleApiError,
        withErrorHandling,
        withBatchErrorHandling,
        validateForm,
        showValidationErrors,
        formatDate,
        formatCurrency,
        debounce,
        throttle
    };
}

// 全局暴露（用于HTML直接引用）
if (typeof window !== 'undefined') {
    window.Utils = {
        handleApiError,
        withErrorHandling,
        withBatchErrorHandling,
        validateForm,
        showValidationErrors,
        formatDate,
        formatCurrency,
        debounce,
        throttle
    };
}

/**
 * 统一模态框操作函数
 * 解决问题：模态框显示逻辑不一致（classList + style.display 混用）
 * 修复日期：2026-02-12
 */

/**
 * 打开模态框
 * @param {string} modalId - 模态框元素ID
 */
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        console.log(`✅ 模态框已打开: ${modalId}`);
        // 记录UI状态
        if (window.logModalState) {
            window.logModalState(modalId, 'opened');
        }
    } else {
        console.error(`❌ 模态框不存在: ${modalId}`);
        // 记录错误
        if (window.logModalState) {
            window.logModalState(modalId, 'error', 'Modal element not found');
        }
    }
};

/**
 * 关闭模态框
 * @param {string} modalId - 模态框元素ID
 */
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        console.log(`✅ 模态框已关闭: ${modalId}`);
    } else {
        console.error(`❌ 模态框不存在: ${modalId}`);
    }
};

/**
 * 通知提示函数
 * 从 organization.js 移动到 utils.js，作为基础工具函数
 * 移动日期：2026-02-12
 * 
 * @param {string} message - 提示消息
 * @param {string} type - 类型: success/error/warning/info
 */
window.showNotification = function(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.warn('通知容器不存在，使用alert替代');
        alert(message);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${iconMap[type]} mr-2"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    // 3秒后淡出
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

/**
 * ==================== 架构升级 v1.1 - 防御性编程工具 ====================
 * 升级日期: 2026-02-13
 * 升级目标: 为订单、SCRM、财务、审批流程提供稳固的基础设施
 */

/**
 * 安全获取DOM元素值
 * @param {string} elementId - 元素ID
 * @param {*} defaultValue - 默认值（支持任意类型）
 * @param {Object} options - 可选配置
 * @param {boolean} options.warnOnMissing - 元素不存在时是否警告（默认true）
 * @param {boolean} options.trimString - 字符串是否trim（默认true）
 * @returns {*} 元素值或默认值
 */
window.Utils.safeGetValue = function(elementId, defaultValue = '', options = {}) {
    const { warnOnMissing = true, trimString = true } = options;
    
    const element = document.getElementById(elementId);
    if (!element) {
        if (warnOnMissing) {
            console.warn(`⚠️ DOM元素不存在: ${elementId}，使用默认值:`, defaultValue);
        }
        return defaultValue;
    }
    
    const value = element.value;
    return (trimString && typeof value === 'string') ? value.trim() : value;
};

/**
 * 安全获取DOM元素
 * @param {string} elementId - 元素ID
 * @param {Object} options - 可选配置
 * @param {boolean} options.throwOnMissing - 元素不存在时是否抛出错误（默认false）
 * @returns {HTMLElement|null} DOM元素或null
 */
window.Utils.safeGetElement = function(elementId, options = {}) {
    const { throwOnMissing = false } = options;
    
    const element = document.getElementById(elementId);
    if (!element) {
        const errorMsg = `❌ DOM元素不存在: ${elementId}`;
        if (throwOnMissing) {
            throw new Error(errorMsg);
        }
        console.warn(errorMsg);
    }
    return element;
};

/**
 * 安全解析JSON
 * @param {string} jsonString - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @param {Object} options - 可选配置
 * @param {boolean} options.logError - 是否记录错误日志（默认true）
 * @param {Function} options.onError - 错误回调函数
 * @returns {*} 解析结果或默认值
 */
window.Utils.safeParseJSON = function(jsonString, defaultValue = null, options = {}) {
    const { logError = true, onError } = options;
    
    // 空值检查
    if (!jsonString || typeof jsonString !== 'string') {
        return defaultValue;
    }
    
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        if (logError) {
            console.error('❌ JSON解析失败:', error.message);
            console.warn('原始字符串片段:', jsonString.substring(0, 100));
        }
        
        if (typeof onError === 'function') {
            onError(error, jsonString);
        }
        
        return defaultValue;
    }
};

/**
 * HTML转义（防XSS）
 * @param {*} text - 需要转义的文本
 * @returns {string} 转义后的HTML字符串
 */
window.Utils.escapeHtml = function(text) {
    if (text === null || text === undefined) return '';
    
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
};

/**
 * 创建安全的DOM元素（防XSS）
 * @param {string} tagName - 标签名
 * @param {string} textContent - 文本内容（自动转义）
 * @param {Object} attributes - 属性对象
 * @returns {HTMLElement} DOM元素
 */
window.Utils.createSafeElement = function(tagName, textContent = '', attributes = {}) {
    const element = document.createElement(tagName);
    element.textContent = textContent;  // 自动转义
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'class') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    return element;
};

/**
 * 批量获取表单数据（支持默认值和类型转换）
 * @param {Object} fieldMap - 字段映射表 { fieldName: { id, type, defaultValue } }
 * @returns {Object} 表单数据对象
 * 
 * 示例:
 * const data = Utils.batchGetFormData({
 *   customer_id: { id: 'orderCustomer', type: 'int', defaultValue: 0 },
 *   order_date: { id: 'orderDate', type: 'string', defaultValue: '' }
 * });
 */
window.Utils.batchGetFormData = function(fieldMap) {
    const result = {};
    
    Object.entries(fieldMap).forEach(([fieldName, config]) => {
        const { id, type = 'string', defaultValue = '' } = config;
        const rawValue = this.safeGetValue(id, defaultValue, { warnOnMissing: false });
        
        // 类型转换
        switch (type) {
            case 'int':
                result[fieldName] = parseInt(rawValue) || defaultValue;
                break;
            case 'float':
                result[fieldName] = parseFloat(rawValue) || defaultValue;
                break;
            case 'bool':
                result[fieldName] = Boolean(rawValue);
                break;
            case 'json':
                result[fieldName] = this.safeParseJSON(rawValue, defaultValue);
                break;
            default:
                result[fieldName] = rawValue;
        }
    });
    
    return result;
};

/**
 * 验证必填字段
 * @param {Object} data - 数据对象
 * @param {Array<string>} requiredFields - 必填字段名数组
 * @param {Object} fieldLabels - 字段中文名映射（可选）
 * @returns {Object} { valid: boolean, errors: Array<string>, missingFields: Array<string> }
 */
window.Utils.validateRequired = function(data, requiredFields, fieldLabels = {}) {
    const errors = [];
    const missingFields = [];
    
    requiredFields.forEach(field => {
        const value = data[field];
        const isEmpty = value === null || value === undefined || 
                       (typeof value === 'string' && value.trim() === '') ||
                       (typeof value === 'number' && isNaN(value));
        
        if (isEmpty) {
            const label = fieldLabels[field] || field;
            errors.push(`请填写${label}`);
            missingFields.push(field);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors,
        missingFields
    };
};

/**
 * 安全的API调用（统一错误处理 + 加载状态）
 * @param {Function} apiCall - API调用函数
 * @param {Object} options - 配置选项
 * @returns {Promise<any>} API结果或null
 */
window.Utils.safeApiCall = async function(apiCall, options = {}) {
    const {
        operationName = '操作',
        showLoading = false,
        loadingMessage = '加载中...',
        showSuccessNotification = false,
        successMessage = '操作成功',
        showErrorNotification = true,
        onSuccess = null,
        onError = null
    } = options;
    
    let loadingToast = null;
    
    try {
        // 显示加载提示
        if (showLoading && window.showNotification) {
            loadingToast = window.showNotification(loadingMessage, 'info');
        }
        
        // 执行API调用
        const result = await apiCall();
        
        // 隐藏加载提示
        if (loadingToast) {
            loadingToast.remove();
        }
        
        // 检查结果
        if (!result || !result.success) {
            throw new Error(result?.message || 'API返回失败');
        }
        
        // 成功通知
        if (showSuccessNotification && window.showNotification) {
            window.showNotification(successMessage, 'success');
        }
        
        // 成功回调
        if (typeof onSuccess === 'function') {
            onSuccess(result);
        }
        
        return result;
        
    } catch (error) {
        // 隐藏加载提示
        if (loadingToast) {
            loadingToast.remove();
        }
        
        // 错误处理
        console.error(`❌ ${operationName}失败:`, error);
        
        if (showErrorNotification && window.showNotification) {
            const errorMsg = `${operationName}失败: ${error.message}`;
            window.showNotification(errorMsg, 'error');
        }
        
        // 错误回调
        if (typeof onError === 'function') {
            onError(error);
        }
        
        return null;
    }
};

console.log('✅ utils.js v1.1 加载完成: 已增强防御性编程工具（safeGetValue, safeParseJSON, escapeHtml等）');
