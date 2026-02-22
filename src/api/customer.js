import request from '@/utils/request'

/**
 * 获取客户列表
 */
export function getCustomerList(params) {
  return request({
    url: '/api/mobile/customers',
    method: 'GET',
    params
  })
}

/**
 * 搜索客户
 */
export function searchCustomers(keyword) {
  return request({
    url: '/api/mobile/customers/search',
    method: 'GET',
    params: { keyword }
  })
}

/**
 * 获取客户详情
 */
export function getCustomerDetail(id) {
  return request({
    url: `/api/mobile/customers/${id}`,
    method: 'GET'
  })
}

/**
 * 获取客户下拉选项（用于选择器）
 */
export function getCustomerOptions(params) {
  return request({
    url: '/api/mobile/customers/options',
    method: 'GET',
    params
  })
}