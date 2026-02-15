/**
 * 租户开通流程前端逻辑
 */

const API_BASE = '/api/onboarding';

// 全局状态
let currentStep = 1;
let onboardingData = {
    token: '',
    companyId: null,
    companyName: '',
    userId: null,
    username: '',
    departments: [],
    roles: []
};

// ==================== 工具函数 ====================

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideError(elementId) {
    const element = document.getElementById(elementId);
    element.classList.add('hidden');
}

function showMessage(message, type = 'success') {
    const color = type === 'success' ? 'green' : 'red';
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 bg-${color}-500 text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        return { success: response.ok, data, status: response.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==================== 步骤控制 ====================

function goToStep(step) {
    // 隐藏所有步骤内容
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.add('hidden');
    });
    
    // 显示目标步骤
    document.getElementById(`step${step}`).classList.remove('hidden');
    document.getElementById(`step${step}`).classList.add('fade-in');
    
    // 更新步骤指示器
    document.querySelectorAll('.step').forEach((el, index) => {
        const stepNum = index + 1;
        el.classList.remove('active', 'completed');
        
        if (stepNum < step) {
            el.classList.add('completed');
        } else if (stepNum === step) {
            el.classList.add('active');
        }
    });
    
    currentStep = step;
}

// ==================== 步骤1: 验证令牌 ====================

async function verifyToken() {
    const token = document.getElementById('token').value.trim();
    
    if (!token) {
        showError('tokenError', '请输入开通令牌');
        return;
    }
    
    hideError('tokenError');
    
    const result = await apiRequest('/verify-token', {
        method: 'POST',
        body: JSON.stringify({ token })
    });
    
    if (result.success && result.data.success) {
        // 验证成功
        const company = result.data.data;
        onboardingData.token = token;
        onboardingData.companyId = company.company_id;
        onboardingData.companyName = company.company_name;
        
        // 显示公司信息
        document.getElementById('companyName').textContent = company.company_name;
        document.getElementById('companyInfo').classList.remove('hidden');
        
        // 延迟跳转到下一步
        setTimeout(() => {
            goToStep(2);
        }, 1000);
    } else {
        showError('tokenError', result.data?.message || '令牌验证失败');
    }
}

// 从URL参数自动填充token
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        document.getElementById('token').value = token;
    }
});

// ==================== 步骤2: 创建主账号 ====================

async function checkUsername() {
    const username = document.getElementById('username').value.trim();
    const checkElement = document.getElementById('usernameCheck');
    
    if (!username) {
        checkElement.textContent = '';
        return;
    }
    
    const result = await apiRequest('/check-username', {
        method: 'POST',
        body: JSON.stringify({ username })
    });
    
    if (result.success && result.data.success) {
        if (result.data.data.available) {
            checkElement.textContent = '✓ 用户名可用';
            checkElement.className = 'text-sm mt-1 text-green-600';
        } else {
            checkElement.textContent = '✗ 用户名已被使用';
            checkElement.className = 'text-sm mt-1 text-red-600';
        }
    }
}

async function createAdmin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    
    // 验证必填字段
    if (!username || !password || !name) {
        showError('adminError', '请填写所有必填字段');
        return;
    }
    
    if (password.length < 6) {
        showError('adminError', '密码至少需要6位字符');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('adminError', '两次输入的密码不一致');
        return;
    }
    
    hideError('adminError');
    
    const result = await apiRequest('/create-admin', {
        method: 'POST',
        body: JSON.stringify({
            token: onboardingData.token,
            username,
            password,
            name,
            phone,
            email
        })
    });
    
    if (result.success && result.data.success) {
        // 创建成功
        onboardingData.userId = result.data.data.user_id;
        onboardingData.username = username;
        
        showMessage('主账号创建成功');
        
        setTimeout(() => {
            goToStep(3);
        }, 500);
    } else {
        showError('adminError', result.data?.message || '创建账号失败');
    }
}

// ==================== 步骤3: 基础配置 ====================

function toggleDepartment(button, name) {
    button.classList.toggle('bg-indigo-500');
    button.classList.toggle('text-white');
    
    const index = onboardingData.departments.findIndex(d => d.name === name);
    if (index >= 0) {
        onboardingData.departments.splice(index, 1);
    } else {
        onboardingData.departments.push({ name });
    }
}

function toggleRole(button, name, code) {
    button.classList.toggle('bg-indigo-500');
    button.classList.toggle('text-white');
    
    const index = onboardingData.roles.findIndex(r => r.code === code);
    if (index >= 0) {
        onboardingData.roles.splice(index, 1);
    } else {
        onboardingData.roles.push({ name, code });
    }
}

async function saveBasicData() {
    // 即使没有选择任何数据也可以继续
    if (onboardingData.departments.length > 0 || onboardingData.roles.length > 0) {
        const result = await apiRequest('/init-basic-data', {
            method: 'POST',
            body: JSON.stringify({
                token: onboardingData.token,
                data: {
                    departments: onboardingData.departments,
                    roles: onboardingData.roles
                }
            })
        });
        
        if (!result.success || !result.data.success) {
            showMessage('基础数据保存失败，但不影响继续', 'error');
        }
    }
    
    // 完成开通
    await completeOnboarding();
}

async function completeOnboarding() {
    const result = await apiRequest('/complete', {
        method: 'POST',
        body: JSON.stringify({
            token: onboardingData.token
        })
    });
    
    if (result.success && result.data.success) {
        // 填充最终信息
        document.getElementById('finalCompanyName').textContent = onboardingData.companyName;
        document.getElementById('finalUsername').textContent = onboardingData.username;
        
        goToStep(4);
    } else {
        showMessage('完成开通失败：' + (result.data?.message || '未知错误'), 'error');
    }
}

// ==================== 步骤4: 完成 ====================

function goToSystem() {
    // 跳转到登录页
    window.location.href = '/financial_system.html';
}
