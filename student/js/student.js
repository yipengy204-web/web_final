/**
 * 学生端主逻辑模块
 * 处理页面导航、用户交互和数据展示
 */

// 当前登录的学生信息（实际应从登录模块获取）
// 现在使用字符串 ID 以支持多端同步
let currentStudent = {
    id: 'stu_2024001',  // ✅ 改为字符串ID
    studentId: '2024150001',
    name: '张三',
    role: 'student',
    classId: 'cls_2024_01',
    major: '计算机科学与技术'
};

// 当前选中的课程ID（用于模态框）
let selectedCourseId = null;
let selectedCourseForDetail = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 等待数据库初始化
    await initDatabase();
    
    // 设置用户信息
    updateUserInfo();
    
    // 设置导航菜单事件
    setupNavigation();
    
    // 默认加载课程列表页面
    loadPage('courses');
});

// 更新用户信息显示
function updateUserInfo() {
    document.getElementById('studentName').textContent = currentStudent.name;
    document.getElementById('studentId').textContent = `学号：${currentStudent.studentId}`;
}

// 设置导航菜单
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 处理退出登录
            if (item.classList.contains('logout')) {
                handleLogout();
                return;
            }

            // 更新激活状态
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // 加载对应页面
            const page = item.dataset.page;
            loadPage(page);
        });
    });
}

// 加载页面内容
async function loadPage(pageName) {
    try {
        // 从模板加载页面内容
        const template = document.getElementById(`${pageName}-template`);
        if (!template) {
            throw new Error(`模板 ${pageName}-template 不存在`);
        }
        
        const content = template.content.cloneNode(true);
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '';
        contentArea.appendChild(content);
        
        // 根据页面类型加载数据
        switch(pageName) {
            case 'courses':
                await loadCourses();
                break;
            case 'my-courses':
                await loadMyCourses();
                break;
            case 'grades':
                await loadGrades();
                break;
            case 'grade-detail':
                await loadGradeDetail(selectedCourseForDetail);
                break;
        }
    } catch (error) {
        console.error('加载页面失败:', error);
        document.getElementById('content-area').innerHTML = '<p class="no-data">页面加载失败，请刷新重试</p>';
    }
}

// ==================== 课程列表页面 ====================

// 加载所有课程（显示开课计划）
async function loadCourses() {
    try {
        // ✅ 新结构：加载开课计划（plans），而不是课程库（courses）
        const plans = await getAllData('plans');
        const studentCourses = await getDataByIndex('student_courses', 'studentId', currentStudent.id);
        const enrolledPlanIds = studentCourses.map(sc => sc.planId);  // ✅ 改为 planId
        
        await displayCourses(plans, enrolledPlanIds);
    } catch (error) {
        console.error('加载课程失败:', error);
    }
}

// 显示课程列表（传入plans而不是courses）
async function displayCourses(plans, enrolledPlanIds) {
    const courseList = document.getElementById('courseList');
    
    if (plans.length === 0) {
        courseList.innerHTML = '<p class="no-data">暂无课程</p>';
        return;
    }
    
    const courseCards = [];
    for (const plan of plans) {
        // ✅ 获取课程基本信息
        const course = await getDataById('courses', plan.courseId);
        if (!course) continue;
        
        // ✅ 获取教师信息
        const teacher = await getDataById('users', plan.teacherId);
        const teacherName = teacher ? teacher.name : '未知教师';
        
        const isEnrolled = enrolledPlanIds.includes(plan.id);
        const isFull = plan.enrolled >= plan.capacity;
        
        courseCards.push(`
            <div class="course-card">
                <div class="course-header">
                    <span class="course-code">${course.code}</span>
                    <span class="course-tag ${course.category}">
                        ${getCategoryName(course.category)}
                    </span>
                </div>
                <h3 class="course-title">${course.name}</h3>
                <p class="course-teacher">👨‍🏫 ${teacherName}</p>
                <div class="course-info">
                    <span>📚 ${course.credits}学分</span>
                    <span>👥 ${plan.enrolled}/${plan.capacity}</span>
                    <span>📅 ${plan.semester}</span>
                </div>
                <p class="course-description">${course.description || '暂无介绍'}</p>
                <div class="course-actions">
                    <button class="btn-enroll" 
                            onclick="openEnrollModal('${plan.id}')" 
                            ${isEnrolled || isFull ? 'disabled' : ''}>
                        ${isEnrolled ? '✅ 已选课' : (isFull ? '❌ 已满' : '➕ 选课')}
                    </button>
                    <button class="btn-detail" onclick="viewCourseDetail('${plan.id}')">
                        详情
                    </button>
                </div>
            </div>
        `);
    }
    
    courseList.innerHTML = courseCards.join('');
}

// 获取课程类别名称
function getCategoryName(category) {
    const names = {
        'required': '必修',
        'elective': '选修',
        'general': '通识'
    };
    return names[category] || category;
}

// 组合筛选课程（搜索 + 学期 + 类别）
async function filterAndSearchCourses() {
    const searchText = document.getElementById('courseSearch').value.toLowerCase();
    const semester = document.getElementById('semesterFilter').value;
    const category = document.getElementById('categoryFilter').value;
    
    // ✅ 改为加载 plans
    const plans = await getAllData('plans');
    const studentCourses = await getDataByIndex('student_courses', 'studentId', currentStudent.id);
    const enrolledPlanIds = studentCourses.map(sc => sc.planId);
    
    // ✅ 筛选并获取课程、教师信息
    const filteredPlans = [];
    for (const plan of plans) {
        const course = await getDataById('courses', plan.courseId);
        if (!course) continue;
        
        const teacher = await getDataById('users', plan.teacherId);
        const teacherName = teacher ? teacher.name : '';
        
        // 搜索条件
        const searchMatch = !searchText || 
            course.name.toLowerCase().includes(searchText) ||
            course.code.toLowerCase().includes(searchText) ||
            teacherName.toLowerCase().includes(searchText);
        
        // 学期条件
        const semesterMatch = !semester || plan.semester === semester;
        
        // 类别条件
        const categoryMatch = !category || course.category === category;
        
        // 所有条件都要满足
        if (searchMatch && semesterMatch && categoryMatch) {
            filteredPlans.push(plan);
        }
    }
    
    await displayCourses(filteredPlans, enrolledPlanIds);
}

// 搜索课程（调用组合筛选）
async function searchCourses() {
    await filterAndSearchCourses();
}

// 筛选课程（调用组合筛选）
async function filterCourses() {
    await filterAndSearchCourses();
}

// 清空所有筛选条件
async function clearFilters() {
    document.getElementById('courseSearch').value = '';
    document.getElementById('semesterFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    await filterAndSearchCourses();
}

// 打开选课确认模态框
async function openEnrollModal(planId) {
    selectedCourseId = planId;  // ✅ 现在存的是 planId
    const plan = await getDataById('plans', planId);
    const course = await getDataById('courses', plan.courseId);
    const teacher = await getDataById('users', plan.teacherId);
    
    document.getElementById('enrollCourseInfo').innerHTML = `
        <p><strong>课程名称：</strong>${course.name}</p>
        <p><strong>课程编号：</strong>${course.code}</p>
        <p><strong>任课教师：</strong>${teacher ? teacher.name : '未知'}</p>
        <p><strong>学分：</strong>${course.credits}</p>
        <p><strong>上课时间：</strong>${plan.schedule || '待定'}</p>
        <p><strong>上课地点：</strong>${plan.classroom || '待定'}</p>
    `;
    
    document.getElementById('enrollModal').style.display = 'block';
}

// 关闭选课模态框
function closeEnrollModal() {
    document.getElementById('enrollModal').style.display = 'none';
    selectedCourseId = null;
}

// 确认选课
async function confirmEnroll() {
    try {
        // ✅ 生成选课记录 ID
        const enrollmentId = `sc_${currentStudent.id}_${selectedCourseId}`;
        
        // 添加选课记录
        await addData('student_courses', {
            id: enrollmentId,
            studentId: currentStudent.id,
            planId: selectedCourseId,  // ✅ 改为 planId
            enrollDate: new Date().toISOString().split('T')[0],
            status: 'active'
        });
        
        // 更新开课计划人数
        const plan = await getDataById('plans', selectedCourseId);
        plan.enrolled = (plan.enrolled || 0) + 1;
        await updateData('plans', plan);
        
        alert('选课成功！');
        closeEnrollModal();
        loadCourses(); // 重新加载课程列表
    } catch (error) {
        console.error('选课失败:', error);
        alert('选课失败：' + error.message);
    }
}

// 查看课程详情
async function viewCourseDetail(planId) {
    const plan = await getDataById('plans', planId);
    const course = await getDataById('courses', plan.courseId);
    const teacher = await getDataById('users', plan.teacherId);
    
    document.getElementById('courseInfoTitle').textContent = course.name;
    document.getElementById('courseInfoContent').innerHTML = `
        <div class="course-detail-info">
            <div class="info-section">
                <h3>📋 基本信息</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">课程编号</span>
                        <span class="info-value">${course.code}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">课程名称</span>
                        <span class="info-value">${course.name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">授课教师</span>
                        <span class="info-value">${teacher ? teacher.name : '未知'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">课程学分</span>
                        <span class="info-value">${course.credits} 学分</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">课程类型</span>
                        <span class="info-value">${getCategoryName(course.category)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">开课学期</span>
                        <span class="info-value">${plan.semester}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">上课时间</span>
                        <span class="info-value">${plan.schedule || '待定'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">上课地点</span>
                        <span class="info-value">${plan.classroom || '待定'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">选课人数</span>
                        <span class="info-value">${plan.enrolled}/${plan.capacity}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h3>📖 课程介绍</h3>
                <p class="course-intro">${course.description || '暂无介绍'}</p>
            </div>
        </div>
    `;
    
    document.getElementById('courseInfoModal').style.display = 'block';
}

// 关闭课程详情模态框
function closeCourseInfoModal() {
    document.getElementById('courseInfoModal').style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const enrollModal = document.getElementById('enrollModal');
    const courseModal = document.getElementById('courseDetailModal');
    const courseInfoModal = document.getElementById('courseInfoModal');
    
    if (event.target === enrollModal) {
        closeEnrollModal();
    }
    if (event.target === courseModal) {
        closeCourseDetailModal();
    }
    if (event.target === courseInfoModal) {
        closeCourseInfoModal();
    }
};

// ==================== 我的课程页面 ====================

// 加载我的课程
async function loadMyCourses() {
    try {
        // 获取统计数据
        const stats = await window.TeachingAPI.getStudentCourseStats(currentStudent.id);
        document.getElementById('totalCourses').textContent = stats.totalCourses;
        document.getElementById('pendingTasks').textContent = stats.pendingTasks;
        document.getElementById('completedTasks').textContent = stats.completedTasks;
        
        // 加载课程列表
        await displayMyCourses('all');
    } catch (error) {
        console.error('加载我的课程失败:', error);
    }
}

// 显示我的课程列表
async function displayMyCourses(filter) {
    const enrollments = await getDataByIndex('student_courses', 'studentId', currentStudent.id);
    const myCoursesList = document.getElementById('myCoursesList');
    
    if (enrollments.length === 0) {
        myCoursesList.innerHTML = '<p class="no-data">你还没有选修任何课程</p>';
        return;
    }
    
    const coursesHtml = [];
    for (const enrollment of enrollments) {
        // ✅ 改为从 plan 获取课程信息
        const plan = await getDataById('plans', enrollment.planId);
        if (!plan) continue;
        
        const course = await getDataById('courses', plan.courseId);
        if (!course) continue;
        
        const teacher = await getDataById('users', plan.teacherId);
        
        // 根据筛选条件过滤
        if (filter === 'ongoing' && enrollment.status !== 'active') continue;
        if (filter === 'completed' && enrollment.status !== 'completed') continue;
        
        // 计算学习进度（简化版）
        const progress = Math.floor(Math.random() * 100); // 实际应从任务完成情况计算
        
        coursesHtml.push(`
            <div class="my-course-item">
                <div class="my-course-info">
                    <h3>${course.name}</h3>
                    <div class="my-course-meta">
                        <span>👨‍🏫 ${teacher ? teacher.name : '未知教师'}</span>
                        <span>📚 ${course.credits}学分</span>
                        <span>📅 ${plan.semester}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">学习进度：${progress}%</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" onclick="openCourseDetailModal('${plan.id}')">
                        进入学习
                    </button>
                    <button class="btn-unenroll" onclick="unenrollCourse('${enrollment.id}', '${plan.id}')">
                        退选
                    </button>
                </div>
            </div>
        `);
    }
    
    myCoursesList.innerHTML = coursesHtml.join('');
}

// 切换标签页
function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    displayMyCourses(tab);
}

// 退选课程
async function unenrollCourse(enrollmentId, planId) {
    if (!confirm('确定要退选这门课程吗？')) {
        return;
    }
    
    try {
        // 删除选课记录
        await deleteData('student_courses', enrollmentId);
        
        // 更新开课计划人数
        const plan = await getDataById('plans', planId);
        if (plan && plan.enrolled > 0) {
            plan.enrolled -= 1;
            await updateData('plans', plan);
        }
        
        alert('退选成功！');
        
        // 重新加载我的课程页面
        await loadMyCourses();
    } catch (error) {
        console.error('退选失败:', error);
        alert('退选失败，请重试');
    }
}

// 打开课程详情模态框
let currentCourseId = null;

async function openCourseDetailModal(planId) {
    currentCourseId = planId;  // ✅ 现在存的是 planId
    const plan = await getDataById('plans', planId);
    const course = await getDataById('courses', plan.courseId);
    
    document.getElementById('courseDetailTitle').textContent = course.name;
    document.getElementById('courseDetailModal').style.display = 'block';
    
    // 默认显示课件资料
    await loadCourseMaterials(planId);
}

// 关闭课程详情模态框
function closeCourseDetailModal() {
    document.getElementById('courseDetailModal').style.display = 'none';
    currentCourseId = null;
}

// 切换课程详情标签
async function switchDetailTab(tab) {
    const tabs = document.querySelectorAll('.detail-tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    
    // 找到对应的标签按钮并激活
    const targetTab = Array.from(tabs).find(t => t.dataset.tab === tab);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    const content = document.getElementById('courseDetailContent');
    
    switch(tab) {
        case 'materials':
            await loadCourseMaterials(currentCourseId);
            break;
        case 'assignments':
            await loadCourseAssignments(currentCourseId);
            break;
        case 'info':
            await loadCourseInfo(currentCourseId);
            break;
    }
}

// 加载课件资料
async function loadCourseMaterials(planId) {
    const content = document.getElementById('courseDetailContent');
    const materials = await getDataByIndex('course_materials', 'planId', planId);  // ✅ 改为 planId
    
    if (materials.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <p>📚 暂无课件资料</p>
            </div>
        `;
        return;
    }
    
    const materialsHtml = materials.map(material => {
        let icon = '📄';
        if (material.type === 'video') icon = '🎥';
        if (material.type === 'image') icon = '🖼️';
        if (material.type === 'audio') icon = '🎵';
        
        return `
            <div class="material-item">
                <div class="material-info">
                    <span class="material-icon">${icon}</span>
                    <div class="material-details">
                        <h4>${material.name}</h4>
                        <span class="material-meta">${material.size || '-'} • 上传于 ${material.uploadDate || '-'}</span>
                    </div>
                </div>
                <div class="material-actions">
                    <button class="btn-view" onclick="viewMaterial('${material.id}', '${material.type}', '${material.url}', '${material.name}')">
                        ${material.type === 'video' || material.type === 'image' ? '预览' : '查看'}
                    </button>
                    <button class="btn-download" onclick="downloadMaterial('${material.url}', '${material.name}')">
                        下载
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    content.innerHTML = `
        <div class="materials-list">
            ${materialsHtml}
        </div>
    `;
}

// 预览课件
function viewMaterial(materialId, type, url, name) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    let contentHtml = '';
    if (type === 'video') {
        contentHtml = `
            <video controls style="width: 100%; max-height: 70vh;">
                <source src="${url}" type="video/mp4">
                您的浏览器不支持视频播放。
            </video>
        `;
    } else if (type === 'image') {
        contentHtml = `<img src="${url}" style="width: 100%; max-height: 70vh; object-fit: contain;">`;
    } else {
        contentHtml = `<p>文档预览功能开发中，请点击下载按钮下载查看。</p>`;
    }
    
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>${name}</h2>
            <div style="margin-top: 20px;">
                ${contentHtml}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
}

// 下载课件
function downloadMaterial(url, name) {
    alert(`开始下载：${name}\n\n实际项目中会触发文件下载。`);
}

// 加载课程作业
async function loadCourseAssignments(planId) {
    const content = document.getElementById('courseDetailContent');
    const assignments = await getDataByIndex('assignments', 'planId', planId);  // ✅ 改为 planId
    
    if (assignments.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <p>✏️ 暂无课程作业</p>
            </div>
        `;
        return;
    }
    
    const assignmentsHtml = [];
    for (const assignment of assignments) {
        // 检查是否已提交
        const submissions = await getDataByIndex('assignment_submissions', 'assignmentId', assignment.id);
        const mySubmission = submissions.find(s => s.studentId === currentStudent.id);
        
        const isOverdue = new Date(assignment.deadline) < new Date();
        const statusClass = mySubmission ? 'submitted' : (isOverdue ? 'overdue' : 'pending');
        const statusText = mySubmission ? '✅ 已提交' : (isOverdue ? '⏰ 已截止' : '📝 待提交');
        
        assignmentsHtml.push(`
            <div class="assignment-item">
                <div class="assignment-header">
                    <h4>${assignment.name}</h4>
                    <span class="assignment-status ${statusClass}">${statusText}</span>
                </div>
                <div class="assignment-body">
                    <p class="assignment-desc">${assignment.description || '暂无描述'}</p>
                    <div class="assignment-meta">
                        <span>📅 截止时间：${assignment.deadline || '待定'}</span>
                        <span>💯 总分：${assignment.totalScore || 100}分</span>
                        <span>⚖️ 权重：${assignment.weight || 0}%</span>
                    </div>
                    ${mySubmission ? `
                        <div class="submission-info">
                            <p>📤 提交时间：${mySubmission.submitTime}</p>
                            ${mySubmission.score ? `<p>🎯 得分：${mySubmission.score}分</p>` : '<p>⏳ 待批改</p>'}
                            ${mySubmission.feedback ? `<p>💬 教师评语：${mySubmission.feedback}</p>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="assignment-actions">
                    ${!mySubmission && !isOverdue ? `
                        <button class="btn-primary" onclick="openSubmitModal('${assignment.id}')">
                            提交作业
                        </button>
                    ` : ''}
                    ${mySubmission && !mySubmission.score ? `
                        <button class="btn-detail" onclick="openSubmitModal('${assignment.id}', '${mySubmission.id}')">
                            重新提交
                        </button>
                    ` : ''}
                </div>
            </div>
        `);
    }
    
    content.innerHTML = `
        <div class="assignments-list">
            ${assignmentsHtml.join('')}
        </div>
    `;
}

// 打开作业提交模态框
let currentAssignmentId = null;
let currentSubmissionId = null;

function openSubmitModal(assignmentId, submissionId = null) {
    currentAssignmentId = assignmentId;
    currentSubmissionId = submissionId;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'submitModal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeSubmitModal()">&times;</span>
            <h2>${submissionId ? '重新提交作业' : '提交作业'}</h2>
            <div style="margin-top: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">作业内容</label>
                <textarea id="submissionContent" rows="8" 
                    style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;"
                    placeholder="请输入作业内容或粘贴作业链接..."></textarea>
                
                <div style="margin-top: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">附件上传（可选）</label>
                    <input type="file" id="submissionFile" 
                        style="padding: 8px; border: 1px solid #ddd; border-radius: 8px; width: 100%;">
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeSubmitModal()">取消</button>
                <button class="btn-primary" onclick="submitAssignment()">确认提交</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeSubmitModal();
        }
    };
}

// 关闭提交模态框
function closeSubmitModal() {
    const modal = document.getElementById('submitModal');
    if (modal) {
        modal.remove();
    }
    currentAssignmentId = null;
    currentSubmissionId = null;
}

// 提交作业
async function submitAssignment() {
    const content = document.getElementById('submissionContent').value.trim();
    const file = document.getElementById('submissionFile').files[0];
    
    if (!content && !file) {
        alert('请输入作业内容或上传附件！');
        return;
    }
    
    try {
        const submission = {
            assignmentId: currentAssignmentId,
            studentId: currentStudent.id,
            content: content,
            fileName: file ? file.name : null,
            submitTime: new Date().toISOString().split('T')[0],
            status: 'submitted',
            score: null,
            feedback: null
        };
        
        if (currentSubmissionId) {
            // 重新提交
            submission.id = currentSubmissionId;
            await updateData('assignment_submissions', submission);
        } else {
            // 新提交 - 生成 ID
            submission.id = await IdGenerator.generic('sub');
            await addData('assignment_submissions', submission);
        }
        
        alert('作业提交成功！');
        closeSubmitModal();
        
        // 重新加载作业列表
        await loadCourseAssignments(currentCourseId);
    } catch (error) {
        console.error('提交作业失败:', error);
        alert('提交失败，请重试');
    }
}

// 加载课程信息
async function loadCourseInfo(planId) {
    const content = document.getElementById('courseDetailContent');
    const plan = await getDataById('plans', planId);
    const course = await getDataById('courses', plan.courseId);
    const teacher = await getDataById('users', plan.teacherId);
    
    if (!course) {
        content.innerHTML = '<p>课程信息加载失败</p>';
        return;
    }
    
    content.innerHTML = `
        <div class="course-info-detail">
            <div class="info-section">
                <h3>ℹ️ 基本信息</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">课程编号</span>
                        <span class="info-value">${course.code}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">课程名称</span>
                        <span class="info-value">${course.name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">授课教师</span>
                        <span class="info-value">${teacher ? teacher.name : '未知'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">课程学分</span>
                        <span class="info-value">${course.credits} 学分</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">课程类型</span>
                        <span class="info-value">${getCategoryName(course.category)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">开课学期</span>
                        <span class="info-value">${plan.semester}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">上课时间</span>
                        <span class="info-value">${plan.schedule || '待定'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">上课地点</span>
                        <span class="info-value">${plan.classroom || '待定'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">选课人数</span>
                        <span class="info-value">${plan.enrolled}/${plan.capacity}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h3>📖 课程介绍</h3>
                <p class="course-intro">${course.description || '暂无介绍'}</p>
            </div>
        </div>
    `;
}

// ==================== 成绩中心页面 ====================

// 加载成绩
async function loadGrades() {
    try {
        await loadSemesterGrades();
        await calculateGradeSummary();
    } catch (error) {
        console.error('加载成绩失败:', error);
    }
}

// 加载指定学期的成绩
async function loadSemesterGrades() {
    const semester = document.getElementById('semesterSelect').value;
    const scores = await getDataByIndex('scores', 'studentId', currentStudent.id);
    const tbody = document.getElementById('gradeTableBody');
    const noDataDiv = document.getElementById('noGradeData');
    
    console.log('🔍 调试 - 找到成绩记录数量:', scores.length);
    console.log('🔍 调试 - 成绩记录详情:', scores);
    
    if (scores.length === 0) {
        tbody.innerHTML = '';
        noDataDiv.style.display = 'block';
        return;
    }
    
    noDataDiv.style.display = 'none';
    const rows = [];
    
    for (const score of scores) {
        // ✅ 通过 planId 获取课程信息
        console.log('🔍 调试 - 正在处理成绩:', score.id, ', planId:', score.planId);
        const plan = await getDataById('plans', score.planId);
        console.log('🔍 调试 - 找到plan:', plan);
        
        if (!plan) {
            console.warn('⚠️ 警告 - plan不存在，跳过成绩:', score.id);
            continue;
        }
        
        const course = await getDataById('courses', plan.courseId);
        console.log('🔍 调试 - 找到course:', course);
        
        if (!course) {
            console.warn('⚠️ 警告 - course不存在，跳过成绩:', score.id);
            continue;
        }
        
        // 学期筛选
        if (semester !== 'all' && plan.semester !== semester) continue;
        
        const gradeClass = getGradeClass(score.total);
        
        rows.push(`
            <tr>
                <td>${course.code}</td>
                <td>${course.name}</td>
                <td>${getCategoryName(course.category)}</td>
                <td>${course.credits}</td>
                <td><span class="grade-badge ${gradeClass}">${score.total || '-'}</span></td>
                <td>${score.gpa || '-'}</td>
                <td>${plan.semester}</td>
                <td>
                    <button class="btn-view-detail" onclick="viewGradeDetail('${plan.id}')">
                        查看详情
                    </button>
                </td>
            </tr>
        `);
    }
    
    console.log('🔍 调试 - 最终生成的行数:', rows.length);
    console.log('🔍 调试 - 即将渲染到页面');
    tbody.innerHTML = rows.join('');
}

// 获取成绩等级样式
function getGradeClass(score) {
    if (!score) return '';
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'pass';
    return 'fail';
}

// 计算成绩汇总
async function calculateGradeSummary() {
    const scores = await getDataByIndex('scores', 'studentId', currentStudent.id);
    
    let totalCredits = 0;
    let totalGradePoints = 0;
    
    for (const score of scores) {
        // ✅ 通过 planId 获取课程信息
        const plan = await getDataById('plans', score.planId);
        if (!plan) continue;
        
        const course = await getDataById('courses', plan.courseId);
        if (course && score.gpa) {
            totalCredits += course.credits;
            totalGradePoints += score.gpa * course.credits;
        }
    }
    
    const avgGPA = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
    
    document.getElementById('totalCredits').textContent = totalCredits;
    document.getElementById('avgGPA').textContent = avgGPA;
    document.getElementById('completedCourses').textContent = scores.length;
}

// 查看成绩详情
function viewGradeDetail(planId) {
    selectedCourseForDetail = planId;  // ✅ 现在存的是 planId
    loadPage('grade-detail');
}

// ==================== 成绩详情页面 ====================

// 加载成绩详情
async function loadGradeDetail(planId) {
    try {
        // ✅ 通过 planId 获取课程和成绩信息
        const plan = await getDataById('plans', planId);
        if (!plan) {
            document.getElementById('content-area').innerHTML = '<p class="no-data">课程数据不存在</p>';
            return;
        }
        
        const course = await getDataById('courses', plan.courseId);
        const teacher = await getDataById('users', plan.teacherId);
        const scores = await getDataByIndex('scores', 'studentId', currentStudent.id);
        const score = scores.find(s => s.planId === planId);
        
        if (!course || !score) {
            document.getElementById('content-area').innerHTML = '<p class="no-data">成绩数据不存在</p>';
            return;
        }
        
        // 填充基本信息
        document.getElementById('courseTitle').textContent = course.name;
        document.getElementById('detailCourseCode').textContent = course.code;
        document.getElementById('detailCourseName').textContent = course.name;
        document.getElementById('detailTeacher').textContent = teacher ? teacher.name : '未知';
        document.getElementById('detailCredits').textContent = course.credits;
        document.getElementById('detailSemester').textContent = plan.semester;
        
        // 填充总评成绩
        document.getElementById('finalGrade').textContent = score.total || '-';
        document.getElementById('finalGPA').textContent = score.gpa || '-';
        
        // 填充成绩明细
        const details = await getDataByIndex('score_details', 'scoreId', score.id);
        const tbody = document.getElementById('breakdownTableBody');
        
        if (details.length === 0) {
            // 如果没有明细，显示默认构成
            tbody.innerHTML = `
                <tr>
                    <td>平时成绩</td>
                    <td>30%</td>
                    <td>${score.quiz || '-'}</td>
                    <td><span class="status-badge completed">已完成</span></td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>期中成绩</td>
                    <td>30%</td>
                    <td>${score.midterm || '-'}</td>
                    <td><span class="status-badge completed">已完成</span></td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>期末考试</td>
                    <td>40%</td>
                    <td>${score.final || '-'}</td>
                    <td><span class="status-badge ${score.final ? 'completed' : 'pending'}">
                        ${score.final ? '已完成' : '待完成'}
                    </span></td>
                    <td>-</td>
                </tr>
            `;
        } else {
            // 显示真实的成绩明细
            tbody.innerHTML = details.map(d => `
                <tr>
                    <td>${d.itemName}</td>
                    <td>${d.weight}%</td>
                    <td><span class="grade-badge ${getGradeClass(d.score)}">${d.score || '-'}</span></td>
                    <td><span class="status-badge ${d.status}">${d.status === 'completed' ? '已完成' : '待完成'}</span></td>
                    <td>${d.submitTime || '-'}</td>
                </tr>
            `).join('');
            
            // 添加成绩统计行
            const totalWeight = details.reduce((sum, d) => sum + (d.weight || 0), 0);
            
            tbody.innerHTML += `
                <tr style="background: #f8f9fa; font-weight: 600;">
                    <td>总计</td>
                    <td>${totalWeight}%</td>
                    <td><span class="grade-badge ${getGradeClass(score.total)}">${score.total || '-'}</span></td>
                    <td colspan="2">加权平均</td>
                </tr>
            `;
        }
        
        // 绘制成绩图表
        drawScoreChart(details.length > 0 ? details : [
            { itemName: '平时成绩', score: score.quiz || 0 },
            { itemName: '期中成绩', score: score.midterm || 0 },
            { itemName: '期末考试', score: score.final || 0 }
        ]);
    } catch (error) {
        console.error('加载成绩详情失败:', error);
    }
}

// 绘制成绩图表（简单的柱状图）
function drawScoreChart(details) {
    const canvas = document.getElementById('scoreChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    if (details.length === 0) {
        ctx.fillStyle = '#95a5a6';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无成绩数据', width / 2, height / 2);
        return;
    }
    
    const barWidth = width / details.length - 20;
    const maxScore = 100;
    const padding = 40;
    const chartHeight = height - padding * 2;
    
    details.forEach((detail, index) => {
        const score = detail.score || 0;
        const barHeight = (score / maxScore) * chartHeight;
        const x = index * (barWidth + 20) + 20;
        const y = height - padding - barHeight;
        
        // 绘制柱子
        const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 绘制分数
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(score, x + barWidth / 2, y - 5);
        
        // 绘制标签
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.translate(x + barWidth / 2, height - 10);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(detail.itemName, 0, 0);
        ctx.restore();
    });
    
    // 绘制Y轴刻度
    ctx.fillStyle = '#95a5a6';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const score = (maxScore / 5) * i;
        const y = height - padding - (chartHeight / 5) * i;
        ctx.fillText(score.toFixed(0), 15, y + 4);
        
        // 绘制网格线
        ctx.strokeStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 10, y);
        ctx.stroke();
    }
}

// ==================== 退出登录 ====================

function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        // 实际应该调用登录模块的退出接口
        alert('退出登录成功');
        // window.location.href = '/login.html';
    }
}
