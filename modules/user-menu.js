// 用户菜单模块 - 个人信息、修改密码、切换公司、退出登录
(function() {
    'use strict';

    // 初始化用户菜单
    function initUserMenu() {
        console.log('[UserMenu] 🚀 初始化用户菜单...');
        
        // 更新用户信息显示
        updateUserInfo();
        
        // 绑定用户头像点击事件
        bindUserAvatarClick();
        
        // 绑定退出登录事件
        bindLogoutEvent();
    }

    // 更新用户信息显示
    function updateUserInfo() {
        const savedUser = localStorage.getItem('ajkuaiji_current_user');
        if (!savedUser) return;

        try {
            const user = JSON.parse(savedUser);
            console.log('[UserMenu] 👤 当前用户:', user.username);

            // 更新用户名显示
            const usernameEl = document.getElementById('currentUsername');
            if (usernameEl) {
                usernameEl.textContent = user.name || user.username;
            }

            // 更新角色显示
            const roleEl = document.getElementById('currentUserRole');
            if (roleEl) {
                const roleMap = {
                    'super_admin': '超级管理员',
                    'admin': '管理员',
                    'financial_entry': '财务录入',
                    'financial_view': '财务查看',
                    'financial_audit': '财务审核'
                };
                roleEl.textContent = roleMap[user.role] || user.role;
            }

            // 更新头像首字母
            const avatarEl = document.getElementById('userAvatar');
            if (avatarEl) {
                const firstChar = (user.name || user.username).charAt(0);
                avatarEl.textContent = firstChar;
            }

            // 更新公司信息
            updateCompanyInfo(user.company_id);

        } catch (error) {
            console.error('[UserMenu] ❌ 解析用户信息失败:', error);
        }
    }

    // 更新公司信息
    async function updateCompanyInfo(companyId) {
        if (!companyId) return;

        try {
            // 从API获取公司列表
            const result = await window.api.getCompanies();
            if (result.success && result.data) {
                const company = result.data.find(c => c.id === companyId);
                if (company) {
                    const companyEl = document.getElementById('currentCompanyName');
                    if (companyEl) {
                        companyEl.textContent = company.name;
                    }
                }
            }
        } catch (error) {
            console.log('[UserMenu] ℹ️ 获取公司信息失败，使用LocalStorage降级');
            // 降级使用database.js
            if (window.db && window.db.getCompanies) {
                const result = window.db.getCompanies();
                if (result.success && result.data) {
                    const company = result.data.find(c => c.id === companyId);
                    if (company) {
                        const companyEl = document.getElementById('currentCompanyName');
                        if (companyEl) {
                            companyEl.textContent = company.name;
                        }
                    }
                }
            }
        }
    }

    // 绑定用户头像点击事件（显示/隐藏下拉菜单）
    function bindUserAvatarClick() {
        const userMenuBtn = document.getElementById('userMenuButton');
        const userDropdown = document.getElementById('userDropdown');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                userDropdown.classList.toggle('hidden');
                console.log('[UserMenu] 📋 切换下拉菜单显示');
            });

            // 点击其他地方关闭菜单
            document.addEventListener('click', function() {
                if (!userDropdown.classList.contains('hidden')) {
                    userDropdown.classList.add('hidden');
                }
            });

            // 阻止下拉菜单内部点击关闭
            userDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }

    // 打开个人信息模态框
    window.openUserProfileModal = function() {
        console.log('[UserMenu] 👤 打开个人信息模态框');
        const modal = document.getElementById('userProfileModal');
        if (modal) {
            modal.classList.remove('hidden');
            loadUserProfile();
        }
    };

    // 关闭个人信息模态框
    window.closeUserProfileModal = function() {
        const modal = document.getElementById('userProfileModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    // 加载用户个人信息
    function loadUserProfile() {
        const savedUser = localStorage.getItem('ajkuaiji_current_user');
        if (!savedUser) return;

        try {
            const user = JSON.parse(savedUser);
            
            document.getElementById('profileUsername').value = user.username || '';
            document.getElementById('profileName').value = user.name || '';
            document.getElementById('profileAlias').value = user.alias || '';
            document.getElementById('profileRole').value = user.role || '';

        } catch (error) {
            console.error('[UserMenu] ❌ 加载用户信息失败:', error);
        }
    }

    // 保存用户个人信息
    window.saveUserProfile = async function() {
        console.log('[UserMenu] 💾 保存个人信息...');

        const savedUser = localStorage.getItem('ajkuaiji_current_user');
        if (!savedUser) {
            alert('未找到当前用户信息');
            return;
        }

        try {
            const user = JSON.parse(savedUser);
            const userId = user.id;

            const userData = {
                name: document.getElementById('profileName').value,
                alias: document.getElementById('profileAlias').value
            };

            // 调用API更新用户信息
            const result = await window.api.updateUser(userId, userData);

            if (result.success) {
                // 更新localStorage中的用户信息
                const updatedUser = { ...user, ...userData };
                localStorage.setItem('ajkuaiji_current_user', JSON.stringify(updatedUser));

                // 更新显示
                updateUserInfo();

                alert('保存成功！');
                closeUserProfileModal();
            } else {
                alert('保存失败：' + result.message);
            }
        } catch (error) {
            console.error('[UserMenu] ❌ 保存失败:', error);
            alert('保存失败：' + error.message);
        }
    };

    // 打开修改密码模态框
    window.openChangePasswordModal = function() {
        console.log('[UserMenu] 🔐 打开修改密码模态框');
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.classList.remove('hidden');
            // 清空表单
            document.getElementById('changePasswordForm').reset();
        }
    };

    // 关闭修改密码模态框
    window.closeChangePasswordModal = function() {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    // 修改密码
    window.changePassword = async function() {
        console.log('[UserMenu] 🔑 修改密码...');

        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 验证
        if (!oldPassword || !newPassword || !confirmPassword) {
            alert('请填写所有字段');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('两次输入的新密码不一致');
            return;
        }

        if (newPassword.length < 6) {
            alert('新密码长度不能少于6位');
            return;
        }

        const savedUser = localStorage.getItem('ajkuaiji_current_user');
        if (!savedUser) {
            alert('未找到当前用户信息');
            return;
        }

        try {
            const user = JSON.parse(savedUser);

            // 先验证旧密码
            const loginResult = await window.api.login(user.username, oldPassword);
            if (!loginResult.success) {
                alert('旧密码错误');
                return;
            }

            // 更新密码
            const result = await window.api.updateUser(user.id, { password: newPassword });

            if (result.success) {
                // 更新localStorage中的密码（Base64编码）
                localStorage.setItem('ajkuaiji_saved_pwd', btoa(newPassword));

                alert('密码修改成功！');
                closeChangePasswordModal();
            } else {
                alert('密码修改失败：' + result.message);
            }
        } catch (error) {
            console.error('[UserMenu] ❌ 修改密码失败:', error);
            alert('修改密码失败：' + error.message);
        }
    };

    // 打开切换公司模态框
    window.openSwitchCompanyModal = async function() {
        console.log('[UserMenu] 🏢 打开切换公司模态框');
        const modal = document.getElementById('switchCompanyModal');
        if (modal) {
            modal.classList.remove('hidden');
            await loadCompanyList();
        }
    };

    // 关闭切换公司模态框
    window.closeSwitchCompanyModal = function() {
        const modal = document.getElementById('switchCompanyModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    // 加载公司列表
    async function loadCompanyList() {
        try {
            const result = await window.api.getCompanies();
            const companies = result.success ? result.data : [];

            const savedUser = localStorage.getItem('ajkuaiji_current_user');
            const currentCompanyId = savedUser ? JSON.parse(savedUser).company_id : null;

            const listEl = document.getElementById('companyList');
            if (listEl && companies.length > 0) {
                listEl.innerHTML = companies.map(company => `
                    <div class="company-item flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 cursor-pointer ${company.id === currentCompanyId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}"
                         onclick="switchCompany(${company.id}, '${company.name}')">
                        <div class="flex items-center">
                            <i class="fas fa-building text-gray-400 mr-3"></i>
                            <div>
                                <p class="font-medium text-gray-900">${company.name}</p>
                                <p class="text-xs text-gray-500">${company.tax_number || ''}</p>
                            </div>
                        </div>
                        ${company.id === currentCompanyId ? '<i class="fas fa-check text-blue-600"></i>' : ''}
                    </div>
                `).join('');
            } else {
                listEl.innerHTML = '<p class="text-center text-gray-500">暂无可切换的公司</p>';
            }
        } catch (error) {
            console.error('[UserMenu] ❌ 加载公司列表失败:', error);
        }
    }

    // 切换公司
    window.switchCompany = function(companyId, companyName) {
        console.log('[UserMenu] 🔄 切换公司:', companyName);

        const savedUser = localStorage.getItem('ajkuaiji_current_user');
        if (!savedUser) return;

        try {
            const user = JSON.parse(savedUser);
            user.company_id = companyId;
            localStorage.setItem('ajkuaiji_current_user', JSON.stringify(user));

            // 更新db对象
            if (window.db && window.db.setCurrentUser) {
                window.db.setCurrentUser(user);
            }

            alert('已切换到：' + companyName);
            closeSwitchCompanyModal();

            // 刷新页面以加载新公司数据
            location.reload();
        } catch (error) {
            console.error('[UserMenu] ❌ 切换公司失败:', error);
        }
    };

    // 绑定退出登录事件
    function bindLogoutEvent() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }

    // 退出登录
    function handleLogout() {
        console.log('[UserMenu] 🚪 退出登录...');

        if (confirm('确定要退出登录吗？')) {
            // 清除localStorage中的登录信息
            localStorage.removeItem('ajkuaiji_logged_in');
            localStorage.removeItem('ajkuaiji_current_user');
            localStorage.removeItem('ajkuaiji_saved_pwd');

            console.log('[UserMenu] 🧹 已清除登录信息');

            // 刷新页面跳转到登录页
            location.reload();
        }
    }

    // 导出初始化函数
    window.initUserMenu = initUserMenu;

})();
