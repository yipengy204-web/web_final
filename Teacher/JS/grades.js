/**
 * 大学成绩管理平台 - 成绩录入模块 (统一数据管理版)
 * 主要功能：成绩录入、批量导入、数据计算与验证
 */

document.addEventListener('DOMContentLoaded', async function() {
    // 全局变量
    let currentCourse = null;
    let courses = [];
    let studentsData = [];
    let currentPage = 1;
    const studentsPerPage = 10;
    let isEditing = false;
    let currentEditRow = null;
    
    // 权重设置
    let weights = {
        attendance: 10,
        midterm: 30,
        final: 40,
        homework: 20
    };
    
    // 课程进度数据
    let courseProgress = {};
    
    // 初始化
    await init();
    
    async function init() {
        try {
            // 从IndexedDB加载课程数据
            courses = await window.courseManager.getPublishedCourses();
            
            // 初始化课程卡片
            await initCourseCards();
            
            // 生成模拟数据
            if (courses.length > 0) {
                currentCourse = courses[0].id;
                generateMockData(courses[0], 42);
            }
            
            // 初始化事件监听器
            initEventListeners();
            
            // 渲染表格
            renderTable();
            
            // 更新统计数据
            updateSummaryStats();
            
            // 验证权重设置
            validateWeights();
            
            // 监听课程数据更新事件
            window.addEventListener('courseDataUpdated', async function() {
                courses = await window.courseManager.getPublishedCourses();
                await initCourseCards();
                
            // 如果当前课程不存在了，切换到第一个课程
            if (!courses.find(c => c.id === currentCourse) && courses.length > 0) {
                currentCourse = courses[0].id;
                
                // 检查是否已有学生数据
                const existingData = await window.gradesManager.getCourseGrades(currentCourse);
                if (existingData.length === 0) {
                    await generateMockData(courses[0], 42);
                } else {
                    studentsData = existingData;
                }
                
                updateCourseInfo(courses[0]);
                renderTable();
                updateSummaryStats();
            }
            });
        } catch (error) {
            console.error('初始化页面失败:', error);
            showNotification('页面初始化失败，请刷新页面重试', 'error');
        }
    }
    
    // 初始化课程卡片
    async function initCourseCards() {
        const courseCardsContainer = document.querySelector('.course-cards-container');
        if (!courseCardsContainer) return;
        
        // 清空现有卡片
        courseCardsContainer.innerHTML = '';
        
        if (courses.length === 0) {
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
        
        // 创建课程卡片
        for (let i = 0; i < courses.length; i++) {
            const card = await createCourseCard(courses[i], i === 0);
            courseCardsContainer.appendChild(card);
        }
    }
    
    // 创建课程卡片
    async function createCourseCard(course, isActive = false) {
        const card = document.createElement('div');
        card.className = `course-card ${isActive ? 'active' : ''}`;
        card.dataset.course = course.id;
        
        // 获取实际的作业和考试数据
        const homeworkAssignments = await window.gradesManager.getHomeworkAssignments();
        const examAssignments = await window.gradesManager.getExamAssignments();
        
        // 计算该课程的作业次数
        const courseHomeworkCount = homeworkAssignments.filter(hw => hw.courseId === course.id).length;
        const courseExamCount = examAssignments.filter(exam => exam.courseId === course.id).length;
        const totalAssignments = courseHomeworkCount + courseExamCount;
        
        // 计算该课程的待批改任务数
        const submissions = await window.gradesManager.getSubmissions();
        const ungradedSubmissions = submissions.filter(sub => 
            (!sub.graded || sub.graded === false) && 
            ((sub.assignmentType === 'homework' && homeworkAssignments.some(hw => hw.id === sub.assignmentId && hw.courseId === course.id)) ||
             (sub.assignmentType === 'exam' && examAssignments.some(exam => exam.id === sub.assignmentId && exam.courseId === course.id)))
        ).length;
        
        // 获取该课程的学生数据
        const studentData = await window.gradesManager.getCourseGrades(course.id);
        const studentCount = studentData.length > 0 ? studentData.length : Math.floor(Math.random() * 30) + 20;
        
        // 计算成绩录入进度（基于现有数据）
        const completedGrades = studentData.filter(student => 
            student.attendance > 0 || student.midterm > 0 || student.final > 0 || student.homework > 0
        ).length;
        const progress = studentData.length > 0 ? Math.round((completedGrades / studentData.length) * 100) : 0;
        
        card.innerHTML = `
            <div class="course-card-icon">
                <i class="fas fa-book"></i>
            </div>
            <div class="course-card-content">
                <h4>${course.name}</h4>
                <p class="course-code">${course.code}</p>
                <p class="course-stats">
                    <span><i class="fas fa-users"></i> ${studentCount}人</span>
                    <span><i class="fas fa-tasks"></i> 任务: ${totalAssignments}次</span>
                    ${ungradedSubmissions > 0 ? `<span style="color: #e74c3c;"><i class="fas fa-exclamation-circle"></i> 待批改: ${ungradedSubmissions}</span>` : ''}
                </p>
                <div class="course-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span>成绩录入进度: ${progress}%</span>
                </div>
            </div>
        `;
        
        // 添加点击事件
        const clickHandler = async function() {
            // 防止重复点击快速触发多次刷新
            if (this.classList.contains('active')) return;
            
            document.querySelectorAll('.course-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            currentCourse = course.id;
            
            // 检查是否已有学生数据，避免重复生成
            const existingData = await window.gradesManager.getCourseGrades(course.id);
            if (existingData.length === 0) {
                await generateMockData(course, studentCount);
            } else {
                studentsData = existingData;
            }
            
            await updateCourseInfo(course);
            renderTable();
            updateSummaryStats();
        };
        
        // 确保只添加一次事件监听器
        card.removeEventListener('click', clickHandler);
        card.addEventListener('click', clickHandler);
        
        return card;
    }
    
    // 更新课程信息（基于课程对象）
    async function updateCourseInfo(course) {
        // 获取实际的作业和考试数据
        const homeworkAssignments = await window.gradesManager.getHomeworkAssignments();
        const examAssignments = await window.gradesManager.getExamAssignments();
        
        // 计算该课程的作业次数
        const courseHomeworkCount = homeworkAssignments.filter(hw => hw.courseId === course.id).length;
        const courseExamCount = examAssignments.filter(exam => exam.courseId === course.id).length;
        const totalAssignments = courseHomeworkCount + courseExamCount;
        
        const courseInfo = document.querySelector('.course-info');
        if (courseInfo) {
            courseInfo.innerHTML = `
                <h2><i class="fas fa-book"></i> ${course.name}</h2>
                <p>
                    <i class="fas fa-hashtag"></i> 课程代码: ${course.code} | 
                    <i class="fas fa-users"></i> 学生人数: ${studentsData.length} | 
                    <i class="fas fa-graduation-cap"></i> 学分: ${course.credit || 3} |
                    <i class="fas fa-tasks"></i> 总任务: ${totalAssignments}次
                </p>
            `;
        }
        
        // 更新表格标题
        document.querySelector('.grades-table-header h2').innerHTML = `
            <i class="fas fa-table"></i> 学生成绩表 - ${course.name} (${course.code})
        `;
        
        // 更新页脚
        document.getElementById('total-students').textContent = studentsData.length;
    }
    
    // 生成模拟学生数据
    async function generateMockData(course, count) {
        const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二', '刘十三', '陈十四', '杨十五', '黄十六', '赵十七', '周十八', '吴十九', '郑二十'];
        
        // 根据课程代码调整成绩分布
        const courseAdjustments = {
            'CS101': { attendance: 5, midterm: 5, final: 5, homework: 5 },
            'MA202': { attendance: 0, midterm: -5, final: -5, homework: 0 },
            'PHY105': { attendance: 3, midterm: 3, final: 3, homework: 3 },
            'ENG201': { attendance: 8, midterm: 8, final: 8, homework: 8 },
            'SE301': { attendance: 2, midterm: 2, final: 2, homework: 2 }
        };
        
        const adjustment = courseAdjustments[course.code] || { attendance: 0, midterm: 0, final: 0, homework: 0 };
        
        studentsData = [];
        
        for (let i = 1; i <= count; i++) {
            // 根据课程调整基础分数
            const baseAttendance = 90 + adjustment.attendance;
            const baseMidterm = 60 + adjustment.midterm;
            const baseFinal = 50 + adjustment.final;
            const baseHomework = 70 + adjustment.homework;
            
            const attendance = Math.floor(Math.random() * 11) + Math.max(baseAttendance, 0);
            const midterm = Math.floor(Math.random() * 31) + Math.max(baseMidterm, 0);
            const final = Math.floor(Math.random() * 41) + Math.max(baseFinal, 0);
            const homework = Math.floor(Math.random() * 26) + Math.max(baseHomework, 0);
            
            studentsData.push({
                id: `${course.code.substring(0,2)}2023${i < 10 ? '000' + i : i < 100 ? '00' + i : i < 1000 ? '0' + i : i}`,
                name: names[(i-1) % names.length],
                attendance: Math.min(attendance, 100),
                midterm: Math.min(midterm, 100),
                final: Math.min(final, 100),
                homework: Math.min(homework, 100),
                finalGrade: calculateFinalGrade(
                    Math.min(attendance, 100),
                    Math.min(midterm, 100),
                    Math.min(final, 100),
                    Math.min(homework, 100)
                ),
                gradeLevel: getGradeLevel(calculateFinalGrade(
                    Math.min(attendance, 100),
                    Math.min(midterm, 100),
                    Math.min(final, 100),
                    Math.min(homework, 100)
                ))
            });
        }
        
        // 保存数据到IndexedDB，避免重复生成
        await window.gradesManager.saveCourseGrades(course.id, studentsData);
    }
    
    // 计算总评成绩
    function calculateFinalGrade(attendance, midterm, final, homework) {
        return Math.round(
            (attendance * weights.attendance / 100) +
            (midterm * weights.midterm / 100) +
            (final * weights.final / 100) +
            (homework * weights.homework / 100)
        );
    }
    
    // 根据分数获取等级
    function getGradeLevel(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }
    
    // 初始化事件监听器
    function initEventListeners() {
        // 权重更新
        document.getElementById('update-weights').addEventListener('click', updateWeights);
        
        // 权重输入变化监听
        document.querySelectorAll('.weight-input').forEach(input => {
            input.addEventListener('change', validateWeights);
        });
        
        // 添加学生按钮
        document.getElementById('add-student').addEventListener('click', showAddStudentModal);
        
        // 批量导入按钮
        document.getElementById('import-grades').addEventListener('click', showImportModal);
        
        // 导出成绩按钮
        document.getElementById('export-grades').addEventListener('click', exportGrades);
        
        // 保存所有修改
        document.getElementById('save-all').addEventListener('click', saveAllChanges);
        
        // 课程卡片选择已经在createCourseCard函数中处理，这里不需要重复添加
        
        // 搜索功能
        document.getElementById('student-search').addEventListener('input', function() {
            filterStudents(this.value);
        });
        
        // 分页按钮
        document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
        document.getElementById('next-page').addEventListener('click', () => changePage(1));
        
        // 显示/隐藏总评
        document.getElementById('toggle-final-grade').addEventListener('click', toggleFinalGrade);
        
        // 模态框关闭
        document.querySelectorAll('.close-modal, .modal').forEach(el => {
            if (el.classList.contains('modal')) {
                el.addEventListener('click', function(e) {
                    if (e.target === this) {
                        closeAllModals();
                    }
                });
            } else {
                el.addEventListener('click', closeAllModals);
            }
        });
        
        // 添加学生表单
        document.getElementById('cancel-add').addEventListener('click', closeAllModals);
        document.getElementById('confirm-add').addEventListener('click', addNewStudent);
        
        // 导入功能
        document.getElementById('cancel-import').addEventListener('click', closeAllModals);
        document.getElementById('confirm-import').addEventListener('click', confirmImport);
        document.getElementById('download-template').addEventListener('click', downloadTemplate);
        
        // 文件上传
        const fileInput = document.getElementById('file-input');
        const dropArea = document.getElementById('drop-area');
        
        fileInput.addEventListener('change', handleFileSelect);
        
        // 拖放功能
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        dropArea.addEventListener('drop', handleDrop, false);
        
        // 删除功能
        document.getElementById('cancel-delete').addEventListener('click', closeAllModals);
        document.getElementById('confirm-delete').addEventListener('click', function() {
            const studentId = this.dataset.deleteId;
            deleteStudentConfirmed(studentId);
        });
    }
    
    // 选择课程
    function selectCourse(courseCode, cardElement) {
        // 移除所有卡片的active类
        document.querySelectorAll('.course-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // 为点击的卡片添加active类
        cardElement.classList.add('active');
        
        // 更新当前课程
        currentCourse = courseCode;
        
        // 根据选择的课程加载对应的学生数据
        loadCourseData(courseCode);
    }
    
    // 加载课程数据
    function loadCourseData(courseCode) {
        // 清空当前数据
        studentsData = [];
        
        // 根据课程代码找到对应的课程对象
        const course = courses.find(c => c.id === courseCode);
        if (!course) {
            console.error('未找到课程:', courseCode);
            return;
        }
        
        // 根据课程代码生成不同的模拟数据
        const courseStudentCounts = {
            'CS101': 42,
            'MA202': 56,
            'PHY105': 38,
            'ENG201': 48,
            'SE301': 35
        };
        
        const studentCount = courseStudentCounts[course.code] || 42;
        
        // 生成模拟学生数据
        generateMockData(course, studentCount);
        
        // 重置分页
        currentPage = 1;
        
        // 重新渲染表格
        renderTable();
        
        // 更新统计数据
        updateSummaryStats();
        
        // 显示通知
        showNotification(`已切换到课程: ${course.name}`, 'success');
    }
    
    // 渲染表格
    function renderTable() {
        const tableBody = document.getElementById('grades-table-body');
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = startIndex + studentsPerPage;
        const currentStudents = studentsData.slice(startIndex, endIndex);
        
        tableBody.innerHTML = '';
        
        if (currentStudents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 3rem;">
                        <i class="fas fa-user-graduate" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <p>暂无学生数据</p>
                        <button class="btn-primary" id="add-first-student" style="margin-top: 1rem;">添加学生</button>
                    </td>
                </tr>
            `;
            
            document.getElementById('add-first-student')?.addEventListener('click', showAddStudentModal);
            return;
        }
        
        currentStudents.forEach((student, index) => {
            const row = document.createElement('tr');
            row.dataset.id = student.id;
            
            row.innerHTML = `
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>
                    <span class="display-grade">${student.attendance}</span>
                    <input type="number" class="grade-input attendance-input" value="${student.attendance}" min="0" max="100" style="display: none;">
                </td>
                <td>
                    <span class="display-grade">${student.midterm}</span>
                    <input type="number" class="grade-input midterm-input" value="${student.midterm}" min="0" max="100" style="display: none;">
                </td>
                <td>
                    <span class="display-grade">${student.final}</span>
                    <input type="number" class="grade-input final-input" value="${student.final}" min="0" max="100" style="display: none;">
                </td>
                <td>
                    <span class="display-grade">${student.homework}</span>
                    <input type="number" class="grade-input homework-input" value="${student.homework}" min="0" max="100" style="display: none;">
                </td>
                <td class="final-grade grade-${student.gradeLevel}">${student.finalGrade}</td>
                <td class="grade-${student.gradeLevel}">${student.gradeLevel}</td>
                <td class="action-cell">
                    <button class="action-btn edit-btn" data-id="${student.id}" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${student.id}" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                    <div class="edit-actions" style="display: none;">
                        <button class="action-btn save-btn" data-id="${student.id}" title="保存">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn cancel-btn" data-id="${student.id}" title="取消">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // 更新分页信息
        updatePaginationInfo();
        
        // 添加行事件监听器
        addRowEventListeners();
    }
    
    // 添加行事件监听器
    function addRowEventListeners() {
        // 编辑按钮
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (isEditing && currentEditRow !== this.closest('tr')) {
                    showNotification('请先完成当前编辑', 'warning');
                    return;
                }
                
                startEditRow(this.closest('tr'));
            });
        });
        
        // 删除按钮
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.dataset.id;
                showDeleteModal(studentId);
            });
        });
        
        // 保存按钮
        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.dataset.id;
                saveEditRow(studentId);
            });
        });
        
        // 取消按钮
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.dataset.id;
                cancelEditRow(studentId);
            });
        });
        
        // 成绩输入验证
        document.querySelectorAll('.grade-input').forEach(input => {
            input.addEventListener('change', function() {
                validateGradeInput(this);
            });
        });
    }
    
    // 开始编辑行
    function startEditRow(row) {
        if (isEditing) return;
        
        isEditing = true;
        currentEditRow = row;
        row.classList.add('editing');
        
        // 显示输入框，隐藏显示文本
        row.querySelectorAll('.display-grade').forEach(span => {
            span.style.display = 'none';
        });
        
        row.querySelectorAll('.grade-input').forEach(input => {
            input.style.display = 'inline-block';
        });
        
        // 显示保存/取消按钮，隐藏编辑/删除按钮
        row.querySelector('.edit-actions').style.display = 'flex';
        row.querySelector('.edit-btn').parentElement.style.display = 'none';
    }
    
    // 保存编辑行
    async function saveEditRow(studentId) {
        const row = document.querySelector(`tr[data-id="${studentId}"]`);
        const attendanceInput = row.querySelector('.attendance-input');
        const midtermInput = row.querySelector('.midterm-input');
        const finalInput = row.querySelector('.final-input');
        const homeworkInput = row.querySelector('.homework-input');
        
        // 验证输入
        if (!validateGradeInput(attendanceInput) || 
            !validateGradeInput(midtermInput) || 
            !validateGradeInput(finalInput) || 
            !validateGradeInput(homeworkInput)) {
            showNotification('请输入有效的成绩（0-100）', 'error');
            return;
        }
        
        // 更新数据
        const studentIndex = studentsData.findIndex(s => s.id === studentId);
        if (studentIndex !== -1) {
            studentsData[studentIndex].attendance = parseInt(attendanceInput.value);
            studentsData[studentIndex].midterm = parseInt(midtermInput.value);
            studentsData[studentIndex].final = parseInt(finalInput.value);
            studentsData[studentIndex].homework = parseInt(homeworkInput.value);
            studentsData[studentIndex].finalGrade = calculateFinalGrade(
                studentsData[studentIndex].attendance,
                studentsData[studentIndex].midterm,
                studentsData[studentIndex].final,
                studentsData[studentIndex].homework
            );
            studentsData[studentIndex].gradeLevel = getGradeLevel(studentsData[studentIndex].finalGrade);
            
            // 更新显示
            row.querySelector('.display-grade:nth-child(1)').textContent = studentsData[studentIndex].attendance;
            row.querySelector('.display-grade:nth-child(2)').textContent = studentsData[studentIndex].midterm;
            row.querySelector('.display-grade:nth-child(3)').textContent = studentsData[studentIndex].final;
            row.querySelector('.display-grade:nth-child(4)').textContent = studentsData[studentIndex].homework;
            
            row.querySelector('.final-grade').textContent = studentsData[studentIndex].finalGrade;
            row.querySelector('.final-grade').className = `final-grade grade-${studentsData[studentIndex].gradeLevel}`;
            
            row.querySelector('td:nth-child(8)').textContent = studentsData[studentIndex].gradeLevel;
            row.querySelector('td:nth-child(8)').className = `grade-${studentsData[studentIndex].gradeLevel}`;
        }
        
        // 保存数据到IndexedDB
        await window.gradesManager.saveCourseGrades(currentCourse, studentsData);
        
        // 结束编辑
        endEditRow(row);
        
        // 更新统计数据
        updateSummaryStats();
        
        // 更新课程进度
        updateCourseProgress(currentCourse);
        
        showNotification('成绩已更新', 'success');
    }
    
    // 取消编辑行
    function cancelEditRow(studentId) {
        const row = document.querySelector(`tr[data-id="${studentId}"]`);
        endEditRow(row);
    }
    
    // 结束编辑行
    function endEditRow(row) {
        row.classList.remove('editing');
        
        // 显示显示文本，隐藏输入框
        row.querySelectorAll('.display-grade').forEach(span => {
            span.style.display = 'inline';
        });
        
        row.querySelectorAll('.grade-input').forEach(input => {
            input.style.display = 'none';
        });
        
        // 显示编辑/删除按钮，隐藏保存/取消按钮
        row.querySelector('.edit-actions').style.display = 'none';
        row.querySelector('.edit-btn').parentElement.style.display = 'flex';
        
        isEditing = false;
        currentEditRow = null;
    }
    
    // 验证成绩输入
    function validateGradeInput(input) {
        const value = parseInt(input.value);
        if (isNaN(value) || value < 0 || value > 100) {
            input.classList.add('invalid');
            return false;
        } else {
            input.classList.remove('invalid');
            return true;
        }
    }
    
    // 显示删除确认模态框
    function showDeleteModal(studentId) {
        document.getElementById('confirm-delete').dataset.deleteId = studentId;
        document.getElementById('delete-modal').classList.add('active');
    }
    
    // 确认删除学生
    function deleteStudentConfirmed(studentId) {
        const studentIndex = studentsData.findIndex(s => s.id === studentId);
        if (studentIndex !== -1) {
            studentsData.splice(studentIndex, 1);
            renderTable();
            updateSummaryStats();
            updateCourseProgress(currentCourse);
            closeAllModals();
            showNotification('学生已删除', 'success');
        }
    }
    
    // 更新权重
    function updateWeights() {
        weights.attendance = parseInt(document.getElementById('attendance-weight').value) || 0;
        weights.midterm = parseInt(document.getElementById('midterm-weight').value) || 0;
        weights.final = parseInt(document.getElementById('final-weight').value) || 0;
        weights.homework = parseInt(document.getElementById('homework-weight').value) || 0;
        
        // 重新计算所有学生的总评成绩
        studentsData.forEach(student => {
            student.finalGrade = calculateFinalGrade(
                student.attendance,
                student.midterm,
                student.final,
                student.homework
            );
            student.gradeLevel = getGradeLevel(student.finalGrade);
        });
        
        // 重新渲染表格
        renderTable();
        updateSummaryStats();
        
        showNotification('权重已更新，总评成绩已重新计算', 'success');
    }
    
    // 验证权重总和
    function validateWeights() {
        const attendance = parseInt(document.getElementById('attendance-weight').value) || 0;
        const midterm = parseInt(document.getElementById('midterm-weight').value) || 0;
        const final = parseInt(document.getElementById('final-weight').value) || 0;
        const homework = parseInt(document.getElementById('homework-weight').value) || 0;
        
        const total = attendance + midterm + final + homework;
        document.getElementById('total-weight').textContent = total;
        
        const statusElement = document.getElementById('weight-status');
        if (total === 100) {
            statusElement.textContent = '比例设置正确';
            statusElement.className = '';
            statusElement.style.color = '#155724';
            statusElement.style.backgroundColor = '#d5edda';
            document.getElementById('update-weights').disabled = false;
        } else {
            statusElement.textContent = `比例总和应为100%，当前为${total}%`;
            statusElement.className = 'error';
            statusElement.style.color = '#721c24';
            statusElement.style.backgroundColor = '#f8d7da';
            document.getElementById('update-weights').disabled = true;
        }
    }
    
    // 更新课程进度
    function updateCourseProgress(courseCode) {
        // 计算当前课程的成绩录入进度
        let completedCount = 0;
        
        // 这里假设有成绩录入就算完成（成绩不为0）
        studentsData.forEach(student => {
            if (student.attendance > 0 || student.midterm > 0 || student.final > 0 || student.homework > 0) {
                completedCount++;
            }
        });
        
        const progress = studentsData.length > 0 ? Math.round((completedCount / studentsData.length) * 100) : 0;
        
        // 更新课程进度数据
        courseProgress[courseCode] = progress;
        
        // 找到对应的课程卡片，更新进度
        const courseCard = document.querySelector(`.course-card[data-course="${courseCode}"]`);
        if (courseCard) {
            const progressFill = courseCard.querySelector('.progress-fill');
            const progressText = courseCard.querySelector('.course-progress span');
            
            if (progressFill && progressText) {
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `成绩录入进度: ${progress}%`;
            }
        }
    }
    
    // 过滤学生
    function filterStudents(searchTerm) {
        currentPage = 1;
        
        if (!searchTerm.trim()) {
            renderTable();
            return;
        }
        
        const filteredStudents = studentsData.filter(student => 
            student.id.includes(searchTerm) || 
            student.name.includes(searchTerm)
        );
        
        const tableBody = document.getElementById('grades-table-body');
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = startIndex + studentsPerPage;
        const currentStudents = filteredStudents.slice(startIndex, endIndex);
        
        tableBody.innerHTML = '';
        
        if (currentStudents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 3rem;">
                        未找到匹配的学生
                    </td>
                </tr>
            `;
            return;
        }
        
        currentStudents.forEach(student => {
            const row = document.createElement('tr');
            row.dataset.id = student.id;
            
            row.innerHTML = `
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.attendance}</td>
                <td>${student.midterm}</td>
                <td>${student.final}</td>
                <td>${student.homework}</td>
                <td class="final-grade grade-${student.gradeLevel}">${student.finalGrade}</td>
                <td class="grade-${student.gradeLevel}">${student.gradeLevel}</td>
                <td class="action-cell">
                    <button class="action-btn edit-btn" data-id="${student.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${student.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // 更新分页信息
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = Math.ceil(filteredStudents.length / studentsPerPage);
        
        // 添加行事件监听器
        addRowEventListeners();
    }
    
    // 更改页码
    function changePage(direction) {
        const totalPages = Math.ceil(studentsData.length / studentsPerPage);
        const newPage = currentPage + direction;
        
        if (newPage < 1 || newPage > totalPages) {
            return;
        }
        
        currentPage = newPage;
        renderTable();
    }
    
    // 更新分页信息
    function updatePaginationInfo() {
        const totalPages = Math.ceil(studentsData.length / studentsPerPage);
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        
        // 禁用/启用分页按钮
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
    }
    
    // 切换总评显示
    function toggleFinalGrade() {
        const finalGradeCells = document.querySelectorAll('.final-grade');
        const isHidden = finalGradeCells[0].style.display === 'none';
        
        finalGradeCells.forEach(cell => {
            cell.style.display = isHidden ? 'table-cell' : 'none';
        });
        
        const button = document.getElementById('toggle-final-grade');
        if (isHidden) {
            button.innerHTML = '<i class="fas fa-eye-slash"></i> 隐藏总评';
        } else {
            button.innerHTML = '<i class="fas fa-eye"></i> 显示总评';
        }
    }
    
    // 更新统计数据
    function updateSummaryStats() {
        if (studentsData.length === 0) {
            document.getElementById('average-grade').textContent = '-';
            document.getElementById('max-grade').textContent = '-';
            document.getElementById('min-grade').textContent = '-';
            document.getElementById('pass-rate').textContent = '-';
            return;
        }
        
        const finalGrades = studentsData.map(s => s.finalGrade);
        const average = finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length;
        const max = Math.max(...finalGrades);
        const min = Math.min(...finalGrades);
        const passCount = finalGrades.filter(grade => grade >= 60).length;
        const passRate = (passCount / finalGrades.length * 100).toFixed(1);
        
        document.getElementById('average-grade').textContent = average.toFixed(1);
        document.getElementById('max-grade').textContent = max;
        document.getElementById('min-grade').textContent = min;
        document.getElementById('pass-rate').textContent = `${passRate}%`;
    }
    
    // 显示添加学生模态框
    function showAddStudentModal() {
        document.getElementById('add-student-modal').classList.add('active');
        document.getElementById('student-id').focus();
    }
    
    // 添加新学生
    function addNewStudent() {
        const id = document.getElementById('student-id').value.trim();
        const name = document.getElementById('student-name').value.trim();
        const attendance = parseInt(document.getElementById('add-attendance').value) || 0;
        const midterm = parseInt(document.getElementById('add-midterm').value) || 0;
        const final = parseInt(document.getElementById('add-final').value) || 0;
        const homework = parseInt(document.getElementById('add-homework').value) || 0;
        
        // 验证输入
        if (!id || !name) {
            showNotification('学号和姓名不能为空', 'error');
            return;
        }
        
        if (studentsData.some(s => s.id === id)) {
            showNotification('该学号已存在', 'error');
            return;
        }
        
        // 添加新学生
        const finalGrade = calculateFinalGrade(attendance, midterm, final, homework);
        const gradeLevel = getGradeLevel(finalGrade);
        
        studentsData.unshift({
            id,
            name,
            attendance,
            midterm,
            final,
            homework,
            finalGrade,
            gradeLevel
        });
        
        // 关闭模态框并重置表单
        closeAllModals();
        document.getElementById('add-student-form').reset();
        
        // 重新渲染表格
        currentPage = 1;
        renderTable();
        updateSummaryStats();
        updateCourseProgress(currentCourse);
        
        showNotification('学生添加成功', 'success');
    }
    
    // 显示导入模态框
    function showImportModal() {
        document.getElementById('import-modal').classList.add('active');
        document.getElementById('file-info').classList.remove('active');
        document.getElementById('preview-container').innerHTML = '';
        document.getElementById('confirm-import').disabled = true;
    }
    
    // 下载模板
    function downloadTemplate() {
        // 创建CSV内容
        const csvContent = "学号,姓名,考勤成绩,期中成绩,期末成绩,作业成绩\n20230001,示例学生,95,85,78,92";
        
        // 创建Blob和下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', '成绩导入模板.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('模板下载成功', 'success');
    }
    
    // 处理文件选择
    function handleFileSelect(e) {
        const file = e.target.files[0];
        processFile(file);
    }
    
    // 处理拖放文件
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        processFile(file);
    }
    
    // 处理文件
    function processFile(file) {
        if (!file) return;
        
        // 检查文件类型
        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validTypes.some(type => file.type.includes(type.replace('application/', '')) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            showNotification('请上传CSV或Excel文件', 'error');
            return;
        }
        
        // 显示文件信息
        const fileInfo = document.getElementById('file-info');
        fileInfo.innerHTML = `
            <p><strong>文件名:</strong> ${file.name}</p>
            <p><strong>文件大小:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
        `;
        fileInfo.classList.add('active');
        
        // 解析文件（这里简化处理，实际项目中应使用专门的库如SheetJS）
        if (file.name.endsWith('.csv')) {
            parseCSV(file);
        } else {
            showNotification('Excel文件解析需要额外库支持，这里仅演示CSV导入', 'warning');
            // 模拟数据预览
            simulatePreviewData();
        }
    }
    
    // 解析CSV文件（简化版）
    function parseCSV(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            // 简单解析CSV（实际项目中应使用更健壮的CSV解析器）
            const lines = content.split('\n');
            const headers = lines[0].split(',');
            
            // 验证CSV格式
            if (headers.length < 6) {
                showNotification('CSV文件格式不正确，请使用提供的模板', 'error');
                return;
            }
            
            // 解析数据
            const data = [];
            for (let i = 1; i < lines.length && i < 6; i++) { // 只解析前5行作为预览
                if (lines[i].trim()) {
                    const values = lines[i].split(',');
                    if (values.length >= 6) {
                        data.push({
                            id: values[0],
                            name: values[1],
                            attendance: values[2],
                            midterm: values[3],
                            final: values[4],
                            homework: values[5]
                        });
                    }
                }
            }
            
            // 显示预览
            showPreview(data);
            document.getElementById('confirm-import').disabled = false;
        };
        
        reader.readAsText(file);
    }
    
    // 模拟预览数据
    function simulatePreviewData() {
        const data = [
            { id: '20230025', name: '新学生一', attendance: 90, midterm: 80, final: 75, homework: 85 },
            { id: '20230026', name: '新学生二', attendance: 95, midterm: 70, final: 85, homework: 90 },
            { id: '20230027', name: '新学生三', attendance: 88, midterm: 75, final: 80, homework: 82 }
        ];
        
        showPreview(data);
        document.getElementById('confirm-import').disabled = false;
    }
    
    // 显示预览
    function showPreview(data) {
        const container = document.getElementById('preview-container');
        
        if (data.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">没有可预览的数据</p>';
            return;
        }
        
        let html = `
            <table class="preview-table">
                <thead>
                    <tr>
                        <th>学号</th>
                        <th>姓名</th>
                        <th>考勤成绩</th>
                        <th>期中成绩</th>
                        <th>期末成绩</th>
                        <th>作业成绩</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(item => {
            html += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.attendance}</td>
                    <td>${item.midterm}</td>
                    <td>${item.final}</td>
                    <td>${item.homework}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            <p style="padding: 1rem; font-size: 0.9rem; color: #666;">
                共 ${data.length} 条记录（预览最多显示5条）
            </p>
        `;
        
        container.innerHTML = html;
    }
    
    // 确认导入
    async function confirmImport() {
        // 这里模拟导入数据（实际项目中应从解析的文件中获取数据）
        const newStudents = [
            {
                id: 'CS20230025',
                name: '新学生一',
                attendance: 90,
                midterm: 80,
                final: 75,
                homework: 85,
                finalGrade: calculateFinalGrade(90, 80, 75, 85),
                gradeLevel: getGradeLevel(calculateFinalGrade(90, 80, 75, 85))
            },
            {
                id: 'CS20230026',
                name: '新学生二',
                attendance: 95,
                midterm: 70,
                final: 85,
                homework: 90,
                finalGrade: calculateFinalGrade(95, 70, 85, 90),
                gradeLevel: getGradeLevel(calculateFinalGrade(95, 70, 85, 90))
            }
        ];
        
        // 检查重复学号
        const duplicateIds = newStudents.filter(newStudent => 
            studentsData.some(existingStudent => existingStudent.id === newStudent.id)
        ).map(s => s.id);
        
        if (duplicateIds.length > 0) {
            if (!confirm(`以下学号已存在: ${duplicateIds.join(', ')}。是否覆盖？`)) {
                return;
            }
            
        // 删除重复的记录
        studentsData = studentsData.filter(student => !duplicateIds.includes(student.id));
    }
    
    // 添加新学生
    studentsData.push(...newStudents);
    
        // 保存数据到IndexedDB
        await window.gradesManager.saveCourseGrades(currentCourse, studentsData);
        
        // 关闭模态框
        closeAllModals();
        
        // 重新渲染表格
        currentPage = 1;
        renderTable();
        updateSummaryStats();
        updateCourseProgress(currentCourse);
        
        showNotification(`成功导入 ${newStudents.length} 条学生记录`, 'success');
    }
    
    // 导出成绩
    function exportGrades() {
        if (studentsData.length === 0) {
            showNotification('没有可导出的数据', 'warning');
            return;
        }
        
        // 创建CSV内容
        let csvContent = "学号,姓名,考勤成绩,期中成绩,期末成绩,作业成绩,总评成绩,等级\n";
        
        studentsData.forEach(student => {
            csvContent += `${student.id},${student.name},${student.attendance},${student.midterm},${student.final},${student.homework},${student.finalGrade},${student.gradeLevel}\n`;
        });
        
        // 创建Blob和下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `成绩_${currentCourse}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('成绩导出成功', 'success');
    }
    
    // 保存所有修改
    function saveAllChanges() {
        // 在实际项目中，这里应该向服务器发送数据
        // 模拟保存过程
        showNotification('正在保存数据...', 'info');
        
        setTimeout(() => {
            showNotification('所有成绩已成功保存到服务器', 'success');
        }, 1500);
    }
    
    // 关闭所有模态框
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    // 显示通知
    function showNotification(message, type) {
        // 创建一个简单的通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 2000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            animation: slideIn 0.3s;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // 自动移除通知
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // 拖放相关函数
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        document.getElementById('drop-area').style.borderColor = '#3498db';
        document.getElementById('drop-area').style.backgroundColor = '#e3f2fd';
    }
    
    function unhighlight() {
        document.getElementById('drop-area').style.borderColor = '#bdc3c7';
        document.getElementById('drop-area').style.backgroundColor = '#f8f9fa';
    }
});