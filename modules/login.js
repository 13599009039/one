// 登录处理函数（调用 API）
async function handleLogin(username, password) {
    try {
        showLoading();
        console.log('[Login] 📞 调用 API 登录...');
        
        const result = await window.api.login(username, password);
        
        if (result.success) {
            console.log('[Login] ✅ 登录成功:', result.user.username);
            
            // ✅ 不再使用localStorage，Session由后端管理
            // ✅ 移除旧代码：localStorage.setItem('ajkuaiji_logged_in', 'true');
            // ✅ 移除旧代码：localStorage.setItem('ajkuaiji_current_user', JSON.stringify(result.user));
            // ✅ 移除旧代码：localStorage.setItem('ajkuaiji_saved_pwd', btoa(password));
            
            console.log('[Login] 💾 Session由后端管理，不再使用localStorage');
            
            // 设置全局当前用户
            window.currentUser = result.user;
            console.log('[Login] ✅ 已设置window.currentUser:', result.user.username);
            
            // 初始化权限管理器
            console.log('[Login] 🔐 初始化权限管理器...');
            if (window.PermissionManager) {
                await window.PermissionManager.init(true); // 强制刷新
                console.log('[Login] ✅ 权限管理器已初始化');
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

// 检查登录状态（Session验证）
async function checkLoginStatus() {
    console.log('[Login] 🔍 开始检查登录状态...');
    
    // ✅ 不再从 localStorage 读取，改用 API 验证 Session
    
    const loginPage = document.getElementById('loginPage');
    const mainPage = document.getElementById('mainPage');
    
    try {
        // 检查window.api是否可用
        if (typeof window.api === 'undefined' || !window.api.getCurrentUser) {
            console.error('[Login] ❌ window.api未定义，无法验证登录');
            throw new Error('API模块未加载');
        }
        
        console.log('[Login] 🔐 准备调用API验证Session...');
        
        // 调用API获取当前登录用户（Session验证）
        const result = await window.api.getCurrentUser();
        
        if (result.success) {
            console.log('[Login] ✅ Session验证成功！自动登录用户:', result.user.username);
            
            // 设置全局当前用户
            window.currentUser = result.user;
            console.log('[Login] ✅ 已设置window.currentUser:', result.user.username);
            
            // 初始化权限管理器
            console.log('[Login] 🔐 初始化权限管理器...');
            if (window.PermissionManager) {
                await window.PermissionManager.init(false); // 尝试从缓存加载
                console.log('[Login] ✅ 权限管理器已初始化');
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
                
                console.log('[Login] ✨ 自动登录完成！');
            } else {
                console.error('[Login] ❌ 页面元素未找到:', { loginPage: !!loginPage, mainPage: !!mainPage });
            }
        } else {
            console.warn('[Login] ⚠️ Session验证失败:', result.message);
            throw new Error(result.message || 'Session验证失败');
        }
    } catch (error) {
        console.error('[Login] ❌ 自动登录失败:', error.message);
        console.error('[Login] 📋 错误详情:', error);
        
        // ✅ 不需要清除localStorage，因为已经不用了
        console.log('[Login] ℹ️ Session已过期或未登录');
        
        // 显示登录页面
        if (loginPage && mainPage) {
            console.log('[Login] 🔙 返回登录页面');
            loginPage.style.display = 'flex';
            mainPage.style.display = 'none';
            loginPage.classList.remove('hidden');
            mainPage.classList.add('hidden');
        }
    }
}

// 导出到全局
window.checkLoginStatus = checkLoginStatus;
console.log('✅ [login.js] checkLoginStatus已导出到window');