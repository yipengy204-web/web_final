/**
 * 统一数据管理模块 (IndexedDB 版)
 * 整合课程管理、成绩管理等功能，统一管理所有数据
 */

const DB_CONFIG = {
    name: 'CurriculumDesignDB',
    version: 2, // 增加版本号以强制数据库升级
    stores: {
        users: { keyPath: 'id' },
        classes: { keyPath: 'id' },
        courses: { keyPath: 'id' },
        plans: { keyPath: 'id' },
        scores: { keyPath: 'id' },
        grades: { keyPath: 'id' },
        homeworkAssignments: { keyPath: 'id' },
        examAssignments: { keyPath: 'id' },
        submissions: { keyPath: 'id' }
    }
};

const STORAGE_KEYS = {
    USERS: 'users',
    CLASSES: 'classes',
    COURSES: 'courses',
    COURSE_PLANS: 'plans',
    SCORES: 'scores',
    GRADES: 'grades',
    HOMEWORK_ASSIGNMENTS: 'homeworkAssignments',
    EXAM_ASSIGNMENTS: 'examAssignments',
    SUBMISSIONS: 'submissions',
    COURSE_STORAGE: 'teacher_courses',
    DATA_VERSION: 'cms_data_v7_avatar'
};

// 默认头像 (SVG Base64)
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI2NCIgZmlsbD0iI2UzZTNUzIiLz48cGF0aCBkPSJNNjQgMzJhMjQgMjQgMCAxIDAgMCA0OCAyNCAyNCAwIDAgMCAwLTQ4em0tNDAgODBhNDAgNDAgMCAwIDEgODAgMHY4SDI0di04eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==';

class DB {
    constructor() {
        this.db = null;
    }

    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

            request.onerror = (event) => {
                console.error("Database error: " + event.target.errorCode);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建所有需要的对象存储
                for (const [name, config] of Object.entries(DB_CONFIG.stores)) {
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name, config);
                    }
                }
            };
        });
    }

    async getAll(storeName) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readonly");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.getAll();

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async add(storeName, item) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(item);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async put(storeName, item) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.put(item);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async delete(storeName, id) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.delete(id);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    
    async clear(storeName) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.clear();

            request.onsuccess = (event) => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}

// 统一数据管理器类
class DataManager {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        try {
            this.db = new DB();
            await this.db.open();
        } catch (error) {
            console.error('IndexedDB初始化失败:', error);
            throw error;
        }
    }

    // ================ 课程管理方法 ================

    // 获取所有课程数据
    async getCourses() {
        try {
            return await this.db.getAll(STORAGE_KEYS.COURSES);
        } catch (error) {
            console.error('从IndexedDB获取课程数据失败:', error);
            return [];
        }
    }

    // 获取已发布的课程
    async getPublishedCourses() {
        const courses = await this.getCourses();
        return courses.filter(course => course.status === 'published');
    }

    // 获取草稿课程
    async getDraftCourses() {
        const courses = await this.getCourses();
        return courses.filter(course => course.status === 'draft');
    }

    // 获取已归档课程
    async getArchivedCourses() {
        const courses = await this.getCourses();
        return courses.filter(course => course.status === 'archived');
    }

    // 根据ID获取课程
    async getCourseById(id) {
        const courses = await this.getCourses();
        return courses.find(course => course.id === id);
    }

    // 保存课程数据
    async saveCourse(courseData) {
        const courses = await this.getCourses();
        const existingIndex = courses.findIndex(c => c.id === courseData.id);
        
        if (existingIndex >= 0) {
            courses[existingIndex] = { ...courses[existingIndex], ...courseData };
        } else {
            courses.push(courseData);
        }

        await this.saveAllCourses(courses);
        return courseData;
    }

    // 保存所有课程
    async saveAllCourses(courses) {
        try {
            await this.db.open();
            await this.db.clear(STORAGE_KEYS.COURSES);
            const promises = courses.map(course => this.db.put(STORAGE_KEYS.COURSES, course));
            await Promise.all(promises);
            this.triggerCourseDataUpdateEvent();
            return true;
        } catch (error) {
            console.error('保存到IndexedDB失败:', error);
            return false;
        }
    }

    // 删除课程
    async deleteCourse(id) {
        try {
            await this.db.open();
            await this.db.delete(STORAGE_KEYS.COURSES, id);
            const courses = await this.getCourses();
            return courses.filter(course => course.id !== id);
        } catch (error) {
            console.error('从IndexedDB删除课程失败:', error);
            return [];
        }
    }

    // 生成课程ID
    generateCourseId() {
        return 'course_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    // ================ 成绩管理方法 ================

    // 获取课程的学生成绩数据
    async getCourseGrades(courseId) {
        try {
            const allGrades = await this.db.getAll(STORAGE_KEYS.GRADES);
            return allGrades.filter(grade => grade.courseId === courseId);
        } catch (error) {
            console.error('从IndexedDB获取成绩数据失败:', error);
            return [];
        }
    }

    // 保存课程的学生成绩数据
    async saveCourseGrades(courseId, gradesData) {
        try {
            await this.db.open();
            // 删除该课程的旧数据
            const oldGrades = await this.getCourseGrades(courseId);
            for (const grade of oldGrades) {
                await this.db.delete(STORAGE_KEYS.GRADES, grade.id);
            }
            // 添加新数据
            for (const grade of gradesData) {
                const gradeWithId = {
                    ...grade,
                    id: grade.id,  // 直接使用原始学号，不拼接课程ID
                    courseId: courseId
                };
                await this.db.put(STORAGE_KEYS.GRADES, gradeWithId);
            }
            return true;
        } catch (error) {
            console.error('保存到IndexedDB失败:', error);
            return false;
        }
    }

    // 获取作业数据
    async getHomeworkAssignments() {
        try {
            return await this.db.getAll(STORAGE_KEYS.HOMEWORK_ASSIGNMENTS);
        } catch (error) {
            console.error('从IndexedDB获取作业数据失败:', error);
            return [];
        }
    }

    // 获取考试数据
    async getExamAssignments() {
        try {
            return await this.db.getAll(STORAGE_KEYS.EXAM_ASSIGNMENTS);
        } catch (error) {
            console.error('从IndexedDB获取考试数据失败:', error);
            return [];
        }
    }

    // 获取提交数据
    async getSubmissions() {
        try {
            return await this.db.getAll(STORAGE_KEYS.SUBMISSIONS);
        } catch (error) {
            console.error('从IndexedDB获取提交数据失败:', error);
            return [];
        }
    }

    // 保存作业数据
    async saveHomeworkAssignment(homework) {
        try {
            await this.db.open();
            await this.db.put(STORAGE_KEYS.HOMEWORK_ASSIGNMENTS, homework);
            return true;
        } catch (error) {
            console.error('保存作业到IndexedDB失败:', error);
            return false;
        }
    }

    // 保存考试数据
    async saveExamAssignment(exam) {
        try {
            await this.db.open();
            await this.db.put(STORAGE_KEYS.EXAM_ASSIGNMENTS, exam);
            return true;
        } catch (error) {
            console.error('保存考试到IndexedDB失败:', error);
            return false;
        }
    }

    // 保存提交数据
    async saveSubmission(submission) {
        try {
            await this.db.open();
            await this.db.put(STORAGE_KEYS.SUBMISSIONS, submission);
            return true;
        } catch (error) {
            console.error('保存提交到IndexedDB失败:', error);
            return false;
        }
    }

    // ================ 事件管理 ================

    triggerCourseDataUpdateEvent() {
        window.dispatchEvent(new CustomEvent('courseDataUpdated'));
        
        // 如果是iframe，通知父窗口
        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: 'courseDataUpdated'
                }, '*');
            } catch(e) {
                console.log('无法通知父窗口:', e);
            }
        }
    }

    // ================ 工具方法 ================

    generateId(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    // 获取课程统计信息
    async getCourseStats() {
        const courses = await this.getCourses();
        const published = courses.filter(c => c.status === 'published').length;
        const draft = courses.filter(c => c.status === 'draft').length;
        const archived = courses.filter(c => c.status === 'archived').length;
        
        return {
            total: courses.length,
            published,
            draft,
            archived,
            lastUpdated: new Date().toISOString()
        };
    }

    // 课程数据验证
    validateCourseData(courseData) {
        const required = ['name', 'code', 'description'];
        const missing = required.filter(field => !courseData[field]);
        
        if (missing.length > 0) {
            throw new Error(`缺少必填字段: ${missing.join(', ')}`);
        }

        if (courseData.description.length > 500) {
            throw new Error('课程描述不能超过500字');
        }

        return true;
    }
}

const dataManager = new DataManager();

// ================ 初始化模拟数据 ================

async function initData() {
    // 检查是否已经初始化
    if (localStorage.getItem(STORAGE_KEYS.DATA_VERSION) === 'true') {
        return;
    }

    console.log('初始化模拟数据到数据库...');
    
    // 清空现有数据
    if (!dataManager.useLocalStorage) {
        try {
            for (const store of Object.keys(DB_CONFIG.stores)) {
                await dataManager.db.clear(store);
            }
        } catch (error) {
            console.error('清空数据库失败:', error);
        }
    }

    // 1. 班级
    const classes = [
        { id: 'cls_001', name: '计算机2101' },
        { id: 'cls_002', name: '软件2101' },
        { id: 'cls_003', name: '智能2101' }
    ];

    // 2. 用户 (生成30个学生)
    const users = [
        { id: 'admin_001', username: 'admin', name: '管理员', role: 'admin' },
        { id: 'tea_001', username: 't_wang', name: '王灭绝', role: 'teacher' }, // 挂科杀手
        { id: 'tea_002', username: 't_li', name: '李慈悲', role: 'teacher' },   // 给分天使
        { id: 'tea_003', username: 't_zhang', name: '张中庸', role: 'teacher' }, // 正常老师
    ];

    for (let i = 1; i <= 30; i++) {
        let name = `学生${i}`;
        if (i === 1) name = '张三(波动王)';
        if (i === 2) name = '李四(逆袭王)';
        
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        const regions = ['beijing', 'shanghai', 'guangdong', 'zhejiang', 'jiangsu'];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const phone = `138${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}8888`;
        const birthday = `200${Math.floor(Math.random() * 4)}-${Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 28 + 1).toString().padStart(2, '0')}`;

        users.push({
            id: `stu_${i.toString().padStart(3, '0')}`,
            username: `2021${i.toString().padStart(3, '0')}`,
            name: name,
            role: 'student',
            classId: i <= 10 ? 'cls_001' : (i <= 20 ? 'cls_002' : 'cls_003'),
            gender: gender,
            email: `student${i}@example.com`,
            phone: phone,
            birthday: birthday,
            region: region,
            avatar: DEFAULT_AVATAR // 默认头像
        });
    }

    // 3. 课程
    const courses = [
        { 
            id: 'course_cs101', 
            code: 'CS101', 
            name: '数据结构与算法', 
            description: '计算机科学核心课程，学习数据结构和算法设计',
            credit: 3, 
            department: '计算机系',
            status: 'published'
        },
        { 
            id: 'course_ma202', 
            code: 'MA202', 
            name: '高等数学', 
            description: '大学数学基础课程，涵盖微积分和线性代数',
            credit: 4, 
            department: '数学系',
            status: 'published'
        },
        { 
            id: 'course_phy105', 
            code: 'PHY105', 
            name: '大学物理', 
            description: '物理学基础课程，涵盖力学、电磁学等',
            credit: 3, 
            department: '物理系',
            status: 'published'
        },
        { 
            id: 'course_eng201', 
            code: 'ENG201', 
            name: '大学英语', 
            description: '英语语言学习课程，提高听说读写能力',
            credit: 2, 
            department: '外语系',
            status: 'published'
        },
        { 
            id: 'course_se301', 
            code: 'SE301', 
            name: '软件工程', 
            description: '软件开发流程和方法论课程',
            credit: 3, 
            department: '软件工程系',
            status: 'published'
        }
    ];

    // 4. 开课计划
    const coursePlans = [
        { id: 'plan_001', courseId: 'crs_001', teacherId: 'tea_001', semester: '2024-2025-1', classroom: 'A101', timeSlots: '周一 1-2节' },
        { id: 'plan_002', courseId: 'crs_002', teacherId: 'tea_002', semester: '2024-2025-1', classroom: '大礼堂', timeSlots: '周五 7-8节' },
        { id: 'plan_003', courseId: 'crs_003', teacherId: 'tea_003', semester: '2024-2025-1', classroom: '机房C', timeSlots: '周三 3-4节' },
        { id: 'plan_004', courseId: 'crs_004', teacherId: 'tea_003', semester: '2024-2025-1', classroom: 'B202', timeSlots: '周二 5-6节' }
    ];

    // 5. 成绩录入
    const scores = [];

    const addScore = (planId, studentId, final, midterm = null, quiz = null, status = 'unpublished') => {
        const mid = midterm !== null ? midterm : final;
        const qz = quiz !== null ? quiz : final;
        const total = Math.round(qz * 0.2 + mid * 0.3 + final * 0.5);

        scores.push({
            id: dataManager.generateId('score_'),
            coursePlanId: planId,
            studentId: studentId,
            quiz: qz,       // Flattened
            midterm: mid,   // Flattened
            final: final,   // Flattened
            total: total,
            status: status
        });
    };

    // --- 场景1: 《理论力学》 (王灭绝) - 惨绝人寰 ---
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        if (i <= 25) {
            const score = Math.floor(Math.random() * 39) + 20; 
            addScore('plan_001', sid, score, score + 5, score - 5);
        } else {
            const score = Math.floor(Math.random() * 6) + 60;
            addScore('plan_001', sid, score, score, score);
        }
    }

    // --- 场景2: 《影视鉴赏》 (李慈悲) - 全员通过，大量优秀 ---
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        if (i <= 28) {
            const score = Math.floor(Math.random() * 10) + 90;
            addScore('plan_002', sid, score, score - 2, score + 1);
        } else {
            const score = Math.floor(Math.random() * 5) + 85;
            addScore('plan_002', sid, score, score, score);
        }
    }

    // --- 场景3: 《Python编程》 - 正常分布 ---
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        const score = Math.floor(Math.random() * 40) + 55; 
        addScore('plan_003', sid, score, score, score, 'published');
    }

    // --- 场景4: 《学术英语》 - 个人波动测试 ---
    addScore('plan_004', 'stu_001', 40, 95, 90);
    addScore('plan_004', 'stu_002', 85, 30, 40);
    for (let i = 3; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        const score = 75 + Math.floor(Math.random() * 10);
        addScore('plan_004', sid, score, score, score);
    }

    // 批量写入数据
    try {
        // IndexedDB方式
        const promises = [
            ...classes.map(i => dataManager.db.put(STORAGE_KEYS.CLASSES, i)),
            ...users.map(i => dataManager.db.put(STORAGE_KEYS.USERS, i)),
            ...courses.map(i => dataManager.db.put(STORAGE_KEYS.COURSES, i)),
            ...coursePlans.map(i => dataManager.db.put(STORAGE_KEYS.COURSE_PLANS, i)),
            ...scores.map(i => dataManager.db.put(STORAGE_KEYS.SCORES, i))
        ];
        await Promise.all(promises);
        
        console.log('模拟数据初始化完成');
    } catch (error) {
        console.error('数据初始化失败:', error);
    }
}

// 创建全局实例
window.dataManager = dataManager;
window.courseManager = {
    getCourses: () => dataManager.getCourses(),
    getPublishedCourses: () => dataManager.getPublishedCourses(),
    getDraftCourses: () => dataManager.getDraftCourses(),
    getArchivedCourses: () => dataManager.getArchivedCourses(),
    getCourseById: (id) => dataManager.getCourseById(id),
    saveCourse: (courseData) => dataManager.saveCourse(courseData),
    deleteCourse: (id) => dataManager.deleteCourse(id),
    generateCourseId: () => dataManager.generateCourseId(),
    validateCourseData: (courseData) => dataManager.validateCourseData(courseData)
};

window.gradesManager = {
    getCourseGrades: (courseId) => dataManager.getCourseGrades(courseId),
    saveCourseGrades: (courseId, gradesData) => dataManager.saveCourseGrades(courseId, gradesData),
    getHomeworkAssignments: () => dataManager.getHomeworkAssignments(),
    getExamAssignments: () => dataManager.getExamAssignments(),
    getSubmissions: () => dataManager.getSubmissions(),
    saveHomeworkAssignment: (homework) => dataManager.saveHomeworkAssignment(homework),
    saveExamAssignment: (exam) => dataManager.saveExamAssignment(exam),
    saveSubmission: (submission) => dataManager.saveSubmission(submission)
};

// 自动初始化
document.addEventListener('DOMContentLoaded', async () => {
    await initData();
});
