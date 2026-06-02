//=================================================== Electricity Bill Page =======================================//

/* =====================================================
      🔥 EB BILL AMOUNT FORMATTER
      ===================================================== */

const EBBillAmountInput = id('EBbillAmount');

if (EBBillAmountInput) {
  /* ===============================================
        🔥 FOCUS
        =============================================== */

  EBBillAmountInput.addEventListener('focus', () => {
    EBBillAmountInput.value = CurrencytoNum(EBBillAmountInput.value);
  });

  /* ===============================================
        🔥 BLUR
        =============================================== */

  EBBillAmountInput.addEventListener('blur', () => {
    EBBillAmountInput.value = formatCurrency(CurrencytoNum(EBBillAmountInput.value));
  });
}
/* =====================================
            🔥 STATION CHANGE
            GET LAST UPDATED RR / ID / TARIFF
            ===================================== */

let rrspanText = '';

let idspanText = '';

let tariffspanText = '';

on('EBPage_Station', 'change', () => {
  if (!ebData?.headers || !ebData?.rows) return;

  const station = String(id('EBPage_Station')?.value || '').trim();
  const fy = String(id('EBPage_FY')?.value || '').trim();
  const headers = ebData.headers;
  const allRows = [...ebData.rows];

  /* =====================================
        🔥 HEADER INDEXES
        ===================================== */

  const findHeader = (name) => headers.findIndex((h) => String(h).replace(/\s+/g, ' ').trim().toLowerCase() === name.toLowerCase());

  const idx = {
    station: findHeader('EB Station'),
    month: findHeader('Month-Year'),
    rr: findHeader('RR No'),
    id: findHeader('ID No'),
    tariff: findHeader('Tariff')
  };

  /* =====================================
        🔥 FILTER STATION + FY
        ===================================== */

  const stationRows = allRows.filter((r) => {
    const rowStation = String(r[idx.station] || '').trim();
    const monthStr = String(r[idx.month] || '').trim();
    const rowFY = getFinancialYear(monthStr);

    if (station && rowStation !== station) {
      return false;
    }

    if (fy && rowFY !== fy) {
      return false;
    }

    return true;
  });

  /* =====================================
        🔥 NO DATA
        ===================================== */

  if (!stationRows.length) {
    id('RR').value = '';

    id('ID').value = '';

    id('Tariff').value = '';

    rrspanText = '';

    idspanText = '';

    tariffspanText = '';

    SyncAllPage();

    return;
  }

  /* =====================================
        🔥 SORT LATEST MONTH
        ===================================== */

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

  stationRows.sort((a, b) => {
    try {
      const [ma, ya] = String(a[idx.month] || '').split('-');

      const [mb, yb] = String(b[idx.month] || '').split('-');

      const da = new Date(Number(ya), monthMap[ma] || 0);

      const db = new Date(Number(yb), monthMap[mb] || 0);

      return db - da;
    } catch {
      return 0;
    }
  });

  /* =====================================
        🔥 GET LATEST ROW
        ===================================== */

  const latest = stationRows[0];

  /* =====================================
        🔥 AUTO LOAD RR / ID / TARIFF
        ===================================== */

  id('RR').value = latest[idx.rr] || '';

  id('ID').value = latest[idx.id] || '';

  id('Tariff').value = latest[idx.tariff] || '';

  rrspanText = latest[idx.rr] || '';

  idspanText = latest[idx.id] || '';

  tariffspanText = latest[idx.tariff] || '';

  /* =====================================
        🔥 REFRESH TABLE
        ===================================== */
  SyncAllPage();
});

/* =========================
            🔥 FILTER EB TABLE
            ========================= */

function filterEBTable() {
  const wrapper = qs('.EBtableWrapper');

  if (!wrapper) return;

  const headers = ebData?.headers || [];

  const hiddenColumnNames = ['EB Station', 'RR No', 'Tariff', 'ID No', 'Reference', 'Meter Constant', 'Prev KWh', 'Prev KVAh', 'Difference KWh', 'Difference KVAh', 'Interest on Deposit', 'Tax'];

  const hiddenCols = headers.map((h, i) => (hiddenColumnNames.includes(String(h).trim()) ? i : -1)).filter((i) => i !== -1);

  const visibleHeaders = headers.filter((_, i) => !hiddenCols.includes(i));

  wrapper.innerHTML = '';

  const station = id('EBPage_Station')?.value || '';

  const fy = id('EBPage_FY')?.value || '';

  const allRows = ebData?.rows || [];

  /* =====================================
        🔥 SAFE HEADER FINDER
        ===================================== */

  const findHeader = (name) => headers.findIndex((h) => String(h).replace(/\s+/g, ' ').trim().toLowerCase() === name.toLowerCase());

  /* =====================================
        🔥 HEADER INDEXES
        ===================================== */

  const idx = {
    month: findHeader('Month-Year'),
    station: findHeader('EB Station'),
    rr: findHeader('RR No'),
    tariff: findHeader('Tariff'),
    idno: findHeader('ID No'),
    EBref: findHeader('Reference'),
    CD: findHeader('Contract Demand (KVA)'),
    BD: findHeader('Billing Demand (KVA)'),
    MC: findHeader('Meter Constant'),
    RD: findHeader('Recorded Demand (KVA)'),
    MD: findHeader('MD Meter'),
    PF: findHeader('Power Factor'),
    KWh: findHeader('KWh'),
    KVAh: findHeader('KVAh'),
    preKWh: findHeader('Prev KWh'),
    preKVAh: findHeader('Prev KVAh'),
    diffKWh: findHeader('Difference KWh'),
    diffKVAh: findHeader('Difference KVAh'),
    consKWh: findHeader('Consumption KWh'),
    consKVAh: findHeader('Consumption KVAh'),
    security: findHeader('Interest on Deposit'),
    tax: findHeader('Tax'),
    final: findHeader('Final Amount')
  };

  /* =========================
        🔥 FILTER DATA
        ========================= */

  const rows = allRows.filter((row) => {
    const monthStr = String(row[idx.month] || '').trim();

    const rowStation = String(row[idx.station] || '').trim();

    const rowFY = getFinancialYear(monthStr);

    if (station && rowStation !== station) {
      return false;
    }

    if (fy && rowFY !== fy) {
      return false;
    }

    return true;
  });

  /* =========================
        🔥 SORT LATEST FIRST
        ========================= */

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

  rows.sort((a, b) => {
    try {
      const [ma, ya] = String(a[idx.month] || '').split('-');

      const [mb, yb] = String(b[idx.month] || '').split('-');

      const da = new Date(Number(ya), monthMap[ma] || 0);

      const db = new Date(Number(yb), monthMap[mb] || 0);

      return db - da;
    } catch {
      return 0;
    }
  });

  /* =========================
              🔥 BUILD TABLE
              ========================= */

  let html = `
                <table class="data-table">
                  <colgroup>
                    <col style="width:10%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:8%">
                    <col style="width:10%">
                    <col style="width:10%">
                    <col style="width:10%">
                    <col style="width:10%">
                    <col style="width:10%">
                  </colgroup>
                  <thead>

                    <!-- =================================
                    🔥 PRINT HEADER
                    ================================== -->

                    <tr class="EBPrintHeaderRow">

                      <th colspan="${visibleHeaders.length}">

                        <div class="EBPrintHeaderBox">

                          <div class="EBPrintLogo">

                            <img
                              src="https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l"
                            >

                          </div>

                          <div class="EBPrintTitle">

                            <div>
                              PRASAR BHARATI
                            </div>

                            <div>
                              INDIA'S PUBLIC SERVICE BROADCASTER
                            </div>

                            <div>
                              ALL INDIA RADIO
                            </div>

                            <div>
                              ${station}
                            </div>
                          </div>
                        </div>

                      </th>

                    </tr>
                    <tr class="EBPrintHeaderRow" style="height:40px !important;border:solid 1px black !important">
                      <th colspan="${visibleHeaders.length}" style="height:30px !important;border:solid 1px black !important">
                        <div style="display:flex;flex-direction:row;justify-content: space-between;width:100%">
                          <div style="border-right:solid 1px black;width:100%;padding:5px 10px;text-align:center;height:100%">RR No. : <span id="RRspan">${rrspanText}</span></div>
                          <div style="border-right:solid 1px black;width:100%;padding:5px 10px;text-align:center;height:100%">Tariff : <span id="Tariffspan">${tariffspanText}</span></div>
                          <div style="width:100%;padding:5px 10px;text-align:center;height:100%">ID No. : <span id="IDspan">${idspanText}</span></div>
                        </div>
                      </th>
                    </tr>
                    <tr style="height:30px !important;border-bottom:double black !important;border-top:double black !important;">
                      <th colspan="${visibleHeaders.length}" style="height:30px !important;
                          border:solid 1px black !important;text-align:center !important;background:white !important;color:black !important">
                        Electricity Bill & Consumption Details for the FY - ${fy}
                      </th>
                    </tr>
                    <tr class="EBColumnHeaderRow">`;

  /* 🔥 HEADERS */

  headers.forEach((h, i) => {
    if (hiddenCols.includes(i)) {
      return;
    }

    html += `<th>${h}</th>`;
  });

  html += `</tr></thead><tbody>
              `;

  /* =========================
              🚫 NO DATA
              ========================= */

  if (!fy || fy === 'Select FY' || !rows.length) {
    html += `
                  <tr>
                    <td colspan="${visibleHeaders.length}"
                        style="
                          background:#edebb7;
                          text-align:center;
                          padding:20px;
                          font-weight:700;
                          color:#ef4444;
                        ">
                      ==============🚫 No Data Found 🚫==============
                    </td>
                  </tr>
                `;
  } else {
    /* 🔥 ROWS */

    rows.forEach((row, rowIndex) => {
      html += `
              <tr
                class="EBdataRow"
                data-row="${rowIndex}"
              >
            `;

      row.forEach((cell, i) => {
        if (hiddenCols.includes(i)) {
          return;
        }

        /* =========================
              🔥 COLUMN NAME
              ========================= */

        const columnName = String(headers[i] || '').trim();

        /* =========================
              🔥 CELL VALUE
              ========================= */

        let cellValue = cell ?? '';

        /* =========================
              🔥 FINAL AMOUNT
              ========================= */

        if (columnName === 'Final Amount') {
          const num = Number(cellValue);

          if (!isNaN(num)) {
            cellValue = formatCurrency(num);
          }
        }

        html += `
                <td>${cellValue}</td>
              `;
      });

      html += `</tr>`;
    });
  }

  html += `
                  </tbody>
                </table>
              `;

  /* =========================
              🔥 RENDER
              ========================= */

  wrapper.innerHTML = html;

  /* =====================================
        🔥 ROW CLICK LOAD INPUTS
        ===================================== */

  wrapper.querySelectorAll('.EBdataRow').forEach((tr) => {
    tr.addEventListener('click', () => {
      /* =========================================
                  🔥 REMOVE OLD ACTIVE
                  ========================================= */

      wrapper.querySelectorAll('.EBdataRow').forEach((r) => {
        r.classList.remove('EBactiveRow');
      });
      /* =========================================
                  🔥 ADD ACTIVE
                  ========================================= */

      tr.classList.add('EBactiveRow');

      const rowIndex = Number(tr.dataset.row);

      const row = rows[rowIndex];

      if (!row) return;
      /* =====================================
            🔥 BILL MONTH
            ===================================== */

      try {
        const monthStr = String(row[idx.month] || '');

        const [m, y] = monthStr.split('-');

        const monthNum = {
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

        id('EBbillMonth').value = `${y}-${monthNum[m]}`;
      } catch {
        id('EBbillMonth').value = '';
      }

      /* =====================================
            🔥 LOAD INPUTS
            ===================================== */

      id('EBref').value = row[idx.EBref] || '';

      id('CD').value = row[idx.CD] || '';

      id('BD').value = row[idx.BD] || '';

      id('MC').value = row[idx.MC] || '';

      id('RD').value = row[idx.RD] || '';

      id('MD').value = row[idx.MD] || '';

      id('PF').value = row[idx.PF] || '';

      id('preKWh').value = row[idx.KWh] || '';

      id('prevKWh').value = row[idx.preKWh] || '';

      id('diffKWh').value = row[idx.diffKWh] || '';

      id('consKWh').value = row[idx.consKWh] || '';

      id('preKVAh').value = row[idx.KVAh] || '';

      id('prevKVAh').value = row[idx.preKVAh] || '';

      id('diffKVAh').value = row[idx.diffKVAh] || '';

      id('consKVAh').value = row[idx.consKVAh] || '';

      id('securityDeposit').value = row[idx.security] || '';

      id('EBtax').value = row[idx.tax] || '';

      id('EBbillAmount').value = formatCurrency(Number(row[idx.final]) || 0);

      /* =====================================
            🔥 PAYMENT MONTH
            ===================================== */

      const ebBillMonth = id('EBbillMonth');

      if (ebBillMonth) {
        ebBillMonth.setAttribute('data-skip-table-refresh', '1');

        ebBillMonth.dispatchEvent(new Event('change'));
      }
    });
  });

  /* =========================================
        🔥 OUTSIDE CLICK CLEAR
        ========================================= */

  document.addEventListener(
    'click',

    (e) => {
      /* =====================================
            🔥 CLICKED INSIDE EB ROW
            ===================================== */

      if (e.target.closest('.EBdataRow')) {
        return;
      }

      /* =====================================
            🔥 CLICKED INSIDE INPUT AREA
            ===================================== */

      if (e.target.closest('.EBPanel') || e.target.closest('.EBpanelDiv')) {
        return;
      }

      /* =====================================
            🔥 REMOVE ACTIVE ROW
            ===================================== */

      wrapper.querySelectorAll('.EBdataRow').forEach((r) => {
        r.classList.remove('EBactiveRow');
      });
    },

    { passive: true }
  );
}

/* =========================================
      🔥 EB FY CHANGE
      ========================================= */

on('EBPage_FY', 'change', () => {
  clearEBInputs();
  SyncAllPage();
});

/* =========================================
      🔥 BILL MONTH → PAYMENT MONTH
      ========================================= */

on('EBbillMonth', 'change', () => {
  const billMonth = id('EBbillMonth')?.value;

  if (!billMonth) {
    clearEBInputs();

    return;
  }

  try {
    /* =====================================
          🔥 YYYY-MM
          ===================================== */

    const [yyyy, mm] = billMonth.split('-');

    /* =====================================
          🔥 PAYMENT MONTH
          ===================================== */

    const payDate = new Date(Number(yyyy), Number(mm) - 1, 1);

    payDate.setMonth(payDate.getMonth() + 1);

    id('EBpayMonth').value = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;

    /* =====================================
          🔥 MONTH NAMES
          ===================================== */

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /* =====================================
          🔥 CURRENT MONTH KEY
          ===================================== */

    const currentMonthKey = `${monthNames[Number(mm) - 1]}-${yyyy}`;

    /* =====================================
          🔥 PREVIOUS MONTH KEY
          ===================================== */

    const prevDate = new Date(Number(yyyy), Number(mm) - 2, 1);

    const prevMonthKey = `${monthNames[prevDate.getMonth()]}-${prevDate.getFullYear()}`;

    //console.log({billMonth, currentMonthKey, prevMonthKey});

    /* =====================================
          🔥 DATA CHECK
          ===================================== */

    if (!ebData || !ebData.headers || !ebData.rows) {
      return;
    }

    const headers = ebData.headers;
    const rows = ebData.rows;

    /* =====================================
          🔥 SAFE HEADER FINDER
          ===================================== */

    const findHeader = (name) => headers.findIndex((h) => String(h).replace(/\s+/g, ' ').trim().toLowerCase() === name.toLowerCase());

    const idx = {
      month: findHeader('Month-Year'),
      EBref: findHeader('Reference'),
      CD: findHeader('Contract Demand (KVA)'),
      BD: findHeader('Billing Demand (KVA)'),
      MC: findHeader('Meter Constant'),
      RD: findHeader('Recorded Demand (KVA)'),
      MD: findHeader('MD Meter'),
      PF: findHeader('Power Factor'),
      KWh: findHeader('KWh'),
      KVAh: findHeader('KVAh'),
      preKWh: findHeader('Prev KWh'),
      preKVAh: findHeader('Prev KVAh'),
      consKWh: findHeader('Consumption KWh'),
      consKVAh: findHeader('Consumption KVAh'),
      security: findHeader('Interest on Deposit'),
      tax: findHeader('Tax'),
      final: findHeader('Final Amount')
    };

    /* =====================================
          🔥 FIND ROWS
          ===================================== */

    const currentRow =
      rows.find(
        (r) =>
          String(r[idx.month] || '')
            .trim()
            .toLowerCase() === currentMonthKey.trim().toLowerCase()
      ) || {};

    const prevRow =
      rows.find(
        (r) =>
          String(r[idx.month] || '')
            .trim()
            .toLowerCase() === prevMonthKey.trim().toLowerCase()
      ) || {};

    /* =====================================
          🔥 CD / BD / MC
          ===================================== */

    // 🔥 CONTRACT DEMAND
    const CD = Number(currentRow?.[idx.CD]) || Number(prevRow?.[idx.CD]) || 0;

    // 🔥 MD METER
    const MD = Number(currentRow?.[idx.MD]) || 0;

    // 🔥 BILLING DEMAND
    const BD = Number(currentRow?.[idx.BD]) || Number(prevRow?.[idx.BD]) || (CD * 0.9).toFixed(0);

    // 🔥 MULTIPLICATION CONSTANT
    const MC = Number(currentRow?.[idx.MC]) || Number(prevRow?.[idx.MC]) || 500;

    //🔥 RECORDED DEMAND
    const RD = Number(currentRow?.[idx.RD]) || MC * MD;

    // 🔥 SET INPUTS
    id('CD').value = CD;
    id('MD').value = MD;
    id('BD').value = BD;
    id('MC').value = MC;
    id('RD').value = RD;

    /* =====================================
                🔥 CURRENT MONTH VALUES
                (IF AVAILABLE ELSE 0)
                ===================================== */
    id('EBref').value = currentRow?.[idx.EBref] || 'AEE/AAO/SA/PLC/F-1/';

    id('PF').value = Number(currentRow?.[idx.PF]) || 0;

    id('securityDeposit').value = Number(currentRow?.[idx.security]) || 0;

    id('EBtax').value = Number(currentRow?.[idx.tax]) || 0;

    id('EBbillAmount').value = formatCurrency(Number(currentRow?.[idx.final]) || 0);

    /* =====================================
                🔥 PRESENT READINGS
                ===================================== */

    let presentKWh = 0;
    let presentKVAh = 0;

    /* =====================================
                🔥 PRE READINGS
                ===================================== */

    let preKWh = 0;
    let preKVAh = 0;

    /* =====================================
                🔥 CURRENT MONTH AVAILABLE
                ===================================== */

    if (Object.keys(currentRow).length) {
      // 🔥 PRESENT READINGS
      presentKWh = Number(currentRow[idx.KWh]) || 0;
      presentKVAh = Number(currentRow[idx.KVAh]) || 0;
      // 🔥 PRE READINGS
      preKWh = Number(currentRow[idx.preKWh]) || 0;
      preKVAh = Number(currentRow[idx.preKVAh]) || 0;
    } else {
      /* =====================================
                🔥 NO CURRENT MONTH
                → USE PREVIOUS MONTH PRE READINGS
                ===================================== */
      preKWh = Number(prevRow[idx.KWh]) || 0;
      preKVAh = Number(prevRow[idx.KVAh]) || 0;
      presentKWh = 0;
      presentKVAh = 0;
    }

    /* =====================================
                🔥 SET INPUTS
                ===================================== */

    id('preKWh').value = presentKWh;
    id('preKVAh').value = presentKVAh;
    id('prevKWh').value = preKWh;
    id('prevKVAh').value = preKVAh;

    /* =====================================
                🔥 DIFFERENCE
                ===================================== */

    id('diffKWh').value = (presentKWh - preKWh).toFixed(2);

    id('diffKVAh').value = (presentKVAh - preKVAh).toFixed(2);

    /* =====================================
                🔥 CONSUMPTION
                ===================================== */

    // 🔥 SHEET VALUE IF AVAILABLE
    let consKWh = Number(currentRow?.[idx.consKWh]);

    let consKVAh = Number(currentRow?.[idx.consKVAh]);

    // 🔥 AUTO CALCULATE
    if (!consKWh) {
      consKWh = MC * (presentKWh - preKWh);
    }

    if (!consKVAh) {
      consKVAh = MC * (presentKVAh - preKVAh);
    }

    id('consKWh').value = consKWh || 0;

    id('consKVAh').value = consKVAh || 0;
  } catch (err) {
    console.error('❌ EB calculation failed', err);
  }
});

/* =========================================
            🔥 CLEAR EB INPUTS
            ========================================= */

function clearEBInputs() {
  ['EBbillMonth', 'EBpayMonth', 'EBref', 'CD', 'BD', 'MC', 'RD', 'MD', 'PF', 'preKWh', 'prevKWh', 'diffKWh', 'consKWh', 'preKVAh', 'prevKVAh', 'diffKVAh', 'consKVAh', 'securityDeposit', 'EBtax', 'EBbillAmount'].forEach((x) => {
    const el = id(x);

    if (!el) return;

    el.value = '';

    qsa('.EBdataRow').forEach((r) => {
      r.classList.remove('EBactiveRow');
    });
  });

  // 🔥 DEFAULT VALUES
  id('prevKWh').value = '0';

  id('diffKWh').value = '0';

  id('prevKVAh').value = '0';

  id('diffKVAh').value = '0';
}

/* =====================================
            🔥 RECALCULATE EB VALUES
            ===================================== */

function recalculateEBValues() {
  const CD = Number(id('CD')?.value) || 0;

  const MD = Number(id('MD')?.value) || 0;

  const RD = Number(id('RD')?.value) || 0;

  const MC = Number(id('MC')?.value) || 500;

  const presentKWh = Number(id('preKWh')?.value) || 0;

  const previousKWh = Number(id('prevKWh')?.value) || 0;

  const presentKVAh = Number(id('preKVAh')?.value) || 0;

  const previousKVAh = Number(id('prevKVAh')?.value) || 0;

  /* =====================================
              🔥 BD = 90% OF CD
              ===================================== */

  id('BD').value = CD * 0.9;

  /* =====================================
              🔥 RD = MD Meter X MC
              ===================================== */

  id('RD').value = (MD * MC).toFixed(2);

  /* =====================================
              🔥 DIFFERENCE
              ===================================== */

  const diffKWh = presentKWh - previousKWh;

  const diffKVAh = presentKVAh - previousKVAh;

  id('diffKWh').value = diffKWh.toFixed(2);

  id('diffKVAh').value = diffKVAh.toFixed(2);

  /* =====================================
              🔥 CONSUMPTION
              ===================================== */

  id('consKWh').value = (MC * (presentKWh - previousKWh)).toFixed(1);

  id('consKVAh').value = (MC * (presentKVAh - previousKVAh)).toFixed(1);
}

/* =====================================
            🔥 AUTO RECALCULATE
            ===================================== */

['CD', 'MD', 'MC', 'preKWh', 'prevKWh', 'preKVAh', 'prevKVAh'].forEach((x) => {
  on(x, 'input', () => {
    recalculateEBValues();
  });
});

/* =========================================
            🔥 MESSAGE FOR REQUIRED INPUT IF 0
            ========================================= */

/* ============================================================================
          ⚡ OPTIMIZED EB INPUT VALIDATION (Allows 0 with Warning Confirmation)
      ============================================================================ */
function validateEBInputs() {
  return new Promise((resolve) => {
    const requiredInputs = [
      { id: 'EBbillMonth', label: 'Billing Month' },
      { id: 'EBref', label: 'Reference Number' },
      { id: 'CD', label: 'Contract Demand' },
      { id: 'BD', label: 'Billing Demand' },
      { id: 'MC', label: 'Meter Constant' },
      // 🌟 Add 'allowZero' flag to fields that can accept 0 with a warning
      { id: 'RD', label: 'Recorded Demand', allowZero: true },
      { id: 'MD', label: 'MD Meter', allowZero: true },
      { id: 'PF', label: 'Power Factor' },
      { id: 'preKWh', label: 'KWh Reading' },
      { id: 'preKVAh', label: 'KVAh Reading' },
      { id: 'consKWh', label: 'KWh Consumption' },
      { id: 'consKVAh', label: 'KVAh Consumption' },
      { id: 'EBbillAmount', label: 'Final Amount' }
    ];

    const invalidFields = [];
    const warningFields = [];

    requiredInputs.forEach((f) => {
      const el = id(f.id);
      if (!el) return;

      const value = String(el.value || '').trim();
      const isZero = value === '0' || value === '0.00';

      // ❌ Blank or Strict Zero (Not Allowed)
      if (value === '' || (isZero && !f.allowZero)) {
        invalidFields.push(f.label);
        el.style.border = '2px solid #ff6b6b';
      }
      // ⚠️ Soft Zero (Allowed but warned)
      else if (isZero && f.allowZero) {
        warningFields.push(f.label);
        el.style.border = '2px solid #eab308'; // Warning Yellow
      }
      // ✅ Valid
      else {
        el.style.border = '';
      }
    });

    // ❌ BLOCKING ERRORS: Stop and show standard alert
    if (invalidFields.length) {
      const msg = `
              <div style="padding:16px;text-align:center;">
                <div style="font-size:14px;font-weight:700;color:#ff8a8a;margin-bottom:12px;">
                  ❌ Required Fields Missing
                </div>
                <div style="font-size:13px;opacity:.9;margin-bottom:10px;">
                  Please fill valid values for:
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
                  ${invalidFields.map((x) => `<span style="padding:5px 10px;border-radius:12px;background:rgba(255,0,0,.12);border:1px solid rgba(255,0,0,.25);font-size:12px;">${x}</span>`).join('')}
                </div>
              </div>
            `;
      showCustomAlert(msg);
      resolve(false); // Fails validation
      return;
    }

    // ⚠️ WARNINGS: Ask user for confirmation before proceeding
    if (warningFields.length) {
      showConfirmBox({
        title: 'Zero Value Warning',
        icon: '⚠️',
        message: 'Some fields are set to 0',
        subMessage: `Are you sure you want to save with 0 in:<br><b style="color:#eab308;font-size:13px;display:block;margin-top:5px;">${warningFields.join(' & ')}</b>?`,
        yesText: 'Save Anyway',
        noText: 'Cancel',
        yesColor: '#eab308',
        onYes: () => resolve(true), // User clicked Save Anyway
        onNo: () => resolve(false) // User cancelled
      });
      return;
    }

    // ✅ All clear
    resolve(true);
  });
}
/* =========================================
            🔥 SAVE EB DATA
            ========================================= */

/* ============================================================================
          ⚡ FINALIZED EB DATA SAVE (With Harmonized UI Alerts)
      ============================================================================ */
async function saveEBData() {
  try {
    setSyncStatus('ebDatabase');

    // 1. Validation
    if (!(await validateEBInputs())) {
      clearSyncStatus('ebDatabase', 'db', false);
      return;
    }

    const billMonth = id('EBbillMonth')?.value;
    const [yyyy, mm] = billMonth.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthKey = `${monthNames[Number(mm) - 1]}-${yyyy}`;

    const row = {
      'Month-Year': monthKey,
      'RR No': id('RR')?.value || '',
      'ID No': id('ID')?.value || '',
      Tariff: id('Tariff')?.value || '',
      'EB Station': id('EBPage_Station')?.value || '',
      Reference: id('EBref')?.value || '',
      'Contract Demand (KVA)': Number(id('CD')?.value) || 0,
      'Billing Demand (KVA)': Number(id('BD')?.value) || 0,
      'Meter Constant': Number(id('MC')?.value) || 500,
      'Recorded Demand (KVA)': Number(id('RD')?.value) || 0,
      'MD Meter': Number(id('MD')?.value) || 0,
      'Power Factor': Number(id('PF')?.value) || 0,
      KWh: Number(id('preKWh')?.value) || 0,
      KVAh: Number(id('preKVAh')?.value) || 0,
      'Prev KWh': Number(id('prevKWh')?.value) || 0,
      'Prev KVAh': Number(id('prevKVAh')?.value) || 0,
      'Difference KWh': Number(id('diffKWh')?.value) || 0,
      'Difference KVAh': Number(id('diffKVAh')?.value) || 0,
      'Consumption KWh': Number(id('consKWh')?.value) || 0,
      'Consumption KVAh': Number(id('consKVAh')?.value) || 0,
      'Interest on Deposit': Number(id('securityDeposit')?.value) || 0,
      Tax: Number(id('EBtax')?.value) || 0,
      'Final Amount': CurrencytoNum(id('EBbillAmount')?.value)
    };

    // 2. Client-Side Diffing
    let changedCols = [];
    const headers = ebData?.headers || [];
    const rows = ebData?.rows || [];
    const existingRow = rows.find((r) => {
      return String(r[headers.indexOf('Month-Year')] || '').trim() === monthKey && String(r[headers.indexOf('EB Station')] || '').trim() === String(id('EBPage_Station')?.value || '').trim();
    });

    if (existingRow) {
      headers.forEach((header, i) => {
        if (String(existingRow[i] ?? '').trim() !== String(row[header] ?? '').trim()) {
          changedCols.push(header);
        }
      });
      if (!changedCols.length) {
        clearSyncStatus('ebDatabase', 'db', true);
        showCustomAlert('ℹ️ No changes detected.<br><br>No data was modified.');
        return;
      }
    }

    // 3. API Call
    const res = await fetch('https://office-management-f425.onrender.com/eb/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [row] })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Save failed');

    // 4. Result Processing
    let msg = '';
    if (result.updated?.length) {
      msg += `<div style="font-size:13px;font-weight:700;color:#7dffb3;margin-bottom:8px;text-align:center;">📝 ELECTRICITY BILL DETAILS EDIT SUCCESS!</div>`;
      msg += `<div style="margin-bottom:8px;padding:6px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">
                      <div style="font-size:14px;font-weight:700;margin-bottom:10px;">⚡ EB Bill Updated (${monthKey})</div>
                      <div style="display:flex;flex-wrap:wrap;gap:4px;">${changedCols.map((c) => `<span style="padding:4px 8px;border-radius:12px;background:rgba(255,255,255,0.08);font-size:12px;">🔃 ${c}</span>`).join('')}</div>
                    </div>`;
    }

    if (result.added?.length) {
      msg += `<div style="font-size:13px;font-weight:700;color:#7dffb3;margin-bottom:8px;text-align:center;">➕ ELECTRICITY BILL DETAILS ADD SUCCESS!</div>
                    <div style="margin-top:16px;padding:12px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">
                      <div>📅 Month: <b>${monthKey}</b></div>
                      <div>🏢 Station: <b>${id('EBPage_Station')?.value || '-'}</b></div>
                    </div>`;
    }

    // 5. Final Fallback Check
    if (result.status === 'nochange' || msg === '') {
      clearSyncStatus('ebDatabase', 'db', true);
      showCustomAlert('ℹ️ No changes detected.<br><br>No data was modified.');
      return;
    }

    await fetch('https://office-management-f425.onrender.com/refresh/eb', { method: 'POST' });
    await loadTable('eb', 'EBlog');
    SyncAllPage();
    clearSyncStatus('ebDatabase', 'db', true);
    showCustomAlert(msg);
  } catch (err) {
    console.error('❌ EB Save Failed:', err);
    clearSyncStatus('ebDatabase', 'db', false);
    showCustomAlert(`<div style="text-align:center;padding:16px;"><div style="font-size:14px;font-weight:700;color:#ff8a8a;margin-bottom:10px;">❌ Failed to Save EB Data</div><div style="opacity:.8;font-size:13px;">${err.message || 'Unknown Error'}</div></div>`);
  }
}

/* =========================================
            🔥 EB SAVE BUTTON
            ========================================= */

on('EBsaveBtn', 'click', async () => {
  await saveEBData();
});

function buildPrintEBLogHTML() {
  const wrapper = qs('.EBtableWrapper');

  if (!wrapper) return '';

  /* =====================================================
        🔥 GET ALL MONTH TABLES
        ===================================================== */

  const table = wrapper.querySelector('table');

  if (!table) {
    showCustomAlert('❌ No data to print');

    return '';
  }

  /* =====================================================
        🔥 CREATE PRINT DOC
        ===================================================== */

  const doc = document.implementation.createHTMLDocument('EB Log Register');

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

          .EBprint-table,
          .EBprint-table *{
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

          .EBprint-table{
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

          .EBprint-table th,
          .EBprint-table td{
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

          .EBPrintHeaderRow{
            display:table-row !important;
          }

          .EBPrintHeaderRow th{
            border:none !important;
            padding:0 !important;
            background:white !important;
          }

          .EBPrintHeaderRow table{
            width:100% !important;
            border-collapse:collapse !important;
            table-layout:fixed !important;
            background:white !important;
          }

          .EBPrintHeaderRow td{
            border:none !important;
            vertical-align:middle !important;
          }

          .EBPrintHeaderRow img{
            height:55px !important;
            width:auto !important;
            object-fit:contain !important;
          }

          /* =================================================
          🔥 COLUMN HEADERS
          ================================================= */

          .EBColumnHeaderRow th{
            background:#1f4f82 !important;
            color:white !important;
            font-weight:bold !important;
          }

          /* =================================================
          🔥 FY / MONTH HEADERS
          ================================================= */

          .EBFYHeader th,
          .EBMonthTitleRow th,
          .EBMonthRepeatRow th{
            background:white !important;
            color:black !important;
            font-weight:bold !important;
          }

          /* =================================================
          🔥 FIRST COLUMN
          ================================================= */

          .EBprint-table th:first-child,
          .EBprint-table td:first-child{
            width:80px !important;
            min-width:80px !important;
            max-width:80px !important;
          }

          /* =================================================
          🔥 REMOVE LAST BLANK PAGE
          ================================================= */

          .EBprint-table:last-child{
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
  const clone = table.cloneNode(true);

  clone.classList.add('EBprint-table');

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

async function exportEBLogExcel() {
  /* =========================================================
        🔥 WORKBOOK
        ========================================================= */

  const workbook = new ExcelJS.Workbook();

  /* =========================================================
        🔥 TABLE
        ========================================================= */

  const wrapper = qs('.EBtableWrapper');

  if (!wrapper) {
    showCustomAlert('❌ EB Log wrapper not found');
    return;
  }

  const table = wrapper.querySelector('table');

  if (!table) {
    showCustomAlert('❌ No EB table found');
    return;
  }

  /* =========================================================
        🔥 FILTER VALUES
        ========================================================= */

  const selectedFY = id('EBPage_FY')?.value || '';

  const station = id('EBPage_Station')?.value || '';

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
        🔥 SHEET
        ========================================================= */

  const sheet = workbook.addWorksheet('EB Log Book');

  /* =========================================================
        🔥 HEADERS
        ========================================================= */

  const headerCells = table.querySelectorAll('.EBColumnHeaderRow th');

  const totalCols = headerCells.length;

  /* =========================================================
        🔥 COLUMN WIDTHS
        ========================================================= */

  sheet.columns = [{ width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];

  /* =========================================================
        🔥 MAIN HEADER
        ========================================================= */

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
        text: `ALL INDIA RADIO - ${station}`,

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

  sheet.getRow(1).height = 65;

  /* =========================================================
        🔥 ADD LOGO
        ========================================================= */

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

  /* =========================================================
        🔥 COPY TABLE HEADERS
        ========================================================= */

  let currentRow = 2;

  const theadRows = Array.from(table.querySelectorAll('thead tr')).filter((tr) => !tr.classList.contains('EBPrintHeaderRow'));

  theadRows.forEach((tr) => {
    const excelRow = sheet.getRow(currentRow);

    const ths = tr.querySelectorAll('th');

    let colIndex = 1;

    ths.forEach((th) => {
      const colspan = parseInt(th.colSpan || 1);

      const rowspan = parseInt(th.rowSpan || 1);

      /* =====================================================
            🔥 SKIP MERGED CELLS
            ===================================================== */

      while (sheet.getCell(currentRow, colIndex).isMerged) {
        colIndex++;
      }

      /* =====================================================
            🔥 MERGE
            ===================================================== */

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

      /* =====================================================
            🔥 HEADER STYLE BY ROW
            ===================================================== */

      const isTitleRow = currentRow === 2;

      /* =====================================================
            🔥 FONT
            ===================================================== */

      cell.font = {
        bold: true,

        color: {
          argb: isTitleRow ? 'FF000000' : 'FFFFFFFF'
        },

        size: isTitleRow ? 11 : 10
      };

      /* =====================================================
            🔥 FILL
            ===================================================== */

      cell.fill = {
        type: 'pattern',

        pattern: 'solid',

        fgColor: {
          argb: isTitleRow ? 'FFFFFFFF' : 'FF1F4E79'
        }
      };

      /* =====================================================
            🔥 ALIGNMENT
            ===================================================== */

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };

      /* =====================================================
            🔥 BORDER
            ===================================================== */

      cell.border = isTitleRow
        ? {
            top: {
              style: 'double',
              color: { argb: 'FF000000' }
            },

            bottom: {
              style: 'double',
              color: { argb: 'FF000000' }
            },

            left: {
              style: 'thin',
              color: { argb: 'FF000000' }
            },

            right: {
              style: 'thin',
              color: { argb: 'FF000000' }
            }
          }
        : FULL_BORDER;

      /* =====================================================
            🔥 NEXT COLUMN
            ===================================================== */

      colIndex += colspan;
    });

    /* =====================================================
          🔥 ROW HEIGHT
          ===================================================== */

    const isTitleRow = currentRow === 2;

    excelRow.height = isTitleRow ? 35 : 55;

    currentRow++;
  });

  /* =========================================================
        🔥 BODY ROWS
        ========================================================= */

  const tbodyRows = table.querySelectorAll('tbody tr');

  tbodyRows.forEach((tr, rowIndex) => {
    const excelRow = sheet.getRow(currentRow);
    const tds = tr.querySelectorAll('td');

    tds.forEach((td, i) => {
      const cell = excelRow.getCell(i + 1);
      const rawValue = td.innerText.trim();

      /* =====================================================
            🔥 CONVERT USING currencyToNum()
            ===================================================== */

      const numericValue = CurrencytoNum(rawValue);
      const monthRegex = /^[A-Za-z]{3}-\d{4}$/;

      /* =====================================================
            🔥 NUMBER
            ===================================================== */
      if (monthRegex.test(rawValue)) {
        const [mon, year] = rawValue.split('-');

        const months = {
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

        cell.value = new Date(Number(year), months[mon], 1);

        cell.numFmt = 'MMM-YYYY';
      } else if (!isNaN(numericValue) && rawValue !== '') {
        cell.value = numericValue;
      } else {
        cell.value = rawValue;
      }

      /* =====================================================
            🔥 STYLE
            ===================================================== */

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };

      cell.border = FULL_BORDER;

      /* =====================================================
            🔥 ALTERNATE ROW
            ===================================================== */

      if (rowIndex % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'FFF7F7F7'
          }
        };
      }
    });

    excelRow.height = 24;
    currentRow++;
  });

  /* =========================================================
        🔥 PAGE SETUP
        ========================================================= */

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

  /* =========================================================
        🔥 REPEAT HEADER ROWS
        ========================================================= */

  sheet.pageSetup.printTitlesRow = '1:5';

  /* =========================================================
        🔥 FILE NAME
        ========================================================= */

  const fileName = `EB_Log_Book_${selectedFY}.xlsx`;

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

on('EBexcelBtn', 'click', () => {
  exportEBLogExcel();
});

on('EBprintBtn', 'click', () => {
  openPrintWindow(buildPrintEBLogHTML());
});
