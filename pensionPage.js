//================================================================================//
//                🔥🔥🔥🔥🔥PENSION PAGE SCRIPT🔥🔥🔥🔥🔥
//=============================================================================//

const pensionSelect = id('PensionFor');
const checkbox = id('CommutationOpted');
const commutationSelect = id('CommutationOption');
const dateInput = id('VRS_Death_Date');

function loadCommutationOptions() {
  for (let i = 1; i <= 40; i++) {
    const option = document.createElement('option');
    option.value = i; // value = 1…40
    option.textContent = i + '%'; // text = 1%…40%

    if (i === 40) {
      option.selected = true; // default selected
    }

    commutationSelect.appendChild(option);
  }

  //select.innerHTML = Array.from({ length: 40 }, (_, i) =>
  //  `<option value="${i+1}" ${i+1 === 40 ? "selected" : ""}>${i+1}%</option>`
  //).join('');
}

// 🔹 Listen for change
function updatePensionUI() {
  const empHRIS = id('PensionPage_Emp').value;
  const val = pensionSelect.value;

  const empHead = window.empCalcHeaders;
  const empRows = window.empCalcRows;

  const nameIndex = empHead.indexOf('Employee Name');
  const dorIndex = empHead.indexOf('Superannuation');
  const serviceIndex = empHead.indexOf('Status');
  const vrsIndex = empHead.indexOf('VRS / Deceased Date');
  const hrisIndex = empHead.indexOf('HRIS');

  const empRow = empRows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim());
  if (!empRow) return;

  const dor = empRow[dorIndex] || '';
  const vrs = empRow[vrsIndex] || '';
  const serviceType = empRow[serviceIndex];

  // =========================
  // 🔥 RESET ON EMPLOYEE CHANGE
  // =========================
  const prevEmp = dateInput.dataset.prevEmp;

  if (prevEmp !== empHRIS) {
    dateInput.value = '';
    dateInput.dataset.prevEmp = empHRIS;
  }

  // =========================
  // 🔥 RESET ON TYPE CHANGE
  // =========================
  if (dateInput.dataset.prevType !== val) {
    dateInput.value = '';
    dateInput.dataset.prevType = val;
  }

  // =========================
  // ✅ Rule 1: Commutation
  // =========================
  if (val === 'Superannuation' || val === 'VRS' || val === 'FamPen_afterService') {
    checkbox.disabled = false;

    // 🔥 only set default ONCE (not every time)
    if (checkbox.dataset.initialized !== val) {
      checkbox.checked = val === 'Superannuation' || val === 'VRS' || val === 'FamPen_afterService';
      checkbox.dataset.initialized = val;
    }
  } else {
    checkbox.checked = false;
    checkbox.disabled = true;
  }

  commutationSelect.disabled = !checkbox.checked;

  // =========================
  // ✅ Rule 2: Date behavior
  // =========================

  const isLocked = val === 'Superannuation' || val === 'FamPen_afterService';

  dateInput.disabled = isLocked;

  // 🔥 CASE 1: Locked → always DOR
  if (isLocked) {
    dateInput.value = formatToInputDate(dor);
  }

  // 🔥 CASE 2: Editable → smart fill
  else {
    if (!dateInput.value) {
      // ✅ Priority 1: DB value (VRS / Deceased)
      if ((serviceType === 'VRS' || serviceType === 'Deceased') && vrs) {
        dateInput.value = formatToInputDate(vrs);
      }

      // ✅ Priority 2: VRS / In-service → today
      else if (val === 'VRS' || val === 'FamPen_inService') {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    }
  }

  // =========================
  // 💡 Optional: prevent future dates beyond DOR
  // =========================
  if (dor) {
    dateInput.max = formatToInputDate(dor);
  }
}

function buildEmolumentHTML(data) {
  let total = 0;

  // 🔹 Rows
  let monthRow = '<tr><td>Month</td>';
  let basicRow = '<tr><td>Basic Pay</td>';
  //let indexRow = "<tr><th>Index</th>";

  data.forEach((r) => {
    const val = Number(r.basic) || 0;
    total += val;

    monthRow += `<td>${r.month}</td>`;
    basicRow += `<td>${formatCurrency(val)}</td>`;
    //indexRow += `<td>${r.index}</td>`;
  });

  // 🔹 Add TOTAL as last column
  monthRow += `<td style="font-weight:bold;background:#fef3c7;">Total</td></tr>`;
  basicRow += `<td style="font-weight:bold;background:#fef3c7;">${formatCurrency(total)}</td></tr>`;
  //indexRow += `<td></td></tr>`; // empty cell under Total

  let html = `
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center;border:solid 1px lightgray">
            <colgroup>
              <col style="width:10%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:8%">
              <col style="width:10%">
            </colgroup>
            <thead>
              <tr>
                <th colspan="${data.length + 2}" style="text-align:center">
                  Last 10 Month Emolument
                </th>
              </tr>
            </thead>
            <tbody>
              ${monthRow}
              ${basicRow}
            </tbody>
          </table>
        `;

  return html;
}

function getPBAsOnDate(empHRIS, targetDate) {
  const headers = pbData.headers;
  const rows = pbData.rows;

  const empIdx = headers.indexOf('Employee Name');
  const monthIdx = headers.indexOf('Salary Month');
  const hrisIdx = headers.indexOf('HRIS');

  // ✅ FIX: normalize targetDate
  if (targetDate && !(targetDate instanceof Date)) {
    targetDate = new Date(targetDate);
  }

  const targetTime = targetDate ? targetDate.getTime() : null;

  let bestRow = null;

  rows.forEach((r) => {
    if (String(r[hrisIdx]).trim() !== String(empHRIS).trim()) return;

    const monthTime = DateUtil.toTime(r[monthIdx]);

    if (!targetTime || monthTime <= targetTime) {
      if (!bestRow || monthTime > DateUtil.toTime(bestRow[monthIdx])) {
        bestRow = r;
      }
    }
  });

  return bestRow;
}

function getEffectiveEndDate(empRow, inputDate) {
  const empHead = window.empCalcHeaders;

  const dorIndex = empHead.indexOf('Superannuation');
  const dorStr = empRow[dorIndex];

  // convert both to Date
  const dorDate = new Date(formatToInputDate(dorStr));
  const input = inputDate ? new Date(inputDate) : null;

  // 🔥 if no input → use DOR
  if (!input) return dorDate;

  // 🔥 return MIN(input, DOR)
  return input > dorDate ? dorDate : input;
}

function calcAgeNextBirthday(dobStr, targetDateStr) {
  const dob = DateUtil.parseDate(dobStr);
  const target = targetDateStr ? new Date(targetDateStr) : new Date();

  if (!dob || !target) return '';

  let age = target.getFullYear() - dob.getFullYear();

  // Birthday this year
  let nextBirthday = new Date(target.getFullYear(), dob.getMonth(), dob.getDate());

  // If birthday already passed → next birthday is next year
  if (target >= nextBirthday) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  }

  return nextBirthday.getFullYear() - dob.getFullYear();
}

function getCommutationFactor(ageNextBirthday) {
  if (!commData || !commData.headers || !commData.rows) return 0;

  const rows = commData.rows;

  // assuming:
  // col 0 = Age
  // col 1 = Commutation Value

  const ageIdx = 0;
  const valueIdx = 1;

  const row = rows.find((r) => Number(r[ageIdx]) === Number(ageNextBirthday));

  return row ? Number(row[valueIdx]) : 0;
}

function calculatePensionDates(dob, lastWorkingDate, pensionType) {
  if (!dob || !lastWorkingDate) return {};

  const lwDate = new Date(lastWorkingDate);
  const birthDate = new Date(dob);

  let enhancedTo = null;
  let reducedFrom = null;

  // =========================
  // 🔹 IN SERVICE
  // =========================
  if (pensionType === 'FamPen_inService') {
    enhancedTo = new Date(lwDate);
    enhancedTo.setFullYear(enhancedTo.getFullYear() + 10);
  }

  // =========================
  // 🔹 AFTER SERVICE
  // =========================
  else if (pensionType === 'FamPen_afterService') {
    // 7 years from last working date
    const plus7 = new Date(lwDate);
    plus7.setFullYear(plus7.getFullYear() + 7);

    // age 67 date
    const age67 = new Date(birthDate);
    age67.setFullYear(age67.getFullYear() + 67);

    // earlier of two
    enhancedTo = plus7 < age67 ? plus7 : age67;
  }

  // =========================
  // 🔹 REDUCED FROM = next day
  // =========================
  if (enhancedTo) {
    reducedFrom = new Date(enhancedTo);
    reducedFrom.setDate(reducedFrom.getDate() + 1);
  }

  return {
    enhancedTo,
    reducedFrom
  };
}

function formatDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
}

function togglePensionSections(sixMonthly, pensionType) {
  const get = (cls) => qsa(`.${cls}`);
  const set = (rows, visible) => rows.forEach((r) => (r.style.display = visible ? '' : 'none'));

  const sup = get('supPensionRows');
  const enh = get('enhPensionRows');
  const red = get('redPensionRows');
  const comm = get('CommuteRows');
  const grat = get('gratuityRows');
  const ben = get('BenificialRows');

  const isCommChecked = id('CommutationOpted')?.checked;

  // 🔥 USE YOUR MAP
  const deptMap = getDeptMap();
  const empHRIS = id('PensionPage_Emp')?.value;
  const dept = deptMap[empHRIS] || '';

  // =========================
  // 🔹 RULE 0: Non-GO
  // =========================
  if (dept !== 'GO') {
    [sup, enh, red, comm, ben].forEach((r) => set(r, false));
    set(grat, true);

    return;
  }

  // =========================
  // 🔹 REST OF YOUR LOGIC (unchanged)
  // =========================
  if (sixMonthly < 20) {
    [sup, enh, red, comm, ben].forEach((r) => set(r, false));
  } else {
    [sup, enh, red, comm, ben].forEach((r) => set(r, true));

    if (['Superannuation', 'VRS'].includes(pensionType)) {
      set(enh, false);
      set(red, false);
    }

    if (pensionType === 'FamPen_inService') {
      set(sup, false);
      set(comm, false);
      set(ben, false);
    }
  }

  set(grat, sixMonthly >= 10);

  if (!isCommChecked) {
    set(comm, false);
    set(ben, false);
  }
}

function getPensionRemarks(sixMonthly, pensionType, isCommChecked) {
  const empHRIS = id('PensionPage_Emp')?.value;
  const dept = (window.deptMapCache || getDeptMap())[empHRIS] || '';

  let r = empty();

  // 🔥 ADD THIS
  const dates = calculatePensionDates(); // your existing function

  // =========================
  // 🔴 RULE 0: Non-GO → EMPTY
  // =========================
  const npsMsg = '(Not Applicable under NPS Rule)';

  if (dept !== 'GO') {
    ['sup', 'enh', 'red', 'commute', 'ben'].forEach((k) => {
      r[k] = npsMsg;
    });

    // 🔥 IMPORTANT → return EMPTY dates
    return {
      remarks: r,
      dates: {
        enhancedTo: '',
        reducedFrom: ''
      }
    };
  }

  // =========================
  // 🔴 < 5 years → ONLY gratuity
  // =========================
  if (sixMonthly < 10) {
    r.grat = '(Not Eligible since Service < 5 Years)';
  }

  // =========================
  // 🔴 < 7 years → ONLY enhanced & reduced
  // =========================
  if (sixMonthly < 14) {
    r.enh = '(Not Eligible since Service < 7 Years)';
    r.red = '(Not Eligible since Service < 7 Years)';
  }

  // =========================
  // 🔴 < 10 years → all pension sections
  // =========================
  if (sixMonthly < 20) {
    r.sup = '(Not Eligible since Service < 10 Years)';
    r.enh = r.enh || '(Not Eligible since Service < 10 Years)';
    r.red = r.red || '(Not Eligible since Service < 10 Years)';
    r.commute = '(Not Eligible since Service < 10 Years)';
    r.ben = '(Not Eligible since Service < 10 Years)';
    return { remarks: r, dates }; // 🔥 return both
  }

  // =========================
  // 🔹 PENSION TYPE RULES
  // =========================

  if (['Superannuation', 'VRS'].includes(pensionType)) {
    r.enh = '(Not Applicable)';
    r.red = '(Not Applicable)';
  }

  if (pensionType === 'FamPen_inService') {
    r.sup = '(Not Applicable)';
    r.commute = '(Not Applicable)';
    r.ben = '(Not Applicable)';
  }

  // =========================
  // 🔹 COMMUTATION
  // =========================
  if (!isCommChecked && pensionType !== 'FamPen_inService') {
    r.commute = '(Not Opted)';
    r.ben = '(Not Applicable)';
  }

  return { remarks: r, dates }; // 🔥 return both

  function empty() {
    return {
      sup: '',
      enh: '',
      red: '',
      commute: '',
      ben: '',
      grat: ''
    };
  }
}

function renderPensionTable(empHRIS) {
  const wrapper = qs('.PensionTableWrapper');
  if (!wrapper) return;

  wrapper.innerHTML = '';

  const empHead = window.empCalcHeaders;
  const empRows = window.empCalcRows;

  const nameIndex = empHead.indexOf('Employee Name');
  const panIndex = empHead.indexOf('PAN');
  const dobIndex = empHead.indexOf('DOB');
  const dojIndex = empHead.indexOf('DOJ');
  const dorIndex = empHead.indexOf('Superannuation');
  const basicIndex = empHead.indexOf('Last Drawn Basic Pay');
  const hrisIndex = empHead.indexOf('HRIS');

  const deptMap = window.deptMapCache || getDeptMap();
  const dept = deptMap[empHRIS] || '';
  const isNonGO = dept !== 'GO';

  const empRow = empRows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim());
  if (!empRow) return;
  const empName = empRow[nameIndex] || '';

  const pan = empRow[panIndex] || '';
  const dob = empRow[dobIndex] || '';
  const doj = empRow[dojIndex] || '';
  const dor = empRow[dorIndex] || '';

  const rawDate = dateInput.value || null;
  const effectiveLastDate = getEffectiveEndDate(empRow, rawDate);

  const totService = calcService(doj, effectiveLastDate);
  const calcSixMonthly = calcSixMonth(doj, effectiveLastDate);
  const sixMonthly = Math.min(66, calcSixMonthly);

  let cappedsixMonthly = calcSixMonthly > 66 ? ' ≈ Capped to 66 from ' + calcSixMonthly : '';

  const lastPayDB = empRow[basicIndex] || 0;

  const pensionType = id('PensionFor').value;
  const pensionTypetext = id('PensionFor').selectedOptions[0].text;

  const EL = Number(id('PensionEL')?.value || 0);
  const HPL = Number(id('PensionHPL')?.value || 0);

  const commutationChecked = id('CommutationOpted').checked;
  const commutationPercent = commutationChecked ? Number(id('CommutationOption').value) : 0;

  // =========================
  // 🔥 PB Selection
  // =========================
  let pb;

  if (pensionType === 'VRS' || pensionType === 'FamPen_inService') {
    pb = getPBAsOnDate(empHRIS, effectiveLastDate);
  } else {
    const latest = getLatestPBMap();
    pb = latest[empHRIS];
  }

  // =========================
  // 🔥 Emolument
  // =========================
  let emolData = pb ? calcLast10MonthsEmoluments(pb, effectiveLastDate, 'table') : [];

  const totalEmol = emolData.reduce((sum, r) => sum + (Number(r.basic) || 0), 0);

  const avgEmol = totalEmol / 10;

  // =========================
  // 🔥 Basic Pay Logic
  // =========================
  let lastPay = lastPayDB;

  if (pensionType === 'Superannuation' || pensionType === 'FamPen_afterService') {
    if (emolData.length > 0) {
      lastPay = emolData[0].basic;
    }
  } else {
    const headers = pbData.headers;
    const basicIdx = headers.indexOf('Basic Pay');

    let pbRow = getPBAsOnDate(empHRIS, effectiveLastDate);

    if (pbRow) {
      lastPay = pbRow[basicIdx];
    } else if (emolData.length > 0) {
      lastPay = emolData[0].basic;
    }
  }

  // =========================
  // 🔥 DA (FIXED)
  // =========================
  const headers = pbData.headers;
  const daIdx = pbData.headers.indexOf('DA%');

  const lastRowWithDA = [...pbData.rows].reverse().find((r) => Number(r[daIdx]) > 0);

  const lastDA = lastRowWithDA ? Number(lastRowWithDA[daIdx]) : 0;

  const daValue = Math.round((Number(lastPay) * lastDA) / 100);

  // =========================
  // 🔥 CALCULATIONS
  // =========================
  let ELencash = 0;
  let HPLencash = 0;

  // 🔹 EL Encashment (max 300)
  const ELused = Math.min(300, EL);
  let ELspan = '';
  if (EL > 300) {
    ELspan = '≈ Capped to max limit 300';
  } else {
    ELspan = '';
  }

  ELencash = Math.round(((Number(lastPay) + Number(daValue)) * ELused) / 30);

  // 🔹 HPL allowed calculation
  const maxHPLAllowed = Math.min(240, Math.max(0, 300 - ELused));
  let HPLspan = '';
  if (300 - ELused > 240) {
    HPLspan = '≈ Capped to max limit 240';
  } else {
    HPLspan = '';
  }

  // 🔹 Actual HPL to use
  const HPLused = Math.min(HPL, maxHPLAllowed);

  // 🔹 HPL Encashment (half pay)
  const hplLastPay = lastPay / 2;
  const hpldaValue = daValue / 2;
  HPLencash = Math.round(((Number(hplLastPay) + Number(hpldaValue)) * HPLused) / 30);
  const totLeaveEncash = Number(ELencash) + Number(HPLencash);
  id('PanelLeaveEncash').innerHTML = formatCurrency(totLeaveEncash);

  // =========================
  // 🔥 GRATUITY CALCULATION + FORMULA
  // =========================

  let GratuityLimit = 0;
  if (lastDA >= 50) {
    GratuityLimit = 2500000;
  } else if (lastDA < 50) {
    GratuityLimit = 2000000;
  }

  let Gratuity = 0;

  const pay = Number(lastPay) + Number(daValue);

  let gratuityFactor = 0;

  // =========================
  // 🔹 FACTOR LOGIC
  // =========================
  if (pensionType === 'FamPen_inService') {
    if (sixMonthly < 2) {
      gratuityFactor = 2;
    } else if (sixMonthly < 10) {
      gratuityFactor = 6;
    } else if (sixMonthly < 22) {
      gratuityFactor = 12;
    } else if (sixMonthly < 40) {
      gratuityFactor = 20;
    } else {
      gratuityFactor = sixMonthly / 4;
    }
  } else {
    if (sixMonthly >= 10) {
      gratuityFactor = sixMonthly / 4;
    } else {
      gratuityFactor = 0;
    }
  }

  // =========================
  // 🔹 FINAL GRATUITY
  // =========================
  Gratuity = Math.min(GratuityLimit, Math.round(pay * gratuityFactor));
  id('PanelGratuity').innerHTML = formatCurrency(Gratuity);

  // =========================
  // 🔹 FORMULA TEXT (LABEL)
  // =========================
  let formulaText = '';
  let formulaValueText = '';
  let gratuityValueFormula = '';
  let gratuityTextFormula = '';
  let gratuityValueText = '';

  // TEXT FORMULA
  if (gratuityFactor > 0) {
    if (Number.isInteger(gratuityFactor)) {
      formulaText = `\\text{(BP + DA)} \\times ${gratuityFactor}`;
      gratuityTextFormula = ` = (BP + DA) × ${gratuityFactor}`;
    } else {
      formulaText = `\\text{(BP + DA)} \\times \\frac{\\text {Completed 6-Month}}{4}`;
      gratuityTextFormula = ` = (BP + DA) × (Completed 6-Month / 4)`;
    }
  } else {
    formulaText = `\\text{Not Eligible}`;
    gratuityTextFormula = ` = Not Eligible`;
  }

  // VALUE TEXT
  if (gratuityFactor > 0) {
    if (Number.isInteger(gratuityFactor)) {
      formulaValueText = `
                    \\text{= (${formatCurrency(lastPay)} + ${formatCurrency(daValue)})}
                    \\times ${gratuityFactor}
                  `;

      gratuityValueText = ` = (${formatCurrency(lastPay)} + ${formatCurrency(daValue)}) × ${gratuityFactor}`;

      gratuityValueFormula = `(${lastPay}+${daValue})*${gratuityFactor}`;
    } else {
      formulaValueText = `\\text{= (${formatCurrency(lastPay)} + ${formatCurrency(daValue)})} \\times \\frac{${sixMonthly}}{4}`;

      gratuityValueText = ` = (${formatCurrency(lastPay)} + ${formatCurrency(daValue)}) × (${sixMonthly}/4)`;

      gratuityValueFormula = `= (${lastPay}+${daValue})*(${sixMonthly}/4)`;
    }

    //gratuityValueFormula =
    //`MIN(${GratuityLimit},ROUND(${gratuityValueFormula},0))`;
  } else {
    formulaValueText = `\\text{= ₹ 0}`;
    gratuityValueText = ` = ₹ 0`;
    gratuityValueFormula = '0';
  }

  const benificialPay1 = Math.round(0.5 * avgEmol);
  const benificialPay2 = Math.round(0.5 * lastPay);
  const moreBenificialPay = Math.max(benificialPay1, benificialPay2);

  const commutationBasicPay = Math.round((commutationPercent * moreBenificialPay) / 100);
  const ageNext = calcAgeNextBirthday(dob, effectiveLastDate);
  const commFactor = getCommutationFactor(ageNext);

  let commutation;
  commutation = Math.round(Number(commutationBasicPay) * Number(commFactor) * 12);
  id('PanelCommutation').innerHTML = formatCurrency(commutation);

  let residualPension;
  residualPension = Number(moreBenificialPay) - Number(commutationBasicPay);
  id('PanelResidualPension').innerHTML = formatCurrency(residualPension);

  let supBasicPay;
  let enhBasicPay;
  let redBasicPay;

  let supPension;
  let enhPension;
  let redPension;

  supBasicPay = residualPension;
  const supDA = Math.round((Number(supBasicPay) * Number(lastDA)) / 100);
  enhBasicPay = moreBenificialPay;
  const enhDA = Math.round((Number(enhBasicPay) * Number(lastDA)) / 100);
  redBasicPay = Math.round((Number(moreBenificialPay) * 0.3) / 0.5);
  const redDA = Math.round((Number(redBasicPay) * Number(lastDA)) / 100);

  if (sixMonthly >= 20) {
    if (pensionType === 'Superannuation' || pensionType === 'VRS') {
      supPension = Number(supBasicPay) + Number(supDA) + Number(1000);
      enhPension = 0;
      redPension = 0;
    } else if (pensionType === 'FamPen_inService') {
      supPension = 0;
      enhPension = Number(enhBasicPay) + Number(enhDA) + Number(1000);
      redPension = Number(redBasicPay) + Number(redDA) + Number(1000);
    } else if (pensionType === 'FamPen_afterService') {
      supPension = Number(supBasicPay) + Number(supDA) + Number(1000);
      enhPension = Number(enhBasicPay) + Number(enhDA) + Number(1000);
      redPension = Number(redBasicPay) + Number(redDA) + Number(1000);
    }
  } else if (sixMonthly < 20) {
    supPension = 0;
    enhPension = 0;
    redPension = 0;
  }

  if (isNonGO) {
    commutation = 0;
    residualPension = 0;

    supBasicPay = 0;
    enhBasicPay = 0;
    redBasicPay = 0;

    supPension = 0;
    enhPension = 0;
    redPension = 0;
  }

  let totalBenifits;
  totalBenifits = Number(totLeaveEncash) + Number(Gratuity) + Number(commutation);
  id('PanelTotBenifits').innerHTML = formatCurrency(totalBenifits);

  // =========================
  // 🔥 Employee Table
  // =========================
  const infoTable = document.createElement('table');

  infoTable.style.cssText = `
                  width:100%;
                  border-collapse:collapse;
                  font-size:11px;
                  margin-bottom:8px;
                  border:1px solid #ccc;
                `;

  infoTable.innerHTML = `
                  <colgroup>
                    <col style="width:10%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:10%">
                  </colgroup>

                  <tr style="background:#e9ecef;">
                    <th colspan="12" style="padding:6px;text-align:center;">
                      SERVICE DETAILS IN r/o ${empName.toUpperCase()}
                    </th>
                  </tr>

                  <tr>
                    <td colspan="3"><b>Employee Name</b></td>
                    <td colspan="3">${empName}</td>
                    <td colspan="3"><b>Pension Calculation For</b></td>
                    <td colspan="3">${pensionTypetext}</td>
                  </tr>

                  <tr>
                    <td colspan="3"><b>Date of Birth</b></td>
                    <td colspan="3">${dob}</td>
                    <td colspan="3"><b>Date of Joining</b></td>
                    <td colspan="3">${doj}</td>
                  </tr>

                  <tr>
                    <td colspan="3"><b>PAN</b></td>
                    <td colspan="3">${pan}</td>
                    <td colspan="3"><b>Last Salary Drawn on</b></td>
                    <td colspan="3">${dor}</td>
                  </tr>

                  <tr>
                    <td colspan="3"><b>EL Available</b></td>
                    <td colspan="3">${EL}</td>
                    <td colspan="3"><b>HPL</b></td>
                    <td colspan="3">${HPL}</td>
                  </tr>

                  <tr>
                    <td colspan="3"><b>Commutation Opted</b></td>
                    <td colspan="3">${commutationChecked ? 'Yes' : 'No'}</td>
                    <td colspan="3"><b>Commutation %</b></td>
                    <td colspan="3">${commutationChecked ? commutationPercent + '%' : '0%'}</td>
                  </tr>

                  <tr>
                    <td colspan="3"><b>Last Drawn Basic Pay <span style="padding:4px;border-radius:3px;background:#fabe5c;width:20px">(BP)</span></b></td>
                    <td colspan="3">${formatCurrency(lastPay)}</td>
                    <td colspan="3"><b>Last Drawn DA <span style="padding:4px;border-radius:3px;background:#fabe5c;width:20px">(DA)</span></b></td>
                    <td colspan="3">${formatCurrency(daValue)} (${lastDA}%)</td>
                  </tr>

                  <tr>
                    <td colspan="3"><b>Qualifying Service</b></td>
                    <td colspan="3">${totService}</td>
                    <td colspan="3"><b>Completed 6 Monthly Period</b></td>
                    <td colspan="3">${sixMonthly}<span class="print-red" style="color:red !important;font-weight:bold !important;">${cappedsixMonthly}</span></td>
                  </tr>

                  <tr>
                    <td colspan="12" id="emolumentContainer"></td>
                  </tr>
                  <tr>
                    <td colspan="12" id="calculationContainer"></td>
                  </tr>
                  <tr>
                    <td colspan="12" id="pensionContainer"></td>
                  </tr>
                `;

  wrapper.appendChild(infoTable);

  const isBenApplicable = !isNonGO && pensionType !== 'FamPen_inService' && sixMonthly >= 20;
  // =========================
  // 🔥 Emolument Table Render
  // =========================
  const container = infoTable.querySelector('#emolumentContainer');

  if (container) {
    if (emolData.length > 0 && isBenApplicable) {
      container.innerHTML = buildEmolumentHTML(emolData);
    } else {
      container.innerHTML = ''; // 🔥 hide emol table
    }
  }

  const calculationTable = document.createElement('table');
  calculationTable.id = 'pensionCalculationTable';
  calculationTable.style.cssText = `
                  width:100%;
                  border-collapse:collapse;
                  font-size:11px;
                  border:1px solid #ccc;
                `;

  calculationTable.innerHTML = `
                  <colgroup>
                    <col style="width:10%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:10%">
                  </colgroup>

                  <thead>
                    <tr>
                      <th colspan="12" style="background:#1f4e79;color:white;padding:8px;text-align:center">
                        PENSION BENIFITS CALCULATION IN r/o ${empName.toUpperCase()}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr >
                      <th colspan="12" style="background:#edf1fa;color:black;"><b>1. LEAVE ENCASHMENT CALCULATION </b></th>
                    </tr>
                    <tr>
                      <td colspan="2">EL Encashment</td>
                      <td colspan="4" style="text-align:left; vertical-align:middle;"
                          data-text-formula=" = (BP + DA) * (EL (capped to 300) / 30)">
                         \\(
                        \\text{=}
                        \\displaystyle \\frac{\\text{BP} + \\text{DA}}{30}
                        \\times \\text{EL (capped to 300)}
                        \\)
                      </td>
                      <td colspan="2">HPL Encashment</td>
                      <td colspan="4" style="text-align:left; vertical-align:middle;"
                        data-text-formula=" =  (BP + DA) * (HPL (capped to 240) / 30)">
                        \\(
                        \\text{=}
                        \\displaystyle \\frac{\\text{BP} + \\text{DA}}{2 \\times 30}
                        \\times \\text{HPL (capped to 240)}
                        \\)
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2"></td>
                      <td colspan="4" style="text-align:left; vertical-align:middle;"
                        data-text-formula=" = (${formatCurrency(lastPay)}+${formatCurrency(daValue)})*${ELused}/30">

                        \\(
                        \\text{=}
                        \\displaystyle \\frac{\\text{${formatCurrency(lastPay)}} + \\text{${formatCurrency(daValue)}}}{30}
                        \\times \\text{${ELused}}
                        \\quad \\color{red}{\\text{${ELspan}}}
                        \\)

                      </td>
                      <td colspan="2"></td>
                      <td colspan="4" style="text-align:left; vertical-align:middle;"
                        data-text-formula=" = (${formatCurrency(hplLastPay)}+${formatCurrency(hpldaValue)})*${maxHPLAllowed}/30">
                        \\(
                        \\text{=}
                        \\displaystyle \\frac{\\text{${formatCurrency(hplLastPay)}} + \\text{${formatCurrency(hpldaValue)}}}{30}
                        \\times \\text{${maxHPLAllowed}}
                        \\quad \\color{red}{\\text{${HPLspan}}}
                        \\)

                      </td>
                    </tr>
                    <tr>
                      <td colspan="2"></td>
                      <td colspan="4" data-formula="= (${lastPay}+${daValue})*(${ELused}/30)">
                        <b>= ${formatCurrency(ELencash)}</b>
                      </td>
                      <td colspan="2"></td>
                      <td colspan="4" data-formula="= (${hplLastPay}+${hpldaValue})*${maxHPLAllowed}/30">
                        <b>= ${formatCurrency(HPLencash)}</b>
                      </td>
                    </tr>

                    <tr>
                      <td colspan="2">Total Leave Encashment</td>
                      <td colspan="10" data-text-formula=" = EL Encashment + HPL Encashment">= EL Encashment + HPL Encashment</td>
                    </tr>

                    <tr>
                      <td colspan="2"></td>
                      <td colspan="10" data-formula="=${totLeaveEncash}"">
                        <b>= ${formatCurrency(totLeaveEncash)}</b>
                      </td>
                    </tr>

                    <tr>
                      <th colspan="12" style="background:#edf1fa;color:black;">2. GRATUITY CALCULATION
                        <span class="print-red" id="gratuitySpan" style="color:red !important;font-weight:bold !important;"></span>
                      </th>
                    </tr>
                    <tr>
                      <td colspan="2">Gratuity</td>
                      <td colspan="10"
                          data-text-formula="${gratuityTextFormula}">
                        \\(
                        ${formulaText}
                        \\)
                      </td>
                    </tr>

                    <!-- 🔹 Row 2 -->
                    <tr class="gratuityRows">
                      <td colspan="2"></td>
                      <td colspan="10"
                          data-text-formula="${gratuityValueText}">
                        \\(
                        ${formulaValueText}
                        \\)
                      </td>
                    </tr>

                    <!-- 🔹 Row 3 -->
                    <tr class="gratuityRows">
                      <td colspan="2">Gratuity</td>
                      <td colspan="10"
                          data-formula="${gratuityValueFormula}">
                        <b>= ${formatCurrency(Gratuity)}</b>
                      </td>
                    </tr>
                    <tr>
                      <th colspan="12" style="background:#edf1fa;color:black;">3. MOST BENIFICIAL PAY FOR PENSION CALCULATION
                        <span class="print-red" id="BenificialSpan" style="color:red !important;font-weight:bold !important;">
                      </th>
                    </tr>
                    <tr class="BenificialRows">
                      <td colspan="2"> a). Average Emolument </td>
                      <td colspan="4" data-text-formula=" = 50% of Average Basic pay of Last 10 Months"> = 50% of Average Basic pay of Last 10 Months</td>
                      <td colspan="2"> b). Last Drawn</td>
                      <td colspan="4" data-text-formula=" = 50% of BP"> = 50% of BP</td>
                    </tr>
                    <tr class="BenificialRows">
                      <td colspan="2"></td>
                      <td colspan="4" data-text-formula="  = 50% x ${formatCurrency(avgEmol)}"> = 50% x ${formatCurrency(avgEmol)}</td>
                      <td colspan="2"></td>
                      <td colspan="4" data-text-formula=" = 50% x ${formatCurrency(lastPay)}"> = 50% x ${formatCurrency(lastPay)}</td>
                    </tr>
                    <tr class="BenificialRows">
                      <td colspan="2"></td>
                      <td colspan="4" data-formula="0.5*${avgEmol}"> = ${formatCurrency(benificialPay1)}</td>
                      <td colspan="2"></td>
                      <td colspan="4" data-formula="0.5*${lastPay}"> = ${formatCurrency(benificialPay2)}</td>
                    </tr>
                    <tr class="BenificialRows">
                      <td colspan="2">More Benificial Pay</td>
                      <td colspan="10" data-formula="MAX(${benificialPay1},${benificialPay2})"><b>= ${formatCurrency(moreBenificialPay)}</b></td>
                    </tr>
                    <tr>
                      <th colspan="12"  style="background:#edf1fa;color:black;">4. COMMUTATION CALCULATION
                        <span class="print-red" id="CommuteSpan" style="color:red !important;font-weight:bold !important;"></span>
                      </th>
                    </tr>
                    <tr class="CommuteRows">
                      <td colspan="2">Basic Pay for Commutation</td>
                      <td colspan="4" data-text-formula="  = Benificial Pay x Commutation (%)" >= Benificial Pay x Commutation (%)</td>
                      <td colspan="2">Age on Next Birthday</td>
                      <td colspan="4">${ageNext}</td>
                    </tr>
                    <tr class="CommuteRows">
                      <td colspan="2"></td>
                      <td colspan="4" data-text-formula=" = ${formatCurrency(moreBenificialPay)} x ${commutationPercent}%">= ${formatCurrency(moreBenificialPay)} x ${commutationPercent}%</td>
                      <td colspan="2">Commutation Factor</td>
                      <td colspan="4">${commFactor}</td>
                    </tr>
                    <tr class="CommuteRows">
                      <td colspan="2"></td>
                      <td colspan="4" data-formula="(${commutationPercent}*${moreBenificialPay})/100">= ${formatCurrency(commutationBasicPay)}</td>
                      <td colspan="6">
                    </tr>
                    <tr class="CommuteRows">
                      <td colspan="2">Commutation Amount</td>
                      <td colspan="10" data-text-formula=" = Basic Pay for Commutation x Commutation Factor x 12">= Basic Pay for Commutation x Commutation Factor x 12</td>
                    </tr>
                    <tr class="CommuteRows">
                      <td colspan="2"></td>
                      <td colspan="10" data-text-formula=" = ${formatCurrency(commutationBasicPay)} x ${commFactor} x 12">= ${formatCurrency(commutationBasicPay)} x ${commFactor} x 12</td>
                    </tr>
                    <tr class="CommuteRows">
                      <td colspan="2"></td>
                      <td colspan="10" data-formula="${commutationBasicPay}*${commFactor}*12"><b>= ${formatCurrency(commutation)}</b></td>
                    </tr>
                    <tr>
                      <td colspan="3" style="background:#edf1fa;color:black;"><b>5. RESIDUAL PENSION</b></td>
                      <td colspan="9" style="background:#edf1fa;color:black;" data-formula="${moreBenificialPay}-${commutationBasicPay}"><b> = ${formatCurrency(residualPension)}</b></td>
                    </tr>
                    <tr>
                      <th colspan="12"  style="background:#edf1fa;color:black;">6. SUPERANNUATION PENSION CALCULATION
                        <span class="print-red" id="supPensionSpan" style="color:red !important;font-weight:bold !important;"></span>
                      </th>
                    </tr>
                    <tr class="supPensionRows">
                      <td colspan="3">Basic Pay</td>
                      <td colspan="3">Dearness Relief (${lastDA}%)</td>
                      <td colspan="3">Medical Allowance @ ${formatCurrency(1000)}</td>
                      <td colspan="3"><b>Total Superannuation Pension</b></td>
                    </tr>
                    <tr class="supPensionRows">
                      <td colspan="3">${formatCurrency(supBasicPay)}</td>
                      <td colspan="3">${formatCurrency(supDA)}</td>
                      <td colspan="3">${formatCurrency(1000)}</td>
                      <td colspan="3"><b>${formatCurrency(supPension)}</b></td>
                    </tr>
                     <tr>
                      <th colspan="12"  style="background:#edf1fa;color:black;">7. ENHANCED PENSION CALCULATION
                        <span id="enhancedToDate" class="print-red" style="color:red !important;font-weight:bold !important;"></span>
                        <span class="print-red" id="enhPensionSpan" style="color:red !important;font-weight:bold !important;"></span>
                      </th>
                    </tr>
                    <tr class="enhPensionRows">
                      <td colspan="3">Basic Pay</td>
                      <td colspan="3">Dearness Relief (${lastDA}%)</td>
                      <td colspan="3">Medical Allowance @${formatCurrency(1000)}</td>
                      <td colspan="3"><b>Total Enhanced Pension</b></td>
                    </tr>
                    <tr class="enhPensionRows">
                      <td colspan="3">${formatCurrency(enhBasicPay)}</td>
                      <td colspan="3">${formatCurrency(enhDA)}</td>
                      <td colspan="3">${formatCurrency(1000)}</td>
                      <td colspan="3"><b>${formatCurrency(enhPension)}</b></td>
                    </tr>
                    </tr>
                     <tr>
                      <th colspan="12"  style="background:#edf1fa;color:black;">8. REDUCED PENSION CALCULATION
                        <span id="reducedFromDate" class="print-red" style="color:red !important;font-weight:bold !important;"></span>
                        <span class="print-red" id="redPensionSpan" style="color:red !important;font-weight:bold !important;"></span>
                      </th>
                    </tr>
                    <tr class="redPensionRows">
                      <td colspan="3">Basic Pay</td>
                      <td colspan="3">Dearness Relief (${lastDA}%)</td>
                      <td colspan="3">Medical Allowance</td>
                      <td colspan="3"><b>Total Reduced Pension</b></td>
                    </tr>
                    <tr class="redPensionRows">
                      <td colspan="3">${formatCurrency(redBasicPay)}</td>
                      <td colspan="3">${formatCurrency(redDA)}</td>
                      <td colspan="3">${formatCurrency(1000)}</td>
                      <td colspan="3"><b>${formatCurrency(redPension)}</b></td>
                    </tr>

                  </tbody>
                `;

  const calcContainer = infoTable.querySelector('#calculationContainer');

  if (calcContainer) {
    calcContainer.innerHTML = '';
    calcContainer.appendChild(calculationTable);
  }

  requestAnimationFrame(() => {
    togglePensionSections(sixMonthly, pensionType);
  });

  const pensionDates = calculatePensionDates(dob, effectiveLastDate, pensionType);

  const isCommChecked = id('CommutationOpted')?.checked;

  const { remarks } = getPensionRemarks(sixMonthly, pensionType, isCommChecked);

  ['sup', 'enh', 'red', 'commute', 'ben', 'grat'].forEach((key) => {
    const map = {
      sup: 'supPensionSpan',
      enh: 'enhPensionSpan',
      red: 'redPensionSpan',
      commute: 'CommuteSpan',
      ben: 'BenificialSpan',
      grat: 'gratuitySpan' // 🔥 ADD THIS
    };

    const el = id(map[key]);
    if (!el) return;

    el.innerHTML = remarks[key] ? `<span class="print-red" style="color:red !important;font-weight:bold !important;">${remarks[key]}</span>` : '';
  });

  id('enhancedToDate').textContent = !isNonGO && pensionDates.enhancedTo ? ` (upto ${formatDate(pensionDates.enhancedTo)})` : '';

  id('reducedFromDate').textContent = !isNonGO && pensionDates.reducedFrom ? ` (from ${formatDate(pensionDates.reducedFrom)})` : '';

  //setTimeout(() => {
  renderMathInElement(calculationTable, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\(', right: '\\)', display: true }
    ],
    throwOnError: false,
    strict: 'ignore',
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] // 🔥 add this
  });
  //}, 0);

  // =========================
  // 🔥 Pension Table
  // =========================
  const pensionTable = document.createElement('table');

  pensionTable.style.cssText = `
                  width:100%;
                  border-collapse:collapse;
                  font-size:11px;
                  border:1px solid #ccc;
                `;

  pensionTable.innerHTML = `
                  <colgroup>
                    <col style="width:10%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:10%">
                  </colgroup>

                  <tbody>
                    <tr>
                      <td colspan="6">Leave Encashment</td>
                      <td colspan="6">${formatCurrency(totLeaveEncash)}</td>
                    </tr>
                    <tr>
                      <td colspan="6">Gratuity</td>
                      <td colspan="6">${formatCurrency(Gratuity)}</td>
                    </tr>
                    <tr>
                      <td colspan="6">Commutation</td>
                      <td colspan="6">${formatCurrency(commutation)}</td>
                    </tr>
                    <tr>
                      <td colspan="6"><b>Total Benifits</b></td>
                      <td colspan="6"><b>${formatCurrency(totalBenifits)}</b></td>
                    </tr>
                  </tbody>
                `;

  const pensionContainer = infoTable.querySelector('#pensionContainer');

  if (pensionContainer) {
    pensionContainer.innerHTML = '';
    pensionContainer.appendChild(pensionTable);
  }
}

function handlePensionChange() {
  qsa('.Pensionaction-group button').forEach((btn) => {
    btn.disabled = false;
  });

  const empName = id('PensionPage_Emp').value;
  const empHRIS = id('PensionPage_Emp').value;
  renderPensionTable(empHRIS);
  updatePensionUI();
}

// 🔹 Event listeners
//pensionSelect.addEventListener("change", updatePensionUI);
checkbox.addEventListener('change', () => {
  commutationSelect.disabled = !checkbox.checked;
  const empHRIS = id('PensionPage_Emp').value;
  renderPensionTable(empHRIS);
});

function handlePensionEvents(e) {
  if (e.target.matches('#PensionPage_Station, #PensionPage_Emp, #PensionFor, #VRS_Death_Date, #PensionEL, #PensionHPL, #CommutationOpted, #CommutationOption')) {
    const empHRIS = id('PensionPage_Emp')?.value;
    if (!empHRIS) return;

    handlePensionChange();
    renderPensionTable(empHRIS);
  }
}

// 🔥 attach to both events
document.addEventListener('input', handlePensionEvents);
document.addEventListener('change', handlePensionEvents);

function resetWrapperInputs(wrapper) {
  if (!wrapper) return;

  wrapper.querySelectorAll('input').forEach((el) => {
    // ❌ skip checkboxes & radio
    if (el.type === 'checkbox' || el.type === 'radio') return;

    // 🔹 handle date separately (optional)
    if (el.type === 'date') {
      el.value = '';
      return;
    }

    // 🔥 set all other inputs to 0
    el.value = '0';
  });
}

async function buildPensionHTML(mode = 'single') {
  //console.log(qs(".PensionTableWrapper").querySelectorAll(".print-red"));
  const wrapper = qs('.PensionTableWrapper');
  const station = id('PensionPage_Station')?.value;
  const selectedEmp = id('PensionPage_Emp')?.value;
  const empDropdown = id('PensionPage_Emp');

  if (!wrapper) return '';

  const headers = window.empCalcHeaders;
  const rows = window.empCalcRows;

  const nameIdx = headers.indexOf('Employee Name');
  const stationIdx = headers.indexOf('Station');
  const hrisIdx = headers.indexOf('HRIS');

  // =========================
  // 🔥 EMPLOYEE LIST
  // =========================
  let employees = [];

  if (mode === 'single') {
    if (!selectedEmp) return '';
    employees = [selectedEmp];
  } else {
    employees = [...new Set(rows.filter((r) => String(r[stationIdx]).trim() === station).map((r) => String(r[hrisIdx]).trim()))];

    if (!employees.length) {
      showCustomAlert('🚫 No employees found');
      return '';
    }
  }

  // =========================
  // 🔥 CREATE DOCUMENT
  // =========================
  const doc = document.implementation.createHTMLDocument('Pension Calculation');

  // =========================
  // 🔥 COPY ALL STYLES
  // =========================
  qsa("style, link[rel='stylesheet']").forEach((el) => {
    try {
      doc.head.appendChild(el.cloneNode(true));
    } catch {}
  });

  // =========================
  // 🔥 PRINT CSS (FIXED)
  // =========================
  const style = doc.createElement('style');

  style.textContent = `
          @page { size: A4 portrait; margin: 5mm 5mm 20mm 5mm;background:white; }

          body { margin: 0; font-size: 10px;background:white; }

          .page {
            margin: 0 auto; padding-right: 2mm; page-break-after: always;
            break-after: page;background:white;
          }

          .page:last-child {
            page-break-after: auto;
          }

          table { width: 100%; border-collapse: collapse;background:white; }

          tr { break-inside: auto; }

          td, th { padding: 4px; font-size: 10px; }

          .PensionTableWrapper,
          .SectionPage,
          .right-panel {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }

          .katex {
            display: inline-block !important;
            white-space: normal !important;
            line-height: 1.4;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            opacity: 1 !important;
          }

          #emolumentContainer, #calculationContainer, #pensionContainer{
            border:none;
            padding:0;
          }

          /* 🔥 FIX: ALWAYS APPLY RED */
          .print-red {
            color: #d00000 !important;
            font-weight: bold !important;
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
    renderPensionTable(empHRIS);

    if (mode === 'all') {
      id('PensionInfoPanel')
        .querySelectorAll('span')
        .forEach((el) => {
          el.textContent = '0';
        });
      id('VRS_Death_Date').value = '';
      wrapper.style.opacity = '0';
    }

    // 🔥 WAIT FOR DOM + CALCULATION
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    const liveWrapper = qs('.PensionTableWrapper');
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
    // 🔥 FIX: APPLY RED AFTER KATEX (FINAL)
    // =========================
    clone.querySelectorAll('.print-red').forEach((el) => {
      // 🔥 APPLY STYLE DIRECTLY (DO NOT REPLACE)
      el.style.setProperty('color', '#d00000', 'important');
      el.style.setProperty('font-weight', 'bold', 'important');

      // 🔥 ALSO FIX INNER CHILDREN (CRITICAL)
      el.querySelectorAll('*').forEach((child) => {
        child.style.setProperty('color', '#d00000', 'important');
        child.style.setProperty('font-weight', 'bold', 'important');
      });
    });

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
      id('PensionInfoPanel')
        .querySelectorAll('span')
        .forEach((el) => {
          el.textContent = '0';
        });
      id('VRS_Death_Date').value = '';
      wrapper.innerHTML = ''; // 🔥 clear table UI
    }
    wrapper.style.opacity = '1';
  }

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

async function exportPensionExcel(mode = 'single') {
  const workbook = new ExcelJS.Workbook();

  const wrapper = qs('.PensionTableWrapper');
  const station = id('PensionPage_Station')?.value;
  const selectedEmp = id('PensionPage_Emp')?.value;
  const empDropdown = id('PensionPage_Emp');

  if (mode === 'single' && !selectedEmp) return;

  const headers = window.empCalcHeaders;
  const rows = window.empCalcRows;

  const nameIndex = headers.indexOf('Employee Name');
  const hrisIndex = headers.indexOf('HRIS');
  const stationIdx = headers.indexOf('Station');
  const TOTAL_COLS = 12;

  // =========================
  // 🔧 HELPERS
  // =========================
  function parseValue(text) {
    if (!text) return '';
    const clean = text.replace(/[,₹\s]/g, '');
    return !isNaN(clean) && clean !== '' ? Number(clean) : text;
  }

  function isVisible(el) {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  }

  function getFormulaText(cell) {
    const katex = cell.querySelector('.katex-html');
    if (katex) {
      return katex.innerText.replace(/\s+/g, ' ').trim();
    }
    return cell.innerText.trim();
  }

  function getFontColor(color) {
    const m = color?.match(/\d+/g);
    if (!m || m.length < 3) return undefined;
    return {
      argb: 'FF' + m.map((x) => Number(x).toString(16).padStart(2, '0')).join('')
    };
  }

  function rgbToARGB(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return null;
    return 'FF' + m.map((x) => (+x).toString(16).padStart(2, '0')).join('');
  }

  function getEffectiveBackground(cell) {
    let bg = getComputedStyle(cell).backgroundColor;
    if (bg && bg !== 'transparent') return bg;

    const tr = cell.closest('tr');
    if (tr) {
      bg = getComputedStyle(tr).backgroundColor;
      if (bg && bg !== 'transparent') return bg;
    }
    return null;
  }

  function extractRichText(node, richText = []) {
    // TEXT NODE
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent;

      if (text) {
        text = text.replace(/\s+/g, ' '); // 🔥 remove line breaks
        text = text.trim();

        if (text) {
          richText.push({ text: text + ' ' }); // 🔥 keep spacing inline
        }
      }
    }

    // ELEMENT NODE
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const isRed = node.classList?.contains('print-red');
      const isBold = node.tagName === 'B' || node.tagName === 'STRONG';

      node.childNodes.forEach((child) => {
        const temp = [];
        extractRichText(child, temp);

        temp.forEach((part) => {
          part.font = {
            ...(part.font || {}),
            ...(isRed ? { color: { argb: 'FFFF0000' } } : {}),
            ...(isBold ? { bold: true } : {})
          };
          richText.push(part);
        });
      });
    }

    return richText;
  }

  // =========================
  // 🔥 MAIN TABLE PROCESSOR
  // =========================
  function processTable(sheet, table, startRow = 1) {
    let currentRow = startRow;

    // 🔥 track first header row
    let isFirstTHHandled = false;

    const trs = Array.from(table.rows).filter(isVisible);

    for (const tr of trs) {
      // 🔥 HANDLE NESTED TABLE (ONLY DIRECT CHILD)
      const nestedTable = Array.from(tr.children)
        .map((td) => td.querySelector(':scope > table'))
        .find(Boolean);

      if (nestedTable) {
        currentRow = processTable(sheet, nestedTable, currentRow);
        continue;
      }

      const cells = Array.from(tr.cells).filter(isVisible);
      if (!cells.length) continue;

      const excelRow = sheet.getRow(currentRow);

      // 🔥 HEADER DETECTION
      const hasTH = cells.some((c) => c.tagName === 'TH');

      // 🔥 ROW HEIGHT
      excelRow.height = hasTH ? 25 : 18;

      let colIndex = 1;
      let hasValue = false;

      for (const cell of cells) {
        if (colIndex > TOTAL_COLS) break;

        const text = getFormulaText(cell);
        if (text) hasValue = true;

        const colSpan = Math.min(cell.colSpan || 1, TOTAL_COLS - colIndex + 1);

        const excelCell = excelRow.getCell(colIndex);

        const cs = getComputedStyle(cell);
        const isTH = cell.tagName === 'TH';

        // =========================
        // 🔥 ALIGNMENT LOGIC
        // =========================
        let horizontalAlign = 'left';

        // 👉 ONLY FIRST HEADER ROW CENTER
        if (isTH && !isFirstTHHandled) {
          horizontalAlign = 'center';
        }

        // =========================
        // 🔥 VALUE
        // =========================
        const formula = cell.getAttribute('data-formula');
        const textFormula = cell.getAttribute('data-text-formula');
        const textValue = cell.getAttribute('data-text-value');

        if (formula) {
          // 🔥 FINAL ROW → real Excel formula
          excelCell.value = { formula: formula };
        } else if (textFormula) {
          // 🔹 Row 1 → generic formula text
          excelCell.value = textFormula;
        } else if (textValue) {
          // 🔹 Row 2 → substituted values
          excelCell.value = '= ' + textValue;
        } else {
          // 🔹 Normal cells
          const hasRed = cell.querySelector('.print-red');

          if (hasRed) {
            const richText = extractRichText(cell);

            excelCell.value = { richText };
          } else {
            excelCell.value = parseValue(text);
          }
        }

        // =========================
        // 🔥 FONT
        // =========================
        excelCell.font = {
          name: 'Calibri',
          size: 11,
          bold: cs.fontWeight === 'bold' || parseInt(cs.fontWeight) >= 600 || cell.querySelector('b,strong'),
          color: getFontColor(cs.color)
        };

        // =========================
        // 🔥 ALIGNMENT APPLY
        // =========================
        excelCell.alignment = {
          horizontal: horizontalAlign,
          vertical: 'middle',
          wrapText: true
        };

        // =========================
        // 🔥 BACKGROUND
        // =========================
        const bg = getEffectiveBackground(cell);
        if (bg && bg !== 'transparent' && !bg.includes('rgba(0, 0, 0, 0)') && !bg.includes('rgb(0, 0, 0)')) {
          const argb = rgbToARGB(bg);
          if (argb) {
            excelCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb }
            };
          }
        }

        // =========================
        // 🔥 BORDER
        // =========================
        excelCell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };

        // =========================
        // 🔥 MERGE
        // =========================
        if (colSpan > 1) {
          try {
            sheet.mergeCells(currentRow, colIndex, currentRow, colIndex + colSpan - 1);
          } catch {}
        }

        colIndex += colSpan;
      }

      // 🔥 MARK FIRST HEADER ROW DONE
      if (!isFirstTHHandled && hasTH) {
        isFirstTHHandled = true;
      }

      if (hasValue) {
        excelRow.commit();
        currentRow++;
      }
    }

    return currentRow;
  }

  const empRow = rows.find((r) => String(r[hrisIndex]).trim() === String(selectedEmp).trim());

  const empName = empRow?.[nameIndex] || selectedEmp;

  const fileName = mode === 'single' ? `${empName}(${selectedEmp})-${station}-Pension Calculation.xlsx` : `${station}-Pension Calculations.xlsx`;

  // =========================
  // 🔁 EMP LOOP
  // =========================
  let employees = mode === 'single' ? [selectedEmp] : [...new Set(rows.filter((r) => String(r[stationIdx]).trim() === station).map((r) => String(r[hrisIndex]).trim()))];

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

  for (const empHRIS of employees) {
    const wrapper = qs('.PensionTableWrapper');
    if (!wrapper) continue;

    // 🔥 SET CONTEXT
    if (empDropdown) {
      empDropdown.value = empHRIS;
    }

    // 🔥 RENDER
    renderPensionTable(empHRIS);

    if (mode === 'all') {
      id('PensionInfoPanel')
        .querySelectorAll('span')
        .forEach((el) => {
          el.textContent = '0';
        });
      id('VRS_Death_Date').value = '';
      wrapper.style.opacity = '0';
    }

    // 🔥 WAIT FOR CALCULATION
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    // 🔥 SYNC VALUES
    syncInputs(wrapper);

    const empRow = rows.find((r) => String(r[hrisIndex]).trim() === String(empHRIS).trim());

    const empName = empRow?.[nameIndex] || empHRIS;

    const sheet = workbook.addWorksheet(String(empName).substring(0, 25));

    // =========================
    // 🔥 HEADER
    // =========================
    sheet.mergeCells(1, 1, 1, TOTAL_COLS);

    const headerCell = sheet.getCell(1, 1);

    headerCell.value = {
      richText: [
        { text: 'PRASAR BHARATI\n', font: { bold: true, size: 12 } },
        {
          text: "INDIA'S PUBLIC SERVICE BROADCASTER\n",
          font: { bold: true, size: 12 }
        },
        { text: 'ALL INDIA RADIO\n', font: { bold: true, size: 12 } },
        { text: `${station}`, font: { bold: true, size: 12 } }
      ]
    };

    headerCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    sheet.getRow(1).height = 75;

    // =========================
    // 🔥 LOGO (FIXED POSITION)
    // =========================
    const base64 = await urlToBase64('https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l');

    const imageId = workbook.addImage({
      base64,
      extension: 'png'
    });

    // 🔥 Position inside first row (header row)
    sheet.addImage(imageId, {
      tl: { col: 0.2, row: 0 }, // left top
      ext: { width: 65, height: 65 }
    });

    // =========================
    // 🔥 MAIN TABLE ONLY
    // =========================
    const mainTable = wrapper.querySelector('table');

    let currentRow = 2;

    if (mainTable) {
      currentRow = processTable(sheet, mainTable, currentRow);
    }

    const lastRow = currentRow - 1;

    // =========================
    // 🔥 COLUMN WIDTH
    // =========================
    sheet.columns = Array.from({ length: TOTAL_COLS }, (_, i) => ({
      width: i === 0 || i === TOTAL_COLS - 1 ? 18 : 12
    }));

    // =========================
    // 🔥 PRINT SETUP
    // =========================
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
      printArea: `A1:L${lastRow}`
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
      id('PensionInfoPanel')
        .querySelectorAll('span')
        .forEach((el) => {
          el.textContent = '0';
        });
      id('VRS_Death_Date').value = '';
      wrapper.innerHTML = ''; // 🔥 clear table UI
    }
    wrapper.style.opacity = '1';
  }
}

on('PensionprintBtn', 'click', () => {
  const hasEmp = !!id('PensionPage_Emp')?.value;

  showConfirmBox({
    title: 'Print Options',

    icon: '🖨️',

    message: `
      <div style="display:flex;flex-direction:column;gap:8px">

        ${
          hasEmp
            ? `
          <button id="Pension_PrintSingle"
            class="reportTypeBtn">
            🖨️ Selected Employee
          </button>
        `
            : ''
        }

        <button id="Pension_PrintAll"
          class="reportTypeBtn">
          🖨️ Station (All Employees)
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
    id('Pension_PrintSingle')?.addEventListener('click', async () => {
      closeConfirmBox();

      const html = await buildPensionHTML('single');

      if (!html) {
        showCustomAlert('🚫 No Data Found');
        return;
      }

      openPrintWindow(html);
    });

    id('Pension_PrintAll')?.addEventListener('click', async () => {
      closeConfirmBox();

      const html = await buildPensionHTML('all');

      if (!html) {
        showCustomAlert('🚫 No Employees Found');
        return;
      }

      openPrintWindow(html);
    });
  }, 50);
});

on('PensionexcelBtn', 'click', () => {
  const hasEmp = !!id('PensionPage_Emp')?.value;

  showConfirmBox({
    title: 'Pension Calculation Excel Statement',

    icon: '📊',

    message: `
      <div style="display:flex;flex-direction:column;gap:8px">

        ${
          hasEmp
            ? `
          <button id="Pension_ExcelSingle"
            class="reportTypeBtn">
            📊 Selected Employee
          </button>
        `
            : ''
        }

        <button id="Pension_ExcelAll"
          class="reportTypeBtn">
          📊 Station (All Employees)
        </button>

      </div>
    `,

    subMessage: '',

    yesText: 'Close',
    noText: '',
    yesColor: '#2563eb',

    onYes: () => {
      closeConfirmBox();
    }
  });

  id('logoutYesBtn').style.display = 'block';
  id('logoutNoBtn').style.display = 'none';

  setTimeout(() => {
    id('Pension_ExcelSingle')?.addEventListener('click', () => {
      closeConfirmBox();
      exportPensionExcel('single');
    });

    id('Pension_ExcelAll')?.addEventListener('click', () => {
      closeConfirmBox();
      exportPensionExcel('all');
    });
  }, 50);
});
