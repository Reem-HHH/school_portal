const ExcelJS = require('exceljs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../docs/images/moe-logo.png');

const BRAND = {
  gold: 'FFB68A35',
  goldDark: 'FF92722A',
  goldLight: 'FFF9F7ED',
  iron: 'FF404042',
  silver: 'FFC6C6C6',
  white: 'FFFFFFFF'
};

const SCHOOL_NAME = 'Al Kharran Primary School';
const SCHOOL_SUBTITLE = 'Al Kharran · Grades 1–4';
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
const DAY_LABELS = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday'
};

function safeSheetName(name) {
  return String(name).replace(/[\\/*?:\[\]]/g, ' ').trim().slice(0, 31) || 'Schedule';
}

function parseTimeSlot(slot) {
  const text = String(slot || '').trim();
  const parts = text.split('-').map(part => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { start: parts[0], end: parts[1], label: `${parts[0]} – ${parts[1]}` };
  }
  return { start: text, end: '', label: text };
}

function timeSlotSortValue(slot) {
  const { start } = parseTimeSlot(slot);
  const match = start.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function sortTimeSlots(slots) {
  return [...new Set(slots.filter(Boolean))].sort((a, b) => timeSlotSortValue(a) - timeSlotSortValue(b));
}

function entriesToTimetableRows(entries) {
  const timeSlots = sortTimeSlots(entries.map(entry => entry.time_slot));
  const lookup = {};
  entries.forEach(entry => {
    lookup[`${entry.time_slot}|${entry.day}`] = entry.subject || '';
  });

  return timeSlots.map(slot => {
    const { start, end, label } = parseTimeSlot(slot);
    const row = { start, end, time: label };
    WEEK_DAYS.forEach(day => {
      row[day] = lookup[`${slot}|${day}`] || '';
    });
    return row;
  });
}

function addBrandedHeader(sheet, { title, totalColumns, extraLine = '' }) {
  sheet.mergeCells(1, 2, 1, totalColumns);
  sheet.mergeCells(2, 2, 2, totalColumns);
  sheet.mergeCells(3, 2, 3, totalColumns);

  const schoolCell = sheet.getCell(1, 2);
  schoolCell.value = SCHOOL_NAME;
  schoolCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: BRAND.goldDark } };
  schoolCell.alignment = { vertical: 'middle', horizontal: 'left' };

  const subtitleCell = sheet.getCell(2, 2);
  subtitleCell.value = extraLine || SCHOOL_SUBTITLE;
  subtitleCell.font = { name: 'Arial', size: 10, color: { argb: BRAND.iron } };

  const titleCell = sheet.getCell(3, 2);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: BRAND.iron } };

  const dateCell = sheet.getCell(4, 2);
  dateCell.value = `Generated ${formatExportDate()}`;
  dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B6B6D' } };
  sheet.mergeCells(4, 2, 4, totalColumns);

  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 18;
  sheet.getRow(3).height = 22;
  sheet.getRow(4).height = 18;
}

function addLogo(sheet, workbook) {
  try {
    const imageId = workbook.addImage({
      filename: LOGO_PATH,
      extension: 'png'
    });
    sheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 72, height: 56 }
    });
  } catch {
    // Logo is optional if file is missing in deployment
  }
}

function styleHeaderCell(cell, { align = 'left' } = {}) {
  cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: BRAND.goldDark } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.goldLight } };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
  cell.border = thinBorder;
}

function styleBodyCell(cell, { align = 'left', shaded = false, emphasis = false } = {}) {
  cell.font = {
    name: 'Arial',
    size: 10,
    bold: emphasis,
    color: { argb: BRAND.iron }
  };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
  cell.border = thinBorder;
  if (emphasis) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.goldLight } };
  } else if (shaded) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
  }
}

function addTimetableSheet(workbook, { sheetName, title, subtitle, entries }) {
  const gridRows = entriesToTimetableRows(entries);
  const totalColumns = 2 + WEEK_DAYS.length;
  const sheet = workbook.addWorksheet(safeSheetName(sheetName), {
    views: [{ showGridLines: false }]
  });

  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 12;
  WEEK_DAYS.forEach((_, index) => {
    sheet.getColumn(index + 3).width = 18;
  });

  addBrandedHeader(sheet, { title, totalColumns, extraLine: subtitle || SCHOOL_SUBTITLE });
  addLogo(sheet, workbook);

  const headerRowIndex = 6;
  const headerRow = sheet.getRow(headerRowIndex);
  ['Start', 'End', ...WEEK_DAYS.map(day => DAY_LABELS[day])].forEach((label, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = label;
    styleHeaderCell(cell, { align: index < 2 ? 'center' : 'center' });
  });
  headerRow.height = 26;

  gridRows.forEach((row, rowOffset) => {
    const excelRow = sheet.getRow(headerRowIndex + 1 + rowOffset);
    const startCell = excelRow.getCell(1);
    startCell.value = row.start;
    styleBodyCell(startCell, { align: 'center', emphasis: true });

    const endCell = excelRow.getCell(2);
    endCell.value = row.end;
    styleBodyCell(endCell, { align: 'center', emphasis: true });

    WEEK_DAYS.forEach((day, dayIndex) => {
      const cell = excelRow.getCell(dayIndex + 3);
      cell.value = row[day] || '—';
      styleBodyCell(cell, {
        align: 'center',
        shaded: rowOffset % 2 === 1
      });
    });
    excelRow.height = 24;
  });

  sheet.views = [{ state: 'frozen', ySplit: headerRowIndex, xSplit: 2, showGridLines: false }];
  return sheet;
}

async function buildScheduleTimetableWorkbook({ sheets }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  sheets.forEach(({ sheetName, title, subtitle, entries }) => {
    addTimetableSheet(workbook, { sheetName, title, subtitle, entries });
  });

  return workbook;
}

async function buildScheduleTimetableBuffer(options) {
  const workbook = await buildScheduleTimetableWorkbook(options);
  return workbook.xlsx.writeBuffer();
}

function groupScheduleEntries(rows, { teacherName = '' } = {}) {
  const groups = new Map();

  rows.forEach(row => {
    let key;
    let sheetName;
    let title;
    let subtitle = SCHOOL_SUBTITLE;

    if (row.grade && row.section) {
      key = `${row.grade}|${row.section}`;
      sheetName = `${row.grade} ${row.section}`;
      title = `${row.grade} ${row.section} — Timetable`;
    } else {
      key = teacherName || row.teacher_name || 'teacher-schedule';
      sheetName = teacherName || row.teacher_name || 'My Schedule';
      title = `${sheetName} — Timetable`;
      subtitle = 'Weekly teaching schedule';
    }

    if (!groups.has(key)) {
      groups.set(key, { sheetName, title, subtitle, entries: [] });
    }
    groups.get(key).entries.push(row);
  });

  return [...groups.values()];
}

const thinBorder = {
  top: { style: 'thin', color: { argb: BRAND.silver } },
  left: { style: 'thin', color: { argb: BRAND.silver } },
  bottom: { style: 'thin', color: { argb: BRAND.silver } },
  right: { style: 'thin', color: { argb: BRAND.silver } }
};

function formatExportDate(date = new Date()) {
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function buildBrandedWorkbook({ title, sheetName, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = SCHOOL_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName || 'Export', {
    views: [{ showGridLines: false }]
  });

  columns.forEach((col, index) => {
    sheet.getColumn(index + 1).width = col.width || Math.max(String(col.header).length + 4, 14);
  });

  sheet.mergeCells(1, 2, 1, columns.length);
  sheet.mergeCells(2, 2, 2, columns.length);
  sheet.mergeCells(3, 2, 3, columns.length);

  const schoolCell = sheet.getCell(1, 2);
  schoolCell.value = SCHOOL_NAME;
  schoolCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: BRAND.goldDark } };
  schoolCell.alignment = { vertical: 'middle', horizontal: 'left' };

  const subtitleCell = sheet.getCell(2, 2);
  subtitleCell.value = SCHOOL_SUBTITLE;
  subtitleCell.font = { name: 'Arial', size: 10, color: { argb: BRAND.iron } };

  const titleCell = sheet.getCell(3, 2);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: BRAND.iron } };

  const dateCell = sheet.getCell(4, 2);
  dateCell.value = `Generated ${formatExportDate()}`;
  dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B6B6D' } };
  sheet.mergeCells(4, 2, 4, columns.length);

  try {
    const imageId = workbook.addImage({
      filename: LOGO_PATH,
      extension: 'png'
    });
    sheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 72, height: 56 }
    });
  } catch {
    // Logo is optional if file is missing in deployment
  }

  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 18;
  sheet.getRow(3).height = 22;
  sheet.getRow(4).height = 18;

  const headerRowIndex = 6;
  const headerRow = sheet.getRow(headerRowIndex);
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: BRAND.goldDark } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.goldLight } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 24;

  rows.forEach((row, rowOffset) => {
    const excelRow = sheet.getRow(headerRowIndex + 1 + rowOffset);
    columns.forEach((col, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      const value = row[col.key];
      cell.value = value == null ? '' : value;
      cell.font = { name: 'Arial', size: 10, color: { argb: BRAND.iron } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = thinBorder;
      if (rowOffset % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
      }
    });
    excelRow.height = 20;
  });

  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: columns.length }
  };

  if (rows.length) {
    sheet.views = [{ state: 'frozen', ySplit: headerRowIndex, showGridLines: false }];
  }

  return workbook;
}

async function buildBrandedBuffer(options) {
  const workbook = await buildBrandedWorkbook(options);
  return workbook.xlsx.writeBuffer();
}

module.exports = {
  buildBrandedWorkbook,
  buildBrandedBuffer,
  buildScheduleTimetableWorkbook,
  buildScheduleTimetableBuffer,
  groupScheduleEntries,
  SCHOOL_NAME
};
