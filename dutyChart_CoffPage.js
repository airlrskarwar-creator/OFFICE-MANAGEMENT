//=====================================================================================================
//                                  Duty Chart Log
//====================================================================================================
const DUTY_OPTIONS = ['', 'MOR', 'GEN', 'EVE', 'MOR,GEN', 'MOR,EVE', 'GEN,EVE', 'W/O', 'C/O', 'EL', 'CL', 'RH', 'ML', 'H/D', 'SCL'];

// =========================
// 🔥 GET CURRENT WEEK END (SATURDAY)
// =========================
function getCurrentWeekEnd() {
  const today = new Date();

  const day = today.getDay(); // 0=Sun ... 6=Sat

  const diff = 6 - day; // days to Saturday

  const saturday = new Date(today);
  saturday.setDate(today.getDate() + diff);

  return saturday;
}

// =========================
// 🔥 GET YEARS FROM DATA
// =========================
function getYearsFromDutyData(dutyData) {
  const rows = normalizeDutyData(dutyData);

  const years = new Set();

  rows.forEach((r) => {
    const d = parseDDMMYYYY(r.Date);
    if (d) years.add(d.getFullYear());
  });

  return Array.from(years).sort((a, b) => a - b);
}

// =========================
// 🔥 YEAR DROPDOWN (CURRENT YEAR)
// =========================
function populateYearDropdown() {
  const yearSelect = id('DutyChartFYSelect');

  yearSelect.innerHTML = '';

  const currentWeekEnd = getCurrentWeekEnd();

  const currentFY = currentWeekEnd.getMonth() >= 3 ? `${currentWeekEnd.getFullYear()}-${String(currentWeekEnd.getFullYear() + 1).slice(2)}` : `${currentWeekEnd.getFullYear() - 1}-${String(currentWeekEnd.getFullYear()).slice(2)}`;

  const nextWeekEnd = new Date(currentWeekEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const nextFY = nextWeekEnd.getMonth() >= 3 ? `${nextWeekEnd.getFullYear()}-${String(nextWeekEnd.getFullYear() + 1).slice(2)}` : `${nextWeekEnd.getFullYear() - 1}-${String(nextWeekEnd.getFullYear()).slice(2)}`;

  const fyList = [currentFY];

  if (nextFY !== currentFY) {
    fyList.push(nextFY);
  }

  fyList.forEach((fy) => {
    const opt = document.createElement('option');
    opt.value = fy;
    opt.textContent = fy;
    yearSelect.appendChild(opt);
  });

  yearSelect.value = currentFY;

  populateMonthDropdown(currentFY);
}

// =========================
// 🔥 MONTH DROPDOWN (CURRENT MONTH)
// =========================
function populateMonthDropdown(fy) {
  const monthSelect = id('DutyChartMonthSelect');

  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  monthSelect.innerHTML = '';

  months.forEach((m, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = m;
    monthSelect.appendChild(opt);
  });

  const nextWeekEnd = new Date(getCurrentWeekEnd());
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const actualMonth = nextWeekEnd.getMonth();

  const fyMonth = actualMonth >= 3 ? actualMonth - 3 : actualMonth + 9;

  monthSelect.value = fyMonth;

  populateWeekDropdown(fy, fyMonth);
}

// =========================
// 🔥 WEEK DROPDOWN (CURRENT WEEK)
// =========================
function populateWeekDropdown(year, month) {
  month = Number(month);

  const [fyStart] = String(year).split('-').map(Number);

  const actualYear = month <= 8 ? fyStart : fyStart + 1;

  const actualMonth = month <= 8 ? month + 3 : month - 9;

  year = actualYear;
  month = actualMonth;

  const weekSelect = id('DutyChartWeekSelect');

  year = Number(year);
  month = Number(month);

  weekSelect.innerHTML = '';

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  let current = new Date(startDate);

  // ==========================================
  // FIRST SATURDAY
  // ==========================================
  const dayDiff = (6 - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + dayDiff);

  while (current <= endDate) {
    if (current.getMonth() === month && current.getFullYear() === year) {
      const val = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

      const opt = document.createElement('option');

      opt.value = val;
      opt.textContent = `Week Ending ${formatDutyChartDate(current)}`;

      weekSelect.appendChild(opt);
    }

    current.setDate(current.getDate() + 7);
  }

  // ==========================================
  // DEFAULT SELECTION
  // ==========================================
  const currentWeekEnd = getCurrentWeekEnd();

  const nextWeekEnd = new Date(currentWeekEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  let found = false;

  // Prefer next week
  const nextWeekValue = `${nextWeekEnd.getFullYear()}-${String(nextWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(nextWeekEnd.getDate()).padStart(2, '0')}`;

  for (const opt of weekSelect.options) {
    if (opt.value === nextWeekValue) {
      opt.selected = true;
      found = true;
      break;
    }
  }

  // Fallback → current week
  if (!found) {
    const currentWeekValue = `${currentWeekEnd.getFullYear()}-${String(currentWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(currentWeekEnd.getDate()).padStart(2, '0')}`;

    for (const opt of weekSelect.options) {
      if (opt.value === currentWeekValue) {
        opt.selected = true;
        found = true;
        break;
      }
    }
  }

  // Final fallback → first week of selected month
  if (!found && weekSelect.options.length > 0) {
    weekSelect.selectedIndex = 0;
  }
}

// =========================
// 🔥 EVENT BINDING
// =========================
function initDropdowns(dutyData) {
  const yearSelect = id('DutyChartFYSelect');
  const monthSelect = id('DutyChartMonthSelect');

  populateYearDropdown(dutyData);

  yearSelect.addEventListener('change', () => {
    populateMonthDropdown(yearSelect.value);
  });

  monthSelect.addEventListener('change', () => {
    populateWeekDropdown(yearSelect.value, monthSelect.value);
  });
}

// ✅ DD-MM-YYYY → Date (LOCAL SAFE)
function parseDDMMYYYY(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const [dd, mm, yyyy] = dateStr.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd);

  return isNaN(d.getTime()) ? null : d;
}

// ✅ YYYY-MM-DD → LOCAL DATE (NO UTC)
function parseYMD(dateStr) {
  if (!dateStr) return null;

  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ✅ LOCAL KEY (NO TIMEZONE BUG EVER)
function getDateKey(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// ✅ FORMAT DISPLAY
function formatDutyChartDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

// =========================
// 🔥 NORMALIZE DATA
// =========================
function normalizeDutyData(dutyData) {
  if (!dutyData) return [];

  if (Array.isArray(dutyData)) return dutyData;

  if (dutyData.headers && dutyData.rows) {
    return dutyData.rows.map((r) => {
      const obj = {};
      dutyData.headers.forEach((h, i) => (obj[h] = r[i]));
      return obj;
    });
  }

  return [];
}

/* =========================================================
        DUTY MODE TOGGLE
        ========================================================= */

function initDutyModeToggle() {
  const toggle = id('dutyModeSwitch');

  if (!toggle) return;

  const reqTable = id('dutyRequirementTable');

  const editTable = id('editableRequirementContainer');

  const dutyChart = id('dutyChartTable');

  const labels = qsa('.modeLabel');

  // 🔥 CURRENT ROLE
  const role = (window.currentUser || '').trim().toUpperCase();

  const isMaster = role === 'MASTER';

  const isEngg = role === 'ENGG';

  /* =====================================================
          SET MODE
          ===================================================== */

  function setMode() {
    const isDutyMode = toggle.checked;

    // 🔥 LABEL ACTIVE
    labels.forEach((l) => {
      removeClass(l, 'active');
    });

    addClass(labels[isDutyMode ? 1 : 0], 'active');

    /* =====================================================
            DUTY CHART MODE
            ===================================================== */

    if (isDutyMode) {
      // 🔥 HIDE REQUIREMENT TABLE
      if (reqTable) {
        reqTable.style.display = 'none';
      }

      // 🔥 SHOW EDIT TABLE
      if (editTable) {
        editTable.style.display = 'block';
        editTable.style.width = '50%';
      }

      // 🔥 SHOW DUTY CHART
      if (dutyChart) {
        dutyChart.style.display = 'block';
        dutyChart.style.width = '50%';
      }
    } else {
      /* =====================================================
              REQUIREMENT MODE
              ===================================================== */
      // 🔥 SHOW REQUIREMENT TABLE
      if (reqTable) {
        reqTable.style.display = 'block';

        reqTable.style.width = '100%';

        const selects = reqTable.querySelectorAll('.req-select');

        const lieuInputs = reqTable.querySelectorAll('.lieu-input');

        // =====================================================
        // 🔥 ENABLE SELECTS
        // =====================================================

        selects.forEach((sel) => {
          // 🔥 MASTER
          if (role === 'MASTER') {
            sel.disabled = false;
          }

          // 🔥 USERS / ADMIN
          else {
            sel.disabled = false;
          }
        });

        // =====================================================
        // 🔥 LIEU INPUTS
        // =====================================================

        lieuInputs.forEach((lieu) => {
          const td = lieu.closest('td');

          const select = td?.querySelector('.req-select');

          // 🔥 ENABLE ONLY FOR C/O
          lieu.disabled = select?.value !== 'C/O';
        });
      }

      // 🔥 HIDE EDIT TABLE
      if (editTable) {
        editTable.style.display = 'none';
      }

      // 🔥 HIDE DUTY CHART
      if (dutyChart) {
        dutyChart.style.display = 'none';
      }
    }
  }

  /* =====================================================
          ROLE DEFAULT MODES
          ===================================================== */

  // 🔥 MASTER → CAN TOGGLE
  if (isMaster) {
    toggle.disabled = false;
    // default = duty mode
    toggle.checked = true;
    on(toggle, 'change', setMode);
  }

  // 🔥 ENGG → DUTY MODE ONLY
  else if (isEngg) {
    toggle.checked = true;
    toggle.disabled = true;
  }

  // 🔥 USERS / ADMIN → REQUIREMENT MODE ONLY
  else {
    toggle.checked = false;
    toggle.disabled = true;
  }

  // 🔥 INITIAL LOAD
  setMode();
}

// =========================
// 🔥 MAIN RENDER
// =========================
function renderDutyTables(dutyData, weekEndingDate) {
  const rows = normalizeDutyData(dutyData);

  // 🔥 STATUS ROW
  const statusRow = rows.find((r) => String(r.Date).toUpperCase() === 'STATUS');

  const actualData = rows.filter((r) => String(r.Date).toUpperCase() !== 'STATUS');

  const weekEnd = parseYMD(weekEndingDate);

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);

  const weekData = actualData.filter((row) => {
    const d = parseDDMMYYYY(row.Date);
    if (!d) return false;

    return d >= weekStart && d <= weekEnd;
  });

  renderDutyChartTable(weekData, weekStart);
  renderRequirementTableSeparate(weekData, weekStart, statusRow);
  renderEditableRequirementTable(weekData, weekStart, statusRow);
}

// =========================
// 🔥 DUTY TABLE
// =========================

//for Comparision of Duty Alloted & requirements by employee
function buildRequirementLookup(data) {
  const lookup = {};

  data.forEach((row) => {
    const dObj = parseDDMMYYYY(row.Date);
    if (!dObj) return;

    const key = getDateKey(dObj);
    lookup[key] = {};

    Object.keys(row).forEach((col) => {
      if (col.includes('Requirement')) {
        const emp = col.replace(' Requirement', '').trim();

        let val = row[col] || '';

        val = val
          .replace(/\(.*?\)/g, '') // remove date
          .split(',')
          .map((v) => v.trim())
          .sort()
          .join(',');

        lookup[key][emp] = val;
      }
    });
  });

  return lookup;
}

function renderDutyChartTable(data, weekStart) {
  const container = id('dutyChartTable');

  const days = ['रवि SUN', 'सोम MON', 'मंगल TUE', 'बुध WED', 'गुरु THU', 'शुक्र FRI', 'शनि SAT'];

  const headers = data.length ? Object.keys(data[0]) : [];

  const dutyCols = headers
    .filter((h) => h.includes('Duty'))
    .map((h) => ({
      key: h,
      name: h.replace(' Duty', '').trim()
    }));

  // 🔥 requirement lookup
  const reqLookup = buildRequirementLookup(data);

  // 🔥 employee order
  const orderMap = getEmployeeOrderMap();

  const clean = (x) => x.replace(/<[^>]+>/g, '');

  const sortList = (list) => {
    return list.sort((a, b) => {
      const nameA = clean(a).split('(')[0];
      const nameB = clean(b).split('(')[0];
      return (orderMap[nameA] ?? 999) - (orderMap[nameB] ?? 999);
    });
  };

  const weekMap = {};

  // =========================
  // 🔥 INIT WEEK
  // =========================
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);

    const key = getDateKey(d);

    weekMap[key] = {
      date: d,
      MOR: [],
      GEN: [],
      EVE: [],
      WO: [],
      CO: [],
      LV: []
    };
  }

  // =========================
  // 🔥 FILL DATA
  // =========================
  data.forEach((row) => {
    const dObj = parseDDMMYYYY(row.Date);
    if (!dObj) return;

    const key = getDateKey(dObj);
    if (!weekMap[key]) return;

    dutyCols.forEach((col) => {
      const emp = col.name;

      // =====================================================
      // 🔥 DUTY VALUE
      // =====================================================

      const dutyVal = String(row[col.key] || '').trim();

      // 🔥 REQUIREMENT
      const reqVal = String(reqLookup[key]?.[emp] || '').trim();

      // 🔥 LIEU
      const reqLieu = String(row[`${emp} in lieu of`] || '').trim();

      // =====================================================
      // 🔥 FINAL VALUE
      // 🔥 DUTY HAS PRIORITY
      // =====================================================

      let val = dutyVal;

      // 🔥 NO DUTY → COPY REQUIREMENT
      if (!val && reqVal) {
        // 🔥 C/O WITH DATE
        if (reqVal === 'C/O' && reqLieu) {
          val = `C/O(${reqLieu})`;
        }

        // 🔥 NORMAL
        else {
          val = reqVal;
        }
      }

      // 🔥 STILL EMPTY
      if (!val) return;

      String(val)
        .split(',')
        .forEach((v) => {
          v = v.trim();

          const isMatch = reqVal.includes(v);

          const bold = (text) => (isMatch ? `<b><u>${text}</u></b>` : text);

          // 🔹 MOR
          if (v === 'MOR') {
            weekMap[key].MOR.push(bold(emp));
          }

          // 🔹 GEN
          else if (v === 'GEN') {
            weekMap[key].GEN.push(bold(emp));
          }

          // 🔹 EVE
          else if (v === 'EVE') {
            weekMap[key].EVE.push(bold(emp));
          }

          // 🔹 W/O
          else if (v === 'W/O') {
            weekMap[key].WO.push(bold(emp));
          }

          // 🔹 C/O
          else if (v.startsWith('C/O')) {
            let text = emp;

            // 🔥 EXTRACT DATE FROM DUTY VALUE
            const match = String(v).match(/\((.*?)\)/);

            if (match && match[1]) {
              text = `${emp}(${match[1]})`;
            }

            // 🔥 normalize comparison
            const normalize = (val) =>
              val
                .replace(/\(.*?\)/g, '')
                .split(',')
                .map((x) => x.trim())
                .sort()
                .join(',');

            const normalizedReq = normalize(reqVal);
            const isMatch = normalizedReq.includes('C/O');

            weekMap[key].CO.push(text);
          }

          // 🔹 LEAVES
          else if (['EL', 'CL', 'RH', 'ML', 'H/D', 'SCL'].includes(v)) {
            const text = `${emp}(${v})`;

            weekMap[key].LV.push(text);
          }
        });
    });
  });
  const weekEndDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);

  const weekEndText = formatDutyChartDate(weekEndDate);

  // =========================
  // 🔥 RENDER (ROW MERGE)
  // =========================
  let html = `
        <table border="1">
          <colgroup>
            <col style="width:90px">
            <col style="width:90px">
            <col style="width:90px">
            <col style="width:90px">
            <col style="width:90px">
            <col style="width:110px">
            <col style="width:130px">
          </colgroup>
          <thead>
            <tr>
              <th colspan="7" >
                <div style="display:flex;width:100%">
                  <img src="https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l" style="height:50px;top:2px;left:2px;">
                  <div style="display:flex;flex-direction:column;width:100%;justify-content:center;text-align:center;">
                    <h3>प्रसार भारती / PRASAR BHARATI</h3>
                    <h3>भारत के लोक सेवा प्रसारक / INDIA'S PUBLIC SERVICE BROADCASTER</h3>
                    <h3>आकाशवाणी कारवार / AKASHAVANI KARWAR</h3>
                  </div>
                </div>
              </th>
            </tr>
            <tr>
              <th colspan="6">
                <h3>समाप्त होनेवाले सप्ताह के लिए अभियांत्रिक कर्मचारियो के लिए ड्यूटी चार्ट</h3>
                <h3>DUTY CHART FOR ENGINEERING STAFF FOR WEEK ENDING</h3>
              </th>
              <th>${weekEndText}</th>

            </tr>
            <tr>
              <th>दिन / दिनांक <br> DAY / DATE</th>
              <th>सुबह <br>MORNING <br> (05:00 - 12:20)</th>
              <th>सामान्य <br>GENERAL <br> (10:00 - 17:20)</th>
              <th>शाम <br>EVENING <br> (16:00 - 23:20)</th>
              <th>सप्ताहिक अवकाश <br> W/OFF</th>
              <th>प्रतिपूरक अवकाश <br> C/OFF</th>
              <th>छुट्टी <br> LEAVES</th>
            </tr>
          </thead>
          <tbody>
        `;

  let i = 0;

  Object.values(weekMap).forEach((d) => {
    const dateText = formatDutyChartDate(d.date);

    // 🔹 Row 1 → DATE
    html += `
            <tr>
              <td style="padding:0;height:40px">
                ${days[i]}${getHolidayBadge(d.date)}<br>
                ${dateText}
              </td>
              <td style="padding:0;height:40px">${d.MOR.join(', ')}</td>
              <td style="padding:0;height:40px">${d.GEN.join(', ')}</td>
              <td style="padding:0;height:40px">${d.EVE.join(', ')}</td>
              <td style="padding:0;height:40px">${d.WO.join(', ')}</td>
              <td style="padding:0;height:40px">${d.CO.join(',<br>')}</td>
              <td style="padding:0;height:40px">${d.LV.join(', ')}</td>
            </tr>
          `;

    i++;
  });

  html += `
              <tr>
                <td colspan="5" style="padding:0;">
                  <div
                    id="dutyChartNote"
                    contenteditable="true"
                    style="
                      background-color:#d3fc58;
                      min-height:80px;
                      font-style:italic;
                      text-align:left;
                      width:100%;
                      box-sizing:border-box;
                      outline:none;
                      border:none;
                      padding:2px;
                      display:block;
                      white-space:pre-wrap;
                      word-break:break-word;
                      margin:0;
                      line-height:1.2;
                    ">No Change in duty chart allowed without prior permission of undersigned</div>
                </td>
                <td colspan="2"><h2 style="border-top:solid 2px black;align-content: center;margin:30px 10px 0px 10px">ASSISTANT ENGINEER</h2></td>
              </tr>
              `;

  html += '</tbody></table>';

  container.innerHTML = html;
}

// =========================
// 🔥 REQUIREMENT TABLE
// =========================

function formatLieuDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const [dd, mm, yyyy] = parts;

  return `${dd}-${mm}-${yyyy}`; // MM/DD/YYYY
}

function isPastWeek(weekStart) {
  const currentWeekEnd = getCurrentWeekEnd();

  // Current week start
  const currentWeekStart = new Date(currentWeekEnd);
  currentWeekStart.setDate(currentWeekEnd.getDate() - 6);

  // Normalize dates
  const ws = new Date(weekStart);
  ws.setHours(0, 0, 0, 0);

  const cs = new Date(currentWeekStart);
  cs.setHours(0, 0, 0, 0);

  // Include current week also
  return ws.getTime() <= cs.getTime();
}

function getCurrentTimestamp() {
  const now = new Date();

  const pad = (n) => String(n).padStart(2, '0');

  return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function buildHolidayLookup() {
  const lookup = {};

  (holidaysData.rows || []).forEach((row) => {
    const date = String(row[0] || '').trim();
    const type = String(row[1] || '').trim(); // H / RH
    const name = String(row[2] || '').trim();

    if (!date || !type) return;

    if (!lookup[date]) {
      lookup[date] = {
        H: [],
        RH: []
      };
    }

    lookup[date][type]?.push(name);
  });

  return lookup;
}

function getHolidayBadge(dateObj) {
  const dateText = formatDutyChartDate(dateObj);

  const info = window.holidayLookup?.[dateText];

  if (!info) return '';

  const hasH = info.H?.length;
  const hasRH = info.RH?.length;

  let text = '';
  let tooltip = '';

  if (hasH && hasRH) {
    text = '(H / RH)';

    tooltip = [`Holiday:\n${info.H.join('\n')}`, `\nRestricted Holiday:\n${info.RH.join('\n')}`].join('\n');
  } else if (hasH) {
    text = '(H)';
    tooltip = info.H.join('\n');
  } else if (hasRH) {
    text = '(RH)';
    tooltip = info.RH.join('\n');
  }

  return `
          <span
            title="${tooltip.replace(/"/g, '&quot;')}"
            style="
              font-weight:bold;
              cursor:help;
              color:#b00020;
            ">
            ${text}
          </span>
        `;
}

function renderRequirementTableSeparate(data, weekStart, statusRow) {
  const container = id('dutyRequirementTable');

  const headers = data.length ? Object.keys(data[0]) : Object.keys(statusRow || {});

  // =========================
  // 🔥 FILTER EMPLOYEES
  // =========================
  const employees = headers
    .filter((h) => h.includes('Requirement'))
    .map((h) => {
      const name = h.replace(' Requirement', '').trim();

      const status = ((statusRow && statusRow[h]) || '').toUpperCase();
      if (status !== 'IN SERVICE') return null;

      return {
        name,
        reqKey: h,
        lieuKey: `${name} in lieu of`
      };
    })
    .filter(Boolean);

  // =========================
  // 🔥 BUILD WEEK MAP
  // =========================
  const weekMap = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);

    const key = getDateKey(d);

    weekMap[key] = {
      date: d,
      values: {}
    };

    employees.forEach((emp) => {
      weekMap[key].values[emp.name] = {
        req: '',
        lieu: ''
      };
    });
  }

  // =========================
  // 🔥 FILL DATA
  // =========================
  data.forEach((row) => {
    const dObj = parseDDMMYYYY(row.Date);
    if (!dObj) return;

    const key = getDateKey(dObj);
    if (!weekMap[key]) return;

    employees.forEach((emp) => {
      const reqVal = row[emp.reqKey];
      const lieuVal = row[emp.lieuKey];

      if (reqVal) weekMap[key].values[emp.name].req = reqVal;
      if (lieuVal) weekMap[key].values[emp.name].lieu = lieuVal;
    });
  });

  // =========================
  // 🔥 RENDER TABLE (NEW)
  // =========================
  const role = String(window.currentUser || '')
    .trim()
    .toUpperCase();

  const isLocked = role === 'MASTER' ? false : isPastWeek(weekStart);
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  let html = `
              <table border="1">

                <colgroup>
                  <col style="width:12.5%">
                  ${Object.values(weekMap)
                    .map(
                      () => `
                    <col style="width:12.5%">
                  `
                    )
                    .join('')}
                </colgroup>

                <thead>
                  <tr>
                    <th colspan="${1 + Object.keys(weekMap).length}">
                      EMPLOYEES REQUIREMENT REGISTER
                    </th>
                  </tr>

                  <tr>
                    <th>Employee</th>
                    ${Object.values(weekMap)
                      .map(
                        (d, i) => `
                      <th>
                        ${days[i]}${getHolidayBadge(d.date)}<br>
                        ${formatDutyChartDate(d.date)}
                      </th>
                    `
                      )
                      .join('')}
                  </tr>
                </thead>

                <tbody>
            `;

  employees.forEach((emp) => {
    html += `<tr>
                <td><b>${emp.name}</b></td>`;

    Object.values(weekMap).forEach((d) => {
      const val = d.values[emp.name];

      html += `
                  <td>
                    <div style="display:flex;flex-direction:column;gap:2px;width:100%;border:none;text-align:center;">
                      <!-- SELECT -->
                      <select class="req-select"
                        data-emp="${emp.name}"
                        data-date="${formatDutyChartDate(d.date)}"
                        ${isLocked ? 'disabled' : ''}>

                        ${DUTY_OPTIONS.map(
                          (opt) => `
                          <option value="${opt}" ${opt === val.req ? 'selected' : ''}>
                            ${opt}
                          </option>
                        `
                        ).join('')}

                      </select>

                      <!-- LIEU -->
                      <input type="date"
                        class="lieu-input"
                        data-emp="${emp.name}"
                        data-date="${formatDutyChartDate(d.date)}"
                        value="${convertToInputDate(val.lieu)}"
                        ${isLocked || val.req !== 'C/O' ? 'disabled' : ''}>
                    </div>
                  </td>
                `;
    });

    html += '</tr>';
  });

  html += '</tbody></table>';

  container.innerHTML = html;

  setTimeout(() => {
    if (window.currentUser) {
      const role = String(window.currentUser || '')
        .trim()
        .toUpperCase();

      const isLocked = role === 'MASTER' ? false : isPastWeek(weekStart);

      lockRequirementTableForUser(window.currentUser, isLocked);
    }
  }, 0);

  container.innerHTML = html;
  window.currentRequirementState = {
    weekStart,
    data,
    statusRow
  };
}

function renderEditableRequirementTable(data, weekStart, statusRow) {
  const container = id('editableRequirementContainer');

  const headers = data.length ? Object.keys(data[0]) : Object.keys(statusRow || {});

  // =========================
  // 🔥 FILTER EMPLOYEES
  // =========================
  const employees = headers
    .filter((h) => h.endsWith('Requirement'))
    .map((h) => {
      const name = h.replace(' Requirement', '').trim();

      const status = ((statusRow && statusRow[h]) || '').toUpperCase();
      if (status !== 'IN SERVICE') return null;

      return {
        name,
        reqKey: h,
        lieuKey: `${name} in lieu of`
      };
    })
    .filter(Boolean);

  // =========================
  // 🔥 BUILD WEEK MAP
  // =========================
  const weekMap = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);

    const key = getDateKey(d);

    weekMap[key] = {
      date: d,
      values: {}
    };

    employees.forEach((emp) => {
      weekMap[key].values[emp.name] = {
        req: '',
        lieu: '',
        selectVals: [],
        auto: false
      };
    });
  }

  // =========================
  // 🔥 FILL DATA
  // =========================
  data.forEach((row) => {
    const dObj = parseDDMMYYYY(row.Date);
    if (!dObj) return;

    const key = getDateKey(dObj);
    if (!weekMap[key]) return;

    employees.forEach((emp) => {
      const dutyKey = `${emp.name} Duty`;

      const dutyVal = row[dutyKey] || '';
      const reqVal = row[emp.reqKey] || '';

      // 🔥 SPAN SHOULD SHOW REQUIREMENT
      weekMap[key].values[emp.name].req = reqVal || '';

      let selectedVals = [];
      let lieuDate = '';

      // 🔥 REQUIREMENT TABLE LIEU
      const reqLieu = row[emp.lieuKey] || '';

      // =========================
      // 🔥 EXTRACT FROM DUTY
      // =========================
      if (dutyVal && dutyVal.trim() !== '') {
        // 🔥 REMOVE DATE PART
        const cleanDuty = dutyVal.replace(/\(.*?\)/g, '').trim();

        selectedVals = cleanDuty
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
          .sort();

        // =========================
        // 🔥 IF C/O
        // =========================
        if (cleanDuty.includes('C/O')) {
          // 🔥 FIRST TAKE FROM DUTY
          const match = dutyVal.match(/\((.*?)\)/);

          if (match && match[1]) {
            lieuDate = match[1];
          }
          // 🔥 ELSE TAKE FROM REQUIREMENT TABLE
          else if (reqLieu) {
            lieuDate = reqLieu;
          }
        }
        // 🔥 NOT C/O → CLEAR
        else {
          lieuDate = '';
        }
      }
      // 🔥 NO DUTY DATA → KEEP EXISTING REQUIREMENT LIEU
      //else if (reqLieu) {
      //  lieuDate = reqLieu;
      //}

      // =====================================================
      // 🔥 NO DUTY DATA
      // 🔥 COPY FROM REQUIREMENT
      // =====================================================
      else {
        // 🔥 COPY REQUIREMENT TO SELECT
        if (reqVal && reqVal.trim()) {
          selectedVals = reqVal
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .sort();
        }

        // 🔥 COPY LIEU
        if (reqLieu) {
          lieuDate = reqLieu;
        }
      }

      // 🔥 SELECT VALUES
      weekMap[key].values[emp.name].selectVals = selectedVals;

      // 🔥 LIEU FROM DUTY COLUMN
      weekMap[key].values[emp.name].lieu = lieuDate;

      // 🔥 NO AUTO
      weekMap[key].values[emp.name].auto = false;
    });
  });

  // =========================
  // 🔥 RENDER TABLE
  // =========================
  const role = String(window.currentUser || '')
    .trim()
    .toUpperCase();

  const isLocked = role === 'MASTER' ? false : isPastWeek(weekStart);
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  let html = `
              <table border="1">
                <colgroup>
                  <col style="width:12.5%">
                  ${Object.values(weekMap)
                    .map(
                      () => `
                    <col style="width:12.5%">
                  `
                    )
                    .join('')}
                </colgroup>

                <thead>
                  <tr>
                    <th colspan="${1 + Object.keys(weekMap).length}">
                      DUTY CHART PREPARATION TABLE (Red Text Indicates Requirements)
                    </th>
                  </tr>

                  <tr>
                    <th>Employee</th>
                    ${Object.values(weekMap)
                      .map(
                        (d, i) => `
                      <th>
                        ${days[i]}${getHolidayBadge(d.date)}<br>
                        ${formatDutyChartDate(d.date)}
                      </th>
                    `
                      )
                      .join('')}
                  </tr>
                </thead>

                <tbody>
            `;

  // =========================
  // 🔥 ROWS = EMPLOYEES
  // =========================
  employees.forEach((emp) => {
    html += `<tr>
                <td><b>${emp.name}</b></td>`;

    Object.values(weekMap).forEach((d) => {
      const val = d.values[emp.name];

      const selectedCombined = (val.selectVals || [])
        .map((v) => v.trim())
        .sort()
        .join(',');

      html += `
                    <td>
                      <div style="display:flex;flex-direction:column;gap:2px;width:100%;border:none;text-align:center;">
                      <!-- 🔥 REQUIREMENT TEXT -->
                      <span class="req-text"
                        data-emp="${emp.name}"
                        data-date="${formatDutyChartDate(d.date)}">

                        ${val.req === 'C/O' && val.lieu ? `C/O(${formatDutyChartDate(parseDDMMYYYY(val.lieu))})` : val.req || ''}

                      </span>

                      <!-- 🔥 SELECT (DUTY) -->
                      <select class="req-select"
                        data-emp="${emp.name}"
                        data-date="${formatDutyChartDate(d.date)}">

                        ${DUTY_OPTIONS.map((o) => {
                          const norm = o
                            .split(',')
                            .map((v) => v.trim())
                            .sort()
                            .join(',');
                          return `
                            <option value="${o}" ${norm === selectedCombined ? 'selected' : ''}>
                              ${o}
                            </option>
                          `;
                        }).join('')}

                      </select>

                      <!-- 🔥 LIEU INPUT (ADDED BACK) -->
                      <input type="date"
                        class="lieu-input"
                        data-emp="${emp.name}"
                        data-date="${formatDutyChartDate(d.date)}"
                        value="${convertToInputDate(val.lieu)}"
                        ${!selectedCombined.includes('C/O') ? 'disabled' : ''}>
                      </div>
                  </td>
                `;
    });

    html += '</tr>';
  });

  html += '</tbody></table>';

  container.innerHTML = html;

  // =========================
  // 🔥 AUTO UPDATE DUTY CHART
  // =========================
  setTimeout(() => {
    Object.entries(weekMap).forEach(([key, day]) => {
      const dateStr = formatDutyChartDate(day.date);

      Object.entries(day.values).forEach(([emp, val]) => {
        if (!val.auto) return;

        const values = val.selectVals || [];
        if (!values.length) return;

        updateDutyChart(emp, dateStr, values);
      });
    });
  }, 0);

  window.currentEmployees = employees;
}

// =========================
// 🔥 EVENTS
// =========================
function renderFromDropdowns() {
  const week = id('DutyChartWeekSelect')?.value;
  if (!week) return;

  renderDutyTables(dutyData, week);
}

id('DutyChartFYSelect')?.addEventListener('change', (e) => {
  populateMonthDropdown(e.target.value);
  renderFromDropdowns();
});

id('DutyChartMonthSelect')?.addEventListener('change', () => {
  const year = id('DutyChartFYSelect').value;
  const month = id('DutyChartMonthSelect').value;

  populateWeekDropdown(year, month);
  renderFromDropdowns();
});

// 🔥 ONLY WEEK triggers render
id('DutyChartWeekSelect')?.addEventListener('change', () => {
  renderFromDropdowns();
});

function convertToInputDate(dateStr) {
  if (!dateStr) return '';

  const d = parseDDMMYYYY(dateStr);
  if (!d) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

//=======================================================================================================================================
// Event Change for Select Change to C/O to enable Lieu Date, styles & copying from requirement table -> edit table -> Duty Chart Table
//========================================================================================================================================

document.addEventListener('change', function (e) {
  const el = e.target;

  if (!el.classList.contains('req-select') && !el.classList.contains('lieu-input')) return;

  const editTable = el.closest('#editableRequirementContainer');
  const reqTable = el.closest('#dutyRequirementTable');

  if (!editTable && !reqTable) return;

  // =====================================================
  // 🔥 COMMON
  // =====================================================

  const emp = (el.dataset.emp || '').trim().toUpperCase();
  const dateStr = el.dataset.date;

  if (!emp || !dateStr) return;

  const isMaster = (window.currentUser || '').trim().toUpperCase() === 'MASTER';

  const td = el.closest('td');

  const select = td?.querySelector('.req-select');
  const lieu = td?.querySelector('.lieu-input');

  if (!select) return;

  // =====================================================
  // 🔥 HELPERS
  // =====================================================

  const reqSelect = qs(`#dutyRequirementTable .req-select[data-emp="${emp}"][data-date="${dateStr}"]`);
  const reqLieu = qs(`#dutyRequirementTable .lieu-input[data-emp="${emp}"][data-date="${dateStr}"]`);

  const editSelect = qs(`#editableRequirementContainer .req-select[data-emp="${emp}"][data-date="${dateStr}"]`);
  const editLieu = qs(`#editableRequirementContainer .lieu-input[data-emp="${emp}"][data-date="${dateStr}"]`);

  const reqText = qs(`#editableRequirementContainer .req-text[data-emp="${emp}"][data-date="${dateStr}"]`);

  // =====================================================
  // 🔥 HELPERS
  // =====================================================

  function toggleLieu(s, l) {
    if (!l) return;

    const isCO = s.value === 'C/O';

    l.disabled = !isCO;
    if (!isCO) l.value = '';
  }

  function updateReqText(value, lieuValue) {
    if (!reqText) return;

    reqText.textContent = value === 'C/O' && lieuValue ? `C/O(${formatDutyChartDate(parseYMD(lieuValue))})` : value || '';
  }

  function updateDuty(value) {
    updateDutyChart(emp, dateStr, value ? value.split(',').map((v) => v.trim()) : []);
  }

  // =====================================================
  // 🔥 REQUIREMENT TABLE
  // =====================================================

  if (reqTable) {
    toggleLieu(select, lieu);

    updateReqText(select.value, lieu?.value);

    if (editLieu) {
      editLieu.value = lieu?.value || '';
      editLieu.disabled = select.value !== 'C/O';
    }

    if (editSelect && !editSelect.value.trim()) editSelect.value = select.value || '';

    if (!editSelect?.value.trim()) updateDuty(select.value);

    if (isMaster && !id('dutyModeSwitch')?.checked) updateDuty(select.value);
  }

  // =====================================================
  // 🔥 EDIT TABLE
  // =====================================================

  if (editTable) {
    toggleLieu(select, lieu);

    if (select.value === 'C/O' && reqLieu?.value) lieu.value = reqLieu.value;

    updateDuty(select.value);
  }
});

function getEmployeeOrderMap() {
  const map = {};
  (window.currentEmployees || []).forEach((e, i) => {
    map[e.name] = i;
  });
  return map;
}

function updateDutyChart(emp, dateStr, values) {
  const table = id('dutyChartTable');
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');

  const orderMap = getEmployeeOrderMap();

  const clean = (x) => x.replace(/<[^>]+>/g, '');

  const sortList = (list) => {
    return list.sort((a, b) => {
      const nameA = clean(a).split('(')[0];
      const nameB = clean(b).split('(')[0];
      return (orderMap[nameA] ?? 999) - (orderMap[nameB] ?? 999);
    });
  };

  rows.forEach((row) => {
    const firstCell = row.querySelector('td');
    if (!firstCell) return;

    if (!firstCell.innerText.includes(dateStr)) return;

    const cells = row.querySelectorAll('td');

    const map = {
      MOR: 1,
      GEN: 2,
      EVE: 3,
      'W/O': 4,
      'C/O': 5,
      LEAVE: 6
    };

    // =========================
    // 🔥 GET REQUIREMENT VALUE (FIXED)
    // =========================
    // 🔥 ALWAYS USE CURRENT SELECT VALUES (NOT req-text)
    const selectedVal = (values || []).slice().sort().join(',');

    // 🔥 OPTIONAL: still compare with requirement if needed
    let reqVal = '';

    const reqCell = qs(`.req-text[data-emp="${emp}"][data-date="${dateStr}"]`);

    if (reqCell) {
      reqVal = reqCell.textContent
        .replace(/\(.*?\)/g, '')
        .split(',')
        .map((v) => v.trim())
        .sort()
        .join(',');
    }

    const isMatch = reqVal === selectedVal;

    // =========================
    // 🔥 REMOVE OLD VALUES
    // =========================
    Object.values(map).forEach((idx) => {
      const cell = cells[idx];
      if (!cell) return;

      let list = cell.innerHTML ? cell.innerHTML.split(',').map((x) => x.trim()) : [];

      list = list.filter((x) => x && !clean(x).startsWith(emp)).filter(Boolean);

      cell.innerHTML = sortList(list).join(', ');
    });

    // =========================
    // 🔥 ADD NEW VALUES
    // =========================
    values.forEach((v) => {
      let cell;
      let newVal;

      // 🔹 LEAVES
      if (['EL', 'CL', 'RH', 'ML', 'H/D', 'SCL'].includes(v)) {
        cell = cells[6];
        newVal = isMatch ? `${emp}(${v})` : `${emp}(${v})`;
      }

      // 🔹 C/O
      else if (v === 'C/O') {
        cell = cells[5];

        let lieuInput = qs(`#editableRequirementContainer .lieu-input[data-emp="${emp}"][data-date="${dateStr}"]`);
        let lieuText = emp;

        if (lieuInput && lieuInput.value) {
          const d = new Date(lieuInput.value);
          lieuText = `${emp}(${formatDutyChartDate(d)})`;
        }

        newVal = isMatch ? `${lieuText}` : lieuText;
      }

      // 🔹 NORMAL DUTY
      else {
        const idx = map[v];
        if (!idx) return;

        cell = cells[idx];
        newVal = isMatch ? `<b>${emp}</b>` : emp;
      }

      if (!cell) return;

      let list;

      if (v === 'C/O') {
        list = cell.innerHTML
          ? cell.innerHTML
              .split(/,<br>|<br>/)
              .map((x) => x.trim())
              .filter(Boolean)
          : [];
      } else {
        list = cell.innerHTML
          ? cell.innerHTML
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean)
          : [];
      }

      if (!list.includes(newVal)) list.push(newVal);

      if (v === 'C/O') {
        cell.innerHTML = sortList([...new Set(list)])
          .filter(Boolean)
          .join(',<br>');
      } else {
        cell.innerHTML = sortList([...new Set(list)])
          .filter(Boolean)
          .join(', ');
      }
    });
  });
}

async function saveDutyData() {
  const role = (window.currentUser || '').trim().toUpperCase();

  // 🔥 TOGGLE MODE
  // true  = Duty Mode
  // false = Requirement Mode
  const dutyMode = id('dutyModeSwitch')?.checked || false;

  let payload = [];

  // =====================================================
  // 🔥 BUILD DUTY DATA (EDIT TABLE)
  // =====================================================

  function getDutyFromEditTable() {
    const table = id('editableRequirementContainer')?.querySelector('table');

    if (!table) return [];

    const dataMap = {};

    const selects = table.querySelectorAll('.req-select');

    selects.forEach((sel) => {
      const emp = sel.dataset.emp;

      const date = sel.dataset.date;

      if (!emp || !date) return;

      if (!dataMap[date]) {
        dataMap[date] = {
          Date: date
        };
      }

      const td = sel.closest('td');

      const lieu = td?.querySelector('.lieu-input');

      let val = '';

      // =====================================================
      // 🔥 C/O
      // =====================================================

      if (sel.value === 'C/O') {
        if (lieu && lieu.value) {
          const d = parseYMD(lieu.value);

          val = `C/O(${formatDutyChartDate(d)})`;
        } else {
          val = 'C/O';
        }
      } else {
        val = sel.value || '';
      }

      // 🔥 MATCH SHEET COLUMN
      dataMap[date][`${emp} Duty`] = val;
    });

    return Object.values(dataMap);
  }

  // =====================================================
  // 🔥 BUILD REQUIREMENT DATA
  // =====================================================

  function getRequirementData() {
    const table = id('dutyRequirementTable')?.querySelector('table');

    if (!table) return [];

    const dataMap = {};

    const selects = table.querySelectorAll('.req-select');

    selects.forEach((sel) => {
      const emp = sel.dataset.emp;

      const date = sel.dataset.date;

      if (!emp || !date) return;

      if (!dataMap[date]) {
        dataMap[date] = {
          Date: date
        };
      }

      const td = sel.closest('td');

      const lieuInput = td?.querySelector('.lieu-input');

      let reqVal = (sel.value || '').trim();

      // 🔥 EMPTY CHECK
      const isEmpty = !reqVal || reqVal === 'Select' || reqVal === 'NONE';

      let lieuVal = '';

      // =====================================================
      // 🔥 C/O LIEU
      // =====================================================

      if (!isEmpty && reqVal === 'C/O' && lieuInput && lieuInput.value) {
        const d = parseYMD(lieuInput.value);

        lieuVal = formatDutyChartDate(d);
      }

      // 🔥 REQUIREMENT
      dataMap[date][`${emp} Requirement`] = isEmpty ? '' : reqVal;

      // 🔥 LIEU
      dataMap[date][`${emp} in lieu of`] = isEmpty ? '' : lieuVal;
    });

    return Object.values(dataMap);
  }

  // =====================================================
  // 🔥 ROLE LOGIC
  // =====================================================

  // 🔥 MASTER
  if (role === 'MASTER') {
    // 🔥 DUTY MODE
    if (dutyMode) {
      payload = getDutyFromEditTable();
    }

    // 🔥 REQUIREMENT MODE
    else {
      payload = getRequirementData();
    }
  }

  // 🔥 ENGG
  else if (role === 'ENGG') {
    // ✅ ALWAYS DUTY
    payload = getDutyFromEditTable();
  }

  // 🔥 USERS / ADMIN
  else {
    // ✅ ALWAYS REQUIREMENT
    payload = getRequirementData();
  }

  // =====================================================
  // 🔥 EMPTY CHECK
  // =====================================================

  if (!payload.length) {
    showCustomAlert('🚫 No data to save');

    return;
  }

  // =====================================================
  // 🔥 SAVE API
  // =====================================================

  try {
    const res = await fetch('https://office-management-f425.onrender.com/duty/update', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        data: payload,

        role: role,

        dutyMode: dutyMode
      })
    });

    const text = await res.text();

    // =====================================================
    // 🔥 SAFE JSON PARSE
    // =====================================================

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      console.error('Server returned HTML:', text);

      showCustomAlert('❌ Server error (not JSON)');

      return;
    }

    // =====================================================
    // 🔥 SUCCESS
    // =====================================================

    if (result.status === 'success') {
      await syncDutyChartToCoffList();

      showCustomAlert('✅ Saved successfully');
    } else {
      showCustomAlert('❌ Save failed');
    }
  } catch (err) {
    console.error(err);

    showCustomAlert('❌ Network error');
  }
}

function transformRequirementToSheet(data) {
  const map = {};

  data.forEach((r) => {
    const key = r.Date;

    if (!map[key]) map[key] = { Date: key };

    map[key][`${r.Employee} Requirement`] = r.Requirement;

    if (r.Requirement === 'C/O') {
      map[key][`${r.Employee} in lieu of`] = r.Lieu;
    }
  });

  return Object.values(map);
}

function mergeRequirementAndDuty(req, duty) {
  const map = {};

  [...req, ...duty].forEach((r) => {
    const key = r.Date;

    if (!map[key]) map[key] = { Date: key };

    Object.assign(map[key], r);
  });

  return Object.values(map);
}

on('DutysaveBtn', 'click', async () => {
  await saveDutyData();

  await loadTable('duty', 'DutyChart');

  // 🔥 USE EXISTING DROPDOWN FLOW
  renderFromDropdowns();
});

function getDutyTimings(duty) {
  duty = String(duty || '')
    .toUpperCase()
    .trim();

  switch (duty) {
    case 'MOR':
      return {
        actual: '05:00 - 12:20',
        extra: ''
      };

    case 'GEN':
      return {
        actual: '10:00 - 17:20',
        extra: ''
      };

    case 'EVE':
      return {
        actual: '16:00 - 23:20',
        extra: ''
      };

    case 'MOR,GEN':
      return {
        actual: '05:00 - 12:20',
        extra: '10:00 - 17:20'
      };

    case 'GEN,EVE':
      return {
        actual: '10:00 - 17:20',
        extra: '16:00 - 23:20'
      };

    case 'MOR,EVE':
      return {
        actual: '05:00 - 12:20',
        extra: '16:00 - 23:20'
      };

    default:
      return {
        actual: '',
        extra: ''
      };
  }
}

function isHoliday(dateStr) {
  const holiday = window.holidayLookup?.[dateStr];

  if (!holiday) return false;

  const types = holiday.types || [];

  return types.includes('H'); // Skip RH
}

function findDutyOnDate(empName, dutyDate) {
  const headers = dutyData.headers || [];
  const rows = dutyData.rows || [];

  const dateCol = headers.indexOf('Date');
  const dutyCol = headers.indexOf(`${empName} Duty`);

  if (dateCol === -1 || dutyCol === -1) return '';

  const row = rows.find((r) => String(r[dateCol] || '').trim() === String(dutyDate).trim());

  return row ? String(row[dutyCol] || '').trim() : '';
}

function buildCoffListRecords() {
  const records = [];

  const headers = dutyData.headers || [];
  const rows = dutyData.rows || [];
  const dateCol = headers.indexOf('Date');
  if (dateCol === -1) return records;
  const leaveRegex = /^(EL|CL|RH|HPL|ML|SCL|LAP|LHAP|EOL|C\/O)/i;

  // Employee duty columns
  const dutyColumns = headers.map((h, i) => ({ header: h, index: i })).filter((c) => c.header.endsWith(' Duty'));

  // =====================================
  // CURRENT WEEK ENDING (SATURDAY)
  // =====================================

  const today = new Date();
  const currentWeekEnd = new Date(today);
  const diff = 6 - currentWeekEnd.getDay(); // Saturday = 6
  currentWeekEnd.setDate(currentWeekEnd.getDate() + diff);
  const filteredRows = rows.filter((row) => {
    const dutyDate = parseDDMMYYYY(String(row[dateCol] || '').trim());
    return dutyDate && dutyDate <= currentWeekEnd;
  });

  // =====================================
  // 🔥 FIND ALREADY CLAIMED C/O DATES
  // =====================================

  const claimedCOFFDates = new Set();

  filteredRows.forEach((row) => {
    dutyColumns.forEach(({ index }) => {
      const value = String(row[index] || '').trim();

      const match = value.match(/C\/O\((.*?)\)/i);

      if (match) {
        claimedCOFFDates.add(match[1]);
      }
    });
  });

  // =====================================
  // 🔥 BUILD RECORDS
  // =====================================

  filteredRows.forEach((row) => {
    const currentDate = String(row[dateCol] || '').trim();

    dutyColumns.forEach(({ header, index }) => {
      const value = String(row[index] || '').trim();

      if (!value) return;

      const empName = header.replace(' Duty', '').trim();

      /* =====================================
            🔥 LEAVE / C-OFF CLAIMS
            ===================================== */

      if (leaveRegex.test(value)) {
        let leaveType = value;
        let dutyDate = '';
        let actualDuty = '';
        let extraDuty = '';
        let claimedDate = currentDate;
        let details = 'Leave';

        const coffMatch = value.match(/C\/O\((.*?)\)/i);

        if (coffMatch) {
          leaveType = 'C/O';

          dutyDate = coffMatch[1];

          const originalDuty = String(findDutyOnDate(empName, dutyDate) || '').toUpperCase();

          const timing = getDutyTimings(originalDuty);

          const holidayInfo = window.holidayLookup?.[dutyDate];
          const isHolidayDuty = holidayInfo?.H?.length > 0;

          // =====================================
          // HOLIDAY DUTY
          // =====================================
          if (isHolidayDuty) {
            // 🔥 Holiday Double Duty already shown
            // in Holiday block → skip claimed entry
            if (['MOR,GEN', 'MOR,EVE', 'GEN,EVE'].includes(originalDuty)) {
              return;
            }

            // 🔥 Holiday Single Duty claim
            actualDuty = timing.actual;
            extraDuty = '';
            details = 'Holiday Duty';
          }

          // =====================================
          // NORMAL DUTY
          // =====================================
          else {
            actualDuty = timing.actual;
            extraDuty = timing.extra;

            details = timing.extra ? 'Double Duty' : 'Duty';
          }

          records.push([empName, leaveType, claimedDate, dutyDate, actualDuty, extraDuty, details]);

          return;
        }
        // =====================================
        // NORMAL LEAVE ENTRY
        // =====================================
        records.push([empName, leaveType, claimedDate, '', '', '', 'Leave']);

        return;
      }

      /* =====================================
            🔥 HOLIDAY DUTY (H ONLY)
            ===================================== */

      const holidayInfo = window.holidayLookup?.[currentDate];

      const isHolidayDate = holidayInfo?.H?.length > 0;

      const dutyValue = value.toUpperCase();

      if (isHolidayDate && ['MOR', 'GEN', 'EVE', 'MOR,GEN', 'MOR,EVE', 'GEN,EVE'].includes(dutyValue)) {
        const timing = getDutyTimings(dutyValue);

        // Holiday Single Duty
        if (['MOR', 'GEN', 'EVE'].includes(dutyValue)) {
          records.push([empName, 'C/O', '', currentDate, timing.actual, '', 'Holiday Duty']);
        } else {
          // 1️⃣ Holiday Duty
          records.push([empName, 'C/O', '', currentDate, timing.actual, '', 'Holiday Duty']);

          // 2️⃣ Holiday Double Duty
          records.push([empName, 'C/O', '', currentDate, timing.actual, timing.extra, 'Holiday Double Duty']);
        }

        return;
      }

      /* =====================================
      🔥 UNCLAIMED DOUBLE DUTY
      ===================================== */

      if (['MOR,GEN', 'MOR,EVE', 'GEN,EVE'].includes(dutyValue)) {
        // Holiday Double Duty already handled above
        if (isHolidayDate) {
          return;
        }

        // Already claimed through C/O(xxx)
        if (claimedCOFFDates.has(currentDate)) {
          return;
        }

        const timing = getDutyTimings(dutyValue);

        records.push([empName, 'C/O', '', currentDate, timing.actual, timing.extra, 'Double Duty']);

        return;
      }
    });
  });

  /* =====================================
        🔥 MISSED OFF (ALL WEEKS)
        ===================================== */

  const leaveCodes = ['EL', 'CL', 'RH', 'ML', 'HPL', 'SCL', 'LAP', 'LHAP', 'EOL'];

  const weekMap = new Map();

  // Group rows by week ending
  filteredRows.forEach((row) => {
    const dateStr = String(row[dateCol] || '').trim();

    const dutyDate = parseDDMMYYYY(dateStr);

    if (!dutyDate) return;

    const weekEnd = new Date(dutyDate);

    // Saturday = week ending
    const diff = 6 - weekEnd.getDay();

    weekEnd.setDate(weekEnd.getDate() + diff);

    const weekEndingDate = formatDutyChartDate(weekEnd);

    if (!weekMap.has(weekEndingDate)) {
      weekMap.set(weekEndingDate, []);
    }

    weekMap.get(weekEndingDate).push(row);
  });

  // Check every employee for every week
  weekMap.forEach((weekRows, weekEndingDate) => {
    dutyColumns.forEach(({ header, index }) => {
      const empName = header.replace(' Duty', '').trim();

      let woCount = 0;
      let leaveDays = 0;

      weekRows.forEach((r) => {
        const duty = String(r[index] || '')
          .trim()
          .toUpperCase();

        if (duty === 'W/O') {
          woCount++;
        }

        if (leaveCodes.includes(duty)) {
          leaveDays++;
        }
      });

      // Skip if entire week is leave
      const workingDays = weekRows.filter((r) => String(r[index] || '').trim()).length;
      if (workingDays > 0 && leaveDays === workingDays) {
        return;
      }

      // No weekly off in the week
      if (woCount === 0) {
        const alreadyExists = records.some((r) => r[0] === empName && r[1] === 'C/O' && r[3] === weekEndingDate && String(r[6]).startsWith('Missed Off'));

        if (!alreadyExists) {
          records.push([empName, 'C/O', '', weekEndingDate, '', '', `Missed Off for Week Ending ${weekEndingDate}`]);
        }
      }
    });
  });

  return records;
}

async function syncDutyChartToCoffList() {
  setSyncStatus('coffDatabase');

  console.log('🔄 Leave List : Sync Started...');

  try {
    // 🔥 Refresh latest Duty Chart cache
    await fetch('https://office-management-f425.onrender.com/refresh/duty', { method: 'POST' });

    // 🔥 Reload dutyData used by buildCoffListRecords()
    await loadTable('duty', 'DutyChart', false);

    const coffRows = buildCoffListRecords();

    if (!coffRows.length) {
      console.log('ℹ️ Leave List : No records found');

      clearSyncStatus('coffDatabase', 'db', true);

      return;
    }

    const res = await fetch('https://office-management-f425.onrender.com/coff/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rows: coffRows
      })
    });

    if (!res.ok) {
      throw new Error('Failed to update Coff List');
    }

    await fetch('https://office-management-f425.onrender.com/refresh/coff', {
      method: 'POST'
    });

    await loadTable('coff', 'CoffDB', false);

    console.log(`✅ Leave List : Sync Completed (${coffRows.length} records)`);

    clearSyncStatus('coffDatabase', 'db', true);
  } catch (err) {
    console.error('❌ Leave List : Sync Failed:', err);

    clearSyncStatus('coffDatabase', 'db', false);
  }
}

function buildPrintDutyChartHTML() {
  const doc = document.implementation.createHTMLDocument('Duty Chart');

  // Get the actual table node
  const originalTable = id('dutyChartTable');
  if (!originalTable) return '';

  // Deep clone the table to ensure images and structure are copied
  const tableClone1 = originalTable.cloneNode(true);
  const tableClone2 = originalTable.cloneNode(true);

  // Remove IDs from clones to prevent duplicate ID issues in the print doc
  tableClone1.removeAttribute('id');
  tableClone2.removeAttribute('id');

  // ===== STYLE =====
  const style = doc.createElement('style');
  style.textContent = `
              @page {
                size: A4 portrait;
                margin: 10mm 5mm 10mm 5mm;
              }
              * { font-size: 11px; font-family: "Inter", Arial, sans-serif; margin:0; padding:0; }
              table { border-collapse: collapse; width: 100%; position: relative; margin-bottom: 20px; }
              td, th { border: 1px solid black; padding: 2px; text-align: center; position: relative; }
              div {width:100% !important;}

              /* Ensure the logo stays in the top-left of the header cell */
              th img {
                position: absolute;
                left: 2px;
                top: 2px;
                height: 45px;
              }

              thead tr:first-child th{height : 55px !important;}

              .page-break {
                height: 10px;
              }

              #dutyChartNote{
              background:white !important;
              }

            `;
  doc.head.appendChild(style);

  // ===== STRUCTURE =====
  // Page 1
  doc.body.appendChild(tableClone1);

  // Page Break (Forces actual printer to start new page)
  const br = doc.createElement('div');
  br.className = 'page-break';
  doc.body.appendChild(br);

  // Page 2
  doc.body.appendChild(tableClone2);

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

async function exportDutyChartExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Duty Chart');

  // 1. SETUP COLUMN WIDTHS (Optimized for visibility)
  sheet.columns = [
    { width: 14 }, // Day/Date
    { width: 18 }, // Morning
    { width: 18 }, // General
    { width: 18 }, // Evening
    { width: 12 }, // W/Off
    { width: 18 }, // C/Off
    { width: 25 } // Leaves
  ];

  const FULL_BORDER = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // 2. MAIN HEADER (PRASAR BHARATI)
  sheet.mergeCells(1, 1, 1, 7);
  const mainHeader = sheet.getCell(1, 1);

  mainHeader.value = {
    richText: [
      // 🔥 LINE 1
      {
        text: 'प्रसार भारती  ',
        font: {
          bold: true,
          size: 15
        }
      },
      {
        text: '/ PRASAR BHARATI\n',
        font: {
          bold: true,
          size: 12
        }
      },

      // 🔥 LINE 2
      {
        text: 'भारत के लोक सेवा प्रसारक  ',
        font: {
          bold: true,
          size: 15
        }
      },
      {
        text: "/ INDIA'S PUBLIC SERVICE BROADCASTER\n",
        font: {
          bold: true,
          size: 12
        }
      },

      // 🔥 LINE 3
      {
        text: 'आकाशवाणी कारवार  ',
        font: {
          bold: true,
          size: 15
        }
      },
      {
        text: '/ AKASHAVANI KARWAR',
        font: {
          bold: true,
          size: 12
        }
      }
    ]
  };

  mainHeader.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true
  };
  mainHeader.border = FULL_BORDER;
  // 🔥 AUTO HEIGHT
  sheet.getRow(1).height = 70;

  // 3. LOGO INTEGRATION
  try {
    const base64 = await urlToBase64('https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l');
    const imageId = workbook.addImage({ base64, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.15 },
      ext: { width: 55, height: 55 }
    });
  } catch (e) {
    console.warn('Logo failed to load', e);
  }

  // 4. SUB-HEADER (BILINGUAL WEEK ENDING)
  const weekEndText = id('dutyChartTable').querySelector('thead tr:nth-child(2) th:last-child').innerText;

  sheet.mergeCells(2, 1, 2, 6);

  const subHeaderCell = sheet.getCell(2, 1);

  subHeaderCell.value = {
    richText: [
      {
        text: 'समाप्त होनेवाले सप्ताह के लिए अभियांत्रिक कर्मचारियो के लिए ड्यूटी चार्ट\n',
        font: {
          bold: true,
          size: 12
        }
      },

      {
        text: 'DUTY CHART FOR ENGINEERING STAFF FOR WEEK ENDING',
        font: {
          bold: true,
          size: 10
        }
      }
    ]
  };

  subHeaderCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true
  };
  subHeaderCell.border = FULL_BORDER;
  // 🔥 AUTO HEIGHT
  sheet.getRow(2).height = 40;

  // Date Cell
  const dateCell = sheet.getCell(2, 7);
  dateCell.value = weekEndText;
  dateCell.font = { bold: true, size: 11 };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  dateCell.border = FULL_BORDER;

  // 5. COLUMN HEADERS WITH TIMESLOTS (Row 3)
  const headers = [
    {
      hindi: 'दिन / दिनांक',
      english: 'DAY / DATE'
    },
    {
      hindi: 'सुबह ',
      english: 'MORNING\n(05:00 - 12:20)'
    },
    {
      hindi: 'सामान्य',
      english: 'GENERAL\n(10:00 - 17:20)'
    },
    {
      hindi: 'शाम',
      english: 'EVENING\n(16:00 - 23:20)'
    },
    {
      hindi: 'सप्ताहिक अवकाश',
      english: 'W-OFF'
    },
    {
      hindi: 'प्रतिपूरक अवकाश',
      english: 'C-OFF'
    },
    {
      hindi: 'छुट्टी',
      english: 'LEAVES'
    }
  ];

  // =========================
  // 🔥 HEADER ROW
  // =========================
  const headerRow = sheet.getRow(3);

  headerRow.height = 54;

  // =========================
  // 🔥 CREATE HEADERS
  // =========================
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);

    cell.value = {
      richText: [
        // 🔥 HINDI (FIRST LINE)
        {
          text: h.hindi + '\n',
          font: {
            bold: true,
            size: 12,
            color: { argb: 'FFFFFFFF' }
          }
        },

        // 🔥 ENGLISH (SECOND LINE)
        {
          text: h.english,
          font: {
            bold: true,
            size: 10,
            color: { argb: 'FFFFFFFF' }
          }
        }
      ]
    };

    // =========================
    // 🔥 HEADER COLOR
    // =========================
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF444444' }
    };

    // =========================
    // 🔥 ALIGNMENT
    // =========================
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    // =========================
    // 🔥 BORDER
    // =========================
    cell.border = FULL_BORDER;
  });

  // 6. DATA ROWS
  const tableRows = qsa('#dutyChartTable tbody tr');
  let currentRow = 4;

  tableRows.forEach((tr, index) => {
    const isLastRow = index === tableRows.length - 1;
    const excelRow = sheet.getRow(currentRow);

    if (isLastRow) {
      // SIGNATURE AREA
      sheet.mergeCells(currentRow, 1, currentRow, 5);
      const noteCell = sheet.getCell(currentRow, 1);
      const noteDiv = tr.querySelector('#dutyChartNote');
      noteCell.value = noteDiv ? noteDiv.innerText.trim() : '';
      noteCell.font = { italic: true, size: 10 };
      noteCell.alignment = {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true
      };
      noteCell.border = FULL_BORDER;

      sheet.mergeCells(currentRow, 6, currentRow, 7);
      const signCell = sheet.getCell(currentRow, 6);
      signCell.value = 'ASSISTANT ENGINEER';
      signCell.font = { bold: true, size: 11 };
      signCell.alignment = { horizontal: 'center', vertical: 'bottom' };
      signCell.border = FULL_BORDER;
      sheet.getRow(currentRow).height = 70;
    } else {
      // DATA CELLS
      const cells = tr.querySelectorAll('td');
      cells.forEach((td, i) => {
        const cell = excelRow.getCell(i + 1);
        cell.value = td.innerText.trim();
        cell.alignment = {
          wrapText: true,
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.border = FULL_BORDER;

        // Highlight logic (Bold/Underline)
        if (td.querySelector('b')) {
          cell.font = {
            bold: true,
            underline: true,
            color: { argb: 'FF000000' }
          };
        }
      });

      // 🔥 AUTO ROW HEIGHT
      const maxLines = Math.max(...Array.from(cells).map((td) => (td.innerText || '').split('\n').length));

      excelRow.height = Math.max(25, maxLines * 18);
    }
    currentRow++;
  });

  // =========================
  // 🔥 PAGE SETUP
  // =========================
  sheet.pageSetup = {
    // 🔥 A4
    paperSize: 9,

    // 🔥 LANDSCAPE
    orientation: 'portrait',

    // 🔥 FIT TO PAGE
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,

    // 🔥 PRINT AREA
    printArea: `A1:G${currentRow - 1}`,

    // 🔥 MARGINS
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2
    },

    // 🔥 CENTER ON PAGE
    horizontalCentered: true,
    verticalCentered: false
  };

  // =========================
  // 🔥 REPEAT HEADER ROWS
  // =========================
  sheet.pageSetup.printTitlesRow = '1:3';

  // =========================
  // 🔥 AUTO COLUMN WIDTH
  // =========================
  sheet.columns.forEach((col) => {
    let maxLength = 10;

    col.eachCell({ includeEmpty: true }, (cell) => {
      let val = '';

      // 🔥 RICH TEXT SUPPORT
      if (cell.value?.richText) {
        val = cell.value.richText.map((r) => r.text).join('');
      } else {
        val = cell.value ? cell.value.toString() : '';
      }

      // 🔥 HINDI NEEDS EXTRA WIDTH
      const extra = /[\u0900-\u097F]/.test(val) ? 1.8 : 1;

      maxLength = Math.max(maxLength, Math.ceil(val.length * extra));
    });

    col.width = Math.min(maxLength + 3, 16);
  });

  // 7. EXPORT
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Duty_Chart_Karwar_${weekEndText.replace(/\//g, '-')}.xlsx`;
  link.click();
}

on('DutyexcelBtn', 'click', () => {
  exportDutyChartExcel();
});

on('DutyprintBtn', 'click', () => {
  openPrintWindow(buildPrintDutyChartHTML());
});
