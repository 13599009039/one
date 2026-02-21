/**
 * 顺丰快递提供商适配器
 * SF Express Provider Adapter
 */

class SFExpressProvider {
    constructor() {
        this.name = '顺丰速运';
        this.code = 'sf-express';
        this.apiUrl = 'https://sf-api.example.com'; // 实际API地址
        this.credentials = {
            apiKey: '',
            secretKey: '',
            customerId: ''
        };
    }
    
    /**
     * 初始化提供商
     */
    init(credentials) {
        Object.assign(this.credentials, credentials);
        console.log('📦 [SFExpressProvider] 顺丰快递提供商初始化完成');
    }
    
    /**
     * 生成运单号
     */
    async generateTrackingNumber(shipmentData) {
        // 实际应该调用顺丰API生成运单号
        // 这里使用模拟生成
        const timestamp = Date.now().toString().slice(-8);
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `SF${timestamp}${randomNum}`;
    }
    
    /**
     * 创建运单
     */
    async createShipment(shipment) {
        try {
            // 构造顺丰API请求数据
            const requestData = this.buildCreateShipmentRequest(shipment);
            
            // 调用顺丰API（模拟）
            const response = await this.callSFExpressAPI('createOrder', requestData);
            
            if (response.success) {
                return {
                    success: true,
                    data: {
                        tracking_number: response.data.mailno,
                        order_id: response.data.orderid,
                        fee: response.data.freight,
                        label_url: response.data.label_url
                    }
                };
            } else {
                return {
                    success: false,
                    message: response.message || '创建运单失败'
                };
            }
        } catch (error) {
            console.error('📦 [SFExpressProvider] 创建运单失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 查询运单跟踪信息
     */
    async trackShipment(trackingNumber) {
        try {
            const response = await this.callSFExpressAPI('queryTrack', {
                tracking_number: trackingNumber
            });
            
            if (response.success) {
                return {
                    success: true,
                    data: {
                        tracking_number: trackingNumber,
                        status: this.mapSFStatus(response.data.routes[0]?.accept_status),
                        details: response.data.routes.map(route => ({
                            time: route.accept_time,
                            location: route.accept_address,
                            status: route.remark,
                            operator: route.oprer_name
                        }))
                    }
                };
            } else {
                return {
                    success: false,
                    message: response.message || '查询跟踪信息失败'
                };
            }
        } catch (error) {
            console.error('📦 [SFExpressProvider] 查询跟踪信息失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 取消运单
     */
    async cancelShipment(trackingNumber) {
        try {
            const response = await this.callSFExpressAPI('cancelOrder', {
                tracking_number: trackingNumber
            });
            
            if (response.success) {
                return {
                    success: true,
                    message: '运单取消成功'
                };
            } else {
                return {
                    success: false,
                    message: response.message || '运单取消失败'
                };
            }
        } catch (error) {
            console.error('📦 [SFExpressProvider] 取消费失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 打印面单
     */
    async printWaybill(trackingNumber, templateType = 'A4') {
        try {
            const response = await this.callSFExpressAPI('printWaybill', {
                tracking_number: trackingNumber,
                template_type: templateType
            });
            
            if (response.success) {
                return {
                    success: true,
                    data: {
                        pdf_url: response.data.pdf_url,
                        print_instructions: response.data.print_instructions
                    }
                };
            } else {
                return {
                    success: false,
                    message: response.message || '面单打印失败'
                };
            }
        } catch (error) {
            console.error('📦 [SFExpressProvider] 面单打印失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 计算运费
     */
    async calculateFreight(shipmentData) {
        try {
            const requestData = this.buildFreightCalculateRequest(shipmentData);
            const response = await this.callSFExpressAPI('calculateFreight', requestData);
            
            if (response.success) {
                return {
                    success: true,
                    data: {
                        freight: response.data.freight,
                        currency: response.data.currency,
                        delivery_time: response.data.delivery_time,
                        services: response.data.services
                    }
                };
            } else {
                return {
                    success: false,
                    message: response.message || '运费计算失败'
                };
            }
        } catch (error) {
            console.error('📦 [SFExpressProvider] 运费计算失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 构造创建运单请求数据
     */
    buildCreateShipmentRequest(shipment) {
        return {
            d_address: shipment.receiver.address,
            d_contact: shipment.receiver.name,
            d_mobile: shipment.receiver.phone,
            d_tel: shipment.receiver.tel || '',
            j_address: shipment.sender.address,
            j_contact: shipment.sender.name,
            j_mobile: shipment.sender.phone,
            j_tel: shipment.sender.tel || '',
            cargo: shipment.goods.map(item => ({
                name: item.name,
                count: item.quantity,
                unit: item.unit || '件',
                weight: item.weight || 0,
                amount: item.amount || 0,
                currency: 'CNY'
            })),
            express_type: 1, // 标准快递
            pay_method: 1,   // 寄件人付款
            parcel_quantity: shipment.goods.reduce((sum, item) => sum + item.quantity, 0),
            cargo_total_weight: shipment.weight || 0,
            sendstarttime: shipment.send_time || new Date().toISOString()
        };
    }
    
    /**
     * 构造运费计算请求数据
     */
    buildFreightCalculateRequest(shipmentData) {
        return {
            d_address: shipmentData.receiver.address,
            j_address: shipmentData.sender.address,
            cargo_total_weight: shipmentData.weight || 0,
            express_type: shipmentData.express_type || 1
        };
    }
    
    /**
     * 映射顺丰状态到标准状态
     */
    mapSFStatus(sfStatus) {
        const statusMap = {
            '已收件': 'received',
            '运输中': 'in_transit',
            '派送中': 'out_for_delivery',
            '已签收': 'delivered',
            '异常': 'exception',
            '退回': 'returned'
        };
        
        return statusMap[sfStatus] || 'unknown';
    }
    
    /**
     * 调用顺丰API（模拟实现）
     */
    async callSFExpressAPI(method, data) {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 根据不同方法返回模拟数据
        switch (method) {
            case 'createOrder':
                return {
                    success: true,
                    data: {
                        mailno: data.tracking_number || this.generateTrackingNumber(),
                        orderid: `ORDER_${Date.now()}`,
                        freight: 25.00,
                        label_url: 'https://example.com/labels/SF123456789.pdf'
                    }
                };
                
            case 'queryTrack':
                return {
                    success: true,
                    data: {
                        routes: [
                            {
                                accept_time: new Date().toISOString(),
                                accept_address: '北京转运中心',
                                remark: '已收件',
                                oprer_name: '张三'
                            }
                        ]
                    }
                };
                
            case 'calculateFreight':
                return {
                    success: true,
                    data: {
                        freight: 25.00,
                        currency: 'CNY',
                        delivery_time: '1-2天',
                        services: ['标准快递', '特安服务']
                    }
                };
                
            default:
                return {
                    success: true,
                    data: {}
                };
        }
    }
    
    /**
     * 获取服务类型列表
     */
    getServiceTypes() {
        return [
            { code: 1, name: '标准快递', description: '陆运，一般2-4天送达' },
            { code: 2, name: '特快专递', description: '航空，一般1-2天送达' },
            { code: 3, name: '特安服务', description: '特殊安全保障服务' },
            { code: 5, name: '顺丰次晨', description: '次日上午10:30前送达' },
            { code: 6, name: '顺丰标快', description: '标准快递服务' }
        ];
    }
    
    /**
     * 获取增值服务列表
     */
    getValueAddedServices() {
        return [
            { code: 'INSURE', name: '保价服务', description: '货物运输保险' },
            { code: 'COD', name: '代收货款', description: '送货时代收货款' },
            { code: 'SIGN', name: '签收回单', description: '签收后返回签收单' },
            { code: 'WAIT', name: '等待通知', description: '等待客户电话通知再派送' }
        ];
    }
}

// 全局导出
window.SFExpressProvider = SFExpressProvider;

console.log('📦 [SFExpressProvider] 顺丰快递提供商适配器加载完成');