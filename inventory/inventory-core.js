/**
 * 进销存核心模块
 * Inventory Core Module
 */

class InventoryCore {
    constructor() {
        this.modules = new Map();
        this.products = new Map();
        this.stockLevels = new Map();
        this.transactions = [];
        this.config = {
            enableAutoReorder: true,
            defaultMinStock: 5,
            autoSync: true
        };
    }
    
    /**
     * 初始化进销存核心模块
     */
    init() {
        console.log('📦 [InventoryCore] 初始化进销存核心模块...');
        
        // 初始化各个子模块
        this.initModules();
        
        // 加载基础数据
        this.loadProducts();
        this.loadStockLevels();
        
        // 设置自动同步
        if (this.config.autoSync) {
            this.setupAutoSync();
        }
        
        console.log('✅ [InventoryCore] 进销存核心模块初始化完成');
    }
    
    /**
     * 初始化子模块
     */
    initModules() {
        this.modules.set('stock', new StockManagement());
        this.modules.set('purchase', new PurchaseOrders());
        this.modules.set('sales', new SalesOrders());
        this.modules.set('suppliers', new SupplierManagement());
        this.modules.set('reporting', new InventoryReporting());
        
        console.log(`📦 [InventoryCore] 已初始化 ${this.modules.size} 个子模块`);
    }
    
    /**
     * 加载产品数据
     */
    async loadProducts() {
        try {
            const response = await fetch('/api/products', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                result.data.forEach(product => {
                    this.products.set(product.id, product);
                });
                console.log(`📦 [InventoryCore] 加载产品数据: ${this.products.size} 个产品`);
            }
        } catch (error) {
            console.error('📦 [InventoryCore] 加载产品数据失败:', error);
        }
    }
    
    /**
     * 加载库存水平数据
     */
    async loadStockLevels() {
        try {
            const response = await fetch('/api/inventory/levels', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                result.data.forEach(level => {
                    this.stockLevels.set(level.product_id, level);
                });
                console.log(`📦 [InventoryCore] 加载库存水平: ${this.stockLevels.size} 个产品`);
            }
        } catch (error) {
            console.error('📦 [InventoryCore] 加载库存水平失败:', error);
        }
    }
    
    /**
     * 获取产品信息
     */
    getProduct(productId) {
        return this.products.get(productId);
    }
    
    /**
     * 获取库存水平
     */
    getStockLevel(productId) {
        return this.stockLevels.get(productId);
    }
    
    /**
     * 获取所有产品
     */
    getAllProducts() {
        return Array.from(this.products.values());
    }
    
    /**
     * 获取低库存产品
     */
    getLowStockProducts() {
        const lowStockProducts = [];
        
        for (const [productId, stockLevel] of this.stockLevels) {
            const product = this.getProduct(productId);
            const minStock = product?.min_stock || this.config.defaultMinStock;
            
            if (stockLevel.current_stock <= minStock) {
                lowStockProducts.push({
                    product: product,
                    stock_level: stockLevel,
                    min_stock: minStock,
                    shortage: minStock - stockLevel.current_stock
                });
            }
        }
        
        return lowStockProducts;
    }
    
    /**
     * 更新库存
     */
    async updateStock(productId, quantityChange, transactionType, referenceId = null) {
        try {
            const product = this.getProduct(productId);
            if (!product) {
                throw new Error(`产品不存在: ${productId}`);
            }
            
            const currentLevel = this.getStockLevel(productId) || {
                product_id: productId,
                current_stock: 0,
                reserved_stock: 0,
                available_stock: 0
            };
            
            // 计算新的库存水平
            const newStock = currentLevel.current_stock + quantityChange;
            const newAvailable = currentLevel.available_stock + quantityChange;
            
            if (newStock < 0) {
                throw new Error('库存不足，无法完成操作');
            }
            
            // 创建库存交易记录
            const transaction = {
                id: this.generateTransactionId(),
                product_id: productId,
                product_name: product.name,
                change_quantity: quantityChange,
                transaction_type: transactionType,
                reference_id: referenceId,
                old_stock: currentLevel.current_stock,
                new_stock: newStock,
                created_at: new Date().toISOString(),
                created_by: this.getCurrentUser()?.id || 'system'
            };
            
            // 更新库存水平
            const updatedLevel = {
                ...currentLevel,
                current_stock: newStock,
                available_stock: newAvailable,
                updated_at: new Date().toISOString()
            };
            
            // 保存到内存
            this.stockLevels.set(productId, updatedLevel);
            this.transactions.push(transaction);
            
            // 保存到数据库
            await this.saveStockTransaction(transaction);
            
            console.log(`📦 [InventoryCore] 库存更新成功: ${product.name} ${quantityChange > 0 ? '+' : ''}${quantityChange}`);
            
            // 检查是否需要自动补货
            if (this.config.enableAutoReorder) {
                this.checkAutoReorder(productId, updatedLevel);
            }
            
            return {
                success: true,
                data: {
                    transaction: transaction,
                    stock_level: updatedLevel
                }
            };
        } catch (error) {
            console.error('📦 [InventoryCore] 库存更新失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 入库操作
     */
    async stockIn(productId, quantity, purchaseOrderId = null, remarks = '') {
        return await this.updateStock(
            productId, 
            quantity, 
            'stock_in', 
            purchaseOrderId
        );
    }
    
    /**
     * 出库操作
     */
    async stockOut(productId, quantity, salesOrderId = null, remarks = '') {
        return await this.updateStock(
            productId, 
            -quantity, 
            'stock_out', 
            salesOrderId
        );
    }
    
    /**
     * 库存转移
     */
    async transferStock(productId, fromLocation, toLocation, quantity, remarks = '') {
        try {
            // 从源位置出库
            const outResult = await this.updateStock(
                productId, 
                -quantity, 
                'transfer_out', 
                `${fromLocation}->${toLocation}`
            );
            
            if (!outResult.success) {
                throw new Error(outResult.message);
            }
            
            // 向目标位置入库
            const inResult = await this.updateStock(
                productId, 
                quantity, 
                'transfer_in', 
                `${fromLocation}->${toLocation}`
            );
            
            if (!inResult.success) {
                // 如果入库失败，需要回滚出库操作
                await this.updateStock(productId, quantity, 'rollback', 'transfer_rollback');
                throw new Error(inResult.message);
            }
            
            console.log(`📦 [InventoryCore] 库存转移成功: ${quantity} 从 ${fromLocation} 到 ${toLocation}`);
            
            return {
                success: true,
                message: '库存转移成功'
            };
        } catch (error) {
            console.error('📦 [InventoryCore] 库存转移失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 盘点库存
     */
    async inventoryCheck(productId, actualQuantity, remarks = '') {
        try {
            const currentLevel = this.getStockLevel(productId);
            if (!currentLevel) {
                throw new Error('产品库存记录不存在');
            }
            
            const difference = actualQuantity - currentLevel.current_stock;
            
            if (difference !== 0) {
                const transactionType = difference > 0 ? 'adjustment_add' : 'adjustment_subtract';
                const result = await this.updateStock(
                    productId, 
                    difference, 
                    transactionType, 
                    `盘点调整: ${remarks}`
                );
                
                if (!result.success) {
                    throw new Error(result.message);
                }
                
                console.log(`📦 [InventoryCore] 库存盘点调整: ${productId} 差异 ${difference}`);
            }
            
            return {
                success: true,
                data: {
                    product_id: productId,
                    previous_stock: currentLevel.current_stock,
                    actual_stock: actualQuantity,
                    difference: difference
                }
            };
        } catch (error) {
            console.error('📦 [InventoryCore] 库存盘点失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 检查自动补货
     */
    checkAutoReorder(productId, stockLevel) {
        const product = this.getProduct(productId);
        if (!product) return;
        
        const minStock = product.min_stock || this.config.defaultMinStock;
        
        if (stockLevel.current_stock <= minStock && product.auto_reorder) {
            console.log(`📦 [InventoryCore] 触发自动补货: ${product.name}`);
            // 这里可以触发采购订单创建流程
            this.triggerAutoReorder(productId, stockLevel);
        }
    }
    
    /**
     * 触发自动补货
     */
    triggerAutoReorder(productId, stockLevel) {
        const purchaseModule = this.modules.get('purchase');
        if (purchaseModule) {
            purchaseModule.createAutoPurchaseOrder(productId, stockLevel);
        }
    }
    
    /**
     * 生成交易ID
     */
    generateTransactionId() {
        return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 获取当前用户
     */
    getCurrentUser() {
        return window.currentUser || { id: 'system' };
    }
    
    /**
     * 保存库存交易到数据库
     */
    async saveStockTransaction(transaction) {
        try {
            const response = await fetch('/api/inventory/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transaction),
                credentials: 'include'
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('📦 [InventoryCore] 保存库存交易失败:', error);
            return false;
        }
    }
    
    /**
     * 设置自动同步
     */
    setupAutoSync() {
        // 每5分钟同步一次库存数据
        setInterval(() => {
            this.syncWithDatabase();
        }, 300000);
        
        console.log('📦 [InventoryCore] 自动同步已启动');
    }
    
    /**
     * 与数据库同步
     */
    async syncWithDatabase() {
        try {
            // 同步库存水平
            await this.loadStockLevels();
            
            // 同步产品信息
            await this.loadProducts();
            
            console.log('📦 [InventoryCore] 数据同步完成');
        } catch (error) {
            console.error('📦 [InventoryCore] 数据同步失败:', error);
        }
    }
    
    /**
     * 获取模块实例
     */
    getModule(moduleName) {
        return this.modules.get(moduleName);
    }
    
    /**
     * 获取库存统计
     */
    getInventoryStatistics() {
        const stats = {
            total_products: this.products.size,
            low_stock_products: this.getLowStockProducts().length,
            total_transactions: this.transactions.length,
            recent_transactions: this.transactions.slice(-10)
        };
        
        // 计算总库存价值
        let totalValue = 0;
        for (const [productId, stockLevel] of this.stockLevels) {
            const product = this.getProduct(productId);
            if (product) {
                totalValue += stockLevel.current_stock * (product.cost_price || 0);
            }
        }
        stats.total_inventory_value = totalValue;
        
        return stats;
    }
}

// 全局导出
window.InventoryCore = InventoryCore;

console.log('📦 [InventoryCore] 模块加载完成');