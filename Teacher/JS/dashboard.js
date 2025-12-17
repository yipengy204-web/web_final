// dashboard.js - 完整更新
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initDashboard();
    
    function initDashboard() {
        // 加载课程数据
        loadDashboardData();
        
        // 设置事件监听器
        setupEventListeners();
    }
    
    async function loadDashboardData() {
        // 显示加载状态
        showLoadingState();
        
        try {
            // 使用course-manager模块获取课程数据
            const courses = await window.courseManager.getCourses();
            
            // 加载作业和考试数据
            const homeworkAssignments = await window.gradesManager.getHomeworkAssignments();
            const examAssignments = await window.gradesManager.getExamAssignments();
            
            // 更新欢迎区域的统计数据
            updateWelcomeStats(courses, homeworkAssignments, examAssignments);
            
            // 更新课程概览
            updateCourseOverview(courses);
        } catch (error) {
            console.error('加载仪表板数据失败:', error);
            // 后备方案：使用空数据
            updateWelcomeStats([], [], []);
            updateCourseOverview([]);
        }
    }
    

    
    function showLoadingState() {
        const courseCardsContainer = document.getElementById('dashboard-course-cards');
        
        if (courseCardsContainer) {
            courseCardsContainer.innerHTML = `
                <div class="loading-courses">
                    <div class="spinner"></div>
                    <p>正在加载课程数据...</p>
                </div>
            `;
        }
    }
    
    function updateWelcomeStats(courses, homeworkAssignments, examAssignments) {
        // 计算已发布的课程数量
        const publishedCourses = courses.filter(course => course.status === 'published');
        
        // 计算学生总数（模拟数据，实际应该从课程数据中获取）
        const totalStudents = publishedCourses.length * 45; // 假设每门课程平均45名学生
        
        // 计算待批改作业数量
        const pendingGrading = homeworkAssignments.filter(hw => hw.submissions > hw.graded).length + 
                              examAssignments.filter(exam => exam.submissions > exam.graded).length;
        
        // 计算需要安排的考试数量（未来7天内需要安排的考试）
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingExams = examAssignments.filter(exam => {
            const examDate = new Date(exam.startTime);
            return examDate >= now && examDate <= sevenDaysLater;
        }).length;
        
        // 更新DOM元素
        const activeCourseCountEl = document.getElementById('active-course-count');
        const totalStudentsEl = document.getElementById('total-students');
        const pendingTasksEl = document.getElementById('pending-tasks');
        
        if (activeCourseCountEl) activeCourseCountEl.textContent = publishedCourses.length;
        if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
        if (pendingTasksEl) pendingTasksEl.textContent = 0; // 待完成任务数量设为0，因为待办事项模块已删除
        
        // 更新欢迎消息
        updateWelcomeMessage(publishedCourses.length, 0, pendingGrading, upcomingExams);
    }
    
    function updateWelcomeMessage(courseCount, pendingGrading, upcomingExams) {
        const welcomeMessage = document.querySelector('.welcome-card p');
        if (welcomeMessage) {
            // 保持欢迎消息为空，只显示统计卡片
            welcomeMessage.textContent = '';
        }
    }
    
    function updateCourseOverview(courses) {
        const courseCardsContainer = document.getElementById('dashboard-course-cards');
        if (!courseCardsContainer) return;
        
        // 过滤出已发布的课程
        const publishedCourses = courses.filter(course => course.status === 'published');
        
        // 清空容器
        courseCardsContainer.innerHTML = '';
        
        // 如果没有已发布的课程
        if (publishedCourses.length === 0) {
            courseCardsContainer.innerHTML = `
                <div class="no-courses-message">
                    <i class="fas fa-book-open"></i>
                    <h3>暂无已发布的课程</h3>
                    <p>请前往"课程管理"创建并发布您的第一门课程</p>
                    <a href="courses.html" class="btn-primary">前往课程管理</a>
                </div>
            `;
            return;
        }
        
        // 显示所有已发布的课程
        publishedCourses.forEach(course => {
            const courseCard = createCourseCard(course);
            courseCardsContainer.appendChild(courseCard);
        });
    }
    
    function createCourseCard(course) {
        // 生成模拟数据（实际项目中应从课程数据中获取）
        const studentCount = Math.floor(Math.random() * 30) + 20;
        const assignmentCount = Math.floor(Math.random() * 5) + 1;
        
        // 根据课程状态确定徽章样式
        let statusClass = '';
        let statusText = '';
        
        switch (course.status) {
            case 'published':
                statusClass = 'published';
                statusText = '已发布';
                break;
            case 'draft':
                statusClass = 'draft';
                statusText = '草稿';
                break;
            case 'archived':
                statusClass = 'archived';
                statusText = '已归档';
                break;
            default:
                statusClass = 'draft';
                statusText = '草稿';
        }
        
        const card = document.createElement('div');
        card.className = 'course-card';
        card.dataset.courseId = course.id;
        
        card.innerHTML = `
            <div class="course-header">
                <h3>${course.name}</h3>
                <span class="course-status ${statusClass}">${statusText}</span>
            </div>
            <p class="course-code">${course.code} · ${course.class || '未设置班级'}</p>
            <div class="course-stats">
                <div class="course-stat">
                    <i class="fas fa-user-graduate"></i>
                    <span>${studentCount} 名学生</span>
                </div>
                <div class="course-stat">
                    <i class="fas fa-file-alt"></i>
                    <span>${assignmentCount} 个作业</span>
                </div>
            </div>
            <div class="course-actions">
                <a href="courses.html?edit=${course.id}" class="btn-course">管理课程</a>
                <a href="grades.html?course=${course.id}" class="btn-course secondary">录入成绩</a>
            </div>
        `;
        
        return card;
    }
    

    
    function setupEventListeners() {
        // 刷新按钮（如果需要）
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                loadDashboardData();
                showNotification('数据已刷新！', 'success');
            });
        }
        
        // 监听storage事件（当其他页面修改了数据时）
        window.addEventListener('storage', function(e) {
            if (e.key === 'teacherCourses' || e.key === 'teacherTodos') {
                loadDashboardData();
                showNotification('检测到数据更新，已刷新页面内容。', 'info');
            }
        });
        
        // 监听自定义事件（在同一页面内触发）
        window.addEventListener('courseDataUpdated', function() {
            loadDashboardData();
        });
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
    }
    
    // 添加通知样式（如果尚未添加）
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
});