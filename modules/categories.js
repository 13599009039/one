// 类别管理模块

// 全局变量存储类别数据
let categories = [];

// 初始化类别管理页面
function initCategoriesPage() {
    console.log('初始化类别管理页面');
    
    // 加载类别数据
    loadCategoriesData();
    
    // 设置事件监听器
    setupCategoryEventListeners();
}

// 将类别数据保存到本地存储
function saveCategoriesToStorage() {
    localStorage.setItem('categories_data', JSON.stringify(categories));
    console.log('类别数据已保存到本地存储');
}

// 从本地存储加载类别数据
function loadCategoriesFromStorage() {
    const savedData = localStorage.getItem('categories_data');
    if (savedData) {
        try {
            return JSON.parse(savedData);
        } catch (e) {
            console.error('解析类别数据失败:', e);
            return getMockCategories();
        }
    }
    return getMockCategories();
}

// 加载类别数据
function loadCategoriesData() {
    console.log('加载类别数据');
    
    try {
        // 从本地存储加载数据
        categories = loadCategoriesFromStorage();
        
        // 渲染类别表格
        renderCategoriesTable();
    } catch (error) {
        console.error('加载类别数据失败:', error);
        alert('加载类别数据失败，请稍后重试');
        
        // 使用模拟数据作为后备
        categories = getMockCategories();
        renderCategoriesTable();
    }
}

// 获取模拟类别数据
function getMockCategories() {
    return [
        { id: 1, name: "主营业务收入", type: "收入", status: "enabled" },
        { id: 2, name: "其他业务收入", type: "收入", status: "enabled" },
        { id: 3, name: "办公用品支出", type: "支出", status: "enabled" },
        { id: 4, name: "员工工资支出", type: "支出", status: "enabled" },
        { id: 5, name: "房租支出", type: "支出", status: "enabled" },
        { id: 6, name: "水电费支出", type: "支出", status: "enabled" }
    ];
}

// 渲染类别表格
function renderCategoriesTable() {
    console.log('渲染类别表格');
    
    const tableBody = document.getElementById('categoriesTableBody');
    if (!tableBody) {
        console.error('类别表格主体未找到');
        return;
    }
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 添加类别行
    categories.forEach(category => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // 类别名称
        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900';
        nameCell.textContent = category.name;
        
        // 类型
        const typeCell = document.createElement('td');
        typeCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        
        // 根据类型添加样式
        const typeBadge = document.createElement('span');
        typeBadge.className = category.type === '收入' ? 
            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800' : 
            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800';
        typeBadge.textContent = category.type;
        typeCell.appendChild(typeBadge);
        
        // 父类别
        const parentCell = document.createElement('td');
        parentCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        parentCell.textContent = category.parent || '无';
        
        // 状态
        const statusCell = document.createElement('td');
        statusCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        
        // 根据状态添加样式
        const statusBadge = document.createElement('span');
        statusBadge.className = category.status === 'enabled' ? 
            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800' : 
            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800';
        statusBadge.textContent = category.status === 'enabled' ? '启用' : '禁用';
        statusCell.appendChild(statusBadge);
        
        // 操作
        const actionCell = document.createElement('td');
        actionCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        
        // 编辑按钮
        const editButton = document.createElement('button');
        editButton.className = 'text-indigo-600 hover:text-indigo-900 mr-4';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = '编辑';
        editButton.addEventListener('click', () => editCategory(category));
        
        // 删除按钮
        const deleteButton = document.createElement('button');
        deleteButton.className = 'text-red-600 hover:text-red-900';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = '删除';
        deleteButton.addEventListener('click', () => deleteCategory(category.id));
        
        actionCell.appendChild(editButton);
        actionCell.appendChild(deleteButton);
        
        // 添加单元格到行
        row.appendChild(nameCell);
        row.appendChild(typeCell);
        row.appendChild(parentCell);
        row.appendChild(statusCell);
        row.appendChild(actionCell);
        
        // 添加行到表格
        tableBody.appendChild(row);
    });
}

// 设置类别相关事件监听器
function setupCategoryEventListeners() {
    console.log('设置类别事件监听器');
    
    // 添加类别按钮
    const addCategoryButton = document.getElementById('addCategoryBtn');
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', showAddCategoryModal);
    }
    
    // 类别表单提交
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategoryFormSubmit);
    }
    
    // 关闭模态框按钮
    const closeModalButtons = document.querySelectorAll('#categoryModal .text-gray-400');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', hideCategoryModal);
    });
    
    // 点击模态框外部关闭
    const modal = document.querySelector('#categoryModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideCategoryModal();
            }
        });
    }
}

// 显示添加类别模态框
function showAddCategoryModal() {
    console.log('显示添加类别模态框');
    
    // 重置表单
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.reset();
    }
    
    // 更新模态框标题
    const modalTitle = document.getElementById('categoryModalTitle');
    if (modalTitle) {
        modalTitle.textContent = '添加类别';
    }
    
    // 清除当前编辑的类别ID
    delete window.currentEditingCategoryId;
    
    // 显示模态框
    const modal = document.querySelector('#categoryModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// 显示编辑类别模态框
function editCategory(category) {
    console.log('编辑类别:', category);
    
    // 更新模态框标题
    const modalTitle = document.getElementById('categoryModalTitle');
    if (modalTitle) {
        modalTitle.textContent = '编辑类别';
    }
    
    // 填充表单数据
    const incomeTypeInput = document.getElementById('incomeType');
    const categoryTypeSelect = document.getElementById('categoryType');
    
    if (incomeTypeInput) {
        incomeTypeInput.value = category.name;
    }
    
    if (categoryTypeSelect) {
        categoryTypeSelect.value = category.type;
    }
    
    // 保存当前编辑的类别ID
    window.currentEditingCategoryId = category.id;
    
    // 显示模态框
    const modal = document.querySelector('#categoryModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// 隐藏类别模态框
function hideCategoryModal() {
    console.log('隐藏类别模态框');
    
    const modal = document.querySelector('#categoryModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // 清除当前编辑的类别ID
    delete window.currentEditingCategoryId;
}

// 处理类别表单提交
function handleCategoryFormSubmit(e) {
    console.log('处理类别表单提交');
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const categoryName = document.getElementById('incomeType').value.trim();
    const categoryType = document.getElementById('categoryType').value;
    
    // 验证表单
    if (!categoryName) {
        alert('请输入类别名称');
        return;
    }
    
    try {
        if (window.currentEditingCategoryId) {
            // 编辑现有类别
            updateCategory(window.currentEditingCategoryId, categoryName, categoryType);
        } else {
            // 添加新类别
            addCategory(categoryName, categoryType);
        }
        
        // 隐藏模态框
        hideCategoryModal();
        
        // 重新渲染表格
        renderCategoriesTable();
        
        // 显示成功消息
        alert('操作成功！');
    } catch (error) {
        console.error('处理类别表单失败:', error);
        alert('操作失败，请稍后重试');
    }
}

// 添加类别
function addCategory(name, type) {
    console.log('添加类别:', name, type);
    
    // 创建新类别对象
    const newCategory = {
        id: categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1,
        name: name,
        type: type,
        status: 'enabled'
    };
    
    // 添加到类别数组
    categories.push(newCategory);
    
    // 保存到本地存储
    saveCategoriesToStorage();
    
    // 如果有数据库接口，保存到数据库
    if (typeof window.db !== 'undefined' && db.addCategory) {
        db.addCategory(newCategory);
    }
}

// 更新类别
function updateCategory(id, name, type) {
    console.log('更新类别:', id, name, type);
    
    // 查找类别索引
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) {
        throw new Error('类别未找到');
    }
    
    // 更新类别
    categories[index] = {
        ...categories[index],
        name: name,
        type: type
    };
    
    // 保存到本地存储
    saveCategoriesToStorage();
    
    // 如果有数据库接口，保存到数据库
    if (typeof window.db !== 'undefined' && db.updateCategory) {
        db.updateCategory(categories[index]);
    }
}

// 删除类别
function deleteCategory(id) {
    console.log('删除类别:', id);
    
    // 确认删除
    if (!confirm('确定要删除这个类别吗？')) {
        return;
    }
    
    try {
        // 查找类别索引
        const index = categories.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error('类别未找到');
        }
        
        // 删除类别
        categories.splice(index, 1);
        
        // 保存到本地存储
        saveCategoriesToStorage();
        
        // 如果有数据库接口，保存到数据库
        if (typeof window.db !== 'undefined' && db.deleteCategory) {
            db.deleteCategory(id);
        }
        
        // 重新渲染表格
        renderCategoriesTable();
        
        // 显示成功消息
        alert('删除成功！');
    } catch (error) {
        console.error('删除类别失败:', error);
        alert('删除失败，请稍后重试');
    }
}

// 导出函数
if (typeof window !== 'undefined') {
    window.initCategoriesPage = initCategoriesPage;
}
