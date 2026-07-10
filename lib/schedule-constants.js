const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

const LESSON_SLOTS = [
  '7:30 - 8:15',
  '8:15 - 9:00',
  '9:15 - 10:00',
  '10:00 - 10:45',
  '10:45 - 11:30',
  '11:45 - 12:30',
  '12:30 - 13:15'
];

const BREAK_SLOTS = [
  { slot: '9:00 - 9:15', afterLesson: 2 },
  { slot: '11:30 - 11:45', afterLesson: 5 }
];

const LEGACY_SLOT_MAP = {
  '8:00 - 8:45': '7:30 - 8:15',
  '8:00 – 8:45': '7:30 - 8:15',
  '9:00 - 9:45': '9:15 - 10:00',
  '9:00 – 9:45': '9:15 - 10:00',
  '10:00 - 10:45': '10:00 - 10:45',
  '10:45 - 11:30': '10:45 - 11:30',
  '11:00 - 11:45': '11:45 - 12:30',
  '12:00 - 12:45': '12:30 - 13:15'
};

function canonicalizeSlotText(slot) {
  return String(slot || '')
    .trim()
    .replace(/\s*–\s*/g, ' - ')
    .replace(/\s+/g, ' ');
}

function normalizeTimeSlot(slot) {
  const text = canonicalizeSlotText(slot);
  if (!text) return text;
  if (LESSON_SLOTS.includes(text)) return text;
  if (LEGACY_SLOT_MAP[text]) return LEGACY_SLOT_MAP[text];
  return text;
}

function isValidLessonSlot(slot) {
  return LESSON_SLOTS.includes(normalizeTimeSlot(slot));
}

function timeSlotSortValue(slot) {
  const text = normalizeTimeSlot(slot);
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function sortLessonSlots(slots) {
  return [...new Set(slots.map(normalizeTimeSlot).filter(Boolean))]
    .sort((a, b) => timeSlotSortValue(a) - timeSlotSortValue(b));
}

function getTimetableRows() {
  const rows = [];
  LESSON_SLOTS.forEach((slot, index) => {
    rows.push({ type: 'lesson', slot });
    const breakAfter = BREAK_SLOTS.find(b => b.afterLesson === index + 1);
    if (breakAfter) {
      rows.push({ type: 'break', slot: breakAfter.slot, label: 'Break' });
    }
  });
  return rows;
}

function normalizeScheduleEntries(entries) {
  return entries.map(entry => ({
    ...entry,
    time_slot: normalizeTimeSlot(entry.time_slot)
  }));
}

module.exports = {
  DAYS,
  LESSON_SLOTS,
  BREAK_SLOTS,
  normalizeTimeSlot,
  isValidLessonSlot,
  timeSlotSortValue,
  sortLessonSlots,
  getTimetableRows,
  normalizeScheduleEntries
};
