// 课程管理功能 (IndexedDB 兼容版)
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化课程数据
    let courses = [];
    let currentEditCourseId = null;
    
    // DOM元素
    const coursesList = document.querySelector('.courses-list');
    const emptyState = document.getElementById('emptyState');
    const addCourseBtn = document.getElementById('addCourseBtn');
    const createFirstCourseBtn = document.getElementById('createFirstCourseBtn');
    const courseDetailModal = document.getElementById('courseDetailModal');
    const coursePreviewModal = document.getElementById('coursePreviewModal');
    const courseForm = document.getElementById('courseForm');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const courseSearch = document.getElementById('courseSearch');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const previewCourseBtn = document.getElementById('previewCourseBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const publishCourseBtn = document.getElementById('publishCourseBtn');
    const descCharCount = document.getElementById('descCharCount');
    const courseDescription = document.getElementById('courseDescription');
    
    // 图片上传相关
    const bannerUploadArea = document.getElementById('bannerUploadArea');
    const bannerImageInput = document.getElementById('bannerImage');
    const bannerPreview = document.getElementById('bannerPreview');
    const galleryUploadArea = document.getElementById('galleryUploadArea');
    const galleryImagesInput = document.getElementById('galleryImages');
    const galleryPreview = document.getElementById('galleryPreview');
    
    let bannerImage = null;
    let galleryImages = [];
    
    // 初始化页面
    await initPage();
    
    async function initPage() {
        try {
            // 从IndexedDB加载课程数据
            courses = await window.courseManager.getCourses();
            
            // 渲染课程列表
            renderCourses(courses);
            
            // 更新空状态显示
            updateEmptyState();
            
            // 设置事件监听器
            setupEventListeners();
            
            // 设置图片上传功能
            setupImageUpload();
            
            // 设置拖拽排序
            setupDragAndDrop();
            
            // 监听数据更新事件
            window.addEventListener('courseDataUpdated', async function() {
                courses = await window.courseManager.getCourses();
                renderCourses(courses);
                updateEmptyState();
            });
        } catch (error) {
            console.error('初始化页面失败:', error);
            showNotification('页面初始化失败，请刷新页面重试', 'error');
        }
    }
    
    function renderCourses(coursesToRender) {
        coursesList.innerHTML = '';
        
        if (coursesToRender.length === 0) {
            emptyState.classList.add('show');
            return;
        }
        
        emptyState.classList.remove('show');
        
        coursesToRender.forEach(course => {
            const courseCard = createCourseCard(course);
            coursesList.appendChild(courseCard);
        });
    }
    
    function createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'course-card-list';
        card.dataset.id = course.id;
        
        // 状态徽章文本
        let statusText = '';
        let statusClass = '';
        if (course.status === 'published') {
            statusText = '已发布';
            statusClass = 'published';
        } else if (course.status === 'draft') {
            statusText = '草稿';
            statusClass = 'draft';
        } else {
            statusText = '已归档';
            statusClass = 'archived';
        }
        
        // 学生人数和作业数量（模拟数据）
        const studentCount = Math.floor(Math.random() * 30) + 20;
        const assignmentCount = Math.floor(Math.random() * 5) + 1;
        
        card.innerHTML = `
            <div class="course-card-header">
                <div class="course-card-title">
                    <h3>${course.name}</h3>
                    <p class="course-card-code">${course.code} · ${course.class}</p>
                </div>
                <span class="course-status-badge ${statusClass}">${statusText}</span>
            </div>
            <p class="course-description">${course.description ? course.description.substring(0, 100) + (course.description.length > 100 ? '...' : '') : '暂无描述'}</p>
            <div class="course-meta">
                <div class="course-meta-item">
                    <span class="course-meta-label">学分</span>
                    <span class="course-meta-value">${course.credit}</span>
                </div>
                <div class="course-meta-item">
                    <span class="course-meta-label">学生</span>
                    <span class="course-meta-value">${studentCount}</span>
                </div>
                <div class="course-meta-item">
                    <span class="course-meta-label">作业</span>
                    <span class="course-meta-value">${assignmentCount}</span>
                </div>
                <div class="course-meta-item">
                    <span class="course-meta-label">学期</span>
                    <span class="course-meta-value">${course.semester}</span>
                </div>
            </div>
            <div class="course-actions-list">
                <button class="btn-course-action edit-course" data-id="${course.id}">编辑</button>
                <button class="btn-course-action primary manage-course" data-id="${course.id}">管理</button>
                ${course.status === 'published' ? 
                    `<button class="btn-course-action archive-course" data-id="${course.id}">归档</button>` : 
                    course.status === 'draft' ? 
                    `<button class="btn-course-action primary publish-course" data-id="${course.id}">发布</button>` :
                    `<button class="btn-course-action restore-course" data-id="${course.id}">恢复</button>`
                }
                <button class="btn-course-action delete delete-course" data-id="${course.id}">删除</button>
            </div>
        `;
        
        return card;
    }
    
    function updateEmptyState() {
        if (courses.length === 0) {
            emptyState.classList.add('show');
            return;
        } else {
            emptyState.classList.remove('show');
        }
    }
    
    function setupEventListeners() {
        // 添加课程按钮
        if (addCourseBtn) addCourseBtn.addEventListener('click', openCourseModal);
        if (createFirstCourseBtn) createFirstCourseBtn.addEventListener('click', openCourseModal);
        
        // 关闭模态框按钮
        if (closeModalBtns.length > 0) {
            closeModalBtns.forEach(btn => {
                btn.addEventListener('click', closeAllModals);
            });
        }
        
        // 点击模态框外部关闭
        window.addEventListener('click', function(event) {
            if (event.target === courseDetailModal) {
                closeAllModals();
            }
            if (event.target === coursePreviewModal) {
                closeAllModals();
            }
        });
        
        // 筛选标签
        filterTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // 移除所有标签的active类
                filterTabs.forEach(t => t.classList.remove('active'));
                // 给当前标签添加active类
                this.classList.add('active');
                
                const filter = this.dataset.filter;
                filterCourses(filter);
            });
        });
        
        // 搜索功能
        courseSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterCourses('all', searchTerm);
        });
        
        // 课程描述字数统计
        courseDescription.addEventListener('input', function() {
            const length = this.value.length;
            descCharCount.textContent = length;
            
            if (length > 500) {
                descCharCount.style.color = '#e74c3c';
            } else if (length > 400) {
                descCharCount.style.color = '#f39c12';
            } else {
                descCharCount.style.color = '#95a5a6';
            }
        });
        
        // 表单提交
        courseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // 表单提交时使用表单中的状态，不单独处理
            const currentStatus = document.getElementById('courseStatus').value;
            saveCourse(currentStatus);
        });
        
        // 预览课程按钮
        previewCourseBtn.addEventListener('click', previewCourse);
        
        // 保存草稿按钮
        saveDraftBtn.addEventListener('click', function() {
            saveCourse('draft');
        });
        
        // 发布课程按钮
        publishCourseBtn.addEventListener('click', function() {
            saveCourse('published');
        });
        
        // 委托事件监听器，处理动态生成的课程卡片按钮
        coursesList.addEventListener('click', function(e) {
            const target = e.target;
            const courseId = target.dataset.id;
            
            if (!courseId) return;
            
            if (target.classList.contains('edit-course')) {
                editCourse(courseId);
            } else if (target.classList.contains('manage-course')) {
                manageCourse(courseId);
            } else if (target.classList.contains('publish-course')) {
                publishCourseFromList(courseId);
            } else if (target.classList.contains('archive-course')) {
                archiveCourse(courseId);
            } else if (target.classList.contains('restore-course')) {
                restoreCourse(courseId);
            } else if (target.classList.contains('delete-course')) {
                deleteCourse(courseId);
            }
        });
    }
    
    function setupImageUpload() {
        // 横幅图片上传
        if (!bannerUploadArea || !bannerImageInput) return;
        
        bannerUploadArea.addEventListener('click', function() {
            bannerImageInput.click();
        });
        
        bannerUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#3498db';
            this.style.backgroundColor = '#f8f9fa';
        });
        
        bannerUploadArea.addEventListener('dragleave', function() {
            this.style.borderColor = '#bdc3c7';
            this.style.backgroundColor = 'transparent';
        });
        
        bannerUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#bdc3c7';
            this.style.backgroundColor = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleBannerImage(files[0]);
            }
        });
        
        bannerImageInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleBannerImage(this.files[0]);
            }
        });
        
        // 图库图片上传
        galleryUploadArea.addEventListener('click', function() {
            galleryImagesInput.click();
        });
        
        galleryUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#3498db';
            this.style.backgroundColor = '#f8f9fa';
        });
        
        galleryUploadArea.addEventListener('dragleave', function() {
            this.style.borderColor = '#bdc3c7';
            this.style.backgroundColor = 'transparent';
        });
        
        galleryUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#bdc3c7';
            this.style.backgroundColor = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleGalleryImages(files);
            }
        });
        
        galleryImagesInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleGalleryImages(this.files);
            }
        });
    }
    
    function handleBannerImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            alert('图片大小不能超过2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            bannerImage = {
                name: file.name,
                data: e.target.result
            };
            
            bannerPreview.innerHTML = `
                <img src="${e.target.result}" alt="横幅图片预览">
                <button type="button" class="remove-image" id="removeBannerBtn">×</button>
            `;
            
            document.getElementById('removeBannerBtn').addEventListener('click', function() {
                bannerImage = null;
                bannerPreview.innerHTML = '';
            });
        };
        reader.readAsDataURL(file);
    }
    
    function handleGalleryImages(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (!file.type.startsWith('image/')) {
                alert(`文件 "${file.name}" 不是图片，已跳过`);
                continue;
            }
            
            if (file.size > 2 * 1024 * 1024) {
                alert(`图片 "${file.name}" 大小超过2MB，已跳过`);
                continue;
            }
            
            const reader = new FileReader();
            reader.onload = (function(file) {
                return function(e) {
                    galleryImages.push({
                        id: Date.now() + Math.random(),
                        name: file.name,
                        data: e.target.result
                    });
                    
                    renderGalleryPreview();
                };
            })(file);
            reader.readAsDataURL(file);
        }
    }
    
    function renderGalleryPreview() {
        galleryPreview.innerHTML = '';
        
        galleryImages.forEach((image, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.draggable = true;
            galleryItem.dataset.id = image.id;
            galleryItem.dataset.index = index;
            
            galleryItem.innerHTML = `
                <img src="${image.data}" alt="图片 ${index + 1}">
                <button type="button" class="remove-image" data-id="${image.id}">×</button>
            `;
            
            galleryPreview.appendChild(galleryItem);
        });
        
        // 添加删除事件监听器
        document.querySelectorAll('.gallery-item .remove-image').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                galleryImages = galleryImages.filter(img => img.id !== id);
                renderGalleryPreview();
            });
        });
        
        // 重新设置拖拽事件
        setupDragAndDrop();
    }
    
    function setupDragAndDrop() {
        const galleryItems = document.querySelectorAll('.gallery-item');
        
        galleryItems.forEach(item => {
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.dataset.id);
                this.classList.add('dragging');
            });
            
            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
            });
        });
        
        galleryPreview.addEventListener('dragover', function(e) {
            e.preventDefault();
            const draggingItem = document.querySelector('.gallery-item.dragging');
            const afterElement = getDragAfterElement(this, e.clientY);
            
            if (afterElement == null) {
                this.appendChild(draggingItem);
            } else {
                this.insertBefore(draggingItem, afterElement);
            }
        });
        
        galleryPreview.addEventListener('drop', function(e) {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            const draggedItem = document.querySelector(`[data-id="${id}"]`);
            
            // 更新galleryImages数组的顺序
            const newOrder = [];
            const items = this.querySelectorAll('.gallery-item');
            items.forEach(item => {
                const itemId = item.dataset.id;
                const image = galleryImages.find(img => img.id === itemId);
                if (image) newOrder.push(image);
            });
            
            galleryImages = newOrder;
        });
    }
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.gallery-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    function openCourseModal() {
        currentEditCourseId = null;
        resetForm();
        courseDetailModal.classList.add('active');
        document.getElementById('courseName').focus();
    }
    
    function editCourse(id) {
        const course = courses.find(c => c.id === id);
        if (!course) return;
        
        currentEditCourseId = id;
        
        // 填充表单数据
        document.getElementById('courseName').value = course.name;
        document.getElementById('courseCode').value = course.code;
        document.getElementById('courseCredit').value = course.credit;
        document.getElementById('courseClass').value = course.class;
        document.getElementById('courseSemester').value = course.semester;
        document.getElementById('courseDescription').value = course.description;
        document.getElementById('courseStatus').value = course.status;
        document.getElementById('allowPreview').checked = course.allowPreview || false;
        
        // 更新字数统计
        const descLength = course.description.length;
        descCharCount.textContent = descLength;
        if (descLength > 500) {
            descCharCount.style.color = '#e74c3c';
        } else if (descLength > 400) {
            descCharCount.style.color = '#f39c12';
        } else {
            descCharCount.style.color = '#95a5a6';
        }
        
        // 加载图片
        if (course.bannerImage) {
            bannerImage = course.bannerImage;
            bannerPreview.innerHTML = `
                <img src="${course.bannerImage.data}" alt="横幅图片预览">
                <button type="button" class="remove-image" id="removeBannerBtn">×</button>
            `;
            
            document.getElementById('removeBannerBtn').addEventListener('click', function() {
                bannerImage = null;
                bannerPreview.innerHTML = '';
            });
        }
        
        if (course.galleryImages && course.galleryImages.length > 0) {
            galleryImages = [...course.galleryImages];
            renderGalleryPreview();
        }
        
        courseDetailModal.classList.add('active');
    }
    
    function resetForm() {
        courseForm.reset();
        bannerImage = null;
        galleryImages = [];
        bannerPreview.innerHTML = '';
        galleryPreview.innerHTML = '';
        descCharCount.textContent = '0';
        descCharCount.style.color = '#95a5a6';
        document.getElementById('courseStatus').value = 'draft';
    }
    
    function closeAllModals() {
        courseDetailModal.classList.remove('active');
        coursePreviewModal.classList.remove('active');
    }
    
    function filterCourses(filter, searchTerm = '') {
        let filteredCourses = courses;
        
        // 按状态筛选
        if (filter !== 'all') {
            filteredCourses = filteredCourses.filter(course => course.status === filter);
        }
        
        // 按搜索词筛选
        if (searchTerm) {
            filteredCourses = filteredCourses.filter(course => 
                course.name.toLowerCase().includes(searchTerm) || 
                course.code.toLowerCase().includes(searchTerm) ||
                course.class.toLowerCase().includes(searchTerm)
            );
        }
        
        renderCourses(filteredCourses);
    }
    
    async function saveCourse(status = null) {
        try {
            // 获取表单数据
            const courseName = document.getElementById('courseName').value.trim();
            const courseCode = document.getElementById('courseCode').value.trim();
            const courseCredit = document.getElementById('courseCredit').value;
            const courseClass = document.getElementById('courseClass').value.trim();
            const courseSemester = document.getElementById('courseSemester').value;
            const courseDescription = document.getElementById('courseDescription').value.trim();
            const courseStatus = status || document.getElementById('courseStatus').value;
            const allowPreview = document.getElementById('allowPreview').checked;
            
            // 验证必填字段
            if (!courseName || !courseCode || !courseDescription) {
                alert('请填写所有必填字段（课程名称、课程代码、课程简介）');
                return;
            }
            
            // 创建课程对象
            const courseData = {
                id: currentEditCourseId || window.courseManager.generateCourseId(),
                name: courseName,
                code: courseCode,
                credit: courseCredit,
                class: courseClass,
                semester: courseSemester,
                description: courseDescription,
                status: courseStatus,
                allowPreview: allowPreview,
                bannerImage: bannerImage,
                galleryImages: [...galleryImages],
                updatedAt: new Date().toISOString()
            };
            
            if (!currentEditCourseId) {
                // 新课程
                courseData.createdAt = new Date().toISOString();
            }
            
            // 保存到IndexedDB
            await window.courseManager.saveCourse(courseData);
            
            // 重新加载课程数据
            courses = await window.courseManager.getCourses();
            
            // 重新渲染课程列表
            renderCourses(courses);
            updateEmptyState();
            
            // 显示成功消息
            const isEdit = !!currentEditCourseId;
            showNotification(`课程"${courseName}"已成功${isEdit ? '更新' : '创建'}！`, 'success');
            
            // 重置编辑状态
            currentEditCourseId = null;
            
            // 关闭模态框
            closeAllModals();
        } catch (error) {
            console.error('保存课程失败:', error);
            showNotification(`保存课程失败: ${error.message}`, 'error');
        }
    }
    
    function previewCourse() {
        // 获取表单数据
        const courseName = document.getElementById('courseName').value.trim() || '示例课程名称';
        const courseCode = document.getElementById('courseCode').value.trim() || 'CS000';
        const courseClass = document.getElementById('courseClass').value.trim() || '计科200班';
        const courseSemester = document.getElementById('courseSemester').value || '2023-2024学年秋季';
        const courseCredit = document.getElementById('courseCredit').value || '3';
        const courseDescription = document.getElementById('courseDescription').value.trim() || '这里是课程简介，用于描述课程的主要内容、教学目标等信息。';
        
        // 生成预览HTML
        const previewHTML = `
            <div class="preview-banner">
                ${bannerImage ? `<img src="${bannerImage.data}" alt="课程横幅" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-book-open"></i>'}
            </div>
            <div class="preview-content">
                <div class="preview-header">
                    <h2>${courseName}</h2>
                    <p>${courseCode} · ${courseClass} · ${courseSemester} · ${courseCredit}学分</p>
                </div>
                <div class="preview-section">
                    <h3>课程简介</h3>
                    <p class="preview-description">${courseDescription}</p>
                </div>
                ${galleryImages.length > 0 ? `
                <div class="preview-section">
                    <h3>课程图片</h3>
                    <div class="preview-gallery">
                        ${galleryImages.map(img => `<img src="${img.data}" alt="课程图片">`).join('')}
                    </div>
                </div>
                ` : ''}
                <div class="preview-section">
                    <h3>课程状态</h3>
                    <p>${document.getElementById('courseStatus').value === 'published' ? '已发布（学生可见）' : '草稿（仅教师可见）'}</p>
                </div>
            </div>
        `;
        
        // 显示预览模态框
        document.querySelector('.course-preview').innerHTML = previewHTML;
        coursePreviewModal.classList.add('active');
    }
    
    function manageCourse(id) {
        // 这里可以跳转到课程管理详细页面
        alert(`管理课程 ${id}（实际项目中这里会跳转到课程管理页面）`);
    }
    
    async function publishCourseFromList(id) {
        try {
            const course = courses.find(c => c.id === id);
            if (!course) return;
            
            if (confirm(`确定要发布课程"${course.name}"吗？发布后学生将可以查看课程内容。`)) {
                course.status = 'published';
                course.updatedAt = new Date().toISOString();
                
                // 保存到IndexedDB
                await window.courseManager.saveCourse(course);
                
                // 重新加载课程数据
                courses = await window.courseManager.getCourses();
                
                // 重新渲染课程列表
                renderCourses(courses);
                
                showNotification(`课程"${course.name}"已成功发布！`, 'success');
            }
        } catch (error) {
            console.error('发布课程失败:', error);
            showNotification('发布课程失败，请重试', 'error');
        }
    }
    
    async function archiveCourse(id) {
        try {
            const course = courses.find(c => c.id === id);
            if (!course) return;
            
            if (confirm(`确定要归档课程"${course.name}"吗？归档后课程将对学生不可见，但数据会保留。`)) {
                course.status = 'archived';
                course.updatedAt = new Date().toISOString();
                
                // 保存到IndexedDB
                await window.courseManager.saveCourse(course);
                
                // 重新加载课程数据
                courses = await window.courseManager.getCourses();
                
                // 重新渲染课程列表
                renderCourses(courses);
                
                showNotification(`课程"${course.name}"已成功归档！`, 'success');
            }
        } catch (error) {
            console.error('归档课程失败:', error);
            showNotification('归档课程失败，请重试', 'error');
        }
    }
    
    async function restoreCourse(id) {
        try {
            const course = courses.find(c => c.id === id);
            if (!course) return;
            
            if (confirm(`确定要恢复课程"${course.name}"吗？`)) {
                course.status = 'draft';
                course.updatedAt = new Date().toISOString();
                
                // 保存到IndexedDB
                await window.courseManager.saveCourse(course);
                
                // 重新加载课程数据
                courses = await window.courseManager.getCourses();
                
                // 重新渲染课程列表
                renderCourses(courses);
                
                showNotification(`课程"${course.name}"已成功恢复为草稿！`, 'success');
            }
        } catch (error) {
            console.error('恢复课程失败:', error);
            showNotification('恢复课程失败，请重试', 'error');
        }
    }
    
    async function deleteCourse(id) {
        try {
            const course = courses.find(c => c.id === id);
            if (!course) return;
            
            if (confirm(`确定要删除课程"${course.name}"吗？此操作不可恢复。`)) {
                // 从IndexedDB删除课程
                await window.courseManager.deleteCourse(id);
                
                // 重新加载课程数据
                courses = await window.courseManager.getCourses();
                
                // 重新渲染课程列表
                renderCourses(courses);
                updateEmptyState();
                
                showNotification(`课程"${course.name}"已成功删除！`, 'success');
            }
        } catch (error) {
            console.error('删除课程失败:', error);
            showNotification('删除课程失败，请重试', 'error');
        }
    }
    
    function showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 添加关闭按钮事件
        notification.querySelector('.close-notification').addEventListener('click', function() {
            notification.remove();
        });
        
        // 自动移除通知
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // 添加CSS样式（如果尚未添加）
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-width: 300px;
                    max-width: 400px;
                    animation: slideIn 0.3s ease;
                    color: white;
                }
                .notification.success {
                    background-color: #27ae60;
                }
                .notification.info {
                    background-color: #3498db;
                }
                .notification.warning {
                    background-color: #f39c12;
                }
                .notification.error {
                    background-color: #e74c3c;
                }
                .close-notification {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    line-height: 1;
                    margin-left: 15px;
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    
});