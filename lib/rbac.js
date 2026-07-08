const db = require('../db/index');
const activeClause = db.usePg ? 'is_active = true' : 'is_active = 1';

async function getStudentForUser(userId) {
  return db.get(`SELECT * FROM students WHERE user_id = ? AND ${activeClause}`, [userId]);
}

async function getStudentsForParent(parentUserId) {
  return db.all(
    `SELECT * FROM students WHERE parent_user_id = ? AND ${activeClause} ORDER BY name`,
    [parentUserId]
  );
}

async function canAccessStudent(user, studentId) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const student = await db.get('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!student) return false;

  if (user.role === 'student' && student.user_id === user.id) return true;
  if (user.role === 'parent' && student.parent_user_id === user.id) return true;

  if (user.role === 'teacher') {
    const assignment = await db.get(
      `SELECT 1 FROM teacher_assignments
       WHERE teacher_id = ? AND grade = ? AND section = ? LIMIT 1`,
      [user.id, student.grade, student.section]
    );
    return !!assignment;
  }

  return false;
}

async function getTeacherAssignments(teacherId) {
  return db.all(
    'SELECT * FROM teacher_assignments WHERE teacher_id = ? ORDER BY grade, section, subject',
    [teacherId]
  );
}

function dashboardPath(role) {
  const map = {
    admin: 'dashboard-admin.html',
    teacher: 'dashboard-teacher.html',
    student: 'dashboard-student.html',
    parent: 'dashboard-student.html'
  };
  return map[role] || 'index.html';
}

module.exports = {
  getStudentForUser,
  getStudentsForParent,
  canAccessStudent,
  getTeacherAssignments,
  dashboardPath
};
