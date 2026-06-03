//================================================================================//
//                🔥🔥🔥🔥🔥SALARY SLIP SCRIPT🔥🔥🔥🔥🔥
//=============================================================================//
const designationMap = {
  TECH: 'TECHNICIAN',
  STECH: 'SENIOR TECHNICIAN',
  EA: 'ENGINEERING ASSISTANT',
  SEA: 'SENIOR ENGINEERING ASSISTANT',
  AE: 'ASSISTANT ENGINEER',
  UDC: 'UPPER DIVISION CLERK',
  LDC: 'LOWER DIVISION CLERK',
  'MTR DRIVER': 'MOTOR DRIVER',
  PEX: 'PROGRAMME EXECUTIVE'
};

function getEmployee(empHRIS) {
  const headers = window.empCalcHeaders;
  const rows = window.empCalcRows;

  const hrisIndex = headers.indexOf('HRIS');

  return rows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim()) || null;
}

function formatPayLevel(level) {
  if (!level) return '';

  level = String(level).trim().toUpperCase();

  // If purely number
  if (/^\d+$/.test(level)) {
    const num = Number(level);
    return num < 10 ? '0' + num : String(num);
  }

  // If like 13A → keep as is
  return level;
}

function maskValue(value) {
  if (!value) return '';

  const str = String(value).replace(/\s+/g, ''); // remove spaces
  const visible = str.slice(-3); // last 3 digits
  const masked = 'X'.repeat(Math.max(0, str.length - 3));

  return masked + visible;
}

function fillSalarySlip(empHRIS) {
  if (!empHRIS) return;

  const emp = getEmployee(empHRIS);

  if (!emp) return;

  const headers = window.empCalcHeaders;

  const get = (col) => {
    const idx = headers.indexOf(col);
    return idx !== -1 ? emp[idx] : '';
  };

  const empName = get('Employee Name');

  // 🔥 DESIGNATION
  let rawDesig = String(get('Designation')).toUpperCase().trim();
  let finalDesig = designationMap[rawDesig] || rawDesig;

  id('SSname').textContent = String(empName).toUpperCase();
  id('SSdesignation').textContent = finalDesig;

  id('SShris').textContent = get('HRIS');

  const rawLevel = get('Last Drawn Pay Level');
  id('SSpaylevel').textContent = 'Level - ' + formatPayLevel(rawLevel);

  id('SSstation').textContent = get('Station');
  id('SSsection').textContent = get('Section');
  id('SSgpf').textContent = get('GPF');
  id('SSpran').textContent = get('PRAN');
  id('SSpfms').textContent = get('PFMS');
  id('SSemail').textContent = get('Email');
  id('SSaadhaar').textContent = maskValue(get('Aadhaar'));
  id('SSpan').textContent = maskValue(get('PAN'));
  id('SSmobile').textContent = maskValue(get('Mobile'));
  id('SSaccount').textContent = maskValue(get('Account'));
}

function resetSalarySlipFields() {
  const fields = ['SSname', 'SSdesignation', 'SShris', 'SSpaylevel', 'SSstation', 'SSsection', 'SSgpf', 'SSpran', 'SSpfms', 'SSemail', 'SSaadhaar', 'SSpan', 'SSmobile', 'SSaccount'];

  fields.forEach((idName) => {
    const el = id(idName);
    if (el) el.textContent = '';
  });
}

function renderNoDataRow(tbody, colSpan = 7) {
  if (!tbody) return;

  tbody.innerHTML = `
              <tr>
                <td colspan="${colSpan}" style="
                  text-align:center;
                  padding:15px;
                  color:red;
                  font-weight:bold;
                  font-size:13px;
                  background:#edebb7;
                ">
                  <h3 style="margin:0; font-size:13px;">
                    ==============🚫 No Data 🚫==============
                  </h3>
                </td>
              </tr>
            `;
}

function getPBRow(hris) {
  if (!pbData || !pbData.headers || !pbData.rows) return null;

  const headers = pbData.headers;
  const rows = pbData.rows;

  const hrisIndex = headers.indexOf('HRIS');
  const monthIndex = headers.indexOf('Salary Month');

  const selectedMonth = id('SalSlipPage_SalMonth')?.value || '';

  return rows.find((row) => String(row[hrisIndex]).trim() === String(hris).trim() && String(row[monthIndex]).trim() === String(selectedMonth).trim()) || null;
}

function formatMonthYear(value) {
  if (!value) return '';

  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  // Try normal parsing
  const date = new Date(value);

  if (!isNaN(date)) {
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${month} - ${year}`;
  }

  // 🔥 Fallback (manual parsing)
  const parts = value.split(/[-/ ]/);
  let m = parts[0];
  let y = parts[1];

  let monthIndex = isNaN(m) ? monthNames.findIndex((x) => x.startsWith(m.toUpperCase())) : Number(m) - 1;

  return `${monthNames[monthIndex]} - ${y}`;
}

function numberToWords(num) {
  if (!num || num === 0) return 'ZERO';

  const a = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function twoDigit(n) {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
  }

  function threeDigit(n) {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n > 0) str += twoDigit(n);
    return str.trim();
  }

  let result = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const hundred = num;

  if (crore) result += threeDigit(crore) + ' CRORE ';
  if (lakh) result += threeDigit(lakh) + ' LAKH ';
  if (thousand) result += threeDigit(thousand) + ' THOUSAND ';
  if (hundred) result += threeDigit(hundred);

  return result.trim();
}

//==============================================================================
//        CREATE SALARY SLIP SELECTED MONTH SALARY BREAKUP
//==============================================================================
function buildSalaryBreakup(empHRIS) {
  const selectedMonth = id('SalSlipPage_SalMonth')?.value;

  const nameIndex = pbData.headers.indexOf('Employee Name');
  const hrisIndex = pbData.headers.indexOf('HRIS');
  const monthIndex = pbData.headers.indexOf('Salary Month');

  const row = pbData.rows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim() && String(r[monthIndex]).trim() === String(selectedMonth).trim());

  if (!row) {
    //console.warn("No data for:", empName, selectedMonth);

    // 🔥 directly render No Data
    renderSalaryBreakup(
      [],
      [],
      [],
      0,
      0,
      0,
      true // 🔥 noData flag
    );

    return;
  }

  const h = pbData.headers;
  const g = (col) => {
    const i = h.indexOf(col);
    return i !== -1 ? Number(row[i]) || 0 : 0;
  };

  // 💰 EARNINGS
  const earnings = [
    ['BASIC PAY', g('Basic Pay')],
    ['DA', g('DA')],
    ['HRA', g('HRA')],
    ['TPTA', g('TA')],
    ['NPSE', g('NPSE') + g('DAA on NPSE')],
    ['CEA', g('CEA')],
    ['LTA/EL ENCASH', g('LTA Reimburse') + g('EL Encash')],
    ['BONUS / UNI ALL.', g('Bonus') + g('Uni All')],
    ['ARREARS Gross', g('Total DAA') + g('Arrears')],
    ['REIMBURSEMENT', g('Medical Reimburse')]
  ];

  const grossAmount = g('Gross Income');

  // 💸 DEDUCTIONS
  const deductions = [
    ['CGIS', g('CGEIS')],
    ['LF', g('L Fee')],
    ['TCS', g('AIR & TV CHE SOC')],
    ['IT', g('IT')],
    ['GPF', g('GPF')],
    ['ITC', g('Cess @4%')],
    ['NPS', g('NPSE') + g('DAA on NPSE')],
    ['NPSC', g('NPSC') + g('DAA on NPSC')],
    ['RECOVERY', g('REC P & A') + g('Recovery')],
    ['PROT', g('Prof Tax')],
    ['WATER', g('W Ch')],
    ['LIC', g('LIC')]
  ];

  const zeroEarnings = earnings.filter((e) => e[1] !== 0);
  const zeroDeductions = deductions.filter((d) => d[1] !== 0);
  const totalDeduction = g('Total Deduction');
  const netIncome = g('Net Income');

  const loanData = [];

  // Example mapping (adjust column names if needed)
  const loanRecovery = g('Loan Recovery');
  const loanType = row[h.indexOf('Loan Type')] || '';
  const installment = row[h.indexOf('Instalment Number')] || '';

  if (loanRecovery || loanType || installment) {
    loanData.push([loanType, installment, formatCurrency(loanRecovery)]);
  }

  renderSalaryBreakup(zeroEarnings, zeroDeductions, loanData, grossAmount, totalDeduction, netIncome, false);
}

function renderSalaryBreakup(earnings, deductions, loanData, gross, totalDeduction, net, noData = false) {
  const tbody = id('SalarySlipBreakup')?.querySelector('tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (noData) {
    tbody.innerHTML = `
                <tr>
                  <td colspan="7" style="text-align:center; padding:15px; color:red;font-weight:bold;font-size:13px;background:#edebb7">
                    <h3 style="font-size:13px;background:#edebb7;">==============🚫 No Data 🚫==============</h3>
                  </td>
                </tr>
              `;
    return;
  }

  const maxRows = Math.max(earnings.length, deductions.length, loanData.length);

  for (let i = 0; i < maxRows; i++) {
    const earn = earnings[i] || ['', 0];
    const ded = deductions[i] || ['', 0];
    const loan = loanData[i] || ['', '', ''];

    // 🔥 Skip row if ALL empty OR zero
    const isEmptyRow = (!earn[0] && !ded[0] && !loan[0]) || (earn[1] === 0 && ded[1] === 0 && !loan[0]);

    if (isEmptyRow) continue;

    const tr = document.createElement('tr');

    tr.innerHTML = `
            <td>${earn[1] !== 0 ? earn[0] : ''}</td>
            <td style="text-align:right">${earn[1] !== 0 ? earn[1] : ''}</td>

            <td>${ded[1] !== 0 ? ded[0] : ''}</td>
            <td style="text-align:right">${ded[1] !== 0 ? ded[1] : ''}</td>

            <td>${loan[0] || ''}</td>
            <td>${loan[1] || ''}</td>
            <td style="text-align:right">${loan[2] || ''}</td>
          `;

    tbody.appendChild(tr);
  }

  // =========================
  // 🔻 TOTAL ROW
  // =========================
  const totalRow = document.createElement('tr');
  totalRow.innerHTML = `
          <td><b>GROSS AMOUNT</b></td>
          <td style="text-align:right"><b>${gross}</b></td>
          <td><b>TOTAL DEDUCTION</b></td>
          <td style="text-align:right"><b>${totalDeduction}</b></td>
          <td colspan="3"></td>
        `;
  tbody.appendChild(totalRow);

  // =========================
  // 🔻 NET SALARY
  // =========================
  const words = numberToWords(Number(net));

  const netRow = document.createElement('tr');
  netRow.innerHTML = `
          <td><b>NET SALARY</b></td>
          <td style="text-align:right"><b>${net}</b></td>
          <td colspan="5"><b>Rs. ${words} ONLY</b></td>
        `;
  tbody.appendChild(netRow);
}

// =========================
// 🔥 PARSE FY (2025-26 → 2025 & 2026)
// =========================
function parseFY(fy) {
  if (!fy) return {};

  let [start, end] = fy.split('-');

  const startYear = Number(start);

  const endYear = end.length === 2 ? Number(start.slice(0, 2) + end) : Number(end);

  return { startYear, endYear };
}

// =========================
// 🔥 CHECK MONTH IN FY (MAR → FEB)
// =========================
function isMonthInFY(monthStr, fy) {
  if (!monthStr || !fy) return false;

  const { startYear, endYear } = parseFY(fy);

  const [mon, yearStr] = monthStr.split('-');
  const year = Number(yearStr);

  const monthOrder = {
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

  const m = monthOrder[mon];

  if (m >= 3 && m <= 12 && year === startYear) return true;
  if ((m === 1 || m === 2) && year === endYear) return true;

  return false;
}

// =========================
// 🔥 GET PB DATA (EMP + FY)
// =========================
function getPBFYRows(empHRIS) {
  if (!pbData || !pbData.headers || !pbData.rows) return [];

  const h = pbData.headers;

  const monthIndex = h.indexOf('Salary Month');
  const hrisIndex = h.indexOf('HRIS');

  const selectedFY = id('SalSlipPage_FY')?.value;

  return pbData.rows.filter((row) => String(row[hrisIndex] || '').trim() === String(empHRIS || '').trim() && isMonthInFY(String(row[monthIndex] || '').trim(), selectedFY));
}

// =========================
// 🔥 SORT MONTHS (MAR → FEB)
// =========================
function sortFYMonths(rows, monthIndex) {
  const order = {
    Mar: 1,
    Apr: 2,
    May: 3,
    Jun: 4,
    Jul: 5,
    Aug: 6,
    Sep: 7,
    Oct: 8,
    Nov: 9,
    Dec: 10,
    Jan: 11,
    Feb: 12
  };

  return rows.sort((a, b) => {
    const [m1] = a[monthIndex].split('-');
    const [m2] = b[monthIndex].split('-');
    return order[m1] - order[m2];
  });
}

function formatTypeText(text, prefix) {
  if (!text) return '';

  text = String(text).toUpperCase();

  const patterns = [
    { key: 'DAA', short: 'DA' },
    { key: 'TA', short: 'TA' },
    { key: 'HRA', short: 'HRA' },
    { key: 'INCREMENT', short: 'Inc.' },
    { key: 'PAY', short: 'Pay' },
    { key: 'MACP', short: 'MACP' }
  ];

  const result = [];

  patterns.forEach((p) => {
    if (text.includes(p.key)) {
      result.push(`${p.short} ${prefix}`);
    }
  });

  return result.join(', ');
}

// =========================================================================
// 🔥 BUILD SALARY SLIP FY-IT,ARREARS, GROSS & RECOVERIES TABLE (FINAL)
// ==========================================================================
function buildSalarySlipFYBreakup(empHRIS) {
  if (!pbData || !pbData.headers || !pbData.rows) return;

  const h = pbData.headers;

  const nameIndex = h.indexOf('Employee Name');
  const monthIndex = h.indexOf('Salary Month');
  const hrisIndex = h.indexOf('HRIS');

  const selectedMonth = id('SalSlipPage_SalMonth')?.value;
  if (!selectedMonth) return;

  const [sm, sy] = selectedMonth.split('-');
  const selectedYear = Number(sy);

  const monthOrder = {
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

  const sMonth = monthOrder[sm];

  const g = (row, col) => {
    const i = h.indexOf(col);
    return i !== -1 ? Number(row[i]) || 0 : 0;
  };

  let rowsData = [];
  let totalGross = 0;
  let totalTDS = 0;
  let totalArrear = 0;
  let totalRecovery = 0;

  pbData.rows.forEach((row) => {
    if (String(row[hrisIndex]).trim() !== String(empHRIS).trim()) return;

    const month = row[monthIndex];
    if (!month) return;

    const [rm, ry] = month.split('-');
    const rowYear = Number(ry);
    const rMonth = monthOrder[rm];
    //console.log(rowYear, rMonth);

    let include = false;

    // =========================
    // ✅ CASE 1: MARCH → FULL PREVIOUS FY
    // =========================
    if (sm === 'Mar') {
      const prevYear = selectedYear - 1;

      if (
        (rowYear === prevYear && rMonth >= 3) || // Mar–Dec prev year
        (rowYear === selectedYear && rMonth <= 2) // Jan–Feb current year
      ) {
        include = true;
      }
    }

    // =========================
    // ✅ CASE 2: AFTER MARCH → ROLLING CURRENT FY
    // =========================
    else {
      const fyStartYear = sMonth <= 2 ? selectedYear - 1 : selectedYear;

      // =========================
      // ✅ CASE A: Jan / Feb
      // =========================
      if (sMonth <= 2) {
        // Mar–Dec of previous FY
        if (rowYear === fyStartYear && rMonth >= 3) {
          include = true;
        }

        // Jan → selected-1 of current year
        if (rowYear === fyStartYear + 1 && rMonth < sMonth) {
          include = true;
        }
      }

      // =========================
      // ✅ CASE B: Mar–Dec
      // =========================
      else {
        // Mar → selected-1 (same year)
        if (rowYear === fyStartYear && rMonth >= 3 && rMonth < sMonth) {
          include = true;
        }
      }
    }

    if (!include) return;

    const arrear = g(row, 'Total DAA') + g(row, 'Arrears');
    const recovery = g(row, 'REC P & A') + g(row, 'Recovery');
    const gross = g(row, 'Gross Income');
    const tds = g(row, 'IT');

    if (!arrear && !recovery && !gross && !tds) return;

    const arrearType = formatTypeText(row[h.indexOf('Arrears Details')] || '', 'Arr.');

    const recoveryType = formatTypeText(row[h.indexOf('Recovery Details')] || '', 'Rec.');

    rowsData.push({
      arrearType,
      arrear,
      recoveryType,
      recovery,
      month,
      gross,
      tds
    });

    totalGross += gross;
    totalTDS += tds;
    totalArrear += arrear;
    totalRecovery += recovery;
  });

  // =========================
  // ❌ NO DATA
  // =========================
  if (!rowsData.length) {
    renderFYBreakup([], 0, 0, 0, 0, true);
    return;
  }

  // =========================
  // ✅ SORT (Mar → Feb)
  // =========================
  const fySortOrder = {
    Mar: 1,
    Apr: 2,
    May: 3,
    Jun: 4,
    Jul: 5,
    Aug: 6,
    Sep: 7,
    Oct: 8,
    Nov: 9,
    Dec: 10,
    Jan: 11,
    Feb: 12
  };

  rowsData.sort((a, b) => {
    const [m1] = a.month.split('-');
    const [m2] = b.month.split('-');
    return fySortOrder[m1] - fySortOrder[m2];
  });

  // =========================
  // ✅ RENDER
  // =========================
  renderFYBreakup(rowsData, totalArrear, totalRecovery, totalGross, totalTDS, false);
}

function renderFYBreakup(rowsData, totalArrear, totalRecovery, totalGross, totalTDS, noData = false) {
  const tbody = id('SalarySlipFYDetails')?.querySelector('tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  // =========================
  // ❌ NO DATA
  // =========================
  if (noData) {
    tbody.innerHTML = `
            <tr>
              <td colspan="7" style="text-align:center; padding:15px; color:red;font-weight:bold;font-size:13px;background:#edebb7">
                <h3 style="font-size:13px;background:#edebb7;">==============🚫 No Data 🚫==============</h3>
              </td>
            </tr>
          `;
    return;
  }

  // =========================
  // 🔻 ROWS
  // =========================
  rowsData.forEach((r) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
            <td>${r.arrearType}</td>
            <td style="text-align:right">${r.arrear || ''}</td>

            <td>${r.recoveryType}</td>
            <td style="text-align:right">${r.recovery || ''}</td>

            <td>${r.month}</td>
            <td style="text-align:right">${r.gross}</td>
            <td style="text-align:right">${r.tds}</td>
          `;

    tbody.appendChild(tr);
  });

  // =========================
  // 🔻 TOTAL ROW
  // =========================
  const totalRow = document.createElement('tr');

  totalRow.innerHTML = `
          <td>Total</td>
          <td style="text-align:right">${totalArrear}</td>
          <td>Total</td>
          <td style="text-align:right">${totalRecovery}</td>
          <td>Total</td>
          <td style="text-align:right">${totalGross}</td>
          <td style="text-align:right">${totalTDS}</td>
        `;

  tbody.appendChild(totalRow);
}

function handleSalarySlipChange() {
  const fyEl = id('SalSlipPage_FY');
  const month = id('SalSlipPage_SalMonth')?.value;
  const empHRIS = id('SalSlipPage_Emp')?.value;

  // 🔥 Disable buttons when FY = "Select FY"
  const disableActions = fyEl && fyEl.selectedIndex === 0;

  qsa('.SSaction-group button').forEach((btn) => {
    btn.disabled = disableActions;
  });

  // 🔥 CLEAR IF NO EMPLOYEE
  if (!empHRIS || id('SalSlipPage_Emp')?.selectedIndex === -1) {
    resetSalarySlipFields();

    renderSalaryBreakup([], [], [], 0, 0, 0, true);
    renderFYBreakup([], 0, 0, 0, 0, true);
    renderNoDataRow(id('SalaryFYDetailsTable'), 100);

    return;
  }

  // 🔥 CLEAR IF NO MONTH
  if (!month || id('SalSlipPage_SalMonth')?.selectedIndex === -1) {
    renderSalaryBreakup([], [], [], 0, 0, 0, true);
    renderFYBreakup([], 0, 0, 0, 0, true);
    renderNoDataRow(id('SalaryFYDetailsTable'), 100);

    return;
  }

  id('SalarySlipHeaderMonth').textContent = formatMonthYear(month);

  fillSalarySlip(empHRIS);
  buildSalaryBreakup(empHRIS);
  buildSalarySlipFYBreakup(empHRIS);
  buildSalaryFYDetailsTable(empHRIS);
}

// =========================
// 🔥 BUILD EXCEL HTML (FINAL)
// =========================

async function exportSalarySlipExcel(mode = 'single') {
  const workbook = new ExcelJS.Workbook();

  const wrapper = id('SalarySlipWrapper');
  const station = id('SalSlipPage_Station')?.value;
  const selectedMonth = id('SalSlipPage_SalMonth')?.value;
  const selectedEmp = id('SalSlipPage_Emp')?.value;

  if (!selectedMonth) return;

  const h = pbData.headers;
  const nameIndex = h.indexOf('Employee Name');
  const stationIndex = h.indexOf('Pay Drawn Station');
  const monthIndex = h.indexOf('Salary Month');
  const hrisIndex = h.indexOf('HRIS');

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
  function processTable(sheet, table) {
    let currentRow = 1;
    let setNextRowSmall = false;

    function walk(table, isNested = false) {
      const rows = table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr');

      rows.forEach((tr) => {
        let colIndex = 1;
        let hasData = false;

        const cells = tr.querySelectorAll(':scope > th, :scope > td');
        const excelRow = sheet.getRow(currentRow);

        let rowHasNested = false;

        cells.forEach((cell) => {
          const nested = cell.querySelector('table');

          if (nested) {
            rowHasNested = true;
            walk(nested, true);
            return;
          }

          hasData = true;

          const text = cell.innerText.trim();
          const cs = window.getComputedStyle(cell);

          const colSpan = cell.colSpan || 1;
          const rowSpan = cell.rowSpan || 1;

          const excelCell = excelRow.getCell(colIndex);

          const isSpecialField = text.length >= 10 && /^[0-9]+$/.test(text); // large numeric string

          if (isSpecialField) {
            excelCell.value = text; // keep as string
            excelCell.numFmt = '@'; // 🔥 force TEXT format
          } else {
            excelCell.value = parseValue(text);
          }

          const isBold = cs.fontWeight === 'bold' || parseInt(cs.fontWeight) >= 600 || cell.querySelector('b, strong');

          excelCell.font = {
            name: 'Calibri',
            size: 11,
            bold: isBold
          };

          excelCell.alignment = {
            horizontal: cs.textAlign || 'left',
            vertical: 'middle',
            wrapText: true
          };

          if (isValidColor(cs)) {
            const argb = rgbToARGB(cs.backgroundColor);
            if (argb && argb !== 'FF000000') {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb }
              };
            }
          }

          excelCell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };

          if (rowSpan > 1 || colSpan > 1) {
            sheet.mergeCells(currentRow, colIndex, currentRow + rowSpan - 1, colIndex + colSpan - 1);
          }

          colIndex += colSpan;
        });

        if (hasData) {
          if (!isNested && setNextRowSmall) {
            excelRow.height = 3;
            setNextRowSmall = false;
          }

          excelRow.commit();
          currentRow++;
        }

        if (rowHasNested && !isNested) {
          setNextRowSmall = true;
        }
      });
    }

    walk(table);

    return currentRow;
  }

  // =========================
  // 🔥 EMPLOYEE LIST
  // =========================
  let employees = [];

  if (mode === 'single') {
    if (!selectedEmp) return;
    employees = [selectedEmp];
  } else {
    employees = [...new Set(pbData.rows.filter((r) => String(r[stationIndex]).trim() === station && String(r[monthIndex]).trim() === selectedMonth).map((r) => String(r[hrisIndex]).trim()))];

    if (!employees.length) {
      showCustomAlert('🚫 No employees found for selected month');
      return;
    }
  }

  // =========================
  // 🔁 LOOP
  // =========================
  for (const empHRIS of employees) {
    const month = id('SalSlipPage_SalMonth')?.value;
    id('SalarySlipHeaderMonth').textContent = formatMonthYear(month);

    fillSalarySlip(empHRIS);
    buildSalaryBreakup(empHRIS);
    buildSalarySlipFYBreakup(empHRIS);

    const wrapper = id('SalarySlipWrapper');
    if (!wrapper) continue;

    const emp = getEmployee(empHRIS);

    const empName = emp ? emp[window.empCalcHeaders.indexOf('Employee Name')] : empHRIS;

    const sheet = workbook.addWorksheet(mode === 'single' ? 'Salary Slip' : String(empName).substring(0, 25));

    const lastRow = processTable(sheet, wrapper.querySelector('table'));

    // =========================
    // 🖼️ LOGO
    // =========================
    const img = wrapper.querySelector('img');

    if (img && img.src) {
      const base64 = await getBase64Image(img.src);

      const imageId = workbook.addImage({
        base64,
        extension: 'png'
      });

      sheet.addImage(imageId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 65, height: 65 }
      });
    }

    // =========================
    // 🔧 SETTINGS
    // =========================
    sheet.getRow(1).height = 65;
    sheet.views = [{ showGridLines: false }];

    sheet.columns = [{ width: 17 }, { width: 14 }, { width: 18 }, { width: 22 }, { width: 12 }, { width: 13 }, { width: 12 }];

    sheet.pageSetup = {
      paperSize: 9, // 🔥 A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: false,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    };

    sheet.pageSetup.printArea = `A1:G${lastRow}`;
  }

  // =========================
  // 📥 DOWNLOAD
  // =========================
  const buffer = await workbook.xlsx.writeBuffer();

  let fileName;

  if (mode === 'single') {
    const emp = getEmployee(selectedEmp);

    const empName = emp ? String(emp[window.empCalcHeaders.indexOf('Employee Name')]).trim() : String(selectedEmp).trim();

    fileName = `${empName}(${selectedEmp})-${selectedMonth} SalarySlip.xlsx`;
  } else {
    fileName = `${station}-${selectedMonth} SalarySlips.xlsx`;
  }

  saveAs(new Blob([buffer]), fileName);

  // =========================
  // 🔄 RESET UI AFTER EXPORT
  // =========================
  if (mode === 'all') {
    resetSalarySlipFields();
    renderNoDataRow(id('SalarySlipBreakup')?.querySelector('tbody'), 7);
    renderNoDataRow(id('SalarySlipFYDetails')?.querySelector('tbody'), 7);
  }
}

function buildSalarySlipHTML(mode = 'single') {
  const wrapper = id('SalarySlipWrapper');
  const station = id('SalSlipPage_Station')?.value;
  const selectedMonth = id('SalSlipPage_SalMonth')?.value;
  const selectedEmp = id('SalSlipPage_Emp')?.value;

  if (!wrapper || !selectedMonth) return '';

  const h = pbData.headers;
  const nameIndex = h.indexOf('Employee Name');
  const stationIndex = h.indexOf('Pay Drawn Station');
  const monthIndex = h.indexOf('Salary Month');
  const hrisIndex = h.indexOf('HRIS');

  // =========================
  // 🔥 EMPLOYEE LIST
  // =========================
  let employees = [];

  if (mode === 'single') {
    if (!selectedEmp) return '';
    employees = [selectedEmp];
  } else {
    employees = [...new Set(pbData.rows.filter((r) => String(r[stationIndex]).trim() === station && String(r[monthIndex]).trim() === selectedMonth).map((r) => String(r[hrisIndex]).trim()))];

    if (!employees.length) {
      showCustomAlert('🚫 No employees found');
      return '';
    }
  }

  // =========================
  // 🔥 CREATE DOCUMENT
  // =========================
  const doc = document.implementation.createHTMLDocument('Salary Slip');

  // =========================
  // 🔥 COPY STYLES
  // =========================
  qsa("style, link[rel='stylesheet']").forEach((el) => {
    try {
      doc.head.appendChild(el.cloneNode(true));
    } catch (e) {}
  });

  // =========================
  // 🔥 PRINT CSS
  // =========================
  const style = doc.createElement('style');

  style.textContent = `
                @page {
                  size: A4 portrait;
                  margin: 10mm !important;
                  background: white !important;
                }

                body {
                  margin: 0;
                  background: white;
                }

                .page {
                  margin: 0 auto;
                  page-break-after: always;
                  padding-right: 2px;
                }

                .page:last-child {
                  page-break-after: auto;
                }

                .page * {
                  overflow: visible !important;
                  max-height: none !important;
                  height: auto !important;
                  background: white;
                }

                img {
                  max-width: 60px !important;
                  max-height: 60px !important;
                }

                tr {
                  page-break-inside: avoid;
                }

                .SalarySlipTableWrapper{
                  width: 100%;
                  background: white;
                }

                #SalarySlipTable{
                  width: 100%;
                }

                #SalarySlipTable thead tr:nth-child(2) th{
                    height: 30px !important;
                    min-height: 30px !important;
                }

              `;

  doc.head.appendChild(style);

  // =========================
  // 🔁 LOOP EMPLOYEES
  // =========================
  employees.forEach((empHRIS) => {
    // 🔥 build UI dynamically
    const month = id('SalSlipPage_SalMonth')?.value;
    id('SalarySlipHeaderMonth').textContent = formatMonthYear(month);

    fillSalarySlip(empHRIS);
    buildSalaryBreakup(empHRIS);
    buildSalarySlipFYBreakup(empHRIS);

    const clone = wrapper.cloneNode(true);

    const page = doc.createElement('div');
    page.className = 'page';
    page.appendChild(clone);

    doc.body.appendChild(page);
  });

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

function buildSalaryFYDetailsTable(empHRIS) {
  const skipCols = ['Employee Name', 'Designation on Salary Month', 'Pay Drawn Station', 'HRIS', 'Last Increment', 'DA%', 'TA Entitled', 'HRA Entitled', 'Qtrs Type', 'Disability', 'Level of Disability', 'Pay Level', '7CPC Index', 'TA Rate', 'DA on TA', 'DAA', 'DAA on TA', 'DAA on NPSE', 'DAA on NPSC', 'DAA on NPSE ded', 'Arrears Details', 'Recovery Details', 'Loan Recovery', 'Loan Type', 'Instalment Number'];

  const table = id('SalaryFYDetailsTable');
  if (!table) return;

  const rows = getPBFYRows(empHRIS);
  const h = pbData.headers;

  function getColumnStyle(colName) {
    switch (String(colName).trim().toUpperCase()) {
      case 'GROSS INCOME':
        return {
          color: '#0a008f',
          bg: '#f0f6ff'
        };

      case 'NET INCOME':
        return {
          color: '#166534',
          bg: '#edfff3'
        };

      case 'TOTAL DEDUCTION':
        return {
          color: '#9e0303',
          bg: '#fff0f0'
        };

      default:
        return null;
    }
  }

  // ==========================
  // EMPLOYEE NAME
  // ==========================
  const emp = getEmployee(empHRIS);

  const empName = emp ? emp[window.empCalcHeaders.indexOf('Employee Name')] : empHRIS;

  table.innerHTML = '';

  // ==========================
  // NO DATA
  // ==========================
  if (!rows.length) {
    table.innerHTML = `
      <tbody>
      <tr>
        <th colspan="${h.length}"
            style="text-align:center;background:#d9edf7;font-weight:bold;">
          Salary Details for the Financial Year ${id('SalSlipPage_FY')?.value || ''} in r/o of ${empName} (${empHRIS})
        </th>
      </tr>
        <tr>
          <td colspan="${h.length}"
              style="text-align:center;padding:15px;color:red;font-weight:bold;font-size:13px;background:#edebb7">
            <h3 style="margin:0;font-size:13px;">
              ==============🚫 No Data 🚫==============
            </h3>
          </td>
        </tr>
      </tbody>
    `;
    return;
  }

  // ==========================
  // FIND NON-ZERO COLUMNS
  // ==========================
  const nonZeroCols = [];

  h.forEach((col, index) => {
    if (skipCols.includes(col)) return;

    const hasValue = rows.some((r) => {
      const value = Number(r[index]) || 0;
      return value !== 0;
    });

    if (hasValue) {
      nonZeroCols.push({
        name: col,
        index
      });
    }
  });

  // ==========================
  // SORT MONTHS (MAR → FEB)
  // ==========================
  const monthIndex = h.indexOf('Salary Month');

  sortFYMonths(rows, monthIndex);

  // ==========================
  // HEADER
  // ==========================
  let html = `
    <thead>
      <tr>
        <th colspan="${nonZeroCols.length + 1}"
            style="text-align:center;background:white;font-weight:bold;">
          Salary Details for the Financial Year ${id('SalSlipPage_FY')?.value || ''} in r/o of ${empName} (${empHRIS})
        </th>
      </tr>

      <tr>
        <th>Salary Month</th>
        ${nonZeroCols
          .map((c) => {
            const style = getColumnStyle(c.name);

            return `
              <th style=" ${style ? ` color:${style.color}; background:${style.bg}; font-weight:bold;` : ''} ">
                ${c.name}
              </th>
            `;
          })
          .join('')}
      </tr>
    </thead>

    <tbody>
  `;

  // ==========================
  // MONTH ROWS
  // ==========================
  rows.forEach((row) => {
    html += `
      <tr>
        <td>${row[monthIndex]}</td>

        ${nonZeroCols
          .map((c) => {
            const value = Number(row[c.index]) || 0;

            const style = getColumnStyle(c.name);

            return `
              <td
                style="
                  text-align:right;
                  ${style ? ` color:${style.color}; background:${style.bg}; font-weight:bold; ` : ''}" >
                  ${value !== 0 ? value : ''}
              </td>
            `;
          })
          .join('')}
      </tr>
    `;
  });

  // ==========================
  // TOTAL ROW
  // ==========================
  html += `
    <tr style="font-weight:bold">
      <td style="background:#f3f3f3">Total</td>
    `;

  nonZeroCols.forEach((c) => {
    const total = rows.reduce((sum, r) => {
      return sum + (Number(r[c.index]) || 0);
    }, 0);

    const style = getColumnStyle(c.name);

    html += `
      <td style=" text-align:right; background:${style?.bg || '#f3f3f3'}; color:${style?.color || '#000'}; font-weight:bold; " >
        ${total !== 0 ? total : ''}
      </td>
    `;
  });

  const arrearsRemarkIndex = h.indexOf('Arrears Details');

  const recoveryRemarkIndex = h.indexOf('Recovery Details');
  const remarks = [];

  rows.forEach((row) => {
    const month = row[monthIndex] || '';

    const arrearsRemark = arrearsRemarkIndex >= 0 ? String(row[arrearsRemarkIndex] || '').trim() : '';

    const recoveryRemark = recoveryRemarkIndex >= 0 ? String(row[recoveryRemarkIndex] || '').trim() : '';

    if (arrearsRemark) {
      remarks.push({
        type: 'Arrears',
        month,
        text: arrearsRemark
      });
    }

    if (recoveryRemark) {
      remarks.push({
        type: 'Recovery',
        month,
        text: recoveryRemark
      });
    }
  });

  if (remarks.length) {
    html += `
      <tr>
        <td colspan="${nonZeroCols.length + 1}" style="height:0px;border:none;"></td>
      </tr>
      <tr>
        <td colspan="${nonZeroCols.length + 1}"
            style="
              font-weight:bold;
              text-align:left;
              background:white;
              padding:5px;
              color:black;
              font-size:12px;
              border:none;
            ">
          Arrears / Recovery Remarks
        </td>
      </tr>
    `;

    remarks.forEach((r, i) => {
      html += `
        <tr>
          <td colspan="${nonZeroCols.length + 1}"
              style="
                text-align:left;
                background:white;
                padding:4px 8px;
                border:none;
              ">
            ${i + 1}. <b>${r.month}</b>
            [${r.type}] :
            ${r.text}
          </td>
        </tr>
      `;
    });
  }

  html += `
    </tbody>
  `;

  table.innerHTML = html;
}

function buildSalaryFYStatementHTML(mode = 'single') {
  const table = id('SalaryFYDetailsTable');
  const station = id('SalSlipPage_Station')?.value;
  const selectedEmp = id('SalSlipPage_Emp')?.value;

  if (!table) return '';

  const h = pbData.headers;
  const stationIndex = h.indexOf('Pay Drawn Station');
  const hrisIndex = h.indexOf('HRIS');

  // =========================
  // EMPLOYEE LIST
  // =========================
  let employees = [];

  if (mode === 'single') {
    if (!selectedEmp) return '';
    employees = [selectedEmp];
  } else {
    employees = [
      ...new Set(
        pbData.rows
          .filter(
            (r) =>
              String(r[stationIndex] || '')
                .trim()
                .toUpperCase() ===
              String(station || '')
                .trim()
                .toUpperCase()
          )
          .map((r) => String(r[hrisIndex]).trim())
      )
    ];

    if (!employees.length) {
      showCustomAlert('🚫 No employees found for selected station');
      return '';
    }
  }

  // =========================
  // CREATE DOCUMENT
  // =========================
  const doc = document.implementation.createHTMLDocument('FY Statement');

  qsa("style, link[rel='stylesheet']").forEach((el) => {
    try {
      doc.head.appendChild(el.cloneNode(true));
    } catch (e) {}
  });

  const style = doc.createElement('style');

  style.textContent = `
    @page{
      size:A4 landscape;
      margin:10mm 5mm;
    }

    *{
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body{
      margin:0;
      background:#fff;
    }

    .page{
      page-break-after:always;
      padding:0;
      padding-right:2px;
    }

    .page:last-child{
      page-break-after:auto;
    }

    table{
      width:100%;
      border-collapse:collapse;
      font-size:11px;
    }

    th,td{
      border:1px solid #000;
      padding:4px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important
    }

    thead{
      display:table-header-group;
    }

    tfoot{
      display:table-footer-group;
    }

    tr{
      page-break-inside:avoid;
    }
    #SalaryFYDetailsTable{
      display:table !important;
      visibility:visible !important;
    }
  `;

  doc.head.appendChild(style);

  // =========================
  // EMPLOYEE LOOP
  // =========================
  employees.forEach((empHRIS) => {
    buildSalaryFYDetailsTable(empHRIS);

    const clone = table.cloneNode(true);

    clone.style.display = 'table';
    clone.hidden = false;
    clone.removeAttribute('hidden');

    const page = doc.createElement('div');
    page.className = 'page';

    // 🔥 Get station name
    const emp = getEmployee(empHRIS);
    // 🔥 Add header
    page.appendChild(buildPrintHeader(doc, id('SalSlipPage_Station')?.value || ''));

    // 🔥 Add FY table
    page.appendChild(clone);

    doc.body.appendChild(page);
  });

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

async function exportSalaryFYStatementExcel(mode = 'single') {
  const workbook = new ExcelJS.Workbook();

  const station = id('SalSlipPage_Station')?.value;
  const selectedEmp = id('SalSlipPage_Emp')?.value;

  const h = pbData.headers;
  const stationIndex = h.indexOf('Pay Drawn Station');
  const hrisIndex = h.indexOf('HRIS');

  // =========================
  // HELPERS
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

    return true;
  }

  function parseValue(text) {
    if (!text) return ' ';

    const clean = text.replace(/[,₹\s]/g, '');

    return !isNaN(clean) && clean !== '' ? Number(clean) : text;
  }

  // =========================
  // TABLE PROCESSOR
  // =========================
  function processTable(sheet, table, startRow = 1) {
    let currentRow = startRow;

    const rows = table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr');

    rows.forEach((tr) => {
      let colIndex = 1;

      const excelRow = sheet.getRow(currentRow);

      tr.querySelectorAll('th,td').forEach((cell) => {
        const text = cell.innerText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

        const cs = getComputedStyle(cell);

        const colSpan = cell.colSpan || 1;
        const rowSpan = cell.rowSpan || 1;

        const excelCell = excelRow.getCell(colIndex);

        excelCell.value = parseValue(text);

        excelCell.font = {
          name: 'Calibri',
          size: 11,
          bold: cs.fontWeight === 'bold' || parseInt(cs.fontWeight) >= 600
        };

        const isRemarkRow = tr.cells.length === 1 && tr.cells[0].colSpan > 1;

        excelCell.alignment = {
          horizontal: cs.textAlign || 'left',
          vertical: 'middle',
          wrapText: !isRemarkRow
        };

        if (isValidColor(cs)) {
          const argb = rgbToARGB(cs.backgroundColor);

          if (argb) {
            excelCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb }
            };
          }
        }

        excelCell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };

        if (rowSpan > 1 || colSpan > 1) {
          sheet.mergeCells(currentRow, colIndex, currentRow + rowSpan - 1, colIndex + colSpan - 1);
        }

        colIndex += colSpan;
      });

      excelRow.commit();
      currentRow++;
    });

    return currentRow;
  }

  // =========================
  // EMPLOYEE LIST
  // =========================
  let employees = [];

  if (mode === 'single') {
    if (!selectedEmp) return;

    employees = [selectedEmp];
  } else {
    employees = [
      ...new Set(
        pbData.rows
          .filter(
            (r) =>
              String(r[stationIndex] || '')
                .trim()
                .toUpperCase() ===
              String(station || '')
                .trim()
                .toUpperCase()
          )
          .map((r) => String(r[hrisIndex]).trim())
      )
    ];

    if (!employees.length) {
      showCustomAlert('🚫 No employees found for selected station');
      return;
    }
  }

  // =========================
  // LOOP EMPLOYEES
  // =========================
  for (const empHRIS of employees) {
    buildSalaryFYDetailsTable(empHRIS);

    const table = id('SalaryFYDetailsTable');

    if (!table) continue;

    const emp = getEmployee(empHRIS);

    const empName = emp ? emp[window.empCalcHeaders.indexOf('Employee Name')] : empHRIS;

    const sheet = workbook.addWorksheet(mode === 'single' ? 'FY Statement' : String(empName).substring(0, 31));

    const logoBase64 = await getBase64Image('https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l');

    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png'
    });

    sheet.addImage(imageId, {
      tl: { col: 0.2, row: 0.15 },
      ext: { width: 50, height: 50 }
    });

    // =========================
    // HEADER
    // =========================
    sheet.mergeCells(1, 1, 1, table.querySelectorAll('thead tr:nth-child(2) th').length);

    const headerCell = sheet.getCell(1, 1);

    const stationName = emp?.[window.empCalcHeaders.indexOf('Pay Drawn Station')] || station || '';

    headerCell.value = `PRASAR BHARATI
    INDIA'S PUBLIC SERVICE BROADCASTER
    ALL INDIA RADIO
    ${stationName}`;

    headerCell.font = {
      bold: true,
      size: 12
    };

    headerCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: 'FFFFFFFF'
      }
    };

    headerCell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Shift table down
    const totalCols = table.querySelectorAll('thead tr:nth-child(2) th').length;

    sheet.getColumn(1).width = 10;

    for (let i = 2; i <= totalCols; i++) {
      sheet.getColumn(i).width = 9;
    }

    sheet.getRow(1).height = 65;

    const lastRow = processTable(sheet, table, 3);

    // =========================
    // SETTINGS
    // =========================
    sheet.views = [{ showGridLines: false }];

    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: false,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    };
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(sheet.columnCount).letter}${lastRow - 1}`;
  }

  // =========================
  // DOWNLOAD
  // =========================
  const buffer = await workbook.xlsx.writeBuffer();

  let fileName;

  if (mode === 'single') {
    const emp = getEmployee(selectedEmp);

    const empName = emp ? String(emp[window.empCalcHeaders.indexOf('Employee Name')]).trim() : String(selectedEmp).trim();

    fileName = `${empName}(${selectedEmp})-FYStatement.xlsx`;
  } else {
    fileName = `${station}-FYStatements.xlsx`;
  }

  saveAs(new Blob([buffer]), fileName);
}

['SalSlipPage_Station', 'SalSlipPage_Emp', 'SalSlipPage_SalMonth', 'SalSlipPage_FY'].forEach((idName) => {
  on(idName, 'change', () => {
    setTimeout(handleSalarySlipChange, 0);
  });
});

on('SSprintBtn', 'click', () => {
  const hasEmp = !!id('SalSlipPage_Emp')?.value;

  showConfirmBox({
    title: 'Print Options',

    icon: '🖨️',

    message: `
    <div style="display:flex;flex-direction:column;gap:8px">

      ${
        hasEmp
          ? `
        <button id="SS_PrintSlip"
          class="reportTypeBtn">
          🖨️ Print Salary Slip
        </button>
      `
          : ''
      }

      <button id="SS_PrintStationSlip"
        class="reportTypeBtn">
        🖨️ Print Station Salary Slip
      </button>

      ${
        hasEmp
          ? `
        <button id="SS_PrintFY"
          class="reportTypeBtn">
          📄 Print FY Statement
        </button>
      `
          : ''
      }

      <button id="SS_PrintStationFY"
        class="reportTypeBtn">
        📄 Print Station FY Statement
      </button>

    </div>
  `,

    subMessage: '',

    yesText: 'Close',
    noText: '',
    yesColor: '#ef4444',

    onYes: () => {
      closeConfirmBox();
    }
  });

  // Hide default Yes/No buttons
  id('logoutYesBtn').style.display = 'block';
  id('logoutNoBtn').style.display = 'none';

  setTimeout(() => {
    on('SS_PrintSlip', 'click', () => {
      closeConfirmBox();
      openPrintWindow(buildSalarySlipHTML('single'));
    });

    on('SS_PrintStationSlip', 'click', () => {
      closeConfirmBox();
      openPrintWindow(buildSalarySlipHTML('all'));
      resetSalarySlipFields();
      renderNoDataRow(id('SalarySlipBreakup')?.querySelector('tbody'), 7);
      renderNoDataRow(id('SalarySlipFYDetails')?.querySelector('tbody'), 7);
    });

    on('SS_PrintFY', 'click', () => {
      closeConfirmBox();
      openPrintWindow(buildSalaryFYStatementHTML('single'));
    });

    on('SS_PrintStationFY', 'click', () => {
      closeConfirmBox();
      openPrintWindow(buildSalaryFYStatementHTML('all'));
    });
  }, 0);
});

on('SSexcelBtn', 'click', () => {
  const hasEmp = !!id('SalSlipPage_Emp')?.value;

  showConfirmBox({
    title: 'Excel Options',

    icon: '📊',

    message: `
      <div style="display:flex;flex-direction:column;gap:8px">

        ${
          hasEmp
            ? `
          <button id="SS_ExcelSlip"
            class="reportTypeBtn">
            📊 Salary Slip Excel
          </button>
        `
            : ''
        }

        <button id="SS_ExcelStationSlip"
          class="reportTypeBtn">
          📊 Station Salary Slip Excel
        </button>

        ${
          hasEmp
            ? `
          <button id="SS_ExcelFY"
            class="reportTypeBtn">
            📈 FY Statement Excel
          </button>
        `
            : ''
        }

        <button id="SS_ExcelStationFY"
          class="reportTypeBtn">
          📈 Station FY Statement Excel
        </button>

      </div>
    `,

    subMessage: '',

    yesText: 'Close',
    noText: '',
    yesColor: '#ef4444',

    onYes: () => {
      closeConfirmBox();
    }
  });

  id('logoutYesBtn').style.display = 'block';
  id('logoutNoBtn').style.display = 'none';

  setTimeout(() => {
    on('SS_ExcelSlip', 'click', () => {
      closeConfirmBox();
      exportSalarySlipExcel('single');
    });

    on('SS_ExcelStationSlip', 'click', () => {
      closeConfirmBox();
      exportSalarySlipExcel('all');
    });

    on('SS_ExcelFY', 'click', () => {
      closeConfirmBox();
      exportSalaryFYStatementExcel('single');
    });

    on('SS_ExcelStationFY', 'click', () => {
      closeConfirmBox();
      exportSalaryFYStatementExcel('all');
    });
  }, 0);
});
