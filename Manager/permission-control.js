/**
 * 权限控制模块
 * Permission Control Module
 */

class PermissionControl {
    constructor() {
        this.permissions = new Map();
        this.roles = new Map();
        this.userPermissions = new Map();
    }
    
    /**
     * 初始化权限控制模块
     */
    init() {
        console.log('🔒 [PermissionControl] 初始化权限控制模块...');
        this.loadPermissions();
        this.loadRoles();
        this.setupEventListeners();
    }
    
    /**
     * 加载权限数据
     */
    async loadPermissions() {
        try {
            const response = await fetch('/api/permissions', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                result.data.forEach(permission => {
                    this.permissions.set(permission.id, permission);
                });
                console.log(`🔒 [PermissionControl] 加载权限数据: ${this.permissions.size} 个权限`);
            }
        } catch (error) {
            console.error('🔒 [PermissionControl] 加载权限数据失败:', error);
        }
    }
    
    /**
     * 加载角色数据
     */
    async loadRoles() {
        try {
            const response = await fetch('/api/roles', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                result.data.forEach(role => {
                    this.roles.set(role.id, {
                        ...role,
                        permissions: new Set(role.permissions || [])
                    });
                });
                console.log(`🔒 [PermissionControl] 加载角色数据: ${this.roles.size} 个角色`);
            }
        } catch (error) {
            console.error('🔒 [PermissionControl] 加载角色数据失败:', error);
        }
    }
    
    /**
     * 获取用户权限
     */
    async getUserPermissions(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/permissions`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                this.userPermissions.set(userId, new Set(result.data));
                return result.data;
            }
            return [];
        } catch (error) {
            console.error('🔒 [PermissionControl] 获取用户权限失败:', error);
            return [];
        }
    }
    
    /**
     * 检查用户是否有指定权限
     */
    async checkUserPermission(userId, permissionCode) {
        // 先检查缓存
        const cachedPermissions = this.userPermissions.get(userId);
        if (cachedPermissions && cachedPermissions.has(permissionCode)) {
            return true;
        }
        
        // 从服务器获取
        try {
            const response = await fetch('/api/permissions/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    permission_code: permissionCode
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            return result.success && result.data?.has_permission;
        } catch (error) {
            console.error('🔒 [PermissionControl] 权限检查失败:', error);
            return false;
        }
    }
    
    /**
     * 为角色分配权限
     */
    async assignPermissionsToRole(roleId, permissionCodes) {
        try {
            const response = await fetch('/api/role-permissions/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role_id: roleId,
                    permission_codes: permissionCodes
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新本地缓存
                const role = this.roles.get(roleId);
                if (role) {
                    role.permissions = new Set(permissionCodes);
                }
                
                // 发布权限变更事件
                window.managerCore?.eventBus.emit('permission.changed', {
                    role_id: roleId,
                    permissions: permissionCodes,
                    action: 'assign'
                });
                
                console.log('🔒 [PermissionControl] 角色权限分配成功');
                return result;
            } else {
                throw new Error(result.message || '权限分配失败');
            }
        } catch (error) {
            console.error('🔒 [PermissionControl] 角色权限分配失败:', error);
            throw error;
        }
    }
    
    /**
     * 为用户分配角色
     */
    async assignRolesToUser(userId, roleIds) {
        try {
            const response = await fetch('/api/user-roles/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    role_ids: roleIds
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 清除用户权限缓存（需要重新加载）
                this.userPermissions.delete(userId);
                
                // 发布权限变更事件
                window.managerCore?.eventBus.emit('permission.changed', {
                    user_id: userId,
                    roles: roleIds,
                    action: 'role_assign'
                });
                
                console.log('🔒 [PermissionControl] 用户角色分配成功');
                return result;
            } else {
                throw new Error(result.message || '角色分配失败');
            }
        } catch (error) {
            console.error('🔒 [PermissionControl] 用户角色分配失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建新角色
     */
    async createRole(roleData) {
        try {
            const response = await fetch('/api/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roleData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新本地缓存
                this.roles.set(result.data.id, {
                    ...result.data,
                    permissions: new Set()
                });
                
                console.log('🔒 [PermissionControl] 角色创建成功:', result.data.name);
                return result;
            } else {
                throw new Error(result.message || '角色创建失败');
            }
        } catch (error) {
            console.error('🔒 [PermissionControl] 角色创建失败:', error);
            throw error;
        }
    }
    
    /**
     * 更新角色信息
     */
    async updateRole(roleId, roleData) {
        try {
            const response = await fetch(`/api/roles/${roleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roleData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新本地缓存
                const existingRole = this.roles.get(roleId);
                this.roles.set(roleId, {
                    ...existingRole,
                    ...result.data
                });
                
                console.log('🔒 [PermissionControl] 角色更新成功:', result.data.name);
                return result;
            } else {
                throw new Error(result.message || '角色更新失败');
            }
        } catch (error) {
            console.error('🔒 [PermissionControl] 角色更新失败:', error);
            throw error;
        }
    }
    
    /**
     * 删除角色
     */
    async deleteRole(roleId) {
        try {
            const response = await fetch(`/api/roles/${roleId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 从本地缓存移除
                this.roles.delete(roleId);
                
                console.log('🔒 [PermissionControl] 角色删除成功:', roleId);
                return result;
            } else {
                throw new Error(result.message || '角色删除失败');
            }
        } catch (error) {
            console.error('🔒 [PermissionControl] 角色删除失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取所有权限
     */
    getAllPermissions() {
        return Array.from(this.permissions.values());
    }
    
    /**
     * 获取所有角色
     */
    getAllRoles() {
        return Array.from(this.roles.values());
    }
    
    /**
     * 获取角色拥有的权限
     */
    getRolePermissions(roleId) {
        const role = this.roles.get(roleId);
        return role ? Array.from(role.permissions) : [];
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听用户相关事件
        window.managerCore?.eventBus.on('user.created', (userData) => {
            this.handleUserCreated(userData);
        });
        
        window.managerCore?.eventBus.on('user.updated', (userData) => {
            this.handleUserUpdated(userData);
        });
    }
    
    // 事件处理器
    handleUserCreated(userData) {
        console.log('🔒 [PermissionControl] 处理用户创建事件');
        // 可以在这里为新用户分配默认角色或权限
    }
    
    handleUserUpdated(userData) {
        console.log('🔒 [PermissionControl] 处理用户更新事件');
        // 用户更新后清除权限缓存
        this.userPermissions.delete(userData.id);
    }
}

// 全局导出
window.PermissionControl = PermissionControl;

console.log('🔒 [PermissionControl] 模块加载完成');