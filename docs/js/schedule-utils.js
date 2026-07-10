let scheduleMetaCache = null;

async function loadScheduleMeta() {
  if (scheduleMetaCache) return scheduleMetaCache;
  try {
    scheduleMetaCache = await API.get('/api/schedules/meta');
  } catch (_) {
    scheduleMetaCache = {
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
      lessonSlots: [
        '7:30 - 8:15', '8:15 - 9:00', '9:15 - 10:00', '10:00 - 10:45',
        '10:45 - 11:30', '11:45 - 12:30', '12:30 - 13:15'
      ],
      rows: [
        { type: 'lesson', slot: '7:30 - 8:15' },
        { type: 'lesson', slot: '8:15 - 9:00' },
        { type: 'break', slot: '9:00 - 9:15', label: 'Break' },
        { type: 'lesson', slot: '9:15 - 10:00' },
        { type: 'lesson', slot: '10:00 - 10:45' },
        { type: 'lesson', slot: '10:45 - 11:30' },
        { type: 'break', slot: '11:30 - 11:45', label: 'Break' },
        { type: 'lesson', slot: '11:45 - 12:30' },
        { type: 'lesson', slot: '12:30 - 13:15' }
      ]
    };
  }
  return scheduleMetaCache;
}

function buildScheduleLookup(entries) {
  const lookup = {};
  const entryIds = {};
  entries.forEach(entry => {
    const key = `${entry.time_slot}|${entry.day}`;
    lookup[key] = entry.subject;
    if (entry.id != null) entryIds[key] = entry.id;
  });
  return { lookup, entryIds };
}

function renderTimetableGrid(container, meta, entries, options = {}) {
  const { days, rows } = meta;
  const { lookup, entryIds } = buildScheduleLookup(entries);
  const { editable = false, onDelete } = options;

  const header = `<table class="timetable-grid"><thead><tr>
    <th class="timetable-time-col">${t('time')}</th>
    ${days.map(day => `<th>${tDay(day)}</th>`).join('')}
  </tr></thead><tbody>`;

  const body = rows.map(row => {
    if (row.type === 'break') {
      return `<tr class="timetable-break-row">
        <td class="timetable-time-col">${escapeHtml(row.slot)}</td>
        <td colspan="${days.length}" class="timetable-break-label">${t('breakPeriod')}</td>
      </tr>`;
    }

    const cells = days.map(day => {
      const key = `${row.slot}|${day}`;
      const subject = lookup[key];
      const entryId = entryIds[key];
      if (!subject) return '<td class="timetable-empty">—</td>';

      const deleteBtn = editable && entryId
        ? `<button type="button" class="btn btn-danger btn-inline timetable-del" data-del-schedule="${entryId}" title="${t('delete')}">×</button>`
        : '';

      return `<td class="timetable-cell">
        <span class="timetable-subject">${escapeHtml(subject)}</span>
        ${deleteBtn}
      </td>`;
    }).join('');

    return `<tr>
      <td class="timetable-time-col">${escapeHtml(row.slot)}</td>
      ${cells}
    </tr>`;
  }).join('');

  container.innerHTML = header + body + '</tbody></table>';

  if (editable && onDelete) {
    container.querySelectorAll('[data-del-schedule]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(t('delete') + '?')) return;
        await onDelete(btn.dataset.delSchedule);
      });
    });
  }
}

function populateLessonSlotSelect(selectEl, meta, selected = '') {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">${t('selectTimeSlot')}</option>` +
    meta.lessonSlots.map(slot =>
      `<option value="${escapeHtml(slot)}"${slot === selected ? ' selected' : ''}>${escapeHtml(slot)}</option>`
    ).join('');
}
