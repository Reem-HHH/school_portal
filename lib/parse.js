const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const DATA_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

function isImage(mimetype) {
  return IMAGE_TYPES.has(mimetype);
}

function isDataFile(filename, mimetype) {
  const ext = path.extname(filename).toLowerCase();
  if (DATA_EXTENSIONS.has(ext)) return true;
  return mimetype.includes('spreadsheet') || mimetype.includes('csv') || mimetype.includes('excel');
}

function parseSpreadsheet(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) {
    throw new Error('File contains no data rows');
  }

  const headers = Object.keys(rows[0]);
  return { headers, rows };
}

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header.trim()] = (values[i] ?? '').trim();
    });
    return row;
  });

  return { headers, rows };
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((v) => v.replace(/^"|"$/g, '').trim());
}

function parseDataFile(filePath, originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  if (ext === '.csv') {
    return parseCsv(filePath);
  }
  return parseSpreadsheet(filePath);
}

module.exports = { isImage, isDataFile, parseDataFile };
