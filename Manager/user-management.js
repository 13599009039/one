/**
 * 用户管理模块
 * User Management Module
 */

class UserManager {
    constructor() {
        this.users = new Map();
        this.currentUser = null;
        this.roles = new Map();
    }
    
    /**
     * 初始化用户管理模块
     */
    init() {
        console.log('👥 [UserManager] 初始化用户管理模块...');
        this.loadUsers();
        this.loadRoles();
        this.setupEventListeners();
    }
    
    /**
     * 加载用户数据
     */
    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                result.data.forEach(user => {
                    this.users.set(user.id, user);
                });
                console.log(`👥 [UserManager] 加载用户数据: ${this.users.size} 个用户`);
            }
        } catch (error) {
            console.error('👥 [UserManager] 加载用户数据失败:', error);
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
                    this.roles.set(role.id, role);
                });
                console.log(`👥 [UserManager] 加载角色数据: ${this.roles.size} 个角色`);
            }
        } catch (error) {
            console.error('👥 [UserManager] 加载角色数据失败:', error);
        }
    }
    
    /**
     * 获取所有用户
     */
    getAllUsers() {
        return Array.from(this.users.values());
    }
    
    /**
     * 根据ID获取用户
     */
    getUserById(userId) {
        return this.users.get(userId);
    }
    
    /**
     * 创建新用户
     */
    async createUser(userData) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新本地缓存
                this.users.set(result.data.id, result.data);
                
                // 发布用户创建事件
                window.managerCore?.eventBus.emit('user.created', result.data);
                
                console.log('👥 [UserManager] 用户创建成功:', result.data.username);
                return result;
            } else {
                throw new Error(result.message || '用户创建失败');
            }
        } catch (error) {
            console.error('👥 [UserManager] 用户创建失败:', error);
            throw error;
        }
    }
    
    /**
     * 更新用户信息
     */
    async updateUser(userId, userData) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新本地缓存
                const updatedUser = { ...this.users.get(userId), ...result.data };
                this.users.set(userId, updatedUser);
                
                // 发布用户更新事件
                window.managerCore?.eventBus.emit('user.updated', updatedUser);
                
                console.log('👥 [UserManager] 用户更新成功:', updatedUser.username);
                return result;
            } else {
                throw new Error(result.message || '用户更新失败');
            }
        } catch (error) {
            console.error('👥 [UserManager] 用户更新失败:', error);
            throw error;
        }
    }
    
    /**
     * 删除用户
     */
    async deleteUser(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 从本地缓存移除
                this.users.delete(userId);
                
                console.log('👥 [UserManager] 用户删除成功:', userId);
                return result;
            } else {
                throw new Error(result.message || '用户删除失败');
            }
        } catch (error) {
            console.error('👥 [UserManager] 用户删除失败:', error);
            throw error;
        }
    }
    
    /**
     * 用户登录
     */
    async login(username, password) {
        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentUser = result.data;
                console.log('👥 [UserManager] 用户登录成功:', username);
                return result;
            } else {
                throw new Error(result.message || '登录失败');
            }
        } catch (error) {
            console.error('👥 [UserManager] 登录失败:', error);
            throw error;
        }
    }
    
    /**
     * 用户登出
     */
    async logout() {
        try {
            const response = await fetch('/api/users/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentUser = null;
                console.log('👥 [UserManager] 用户登出成功');
                return result;
            } else {
                throw new Error(result.message || '登出失败');
            }
        } catch (error) {
            console.error('👥 [UserManager] 登出失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取当前用户
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * 检查用户权限
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // 这里应该根据实际的权限系统实现
        // 简化实现：检查用户角色是否具有指定权限
        const userRole = this.roles.get(this.currentUser.role_id);
        if (!userRole) return false;
        
        return userRole.permissions?.includes(permission) || false;
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 可以在这里添加用户相关的事件监听
    }
}

// 全局导出
window.UserManager = UserManager;

console.log('👥 [UserManager] 模块加载完成');