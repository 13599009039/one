// 安全工具函数库 - 防御性编程工具集
// v1.0.0 - 2026-02-13
// 用途：提供DOM操作、JSON解析、HTML清理等安全工具函数

(function() {
    'use strict';

    /**
     * 安全获取DOM元素
     * @param {string} id - 元素ID
     * @param {string} context - 调用上下文（用于日志）
     * @returns {HTMLElement|null} - 元素或null
     */
    function safeGetElement(id, context = '') {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`[SafeUtils] ⚠️ 元素未找到: #${id}${context ? ' (来自: ' + context + ')' : ''}`);
        }
        return element;
    }

    /**
     * 安全获取元素值
     * @param {string} id - 元素ID
     * @param {string} defaultValue - 默认值
     * @returns {string} - 元素值或默认值
     */
    function safeGetValue(id, defaultValue = '') {
        const element = safeGetElement(id);
        return element ? (element.value || defaultValue) : defaultValue;
    }

    /**
     * 安全设置元素值
     * @param {string} id - 元素ID
     * @param {*} value - 要设置的值
     * @returns {boolean} - 是否成功
     */
    function safeSetValue(id, value) {
        const element = safeGetElement(id);
        if (element) {
            element.value = value;
            return true;
        }
        return false;
    }

    /**
     * 安全设置元素文本内容
     * @param {string} id - 元素ID
     * @param {string} text - 文本内容
     * @returns {boolean} - 是否成功
     */
    function safeSetText(id, text) {
        const element = safeGetElement(id);
        if (element) {
            element.textContent = text;
            return true;
        }
        return false;
    }

    /**
     * 安全JSON解析
     * @param {string} jsonString - JSON字符串
     * @param {*} defaultValue - 解析失败时的默认值
     * @param {string} context - 调用上下文（用于日志）
     * @returns {*} - 解析结果或默认值
     */
    function safeJSONParse(jsonString, defaultValue = null, context = '') {
        if (!jsonString) {
            return defaultValue;
        }

        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error(`[SafeUtils] ❌ JSON解析失败${context ? ' (' + context + ')' : ''}:`, error);
            return defaultValue;
        }
    }

    /**
     * 安全JSON序列化
     * @param {*} obj - 要序列化的对象
     * @param {string} defaultValue - 序列化失败时的默认值
     * @param {string} context - 调用上下文（用于日志）
     * @returns {string} - JSON字符串或默认值
     */
    function safeJSONStringify(obj, defaultValue = '{}', context = '') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.error(`[SafeUtils] ❌ JSON序列化失败${context ? ' (' + context + ')' : ''}:`, error);
            return defaultValue;
        }
    }

    /**
     * HTML转义（防XSS）
     * @param {string} unsafe - 不安全的字符串
     * @returns {string} - 转义后的字符串
     */
    function escapeHTML(unsafe) {
        if (typeof unsafe !== 'string') {
            return String(unsafe);
        }

        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 清理HTML标签（只保留纯文本）
     * @param {string} html - HTML字符串
     * @returns {string} - 纯文本
     */
    function stripHTML(html) {
        if (typeof html !== 'string') {
            return '';
        }

        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * 安全的innerHTML设置（自动转义）
     * @param {string} id - 元素ID
     * @param {string} html - HTML内容
     * @param {boolean} escape - 是否转义（默认true）
     * @returns {boolean} - 是否成功
     */
    function safeSetHTML(id, html, escape = true) {
        const element = safeGetElement(id);
        if (element) {
            element.innerHTML = escape ? escapeHTML(html) : html;
            return true;
        }
        return false;
    }

    /**
     * 安全添加事件监听器
     * @param {string} id - 元素ID
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {string} context - 调用上下文（用于日志）
     * @returns {boolean} - 是否成功
     */
    function safeAddEventListener(id, eventType, handler, context = '') {
        const element = safeGetElement(id, context);
        if (element && typeof handler === 'function') {
            element.addEventListener(eventType, handler);
            return true;
        }
        if (element && typeof handler !== 'function') {
            console.error(`[SafeUtils] ❌ 事件处理器不是函数: #${id} ${eventType}${context ? ' (' + context + ')' : ''}`);
        }
        return false;
    }

    /**
     * 安全API调用包装器
     * @param {Function} apiFunction - API调用函数
     * @param {Array} args - 函数参数
     * @param {string} errorMessage - 错误提示信息
     * @returns {Promise} - API调用结果
     */
    async function safeAPICall(apiFunction, args = [], errorMessage = '操作失败，请稍后重试') {
        try {
            const result = await apiFunction(...args);
            return result;
        } catch (error) {
            console.error('[SafeUtils] ❌ API调用失败:', error);
            alert(errorMessage + '（详细错误请查看控制台）');
            throw error;
        }
    }

    /**
     * 数字验证和转换
     * @param {*} value - 要验证的值
     * @param {number} defaultValue - 默认值
     * @returns {number} - 数字或默认值
     */
    function safeNumber(value, defaultValue = 0) {
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    }

    /**
     * 安全数组访问
     * @param {Array} arr - 数组
     * @param {number} index - 索引
     * @param {*} defaultValue - 默认值
     * @returns {*} - 数组元素或默认值
     */
    function safeArrayGet(arr, index, defaultValue = null) {
        if (!Array.isArray(arr)) {
            return defaultValue;
        }
        return arr[index] !== undefined ? arr[index] : defaultValue;
    }

    /**
     * 安全对象属性访问
     * @param {Object} obj - 对象
     * @param {string} path - 属性路径（支持点号）如 'user.name'
     * @param {*} defaultValue - 默认值
     * @returns {*} - 属性值或默认值
     */
    function safeObjectGet(obj, path, defaultValue = null) {
        if (!obj || typeof obj !== 'object') {
            return defaultValue;
        }

        const keys = path.split('.');
        let result = obj;

        for (const key of keys) {
            if (result === null || result === undefined) {
                return defaultValue;
            }
            result = result[key];
        }

        return result !== undefined ? result : defaultValue;
    }

    /**
     * 日期格式化（YYYY-MM-DD）
     * @param {Date|string|number} date - 日期对象、字符串或时间戳
     * @returns {string} - 格式化后的日期字符串
     */
    function formatDate(date) {
        try {
            const d = date instanceof Date ? date : new Date(date);
            if (isNaN(d.getTime())) {
                return '';
            }
            return d.toISOString().split('T')[0];
        } catch (error) {
            console.error('[SafeUtils] ❌ 日期格式化失败:', error);
            return '';
        }
    }

    /**
     * 日期时间格式化（YYYY-MM-DD HH:mm:ss）
     * @param {Date|string|number} date - 日期对象、字符串或时间戳
     * @returns {string} - 格式化后的日期时间字符串
     */
    function formatDateTime(date) {
        try {
            const d = date instanceof Date ? date : new Date(date);
            if (isNaN(d.getTime())) {
                return '';
            }
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error('[SafeUtils] ❌ 日期时间格式化失败:', error);
            return '';
        }
    }

    /**
     * 金额格式化
     * @param {number} amount - 金额
     * @param {number} decimals - 小数位数（默认2位）
     * @returns {string} - 格式化后的金额字符串
     */
    function formatMoney(amount, decimals = 2) {
        const num = safeNumber(amount, 0);
        return num.toFixed(decimals);
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} - 防抖后的函数
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
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 时间限制（毫秒）
     * @returns {Function} - 节流后的函数
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

    // 导出所有工具函数到window对象
    window.SafeUtils = {
        // DOM操作
        safeGetElement,
        safeGetValue,
        safeSetValue,
        safeSetText,
        safeSetHTML,
        safeAddEventListener,

        // JSON操作
        safeJSONParse,
        safeJSONStringify,

        // HTML清理
        escapeHTML,
        stripHTML,

        // API调用
        safeAPICall,

        // 数据验证
        safeNumber,
        safeArrayGet,
        safeObjectGet,

        // 格式化
        formatDate,
        formatDateTime,
        formatMoney,

        // 性能优化
        debounce,
        throttle
    };

    console.log('[SafeUtils] ✅ 安全工具函数库已加载');

})();
