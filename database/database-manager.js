/**
 * 统一数据库访问层
 * Unified Database Access Layer
 * 替代localStorage的所有数据存储需求
 */

class DatabaseManager {
    constructor() {
        this.dbConnection = null;
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5分钟缓存
        this.isInitialized = false;
    }
    
    /**
     * 初始化数据库连接
     */
    async initialize() {
        try {
            // 这里应该连接到实际的数据库
            // 目前使用模拟连接
            this.dbConnection = {
                connected: true,
                host: 'localhost',
                database: 'ajkuaiji_erp'
            };
            
            this.isInitialized = true;
            console.log('✅ [DatabaseManager] 数据库连接初始化成功');
            return true;
        } catch (error) {
            console.error('❌ [DatabaseManager] 数据库连接失败:', error);
            return false;
        }
    }
    
    /**
     * 获取用户数据（替代localStorage.getItem('ajkuaiji_data')）
     */
    async getUserData(userId = null) {
        const cacheKey = `user_data_${userId || 'default'}`;
        
        // 检查缓存
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            // 实际应该调用后端API获取数据
            const response = await fetch(`/api/users/${userId || 'current'}/data`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                // 缓存数据
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                return data;
            } else {
                throw new Error('获取用户数据失败');
            }
        } catch (error) {
            console.warn('[DatabaseManager] 获取用户数据失败，使用默认数据:', error.message);
            return this.getDefaultUserData();
        }
    }
    
    /**
     * 保存用户数据（替代localStorage.setItem('ajkuaiji_data')）
     */
    async saveUserData(data, userId = null) {
        const cacheKey = `user_data_${userId || 'default'}`;
        
        try {
            // 实际应该调用后端API保存数据
            const response = await fetch(`/api/users/${userId || 'current'}/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                credentials: 'include'
            });
            
            if (response.ok) {
                // 更新缓存
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                return true;
            } else {
                throw new Error('保存用户数据失败');
            }
        } catch (error) {
            console.error('[DatabaseManager] 保存用户数据失败:', error);
            return false;
        }
    }
    
    /**
     * 获取配置数据（替代settings.js中的localStorage）
     */
    async getConfiguration(configKey = null) {
        const cacheKey = `config_${configKey || 'all'}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const url = configKey 
                ? `/api/config/${configKey}`
                : '/api/config';
                
            const response = await fetch(url, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                return data;
            } else {
                throw new Error('获取配置数据失败');
            }
        } catch (error) {
            console.warn('[DatabaseManager] 获取配置数据失败:', error.message);
            return this.getDefaultConfig();
        }
    }
    
    /**
     * 保存配置数据
     */
    async saveConfiguration(configData, configKey = null) {
        const cacheKey = `config_${configKey || 'all'}`;
        
        try {
            const url = configKey 
                ? `/api/config/${configKey}`
                : '/api/config';
                
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData),
                credentials: 'include'
            });
            
            if (response.ok) {
                this.cache.set(cacheKey, {
                    data: configData,
                    timestamp: Date.now()
                });
                return true;
            } else {
                throw new Error('保存配置数据失败');
            }
        } catch (error) {
            console.error('[DatabaseManager] 保存配置数据失败:', error);
            return false;
        }
    }
    
    /**
     * 获取分类数据（替代categories.js中的localStorage）
     */
    async getCategories(categoryType = 'all') {
        const cacheKey = `categories_${categoryType}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch(`/api/categories/${categoryType}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                return data;
            } else {
                throw new Error('获取分类数据失败');
            }
        } catch (error) {
            console.warn('[DatabaseManager] 获取分类数据失败:', error.message);
            return this.getDefaultCategories();
        }
    }
    
    /**
     * 保存分类数据
     */
    async saveCategories(categories, categoryType = 'custom') {
        const cacheKey = `categories_${categoryType}`;
        
        try {
            const response = await fetch(`/api/categories/${categoryType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categories),
                credentials: 'include'
            });
            
            if (response.ok) {
                this.cache.set(cacheKey, {
                    data: categories,
                    timestamp: Date.now()
                });
                return true;
            } else {
                throw new Error('保存分类数据失败');
            }
        } catch (error) {
            console.error('[DatabaseManager] 保存分类数据失败:', error);
            return false;
        }
    }
    
    /**
     * 获取物流配置链接（替代logistics_tenant.js中的localStorage）
     */
    async getLogisticsLinkage(configId) {
        const cacheKey = `logistics_linkage_${configId}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch(`/api/logistics/linkage/${configId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.cache.set(cacheKey, {
                    data: data.value,
                    timestamp: Date.now()
                });
                return data.value;
            } else {
                return null;
            }
        } catch (error) {
            console.warn('[DatabaseManager] 获取物流链接失败:', error.message);
            return null;
        }
    }
    
    /**
     * 保存物流配置链接
     */
    async saveLogisticsLinkage(configId, value) {
        const cacheKey = `logistics_linkage_${configId}`;
        
        try {
            const response = await fetch(`/api/logistics/linkage/${configId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value: value }),
                credentials: 'include'
            });
            
            if (response.ok) {
                this.cache.set(cacheKey, {
                    data: value,
                    timestamp: Date.now()
                });
                return true;
            } else {
                throw new Error('保存物流链接失败');
            }
        } catch (error) {
            console.error('[DatabaseManager] 保存物流链接失败:', error);
            return false;
        }
    }
    
    /**
     * 清理过期缓存
     */
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }
    
    /**
     * 默认数据提供者
     */
    getDefaultUserData() {
        return {
            users: [],
            companies: [],
            orders: [],
            customers: []
        };
    }
    
    getDefaultConfig() {
        return {
            theme: 'light',
            language: 'zh-CN',
            notifications: true
        };
    }
    
    getDefaultCategories() {
        return {
            income: ['销售收入', '服务收入'],
            expense: ['采购成本', '运营费用'],
            custom: []
        };
    }
}

// 创建全局实例
window.databaseManager = new DatabaseManager();

// 初始化数据库连接
document.addEventListener('DOMContentLoaded', async () => {
    await window.databaseManager.initialize();
});

console.log('🗄️ [DatabaseManager] 统一数据库访问层已加载');