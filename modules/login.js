// 登录处理函数（调用 API）
async function handleLogin(username, password) {
    try {
        showLoading();
        console.log('[Login] 📞 调用 API 登录...');
        
        const result = await window.api.login(username, password);
        
        if (result.success) {
            console.log('[Login] ✅ 登录成功:', result.user.username);
            
            // 保存登录状态到 localStorage
            localStorage.setItem('ajkuaiji_logged_in', 'true');
            localStorage.setItem('ajkuaiji_current_user', JSON.stringify(result.user));
            localStorage.setItem('ajkuaiji_saved_pwd', btoa(password));
            
            console.log('[Login] 💾 已保存登录凭证到localStorage');
            
            // 设置当前用户到db对象（兼容旧模块）
            if (typeof window.db !== 'undefined' && window.db.setCurrentUser) {
                window.db.setCurrentUser(result.user);
                console.log('[Login] ✅ 已设置window.db.currentUser');
            }
            
            // 延迟后跳转主页面
            setTimeout(function() {
                hideLoading();
                
                const loginPage = document.getElementById('loginPage');
                const mainPage = document.getElementById('mainPage');
                
                if (loginPage && mainPage) {
                    loginPage.style.display = 'none';
                    mainPage.style.display = 'block';
                    loginPage.classList.add('hidden');
                    mainPage.classList.remove('hidden');
                    
                    console.log('[Login] 🎉 已切换到主页面，初始化系统...');
                    initSystem();
                    // ❌ 移除立即调用 showPage('dashboard')，由 initSystem() 内部的 restoreLastPage() 统一处理
                    // showPage('dashboard');
                } else {
                    console.error('[Login] ❌ 页面元素未找到');
                }
            }, 500);
        } else {
            hideLoading();
            alert(result.message || '用户名或密码错误');
        }
    } catch (error) {
        console.error('[Login] ❌ 登录失败:', error);
        hideLoading();
        alert('登录失败：' + error.message + '\n\n请检查：\n1. 后端 API 服务是否运行\n2. 网络连接是否正常');
    }
}

// 登录模块初始化
function initLoginForm() {
    console.log('[Login] 🚀 初始化登录模块...');
    
    // 立即检查登录状态（不等待DOM）
    checkLoginStatus();
    
    // 绑定登录表单提交事件
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            console.log('[Login] 📝 登录表单提交');
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            console.log('[Login] 👤 用户名:', username);
            
            // 使用 API 进行登录验证
            handleLogin(username, password);
        });
        console.log('[Login] ✅ 登录表单事件已绑定');
    } else {
        console.error('[Login] ❌ 登录表单未找到');
    }
}

// 检查登录状态（localStorage + API验证）
async function checkLoginStatus() {
    console.log('[Login] 🔍 开始检查登录状态...');
    
    const isLoggedIn = localStorage.getItem('ajkuaiji_logged_in') === 'true';
    const savedUser = localStorage.getItem('ajkuaiji_current_user');
    const savedPwd = localStorage.getItem('ajkuaiji_saved_pwd');
    
    console.log('[Login] 📦 localStorage状态:', {
        isLoggedIn,
        hasUser: !!savedUser,
        hasPwd: !!savedPwd
    });
    
    const loginPage = document.getElementById('loginPage');
    const mainPage = document.getElementById('mainPage');
    
    // 检查是否有完整的登录凭证
    if (isLoggedIn && savedUser && savedPwd) {
        try {
            const user = JSON.parse(savedUser);
            console.log('[Login] 👤 检测到已登录用户:', user.username);
            
            // 检查window.api是否可用
            if (typeof window.api === 'undefined' || !window.api.login) {
                console.error('[Login] ❌ window.api未定义，无法验证登录');
                throw new Error('API模块未加载');
            }
            
            // Base64解码密码
            const password = atob(savedPwd);
            console.log('[Login] 🔐 准备调用API验证登录...');
            
            // 调用API重新验证登录
            const result = await window.api.login(user.username, password);
            
            if (result.success) {
                console.log('[Login] ✅ API验证成功！自动登录用户:', result.user.username);
                
                // 更新localStorage中的用户信息
                localStorage.setItem('ajkuaiji_current_user', JSON.stringify(result.user));
                
                // 设置当前用户到db对象（兼容旧模块）
                if (typeof window.db !== 'undefined' && window.db.setCurrentUser) {
                    window.db.setCurrentUser(result.user);
                    console.log('[Login] ✅ 已设置window.db.currentUser');
                }
                
                // 切换到主页面
                if (loginPage && mainPage) {
                    console.log('[Login] 🎯 切换到主页面...');
                    loginPage.style.display = 'none';
                    mainPage.style.display = 'block';
                    loginPage.classList.add('hidden');
                    mainPage.classList.remove('hidden');
                    
                    console.log('[Login] 🚀 初始化系统...');
                    initSystem();
                    // ❌ 移除立即调用 showPage('dashboard')，由 initSystem() 内部的 restoreLastPage() 统一处理
                    // showPage('dashboard');
                    
                    console.log('[Login] ✨ 自动登录完成！');
                } else {
                    console.error('[Login] ❌ 页面元素未找到:', { loginPage: !!loginPage, mainPage: !!mainPage });
                }
            } else {
                console.warn('[Login] ⚠️ API验证失败:', result.message);
                throw new Error(result.message || 'API验证失败');
            }
        } catch (error) {
            console.error('[Login] ❌ 自动登录失败:', error.message);
            console.error('[Login] 📋 错误详情:', error);
            
            // 清除无效的登录状态
            console.log('[Login] 🧹 清除localStorage中的登录信息...');
            localStorage.removeItem('ajkuaiji_logged_in');
            localStorage.removeItem('ajkuaiji_current_user');
            localStorage.removeItem('ajkuaiji_saved_pwd');
            
            // 显示登录页面
            if (loginPage && mainPage) {
                console.log('[Login] 🔙 返回登录页面');
                loginPage.style.display = 'flex';
                mainPage.style.display = 'none';
                loginPage.classList.remove('hidden');
                mainPage.classList.add('hidden');
            }
        }
    } else {
        console.log('[Login] ℹ️ 未检测到登录凭证，显示登录页面');
        // 未登录，显示登录页面
        if (loginPage && mainPage) {
            loginPage.style.display = 'flex';
            mainPage.style.display = 'none';
            loginPage.classList.remove('hidden');
            mainPage.classList.add('hidden');
        }
    }
}