/**
 * 权限管理器 - PermissionManager
 * 版本: v1.0.0
 * 说明: 基于RBAC权限体系的前端权限控制工具
 * 
 * 功能：
 * 1. 从后端加载当前用户的权限列表
 * 2. 检查用户是否拥有指定权限
 * 3. 根据权限显示/隐藏DOM元素
 * 4. 权限缓存机制（LocalStorage + 内存）
 * 5. 按钮/菜单的权限控制
 */

(function(window) {
    'use strict';

    class PermissionManager {
        constructor() {
            // 权限列表（内存缓存）
            this.permissions = [];
            // 权限代码集合（快速查询）
            this.permissionCodes = new Set();
            // 是否已初始化
            this.initialized = false;
            // 缓存键名
            this.CACHE_KEY = 'ajkuaiji_user_permissions';
            this.CACHE_EXPIRES_KEY = 'ajkuaiji_permissions_expires';
            // 缓存有效期（默认30分钟）
            this.CACHE_DURATION = 30 * 60 * 1000;

            console.log('[PermissionManager] 🔐 权限管理器已创建');
        }

        /**
         * 初始化权限管理器（从后端加载权限）
         * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
         */
        async init(forceRefresh = false) {
            console.log('[PermissionManager] 🚀 初始化权限管理器...');

            // 尝试从缓存加载
            if (!forceRefresh && this._loadFromCache()) {
                console.log('[PermissionManager] ✅ 从缓存加载权限成功');
                this.initialized = true;
                return true;
            }

            // 从后端加载
            try {
                const result = await this._fetchPermissionsFromServer();
                if (result.success) {
                    this._setPermissions(result.data || [], result.codes || []);
                    this._saveToCache();
                    this.initialized = true;
                    console.log('[PermissionManager] ✅ 从后端加载权限成功，共 ' + this.permissions.length + ' 项');
                    return true;
                } else {
                    console.warn('[PermissionManager] ⚠️ 加载权限失败:', result.message);
                    return false;
                }
            } catch (error) {
                console.error('[PermissionManager] ❌ 初始化权限失败:', error);
                return false;
            }
        }

        /**
         * 从后端获取当前用户的权限列表
         */
        async _fetchPermissionsFromServer() {
            const response = await fetch('/api/user-permissions/current', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // 携带Cookie（Session）
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        }

        /**
         * 设置权限列表
         */
        _setPermissions(permissions, codes) {
            this.permissions = permissions;
            this.permissionCodes = new Set(codes);
        }

        /**
         * 从数据库加载缓存
         */
        async _loadFromCache() {
            try {
                // 优先使用数据库管理器
                if (window.databaseManager && window.databaseManager.isInitialized) {
                    const cachedData = await window.databaseManager.getConfiguration('permissions_cache');
                    if (cachedData && cachedData.expiresAt && Date.now() < cachedData.expiresAt) {
                        this._setPermissions(cachedData.data.permissions || [], cachedData.data.codes || []);
                        console.log('[PermissionManager] ✅ 从数据库加载权限缓存');
                        return true;
                    }
                }
                
                // 回退到localStorage
                const expiresAt = localStorage.getItem(this.CACHE_EXPIRES_KEY);
                const now = Date.now();

                // 检查缓存是否过期
                if (!expiresAt || now > parseInt(expiresAt, 10)) {
                    console.log('[PermissionManager] ⏰ localStorage缓存已过期');
                    return false;
                }

                const cachedData = localStorage.getItem(this.CACHE_KEY);
                if (!cachedData) {
                    return false;
                }

                const parsed = JSON.parse(cachedData);
                this._setPermissions(parsed.permissions || [], parsed.codes || []);
                console.log('[PermissionManager] ✅ 从localStorage加载权限缓存');
                return true;
            } catch (error) {
                console.error('[PermissionManager] ❌ 加载缓存失败:', error);
                return false;
            }
        }

        /**
         * 保存权限到LocalStorage
         */
        async _saveToCache() {
            try {
                const data = {
                    permissions: this.permissions,
                    codes: Array.from(this.permissionCodes)
                };
                
                // 优先保存到数据库
                if (window.databaseManager && window.databaseManager.isInitialized) {
                    const cacheData = {
                        data: data,
                        expiresAt: Date.now() + this.CACHE_DURATION
                    };
                    await window.databaseManager.saveConfiguration(cacheData, 'permissions_cache');
                    console.log('[PermissionManager] 💾 权限已保存到数据库');
                }
                
                // 同时保存到localStorage作为备份
                localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
                localStorage.setItem(this.CACHE_EXPIRES_KEY, (Date.now() + this.CACHE_DURATION).toString());
                console.log('[PermissionManager] 💾 权限已缓存到localStorage');
            } catch (error) {
                console.error('[PermissionManager] ❌ 缓存权限失败:', error);
            }
        }

        /**
         * 清除权限缓存
         */
        async clearCache() {
            try {
                // 清除数据库缓存
                if (window.databaseManager && window.databaseManager.isInitialized) {
                    await window.databaseManager.saveConfiguration(null, 'permissions_cache');
                    console.log('[PermissionManager] 🗑️ 数据库权限缓存已清除');
                }
            } catch (error) {
                console.warn('[PermissionManager] 清除数据库缓存失败:', error);
            }
            
            // 清除localStorage缓存
            localStorage.removeItem(this.CACHE_KEY);
            localStorage.removeItem(this.CACHE_EXPIRES_KEY);
            this.permissions = [];
            this.permissionCodes.clear();
            this.initialized = false;
            console.log('[PermissionManager] 🗑️ 权限缓存已清除');
        }

        /**
         * 检查用户是否拥有指定权限
         * @param {string} permissionCode - 权限代码（如 "transactions:create"）
         * @returns {boolean}
         */
        hasPermission(permissionCode) {
            if (!this.initialized) {
                console.warn('[PermissionManager] ⚠️ 权限管理器未初始化，返回false');
                return false;
            }

            if (!permissionCode) {
                return false;
            }

            return this.permissionCodes.has(permissionCode);
        }

        /**
         * 批量检查权限（全部拥有才返回true）
         * @param {string[]} permissionCodes - 权限代码数组
         * @returns {boolean}
         */
        hasAllPermissions(permissionCodes) {
            if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) {
                return false;
            }

            return permissionCodes.every(code => this.hasPermission(code));
        }

        /**
         * 批量检查权限（至少拥有一个就返回true）
         * @param {string[]} permissionCodes - 权限代码数组
         * @returns {boolean}
         */
        hasAnyPermission(permissionCodes) {
            if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) {
                return false;
            }

            return permissionCodes.some(code => this.hasPermission(code));
        }

        /**
         * 获取所有权限列表
         */
        getAllPermissions() {
            return this.permissions;
        }

        /**
         * 获取所有权限代码
         */
        getAllPermissionCodes() {
            return Array.from(this.permissionCodes);
        }

        /**
         * 根据权限控制DOM元素的显示/隐藏
         * 
         * HTML示例：
         * <button data-permission="transactions:create">创建流水</button>
         * <div data-permission="orders:view">订单列表</div>
         * <button data-permission-any="orders:update,orders:delete">编辑或删除</button>
         * <button data-permission-all="orders:view,orders:approve">查看且审核</button>
         * 
         * @param {HTMLElement} container - 容器元素（默认为document.body）
         */
        applyPermissionsToUI(container = document.body) {
            if (!this.initialized) {
                console.warn('[PermissionManager] ⚠️ 权限管理器未初始化，无法应用UI控制');
                return;
            }

            console.log('[PermissionManager] 🎨 开始应用权限到UI...');

            // 1. 处理单个权限控制 [data-permission]
            const singlePermElements = container.querySelectorAll('[data-permission]');
            singlePermElements.forEach(el => {
                const requiredPerm = el.getAttribute('data-permission');
                if (requiredPerm && !this.hasPermission(requiredPerm)) {
                    el.style.display = 'none';
                    console.log(`[PermissionManager] 🚫 隐藏元素（缺少权限: ${requiredPerm})`);
                }
            });

            // 2. 处理"至少一个"权限控制 [data-permission-any]
            const anyPermElements = container.querySelectorAll('[data-permission-any]');
            anyPermElements.forEach(el => {
                const permString = el.getAttribute('data-permission-any');
                if (permString) {
                    const perms = permString.split(',').map(p => p.trim());
                    if (!this.hasAnyPermission(perms)) {
                        el.style.display = 'none';
                        console.log(`[PermissionManager] 🚫 隐藏元素（缺少任一权限: ${permString})`);
                    }
                }
            });

            // 3. 处理"全部"权限控制 [data-permission-all]
            const allPermElements = container.querySelectorAll('[data-permission-all]');
            allPermElements.forEach(el => {
                const permString = el.getAttribute('data-permission-all');
                if (permString) {
                    const perms = permString.split(',').map(p => p.trim());
                    if (!this.hasAllPermissions(perms)) {
                        el.style.display = 'none';
                        console.log(`[PermissionManager] 🚫 隐藏元素（缺少全部权限: ${permString})`);
                    }
                }
            });

            console.log('[PermissionManager] ✅ 权限UI控制已应用');
        }

        /**
         * 根据权限控制菜单显示
         * 
         * HTML示例：
         * <a href="#transactions" class="nav-link" data-menu-permission="menu:transactions">
         *   <i class="fas fa-exchange-alt"></i>
         *   <span>财务流水</span>
         * </a>
         * 
         * @param {HTMLElement} container - 导航容器
         */
        applyPermissionsToMenu(container = document.body) {
            if (!this.initialized) {
                console.warn('[PermissionManager] ⚠️ 权限管理器未初始化，无法应用菜单权限');
                return;
            }

            console.log('[PermissionManager] 📋 开始应用菜单权限...');

            const menuItems = container.querySelectorAll('[data-menu-permission]');
            menuItems.forEach(item => {
                const requiredPerm = item.getAttribute('data-menu-permission');
                if (requiredPerm && !this.hasPermission(requiredPerm)) {
                    // 隐藏整个菜单项（包括父级li）
                    const parentLi = item.closest('li');
                    if (parentLi) {
                        parentLi.style.display = 'none';
                    } else {
                        item.style.display = 'none';
                    }
                    console.log(`[PermissionManager] 🚫 隐藏菜单（缺少权限: ${requiredPerm})`);
                }
            });

            console.log('[PermissionManager] ✅ 菜单权限已应用');
        }

        /**
         * 禁用按钮（而不是隐藏）
         * 
         * HTML示例：
         * <button data-permission-disable="transactions:delete">删除流水</button>
         * 
         * @param {HTMLElement} container - 容器元素
         */
        applyPermissionsToDisable(container = document.body) {
            if (!this.initialized) {
                return;
            }

            const disableElements = container.querySelectorAll('[data-permission-disable]');
            disableElements.forEach(el => {
                const requiredPerm = el.getAttribute('data-permission-disable');
                if (requiredPerm && !this.hasPermission(requiredPerm)) {
                    el.disabled = true;
                    el.classList.add('opacity-50', 'cursor-not-allowed');
                    el.title = '权限不足';
                    console.log(`[PermissionManager] 🚫 禁用元素（缺少权限: ${requiredPerm})`);
                }
            });
        }

        /**
         * 检查并提示权限不足
         * @param {string} permissionCode - 权限代码
         * @param {string} actionName - 操作名称（用于提示）
         * @returns {boolean} - 是否有权限
         */
        checkAndAlert(permissionCode, actionName = '此操作') {
            if (!this.hasPermission(permissionCode)) {
                alert(`权限不足：您没有"${actionName}"的权限（${permissionCode}）`);
                return false;
            }
            return true;
        }

        /**
         * 向后端请求权限检查（实时检查，不依赖缓存）
         * @param {string} permissionCode - 权限代码
         * @returns {Promise<boolean>}
         */
        async checkPermissionFromServer(permissionCode) {
            try {
                const response = await fetch('/api/permissions/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ permission_code: permissionCode })
                });

                const result = await response.json();
                if (result.success && result.data) {
                    return result.data.has_permission === true;
                }
                return false;
            } catch (error) {
                console.error('[PermissionManager] ❌ 服务器权限检查失败:', error);
                return false;
            }
        }
    }

    // 创建全局单例
    window.PermissionManager = window.PermissionManager || new PermissionManager();

    console.log('[PermissionManager] 🔐 权限管理器已加载（全局单例：window.PermissionManager）');

})(window);
