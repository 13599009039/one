import request from '@/utils/request'

/**
 * 获取订单列表
 */
export function getOrderList(params) {
  return request({
    url: '/api/mobile/orders',
    method: 'GET',
    params
  })
}

/**
 * 获取订单详情
 */
export function getOrderDetail(id) {
  return request({
    url: `/api/mobile/orders/${id}`,
    method: 'GET'
  })
}

/**
 * 搜索订单
 */
export function searchOrders(keyword) {
  return request({
    url: '/api/mobile/orders/search',
    method: 'GET',
    params: { keyword }
  })
}

/**
 * 更新订单
 */
export function updateOrder(id, data) {
  return request({
    url: `/api/mobile/orders/${id}`,
    method: 'PUT',
    data
  })
}
