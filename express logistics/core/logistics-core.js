/**
 * 快递物流核心模块
 * Express Logistics Core Module
 */

class LogisticsCore {
    constructor() {
        this.providers = new Map();
        this.trackingSystems = new Map();
        this.templates = new Map();
        this.shipments = new Map();
        this.config = {
            defaultProvider: 'sf-express',
            autoTracking: true,
            trackingInterval: 300000 // 5分钟
        };
    }
    
    /**
     * 初始化物流核心模块
     */
    init() {
        console.log('🚚 [LogisticsCore] 初始化快递物流核心模块...');
        
        // 初始化各个子模块
        this.initProviders();
        this.initTracking();
        this.initTemplates();
        
        // 设置定时任务
        this.setupScheduledTasks();
        
        console.log('✅ [LogisticsCore] 快递物流核心模块初始化完成');
    }
    
    /**
     * 初始化快递提供商
     */
    initProviders() {
        // 注册主流快递提供商
        this.registerProvider('sf-express', new SFExpressProvider());
        this.registerProvider('sto', new STOProvider());
        this.registerProvider('yto', new YTOProvider());
        this.registerProvider('zto', new ZTOProvider());
        this.registerProvider('ems', new EMSProvider());
        
        console.log(`🚚 [LogisticsCore] 已注册 ${this.providers.size} 个快递提供商`);
    }
    
    /**
     * 初始化跟踪系统
     */
    initTracking() {
        this.trackingSystems.set('basic', new BasicTrackingSystem());
        this.trackingSystems.set('advanced', new AdvancedTrackingSystem());
        
        console.log('🚚 [LogisticsCore] 跟踪系统初始化完成');
    }
    
    /**
     * 初始化模板系统
     */
    initTemplates() {
        this.templates.set('default', new DefaultWaybillTemplate());
        this.templates.set('electronic', new ElectronicWaybillTemplate());
        
        console.log('🚚 [LogisticsCore] 面单模板系统初始化完成');
    }
    
    /**
     * 注册快递提供商
     */
    registerProvider(code, providerInstance) {
        this.providers.set(code, providerInstance);
        console.log(`🚚 [LogisticsCore] 注册快递提供商: ${code}`);
    }
    
    /**
     * 获取快递提供商
     */
    getProvider(code) {
        return this.providers.get(code);
    }
    
    /**
     * 获取所有快递提供商
     */
    getAllProviders() {
        return Array.from(this.providers.entries());
    }
    
    /**
     * 创建运单
     */
    async createShipment(shipmentData) {
        try {
            const providerCode = shipmentData.provider || this.config.defaultProvider;
            const provider = this.getProvider(providerCode);
            
            if (!provider) {
                throw new Error(`不支持的快递提供商: ${providerCode}`);
            }
            
            // 验证运单数据
            const validationResult = this.validateShipmentData(shipmentData);
            if (!validationResult.isValid) {
                throw new Error(`运单数据验证失败: ${validationResult.errors.join(', ')}`);
            }
            
            // 生成运单号
            const trackingNumber = await provider.generateTrackingNumber(shipmentData);
            
            // 创建运单记录
            const shipment = {
                id: this.generateUniqueId(),
                tracking_number: trackingNumber,
                provider: providerCode,
                status: 'created',
                sender: shipmentData.sender,
                receiver: shipmentData.receiver,
                goods: shipmentData.goods,
                weight: shipmentData.weight,
                volume: shipmentData.volume,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // 保存运单
            this.shipments.set(shipment.id, shipment);
            
            // 调用提供商API创建运单
            const providerResult = await provider.createShipment(shipment);
            
            if (providerResult.success) {
                shipment.status = 'submitted';
                shipment.provider_data = providerResult.data;
                this.shipments.set(shipment.id, shipment);
                
                console.log('🚚 [LogisticsCore] 运单创建成功:', trackingNumber);
                return {
                    success: true,
                    data: shipment
                };
            } else {
                throw new Error(providerResult.message || '提供商创建运单失败');
            }
        } catch (error) {
            console.error('🚚 [LogisticsCore] 运单创建失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 查询运单跟踪信息
     */
    async trackShipment(trackingNumber, providerCode = null) {
        try {
            // 如果没有指定提供商，尝试自动识别
            if (!providerCode) {
                providerCode = this.identifyProvider(trackingNumber);
            }
            
            const provider = this.getProvider(providerCode);
            if (!provider) {
                throw new Error(`不支持的快递提供商: ${providerCode}`);
            }
            
            const trackingInfo = await provider.trackShipment(trackingNumber);
            
            if (trackingInfo.success) {
                console.log('🚚 [LogisticsCore] 运单跟踪查询成功:', trackingNumber);
                return trackingInfo;
            } else {
                throw new Error(trackingInfo.message || '跟踪查询失败');
            }
        } catch (error) {
            console.error('🚚 [LogisticsCore] 运单跟踪查询失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 批量查询运单状态
     */
    async batchTrackShipments(trackingNumbers) {
        const results = [];
        
        for (const trackingNumber of trackingNumbers) {
            try {
                const result = await this.trackShipment(trackingNumber);
                results.push({
                    tracking_number: trackingNumber,
                    ...result
                });
            } catch (error) {
                results.push({
                    tracking_number: trackingNumber,
                    success: false,
                    message: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * 取消运单
     */
    async cancelShipment(shipmentId) {
        try {
            const shipment = this.shipments.get(shipmentId);
            if (!shipment) {
                throw new Error('运单不存在');
            }
            
            const provider = this.getProvider(shipment.provider);
            if (!provider) {
                throw new Error(`不支持的快递提供商: ${shipment.provider}`);
            }
            
            const result = await provider.cancelShipment(shipment.tracking_number);
            
            if (result.success) {
                shipment.status = 'cancelled';
                shipment.updated_at = new Date().toISOString();
                this.shipments.set(shipmentId, shipment);
                
                console.log('🚚 [LogisticsCore] 运单取消成功:', shipment.tracking_number);
                return result;
            } else {
                throw new Error(result.message || '运单取消失败');
            }
        } catch (error) {
            console.error('🚚 [LogisticsCore] 运单取消失败:', error);
            throw error;
        }
    }
    
    /**
     * 验证运单数据
     */
    validateShipmentData(shipmentData) {
        const errors = [];
        
        // 验证必填字段
        if (!shipmentData.sender) {
            errors.push('发件人信息不能为空');
        }
        
        if (!shipmentData.receiver) {
            errors.push('收件人信息不能为空');
        }
        
        if (!shipmentData.goods || shipmentData.goods.length === 0) {
            errors.push('货物信息不能为空');
        }
        
        // 验证联系方式
        if (shipmentData.sender.phone && !this.isValidPhone(shipmentData.sender.phone)) {
            errors.push('发件人电话号码格式不正确');
        }
        
        if (shipmentData.receiver.phone && !this.isValidPhone(shipmentData.receiver.phone)) {
            errors.push('收件人电话号码格式不正确');
        }
        
        // 验证地址信息
        if (!shipmentData.sender.address || shipmentData.sender.address.length < 5) {
            errors.push('发件人地址信息不完整');
        }
        
        if (!shipmentData.receiver.address || shipmentData.receiver.address.length < 5) {
            errors.push('收件人地址信息不完整');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * 验证手机号码
     */
    isValidPhone(phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    }
    
    /**
     * 识别快递提供商
     */
    identifyProvider(trackingNumber) {
        // 根据运单号规则识别快递公司
        const patterns = {
            'sf-express': /^SF\d{12}$/,     // 顺丰
            'sto': /^STO\d{12}$/,           // 申通
            'yto': /^YT\d{12}$/,            // 圆通
            'zto': /^ZTO\d{12}$/,           // 中通
            'ems': /^EMS\d{12}$/            // EMS
        };
        
        for (const [provider, pattern] of Object.entries(patterns)) {
            if (pattern.test(trackingNumber)) {
                return provider;
            }
        }
        
        // 默认返回配置的提供商
        return this.config.defaultProvider;
    }
    
    /**
     * 生成唯一ID
     */
    generateUniqueId() {
        return 'SHIP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 设置定时任务
     */
    setupScheduledTasks() {
        if (this.config.autoTracking) {
            // 定时更新运单状态
            setInterval(() => {
                this.updateAllShipmentsStatus();
            }, this.config.trackingInterval);
            
            console.log('🚚 [LogisticsCore] 定时跟踪任务已启动');
        }
    }
    
    /**
     * 更新所有运单状态
     */
    async updateAllShipmentsStatus() {
        try {
            const activeShipments = Array.from(this.shipments.values())
                .filter(shipment => ['created', 'submitted', 'in_transit'].includes(shipment.status));
            
            console.log(`🚚 [LogisticsCore] 开始更新 ${activeShipments.length} 个运单状态`);
            
            for (const shipment of activeShipments) {
                try {
                    const trackingInfo = await this.trackShipment(shipment.tracking_number, shipment.provider);
                    if (trackingInfo.success && trackingInfo.data?.status) {
                        shipment.status = trackingInfo.data.status;
                        shipment.tracking_details = trackingInfo.data.details;
                        shipment.updated_at = new Date().toISOString();
                        this.shipments.set(shipment.id, shipment);
                    }
                } catch (error) {
                    console.warn(`🚚 [LogisticsCore] 更新运单 ${shipment.tracking_number} 状态失败:`, error.message);
                }
            }
            
            console.log('🚚 [LogisticsCore] 运单状态更新完成');
        } catch (error) {
            console.error('🚚 [LogisticsCore] 批量更新运单状态失败:', error);
        }
    }
    
    /**
     * 获取运单信息
     */
    getShipment(shipmentId) {
        return this.shipments.get(shipmentId);
    }
    
    /**
     * 获取所有运单
     */
    getAllShipments() {
        return Array.from(this.shipments.values());
    }
    
    /**
     * 根据状态筛选运单
     */
    getShipmentsByStatus(status) {
        return Array.from(this.shipments.values())
            .filter(shipment => shipment.status === status);
    }
}

// 全局导出
window.LogisticsCore = LogisticsCore;

console.log('🚚 [LogisticsCore] 模块加载完成');