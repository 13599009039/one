/**
 * 增强型可搜索下拉框组件
 * 支持拼音首字母搜索、键盘导航、自定义渲染
 * v1.0.0
 */

(function(window) {
    'use strict';
    
    /**
     * 创建可搜索下拉框
     * @param {HTMLSelectElement} originalSelect - 原始select元素
     * @param {Object} options - 配置选项
     */
    function createSearchableSelect(originalSelect, options = {}) {
        if (!originalSelect || originalSelect.tagName !== 'SELECT') {
            console.warn('[SearchableSelect] Invalid select element');
            return null;
        }
        
        // 检查是否已经初始化
        if (originalSelect.dataset.searchable === 'true') {
            return null;
        }
        
        const config = {
            placeholder: options.placeholder || '请选择...',
            searchPlaceholder: options.searchPlaceholder || '输入搜索...',
            noResultText: options.noResultText || '无匹配结果',
            maxHeight: options.maxHeight || '200px',
            renderItem: options.renderItem || null, // 自定义渲染函数
            onSelect: options.onSelect || null, // 选择回调
            getSearchText: options.getSearchText || null, // 自定义搜索文本获取函数
            ...options
        };
        
        // 获取原始选项
        const originalOptions = Array.from(originalSelect.options).map(opt => ({
            value: opt.value,
            text: opt.textContent,
            disabled: opt.disabled,
            selected: opt.selected,
            dataset: { ...opt.dataset }
        }));
        
        // 创建容器
        const container = document.createElement('div');
        container.className = 'searchable-select-container relative';
        container.style.width = '100%';
        
        // 创建显示框
        const display = document.createElement('div');
        display.className = 'searchable-select-display flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';
        display.tabIndex = 0;
        
        const displayText = document.createElement('span');
        displayText.className = 'searchable-select-text truncate text-sm';
        displayText.textContent = config.placeholder;
        
        const displayArrow = document.createElement('span');
        displayArrow.className = 'searchable-select-arrow ml-2 text-gray-400 transition-transform';
        displayArrow.innerHTML = '<i class="fas fa-chevron-down text-xs"></i>';
        
        display.appendChild(displayText);
        display.appendChild(displayArrow);
        
        // 创建下拉面板
        const dropdown = document.createElement('div');
        dropdown.className = 'searchable-select-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg hidden';
        dropdown.style.maxHeight = config.maxHeight;
        
        // 创建搜索框
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'p-2 border-b border-gray-200';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'searchable-select-input w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';
        searchInput.placeholder = config.searchPlaceholder;
        
        searchWrapper.appendChild(searchInput);
        dropdown.appendChild(searchWrapper);
        
        // 创建选项列表
        const optionsList = document.createElement('div');
        optionsList.className = 'searchable-select-options overflow-y-auto';
        optionsList.style.maxHeight = `calc(${config.maxHeight} - 60px)`;
        dropdown.appendChild(optionsList);
        
        container.appendChild(display);
        container.appendChild(dropdown);
        
        // 隐藏原始select但保留在DOM中
        originalSelect.style.display = 'none';
        originalSelect.dataset.searchable = 'true';
        originalSelect.parentNode.insertBefore(container, originalSelect);
        
        // 状态
        let isOpen = false;
        let filteredOptions = [...originalOptions];
        let highlightedIndex = -1;
        let selectedValue = originalSelect.value || '';
        
        // 渲染选项
        function renderOptions() {
            optionsList.innerHTML = '';
            
            if (filteredOptions.length === 0) {
                const noResult = document.createElement('div');
                noResult.className = 'px-3 py-2 text-sm text-gray-500 text-center';
                noResult.textContent = config.noResultText;
                optionsList.appendChild(noResult);
                return;
            }
            
            filteredOptions.forEach((opt, index) => {
                if (opt.value === '' && opt.text === config.placeholder) return;
                
                const item = document.createElement('div');
                item.className = 'searchable-select-option px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors';
                item.dataset.value = opt.value;
                item.dataset.index = index;
                
                if (opt.value === selectedValue) {
                    item.classList.add('bg-blue-100', 'text-blue-700');
                }
                
                if (index === highlightedIndex) {
                    item.classList.add('bg-blue-50');
                }
                
                if (opt.disabled) {
                    item.classList.add('text-gray-400', 'cursor-not-allowed');
                    item.classList.remove('hover:bg-blue-50');
                }
                
                // 自定义渲染或默认渲染
                if (config.renderItem) {
                    item.innerHTML = config.renderItem(opt);
                } else {
                    item.textContent = opt.text;
                }
                
                // 点击选择
                if (!opt.disabled) {
                    item.addEventListener('click', () => selectOption(opt));
                }
                
                optionsList.appendChild(item);
            });
        }
        
        // 过滤选项
        function filterOptions(keyword) {
            if (!keyword) {
                filteredOptions = [...originalOptions];
            } else {
                filteredOptions = originalOptions.filter(opt => {
                    if (opt.value === '') return false;
                    
                    let searchText;
                    if (config.getSearchText) {
                        searchText = config.getSearchText(opt);
                    } else {
                        searchText = opt.text;
                    }
                    
                    // 使用拼音搜索
                    if (window.PinyinSearch) {
                        return window.PinyinSearch.fuzzyMatch(searchText, keyword);
                    }
                    
                    // 降级：普通包含匹配
                    return searchText.toLowerCase().includes(keyword.toLowerCase());
                });
            }
            highlightedIndex = filteredOptions.length > 0 ? 0 : -1;
            renderOptions();
        }
        
        // 选择选项
        function selectOption(opt) {
            selectedValue = opt.value;
            displayText.textContent = opt.text || config.placeholder;
            displayText.classList.toggle('text-gray-400', !opt.value);
            
            // 更新原始select
            originalSelect.value = opt.value;
            originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 回调
            if (config.onSelect) {
                config.onSelect(opt);
            }
            
            closeDropdown();
        }
        
        // 打开下拉
        function openDropdown() {
            if (isOpen) return;
            isOpen = true;
            dropdown.classList.remove('hidden');
            displayArrow.style.transform = 'rotate(180deg)';
            display.classList.add('border-blue-500', 'ring-1', 'ring-blue-500');
            searchInput.value = '';
            filterOptions('');
            setTimeout(() => searchInput.focus(), 10);
        }
        
        // 关闭下拉
        function closeDropdown() {
            if (!isOpen) return;
            isOpen = false;
            dropdown.classList.add('hidden');
            displayArrow.style.transform = '';
            display.classList.remove('border-blue-500', 'ring-1', 'ring-blue-500');
            highlightedIndex = -1;
        }
        
        // 切换下拉
        function toggleDropdown() {
            isOpen ? closeDropdown() : openDropdown();
        }
        
        // 键盘导航
        function handleKeydown(e) {
            if (!isOpen) {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    openDropdown();
                }
                return;
            }
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    highlightedIndex = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
                    renderOptions();
                    scrollToHighlighted();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    highlightedIndex = Math.max(highlightedIndex - 1, 0);
                    renderOptions();
                    scrollToHighlighted();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                        selectOption(filteredOptions[highlightedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    closeDropdown();
                    display.focus();
                    break;
                case 'Tab':
                    closeDropdown();
                    break;
            }
        }
        
        // 滚动到高亮项
        function scrollToHighlighted() {
            const highlighted = optionsList.querySelector(`[data-index="${highlightedIndex}"]`);
            if (highlighted) {
                highlighted.scrollIntoView({ block: 'nearest' });
            }
        }
        
        // 绑定事件
        display.addEventListener('click', toggleDropdown);
        display.addEventListener('keydown', handleKeydown);
        
        searchInput.addEventListener('input', (e) => {
            filterOptions(e.target.value);
        });
        searchInput.addEventListener('keydown', handleKeydown);
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                closeDropdown();
            }
        });
        
        // 初始化显示
        const initialOption = originalOptions.find(opt => opt.value === selectedValue);
        if (initialOption && initialOption.value) {
            displayText.textContent = initialOption.text;
            displayText.classList.remove('text-gray-400');
        } else {
            displayText.classList.add('text-gray-400');
        }
        
        // 返回API
        return {
            container,
            getValue: () => selectedValue,
            setValue: (value) => {
                const opt = originalOptions.find(o => o.value === value);
                if (opt) selectOption(opt);
            },
            refresh: (newOptions) => {
                // 刷新选项（用于动态数据）
                originalOptions.length = 0;
                originalOptions.push(...newOptions);
                filteredOptions = [...originalOptions];
                renderOptions();
            },
            destroy: () => {
                container.remove();
                originalSelect.style.display = '';
                originalSelect.dataset.searchable = 'false';
            },
            open: openDropdown,
            close: closeDropdown
        };
    }
    
    /**
     * 初始化页面上所有带 data-searchable 属性的 select
     */
    function initAllSearchableSelects() {
        const selects = document.querySelectorAll('select[data-searchable="init"]');
        selects.forEach(select => {
            createSearchableSelect(select);
        });
    }
    
    // 暴露到全局
    window.SearchableSelect = {
        create: createSearchableSelect,
        initAll: initAllSearchableSelects
    };
    
    console.log('[SearchableSelect] ✅ 可搜索下拉框组件已加载');
    
})(window);
