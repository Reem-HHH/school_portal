async function columnExists(db, usePg, table, column) {
  if (usePg) {
    const row = await db.get(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = ? AND column_name = ?
    `, [table, column]);
    return !!row;
  }
  const cols = await db.all(`PRAGMA table_info(${table})`);
  return cols.some(c => c.name === column);
}

async function migrateAssessments(db, usePg) {
  const hasAssessmentId = await columnExists(db, usePg, 'formative_grades', 'assessment_id');
  if (!hasAssessmentId) {
    await db.run('ALTER TABLE formative_grades ADD COLUMN assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE');
  }

  const unlinked = await db.all(`
    SELECT DISTINCT fg.subject, fg.grade_level, fg.section, fg.assessment_type, fg.assessment_name,
           fg.max_score, fg.teacher_id
    FROM formative_grades fg
    WHERE fg.assessment_id IS NULL
  `);

  for (const row of unlinked) {
    let assessment = await db.get(`
      SELECT id FROM assessments
      WHERE subject = ? AND grade_level = ? AND section = ?
        AND assessment_type = ? AND name = ?
    `, [row.subject, row.grade_level, row.section, row.assessment_type, row.assessment_name]);

    if (!assessment) {
      const result = await db.run(`
        INSERT INTO assessments (teacher_id, subject, grade_level, section, assessment_type, name, max_score, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'closed')
      `, [
        row.teacher_id, row.subject, row.grade_level, row.section,
        row.assessment_type, row.assessment_name, row.max_score
      ]);
      assessment = { id: result.lastInsertRowid };
    }

    await db.run(`
      UPDATE formative_grades
      SET assessment_id = ?
      WHERE assessment_id IS NULL
        AND subject = ? AND grade_level = ? AND section = ?
        AND assessment_type = ? AND assessment_name = ?
    `, [
      assessment.id, row.subject, row.grade_level, row.section,
      row.assessment_type, row.assessment_name
    ]);
  }
}

module.exports = { migrateAssessments };
