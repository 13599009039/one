import request from '@/utils/request'

/**
 * 获取业务人员列表
 */
export function getStaffList(params) {
  return request({
    url: '/api/mobile/staff',
    method: 'GET',
    params
  })
}

/**
 * 获取业务人员详情
 */
export function getStaffDetail(id) {
  return request({
    url: `/api/mobile/staff/${id}`,
    method: 'GET'
  })
}

/**
 * 获取部门列表
 */
export function getDepartments() {
  return request({
    url: '/api/mobile/departments',
    method: 'GET'
  })
}