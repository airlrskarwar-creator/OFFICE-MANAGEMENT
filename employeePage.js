//================================================================================//
//                🔥🔥🔥🔥🔥DATABASE SCRIPT🔥🔥🔥🔥🔥
//=============================================================================//

/* ===========  WITHIN DATABASE PAGE SWITCH TABLE ==================== */

function showSheet(name, btn) {
  qsa('.DB-Table-Wrapper table').forEach(hide);
  show(name);

  qsa('.button-bar button').forEach((b) => b.classList.remove('active'));

  if (btn) btn.classList.add('active');

  // 🔥 DELAY FIX (CRITICAL)
  setTimeout(moveIndicator, 50);
}

function initDatabaseDefault() {
  const firstBtn = qs('.button-bar button');
  if (firstBtn) {
    showSheet('EmpDB', firstBtn);
  }
}

function moveIndicator() {
  const bar = qs('.button-bar');
  if (!bar) return;

  const active = bar.querySelector('button.active');
  if (!active) return;

  const rect = active.getBoundingClientRect();
  const parentRect = bar.getBoundingClientRect();

  // 🔥 Prevent zero width issue
  if (rect.width === 0) return;

  const left = rect.left - parentRect.left;

  bar.style.setProperty('--indicator-left', left + 'px');
  bar.style.setProperty('--indicator-width', rect.width + 'px');
  bar.style.setProperty('--indicator-height', rect.height + 'px');
}

qsa('.button-bar button').forEach((btn) => {
  btn.addEventListener('click', () => {
    qsa('.button-bar button').forEach((b) => b.classList.remove('active'));

    btn.classList.add('active');

    moveIndicator();
  });
});

//================================================================================//
//                🔥🔥🔥🔥🔥EMPLOYEE PAGE SCRIPT🔥🔥🔥🔥🔥
//=============================================================================//

function fillEmpDetails(empHRIS) {
  if (!window.empCalcHeaders) return;
  const headers = window.empCalcHeaders;
  // 🔥 CLEAR IF EMPTY
  if (!empHRIS || empHRIS === 'Select') {
    headers.forEach((col) => {
      const el = id(col);
      if (el) {
        el.textContent = '';
      }
    });
    return;
  }

  const rows = window.empCalcRows;
  const hrisIdx = headers.indexOf('HRIS');
  const row = rows.find((r) => String(r[hrisIdx] || '').trim() === String(empHRIS).trim());

  if (!row) {
    headers.forEach((col) => {
      const el = id(col);
      if (el) {
        el.textContent = '';
      }
    });
    return;
  }

  headers.forEach((col, i) => {
    const el = id(col);
    if (el) {
      el.textContent = row[i] ?? '';
    }
  });
}

function clearEmpPage() {
  // 🔥 CLEAR ALL TABLE CELLS
  qsa('#EmpPage td[id]').forEach((el) => {
    el.textContent = '';
  });
}

function renderEmpLeaveTable() {
  const leaveType = id('EmpLeaveSelect')?.value;
  const empHRIS = id('EmpPage_Emp')?.value;
  console.log(leaveType, empHRIS);

  const table = id('EmpLeaveTbl');
  if (!table || !leaveType || !empHRIS) return;

  const headerRow = id('EmpLeaveHeaderRow');
  const tbody = table.querySelector('tbody');

  if (!headerRow || !tbody) return;

  tbody.innerHTML = '';

  // Get employee initials from empCalcData
  const empHeaders = window.empCalcHeaders || [];
  const empRows = window.empCalcRows || [];

  const hrisIndex = empHeaders.indexOf('HRIS');
  const iniIndex = empHeaders.indexOf('Initials');

  if (hrisIndex === -1 || iniIndex === -1) {
    console.warn('HRIS or Initials column not found in empCalcHeaders');
    return;
  }

  const empRow = empRows.find((row) => String(row[hrisIndex] || '').trim() === String(empHRIS).trim());

  if (!empRow) {
    tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:20px;font-weight:600;color:#555;">
                        ==============🚫No Data found🚫==============
                    </td>
                </tr>
            `;
    return;
  }

  const initials = String(empRow[iniIndex] || '').trim();

  // Get Coff Data indexes
  const coffHeaders = coffData.headers || [];
  const coffRows = coffData.rows || [];

  const initialsIndex = coffHeaders.indexOf('Employee Name');
  const leaveTypeIndex = coffHeaders.indexOf('Leave Type');
  const claimedDateIndex = coffHeaders.indexOf('Claimed Date');
  const dutyDateIndex = coffHeaders.indexOf('Duty Date');
  const actualDutyIndex = coffHeaders.indexOf('Actual Duty');
  const extraDutyIndex = coffHeaders.indexOf('Extra Duty');
  const detailsIndex = coffHeaders.indexOf('Details');

  const records = coffRows.filter((row) => String(row[initialsIndex] || '').trim() === initials && String(row[leaveTypeIndex] || '').trim() === leaveType);

  // Build Header
  if (leaveType === 'C/O') {
    headerRow.innerHTML = `
                <tr>
                    <th>Type of Leave</th>
                    <th>Duty Date</th>
                    <th>Normal Duty</th>
                    <th>Extra Duty</th>
                    <th>Claimed Date</th>
                    <th>Details</th>
                </tr>
            `;
  } else {
    headerRow.innerHTML = `
                <tr>
                    <th>Type of Leave</th>
                    <th colspan="5">Applied Date</th>
                </tr>
            `;
  }

  if (!records.length) {
    tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:20px;font-weight:600;color:#555;">
                        ==============🚫No Data found🚫==============
                    </td>
                </tr>
            `;
    return;
  }

  // Build Rows
  records.forEach((row) => {
    const tr = document.createElement('tr');

    if (leaveType === 'C/O') {
      tr.innerHTML = `
                    <td>${row[leaveTypeIndex] || ''}</td>
                    <td>${row[dutyDateIndex] || ''}</td>
                    <td>${row[actualDutyIndex] || ''}</td>
                    <td>${row[extraDutyIndex] || ''}</td>
                    <td>${row[claimedDateIndex] || ''}</td>
                    <td>${row[detailsIndex] || ''}</td>
                `;
    } else {
      tr.innerHTML = `
                    <td>${row[leaveTypeIndex] || ''}</td>
                    <td colspan="5">${row[claimedDateIndex] || ''}</td>
                `;
    }

    tbody.appendChild(tr);
  });
}

id('EmpPage_Emp')?.addEventListener('change', renderEmpLeaveTable);
id('EmpLeaveSelect')?.addEventListener('change', renderEmpLeaveTable);
