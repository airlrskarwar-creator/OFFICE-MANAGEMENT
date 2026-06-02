//================================================================================//
//                🔥🔥🔥🔥🔥PAY BILL PAGE SCRIPT🔥🔥🔥🔥🔥
//=============================================================================//

/* ============DEPARTMENT MAP (EmpDB)============= */
function getDeptMap() {
  if (!empData || !window.empCalcHeaders || !window.empCalcRows) return {};

  const headers = window.empCalcHeaders;

  const hrisIndex = headers.indexOf('HRIS');
  const deptIndex = headers.indexOf('Department');

  if (hrisIndex === -1 || deptIndex === -1) {
    console.warn('Required columns not found in EmpDB');
    return {};
  }

  const map = {};

  window.empCalcRows.forEach((row) => {
    const hris = String(row[hrisIndex] || '').trim();
    const dept = String(row[deptIndex] || '').trim();

    if (hris) {
      map[hris] = dept;
    }
  });

  return map;
}

function createPayBillViewTables(station, selectedFY, selectedMonth) {
  if (!pbData || !pbData.headers || !pbData.rows) return;

  if (!selectedFY || !selectedMonth || selectedFY === 'Select FY' || selectedMonth === 'Select Month') {
    const goTbl = id('PB_GOViewTbl');
    const npsTbl = id('PB_NPSViewTbl');

    if (goTbl) {
      goTbl.innerHTML = `
                    <tbody>
                        <tr>
                            <td style="text-align:center;
                                      color:red;
                                      font-weight:bold;
                                      padding:20px;">
                                ==============🚫 No Data Found 🚫==============
                            </td>
                        </tr>
                    </tbody>
                `;
    }

    if (npsTbl) {
      npsTbl.innerHTML = `
                    <tbody>
                        <tr>
                            <td style="text-align:center;
                                      color:red;
                                      font-weight:bold;
                                      padding:20px;">
                                ==============🚫 No Data Found 🚫==============
                            </td>
                        </tr>
                    </tbody>
                `;
    }

    return;
  }
  const headers = pbData.headers;
  const rows = pbData.rows;

  const nameIndex = headers.indexOf('Employee Name');
  const hrisIndex = headers.indexOf('HRIS');
  const startIndex = headers.indexOf('Basic Pay');
  const endIndex = headers.indexOf('Net Income');

  if (nameIndex === -1 || startIndex === -1 || endIndex === -1) {
    console.error('Column mismatch');
    return;
  }

  // 🔥 Department Map (from empData)
  const deptMap = getDeptMap();

  // 🔥 Use your existing filter logic
  const filteredRows = getFilteredPBData(station, selectedFY, selectedMonth);

  const goRows = [];
  const npsRows = [];

  filteredRows.forEach((row) => {
    const hris = String(row[hrisIndex] || '').trim();

    const dept = String(deptMap[hris] || '')
      .trim()
      .toUpperCase();

    if (dept === 'GO') {
      goRows.push(row);
    } else {
      npsRows.push(row);
    }
  });

  // 🔥 Render tables
  renderPBTable('PB_GOViewTbl', headers, goRows, nameIndex, hrisIndex, startIndex, endIndex, station, selectedMonth);

  renderPBTable('PB_NPSViewTbl', headers, npsRows, nameIndex, hrisIndex, startIndex, endIndex, station, selectedMonth);
}

function getFilteredPBData(station, selectedFY, selectedMonth) {
  if (!pbData || !pbData.headers || !pbData.rows) return [];

  const headers = pbData.headers;
  const rows = pbData.rows;

  const stationIndex = headers.indexOf('Pay Drawn Station');
  const salMonthIndex = headers.indexOf('Salary Month');

  return rows.filter((row) => {
    // 🔹 Station filter
    if (station && stationIndex !== -1 && row[stationIndex] !== station) {
      return false;
    }

    // 🔹 Month filter
    if (selectedMonth && salMonthIndex !== -1) {
      const r = parseMonthYear(row[salMonthIndex]);
      const s = parseMonthYear(selectedMonth);

      if (r !== s) return false;
    }

    // 🔹 Financial Year filter
    if (selectedFY && salMonthIndex !== -1) {
      const val = parseMonthYear(row[salMonthIndex]);

      const y = Math.floor(val / 100);
      const m = val % 100;

      const fy = m >= 3 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;

      if (String(selectedFY).trim() !== fy) return false;
    }

    return true;
  });
}

function addNewEmployeesFromEmpDB(nextMonth, station) {
  if (!pbData) return;

  const pbHeaders = pbData.headers;
  const pbRows = pbData.rows;

  // ✅ SINGLE SOURCE
  const calcHeaders = window.empCalcHeaders || [];
  const calcRows = window.empCalcRows || [];

  const namePB = getColIndex(pbHeaders, 'Employee Name');
  const stationPB = getColIndex(pbHeaders, 'Pay Drawn Station');
  const monthPB = getColIndex(pbHeaders, 'Salary Month');
  const hrisPB = getColIndex(pbHeaders, 'HRIS');
  const designationPB = getColIndex(pbHeaders, 'Designation on Salary Month');

  const nameCalc = getColIndex(calcHeaders, 'Employee Name');
  const stationCalc = getColIndex(calcHeaders, 'Station');

  const dorIdx = getColIndex(calcHeaders, 'Superannuation');
  const statusIdx = getColIndex(calcHeaders, 'Status');
  const vrsIdx = getColIndex(calcHeaders, 'VRS / Deceased Date');

  // =========================================
  // 🔥 FIND LAST AVAILABLE MONTH FOR STATION
  // =========================================

  const stationMonthVals = pbRows
    .filter((r) => String(r[stationPB]).trim() === String(station).trim())
    .map((r) => parseMonthYear(r[monthPB]))
    .filter(Boolean);

  if (!stationMonthVals.length) return;

  // 🔥 Latest month already present in PB
  const prevMonthVal = Math.max(...stationMonthVals);

  // Use passed month as target
  const nextVal = parseMonthYear(nextMonth);

  // =========================
  // 🔹 PARSE DATE
  // =========================
  function parseDOR(dorStr) {
    if (!dorStr) return 0;

    const months = {
      Jan: 1,
      Feb: 2,
      Mar: 3,
      Apr: 4,
      May: 5,
      Jun: 6,
      Jul: 7,
      Aug: 8,
      Sep: 9,
      Oct: 10,
      Nov: 11,
      Dec: 12
    };

    const parts = String(dorStr).split(',');
    if (parts.length !== 2) return 0;

    const year = parseInt(parts[1].trim());
    const monPart = parts[0].split('-')[0].trim();
    const month = months[monPart];

    return year * 100 + month;
  }

  // =========================
  // 🔹 GET DOR
  // =========================
  function getEmpDOR(empName, empHRIS, station) {
    const hrisCalc = getColIndex(calcHeaders, 'HRIS');

    const targetKey = makeEmpKey(empName, empHRIS);

    const row = calcRows.find((r) => {
      const rowKey = makeEmpKey(r[nameCalc], r[hrisCalc]);

      return rowKey === targetKey && String(r[stationCalc]).trim() === String(station).trim();
    });

    return row ? parseDOR(row[dorIdx]) : 0;
  }

  const hrisCalc = getColIndex(calcHeaders, 'HRIS');
  // =========================
  // 🔹 GET VRS
  // =========================
  function getEmpVRS(empName, empHRIS, station) {
    const targetKey = makeEmpKey(empName, empHRIS);

    const row = calcRows.find((r) => {
      const rowKey = makeEmpKey(r[nameCalc], r[hrisCalc]);

      return rowKey === targetKey && String(r[stationCalc]).trim() === String(station).trim();
    });

    if (!row) return 0;

    const status = String(row[statusIdx] || '')
      .trim()
      .toUpperCase();

    if (!['VRS', 'DECEASED'].includes(status)) return 0;

    return parseDOR(row[vrsIdx]);
  }

  // =========================
  // 🔥 REMOVE DUPLICATES
  // =========================
  const seen = new Set();

  for (let i = pbRows.length - 1; i >= 0; i--) {
    const r = pbRows[i];

    const key = String(r[hrisPB]).trim() + '|' + String(r[stationPB]).trim() + '|' + parseMonthYear(r[monthPB]);

    if (seen.has(key)) {
      pbRows.splice(i, 1);
    } else {
      seen.add(key);
    }
  }

  // =========================
  // 🔥 REMOVE INVALID (DOR + VRS)
  // =========================
  for (let i = pbRows.length - 1; i >= 0; i--) {
    const r = pbRows[i];

    if (String(r[stationPB]).trim() === String(station).trim() && parseMonthYear(r[monthPB]) === nextVal) {
      const empName = String(r[namePB]).trim();

      const empHRIS = r[hrisPB];
      const dorVal = getEmpDOR(empName, empHRIS, station);
      const vrsVal = getEmpVRS(empName, empHRIS, station);

      // ❌ remove if BEFORE current month
      if ((dorVal && dorVal < nextVal) || (vrsVal && vrsVal < nextVal)) {
        pbRows.splice(i, 1);
      }
    }
  }

  // =========================
  // 🔹 PREVIOUS MONTH EMPLOYEES
  // =========================
  const prevEmployees = new Set();

  pbRows.forEach((r) => {
    if (String(r[stationPB]).trim() === String(station).trim() && parseMonthYear(r[monthPB]) === prevMonthVal) {
      prevEmployees.add(makeEmpKey(r[namePB], r[hrisPB]));
    }
  });

  // =========================
  // 🔹 EXISTING SET
  // =========================
  const existingSet = new Set();

  pbRows.forEach((r) => {
    if (String(r[stationPB]).trim() === String(station).trim() && parseMonthYear(r[monthPB]) === nextVal) {
      existingSet.add(makeEmpKey(r[namePB], r[hrisPB]));
    }
  });

  let count = 0;

  // =========================
  // 🔹 ADD EMPLOYEES
  // =========================
  calcRows.forEach((emp) => {
    const empName = String(emp[nameCalc] || '').trim();
    const empStation = String(emp[stationCalc] || '').trim();

    if (!empName || empStation !== String(station).trim()) return;

    const empHRIS = String(emp[hrisCalc] || '').trim();

    const empKey = makeEmpKey(empName, empHRIS);

    if (!prevEmployees.has(empKey)) return;
    if (existingSet.has(empKey)) return;

    const dorVal = getEmpDOR(empName, empHRIS, station);
    const vrsVal = getEmpVRS(empName, empHRIS, station);

    // ❌ skip ONLY if BEFORE this month
    if ((dorVal && dorVal < nextVal) || (vrsVal && vrsVal < nextVal)) return;

    const row = new Array(pbHeaders.length).fill('');

    row[namePB] = empName;
    row[stationPB] = station;
    row[monthPB] = nextMonth;
    row[hrisPB] = empHRIS;
    if (designationPB !== -1) {
      row[designationPB] = getEmpDesignation(empName, station, empHRIS);
    }

    const set = (col, val) => {
      const i = getColIndex(pbHeaders, col);
      if (i !== -1) row[i] = val;
    };

    set('Pay Level', 1);
    set('7CPC Index', 1);
    set('HRA Entitled', true);
    set('TA Entitled', true);

    pbRows.push(row);
    existingSet.add(empKey);

    count++;
  });

  //console.log("✅ Added Employees:", count);
}

function copyPreviousMonthData(nextMonth, station) {
  if (!pbData) return;

  const headers = pbData.headers;
  const rows = pbData.rows;

  const nameIdx = headers.indexOf('Employee Name');
  const stationIdx = headers.indexOf('Pay Drawn Station');
  const monthIdx = headers.indexOf('Salary Month');

  const calcHeaders = window.empCalcHeaders || [];
  const calcRows = window.empCalcRows || [];

  const nameCalc = getColIndex(calcHeaders, 'Employee Name');
  const hrisCalc = getColIndex(calcHeaders, 'HRIS');
  const stationCalc = getColIndex(calcHeaders, 'Station');

  const dorIdx = getColIndex(calcHeaders, 'Superannuation');
  const statusIdx = getColIndex(calcHeaders, 'Status');
  const vrsIdx = getColIndex(calcHeaders, 'VRS / Deceased Date');

  // =========================================
  // 🔥 FIND LAST ENTERED MONTH FOR STATION
  // =========================================

  const stationMonths = rows
    .filter((r) => String(r[stationIdx]).trim() === String(station).trim())
    .map((r) => parseMonthYear(r[monthIdx]))
    .filter(Boolean);

  if (!stationMonths.length) return;

  const prevMonthVal = Math.max(...stationMonths);

  // Convert YYYYMM → MMM-YYYY
  function monthValToStr(val) {
    const year = Math.floor(val / 100);
    const month = val % 100;

    return new Date(year, month - 1, 1)
      .toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
      .replace(' ', '-');
  }

  const prevMonth = monthValToStr(prevMonthVal);

  // 🔥 NEXT MONTH OF LAST AVAILABLE MONTH
  const nextDate = new Date(Math.floor(prevMonthVal / 100), prevMonthVal % 100, 1);

  const nextMonthAuto = nextDate
    .toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    })
    .replace(' ', '-');

  const nextVal = parseMonthYear(nextMonthAuto);

  // overwrite passed value
  nextMonth = nextMonthAuto;

  // =========================
  // 🔹 PARSE DATE
  // =========================
  function parseDOR(dorStr) {
    if (!dorStr) return 0;

    const months = {
      Jan: 1,
      Feb: 2,
      Mar: 3,
      Apr: 4,
      May: 5,
      Jun: 6,
      Jul: 7,
      Aug: 8,
      Sep: 9,
      Oct: 10,
      Nov: 11,
      Dec: 12
    };

    const parts = String(dorStr).split(',');
    if (parts.length !== 2) return 0;

    const year = parseInt(parts[1].trim());
    const monPart = parts[0].split('-')[0].trim();
    const month = months[monPart];

    return year * 100 + month;
  }

  // =========================
  // 🔹 GET DOR
  // =========================
  function getEmpDOR(empHRIS) {
    const row = calcRows.find((r) => String(r[hrisCalc] || '').trim() === String(empHRIS).trim());

    return row ? parseDOR(row[dorIdx]) : 0;
  }

  // =========================
  // 🔹 GET VRS
  // =========================
  function getEmpVRS(empHRIS) {
    const row = calcRows.find((r) => String(r[hrisCalc] || '').trim() === String(empHRIS).trim());

    if (!row) return 0;

    const status = String(row[statusIdx] || '')
      .trim()
      .toUpperCase();

    if (!['VRS', 'DECEASED'].includes(status)) return 0;

    return parseDOR(row[vrsIdx]);
  }

  // =========================
  // 🔹 DUPLICATE CHECK
  // =========================
  const existingSet = new Set();

  const hrisIdx = headers.indexOf('HRIS');

  rows.forEach((r) => {
    if (String(r[stationIdx]).trim() === String(station).trim() && parseMonthYear(r[monthIdx]) === nextVal) {
      const empName = String(r[nameIdx] || '').trim();
      const hris = String(r[hrisIdx] || '').trim();
      const empKey = makeEmpKey(empName, hris);
      existingSet.add(empKey);
    }
  });

  let newRows = [];

  // =========================
  // 🔹 COPY LOGIC
  // =========================
  const sourceRows = [...rows];

  sourceRows.forEach((row) => {
    const rowStation = String(row[stationIdx]).trim();
    const rowMonth = String(row[monthIdx]).trim();

    if (rowStation === String(station).trim() && rowMonth === prevMonth) {
      const empName = String(row[nameIdx] || '').trim();
      const empHRIS = String(row[hrisIdx] || '').trim();
      const empKey = makeEmpKey(empName, empHRIS);

      // ❌ Skip duplicate
      if (existingSet.has(empKey)) return;

      const dorVal = getEmpDOR(empHRIS);
      const vrsVal = getEmpVRS(empHRIS);

      // ❌ Skip ONLY if BEFORE prev month
      if ((dorVal && dorVal < prevMonthVal) || (vrsVal && vrsVal < prevMonthVal)) {
        console.log('❌ SKIPPED:', empName, empHRIS);
        return;
      }

      // ✅ Copy
      const newRow = [...row];
      newRow[monthIdx] = nextMonth;

      // 🔥 RESET CALCULATED FIELDS
      const resetCols = ['DAA', 'DAA on TA', 'DAA on NPSE', 'DAA on NPSC', 'Total DAA', 'DAA on NPSE ded', 'DAA on NPS'];

      resetCols.forEach((col) => {
        const idx = headers.indexOf(col);
        if (idx !== -1) newRow[idx] = '';
      });

      // =========================================
      // 🔥 INCREMENT LOGIC
      // =========================================

      const incrementIdx = headers.indexOf('Last Increment');
      const salaryMonthIdx = headers.indexOf('Salary Month');
      const cpcIdx = headers.indexOf('7CPC Index');
      const incrementVal = String(newRow[incrementIdx] || '').trim();
      const salaryMonthVal = String(newRow[salaryMonthIdx] || '').trim();

      // 🔥 GET MONTH ONLY
      const incrementMonth = incrementVal.substring(0, 3).trim().toUpperCase();
      const salaryMonth = salaryMonthVal.substring(0, 3).trim().toUpperCase();

      // 🔥 IF SAME MONTH → +1 INDEX + NEXT INCREMENT YEAR
      if (incrementMonth && incrementMonth === salaryMonth) {
        const currentIndex = Number(newRow[cpcIdx]) || 0;
        newRow[cpcIdx] = currentIndex + 1;

        // =========================================
        // 🔥 MOVE LAST INCREMENT TO NEXT YEAR
        // =========================================

        const parts = incrementVal.split('-');

        if (parts.length === 2) {
          const mon = parts[0].trim();
          const year = parseInt(parts[1].trim(), 10);

          if (!isNaN(year)) {
            newRow[incrementIdx] = `${mon}-${year + 1}`;
          }
        }
      }

      newRows.push(newRow);
      existingSet.add(empKey);
    }
  });

  // =========================
  // 🔥 ADD NEW ROWS
  // =========================
  rows.push(...newRows);

  // =========================
  // 🔥 CLEANUP (FINAL SAFETY)
  // =========================
  pbData.rows = rows.filter((row) => {
    const empName = String(row[nameIdx]).trim();
    const empHRIS = String(row[hrisIdx] || '').trim();
    const rowStation = String(row[stationIdx]).trim();
    const rowMonth = String(row[monthIdx]).trim();

    if (!empName) return false;

    const rowVal = parseMonthYear(rowMonth);
    const dorVal = getEmpDOR(empHRIS);
    const vrsVal = getEmpVRS(empHRIS);

    // ❌ remove only if BEFORE that month
    if ((dorVal && dorVal < rowVal) || (vrsVal && vrsVal < rowVal)) {
      console.log('🗑 REMOVED:', empName, empHRIS);
      return false;
    }

    return true;
  });
}

// 🔥============== PAY BILL VIEW TABLE ===========================
function renderPBTable(tableId, headers, rows, nameIndex, hrisIndex, start, end, station, selectedMonth) {
  const table = id(tableId);
  const pfy = id('PayBillPage_FY').value;
  if (!table) return;

  table.innerHTML = '';

  if (!rows.length || pfy === 'Select FY' || selectedMonth === 'Select Month') {
    table.innerHTML = '<tr><td>==============🚫No Data found🚫==============</td></tr>';
    return;
  }

  /* ================= HEADERS ================= */
  const selectedHeaders = ['Employee Name', 'HRIS', ...headers.slice(start, end + 1)];

  const colCount = selectedHeaders.length;
  const sums = Array(colCount).fill(0);

  /* ================= PROCESS DATA ================= */
  const processedRows = rows.map((row) => {
    const rowData = [];

    rowData.push(row[nameIndex]);
    rowData.push(row[hrisIndex]);

    const values = row.slice(start, end + 1).map((val, i) => {
      const n = num(val);
      sums[i + 2] += n;
      return n;
    });

    return [...rowData, ...values];
  });

  /* ================= COLUMN FILTER ================= */
  const activeCols = selectedHeaders.map((h, i) => {
    if (i === 0 || i === 1) return true;

    const col = String(h).toLowerCase().replace(/\s+/g, '');

    if (col === 'tarate' || col === 'daa' || col === 'daonta' || col === 'daaonta' || col === 'daaonnpse' || col === 'daaonnpsc' || col === 'daaonnpseded' || col === 'it' || col.includes('cess') || col === 'nps') {
      return false;
    }

    return sums[i] !== 0 || processedRows.some((r) => r[i] !== 0);
  });

  /* ================= TITLE ================= */

  // 🔥 FIX: handle Apr-2025 format properly
  let monthLabel = selectedMonth;

  try {
    const parsed = DateUtil.parseMonth(selectedMonth);
    monthLabel = parsed
      .toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
      .toUpperCase();
  } catch (e) {}

  const deptLabel = tableId.includes('GO') ? 'GO' : 'PRASAR BHARATI';

  const titleText = `MANUAL BILL OF SALARY PAYMENT, DEDUCTIONS / RECOVERIES & NET PAYMENT FOR THE MONTH OF ${monthLabel} IN r/o ALL ${deptLabel} STAFF`;

  const wrapper = table.parentNode;
  const container = wrapper.parentNode;

  let titleDiv = wrapper.previousElementSibling;

  if (!titleDiv || !titleDiv.classList.contains('pb-title-div')) {
    titleDiv = createEl('div');
    titleDiv.classList.add('pb-title-div');
    container.insertBefore(titleDiv, wrapper);
  }

  titleDiv.textContent = titleText;

  /* ================= HEADER ================= */
  const thead = createEl('thead');
  const trHead = createEl('tr');

  selectedHeaders.forEach((h, i) => {
    const th = createEl('th', { text: h });

    if (!activeCols[i]) {
      th.classList.add('hidden-col');
    }

    trHead.appendChild(th);
  });

  thead.appendChild(trHead);
  table.appendChild(thead);

  /* ================= BODY ================= */
  const tbody = createEl('tbody');

  processedRows.forEach((row) => {
    const tr = createEl('tr');
    tr.dataset.tableId = tableId;

    row.forEach((val, i) => {
      //console.log("Processing cell:", val, "at column:", selectedHeaders[i]);
      const td = createEl('td');

      if (i === 0 || i === 1) {
        td.textContent = val; // Name + HRIS
      } else {
        td.textContent = formatCurrency(val);
        td.classList.add('currency');
      }

      // =====================================
      // 🔥 SPECIAL COLUMN COLORS
      // =====================================

      const header = selectedHeaders[i];

      if (header === 'Gross Income') {
        td.style.color = '#000ed1'; // Blue
        td.style.fontWeight = 'bold';
      }

      if (header === 'Total Deduction') {
        td.style.color = '#dc3545'; // Red
        td.style.fontWeight = 'bold';
      }

      if (header === 'Net Income') {
        td.style.color = '#198754'; // Green
        td.style.fontWeight = 'bold';
      }

      if (!activeCols[i]) {
        td.classList.add('hidden-col');
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  /* ================= TOTAL ================= */
  const trTotal = createEl('tr');
  trTotal.classList.add('total-row');

  selectedHeaders.forEach((_, i) => {
    const td = createEl('td');

    if (i === 0) {
      td.textContent = 'Total';
    } else if (i === 1) {
      td.textContent = ''; // HRIS column empty in total
    } else {
      td.textContent = formatCurrency(sums[i]);
    }

    // =====================================
    // 🔥 SPECIAL COLUMN COLORS
    // =====================================

    const header = selectedHeaders[i];

    if (header === 'Gross Income') {
      td.style.color = '#000ed1'; // Blue
      td.style.fontWeight = 'bold';
    }

    if (header === 'Total Deduction') {
      td.style.color = '#dc3545'; // Red
      td.style.fontWeight = 'bold';
    }

    if (header === 'Net Income') {
      td.style.color = '#198754'; // Green
      td.style.fontWeight = 'bold';
    }

    if (!activeCols[i]) {
      td.classList.add('hidden-col');
    }

    td.style.fontWeight = 'bold';
    trTotal.appendChild(td);
  });

  tbody.appendChild(trTotal);
  table.appendChild(tbody);
}

function bindPayBillView(stationId, fyId, monthId) {
  const stationEl = id(stationId);
  const fyEl = id(fyId);
  const monthEl = id(monthId);

  if (!stationEl || !fyEl || !monthEl) return;

  function updateTable() {
    createPayBillViewTables(stationEl.value || '', fyEl.value || '', monthEl.value || '');

    setDAPercent();
  }

  on(stationEl, 'change', updateTable);
  on(fyEl, 'change', updateTable);
  on(monthEl, 'change', updateTable);
}

function getDAPercentage(selectedMonth) {
  if (!pbData || !pbData.headers || !pbData.rows) return 0;

  const headers = pbData.headers;
  const rows = pbData.rows;

  const daIndex = headers.indexOf('DA%');
  const monthIndex = headers.indexOf('Salary Month');

  if (daIndex === -1 || monthIndex === -1) return 0;

  const clean = (v) =>
    String(v || '')
      .trim()
      .replace(/\s+/g, '')
      .toLowerCase();

  const selected = clean(selectedMonth);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowMonth = clean(row[monthIndex]);

    if (rowMonth === selected) {
      return num(row[daIndex]);
    }
  }

  if (selectedMonth && selectedMonth !== 'Select Month') {
    console.warn('❌ Pay Bill: No DA% match for:', selectedMonth);
  }
  return 0;
}

function getOldDAFromPBData(nextMonth, station) {
  if (!pbData || !pbData.headers || !pbData.rows) return 0;

  const headers = pbData.headers;
  const rows = pbData.rows;

  const daIdx = headers.indexOf('DA%');
  const monthIdx = headers.indexOf('Salary Month');
  const stationIdx = headers.indexOf('Pay Drawn Station');

  if (daIdx === -1 || monthIdx === -1) return 0;

  const prevMonth = getPreviousMonthStr(nextMonth);

  // 🔥 find ANY row for that station + prev month
  const row = rows.find((r) => String(r[monthIdx]).trim() === String(prevMonth).trim() && String(r[stationIdx]).trim() === String(station).trim());

  if (!row) {
    console.warn('Old DA not found for:', prevMonth);
    return 0;
  }

  return Number(row[daIdx]) || 0;
}

function setDAPercent() {
  const month = id('PayBillPage_SalMonth').value;
  const station = id('PayBillPage_Station').value;

  if (!month || month === 'Select Month') {
    id('PayBillPage_DA%').value = '';
    id('PayBillPage_OldDA%').value = '';
    return;
  }

  const newDA = getDAPercentage(month);
  const oldDA = getOldDAFromPBData(month, station);

  id('PayBillPage_DA%').value = newDA || '';
  id('PayBillPage_OldDA%').value = oldDA || '';
}

// 🔥============== PRINT, ADD, UPDATE & EXCEL ENABLING / DISABLING===========================

function setupPBToggleButton(btnId, config) {
  let btn = id(btnId);
  if (!btn) return;

  let isFullEdit = false;
  const cancelBtn = id('PBcancelBtn');
  /* ================= RESET FUNCTION ================= */

  btn.resetPBToggle = () => {
    isFullEdit = false;

    const wrapper = qs('.PB-Table-Wrapper');
    const printBtn = id('PBprintBtn');
    const excelBtn = id('PBexcelBtn');

    btn.classList.remove(config.className);

    btn.querySelector('span').textContent = config.defaultText;

    updateIcon(btn, config.defaultIcon);

    enableAllButtons();

    toggleFilters(false);

    if (printBtn) {
      printBtn.disabled = false;
    }

    if (excelBtn) {
      excelBtn.disabled = false;
    }
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }
    wrapper?.classList.remove('edit-mode');
  };

  /* ================= CLICK ================= */

  btn.onclick = async () => {
    if (isPBProcessing) return;

    isPBProcessing = true;

    const printBtn = id('PBprintBtn');
    const excelBtn = id('PBexcelBtn');
    const wrapper = qs('.PB-Table-Wrapper');

    try {
      /* ================= ENTER EDIT MODE ================= */

      if (!isFullEdit) {
        isFullEdit = true;

        btn.classList.add(config.className);

        deactivateOthers(btn);

        toggleFilters(true);

        if (printBtn) {
          printBtn.disabled = true;
        }

        if (excelBtn) {
          excelBtn.disabled = true;
        }
        if (cancelBtn) {
          cancelBtn.disabled = false;
        }
        wrapper?.classList.add('edit-mode');

        btn.querySelector('span').textContent = config.activeText;

        updateIcon(btn, config.activeIcon);

        refreshPBView();

        return;
      }

      /* ================= SECOND CLICK ================= */

      // 🔥 DO NOTHING HERE
      // 🔥 savePBData() handles reset AFTER alert
    } catch (err) {
      console.error('❌ Error:', err);
    } finally {
      isPBProcessing = false;
    }
  };

  if (cancelBtn) {
    cancelBtn.disabled = true;
  }
}

function updateIcon(btn, iconName) {
  const iconEl = btn.querySelector('svg') || btn.querySelector('i');

  if (!iconEl) return;

  iconEl.setAttribute('data-lucide', iconName);

  renderIcons(); // 🔥 always refresh
}

function deactivateOthers(currentBtn) {
  qsa('.action-group button').forEach((btn) => {
    if (btn === currentBtn) return;

    btn.disabled = true;
    if (btn.id === 'PBcancelBtn') {
      btn.disabled = true;
      return;
    }
    // 🔒 Skip print/excel reset
    if (btn.id === 'PBprintBtn' || btn.id === 'PBexcelBtn') return;

    btn.classList.remove('upload-mode', 'add-mode');

    const span = btn.querySelector('span');
    if (span) {
      span.textContent = btn.id === 'PBeditBtn' ? 'Edit' : 'Add';
    }

    updateIcon(btn, btn.id === 'PBeditBtn' ? 'edit' : 'plus');
  });

  qsa('.SBGaction-group button').forEach((btn) => {
    if (btn === currentBtn) return;

    btn.disabled = true;
    if (btn.id === 'SBGcancelBtn') {
      btn.disabled = true;
      return;
    }

    // 🔒 Skip print/excel reset
    if (btn.id === 'SBGprintBtn' || btn.id === 'SBGexcelBtn') return;

    btn.classList.remove('upload-mode', 'add-mode');

    const span = btn.querySelector('span');
    if (span) {
      span.textContent = btn.id === 'SBGeditBtn' ? 'Edit' : 'Add';
    }

    updateIcon(btn, btn.id === 'SBGeditBtn' ? 'edit' : 'plus');
  });
}

function toggleFilters(disable) {
  const station = id('PayBillPage_Station');
  const fy = id('PayBillPage_FY');
  const month = id('PayBillPage_SalMonth');
  const daPercent = id('PayBillPage_DA%');

  if (station) station.disabled = disable;
  if (fy) fy.disabled = disable;
  if (month) month.disabled = disable;

  // 🔥 opposite logic
  if (daPercent) daPercent.disabled = !disable;
}

function enableAllButtons() {
  qsa('.action-group button').forEach((btn) => {
    if (btn.id === 'PBcancelBtn' || btn.id === 'SBGcancelBtn') {
      return;
    }
    btn.disabled = false;
  });
}

function disableAllButtons() {
  qsa('.action-group button').forEach((btn) => {
    if (btn.id === 'PBcancelBtn' || btn.id === 'SBGcancelBtn') {
      return;
    }
    btn.disabled = true;
  });
}

// 🔥============== DROPDOWN OPTIONS OF PAYBILL EDIT TABLE COLUMNS===========================

function getQtrsTypes() {
  if (!qtrsData || !qtrsData.headers || !qtrsData.rows) return [];

  const headers = qtrsData.headers;
  const rows = qtrsData.rows;

  const idx = headers.indexOf('Qtrs Type');
  if (idx === -1) return [];

  return [...new Set(rows.map((r) => r[idx]).filter((v) => v !== '' && v != null))];
}

function getPayLevels() {
  if (!cpcData || !cpcData.headers) return [];

  return cpcData.headers.slice(1).map((h) => String(h).trim());
}

function getCPCIndexByLevel(payLevel) {
  if (!cpcData || !cpcData.headers || !cpcData.rows) return [];

  const headers = cpcData.headers;
  const rows = cpcData.rows;

  const colIndex = headers.findIndex((h) => String(h).trim() === String(payLevel).trim());

  if (colIndex === -1) return [];

  const result = [];

  for (let i = 2; i < rows.length - 2; i++) {
    const row = rows[i];

    if (row[colIndex] !== '' && row[colIndex] != null) {
      result.push(row[0]); // index column
    }
  }

  return result;
}

// 🔥============== DEPENDENCY COLUMN RULES ===========================

function bindPayLevelDependency(tr, originalRow, headers) {
  const levelSelect = tr.querySelector('[data-col="Pay Level"] select');
  const indexSelect = tr.querySelector('[data-col="7CPC Index"] select');

  if (!levelSelect || !indexSelect) return;

  // 🔥 get original PBDB index value
  const indexCol = headers.indexOf('7CPC Index');
  const originalValue = originalRow[indexCol];

  function updateIndex(useOriginal = false) {
    const currentValue = indexSelect.value;

    const levels = getCPCIndexByLevel(levelSelect.value);

    indexSelect.innerHTML = '';

    levels.forEach((v) => {
      indexSelect.appendChild(
        createEl('option', {
          text: v,
          value: v
        })
      );
    });

    let valueToSet;

    // 🔥 FIRST TIME → use PBDB value
    if (useOriginal) {
      valueToSet = originalValue;
    }
    // 🔥 AFTER CHANGE → use current
    else {
      valueToSet = currentValue;
    }

    // ✅ KEEP if exists
    if (levels.includes(String(valueToSet))) {
      indexSelect.value = valueToSet;
    }
    // ❌ else fallback to last
    else if (levels.length > 0) {
      indexSelect.value = levels[levels.length - 1];
    }
  }

  // 🔥 On change
  levelSelect.addEventListener('change', () => {
    updateIndex(false);
    updateBasicPay(tr); // 🔥 ADD THIS
  });

  indexSelect.addEventListener('change', () => {
    updateBasicPay(tr);
  });

  // 🔥 Initial load → use PBDB value
  updateIndex(true);
  updateBasicPay(tr);
}

function bindDependency({ controller, target, child = null, disableWhen = true }) {
  if (!controller || !target) return;

  // 🔥 memory
  let prevChecked = target.type === 'checkbox' ? target.checked : null;
  let prevValue = target.value;
  let prevChildValue = child ? child.value : null;

  function update() {
    const shouldDisable = controller.checked === disableWhen;

    if (shouldDisable) {
      // 🔹 store current state
      if (target.type === 'checkbox') {
        prevChecked = target.checked;
        target.checked = false;
      }

      prevValue = target.value;

      if (child) {
        prevChildValue = child.value;
      }

      // 🔹 disable target
      target.disabled = true;

      if (target.tagName === 'SELECT') {
        target.value = '--';
      }

      // 🔹 disable child
      if (child) {
        child.disabled = true;
        child.value = '--';
      }
    } else {
      // 🔹 enable target
      target.disabled = false;

      if (target.type === 'checkbox') {
        target.checked = prevChecked;
      }

      if (target.tagName === 'SELECT') {
        target.value = prevValue || '--';
      }

      // 🔹 enable child
      if (child) {
        child.disabled = target.type === 'checkbox' ? !target.checked : false;

        child.value = prevChildValue || '--';
      }
    }
  }

  /* ================= TRACK STATE ================= */

  if (target.type === 'checkbox') {
    target.addEventListener('change', () => {
      prevChecked = target.checked;
    });
  }

  if (target.tagName === 'SELECT') {
    target.addEventListener('change', () => {
      prevValue = target.value;
    });
  }

  if (child) {
    child.addEventListener('change', () => {
      prevChildValue = child.value;
    });
  }

  /* ================= CONTROLLER ================= */

  controller.addEventListener('change', update);

  /* ================= INIT ================= */

  update();
}

function applyTADependency(tr) {
  const taCheckbox = getCellInput(tr, 'TA Entitled');

  bindDependency({
    controller: taCheckbox,
    target: getCellInput(tr, 'Disability'),
    child: getCellInput(tr, 'Level of Disability', 'select'),
    disableWhen: false
  });

  // 🔥 ADD THIS (CRITICAL FIX)
  taCheckbox.addEventListener('change', () => {
    calculateTA(tr);
    recalculateAllTotals();
  });
}

function applyDisabilityDependency(tr) {
  bindDependency({
    controller: getCellInput(tr, 'Disability'),
    target: getCellInput(tr, 'Level of Disability', 'select'),
    disableWhen: false // disable when unchecked
  });
}

function applyHRADependency(tr) {
  bindDependency({
    controller: getCellInput(tr, 'HRA Entitled'),
    target: getCellInput(tr, 'Qtrs Type', 'select'),
    disableWhen: true // disable when checked
  });
}

function createPayBillEditTables() {
  if (!pbData || !pbData.headers || !pbData.rows) return;

  const headers = pbData.headers;
  const rows = pbData.rows;

  const filteredRows = getFilteredPBData(id('PayBillPage_Station').value, id('PayBillPage_FY').value, id('PayBillPage_SalMonth').value);

  const deptMap = getDeptMap();

  const goRows = [];
  const npsRows = [];

  const hrisIdx = headers.indexOf('HRIS');

  filteredRows.forEach((row) => {
    const hris = String(row[hrisIdx] || '').trim();

    const dept = String(deptMap[hris] || '')
      .trim()
      .toUpperCase();

    if (dept === 'GO') {
      goRows.push(row);
    } else {
      npsRows.push(row);
    }
  });

  const station = id('PayBillPage_Station')?.value || '';
  const selectedMonth = id('PayBillPage_SalMonth')?.value || '';

  renderPBEditTable('PB_GOEditTbl', headers, goRows, station, selectedMonth);

  renderPBEditTable('PB_NPSEditTbl', headers, npsRows, station, selectedMonth);

  renderIncrementDueList();
}

const READ_ONLY_COLUMNS = ['Basic Pay', 'DA', 'DA on TA', 'HRA', 'NPSE', 'NPS', 'DA%', 'NPSE Ded', 'Total DAA', 'TA Rate', 'TA', 'NPSC', 'DAA', 'DAA on TA', 'Gross Income', 'Total Deduction', 'Cess @4%', 'DAA on NPS', 'Net IT', 'CGEIS', 'W Ch', 'L Fee', 'Net Income'];

const GO_HIDDEN_COLUMNS = ['TA Rate', 'DA on TA', 'DA%', 'NPSE', 'NPSC', 'DAA on NPSE', 'DAA on NPSC', 'DAA on NPS', 'NPS', 'DAA on NPSE ded', 'NPSE Ded'];

const NPS_HIDDEN_COLUMNS = ['TA Rate', 'DA on TA', 'DA%', 'GPF', 'CGEIS', 'NPS', 'DAA on NPS'];

function normalize(str) {
  return String(str).trim().toLowerCase();
}

function getHiddenColumns(tableId) {
  if (tableId.includes('GO')) return GO_HIDDEN_COLUMNS;
  if (tableId.includes('NPS')) return NPS_HIDDEN_COLUMNS;
  return [];
}

function isReadOnly(header) {
  return READ_ONLY_COLUMNS.map(normalize).includes(normalize(header));
}

function applyColumnRules(tr, headers, tableId) {
  const hiddenCols = getHiddenColumns(tableId).map(normalize);

  headers.forEach((header, index) => {
    const cell = tr.children[index];
    const input = cell?.querySelector('input, select');

    if (!cell) return;

    /* 🔹 HIDE COLUMN ONLY */
    if (hiddenCols.includes(normalize(header))) {
      cell.style.display = 'none';
    }

    /* 🔹 READ ONLY */
    if (isReadOnly(header)) {
      if (input) {
        input.readOnly = true;
        input.classList.add('readonly-cell');

        input.addEventListener('focus', () => input.blur());
      }
    }
  });
}

function applyTableColumnRules(table, headers, tableId) {
  const hiddenCols = getHiddenColumns(tableId).map(normalize);

  headers.forEach((header, index) => {
    if (!hiddenCols.includes(normalize(header))) return;

    const colIndex = index + 1;

    /* 🔹 HEADER */
    const th = table.querySelector(`thead th:nth-child(${colIndex})`);
    if (th) th.style.display = 'none';

    /* 🔹 BODY + TOTAL */
    table.querySelectorAll('tbody tr').forEach((tr) => {
      const td = tr.querySelector(`td:nth-child(${colIndex})`);
      if (td) td.style.display = 'none';
    });
  });
}

// 🔥============== PAYBILL EDIT TABLE ===========================

function renderPBEditTable(tableId, headers, rows, station, selectedMonth) {
  GPF_MESSAGES = [];
  const table = id(tableId);
  if (!table) return;

  table.innerHTML = '';

  if (!rows.length) {
    table.innerHTML = '<tr><td>==============🚫No Data found🚫==============</td></tr>';
    return;
  }

  /* ================= FIXED RANGE ================= */

  const nameIndex = getColIndex(headers, 'Employee Name');
  const hrisIndex = getColIndex(headers, 'HRIS');
  const startIndex = getColIndex(headers, 'Last Increment');
  const endIndex = getColIndex(headers, 'Recovery Details');

  const selectedHeaders = ['IT Projection\n(Regime) IT + Cess = Net IT', 'Employee Name', 'HRIS', ...headers.slice(startIndex, endIndex + 1)];

  const selectedFY = id('PayBillPage_FY')?.value || '';

  const salMonthEl = id('PayBillPage_SalMonth');

  const currentMonth = salMonthEl?.options?.[salMonthEl.selectedIndex]?.text || '';

  const processedRows = rows.map((row) => {
    const empHRIS = row[hrisIndex];

    const oldTax = calculateMonthlyIT(empHRIS, selectedFY, 'Old Regime', currentMonth);

    const newTax = calculateMonthlyIT(empHRIS, selectedFY, 'New Regime', currentMonth);

    const tax = oldTax.netTax <= newTax.netTax ? oldTax : newTax;

    const isOld = oldTax.netTax <= newTax.netTax;

    const regimeBadge = isOld ? `<span class="regime-badge old">OLD</span>` : `<span class="regime-badge new">NEW</span>`;

    const itProjection = `${regimeBadge} ${tax.it} + ${tax.cess} = ${tax.total}`;

    return [itProjection, row[nameIndex], row[hrisIndex], ...row.slice(startIndex, endIndex + 1)];
  });

  /* ================= DROPDOWNS ================= */

  const dropdownCols = {
    'Qtrs Type': () => getQtrsTypes(),
    'Level of Disability': () => ['--', '>40%', '>80%'],
    'Pay Level': () => getPayLevels(),
    '7CPC Index': () => []
  };

  const checkboxCols = ['TA Entitled', 'HRA Entitled', 'Disability'];

  /* ================= HEADER ================= */

  // ===== SAFE VALUES =====
  const safeMonth = selectedMonth ? new Date(selectedMonth) : null;

  const monthLabel = new Date(selectedMonth)
    .toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
    .toUpperCase();

  const deptLabel = tableId.includes('GO') ? 'GO' : 'PRASAR BHARATI';

  const safeStation = station || 'N/A';

  const titleText = `MANUAL BILL OF SALARY PAYMENT, DEDUCTIONS / RECOVERIES & NET PAYMENT FOR THE MONTH OF ${monthLabel} IN r/o ALL ${deptLabel} STAFF`;

  // ===== CHECK IF TITLE EXISTS =====
  const wrapper = table.parentNode;
  const container = wrapper.parentNode;

  // 🔥 look only for title JUST ABOVE THIS WRAPPER
  let titleDiv = wrapper.previousElementSibling;

  if (!titleDiv || !titleDiv.classList.contains('pb-title-div')) {
    titleDiv = createEl('div');
    titleDiv.classList.add('pb-title-div');

    // 👇 insert before THIS wrapper only
    container.insertBefore(titleDiv, wrapper);
  }

  titleDiv.textContent = titleText;

  // ===== TABLE HEADER =====
  const thead = createEl('thead');
  const trHead = createEl('tr');

  selectedHeaders.forEach((h) => {
    const th = createEl('th', { text: h });

    if (h.startsWith('IT Projection')) {
      th.style.whiteSpace = 'pre-line';
      th.style.lineHeight = '1.2';
    }

    trHead.appendChild(th);
  });

  thead.appendChild(trHead);
  table.appendChild(thead);

  /* ================= BODY ================= */

  const tbody = createEl('tbody');
  const rowElements = [];

  processedRows.forEach((row, rIndex) => {
    const tr = createEl('tr');
    const empHRIS = row[hrisIndex];

    // 🔥 STORE HRIS IN ROW
    tr.dataset.hris = empHRIS || '';
    selectedHeaders.forEach((colName, i) => {
      const val = row[i] ?? '';

      const td = createEl('td');

      td.setAttribute('data-col', colName);
      if (colName.includes('IT Projection')) {
        td.innerHTML = val;

        td.style.fontSize = '10px';
        td.style.fontWeight = '600';
        td.style.whiteSpace = 'nowrap';
      } else if (colName === 'Employee Name' || colName === 'HRIS') {
        td.textContent = val;
      } else if (checkboxCols.includes(colName)) {
        /* Checkbox */
        const input = createEl('input', { type: 'checkbox' });

        const v = String(val).toLowerCase();
        input.checked = v === 'true' || v === 'yes' || val === true;

        td.appendChild(input);
      } else if (dropdownCols[colName]) {
        /* Dropdown */
        const options = dropdownCols[colName]();

        const select = createEl('select');

        options.forEach((opt) => {
          // 🔥 hide "--" from UI but keep value
          if (opt === '--') {
            select.appendChild(
              createEl('option', {
                text: opt,
                value: opt,
                style: 'display:none;'
              })
            );
          } else {
            select.appendChild(
              createEl('option', {
                text: opt,
                value: opt
              })
            );
          }
        });

        select.value = val || options[0];

        // 🔥 Highlight 7CPC Index when increment due
        if (colName === '7CPC Index') {
          const incIdx = selectedHeaders.indexOf('Last Increment');

          const incrementVal = String(row[incIdx] || '').trim();

          const incrementMonth = incrementVal.substring(0, 3).toUpperCase();

          const salaryMonth = new Date(selectedMonth)
            .toLocaleDateString('en-US', {
              month: 'short'
            })
            .toUpperCase();

          if (incrementMonth === salaryMonth) {
            td.style.color = 'red';
            td.style.fontWeight = 'bold';
            select.style.fontWeight = 'bold';
            select.style.border = '1px solid red';
            td.style.border = '1px solid red';
            td.style.padding = '0';
            select.style.margin = '0';
          }
        }

        td.appendChild(select);
      } else if (colName === 'Last Increment') {
        function toMonthInputFormat(value) {
          if (!value) return '';

          const months = {
            Jan: '01',
            Feb: '02',
            Mar: '03',
            Apr: '04',
            May: '05',
            Jun: '06',
            Jul: '07',
            Aug: '08',
            Sep: '09',
            Oct: '10',
            Nov: '11',
            Dec: '12'
          };

          if (/^\d{4}-\d{2}$/.test(value)) {
            return value;
          }

          const parts = String(value).trim().split('-');

          if (parts.length !== 2) return '';

          const mon = months[parts[0]];
          const year = parts[1];

          if (!mon || !year) return '';

          return `${year}-${mon}`;
        }

        const input = createEl('input');

        input.type = 'text';
        input.value = String(val || '');

        input.classList.add('month-toggle-input');

        const incrementMonth = String(val || '')
          .substring(0, 3)
          .toUpperCase();

        const salaryMonth = new Date(selectedMonth)
          .toLocaleDateString('en-US', {
            month: 'short'
          })
          .toUpperCase();

        if (incrementMonth === salaryMonth) {
          td.style.color = 'red';
          td.style.fontWeight = 'bold';

          input.style.color = 'red';
          input.style.fontWeight = 'bold';

          td.style.border = '1px solid red';
          input.style.border = '1px solid red';

          td.style.padding = '0';
        }

        input.dataset.value = toMonthInputFormat(val);

        input.addEventListener('focus', () => {
          const yyyyMM = input.dataset.value;

          input.value = '';

          input.type = 'month';

          requestAnimationFrame(() => {
            input.value = yyyyMM || '';

            input.showPicker?.();
          });
        });

        input.addEventListener('change', () => {
          input.dataset.value = input.value;

          if (input.value) {
            const d = new Date(input.value + '-01');

            input.dataset.display = d
              .toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              })
              .replace(' ', '-');
          }
        });

        input.addEventListener('blur', () => {
          const display = input.dataset.display || String(val || '');

          input.type = 'text';

          input.value = display;
        });

        td.appendChild(input);
      } else if (colName === 'Arrears Details' || colName === 'Recovery Details') {
        const textarea = createEl('textarea');

        // 🔥 ADD -> blank
        // 🔥 EDIT -> preserve value
        textarea.value = isEditMode ? val || '' : '';

        td.appendChild(textarea);
      } else {
        /* Default input */
        const input = createEl('input', {
          type: 'text',
          value: formatCurrency(val)
        });

        input.dataset.raw = val || 0;

        input.addEventListener('input', () => {
          input.dataset.raw = num(input.value);
        });

        input.addEventListener('focus', () => {
          const raw = input.dataset.raw;
          input.value = raw !== undefined && raw !== null ? raw : '';
          setTimeout(() => input.select(), 0);
        });

        input.addEventListener('blur', () => {
          const raw = num(input.value);
          input.dataset.raw = raw;
          input.value = formatCurrency(raw);
        });

        td.appendChild(input);
      }

      tr.appendChild(td);
    });

    tr._cells = Object.fromEntries(
      [...tr.querySelectorAll('[data-col]')].map((td) => {
        const input = td.querySelector('input, select, textarea');

        // 🔥 If no input (HRIS / Name), store textContent
        return [td.dataset.col, input || td];
      })
    );

    applyColumnRules(tr, selectedHeaders, tableId);
    applyGPFRule_GO(tr, empHRIS);

    tbody.appendChild(tr);

    rowElements.push({ tr, row });

    /* ================= DEPENDENCIES ================= */
    applyTADependency(tr);
    applyDisabilityDependency(tr);
    bindPayLevelDependency(tr, rows[rIndex], headers);
    applyHRADependency(tr);

    /* 🔥 SINGLE HANDLER */
    const handler = () => {
      recalculateRow(tr, tableId);

      const empHRIS = tr.children[2].textContent.trim();

      // 🔥 Delay ensures no override happens after
      setTimeout(() => {
        applyGPFRule_GO(tr, empHRIS);

        // 🔥 UPDATE MESSAGE AFTER LAST ROW
        updateGPFMessage();
      }, 0);
    };

    /* 🔥 BIND EVENTS */
    tr.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });

    /* 🔥 INITIAL CALCULATION (AFTER EVERYTHING) */
    setTimeout(() => {
      handler();
    }, 0);
  });

  /* ================= TOTAL ROW ================= */
  const trTotal = createEl('tr');
  trTotal.classList.add('total-row');

  selectedHeaders.forEach((_, i) => {
    const td = createEl('td');

    if (i === 0) {
      td.textContent = 'Total';
    } else {
      td.textContent = ''; // 🔥 no calculation here
    }

    td.style.fontWeight = 'bold';
    trTotal.appendChild(td);
  });

  tbody.appendChild(trTotal);

  table.appendChild(tbody);

  applyTableColumnRules(table, selectedHeaders, tableId);
  recalculateAllTotals();
}

/* =====================================================
      🔥 PB TABLE HORIZONTAL SCROLL SYNC
      ===================================================== */

function syncHorizontalScroll(wrapper1Selector, wrapper2Selector) {
  const wrapper1 = qs(wrapper1Selector);
  const wrapper2 = qs(wrapper2Selector);
  if (!wrapper1 || !wrapper2) return;
  let isSyncing = false;

  /* =========================================
        🔥 WRAPPER 1 → WRAPPER 2
        ========================================= */

  wrapper1.addEventListener(
    'scroll',

    () => {
      if (isSyncing) return;
      isSyncing = true;
      wrapper2.scrollLeft = wrapper1.scrollLeft;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    },
    { passive: true }
  );

  /* =========================================
        🔥 WRAPPER 2 → WRAPPER 1
        ========================================= */

  wrapper2.addEventListener(
    'scroll',
    () => {
      if (isSyncing) return;
      isSyncing = true;
      wrapper1.scrollLeft = wrapper2.scrollLeft;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    },
    { passive: true }
  );
}

/* =====================================================
      🔥 INIT
      ===================================================== */

syncHorizontalScroll('.PB-Table-WrapperGO', '.PB-Table-WrapperNPS');

function getBasicPay(payLevel, index) {
  if (!cpcData || !cpcData.headers || !cpcData.rows) return 0;

  const headers = cpcData.headers;
  const rows = cpcData.rows;

  const colIndex = headers.findIndex((h) => String(h).trim() === String(payLevel).trim());

  if (colIndex === -1) return 0;

  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(index).trim()) {
      return num(rows[i][colIndex]) || 0;
    }
  }

  return 0;
}

function updateDAColumn(value) {
  const tables = [id('PB_GOEditTbl'), id('PB_NPSEditTbl')];

  tables.forEach((table) => {
    if (!table) return;

    table.querySelectorAll('td[data-col="DA%"] input').forEach((input) => {
      input.value = value;
    });
  });
}

function updateBasicPay(tr, tableId) {
  const levelSelect = getCellInput(tr, 'Pay Level', 'select');
  const indexSelect = getCellInput(tr, '7CPC Index', 'select');
  const basicInput = getCellInput(tr, 'Basic Pay');

  if (!levelSelect || !indexSelect || !basicInput) return;

  const payLevel = levelSelect.value;
  const index = indexSelect.value;

  const basic = getBasicPay(payLevel, index);

  // 🔥 USE HELPER
  setValue(basicInput, basic);

  // 🔥 pass tableId (important for CGEIS/NPS)
  recalculateRow(tr, tableId);
}

function updateDARow(tr) {
  const daPercentInput = id('PayBillPage_DA%');
  const basicInput = getCellInput(tr, 'Basic Pay');
  const daInput = getCellInput(tr, 'DA');

  if (!daPercentInput || !basicInput || !daInput) return;

  /* =========================
       🔹 SAFE VALUES
      ========================= */
  const rawDA = num(daPercentInput.value);

  // 🔥 LIMIT ONLY FOR CALCULATION
  const daPercent = Math.min(rawDA, 150);

  const basic = getNum(tr, 'Basic Pay');

  /* =========================
       🔹 CALCULATE
      ========================= */
  const daVal = Math.round((daPercent * basic) / 100);

  /* =========================
       🔹 SET VALUE
      ========================= */
  setValue(daInput, daVal);

  /* =========================
       🔹 DEPENDENT CALCS
      ========================= */
  calculateTA(tr);
  calculateHRA(tr);
}

function getPBDBHistory(empName) {
  if (!pbData || !pbData.headers || !pbData.rows) return [];

  const headers = pbData.headers;
  const rows = pbData.rows;

  const nameIndex = headers.indexOf('Employee Name');
  const monthIndex = headers.indexOf('Salary Month');
  const daIndex = headers.indexOf('DA%');
  const basicIndex = headers.indexOf('Basic Pay');
  const taRateIndex = headers.indexOf('TA Rate');

  return rows
    .filter((r) => String(r[nameIndex]).trim() === String(empName).trim())
    .map((r) => ({
      month: r[monthIndex],
      da: num(r[daIndex]),
      basic: num(r[basicIndex]),
      ta: num(r[taRateIndex])
    }));
}

let isResetMode = false;

function updateDAAFromPBDB(rowElements) {
  const inputDA = Math.min(num(id('PayBillPage_DA%').value), 150);
  const selectedMonth = id('PayBillPage_SalMonth')?.value;

  if (!selectedMonth || isResetMode) return;

  const [mon, year] = selectedMonth.split('-');

  const monthMap = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12
  };

  const selectedNum = monthMap[mon];

  rowElements.forEach(({ tr }) => {
    const table = tr.closest('table');
    const isGO = table?.id === 'PB_GOEditTbl';
    const isNPS = table?.id === 'PB_NPSEditTbl';

    const empName = getCellValue(tr, 'Employee Name')?.trim();
    if (!empName) return;

    const history = getPBDBHistory(empName);
    if (!history.length) return;

    history.sort((a, b) => parseMonthYear(a.month) - parseMonthYear(b.month));

    const selectedIndex = history.findIndex((r) => r.month === selectedMonth);
    if (selectedIndex <= 0) return;

    const prevDA = Number(history[selectedIndex - 1].da);

    if (inputDA === prevDA) {
      resetDependentFields(tr, table);
      return;
    }

    // =========================
    // 🔥 CURRENT BLOCK
    // =========================
    const currentBlockStart =
      selectedNum <= 6
        ? 1 // Jan-Jun
        : 7; // Jul-Dec

    const previousBlockStart = currentBlockStart === 1 ? 7 : 1;

    // =========================
    // 🔥 FIND CURRENT BLOCK START INDEX
    // =========================
    let currentBlockIndex = -1;

    for (let i = 0; i < history.length; i++) {
      const [m, y] = history[i].month.split('-');

      const mNum = monthMap[m];

      if (parseInt(y) === parseInt(year) && mNum === currentBlockStart) {
        currentBlockIndex = i;
        break;
      }
    }

    // =========================
    // 🔥 FIND PREVIOUS BLOCK START INDEX
    // =========================
    let previousBlockIndex = -1;

    for (let i = 0; i < history.length; i++) {
      const [m, y] = history[i].month.split('-');

      const mNum = monthMap[m];

      // 🔥 previous Jul block for Jan revisions
      if (currentBlockStart === 1 && parseInt(y) === parseInt(year) - 1 && mNum === 7) {
        previousBlockIndex = i;
        break;
      }

      // 🔥 previous Jan block for Jul revisions
      if (currentBlockStart === 7 && parseInt(y) === parseInt(year) && mNum === 1) {
        previousBlockIndex = i;
        break;
      }
    }

    // =========================
    // 🔥 CHECK REVISION IN PREVIOUS BLOCK
    // =========================
    let previousBlockHadRevision = false;

    if (previousBlockIndex >= 0) {
      const currentBlockLimit = currentBlockIndex >= 0 ? currentBlockIndex : history.length;

      for (let i = previousBlockIndex + 1; i < currentBlockLimit; i++) {
        const currentDA = Number(history[i].da);

        const prevDA = Number(history[i - 1].da);

        if (currentDA !== prevDA) {
          previousBlockHadRevision = true;
          break;
        }
      }
    }

    // =========================
    // 🔥 FINAL START INDEX
    // =========================
    let startIndex = currentBlockIndex;

    // 🔥 no revision in previous block
    if (!previousBlockHadRevision && previousBlockIndex >= 0) {
      startIndex = previousBlockIndex;
    }

    // 🔥 safety
    if (startIndex < 0) {
      startIndex = 0;
    }
    // =========================
    // 🔥 CALCULATION
    // =========================
    let calcDetails = [];
    let startMonth = '';
    let endMonth = '';
    let totalDAA = 0;
    let totalDAA_TA = 0;

    const oldDApercent = prevDA;
    const newDApercent = inputDA;

    history.forEach((r, i) => {
      //console.log(r.ta)
      const rVal = parseMonthYear(r.month);
      const selVal = parseMonthYear(selectedMonth);

      if (rVal >= selVal) return;
      if (i < startIndex) return;

      const basic = num(r.basic);
      const ta = num(r.ta);

      const oldAmt = Math.round(basic * (oldDApercent / 100));
      const newAmt = Math.round(basic * (newDApercent / 100));
      const diff = newAmt - oldAmt;

      const oldTA = Math.round(ta * (oldDApercent / 100));
      const newTA = Math.round(ta * (newDApercent / 100));
      const diffTA = newTA - oldTA;

      if (diff > 0) {
        totalDAA += diff;
        totalDAA_TA += diffTA;

        const daaRounded = Math.round(diff);
        const daaTArounded = Math.round(diffTA);

        let oldNPSE = 0,
          newNPSE = 0,
          oldNPSC = 0,
          newNPSC = 0,
          diffNPSE = 0,
          diffNPSC = 0;

        if (isNPS) {
          oldNPSE = Math.round((oldAmt + basic) * 0.14);
          newNPSE = Math.round((newAmt + basic) * 0.14);
          oldNPSC = Math.round((oldAmt + basic) * 0.1);
          newNPSC = Math.round((newAmt + basic) * 0.1);
          diffNPSE = newNPSE - oldNPSE;
          diffNPSC = newNPSC - oldNPSC;
        }

        calcDetails.push({
          emp: empName,
          month: r.month,
          basic,
          ta,
          oldDApercent,
          newDApercent,
          oldDA: Math.round(oldAmt),
          newDA: Math.round(newAmt),
          oldTA,
          newTA,
          oldNPSC,
          newNPSC,
          oldNPSE,
          newNPSE,
          diffDA: daaRounded,
          diffTA: daaTArounded,
          diffDAANPSE: diffNPSE,
          diffDAANPSC: diffNPSC,
          type: isGO ? 'GO' : 'NPS'
        });

        const [m] = r.month.split('-');
        if (!startMonth) startMonth = m;
        endMonth = m;
      }
    });

    // =========================
    // 🔥 SET VALUES
    // =========================
    setValue(tr._cells['DAA'], Math.round(totalDAA) || 0);
    setValue(tr._cells['DAA on TA'], Math.round(totalDAA_TA) || 0);
    tr._daaDetails = calcDetails;

    // 🔥 ZERO FIX (IMPORTANT)
    if (!totalDAA && !totalDAA_TA && !tr.dataset.manualEdited) {
      resetDependentFields(tr, table);
      return;
    }

    // =========================
    // 🔹 ARREAR DETAILS (TEXTAREA SAFE)
    // =========================
    const arrearInput = tr._cells['Arrears Details'];

    if (arrearInput) {
      if (totalDAA > 0 && startMonth && endMonth) {
        const year = selectedMonth.split('-')[1];

        const text = `DAA (${prevDA}% to ${inputDA}%) ${startMonth} to ${endMonth} ${year}`;

        // 🔥 update ONLY if:
        // 1. empty OR
        // 2. previously auto-generated
        if (!arrearInput.value || arrearInput.dataset.auto === 'true') {
          arrearInput.value = text;
          arrearInput.dataset.auto = 'true'; // mark as auto
        }
      } else {
        // ❌ no arrear → clear only if auto
        if (arrearInput.dataset.auto === 'true') {
          arrearInput.value = '';
        }
      }
    }

    const daaCell = tr._cells['DAA'];
    const daaTACell = tr._cells['DAA on TA'];

    setValue(daaCell, Math.round(totalDAA) || 0);
    setValue(daaTACell, Math.round(totalDAA_TA) || 0);

    const daa = num(daaCell?.value || daaCell?.innerText || 0);
    const daaTA = num(daaTACell?.value || daaTACell?.innerText || 0);

    // =========================
    // 🔹 GO TABLE
    // =========================
    if (isGO) {
      setValue(getCellInput(tr, 'Total DAA'), Math.round(daa + daaTA));
      return; // ✅ correct exit
    }

    // =========================
    // 🔹 NPS TABLE
    // =========================
    if (isNPS) {
      const daanpseInput = tr._cells['DAA on NPSE'];
      const daanpscInput = tr._cells['DAA on NPSC'];
      const daanpseInput2 = tr._cells['DAA on NPSE ded'];
      const daanpsInput = tr._cells['DAA on NPS'];

      setValue(daanpseInput, Math.round(daa * 0.14));
      setValue(daanpseInput2, Math.round(daa * 0.14));
      setValue(daanpscInput, Math.round(daa * 0.1));
      setValue(daanpsInput, Math.round(daa * 0.14 + daa * 0.1));

      const finalNPSE = Math.round(daa * 0.14);

      const finalNPSC = Math.round(daa * 0.1);

      // 🔥 SET VALUES
      setValue(getCellInput(tr, 'DAA on NPSE ded'), finalNPSE);

      setValue(getCellInput(tr, 'DAA on NPS'), finalNPSE + finalNPSC);

      setValue(getCellInput(tr, 'Total DAA'), Math.round(daa + daaTA + finalNPSE));
    }
    //recalculateAllRows();
  });
}

// =========================
// 🔥 RESET HELPER
// =========================
function resetDependentFields(tr, table) {
  setValue(getCellInput(tr, 'Total DAA'), 0);
  setValue(getCellInput(tr, 'DAA on NPS'), 0);

  const daanpse = tr._cells['DAA on NPSE'];
  const daanpsc = tr._cells['DAA on NPSC'];
  const daanps = tr._cells['DAA on NPS'];
  const daanpse2 = tr._cells['DAA on NPSE ded'];

  if (daanpse) setValue(daanpse, 0);
  if (daanpsc) setValue(daanpsc, 0);
  if (daanps) setValue(daanps, 0);
  if (daanpse2) setValue(daanpse2, 0);
}

function setupManualDAAHandlers() {
  qsa('#PB_NPSEditTbl tbody tr').forEach((tr) => {
    if (!tr._cells) return;
    if (tr.classList.contains('total-row')) return;

    const daaInput = tr._cells['DAA'];
    const daaTAInput = tr._cells['DAA on TA'];
    const daanpseInput = tr._cells['DAA on NPSE'];
    const daanpscInput = tr._cells['DAA on NPSC'];
    const daanpseInput2 = tr._cells['DAA on NPSE ded'];

    if (!daaInput) return;

    if (daaInput.dataset.bound === 'true') return;
    [daaInput, daaTAInput, daanpseInput, daanpscInput, daanpseInput2].forEach((el) => {
      if (el) {
        el.dataset.bound = 'true';
      }
    });

    function recalc(syncNPSEDed = false) {
      tr.dataset.manualEdited = 'true';

      const daa = num(daaInput?.value || 0);
      const daaTA = num(daaTAInput?.value || 0);
      const daaNPSE = num(daanpseInput?.value || 0);
      const daaNPSC = num(daanpscInput?.value || 0);
      const daaNPSE2 = num(daanpseInput2?.value || 0);

      // 🔥 ONLY when NPSE edited
      if (syncNPSEDed) {
        setValue(getCellInput(tr, 'DAA on NPSE ded'), daaNPSE);
      }

      // 🔥 total NPS
      const totalNPS = Math.round(daaNPSE2 + daaNPSC);

      // 🔥 if both zero → total zero
      setValue(getCellInput(tr, 'DAA on NPS'), totalNPS > 0 ? totalNPS : 0);

      // 🔥 total DAA
      setValue(getCellInput(tr, 'Total DAA'), Math.round(daa + daaTA + daaNPSE));

      // 🔥 refresh IT
      calculateITFields(tr);

      // 🔥 refresh Gross/Deduction/Net
      calculateGross_Ded_Net(tr, tr.closest('table')?.id);

      // 🔥 refresh totals
      recalculateAllTotals();
    }

    /* =========================
          🔥 EVENTS
        ========================= */

    // 🔥 NPSE edit → sync deduction
    daanpseInput?.addEventListener('input', () => recalc(true));

    // 🔥 NPSC edit
    daanpscInput?.addEventListener('input', () => recalc(false));

    // 🔥 NPSE DED edit
    daanpseInput2?.addEventListener('input', () => recalc(false));
  });
}

// 🔥============== TO GET DA ARREARS TABLE===========================

function getDAAallRowElements() {
  const goTable = id('PB_GOEditTbl');
  const npsTable = id('PB_NPSEditTbl');

  let all = [];

  if (goTable) {
    goTable.querySelectorAll('tbody tr').forEach((tr) => {
      all.push({ tr });
    });
  }

  if (npsTable) {
    npsTable.querySelectorAll('tbody tr').forEach((tr) => {
      all.push({ tr });
    });
  }

  return all;
}

function ensureTbody(table) {
  if (!table) return null;

  let tbody = table.querySelector('tbody');

  if (!tbody) {
    tbody = document.createElement('tbody');
    table.appendChild(tbody);
  }

  return tbody;
}

function renderDAACalcTables(allRows) {
  const goTable = id('daaGOTableCalculation');
  const npsTable = id('daaNPSTableCalculation');

  const goBody = ensureTbody(goTable);
  const npsBody = ensureTbody(npsTable);

  goBody.innerHTML = '';
  npsBody.innerHTML = '';

  // 🔥 GROUP DATA
  const grouped = {};

  allRows.forEach(({ tr }) => {
    const details = tr._daaDetails || [];

    details.forEach((d) => {
      if (!grouped[d.emp]) {
        grouped[d.emp] = [];
      }

      grouped[d.emp].push(d);
    });
  });

  // 🔥 LOOP EMPLOYEE-WISE
  Object.keys(grouped).forEach((emp) => {
    const rows = grouped[emp];

    rows.forEach((d, index) => {
      qsa('.OldDASpan').forEach((span) => {
        span.textContent = `[DA = ${d.oldDApercent}% ]`;
      });

      qsa('.NewDASpan').forEach((span) => {
        span.textContent = `[ DA = ${d.newDApercent}% ]`;
      });

      const row = document.createElement('tr');

      if (index === rows.length - 1) {
        // 🔥 LAST ROW → SOLID
        row.classList.add('daa-last-row');
      } else {
        // 🔥 INNER ROW → DOTTED
        row.classList.add('daa-row');
      }

      let totalDA = 0;
      let totalTA = 0;
      let totalNPSE = 0;
      let totalNPSC = 0;

      const designation = getDesignation(emp);

      // 🔥 FIRST LOOP → CALCULATE TOTALS
      rows.forEach((d) => {
        totalDA += d.diffDA || 0;
        totalTA += d.diffTA || 0;
        totalNPSE += d.diffDAANPSE || 0;
        totalNPSC += d.diffDAANPSC || 0;
      });

      const totalDAA = totalDA + totalTA;
      const totalNPS = totalNPSE + totalNPSC;
      // ================= GO =================
      if (d.type === 'GO') {
        row.innerHTML = `
               ${index === 0 ? `<td rowspan="${rows.length}" >${emp}<br><span>${designation}</span></td>` : ''}
                <td>${d.month}</td>
                <td>${d.basic}</td>
                <td>${d.ta}</td>
                <td>${d.oldDA}</td>
                <td>${d.oldTA}</td>
                <td>${d.newDA}</td>
                <td>${d.newTA}</td>
                <td>${d.diffDA}</td>
                <td>${d.diffTA}</td>
               <!-- 🔥 ONLY LAST ROW -->
                ${index === 0 ? `<td rowspan="${rows.length}">${totalDA}</td>` : ''}
                ${index === 0 ? `<td rowspan="${rows.length}">${totalTA}</td>` : ''}
                ${index === 0 ? `<td rowspan="${rows.length}">${totalDAA}</td>` : ''}
              `;

        goBody.appendChild(row);
      }

      // ================= NPS =================
      if (d.type === 'NPS') {
        row.innerHTML = `
                ${index === 0 ? `<td rowspan="${rows.length}" >${emp}<br><span>${designation}</span></td>` : ''}
                <td>${d.month}</td>
                <td>${d.basic}</td>
                <td>${d.ta}</td>
                <td>${d.oldDA}</td>
                <td>${d.oldTA}</td>
                <td>${d.oldNPSE}</td>
                <td>${d.oldNPSC}</td>
                <td>${d.newDA}</td>
                <td>${d.newTA}</td>
                <td>${d.newNPSE}</td>
                <td>${d.newNPSC}</td>
                <td>${d.diffDA}</td>
                <td>${d.diffTA}</td>
                <td>${d.diffDAANPSE}</td>
                <td>${d.diffDAANPSC}</td>
                <!-- 🔥 ONLY LAST ROW -->
                ${index === 0 ? `<td rowspan="${rows.length}">${totalDA}</td>` : ''}
                ${index === 0 ? `<td rowspan="${rows.length}">${totalTA}</td>` : ''}
                ${index === 0 ? `<td rowspan="${rows.length}">${totalDAA}</td>` : ''}
                ${index === 0 ? `<td rowspan="${rows.length}">${totalNPS}</td>` : ''}
              `;

        npsBody.appendChild(row);
      }
    });
  });
}

function resetDAAInEditTables() {
  //console.log("🔥 Reset DAA Called")
  isResetMode = true; // 🔥 block calculation

  const goTable = id('daaGOTableCalculation');
  const npsTable = id('daaNPSTableCalculation');

  ensureTbody(goTable).innerHTML = '';
  ensureTbody(npsTable).innerHTML = '';
  ['PB_GOEditTbl', 'PB_NPSEditTbl'].forEach((tableId) => {
    const table = id(tableId);
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');

    rows.forEach((tr) => {
      tr._daaDetails = []; // 🔥 clear cache

      Object.values(tr._cells || {}).forEach((cell) => {
        if (!cell) return;

        const col = cell.getAttribute?.('data-col') || '';

        if (col.includes('DAA') || col.includes('Arrears') || col.includes('Recovery') || col.includes('Reimburse')) {
          if (cell.tagName === 'INPUT') {
            cell.value = 0;
          } else {
            cell.innerText = '0';
          }
        }
      });
    });
  });

  // 🔥 small delay before enabling calculation
  setTimeout(() => {
    isResetMode = false;
  }, 100);
}

function updateAndRenderDAA() {
  if (isResetMode) return;
  // 🔥 1. Recalculate base rows
  recalculateAllRows();

  // 🔥 2. Recalculate DAA (your main engine)
  ['PB_GOEditTbl', 'PB_NPSEditTbl'].forEach((tableId) => {
    const table = id(tableId);
    if (!table) return;

    const rows = [...table.querySelectorAll('tbody tr:not(.total-row)')];
    const rowElements = rows.map((tr) => ({ tr }));

    updateDAAFromPBDB(rowElements); // 🔥 YOUR CORE LOGIC
  });

  // 🔥 3. Render DAA table
  const allRows = getDAAallRowElements();
  renderDAACalcTables(allRows);

  //console.log("DAA render running", allRows);
}

function hasDAAData() {
  function getTotal(tableId) {
    const table = id(tableId);
    if (!table) return 0;

    const headers = table.querySelectorAll('thead th');

    let colIndex = -1;

    headers.forEach((th, i) => {
      const text = th.textContent.toLowerCase().replace(/\s+/g, '');
      if (text === 'totaldaa') colIndex = i;
    });

    if (colIndex === -1) return 0;

    let total = 0;

    table.querySelectorAll('tbody tr').forEach((tr) => {
      const val = tr.children[colIndex]?.textContent || '';
      total += CurrencytoNum(val);
    });

    return total;
  }

  const goTotal = getTotal('PB_GOViewTbl');
  const npsTotal = getTotal('PB_NPSViewTbl');

  return goTotal > 0 || npsTotal > 0;
}

// 🔥==============================================================

function applyGPFRule_GO(tr, empName) {
  const tableId = tr.closest('table')?.id || '';
  if (!tableId.includes('GO')) return;

  const currentMonth = id('PayBillPage_SalMonth')?.value;
  if (!currentMonth) return;

  const currentVal = parseMonthYear(currentMonth);

  /* 🔹 USE CALCULATED DATA (NOT empData) */
  const calcHeaders = window.empCalcHeaders || [];
  const calcRows = window.empCalcRows || [];

  const nameIdx = getColIndex(calcHeaders, 'Employee Name');
  const stationIdx = getColIndex(calcHeaders, 'Station');
  const dorIdx = getColIndex(calcHeaders, 'Superannuation');

  const station = id('PayBillPage_Station')?.value;

  /* 🔹 FIND EMP ROW */
  let dorStr = null;

  for (let i = 0; i < calcRows.length; i++) {
    if (String(calcRows[i][nameIdx]).trim() === String(empName).trim() && String(calcRows[i][stationIdx]).trim() === String(station).trim()) {
      dorStr = calcRows[i][dorIdx];
      break;
    }
  }

  const dorVal = parseDOR(dorStr);

  const next1 = addMonths(currentVal, 1);
  const next2 = addMonths(currentVal, 2);

  const gpfInput = getCellInput(tr, 'GPF');
  if (!gpfInput) return;

  /* 🔥 FINAL CONDITION (UNCHANGED LOGIC) */
  if (dorVal === currentVal || dorVal === next1 || dorVal === next2) {
    let diff = 0;

    if (dorVal === currentVal) diff = 1;
    else if (dorVal === next1) diff = 2;
    else if (dorVal === next2) diff = 3;

    // 🔥 STORE MESSAGE
    if (typeof GPF_MESSAGES !== 'undefined') {
      GPF_MESSAGES.push(`${empName} retiring in ${diff} month${diff > 1 ? 's' : ''}`);
    }

    // 🔥 DISABLE GPF
    gpfInput.value = formatCurrency(0);
    gpfInput.disabled = true;

    gpfInput.style.backgroundColor = '#ffffff';
    gpfInput.style.opacity = '1';
  } else {
    gpfInput.disabled = false;

    gpfInput.style.backgroundColor = '';
    gpfInput.style.opacity = '';
  }
}

function updateGPFMessage() {
  const gpfError = id('GPF_Error');
  if (!gpfError) return;

  if (GPF_MESSAGES.length > 0) {
    const message = GPF_MESSAGES.join(', ') + '. Hence GPF is 0 (disabled).';

    gpfError.textContent = '⚠ ' + message;
  } else {
    gpfError.textContent = '';
  }
}

function renderIncrementDueList() {
  const span = id('Inc_Note');
  if (!span) return;

  if (!pbData?.rows || !pbData?.headers) {
    span.innerText = '';
    return;
  }

  const headers = pbData.headers;
  const rows = pbData.rows;

  const nameIdx = headers.indexOf('Employee Name');
  const incIdx = headers.indexOf('Last Increment');
  const stationIdx = headers.indexOf('Pay Drawn Station');
  const hrisIdx = headers.indexOf('HRIS');
  const salMonthIdx = headers.indexOf('Salary Month');

  const currentMonth = id('PayBillPage_SalMonth')?.value?.trim();
  const currentStation = id('PayBillPage_Station')?.value?.trim();

  if (!currentMonth || currentMonth === 'Select Month') {
    span.innerText = '';
    return;
  }

  // =========================================
  // 🔥 EMP CALC LOOKUP
  // =========================================

  const calcHeaders = window.empCalcHeaders || [];
  const calcRows = window.empCalcRows || [];

  const nameCalc = getColIndex(calcHeaders, 'Employee Name');
  const stationCalc = getColIndex(calcHeaders, 'Station');
  const dorIdx = getColIndex(calcHeaders, 'Superannuation');

  function parseDOR(dorStr) {
    if (!dorStr) return 0;

    const months = {
      Jan: 1,
      Feb: 2,
      Mar: 3,
      Apr: 4,
      May: 5,
      Jun: 6,
      Jul: 7,
      Aug: 8,
      Sep: 9,
      Oct: 10,
      Nov: 11,
      Dec: 12
    };

    const parts = String(dorStr).split(',');
    if (parts.length !== 2) return 0;

    const year = parseInt(parts[1].trim(), 10);
    const monPart = parts[0].split('-')[0].trim();
    const month = months[monPart];

    return year * 100 + month;
  }

  function getEmpDOR(empName, station) {
    const row = calcRows.find((r) => String(r[nameCalc]).trim() === String(empName).trim() && String(r[stationCalc]).trim() === String(station).trim());

    return row ? parseDOR(row[dorIdx]) : 0;
  }

  // =========================================
  // 🔥 SALARY MONTH VALUE
  // =========================================

  const salDate = new Date(currentMonth);
  const salVal = salDate.getFullYear() * 100 + (salDate.getMonth() + 1);

  const selectedMon = currentMonth.substring(0, 3).toUpperCase();

  const dueList = [];
  const dueSet = new Set();

  rows.forEach((r) => {
    const station = String(r[stationIdx] || '').trim();
    if (currentStation && station !== currentStation) return;

    const rowSalMonth = String(r[salMonthIdx] || '').trim();
    if (rowSalMonth !== currentMonth) return;

    const increment = String(r[incIdx] || '').trim();
    const incMonth = increment.substring(0, 3).toUpperCase();

    if (incMonth === selectedMon) {
      const emp = String(r[nameIdx] || '').trim();
      const hris = String(r[hrisIdx] || '').trim();

      // 🔥 Skip retired employees
      const dorVal = getEmpDOR(emp, station);

      if (dorVal && dorVal < salVal) {
        return;
      }

      const empKey = makeEmpKey(emp, hris);

      if (emp && !dueSet.has(empKey)) {
        dueSet.add(empKey);
        dueList.push(emp);
      }
    }
  });

  span.innerHTML = dueList.length
    ? `Increment Due :
              ${dueList
                .map(
                  (emp) => `
                <span style="
                  display:inline-block;
                  background:#dc3545;
                  color:#fff;
                  padding:2px 8px;
                  margin:2px;
                  border-radius:12px;
                  font-weight:600;
                  font-size:11px;
                ">${emp}</span>
              `
                )
                .join('')}`
    : '';
}

function addMonths(val, n) {
  let y = Math.floor(val / 100);
  let m = val % 100;

  m += n;

  while (m > 12) {
    m -= 12;
    y++;
  }

  while (m < 1) {
    m += 12;
    y--;
  }

  return y * 100 + m;
}

function calculateNPS(tr, tableId) {
  const npseInput = getCellInput(tr, 'NPSE');
  const npseDedInput = getCellInput(tr, 'NPSE Ded');
  const npscInput = getCellInput(tr, 'NPSC');
  const npsInput = getCellInput(tr, 'NPS');

  if (!npseInput || !npscInput || !npsInput) return;

  const isNPS = tableId === 'PB_NPSEditTbl';

  // 🔥 GO → always 0
  if (!isNPS) {
    setValue(npseInput, 0);
    setValue(npscInput, 0);
    setValue(npsInput, 0);
    setValue(npseDedInput, 0);
    return;
  }

  // 🔹 Get Basic + DA
  const basic = getNum(tr, 'Basic Pay');
  const da = getNum(tr, 'DA');

  const base = basic + da;

  // 🔹 Calculate
  const npse = Math.round(base * 0.14);
  const npsc = Math.round(base * 0.1);
  const nps = npse + npsc;

  // 🔹 Set values
  setValue(npseInput, npse);
  setValue(npseDedInput, npse);
  setValue(npscInput, npsc);
  setValue(npsInput, nps);
}

function calculateTA(tr) {
  const taEntitled = getCellInput(tr, 'TA Entitled')?.checked;

  const taRateInput = getCellInput(tr, 'TA Rate');
  const daOnTAInput = getCellInput(tr, 'DA on TA');
  const taInput = getCellInput(tr, 'TA');

  if (!taInput) return;

  /* ================= NOT ENTITLED ================= */
  if (!taEntitled) {
    setValue(taRateInput, 0);
    setValue(daOnTAInput, 0);
    setValue(taInput, 0);
    return;
  }

  /* ================= INPUTS ================= */

  const taZone = id('PayBillPage_TAZone')?.value || '';
  const payLevel = getCellValue(tr, 'Pay Level');
  const qsText = getCellValue(tr, 'Qualifying Service');
  const disability = getCellInput(tr, 'Disability')?.checked;
  const disabilityLevel = getCellValue(tr, 'Level of Disability');

  const rawDA = num(id('PayBillPage_DA%')?.value);
  const daPercent = Math.min(rawDA, 150);

  /* ================= CPC LOOKUP ================= */

  if (!cpcData || !cpcData.headers || !cpcData.rows) return;

  const headers = cpcData.headers;
  const rows = cpcData.rows;

  const colIndex = headers.indexOf(payLevel);
  if (colIndex === -1) return;

  let baseTA = 0;

  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(taZone).trim()) {
      baseTA = num(rows[i][colIndex]);
      break;
    }
  }

  /* ================= QUALIFYING SERVICE ================= */

  let years = 0;
  if (qsText) {
    const match = qsText.match(/(\d+)Y/);
    if (match) years = parseInt(match[1]);
  }

  /* ================= MULTIPLIERS ================= */

  let multiplier = 1;

  // Pay Level rule
  if (['1', '2'].includes(String(payLevel))) {
    multiplier *= 2;
  }

  // Disability rule
  if (disability) {
    if (disabilityLevel.includes('>80%')) multiplier *= 3;
    else if (disabilityLevel.includes('>40%')) multiplier *= 2;
  }

  /* ================= FINAL ================= */

  const taRate = baseTA * multiplier;
  const daOnTA = (daPercent / 100) * taRate;
  const ta = taRate + daOnTA;

  setValue(taRateInput, taRate);
  setValue(daOnTAInput, daOnTA);
  setValue(taInput, ta);

  recalculateAllTotals();
}

function calculateHRA(tr) {
  const hraEntitled = getCellInput(tr, 'HRA Entitled')?.checked;

  const hraInput = getCellInput(tr, 'HRA');
  const lfeeInput = getCellInput(tr, 'L Fee');
  const wchInput = getCellInput(tr, 'W Ch');

  if (!hraInput || !lfeeInput || !wchInput) return;

  const basic = getNum(tr, 'Basic Pay');
  const rawDA = num(id('PayBillPage_DA%')?.value);
  const daPercent = Math.min(rawDA, 150);

  /* ================= HRA ENTITLED ================= */

  if (hraEntitled) {
    const zone = id('PayBillPage_HRAZone')?.value || '';

    let percent = 0;

    if (zone === 'X') percent = 28;
    else if (zone === 'Y') percent = 18;
    else percent = 8;

    // 🔥 DA BOOST
    if (daPercent >= 50) percent += 2;
    else if (daPercent >= 25) percent += 1;

    const hra = (basic * percent) / 100;

    setValue(hraInput, hra);
    setValue(lfeeInput, 0);
    setValue(wchInput, 0);

    return;
  }

  /* ================= QTRS LOOKUP ================= */

  const qtrsType = getCellValue(tr, 'Qtrs Type');

  if (!qtrsData || !qtrsData.headers || !qtrsData.rows) return;

  const rows = qtrsData.rows;

  let lfee = 0;
  let wch = 0;

  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(qtrsType).trim()) {
      lfee = num(rows[i][2]);
      wch = num(rows[i][3]);
      break;
    }
  }

  setValue(hraInput, 0);
  setValue(lfeeInput, lfee);
  setValue(wchInput, wch);
}

function calculateCGEIS(tr, tableId) {
  const cgeisInput = getCellInput(tr, 'CGEIS');
  if (!cgeisInput) return;

  const isGO = tableId === 'PB_GOEditTbl';

  /* =========================
       🔹 NPS → always 0
      ========================= */
  if (!isGO) {
    setValue(cgeisInput, 0);
    return;
  }

  /* =========================
       🔹 NAME FETCH
      ========================= */
  const name = tr.children[1]?.textContent?.trim() || '';
  if (!name) return;

  /* =========================
       🔹 VALIDATE empData
      ========================= */
  if (!empData || !window.empCalcHeaders || !window.empCalcRows) return;

  const headers = window.empCalcHeaders;
  const rows = window.empCalcRows;

  const nameIndex = getColIndex(headers, 'Employee Name');
  const groupIndex = getColIndex(headers, 'Group');

  if (nameIndex === -1 || groupIndex === -1) return;

  let amount = 0;

  /* =========================
       🔹 LOOKUP (FIXED)
      ========================= */
  for (let i = 0; i < rows.length; i++) {
    const empName = String(rows[i][nameIndex] || '').trim();

    if (empName.replace(/\s+/g, '').toLowerCase() === name.replace(/\s+/g, '').toLowerCase()) {
      const group = String(rows[i][groupIndex] || '').trim();
      const firstLetter = group.charAt(0).toUpperCase();

      if (firstLetter === 'A') amount = 120;
      else if (firstLetter === 'B') amount = 60;
      else if (firstLetter === 'C') amount = 30;

      break;
    }
  }

  /* =========================
       🔹 SET VALUE
      ========================= */
  setValue(cgeisInput, amount);
}

function monthToNumber(monthStr) {
  if (!monthStr) return Infinity;

  // 🔥 convert to string always
  monthStr = String(monthStr);

  if (!monthStr.includes('-')) return Infinity;

  const [mon, year] = monthStr.split('-');

  const map = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12
  };

  return parseInt(year) * 12 + (map[mon] || 0);
}

function normalizeMonthFormat(dateStr) {
  if (!dateStr) return null;

  // Example: May-31,2027 → May-2027
  const parts = dateStr.split(',');

  if (parts.length === 2) {
    const year = parts[1].trim();
    const month = parts[0].split('-')[0].trim();
    return `${month}-${year}`;
  }

  return dateStr; // already correct
}

const DEBUG_EMP = 'Abhijin P. R.'; // 🔥 change anytime

function calculateMonthlyIT(empHRIS, selectedFY, regime, currentMonth) {
  // 🔥 STEP 1: Get tax calculation (you already have this logic somewhere)
  const taxData = calculateEmployeeTax(empHRIS, selectedFY, regime);

  const totalTDS = taxData.totalTDS || 0;
  const netTax = taxData.netTax || 0;
  const paidMonthCount = taxData.paidMonthCount || 0;

  // 🔥 STEP 2: Pending Tax
  const pendingTDS = netTax - totalTDS;

  const remainingMonths = 12 - paidMonthCount;

  if (pendingTDS <= 0) {
    return {
      netTax,
      it: 0,
      cess: 0,
      total: 0
    };
  }

  // 🔥 STEP 3: MONTHLY CALCULATION (YOUR FORMULA)
  let it = Math.round(pendingTDS / (1.04 * remainingMonths), 0);
  let cess = Math.round(it * 0.04, 0);
  let total = it + cess;

  // 🔥 EXTRA SAFETY
  if (!isFinite(it)) it = 0;
  if (!isFinite(cess)) cess = 0;
  if (!isFinite(total)) total = 0;

  //console.table({
  //  empName: empName,
  //  netTax: netTax,
  //  it:it,
  //  cess:cess,
  //  total:total,
  //})
  return {
    netTax,
    it,
    cess,
    total
  };
}

function getEditTableEmployees() {
  const tableIds = ['PB_GOEditTbl', 'PB_NPSEditTbl'];
  const empIndex = pbData.headers.indexOf('Employee Name');

  const names = new Set();

  tableIds.forEach((tblId) => {
    const table = id(tblId);
    if (!table) return;

    table.querySelectorAll('tbody tr').forEach((tr) => {
      const cell = tr.children[empIndex];
      if (!cell) return;

      const name = cell.innerText.trim();
      if (name) names.add(name);
    });
  });

  return [...names];
}

function calculateITFields(tr) {
  const itInput = getCellInput(tr, 'IT');
  const cessInput = getCellInput(tr, 'Cess@4%');
  const netITInput = getCellInput(tr, 'Net IT');

  if (!itInput || !cessInput || !netITInput) return;

  /* =========================
       🔹 SAFE VALUE (HELPER)
      ========================= */
  const it = num(itInput.dataset?.raw ?? itInput.value);

  /* =========================
       🔹 CALCULATE
      ========================= */
  const cess = Math.round(it * 0.04);
  const netIT = it + cess;

  /* =========================
       🔹 SET VALUES
      ========================= */
  setValue(cessInput, cess);
  setValue(netITInput, netIT);
}

function calculateGross_Ded_Net(tr, tableId) {
  /* =========================
      🔹 GROSS INCOME
      ========================= */
  const gross = getNum(tr, 'Basic Pay') + getNum(tr, 'DA') + getNum(tr, 'TA') + getNum(tr, 'HRA') + getNum(tr, 'NPSE') + getNum(tr, 'Bonus') + getNum(tr, 'CEA') + getNum(tr, 'EL Encash') + getNum(tr, 'Uni All') + getNum(tr, 'Total DAA') + getNum(tr, 'Medical Reimburse') + getNum(tr, 'LTA Reimburse') + getNum(tr, 'Arrears');

  setValue(getCellInput(tr, 'Gross Income'), gross);

  /* =========================
       🔹 TOTAL DEDUCTION
      ========================= */
  const deduction = getNum(tr, 'Net IT') + getNum(tr, 'GPF') + getNum(tr, 'NPSC') + getNum(tr, 'NPSE ded') + getNum(tr, 'DAA on NPSE ded') + getNum(tr, 'DAA on NPSC') + getNum(tr, 'CGEIS') + getNum(tr, 'LIC') + getNum(tr, 'L Fee') + getNum(tr, 'W Ch') + getNum(tr, 'C ADV') + getNum(tr, 'SC ADV') + getNum(tr, 'F ADV') + getNum(tr, 'REC P & A') + getNum(tr, 'TR CH') + getNum(tr, 'AIR & TV CHE SOC') + getNum(tr, 'DWR SOCIETY') + getNum(tr, 'AKA CLUB') + getNum(tr, 'ASSO SUB') + getNum(tr, 'Prof Tax') + getNum(tr, 'Recovery');

  setValue(getCellInput(tr, 'Total Deduction'), deduction);

  /* =========================
       🔹 NET INCOME
      ========================= */
  const net = gross - deduction;

  setValue(getCellInput(tr, 'Net Income'), net);
}

function recalculateTableTotals(table) {
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr:not(.total-row)');
  const totalRow = table.querySelector('tr.total-row');

  if (!rows.length || !totalRow) return;

  // 🔥 get headers from DOM (same order as selectedHeaders)
  const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());

  const basicIndex = headers.findIndex((h) => h === 'Basic Pay');
  const netIndex = headers.findIndex((h) => h === 'Net Income');

  if (basicIndex === -1 || netIndex === -1) return;

  const sums = Array(headers.length).fill(0);

  // 🔥 calculate like your logic
  rows.forEach((tr) => {
    const cells = tr.querySelectorAll('td');

    cells.forEach((td, i) => {
      if (i >= basicIndex && i <= netIndex) {
        const input = td.querySelector('input, select');
        const val = input ? num(input.value) : num(td.textContent);

        sums[i] += val || 0;
      }
    });
  });

  // 🔥 update total row
  const totalCells = totalRow.querySelectorAll('td');

  totalCells.forEach((td, i) => {
    if (i === 0) {
      td.textContent = 'Total';
    } else if (i >= basicIndex && i <= netIndex) {
      td.textContent = formatCurrency(sums[i] || 0);
    } else {
      td.textContent = '';
    }
  });
}

function recalculateAllTotals() {
  recalculateTableTotals(id('PB_GOEditTbl'));
  recalculateTableTotals(id('PB_NPSEditTbl'));
}

function recalculateRow(tr, tableId) {
  updateDARow(tr);
  calculateTA(tr);
  calculateHRA(tr);
  calculateCGEIS(tr, tableId);
  calculateNPS(tr, tableId);
  calculateITFields(tr);
  calculateGross_Ded_Net(tr, tableId);
}

function recalculateAllRows() {
  qsa('#PB_GOEditTbl tbody tr:not(.total-row), #PB_NPSEditTbl tbody tr:not(.total-row)').forEach((tr) => {
    recalculateRow(tr, tr.closest('table')?.id);
  });

  recalculateAllTotals(); // ✅ only once
}

function getNextMonthStr(current) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [mon, yearStr] = current.split('-');
  let year = Number(yearStr);

  let idx = months.indexOf(mon);
  if (idx === -1) return current;

  // Feb → Mar (same year)
  if (mon === 'Feb') return `Mar-${year}`;

  idx++;

  if (idx >= 12) {
    idx = 0;
    year++;
  }

  return `${months[idx]}-${year}`;
}

function getPreviousMonthStr(current) {
  if (typeof current !== 'string') {
    current = String(current?.value || current || '');
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [mon, yearStr] = current.split('-');
  let year = Number(yearStr);

  let idx = months.indexOf(mon);
  if (idx === -1) return current;

  idx--;

  if (idx < 0) {
    idx = 11;
    year--;
  }

  return `${months[idx]}-${year}`;
}

function updateFYDropdown(monthStr) {
  const fyEl = id('PayBillPage_FY');
  if (!fyEl || !monthStr) return;

  const [mon, yearStr] = monthStr.split('-');
  const year = Number(yearStr);

  let fyStart, fyEnd;

  // 🔥 FY: Mar → Feb
  if (['Jan', 'Feb'].includes(mon)) {
    fyStart = year - 1;
    fyEnd = year;
  } else {
    fyStart = year;
    fyEnd = year + 1;
  }

  // 🔥 FORMAT → YYYY-YY
  const fy = `${fyStart}-${String(fyEnd).slice(-2)}`;

  // 🔥 CHECK EXISTING
  let exists = Array.from(fyEl.options).some((opt) => opt.value === fy);

  if (!exists) {
    const opt = document.createElement('option');
    opt.value = fy;
    opt.textContent = fy;
    fyEl.appendChild(opt);

    //console.log("Added FY:", fy);
  }

  fyEl.value = fy;
}

function refreshPBView(forceMode = null) {
  const station = id('PayBillPage_Station')?.value;
  const fy = id('PayBillPage_FY')?.value;
  const month = id('PayBillPage_SalMonth')?.value;

  if (!station) return; // 🔥 CLEAR TABLES
  ['PB_GOEditTbl', 'PB_NPSEditTbl', 'PB_GOViewTbl', 'PB_NPSViewTbl'].forEach((idName) => {
    const el = id(idName);
    if (el) el.innerHTML = '';
    if (el) el.style.display = 'none';
  });

  const wrapper = qs('.PB-Table-Wrapper');

  // 🔥 FORCE MODE IF PROVIDED
  let isEditMode;
  if (forceMode === 'edit') {
    isEditMode = true;
    wrapper?.classList.add('edit-mode');
  } else if (forceMode === 'view') {
    isEditMode = false;
    wrapper?.classList.remove('edit-mode');
  } else {
    isEditMode = wrapper?.classList.contains('edit-mode');
  }

  if (isEditMode) {
    ['PB_GOEditTbl', 'PB_NPSEditTbl'].forEach((idName) => {
      const el = id(idName);
      if (el) el.style.display = 'table';
    });

    createPayBillEditTables();
    setupManualDAAHandlers();
    recalculateAllRows();
    recalculateAllTotals();
  } else {
    ['PB_GOViewTbl', 'PB_NPSViewTbl'].forEach((idName) => {
      const el = id(idName);
      if (el) el.style.display = 'table';
    });

    createPayBillViewTables(station, fy, month);
  }

  setDAPercent();
}

// =========================================
// 🔥 TEMP ADD MODE TRACKERS
// =========================================
let addedPBMonth = '';
let previousPBMonth = '';

on('PBaddBtn', 'click', async () => {
  const monthEl = id('PayBillPage_SalMonth');
  const station = id('PayBillPage_Station')?.value;

  if (!monthEl || !station) return;

  isEditMode = false;

  // =====================================
  // 🔥 FIRST CLICK
  // =====================================
  if (!isAddMode) {
    isAddMode = true;

    // 🔥 ENTER EDIT MODE UI
    document.body.classList.add('edit-mode');

    // 🔥 DISABLE SIDEBAR
    qsa('.menu-list button').forEach((btn) => {
      btn.disabled = true;
    });
    id('logoutBtn').disabled = true;

    // =====================================
    // 🔥 FIND LATEST MONTH FOR STATION
    // =====================================

    const monthIdx = getColIndex(pbData.headers, 'Salary Month');

    const stationIdx = getColIndex(pbData.headers, 'Pay Drawn Station');

    const stationMonths = pbData.rows
      .filter((r) => String(r[stationIdx]).trim() === String(station).trim())
      .map((r) => parseMonthYear(r[monthIdx]))
      .filter(Boolean);

    if (!stationMonths.length) return;

    const latestVal = Math.max(...stationMonths);

    function monthValToStr(val) {
      const year = Math.floor(val / 100);
      const month = val % 100;

      return new Date(year, month - 1, 1)
        .toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })
        .replace(' ', '-');
    }

    const latestMonth = monthValToStr(latestVal);

    const nextMonth = getNextMonthStr(latestMonth);

    // 🔥 TRACK TEMP MONTH
    previousPBMonth = latestMonth;
    addedPBMonth = nextMonth;

    // 🔥 COPY DATA
    copyPreviousMonthData(nextMonth, station);
    addNewEmployeesFromEmpDB(nextMonth, station);

    // 🔥 UPDATE FILTERS
    filters.station = String(station).trim();
    filters.month = String(nextMonth).trim();
    filters.fy = getFinancialYear(nextMonth);
    // 🔥 FORCE GLOBAL MONTH
    window.forcePBMonth = nextMonth;
    // 🔥 APPLY FILTERS
    applyFilters();

    // 🔥 FORCE MONTH AFTER FILTER REBUILD
    const el = id('PayBillPage_SalMonth');
    if (el) {
      // 🔥 ADD OPTION
      const exists = [...el.options].some((o) => String(o.value).trim() === nextMonth);
      if (!exists) {
        el.appendChild(createEl('option', { value: nextMonth, text: nextMonth }));
      }

      // 🔥 FORCE VALUE
      el.value = nextMonth;

      // 🔥 FORCE FILTER
      filters.month = nextMonth;

      // 🔥 FORCE INDEX
      const optionIndex = [...el.options].findIndex((o) => String(o.value).trim() === nextMonth);
      if (optionIndex >= 0) {
        el.selectedIndex = optionIndex;
      }
    }

    // 🔥 REFRESH VIEW
    resetDAAInEditTables();
    refreshPBView();

    // =====================================
    // 🔥 FY DROPDOWN UPDATE
    // =====================================

    updateFYDropdown(nextMonth);

    // =====================================
    // 🔥 FORCE SELECT AFTER ALL REBUILDS
    // =====================================

    setTimeout(() => {
      const sel = id('PayBillPage_SalMonth');

      if (!sel) return;

      // 🔥 FIND OPTION
      const option = [...sel.options].find((o) => String(o.value).trim() === nextMonth);

      if (option) {
        sel.value = nextMonth;

        sel.selectedIndex = [...sel.options].indexOf(option);

        filters.month = nextMonth;
      }
    }, 50);

    return;
  }

  // =====================================
  // 🔥 SAVE
  // =====================================
  setSyncStatus('pbDatabase');
  await savePBData('ADD');

  // 🔥 RESET TEMP TRACKERS
  addedPBMonth = '';
  previousPBMonth = '';
});
/* =========================
            🔥 EDIT BUTTON
            ========================= */

on('PBeditBtn', 'click', async () => {
  const monthEl = id('PayBillPage_SalMonth');

  const station = id('PayBillPage_Station')?.value;

  if (!monthEl || !station) return;

  isAddMode = false;

  /* ================= SAVE ================= */

  if (isEditMode) {
    setupManualDAAHandlers();

    setSyncStatus('pbDatabase');

    await savePBData('EDIT');

    return;
  }

  /* ================= ENTER EDIT MODE ================= */

  isEditMode = true;

  /* 🔥 SHOW EDIT TABLES */

  qs('.PB-Table-Wrapper')?.classList.add('edit-mode');

  /* 🔥 DISABLE SIDEBAR */

  qsa('.menu-list button').forEach((btn) => {
    btn.disabled = true;
  });

  id('logoutBtn').disabled = true;

  /* =========================
              🔥 SAVE ORIGINAL SNAPSHOT
              ========================= */

  const goSnapshot = getTableData('PB_GOEditTbl', 'GO', monthEl.value, station, id('PayBillPage_DA%').value, 'EDIT');

  const npsSnapshot = getTableData('PB_NPSEditTbl', 'NPS', monthEl.value, station, id('PayBillPage_DA%').value, 'EDIT');

  window.originalPBEditData = JSON.stringify({
    go: goSnapshot,
    nps: npsSnapshot
  });
});

/* =========================
      🔥 CANCEL BUTTON
      ========================= */

on('PBcancelBtn', 'click', () => {
  /* =====================================
        🔥 NOT IN EDIT/ADD MODE
        ===================================== */

  if (!isEditMode && !isAddMode) {
    showCustomAlert('ℹ️ No edit session active');

    return;
  }

  /* =====================================
        🔥 CONFIRM
        ===================================== */
  const noBtn = id('logoutNoBtn');

  if (noBtn) {
    noBtn.style.display = 'block';
  }
  showConfirmBox({
    title: 'Discard Changes',

    icon: '⚠️',

    message: 'Discard all unsaved changes?',

    subMessage: 'All edited values will be lost.',

    yesText: 'Discard',

    noText: 'Continue Editing',

    yesColor: '#dc2626',

    onYes: () => {
      /* =================================
            🔥 RESTORE SNAPSHOT
            ================================= */

      if (isEditMode && window.originalPBEditData) {
        try {
          const snapshot = JSON.parse(window.originalPBEditData);

          /* =========================
                🔥 RESTORE DATA
                ========================= */

          window.pbDataRows = window.pbDataRows || [];
        } catch (err) {
          console.warn('Snapshot restore failed', err);
        }
      }

      // =========================================
      // 🔥 REMOVE TEMP ADDED MONTH
      // =========================================

      if (isAddMode && addedPBMonth) {
        const monthEl = id('PayBillPage_SalMonth');

        if (monthEl) {
          const option = [...monthEl.options].find((o) => String(o.value).trim() === addedPBMonth);

          // 🔥 REMOVE OPTION
          if (option) {
            option.remove();
          }

          // 🔥 RESTORE OLD MONTH
          monthEl.value = previousPBMonth;

          monthEl.dispatchEvent(
            new Event('change', {
              bubbles: true
            })
          );
        }

        const monthIdx = pbData.headers.indexOf('Salary Month');
        // 🔥 REMOVE TEMP ROWS
        pbData.rows = pbData.rows.filter((r) => String(r[monthIdx]).trim() !== addedPBMonth);

        // 🔥 RESET
        addedPBMonth = '';

        previousPBMonth = '';
      }

      /* =================================
            🔥 EXIT MODE
            ================================= */

      exitPBEditMode();
    }
  });
});

function exitPBEditMode() {
  isAddMode = false;
  isEditMode = false;

  document.body.classList.remove('edit-mode');

  qs('.PB-Table-Wrapper')?.classList.remove('edit-mode');

  id('PBeditBtn')?.resetPBToggle?.();

  id('PBaddBtn')?.resetPBToggle?.();

  qsa('.menu-list button').forEach((btn) => {
    btn.disabled = false;
  });

  id('logoutBtn').disabled = false;

  // 🔥 FORCE VIEW TABLE REFRESH
  applyFilters();

  refreshPBView();

  id('Inc_Note').innerHTML = '';

  // 🔥 FORCE REPAINT
  requestAnimationFrame(() => {
    refreshPBView();
  });
}

/* =========================
              🔹 EMP LOOKUP
          ========================= */

function getEmpLookupData() {
  const empHeaders = window.empCalcHeaders || [];
  const empRows = window.empCalcRows || [];
  return {
    empHeaders,
    empRows,
    empNameIdx: empHeaders.indexOf('Employee Name'),
    hrisIdx: empHeaders.indexOf('HRIS'),
    stationIdx: empHeaders.indexOf('Station'),
    designationIdx: empHeaders.indexOf('Designation')
  };
}

function getHRIS(empName, station) {
  const { empRows, empNameIdx, hrisIdx, stationIdx } = getEmpLookupData();
  for (let r of empRows) {
    if (String(r?.[empNameIdx] || '').trim() === String(empName || '').trim() && String(r?.[stationIdx] || '').trim() === String(station || '').trim()) {
      return r?.[hrisIdx] || '';
    }
  }
  return '';
}

function getEmpDesignation(empName, station, hris) {
  const { empRows, hrisIdx, designationIdx } = getEmpLookupData();
  const clean = (v) =>
    String(v || '')
      .replace(/\s+/g, '')
      .toLowerCase();
  const cleanHRIS = clean(hris);
  for (let r of empRows) {
    const rowHRIS = clean(r?.[hrisIdx]);
    if (cleanHRIS && rowHRIS === cleanHRIS) {
      return r?.[designationIdx] || '';
    }
  }
  return '';
}

/* =========================
            🔹 TABLE DATA
            ========================= */

function getTableData(tableId, type, salaryMonth, station, daPercent, mode) {
  const table = id(tableId);
  if (!table) return [];

  const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.innerText.trim());
  const rows = table.querySelectorAll('tbody tr');
  let data = [];

  rows.forEach((tr) => {
    // Skip total rows
    if (tr.innerText.toLowerCase().includes('total')) return;

    const cells = tr.querySelectorAll('td');
    let rowObj = {};

    headers.forEach((h, i) => {
      const cell = cells[i];
      rowObj[h] = cell ? getPBCellValue(cell, h) : '';
    });

    // 1. Force standard fields
    rowObj['Salary Month'] = salaryMonth;
    rowObj['Pay Drawn Station'] = station;
    rowObj['DA%'] = daPercent;
    rowObj['Category'] = type;

    // 2. Resolve HRIS
    const empName = rowObj['Employee Name'];
    const empStation = rowObj['Pay Drawn Station'];
    // 2. Resolve HRIS
    rowObj['HRIS'] = rowObj['HRIS'] || getHRIS(empName, empStation);

    rowObj['HRIS'] = rowObj['HRIS'] || getHRIS(empName, empStation);

    // =========================================
    // 🔥 DESIGNATION LOGIC
    // ADD  -> fetch from empCalc
    // EDIT -> preserve existing DB value
    // =========================================

    if (mode === 'ADD') {
      rowObj['Designation on Salary Month'] = getEmpDesignation(empName, empStation, rowObj['HRIS']);
    } else {
      delete rowObj['Designation on Salary Month'];
    }

    // 4. Clean up misc
    rowObj['Arrears Details'] = rowObj['Arrears Details'] || '';
    rowObj['Recovery Details'] = rowObj['Recovery Details'] || '';

    data.push(rowObj);
  });

  return data;
}

/* =========================
              🔹 CLEAN NUMBER
              ========================= */

function cleanNumber(val) {
  return String(val || '')
    .replace(/[₹,]/g, '')
    .trim();
}

/* =========================
              🔹 CELL VALUE
              ========================= */

function getPBCellValue(cell, colName) {
  if (!cell) return '';

  /* 🔹 TEXTAREA */
  if (colName === 'Arrears Details' || colName === 'Recovery Details') {
    const textarea = cell.querySelector('textarea');
    return textarea ? textarea.value.trim() : '';
  }

  /* 🔹 CHECKBOX */
  const checkbox = cell.querySelector("input[type='checkbox']");
  if (checkbox) {
    // Force conversion to a consistent string match for the backend
    return checkbox.checked ? 'TRUE' : 'FALSE';
  }

  /* 🔹 INPUT */
  const input = cell.querySelector("input:not([type='checkbox'])");
  if (input) return cleanNumber(input.value);

  /* 🔹 SELECT */
  const select = cell.querySelector('select');
  if (select) return select.value || '';
  return cleanNumber(cell.textContent || '');
}

/* ============================================================================
          ⚡ HIGH-SPEED PAYROLL TRANSACTION COMMIT ENGINE (Finalized Production Build)
      ============================================================================ */
async function savePBData(mode = 'ADD') {
  const salaryMonth = id('PayBillPage_SalMonth')?.value;
  const station = id('PayBillPage_Station')?.value;
  const daPercent = id('PayBillPage_DA%')?.value;

  if (!salaryMonth || !station) {
    showCustomAlert('❌ Month or Station missing');
    return;
  }

  const goData = getTableData('PB_GOEditTbl', 'GO', salaryMonth, station, daPercent, mode);
  const npsData = getTableData('PB_NPSEditTbl', 'NPS', salaryMonth, station, daPercent, mode);
  const currentData = [...goData, ...npsData];

  // 🔥 ROBUST CLIENT-SIDE DIFFING
  if (window.originalPBEditData) {
    const original = JSON.parse(window.originalPBEditData);
    const originalFlat = [...original.go, ...original.nps];
    const hasChanges = currentData.some((newRow, idx) => {
      const oldRow = originalFlat[idx];
      if (!oldRow) return true;
      return Object.keys(newRow).some((key) => String(newRow[key]).trim() !== String(oldRow[key] || '').trim());
    });

    if (!hasChanges) {
      showCustomAlert('ℹ️ No changes detected locally.');
      return;
    }
  }

  try {
    setSyncStatus('pbDatabase');
    showLoader();
    updateLoader(20, 'Sending data to server...', 'cloud_upload');

    /* 🔥 EXECUTE NETWORK FETCH */
    const res = await fetch('https://office-management-f425.onrender.com/pb/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: currentData, mode })
    });

    const result = await res.json();

    /* ℹ️ NO CHANGES */
    if (result.status === 'nochange') {
      clearSyncStatus('pbDatabase');
      exitPBEditMode();
      hideLoader();
      showCustomAlert('ℹ️ No changes detected.<br><br>No data was modified.');
      return;
    }

    /* ✅ TRANSACTION SUCCESS */
    if (result.status === 'success') {
      updateLoader(70, 'Syncing local cache...', 'sync');

      await fetch('https://office-management-f425.onrender.com/refresh/pb', { method: 'POST' });
      await syncPBtoSBG();
      await loadTable('pb', 'PBDB');
      applyFilters();
      refreshPBView();
      exitPBEditMode();

      updateLoader(100, 'Saved successfully!', 'check_circle');
      setTimeout(hideLoader, 1000);

      // Build success HTML
      let htmlBuffer = '';
      const updated = result.updatedEmployees || [];
      const added = Array.isArray(result.addedEmployees) ? result.addedEmployees : [];

      if (updated.length > 0) {
        htmlBuffer += '<div style="font-size:13px;font-weight:700;color:#7dffb3;margin-bottom:18px;text-align:center">📝 PAYBILL EDIT SUCCESS!</div>';
        for (const e of updated) {
          let colsHtml = (e.changedColumns || []).map((c) => `<span style="display:inline-block;padding:2px 4px;margin:3px;border-radius:10px;background:rgba(255,255,255,0.08);font-size:13px;">🔃 ${c}</span>`).join('');
          htmlBuffer += `<div style="margin-bottom:16px;padding:8px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:13px;font-weight:700;margin-bottom:10px;">🧑‍💼 ${e.employee} <span style="opacity:.7;font-size:12px;">(${e.month})</span></div><div style="display:flex;flex-wrap:wrap;gap:4px;">${colsHtml}</div></div>`;
        }
      }

      if (added.length > 0) {
        htmlBuffer += '<div style="font-size:13px;font-weight:700;color:#7dffb3;margin-bottom:18px;text-align:center">➕ PAYBILL ADD SUCCESS!</div>';
        for (const e of added) {
          htmlBuffer += `<div style="padding:10px 14px;margin-bottom:10px;border-radius:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">🧑‍💼 ${e.employee} <span style="opacity:.7;font-size:13px;">(${e.month})</span></div>`;
        }
      }

      setTimeout(() => showCustomAlert(htmlBuffer || '✅ Data updated successfully.'), 450);
      return;
    }

    /* ⚠️/❌ ERRORS */
    hideLoader();
    clearSyncStatus('pbDatabase', 'db', false);
    const errorMsg = result.status === 'conflict' ? '⚠️ Some rows were modified by another user.<br><br>Please reload and try again.' : `❌ Error: ${result.message || 'Unknown error'}`;
    showCustomAlert(errorMsg);
  } catch (err) {
    console.error(err);
    hideLoader();
    clearSyncStatus('pbDatabase', 'db', false);
    showCustomAlert('❌ Server error: Unable to complete save.');
  }
}

const daInput = id('PayBillPage_DA%');
const errorEl = id('DA_Error');

['input', 'change'].forEach((evt) => {
  daInput.addEventListener(evt, () => {
    let value = parseFloat(daInput.value);
    if (isNaN(value)) value = 0;

    // =========================
    // 🔹 ERROR DISPLAY
    // =========================
    if (value > 150) {
      errorEl && (errorEl.textContent = '❌ DA exceeded 150% (calculated upto 150%)');
    } else if (value > 100) {
      errorEl && (errorEl.textContent = '⚠ DA exceeded 100%');
    } else {
      if (errorEl) errorEl.textContent = '';
    }

    // =========================
    // 🔥 RESET AUTO FLAGS
    // =========================
    qsa('#PB_NPSEditTbl tbody tr').forEach((tr) => {
      const npse = tr._cells?.['DAA on NPSE'];
      const npse2 = tr._cells?.['DAA on NPSE ded'];
      const npsc = tr._cells?.['DAA on NPSC'];
      const nps = tr._cells?.['DAA on NPS'];

      if (npse) npse.dataset.auto = 'true';
      if (npse2) npse2.dataset.auto = 'true';
      if (npsc) npsc.dataset.auto = 'true';
      if (nps) nps.dataset.auto = 'true';
    });

    // =========================
    // 🔥 STEP ORDER (CRITICAL)
    // =========================
    updateDAColumn(value);
    updateAndRenderDAA(); // 2️⃣ updates DAA based on new DA
    setupManualDAAHandlers();
    recalculateAllRows(); // 1️⃣ updates DA, TA, HRA, etc.
    recalculateAllTotals(); // 3️⃣ FINAL totals
  });
});

/* ================================================================== 🔥🔥🔥🔥 HELPERS 🔥🔥🔥🔥 =====================================================================*/
function createEl(tag, props = {}, children = []) {
  const el = document.createElement(tag);

  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v);
  });

  children.forEach((child) => el.appendChild(child));
  return el;
}

function clearEl(el) {
  if (typeof el === 'string') el = id(el);
  if (el) el.innerHTML = '';
}

/* ========================= CLASS HELPERS ========================= */
function addClass(el, cls) {
  if (typeof el === 'string') el = id(el);
  el?.classList.add(cls);
}

function removeClass(el, cls) {
  if (typeof el === 'string') el = id(el);
  el?.classList.remove(cls);
}

function toggleClass(el, cls) {
  if (typeof el === 'string') el = id(el);
  el?.classList.toggle(cls);
}

/* ========================= EVENT HELPERS ========================= */
function on(el, event, handler) {
  if (typeof el === 'string') el = id(el);
  el?.addEventListener(event, handler);
}

/* ========================= DATA HELPERS ========================= */
function groupBy(arr, key) {
  return arr.reduce((acc, obj) => {
    const k = obj[key];
    (acc[k] = acc[k] || []).push(obj);
    return acc;
  }, {});
}

function unique(arr, key) {
  return [...new Map(arr.map((item) => [item[key], item])).values()];
}

/* ========================= FORMAT HELPERS ========================= */

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-IN');
}

function formatCurrency(num) {
  return '₹ ' + formatNumber(num);
}

function CurrencytoNum(val) {
  if (!val) return 0;

  return (
    Number(
      String(val).replace(/[^0-9.-]+/g, '') // 🔥 remove ₹ , spaces etc
    ) || 0
  );
}

function setValue(input, val) {
  if (!input) return;
  input.dataset.raw = val;
  input.value = formatCurrency(val);
}

function getNum(tr, col) {
  const el = getCellInput(tr, col);
  return num(el?.dataset?.raw ?? el?.value);
}

function parseMonthYear(str) {
  if (!str || typeof str !== 'string') return 0;

  const parts = str.split('-');
  if (parts.length !== 2) return 0;

  const [mon, year] = parts;

  const months = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12
  };

  return parseInt(year) * 100 + (months[mon] || 0);
}

function formatMonthDisplay(val) {
  if (!val) return '';

  const [year, month] = val.split('-');
  const d = new Date(year, month - 1);

  const monthStr = d.toLocaleString('en-US', { month: 'short' });

  return `${monthStr}-${year}`; // ✅ MMM-YYYY
}

function formatMonthForInput(val) {
  if (!val) return '';

  const d = new Date(val);
  if (isNaN(d)) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`; // ✅ correct YYYY-MM
}

function parseDOR(dorStr) {
  if (!dorStr) return 0;

  const months = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12
  };

  const parts = String(dorStr).split(',');
  if (parts.length !== 2) return 0;

  const year = parseInt(parts[1].trim());
  const monPart = parts[0].split('-')[0];
  const month = months[monPart];

  return year * 100 + month;
}

function getCellInput(tr, colName, type = null) {
  const normalize = (str) => String(str).replace(/\s+/g, '').toLowerCase();

  const cells = tr.querySelectorAll('td');

  for (let td of cells) {
    const col = td.getAttribute('data-col');

    if (normalize(col) === normalize(colName)) {
      // 🔥 auto detect input/select
      if (!type) {
        return td.querySelector('input, select');
      }

      return td.querySelector(type);
    }
  }

  return null;
}

function getCellValue(tr, colName) {
  const input = getCellInput(tr, colName);

  if (!input) return '';

  // 🔥 ALWAYS prefer raw value
  if (input.dataset && input.dataset.raw !== undefined) {
    return input.dataset.raw;
  }

  return input.value;
}
/* ========================= AFE VALUE HELPERS ========================= */
function val(v, def = '') {
  return v === null || v === undefined ? def : v;
}

function num(v) {
  return Number(String(v).replace(/[^\d.-]/g, '')) || 0;
}

function number(val) {
  return String(val || '')
    .replace(/[₹,]/g, '')
    .trim();
}

/* ========================= VISIBILITY HELPERS ========================= */
function show(el) {
  if (typeof el === 'string') el = id(el);
  if (el) el.style.display = 'block';
}

function hide(el) {
  if (typeof el === 'string') el = id(el);
  if (el) el.style.display = 'none';
}

function getColIndex(headers, name) {
  return headers.findIndex((h) => h.toLowerCase().trim() === name.toLowerCase());
}
/* ========================= DEBUG ========================= */
function log(...args) {
  console.log(...args);
}

/* ================= PRINT TABLE ================= */
function buildPrintPayBillTable(type) {
  const table = id(type === 'GO' ? 'PB_GOViewTbl' : 'PB_NPSViewTbl');
  if (!table) return '';

  const headers = Array.from(table.querySelectorAll('thead th'));
  const rows = Array.from(table.querySelectorAll('tbody tr:not(.total-row)'));
  const totalRow = table.querySelector('tbody tr.total-row');

  const wrapper = table.parentNode;
  const titleDiv = wrapper.previousElementSibling;
  const titleText = titleDiv?.textContent || '';

  if (!rows.length) return '';

  /* ================= NORMALIZE ================= */
  function normalize(h) {
    return String(h)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  /* ================= PREVIOUS MONTH ================= */
  function getPrevMonthFormatted(monthStr) {
    const d = new Date(monthStr);
    d.setMonth(d.getMonth() - 1);

    return d
      .toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
      .replace(' ', '-'); // Apr-2025
  }

  const currentMonth = id('PayBillPage_SalMonth')?.value;
  const prevMonth = getPrevMonthFormatted(currentMonth);

  //console.log("Current Month:", currentMonth);
  //console.log("Previous Month:", prevMonth);

  /* ================= PREVIOUS DATA ================= */
  const prevHeaders = pbData.headers || [];
  const prevRows = pbData.rows || [];

  const nameIndex = getColIndex(prevHeaders, 'Employee Name');
  const monthIndex = getColIndex(prevHeaders, 'Salary Month');

  const prevMap = {};

  for (let i = 0; i < prevRows.length; i++) {
    const rowMonth = String(prevRows[i][monthIndex] || '').trim();

    const name = String(prevRows[i][nameIndex] || '')
      .replace(/\s+/g, '')
      .toLowerCase();

    if (rowMonth === prevMonth && name) {
      prevMap[name] = prevRows[i];
    }
  }

  //console.log("PrevMap:", prevMap);

  /* ================= HEADER MAP ================= */
  const prevHeaderMap = {};
  prevHeaders.forEach((h, i) => {
    prevHeaderMap[normalize(h)] = i;
  });

  /* ================= SUM ================= */
  const sums = Array(headers.length).fill(0);

  rows.forEach((tr) => {
    headers.forEach((_, i) => {
      const raw = tr.children[i]?.textContent || '';

      const num = CurrencytoNum(raw) || 0;

      sums[i] += num;
    });
  });

  /* ================= COLUMN FILTER ================= */
  const activeCols = headers.map((th, i) => {
    const h = th.textContent.trim();
    const col = normalize(h);

    const sumVal = sums[i] || 0; // 🔥 normalize value
    //console.log(`Column: ${h}, Sum: ${sumVal}`);

    if (h === 'Employee Name') return true;

    if (['recovery', 'netit', 'tarate', 'daonta', 'nps', 'daaonta', 'daa', 'daaonnpse', 'daaonnpsc', 'daaonnpseded'].includes(col)) return false;

    if (type === 'GO' && ['npse', 'npseded', 'npsc', 'daaonnps'].includes(col)) return false;

    if (type === 'NPS' && ['cgeis', 'gpf'].includes(col)) return false;

    const zeroCols = ['bonus', 'cea', 'elencash', 'uniall', 'totaldaa', 'medicalreimburse', 'ltareimburse', 'arrears'];

    // 🔥 Special NPS logic
    if (type === 'NPS' && ['daaonnps'].includes(col)) {
      return sumVal !== 0;
    }

    // 🔥 FIXED zero check
    if (zeroCols.includes(col) && sumVal === 0) {
      return false;
    }

    return true;
  });

  const colCount = activeCols.filter(Boolean).length + 1;

  /* ================= HTML ================= */
  let html = `
          <div class="title">${titleText}</div>
          <table>
            <thead>
              <tr>
                <th>Sr No.</th>
        `;

  headers.forEach((th, i) => {
    if (!activeCols[i]) return;

    let h = th.textContent.trim();

    if (h === 'Employee Name') h = 'Name / Designation';

    html += `<th>${h}</th>`;
  });

  html += `
              </tr>
            </thead>
            <tbody>
              <tr class="spacer-row">
                <td colspan="${colCount}"></td>
              </tr>
        `;

  /* ================= ROWS ================= */
  let srNo = 1;

  rows.forEach((tr) => {
    html += '<tr>';

    const empName = String(tr.children[1]?.textContent || '')
      .replace(/\s+/g, '')
      .toLowerCase();

    html += `<td>${srNo++}</td>`;

    headers.forEach((th, i) => {
      if (!activeCols[i]) return;

      const headerName = th.textContent.trim();
      const cleanHeader = normalize(headerName);

      let val = tr.children[i]?.textContent?.trim() || '';

      let raw = val.replace(/[^\d.-]/g, '');
      let currVal = raw !== '' && !isNaN(raw) ? Number(raw) : null;

      let style = '';

      /* 🔥 COMPARE */
      if (empName && prevMap[empName] && currVal !== null) {
        if (!['grossincome', 'totaldeduction', 'netincome'].includes(cleanHeader)) {
          const prevColIndex = prevHeaderMap[cleanHeader];

          if (prevColIndex !== undefined) {
            const prevRow = prevMap[empName];

            const prevVal = parseFloat(String(prevRow[prevColIndex]).replace(/[^\d.-]/g, ''));

            if (!isNaN(prevVal) && prevVal !== currVal) {
              style = `style="background:yellow;font-weight:bold;"`;
            }
          }
        }
      }

      if (headerName === 'Employee Name') {
        const cleanName = val.replace(/\s+/g, ' ').trim();
        const d = getDesignation(cleanName);
        val = d ? `${cleanName}, ${d}` : cleanName;
      }

      if (currVal !== null) val = currVal;

      html += `<td ${style}>${val}</td>`;
    });

    html += '</tr>';
  });

  /* ================= TOTAL ================= */
  if (totalRow) {
    html += `
            <tr class="spacer-row">
              <td colspan="${colCount}"></td>
            </tr>
          `;

    html += "<tr style='font-weight:bold;'>";

    html += `<td style="border-right:none;height:22px;"></td>`;

    headers.forEach((th, i) => {
      if (!activeCols[i]) return;

      let val = totalRow.children[i]?.textContent?.trim() || '';

      let raw = val.replace(/[^\d.-]/g, '');
      if (raw !== '' && !isNaN(raw)) {
        val = Number(raw);
      }

      if (i === 0) {
        html += `<td style="border-left:none">Total</td>`;
      } else {
        html += `<td>${val}</td>`;
      }
    });

    html += '</tr>';
  }

  html += `
            </tbody>
          </table>
        `;

  return html;
}

/* ================= PRINT HTML ================= */
function buildPrintPayBillHTML(goHTML, npsHTML) {
  const doc = document.implementation.createHTMLDocument('Pay Bill');

  // ===== STYLE =====
  const style = doc.createElement('style');
  style.textContent = `
            @page {
                size: A4 landscape;
                margin-top: 5mm;
                margin-right: 5mm;
                margin-left: 5mm;
                margin-bottom: 10mm; /* 🔥 increase bottom */
                background: white !important;
              }

            * { font-family: "Inter", Arial, Helvetica, sans-serif; font-size: 11px;padding:0;margin:0}

            body{padding:5px 5px;background: white !important;}

            .header {
              display: flex;
              align-items: center;
              gap: 15px;
              margin:5px 0px;
              border-bottom:solid 1px black;
              justify-content: space-between;
              position: relative;
            }

            .footer {
              text-align: right;
              margin-top: 80px;
              margin-right: 20px;
              font-size: 12px;
              line-height: 1.6;
              font-weight:bold;
            }

            .header img { height: 60px; }

            .header-text {
              text-align: center;
              flex: 1;
            }

            .header-right {
              width: 100px;
              font-size: 11px;
              text-align: right;
            }

            .header-right td{
              border:none;
            }

            .header-right td:nth-child(2) {
              font-weight: bold;
              background: #f1f5f9;
            }

            .header-text h1 { margin: 0; font-size: 12px;font-family:"Arial" }
            .header-text h2 { margin: 0; font-size: 12px;font-family:"Arial"  }
            .header-text h3 { margin: 0; font-size: 12px;border:solid 2px black;padding:4px 8px;width:max-content;margin:auto;font-family:"Arial"  }

            table {
              width: 100%;               /* 🔥 content-based width */
              table-layout: auto;        /* 🔥 natural sizing */
              border-collapse: collapse;
              margin: 0 auto;
              background: white !important;
            }

            td:nth-child(2) {
              max-width: 300px;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            td:nth-child(1) {
              max-width: 15px;
            }

            th {
              white-space: normal;        /* ✅ allow wrapping */
              word-break: break-word;     /* ✅ break long words */
              text-align: center;
              background: #f1f5f9;
              border:solid 1px black;
              padding:2px 4px;
              font-size: 11px;
            }

            td {
              white-space: nowrap;        /* ✅ keep compact */
              width: auto;
              min-width:25px;
              border:solid 1px black;
              padding:2px 4px;
            }
            .title{
              text-align:center;
              width:100%;
              height:20px;
              font-size:12px;
              font-weight:bold;
              padding:5px 5px;
            }

            .spacer-row td {
              padding:10px;
              border: none !important;
            }

            /* SCREEN VIEW (default) */
            .page-break {
              height: 50px; /* BIG GAP on screen */
            }

            /* PRINT VIEW */
            @media print {
              .page-break {
                height: 10px;              /* SMALL GAP in print */
                page-break-before: always; /* force new page */
              }

              body{padding:2px;}

              .header {margin:0px;}

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              td[style*="background"] {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              td {
                background-clip: padding-box;
              }
            }
        `;
  doc.head.appendChild(style);

  // ===== PAGE 1 =====
  const div1 = doc.createElement('div');
  div1.innerHTML = buildHeader() + goHTML + buildFooter();

  // ===== PAGE BREAK =====
  const br = doc.createElement('div');
  br.className = 'page-break';

  // ===== PAGE 2 =====
  const div2 = doc.createElement('div');
  div2.innerHTML = buildHeader() + npsHTML + buildFooter();

  doc.body.appendChild(div1);
  doc.body.appendChild(br);
  doc.body.appendChild(div2);

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

/* ================= HEADER ================= */
function buildHeader() {
  var month = id('PayBillPage_SalMonth')?.value || '';
  var station = id('PayBillPage_Station')?.value || '';
  var da = id('PayBillPage_DA%')?.value || '';
  var hrazone = id('PayBillPage_HRAZone')?.value || '';

  var daPercent = Math.min(num(da), 150);
  let hrapercent = 0;

  if (hrazone === 'X') hrapercent = 28;
  else if (hrazone === 'Y') hrapercent = 18;
  else if (hrazone === 'Z') hrapercent = 8;

  if (daPercent >= 50) hrapercent += 2;
  else if (daPercent >= 25) hrapercent += 1;

  return `
              <div class="header">

                <img src="https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l">

                <div class="header-text">
                  <h1>PRASAR BHARATI</h1>
                  <h2>INDIA'S PUBLIC SERVICE BROADCASTER</h2>
                  <h3>${station}</h3>
                </div>

                <div class="header-right">
                  <table class="header-table">
                    <tr>
                      <td>Month</td>
                      <td>${month}</td>
                    </tr>
                    <tr>
                      <td>DA</td>
                      <td>${da}%</td>
                    </tr>
                    <tr>
                      <td>HRA</td>
                      <td>${hrapercent}%</td>
                    </tr>
                  </table>
                </div>

              </div>
            `;
}

/* ================= FOOTER ================= */
function buildFooter() {
  var today = new Date().toLocaleDateString();
  var station = id('PayBillPage_Station')?.value || '';
  return ["<div class='footer'>", 'Programme Executive<br>', station, '<br>', 'Date: ', today, '</div>'].join('');
}

function getDesignation(empName) {
  if (!empData || !window.empCalcHeaders || !window.empCalcRows) return '';

  const headers = window.empCalcHeaders;
  const rows = window.empCalcRows;

  const nameIndex = getColIndex(headers, 'Employee Name');
  const desigIndex = getColIndex(headers, 'Designation');

  if (nameIndex === -1 || desigIndex === -1) return '';

  const cleanInput = String(empName).replace(/\s+/g, '').toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][nameIndex] || '')
      .replace(/\s+/g, '')
      .toLowerCase();

    if (name === cleanInput) {
      let d = String(rows[i][desigIndex] || '').toUpperCase();

      // 🔥 SHORT NAMES
      if (d === 'STECH') return 'Sr.Tech';
      if (d === 'TECH') return 'Tech';
      if (d === 'MTR DRIVER') return 'M Driver';
      if (d === 'HELPER') return 'Helper';

      return rows[i][desigIndex];
    }
  }

  return '';
}

function buildPrintDAAHTML() {
  const doc = document.implementation.createHTMLDocument('Pay Bill');

  // 🔥 GET TABLES DIRECTLY HERE
  const goTable = id('daaGOTableCalculation')?.outerHTML || '';
  const npsTable = id('daaNPSTableCalculation')?.outerHTML || '';

  // ===== STYLE =====
  const style = doc.createElement('style');
  style.textContent = `
              @page {
                size: A4 landscape;
                margin-top: 5mm;
                margin-right: 5mm;
                margin-left: 5mm;
                margin-bottom: 10mm; /* 🔥 increase bottom */
              }

              *{font-size: 11px;font-family: "Inter", Arial, Helvetica, sans-serif;}

              .footer {
                text-align: right;
                margin-top: 80px;
                margin-right: 20px;
                font-size: 12px;
                font-weight: bold;
              }

              .page-break {
                height: 50px;
              }

              .daaArrearsTbl {
                border-collapse: collapse;
                display: none;
                width: 100%;
              }

              .daaArrearsTbl th {
                border-bottom: 1.5px solid black;
              }

              .daaArrearsTbl th,
              .daaArrearsTbl td {
                padding: 2px 4px;
                text-align: left;
                border-right: 1px dashed #9ca3af;
              }

              /* 🔹 inner rows */
              .daa-row td {
                border-bottom: 1px dashed #9ca3af;
              }

              /* 🔹 last row (employee end) */
              .daa-last-row td {
                border-bottom: 1.5px solid #000;
              }

              /* 🔥 force merged cells */
              .daaArrearsTbl td[rowspan] {
                border-bottom: 1.5px solid black !important;
              }

              .daaArrearsTbl td[rowspan]:first-child, .daaArrearsTbl th[rowspan]:first-child  {
                border-left: 1.5px solid black;
              }

              .daaArrearsTbl td[rowspan]:last-child, .daaArrearsTbl th[rowspan]:last-child {
                border-right: 1.5px solid black;
              }

              .daaArrearsTbl th[colspan]{
                border-bottom: 1px dashed #9ca3af;
                text-align: center;
              }

              thead {
                display: table-header-group; /* 🔥 repeat header on every page */
              }

              .header-container{
                display: flex;
                align-items: center;
                padding: 5px;
              }

              .header-container img {
                height: 50px;
                margin-right: 15px;    /* space between image & text */
              }

              .header-text {
                text-align: center;
                flex-direction: column;
                flex: 1;
              }

              .header-text h1 { margin: 0; font-size: 12px;font-family:"Arial" }
              .header-text h2 { margin: 0; font-size: 12px;font-family:"Arial"  }
              .header-text h3 { margin: 0; font-size: 12px;border:solid 2px black;padding:4px 8px;width:max-content;margin:auto;font-family:"Arial"  }

              @media print {
                body { padding: 2px; }

                .header { margin: 0; }

                .daaArrearsTbl{
                  display:table;
                }

                .page-break {
                  height: 0;
                  page-break-before: always;
                  break-before: page;
                }

                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `;
  doc.head.appendChild(style);

  // ===== PAGE 1 =====
  const div1 = doc.createElement('div');
  div1.innerHTML = goTable + buildFooter();

  // ===== PAGE BREAK =====
  const br = doc.createElement('div');
  br.className = 'page-break';

  // ===== PAGE 2 =====
  const div2 = doc.createElement('div');
  div2.innerHTML = npsTable + buildFooter();

  doc.body.appendChild(div1);
  doc.body.appendChild(br);
  doc.body.appendChild(div2);

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

function openPrintWindow(html) {
  const win = window.open('', '_blank');

  if (!win) {
    showCustomAlert('Allow Popups for this website to enable printing');
    return;
  }

  win.document.open();
  win.document.write(html);

  win.document.write(`
          <script>
            window.onafterprint = function() {
              window.close();
            };

            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 100);
            };
          <\/script>
        `);

  win.document.close();
}

const pbmenu = id('PBprintMenu');
const pbprintBtn = id('PBprintBtn');
const pbexcelBtn = id('PBexcelBtn');

// 🔹 PRINT BUTTON
pbprintBtn.addEventListener('click', (e) => {
  e.stopPropagation();

  updatePBPrintMenuState();

  qsa('.print-option').forEach((el) => (el.style.display = 'block'));
  qsa('.excel-option').forEach((el) => (el.style.display = 'none'));

  pbmenu.classList.add('show'); // ✅ ALWAYS OPEN
});

// 🔹 EXCEL BUTTON
pbexcelBtn.addEventListener('click', (e) => {
  e.stopPropagation();

  updatePBPrintMenuState();

  qsa('.print-option').forEach((el) => (el.style.display = 'none'));
  qsa('.excel-option').forEach((el) => (el.style.display = 'block'));

  pbmenu.classList.add('show'); // ✅ ALWAYS OPEN
});

// 🔹 CLOSE
document.addEventListener('click', () => {
  pbmenu.classList.remove('show');
});

function updatePBPrintMenuState() {
  const hasDAA = hasDAAData();

  const printDAA = id('daaPrintOption');
  const excelDAA = id('daaExcelOption'); // ✅ FIXED ID

  [printDAA, excelDAA].forEach((opt) => {
    if (!opt) return;

    if (hasDAA) {
      opt.classList.remove('disabled');
    } else {
      opt.classList.add('disabled');
    }
  });
}

qsa('.menu-option').forEach((opt) => {
  opt.addEventListener('click', function () {
    const type = this.dataset.type;

    pbmenu.classList.remove('show');

    // ===== PAY BILL PRINT =====
    if (type === 'pdf-paybill') {
      const goHTML = buildPrintPayBillTable('GO');
      const npsHTML = buildPrintPayBillTable('NPS');

      if (!goHTML) return showCustomAlert('🚫 No Pay Bill data');

      openPrintWindow(buildPrintPayBillHTML(goHTML, npsHTML));
    }

    // ===== DAA PRINT =====
    if (type === 'pdf-daa') {
      refreshPBView('edit');
      updateAndRenderDAA();

      const daaGO = id('daaGOTableCalculation')?.outerHTML || '';
      const daaNPS = id('daaNPSTableCalculation')?.outerHTML || '';

      if (!daaGO && !daaNPS) {
        showCustomAlert('🚫 No DAA data');
        refreshPBView('view');
        return;
      }

      openPrintWindow(buildPrintDAAHTML(daaGO, daaNPS));

      setTimeout(() => refreshPBView('view'), 0);
    }

    // ===== PAY BILL EXCEL ✅ FIXED =====
    if (type === 'excel-paybill') {
      generatePayBillExcel(); // 🔥 NO async/await
    }

    // ===== DAA EXCEL =====
    if (type === 'excel-daa') {
      refreshPBView('edit');
      updateAndRenderDAA();

      setTimeout(() => {
        generateDAAExcel(); // OK (sync)
        refreshPBView('view');
      }, 50);
    }
  });
});

function getBase64Image(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(this, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };

    img.src = url;
  });
}

async function generateDAAExcel() {
  const workbook = new ExcelJS.Workbook();

  async function addTableSheet(tableId, workbook, sheetName) {
    const sheet = workbook.addWorksheet(sheetName);
    const table = id(tableId);
    if (!table) return;

    const rows = Array.from(table.rows);
    const occupied = {};

    rows.forEach((tr, r) => {
      let cIndex = 0;

      tr.querySelectorAll('th, td').forEach((cell) => {
        while (occupied[`${r}-${cIndex}`]) cIndex++;

        let html = cell.innerHTML || '';

        let value = html
          // 🔥 convert block tags to line breaks
          .replace(/<\/?(h1|h2|h3|div|p)[^>]*>/gi, '\n')

          // 🔥 convert <br>
          .replace(/<br\s*\/?>/gi, '\n')

          // 🔥 remove remaining tags
          .replace(/<[^>]+>/g, '')

          // 🔥 fix nbsp
          .replace(/&nbsp;/gi, ' ')

          // 🔥 remove extra spaces around newlines
          .replace(/\s*\n\s*/g, '\n')

          // 🔥 remove duplicate newlines
          .replace(/\n+/g, '\n')

          .trim();

        // 🔥 FIX 1: DO NOT convert header / name column
        const isHeader = cell.tagName === 'TH';
        const isFirstCol = cIndex === 0;
        const isSecondCol = cIndex === 1;
        const totalCols = sheet.columnCount || 25; // fallback safe

        if (!isHeader && !isFirstCol && !isSecondCol) {
          const numVal = CurrencytoNum(value);
          if (!isNaN(numVal) && value !== '') {
            value = numVal;
          }
        }

        const isLastRow = tr.classList.contains('daa-last-row');
        const isRowspanCell = cell.rowSpan && cell.rowSpan > 1;
        const isLastCol = cIndex === totalCols - 1; // 🔥 define totalCols earlier

        const excelCell = sheet.getRow(r + 1).getCell(cIndex + 1);
        excelCell.value = value;

        // 🔥 BASE BORDER (BOTTOM)
        let border = {};

        if (isLastRow || isRowspanCell) {
          border.bottom = { style: 'thin' };
          border.right = { style: 'dotted' };
          border.left = { style: 'dotted' };
        } else {
          border.bottom = { style: 'dotted' };
          border.left = { style: 'dotted' };
          border.right = { style: 'dotted' };
        }

        // 🔥 LEFT BORDER (first column)
        if (isFirstCol) {
          border.left = { style: 'thin' };
        }

        // 🔥 RIGHT BORDER (last column)
        if (isLastCol) {
          border.right = { style: 'thin' };
        }

        excelCell.border = border;
        excelCell.font = { size: 9.5 };

        // 🔥 ALIGNMENT
        excelCell.alignment = {
          vertical: typeof value === 'number' ? 'middle' : 'middle',
          horizontal: typeof value === 'number' ? 'right' : 'left',
          wrapText: true
        };

        // 🔥 HEADER STYLE
        if (isHeader) {
          excelCell.font = { bold: true };
          excelCell.alignment = { horizontal: 'center' };
        }

        const rowspan = parseInt(cell.rowSpan) || 1;
        const colspan = parseInt(cell.colSpan) || 1;

        if (rowspan > 1 || colspan > 1) {
          sheet.mergeCells(r + 1, cIndex + 1, r + rowspan, cIndex + colspan);
        }

        for (let i = 0; i < rowspan; i++) {
          for (let j = 0; j < colspan; j++) {
            occupied[`${r + i}-${cIndex + j}`] = true;
          }
        }

        cIndex += colspan;
      });
    });
    [
      { row: 1, height: 67, size: 11 },
      { row: 2, height: 44, size: 10 },
      { row: 3, height: 32, size: 9.5 },
      { row: 4, height: 32, size: 9.5 }
    ].forEach(({ row, height, size }) => {
      const r = sheet.getRow(row);

      r.height = height;

      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };

        cell.font = {
          bold: true,
          size: size || 9.5,
          name: 'calibri'
        };

        // 🔥 CONDITIONAL BORDER
        if (row === 1) {
          // ONLY bottom border
          cell.border = {
            top: { style: 'none' },
            left: { style: 'none' },
            bottom: { style: 'medium' },
            right: { style: 'none' }
          };
        } else {
          // FULL borders
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      });
    });

    /* =========================
        🔥 AUTO WIDTH (REAL FIX)
      ========================= */
    sheet.columns.forEach((col, i) => {
      let maxLength = 5;

      col.eachCell({ includeEmpty: true }, (cell) => {
        let val = cell.value ? cell.value.toString() : '';

        // 🔥 handle multiline
        val.split('\n').forEach((line) => {
          maxLength = Math.max(maxLength, line.length);
        });
      });

      // 🔥 LIMIT WIDTH (IMPORTANT)
      if (i === 0) {
        col.width = Math.min(maxLength + 2, 28); // name column
      } else if (i === 1) {
        col.width = Math.min(maxLength + 2, 9); // name column
      } else {
        col.width = Math.min(maxLength + 2, 7); // other columns
      }
    });

    /* =========================
        🔥 ADD IMAGE (LOGO)
      ========================= */
    const img = table.querySelector('img');

    if (img && img.src) {
      const base64 = await getBase64Image(img.src);

      const imageId = workbook.addImage({
        base64: base64,
        extension: 'png'
      });

      sheet.addImage(imageId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 65, height: 65 }
      });
    }

    /* =========================
        🔥 FOOTER
      ========================= */
    const lastRow = rows.length + 5;
    const lastCol = sheet.columnCount;

    const station = id('PayBillPage_Station')?.value || '';
    const today = new Date().toLocaleDateString('en-GB');

    function footerRow(r, text) {
      sheet.mergeCells(r, 1, r, lastCol);
      const cell = sheet.getCell(r, 1);
      cell.value = text;
      cell.alignment = { horizontal: 'right' };
      cell.font = { bold: true, size: 10 };
    }

    footerRow(lastRow, 'Programme Executive');
    footerRow(lastRow + 1, station);
    footerRow(lastRow + 2, `Date: ${today}`);

    /* =========================
        🔥 LANDSCAPE
      ========================= */
    const lastColLetter = sheet.getColumn(lastCol).letter;

    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      showGridLines: false,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: false,
      horizontalCentered: true, // Center on page
      verticalCentered: false,

      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2
      }
    };
    sheet.views = [{ showGridLines: false }];
    sheet.pageSetup.printArea = `A1:${lastColLetter}${lastRow + 2}`;
  }

  await addTableSheet('daaGOTableCalculation', workbook, 'GO');
  await addTableSheet('daaNPSTableCalculation', workbook, 'NPS');

  const station = id('PayBillPage_Station')?.value || 'Station';

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `DAA Bill-${station}.xlsx`;
  link.click();
}

async function generatePayBillExcel() {
  const month = id('PayBillPage_SalMonth')?.value || '';
  const station = id('PayBillPage_Station')?.value || '';
  const today = new Date().toLocaleDateString('en-GB');

  const goHTML = buildPrintPayBillTable('GO');
  const npsHTML = buildPrintPayBillTable('NPS');

  const da = id('PayBillPage_DA%')?.value || '';
  const hrazone = id('PayBillPage_HRAZone')?.value || '';

  const daPercent = Math.min(num(da), 150);

  let hrapercent = 0;
  if (hrazone === 'X') hrapercent = 28;
  else if (hrazone === 'Y') hrapercent = 18;
  else if (hrazone === 'Z') hrapercent = 8;

  if (daPercent >= 50) hrapercent += 2;
  else if (daPercent >= 25) hrapercent += 1;

  const workbook = new ExcelJS.Workbook();

  /* ===== COLUMN LETTER FIX (A → Z → AA...) ===== */
  function getExcelCol(n) {
    let s = '';
    while (n > 0) {
      let m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - m) / 26);
    }
    return s;
  }

  async function createSheet(html, name) {
    const sheet = workbook.addWorksheet(`PayBill-${name}`);
    const station = id('PayBillPage_Station').value;

    /* ===== LOGO ===== */
    const response = await fetch('https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l');
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    const imageId = workbook.addImage({
      buffer,
      extension: 'png'
    });

    sheet.addImage(imageId, {
      tl: { col: 1, row: 0 },
      ext: { width: 65, height: 65 }
    });

    /* ===== EXTRACT TABLE ===== */
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const table = temp.querySelector('table');

    const rows = Array.from(table.rows);

    // 🔥 Find HRIS column index
    let hrisIndex = -1;
    let srIndex = -1;

    const headerCells = rows[0].cells;

    for (let i = 0; i < headerCells.length; i++) {
      const text = headerCells[i].innerText.trim();

      if (text === 'HRIS') hrisIndex = i;
      if (text === 'Sr No' || text === 'Sr No.' || text === 'Sr') srIndex = i;
    }

    /* 🔥 FIX: get MAX column count */
    let colCount = 0;
    rows.forEach((r) => {
      colCount = Math.max(colCount, r.cells.length);
    });

    if (hrisIndex !== -1) colCount--; // remove HRIS

    const lastColLetter = getExcelCol(colCount);

    // 🔥 Header Info Table (Right Side)
    const labelStartCol = colCount - 3; // 2 cols before last 2
    const valueStartCol = colCount - 1; // last 2 cols
    const mergeLastCol = colCount - 4; // remaining left side

    // 🔥 ROW 1 → MONTH
    sheet.mergeCells(1, labelStartCol, 1, labelStartCol + 1);
    sheet.mergeCells(1, valueStartCol, 1, valueStartCol + 1);

    sheet.getCell(1, labelStartCol).value = 'Month';
    sheet.getCell(1, valueStartCol).value = month;

    // 🔥 ROW 2 → DA
    sheet.mergeCells(2, labelStartCol, 2, labelStartCol + 1);
    sheet.mergeCells(2, valueStartCol, 2, valueStartCol + 1);

    sheet.getCell(2, labelStartCol).value = 'DA';
    sheet.getCell(2, valueStartCol).value = da + '%';

    // 🔥 ROW 3 → HRA
    sheet.mergeCells(3, labelStartCol, 3, labelStartCol + 1);
    sheet.mergeCells(3, valueStartCol, 3, valueStartCol + 1);

    sheet.getCell(3, labelStartCol).value = 'HRA';
    sheet.getCell(3, valueStartCol).value = hrapercent + '%';

    for (let r = 1; r <= 3; r++) {
      // Label (2 merged cols)
      let labelCell = sheet.getCell(r, labelStartCol);
      labelCell.font = { bold: true };
      labelCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Value (2 merged cols)
      let valueCell = sheet.getCell(r, valueStartCol);
      valueCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Apply border across full 4-column block
      for (let c = labelStartCol; c <= valueStartCol + 1; c++) {
        const cell = sheet.getCell(r, c);

        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    /* ===== HEADER ===== */
    const titleText = `MANUAL BILL OF SALARY PAYMENT, DEDUCTIONS / RECOVERIES & NET PAYMENT FOR THE MONTH OF ${month.toUpperCase()} IN r/o ALL ${name} STAFF`;
    const safeLastColLetter = getExcelCol(mergeLastCol);

    sheet.mergeCells(`A1:${safeLastColLetter}1`);
    sheet.getCell('A1').value = 'PRASAR BHARATI';
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.getCell('A1').font = { bold: true, size: 11 };

    sheet.mergeCells(`A2:${safeLastColLetter}2`);
    sheet.getCell('A2').value = "INDIA'S PUBLIC SERVICE BROADCASTER";
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.mergeCells(`A3:${safeLastColLetter}3`);
    sheet.getCell('A3').value = 'ALL INDIA RADIO';
    sheet.getCell('A3').alignment = { horizontal: 'center' };
    sheet.getCell('A3').font = { bold: true, size: 11 };

    sheet.mergeCells(`A4:${safeLastColLetter}4`);
    const cellA4 = sheet.getCell('A4');
    cellA4.value = `${station}`; // ✅ FIX
    cellA4.alignment = { horizontal: 'center' };
    cellA4.font = { bold: true, size: 11 };

    sheet.mergeCells(`A5:${lastColLetter}5`);
    sheet.getCell('A5').border = { top: { style: 'medium' } };
    sheet.getRow(5).height = 5;

    sheet.mergeCells(`A6:${lastColLetter}6`);
    sheet.getCell('A6').value = titleText;
    sheet.getCell('A6').alignment = {
      horizontal: 'center',
      wrapText: true
    };
    sheet.getCell('A6').font = { bold: true, size: 11 };

    sheet.mergeCells(`A7:${lastColLetter}7`);
    sheet.getRow(7).height = 5;

    /* ===== TABLE ===== */
    let startRow = 8;

    rows.forEach((tr, i) => {
      const excelRow = sheet.getRow(startRow + i);

      let excelCol = 1;

      for (let j = 0; j < tr.cells.length; j++) {
        if (j === hrisIndex) continue; // 🔥 skip both

        const td = tr.cells[j];
        const cell = excelRow.getCell(excelCol); // ✅ FIX

        let val = td ? td.innerText.trim() : '';

        const styleAttr = td?.getAttribute('style') || '';
        const isYellow = styleAttr.includes('background');
        const isBold = styleAttr.includes('font-weight');

        const num = parseFloat(val.replace(/,/g, ''));
        cell.value = isNaN(num) ? val : num;

        if (val !== '') {
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        }

        cell.font = { size: 10 };

        if (i === 0) {
          cell.font = { bold: true, size: 10 };
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true
          };
        }

        if (i === rows.length - 1) {
          cell.font = { bold: true };
        }

        if (!isNaN(num)) {
          cell.alignment = { horizontal: 'right' };
        }

        if (isYellow) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' }
          };
        }

        if (isBold) {
          cell.font = { ...cell.font, bold: true };
        }

        excelCol++; // 🔥 IMPORTANT
      }
    });

    /* ===== AUTO WIDTH ===== */
    sheet.columns.forEach((col, colIndex) => {
      let max = 3;

      col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber < startRow + 1) return;

        if (cell.value) {
          max = Math.max(max, cell.value.toString().length);
        }
      });

      // 🔥 LIMIT WIDTH
      if (colIndex === 1) {
        col.width = Math.min(max + 2, 36); // Employee column max 30
      } else {
        col.width = max + 2; // Other columns max 15
      }
    });

    /* ===== FOOTER ===== */
    let footerStartRow = startRow + rows.length + 5;

    sheet.mergeCells(`A${footerStartRow}:${lastColLetter}${footerStartRow}`);
    sheet.getCell(`A${footerStartRow}`).value = 'Programme Executive';
    sheet.getCell(`A${footerStartRow}`).alignment = {
      horizontal: 'right'
    };
    sheet.getCell(`A${footerStartRow}`).font = { bold: true };

    sheet.mergeCells(`A${footerStartRow + 1}:${lastColLetter}${footerStartRow + 1}`);
    sheet.getCell(`A${footerStartRow + 1}`).value = 'Akashavani Karwar';
    sheet.getCell(`A${footerStartRow + 1}`).alignment = {
      horizontal: 'right'
    };
    sheet.getCell(`A${footerStartRow + 1}`).font = { bold: true };

    sheet.mergeCells(`A${footerStartRow + 2}:${lastColLetter}${footerStartRow + 2}`);
    sheet.getCell(`A${footerStartRow + 2}`).value = `Date: ${today}`;
    sheet.getCell(`A${footerStartRow + 2}`).alignment = {
      horizontal: 'right'
    };
    sheet.getCell(`A${footerStartRow + 2}`).font = { bold: true };

    const lastUsedRow = footerStartRow + 2;

    /* ===== PAGE SETUP ===== */
    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: false,
      horizontalCentered: true, // Center on page
      verticalCentered: false,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2
      }
    };

    /* 🔥 FIX: NO INVALID FREEZE */
    sheet.views = [{ showGridLines: false }];

    sheet.pageSetup.printArea = `A1:${lastColLetter}${lastUsedRow}`;
  }

  await createSheet(goHTML, 'GO');
  await createSheet(npsHTML, 'NPS');

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${station} PayBill ${month}.xlsx`);
}
