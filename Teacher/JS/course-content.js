// course-content.js - 课程内容管理功能 (IndexedDB 兼容版)
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化数据
    let materials = JSON.parse(localStorage.getItem('teacherMaterials')) || [];
    let courses = [];
    let uploadQueue = [];
    let selectedMaterials = new Set();
    let currentUploadIntervals = [];
    
    // DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadListContainer = document.getElementById('uploadListContainer');
    const uploadBtn = document.getElementById('uploadBtn');
    const clearUploadsBtn = document.getElementById('clearUploadsBtn');
    const materialsList = document.getElementById('materialsList');
    const noMaterials = document.getElementById('noMaterials');
    const materialCount = document.getElementById('materialCount');
    const materialSize = document.getElementById('materialSize');
    const courseSelect = document.getElementById('courseSelect');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const sortBy = document.getElementById('sortBy');
    const courseFilter = document.getElementById('courseFilter');
    const contentSearch = document.getElementById('contentSearch');
    const batchActions = document.getElementById('batchActions');
    const selectedCount = document.getElementById('selectedCount');
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');
    const deleteModal = document.getElementById('deleteModal');
    const uploadProgressModal = document.getElementById('uploadProgressModal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const storageUsage = document.getElementById('storageUsage');
    const usedStorage = document.getElementById('usedStorage');
    
    // 初始化页面
    await initPage();
    
    async function initPage() {
        try {
            // 1. 从IndexedDB加载课程数据
            courses = await window.courseManager.getPublishedCourses();
            
            // 2. 初始化材料数据
            materials = JSON.parse(localStorage.getItem('teacherMaterials')) || [];
            
            // 3. 初始化课程选择器
            initializeCourseSelectors();
            
            // 4. 渲染材料列表
            renderMaterials(materials);
            
            // 5. 更新存储使用情况
            updateStorageUsage();
            
            // 6. 设置事件监听器
            setupEventListeners();
            
            // 7. 设置拖拽上传
            setupDragAndDrop();
            
            // 8. 初始化示例数据（如果没有数据）
            if (materials.length === 0) {
                initializeSampleData();
            }
            
            // 监听课程数据更新事件
            window.addEventListener('courseDataUpdated', async function() {
                courses = await window.courseManager.getPublishedCourses();
                initializeCourseSelectors();
            });
        } catch (error) {
            console.error('初始化页面失败:', error);
            showNotification('页面初始化失败，请刷新页面重试', 'error');
        }
    }
    
    function initializeCourseSelectors() {
        // 更新课程选择器
        const courseSelect = document.getElementById('courseSelect');
        const courseFilter = document.getElementById('courseFilter');
        
        if (courseSelect) {
            // 清空现有选项（保留第一个"请选择课程"）
            courseSelect.innerHTML = '<option value="">请选择课程...</option>';
            
            // 添加动态课程选项
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.name} (${course.code})`;
                courseSelect.appendChild(option);
            });
        }
        
        if (courseFilter) {
            // 清空现有选项（保留"所有课程"）
            courseFilter.innerHTML = '<option value="all">所有课程</option>';
            
            // 添加动态课程选项
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.name} (${course.code})`;
                courseFilter.appendChild(option);
            });
        }
    }
    
    function initializeSampleData() {
        const sampleMaterials = [
            {
                id: 'material_1',
                name: '数据结构导论课件.pdf',
                description: '数据结构课程第一章课件，包含基本概念和复杂度分析',
                type: 'pdf',
                size: 2.4,
                courseId: '1',
                courseName: '数据结构与算法',
                uploadDate: '2023-09-15',
                uploadTime: '10:30',
                fileUrl: '#'
            },
            {
                id: 'material_2',
                name: '数据库设计案例.doc',
                description: '学生数据库设计项目案例',
                type: 'doc',
                size: 1.8,
                courseId: '2',
                courseName: '数据库系统原理',
                uploadDate: '2023-09-18',
                uploadTime: '14:20',
                fileUrl: '#'
            },
            {
                id: 'material_3',
                name: '计算机网络实验指导.pdf',
                description: '实验一：网络协议分析',
                type: 'pdf',
                size: 3.2,
                courseId: '3',
                courseName: '计算机网络',
                uploadDate: '2023-09-20',
                uploadTime: '09:15',
                fileUrl: '#'
            }
        ];
        
        materials = sampleMaterials;
        localStorage.setItem('teacherMaterials', JSON.stringify(materials));
        renderMaterials(materials);
        updateStorageUsage();
    }
    
    function setupEventListeners() {
        // 上传区域点击事件
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        // 文件选择事件
        fileInput.addEventListener('change', handleFileSelect);
        
        // 清除上传列表
        clearUploadsBtn.addEventListener('click', clearUploadList);
        
        // 上传按钮
        uploadBtn.addEventListener('click', startUpload);
        
        // 排序方式改变
        sortBy.addEventListener('change', function() {
            sortMaterials(this.value);
        });
        
        // 课程筛选
        courseFilter.addEventListener('change', function() {
            filterByCourse(this.value);
        });
        
        // 搜索功能
        if (contentSearch) {
            contentSearch.addEventListener('input', function() {
                searchMaterials(this.value);
            });
        }
        
        // 批量操作按钮
        downloadSelectedBtn.addEventListener('click', downloadSelectedMaterials);
        deleteSelectedBtn.addEventListener('click', showDeleteModal);
        cancelSelectionBtn.addEventListener('click', cancelSelection);
        
        // 下载历史按钮事件
        const showDownloadHistoryBtn = document.getElementById('showDownloadHistoryBtn');
        const downloadHistoryModal = document.getElementById('downloadHistoryModal');
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        
        if (showDownloadHistoryBtn) {
            showDownloadHistoryBtn.addEventListener('click', showDownloadHistory);
        }
        
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', clearDownloadHistory);
        }
        
        // 模态框关闭按钮 - 修复关闭按钮事件
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                closeAllModals();
                // 清除所有上传进度计时器
                currentUploadIntervals.forEach(interval => clearInterval(interval));
                currentUploadIntervals = [];
            });
        });
        
        // 删除确认按钮
        cancelDeleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllModals();
        });
        
        confirmDeleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteSelectedMaterials();
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', function(event) {
            if (event.target === deleteModal) {
                closeAllModals();
            }
            if (event.target === uploadProgressModal) {
                closeAllModals();
                // 清除所有上传进度计时器
                currentUploadIntervals.forEach(interval => clearInterval(interval));
                currentUploadIntervals = [];
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeAllModals();
                currentUploadIntervals.forEach(interval => clearInterval(interval));
                currentUploadIntervals = [];
            }
        });
    }
    
    function setupDragAndDrop() {
        // 为上传区域添加 dragover 事件处理
        uploadArea.addEventListener('dragover', function(e) {
            // 必须阻止默认行为，否则文件会被浏览器打开
            e.preventDefault();
            e.stopPropagation();
            
            // 设置拖拽效果为复制（上传）
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
                e.dataTransfer.effectAllowed = 'copyMove';
            }
            
            // 视觉反馈
            this.style.borderColor = '#3498db';
            this.style.backgroundColor = '#e3f2fd';
            this.style.borderStyle = 'dashed';
            
            return false;
        });
        
        // dragleave 事件
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 只有完全离开上传区域才恢复样式
            const rect = this.getBoundingClientRect();
            const isInside = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );
            
            if (!isInside) {
                this.style.borderColor = '#bdc3c7';
                this.style.backgroundColor = '#f8f9fa';
                this.style.borderStyle = 'dashed';
            }
            
            return false;
        });
        
        // drop 事件 - 关键修复
        uploadArea.addEventListener('drop', function(e) {
            // 完全阻止浏览器默认行为
            e.preventDefault();
            e.stopPropagation();
            
            // 恢复样式
            this.style.borderColor = '#bdc3c7';
            this.style.backgroundColor = '#f8f9fa';
            this.style.borderStyle = 'dashed';
            
            // 检查是否有文件
            if (!e.dataTransfer || !e.dataTransfer.files) {
                showNotification('没有检测到文件', 'warning');
                return false;
            }
            
            const files = e.dataTransfer.files;
            
            if (files.length === 0) {
                showNotification('拖拽的文件列表为空', 'warning');
                return false;
            }
            
            // 处理文件（这会添加到上传队列）
            handleFiles(files);
            
            return false;
        });
        
        // 防止整个页面的拖拽事件
        document.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        
        document.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
        
        // 重置文件输入，允许重复选择相同文件
        e.target.value = '';
    }
    
    function handleFiles(files) {
        console.log('handleFiles 被调用，文件数量:', files.length);
        
        if (!files.length) {
            console.log('没有文件');
            return;
        }
        
        // 检查是否选择了课程
        if (!courseSelect.value) {
            showNotification('请先选择课程', 'warning');
            courseSelect.focus();
            return;
        }
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 检查文件大小（限制50MB）
            if (file.size > 50 * 1024 * 1024) {
                showNotification(`文件"${file.name}"超过50MB限制，已跳过`, 'error');
                continue;
            }
            
            // 检查是否已存在同名文件
            if (uploadQueue.some(item => item.file.name === file.name)) {
                showNotification(`文件"${file.name}"已存在于上传队列`, 'warning');
                continue;
            }
            
            uploadQueue.push({
                file: file,
                id: 'upload_' + Date.now() + '_' + i,
                status: 'pending'
            });
        }
        
        // 更新上传列表
        updateUploadList();
        
        // 启用上传按钮
        uploadBtn.disabled = false;
    }
    
    function updateUploadList() {
        uploadListContainer.innerHTML = '';
        
        if (uploadQueue.length === 0) {
            uploadListContainer.innerHTML = `
                <div class="empty-upload-list">
                    <i class="fas fa-folder-open"></i>
                    <p>暂无待上传文件</p>
                </div>
            `;
            uploadBtn.disabled = true;
            return;
        }
        
        uploadQueue.forEach((item, index) => {
            const file = item.file;
            const fileSize = formatFileSize(file.size);
            const fileType = getFileType(file.name);
            const fileIcon = getFileIcon(fileType);
            
            const uploadItem = document.createElement('div');
            uploadItem.className = 'upload-file-item';
            uploadItem.dataset.id = item.id;
            
            uploadItem.innerHTML = `
                <div class="upload-file-icon ${fileIcon.class}">
                    <i class="${fileIcon.icon}"></i>
                </div>
                <div class="upload-file-info">
                    <div class="upload-file-name">${file.name}</div>
                    <div class="upload-file-size">${fileSize}</div>
                </div>
                <button class="remove-upload-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            uploadListContainer.appendChild(uploadItem);
        });
        
        // 添加删除按钮事件
        document.querySelectorAll('.remove-upload-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                removeFromUploadQueue(index);
            });
        });
    }
    
    function removeFromUploadQueue(index) {
        if (index >= 0 && index < uploadQueue.length) {
            uploadQueue.splice(index, 1);
            updateUploadList();
        }
    }
    
    function clearUploadList() {
        if (uploadQueue.length === 0) return;
        
        if (confirm('确定要清空上传列表吗？')) {
            uploadQueue = [];
            updateUploadList();
            showNotification('上传列表已清空', 'success');
        }
    }
    
    function startUpload() {
        if (uploadQueue.length === 0) {
            showNotification('请先添加要上传的文件', 'warning');
            return;
        }
        
        if (!courseSelect.value) {
            showNotification('请选择课程', 'warning');
            courseSelect.focus();
            return;
        }
        
        // 显示上传进度模态框
        showUploadProgressModal();
        
        // 开始上传
        simulateUpload();
    }
    
    function simulateUpload() {
        let uploadedCount = 0;
        const totalFiles = uploadQueue.length;
        let totalSize = 0;
        
        // 计算总大小
        uploadQueue.forEach(item => {
            totalSize += item.file.size;
        });
        
        // 更新总大小显示
        document.getElementById('totalSize').textContent = formatFileSize(totalSize);
        
        // 清空上传队列显示
        const uploadQueueList = document.getElementById('uploadQueueList');
        uploadQueueList.innerHTML = '';
        
        // 初始化上传队列显示
        uploadQueue.forEach((item) => {
            const file = item.file;
            const fileType = getFileType(file.name);
            const fileIcon = getFileIcon(fileType);
            
            const queueItem = document.createElement('div');
            queueItem.className = 'upload-queue-item';
            queueItem.dataset.id = item.id;
            
            queueItem.innerHTML = `
                <div class="upload-queue-icon ${fileIcon.class}">
                    <i class="${fileIcon.icon}"></i>
                </div>
                <div class="upload-queue-info">
                    <div class="upload-queue-name">${file.name}</div>
                    <div class="upload-queue-status pending">等待上传</div>
                </div>
            `;
            
            uploadQueueList.appendChild(queueItem);
        });
        
        // 获取课程信息
        const courseName = courseSelect.options[courseSelect.selectedIndex].text;
        
        // 逐个上传文件
        uploadQueue.forEach((item, index) => {
            setTimeout(() => {
                uploadSingleFile(item, index, courseName, () => {
                    uploadedCount++;
                    
                    if (uploadedCount === totalFiles) {
                        setTimeout(() => {
                            // 关闭上传进度模态框
                            closeAllModals();
                            
                            // 清空上传队列
                            uploadQueue = [];
                            updateUploadList();
                            
                            // 显示成功消息
                            showNotification(`成功上传 ${totalFiles} 个文件`, 'success');
                            
                            // 更新材料列表
                            renderMaterials(materials);
                            updateStorageUsage();
                        }, 1000);
                    }
                });
            }, index * 1500); // 每个文件间隔1.5秒上传
        });
    }
    
    function uploadSingleFile(item, index, courseName, onComplete) {
        const file = item.file;
        const fileSize = file.size;
        
        // 更新当前上传文件
        document.getElementById('currentUploadFile').textContent = file.name;
        
        // 更新上传队列状态
        const queueItem = document.querySelector(`[data-id="${item.id}"] .upload-queue-status`);
        if (queueItem) {
            queueItem.textContent = '上传中...';
            queueItem.className = 'upload-queue-status uploading';
        }
        
        // 计算整体进度
        const updateOverallProgress = () => {
            const overallProgress = ((index + 1) / uploadQueue.length) * 100;
            const progressFill = document.getElementById('uploadProgressFill');
            const progressText = document.getElementById('uploadProgressText');
            
            if (progressFill && progressText) {
                progressFill.style.width = overallProgress + '%';
                progressText.textContent = Math.round(overallProgress) + '%';
            }
        };
        
        // 模拟上传进度
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 100) {
                progress = 100;
                clearInterval(interval);
                
                // 标记为完成
                if (queueItem) {
                    queueItem.textContent = '上传完成';
                    queueItem.className = 'upload-queue-status completed';
                }
                
                // 保存文件信息到材料列表
                saveMaterial(file, item.id, courseName);
                
                // 更新已上传大小
                const totalUploadedSoFar = uploadQueue.slice(0, index + 1).reduce((sum, item) => sum + item.file.size, 0);
                const uploadedSizeElement = document.getElementById('uploadedSize');
                if (uploadedSizeElement) {
                    uploadedSizeElement.textContent = formatFileSize(totalUploadedSoFar);
                }
                
                // 完成回调
                onComplete();
            }
            
            // 更新整体进度
            updateOverallProgress();
            
            // 模拟上传速度
            const speedElement = document.getElementById('uploadSpeed');
            if (speedElement) {
                speedElement.textContent = Math.round(Math.random() * 500 + 100) + ' KB/s';
            }
        }, 200);
        
        // 存储间隔计时器以便取消
        currentUploadIntervals.push(interval);
    }
    
    function saveMaterial(file, uploadId, courseName) {
        const fileType = getFileType(file.name);
        
        const material = {
            id: 'material_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            description: `上传于 ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
            type: fileType,
            size: file.size / (1024 * 1024), // 转换为MB
            courseId: courseSelect.value,
            courseName: courseName,
            uploadDate: new Date().toISOString().split('T')[0],
            uploadTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            fileUrl: '#',
            uploadId: uploadId
        };
        
        materials.push(material);
        localStorage.setItem('teacherMaterials', JSON.stringify(materials));
    }
    
    function showUploadProgressModal() {
        uploadProgressModal.style.display = 'flex';
        
        // 重置进度条
        const progressFill = document.getElementById('uploadProgressFill');
        const progressText = document.getElementById('uploadProgressText');
        const uploadedSize = document.getElementById('uploadedSize');
        
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        if (uploadedSize) uploadedSize.textContent = '0 MB';
    }
    
    function renderMaterials(materialsToRender) {
        materialsList.innerHTML = '';
        
        if (materialsToRender.length === 0) {
            noMaterials.style.display = 'flex';
            materialsList.style.display = 'none';
            materialCount.textContent = '0';
            materialSize.textContent = '0';
            return;
        }
        
        noMaterials.style.display = 'none';
        materialsList.style.display = 'flex';
        
        // 计算总大小
        let totalSize = 0;
        
        materialsToRender.forEach(material => {
            const materialCard = createMaterialCard(material);
            materialsList.appendChild(materialCard);
            totalSize += material.size;
        });
        
        // 更新统计信息
        materialCount.textContent = materialsToRender.length;
        materialSize.textContent = totalSize.toFixed(1);
    }
    
    function createMaterialCard(material) {
        const fileIcon = getFileIcon(material.type);
        const fileSize = material.size.toFixed(1) + ' MB';
        const isSelected = selectedMaterials.has(material.id);
        
        const card = document.createElement('div');
        card.className = `material-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = material.id;
        card.dataset.type = material.type;
        card.dataset.course = material.courseId;
        
        card.innerHTML = `
            <div class="material-select">
                <input type="checkbox" id="material-${material.id}" ${isSelected ? 'checked' : ''}>
            </div>
            <div class="material-icon ${fileIcon.class}">
                <i class="${fileIcon.icon}"></i>
            </div>
            <div class="material-info">
                <h3>${material.name}</h3>
                <div class="material-meta">
                    <span class="material-course">${material.courseName}</span>
                    <span>${fileSize}</span>
                    <span>${material.uploadDate}</span>
                </div>
                <p class="material-description">${material.description}</p>
            </div>
            <div class="material-actions">
                <button class="btn-preview" data-id="${material.id}">
                    <i class="fas fa-eye"></i> 预览
                </button>
                <button class="btn-download" data-id="${material.id}">
                    <i class="fas fa-download"></i> 下载
                </button>
                <button class="btn-delete" data-id="${material.id}">
                    <i class="fas fa-trash-alt"></i> 删除
                </button>
            </div>
        `;
        
        // 添加事件监听器
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
            toggleMaterialSelection(material.id, this.checked);
        });
        
        const previewBtn = card.querySelector('.btn-preview');
        previewBtn.addEventListener('click', function() {
            previewMaterial(material.id);
        });
        
        const downloadBtn = card.querySelector('.btn-download');
        downloadBtn.addEventListener('click', function() {
            downloadMaterial(material.id);
        });
        
        const deleteBtn = card.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', function() {
            showDeleteModal(material.id);
        });
        
        return card;
    }
    
    function toggleMaterialSelection(materialId, isSelected) {
        if (isSelected) {
            selectedMaterials.add(materialId);
        } else {
            selectedMaterials.delete(materialId);
        }
        
        // 更新卡片选中状态
        const card = document.querySelector(`[data-id="${materialId}"]`);
        if (card) {
            card.classList.toggle('selected', isSelected);
        }
        
        // 更新批量操作栏
        updateBatchActions();
    }
    
    function updateBatchActions() {
        const count = selectedMaterials.size;
        
        if (count > 0) {
            batchActions.style.display = 'flex';
            selectedCount.textContent = count;
        } else {
            batchActions.style.display = 'none';
        }
    }
    
    function sortMaterials(sortType) {
        let sortedMaterials = [...materials];
        
        switch (sortType) {
            case 'date-desc':
                sortedMaterials.sort((a, b) => new Date(b.uploadDate + ' ' + b.uploadTime) - new Date(a.uploadDate + ' ' + a.uploadTime));
                break;
            case 'date-asc':
                sortedMaterials.sort((a, b) => new Date(a.uploadDate + ' ' + a.uploadTime) - new Date(b.uploadDate + ' ' + b.uploadTime));
                break;
            case 'name-asc':
                sortedMaterials.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                sortedMaterials.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'size-desc':
                sortedMaterials.sort((a, b) => b.size - a.size);
                break;
            case 'size-asc':
                sortedMaterials.sort((a, b) => a.size - b.size);
                break;
        }
        
        renderMaterials(sortedMaterials);
    }
    
    function filterByCourse(courseId) {
        let filteredMaterials = materials;
        
        if (courseId !== 'all') {
            filteredMaterials = materials.filter(material => material.courseId === courseId);
        }
        
        renderMaterials(filteredMaterials);
    }
    
    function searchMaterials(searchTerm) {
        if (!searchTerm) {
            renderMaterials(materials);
            return;
        }
        
        const term = searchTerm.toLowerCase();
        const filteredMaterials = materials.filter(material => 
            material.name.toLowerCase().includes(term) ||
            material.description.toLowerCase().includes(term) ||
            material.courseName.toLowerCase().includes(term)
        );
        
        renderMaterials(filteredMaterials);
    }
    
    function previewMaterial(materialId) {
        const material = materials.find(m => m.id === materialId);
        if (!material) return;
        
        showNotification(`正在预览: ${material.name}`, 'info');
    }
    
    function downloadMaterial(materialId) {
        const material = materials.find(m => m.id === materialId);
        if (!material) {
            showNotification('文件不存在', 'error');
            return;
        }
        
        // 显示下载进度
        const downloadBtn = document.querySelector(`[data-id="${materialId}"] .btn-download`);
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 下载中...';
        }
        
        try {
            // 创建模拟文件内容（实际应用中这里应该是真实的文件数据）
            const fileContent = generateFileContent(material);
            
            const blob = new Blob([fileContent], { type: getMimeType(material.type) });
            const url = URL.createObjectURL(blob);
            
            // 创建下载链接
            const a = document.createElement('a');
            a.href = url;
            a.download = material.name;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            // 模拟下载延迟
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // 恢复按钮状态
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                    downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载';
                }
                
                showNotification(`${material.name} 下载完成`, 'success');
                
                // 记录下载历史
                recordDownloadHistory(material);
                
            }, 1000);
            
            showNotification(`开始下载: ${material.name}`, 'success');
            
        } catch (error) {
            console.error('下载失败:', error);
            
            // 恢复按钮状态
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载';
            }
            
            showNotification(`下载失败: ${material.name}`, 'error');
        }
    }
    
    function showDeleteModal(materialId = null) {
        if (materialId) {
            selectedMaterials.clear();
            selectedMaterials.add(materialId);
            updateBatchActions();
        }
        
        const count = selectedMaterials.size;
        if (count === 0) return;
        
        document.getElementById('deleteCount').textContent = count;
        deleteModal.style.display = 'flex';
    }
    
    function deleteSelectedMaterials() {
        const count = selectedMaterials.size;
        
        materials = materials.filter(material => !selectedMaterials.has(material.id));
        
        localStorage.setItem('teacherMaterials', JSON.stringify(materials));
        
        selectedMaterials.clear();
        updateBatchActions();
        
        closeAllModals();
        
        renderMaterials(materials);
        updateStorageUsage();
        
        showNotification(`成功删除 ${count} 个文件`, 'success');
    }
    
    function downloadSelectedMaterials() {
        const count = selectedMaterials.size;
        if (count === 0) {
            showNotification('请先选择要下载的文件', 'warning');
            return;
        }
        
        // 禁用批量下载按钮并显示进度
        const downloadBtn = document.getElementById('downloadSelectedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 打包中...';
        }
        
        showNotification(`开始打包下载 ${count} 个文件...`, 'info');
        
        // 获取选中的材料
        const selectedFiles = materials.filter(material => selectedMaterials.has(material.id));
        
        // 创建ZIP文件（使用JSZip库）
        if (typeof JSZip === 'undefined') {
            // 如果没有JSZip库，则逐个下载
            showNotification('未检测到ZIP打包库，开始逐个下载...', 'info');
            
            let downloadedCount = 0;
            
            // 创建简化的下载函数（不修改原函数）
            const downloadSingleFile = (material) => {
                try {
                    const fileContent = generateFileContent(material);
                    const blob = new Blob([fileContent], { type: getMimeType(material.type) });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = material.name;
                    a.style.display = 'none';
                    
                    document.body.appendChild(a);
                    a.click();
                    
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        downloadedCount++;
                        showNotification(`下载进度: ${downloadedCount}/${count}`, 'info');
                        recordDownloadHistory(material);
                        
                        if (downloadedCount === count) {
                            // 恢复按钮状态
                            if (downloadBtn) {
                                downloadBtn.disabled = false;
                                downloadBtn.innerHTML = '<i class="fas fa-download"></i> 批量下载';
                            }
                            showNotification(`所有文件下载完成，共 ${count} 个文件`, 'success');
                        }
                    }, 100);
                    
                } catch (error) {
                    console.error('下载失败:', error);
                    downloadedCount++;
                    showNotification(`下载失败: ${material.name}`, 'error');
                }
            };
            
            // 逐个下载文件
            selectedFiles.forEach((material, index) => {
                setTimeout(() => {
                    downloadSingleFile(material);
                }, index * 1000); // 每个文件间隔1秒下载
            });
            
            return;
        }
        
        // 使用JSZip打包下载
        const zip = new JSZip();
        let processedCount = 0;
        
        // 显示打包进度
        const progressInterval = setInterval(() => {
            processedCount++;
            const progress = Math.round((processedCount / count) * 100);
            showNotification(`打包进度: ${progress}% (${processedCount}/${count})`, 'info');
            
            if (processedCount >= count) {
                clearInterval(progressInterval);
            }
        }, 300);
        
        selectedFiles.forEach((material, index) => {
            const fileContent = generateFileContent(material);
            
            // 按课程创建文件夹
            const courseFolder = material.courseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
            zip.file(`${courseFolder}/${material.name}`, fileContent);
        });
        
        // 生成ZIP文件并下载
        zip.generateAsync({type: 'blob'})
            .then(function(content) {
                clearInterval(progressInterval);
                
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `课程资料_${new Date().toISOString().split('T')[0]}_${count}个文件.zip`;
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    // 恢复按钮状态
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                        downloadBtn.innerHTML = '<i class="fas fa-download"></i> 批量下载';
                    }
                    
                    showNotification(`打包下载完成，共 ${count} 个文件`, 'success');
                    
                    // 记录批量下载历史
                    selectedFiles.forEach(material => {
                        recordDownloadHistory(material);
                    });
                    
                }, 100);
            })
            .catch(function(error) {
                clearInterval(progressInterval);
                console.error('ZIP打包失败:', error);
                
                // 恢复按钮状态
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                    downloadBtn.innerHTML = '<i class="fas fa-download"></i> 批量下载';
                }
                
                showNotification('打包下载失败，请重试或尝试逐个下载', 'error');
            });
    }
    
    function cancelSelection() {
        selectedMaterials.clear();
        
        document.querySelectorAll('.material-select input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        document.querySelectorAll('.material-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        batchActions.style.display = 'none';
    }
    
    function closeAllModals() {
        deleteModal.style.display = 'none';
        uploadProgressModal.style.display = 'none';
    }
    
    function updateStorageUsage() {
        let totalSize = 0;
        materials.forEach(material => {
            totalSize += material.size;
        });
        
        const totalStorage = 5000;
        const usagePercent = ((totalSize / totalStorage) * 100).toFixed(1);
        
        usedStorage.textContent = totalSize.toFixed(1);
        storageUsage.textContent = usagePercent + '%';
        
        const usageElement = document.getElementById('storageUsage');
        if (usagePercent > 90) {
            usageElement.style.color = '#e74c3c';
        } else if (usagePercent > 70) {
            usageElement.style.color = '#f39c12';
        } else {
            usageElement.style.color = '#3498db';
        }
    }
    
    // 工具函数
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function getFileType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        if (['doc', 'docx'].includes(extension)) return 'doc';
        if (['pdf'].includes(extension)) return 'pdf';
        if (['ppt', 'pptx'].includes(extension)) return 'ppt';
        if (['xls', 'xlsx'].includes(extension)) return 'excel';
        if (['txt', 'rtf'].includes(extension)) return 'doc';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return 'image';
        if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(extension)) return 'video';
        if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) return 'audio';
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive';
        
        return 'other';
    }
    
    function getFileIcon(fileType) {
        const icons = {
            'doc': { icon: 'fas fa-file-word', class: 'file-icon-doc' },
            'pdf': { icon: 'fas fa-file-pdf', class: 'file-icon-pdf' },
            'ppt': { icon: 'fas fa-file-powerpoint', class: 'file-icon-ppt' },
            'excel': { icon: 'fas fa-file-excel', class: 'file-icon-excel' },
            'image': { icon: 'fas fa-image', class: 'file-icon-image' },
            'video': { icon: 'fas fa-video', class: 'file-icon-video' },
            'audio': { icon: 'fas fa-music', class: 'file-icon-audio' },
            'archive': { icon: 'fas fa-file-archive', class: 'file-icon-zip' },
            'other': { icon: 'fas fa-file', class: 'file-icon-other' }
        };
        
        return icons[fileType] || icons.other;
    }
    
    function getMimeType(fileType) {
        const mimeTypes = {
            'doc': 'application/msword',
            'pdf': 'application/pdf',
            'ppt': 'application/vnd.ms-powerpoint',
            'excel': 'application/vnd.ms-excel',
            'image': 'image/jpeg',
            'video': 'video/mp4',
            'audio': 'audio/mpeg',
            'archive': 'application/zip',
            'other': 'text/plain'
        };
        
        return mimeTypes[fileType] || 'text/plain';
    }
    
    function generateFileContent(material) {
        const timestamp = new Date().toLocaleString('zh-CN');
        
        switch (material.type) {
            case 'pdf':
                return `PDF文件: ${material.name}\n\n` +
                       `课程: ${material.courseName}\n` +
                       `上传时间: ${material.uploadDate} ${material.uploadTime}\n` +
                       `文件大小: ${material.size.toFixed(1)} MB\n` +
                       `描述: ${material.description}\n\n` +
                       `下载时间: ${timestamp}\n` +
                       `--- 这是PDF文件的模拟内容 ---`;
            
            case 'doc':
                return `文档文件: ${material.name}\n\n` +
                       `课程: ${material.courseName}\n` +
                       `上传时间: ${material.uploadDate} ${material.uploadTime}\n` +
                       `文件大小: ${material.size.toFixed(1)} MB\n` +
                       `描述: ${material.description}\n\n` +
                       `下载时间: ${timestamp}\n` +
                       `--- 这是Word文档的模拟内容 ---`;
            
            case 'ppt':
                return `演示文稿: ${material.name}\n\n` +
                       `课程: ${material.courseName}\n` +
                       `上传时间: ${material.uploadDate} ${material.uploadTime}\n` +
                       `文件大小: ${material.size.toFixed(1)} MB\n` +
                       `描述: ${material.description}\n\n` +
                       `下载时间: ${timestamp}\n` +
                       `--- 这是PPT文件的模拟内容 ---`;
            
            case 'excel':
                return `表格文件: ${material.name}\n\n` +
                       `课程: ${material.courseName}\n` +
                       `上传时间: ${material.uploadDate} ${material.uploadTime}\n` +
                       `文件大小: ${material.size.toFixed(1)} MB\n` +
                       `描述: ${material.description}\n\n` +
                       `下载时间: ${timestamp}\n` +
                       `--- 这是Excel文件的模拟内容 ---`;
            
            case 'image':
                return `图像文件: ${material.name}\n\n` +
                       `课程: ${material.courseName}\n` +
                       `上传时间: ${material.uploadDate} ${material.uploadTime}\n` +
                       `文件大小: ${material.size.toFixed(1)} MB\n` +
                       `描述: ${material.description}\n\n` +
                       `下载时间: ${timestamp}\n` +
                       `--- 这是图像文件的模拟内容 ---`;
            
            default:
                return `文件: ${material.name}\n\n` +
                       `课程: ${material.courseName}\n` +
                       `上传时间: ${material.uploadDate} ${material.uploadTime}\n` +
                       `文件大小: ${material.size.toFixed(1)} MB\n` +
                       `描述: ${material.description}\n\n` +
                       `下载时间: ${timestamp}\n` +
                       `--- 这是文件的实际内容 ---`;
        }
    }
    
    function recordDownloadHistory(material) {
        // 记录下载历史到localStorage
        let downloadHistory = JSON.parse(localStorage.getItem('downloadHistory')) || [];
        
        const downloadRecord = {
            materialId: material.id,
            materialName: material.name,
            courseName: material.courseName,
            downloadTime: new Date().toISOString(),
            downloadTimeDisplay: new Date().toLocaleString('zh-CN')
        };
        
        downloadHistory.unshift(downloadRecord);
        
        // 只保留最近100条记录
        if (downloadHistory.length > 100) {
            downloadHistory = downloadHistory.slice(0, 100);
        }
        
        localStorage.setItem('downloadHistory', JSON.stringify(downloadHistory));
    }
    
    function showDownloadHistory() {
        const downloadHistory = JSON.parse(localStorage.getItem('downloadHistory')) || [];
        const historyList = document.getElementById('historyList');
        const noHistory = document.getElementById('noHistory');
        const totalDownloads = document.getElementById('totalDownloads');
        
        if (totalDownloads) {
            totalDownloads.textContent = downloadHistory.length;
        }
        
        if (downloadHistory.length === 0) {
            if (historyList) historyList.style.display = 'none';
            if (noHistory) noHistory.style.display = 'block';
        } else {
            if (historyList) historyList.style.display = 'block';
            if (noHistory) noHistory.style.display = 'none';
            
            if (historyList) {
                historyList.innerHTML = '';
                
                downloadHistory.forEach((record, index) => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    
                    historyItem.innerHTML = `
                        <div class="history-item-info">
                            <h4>${record.materialName}</h4>
                            <p>课程: ${record.courseName}</p>
                        </div>
                        <div class="history-item-time">
                            ${record.downloadTimeDisplay}
                        </div>
                    `;
                    
                    historyList.appendChild(historyItem);
                });
            }
        }
        
        // 显示下载历史模态框
        if (downloadHistoryModal) {
            downloadHistoryModal.style.display = 'flex';
        }
    }
    
    function clearDownloadHistory() {
        if (confirm('确定要清空所有下载历史记录吗？此操作不可恢复。')) {
            localStorage.removeItem('downloadHistory');
            showNotification('下载历史已清空', 'success');
            closeAllModals();
        }
    }
    
    function closeAllModals() {
        deleteModal.style.display = 'none';
        uploadProgressModal.style.display = 'none';
        if (downloadHistoryModal) {
            downloadHistoryModal.style.display = 'none';
        }
    }
    
    function showNotification(message, type = 'info') {
        // 移除现有通知
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.close-notification').addEventListener('click', function() {
            notification.remove();
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
});