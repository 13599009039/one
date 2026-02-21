/**
 * 管理控制台核心模块
 * Manager Core Module
 * 版本: 1.0.0
 */

class ManagerCore {
    constructor() {
        this.modules = new Map();
        this.eventBus = new EventBus();
        this.config = {
            debug: false,
            autoLoad: true,
            modulePath: '/Manager/'
        };
        
        this.init();
    }
    
    /**
     * 初始化管理控制台
     */
    init() {
        console.log('🔧 [ManagerCore] 初始化管理控制台...');
        
        // 注册核心模块
        this.registerModule('userManager', new UserManager());
        this.registerModule('permissionControl', new PermissionControl());
        this.registerModule('systemConfig', new SystemConfig());
        
        // 初始化事件监听
        this.setupEventListeners();
        
        // 自动加载模块
        if (this.config.autoLoad) {
            this.loadAllModules();
        }
        
        console.log('✅ [ManagerCore] 管理控制台初始化完成');
    }
    
    /**
     * 注册模块
     */
    registerModule(name, moduleInstance) {
        this.modules.set(name, moduleInstance);
        console.log(`📦 [ManagerCore] 模块注册: ${name}`);
    }
    
    /**
     * 获取模块实例
     */
    getModule(name) {
        return this.modules.get(name);
    }
    
    /**
     * 加载所有模块
     */
    loadAllModules() {
        for (const [name, module] of this.modules) {
            if (typeof module.init === 'function') {
                try {
                    module.init();
                    console.log(`✅ [ManagerCore] 模块加载: ${name}`);
                } catch (error) {
                    console.error(`❌ [ManagerCore] 模块加载失败: ${name}`, error);
                }
            }
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 用户管理相关事件
        this.eventBus.on('user.created', (userData) => {
            this.handleUserCreated(userData);
        });
        
        this.eventBus.on('user.updated', (userData) => {
            this.handleUserUpdated(userData);
        });
        
        // 权限变更事件
        this.eventBus.on('permission.changed', (permissionData) => {
            this.handlePermissionChanged(permissionData);
        });
        
        // 系统配置事件
        this.eventBus.on('config.updated', (configData) => {
            this.handleConfigUpdated(configData);
        });
    }
    
    // 事件处理器
    handleUserCreated(userData) {
        console.log('[ManagerCore] 处理用户创建事件:', userData);
        // 可以在这里添加额外的业务逻辑
    }
    
    handleUserUpdated(userData) {
        console.log('[ManagerCore] 处理用户更新事件:', userData);
    }
    
    handlePermissionChanged(permissionData) {
        console.log('[ManagerCore] 处理权限变更事件:', permissionData);
    }
    
    handleConfigUpdated(configData) {
        console.log('[ManagerCore] 处理配置更新事件:', configData);
        // 更新本地配置缓存
        Object.assign(this.config, configData);
    }
}

// 事件总线类
class EventBus {
    constructor() {
        this.events = {};
    }
    
    /**
     * 订阅事件
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }
    
    /**
     * 发布事件
     */
    emit(eventName, data) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(callback => {
                callback(data);
            });
        }
    }
    
    /**
     * 取消订阅
     */
    off(eventName, callback) {
        if (this.events[eventName]) {
            const index = this.events[eventName].indexOf(callback);
            if (index > -1) {
                this.events[eventName].splice(index, 1);
            }
        }
    }
}

// 全局导出
window.ManagerCore = ManagerCore;
window.EventBus = EventBus;

console.log('📦 [ManagerCore] 模块加载完成');