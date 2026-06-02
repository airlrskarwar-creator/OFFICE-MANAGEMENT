const DateUtil = (() => {
  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    // 🔹 Parse Salary Month → Apr-2025
    parseMonth(str) {
      if (!str) return null;

      let [mon, year] = str.split('-');
      return new Date(parseInt(year), monthMap[mon], 1);
    },

    // 🔹 Parse Full Date → Apr-15,1990
    parseDate(str) {
      if (!str) return null;

      let [monthDay, year] = str.split(',');
      let [mon, day] = monthDay.split('-');

      return new Date(parseInt(year), monthMap[mon], parseInt(day));
    },

    // 🔹 Format → Apr-15,1990
    format(date) {
      if (!date) return '';

      let mon = months[date.getMonth()];
      let day = String(date.getDate()).padStart(2, '0');
      let year = date.getFullYear();

      return `${mon}-${day},${year}`;
    },

    // 🔹 Compare months (for latest PB)
    toTime(str) {
      let d = this.parseMonth(str);
      return d ? d.getTime() : 0;
    }
  };
})();

/* ===========🔥 CALCULATIONS================== */

// Superannuation
function calcSuperannuation(dobStr) {
  let d = DateUtil.parseDate(dobStr);
  if (!d) return '';

  d.setFullYear(d.getFullYear() + 60);

  if (d.getDate() > 1) {
    d.setMonth(d.getMonth() + 1);
  }

  d.setDate(0);

  return DateUtil.format(d);
}

// Service (Y M D)

function calcService(dojStr, endDateStr) {
  let start = DateUtil.parseDate(dojStr);
  let end = endDateStr ? new Date(endDateStr) : new Date();

  if (!start || !end) return '';

  let y = end.getFullYear() - start.getFullYear();
  let m = end.getMonth() - start.getMonth();
  let d = end.getDate() - start.getDate();

  if (d < 0) {
    m--;
    d += 30;
  }

  if (m < 0) {
    y--;
    m += 12;
  }

  return `${y}Y ${m}M ${d}D`;
}

// 6 Month Period

function calcSixMonth(dojStr, endDateStr) {
  let start = DateUtil.parseDate(dojStr);
  let end = endDateStr ? new Date(endDateStr) : new Date();

  if (!start || !end) return '';

  let y = end.getFullYear() - start.getFullYear();
  let m = end.getMonth() - start.getMonth();
  let d = end.getDate() - start.getDate();

  if (d > 0) m++;

  return y * 2 + Math.floor(m / 6);
}

/* ============🔥 GET LATEST PB DATA============ */

function getLatestPBMap() {
  let headers = pbData.headers;
  let rows = pbData.rows;

  let empIdx = headers.indexOf('Employee Name');
  let hrisIdx = headers.indexOf('HRIS');
  let monthIdx = headers.indexOf('Salary Month');

  let latest = {};

  rows.forEach((r) => {
    let key = makeEmpKey(r[empIdx], r[hrisIdx]);

    let month = r[monthIdx];

    if (!key || !month) return;

    if (!latest[key] || DateUtil.toTime(month) > DateUtil.toTime(latest[key][monthIdx])) {
      latest[key] = r;
    }
  });

  return latest;
}

function formatToInputDate(dor) {
  if (!dor || !dor.includes(',')) return '';

  try {
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

    const [monDay, year] = dor.split(',');
    const [mon, day] = monDay.split('-');

    if (!months[mon]) return '';

    return `${year}-${months[mon]}-${day.padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function getPayBandAndGradePay(level) {
  let headers = cpcData.headers;
  let rows = cpcData.rows;

  // 🔹 find column for level
  let col = headers.findIndex((h) => String(h).trim() === String(level).trim());

  if (col === -1) {
    console.warn('Level not found in CPC:', level);
    return { payBand: '', gradePay: '' };
  }

  // 🔹 row index (based on your structure)
  let payBand = rows[0] ? rows[0][col] : '';
  let gradePay = rows[1] ? rows[1][col] : '';

  return {
    payBand: payBand ?? '',
    gradePay: gradePay ?? ''
  };
}

/* ========🔥 BUILD EMPDB WITH CALC============ */

function buildEmpDBWithCalc() {
  // 🔥 START → show sync (yellow)
  setSyncStatus('empDatabase');

  try {
    if (!empData.headers || !pbData.headers) {
      console.warn('❌ Emp/PB data not ready');

      updateStatus('empDatabase', 'db', false);

      return;
    }

    let eHeaders = [...empData.headers];
    let eRows = empData.rows;

    let newCols = ['Superannuation', 'Last Drawn Salary Month', 'Last Increment', 'Last Drawn Pay Level', 'Last Increment Index', 'Last Drawn Pay Band', 'Last Drawn Grade Pay', 'Last Drawn Basic Pay', 'Last Drawn DA', 'Qualifying Service', 'Completed 6 Monthly Period', 'Last 10 Month Emoluments'];

    let finalHeaders = [...eHeaders, ...newCols];

    let latest = getLatestPBMap();

    let finalRows = [];

    let empIdx = eHeaders.indexOf('Employee Name');
    let hrisIdx = eHeaders.indexOf('HRIS');
    let dobIdx = eHeaders.indexOf('DOB');
    let dojIdx = eHeaders.indexOf('DOJ');

    let pHeaders = pbData.headers;

    let monthIdx = pHeaders.indexOf('Salary Month');
    let lastincIdx = pHeaders.indexOf('Last Increment');
    let basicIdx = pHeaders.indexOf('Basic Pay');
    let daIdx = pHeaders.indexOf('DA');
    let payLevelIdx = pHeaders.indexOf('Pay Level');
    let indexIdx = pHeaders.indexOf('7CPC Index');

    eRows.forEach((r) => {
      let emp = r[empIdx];
      let empHRIS = r[hrisIdx];

      let empKey = makeEmpKey(emp, empHRIS);

      let dob = r[dobIdx];
      let doj = r[dojIdx];

      let pb = latest[empKey] || [];

      let lastMonth = pb[monthIdx] || '';
      let lastinc = pb[lastincIdx] || '';
      let basic = pb[basicIdx] || '';
      let da = pb[daIdx] || '';
      let payLevel = pb[payLevelIdx] || '';
      let cpcindex = pb[indexIdx] || '';

      let pg = getPayBandAndGradePay(payLevel);

      let payBand = pg.payBand;
      let gradePay = pg.gradePay;

      let superDate = calcSuperannuation(dob);

      let endDate = formatToInputDate(superDate);

      let service = calcService(doj, endDate);

      let sixMonth = calcSixMonth(doj, endDate);

      let emoluments = calcLast10MonthsEmoluments(pb);

      finalRows.push([...r, superDate, lastMonth, lastinc, payLevel, cpcindex, payBand, gradePay, basic, da, service, sixMonth, emoluments]);
    });

    window.empCalcHeaders = finalHeaders;
    window.empCalcRows = finalRows;

    renderTable('EmpDB', finalHeaders, finalRows);

    // 🔥 SUCCESS → green
    clearSyncStatus('empDatabase', 'db', true);
  } catch (err) {
    console.error('❌ Emp Calculation Failed:', err);

    // 🔴 ERROR → red
    clearSyncStatus('empDatabase', 'db', false);
  }
}
/* ==========🔥 RENDER TABLE============ */

function renderTable(id, headers, rows) {
  let table = document.getElementById(id);
  if (!table) return;

  let html = '<thead><tr>';

  headers.forEach((h) => (html += `<th>${h}</th>`));

  html += '</tr></thead><tbody>';

  rows.forEach((r) => {
    html += '<tr>';
    r.forEach((c) => (html += `<td>${c ?? ''}</td>`));
    html += '</tr>';
  });

  html += '</tbody>';

  table.innerHTML = html;
}

function getPBMonthMap() {
  let headers = pbData.headers;
  let rows = pbData.rows;

  let empIdx = headers.indexOf('Employee Name');
  let hrisIdx = headers.indexOf('HRIS');
  let monthIdx = headers.indexOf('Salary Month');

  let map = {};

  rows.forEach((r) => {
    let key = makeEmpKey(r[empIdx], r[hrisIdx]);

    let month = r[monthIdx];

    if (!map[key]) {
      map[key] = {};
    }

    map[key][month] = r;
  });

  return map;
}

function getCPCValue(index, level) {
  let headers = cpcData.headers;
  let rows = cpcData.rows;

  // 🔹 FIRST COLUMN = Pay Level header row
  let levelCol = headers.findIndex((h) => String(h).trim() === String(level).trim());

  if (levelCol === -1) {
    console.warn('❌ Level column not found:', level);
    return 0;
  }

  // 🔹 ROW = index (first column value)
  let row = rows.find((r) => Number(r[0]) === Number(index));

  if (!row) {
    console.warn('❌ Index row not found:', index);
    return 0;
  }

  let value = Number(row[levelCol]) || 0;

  return value;
}

function formatMonth(date) {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${m[date.getMonth()]}-${date.getFullYear()}`;
}

function calcLast10MonthsEmoluments(pb, targetDate = null, mode = 'sum') {
  if (targetDate && !(targetDate instanceof Date)) {
    targetDate = new Date(targetDate);
  }

  let pHeaders = pbData.headers;

  let empName = pb[pHeaders.indexOf('Employee Name')];
  const empHRIS = String(pb[pHeaders.indexOf('HRIS')] || '').trim();

  let level = pb[pHeaders.indexOf('Pay Level')];
  let baseIndex = Number(pb[pHeaders.indexOf('7CPC Index')]);
  let incStr = pb[pHeaders.indexOf('Last Increment')];
  let lastMonth = pb[pHeaders.indexOf('Salary Month')];

  if (!level || isNaN(baseIndex)) {
    console.warn('❌ DATA ISSUE:', empName);
    return mode === 'table' ? [] : 0;
  }

  let incMonth = incStr ? incStr.split('-')[0] : null;
  let baseDate = DateUtil.parseMonth(lastMonth);

  // ===== DEFAULT TARGET DATE (SUPERANNUATION) =====
  if (!targetDate) {
    let eHeaders = empData.headers;
    let eRows = empData.rows;

    let hrisIdx = eHeaders.indexOf('HRIS');
    let dobIdx = eHeaders.indexOf('DOB');

    let empRow = eRows.find((r) => String(r[hrisIdx] || '').trim() === String(empHRIS || '').trim());
    let dob = empRow ? empRow[dobIdx] : null;

    let dobDate = DateUtil.parseDate(dob);
    targetDate = new Date(dobDate);
    targetDate.setFullYear(targetDate.getFullYear() + 60);
  }

  let endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);

  // ===== BUILD PB MONTH MAP (FAST LOOKUP) =====
  let empIdxPB = pHeaders.indexOf('Employee Name');
  let monthIdxPB = pHeaders.indexOf('Salary Month');
  let basicIdxPB = pHeaders.indexOf('Basic Pay');

  let pbMap = {};
  let hrisIdxPB = pHeaders.indexOf('HRIS');
  const targetKey = makeEmpKey(empName, empHRIS);

  pbData.rows.forEach((r) => {
    const rowKey = makeEmpKey(r[empIdxPB], r[hrisIdxPB]);

    if (rowKey === targetKey) {
      pbMap[r[monthIdxPB]] = r;
    }
  });

  // ===== STEP 1: FINAL INDEX =====
  let finalIndex = baseIndex;
  let temp = new Date(baseDate);

  while (true) {
    temp.setMonth(temp.getMonth() + 1);
    if (temp > endDate) break;

    let m = formatMonth(temp).split('-')[0];

    if (m === incMonth) {
      finalIndex++;
    }
  }

  // ===== STEP 2: BACKWARD 10 MONTHS =====
  let sum = 0;
  let loopDate = new Date(endDate);
  let currentIndex = finalIndex;

  let tableData = [];

  for (let i = 0; i < 10; i++) {
    let mStr = formatMonth(loopDate);
    let currentMonth = mStr.split('-')[0];

    let value;

    // ✅ PB PRIORITY
    let pbRow = pbMap[mStr];

    if (pbRow) {
      value = Number(pbRow[basicIdxPB]) || 0;
    } else {
      value = getCPCValue(currentIndex, level);
    }

    sum += value;

    tableData.push({
      month: mStr,
      basic: value,
      index: currentIndex
    });

    // 🔥 CORRECT REVERSE INCREMENT LOGIC
    let prevDate = new Date(loopDate);
    prevDate.setMonth(prevDate.getMonth() - 1);

    if (currentMonth === incMonth) {
      currentIndex--;
    }

    loopDate = prevDate;
  }

  return mode === 'table' ? tableData : sum;
}
