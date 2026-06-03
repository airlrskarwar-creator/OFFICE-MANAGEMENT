//================================================================================//
//                🔥🔥🔥🔥🔥BUDGET PAGE SCRIPT🔥🔥🔥🔥🔥
//=============================================================================//

function toggleButton() {
  const sbgselect = id('BudgetUnderSelect');
  const buttons = qsa('.SBGaction-group button');
  const sbgindex = sbgselect.selectedIndex;

  const disable = sbgindex >= 0 && sbgindex <= 8;

  // ✅ 1st button
  if (buttons[0]) buttons[0].disabled = disable;

  // ✅ 2nd button
  if (buttons[1]) buttons[1].disabled = disable;
}

function loadBudgetDropdown() {
  if (!sbgData?.rows?.length) {
    console.warn('❌ sbgData not loaded');
    return;
  }

  const rows = sbgData.rows;
  const select = id('BudgetUnderSelect');
  if (!select) return;

  // 🔥 RESET
  select.innerHTML = `<option value="" hidden>Select Budget</option>`;

  // =========================
  // 🔹 DEFINE GROUP BREAKPOINTS
  // =========================
  const groupRanges = [
    { name: 'Salaries - GO', start: 1, end: 4 }, // Row 3–4
    { name: 'Salaries - PB', start: 4, end: 9 }, // Row 5–10
    { name: 'Admin Expenditure - IEBR', start: 9, end: 30 }, // Row 11–31
    { name: 'Programme Expenses', start: 30, end: rows.length } // Row 32+
  ];

  // =========================
  // 🔹 BUILD GROUPS
  // =========================
  groupRanges.forEach((group) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.name;

    for (let i = group.start; i < group.end; i++) {
      const val = String(rows[i]?.[0] || '').trim();

      // ❌ Skip invalid rows
      if (!val || val.toLowerCase() === 'station') continue;

      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;

      optgroup.appendChild(opt);
    }

    if (optgroup.children.length) {
      select.appendChild(optgroup);
    }
  });

  // 🔥 DEFAULT SELECT
  const first = select.querySelector('option');
  if (first) select.value = first.value;

  // 🔁 Next dependent dropdown
  //loadBudgetMonthDropdown();
}

function loadBudgetMonthDropdown() {
  if (!sbgExpData || !sbgExpData.rows) {
    console.warn('❌ sbgExpData not loaded');
    return;
  }

  const select = id('BudgetPage_Month');
  const fySelect = id('BudgetPage_FY');
  const budgetSelect = id('BudgetUnderSelect');

  if (!select || !fySelect || !budgetSelect) return;

  const selectedFY = fySelect.value;
  const selectedBudget = budgetSelect.value;

  const hasValidFY = selectedFY && selectedFY !== 'Select FY';
  select.disabled = !hasValidFY;

  const monthMap = new Map();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ================= FILTER ROWS =================
  sbgExpData.rows.forEach((row) => {
    const dateStr = row[0];
    const budget = String(row[3] || '').trim();

    if (!dateStr) return;

    // 🔥 FILTER BY BUDGET
    if (selectedBudget && budget !== selectedBudget) {
      return;
    }

    // 🔥 FY FROM DATE
    const fy = getFYFromDateStr(dateStr);

    // 🔥 FILTER BY FY ONLY IF VALID FY SELECTED
    if (hasValidFY && fy !== selectedFY) {
      return;
    }

    // 🔥 EXTRACT MONTH
    const parts = dateStr.split('-');

    if (parts.length !== 3) return;

    const mm = parseInt(parts[1], 10);
    const yyyy = parts[2];

    if (!mm || !yyyy) return;

    const monthText = `${monthNames[mm - 1]}-${yyyy}`;

    const key = `${yyyy}-${String(mm).padStart(2, '0')}`;

    monthMap.set(key, monthText);
  });

  // ================= SORT MONTHS =================
  const sortedMonths = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map((e) => e[1]);

  // ================= RESET =================
  select.innerHTML = '';

  // ================🔥 NO VALID FY=====================

  if (!hasValidFY) {
    select.innerHTML = `
            <option value="" selected>
              Select Month
            </option>
          `;

    select.selectedIndex = 0; // 🔥 IMPORTANT
    return;
  }

  // =====================🔥 VALID FY==================

  select.innerHTML = `
          <option value="ALL" selected>
            All Months
          </option>
        `;

  // ================= NO DATA =================
  if (!sortedMonths.length) {
    console.warn('⚠ No months found for selected FY/Budget');
    select.value = 'ALL';
    return;
  }

  // ================= MONTH OPTIONS =================
  sortedMonths.forEach((month) => {
    const opt = document.createElement('option');
    opt.value = month;
    opt.textContent = month;
    select.appendChild(opt);
  });

  // ================= FINAL VALUE =================
  select.value = 'ALL';
}

function getBudgetFY(dateStr) {
  if (!dateStr) return '';

  // 🔥 SAFE PARSE DD-MM-YYYY
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';

  const dd = parts[0];
  const mm = parts[1];
  const yyyy = parts[2];

  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);

  if (!month || !year) return '';

  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

function convertMonthToDate(monthStr) {
  if (!monthStr || typeof monthStr !== 'string') return '';

  const [monStr, yearStr] = monthStr.trim().split('-');
  const year = parseInt(yearStr, 10);

  const months = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12
  };

  let month = months[monStr.toLowerCase()];
  if (!month || !year) return '';

  // ✅ LOGIC: Add exactly 1 month
  month += 1;
  let finalYear = year;

  // Handle year-end wrap (December becomes January of the next year)
  if (month > 12) {
    month = 1;
    finalYear += 1;
  }

  const mm = String(month).padStart(2, '0');
  return `01-${mm}-${finalYear}`;
}

function getFYFromDateStr(dateStr) {
  if (!dateStr) return '';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';

  const dd = parts[0];
  const mm = parts[1];
  const yyyy = parts[2];

  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);

  if (!month || !year) return '';

  // ✅ CORRECT CONDITION
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

function getBudgetFYColumns() {
  const budgetVal = id('BudgetUnderSelect')?.value;
  const fyVal = id('BudgetPage_FY')?.value;

  if (!budgetVal || !fyVal) return;

  const headers = sbgData.headers;
  const rows = sbgData.rows;

  const fyCols = [];

  headers.forEach((h, i) => {
    const cleanFY = String(h).match(/\d{4}-\d{2}/)?.[0];
    if (cleanFY === fyVal) fyCols.push(i);
  });

  if (!fyCols.length) return;

  const row = rows.find(
    (r) =>
      //String(r[0]).trim().toLowerCase() === budgetVal.trim().toLowerCase()
      String(r[0]).toLowerCase() === budgetVal.toLowerCase()
  );

  if (!row) return;

  const values = fyCols.map((i) => row[i]);

  // 🔥 APPLY ×1000 + FORMAT
  id('SBGsanctioned').value = formatCurrency((values[0] || 0) * 1000);
  id('SBGutilised').value = formatCurrency((values[1] || 0) * 1000);
  id('SBGavailable').value = formatCurrency((values[2] || 0) * 1000);
  id('SBGcalculated').value = formatCurrency((values[3] || 0) * 1000);
  id('SBGrevised').value = formatCurrency((values[4] || 0) * 1000);
}

// ======================================
// 🔥 BUILD SUMMARY (WITH STATION + CORRECT LOGIC)
// ======================================

function buildBudgetSummaryWithStation() {
  const summary = {};
  if (!pbData || !pbData.headers || !pbData.rows) return [];

  const headers = pbData.headers;
  const rows = pbData.rows;

  // =========================
  // 🔥 BUILD LOCAL DEPT MAP FROM empData
  // =========================
  function buildDeptMapLocal() {
    if (!empData || !empData.headers || !empData.rows) {
      console.warn('❌ empData not ready');
      return {};
    }

    const headers = empData.headers;

    const nameIdx = headers.findIndex((h) => h.toLowerCase().includes('employee name'));

    const deptIdx = headers.findIndex((h) => h.toLowerCase().includes('department'));

    if (nameIdx === -1 || deptIdx === -1) {
      console.error('❌ Employee/Department column not found in empData');
      return {};
    }

    const map = {};

    empData.rows.forEach((row) => {
      const name = String(row[nameIdx] || '').trim();
      const dept = String(row[deptIdx] || '')
        .trim()
        .toUpperCase();

      if (!name) return;

      const norm = name.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase();

      map[norm] = dept;
    });

    return map;
  }
  const deptMap = buildDeptMapLocal();

  const empIdx = headers.indexOf('Employee Name');
  const monthIdx = headers.indexOf('Salary Month');
  const netIdx = headers.indexOf('Gross Income');
  const npsIdx = headers.indexOf('NPSE');
  const daaIdx = headers.indexOf('DAA on NPSE');
  const stationIdx = headers.indexOf('Pay Drawn Station');

  const medIdx = headers.findIndex((h) => h.toLowerCase().includes('medical'));

  const elIdx = headers.findIndex((h) => h.toLowerCase().includes('el encash'));

  rows.forEach((r) => {
    //const emp = String(r[empIdx] || "").trim();
    const empRaw = String(r[empIdx] || '');

    const emp = empRaw.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    const monthStr = String(r[monthIdx] || '').trim();
    const station = String(r[stationIdx] || '').trim();

    if (!emp || !monthStr || !station) return;

    const date = convertMonthToDate(monthStr);
    if (!date) return;

    const key = station + '|' + date;

    if (!summary[key]) {
      summary[key] = {
        station,
        date: date,
        monthStr,
        go: 0,
        nps: 0,
        goMed: 0,
        npsMed: 0,
        npsIncome: 0,
        el: 0,

        // 🔥 NEW BREAKUPS
        elDetails: [],
        goMedDetails: [],
        npsMedDetails: []
      };
    }

    // 🔥 find matching key from deptMap
    const dept = deptMap[emp] || '';

    const net = +r[netIdx] || 0;
    const nps = +r[npsIdx] || 0;
    const daa = +r[daaIdx] || 0;
    const med = +r[medIdx] || 0;
    const el = +r[elIdx] || 0;

    //console.log("MATCH:", empRaw, "→", dept);

    if (dept === 'GO') {
      const goSalary = net;
      summary[key].go += goSalary;

      // ✅ GO MED
      if (med > 0) {
        const exists = summary[key].goMedDetails.some((e) => e.name === empRaw && Number(e.value) === Number(med));

        if (!exists) {
          summary[key].goMedDetails.push({
            name: empRaw,
            value: med
          });

          summary[key].goMed += med;
        }
      }
    } else {
      const pbSalary = net - el;
      summary[key].nps += pbSalary;

      // ✅ PB MED
      if (med > 0) {
        const exists = summary[key].npsMedDetails.some((e) => e.name === empRaw && Number(e.value) === Number(med));

        if (!exists) {
          summary[key].npsMedDetails.push({
            name: empRaw,
            value: med
          });

          summary[key].npsMed += med;
        }
      }

      // ✅ EL
      if (el > 0) {
        const exists = summary[key].elDetails.some((e) => e.name === empRaw && Number(e.value) === Number(el));

        if (!exists) {
          summary[key].elDetails.push({
            name: empRaw,
            value: el
          });

          summary[key].el += el;
        }
      }
    }

    // ✅ NPS Contribution
    summary[key].npsIncome += nps + daa;
  });
  //console.log("Summary Output:", summary);
  return Object.values(summary);
}

// ======================================
// 🔥 BUILD FINAL ROWS WITH CUMULATIVE
// ======================================

function buildBillDetails(station, fy, type, monStr) {
  let st = station.replace(/\s+/g, ' ').trim().toUpperCase();
  let parts = st.split(' ');
  let stationCode = (parts[0]?.slice(0, 3) || '') + '-' + (parts[1]?.slice(0, 3) || '');

  let fyText = fy.includes('-') ? `FY-${fy.split('-')[0]}-${fy.split('-')[1]}` : `FY-${fy}`;

  // ✅ monStr is now 'May-2025'. The code below simply appends it.
  return `${stationCode}/${fyText}/${type}/${monStr}`;
}

function buildPBBudgetRows() {
  const data = buildBudgetSummaryWithStation();
  const result = [];
  const stationMap = {};

  data.forEach((d) => {
    if (!stationMap[d.station]) stationMap[d.station] = [];
    stationMap[d.station].push(d);
  });

  // 1. Define the helper here if you want it local
  function formatEmpBreakup(arr) {
    if (!arr || !arr.length) return '';
    return arr.map((e) => `${e.name}: ${formatCurrency(e.value)}`).join(', ');
  }

  Object.keys(stationMap).forEach((station) => {
    const records = stationMap[station];
    // Sort by Date
    records.sort((a, b) => new Date(a.date.split('-').reverse().join('-')) - new Date(b.date.split('-').reverse().join('-')));

    // Tracks yearly and monthly totals independently for every Budget type
    const budgetTrackers = {};

    records.forEach((d) => {
      const [dd, mon, yr] = d.date.split('-');
      const isApril = mon === '04';
      const fy = getFYFromDateStr(d.date);

      // ... (Your 'rows' array definition stays exactly the same) ...
      const rows = [
        { label: `Salary for GO Employee-${d.monthStr}`, value: d.go, budget: 'SALARY ( Non-IRLA )( Regular ) - For Govt Employees' },
        { label: `Salary for PB Employee-${d.monthStr}`, value: d.nps, budget: 'SALARY - For PB Employees Recruited After 05.10.2007' },
        { label: `NPS Contribution-${d.monthStr}`, value: d.npsIncome, budget: 'CPF Contribution / NPS - For PB Employees' },
        { label: `Medical Reimbursement for GO Employee-${d.monthStr}`, details: formatEmpBreakup(d.goMedDetails), value: d.goMed, budget: 'Medical Treatment - For Govt Employees' },
        { label: `Medical Reimbursement for PB Employee-${d.monthStr}`, details: formatEmpBreakup(d.npsMedDetails), value: d.npsMed, budget: 'Medical Treatment - For PB Employees' },
        { label: `EL (Leave) Encashment-${d.monthStr}`, details: formatEmpBreakup(d.elDetails), value: d.el, budget: 'Leave Encashment - For PB Employees' }
      ];

      rows.forEach((r) => {
        if (!r.value || Number(r.value) === 0) return;

        // ======================================
        // 🔥 ADD THE TYPE LOGIC HERE
        // ======================================
        let type = '';
        if (r.budget.includes('SALARY ( Non-IRLA )( Regular ) - For Govt Employees')) type = 'SAL-GO';
        else if (r.budget.includes('SALARY - For PB Employees Recruited After 05.10.2007')) type = 'SAL-NPS';
        else if (r.budget.includes('CPF Contribution / NPS - For Govt Employees')) type = 'CPF';
        else if (r.budget.includes('CPF Contribution / NPS - For PB Employees')) type = 'NPS';
        else if (r.budget.includes('Medical Treatment - For Govt Employees')) type = 'MED-GO';
        else if (r.budget.includes('Medical Treatment - For PB Employees')) type = 'MED-NPS';
        else if (r.budget.includes('Leave Encashment - For PB Employees')) type = 'NPS/LEAVE_ENCASH';

        const budgetKey = `${station}|${r.budget}`;
        if (!budgetTrackers[budgetKey]) budgetTrackers[budgetKey] = { yearly: 0, monthly: {} };

        if (isApril) budgetTrackers[budgetKey].yearly = 0;

        const monthlyKey = `${fy}|${mon}|${yr}|${budgetKey}`;
        if (isApril) {
          budgetTrackers[budgetKey].monthly[monthlyKey] = Number(r.value || 0);
        } else {
          budgetTrackers[budgetKey].monthly[monthlyKey] = (budgetTrackers[budgetKey].monthly[monthlyKey] || 0) + Number(r.value || 0);
        }

        budgetTrackers[budgetKey].yearly += Number(r.value || 0);

        // ======================================
        // 🔥 PASS 'type' TO buildBillDetails
        // ======================================
        result.push([
          d.date,
          station,
          buildBillDetails(station, fy, type, d.monthStr), // Pass original string here
          r.budget,
          r.label + (r.details ? `\n(${r.details})` : ''),
          formatCurrency(r.value),
          formatCurrency(budgetTrackers[budgetKey].monthly[monthlyKey]),
          formatCurrency(budgetTrackers[budgetKey].yearly)
        ]);
      });
    });
  });
  return result;
}

// ======================================
// 🔥 RENDER TABLE
// ======================================

function renderBudgetfromPBData() {
  const container = id('BudgetTablefromPBWrapper');
  if (!container) return;

  container.innerHTML = '';

  const data = buildPBBudgetRows();
  //console.log("Final Rows:", data);

  const table = document.createElement('table');
  table.className = 'budgetfromPB-table';

  table.innerHTML = `
          <thead>
            <tr>
              <th>Date</th>
              <th>Station</th>
              <th>Bill / Invoice Details</th>
              <th>SBG Expenditure Under</th>
              <th>Expenditure Details</th>
              <th>Expenditure Amount</th>
              <th>Monthly Cumulative Sum of Expenditure</th>
              <th>Cumulative Sum of Expenditure</th>
            </tr>
          </thead>
        `;

  const tbody = document.createElement('tbody');

  data.forEach((r) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
            <td>${r[0]}</td>
            <td>${r[1]}</td>
            <td>${r[2]}</td>
            <td>${r[3]}</td>
            <td>
              ${r.label}
              ${r.details ? `<br><small>${r.details}</small>` : ''}
            </td>
            <td>${r[5]}</td>
            <td>${r[6]}</td>
            <td>${r[7]}</td>
          `;

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function generateKey(r) {
  return [
    r[0], // Date
    r[1], // Station
    r[3], // Budget
    r[4].split('(')[0].trim() // 🔥 REMOVE dynamic breakup
  ]
    .join('|')
    .toLowerCase();
}

function normalizeRow(r) {
  return [
    String(r[0]).trim(), // Date
    String(r[1]).trim(), // Station
    String(r[2]).trim(), // Bill Details
    String(r[3]).trim(), // Budget
    String(r[4]).trim() // Details
  ].join('|');
}

function formatMonthToDate(monthStr) {
  const [mon, year] = monthStr.split('-');
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

  return `01-${months[mon]}-${year}`;
}

function mapRowArrayToObject(r) {
  return {
    Date: r[0], // 🔥 FIXED
    Station: r[1],
    'Bill / Invoice Details': r[2],
    'SBG Expenditure Under': r[3],
    'Expenditure Details': r[4],
    'Expenditure Amount (₹ in 000)': Number(CurrencytoNum(r[5]) / 1000),
    'Monthly Cumulative Sum of Expenditure (₹ in 000)': Number(CurrencytoNum(r[6]) / 1000),
    'Cumulative Sum of Expenditure (₹ in 000)': Number(CurrencytoNum(r[7]) / 1000)
  };
}

// =====================================================
// 🔥 UPDATE SBG SHEET
// =====================================================

async function updateSBGSheet(rows, mode = 'sync') {
  // 🔥 START → yellow sync
  setSyncStatus('sbgexpDatabase');
  console.log('🔄 SBG Expenditure : Sync Started...');

  try {
    if (!rows || !rows.length) {
      console.warn('⚠ No rows to send');

      return;
    }

    // =========================
    // 🔥 STRICT CLEANING
    // =========================

    const formattedRows = rows

      .filter((r) => Array.isArray(r) && r.length === 8 && r[0] && r[1] && r[3] && r[4])

      .map((r) => ({
        Date: r[0],

        Station: String(r[1]).trim(),
        'Bill / Invoice Details': String(r[2] || '').trim(),
        'SBG Expenditure Under': String(r[3]).trim(),
        'Expenditure Details': String(r[4]).trim(),
        'Expenditure Amount (₹ in 000)': Number(CurrencytoNum(r[5]) / 1000),
        'Monthly Cumulative Sum of Expenditure (₹ in 000)': Number(CurrencytoNum(r[6]) / 1000),
        'Cumulative Sum of Expenditure (₹ in 000)': Number(CurrencytoNum(r[7]) / 1000)
      }));

    // =========================
    // ❌ EMPTY
    // =========================

    if (!formattedRows.length) {
      console.warn('⚠ All rows filtered out');

      return;
    }

    // =========================
    // 🔥 API
    // =========================

    const res = await fetch('https://office-management-f425.onrender.com/sbgexp/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: formattedRows, mode })
    });

    // =========================
    // ❌ FAIL
    // =========================

    if (!res.ok) {
      throw new Error('SBGExp update failed');
    }

    const result = await res.json();

    console.log('✅ SBG Expenditure : Sync Completed');
  } catch (err) {
    console.error('❌ SBG Expenditure : Sync Failed:', err);
    clearSyncStatus('sbgexpDatabase', 'db', false);
  } finally {
    // 🔥 SUCCESS → green
    clearSyncStatus('sbgexpDatabase', 'db', true);
  }
}

async function loadSBGData() {
  const res = await fetch('https://office-management-f425.onrender.com/sbg');
  const data = await res.json();

  sbgData = { headers: data.headers, rows: data.rows };

  // Populate dropdowns only if we have data to look at
  loadBudgetDropdown();
}

async function calculateAndPushSBGBudget() {
  setSyncStatus('sbgDatabase');
  console.log('🔄 SBG : Sync Started...');
  try {
    if (!sbgData?.rows || !sbgExpData?.rows) throw new Error('Data not ready');

    const headers = sbgData.headers;
    const stationRow = sbgData.rows[0];
    const dataRows = sbgData.rows.slice(1);

    // Use the getSBGUsedMap() helper defined previously
    const usedMap = getSBGUsedMap();

    dataRows.forEach((row) => {
      const budgetName = String(row[0] || '')
        .trim()
        .toLowerCase();
      headers.forEach((h, i) => {
        const clean = String(h).toLowerCase();
        if (!clean.includes('(sbg)')) return;

        const fy = clean.match(/\d{4}-\d{2}/)?.[0];
        if (!fy) return;

        const { sbgCol, usedCol, availCol } = getFYColumnIndexes(headers, fy);
        if (sbgCol === -1 || usedCol === -1 || availCol === -1) return;

        const stationName = String(stationRow[sbgCol] || '')
          .trim()
          .toLowerCase();
        const key = `${fy}|${budgetName}|${stationName}`;

        const usedVal = usedMap[key] || 0;
        const sbgVal = Number(row[sbgCol] || 0);

        row[usedCol] = Number(usedVal).toFixed(3);
        row[availCol] = Number(sbgVal - usedVal).toFixed(3);
      });
    });

    const res = await fetch('https://office-management-f425.onrender.com/sbg/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: dataRows })
    });

    if (!res.ok) throw new Error('Failed to update SBG DB');
    const result = await res.json();
    console.log('✅ SBG  : Sync Completed');
    clearSyncStatus('sbgDatabase', 'db', true);
  } catch (err) {
    console.error('❌ SBG : Sync Failed:', err);
    clearSyncStatus('sbgDatabase', 'db', false);
  }
}

async function reloadSBGExpData() {
  const res = await fetch('https://office-management-f425.onrender.com/sbgexp', { cache: 'no-store' });
  const data = await res.json();

  sbgExpData = { headers: data.headers, rows: data.rows };
}

// =====================================================
// 🔥 SYNC PB → SBG
// =====================================================

let isSyncRunning = false;

// Ensure this is called inside savePBData after a successful save
async function syncPBtoSBG() {
  if (isSyncRunning) return;

  // 1. Guard against empty data
  if (!pbData?.rows?.length) {
    console.warn('⏳ PB data not ready for sync');
    return;
  }

  isSyncRunning = true;
  try {
    // 2. Process PB Data into Expenditure format
    const pbRows = buildPBBudgetRows();
    if (!pbRows.length) throw new Error('No expenditure rows generated');

    //console.log('🔄 Sync Pay Bill to SBG Expenditure ...');
    // 3. Sync to server
    await updateSBGSheet(pbRows, 'sync');
    // 4. Reload dependencies in sequence
    await reloadSBGExpData();
    await loadSBGData();

    // 5. Final calculation
    await calculateAndPushSBGBudget();

    //console.log('📡 Full Sync Success');
  } catch (err) {
    console.error('❌ Sync Failed:', err);
  } finally {
    isSyncRunning = false;
  }
}

function filterSBGexpData() {
  if (!sbgExpData || !sbgExpData.rows) return [];

  const station = id('BudgetPage_Station')?.value || '';
  const budget = id('BudgetUnderSelect')?.value || '';
  const fy = id('BudgetPage_FY')?.value || '';
  const selectedMonth = id('BudgetPage_Month')?.value || 'ALL';

  if (!station || !budget || !fy || station === 'Select' || budget === 'Select Budget' || fy === 'Select') {
    return [];
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return sbgExpData.rows
    .map((row, i) => ({
      rowIndex: i + 2,
      values: row
    }))
    .filter((obj) => {
      const row = obj.values;

      const rowDate = String(row[0] || '').trim();
      const rowStation = String(row[1] || '').trim();
      const rowBudget = String(row[3] || '').trim();

      const rowFY = getFYFromDateStr(rowDate);

      // 🔥 BASIC FILTER
      if (!(rowStation === station && rowBudget === budget && rowFY === fy)) {
        return false;
      }

      // =========================
      // 🔥 MONTH FILTER (NEW)
      // =========================
      if (selectedMonth === 'ALL') return true;

      const parts = rowDate.split('-');
      if (parts.length !== 3) return false;

      const mm = parseInt(parts[1], 10);
      const yyyy = parts[2];

      if (!mm || !yyyy) return false;

      const rowMonth = `${monthNames[mm - 1]}-${yyyy}`;

      return rowMonth === selectedMonth;
    });
}

// 🔥 BUTTON CONTROL
function toggleSBGButtons(mode = 'default') {
  const budget = id('BudgetUnderSelect');
  const sbgindex = budget?.selectedIndex ?? -1;
  const fy = id('BudgetPage_FY')?.value?.trim();
  const isFYNotSelected = !fy || fy === 'Select FY';
  const sbgedit = id('SBGeditBtn');
  const sbgadd = id('SBGaddBtn');
  const sbgprint = id('SBGprintBtn');
  const sbgXL = id('SBGexcelBtn');

  // =========================================
  // 🔄 RESET ALL FIRST
  // =========================================

  if (sbgedit) sbgedit.disabled = false;
  if (sbgadd) sbgadd.disabled = false;
  if (sbgprint) sbgprint.disabled = false;
  if (sbgXL) sbgXL.disabled = false;

  // =========================================
  // 🔥 FY NOT SELECTED
  // =========================================

  if (isFYNotSelected) {
    if (sbgprint) sbgprint.disabled = true;
    if (sbgXL) sbgXL.disabled = true;
  }

  // =========================
  // 🔴 MODE: ALL DISABLED
  // =========================

  if (mode === 'allDisabled') {
    if (sbgedit) sbgedit.disabled = true;
    if (sbgadd) sbgadd.disabled = true;

    // 🔥 FY CONDITION
    if (!isFYNotSelected) {
      if (sbgprint) sbgprint.disabled = false;
      if (sbgXL) sbgXL.disabled = false;
    }
    return;
  }

  // =========================
  // 🟡 MODE: NO DATA
  // =========================

  if (mode === 'noData') {
    if (sbgindex >= 0 && sbgindex <= 8) {
      if (sbgedit) sbgedit.disabled = true;
      if (sbgadd) sbgadd.disabled = true;

      if (!isFYNotSelected) {
        if (sbgprint) sbgprint.disabled = false;
        if (sbgXL) sbgXL.disabled = false;
      }
    } else {
      if (sbgedit) sbgedit.disabled = true;
      if (sbgadd) sbgadd.disabled = false;
      if (sbgprint) sbgprint.disabled = true;
      if (sbgXL) sbgXL.disabled = true;
    }
    return;
  }

  // =========================
  // 🟢 MODE: DATA EXISTS
  // =========================

  if (mode === 'pbData') {
    if (sbgindex >= 0 && sbgindex <= 8) {
      if (sbgedit) sbgedit.disabled = true;
      if (sbgadd) sbgadd.disabled = true;
      if (!isFYNotSelected) {
        if (sbgprint) sbgprint.disabled = false;
        if (sbgXL) sbgXL.disabled = false;
      }
    } else {
      if (sbgedit) sbgedit.disabled = false;
      if (sbgadd) sbgadd.disabled = false;
      if (!isFYNotSelected) {
        if (sbgprint) sbgprint.disabled = false;
        if (sbgXL) sbgXL.disabled = false;
      }
    }
  }
}

function renderFilterMainBudgetExpTable() {
  const container = id('BudgetTableWrapper');
  if (!container) return;

  container.innerHTML = '';

  const station = id('BudgetPage_Station')?.value || '';
  const budget = id('BudgetUnderSelect')?.value || '';
  const fy = id('BudgetPage_FY')?.value || '';
  const month = id('BudgetPage_Month')?.value || 'ALL';

  // =========================
  // 🔥 CREATE TABLE FIRST
  // =========================
  const table = document.createElement('table');
  table.className = 'budget-table';

  table.innerHTML = `
          <colgroup>
            <col style="width: 8%;">
            <col style="width: 20%;">
            <col style="width: 40%;">
            <col style="width: 8%;">
            <col style="width: 8%;">
            <col style="width: 8%;">
            <col style="width: 8%;">
          </colgroup>

          <thead>
            <tr class="SBGreport-header"><th  colspan="7" style="text-align:center;font-size:12px;">Details of SBG Expenditure under Head '${budget}' for the ${month && month !== 'ALL' ? `Month ${month}` : `FY ${fy}`}</th></tr>
            <tr>
              <th>Date</th>
              <th style="display:none;">Station</th>
              <th >Bill / Invoice Details</th>
              <th style="display:none;">SBG Expenditure Under</th>
              <th>Expenditure Details</th>
              <th>Expenditure Amount</th>
              <th>Monthly Cumulative Sum of Expenditure</th>
              <th>Cumulative Sum of Expenditure</th>
              <th class="SBGreport-col">Report</th>
            </tr>
          </thead>
        `;

  const tbody = document.createElement('tbody');
  tbody.id = 'budgetPBBody';

  // =========================
  // ❌ INVALID FILTER
  // =========================
  if (!station || !budget || !fy || id('BudgetUnderSelect')?.selectedIndex === -1 || station === 'Select' || budget === 'Select Budget' || fy === 'Select') {
    toggleSBGButtons('allDisabled');

    const tr = document.createElement('tr');
    const td = document.createElement('td');

    td.colSpan = 9;

    td.style.textAlign = 'center';
    td.style.background = '#edebb7';
    td.style.color = 'red';
    td.style.fontWeight = 'bold';
    td.style.fontSize = '12px';
    td.style.padding = '20px';

    td.textContent = '==============🚫Please select Station, Budget & Financial Year🚫==============';

    tr.appendChild(td);
    tbody.appendChild(tr);

    table.appendChild(tbody);
    container.appendChild(table);

    return;
  }

  // =========================
  // 🔥 FETCH DATA
  // =========================
  const data = filterSBGexpData();

  // =========================
  // ❌ NO DATA
  // =========================
  if (!data.length) {
    toggleSBGButtons('noData');

    const tr = document.createElement('tr');
    const td = document.createElement('td');

    td.colSpan = 9;

    td.style.textAlign = 'center';
    td.style.background = '#edebb7';
    td.style.color = 'red';
    td.style.fontSize = '12px';
    td.style.fontWeight = 'bold';
    td.style.padding = '20px';

    td.textContent = month === 'ALL' ? '==============🚫No Data found🚫==============' : `==============🚫No data found for ${month}🚫==============`;

    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    // =========================
    // ✅ DATA EXISTS
    // =========================
    toggleSBGButtons('pbData');

    data.forEach((obj, index) => {
      const tr = document.createElement('tr');
      tr.dataset.rowIndex = obj.rowIndex;

      const row = obj.values;

      row.forEach((cell, i) => {
        const td = document.createElement('td');
        td.style.setProperty('height', '20px', 'important');
        td.style.setProperty('min-height', '20px', 'important');
        td.style.setProperty('max-height', '20px', 'important');
        // 🔥 HIDE STATION + BUDGET COLUMNS
        if (i === 1 || i === 3) {
          td.style.display = 'none';
        }

        // ======================================
        // 💰 AMOUNT + CUMULATIVES
        // ======================================

        if (i === 5 || i === 6 || i === 7) {
          const num = Number(cell);

          td.textContent = isNaN(num) ? '' : formatCurrency(num * 1000);

          td.style.textAlign = 'right';

          // 🔥 MONTHLY CUM
          if (i === 6) {
            td.classList.add('monthcum');

            td.dataset.value = num * 1000;
          }

          // 🔥 FY CUM
          if (i === 7) {
            td.classList.add('cum');

            td.dataset.value = num * 1000;
          }
        } else {
          td.textContent = cell;
        }

        tr.appendChild(td);
      });

      // =========================
      // 🔥 REPORT COLUMN
      // =========================
      const reportTd = document.createElement('td');
      reportTd.className = 'SBGreport-col';
      reportTd.style.textAlign = 'center';
      reportTd.style.whiteSpace = 'nowrap';

      reportTd.innerHTML = `
            <button
              class="budgetReportBtn pdfBtn"
              onclick="openSBGReportOptions(${index}, 'pdf')"
            >

              <img
                src="https://cdn-icons-png.flaticon.com/512/337/337946.png"
                style="
                  width:15px;
                  height:15px;
                  object-fit:contain;
                "
              />
            </button>

            <button
              class="budgetReportBtn excelBtn"
              onclick="openSBGReportOptions(${index}, 'excel')"
            >

              <img
                src="https://cdn-icons-png.flaticon.com/512/732/732220.png"
                style="
                  width:15px;
                  height:15px;
                  object-fit:contain;
                "
              />
            </button>

          `;

      tr.appendChild(reportTd);

      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

// =====================================================
// 🔥 SBG REPORT OPTIONS
// =====================================================

function openSBGReportOptions(rowIndex, type = 'print') {
  showConfirmBox({
    title: 'Contingent Bill Report Options',
    icon: '📑',
    message: 'Report Type',
    subMessage: `

            <div
              style="
                display:flex;
                flex-direction:column;
                gap:8px;
                overflow:hidden;
              "
            >

              <button
                class="reportTypeBtn"
                data-mode="entry"
              >
                📄 This Entry Only
              </button>

              <button
                class="reportTypeBtn"
                data-mode="date"
              >
                📅 For This Date
              </button>

              <button
                class="reportTypeBtn"
                data-mode="month"
              >
                🗓️ For This Month
              </button>

              <button
                class="reportTypeBtn"
                data-mode="fy"
              >
                📚 For This FY
              </button>

            </div>
          `,

    yesText: 'Close',

    noText: '',

    yesColor: '#ef4444',

    onYes: () => {
      closeConfirmBox?.();
    },

    onNo: () => {}
  });

  // ======================================
  // 🔥 BUTTON EVENTS
  // ======================================

  setTimeout(() => {
    qsa('.reportTypeBtn').forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.dataset.mode;

        closeConfirmBox?.();

        loadSBGReportData(rowIndex, mode);

        // ======================================
        // 🔥 WAIT FOR DOM UPDATE
        // ======================================

        requestAnimationFrame(() => {
          setTimeout(() => {
            if (type === 'pdf') {
              openPrintWindow(buildPrintSBGContingentHTML());
            } else {
              excelSBGContingentReport();
            }
          }, 150);
        });
      };
    });

    // ======================================
    // 🔥 HIDE UNUSED BUTTON
    // ======================================

    const noBtn = id('logoutNoBtn');

    if (noBtn) {
      noBtn.style.display = 'none';
    }
  }, 50);
}

// =====================================================
// 🔥 LOAD SBG REPORT DATA
// =====================================================

function loadSBGReportData(rowIndex, mode = 'entry') {
  // ======================================
  // 🔥 STORE MODE
  // ======================================

  window.currentSBGReportMode = mode;

  const tbody = qs('#budgetPBBody');

  if (!tbody) return;
  const rows = [...tbody.children];
  const selectedRow = rows[rowIndex];
  if (!selectedRow) return;

  // ======================================
  // 🔥 DATE HELPERS
  // ======================================

  const getDateParts = (str) => {
    const [dd, mm, yyyy] = str.split('-');

    return {
      dd,
      mm,
      yyyy
    };
  };

  // ======================================
  // 🔥 SELECTED VALUES
  // ======================================

  const selectedDate = selectedRow.children[0]?.textContent?.trim() || '';
  window.currentSBGSelectedDate = selectedDate;

  const { mm: selectedMonth, yyyy: selectedYear } = getDateParts(selectedDate);

  // ======================================
  // 🔥 FILTERED ROWS
  // ======================================

  let detailRows = [];

  let cumulativeRows = [];

  // ======================================
  // 🔥 ENTRY
  // ======================================

  if (mode === 'entry') {
    detailRows = [selectedRow];

    cumulativeRows = rows.slice(0, rowIndex + 1);
  }

  // ======================================
  // 🔥 DATE
  // ======================================
  else if (mode === 'date') {
    detailRows = rows.filter((r) => {
      return r.children[0]?.textContent?.trim() === selectedDate;
    });

    const lastDateIndex = rows.findLastIndex((r) => {
      return r.children[0]?.textContent?.trim() === selectedDate;
    });

    cumulativeRows = rows.slice(0, lastDateIndex + 1);
  }

  // ======================================
  // 🔥 MONTH
  // ======================================
  else if (mode === 'month') {
    detailRows = rows.filter((r) => {
      const dt = r.children[0]?.textContent?.trim() || '';
      const { mm, yyyy } = getDateParts(dt);
      return mm === selectedMonth && yyyy === selectedYear;
    });

    const lastMonthIndex = rows.findLastIndex((r) => {
      const dt = r.children[0]?.textContent?.trim() || '';
      const { mm, yyyy } = getDateParts(dt);
      return mm === selectedMonth && yyyy === selectedYear;
    });

    cumulativeRows = rows.slice(0, lastMonthIndex + 1);
  }

  // ==========🔥 FY===================
  else if (mode === 'fy') {
    detailRows = rows;
    cumulativeRows = rows;
  }

  // ===================🔥 TOTAL AMOUNT==================

  let totalAmount = 0;
  detailRows.forEach((r) => {
    totalAmount += Number(r.children[5]?.textContent?.replace(/[^0-9.-]/g, '') || 0);
  });

  // ==================🔥 MONTHLY EXPENDITURE=======================

  let monthlyExpenditure = 0;
  cumulativeRows.forEach((r) => {
    monthlyExpenditure += Number(r.children[5]?.textContent?.replace(/[^0-9.-]/g, '') || 0);
  });

  // ===================🔥 SANCTIONED=======================

  const sanctioned = Number(CurrencytoNum(id('SBGsanctioned')?.value || 0));
  const available = sanctioned - monthlyExpenditure;

  // ================🔥 SET TEXT=======================

  const setText = (idName, value) => {
    const el = id(idName);
    if (el) {
      el.textContent = value;
    }
  };

  setText('SBG_Sanctioned', formatCurrency(sanctioned).replace('₹', '').trim());
  setText('SBG_Sanctioned2', formatCurrency(sanctioned).replace('₹', '').trim());
  setText('Monthly_Expenditure', formatCurrency(monthlyExpenditure).replace('₹', '').trim());
  setText('Monthly_Expenditure2', formatCurrency(monthlyExpenditure).replace('₹', '').trim());
  setText('Present_Expenditure', formatCurrency(totalAmount).replace('₹', '').trim());
  id('Present_Expenditure2').innerHTML = `

          Pay Rs.

          <b><span style="font-weight:bold">
            ${formatCurrency(totalAmount).replace('₹', '').trim()}
          </span>

          <span
            style="
              font-size:10px;
              font-weight:bold;
            "
          >
            (${numberToWords(totalAmount)})
          </span></b>
        `;

  setText('Available_SBG', formatCurrency(available).replace('₹', '').trim());
  setText('Available_SBG2', formatCurrency(available).replace('₹', '').trim());

  const monthName = new Date(selectedYear, Number(selectedMonth) - 1).toLocaleString('default', {
    month: 'long'
  });

  // ======================================
  // 🔥 HEADER MONTH
  // ======================================

  if (mode === 'fy') {
    setText('headerMonth', id('BudgetPage_FY')?.value || '');
  } else {
    setText('headerMonth', `${monthName}-${selectedYear}`);
  }

  setText('headAccountSBGName', `${id('BudgetUnderSelect')?.value}(RNP)${id('BudgetPage_FY')?.value}`);
  setText('headAccountSBGName2', `${id('BudgetUnderSelect')?.value}(RNP)${id('BudgetPage_FY')?.value}`);
  setText('sbgStation', id('BudgetPage_Station')?.value || '');

  // ======================================
  // 🔥 DETAILS TABLE
  // ======================================

  const detailsTbody = qs('#SBGmonthWiseDetails tbody');
  if (!detailsTbody) return;
  detailsTbody.innerHTML = '';
  // ======================================
  // 🔥 ADD DETAIL ROWS
  // ======================================

  detailRows.forEach((r, idx) => {
    const desc = r.children[4]?.textContent?.trim() || '';
    const amt = Number(r.children[5]?.textContent?.replace(/[^0-9.-]/g, '') || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
              <td colspan="2"
                  style="
                    border:solid 1px black;
                    text-align:center;
                  ">
                ${idx + 1}
              </td>

              <td style="
                    border:solid 1px black;
                  ">
                ${desc}
              </td>

              <td style="
                    border:solid 1px black;
                    text-align:right;
                    padding-right:2px;
                  ">
                ${formatCurrency(amt)}
              </td>
            `;

    detailsTbody.appendChild(tr);
  });

  // ======================================
  // 🔥 BLANK ROWS
  // ======================================

  const blankNeeded = Math.max(0, 8 - detailRows.length);

  for (let i = 0; i < blankNeeded; i++) {
    const tr = document.createElement('tr');

    tr.innerHTML = `

            <td colspan="2"
                style="
                  border:solid 1px black;
                  height:20px;
                ">
            </td>

            <td  style="
                  border:solid 1px black;
                ">
            </td>

            <td style="
                  border:solid 1px black;
                ">
            </td>
          `;

    detailsTbody.appendChild(tr);
  }

  // ======================================
  // 🔥 TOTAL ROW
  // ======================================

  const totalRow = document.createElement('tr');

  totalRow.innerHTML = `

          <td colspan="3"
              style="
                border:solid 1px black;
                text-align:right;
                font-weight:bold;
                padding-right:10px;
              ">
            TOTAL
          </td>

          <td style="
                border:solid 1px black;
                text-align:right;
                font-weight:bold;
                padding-right:6px;
              ">
            ${formatCurrency(totalAmount)}
          </td>
        `;

  detailsTbody.appendChild(totalRow);

  // ======================================
  // 🔥 STORE DYNAMIC ROWS
  // ======================================

  window.sbgDynamicExcelRows = {
    detailCount: detailRows.length,

    blankCount: blankNeeded,

    totalRows: detailRows.length + blankNeeded + 1 // total row
  };

  // ======================================
  // 🔥 WATCH SYSTEM TABLE
  // ======================================

  const watchTbody = qs('#SBGwatchSystem tbody');

  if (watchTbody) {
    watchTbody.innerHTML = '';
    // ================🔥 GET ALL ROWS OF SAME BUDGET=========================

    const selectedBudget = selectedRow.children[3]?.textContent?.trim() || '';

    const allBudgetRows = rows.filter((r) => {
      const budget = r.children[3]?.textContent?.trim() || '';

      return budget === selectedBudget;
    });

    // ======================================
    // 🔥 ADD ROWS
    // ======================================

    allBudgetRows.forEach((r) => {
      const date = r.children[0]?.textContent?.trim() || '';

      const details = r.children[4]?.textContent?.trim() || '';

      const amt = r.children[5]?.textContent?.trim() || '';

      const tr = document.createElement('tr');

      tr.innerHTML = `
              <td
                style="
                  border:solid 1px black;
                  text-align:center;
                "
              >
                ${date}
              </td>

              <td
                style="
                  border:solid 1px black;
                  padding-left:4px;
                "
              >
                ${details}
              </td>

              <td
                style="
                  border:solid 1px black;
                  text-align:right;
                  padding-right:4px;
                "
              >
                ${amt}
              </td>
            `;

      watchTbody.appendChild(tr);
    });
  }
}

function buildPrintSBGContingentHTML() {
  const wrapper = qs('.BudgetReportTableWrapper');

  if (!wrapper) return '';

  /* =====================================================
        🔥 GET ALL MONTH TABLES
        ===================================================== */

  // 🔥 GET BOTH TABLES
  const tables = [id('ContingentBillReport'), id('SBGwatchSystem')].filter(Boolean);

  if (!tables.length) {
    showCustomAlert('❌ No data to print');

    return '';
  }

  /* =====================================================
        🔥 CREATE PRINT DOC
        ===================================================== */

  const doc = document.implementation.createHTMLDocument('SBG Contingent Voucher Bill');

  /* =====================================================
        🔥 COPY EXISTING CSS
        ===================================================== */

  qsa("style, link[rel='stylesheet']").forEach((el) => {
    try {
      doc.head.appendChild(el.cloneNode(true));
    } catch {}
  });

  /* =====================================================
        🔥 PRINT CSS
        ===================================================== */

  const style = doc.createElement('style');

  style.textContent = `

          @page{
            size:A4 portrait;
            margin:10mm 10mm 10mm 10mm;
            background:white;
          }

          *{
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
            box-sizing:border-box;
            border-radius:0 !important;
            font-family:Arial,sans-serif;
          }

          body{
            margin:0;
            padding:0;
            background:white;
            font-size:11px;
          }

          .page{
            width:100%;
            margin:0 auto;
            background:white;
            padding-right:2px;
          }

          td,th {
            min-height: 20px !important;
            padding: 4px;
            line-height: 1 !important;
          }

          table{
            border-collapse:collapse !important;
          }

          td[rowspan]{
            vertical-align:top !important;
            display:table-cell !important;
          }
        `;

  doc.head.appendChild(style);

  /* =====================================================
        🔥 CONTAINER
        ===================================================== */

  const container = doc.createElement('div');

  /* =====================================================
        🔥 CLONE ALL TABLES
        ===================================================== */

  tables.forEach((table, idx) => {
    const clone = table.cloneNode(true);
    // ======================================
    // 🔥 FIX INVALID ROWSPAN FOR PDF ONLY
    // ======================================

    clone.querySelectorAll('.sbgCertificateText').forEach((cell) => {
      // 🔥 remove rowspan only in print clone
      cell.removeAttribute('rowspan');

      // 🔥 normal block rendering
      cell.style.display = 'table-cell';

      cell.style.verticalAlign = 'top';

      cell.style.height = 'auto';
    });

    // ======================================
    // 🔥 FIX NESTED SBG TABLE PRINT
    // ======================================

    const nestedSBG = clone.querySelector('#SBGmonthWiseDetails');

    if (nestedSBG) {
      // 🔥 prevent nested table layout breaking
      nestedSBG.style.width = '100%';

      nestedSBG.style.tableLayout = 'fixed';

      nestedSBG.style.margin = '0';

      nestedSBG.style.borderCollapse = 'collapse';

      // ======================================
      // 🔥 FORCE ROW HEIGHTS
      // ======================================

      nestedSBG.querySelectorAll('tr').forEach((tr) => {
        tr.style.height = '22px';

        tr.style.pageBreakInside = 'avoid';
      });

      // ======================================
      // 🔥 FIX CELLS
      // ======================================

      nestedSBG.querySelectorAll('td,th').forEach((cell) => {
        cell.style.wordBreak = 'break-word';
        cell.style.whiteSpace = 'normal';
        cell.style.verticalAlign = 'middle';
        cell.style.lineHeight = '1.1';
        cell.style.padding = '2px';
      });
    }

    clone.classList.add('DGprint-table');

    /* =========================================
          🔥 REMOVE UI ELEMENTS
          ========================================= */

    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

    /* =========================================
          🔥 REMOVE INLINE UI STYLES
          ========================================= */

    if (clone.id === 'SBGwatchSystem') {
      clone.style.pageBreakBefore = 'always';

      clone.style.breakBefore = 'page';

      clone.style.marginTop = '10px';
    }

    container.appendChild(clone);
  });

  /* =====================================================
        🔥 PAGE
        ===================================================== */

  const page = doc.createElement('div');
  page.className = 'page';
  page.appendChild(container);
  doc.body.appendChild(page);

  /* =====================================================
        🔥 RETURN
        ===================================================== */

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

async function excelSBGContingentReport() {
  const workbook = new ExcelJS.Workbook();

  const wrapper = id('BudgetReportTableWrapper');

  if (!wrapper) {
    showCustomAlert('❌ Report not found');

    return;
  }

  const mainTable = wrapper.querySelector('table');
  // 🔥 WATCH TABLE
  const watchTable = id('SBGwatchSystem');

  if (!mainTable || !watchTable) {
    showCustomAlert('❌ Tables are not found');

    return;
  }

  const sheet = workbook.addWorksheet('Contingent Bill');

  // =========================
  // 🔥 COMMON HELPERS
  // =========================

  function rgbToARGB(rgb) {
    const m = rgb.match(/\d+/g);

    if (!m) return null;

    return 'FF' + m.map((x) => (+x).toString(16).padStart(2, '0')).join('');
  }

  function isValidColor(cs) {
    const bg = cs.backgroundColor;

    if (!bg) return false;

    if (bg === 'transparent') return false;

    if (bg.includes('rgba') && bg.endsWith(', 0)')) return false;

    if (bg === 'rgb(0, 0, 0)') return false;

    return true;
  }

  function parseValue(text) {
    if (!text) return ' ';

    const clean = text.replace(/[,₹\s]/g, '');

    return !isNaN(clean) && clean !== '' ? Number(clean) : text;
  }

  // =========================
  // 🔥 TABLE PROCESSOR
  // =========================

  function processTable(sheet, table, startRow = 1, startCol = 1) {
    let currentRow = startRow;
    // ======================================
    // 🔥 TRACK USED ROWS
    // ======================================

    const occupiedRows = new Set();

    function cleanCellText(cell) {
      const clone = cell.cloneNode(true);

      // =====================================
      // 🔥 PRESERVE <br>
      // =====================================

      clone.querySelectorAll('br').forEach((br) => {
        br.replaceWith(document.createTextNode('___BR___'));
      });

      // =====================================
      // 🔥 INLINE ELEMENTS
      // =====================================

      clone.querySelectorAll('span,b,strong,label').forEach((el) => {
        const txt = el.textContent.replace(/\s+/g, ' ').trim();

        el.replaceWith(document.createTextNode(txt));
      });

      // =====================================
      // 🔥 BLOCK ELEMENTS
      // =====================================

      clone.querySelectorAll('p,div').forEach((el) => {
        const txt = el.textContent.replace(/\s+/g, ' ').trim();

        el.replaceWith(document.createTextNode(txt + ' '));
      });

      // =====================================
      // 🔥 REMOVE EMPTY TEXT NODES
      // =====================================

      clone.normalize();

      [...clone.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
          node.remove();
        }
      });

      // =====================================
      // 🔥 FINAL TEXT
      // =====================================

      let text = clone.textContent || '';

      // =====================================
      // 🔥 RESTORE <br>
      // =====================================

      text = text.replace(/___BR___/g, '\n');

      // =====================================
      // 🔥 CLEAN TEXT
      // =====================================

      text = text

        // 🔥 preserve ONLY <br>
        .replace(/\n/g, '___TEMP_BR___')

        // 🔥 remove actual sheet line breaks
        .replace(/[\r\n]+/g, ' ')

        // 🔥 restore <br> line breaks
        .replace(/___TEMP_BR___/g, '\n')

        // 🔥 tabs -> space
        .replace(/\t+/g, ' ')

        // 🔥 multiple spaces
        .replace(/ +/g, ' ')

        // 🔥 clean around preserved breaks
        .replace(/ *\n */g, '\n')

        // 🔥 multiple preserved breaks
        .replace(/\n{2,}/g, '\n')

        // 🔥 trim
        .trim();

      return text;
    }

    // =========================
    // 🔥 WALK TABLE
    // =========================

    function walk(table, isNested = false) {
      const rows = table.querySelectorAll(':scope > thead > tr,' + ':scope > tbody > tr,' + ':scope > tr');

      rows.forEach((tr) => {
        const cells = tr.querySelectorAll(':scope > th, :scope > td');

        if (!cells.length) return;

        let colIndex = 1;

        // ======================================
        // 🔥 FIND NEXT FREE ROW
        // ======================================

        while (occupiedRows.has(currentRow)) {
          currentRow++;
        }

        const excelRow = sheet.getRow(currentRow);

        let maxHeight = 20;

        cells.forEach((cell) => {
          const nested = cell.querySelector('table');

          // =====================
          // 🔥 NESTED TABLE
          // =====================

          if (nested) {
            walk(nested, true);

            return;
          }

          const colSpan = cell.colSpan || 1;

          const rowSpan = cell.rowSpan || 1;

          const excelCell = excelRow.getCell(startCol + colIndex - 1);
          // =====================
          // 🔥 SUB HEADER HEIGHT
          // =====================

          if (cell.id === 'sbgBillSubHeader') {
            excelRow.height = 38;
          }

          // =====================
          // 🔥 CLEAN TEXT
          // =====================

          let text = cleanCellText(cell);

          const isChildBody = cell.closest('#SBGmonthWiseDetails tbody');

          const isWatchBody = cell.closest('#SBGwatchSystem tbody');

          if (isChildBody || isWatchBody) {
            // 🔥 make single logical line
            // Excel will wrap automatically

            text = text

              .replace(/\n+/g, ' ')

              .replace(/\s+/g, ' ')

              .trim();
          }

          // =====================
          // 🔥 VALUE
          // =====================

          const clean = text.replace(/[,₹]/g, '');

          excelCell.value = !isNaN(clean) && clean !== '' ? Number(clean) : text;

          // =====================
          // 🔥 STYLE
          // =====================

          const cs = getComputedStyle(cell);

          const isBold = cs.fontWeight === 'bold' || parseInt(cs.fontWeight) >= 600 || cell.querySelector('b,strong');

          // =====================
          // 🔥 EXACT FONT COPY
          // =====================

          const computedStyle = window.getComputedStyle(cell);

          // 🔥 actual font size
          //const fontSize = parseFloat(computedStyle.fontSize) || 11;

          // 🔥 actual weight
          const fontWeight = computedStyle.fontWeight;
          // =========== 🔥 FONT SIZE ==================
          const finalFontSize = cell.id === 'SBGHeader' ? 12 : 12; //12 for header : 11 for default

          // 🔥 bold detection
          const isReallyBold = fontWeight === 'bold' || parseInt(fontWeight) >= 600 || cell.querySelector('b,strong');

          // 🔥 actual family
          const fontFamily = computedStyle.fontFamily?.split(',')[0]?.replace(/["']/g, '')?.trim() || 'Calibri';
          // =============🔥 FONT=========================
          excelCell.font = {
            name: fontFamily,
            size: finalFontSize,
            bold: isReallyBold,
            italic: computedStyle.fontStyle === 'italic',
            underline: computedStyle.textDecoration?.includes('underline'),
            color: { argb: rgbToARGB(computedStyle.color) || 'FF000000' }
          };

          // =====================
          // 🔥 EXACT ALIGNMENT COPY
          // =====================

          // 🔥 horizontal
          let horizontal = computedStyle.textAlign || 'left';

          // 🔥 convert justify
          if (horizontal === 'justify') {
            horizontal = 'left';
          }

          // 🔥 vertical
          let vertical = computedStyle.verticalAlign || 'middle';

          // 🔥 convert css values
          if (vertical === 'top') {
            vertical = 'top';
          } else if (vertical === 'bottom') {
            vertical = 'bottom';
          } else {
            vertical = 'middle';
          }

          excelCell.alignment = {
            horizontal,

            vertical,

            wrapText: true,

            shrinkToFit: false
          };

          // =====================
          // 🔥 TEXT COLOR
          // =====================

          const color = rgbToARGB(cs.color);

          if (color && color !== 'FF000000') {
            excelCell.font.color = {
              argb: color
            };
          }

          // =====================
          // 🔥 BG COLOR
          // =====================

          if (isValidColor(cs)) {
            const argb = rgbToARGB(cs.backgroundColor);

            if (argb && argb !== 'FF000000') {
              excelCell.fill = {
                type: 'pattern',

                pattern: 'solid',

                fgColor: {
                  argb
                }
              };
            }
          }

          // =====================
          // 🔥 BORDER COPY
          // =====================

          function getExcelBorder(side, cs) {
            const width = parseFloat(cs[`border${side}Width`]);
            const style = cs[`border${side}Style`];
            const color = rgbToARGB(cs[`border${side}Color`]) || 'FF000000';

            if (style === 'none' || width <= 0) {
              return undefined;
            }

            return {
              style: width >= 2 ? 'thick' : width >= 1 ? 'thin' : 'thin',

              color: {
                argb: color
              }
            };
          }

          excelCell.border = {
            top: getExcelBorder('Top', cs),

            bottom: getExcelBorder('Bottom', cs),

            left: getExcelBorder('Left', cs),

            right: getExcelBorder('Right', cs)
          };

          // =====================
          // 🔥 MERGE
          // =====================

          if (rowSpan > 1 || colSpan > 1) {
            try {
              sheet.mergeCells(
                currentRow,
                startCol + colIndex - 1,

                currentRow + rowSpan - 1,

                startCol + colIndex + colSpan - 2
              );
            } catch {}
          }

          colIndex += colSpan;
        });

        // =====================// 🔥 APPLY HEIGHT=======================

        excelRow.height = 17;

        // =============🔥 COMMIT==============

        excelRow.commit();

        // ==============🔥 HANDLE ROWSPAN=============

        let maxRowSpan = 1;

        cells.forEach((cell) => {
          const rs = cell.rowSpan || 1;

          if (rs > maxRowSpan) {
            maxRowSpan = rs;
          }
        });

        // ======================================
        // 🔥 MARK ROWS OCCUPIED
        // ======================================

        // mark only extra rows occupied by rowspan
        for (let r = currentRow; r < currentRow + maxRowSpan; r++) {
          occupiedRows.add(r);
        }

        // move to next logical row
        currentRow++;
      });
    }

    // ======================================
    // 🔥 ALLOW EXCEL AUTO HEIGHT
    // ======================================

    sheet.eachRow((row) => {
      row.height = 16;
    });

    walk(table);

    return currentRow;
  }

  const lastRow = processTable(sheet, mainTable, 1, 1);

  // ======================================
  // 🔥 WATCH SYSTEM @ G4
  // ======================================

  if (watchTable) {
    processTable(
      sheet,
      watchTable,
      4, // row
      6 // column F
    );
  }

  // =========================
  // 🔥 SETTINGS
  // =========================

  sheet.views = [
    {
      showGridLines: false
    }
  ];

  sheet.columns = [
    { width: 15 }, // A
    { width: 10 }, // B
    { width: 90 }, // C
    { width: 18 }, // D
    { width: 5 }, // E

    // 🔥 WATCH SYSTEM
    { width: 15 }, // F
    { width: 90 }, // G
    { width: 18 } // H
  ];

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',

    // Disable 'fitToPage' to allow manual control over width/height
    fitToPage: true,

    // Set these to force columns to fit the page width
    fitToWidth: 1,
    fitToHeight: 0, // 0 or false means "as many pages as needed vertically"

    printArea: `A1:D${lastRow}`,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    }
  };

  // =========================
  // 📥 DOWNLOAD
  // =========================

  const buffer = await workbook.xlsx.writeBuffer();

  const station = id('BudgetPage_Station')?.value || '';

  const budget = id('BudgetUnderSelect')?.value || '';

  let reportPeriod = 'Report';

  if (window.currentSBGReportMode === 'fy') {
    reportPeriod = id('BudgetPage_FY')?.value || 'FY';
  } else if (window.currentSBGReportMode === 'month') {
    reportPeriod = (id('headerMonth')?.textContent || '')

      .replace(/[\\/:*?"<>|]/g, '')

      .trim();
  } else {
    reportPeriod = (window.currentSBGSelectedDate || '')

      .replace(/[\\/:*?"<>|]/g, '')

      .trim();
  }

  const fileName = `${station}_` + `Contingent Bill_` + `${budget}_` + `${reportPeriod}.xlsx`;

  saveAs(
    new Blob([buffer]),

    fileName
  );
}

function getFYColumnIndexes(headers, fy) {
  let sbgCol = -1;
  let usedCol = -1;
  let availCol = -1;

  headers.forEach((h, i) => {
    const clean = String(h).toLowerCase();

    if (clean.includes(fy.toLowerCase()) && clean.includes('(sbg)')) {
      sbgCol = i;
    }

    if (clean.includes(fy.toLowerCase()) && clean.includes('(used)')) {
      usedCol = i;
    }

    if (clean.includes(fy.toLowerCase()) && clean.includes('(available)')) {
      // ✅ FIXED
      availCol = i;
    }
  });

  return { sbgCol, usedCol, availCol };
}

// ✅ BUILD USED MAP (FY + Budget + Station)
function getSBGUsedMap() {
  const map = {};
  if (!sbgExpData || !sbgExpData.rows) return map;

  sbgExpData.rows.forEach((row) => {
    const date = row[0]; // e.g., "01-04-2026"
    const station = String(row[1]).trim().toLowerCase();
    const budget = String(row[3]).trim().toLowerCase();
    // Use the raw amount (index 5) - Ensure CurrencytoNum is reliable
    const amount = Number(CurrencytoNum(row[5]) || 0);

    const fy = getFYFromDateStr(date);
    const key = `${fy}|${budget}|${station}`;

    map[key] = (map[key] || 0) + amount;
  });
  return map;
}

function addSBGRows(count = 10) {
  const tbody = qs('#budgetPBBody');
  if (!tbody) return;

  // 🔥 REMOVE "NO DATA" MERGED ROW (IMPORTANT)
  const firstRow = tbody.querySelector('tr');

  if (firstRow && firstRow.children.length === 1) {
    tbody.innerHTML = ''; // remove merged row completely
  }

  const budgetSelect = id('BudgetUnderSelect');
  const stationSelect = id('BudgetPage_Station');

  const selectedBudget = budgetSelect.options[budgetSelect.selectedIndex].text;
  const selectedStation = stationSelect.options[stationSelect.selectedIndex].text;

  for (let i = 0; i < count; i++) {
    const tr = document.createElement('tr');

    tr.dataset.rowIndex = ''; // 🔥 NEW ROW

    tr.innerHTML = `
            <td style="padding:0px"><input style="width:100%;border-radius:0" type="date"></td>

            <td style="padding:0px">
              <textarea class="bill-text"></textarea>
            </td>

            <td style="padding:0px">
              <textarea class="details-text"></textarea>
            </td>

            <td style="padding:0px">
              <input style="width:100%;border-radius:0;height:100%" type="number" class="amt" value="0">
            </td>

            <td style="width:100%;text-align:right;" class="monthcum"></td>

            <td style="width:100%;text-align:right;" class="cum"></td>
          `;

    tbody.appendChild(tr);
  }
}

let previousCumulative = 0;

function initPreviousCumulative() {
  previousCumulative = getLastCumulativeFromTable();
  //console.log("🔥 Previous:", previousCumulative);
}

function getLastCumulativeFromTable() {
  const container = id('BudgetTableWrapper');

  const rows = container.querySelectorAll('table tbody tr');

  if (!rows.length) return 0;

  // ✅ ALWAYS TAKE FIRST ROW (existing data row)
  const firstRow = rows[0];

  const lastCell = firstRow.children[7]?.textContent || '0';

  const clean = String(lastCell).replace(/[^0-9.-]/g, '');

  return Number(clean) || 0;
}

function sortRowsByDate(rows) {
  return [...rows].sort((a, b) => {
    const d1 = new Date(a.querySelector('input[type="date"]')?.value || a.children[0].textContent);
    const d2 = new Date(b.querySelector('input[type="date"]')?.value || b.children[0].textContent);
    return d1 - d2;
  });
}

function CalculateCumulative(mode = 'add') {
  const tbody = qs('#BudgetTableWrapper tbody');

  if (!tbody) return;

  function calculate() {
    const rows = [...tbody.querySelectorAll('tr')];

    // ======================================
    // 🔥 SORT DATEWISE
    // ======================================

    rows.sort((a, b) => {
      const getDate = (r) => {
        const input = r.querySelector('input[type="date"]');

        if (input && input.value) return input.value;

        return r.children[0]?.textContent || '';
      };

      const parse = (d) => {
        if (!d) return new Date(0);

        if (d.includes('-') && d.length === 10) {
          if (d[4] === '-') {
            return new Date(d);
          }

          const [dd, mm, yyyy] = d.split('-');

          return new Date(yyyy, mm - 1, dd);
        }

        return new Date(0);
      };

      return parse(getDate(a)) - parse(getDate(b));
    });

    // ======================================
    // 🔥 RUNNING TOTALS
    // ======================================

    const fyTotals = {};

    const monthTotals = {};

    rows.forEach((r) => {
      // ======================================
      // 🔥 DATE
      // ======================================

      let dateStr = '';

      const dateInput = r.querySelector('input[type="date"]');

      if (dateInput && dateInput.value) {
        const [y, m, d] = dateInput.value.split('-');

        dateStr = `${d}-${m}-${y}`;
      } else {
        dateStr = r.children[0]?.textContent || '';
      }

      const fy = getFYFromDateStr(dateStr);

      // 🔥 Invalid / empty date → clear cumulative columns
      if (!fy) {
        const monthCell = r.querySelector('.monthcum') || r.children[6];
        const fyCell = r.querySelector('.cum') || r.children[7];

        if (monthCell) {
          monthCell.dataset.value = '';
          monthCell.textContent = '';
        }

        if (fyCell) {
          fyCell.dataset.value = '';
          fyCell.textContent = '';
        }

        return;
      }

      // ======================================
      // 🔥 MONTH KEY
      // ======================================

      const [dd, mm, yyyy] = dateStr.split('-');

      const monthKey = fy + '|' + mm + '|' + yyyy;

      // ======================================
      // 🔥 INIT
      // ======================================

      if (!fyTotals[fy]) {
        fyTotals[fy] = 0;
      }

      if (!monthTotals[monthKey]) {
        monthTotals[monthKey] = 0;
      }

      // ======================================
      // 🔥 AMOUNT
      // ======================================

      let amt = 0;

      const amtInput = r.querySelector('.amt');

      if (amtInput) {
        amt = Number(amtInput.value || 0);
      } else {
        const val = r.children[5]?.textContent || '0';

        amt = Number(val.replace(/[^0-9.-]/g, '')) || 0;
      }

      // ======================================
      // 🔥 TOTALS
      // ======================================

      fyTotals[fy] += amt;

      monthTotals[monthKey] += amt;

      // ======================================
      // 🔥 MONTH CELL
      // ======================================

      const monthCell = r.querySelector('.monthcum') || r.children[6];

      if (monthCell) {
        monthCell.dataset.value = monthTotals[monthKey];

        monthCell.textContent = formatCurrency(monthTotals[monthKey]);
      }

      // ======================================
      // 🔥 FY CELL
      // ======================================

      const fyCell = r.querySelector('.cum') || r.children[7];

      if (fyCell) {
        fyCell.dataset.value = fyTotals[fy];

        fyCell.textContent = formatCurrency(fyTotals[fy]);
      }
    });
  }

  // ======================================
  // 🔥 EVENTS
  // ======================================

  if (!tbody._cumAttached) {
    tbody.addEventListener('input', (e) => {
      if (e.target.classList.contains('amt') || e.target.type === 'date') {
        calculate();
      }
    });

    tbody._cumAttached = true;
  }

  calculate();
}

function formatDateBack(d) {
  if (!d) return '';

  const parts = d.split('-');

  // input: yyyy-mm-dd → output: dd-mm-yyyy
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return d;
}

function convertSBGTableToEditable() {
  const tbody = qs('#BudgetTableWrapper table tbody');

  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');

  rows.forEach((tr) => {
    [...tr.children].forEach((td, colIndex) => {
      const text = td.textContent;

      // ======================================
      // ❌ SKIP
      // ======================================

      if (
        colIndex === 3 || // Budget
        colIndex === 6 || // Monthly Cum
        colIndex === 7 || // FY Cum
        colIndex === 8 // Report
      )
        return;

      // ======================================
      // 📅 DATE
      // ======================================

      if (colIndex === 0) {
        td.style.padding = '0';

        td.innerHTML = `
                <input
                  type="date"
                  value="${formatDateInput(text)}"
                  style="
                    width:100%;
                    border-radius:0;
                    height:100%
                  "
                >
              `;
      }

      // ======================================
      // 🧾 BILL + DETAILS
      // ======================================
      else if (colIndex === 2 || colIndex === 4) {
        td.style.padding = '0';

        td.innerHTML = `
                <textarea
                  style="
                    width:100%;
                    height:100%;
                    border-radius:0;
                  "
                >${text}</textarea>
              `;
      }

      // ======================================
      // 💰 AMOUNT
      // ======================================
      else if (colIndex === 5) {
        const clean = text.replace(/[^0-9.-]/g, '');

        td.style.padding = '0';

        td.innerHTML = `
                <input
                  type="number"
                  class="amt"
                  value="${clean}"
                  style="
                    width:100%;
                    border-radius:0;
                    height:100%
                  "
                >
              `;
      }
    });
  });

  //console.log("✅ Converted to editable table");
}

function formatDateInput(dateStr) {
  if (!dateStr) return '';

  const [d, m, y] = dateStr.split('-');
  return `${y}-${m}-${d}`;
}

['BudgetUnderSelect', 'BudgetPage_Month'].forEach((idName) => {
  id(idName)?.addEventListener('change', () => {
    getBudgetFYColumns();
    renderFilterMainBudgetExpTable();
    renderSBGDetailsTable(id('BudgetPage_Station').value, id('BudgetPage_FY').value, id('BudgetPage_Month').value);
  });
});
['BudgetPage_Station', 'BudgetPage_FY'].forEach((idName) => {
  id(idName)?.addEventListener('change', () => {
    loadBudgetMonthDropdown();
    getBudgetFYColumns();
    renderFilterMainBudgetExpTable();
    renderSBGDetailsTable(id('BudgetPage_Station').value, id('BudgetPage_FY').value, id('BudgetPage_Month').value);
  });
});

async function saveSBGData(modeType = 'add') {
  let data = [];
  const rows = qsa('#budgetPBBody tr');

  const normalize = (val) => {
    if (val == null) return '';
    return String(val).replace(/₹/g, '').replace(/,/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  };

  const selectedStation = id('BudgetPage_Station')?.value?.trim() || '';
  const selectedBudget = id('BudgetUnderSelect')?.options[id('BudgetUnderSelect').selectedIndex]?.text?.trim() || '';

  rows.forEach((tr) => {
    const dateInput = tr.children[0]?.querySelector('input[type="date"]')?.value || tr.children[0]?.textContent?.trim() || '';

    let station, budget, bill, details;
    let amount, monthlyCumulative, cumulative;

    if (modeType === 'add') {
      station = selectedStation;
      budget = selectedBudget;

      bill = tr.children[1]?.querySelector('textarea')?.value || tr.children[1]?.textContent?.trim() || '';

      details = tr.children[2]?.querySelector('textarea')?.value || tr.children[2]?.textContent?.trim() || '';

      amount = Number(tr.children[3]?.querySelector('.amt')?.value || tr.children[3]?.textContent?.replace(/[^0-9.-]/g, '') || 0);

      monthlyCumulative = Number(tr.children[4]?.dataset?.value || tr.children[4]?.textContent?.replace(/[^0-9.-]/g, '') || 0);

      cumulative = Number(tr.children[5]?.dataset?.value || tr.children[5]?.textContent?.replace(/[^0-9.-]/g, '') || 0);
    } else {
      station = tr.children[1]?.querySelector('input')?.value || tr.children[1]?.textContent?.trim() || '';

      budget = tr.children[3]?.textContent?.trim() || '';

      bill = tr.children[2]?.querySelector('textarea')?.value || tr.children[2]?.textContent?.trim() || '';

      details = tr.children[4]?.querySelector('textarea')?.value || tr.children[4]?.textContent?.trim() || '';

      amount = Number(tr.querySelector('.amt')?.value || tr.children[5]?.textContent?.replace(/[^0-9.-]/g, '') || 0);

      monthlyCumulative = Number(tr.children[6]?.dataset?.value || tr.children[6]?.textContent?.replace(/[^0-9.-]/g, '') || 0);

      cumulative = Number(tr.children[7]?.dataset?.value || tr.children[7]?.textContent?.replace(/[^0-9.-]/g, '') || 0);
    }

    if (!station || !dateInput || !budget || amount === 0) return;

    if (modeType === 'edit') {
      let originalRow = [];
      try {
        originalRow = JSON.parse(tr.dataset.original || '[]');
      } catch {
        originalRow = [];
      }
      const currentRow = [formatDateBack(dateInput), station, bill, budget, details, Number((amount / 1000).toFixed(3)), Number((monthlyCumulative / 1000).toFixed(3)), Number((cumulative / 1000).toFixed(3))];
      if (JSON.stringify(originalRow.map(normalize)) === JSON.stringify(currentRow.map(normalize))) return;
    }

    data.push({
      _RowIndex: tr.dataset.rowIndex || '',
      _lastUpdated: tr.dataset.lastUpdated || '',
      Date: formatDateBack(dateInput),
      Station: station.trim(),
      'Bill / Invoice Details': bill.trim(),
      'SBG Expenditure Under': budget.trim(),
      'Expenditure Details': details.trim(),
      'Expenditure Amount (₹ in 000)': Number((amount / 1000).toFixed(3)),
      'Monthly Cumulative Sum of Expenditure (₹ in 000)': Number((monthlyCumulative / 1000).toFixed(3)),
      'Cumulative Sum of Expenditure (₹ in 000)': Number((cumulative / 1000).toFixed(3))
    });
  });

  if (!data.length) {
    showCustomAlert('ℹ️ No changes detected.<br><br>No data was modified.');
    return;
  }

  try {
    setSyncStatus('sbgexpDatabase');
    showLoader();
    updateLoader(20, 'Saving SBG Data...', 'upload');

    const res = await fetch('https://office-management-f425.onrender.com/sbgexp/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, mode: modeType })
    });

    const result = await res.json();

    if (result.status === 'nochange') {
      clearSyncStatus('sbgexpDatabase');
      hideLoader();
      showCustomAlert('ℹ️ No changes detected.<br><br>No data was modified.');
      exitSBGEditMode();
      return;
    }

    if (result.status === 'success') {
      updateLoader(70, 'Syncing...', 'sync');

      await fetch('https://office-management-f425.onrender.com/refresh/sbgexp', { method: 'POST' });
      await fetch('https://office-management-f425.onrender.com/refresh/sbg', { method: 'POST' });

      await reloadSBGExpData();
      await calculateAndPushSBGBudget();
      await loadTable('sbgexp', 'SBGexpenditureDB');
      await loadTable('sbg', 'BudgetDB');
      getBudgetFYColumns();

      /* 🔥 BUILD CUSTOM MESSAGE */
      let msg = '';
      const updatedRows = result.updatedRows || [];
      const addedRows = result.addedRows || [];

      if (updatedRows.length) {
        msg += '<div style="font-size:13px;font-weight:700;color:#7dffb3;margin-bottom:18px;text-align:center">📝 SBG EDIT SUCCESS!</div>';
        msg += updatedRows
          .map(
            (r) => `
                <div style="margin-bottom:16px;padding:8px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">
                  <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📅 ${r.date}</div>
                  <div>🏢 ${r.station}</div><div>📈 ${r.budget}</div><div>🪙 ${formatCurrency(Number(r.amount || 0) * 1000)}</div>
                  <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
                    ${(r.changedColumns || []).map((c) => `<span style="display:inline-block;padding:2px 4px;margin:3px;border-radius:10px;background:rgba(255,255,255,0.08);font-size:13px;">🔃 ${c}</span>`).join('')}
                  </div>
                </div>`
          )
          .join('');
      }

      if (addedRows.length) {
        msg += '<div style="font-size:13px;font-weight:700;color:#7dffb3;margin-bottom:18px;text-align:center">➕ SBG ADD SUCCESS!</div>';
        msg += addedRows
          .map(
            (r) => `
                <div style="padding:10px 14px;margin-bottom:10px;border-radius:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">
                  📅 ${r.date}<br>🏢 ${r.station}<br>📈 ${r.budget}<br>🪙 ${formatCurrency(Number(r.amount || 0) * 1000)}
                </div>`
          )
          .join('');
      }

      updateLoader(100, 'Saved successfully!', 'check_circle');
      exitSBGEditMode();
      setTimeout(() => {
        hideLoader();
        showCustomAlert(msg || '✅ Data updated successfully.');
      }, 500);
      return;
    }

    hideLoader();
    const errorMsg = result.status === 'conflict' ? '⚠️ Conflict: Row modified elsewhere.' : `❌ Error: ${result.message || 'Unknown error'}`;
    showCustomAlert(errorMsg);
  } catch (err) {
    console.error(err);
    hideLoader();
    clearSyncStatus('sbgexpDatabase', 'db', false);
    showCustomAlert('❌ Server error: Unable to complete save.');
  }
}

let isSBGModeActive = false;
let currentSBGMode = null;

/* =========================================================
      🔥 SBG TOGGLE BUTTON
      ========================================================= */
function toggleColumnVisibility(isVisible) {
  const cells = document.querySelectorAll('.SBGreport-col');
  cells.forEach((cell) => {
    cell.style.display = isVisible ? '' : 'none';
  });
}

function setupSBGToggleButton(btnId, config, modeType) {
  const selectedBudget = id('BudgetUnderSelect');
  const selectedFY = id('BudgetPage_FY');
  const selectedStation = id('BudgetPage_Station');
  const sbgedit = id('SBGeditBtn');
  const sbgadd = id('SBGaddBtn');
  const sbgprint = id('SBGprintBtn');
  const sbgXL = id('SBGexcelBtn');
  const sbgcancel = id('SBGcancelBtn');
  const btn = id(btnId);

  if (!btn) return;

  let isProcessing = false;
  btn.onclick = async () => {
    if (isProcessing) return;

    isProcessing = true;

    try {
      const wrapper = qs('.BudgetTableWrapper');

      /* =====================================
            🔥 ENTER MODE
            ===================================== */

      if (!isSBGModeActive) {
        isSBGModeActive = true;
        toggleColumnVisibility(false);
        currentSBGMode = modeType;

        /* =====================================
              🔥 DISABLE FILTERS
              ===================================== */

        selectedBudget.disabled = true;
        selectedFY.disabled = true;
        selectedStation.disabled = true;
        sbgprint.disabled = true;
        sbgXL.disabled = true;
        sbgcancel.disabled = false;
        /* =====================================
              🔥 DISABLE OTHER BUTTON
              ===================================== */

        if (modeType === 'add') {
          sbgedit.disabled = true;
        }

        if (modeType === 'edit') {
          sbgadd.disabled = true;
        }

        /* =====================================
              🔥 EDIT MODE CLASS
              ===================================== */

        wrapper?.classList.add('edit-mode');

        /* =====================================
              🔥 ACTIVE BUTTON STYLE
              ===================================== */

        btn.classList.add(config.className);
        btn.classList.add('upload-mode');
        const span = btn.querySelector('span');
        if (span) {
          span.textContent = config.activeText;
        }
        updateIcon(btn, config.activeIcon);

        /* =====================================
              🔥 ADD MODE
              ===================================== */

        if (modeType === 'add') {
          addSBGRows(10);
          setTimeout(() => {
            initPreviousCumulative();
            CalculateCumulative('add');
          }, 50);
        } else if (modeType === 'edit') {
          /* =====================================
              🔥 EDIT MODE
              ===================================== */
          convertSBGTableToEditable();
          setTimeout(() => {
            CalculateCumulative('edit');
          }, 50);
        }
      } else if (currentSBGMode === modeType) {
        /* =====================================
            🔥 SAVE MODE
            ===================================== */
        const success = await saveSBGData(modeType);
        if (!success) {
          isProcessing = false;
          return;
        }
        exitSBGEditMode();
      }
    } catch (err) {
      console.error('❌ SBG Toggle Error:', err);
    } finally {
      isProcessing = false;
    }
  };
}

/* =========================================================
      🔥 CANCEL BUTTON
      ========================================================= */

on('SBGcancelBtn', 'click', () => {
  /* =====================================
        🔥 NO ACTIVE MODE
        ===================================== */

  if (!isSBGModeActive) {
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
      exitSBGEditMode();
    }
  });
});

/* =========================================================
      🔥 EXIT EDIT MODE
      ========================================================= */

function exitSBGEditMode() {
  isSBGModeActive = false;
  currentSBGMode = null;
  const selectedBudget = id('BudgetUnderSelect');
  const selectedFY = id('BudgetPage_FY');
  const selectedStation = id('BudgetPage_Station');
  const wrapper = qs('.BudgetTableWrapper');
  const sbgedit = id('SBGeditBtn');
  const sbgadd = id('SBGaddBtn');
  const sbgprint = id('SBGprintBtn');
  const sbgXL = id('SBGexcelBtn');
  const sbgcancel = id('SBGcancelBtn');
  /* =====================================
        🔥 ENABLE FILTERS
        ===================================== */

  selectedBudget.disabled = false;
  selectedFY.disabled = false;
  selectedStation.disabled = false;
  sbgprint.disabled = false;
  sbgXL.disabled = false;
  sbgcancel.disabled = true;

  /* =====================================
        🔥 REMOVE EDIT MODE
        ===================================== */

  wrapper?.classList.remove('edit-mode');

  /* =====================================
        🔥 RESET EDIT BUTTON
        ===================================== */

  if (sbgedit) {
    sbgedit.disabled = false;

    sbgedit.classList.remove('active-edit', 'upload-mode', 'add-mode');

    const span = sbgedit.querySelector('span');

    if (span) {
      span.textContent = 'Edit';
    }

    updateIcon(sbgedit, 'edit');
  }

  /* =====================================
        🔥 RESET ADD BUTTON
        ===================================== */

  if (sbgadd) {
    sbgadd.disabled = false;

    sbgadd.classList.remove('active-add', 'upload-mode', 'add-mode');

    const span = sbgadd.querySelector('span');

    if (span) {
      span.textContent = 'Add';
    }

    updateIcon(sbgadd, 'plus');
  }

  /* =====================================
        🔥 RELOAD TABLE
        ===================================== */
  toggleColumnVisibility(true);
  renderFilterMainBudgetExpTable();
}

function renderSBGDetailsTable(station, fy, selectedMonth) {
  if (!sbgData?.rows || !sbgExpData?.rows) {
    throw new Error('Data not ready');
  }

  const table = id('SBGDetailsTable');
  if (!table) return;

  table.innerHTML = '';

  // =========================================
  // 🔥 SBG DATA
  // =========================================
  const headers = sbgData.headers;
  const dataRows = sbgData.rows.slice(1);

  // =========================================
  // 🔥 FY COLUMN
  // =========================================
  const sbgCol = headers.findIndex((h) => String(h).includes(fy) && String(h).includes('(SBG)'));

  if (sbgCol === -1) {
    table.innerHTML = `<tr><td>No FY Data Found</td></tr>`;
    return;
  }

  // =========================================
  // 🔥 MONTHS
  // =========================================
  const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const selectedMonthShort = String(selectedMonth).split('-')[0].trim();
  const selectedMonthIndex = monthNames.findIndex((m) => m.toUpperCase() === selectedMonthShort.toUpperCase());

  // =========================================
  // 🔥 FY YEAR
  // =========================================
  const fyStartYear = Number(String(fy).split('-')[0]);

  // =========================================
  // 🔥 EXP DATA
  // =========================================
  const expHeaders = sbgExpData.headers;
  const expRows = sbgExpData.rows;
  const expStationIdx = expHeaders.indexOf('Station');
  const expHeadIdx = expHeaders.indexOf('SBG Expenditure Under');
  const expDateIdx = expHeaders.indexOf('Date');
  const expAmountIdx = expHeaders.indexOf('Expenditure Amount (₹ in 000)');

  // =========================================
  // 🔥 ALL MONTH LOGIC
  // =========================================
  let isAllMonth = selectedMonthShort.toUpperCase() === 'ALL';
  let effectiveMonthIndex = selectedMonthIndex;

  if (isAllMonth) {
    let latestFound = -1;
    expRows.forEach((exp) => {
      const expDate = String(exp[expDateIdx] || '').trim();
      if (!expDate) return;
      const parts = expDate.split('-');
      if (parts.length !== 3) return;
      const monthNum = Number(parts[1]);
      const yearNum = Number(parts[2]);
      if (isNaN(monthNum) || isNaN(yearNum)) return;

      const isCurrentFY = (yearNum === fyStartYear && monthNum >= 4) || (yearNum === fyStartYear + 1 && monthNum <= 3);
      if (!isCurrentFY) return;

      const idx = monthNum >= 4 ? monthNum - 4 : monthNum + 8;
      if (idx > latestFound) latestFound = idx;
    });
    effectiveMonthIndex = latestFound;
  }

  // =========================================
  // 🔥 DISPLAY MONTH
  // =========================================
  let displayMonth = selectedMonth;
  if (isAllMonth && effectiveMonthIndex >= 0) {
    displayMonth = `${monthNames[effectiveMonthIndex]}-${fyStartYear}`;
    if (effectiveMonthIndex >= 9) {
      displayMonth = `${monthNames[effectiveMonthIndex]}-${fyStartYear + 1}`;
    }
  }

  // =========================================
  // 🔥 TABLE HEADER
  // =========================================
  let html = `
          <colgroup>
            <col style="width:5%"><col style="width:35%"><col style="width:13%"><col style="width:13%"><col style="width:13%"><col style="width:13%"><col style="width:8%">
          </colgroup>
          <thead>
            <div style="font-size:12px;font-weight:bold;border:none;text-align:right;position:absolute;top:0;right:2px">${station} ${fy}</div>
            <tr><th colspan="7" style="border:none;font-size:12px;padding:0;height:20px">प्रसार भारती / PRASAR BHARATI</th></tr>
            <tr><th colspan="7" style="border:none;padding:0;font-size:12px;height:20px">भारत के लोक सेवा प्रसारक / INDIA'S PUBLIC SERVICE BROADCASTER</th></tr>
            <tr><th colspan="7" style="border:none;font-size:12px;padding:0;height:20px">आकाशवाणी धारवाड़ / AKASHAVANI DHARWAD - 580 008</th></tr>
            <tr class="sbg-title-row">
              <th colspan="7" style="text-align:center;font-weight:bold;border:none;height:50px;padding-bottom:5px !important;vertical-align:bottom;">
                STATEMENT SHOWING CONSOLIDATED MONTHLY EXPENDITURE UPTO THE MONTH OF : ${displayMonth}<br>
                IN RESPECT OF DG : AIR STATIONS / OFFICES
              </th>
            </tr>
            <tr class="sbg-header-row">
              <th style="font-weight:900;border:1px solid #000;">SL. No.</th>
              <th style="font-weight:900;border:1px solid #000;">SUB HEADS</th>
              <th style="font-weight:900;border:1px solid #000;">SBG <br>${fy}</th>
              <th style="font-weight:900;border:1px solid #000;">EXPDT. UPTO<br> PREV.MONTH</th>
              <th style="font-weight:900;border:1px solid #000;">EXPDT. DURING <br>THE MONTH</th>
              <th style="font-weight:900;border:1px solid #000;">PROG. <br>EXPENDITURE</th>
              <th style="font-weight:900;border:1px solid #000;">% of <br>EXPDT.</th>
            </tr>
          </thead>
          <tbody>
        `;

  const groups = [
    {
      title: 'A) Salary',
      subGroups: [
        { title: 'I) For Govt. Employees', start: 0, end: 2, totalTitle: 'Total (I)' },
        { title: 'II) For PB Employees', start: 3, end: 7, totalTitle: 'Total (II)' }
      ],
      finalTotalTitle: 'Sub-Total (A)'
    },
    { title: 'B) Other Admn Expenditure (IEBR)', start: 8, end: 28, finalTotalTitle: 'Sub-Total (B)' },
    { title: 'C) Programme Expenses', start: 29, end: 35, finalTotalTitle: 'Sub-Total (C)' }
  ];

  function calcRowValues(row) {
    const budgetHead = String(row[0] || '').trim();
    const sbgValue = Number(row[sbgCol]) || 0;
    let previousUsed = 0,
      currentMonthUsed = 0;

    expRows.forEach((exp) => {
      const expStation = String(exp[expStationIdx] || '').trim();
      const expHead = String(exp[expHeadIdx] || '').trim();
      const amount = Number(exp[expAmountIdx]) || 0;

      if (expStation !== String(station).trim() || expHead !== budgetHead) return;

      const expDate = String(exp[expDateIdx] || '').trim();
      if (!expDate) return;

      const parts = expDate.split('-');
      if (parts.length !== 3) return;

      const monthNum = Number(parts[1]);
      const yearNum = Number(parts[2]);
      const isCurrentFY = (yearNum === fyStartYear && monthNum >= 4) || (yearNum === fyStartYear + 1 && monthNum <= 3);
      if (!isCurrentFY) return;

      const expMonthIndex = monthNum >= 4 ? monthNum - 4 : monthNum + 8;
      if (expMonthIndex < effectiveMonthIndex) previousUsed += amount;
      if (expMonthIndex === effectiveMonthIndex) currentMonthUsed += amount;
    });

    return {
      sbgValue,
      previousUsed,
      currentMonthUsed,
      progressive: previousUsed + currentMonthUsed,
      percent: sbgValue > 0 ? ((previousUsed + currentMonthUsed) / sbgValue) * 100 : 0
    };
  }

  function renderTotalRow(title, totals, isGrand = false) {
    html += `
            <tr class="${isGrand ? 'sbg-grand-total-row' : 'sbg-subtotal-row'}">
              <td></td>
              <td style="font-weight:900;border:2px solid #000;">${title}</td>
              <td style="font-weight:900;border:2px solid #000;">${totals.sbg.toFixed(0)}</td>
              <td style="font-weight:900;border:2px solid #000;">${totals.prev.toFixed(1)}</td>
              <td style="font-weight:900;border:2px solid #000;">${totals.current.toFixed(1)}</td>
              <td style="font-weight:900;border:2px solid #000;">${totals.prog.toFixed(1)}</td>
              <td style="font-weight:900;border:2px solid #000;"></td>
            </tr>
          `;
  }

  let grandTotals = { sbg: 0, prev: 0, current: 0, prog: 0 };

  groups.forEach((group) => {
    html += `<tr class="sbg-main-category"><td colspan="7" style="font-weight:900;border:2px solid #000;background:#f3f3f3;">${group.title}</td></tr>`;
    let groupTotals = { sbg: 0, prev: 0, current: 0, prog: 0 };

    if (group.subGroups) {
      group.subGroups.forEach((sub) => {
        html += `<tr class="sbg-sub-header"><td colspan="7" style="font-weight:900;border:2px solid #000;background:#fafafa;">${sub.title}</td></tr>`;
        let subTotals = { sbg: 0, prev: 0, current: 0, prog: 0 };

        for (let i = sub.start; i <= sub.end; i++) {
          const row = dataRows[i];
          if (!row) continue;
          const vals = calcRowValues(row);
          subTotals.sbg += vals.sbgValue;
          subTotals.prev += vals.previousUsed;
          subTotals.current += vals.currentMonthUsed;
          subTotals.prog += vals.progressive;
          groupTotals.sbg += vals.sbgValue;
          groupTotals.prev += vals.previousUsed;
          groupTotals.current += vals.currentMonthUsed;
          groupTotals.prog += vals.progressive;
          grandTotals.sbg += vals.sbgValue;
          grandTotals.prev += vals.previousUsed;
          grandTotals.current += vals.currentMonthUsed;
          grandTotals.prog += vals.progressive;
          html += `<tr><td>${i + 1}</td><td class="budget-name">${row[0]}</td><td>${vals.sbgValue.toFixed(0)}</td><td>${vals.previousUsed.toFixed(1)}</td><td>${vals.currentMonthUsed.toFixed(1)}</td><td>${vals.progressive.toFixed(1)}</td><td>${vals.percent.toFixed(2)}%</td></tr>`;
        }
        renderTotalRow(sub.totalTitle, subTotals);
      });
    } else {
      for (let i = group.start; i <= group.end; i++) {
        const row = dataRows[i];
        if (!row) continue;
        const vals = calcRowValues(row);
        groupTotals.sbg += vals.sbgValue;
        groupTotals.prev += vals.previousUsed;
        groupTotals.current += vals.currentMonthUsed;
        groupTotals.prog += vals.progressive;
        grandTotals.sbg += vals.sbgValue;
        grandTotals.prev += vals.previousUsed;
        grandTotals.current += vals.currentMonthUsed;
        grandTotals.prog += vals.progressive;
        html += `<tr><td>${i + 1}</td><td class="budget-name">${row[0]}</td><td>${vals.sbgValue.toFixed(0)}</td><td>${vals.previousUsed.toFixed(1)}</td><td>${vals.currentMonthUsed.toFixed(1)}</td><td>${vals.progressive.toFixed(1)}</td><td>${vals.percent.toFixed(2)}%</td></tr>`;
      }
    }
    renderTotalRow(group.finalTotalTitle, groupTotals);
  });

  const serviceTaxRow = dataRows[36];
  if (serviceTaxRow) {
    const vals = calcRowValues(serviceTaxRow);
    grandTotals.sbg += vals.sbgValue;
    grandTotals.prev += vals.previousUsed;
    grandTotals.current += vals.currentMonthUsed;
    grandTotals.prog += vals.progressive;
    html += `<tr class="sbg-main-category"><td colspan="7" style="font-weight:900;border:2px solid #000;background:#f3f3f3;">D) Service Tax</td></tr><tr><td>37</td><td>${serviceTaxRow[0]}</td><td>${vals.sbgValue.toFixed(0)}</td><td>${vals.previousUsed.toFixed(1)}</td><td>${vals.currentMonthUsed.toFixed(1)}</td><td>${vals.progressive.toFixed(1)}</td><td>${vals.percent.toFixed(2)}%</td></tr>`;
  }

  let cGroup = groups.find((g) => g.title === 'C) Programme Expenses');
  let cTotals = { sbg: 0, prev: 0, current: 0, prog: 0 };
  if (cGroup) {
    for (let i = cGroup.start; i <= cGroup.end; i++) {
      const vals = calcRowValues(dataRows[i]);
      cTotals.sbg += vals.sbgValue;
      cTotals.prev += vals.previousUsed;
      cTotals.current += vals.currentMonthUsed;
      cTotals.prog += vals.progressive;
    }
  }
  if (serviceTaxRow) {
    const dVals = calcRowValues(serviceTaxRow);
    cTotals.sbg += dVals.sbgValue;
    cTotals.prev += dVals.previousUsed;
    cTotals.current += dVals.currentMonthUsed;
    cTotals.prog += dVals.progressive;
  }
  renderTotalRow('Sub total Programming Exps. (C + D)', cTotals);
  renderTotalRow('TOTAL (A + B + C + D)', grandTotals, true);
  html += `</tbody>`;
  table.innerHTML = html;
}

async function buildBudgetHTML() {
  const station = id('BudgetPage_Station')?.value || '';
  const fy = id('BudgetPage_FY')?.value || '';

  if (!station || !fy) {
    showCustomAlert('🚫 Station / FY not selected');
    return '';
  }

  const doc = document.implementation.createHTMLDocument('SBG Expenditure Statement');

  /* =========================================
          🔥 COPY EXISTING STYLES
        ========================================= */

  qsa("style, link[rel='stylesheet']").forEach((el) => {
    try {
      doc.head.appendChild(el.cloneNode(true));
    } catch {}
  });

  /* =========================================
          🔥 PRINT CSS
        ========================================= */

  const style = doc.createElement('style');

  style.textContent = `

          @page{
            size:A4 portrait;
            margin:10mm;
          }

          *{
            box-sizing:border-box;
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
          }

          body{
            margin:0;
            padding:0;
            background:white;
            font-family:Arial,sans-serif;
            font-size:10px;
          }

          .page{
            width:100%;
            background:white;
          }

          .page:not(:last-child){
            page-break-after:always;
            break-after:page;
          }

          #SBGDetailsTable,
          .SBGprint-table,
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 0 !important;
            display: table !important;
            visibility: visible !important;
          }

          th,
          td{
            border:1px solid #000;
            padding:2px !important;
            font-size:10px;
            vertical-align:top;
          }

          /* 🔥 COLUMN WIDTHS */

          .SBGprint-table col:nth-child(1) {
            width: 7% !important;
          }

          .SBGprint-table col:nth-child(2) {
            width: 33% !important;
          }

          .SBGprint-table col:nth-child(3),
          .SBGprint-table col:nth-child(4),
          .SBGprint-table col:nth-child(5),
          .SBGprint-table col:nth-child(6),
          .SBGprint-table col:nth-child(7) {
            width: 12% !important;
          }

          .sbg-main-category td{
            font-weight:900 !important;
            border:2px solid #000 !important;
            background:#f3f3f3 !important;
          }

          .sbg-sub-header td{
            font-weight:900 !important;
            border:2px solid #000 !important;
            background:#fafafa !important;
          }

          .sbg-subtotal-row td,
          .sbg-grand-total-row td{
            font-weight:900 !important;
            border:2px solid #000 !important;
          }

          .SBGDetailPrintTable th{
            font-weight:900;
            text-align:center;
          }

        `;

  doc.head.appendChild(style);

  /* =========================================
          🔥 REFRESH SUMMARY TABLE
        ========================================= */

  const month = id('BudgetPage_Month')?.value || id('headerMonth')?.textContent || 'ALL';

  renderSBGDetailsTable(station, fy, month);

  await new Promise((resolve) => setTimeout(resolve, 0));

  /* =========================================
          🔥 PAGE 1 : SUMMARY
        ========================================= */

  const wrapper = id('SBGDetailsTableWrapper');

  if (wrapper) {
    const page = doc.createElement('div');

    page.className = 'page';

    const summaryClone = wrapper.cloneNode(true);

    summaryClone.style.display = 'block';
    summaryClone.style.visibility = 'visible';

    summaryClone.querySelectorAll('.no-print').forEach((el) => el.remove());

    summaryClone.querySelectorAll('*').forEach((el) => {
      el.hidden = false;
    });

    const table = summaryClone.querySelector('#SBGDetailsTable');

    if (table) {
      table.classList.add('SBGprint-table');
      table.style.display = 'table';
      table.style.visibility = 'visible';
    }

    page.appendChild(summaryClone);

    doc.body.appendChild(page);
  }

  /* =========================================
          🔥 GET ALL BUDGETS
        ========================================= */

  const expHeaders = sbgExpData.headers;

  const budgetIdx = expHeaders.indexOf('SBG Expenditure Under');

  const allBudgets = [...new Set(sbgExpData.rows.map((r) => String(r[budgetIdx] || '').trim()))].filter(Boolean);

  /* =========================================
          🔥 DETAIL PAGE FOR EACH BUDGET
        ========================================= */

  allBudgets.forEach((budgetName) => {
    const detailHTML = buildBudgetDetailHTML(budgetName, station, fy);

    if (!detailHTML) return;

    const page = doc.createElement('div');

    page.className = 'page';

    page.innerHTML = detailHTML;

    doc.body.appendChild(page);
  });

  /* =========================================
          🔥 RETURN HTML
        ========================================= */

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

function buildBudgetDetailHTML(budgetName, station, fy) {
  const expHeaders = sbgExpData.headers;
  const expRows = sbgExpData.rows;

  const idx = {
    station: expHeaders.indexOf('Station'),
    budget: expHeaders.indexOf('SBG Expenditure Under'),
    date: expHeaders.indexOf('Date'),
    details: expHeaders.indexOf('Expenditure Details'),
    amount: expHeaders.indexOf('Expenditure Amount (₹ in 000)'),
    cumulative: expHeaders.indexOf('Cumulative Sum of Expenditure (₹ in 000)')
  };

  const fyStart = Number(fy.split('-')[0]);
  const fyEnd = fyStart + 1;

  // =====================================
  // 🔥 BUDGET SUMMARY
  // =====================================

  const sbgHeaders = sbgData.headers;
  const sbgRows = sbgData.rows.slice(1);

  const sbgCol = sbgHeaders.findIndex((h) => String(h).includes(fy) && String(h).includes('(SBG)'));

  let sanctionedBudget = 0;

  const budgetRow = sbgRows.find((r) => String(r[0] || '').trim() === budgetName);

  if (budgetRow && sbgCol >= 0) {
    sanctionedBudget = Number(budgetRow[sbgCol]) || 0;
  }

  const matchingRows = expRows.filter((r) => {
    const rowStation = String(r[idx.station] || '').trim();
    const rowBudget = String(r[idx.budget] || '').trim();

    if (rowStation !== station) return false;
    if (rowBudget !== budgetName) return false;

    const rawDate = String(r[idx.date] || '').trim();

    const parts = rawDate.split('-');

    if (parts.length !== 3) return false;

    const rowDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));

    return rowDate >= new Date(fyStart, 3, 1) && rowDate <= new Date(fyEnd, 2, 31);
  });

  const utilisedBudget = matchingRows.length ? Number(matchingRows[matchingRows.length - 1][idx.cumulative]) || 0 : 0;

  const availableBudget = sanctionedBudget - utilisedBudget;

  if (!matchingRows.length) return '';

  let html = `

          <table class="SBGDetailPrintTable"
                style="width:100%;border-collapse:collapse;">

            <thead>

              <tr>

                <th colspan="4"
                  style="
                    border:2px solid #000;
                    font-size:12px;
                    font-weight:900;
                    text-align:center;
                    padding:10px;
                  ">

                Budget Expenditure Statement in r/o of
                ${station}

                <br>

                Under Head : ${budgetName}
              </th>

            </tr>
            <tr>
              <th colspan="4">
                <table style="
                    width:100%;
                    border-collapse:collapse;
                    border:none;
                    margin-top:5px;
                ">

                  <tr>

                    <td style="
                        border:none;
                        text-align:center;
                        font-weight:700;
                    ">
                      SBG Sanctioned (in Rs. x 1000)
                    </td>

                    <td style="
                        border:none;
                        text-align:center;
                        font-weight:700;
                    ">
                      SBG Utilised (in Rs. x 1000)
                    </td>

                    <td style="
                        border:none;
                        text-align:center;
                        font-weight:700;
                    ">
                      SBG Available (in Rs. x 1000)
                    </td>

                  </tr>

                  <tr>

                    <td style="
                        border:none;
                        text-align:center;
                        font-weight:900;
                    ">
                      ${sanctionedBudget.toFixed(2)}
                    </td>

                    <td style="
                        border:none;
                        text-align:center;
                        font-weight:900;
                    ">
                      ${utilisedBudget.toFixed(2)}
                    </td>

                    <td style="
                        border:none;
                        text-align:center;
                        font-weight:900;
                    ">
                      ${availableBudget.toFixed(2)}
                    </td>

                  </tr>

                </table>
              </th>

            <tr>

                <th style="
                  width:12%;
                  border:1px solid #000;
                  font-weight:900;
                ">
                  Date
                </th>

                <th style="
                  width:53%;
                  border:1px solid #000;
                  font-weight:900;
                ">
                  Expenditure Details
                </th>

                <th style="
                  width:17%;
                  border:1px solid #000;
                  font-weight:900;
                ">
                  Amount
                  <br>
                  (₹ in 000)
                </th>

                <th style="
                  width:18%;
                  border:1px solid #000;
                  font-weight:900;
                ">
                  Cumulative Sum
                  <br>
                  (₹ in 000)
                </th>

              </tr>

            </thead>

            <tbody>
        `;

  matchingRows.forEach((r) => {
    const amount = Number(r[idx.amount]) || 0;

    const cumulative = Number(r[idx.cumulative]) || 0;

    html += `

            <tr>

              <td style="
                border:1px solid #000;
                padding:4px;
              ">
                ${r[idx.date] || ''}
              </td>

              <td style="
                border:1px solid #000;
                padding:4px;
              ">
                ${r[idx.details] || ''}
              </td>

              <td style="
                border:1px solid #000;
                padding:4px;
                text-align:right;
              ">
                ${amount.toFixed(3)}
              </td>

              <td style="
                border:1px solid #000;
                padding:4px;
                text-align:right;
              ">
                ${cumulative.toFixed(3)}
              </td>

            </tr>
          `;
  });

  html += `
            </tbody>
          </table>
        `;

  return html;
}

const budgetprintBtn = id('SBGprintBtn');
const budgetexcelBtn = id('SBGexcelBtn');

// 🔹 PRINT BUTTON
budgetprintBtn.addEventListener('click', async () => {
  const wrapper = qs('.BudgetTableWrapper');
  const html = await buildBudgetHTML();
  if (!html) return;

  openPrintWindow(html);
  restoreNumberFormatting(wrapper);
});

budgetexcelBtn.addEventListener('click', async () => {
  exportSBGExcel();
});

async function exportSBGExcel() {
  // =========================================
  // 🔥 WORKBOOK
  // =========================================
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Prasar Bharati';
  workbook.company = 'Akashavani';
  workbook.calcProperties.fullCalcOnLoad = true;

  const wrapper = id('SBGDetailsTableWrapper');
  if (!wrapper) return;

  // =========================================
  // 🔥 FORCE SHOW WRAPPER
  // =========================================
  const prevDisplay = wrapper.style.display;
  wrapper.style.display = 'block';

  const table = wrapper.querySelector('table');
  if (!table) {
    showCustomAlert('🚫 No data to export');
    wrapper.style.display = prevDisplay;
    return;
  }

  const station = id('BudgetPage_Station')?.value || '';
  const fy = id('BudgetPage_FY')?.value || '';
  const fileName = `${station}-SBG-${fy}.xlsx`;

  // =========================================
  // 🔥 SHEET
  // =========================================
  const sheet = workbook.addWorksheet('SBG Expenditure');
  sheet.properties.defaultRowHeight = 17;
  sheet.columns = [{ width: 6 }, { width: 55 }, { width: 17 }, { width: 17 }, { width: 17 }, { width: 17 }, { width: 10 }];

  // =========================================
  // 🔥 BORDER
  // =========================================
  const FULL_BORDER = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // =========================================
  // 🔥 HELPERS
  // =========================================
  function parseValue(text) {
    if (!text) return '';
    const clean = text.replace(/[,₹%]/g, '').trim();
    return !isNaN(clean) && clean !== '' ? Number(clean) : text;
  }

  // =========================================
  // 🔥 MANUAL HEADER ROWS 1-4
  // =========================================
  sheet.mergeCells('A1:G1');
  const r1 = sheet.getCell('A1');
  r1.value = {
    richText: [
      { text: 'प्रसार भारती ', font: { bold: true, size: 12, name: 'Mangal' } },
      { text: '/ PRASAR BHARATI', font: { bold: true, size: 12, name: 'Calibri' } }
    ]
  };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:G2');
  const r2 = sheet.getCell('A2');
  r2.value = {
    richText: [
      { text: 'भारत के लोक सेवा प्रसारक ', font: { bold: true, size: 12, name: 'Mangal' } },
      { text: "/ INDIA'S PUBLIC SERVICE BROADCASTER", font: { bold: true, size: 12, name: 'Calibri' } }
    ]
  };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A3:G3');
  const r3 = sheet.getCell('A3');
  r3.value = {
    richText: [
      { text: 'आकाशवाणी धारवाड़ ', font: { bold: true, size: 12, name: 'Mangal' } },
      { text: '/ AKASHAVANI DHARWAD - 580 008', font: { bold: true, size: 12, name: 'Calibri' } }
    ]
  };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };

  const htmlRow4 = table.querySelectorAll('tr')[3];
  const htmlRow4Text = htmlRow4?.innerText?.trim() || '';

  sheet.mergeCells('A4:E4');
  const r4 = sheet.getCell('A4');
  r4.value = htmlRow4Text;
  r4.font = { bold: true, size: 12, name: 'Calibri' };
  r4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  sheet.mergeCells('F4:G4');
  const r4Right = sheet.getCell('F4');
  r4Right.value = `${station}\n${fy}`;
  r4Right.font = { bold: true, size: 12, name: 'Calibri' };
  r4Right.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  sheet.getRow(1).height = 16;
  sheet.getRow(2).height = 16;
  sheet.getRow(3).height = 16;
  sheet.getRow(4).height = 70;

  // =========================================
  // 🔥 START TABLE FROM ROW 5
  // =========================================
  const rows = table.querySelectorAll('tr');
  let excelRowIndex = 5;

  rows.forEach((tr, trIndex) => {
    if (trIndex < 4) return;
    const cells = tr.querySelectorAll('th, td');
    if (!cells.length) return;

    const excelRow = sheet.getRow(excelRowIndex++);
    let colIndex = 1;

    cells.forEach((cell) => {
      const colspan = Number(cell.getAttribute('colspan') || 1);
      const rowspan = Number(cell.getAttribute('rowspan') || 1);

      while (excelRow.getCell(colIndex).value !== null) colIndex++;
      const excelCell = excelRow.getCell(colIndex);
      const text = cell.innerText.trim();
      const cs = getComputedStyle(cell);

      excelCell.value = parseValue(text);
      excelCell.font = { name: 'Calibri', size: 12, bold: parseInt(cs.fontWeight) >= 600 };
      excelCell.alignment = { vertical: 'middle', horizontal: isNaN(Number(text.replace(/[,₹%]/g, ''))) ? 'left' : 'right', wrapText: true };

      const isMainHeader = tr.classList.contains('sbg-main-category');
      const isSubHeader = tr.classList.contains('sbg-sub-header');
      const isSubtotal = tr.classList.contains('sbg-subtotal-row');
      const isGrandTotal = tr.classList.contains('sbg-grand-total-row');
      const isHeaderRow = tr.classList.contains('sbg-header-row');

      let borderStyle = isMainHeader || isSubHeader || isSubtotal || isGrandTotal ? 'medium' : 'thin';
      const borderObj = { top: { style: borderStyle, color: { argb: 'FF000000' } }, bottom: { style: borderStyle, color: { argb: 'FF000000' } }, left: { style: borderStyle, color: { argb: 'FF000000' } }, right: { style: borderStyle, color: { argb: 'FF000000' } } };
      excelCell.border = borderObj;

      if (colspan > 1 || rowspan > 1) {
        sheet.mergeCells(excelRow.number, colIndex, excelRow.number + rowspan - 1, colIndex + colspan - 1);
        for (let r = excelRow.number; r <= excelRow.number + rowspan - 1; r++) {
          for (let c = colIndex; c <= colIndex + colspan - 1; c++) {
            sheet.getCell(r, c).border = borderObj;
          }
        }
      }
      colIndex += colspan;
    });

    excelRow.height = excelRow.number === 5 ? 32 : 16;
  });

  // =========================================
  // 🔥 PAGE SETUP
  // =========================================
  sheet.views = [{ showGridLines: false }];
  sheet.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printArea: `A1:G${excelRowIndex - 1}`, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }, horizontalCentered: true, verticalCentered: false };
  sheet.pageSetup.printTitlesRow = '1:5';

  sheet.headerFooter = {
    oddHeader: '&L&K808080&"Calibri,Italic"&10' + fileName.replace('.xlsx', ''),
    oddFooter: '&CPage &P of &N' + '&R&K808080Generated on ' + new Date().toLocaleDateString('en-GB')
  };

  // =========================================
  // 🔥 DETAIL SHEETS FOR ALL BUDGETS
  // =========================================
  const expHeaders = sbgExpData.headers;
  const expRows = sbgExpData.rows;
  const idx = {
    station: expHeaders.indexOf('Station'),
    budget: expHeaders.indexOf('SBG Expenditure Under'),
    date: expHeaders.indexOf('Date'),
    bill: expHeaders.indexOf('Bill / Invoice Details'),
    details: expHeaders.indexOf('Expenditure Details'),
    amount: expHeaders.indexOf('Expenditure Amount (₹ in 000)'),
    cumulative: expHeaders.indexOf('Cumulative Sum of Expenditure (₹ in 000)')
  };

  const sbgRows = sbgData.rows.slice(1);
  const serialMap = {};
  sbgRows.forEach((r, i) => {
    serialMap[String(r[0]).trim()] = i + 1;
  });

  const allBudgets = [...new Set(expRows.map((r) => String(r[idx.budget]).trim()))].filter(Boolean);

  allBudgets.forEach((budgetName) => {
    const fyStart = Number(fy.split('-')[0]);
    const fyEnd = fyStart + 1;

    const matchingRows = expRows.filter((r) => {
      const rowStation = String(r[idx.station]).trim();
      const rowBudget = String(r[idx.budget]).trim();
      const rawDate = String(r[idx.date] || '').trim();
      const parts = rawDate.split('-');
      if (parts.length !== 3) return false;
      const rowDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return rowStation === station && rowBudget === budgetName && rowDate >= new Date(fyStart, 3, 1) && rowDate <= new Date(fyEnd, 2, 31);
    });

    if (!matchingRows.length) return;

    const safeSheetName = (budgetName + ' Details').replace(/[*?:\\/[\]]/g, '-').substring(0, 31);
    const detailSheet = workbook.addWorksheet(safeSheetName);

    // =========================================
    // 🔥 BUDGET SUMMARY
    // =========================================

    const sbgHeaders = sbgData.headers;

    const sbgCol = sbgHeaders.findIndex((h) => String(h).includes(fy) && String(h).includes('(SBG)'));

    let sanctionedBudget = 0;

    const budgetRow = sbgRows.find((r) => String(r[0]).trim() === budgetName);

    if (budgetRow && sbgCol >= 0) {
      sanctionedBudget = Number(budgetRow[sbgCol]) || 0;
    }

    const utilisedBudget = matchingRows.length ? Number(matchingRows[matchingRows.length - 1][idx.cumulative]) || 0 : 0;

    const availableBudget = sanctionedBudget - utilisedBudget;

    detailSheet.mergeCells('A1:E1');

    const detailTitle = detailSheet.getCell('A1');

    detailTitle.value = `Budget Expenditure Statement in r/o ${station}
          Under Head : ${budgetName}`;

    detailTitle.font = {
      bold: true,
      size: 11,
      name: 'Calibri'
    };

    detailTitle.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    for (let col = 1; col <= 5; col++) {
      detailSheet.getCell(1, col).border = {
        bottom: {
          style: 'medium',
          color: { argb: 'FF000000' }
        }
      };
    }

    detailSheet.getRow(1).height = 35;

    // =========================================
    // 🔥 SBG SUMMARY ROWS
    // =========================================

    detailSheet.mergeCells('A3:C3');
    detailSheet.mergeCells('D3:E3');
    detailSheet.getCell('A3').value = 'SBG Sanctioned (in Rs x 1000)';
    detailSheet.getCell('D3').value = sanctionedBudget;

    detailSheet.mergeCells('A4:C4');
    detailSheet.mergeCells('D4:E4');
    detailSheet.getCell('A4').value = 'SBG Utilised (in Rs x 1000)';
    detailSheet.getCell('D4').value = utilisedBudget;

    detailSheet.mergeCells('A5:C5');
    detailSheet.mergeCells('D5:E5');
    detailSheet.getCell('A5').value = 'SBG Available (in Rs x 1000)';
    detailSheet.getCell('D5').value = availableBudget;

    ['A3', 'A4', 'A5'].forEach((addr) => {
      detailSheet.getCell(addr).font = {
        bold: true,
        size: 10
      };
    });

    ['D3', 'D4', 'D5'].forEach((addr) => {
      detailSheet.getCell(addr).font = {
        bold: true,
        size: 10
      };
      detailSheet.getCell(addr).numFmt = '0.000';
    });

    // =========================================
    // 🔥 BORDERS FOR SUMMARY ROWS
    // =========================================

    [['A3:E3'], ['A4:E4'], ['A5:E5']].forEach(([range]) => {
      const [start, end] = range.split(':');

      const startCol = detailSheet.getCell(start).col;
      const endCol = detailSheet.getCell(end).col;
      const row = detailSheet.getCell(start).row;

      for (let c = startCol; c <= endCol; c++) {
        detailSheet.getCell(row, c).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }
    });

    ['A3', 'A4', 'A5'].forEach((addr) => {
      detailSheet.getCell(addr).alignment = {
        horizontal: 'left',
        vertical: 'middle'
      };
    });

    ['C3', 'C4', 'C5'].forEach((addr) => {
      detailSheet.getCell(addr).alignment = {
        horizontal: 'left', // change from center/right
        vertical: 'middle'
      };
    });
    detailSheet.getRow(3).height = 16;
    detailSheet.getRow(4).height = 16;
    detailSheet.getRow(5).height = 16;

    detailSheet.columns = [{ width: 12 }, { width: 37 }, { width: 56 }, { width: 14 }, { width: 14 }];

    const headers = ['Date', 'Bill / Invoice Details', 'Expenditure Details', 'Expdt. Amount (₹ in 000)', 'Prog Expdt. (₹ in 000)'];
    const headerRow = detailSheet.getRow(7);
    headerRow.height = 28;
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = FULL_BORDER;
    });

    let runningTotal = 0;
    let excelRow = 8;

    matchingRows.forEach((r) => {
      const row = detailSheet.getRow(excelRow++);
      row.height = undefined;

      // 🔥 Calculate running total dynamically
      const amount = Number(r[idx.amount]) || 0;
      runningTotal += amount;

      const dbCumulative = Number(r[idx.cumulative]) || 0;

      // Prepare the values array
      const vals = [r[idx.date] || '', r[idx.bill] || '', r[idx.details] || '', amount, dbCumulative];

      vals.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.border = FULL_BORDER;
        cell.font = { bold: false, size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: typeof v === 'number' ? 'right' : 'left',
          wrapText: true
        };

        if (typeof v === 'number') {
          cell.numFmt = '0.000';
        }

        // 🔥 Conditional formatting for the Cumulative column (index 4)
        if (i === 4) {
          // Use a small epsilon (0.001) for float comparison to avoid precision errors
          const isMatch = Math.abs(runningTotal - dbCumulative) < 0.001;

          cell.font = {
            bold: true,
            size: 10,
            color: { argb: isMatch ? 'FF008000' : 'FFFF0000' } // Green : Red
          };
        }
      });
    });

    detailSheet.views = [{ showGridLines: false }];
    detailSheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printArea: `A1:E${excelRow - 1}`, margins: { left: 0.5, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }, horizontalCentered: true, verticalCentered: false };
  });

  // =========================================
  // 🔥 RESTORE AND EXPORT
  // =========================================
  wrapper.style.display = prevDisplay;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}
