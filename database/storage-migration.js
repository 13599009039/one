/**
 * localStorage到数据库迁移工具
 * Migration Tool from localStorage to Database
 */

class StorageMigration {
    constructor() {
        this.migrationMap = {
            'ajkuaiji_data': 'userData',
            'configurationData': 'configuration',
            'categories_data': 'categories',
            'sidebarCollapsed': 'uiState'
        };
        
        this.migrationStats = {
            totalItems: 0,
            migratedItems: 0,
            failedItems: 0,
            skippedItems: 0
        };
    }
    
    /**
     * 执行完整迁移
     */
    async executeMigration() {
        console.log('🚀 [StorageMigration] 开始执行localStorage迁移...');
        
        // 检查数据库管理器是否可用
        if (!window.databaseManager || !window.databaseManager.isInitialized) {
            console.error('❌ [StorageMigration] 数据库管理器未初始化');
            return false;
        }
        
        // 1. 迁移用户数据
        await this.migrateUserData();
        
        // 2. 迁移配置数据
        await this.migrateConfigurationData();
        
        // 3. 迁移分类数据
        await this.migrateCategoriesData();
        
        // 4. 迁移UI状态
        await this.migrateUIState();
        
        // 5. 迁移物流配置
        await this.migrateLogisticsLinkage();
        
        // 6. 清理localStorage（可选）
        // await this.cleanupLocalStorage();
        
        this.generateMigrationReport();
        return true;
    }
    
    /**
     * 迁移用户数据
     */
    async migrateUserData() {
        console.log('📋 [StorageMigration] 迁移用户数据...');
        
        try {
            const savedData = localStorage.getItem('ajkuaiji_data');
            if (savedData) {
                const userData = JSON.parse(savedData);
                const result = await window.databaseManager.saveUserData(userData);
                
                if (result) {
                    this.migrationStats.migratedItems++;
                    console.log('✅ 用户数据迁移成功');
                } else {
                    this.migrationStats.failedItems++;
                    console.error('❌ 用户数据迁移失败');
                }
            } else {
                this.migrationStats.skippedItems++;
                console.log('⏭️  无用户数据需要迁移');
            }
        } catch (error) {
            this.migrationStats.failedItems++;
            console.error('❌ 迁移用户数据时出错:', error);
        }
        
        this.migrationStats.totalItems++;
    }
    
    /**
     * 迁移配置数据
     */
    async migrateConfigurationData() {
        console.log('⚙️  [StorageMigration] 迁移配置数据...');
        
        try {
            const configData = localStorage.getItem('configurationData');
            if (configData) {
                const config = JSON.parse(configData);
                const result = await window.databaseManager.saveConfiguration(config);
                
                if (result) {
                    this.migrationStats.migratedItems++;
                    console.log('✅ 配置数据迁移成功');
                } else {
                    this.migrationStats.failedItems++;
                    console.error('❌ 配置数据迁移失败');
                }
            } else {
                this.migrationStats.skippedItems++;
                console.log('⏭️  无配置数据需要迁移');
            }
        } catch (error) {
            this.migrationStats.failedItems++;
            console.error('❌ 迁移配置数据时出错:', error);
        }
        
        this.migrationStats.totalItems++;
    }
    
    /**
     * 迁移分类数据
     */
    async migrateCategoriesData() {
        console.log('📂 [StorageMigration] 迁移分类数据...');
        
        try {
            const categoriesData = localStorage.getItem('categories_data');
            if (categoriesData) {
                const categories = JSON.parse(categoriesData);
                const result = await window.databaseManager.saveCategories(categories);
                
                if (result) {
                    this.migrationStats.migratedItems++;
                    console.log('✅ 分类数据迁移成功');
                } else {
                    this.migrationStats.failedItems++;
                    console.error('❌ 分类数据迁移失败');
                }
            } else {
                this.migrationStats.skippedItems++;
                console.log('⏭️  无分类数据需要迁移');
            }
        } catch (error) {
            this.migrationStats.failedItems++;
            console.error('❌ 迁移分类数据时出错:', error);
        }
        
        this.migrationStats.totalItems++;
    }
    
    /**
     * 迁移UI状态
     */
    async migrateUIState() {
        console.log('🖥️  [StorageMigration] 迁移UI状态...');
        
        try {
            const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
            if (sidebarCollapsed !== null) {
                const uiState = {
                    sidebarCollapsed: sidebarCollapsed === 'true'
                };
                
                // 这里应该有一个专门的UI状态API
                // 暂时保存到配置中
                const config = await window.databaseManager.getConfiguration();
                config.uiState = uiState;
                const result = await window.databaseManager.saveConfiguration(config);
                
                if (result) {
                    this.migrationStats.migratedItems++;
                    console.log('✅ UI状态迁移成功');
                } else {
                    this.migrationStats.failedItems++;
                    console.error('❌ UI状态迁移失败');
                }
            } else {
                this.migrationStats.skippedItems++;
                console.log('⏭️  无UI状态需要迁移');
            }
        } catch (error) {
            this.migrationStats.failedItems++;
            console.error('❌ 迁移UI状态时出错:', error);
        }
        
        this.migrationStats.totalItems++;
    }
    
    /**
     * 迁移物流配置链接
     */
    async migrateLogisticsLinkage() {
        console.log('🚚 [StorageMigration] 迁移物流配置链接...');
        
        try {
            // 查找所有物流相关的localStorage键
            const linkageKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('linkage_')) {
                    linkageKeys.push(key);
                }
            }
            
            if (linkageKeys.length > 0) {
                for (const key of linkageKeys) {
                    const configId = key.replace('linkage_', '');
                    const value = localStorage.getItem(key);
                    
                    const result = await window.databaseManager.saveLogisticsLinkage(configId, value);
                    
                    if (result) {
                        this.migrationStats.migratedItems++;
                        console.log(`✅ 物流配置 ${configId} 迁移成功`);
                    } else {
                        this.migrationStats.failedItems++;
                        console.error(`❌ 物流配置 ${configId} 迁移失败`);
                    }
                }
            } else {
                this.migrationStats.skippedItems++;
                console.log('⏭️  无物流配置需要迁移');
            }
        } catch (error) {
            this.migrationStats.failedItems++;
            console.error('❌ 迁移物流配置时出错:', error);
        }
        
        this.migrationStats.totalItems++;
    }
    
    /**
     * 清理localStorage（谨慎使用）
     */
    async cleanupLocalStorage() {
        console.log('🧹 [StorageMigration] 清理localStorage...');
        
        const keysToKeep = [
            // 可以添加需要保留的键
        ];
        
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && !keysToKeep.includes(key)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log(`✅ 清理了 ${keysToRemove.length} 个localStorage项`);
        } catch (error) {
            console.error('❌ 清理localStorage时出错:', error);
        }
    }
    
    /**
     * 生成迁移报告
     */
    generateMigrationReport() {
        console.log('\n📊 [StorageMigration] 迁移报告');
        console.log('========================');
        console.log(`总项目数: ${this.migrationStats.totalItems}`);
        console.log(`成功迁移: ${this.migrationStats.migratedItems}`);
        console.log(`迁移失败: ${this.migrationStats.failedItems}`);
        console.log(`跳过项目: ${this.migrationStats.skippedItems}`);
        console.log(`成功率: ${((this.migrationStats.migratedItems / this.migrationStats.totalItems) * 100).toFixed(1)}%`);
        
        if (this.migrationStats.failedItems > 0) {
            console.warn('⚠️  部分数据迁移失败，请手动检查');
        } else {
            console.log('🎉 所有数据迁移完成！');
        }
    }
    
    /**
     * 验证迁移结果
     */
    async verifyMigration() {
        console.log('🔍 [StorageMigration] 验证迁移结果...');
        
        const verificationResults = {
            userData: false,
            configuration: false,
            categories: false,
            uiState: false
        };
        
        try {
            // 验证用户数据
            const userData = await window.databaseManager.getUserData();
            verificationResults.userData = userData !== null;
            
            // 验证配置数据
            const config = await window.databaseManager.getConfiguration();
            verificationResults.configuration = config !== null;
            
            // 验证分类数据
            const categories = await window.databaseManager.getCategories();
            verificationResults.categories = categories !== null;
            
            // 验证UI状态
            const uiConfig = await window.databaseManager.getConfiguration();
            verificationResults.uiState = uiConfig.uiState !== undefined;
            
        } catch (error) {
            console.error('❌ 验证迁移结果时出错:', error);
        }
        
        console.log('验证结果:', verificationResults);
        return verificationResults;
    }
}

// 创建迁移工具实例
window.storageMigration = new StorageMigration();

// 提供全局迁移函数
window.migrateLocalStorageToDatabase = async function() {
    const migration = new StorageMigration();
    await migration.executeMigration();
    return await migration.verifyMigration();
};

console.log('🔄 [StorageMigration] 存储迁移工具已加载');
console.log('💡 使用 migrateLocalStorageToDatabase() 执行迁移');