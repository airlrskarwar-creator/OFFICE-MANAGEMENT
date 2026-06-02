//================================================= DG LOG BOOK PAGE SCRIPT ================================= //
function findDGheader(name) {
  const headers = dgData?.headers || [];

  return headers.findIndex((h) => String(h).replace(/\s+/g, ' ').trim().toLowerCase() === name.toLowerCase());
}

/* ==================🔥 DG MAP FOR EACH STATION====================== */
const stationDGData = {
  'AV KARWAR': ['62.5KVA', '40KVA'],
  'AV DHARWAD': ['100KVA', '55KVA']
};

/* =====================🔥 DG HSD CONSUMPTION MAP (AVG MILAGE)==================== */

const DG_HSD_MAP = {
  'AV KARWAR': { '62.5KVA': 7, '40KVA': 10 },

  'AV DHARWAD': { '70KVA': 8, '50KVA': 11 }
};

/* 🔥 LOAD DG LIST */
/* ============================================================================
          ⚡ HIGH-SPEED DG STATION LIST & MONTH CACHING
      ============================================================================ */
function loadDGList() {
  const station = id('DGPage_Station')?.value || '';
  const dgSelect = id('StationDGList');
  if (!dgSelect) return;

  const dgList = stationDGData[station] || [];
  let htmlBuffer = '';

  // Use an 'ALL' option if this acts as a master filter, otherwise populate directly
  htmlBuffer += `<option value="ALL">All DG</option>`;

  for (let i = 0; i < dgList.length; i++) {
    htmlBuffer += `<option value="${dgList[i]}">${dgList[i]}</option>`;
  }

  dgSelect.innerHTML = htmlBuffer;
  SyncAllPage();
}

function loadDGMonthsByFY() {
  if (!dgData || !dgData.rows || !dgData.headers) {
    console.warn('❌ dgData not loaded');
    return;
  }

  const select = id('DGPage_Month');
  const fySelect = id('DGPage_FY');

  if (!select || !fySelect) return;

  const selectedFY = fySelect.value || '';

  /* =====================================
        🚫 INVALID FY
        ===================================== */

  if (!selectedFY || selectedFY === 'Select FY') {
    select.innerHTML = `
            <option value="Select Month">
              Select Month
            </option>
          `;

    select.value = 'Select Month';

    select.disabled = true;

    return;
  }

  /* =====================================
        ✅ ENABLE MONTH
        ===================================== */

  select.disabled = false;

  const monthMap = new Map();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Cache index
  const idxDate = dgData.headers.indexOf('Date');

  if (idxDate === -1) return;

  const rows = dgData.rows;

  for (let i = 0; i < rows.length; i++) {
    const dateStr = String(rows[i][idxDate] || '').trim();

    if (!dateStr) continue;

    const parts = dateStr.split('-');

    if (parts.length !== 3) continue;

    const mm = parseInt(parts[1], 10);
    const yyyy = parts[2];

    if (!mm || !yyyy) continue;

    const monthStr = `${monthNames[mm - 1]}-${yyyy}`;

    const year = parseInt(yyyy, 10);

    const fy = mm >= 4 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;

    if (fy !== selectedFY) continue;

    const key = `${yyyy}-${String(mm).padStart(2, '0')}`;

    monthMap.set(key, monthStr);
  }

  const sortedMonths = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map((e) => e[1]);

  let htmlBuffer = `
          <option value="ALL">All Months</option>
        `;

  for (let i = 0; i < sortedMonths.length; i++) {
    htmlBuffer += `
            <option value="${sortedMonths[i]}">
              ${sortedMonths[i]}
            </option>
          `;
  }

  select.innerHTML = htmlBuffer;
  select.value = 'ALL';
  select.disabled = false;
  //select.dispatchEvent(new Event('change'));
}

/* ============================================================================
          ⚡ OPTIMIZED FILTER TABLE ENGINE (O(N) Scans & Cache Blocks)
      ============================================================================ */
function getDGFilteredRows() {
  const selectedFY = id('DGPage_FY')?.value || '';
  const selectedMonth = id('DGPage_Month')?.value || '';
  /* =====================================
        🚫 INVALID FILTER STATES
        ===================================== */

  if (!selectedFY || selectedFY === 'Select FY') {
    return [];
  }

  if (!selectedMonth || selectedMonth === 'Select Month') {
    return [];
  }

  // 🌟 CRITICAL FIX: Filtering table data directly by the DG Station List value
  const selectedDG = id('StationDGList')?.value || '';
  const selectedPurpose = id('DGPage_Purpose')?.value || '';

  const allRows = Array.isArray(dgData?.rows) ? dgData.rows : [];
  const headers = dgData?.headers || [];
  if (!allRows.length || !headers.length) return [];

  const idxDate = headers.indexOf('Date');
  const idxDG = headers.indexOf('DG Name');
  const idxPurpose = headers.indexOf('Purpose');

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const filteredRows = [];
  const len = allRows.length;

  for (let i = 0; i < len; i++) {
    const row = allRows[i];
    if (!row) continue;

    const dateStr = String(row[idxDate] || '').trim();
    if (!dateStr) continue;

    const parts = dateStr.split('-');
    if (parts.length !== 3) continue;

    const mm = parseInt(parts[1], 10);
    const yyyy = parts[2];
    const rowMonth = `${monthNames[mm - 1]}-${yyyy}`;
    const year = parseInt(yyyy, 10);
    const rowFY = mm >= 4 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;

    const rowDG = String(row[idxDG] || '').trim();
    const rowPurpose = String(row[idxPurpose] || '').trim();

    if (selectedFY && selectedFY !== 'ALL' && rowFY !== selectedFY) continue;
    if (selectedMonth && selectedMonth !== 'ALL' && rowMonth !== selectedMonth) continue;
    if (selectedDG && selectedDG !== 'ALL' && rowDG !== selectedDG) continue;
    if (selectedPurpose && selectedPurpose !== 'ALL' && rowPurpose !== selectedPurpose) continue;

    filteredRows.push(row);
  }

  filteredRows.sort((a, b) => {
    const da = String(a[idxDate] || '').split('-');
    const db = String(b[idxDate] || '').split('-');
    if (da.length !== 3 || db.length !== 3) return 0;
    return new Date(da[2], da[1] - 1, da[0]) - new Date(db[2], db[1] - 1, db[0]);
  });

  return filteredRows;
}

function buildDGRowHTML(row, headers, hiddenCols, rowIndex) {
  let html = `<tr class="DGdataRow" data-rowindex="${rowIndex}">`;

  for (let i = 0; i < headers.length; i++) {
    if (hiddenCols.includes(i)) continue;

    const value = row[i] ?? '';
    const lowerValue = String(value).toLowerCase().trim();
    let cellStyle = '';

    if (lowerValue.includes('failure')) {
      cellStyle = 'background:#dc2626; color:white; font-weight:bold;';
    } else if (lowerValue.includes('test')) {
      cellStyle = 'background:#16a34a; color:white; font-weight:bold;';
    }

    html += `<td style="${cellStyle}">${value}</td>`;
  }
  html += `</tr>`;
  return html;
}

function filterDGTable() {
  const wrapper = qs('.DGlogTableWrapper');
  if (!wrapper) return;

  const headers = dgData?.headers || [];
  const hiddenColumnNames = ['Sr No', 'Entry ID', 'Station', 'DG Name', 'Staff'];
  const hiddenCols = headers.map((h, i) => (hiddenColumnNames.includes(String(h).trim()) ? i : -1)).filter((i) => i !== -1);

  const tbodyData = getDGFilteredRows();
  const selectedMonth = id('DGPage_Month')?.value || '';
  const selectedFY = id('DGPage_FY')?.value || '';
  const station = id('DGPage_Station')?.value || '';

  const visibleHeaders = headers.filter((_, i) => !hiddenCols.includes(i));
  const groupedMonths = {};
  const idxDate = headers.indexOf('Date');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < tbodyData.length; i++) {
    const row = tbodyData[i];
    const parts = String(row[idxDate] || '')
      .trim()
      .split('-');
    if (parts.length !== 3) continue;

    const month = `${monthNames[parseInt(parts[1], 10) - 1]}-${parts[2]}`;
    if (!groupedMonths[month]) groupedMonths[month] = [];
    groupedMonths[month].push(row);
  }

  const sortedMonths = Object.keys(groupedMonths);

  let html = '';

  /* =====================================================
        🔥 HTML GENERATOR STREAM
        ===================================================== */
  const compileTableLayout = (monthLabel, monthRows) => {
    let tbHTML = `
            <div class="DGPrintMonthBlock">

              <table class="data-table DGprint-table">

                <colgroup>
                  ${headers
                    .map((_, i) => {
                      if (hiddenCols.includes(i)) return '';

                      return `
                        <col style="
                          width:${i === 0 ? '90px' : '4.5%'};
                        ">
                      `;
                    })
                    .join('')}
                </colgroup>

                <thead>

                  <tr class="DGPrintHeaderRow">
                    <th colspan="${visibleHeaders.length}">

                      <div class="DGPrintHeaderBox">

                        <div class="DGPrintLogo">
                          <img src="https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l">
                        </div>

                        <div class="DGPrintTitle">
                          <div>PRASAR BHARATI</div>
                          <div>INDIA'S PUBLIC SERVICE BROADCASTER</div>
                          <div>ALL INDIA RADIO</div>
                          <div>${station}</div>

                          <div class="DGPrintFY">
                            FY - ${selectedFY}
                          </div>
                        </div>

                      </div>

                    </th>
                  </tr>

                  <tr class="DGMonthRepeatRow">
                    <th
                      colspan="${visibleHeaders.length}"
                      style="
                        text-align:center;
                        font-weight:bold;
                        padding:5px;
                        font-size:12px;
                        border-top:double black;
                        border-bottom:double black;
                        background:white !important;
                        color:black !important;
                      "
                    >
                      DG Log book for the Month of ${monthLabel}
                    </th>
                  </tr>

                  <tr class="DGColumnHeaderRow">
                    ${headers.map((h, i) => (hiddenCols.includes(i) ? '' : `<th>${h}</th>`)).join('')}
                  </tr>

                </thead>

                <tbody>
          `;

    // 🔥 ROWS
    for (let i = 0; i < monthRows.length; i++) {
      tbHTML += buildDGRowHTML(monthRows[i], headers, hiddenCols, dgData.rows.indexOf(monthRows[i]));
    }

    /* =========================================
          🔥 NO DATA ROW
          ========================================= */

    if (!monthRows.length || selectedFY === 'Select FY') {
      tbHTML += `
              <tr class="DGNoDataRow">

                <td
                  colspan="${visibleHeaders.length}"
                  style="
                    background:#edebb7;
                    text-align:center;
                    padding:20px;
                    font-weight:700;
                    color:#ef4444;
                    font-size:14px;
                  "
                >
                  ==============🚫 No Data Found 🚫==============
                </td>

              </tr>
            `;
    }

    tbHTML += `
                </tbody>
              </table>

            </div>
          `;

    return tbHTML;
  };

  /* =====================================================
        🔥 RENDER
        ===================================================== */

  if (selectedMonth === 'ALL') {
    for (let i = 0; i < sortedMonths.length; i++) {
      html += compileTableLayout(sortedMonths[i], groupedMonths[sortedMonths[i]]);
    }
  } else {
    html += compileTableLayout(selectedMonth, tbodyData);
  }

  wrapper.innerHTML = html;

  /* =====================================================
        🔥 ROW CLICK (Pre-cached Header Offsets for O(1) reads)
        ===================================================== */
  const idxFrom = headers.indexOf('From');
  const idxTo = headers.indexOf('To');
  const idxDuration = headers.indexOf('Total Duration (hrs)');
  const idxPurpose = headers.indexOf('Purpose');
  const idxHMR = headers.indexOf('HMR');
  const idxHSD = headers.indexOf('Diesel Level (ltrs)');
  const idxHSDFill = headers.indexOf('Diesel Filled (ltrs)');
  const idxPressure = headers.indexOf('Pressure (kg/cm²)');
  const idxTemp = headers.indexOf('Temperature (°C)');
  const idxDGName = headers.indexOf('DG Name');

  // Phase offsets
  const idxVRY = headers.indexOf('V(R-Y) volts');
  const idxVBR = headers.indexOf('V(Y-B) volts');
  const idxVYB = headers.indexOf('V(B-R) volts');
  const idxVRN = headers.indexOf('V(R-N) volts');
  const idxVYN = headers.indexOf('V(Y-N) volts');
  const idxVBN = headers.indexOf('V(B-N) volts');
  const idxIR = headers.indexOf('I(R) amps');
  const idxIY = headers.indexOf('I(Y) amps');
  const idxIB = headers.indexOf('I(B) amps');

  const rowsNodes = wrapper.querySelectorAll('.DGdataRow');
  for (let i = 0; i < rowsNodes.length; i++) {
    const tr = rowsNodes[i];
    tr.addEventListener('click', () => {
      // 🔥 Quick-clear single active node
      const activeNode = wrapper.querySelector('.DGactiveRow');
      if (activeNode) activeNode.classList.remove('DGactiveRow');

      id('calcHMR').textContent = '';
      id('DGstopTimeError').textContent = '';
      id('CalcHSDLevel').textContent = '';

      tr.classList.add('DGactiveRow');
      const rowIndex = Number(tr.dataset.rowindex);
      const row = dgData.rows[rowIndex];
      if (!row) return;

      const currentDate = String(row[idxDate] || '').trim();
      const currentStart = String(row[idxFrom] || '').trim();
      const currentDG = String(row[idxDGName] || '').trim();

      const [cd, cm, cy] = currentDate.split('-').map(Number);
      const [csh, csm] = currentStart.split(':').map(Number);
      const currentDateTime = new Date(cy, cm - 1, cd, csh, csm).getTime();

      let latestPreviousTime = 0;
      let previousHMR = '';
      let previousHSD = '';

      for (let j = 0; j < dgData.rows.length; j++) {
        const r = dgData.rows[j];
        const rowDate = String(r[idxDate] || '').trim();
        const rowStart = String(r[idxFrom] || '').trim();

        if (!rowDate || !rowStart || String(r[idxDGName] || '').trim() !== currentDG) continue;

        const [rd, rm, ry] = rowDate.split('-').map(Number);
        const [rsh, rsm] = rowStart.split(':').map(Number);
        const rowDateTime = new Date(ry, rm - 1, rd, rsh, rsm).getTime();

        if (rowDateTime < currentDateTime && rowDateTime > latestPreviousTime) {
          latestPreviousTime = rowDateTime;
          previousHMR = r[idxHMR] || '';
          previousHSD = r[idxHSD] || '';
        }
      }

      const hmrSpan = id('DGhmrSPAN');
      if (hmrSpan) hmrSpan.textContent = previousHMR !== '' ? `(${previousHMR})` : '';

      const hsdSpan = id('DGhsdSPAN');
      if (hsdSpan) hsdSpan.textContent = previousHSD !== '' ? `(${previousHSD})` : '';

      const dateParts = currentDate.split('-');
      if (dateParts.length === 3) {
        id('DGdate').value = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      }

      id('StationDGList').value = row[idxDGName] || '';
      id('DGstartTime').value = row[idxFrom] || '';
      id('DGstopTime').value = row[idxTo] || '';
      id('DGduration').value = row[idxDuration] || '';
      id('DGoperationPurpose').value = row[idxPurpose] || 'Failure';

      id('DGVRY').value = row[idxVRY] || '';
      id('DGVBR').value = row[idxVBR] || '';
      id('DGVYB').value = row[idxVYB] || '';
      id('DGVRN').value = row[idxVRN] || '';
      id('DGVYN').value = row[idxVYN] || '';
      id('DGVBN').value = row[idxVBN] || '';

      id('DGIR').value = row[idxIR] || '';
      id('DGIY').value = row[idxIY] || '';
      id('DGIB').value = row[idxIB] || '';

      id('DGhsdLevel').value = row[idxHSD] || '';
      id('DGhsdFill').value = row[idxHSDFill] || '';
      id('DGpressure').value = row[idxPressure] || '';
      id('DGtemp').value = row[idxTemp] || '';
      id('HMR').value = row[idxHMR] || '';
    });
  }

  /* =========================================
        🔥 OUTSIDE CLICK CLEAR
        ========================================= */
  document.addEventListener(
    'click',
    (e) => {
      if (e.target.closest('.DGdataRow') || e.target.closest('.EBdataRow') || e.target.closest('.DGPanel') || e.target.closest('.DGpanelDiv')) {
        return;
      }
      const activeNode = wrapper.querySelector('.DGactiveRow');
      if (activeNode) activeNode.classList.remove('DGactiveRow');
    },
    { passive: true }
  );
}

/* =========================================
            🔥 CLEAR DG INPUTS
            ========================================= */

function clearDGInputs() {
  ['DGstartTime', 'DGstopTime', 'DGduration', 'DGhsdFill', 'DGhsdLevel', 'DGpressure', 'DGtemp', 'HMR', 'DGVRY', 'DGVBR', 'DGVYB', 'DGVRN', 'DGVYN', 'DGVBN', 'DGIR', 'DGIY', 'DGIB'].forEach((idName) => {
    const el = id(idName);

    if (el) el.value = '';
  });

  id('DGoperationPurpose').value = 'Failure';
  id('calcHMR').textContent = '';
  id('DGstopTimeError').textContent = '';
  id('CalcHSDLevel').textContent = '';

  /* =========================================
              🔥 REMOVE ACTIVE ROW
              ========================================= */

  qsa('.DGdataRow').forEach((r) => {
    r.classList.remove('DGactiveRow');
  });
}

/* =========================================
            🔥 AUTO CALCULATE DURATION
            ========================================= */

function calculateDGDuration() {
  const start = id('DGstartTime')?.value;

  const stop = id('DGstopTime')?.value;

  if (!start || !stop) return;

  const [sh, sm] = start.split(':').map(Number);

  const [eh, em] = stop.split(':').map(Number);

  let startMin = sh * 60 + sm;

  let endMin = eh * 60 + em;

  /* =========================================
              🔥 INVALID TIME
              ========================================= */

  if (endMin < startMin) {
    id('DGduration').value = '00:00';

    id('HMR').value = '';

    const calcSpan = id('calcHMR');

    if (calcSpan) {
      calcSpan.textContent = '';
    }

    return;
  }

  /* =========================================
              🔥 DURATION
              ========================================= */

  const diff = endMin - startMin;

  const hrs = Math.floor(diff / 60);

  const mins = diff % 60;

  const duration = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  id('DGduration').value = duration;

  /* =========================================
              🔥 ROUND HOURS
              ========================================= */

  const roundedHours = mins >= 30 ? hrs + 1 : hrs;

  /* =========================================
              🔥 ACTIVE ROW
              ========================================= */

  const activeRow = document.querySelector('.DGactiveRow');

  let previousHMR = 0;
  let previousHSD = 0;

  const station = id('DGPage_Station')?.value?.trim() || '';

  const dgName = id('StationDGList')?.value?.trim() || '';

  const dgConsumption = DG_HSD_MAP?.[station]?.[dgName] || 0;

  /* =========================================
              🔥 EDIT MODE
              ========================================= */

  if (activeRow) {
    const rowIndex = Number(activeRow.dataset.rowindex || -1);

    const currentRow = dgData?.rows?.[rowIndex];

    if (currentRow) {
      /* =====================================
                  🔥 CURRENT VALUES
                  ===================================== */

      const currentHMR = Number(currentRow[findDGheader('HMR')] || 0);

      const currentDurationStr = String(currentRow[findDGheader('Total Duration (hrs)')] || '00:00');

      const [dh, dm] = currentDurationStr.split(':').map(Number);

      const oldRounded = dm >= 30 ? dh + 1 : dh;

      const basePreviousHMR = currentHMR - oldRounded;

      const basePreviousHSDlevel = Number(currentRow[findDGheader('Diesel Level (ltrs)')] || 0);

      /* =====================================
                  🔥 OLD RANGE
                  ===================================== */

      const oldStart = String(currentRow[findDGheader('From')] || '');

      const oldStop = String(currentRow[findDGheader('To')] || '');

      const oldStartParts = oldStart.split(':').map(Number);

      const oldStopParts = oldStop.split(':').map(Number);

      const oldStartMin = oldStartParts[0] * 60 + oldStartParts[1];

      const oldStopMin = oldStopParts[0] * 60 + oldStopParts[1];

      /* =====================================
                  🔥 NEW RANGE
                  ===================================== */

      const newStartMin = startMin;

      const newStopMin = endMin;

      /* =====================================
                  🔥 SAME TIMELINE
                  ===================================== */

      const isSameTimeline = (newStartMin >= oldStartMin && newStartMin <= oldStopMin) || (newStopMin >= oldStartMin && newStopMin <= oldStopMin) || (newStartMin <= oldStartMin && newStopMin >= oldStopMin);

      /* =====================================
                  🔥 UPDATE EXISTING
                  ===================================== */
      if (isSameTimeline) {
        /* ===================================
                    🔥 SAME LOGIC AS HMR
                    =================================== */

        previousHMR = basePreviousHMR;

        /* ===================================
                    🔥 OLD DG LEVEL
                    =================================== */

        const oldDGLevel = Number(currentRow[findDGheader('Diesel Level (ltrs)')] || 0);

        /* ===================================
                    🔥 OLD FILLED
                    =================================== */

        const oldFilled = Number(currentRow[findDGheader('Diesel Filled (ltrs)')] || 0) || 0;

        /* ===================================
                    🔥 OLD DURATION
                    =================================== */

        const oldDieselUsed = dgConsumption * oldRounded;

        /* ===================================
                    🔥 PREVIOUS HSD
                    SAME AS HMR BASE LOGIC
                    =================================== */

        previousHSD = oldDGLevel + oldDieselUsed - oldFilled;

        activeRow.dataset.forceNew = 'false';
      } else {
        /* ===================================
                    🔥 NEW ENTRY
                    =================================== */

        previousHMR = currentHMR;

        previousHSD = Number(currentRow[findDGheader('Diesel Level (ltrs)')] || 0);

        activeRow.dataset.forceNew = 'true';
      }
    }
  } else {
    /* =========================================
              🔥 NEW ENTRY
              ========================================= */
    const currentDate = id('DGdate')?.value;

    if (currentDate) {
      const formattedDate = currentDate.split('-').reverse().join('-');

      const sortedRows = [...(dgData?.rows || [])];

      let previousRow = null;

      let latestDateTime = 0;

      for (const row of sortedRows) {
        const rowDate = String(row[findDGheader('Date')] || '');

        const rowStart = String(row[findDGheader('From')] || '');

        if (!rowDate || !rowStart) continue;

        const [rd, rm, ry] = rowDate.split('-').map(Number);

        const rowTimeParts = rowStart.split(':').map(Number);

        const rowDateTime = new Date(ry, rm - 1, rd, rowTimeParts[0], rowTimeParts[1]).getTime();

        const [cd, cm, cy] = formattedDate.split('-').map(Number);

        const currentTimeParts = start.split(':').map(Number);

        const currentDateTime = new Date(cy, cm - 1, cd, currentTimeParts[0], currentTimeParts[1]).getTime();

        /* =================================
                    🔥 PREVIOUS ENTRY
                    ================================= */

        if (rowDateTime < currentDateTime && rowDateTime > latestDateTime) {
          latestDateTime = rowDateTime;

          previousRow = row;
        }
      }

      if (previousRow) {
        previousHMR = Number(previousRow[findDGheader('HMR')] || 0);
        previousHSD = Number(previousRow[findDGheader('Diesel Level (ltrs)')] || 0);
      }
    }
  }

  /* =========================================
              🔥 FINAL HMR
              ========================================= */

  const calculatedHMR = previousHMR + roundedHours;

  /* =========================================
              🔥 SHOW PREVIOUS
              ========================================= */

  const calcSpan = id('calcHMR');

  if (calcSpan) {
    calcSpan.textContent = `(${previousHMR})`;
  }

  const hsdSpan = id('CalcHSDLevel');

  if (hsdSpan) {
    hsdSpan.textContent = `(${previousHSD})`;
  }
  /* =========================================
              🔥 SET NEW HMR
              ========================================= */

  id('HMR').value = calculatedHMR;
  //id('DGhsdLevel').value = previousHSD;

  /* =========================================
              🔥 GET DG CONSUMPTION
              🔥 HSD FILLED
              ========================================= */

  const hsdFilledRaw = String(id('DGhsdFill')?.value || '0').trim();

  const hsdFilled = hsdFilledRaw === '-' || hsdFilledRaw === '' ? 0 : Number(hsdFilledRaw);

  /* =========================================
              🔥 DIESEL USED
              ========================================= */

  const dieselUsed = dgConsumption * roundedHours;

  /* =========================================
              🔥 FINAL HSD
              ========================================= */

  const calculatedHSD = previousHSD - dieselUsed + hsdFilled;

  /* =========================================
              🔥 ROUND & SET
              ========================================= */

  id('DGhsdLevel').value = Math.max(0, Math.round(calculatedHSD));
}

/* =========================================
            🔥 UPDATE STOP TIME LIMIT
            🔥 VALIDATE STOP TIME
            ========================================= */
function validateDGStopTime() {
  const startInput = id('DGstartTime');

  const stopInput = id('DGstopTime');

  const errorSpan = id('DGstopTimeError');

  if (!startInput || !stopInput || !errorSpan) return;

  const start = startInput.value;

  const stop = stopInput.value;

  /* =========================================
              🔥 SET MIN
              ========================================= */

  stopInput.min = start || '';

  /* =========================================
              🔥 RESET ERROR
              ========================================= */

  errorSpan.textContent = '';

  if (!start || !stop) return;

  /* =========================================
              🔥 CONVERT TO MINUTES
              ========================================= */

  const [sh, sm] = start.split(':').map(Number);

  const [eh, em] = stop.split(':').map(Number);

  const startMinutes = sh * 60 + sm;

  const stopMinutes = eh * 60 + em;

  /* =========================================
              🔥 INVALID STOP TIME
              ========================================= */

  if (stopMinutes < startMinutes) {
    errorSpan.textContent = '(!< Start Time)';
    stopInput.value = startInput.value;
  }
}
/* =========================================
            🔥 EVENTS
            ========================================= */

on('DGPage_Station', 'change', () => {
  loadDGList();
  SyncAllPage();
  clearDGInputs();
  id('DGdate').value = '';
});

on('DGPage_FY', 'change', () => {
  SyncAllPage();
  clearDGInputs();
  id('DGdate').value = '';
});

on('StationDGList', 'change', () => {
  SyncAllPage();
  clearDGInputs();
  id('DGdate').value = '';
});

on('DGPage_Month', 'change', () => {
  SyncAllPage();
});

['input', 'change'].forEach((eventType) => {
  on('DGstartTime', eventType, () => {
    calculateDGDuration();
    validateDGStopTime();
  });

  on('DGstopTime', eventType, () => {
    calculateDGDuration();
    validateDGStopTime();
  });

  on('DGhsdFill', eventType, () => {
    calculateDGDuration();
  });

  on('DGdate', eventType, () => {
    clearDGInputs();
    ['DGVRY', 'DGVBR', 'DGVYB'].forEach((idName) => {
      const el = id(idName);
      if (el) el.value = '410';
    });
    ['DGVRN', 'DGVBN', 'DGVYN'].forEach((idName) => {
      const el = id(idName);
      if (el) el.value = '230';
    });
    ['DGIR', 'DGIY', 'DGIB'].forEach((idName) => {
      const el = id(idName);
      if (el) el.value = '-';
    });
    id('DGpressure').value = '470';
    id('DGtemp').value = '80';
    calculateDGDuration();
  });
});

/* ============================================================================
          ⚡ DG INPUT VALIDATION ENGINE
      ============================================================================ */
function validateDGInputs() {
  const requiredInputs = [
    { id: 'DGPage_Station', label: 'Station' },
    { id: 'StationDGList', label: 'DG Name' },
    { id: 'DGdate', label: 'DG Run Date' },
    { id: 'DGoperationPurpose', label: 'Operation Purpose' },
    { id: 'DGstartTime', label: 'Start Time' },
    { id: 'DGstopTime', label: 'Stop Time' },
    { id: 'DGhsdLevel', label: 'HSD Level' },
    { id: 'HMR', label: 'HMR Reading' }
  ];

  const invalidFields = [];
  const len = requiredInputs.length;

  for (let i = 0; i < len; i++) {
    const f = requiredInputs[i];
    const el = id(f.id);

    if (!el) continue;

    const value = String(el.value || '').trim();

    // Time fields ("00:00") are allowed, but strictly blank or exact "0" limits are caught
    if (value === '' || value === '0' || value === '0.00') {
      invalidFields.push(f.label);
      el.style.border = '2px solid #ff6b6b';
    } else {
      el.style.border = '';
    }
  }

  if (invalidFields.length > 0) {
    const pillsHTML = invalidFields.map((x) => `<span style="padding:5px 10px;border-radius:12px;background:rgba(255,0,0,.12);border:1px solid rgba(255,0,0,.25);font-size:12px;">${x}</span>`).join('');

    const msg = `
            <div style="padding:16px;text-align:center;">
              <div style="font-size:14px;font-weight:700;color:#ff8a8a;margin-bottom:12px;">
                ❌ Required Fields Missing
              </div>
              <div style="font-size:13px;opacity:.9;margin-bottom:10px;">
                Please fill valid values for:
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
                ${pillsHTML}
              </div>
            </div>
          `;

    showCustomAlert(msg);
    return false;
  }

  return true;
}

/* ============================================================================
          ⚡ OPTIMIZED DG DATA SAVE (Harmonized Alert UI & Blank Catch-All)
      ============================================================================ */
async function saveDGData() {
  try {
    setSyncStatus('dgDatabase');

    /* =====================================
          🔥 VALIDATION
          ===================================== */

    const station = id('DGPage_Station')?.value || '';
    const dgName = id('StationDGList')?.value || '';
    const dateValue = id('DGdate')?.value || '';
    const purpose = id('DGoperationPurpose')?.value || '';
    const newStart = id('DGstartTime')?.value || '';
    const newStop = id('DGstopTime')?.value || '';
    const dghsd = id('DGhsdLevel')?.value || '';
    const dghmr = id('HMR')?.value || '';

    // 1. Validation
    if (!(await validateDGInputs()) || dgName == 'ALL') {
      clearSyncStatus('dgDatabase', 'db', false);
      return;
    }

    /* ====================🔥 DATE FORMAT=============== */

    const formattedDate = dateValue.split('-').reverse().join('-');

    /* ===================🔥 CURRENT VALUES============== */

    const duration = id('DGduration')?.value || '00:00';

    /* ===============🔥 GET DATA================= */

    const headers = dgData?.headers || [];
    const rows = dgData?.rows || [];
    let existingRow = null;
    let existingIndex = -1;

    /* ===============🔥 EXISTING ENTRY ID========================== */

    let existingEntryId = '';
    const activeRow = document.querySelector('.DGactiveRow');
    if (activeRow) {
      const rowIndex = Number(activeRow.dataset.rowindex);
      const clickedRow = rows[rowIndex];
      if (clickedRow) {
        const oldDate = String(clickedRow[findDGheader('Date')] || '').trim();
        const oldDG = String(clickedRow[findDGheader('DG Name')] || '').trim();
        const oldStart = String(clickedRow[findDGheader('From')] || '').trim();
        const oldStop = String(clickedRow[findDGheader('To')] || '').trim();

        /* ===================🔥 TIME HELPERS=================== */

        const oldStartMin = timeToMinutes(oldStart);
        const oldStopMin = timeToMinutes(oldStop);
        const newStartMin = timeToMinutes(newStart);
        const newStopMin = timeToMinutes(newStop);

        /* ===================🔥 OVERLAP CHECK======================== */

        const isOverlap = (newStartMin >= oldStartMin && newStartMin <= oldStopMin) || (newStopMin >= oldStartMin && newStopMin <= oldStopMin) || (newStartMin <= oldStartMin && newStopMin >= oldStopMin);

        /* =======🔥 ONLY REUSE IF SAME SLOT================== */

        if (oldDate === formattedDate && oldDG === dgName && isOverlap) {
          existingEntryId = String(clickedRow[findDGheader('Entry ID')] || '').trim();
        }
      }
    }

    /* ===============🔥 ENTRY ID============================= */

    const entryId = existingEntryId || `${station}_${dgName}_${formattedDate}_${newStart}_${newStop}`;

    /* ==================🔥 HELPERS======================== */

    function timeToMinutes(t) {
      const [h, m] = String(t || '00:00')
        .split(':')
        .map(Number);

      return h * 60 + m;
    }

    function addTimes(t1, t2) {
      const [h1, m1] = String(t1 || '00:00')
        .split(':')
        .map(Number);

      const [h2, m2] = String(t2 || '00:00')
        .split(':')
        .map(Number);

      let mins = h1 * 60 + m1 + (h2 * 60 + m2);

      return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    }

    function formatDuration(timeStr) {
      const [h, m] = String(timeStr || '00:00')
        .split(':')
        .map(Number);

      return `=${h}/24+${m}/1440`;
    }

    /* ==============🔥 FIND EXISTING ROW======================== */

    rows.forEach((r, idx) => {
      const rowEntryId = String(r[findDGheader('Entry ID')] || '').trim();

      if (rowEntryId === entryId) {
        existingRow = r;

        existingIndex = idx;
      }
    });

    /* =================🔥 MONTH KEY====================== */

    const monthKey = formattedDate.split('-').slice(1).join('-');

    /* =====================================
                🔥 REMOVE EXISTING ROW
                ===================================== */

    const allRows = [...rows];

    if (existingIndex >= 0) {
      allRows.splice(existingIndex, 1);
    }

    /* ======================🔥 TEMP ROW======================== */

    const tempRow = ['=ROW()-1', entryId, formattedDate, station, dgName, newStart, newStop, duration, purpose];

    /* =================🔥 ADD TEMP ROW==================== */

    allRows.push(tempRow);

    /* =================🔥 FILTER SAME MONTH + SAME DG=================== */

    const sameMonthRows = allRows.filter((r) => {
      const rowMonth = String(r[findDGheader('Date')] || '')
        .split('-')
        .slice(1)
        .join('-');

      const rowDG = String(r[findDGheader('DG Name')] || '').trim();

      return rowMonth === monthKey && rowDG === dgName;
    });

    /* ==================🔥 SORT ROWS================= */

    sameMonthRows.sort((a, b) => {
      /* =================🔥 DATE================ */

      const [ad, am, ay] = String(a[findDGheader('Date')] || '')
        .split('-')
        .map(Number);

      const [bd, bm, by] = String(b[findDGheader('Date')] || '')
        .split('-')
        .map(Number);

      const aDate = new Date(ay, am - 1, ad);

      const bDate = new Date(by, bm - 1, bd);

      /* =================🔥 SORT DATE=============== */

      if (aDate.getTime() !== bDate.getTime()) {
        return aDate - bDate;
      }

      /* =================🔥 SORT TIME============================== */

      return timeToMinutes(a[findDGheader('From')] || '00:00') - timeToMinutes(b[findDGheader('From')] || '00:00');
    });

    /* ===================🔥 RESET PROGRESSIVE=========================== */
    let progressiveTestRunning = '00:00';
    let progressiveFailureRunning = '00:00';

    /* ===================🔥 RECALCULATE===================== */

    sameMonthRows.forEach((r) => {
      /* =================🔥 PURPOSE======================== */
      const rowPurpose = String(r[findDGheader('Purpose')] || '')
        .trim()
        .toLowerCase();

      /* ==================🔥 DURATION=============== */
      const rowDuration = String(r[findDGheader('Total Duration (hrs)')] || '00:00');

      /* ==================🔥 TEST / FAILURE===================== */
      if (rowPurpose === 'test') {
        progressiveTestRunning = addTimes(progressiveTestRunning, rowDuration);
      } else {
        progressiveFailureRunning = addTimes(progressiveFailureRunning, rowDuration);
      }

      /* ==================🔥 STORE TEMP===================== */
      r.__progTest = progressiveTestRunning;
      r.__progFailure = progressiveFailureRunning;
      r.__totalProg = addTimes(progressiveTestRunning, progressiveFailureRunning);
    });

    const currentTempRow = sameMonthRows.find((r) => String(r[findDGheader('Entry ID')] || '').trim() === entryId);

    const progressiveTestValue = formatDuration(currentTempRow?.__progTest || '00:00');
    const progressiveFailureValue = formatDuration(currentTempRow?.__progFailure || '00:00');
    const totalProgressiveValue = formatDuration(currentTempRow?.__totalProg || '00:00');
    const totalDuration = formatDuration(duration);

    /* =====================================
                🔥 ROW DATA
                ===================================== */

    const row = {
      'Sr No': '=ROW()-1',
      'Entry ID': entryId,
      Date: formattedDate,
      Station: station,
      'DG Name': dgName,
      From: newStart,
      To: newStop,
      'Total Duration (hrs)': totalDuration,
      Purpose: purpose,
      'Progressive Test (hrs)': progressiveTestValue,
      'Progressive Failure (hrs)': progressiveFailureValue,
      'Total Progressive (hrs)': totalProgressiveValue,
      'V(R-Y) volts': id('DGVRY')?.value || '',
      'V(Y-B) volts': id('DGVBR')?.value || '',
      'V(B-R) volts': id('DGVYB')?.value || '',
      'V(R-N) volts': id('DGVRN')?.value || '',
      'V(Y-N) volts': id('DGVYN')?.value || '',
      'V(B-N) volts': id('DGVBN')?.value || '',
      'I(R) amps': id('DGIR')?.value || '-',
      'I(Y) amps': id('DGIY')?.value || '-',
      'I(B) amps': id('DGIB')?.value || '-',
      'Diesel Level (ltrs)': id('DGhsdLevel')?.value || '',
      'Diesel Filled (ltrs)': id('DGhsdFill')?.value || '-',
      'Pressure (kg/cm²)': id('DGpressure')?.value || '',
      'Temperature (°C)': id('DGtemp')?.value || '',
      HMR: id('HMR')?.value || '',
      Staff: currentUser || ''
    };

    // 4. Diffing (Ignoring Formula columns to prevent false positives)
    const ignoreCols = ['Total Duration (hrs)', 'Progressive Test (hrs)', 'Progressive Failure (hrs)', 'Total Progressive (hrs)', 'Sr No'];
    let changedCols = [];

    if (existingRow) {
      headers.forEach((header, i) => {
        // Skip ignored columns
        if (ignoreCols.includes(header)) return;

        const oldVal = String(existingRow[i] ?? '').trim();
        const newVal = String(row[header] ?? '').trim();

        if (oldVal !== newVal) {
          changedCols.push(header);
        }
      });

      if (!changedCols.length) {
        clearSyncStatus('dgDatabase', 'db', true);
        showCustomAlert(`
                <div style="text-align:center;padding:18px;">
                  <div style="font-size:14px;font-weight:700;color:#ffe082;margin-bottom:10px;">
                    ℹ️ No Changes Detected
                  </div>
                  <div style="opacity:.8;font-size:13px;">
                    DG Log data is already up to date.
                  </div>
                </div>
              `);
        return;
      }
    }

    /* =====================================
                🔥 SAVE API
                ===================================== */

    const res = await fetch('https://office-management-f425.onrender.com/dg/update', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        data: [row]
      })
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Save failed');
    }

    let msg = '';

    /* =====================================
                🔥 UPDATED
                ===================================== */

    if (result.updated?.length) {
      const changedHTML = changedCols
        .map(
          (col) => `
                <span style="
                  display:inline-block;
                  padding:8px;
                  margin:4px;
                  border-radius:12px;
                  background:rgba(255,255,255,0.08);
                  border:1px solid rgba(255,255,255,0.06);
                  font-size:13px;">
                  🔃 ${col}
                </span>
              `
        )
        .join('');

      msg += `
              <div style="font-size:13px;font-weight:700;color:#7dffb3;margin-bottom:8px;text-align:center;">
                📝 DG LOG UPDATE SUCCESS!
              </div>

              <div style="margin-bottom:8px;padding:10px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">

                <div style="font-size:14px;font-weight:700;margin-bottom:10px;">
                  ⚡ DG Entry Updated
                </div>

                <div style="margin-bottom:5px;font-size:13px;opacity:.85;">
                  🏢 ${station}<br><br>
                  📅 ${formattedDate}<br><br>

                  Updated Columns :
                </div>

                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                  ${changedHTML}
                </div>
              </div>
            `;
    }

    /* =====================================
                🔥 ADDED
                ===================================== */

    if (result.added?.length) {
      msg += `
              <div style="font-size:13px;font-weight:700;color:#7dffb3;margin-bottom:8px;text-align:center;">
                ➕ DG LOG ADD SUCCESS!
              </div>

              <div style="padding:12px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">

                <div style="margin-bottom:6px;font-size:13px;">
                  📅 Date :
                  <b>${formattedDate}</b>
                </div>

                <div style="margin-bottom:6px;font-size:13px;">
                  🏢 Station :
                  <b>${station}</b>
                </div>

                <div style="margin-bottom:6px;font-size:13px;">
                  ⚡ DG :
                  <b>${dgName}</b>
                </div>

                <div style="font-size:13px;">
                  ⏱ Duration :
                  <b>${duration}</b>
                </div>
              </div>
            `;
    }

    /* =====================================
                🔥 REFRESH
                ===================================== */
    await fetch('https://office-management-f425.onrender.com/refresh/dg', { method: 'POST' });
    await loadTable('dg', 'DGlog');
    SyncAllPage();
    clearDGInputs();
    id('DGdate').value = '';
    clearSyncStatus('dgDatabase', 'db', true);
    showCustomAlert(msg);
  } catch (err) {
    console.error('❌ DG Save Failed:', err);
    clearSyncStatus('dgDatabase', 'db', false);
    showCustomAlert(`
            <div style="text-align:center;padding:16px;">

              <div style="font-size:14px;font-weight:700;color:#ff8a8a;margin-bottom:10px;">
                ❌ Failed to Save DG Data
              </div>

              <div style="opacity:.8;font-size:13px;">
                ${err.message || 'Unknown Error'}
              </div>

            </div>
          `);
  }
}

/* =========================================
            🔥 EB SAVE BUTTON
            ========================================= */

on('DGsaveBtn', 'click', async () => {
  await saveDGData();
});

function buildPrintDGLogHTML() {
  const wrapper = qs('.DGlogTableWrapper');

  if (!wrapper) return '';

  /* =====================================================
        🔥 GET ALL MONTH TABLES
        ===================================================== */

  const tables = wrapper.querySelectorAll('table');

  if (!tables.length) {
    showCustomAlert('❌ No data to print');

    return '';
  }

  /* =====================================================
        🔥 CREATE PRINT DOC
        ===================================================== */

  const doc = document.implementation.createHTMLDocument('DG Log Register');

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
            size:A4 landscape;
            margin:5mm 5mm 10mm 5mm;
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
            font-size:10px;
          }

          .page{
            width:100%;
            margin:0 auto;
            background:white;
          }

          /* =================================================
          🔥 RESET UI STYLES
          ================================================= */

          .DGprint-table,
          .DGprint-table *{
            position:static !important;
            transform:none !important;
            overflow:visible !important;
            z-index:auto !important;
            left:auto !important;
            right:auto !important;
            top:auto !important;
            bottom:auto !important;
            min-width:auto !important;
            max-width:none !important;
          }

          /* =================================================
          🔥 MONTH TABLE SPACING
          ================================================= */

          .DGprint-table{
            width:100% !important;
            border-collapse:collapse !important;
            table-layout:fixed !important;
            border:1px solid black !important;
            background:white !important;
            margin-bottom:12px !important;
            page-break-after:always !important;
            break-after:page !important;
          }

          /* =================================================
          🔥 TABLE CELLS
          ================================================= */

          .DGprint-table th,
          .DGprint-table td{
            border:1px solid black !important;
            padding:3px 4px !important;
            text-align:center !important;
            vertical-align:middle !important;
            font-size:10px !important;
            white-space:normal !important;
            word-break:break-word !important;
          }

          /* =================================================
          🔥 PREVENT ROW SPLIT ONLY
          ================================================= */

          tr{
            page-break-inside:avoid !important;
            break-inside:avoid !important;
          }

          /* =================================================
          🔥 DO NOT REPEAT THEAD
          ================================================= */

          thead{
            display:table-row-group !important;
          }

          /* =================================================
          🔥 PRINT HEADER ROW
          ================================================= */

          .DGPrintHeaderRow{
            display:table-row !important;
          }

          .DGPrintHeaderRow th{
            border:none !important;
            padding:0 !important;
            background:white !important;
          }

          .DGPrintHeaderRow table{
            width:100% !important;
            border-collapse:collapse !important;
            table-layout:fixed !important;
            background:white !important;
          }

          .DGPrintHeaderRow td{
            border:none !important;
            vertical-align:middle !important;
          }

          .DGPrintHeaderRow img{
            height:55px !important;
            width:auto !important;
            object-fit:contain !important;
          }

          /* =================================================
          🔥 COLUMN HEADERS
          ================================================= */

          .DGColumnHeaderRow th{
            background:#1f4f82 !important;
            color:white !important;
            font-weight:bold !important;
          }

          /* =================================================
          🔥 FY / MONTH HEADERS
          ================================================= */

          .DGFYHeader th,
          .DGMonthTitleRow th,
          .DGMonthRepeatRow th{
            background:white !important;
            color:black !important;
            font-weight:bold !important;
          }

          /* =================================================
          🔥 FIRST COLUMN
          ================================================= */

          .DGprint-table th:first-child,
          .DGprint-table td:first-child{
            width:80px !important;
            min-width:80px !important;
            max-width:80px !important;
          }

          /* =================================================
          🔥 REMOVE LAST BLANK PAGE
          ================================================= */

          .DGprint-table:last-child{
            page-break-after:auto !important;
            break-after:auto !important;
          }

          /* =================================================
          🔥 REMOVE UI
          ================================================= */

          .no-print,
          button{
            display:none !important;
          }

        `;

  doc.head.appendChild(style);

  /* =====================================================
        🔥 CONTAINER
        ===================================================== */

  const container = doc.createElement('div');

  /* =====================================================
        🔥 CLONE TABLES
        ===================================================== */

  tables.forEach((table) => {
    const clone = table.cloneNode(true);

    clone.classList.add('DGprint-table');

    /* =========================================
          🔥 REMOVE UI ELEMENTS
          ========================================= */

    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

    /* =========================================
          🔥 REMOVE INLINE UI STYLES
          ========================================= */

    clone.querySelectorAll('*').forEach((el) => {
      el.style.position = '';

      el.style.top = '';

      el.style.left = '';

      el.style.right = '';

      el.style.bottom = '';

      el.style.transform = '';

      el.style.translate = '';

      el.style.scale = '';

      el.style.overflow = '';

      el.style.overflowX = '';

      el.style.overflowY = '';

      el.style.zIndex = '';

      el.style.minWidth = '';

      el.style.maxWidth = '';
    });

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

async function exportDGLogExcel() {
  /* =========================================================
        🔥 WORKBOOK
        ========================================================= */

  const workbook = new ExcelJS.Workbook();

  /* =========================================================
        🔥 TABLES
        ========================================================= */

  const wrapper = qs('.DGlogTableWrapper');

  if (!wrapper) {
    showCustomAlert('❌ DG Log wrapper not found');

    return;
  }

  const tables = wrapper.querySelectorAll('table');

  if (!tables.length) {
    showCustomAlert('❌ No DG tables found');

    return;
  }

  /* =========================================================
        🔥 FILTER VALUES
        ========================================================= */

  const selectedMonth = id('DGPage_Month')?.value || '';

  const selectedFY = id('DGPage_FY')?.value || '';

  const station = id('DGPage_Station')?.value || '';

  const isAllMonths = selectedMonth === 'ALL';

  /* =========================================================
        🔥 BORDER
        ========================================================= */

  const FULL_BORDER = {
    top: {
      style: 'thin',
      color: { argb: 'FF000000' }
    },

    left: {
      style: 'thin',
      color: { argb: 'FF000000' }
    },

    bottom: {
      style: 'thin',
      color: { argb: 'FF000000' }
    },

    right: {
      style: 'thin',
      color: { argb: 'FF000000' }
    }
  };

  /* =========================================================
        🔥 LOGO
        ========================================================= */

  let imageId = null;

  try {
    const base64 = await urlToBase64('https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l');

    imageId = workbook.addImage({
      base64,
      extension: 'png'
    });
  } catch (e) {
    console.warn('Logo load failed', e);
  }

  /* =========================================================
        🔥 EXPORT TABLES
        ========================================================= */

  tables.forEach((table, tableIndex) => {
    /* =====================================================
          🔥 SHEET NAME
          ===================================================== */

    let sheetName = 'DG Log Book';

    if (isAllMonths) {
      const monthText = table.querySelector('.DGMonthRepeatRow th, .DGMonthTitleRow th')?.innerText?.replace('DG Log book for the Month of', '')?.trim() || `Month_${tableIndex + 1}`;

      sheetName = monthText;
    }

    /* =====================================================
          🔥 CREATE SHEET
          ===================================================== */

    const sheet = workbook.addWorksheet(sheetName.substring(0, 31));

    /* =====================================================
          🔥 HEADER CELLS
          ===================================================== */

    const headerCells = table.querySelectorAll('thead tr:last-child th');

    const totalCols = headerCells.length;

    /* =====================================================
          🔥 COLUMN WIDTHS
          ===================================================== */

    sheet.columns = Array.from(headerCells).map((_, i) => ({
      width: i === 0 ? 12 : 8
    }));

    /* =====================================================
          🔥 MAIN HEADER
          ===================================================== */

    sheet.mergeCells(1, 1, 1, totalCols);

    const mainHeader = sheet.getCell(1, 1);

    mainHeader.value = {
      richText: [
        {
          text: 'PRASAR BHARATI\n',

          font: {
            bold: true,
            size: 12
          }
        },

        {
          text: "INDIA'S PUBLIC SERVICE BROADCASTER\n",

          font: {
            bold: true,
            size: 12
          }
        },

        {
          text: `ALL INDIA RADIO - ${station}\n`,

          font: {
            bold: true,
            size: 12
          }
        },

        {
          text: `(${selectedFY})`,

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

    sheet.getRow(1).height = 85;

    /* =====================================================
          🔥 LOGO
          ===================================================== */

    if (imageId !== null) {
      sheet.addImage(imageId, {
        tl: {
          col: 0.15,
          row: 0.12
        },

        ext: {
          width: 58,
          height: 58
        }
      });
    }

    /* =====================================================
          🔥 COPY TABLE HEADERS
          ===================================================== */

    let currentRow = 2;

    /* =====================================================
          🔥 REMOVE PRINT HEADER ROW
          ===================================================== */

    const theadRows = Array.from(table.querySelectorAll('thead tr')).filter((tr) => !tr.classList.contains('DGPrintHeaderRow'));

    theadRows.forEach((tr) => {
      const excelRow = sheet.getRow(currentRow);

      const ths = tr.querySelectorAll('th');

      let colIndex = 1;

      ths.forEach((th) => {
        const colspan = parseInt(th.colSpan || 1);

        const rowspan = parseInt(th.rowSpan || 1);

        while (sheet.getCell(currentRow, colIndex).value !== null) {
          colIndex++;
        }

        if (colspan > 1 || rowspan > 1) {
          sheet.mergeCells(
            currentRow,
            colIndex,

            currentRow + rowspan - 1,

            colIndex + colspan - 1
          );
        }

        const cell = sheet.getCell(currentRow, colIndex);

        cell.value = th.innerText.trim();

        /* ===============================================
              🔥 STYLE
              =============================================== */

        cell.font = {
          bold: true,

          color: {
            argb: 'FFFFFFFF'
          },

          size: 10
        };

        cell.fill = {
          type: 'pattern',

          pattern: 'solid',

          fgColor: {
            argb: 'FF1F4E79'
          }
        };

        cell.alignment = {
          horizontal: 'center',

          vertical: 'middle',

          wrapText: true
        };

        cell.border = FULL_BORDER;

        colIndex += colspan;
      });

      excelRow.height = 32;
      if (currentRow === 3) {
        excelRow.height = 70;
      }
      currentRow++;
    });

    /* =====================================================
          🔥 COPY TABLE BODY
          ===================================================== */

    const tbodyRows = table.querySelectorAll('tbody tr');

    tbodyRows.forEach((tr, rowIndex) => {
      const excelRow = sheet.getRow(currentRow);

      const tds = tr.querySelectorAll('td');

      tds.forEach((td, i) => {
        const cell = excelRow.getCell(i + 1);

        /* =====================================================
              🔥 RAW VALUE
              ===================================================== */

        const rawValue = td.innerText.trim();

        /* =====================================================
              🔥 NUMBER
              ===================================================== */

        if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
          cell.value = Number(rawValue);
        } else if (/^\d{1,2}:\d{2}$/.test(rawValue)) {
          /* =====================================================
              🔥 TIME / HOURS
              ===================================================== */
          const parts = rawValue.split(':');

          const hh = parseInt(parts[0], 10);

          const mm = parseInt(parts[1], 10);

          /* ===============================================
                🔥 STORE AS EXCEL TIME
                =============================================== */

          cell.value = (hh * 60 + mm) / 1440;

          /* ===============================================
                🔥 DISPLAY FORMAT
                =============================================== */

          cell.numFmt = '[h]:mm';
        } else {
          /* =====================================================
              🔥 DEFAULT TEXT
              ===================================================== */
          cell.value = rawValue;
        }

        cell.alignment = {
          horizontal: 'center',

          vertical: 'middle',

          wrapText: true
        };

        cell.border = FULL_BORDER;

        /* ===============================================
              🔥 ALTERNATE ROW
              =============================================== */

        if (rowIndex % 2 === 0) {
          cell.fill = {
            type: 'pattern',

            pattern: 'solid',

            fgColor: {
              argb: 'FFF7F7F7'
            }
          };
        }

        /* ===============================================
              🔥 FAILURE COLOR
              =============================================== */

        if (td.innerText.toLowerCase().includes('failure')) {
          cell.font = {
            bold: true,

            color: {
              argb: 'FFFF0000'
            }
          };
        } else if (td.innerText.toLowerCase().includes('test')) {
          cell.font = {
            bold: true,

            color: {
              argb: 'FF008000'
            }
          };
        }
      });

      excelRow.height = 24;

      currentRow++;
    });

    /* =====================================================
          🔥 PAGE SETUP
          ===================================================== */

    sheet.pageSetup = {
      paperSize: 9,

      orientation: 'landscape',

      fitToPage: true,

      fitToWidth: 1,

      fitToHeight: 0,

      horizontalCentered: true,

      verticalCentered: false,

      margins: {
        left: 0.2,

        right: 0.2,

        top: 0.3,

        bottom: 0.3,

        header: 0.2,

        footer: 0.2
      }
    };

    /* =====================================================
          🔥 REPEAT ROWS
          ===================================================== */

    sheet.pageSetup.printTitlesRow = '1:4';
  });

  /* =========================================================
        🔥 FILE NAME
        ========================================================= */

  const fileName = isAllMonths ? `DG_Log_Book_${selectedFY}.xlsx` : `DG_Log_Book_${selectedMonth}.xlsx`;

  /* =========================================================
        🔥 EXPORT
        ========================================================= */

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }),

    fileName
  );
}

on('DGexcelBtn', 'click', () => {
  exportDGLogExcel();
});

on('DGprintBtn', 'click', () => {
  openPrintWindow(buildPrintDGLogHTML());
});
