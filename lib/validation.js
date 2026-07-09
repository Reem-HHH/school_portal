const { GRADES, SECTIONS } = require('../db/dummy-data');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

function isValidGrade(grade) {
  return GRADES.includes(grade);
}

function isValidSection(section) {
  return SECTIONS.includes(section);
}

function isValidDay(day) {
  return DAYS.includes(day);
}

module.exports = { GRADES, SECTIONS, DAYS, isValidGrade, isValidSection, isValidDay };
