import request from '@/utils/request'

/**
 * 获取概览统计
 */
export function getOverview() {
  return request({
    url: '/api/mobile/statistics/overview',
    method: 'GET'
  })
}

/**
 * 获取趋势数据
 */
export function getTrend(params) {
  return request({
    url: '/api/mobile/statistics/trend',
    method: 'GET',
    params
  })
}

/**
 * 获取排行榜
 */
export function getRanking(params) {
  return request({
    url: '/api/mobile/statistics/ranking',
    method: 'GET',
    params
  })
}
