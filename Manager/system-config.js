/**
 * 系统配置管理模块
 * System Configuration Module
 */

class SystemConfig {
    constructor() {
        this.config = new Map();
        this.systemSettings = {};
        this.companySettings = {};
    }
    
    /**
     * 初始化系统配置模块
     */
    init() {
        console.log('⚙️ [SystemConfig] 初始化系统配置模块...');
        this.loadSystemConfig();
        this.loadCompanySettings();
        this.setupEventListeners();
    }
    
    /**
     * 加载系统配置
     */
    async loadSystemConfig() {
        try {
            const response = await fetch('/api/system/config', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                this.systemSettings = result.data;
                console.log('⚙️ [SystemConfig] 系统配置加载成功');
            }
        } catch (error) {
            console.error('⚙️ [SystemConfig] 加载系统配置失败:', error);
        }
    }
    
    /**
     * 加载公司设置
     */
    async loadCompanySettings() {
        try {
            const companyId = this.getCurrentCompanyId();
            if (!companyId) return;
            
            const response = await fetch(`/api/companies/${companyId}/settings`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                this.companySettings = result.data;
                console.log('⚙️ [SystemConfig] 公司设置加载成功');
            }
        } catch (error) {
            console.error('⚙️ [SystemConfig] 加载公司设置失败:', error);
        }
    }
    
    /**
     * 获取配置值
     */
    getConfig(key, defaultValue = null) {
        return this.config.get(key) || defaultValue;
    }
    
    /**
     * 设置配置值
     */
    setConfig(key, value) {
        this.config.set(key, value);
    }
    
    /**
     * 更新系统配置
     */
    async updateSystemConfig(configData) {
        try {
            const response = await fetch('/api/system/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新本地缓存
                Object.assign(this.systemSettings, configData);
                
                // 发布配置更新事件
                window.managerCore?.eventBus.emit('config.updated', configData);
                
                console.log('⚙️ [SystemConfig] 系统配置更新成功');
                return result;
            } else {
                throw new Error(result.message || '配置更新失败');
            }
        } catch (error) {
            console.error('⚙️ [SystemConfig] 系统配置更新失败:', error);
            throw error;
        }
    }
    
    /**
     * 更新公司设置
     */
    async updateCompanySettings(settingsData) {
        try {
            const companyId = this.getCurrentCompanyId();
            if (!companyId) {
                throw new Error('未选择公司');
            }
            
            const response = await fetch(`/api/companies/${companyId}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新本地缓存
                Object.assign(this.companySettings, settingsData);
                
                // 发布配置更新事件
                window.managerCore?.eventBus.emit('config.updated', {
                    company_id: companyId,
                    settings: settingsData
                });
                
                console.log('⚙️ [SystemConfig] 公司设置更新成功');
                return result;
            } else {
                throw new Error(result.message || '设置更新失败');
            }
        } catch (error) {
            console.error('⚙️ [SystemConfig] 公司设置更新失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取当前公司ID
     */
    getCurrentCompanyId() {
        // 从session或全局状态获取当前公司ID
        return window.currentCompanyId || sessionStorage.getItem('currentCompanyId');
    }
    
    /**
     * 获取系统设置
     */
    getSystemSettings() {
        return { ...this.systemSettings };
    }
    
    /**
     * 获取公司设置
     */
    getCompanySettings() {
        return { ...this.companySettings };
    }
    
    /**
     * 获取特定模块的配置
     */
    getModuleConfig(moduleName) {
        const moduleConfigs = {
            order: this.getOrderModuleConfig(),
            inventory: this.getInventoryModuleConfig(),
            finance: this.getFinanceModuleConfig(),
            customer: this.getCustomerModuleConfig()
        };
        
        return moduleConfigs[moduleName] || {};
    }
    
    /**
     * 订单模块配置
     */
    getOrderModuleConfig() {
        return {
            enableAftersale: this.systemSettings.enable_aftersale_orders || true,
            defaultPaymentTerm: this.companySettings.default_payment_term || 30,
            orderPrefix: this.companySettings.order_prefix || 'ORD',
            enablePartialRefund: this.systemSettings.enable_partial_refund || true
        };
    }
    
    /**
     * 库存模块配置
     */
    getInventoryModuleConfig() {
        return {
            enableStockWarning: this.systemSettings.enable_stock_warning || true,
            defaultMinStock: this.companySettings.default_min_stock || 5,
            enableBatchManagement: this.systemSettings.enable_batch_management || false,
            autoGenerateSKU: this.systemSettings.auto_generate_sku || true
        };
    }
    
    /**
     * 财务模块配置
     */
    getFinanceModuleConfig() {
        return {
            enableMultiCurrency: this.systemSettings.enable_multi_currency || false,
            defaultCurrency: this.companySettings.default_currency || 'CNY',
            enableAuditTrail: this.systemSettings.enable_audit_trail || true,
            autoGenerateVoucher: this.systemSettings.auto_generate_voucher || false
        };
    }
    
    /**
     * 客户模块配置
     */
    getCustomerModuleConfig() {
        return {
            enableCustomerLevel: this.systemSettings.enable_customer_level || true,
            defaultCustomerLevel: this.companySettings.default_customer_level || 'regular',
            enableCreditLimit: this.systemSettings.enable_credit_limit || false,
            autoSyncCustomerInfo: this.systemSettings.auto_sync_customer_info || true
        };
    }
    
    /**
     * 验证配置数据
     */
    validateConfig(configData) {
        const errors = [];
        
        // 验证必要字段
        if (configData.company_name && configData.company_name.length > 100) {
            errors.push('公司名称长度不能超过100字符');
        }
        
        if (configData.default_payment_term && 
            (isNaN(configData.default_payment_term) || configData.default_payment_term < 0)) {
            errors.push('默认付款期限必须是非负数字');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * 重置配置到默认值
     */
    async resetToDefaults() {
        try {
            const response = await fetch('/api/system/config/reset', {
                method: 'POST',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 重新加载配置
                await this.loadSystemConfig();
                await this.loadCompanySettings();
                
                console.log('⚙️ [SystemConfig] 配置重置成功');
                return result;
            } else {
                throw new Error(result.message || '配置重置失败');
            }
        } catch (error) {
            console.error('⚙️ [SystemConfig] 配置重置失败:', error);
            throw error;
        }
    }
    
    /**
     * 导出配置
     */
    exportConfig() {
        return {
            system: this.getSystemSettings(),
            company: this.getCompanySettings(),
            custom: Object.fromEntries(this.config)
        };
    }
    
    /**
     * 导入配置
     */
    async importConfig(configData) {
        try {
            const response = await fetch('/api/system/config/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 重新加载配置
                await this.loadSystemConfig();
                await this.loadCompanySettings();
                
                console.log('⚙️ [SystemConfig] 配置导入成功');
                return result;
            } else {
                throw new Error(result.message || '配置导入失败');
            }
        } catch (error) {
            console.error('⚙️ [SystemConfig] 配置导入失败:', error);
            throw error;
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听公司切换事件
        window.addEventListener('companySwitched', (event) => {
            this.handleCompanySwitched(event.detail.companyId);
        });
    }
    
    // 事件处理器
    handleCompanySwitched(companyId) {
        console.log('⚙️ [SystemConfig] 处理公司切换事件:', companyId);
        // 重新加载该公司设置
        this.loadCompanySettings();
    }
}

// 全局导出
window.SystemConfig = SystemConfig;

console.log('⚙️ [SystemConfig] 模块加载完成');