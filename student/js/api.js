/**
 * API 接口模块
 * 提供给教师端或其他模块调用的接口函数
 */

/**
 * 获取指定开课计划的所有学生
 * @param {string} planId - 开课计划ID
 * @returns {Promise<Array>} 学生列表
 */
async function getStudentsByPlan(planId) {
    try {
        // 获取该开课计划的所有选课记录
        const enrollments = await getDataByIndex('student_courses', 'planId', planId);
        
        // 获取学生详细信息
        const students = [];
        for (const enrollment of enrollments) {
            const student = await getDataById('users', enrollment.studentId);
            if (student && student.role === 'student') {
                students.push({
                    id: student.id,
                    studentId: student.studentId,
                    name: student.name,
                    enrollDate: enrollment.enrollDate,
                    status: enrollment.status || 'active'
                });
            }
        }

        return students;
    } catch (error) {
        console.error('获取课程学生列表失败:', error);
        throw error;
    }
}

/**
 * 获取指定开课计划的作业完成情况
 * @param {string} planId - 开课计划ID
 * @returns {Promise<Array>} 作业完成情况统计
 */
async function getAssignmentStatus(planId) {
    try {
        // 获取该开课计划的所有作业
        const assignments = await getDataByIndex('assignments', 'planId', planId);
        
        // 获取该开课计划的所有学生
        const students = await getStudentsByPlan(planId);
        
        // 统计每个作业的完成情况
        const statusList = [];
        for (const assignment of assignments) {
            const submissions = await getDataByIndex('assignment_submissions', 'assignmentId', assignment.id);
            
            statusList.push({
                assignmentId: assignment.id,
                assignmentName: assignment.name,
                totalStudents: students.length,
                submittedCount: submissions.length,
                pendingCount: students.length - submissions.length,
                completionRate: students.length > 0 ? ((submissions.length / students.length) * 100).toFixed(2) + '%' : '0%',
                submissions: submissions.map(s => ({
                    studentId: s.studentId,
                    submitTime: s.submitTime,
                    score: s.score || null,
                    status: s.status
                }))
            });
        }

        return statusList;
    } catch (error) {
        console.error('获取作业完成情况失败:', error);
        throw error;
    }
}

/**
 * 获取指定开课计划的考试完成情况
 * @param {string} planId - 开课计划ID
 * @returns {Promise<Object>} 考试完成情况统计
 */
async function getExamStatus(planId) {
    try {
        // 获取该开课计划的成绩记录
        const scores = await getDataByIndex('scores', 'planId', planId);
        
        // 获取该开课计划的所有学生
        const students = await getStudentsByPlan(planId);
        
        // 统计考试完成情况
        const examScores = scores.filter(s => s.final !== null && s.final !== undefined);
        
        return {
            totalStudents: students.length,
            examTaken: examScores.length,
            examPending: students.length - examScores.length,
            averageScore: examScores.length > 0 
                ? (examScores.reduce((sum, s) => sum + s.final, 0) / examScores.length).toFixed(2)
                : 0,
            scores: examScores.map(s => ({
                studentId: s.studentId,
                final: s.final,
                updatedAt: s.updatedAt || null
            }))
        };
    } catch (error) {
        console.error('获取考试完成情况失败:', error);
        throw error;
    }
}

/**
 * 导出课程成绩为 CSV 格式
 * @param {string} planId - 开课计划ID
 * @returns {Promise<void>} 下载成绩文件
 */
async function exportScoresToXLS(planId) {
    try {
        // 获取开课计划信息
        const plan = await getDataById('plans', planId);
        if (!plan) {
            throw new Error('开课计划不存在');
        }
        
        const course = await getDataById('courses', plan.courseId);
        if (!course) {
            throw new Error('课程不存在');
        }

        // 获取该开课计划的所有成绩
        const scores = await getDataByIndex('scores', 'planId', planId);
        
        // 构建表格数据
        const headers = ['学号', '姓名', '平时成绩', '期中成绩', '期末成绩', '总评成绩', '绩点'];
        const rows = [];

        for (const score of scores) {
            const student = await getDataById('users', score.studentId);
            if (student) {
                rows.push([
                    student.studentId,
                    student.name,
                    score.quiz || '-',
                    score.midterm || '-',
                    score.final || '-',
                    score.total || '-',
                    score.gpa || '-'
                ]);
            }
        }

        // 生成 CSV 内容
        let csvContent = '\uFEFF'; // UTF-8 BOM
        csvContent += headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.join(',') + '\n';
        });

        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${course.code}_${course.name}_成绩表_${plan.semester}.csv`;
        link.click();

        console.log('成绩导出成功');
    } catch (error) {
        console.error('导出成绩失败:', error);
        throw error;
    }
}

/**
 * 获取学生的课程统计信息
 * @param {string} studentId - 学生ID
 * @returns {Promise<Object>} 统计信息
 */
async function getStudentCourseStats(studentId) {
    try {
        const enrollments = await getDataByIndex('student_courses', 'studentId', studentId);
        
        // 简化统计（实际应该从作业提交等数据统计）
        const assignments = await getAllData('assignments');
        const submissions = await getDataByIndex('assignment_submissions', 'studentId', studentId);
        
        // 获取学生选修的所有开课计划的作业
        const myPlanIds = enrollments.map(e => e.planId);
        const myAssignments = assignments.filter(a => myPlanIds.includes(a.planId));
        
        const pendingTasks = myAssignments.length - submissions.length;
        const completedTasks = submissions.length;

        return {
            totalCourses: enrollments.length,
            pendingTasks: pendingTasks > 0 ? pendingTasks : 0,
            completedTasks
        };
    } catch (error) {
        console.error('获取学生课程统计失败:', error);
        throw error;
    }
}

// 将接口函数暴露到全局作用域，供其他模块调用
window.TeachingAPI = {
    getStudentsByPlan,  // 改名
    getAssignmentStatus,
    getExamStatus,
    exportScoresToXLS,
    getStudentCourseStats
};
