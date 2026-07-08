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
  SCHOOL_NAME
};
