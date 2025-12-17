// 考试管理功能 (IndexedDB 版)
let courses = [];
let homeworkAssignments = [];
let examAssignments = [];
let submissions = [];

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    await initPage();
});

async function initPage() {
    try {
        // 从IndexedDB加载课程数据
        courses = await window.courseManager.getPublishedCourses();
        // 从IndexedDB加载作业、考试和提交数据
        homeworkAssignments = await window.gradesManager.getHomeworkAssignments();
        examAssignments = await window.gradesManager.getExamAssignments();
        submissions = await window.gradesManager.getSubmissions();
        
        initCourseSelects();
        renderHomeworkList();
        renderExamList();
        renderGradingList();
        bindEvents();
        
        // 监听课程数据更新事件
        window.addEventListener('courseDataUpdated', async function() {
            courses = await window.courseManager.getPublishedCourses();
            initCourseSelects();
        });
    } catch (error) {
        console.error('初始化页面失败:', error);
        showNotification('页面初始化失败，请刷新页面重试', 'error');
    }
}

// 绑定事件
function bindEvents() {
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab).classList.add('active');
        });
    });
    
    // 作业表单提交
    document.getElementById('homeworkForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createHomework();
    });
    
    // 考试表单提交
    document.getElementById('examForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createExam();
    });
    
    // 关闭模态框
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// 初始化课程选择框
function initCourseSelects() {
    const hwCourseSelect = document.getElementById('hwCourse');
    const examCourseSelect = document.getElementById('examCourse');
    
    // 清空现有选项
    if (hwCourseSelect) hwCourseSelect.innerHTML = '<option value="">选择课程</option>';
    if (examCourseSelect) examCourseSelect.innerHTML = '<option value="">选择课程</option>';
    
    // 添加动态课程选项
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = `${course.name} (${course.code})`;
        if (hwCourseSelect) hwCourseSelect.appendChild(option.cloneNode(true));
        if (examCourseSelect) examCourseSelect.appendChild(option);
    });
}

// 创建作业
async function createHomework() {
    const title = document.getElementById('hwTitle').value;
    const courseId = document.getElementById('hwCourse').value;
    const description = document.getElementById('hwDescription').value;
    const deadline = document.getElementById('hwDeadline').value;
    
    const courseName = courses.find(c => c.id == courseId)?.name || '';
    
    const homework = {
        id: Date.now(),
        title: title,
        courseId: courseId,
        courseName: courseName,
        description: description,
        deadline: deadline,
        createTime: new Date().toLocaleString(),
        submissions: 0,
        graded: 0
    };
    
    homeworkAssignments.push(homework);
    
    // 保存到IndexedDB
    await window.gradesManager.saveHomeworkAssignment(homework);
    
    // 重置表单
    document.getElementById('homeworkForm').reset();
    renderHomeworkList();
    
    // 模拟添加学生提交记录（实际应由学生端提交）
    addMockSubmission(homework.id, 'homework');
}

// 创建考试
async function createExam() {
    const title = document.getElementById('examTitle').value;
    const courseId = document.getElementById('examCourse').value;
    const description = document.getElementById('examDescription').value;
    const startTime = document.getElementById('examStart').value;
    const endTime = document.getElementById('examEnd').value;
    const duration = document.getElementById('examDuration').value;
    
    const courseName = courses.find(c => c.id == courseId)?.name || '';
    
    const exam = {
        id: Date.now(),
        title: title,
        courseId: courseId,
        courseName: courseName,
        description: description,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        createTime: new Date().toLocaleString(),
        submissions: 0,
        graded: 0
    };
    
    examAssignments.push(exam);
    
    // 保存到IndexedDB
    await window.gradesManager.saveExamAssignment(exam);
    
    // 重置表单
    document.getElementById('examForm').reset();
    renderExamList();
    
    // 模拟添加学生提交记录（实际应由学生端提交）
    addMockSubmission(exam.id, 'exam');
}

// 模拟学生提交
async function addMockSubmission(assignmentId, type) {
    const mockStudents = [
        { id: 1001, name: '张三', studentId: '20240001' },
        { id: 1002, name: '李四', studentId: '20240002' },
        { id: 1003, name: '王五', studentId: '20240003' }
    ];
    
    for (const student of mockStudents) {
        const submission = {
            id: Date.now() + Math.random(),
            assignmentId: assignmentId,
            assignmentType: type,
            studentId: student.id,
            studentName: student.name,
            submitTime: new Date().toLocaleString(),
            status: '已提交',
            score: null,
            comment: '',
            graded: false
        };
        
        submissions.push(submission);
        // 保存到IndexedDB
        await window.gradesManager.saveSubmission(submission);
    }
}

// 渲染作业列表
function renderHomeworkList() {
    const list = document.getElementById('homeworkList');
    list.innerHTML = '';
    
    homeworkAssignments.forEach(hw => {
        const item = document.createElement('div');
        item.className = 'assignment-item';
        item.innerHTML = `
            <div class="assignment-header">
                <div class="assignment-title">${hw.title}</div>
                <span class="assignment-status">
                    已提交: ${hw.submissions} | 已批改: ${hw.graded}
                </span>
            </div>
            <div class="assignment-meta">
                <span>课程: ${hw.courseName}</span>
                <span>截止时间: ${formatDateTime(hw.deadline)}</span>
                <span>发布时间: ${hw.createTime}</span>
            </div>
            <div class="assignment-description">${hw.description}</div>
            <div class="assignment-actions">
                <button onclick="viewSubmissions(${hw.id}, 'homework')">查看提交</button>
                <button onclick="gradeAssignment(${hw.id}, 'homework')">批改</button>
                <button onclick="deleteAssignment(${hw.id}, 'homework')">删除</button>
            </div>
        `;
        list.appendChild(item);
    });
}

// 渲染考试列表
function renderExamList() {
    const list = document.getElementById('examList');
    list.innerHTML = '';
    
    examAssignments.forEach(exam => {
        const item = document.createElement('div');
        item.className = 'assignment-item';
        item.innerHTML = `
            <div class="assignment-header">
                <div class="assignment-title">${exam.title}</div>
                <span class="assignment-status">
                    已提交: ${exam.submissions} | 已批改: ${exam.graded}
                </span>
            </div>
            <div class="assignment-meta">
                <span>课程: ${exam.courseName}</span>
                <span>开始时间: ${formatDateTime(exam.startTime)}</span>
                <span>结束时间: ${formatDateTime(exam.endTime)}</span>
                <span>时长: ${exam.duration}分钟</span>
            </div>
            <div class="assignment-description">${exam.description}</div>
            <div class="assignment-actions">
                <button onclick="viewSubmissions(${exam.id}, 'exam')">查看提交</button>
                <button onclick="gradeAssignment(${exam.id}, 'exam')">批改</button>
                <button onclick="deleteAssignment(${exam.id}, 'exam')">删除</button>
            </div>
        `;
        list.appendChild(item);
    });
}

// 渲染批改列表
function renderGradingList() {
    const list = document.getElementById('gradingList');
    list.innerHTML = '';
    
    // 获取未批改的提交
    const ungradedSubmissions = submissions.filter(s => !s.graded);
    
    if (ungradedSubmissions.length === 0) {
        list.innerHTML = '<p class="no-items">暂无待批改作业</p>';
        return;
    }
    
    ungradedSubmissions.forEach(sub => {
        const assignment = sub.assignmentType === 'homework' 
            ? homeworkAssignments.find(h => h.id === sub.assignmentId)
            : examAssignments.find(e => e.id === sub.assignmentId);
        
        if (!assignment) return;
        
        const item = document.createElement('div');
        item.className = 'grading-item';
        item.onclick = () => openGradingModal(sub.id);
        item.innerHTML = `
            <div class="assignment-title">${assignment.title}</div>
            <div class="assignment-meta">
                <span>学生: ${sub.studentName}</span>
                <span>提交时间: ${sub.submitTime}</span>
                <span>类型: ${sub.assignmentType === 'homework' ? '作业' : '考试'}</span>
            </div>
            <div>状态: <span style="color:#e74c3c">待批改</span></div>
        `;
        list.appendChild(item);
    });
}

// 打开批改模态框
function openGradingModal(submissionId) {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    const assignment = submission.assignmentType === 'homework'
        ? homeworkAssignments.find(h => h.id === submission.assignmentId)
        : examAssignments.find(e => e.id === submission.assignmentId);
    
    const modal = document.getElementById('gradingModal');
    const details = document.getElementById('gradingDetails');
    
    details.innerHTML = `
        <p><strong>作业/考试:</strong> ${assignment?.title || '未知'}</p>
        <p><strong>学生:</strong> ${submission.studentName}</p>
        <p><strong>提交时间:</strong> ${submission.submitTime}</p>
        <p><strong>状态:</strong> ${submission.status}</p>
        <div style="margin:10px 0; padding:10px; background:#f5f5f5; border-radius:4px;">
            <p><strong>提交内容:</strong></p>
            <p>这里是学生提交的作业内容...</p>
        </div>
    `;
    
    document.getElementById('gradeScore').value = '';
    document.getElementById('gradeComment').value = '';
    
    modal.style.display = 'block';
    modal.dataset.submissionId = submissionId;
}

// 提交批改
async function submitGrade() {
    const modal = document.getElementById('gradingModal');
    const submissionId = modal.dataset.submissionId;
    const score = document.getElementById('gradeScore').value;
    const comment = document.getElementById('gradeComment').value;
    
    if (!score) {
        alert('请填写分数');
        return;
    }
    
    const submission = submissions.find(s => s.id == submissionId);
    if (submission) {
        submission.score = score;
        submission.comment = comment;
        submission.graded = true;
        submission.gradeTime = new Date().toLocaleString();
        
        // 更新作业/考试的批改数量
        let assignmentToUpdate = null;
        if (submission.assignmentType === 'homework') {
            assignmentToUpdate = homeworkAssignments.find(h => h.id === submission.assignmentId);
            if (assignmentToUpdate) assignmentToUpdate.graded++;
        } else {
            assignmentToUpdate = examAssignments.find(e => e.id === submission.assignmentId);
            if (assignmentToUpdate) assignmentToUpdate.graded++;
        }
        
        // 保存到IndexedDB
        await window.gradesManager.saveSubmission(submission);
        if (assignmentToUpdate) {
            if (submission.assignmentType === 'homework') {
                await window.gradesManager.saveHomeworkAssignment(assignmentToUpdate);
            } else {
                await window.gradesManager.saveExamAssignment(assignmentToUpdate);
            }
        }
        
        modal.style.display = 'none';
        renderGradingList();
        renderHomeworkList();
        renderExamList();
    }
}

// 查看提交情况
function viewSubmissions(assignmentId, type) {
    const assignmentSubmissions = submissions.filter(s => 
        s.assignmentId === assignmentId && s.assignmentType === type
    );
    
    let message = `提交情况 (共${assignmentSubmissions.length}人):\n\n`;
    assignmentSubmissions.forEach(sub => {
        message += `${sub.studentName}: ${sub.status} ${sub.graded ? `(已批改: ${sub.score}分)` : '(未批改)'}\n`;
    });
    
    alert(message);
}

// 批改作业/考试
function gradeAssignment(assignmentId, type) {
    const ungradedSubmissions = submissions.filter(s => 
        s.assignmentId === assignmentId && 
        s.assignmentType === type && 
        !s.graded
    );
    
    if (ungradedSubmissions.length === 0) {
        alert('所有提交都已批改完成');
        return;
    }
    
    // 切换到批改标签页
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector('.tab-btn[data-tab="grading"]').classList.add('active');
    document.getElementById('grading').classList.add('active');
    
    // 滚动到顶部
    window.scrollTo(0, 0);
}

// 删除作业/考试
async function deleteAssignment(assignmentId, type) {
    if (!confirm('确定要删除吗？')) return;
    
    try {
        if (type === 'homework') {
            homeworkAssignments = homeworkAssignments.filter(h => h.id !== assignmentId);
            await window.gradesManager.saveHomeworkAssignment(homeworkAssignments);
            renderHomeworkList();
        } else {
            examAssignments = examAssignments.filter(e => e.id !== assignmentId);
            await window.gradesManager.saveExamAssignment(examAssignments);
            renderExamList();
        }
        
        // 删除相关提交记录
        submissions = submissions.filter(s => s.assignmentId !== assignmentId);
        await window.gradesManager.saveSubmission(submissions);
        renderGradingList();
    } catch (error) {
        console.error('删除作业/考试失败:', error);
        alert('删除失败，请重试');
    }
}

// 格式化日期时间
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('zh-CN');
}