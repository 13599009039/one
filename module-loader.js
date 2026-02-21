/**
 * ERP系统模块加载器
 * ERP System Module Loader
 */

class ModuleLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingQueue = [];
        this.dependencies = new Map();
    }
    
    /**
     * 加载模块
     */
    async loadModule(moduleName, modulePath, dependencies = []) {
        try {
            console.log(`📥 [ModuleLoader] 开始加载模块: ${moduleName}`);
            
            // 检查依赖
            for (const dep of dependencies) {
                if (!this.loadedModules.has(dep)) {
                    await this.loadModule(dep, this.getModulePath(dep));
                }
            }
            
            // 动态加载脚本
            await this.loadScript(modulePath);
            
            // 初始化模块
            const moduleInstance = this.initializeModule(moduleName);
            
            // 保存模块实例
            this.loadedModules.set(moduleName, moduleInstance);
            this.dependencies.set(moduleName, dependencies);
            
            console.log(`✅ [ModuleLoader] 模块加载成功: ${moduleName}`);
            return moduleInstance;
        } catch (error) {
            console.error(`❌ [ModuleLoader] 模块加载失败: ${moduleName}`, error);
            throw error;
        }
    }
    
    /**
     * 加载脚本文件
     */
    loadScript(scriptPath) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 初始化模块
     */
    initializeModule(moduleName) {
        // 根据模块名称获取对应的类
        const moduleClasses = {
            'ManagerCore': ManagerCore,
            'UserManager': UserManager,
            'PermissionControl': PermissionControl,
            'SystemConfig': SystemConfig,
            'LogisticsCore': LogisticsCore,
            'SFExpressProvider': SFExpressProvider,
            'InventoryCore': InventoryCore
        };
        
        const ModuleClass = moduleClasses[moduleName];
        if (ModuleClass) {
            return new ModuleClass();
        }
        
        throw new Error(`未找到模块类: ${moduleName}`);
    }
    
    /**
     * 获取模块路径
     */
    getModulePath(moduleName) {
        const pathMap = {
            'ManagerCore': '/Manager/manager-core.js',
            'UserManager': '/Manager/user-management.js',
            'PermissionControl': '/Manager/permission-control.js',
            'SystemConfig': '/Manager/system-config.js',
            'LogisticsCore': '/express logistics/core/logistics-core.js',
            'SFExpressProvider': '/express logistics/providers/sf-express.js',
            'InventoryCore': '/inventory/inventory-core.js'
        };
        
        return pathMap[moduleName] || `/modules/${moduleName.toLowerCase()}.js`;
    }
    
    /**
     * 检查模块是否已加载
     */
    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }
    
    /**
     * 获取已加载的模块
     */
    getModule(moduleName) {
        return this.loadedModules.get(moduleName);
    }
    
    /**
     * 获取所有已加载的模块
     */
    getAllModules() {
        return Array.from(this.loadedModules.entries());
    }
    
    /**
     * 卸载模块
     */
    unloadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            // 检查是否有其他模块依赖此模块
            const dependentModules = this.getDependentModules(moduleName);
            if (dependentModules.length > 0) {
                console.warn(`⚠️ [ModuleLoader] 模块 ${moduleName} 仍有依赖:`, dependentModules);
                return false;
            }
            
            this.loadedModules.delete(moduleName);
            this.dependencies.delete(moduleName);
            console.log(`📤 [ModuleLoader] 模块卸载成功: ${moduleName}`);
            return true;
        }
        return false;
    }
    
    /**
     * 获取依赖指定模块的模块列表
     */
    getDependentModules(moduleName) {
        const dependents = [];
        for (const [modName, deps] of this.dependencies) {
            if (deps.includes(moduleName)) {
                dependents.push(modName);
            }
        }
        return dependents;
    }
    
    /**
     * 批量加载模块
     */
    async loadModules(moduleList) {
        const results = [];
        
        for (const moduleInfo of moduleList) {
            try {
                const module = await this.loadModule(
                    moduleInfo.name,
                    moduleInfo.path,
                    moduleInfo.dependencies || []
                );
                results.push({
                    name: moduleInfo.name,
                    success: true,
                    module: module
                });
            } catch (error) {
                results.push({
                    name: moduleInfo.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * 获取模块依赖图
     */
    getDependencyGraph() {
        const graph = {};
        for (const [moduleName, deps] of this.dependencies) {
            graph[moduleName] = [...deps];
        }
        return graph;
    }
    
    /**
     * 检测循环依赖
     */
    detectCircularDependencies() {
        const visited = new Set();
        const recursionStack = new Set();
        const circularPaths = [];
        
        const dfs = (module, path) => {
            if (recursionStack.has(module)) {
                // 发现循环依赖
                circularPaths.push([...path, module]);
                return;
            }
            
            if (visited.has(module)) return;
            
            visited.add(module);
            recursionStack.add(module);
            path.push(module);
            
            const deps = this.dependencies.get(module) || [];
            for (const dep of deps) {
                dfs(dep, [...path]);
            }
            
            recursionStack.delete(module);
            path.pop();
        };
        
        for (const moduleName of this.dependencies.keys()) {
            if (!visited.has(moduleName)) {
                dfs(moduleName, []);
            }
        }
        
        return circularPaths;
    }
}

// 创建全局模块加载器实例
window.moduleLoader = new ModuleLoader();

// 系统初始化函数
window.initERPSystem = async function() {
    console.log('🚀 [ERP System] 开始初始化系统...');
    
    try {
        // 定义模块加载列表
        const modulesToLoad = [
            {
                name: 'ManagerCore',
                path: '/Manager/manager-core.js',
                dependencies: []
            },
            {
                name: 'UserManager',
                path: '/Manager/user-management.js',
                dependencies: ['ManagerCore']
            },
            {
                name: 'PermissionControl',
                path: '/Manager/permission-control.js',
                dependencies: ['ManagerCore']
            },
            {
                name: 'SystemConfig',
                path: '/Manager/system-config.js',
                dependencies: ['ManagerCore']
            },
            {
                name: 'LogisticsCore',
                path: '/express logistics/core/logistics-core.js',
                dependencies: []
            },
            {
                name: 'SFExpressProvider',
                path: '/express logistics/providers/sf-express.js',
                dependencies: ['LogisticsCore']
            },
            {
                name: 'InventoryCore',
                path: '/inventory/inventory-core.js',
                dependencies: []
            }
        ];
        
        // 加载所有模块
        const loadResults = await window.moduleLoader.loadModules(modulesToLoad);
        
        // 检查加载结果
        const failedModules = loadResults.filter(result => !result.success);
        if (failedModules.length > 0) {
            console.error('❌ [ERP System] 以下模块加载失败:', failedModules);
            throw new Error(`模块加载失败: ${failedModules.map(m => m.name).join(', ')}`);
        }
        
        // 初始化管理控制台
        const managerCore = window.moduleLoader.getModule('ManagerCore');
        if (managerCore) {
            window.managerCore = managerCore;
        }
        
        // 检测循环依赖
        const circularDeps = window.moduleLoader.detectCircularDependencies();
        if (circularDeps.length > 0) {
            console.warn('⚠️ [ERP System] 发现循环依赖:', circularDeps);
        }
        
        console.log('✅ [ERP System] 系统初始化完成');
        console.log('📊 [ERP System] 已加载模块:', window.moduleLoader.getAllModules().map(([name]) => name));
        
        return {
            success: true,
            loadedModules: loadResults.length,
            failedModules: failedModules.length
        };
    } catch (error) {
        console.error('❌ [ERP System] 系统初始化失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 页面加载完成后自动初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [ERP System] 页面加载完成，准备初始化系统...');
    
    // 延迟初始化以确保所有资源加载完成
    setTimeout(async () => {
        const result = await window.initERPSystem();
        if (result.success) {
            console.log('🎉 [ERP System] ERP系统启动成功！');
        } else {
            console.error('💥 [ERP System] ERP系统启动失败！', result.error);
        }
    }, 1000);
});

console.log('📥 [ModuleLoader] 模块加载器已准备就绪');