import request from '@/utils/request'

/**
 * 获取商品服务列表
 */
export function getProductList(params) {
  return request({
    url: '/api/mobile/products',
    method: 'GET',
    params
  })
}

/**
 * 搜索商品服务
 */
export function searchProducts(keyword) {
  return request({
    url: '/api/mobile/products/search',
    method: 'GET',
    params: { keyword }
  })
}

/**
 * 获取商品服务详情
 */
export function getProductDetail(id) {
  return request({
    url: `/api/mobile/products/${id}`,
    method: 'GET'
  })
}

/**
 * 获取商品服务选项（用于选择器）
 */
export function getProductOptions(params) {
  return request({
    url: '/api/mobile/products/options',
    method: 'GET',
    params
  })
}

/**
 * 获取商品分类
 */
export function getProductCategories() {
  return request({
    url: '/api/mobile/products/categories',
    method: 'GET'
  })
}