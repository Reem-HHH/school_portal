const db = require('../db/index');

async function verifyTeacherClass(teacherId, grade, section, subject) {
  const row = await db.get(
    'SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND grade = ? AND section = ? AND subject = ?',
    [teacherId, grade, section, subject]
  );
  return !!row;
}

async function getTeacherSubjects(teacherId, grade, section) {
  const rows = await db.all(
    'SELECT DISTINCT subject FROM teacher_assignments WHERE teacher_id = ? AND grade = ? AND section = ? ORDER BY subject',
    [teacherId, grade, section]
  );
  return rows.map(r => r.subject);
}

module.exports = { verifyTeacherClass, getTeacherSubjects };
