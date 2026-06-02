//================================================================================//
//                🔥🔥🔥🔥🔥INCOME TAX SCRIPT🔥🔥🔥🔥🔥
//=============================================================================//

// =========================
// 🔥 CONSTANTS
// =========================
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

const FY_MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

// =========================
// 🔥 FY CHECK (CRITICAL FIX)
// =========================
function isMonthInFY(monthStr, selectedFY) {
  if (!monthStr) return false;

  const [m, y] = monthStr.split('-');
  const year = Number(y);

  const fyStart = Number(selectedFY.split('-')[0]);
  const fyEnd = fyStart + 1;

  // 🔥 Mar belongs to NEXT FY
  if (m === 'Mar') {
    return year === fyStart;
  }

  // Apr → Dec
  if (['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(m)) {
    return year === fyStart;
  }

  // Jan, Feb
  if (['Jan', 'Feb'].includes(m)) {
    return year === fyEnd;
  }

  return false;
}

// =========================
// 🔥 GET EMP LEVEL + INDEX
// =========================
function getEmpPayDetails(empHRIS) {
  const h = window.empCalcHeaders;
  const rows = window.empCalcRows;

  const hrisIndex = h.indexOf('HRIS');

  const row = rows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim());

  if (!row) {
    return {
      level: 0,
      index: 0
    };
  }

  return {
    level: Number(row[h.indexOf('Last Drawn Pay Level')]) || 0,
    index: Number(row[h.indexOf('Last Increment Index')]) || 0
  };
}
// =========================
// 🔥 CPC LOOKUP
// =========================
function getBasicFromCPC(level, index) {
  const h = cpcData.headers;
  const rows = cpcData.rows;

  // column = level
  const colIndex = h.findIndex((hd) => String(hd).toLowerCase().includes(String(level).toLowerCase()));

  if (colIndex === -1) return 0;

  // row = index
  const row = rows.find((r) => Number(r[0]) === Number(index));

  if (!row) return 0;

  return Number(row[colIndex]) || 0;
}

function getRetirementMonth(retirementDate) {
  if (!retirementDate) return '';

  const d = new Date(retirementDate);

  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();

  return `${month}-${year}`;
}

function getMonthValue(m) {
  const [mon, yr] = m.split('-');
  return Number(yr) * 12 + monthOrder[mon];
}

function isAfterRetirement(fullMonth, retirementMonth) {
  if (!retirementMonth) return false;

  const [m1, y1] = fullMonth.split('-');
  const [m2, y2] = retirementMonth.split('-');

  const v1 = Number(y1) * 12 + monthOrder[m1];
  const v2 = Number(y2) * 12 + monthOrder[m2];

  return v1 > v2;
}

function getEmptyRow(month) {
  return {
    month,
    'Basic Pay': 0,
    DA: 0,
    TA: 0,
    HRA: 0,
    NPSE: 0,
    CEA: 0,
    'EL Encashment': 0,
    Bonus: 0,
    'DAA & Arrears': 0,
    'Uniform Allowance': 0,
    'Gross Income': 0,
    'Net IT': 0,
    GPF: 0,
    NPSE2: 0,
    NPSC: 0,
    CGEIS: 0,
    LIC: 0,
    'Prof Tax': 0,
    'Recovery Pay & Arr': 0
    //"Total Deduction": 0
  };
}
// =========================
// 🚀 MAIN FUNCTION
// =========================

function buildProjectedFY(empHRIS, selectedFY, mode = 'calculated') {
  if (!pbData || !pbData.rows) return [];

  const h = pbData.headers;
  let rows = pbData.rows;
  const nameIndex = h.indexOf('Employee Name');
  const monthIndex = h.indexOf('Salary Month');
  const hrisIndex = h.indexOf('HRIS');

  // 🔥 IGNORE UNSAVED NEXT MONTH (ADD MODE FIX)
  if (isAddMode) {
    const currentMonth = id('PayBillPage_SalMonth')?.value;

    rows = rows.filter((r) => {
      const m = String(r[monthIndex]).trim();
      return m !== currentMonth; // ❌ remove newly added month
    });
  }

  const empRows = rows.filter((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim());
  if (!empRows.length) return [];

  empRows.sort((a, b) => {
    const [m1, y1] = a[monthIndex].split('-');
    const [m2, y2] = b[monthIndex].split('-');
    return Number(y1) * 12 + monthOrder[m1] - (Number(y2) * 12 + monthOrder[m2]);
  });

  const lastPB = empRows[empRows.length - 1];
  const lastPBMonth = lastPB[monthIndex];

  const g = (row, col) => {
    const i = h.indexOf(col);
    return i !== -1 ? Number(row[i]) || 0 : 0;
  };

  // 🔥 BASE VALUES
  let DA_percent = Number(id('PayBillPage_DA%')?.value) || g(lastPB, 'DA%');
  let HRA_percent = Number(id('PayBillPage_HRA%')?.value) || g(lastPB, 'HRA%');
  let TA = g(lastPB, 'TA');
  let CGEIS = g(lastPB, 'CGEIS');
  let ProfTax = g(lastPB, 'Prof Tax');
  let GPF = g(lastPB, 'GPF');
  let NetIT = g(lastPB, 'Net IT');
  let lic = g(lastPB, 'LIC');

  // 🔥 EMP DATA
  const empHeaders = window.empCalcHeaders;
  const empRowsData = window.empCalcRows;

  const empRow = empRowsData.find((r) => String(r[empHeaders.indexOf('HRIS')]).trim() === String(empHRIS).trim());

  if (!empRow) return [];

  const emp = getEmpPayDetails(empHRIS);
  let level = emp.level;
  let index = emp.index;

  const lastIncrementMonth = String(empRow[empHeaders.indexOf('Last Increment')] || '').split('-')[0];

  const retirementMonth = getRetirementMonth(empRow[empHeaders.indexOf('Superannuation')]);

  const dept = String(empRow[empHeaders.indexOf('Department')] || '').toUpperCase();

  const result = [];
  let incrementApplied = false;

  FY_MONTHS.forEach((m, i) => {
    const startYear = Number(selectedFY.split('-')[0]);
    const year = i <= 9 ? startYear : startYear + 1;

    const fullMonth = `${m}-${year}`;

    const pbRow = empRows.find((r) => String(r[monthIndex]).trim().toUpperCase() === fullMonth.toUpperCase());

    // =========================
    // 🔹 PAID MODE
    // =========================
    if (mode === 'paid') {
      if (getMonthValue(fullMonth) > getMonthValue(lastPBMonth)) {
        result.push({ month: fullMonth });
        return;
      }

      if (!pbRow) {
        result.push({ month: fullMonth });
        return;
      }

      const baseNPSE = g(pbRow, 'NPSE') + g(pbRow, 'DAA on NPSE');
      const baseNPSC = g(pbRow, 'NPSC') + g(pbRow, 'DAA on NPSC');
      const NPSE = dept !== 'GO' ? baseNPSE : 0;
      const NPSC = dept !== 'GO' ? baseNPSC : 0;

      const arrear = g(pbRow, 'Arrears') + g(pbRow, 'Total DAA');

      result.push({
        month: fullMonth,
        'Basic Pay': g(pbRow, 'Basic Pay'),
        DA: g(pbRow, 'DA'),
        TA: g(pbRow, 'TA'),
        HRA: g(pbRow, 'HRA'),
        NPSE: NPSE,
        CEA: g(pbRow, 'CEA'),
        'EL Encashment': g(pbRow, 'EL Encash'),
        Bonus: g(pbRow, 'Bonus'),
        'DAA & Arrears': arrear,
        'Uniform Allowance': g(pbRow, 'Uni All'),
        'Gross Income': g(pbRow, 'Gross Income'),
        'Net IT': g(pbRow, 'Net IT'),
        GPF: g(pbRow, 'GPF'),
        NPSE2: NPSE,
        NPSC: NPSC,
        CGEIS: g(pbRow, 'CGEIS'),
        LIC: g(pbRow, 'LIC'),
        'Prof Tax': g(pbRow, 'Prof Tax'),
        'Recovery Pay & Arr': g(pbRow, 'REC P & A')
        //"Total Deduction": g(pbRow, "Total Deduction")
      });

      return;
    }

    // =========================
    // 🔹 CALCULATED MODE
    // =========================
    let basic, DA, HRA, NPSE, NPSC;

    // 🔥 GET LAST NON-ZERO HRA FROM FULL pbData (NOT empRows)
    let lastHRAValue = 0;

    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];

      if (String(r[hrisIndex]).trim() !== String(empHRIS).trim()) continue;

      const val = g(r, 'HRA');

      if (val && val !== 0) {
        lastHRAValue = val;
        break;
      }
    }

    const isFuture = getMonthValue(fullMonth) > getMonthValue(lastPBMonth);

    if (!pbRow || isFuture) {
      // 🔥 APPLY INCREMENT ONCE
      if (lastIncrementMonth && m === lastIncrementMonth && !incrementApplied) {
        index++;
        incrementApplied = true;
      }

      basic = getBasicFromCPC(level, index);
      DA = basic * (DA_percent / 100);
      // 🔥 APPLY HRA ONLY IF PB HAS NON-ZERO HISTORY
      if (lastHRAValue && lastHRAValue !== 0) {
        HRA = basic * (HRA_percent / 100);
      } else {
        HRA = 0;
      }

      NPSE = dept !== 'GO' ? (basic + DA) * 0.14 : 0;
      NPSC = dept !== 'GO' ? (basic + DA) * 0.1 : 0;

      let gross = basic + DA + HRA + TA + NPSE;
      let deduction = NPSE + NPSC + CGEIS + GPF + NetIT + ProfTax;

      // 🔥 RETIREMENT FIX
      if (retirementMonth && isAfterRetirement(fullMonth, retirementMonth)) {
        result.push(getEmptyRow(fullMonth));
        return;
      }

      result.push({
        month: fullMonth,
        'Basic Pay': Math.round(basic),
        DA: Math.round(DA),
        TA: Math.round(TA),
        HRA: Math.round(HRA),
        NPSE: Math.round(NPSE),
        CEA: 0,
        'EL Encashment': 0,
        Bonus: 0,
        'DAA & Arrears': 0,
        'Uniform Allowance': 0,
        'Gross Income': Math.round(gross),
        'Net IT': NetIT,
        GPF: GPF,
        NPSE2: Math.round(NPSE),
        NPSC: Math.round(NPSC),
        CGEIS: CGEIS,
        LIC: lic,
        'Prof Tax': ProfTax,
        'Recovery Pay & Arr': 0
        //"Total Deduction": Math.round(deduction)
      });
    } else {
      const baseNPSE = g(pbRow, 'NPSE') + g(pbRow, 'DAA on NPSE');
      const baseNPSC = g(pbRow, 'NPSC') + g(pbRow, 'DAA on NPSC');
      const NPSE = dept !== 'GO' ? baseNPSE : 0;
      const NPSC = dept !== 'GO' ? baseNPSC : 0;

      const arrear = g(pbRow, 'Arrears') + g(pbRow, 'Total DAA');

      result.push({
        month: fullMonth,
        'Basic Pay': g(pbRow, 'Basic Pay'),
        DA: g(pbRow, 'DA'),
        TA: g(pbRow, 'TA'),
        HRA: g(pbRow, 'HRA'),
        NPSE: NPSE,
        CEA: g(pbRow, 'CEA'),
        'EL Encashment': g(pbRow, 'EL Encash'),
        Bonus: g(pbRow, 'Bonus'),
        'DAA & Arrears': arrear,
        'Uniform Allowance': g(pbRow, 'Uni All'),
        'Gross Income': g(pbRow, 'Gross Income'),
        'Net IT': g(pbRow, 'Net IT'),
        GPF: g(pbRow, 'GPF'),
        NPSE2: NPSE,
        NPSC: NPSC,
        CGEIS: g(pbRow, 'CGEIS'),
        LIC: g(pbRow, 'LIC'),
        'Prof Tax': g(pbRow, 'Prof Tax'),
        'Recovery Pay & Arr': g(pbRow, 'REC P & A')
        //"Total Deduction": g(pbRow, "Total Deduction")
      });
    }
  });

  return {
    data: result,
    lastPBMonth
  };
}

function getITValue(selectedFY, regime, columnName, slab = null) {
  if (!itData || !itData.rows) return 0;

  const h = itData.headers;

  const fyIndex = h.indexOf('Financial Year');
  const regimeIndex = h.indexOf('Regime');
  const colIndex = h.indexOf(columnName);
  const slabIndex = h.indexOf('Slabs');

  for (let i = 0; i < itData.rows.length; i++) {
    const r = itData.rows[i];

    const fyMatch = String(r[fyIndex]).trim() === selectedFY;

    const regimeMatch = String(r[regimeIndex]).toLowerCase().includes(regime.toLowerCase());

    const slabMatch = !slab || String(r[slabIndex]).trim() === slab;

    if (fyMatch && regimeMatch && slabMatch) {
      return Number(r[colIndex]) || 0;
    }
  }

  return 0;
}

function calculateTaxSlabs(selectedFY, regime, taxableIncome) {
  if (!itData || !itData.rows) return [];

  const h = itData.headers;

  const fyIndex = h.indexOf('Financial Year');
  const regimeIndex = h.indexOf('Regime');
  const lowerIndex = h.indexOf('Lower Limit');
  const upperIndex = h.indexOf('Upper Limit');
  const rateIndex = h.indexOf('Rate');

  const slabs = itData.rows.filter((r) => String(r[fyIndex]).trim() === selectedFY && String(r[regimeIndex]).toLowerCase().includes(regime.toLowerCase()));

  let remaining = taxableIncome;
  let totalTax = 0;

  const result = [];

  slabs.forEach((r) => {
    const lower = Number(r[lowerIndex]) || 0;
    const upper = r[upperIndex] ? Number(r[upperIndex]) : Infinity;
    const rate = Number(String(r[rateIndex]).replace('%', '')) || 0;

    let slabAmount = 0;

    // 🔥 KEY FIX: ALWAYS PROCESS ALL SLABS
    if (remaining > 0) {
      slabAmount = Math.min(remaining, upper - lower);
    }

    const tax = slabAmount * (rate / 100);

    result.push({
      range: upper === Infinity ? `Tax Above ${formatCurrency(lower)}` : `Tax Between ${formatCurrency(lower)} to ${formatCurrency(upper)}`,
      rate: rate + '%',
      income: slabAmount,
      tax: Math.round(tax)
    });

    totalTax += tax;
    remaining -= slabAmount;
  });

  return {
    rows: result,
    total: Math.round(totalTax)
  };
}

function initSalaryToggle() {
  const toggle = id('salaryMode');

  if (!toggle) return;

  const labels = qsa('.salary-toggle .salModeLabel');

  function updateToggle() {
    // 🔥 RESET LABELS
    labels.forEach((l) => {
      removeClass(l, 'active');
    });

    /* =====================================================
              CHECKBOX MODE
              unchecked  = calculated
              checked    = paid
            ===================================================== */

    if (toggle.checked) {
      // 🔥 PAID MODE
      addClass(labels[1], 'active');
    } else {
      // 🔥 CALCULATED MODE
      addClass(labels[0], 'active');
    }

    // =====================================================
    // 🔥 AUTO RENDER
    // =====================================================

    const empHRIS = id('ITPage_Emp')?.value;
    const selectedFY = id('ITPage_FY')?.value;

    if (!empHRIS || !selectedFY) return;

    const wrapper = qs('.ITtableWrapper');

    if (wrapper) {
      wrapper.innerHTML = 'Loading...';
    }

    const mode = toggle.checked ? 'paid' : 'calculated';

    renderCalculatedITTable(empHRIS, selectedFY, mode);
  }

  // 🔥 INITIAL STATE
  updateToggle();

  // 🔥 CHANGE EVENT
  on(toggle, 'change', updateToggle);
}

function renderCalculatedITTable(empHRIS, selectedFY, mode = 'calculated') {
  const dbgEmpRow = window.empCalcRows.find((r) => String(r[window.empCalcHeaders.indexOf('HRIS')]).trim() === String(empHRIS).trim());
  const wrapper = qs('.ITtableWrapper');
  if (!wrapper) return;
  const ITfy = id('ITPage_FY').value;
  const Sal = qs("input[name='salaryMode']:checked")?.value;
  wrapper.innerHTML = '';

  const { data, lastPBMonth } = buildProjectedFY(empHRIS, selectedFY, mode);

  if (!data.length) {
    wrapper.innerHTML = '<h3 style="font-size:13px;background:#edebb7;width:100%;height:40px;background:#edebb7;color:red;padding-top:10px;">==============🚫 No Data 🚫==============</h3>';
    return;
  }

  const COMPONENTS = [
    ['Basic', 'Basic Pay'],
    ['DA', 'DA'],
    ['TA', 'TA'],
    ['HRA', 'HRA'],
    ['NPSE', 'NPSE'],
    ['CEA', 'CEA'],
    ['EL Encash', 'EL Encashment'],
    ['Bonus', 'Bonus'],
    ['DAA & Arr.', 'DAA & Arrears'],
    ['Uni. All.', 'Uniform Allowance'],
    ['Gross', 'Gross Income'],
    ['TDS', 'Net IT'],
    ['GPF', 'GPF'],
    ['NPSE', 'NPSE2'],
    ['NPSC', 'NPSC'],
    ['CGEIS', 'CGEIS'],
    ['LIC', 'LIC'],
    ['Prof Tax', 'Prof Tax'],
    ['Rec. P & A', 'Recovery Pay & Arr']
    //["Total Deduction","Total Deduction"]
  ];

  const empDB = window.empCalcHeaders;

  if (!window.empCalcHeaders || !window.empCalcRows) {
    console.error('empCalcHeaders not loaded');
    return;
  }

  const empHead = window.empCalcHeaders;

  const empnameIndex = empHead.indexOf('Employee Name');
  const desigIndex = empHead.indexOf('Designation');
  const stationIndex = empHead.indexOf('Station');
  const hrisIndex = empHead.indexOf('HRIS');
  const panIndex = empHead.indexOf('PAN');

  const empRow = window.empCalcRows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim());

  const empName = empRow?.[empnameIndex] || '';
  const designation = empRow?.[desigIndex] || '';
  const empstation = empRow?.[stationIndex] || '';
  const hris = empRow?.[hrisIndex] || '';
  const pan = empRow?.[panIndex] || '';

  const infoTable = document.createElement('table');

  infoTable.style.width = '100%';
  infoTable.style.borderCollapse = 'collapse';
  infoTable.style.marginBottom = '8px';
  infoTable.style.fontSize = '11px';
  infoTable.style.border = '1px solid #ccc';

  infoTable.innerHTML = `
                  <tr style="background:#e9ecef;">
                    <th colspan="14" style="padding:6px;text-align:center;">
                      INCOME TAX CALCULATION DETAILS
                    </th>
                  </tr>
                  <tr>
                    <td style="padding:6px;" colspan="3"><b>Employee Name</b></td>
                    <td style="padding:6px;" colspan="4">${empName}</td>
                    <td style="padding:6px;" colspan="3"><b>Designation</b></td>
                    <td style="padding:6px;" colspan="4">${designation}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px;" colspan="3"><b>Station</b></td>
                    <td style="padding:6px;" colspan="4">${empstation}</td>
                    <td style="padding:6px;" colspan="3"><b>HRIS</b></td>
                    <td style="padding:6px;" colspan="4">${hris}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px;" colspan="3"><b>PAN</b></td>
                    <td style="padding:6px;" colspan="4">${pan}</td>
                    <td style="padding:6px;" colspan="3"><b>IT Calculation for</b></td>
                    <td style="padding:6px;" colspan="4">FY ${ITfy}</td>
                  </tr>
                `;
  wrapper.appendChild(infoTable);

  const table = document.createElement('table');

  // 🔥 COLGROUP USING innerHTML
  table.innerHTML = `
                <colgroup>
                  <col style="width:8%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:7%;">
                  <col style="width:8%;">
                </colgroup>
              `;

  const thead = document.createElement('thead');
  //${data.map(r => `<th style="text-align: left;">${r.month}</th>`).join("")}
  const h = pbData.headers;
  const nameIndex = h.indexOf('Employee Name');
  const monthIndex = h.indexOf('Salary Month');

  // 🔥 ALL PAID MONTHS FOR EMPLOYEE
  const hrisPBIndex = h.indexOf('HRIS');

  const paidMonths = new Set(pbData.rows.filter((r) => String(r[hrisPBIndex]).trim() === String(empHRIS).trim()).map((r) => String(r[monthIndex]).trim().toUpperCase()));

  thead.innerHTML = `
              <tr><th colspan="14" style="text-align:center;font-size:12px;">Salary Breakup for the Financial Year ${ITfy} for ${Sal}</th><tr>
              <tr><th style="text-align: left;">Salary Breakup</th>

            ${data
              .map((r) => {
                const isPaid = paidMonths.has(String(r.month).toUpperCase());
                const label = isPaid ? 'Paid' : 'Calc';

                const bg = isPaid ? '#2f9e44' : '#fbffae';
                const cl = isPaid ? 'white' : '#8b0000';
                return `
                <th>
                  <div>${r.month}</div>
                  <span style="
                    display:inline-block;
                    margin-top:2px;
                    padding:2px 10px;
                    font-size: 11px;
                    border-radius:5px;
                    color:${cl};
                    background:${bg};
                  ">
                    (${label})
                  </span>
                </th>
              `;
              })
              .join('')}
            <th style="text-align: left;">Total</th>
          </tr>
        `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  // 🔥 CHECK ONCE ONLY
  const isAllZero = data.every((row) => {
    return Object.keys(row).every((key) => {
      if (key === 'month') return true;
      return row[key] === 0 || row[key] === '' || row[key] === undefined;
    });
  });

  if (isAllZero) {
    const empHRIS = id('ITPage_Emp')?.value;
    const selectedFY = id('ITPage_FY')?.value; // e.g. 2026-27

    const h = window.empCalcHeaders;
    const rows = window.empCalcRows;

    const hrisIndex = h.indexOf('HRIS');
    const dorIndex = h.indexOf('Superannuation');

    const empRow = rows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim());

    let isRetired = false;

    if (empRow && selectedFY) {
      const dorStr = empRow[dorIndex];

      if (dorStr) {
        const dor = new Date(dorStr);

        const fyStart = Number(selectedFY.split('-')[0]); // 2026
        const fyEndDate = new Date(fyStart + 1, 2, 31); // 31-Mar-2027

        // Retired before FY end
        isRetired = dor <= fyEndDate;
      }
    }

    const message = isRetired ? '==============🚫 Employee Retired 🚫==============' : '==============🚫 No Data Found 🚫==============';

    const colSpan = data.length + 2;

    const tr = document.createElement('tr');

    tr.innerHTML = `
            <td colspan="${colSpan}"
                style="text-align:center;padding:15px;color:red;font-weight:bold;font-size:13px;background:#edebb7">
              <h3 style="font-size:13px;background:#edebb7;">
                ${message}
              </h3>
            </td>
          `;

    tbody.appendChild(tr);

    table.appendChild(tbody);
    wrapper.appendChild(table);

    return;
  }

  COMPONENTS.forEach(([label, key]) => {
    let total = 0;
    let rowHTML = `<td><b>${label}</b></td>`;

    data.forEach((r) => {
      const val = r[key] !== undefined && r[key] !== '' ? Number(r[key]) : 0;
      total += val;

      const isFuture = getMonthValue(r.month) > getMonthValue(lastPBMonth);

      const style = isFuture ? 'color:#8b0000;' : '';

      rowHTML += `<td style="${style}">
                    ${val ? formatCurrency(val) : ''}
                  </td>`;
    });

    // 🔥 HIDE ROW IF TOTAL = 0
    if (total === 0) return;

    rowHTML += `<td><b>${formatCurrency(total)}</b></td>`;

    const tr = document.createElement('tr');
    tr.innerHTML = rowHTML;
    tbody.appendChild(tr);
  });

  // =========================
  // 🔥 ADD TAX TABLE ROW
  // =========================

  const taxRow = document.createElement('tr');

  // =========================
  // 🔥 CALCULATIONS
  // =========================
  let BP = 0;
  let DA = 0;
  let HRA = 0;

  let adjGrossTotal = 0;
  let elihra1 = 0;
  let elihra2 = 0;
  let elihra3 = 0;
  let elihra = 0;

  let ded80C_raw = 0;
  let ded80C = 0;

  let elinpse = 0;
  let elinpsc = 0;

  let elipf = 0;
  let oldTaxableIncome = 0;
  let newTaxableIncome = 0;

  let totalTDS = 0;
  let paidMonthCount = 0;

  // 🔥 GET DISABILITY VALUE (STRING)
  let disabilityVal = '';

  for (let i = pbData.rows.length - 1; i >= 0; i--) {
    const r = pbData.rows[i];

    if (String(r[hrisPBIndex]).trim() !== String(empHRIS).trim()) continue;

    const val = r[pbData.headers.indexOf('Level of Disability')];

    if (val !== undefined && val !== '') {
      disabilityVal = String(val).trim();
      break;
    }
  }

  const station = (id('SalSlipPage_Station')?.value || '').toLowerCase();
  const metroCities = ['bangalore', 'bengaluru', 'delhi', 'new delhi', 'mumbai', 'kolkata'];

  const isMetro = metroCities.some((city) => station.includes(city));
  const HRA_rate = isMetro ? 0.5 : 0.4;
  const oldRegime = 'Old Regime';
  const newRegime = 'New Regime';
  window.houseRentMap = window.houseRentMap || {};
  const rentValue = Number(window.houseRentMap?.[empHRIS] || 0);

  data.forEach((r) => {
    const bp = Number(r['Basic Pay']) || 0;
    const da = Number(r['DA']) || 0;
    const hra = Number(r['HRA']) || 0;

    BP += bp;
    DA += da;
    HRA += hra;

    const gross = Number(r['Gross Income']) || 0;
    const recovery = Number(r['Recovery Pay & Arr']) || 0;

    const npse = Number(r['NPSE']) || 0;
    const npsc = Number(r['NPSC']) || 0;

    const gpf = Number(r['GPF']) || 0;
    const lic = Number(r['LIC']) || 0;
    const cgis = Number(r['CGEIS']) || 0;

    const pf = Number(r['Prof Tax']) || 0;

    // 🔥 Adjusted Gross
    adjGrossTotal += gross - recovery;

    // 🔥 HRA accumulation

    const totalSalary = BP + DA;

    const rent = rentValue;

    const elihra1 = HRA;

    const elihra2 = Math.max(0, rent - Math.round(0.1 * totalSalary));

    const elihra3 = Math.round(HRA_rate * totalSalary);

    elihra = Math.min(elihra1, elihra2, elihra3); // 🔥 ADD TO TOTAL

    // 🔥 80C raw (NO CAP HERE)
    elinpsc = Math.min(npsc, Math.round(0.1 * totalSalary, 0));
    ded80C_raw += gpf + elinpsc + lic + cgis;

    // 🔥 NPSE (80CCD(2))
    elinpse += Math.min(npse, Math.round(0.14 * totalSalary, 0));

    // 🔥 Professional Tax
    elipf += pf;

    const month = String(r.month).toUpperCase();
    const isPaid = paidMonths.has(month);

    if (!isPaid) return;

    // ✅ COUNT MONTH
    paidMonthCount++;
    id('paidMonthCountInput').value = paidMonthCount;

    // ✅ ADD TDS
    totalTDS += Number(r['Net IT']) || 0;
  });

  elipf = Math.min(2500, elipf);

  // 🔥 APPLY CAPS AFTER LOOP
  ded80C = Math.min(150000, ded80C_raw);

  // 🔥 DISABILITY DEDUCTION (80U)
  let disabilityDeduction = 0;

  if (disabilityVal === '>80%') {
    disabilityDeduction = 125000;
  } else if (disabilityVal === '>40%') {
    disabilityDeduction = 75000;
  } else {
    disabilityDeduction = 0; // "--" or empty
  }

  // 🔥 OLD REGIME TAX
  const oldStandardDeduction = getITValue(selectedFY, oldRegime, 'Standard Deduction');
  const oldRebateUpto = getITValue(selectedFY, oldRegime, 'Rebate Upto');
  const oldRebate = getITValue(selectedFY, oldRegime, 'Rebate');

  oldTaxableIncome = adjGrossTotal - oldStandardDeduction - elihra - ded80C - elipf - elinpse - disabilityDeduction;
  oldTaxableIncome = Math.max(0, oldTaxableIncome);
  const oldSlabData = calculateTaxSlabs(selectedFY, 'Old Regime', oldTaxableIncome);

  let oldTotalTax = oldSlabData.total;
  let oldRebateApplied = 0;

  if (oldTaxableIncome <= oldRebateUpto) {
    oldRebateApplied = Math.min(oldRebate, oldTotalTax);
  }
  const oldFinalTax = oldTotalTax - oldRebateApplied;

  const oldFinalTaxCess = Math.round(oldFinalTax * 0.04, 0);
  const oldNetTax = oldFinalTax + oldFinalTaxCess;

  const oldPendingTDS = oldNetTax - totalTDS;
  const oldTDSData = calculateMonthlyTDS(oldPendingTDS, paidMonthCount);

  const oldCalcITperMonth = Math.max(0, oldTDSData.IT);
  const oldCalcITCessperMonth = Math.max(0, oldTDSData.Cess);
  const oldCalcTDSperMonth = Math.max(0, oldTDSData.TDS);

  let oldSlabHTML = '';

  oldSlabData.rows.forEach((s) => {
    oldSlabHTML += `
                  <tr>
                    <td colspan="4">${s.range}</td>
                    <td style="text-align:center;">${s.rate}</td>
                    <td style="text-align:right;" colspan="2">${formatCurrency(s.tax)}</td>
                  </tr>
                `;
  });

  oldSlabHTML += `
                <tr><td colspan="5"><b>Calculated Income Tax (Slab Total)</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(oldSlabData.total)}</b></td></tr>
                <tr style="background:#edf1fa"><td colspan="7" style="text-align:center;"><b>Calculation of Income Tax under Old Tax Regime</b></td></tr>
                <tr><td colspan="5">Rebate u/s 87A (Taxable Gross Income <= ${formatCurrency(oldRebateUpto)})</td><td style="text-align:right;" colspan="2">${formatCurrency(oldRebateApplied)}</td></tr>
                <tr><td colspan="5">Tax After Rebate</td><td style="text-align:right;" colspan="2">${formatCurrency(oldFinalTax)}</td></tr>
                <tr><td colspan="5">Education Cess @4%</td><td style="text-align:right;" colspan="2">${formatCurrency(oldFinalTaxCess)}</td></tr>
                <tr style="background:#adffeb;"><td colspan="5"><b>Net Income Tax</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(oldNetTax)}</b></td></tr>
                <tr><td colspan="5">TDS Deducted (${paidMonthCount} Months)</td><td style="text-align:right;" colspan="2">${formatCurrency(totalTDS)}</td></tr>
                <tr><td colspan="5"><b>Tax to be recovered ( - Refund / + Payable)</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(oldPendingTDS)}</b></td></tr>
                <tr>
                  <td colspan="5"><b>Monthly TDS [ ${formatCurrency(oldCalcITperMonth)} (IT) + ${formatCurrency(oldCalcITCessperMonth)} (Cess) ]</b></td>
                  <td style="text-align:right;" colspan="2"><b>${formatCurrency(oldCalcTDSperMonth)}</b></td>
                </tr>
              `;

  // 🔥 NEW REGIME TAX
  const newStandardDeduction = getITValue(selectedFY, newRegime, 'Standard Deduction');
  const newRebateUpto = getITValue(selectedFY, newRegime, 'Rebate Upto');
  const newRebate = getITValue(selectedFY, newRegime, 'Rebate');
  newTaxableIncome = adjGrossTotal - newStandardDeduction - elinpse;
  newTaxableIncome = Math.max(0, newTaxableIncome);
  const newSlabData = calculateTaxSlabs(selectedFY, 'New Regime', newTaxableIncome);

  let newTotalTax = newSlabData.total;
  let newRebateApplied = 0;

  if (newTaxableIncome <= newRebateUpto) {
    newRebateApplied = Math.min(newRebate, newTotalTax);
  }
  const newFinalTax = newTotalTax - newRebateApplied;
  const newFinalTaxCess = Math.round(newFinalTax * 0.04, 0);
  const newNetTax = newFinalTax + newFinalTaxCess;
  const newPendingTDS = newNetTax - totalTDS;
  const newTDSData = calculateMonthlyTDS(newPendingTDS, paidMonthCount);

  const newCalcITperMonth = Math.max(0, newTDSData.IT);
  const newCalcITCessperMonth = Math.max(0, newTDSData.Cess);
  const newCalcTDSperMonth = Math.max(0, newTDSData.TDS);

  //Calcuklation for Panel Display
  const bestGross = Math.min(newTaxableIncome, oldTaxableIncome);
  const bestIT = Math.min(newNetTax, oldNetTax);
  let bestRegime = '';
  if (newNetTax >= oldNetTax) {
    bestRegime = 'Old Tax Regime';
  } else if (newNetTax < oldNetTax) {
    bestRegime = 'New Tax Regime';
  }
  const panelITtobeRecovered = Math.min(newPendingTDS, oldPendingTDS);

  if (panelITtobeRecovered <= 0) {
    id('PanelITHighlight').style.background = '#80ff80';
  } else if (panelITtobeRecovered > 0) {
    id('PanelITHighlight').style.background = '#fc9f9f';
  }

  id('PanelGross').innerText = formatCurrency(bestGross);
  id('PanelRegime').innerText = bestRegime;
  id('PanelCalcIT').innerText = formatCurrency(bestIT);
  id('PanelTDS').innerText = formatCurrency(totalTDS);
  id('PanelIT').innerText = formatCurrency(panelITtobeRecovered);

  let newSlabHTML = '';

  newSlabData.rows.forEach((s) => {
    newSlabHTML += `
                  <tr>
                    <td colspan="4">${s.range}</td>
                    <td style="text-align:center;">${s.rate}</td>
                    <td style="text-align:right;" colspan="2">${formatCurrency(s.tax)}</td>
                  </tr>
                `;
  });

  newSlabHTML += `
                <tr><td colspan="5"><b>Calculated Income Tax (Slab Total)</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(newSlabData.total)}</b></td></tr>
                <tr style="background:#edf1fa"><td colspan="7" style="text-align:center;"><b>Calculation of Income Tax under New Rax Regime</b></td></tr>
                <tr><td colspan="5">Rebate u/s 87A (Taxable Gross Income <= ${formatCurrency(newRebateUpto)})</td><td style="text-align:right;" colspan="2">${formatCurrency(newRebateApplied)}</td></tr>
                <tr><td colspan="5">Tax After Rebate</td><td style="text-align:right;" colspan="2">${formatCurrency(newFinalTax)}</td></tr>
                <tr><td colspan="5">Education Cess @4%</td><td style="text-align:right;" colspan="2">${formatCurrency(newFinalTaxCess)}</td></tr>
                <tr style="background:#adffeb;"><td colspan="5"><b>Net Income Tax</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(newNetTax)}</b></td></tr>
                <tr><td colspan="5">TDS Deducted (${paidMonthCount} Months)</td><td style="text-align:right;" id="NewTaxTDS" colspan="2">${formatCurrency(totalTDS)}</td></tr>
                <tr><td colspan="5"><b>Tax to be recovered ( - Refund / + Payable)</b></td><td style="text-align:right;" id="NewTaxPending" colspan="2"><b>${formatCurrency(newPendingTDS)}</b></td></tr>
                <tr><td colspan="5"><b>Monthly TDS [ ${formatCurrency(newCalcITperMonth)} (IT) + ${formatCurrency(newCalcITCessperMonth)} (Cess) ]</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(newCalcTDSperMonth)}</b></td></tr>
              `;

  taxRow.innerHTML = `
        <td colspan="7" style="padding:10px;vertical-align: top;border-right:none;">
          <table style="width:100%; border-collapse:collapse; border:1px solid #ccc;" id="oldRegimeTable">
            <colgroup>
              <col style="width:20%">
              <col style="width:20%">
              <col style="width:10%">
              <col style="width:10%">
              <col style="width:10%">
              <col style="width:10%">
              <col style="width:20%">
            </colgroup>
            <thead>
              <tr>
                <th colspan="7" style="background: #1f4e79; text-align:center; font-size:12px; color:white;padding:10px;" class="rowITregimeHeader">
                  Old Tax Regime Calculation for FY ${ITfy}
                  ${bestRegime === 'Old Tax Regime' ? "<span style='margin-left:8px;font-weight:bold;border-radius:4px;color:#002109;background:#33ff69;box-shadow:0px 0px 2px 1px #00ff00;padding:4px;'>( ✔ Selected )</span>" : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#edf1fa"><td colspan="7" style="text-align:center;"><b>Calculation of Gross Income</b></td></tr>
              <tr>
                <td colspan="5"><b>Gross Income</b></td>
                <td style="text-align:right;" colspan="2"><b>${formatCurrency(adjGrossTotal)}</b></td>
              </tr>

              <tr>
                <td colspan="5">Standard Deduction</td>
                <td style="text-align:right;" colspan="2">${formatCurrency(oldStandardDeduction)}</td>
              </tr>

              <!-- 🔥 HRA WITH INPUT -->
              <tr>
                <td colspan="5" style="padding:
                0px 8px">
                  HRA Rebate
                  <label style="margin-left:10px;color:gray;font-style:italic;">(House Rent for FY :</label>
                  <input type="number" id="rentInput" min="0" style="width:120px;margin-left:5px">)
                </td>
                <td id="hraValue" style="text-align:right;" colspan="2"> ${formatCurrency(elihra)}</td>
              </tr>

              <tr>
                <td colspan="5">Disability Rebate</td>
                <td style="text-align:right;" colspan="2">${formatCurrency(disabilityDeduction)}</td>
              </tr>

              <tr>
                <td colspan="5">Professional Tax</td>
                <td id="pfVal" style="text-align:right;" colspan="2">${formatCurrency(elipf)}</td>
              </tr>

              <tr>
                <td colspan="5">Deduction Eligible under (NPSC + GPF + CGEIS + LIC) </td>
                <td id="ded80cVal" style="text-align:right;" colspan="2">${formatCurrency(ded80C)}</td>
              </tr>

              <tr>
                <td colspan="5">NPSE</td>
                <td id="npseVal" style="text-align:right;" colspan="2">${formatCurrency(elinpse)}</td>
              </tr>

              <tr>
                <td colspan="5"><b>Taxable Gross Income</b></td>
                <td id="taxableVal" style="text-align:right;" colspan="2">
                  <b>${formatCurrency(oldTaxableIncome)}</b>
                </td>
              </tr>

              <tr style="background:#edf1fa"><td colspan="7" style="text-align:center;"><b>Tax Slab under Old Tax Regime</b></td></tr>
              <tbody id="oldSlabBody">
                ${oldSlabHTML}
              </tbody>
            </tbody>
          </table>
        </td>

        <td colspan="7" style="padding:10px;vertical-align: top;border-left:none;">

          <table style="width:100%; border-collapse:collapse; border:1px solid #ccc;" id="newRegimeTable">
            <colgroup>
              <col style="width:20%">
              <col style="width:20%">
              <col style="width:10%">
              <col style="width:10%">
              <col style="width:10%">
              <col style="width:10%">
              <col style="width:20%">
            </colgroup>
            <thead>
              <tr>
                <th colspan="7" style="background: #1f4e79; text-align:center; font-size:12px; color:white;padding:10px;" class="rowITregimeHeader">
                  New Tax Regime Calculation for FY ${ITfy}
                  ${bestRegime === 'New Tax Regime' ? "<span style='margin-left:8px;font-weight:bold;border-radius:4px;color:#002109;background:#33ff69;box-shadow:0px 0px 2px 1px #00ff00;padding:4px;'>( ✔ Selected )</span>" : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#edf1fa"><td colspan="7" style="text-align:center;"><b>Calculation of Gross Income</b></td></tr>
              <tr><td colspan="5"><b>Gross Income</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(adjGrossTotal)}</b></td></tr>
              <tr><td colspan="5">Standard Deduction</td><td style="text-align:right;" colspan="2">${formatCurrency(newStandardDeduction)}</td></tr>
              <tr><td colspan="5">Deduction Eligible under NPSE</td><td style="text-align:right;" colspan="2">${formatCurrency(elinpse)}</td></tr>
              <tr><td colspan="5"><b>Taxable Gross Income</b></td><td style="text-align:right;" id="NewTaxGross" colspan="2"><b>${formatCurrency(newTaxableIncome)}</b></td></tr>
              <tr style="background:#edf1fa"><td colspan="7" style="text-align:center;""><b>Tax Slab under New Tax Regime</b></td></tr>
              ${newSlabHTML}
            </tbody>
          </table>

        </td>
      `;

  // =========================
  // 🔥 FINAL APPEND (NO GAP / NO EXTRA ROW)
  // =========================

  tbody.appendChild(taxRow);
  table.appendChild(tbody);

  // 🔥 RESET WRAPPER
  wrapper.innerHTML = '';

  // 🔥 MAIN WRAPPER TABLE (SINGLE TABLE STRUCTURE)
  const mainTable = document.createElement('table');

  mainTable.style.width = '100%';
  mainTable.style.borderCollapse = 'collapse';
  mainTable.style.margin = '0';
  mainTable.style.padding = '0';

  // 🔥 BUILD STRUCTURE
  mainTable.innerHTML = `
                <!-- 🔴 INFO -->
                <tr>
                  <td colspan="14" style="padding:0;border:none;">
                    ${infoTable.outerHTML}
                  </td>
                </tr>

                <!-- 🔴 MAIN TABLE -->
                <tr>
                  <td colspan="14" style="padding:0;border:none;">
                    ${table.outerHTML}
                  </td>
                </tr>

              `;

  // 🔥 APPEND FINAL
  wrapper.appendChild(mainTable);

  setTimeout(() => {
    const rentInput = id('rentInput');
    if (!rentInput) return;

    // ✅ restore value
    window.houseRentMap = window.houseRentMap || {};
    rentInput.value = window.houseRentMap[empHRIS] || '';

    rentInput.addEventListener('input', () => {
      const rent = Number(rentInput.value || 0);

      // ✅ store per employee
      window.houseRentMap[empHRIS] = rent;

      let BP = 0,
        DA = 0,
        HRA = 0;

      data.forEach((r) => {
        BP += Number(r['Basic Pay']) || 0;
        DA += Number(r['DA']) || 0;
        HRA += Number(r['HRA']) || 0;
      });

      const totalSalary = BP + DA;

      const elihra1 = HRA;
      const elihra2 = Math.max(0, rent - Math.round(0.1 * totalSalary));
      const elihra3 = Math.round(HRA_rate * totalSalary);

      const elihra = Math.min(elihra1, elihra2, elihra3);

      id('hraValue').innerHTML = formatCurrency(elihra);

      // ✅ RECALCULATE TAXABLE
      let ReOldTaxable = adjGrossTotal - oldStandardDeduction - elihra - ded80C - elipf - elinpse - disabilityDeduction;

      ReOldTaxable = Math.max(0, ReOldTaxable);

      id('taxableVal').innerHTML = '<b>' + formatCurrency(ReOldTaxable) + '</b>';

      // ✅ SLAB CALC
      const oldSlabData = calculateTaxSlabs(selectedFY, 'Old Regime', ReOldTaxable);

      let reOldTotalTax = oldSlabData.total;

      // ✅ FIXED REBATE
      let reOldRebateApplied = 0;

      if (ReOldTaxable <= oldRebateUpto) {
        reOldRebateApplied = Math.min(oldRebate, reOldTotalTax);
      }

      const oldFinalTax = reOldTotalTax - reOldRebateApplied;
      const oldFinalTaxCess = Math.round(oldFinalTax * 0.04);
      const oldNetTax = oldFinalTax + oldFinalTaxCess;

      const oldPendingTDS = oldNetTax - totalTDS;
      const oldTDSData = calculateMonthlyTDS(oldPendingTDS, paidMonthCount);

      const oldCalcITperMonth = oldTDSData.IT;
      const oldCalcITCessperMonth = oldTDSData.Cess;
      const oldCalcTDSperMonth = oldTDSData.TDS;

      // ✅ BUILD HTML
      let oldSlabHTML = '';

      oldSlabData.rows.forEach((s) => {
        oldSlabHTML += `
                      <tr>
                        <td colspan="4">${s.range}</td>
                        <td style="text-align:center;">${s.rate}</td>
                        <td style="text-align:right;" colspan="2">${formatCurrency(s.tax)}</td>
                      </tr>
                    `;
      });

      oldSlabHTML += `
                    <tr><td colspan="5"><b>Calculated Income Tax (Slab Total)</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(reOldTotalTax)}</b></td></tr>
                    <tr style="background:#edf1fa"><td colspan="7" style="text-align:center;"><b>Calculation of Income Tax</b></td></tr>
                    <tr><td colspan="5">Rebate u/s 87A</td><td style="text-align:right;" colspan="2">${formatCurrency(reOldRebateApplied)}</td></tr>
                    <tr> <td colspan="5">Tax After Rebate</td><td style="text-align:right;" colspan="2">${formatCurrency(oldFinalTax)}</td></tr>
                    <tr><td colspan="5">Education Cess @4%</td><td style="text-align:right;" colspan="2">${formatCurrency(oldFinalTaxCess)}</td></tr>
                    <tr style="background:#adffeb;"><td colspan="5"><b>Net Income Tax</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(oldNetTax)}</b></td></tr>
                    <tr><td colspan="5">TDS Deducted (${paidMonthCount} Months)</td><td style="text-align:right;" colspan="2">${formatCurrency(totalTDS)}</td></tr>
                    <tr><td colspan="5"><b>Tax to be recovered ( - Refund / + Payable)</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(oldPendingTDS)}</b></td></tr>
                    <tr><td colspan="5"><b>Monthly TDS (${oldCalcITperMonth} (IT) + ${oldCalcITCessperMonth} (Cess))</b></td><td style="text-align:right;" colspan="2"><b>${formatCurrency(oldCalcTDSperMonth)}</b></td></tr>
                  `;

      //Calcuklation for Panel Display
      const bestGross = Math.min(newTaxableIncome, oldTaxableIncome);
      const bestIT = Math.min(newNetTax, oldNetTax);
      let bestRegime = '';
      if (newNetTax >= oldNetTax) {
        bestRegime = 'Old Tax Regime';
      } else if (newNetTax < oldNetTax) {
        bestRegime = 'New Tax Regime';
      }
      const panelITtobeRecovered = Math.min(newPendingTDS, oldPendingTDS);

      id('PanelGross').innerText = formatCurrency(bestGross);
      id('PanelRegime').innerText = bestRegime;
      id('PanelCalcIT').innerText = formatCurrency(bestIT);
      id('PanelTDS').innerText = formatCurrency(totalTDS);
      id('PanelIT').innerText = formatCurrency(panelITtobeRecovered);

      if (panelITtobeRecovered <= 0) {
        id('PanelITHighlight').style.background = '#00a13d';
      } else if (panelITtobeRecovered > 0) {
        id('PanelITHighlight').style.background = '#ff4040';
      }

      // ✅ UPDATE TABLE
      id('oldSlabBody').innerHTML = oldSlabHTML;
    });
  }, 100);
}

['ITPage_Station', 'ITPage_Emp', 'ITPage_FY'].forEach((idName) => {
  id(idName)?.addEventListener('change', () => {
    handleITChange();
  });
});

function handleITChange() {
  qsa('.ITaction-group button').forEach((btn) => {
    btn.disabled = false;
  });

  updateITPrintMenuState();

  const empHRIS = id('ITPage_Emp')?.value;
  const selectedFY = id('ITPage_FY')?.value;

  if (!empHRIS || !selectedFY) return;

  // =========================
  // 🔥 GET CURRENT MODE
  // =========================
  const toggle = id('salaryMode');

  const mode = toggle?.checked ? 'paid' : 'calculated';

  //console.log(`🔄 Salary Selected → ${mode}`);

  // =========================
  // 🔄 LOADING STATE
  // =========================
  const wrapper = qs('.ITtableWrapper');
  if (wrapper) wrapper.innerHTML = 'Loading...';

  // =========================
  // 🔥 RENDER
  // =========================
  renderCalculatedITTable(empHRIS, selectedFY, mode);
}

function SyncAllPage() {
  //================== Pay Bill Change ==================//
  refreshPBView();
  setDAPercent();
  handleITChange();
  handlePensionChange();
  const fy = id('DGPage_FY')?.value?.trim();

  id('DGPage_Month').disabled = !fy || fy === 'Select FY';
  loadDGMonthsByFY();
  filterDGTable();
  filterEBTable();
  //================== Salary Slip Change ==================//
  setTimeout(() => {
    handleSalarySlipChange();
  }, 0);
}

function calculateMonthlyTDS(newPendingTDS, paidMonthCount) {
  const remainingMonths = 12 - paidMonthCount;

  if (remainingMonths <= 0) {
    return {
      IT: 0,
      Cess: 0,
      TDS: 0
    };
  }

  const IT = Math.round(newPendingTDS / (1.04 * remainingMonths), 0);
  const Cess = Math.round(IT * 0.04, 0);
  const TDS = IT + Cess;

  return {
    IT,
    Cess,
    TDS
  };
}

function calculateEmployeeTax(empHRIS, selectedFY, regime) {
  const { data, lastPBMonth } = buildProjectedFY(empHRIS, selectedFY, 'calculated');

  if (!data || !data.length) {
    return {
      netTax: 0,
      totalTDS: 0,
      paidMonthCount: 0
    };
  }

  const h = pbData.headers;
  const nameIndex = h.indexOf('Employee Name');
  const monthIndex = h.indexOf('Salary Month');
  const hrisIndex = h.indexOf('HRIS');

  let validRows = pbData.rows;

  if (isAddMode) {
    const currentMonth = id('PayBillPage_SalMonth')?.value;

    validRows = validRows.filter((r) => {
      const m = String(r[monthIndex]).trim();
      return m !== currentMonth;
    });
  }

  const paidMonths = new Set(validRows.filter((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim()).map((r) => String(r[monthIndex]).trim().toUpperCase()));

  let adjGrossTotal = 0;
  let totalTDS = 0;
  let paidMonthCount = 0;

  let BP = 0,
    DA = 0,
    HRA = 0;
  let ded80C_raw = 0,
    ded80C = 0;
  let elinpse = 0,
    elipf = 0;

  // 🔥 Disability
  let disabilityVal = '';
  for (let i = pbData.rows.length - 1; i >= 0; i--) {
    const r = pbData.rows[i];
    if (String(r[hrisIndex]).trim() !== String(empHRIS).trim()) continue;

    const val = r[h.indexOf('Level of Disability')];
    if (val) {
      disabilityVal = String(val).trim();
      break;
    }
  }

  const station = (id('SalSlipPage_Station')?.value || '').toLowerCase();
  const isMetro = ['bangalore', 'bengaluru', 'delhi', 'mumbai', 'kolkata'].some((c) => station.includes(c));
  const HRA_rate = isMetro ? 0.5 : 0.4;

  data.forEach((r) => {
    const bp = Number(r['Basic Pay']) || 0;
    const da = Number(r['DA']) || 0;
    const hra = Number(r['HRA']) || 0;

    BP += bp;
    DA += da;
    HRA += hra;

    const gross = Number(r['Gross Income']) || 0;
    const recovery = Number(r['Recovery Pay & Arr']) || 0;

    const npse = Number(r['NPSE']) || 0;
    const npsc = Number(r['NPSC']) || 0;

    const gpf = Number(r['GPF']) || 0;
    const lic = Number(r['LIC']) || 0;
    const cgis = Number(r['CGEIS']) || 0;

    const pf = Number(r['Prof Tax']) || 0;

    // 🔥 Gross
    adjGrossTotal += gross - recovery;

    const totalSalary = BP + DA;

    // 🔥 80C
    const elinpsc = Math.min(npsc, Math.round(0.1 * totalSalary));
    ded80C_raw += gpf + elinpsc + lic + cgis;

    // 🔥 NPSE
    elinpse += Math.min(npse, Math.round(0.14 * totalSalary));

    // 🔥 Prof Tax
    elipf += pf;

    // 🔥 Paid months + TDS
    const month = String(r.month).toUpperCase();
    if (paidMonths.has(month)) {
      paidMonthCount++;
      totalTDS += Number(r['Net IT']) || 0;
    }
  });

  // 🔥 Caps
  ded80C = Math.min(150000, ded80C_raw);
  elipf = Math.min(2500, elipf);

  // 🔥 Disability
  let disabilityDeduction = 0;
  if (disabilityVal === '>80%') disabilityDeduction = 125000;
  else if (disabilityVal === '>40%') disabilityDeduction = 75000;

  // =========================
  // 🔥 TAX CALCULATION
  // =========================

  const stdDeduction = getITValue(selectedFY, regime, 'Standard Deduction');
  const rebateUpto = getITValue(selectedFY, regime, 'Rebate Upto');
  const rebate = getITValue(selectedFY, regime, 'Rebate');

  let taxableIncome = 0;

  if (regime === 'Old Regime') {
    // 🔥 HRA (simplified same as your logic)
    const totalSalary = BP + DA;
    const elihra = Math.min(HRA, Math.round(HRA_rate * totalSalary));

    taxableIncome = adjGrossTotal - stdDeduction - elihra - ded80C - elipf - elinpse - disabilityDeduction;
  } else {
    taxableIncome = adjGrossTotal - stdDeduction - elinpse;
  }

  taxableIncome = Math.max(0, taxableIncome);

  // 🔥 Slab
  const slabData = calculateTaxSlabs(selectedFY, regime, taxableIncome);

  let totalTax = slabData.total;

  // 🔥 Rebate
  let rebateApplied = 0;
  if (taxableIncome <= rebateUpto) {
    rebateApplied = Math.min(rebate, totalTax);
  }

  const finalTax = totalTax - rebateApplied;
  const cess = Math.round(finalTax * 0.04);
  const netTax = finalTax + cess;
  return {
    netTax,
    totalTDS,
    paidMonthCount
  };
}

async function exportITExcel(mode = 'single') {
  const workbook = new ExcelJS.Workbook();

  const wrapper = qs('.ITtableWrapper'); // ✅ FIXED
  const station = id('ITPage_Station')?.value;
  const selectedFY = id('ITPage_FY')?.value;
  const selectedEmp = id('ITPage_Emp')?.value;
  const empDropdown = id('ITPage_Emp');
  const selectedModeEl = qs("input[name='salaryMode']:checked");
  const salMode = selectedModeEl?.id === 'calcSalary' ? 'calculated' : 'paid';

  if (!selectedFY) return;

  if (mode === 'single' && !selectedEmp) return;

  const h = pbData.headers;
  const nameIndex = h.indexOf('Employee Name');
  const stationIndex = h.indexOf('Pay Drawn Station');
  const monthIndex = h.indexOf('Salary Month');
  const hrisIndex = h.indexOf('HRIS');
  window.houseRentMap = window.houseRentMap || {};

  // =========================
  // 🔥 HELPERS
  // =========================
  function isValidFill(bg) {
    if (!bg) return false;
    if (bg === 'transparent') return false;
    if (bg.includes('rgba') && bg.endsWith(', 0)')) return false;

    const m = bg.match(/\d+/g);
    if (!m || m.length < 3) return false;

    const [r, g, b] = m.map(Number);

    // ❌ skip black
    if (r === 0 && g === 0 && b === 0) return false;

    return true;
  }

  function rgbToARGB(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return null;

    const [r, g, b] = m.map(Number);

    // ❌ skip black
    if (r === 0 && g === 0 && b === 0) return null;

    return 'FF' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  function parseValue(text) {
    if (!text) return ' ';
    const clean = text.replace(/[,₹\s]/g, '');
    return !isNaN(clean) && clean !== '' ? Number(clean) : text;
  }

  function isMerged(sheet, row, col) {
    const cell = sheet.getCell(row, col);
    return !!cell.master && cell.master !== cell;
  }

  function getFontColor(color) {
    if (!color) return { argb: 'FF000000' }; // default black

    const match = color.match(/\d+/g);
    if (!match) return { argb: 'FF000000' };

    const [r, g, b] = match.map(Number);

    const toHex = (n) => n.toString(16).padStart(2, '0').toUpperCase();

    return {
      argb: 'FF' + toHex(r) + toHex(g) + toHex(b)
    };
  }

  function getEffectiveBackground(cell) {
    let bg = window.getComputedStyle(cell).backgroundColor;

    if (bg && bg !== 'transparent' && !bg.includes('rgba(0, 0, 0, 0)')) {
      return bg;
    }

    const tr = cell.closest('tr');
    if (tr) {
      bg = window.getComputedStyle(tr).backgroundColor;
      if (bg && bg !== 'transparent' && !bg.includes('rgba(0, 0, 0, 0)')) {
        return bg;
      }
    }

    const table = cell.closest('table');
    if (table) {
      bg = window.getComputedStyle(table).backgroundColor;
      if (bg && bg !== 'transparent' && !bg.includes('rgba(0, 0, 0, 0)')) {
        return bg;
      }
    }

    return null;
  }

  // 🔥 GET EFFECTIVE COLOR
  function getEffectiveColor(cell) {
    let el = cell;

    while (el && el !== document.body) {
      const color = window.getComputedStyle(el).color;

      const m = color?.match(/\d+/g);
      if (m && m.length >= 3) {
        const [r, g, b] = m.map(Number);

        // skip default black
        if (!(r === 0 && g === 0 && b === 0)) {
          return getFontColor(color);
        }
      }

      el = el.parentElement;
    }

    return { argb: 'FF000000' };
  }

  function isBold(cell) {
    // 1️⃣ check tags inside cell
    if (cell.querySelector('b, strong')) return true;

    // 2️⃣ check current + parent elements
    let el = cell;

    while (el && el !== document.body) {
      const fw = window.getComputedStyle(el).fontWeight;

      if (fw === 'bold' || parseInt(fw) >= 600) {
        return true;
      }

      el = el.parentElement;
    }

    return false;
  }

  // =========================
  // 🔥 UPDATED PROCESS FUNCTION
  // =========================
  function processITTable(sheet, table, startRow = 1, depth = 0) {
    let currentRow = startRow;

    const rows = table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr');

    rows.forEach((tr) => {
      const cells = tr.querySelectorAll(':scope > th, :scope > td');
      if (!cells.length) return;

      const nestedTables = tr.querySelectorAll(':scope > td > table');

      // =========================
      // 🔥 SIDE BY SIDE (OLD + NEW)
      // =========================
      if (nestedTables.length === 2) {
        let leftEnd = processITTable(sheet, nestedTables[0], currentRow, depth + 1);

        let rightEnd = processITTableSide(
          sheet,
          nestedTables[1],
          currentRow,
          8, // 🔥 start column for right table
          depth + 1
        );

        currentRow = Math.max(leftEnd, rightEnd);
        return;
      }

      // =========================
      // 🔥 SINGLE NESTED TABLE
      // =========================
      if (nestedTables.length === 1) {
        currentRow = processITTable(sheet, nestedTables[0], currentRow, depth + 1);
        return;
      }

      // =========================
      // 🔥 NORMAL ROW
      // =========================
      let colIndex = 1;
      const excelRow = sheet.getRow(currentRow);

      let hasValue = false;

      cells.forEach((cell) => {
        const text = cell.innerText.trim();
        if (text) hasValue = true;

        const cs = window.getComputedStyle(cell);
        const colSpan = cell.colSpan || 1;

        const excelCell = excelRow.getCell(colIndex);

        const clean = text.replace(/[,₹\s]/g, '');
        excelCell.value = !isNaN(clean) && clean !== '' ? Number(clean) : text;

        excelCell.font = {
          name: 'Calibri',
          size: 11,
          bold: isBold(cell), // 🔥 FINAL FIX
          color: getEffectiveColor(cell)
        };

        excelCell.alignment = {
          horizontal: cs.textAlign || 'left',
          vertical: 'middle',
          wrapText: true
        };

        const startCol = colIndex;
        const endCol = colIndex + colSpan - 1;

        // 🔥 LEFT PADDING (OLD + NEW FIRST COLUMN)
        if (startCol === 1 || startCol === 8) {
          excelCell.alignment.indent = 1;
        }

        // 🔥 RIGHT PADDING (OLD + NEW LAST COLUMN)
        if (endCol === 7 || endCol === 14) {
          if (typeof excelCell.value === 'string') {
            excelCell.value = excelCell.value + '  ';
          }
        }

        // 🔥 BACKGROUND FIX
        const bg = getEffectiveBackground(cell);

        const trParent = cell.closest('tr');
        if (!bg || bg === 'transparent') {
          bg = window.getComputedStyle(trParent).backgroundColor;
        }

        if (bg && bg !== 'transparent') {
          const argb = rgbToARGB(bg);
          if (argb) {
            excelCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb }
            };
          }
        }

        // 🔥 BORDER
        excelCell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };

        // 🔥 SAFE MERGE
        if (colSpan > 1) {
          try {
            sheet.mergeCells(currentRow, colIndex, currentRow, colIndex + colSpan - 1);
          } catch (e) {}
        }

        colIndex += colSpan;
      });

      if (hasValue) {
        excelRow.commit();
        currentRow++;
      }
    });

    return currentRow;
  }

  function processITTableSide(sheet, table, startRow, startCol = 8, depth = 0) {
    let currentRow = startRow;

    const rows = table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr');

    rows.forEach((tr) => {
      const cells = tr.querySelectorAll(':scope > th, :scope > td');
      if (!cells.length) return;

      let colIndex = startCol;
      const excelRow = sheet.getRow(currentRow);

      let hasValue = false;

      cells.forEach((cell) => {
        const text = cell.innerText.trim();
        if (text) hasValue = true;

        const cs = window.getComputedStyle(cell);
        const colSpan = cell.colSpan || 1;

        const excelCell = excelRow.getCell(colIndex);

        const clean = text.replace(/[,₹\s]/g, '');
        excelCell.value = !isNaN(clean) && clean !== '' ? Number(clean) : text;

        excelCell.font = {
          name: 'Calibri',
          size: 11,
          bold: isBold(cell), // 🔥 FINAL FIX
          color: getEffectiveColor(cell)
        };

        excelCell.alignment = {
          horizontal: cs.textAlign || 'left',
          vertical: 'middle',
          wrapText: true
        };

        // 🔥 COLUMN RANGE CALCULATION
        const startCol = colIndex;
        const endCol = colIndex + colSpan - 1;

        // 🔥 LEFT PADDING (NEW TABLE FIRST COLUMN)
        if (startCol === 8) {
          excelCell.alignment.indent = 1;
        }

        // 🔥 RIGHT PADDING (NEW TABLE LAST COLUMN)
        if (endCol === 14) {
          if (typeof excelCell.value === 'string') {
            excelCell.value = excelCell.value + '  ';
          }
        }

        // 🔥 BACKGROUND
        const bg = getEffectiveBackground(cell);
        const trParent = cell.closest('tr');

        if (!bg || bg === 'transparent') {
          bg = window.getComputedStyle(trParent).backgroundColor;
        }

        if (bg && bg !== 'transparent') {
          const argb = rgbToARGB(bg);
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

        // 🔥 SAFE MERGE
        if (colSpan > 1) {
          try {
            sheet.mergeCells(currentRow, colIndex, currentRow, colIndex + colSpan - 1);
          } catch (e) {}
        }

        colIndex += colSpan;
      });

      if (hasValue) {
        excelRow.commit();
        currentRow++;
      }
    });

    return currentRow;
  }

  // =========================
  // 🔥 EMPLOYEE LIST
  // =========================
  let employees = [];

  if (mode === 'single') {
    employees = [selectedEmp];
  } else {
    employees = [...new Set(pbData.rows.filter((r) => String(r[stationIndex]).trim() === station).map((r) => String(r[hrisIndex]).trim()))];
  }

  // =========================
  // 🔁 LOOP
  // =========================

  const empHRIS = selectedEmp;

  const empRow = pbData.rows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim());

  const empName = empRow ? String(empRow[nameIndex]).trim() : String(empHRIS).trim();

  const fileName = mode === 'single' ? `${empName}(${empHRIS})-${station}-FY-${selectedFY}-IT Calculation.xlsx` : `${station}-FY-${selectedFY}-IT Calculations.xlsx`;

  for (const empHRIS of employees) {
    const wrapper = qs('.ITtableWrapper');
    if (!wrapper) continue;

    // 🔥 RENDER (needed for calculation)
    renderCalculatedITTable(empHRIS, selectedFY, salMode);

    if (mode === 'all') {
      wrapper.style.opacity = '0'; // 🔥
      id('ITInfoPanel')
        .querySelectorAll('span')
        .forEach((el) => {
          el.textContent = '0';
        });
      id('ITInfoPanel')
        .querySelectorAll('.itPanelDiv')
        .forEach((el) => {
          el.style.background = 'rgba(43, 82, 145)';
        });
    }

    // 🔥 RESTORE INPUT VALUE AFTER RENDER
    const rentValue = window.houseRentMap?.[empHRIS] || '';

    const rentInput = wrapper.querySelector('#rentInput');
    if (rentInput) {
      rentInput.value = rentValue;
    }

    const emp = getEmployee(empHRIS);

    const empName = emp ? emp[window.empCalcHeaders.indexOf('Employee Name')] : empHRIS;

    const sheet = workbook.addWorksheet(mode === 'single' ? 'IT Calculation' : String(empName).substring(0, 25));

    // =========================
    // 🔥 ADD HEADER TEXT
    // =========================
    function getHeaderData() {
      return {
        lines: ['PRASAR BHARATI', "INDIA'S PUBLIC SERVICE BROADCASTER", 'ALL INDIA RADIO', `${station}`],
        logo: 'https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l'
      };
    }
    const header = getHeaderData();

    // ✅ Merge
    sheet.mergeCells('A1:N1');

    const cell = sheet.getCell('A1');

    cell.value = {
      richText: header.lines.map((line, i) => ({
        text: line + (i !== header.lines.length - 1 ? '\n' : ''),
        font: { bold: true, size: 12 } // ✅ FIXED
      }))
    };

    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    // 🔥 ROW HEIGHT
    sheet.getRow(1).height = 65;

    // =========================
    // 🔥 ADD LOGO
    // =========================
    const base64 = await urlToBase64(header.logo);

    const imageId = workbook.addImage({
      base64,
      extension: 'png'
    });

    sheet.addImage(imageId, {
      tl: { col: 0.2, row: 0.2 },
      ext: { width: 65, height: 65 }
    });
    // 🔥 PROCESS ALL TABLES INSIDE WRAPPER

    const tables = [wrapper.querySelector('table')];

    let currentRow = 2;

    tables.forEach((tbl, index) => {
      currentRow = processITTable(sheet, tbl, currentRow);
    });

    const lastRow = currentRow - 1;

    // =========================
    // 🔧 SHEET SETTINGS
    // =========================
    sheet.views = [{ showGridLines: false }];

    sheet.columns = [{ width: 15 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }];

    sheet.pageSetup = {
      paperSize: 9, // 🔥 A4
      orientation: 'landscape',
      //scale: 100,
      horizontalCentered: true,
      verticalCentered: false,
      fitToPage: true,
      fitToWidth: 1,
      //fitToHeight: false,
      fitToHeight: 999,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3
      },
      printArea: `A1:N${lastRow}`
    };

    sheet.headerFooter = {
      differentFirst: false,
      differentOddEven: false,

      // 🔹 HEADER (LEFT, SMALL, ITALIC, GRAY)
      oddHeader: '&L&K808080&"Calibri,Italic"&10' + fileName.replace('.xlsx', ''),

      // 🔹 FOOTER
      oddFooter: '&CPage &P of &N' + '&R&K808080Generated on ' + new Date().toLocaleDateString('en-GB')
    };
  }

  // =========================
  // 📥 DOWNLOAD
  // =========================
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);

  // =========================
  // 🔥 RESET UI AFTER ALL MODE
  // =========================
  if (mode === 'all') {
    if (empDropdown) {
      empDropdown.selectedIndex = -1; // 🔥 clears selection
      empDropdown.value = ''; // extra safety
    }

    if (wrapper) {
      id('ITInfoPanel')
        .querySelectorAll('span')
        .forEach((el) => {
          el.textContent = '0';
        });

      id('ITInfoPanel')
        .querySelectorAll('.itPanelDiv')
        .forEach((el) => {
          el.style.background = 'rgba(0, 196, 7)';
        });
      wrapper.innerHTML = ''; // 🔥 clear table UI
    }
    wrapper.style.opacity = '1';
  }
}

async function urlToBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

function removeNumberFormatting(root) {
  root.querySelectorAll('td, th').forEach((cell) => {
    // 🔥 1. SKIP KATEX CELLS COMPLETELY
    if (cell.querySelector('.katex')) return;

    // 🔥 2. HANDLE BOLD ELEMENTS SAFELY
    const boldEl = cell.querySelector('b, strong');

    if (boldEl) {
      let text = boldEl.textContent;

      const clean = text.replace(/[₹,]/g, '').trim();

      if (!isNaN(clean) && clean !== '') {
        boldEl.textContent = clean;
      } else {
        boldEl.textContent = text.replace(/[₹,]/g, '');
      }

      return;
    }

    // 🔥 3. CLEAN ONLY TEXT NODES (NOT HTML)
    cell.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;

        const clean = text.replace(/[₹,]/g, '').trim();

        if (!isNaN(clean) && clean !== '') {
          node.textContent = clean;
        } else {
          node.textContent = text.replace(/[₹,]/g, '');
        }
      }
    });
  });
}

function restoreNumberFormatting(root) {
  const cells = root.querySelectorAll('td, th');

  cells.forEach((cell) => {
    if (cell.dataset.originalValue !== undefined) {
      cell.innerText = cell.dataset.originalValue;
    }
  });
}

async function buildITHTML(mode = 'single') {
  const wrapper = qs('.ITtableWrapper');
  // 🔥 REMOVE FORMATTING
  //removeNumberFormatting(wrapper);
  const station = id('ITPage_Station')?.value;
  const selectedFY = id('ITPage_FY')?.value;
  const selectedEmp = id('ITPage_Emp')?.value;
  const empDropdown = id('ITPage_Emp');
  const selectedModeEl = qs("input[name='salaryMode']:checked");
  const salMode = selectedModeEl?.id === 'calcSalary' ? 'calculated' : 'paid';

  if (!wrapper || !selectedFY) return '';

  const h = pbData.headers;
  const nameIndex = h.indexOf('Employee Name');
  const stationIndex = h.indexOf('Pay Drawn Station');
  const hrisIndex = h.indexOf('HRIS');

  // =========================
  // 🔥 EMPLOYEE LIST
  // =========================
  let employees = [];

  if (mode === 'single') {
    if (!selectedEmp) return '';
    employees = [selectedEmp];
  } else {
    employees = [...new Set(pbData.rows.filter((r) => String(r[stationIndex]).trim() === station).map((r) => String(r[hrisIndex]).trim()))];

    if (!employees.length) {
      showCustomAlert('🚫 No employees found');
      return '';
    }
  }

  // =========================
  // 🔥 CREATE DOCUMENT
  // =========================
  const doc = document.implementation.createHTMLDocument('IT Calculation');

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
                  size: A4 potrait;
                  margin-top: 5mm;
                  margin-right: 5mm;
                  margin-left: 5mm;
                  margin-bottom: 20mm; /* 🔥 increase bottom */
                }
                body {
                  margin: 0;
                  background: white;
                  font-size: 9px !important;
                }

                .page {
                  margin: 0 auto;
                  page-break-after: always;
                  padding-right: 2mm;
                  background: white !important;
                }

                .page:last-child {
                  page-break-after: auto;
                }

                .page * {
                  overflow: visible !important;
                  max-height: none !important;
                  height: auto !important;
                  font-size:9px !important;
                }

                input{
                  background:white;
                  border:none;
                  outline:none;
                  width:80px;
                  padding:0;
                  height:max-content;
                }

                img {
                  display:block;
                  max-width: 60px !important;
                  max-height: 60px !important;
                  display: inline-block !important;
                }

                tr {
                  page-break-inside: avoid;
                }

                td, th {

                  padding:3px !important;
                  height:20px;
                }

                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  opacity: 1 !important;
                }

                .rowITregimeHeader {
                  height:30px !important;
                  min-height:30px !important;
                  padding:10px !important;
                }
              `;

  doc.head.appendChild(style);

  // =========================
  // 🔧 COPY INPUT VALUES
  // =========================
  function copyInputValues(source, target) {
    const src = source.querySelectorAll('input, textarea, select');
    const tgt = target.querySelectorAll('input, textarea, select');

    src.forEach((input, i) => {
      const clone = tgt[i];
      if (!clone) return;

      if (input.type === 'checkbox' || input.type === 'radio') {
        clone.checked = input.checked;
      } else {
        clone.value = input.value;
      }
    });
  }

  // =========================
  // 🔧 SYNC INPUT VALUES
  // =========================
  function syncInputs(wrapper) {
    wrapper.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.tagName === 'SELECT') {
        [...el.options].forEach((opt) => (opt.selected = opt.value === el.value));
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) el.setAttribute('checked', 'checked');
        else el.removeAttribute('checked');
      } else {
        el.setAttribute('value', el.value);
      }
    });
  }

  // =========================
  // 🔁 LOOP EMPLOYEES (FIXED)
  // =========================

  for (const empHRIS of employees) {
    if (empDropdown) {
      empDropdown.value = empHRIS;
    }

    // 🔥 RENDER DIRECTLY
    renderCalculatedITTable(empHRIS, selectedFY, salMode);

    if (mode === 'all') {
      wrapper.style.opacity = '0'; // 🔥
      id('ITInfoPanel')
        .querySelectorAll('span')
        .forEach((el) => {
          el.textContent = '0';
        });
      id('ITInfoPanel')
        .querySelectorAll('.itPanelDiv')
        .forEach((el) => {
          el.style.background = 'rgba(0, 196, 7)';
        });
    }

    // 🔥 WAIT FOR DOM + CALCULATION
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    const liveWrapper = qs('.ITtableWrapper');
    if (!liveWrapper) continue;

    // 🔥 SYNC INPUT VALUES
    syncInputs(liveWrapper);

    // 🔥 SNAPSHOT
    const temp = document.createElement('div');
    temp.innerHTML = liveWrapper.outerHTML;
    const clone = temp.firstElementChild;

    // =========================
    // 🔥 CONVERT INPUTS TO TEXT
    // =========================
    clone.querySelectorAll('input, select, textarea').forEach((inp) => {
      const span = document.createElement('span');

      if (inp.type === 'checkbox') {
        span.textContent = inp.checked ? '✔' : '';
      } else {
        let val = inp.value || '';

        if (!isNaN(val.replace(/[,₹\s]/g, ''))) {
          val = val.replace(/[,₹\s]/g, '');
        }

        span.textContent = val;
      }

      inp.replaceWith(span);
    });

    removeNumberFormatting(clone);

    // =========================
    // 🔥 TABLE FIX
    // =========================
    clone.querySelectorAll('table').forEach((tbl) => {
      tbl.style.width = '100%';
      tbl.style.borderCollapse = 'collapse';
    });

    // =========================
    // 🔥 KATEX FIX
    // =========================
    clone.querySelectorAll('.katex').forEach((el) => {
      el.style.display = 'inline-block';
      el.style.whiteSpace = 'nowrap';
    });

    // =========================
    // 🔥 CLEANUP
    // =========================
    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

    // =========================
    // 🔥 CREATE PAGE
    // =========================
    const page = doc.createElement('div');
    page.className = 'page';

    const header = buildPrintHeader(doc, station);
    header.classList.add('print-header');

    page.appendChild(header);
    page.appendChild(clone);

    doc.body.appendChild(page);
  }

  // =========================
  // 🔥 RESET UI AFTER ALL MODE
  // =========================
  if (mode === 'all') {
    if (empDropdown) {
      empDropdown.selectedIndex = -1; // 🔥 clears selection
      empDropdown.value = ''; // extra safety
    }

    if (wrapper) {
      id('ITInfoPanel')
        .querySelectorAll('span')
        .forEach((el) => {
          el.textContent = '0';
        });
      id('ITInfoPanel')
        .querySelectorAll('.itPanelDiv')
        .forEach((el) => {
          el.style.background = 'rgba(0, 196, 7)';
        });
      wrapper.innerHTML = ''; // 🔥 clear table UI
    }
    wrapper.style.opacity = '1';
  }

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

function updateITPrintMenuState() {
  const hasEmp = id('ITPage_Emp')?.value;
  const hasFY = id('ITPage_FY')?.value;

  const printIT = id('itPrintOption');
  const excelIT = id('itExcelOption');

  [printIT, excelIT].forEach((opt) => {
    if (!opt) return;

    if (hasEmp && hasFY) {
      opt.classList.remove('disabled');
    } else {
      opt.classList.add('disabled');
    }
  });
}

const itmenu = id('ITprintMenu');
const itprintBtn = id('ITprintBtn');
const itexcelBtn = id('ITexcelBtn');

// 🔹 PRINT BUTTON
itprintBtn.addEventListener('click', (e) => {
  e.stopPropagation();

  updateITPrintMenuState();

  qsa('.print-option').forEach((el) => (el.style.display = 'block'));
  qsa('.excel-option').forEach((el) => (el.style.display = 'none'));

  itmenu.classList.add('show'); // ✅ ALWAYS OPEN
});

// 🔹 EXCEL BUTTON
itexcelBtn.addEventListener('click', (e) => {
  e.stopPropagation();

  updateITPrintMenuState();

  qsa('.print-option').forEach((el) => (el.style.display = 'none'));
  qsa('.excel-option').forEach((el) => (el.style.display = 'block'));

  itmenu.classList.add('show'); // ✅ ALWAYS OPEN
});

document.addEventListener('click', () => {
  itmenu.classList.remove('show');
});

on('salaryMode', 'change', () => {
  const empHRIS = id('ITPage_Emp')?.value;
  const selectedFY = id('ITPage_FY')?.value;

  const wrapper = qs('.ITtableWrapper');

  if (wrapper) {
    wrapper.innerHTML = 'Loading...';
  }

  // =========================
  // 🔥 CHECKBOX MODE
  // =========================
  const mode = id('salaryMode')?.checked ? 'paid' : 'calculated';

  renderCalculatedITTable(empHRIS, selectedFY, mode);
});

qsa('.menu-option').forEach((opt) => {
  opt.addEventListener('click', async function () {
    const type = this.dataset.type;
    const wrapper = qs('.ITtableWrapper');

    itmenu.classList.remove('show');

    // =====SALARY SLIP PRINT =====
    if (type === 'pdf-singleIT') {
      const html = await buildITHTML('single'); // ✅ FIX
      openPrintWindow(html);
      restoreNumberFormatting(wrapper);
    }

    // ===== ALL SALARY SLIP PRINT =====
    if (type === 'pdf-allIT') {
      const html = await buildITHTML('all'); // ✅ FIX
      openPrintWindow(html);
      restoreNumberFormatting(wrapper);
    }

    // ===== SALARY SLIP EXCEL ✅ FIXED =====
    if (type === 'excel-singleIT') {
      exportITExcel('single');
    }

    // ===== ALL SALARY SLIP EXCEL =====
    if (type === 'excel-allIT') {
      exportITExcel('all');
    }
  });
});
