/* ============================================================================
          DOM SHORTCUTS
      ============================================================================ */
const id = document.getElementById.bind(document);
const qs = document.querySelector.bind(document);
const qsa = document.querySelectorAll.bind(document);

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

let financialYears = [];
let GPF_MESSAGES = [];
let isAddMode = false;
let isEditMode = false;
let isPBProcessing = false;
let idData = {};
let confirmYesCallback = null;
let confirmNoCallback = null;
let currentYear = '';

// Global app data store objects (structured uniformly)
let empData = { headers: [], rows: [] };
let pbData = { headers: [], rows: [] };
let cpcData = { headers: [], rows: [] };
let qtrsData = { headers: [], rows: [] };
let cityData = { headers: [], rows: [] };
let sbgData = { headers: [], rows: [] }; // BudgetDB (SBG)
let sbgExpData = { headers: [], rows: [] }; // SBG Expenditure
let itData = { headers: [], rows: [] };
let commData = { headers: [], rows: [] };
let dgData = { headers: [], rows: [] };
let hsdData = { headers: [], rows: [] };
let ebData = { headers: [], rows: [] };
let dutyData = { headers: [], rows: [] };
let coffData = { headers: [], rows: [] };
let esrData = { headers: [], rows: [] };
let txnData = { headers: [], rows: [] };
let holidaysData = { headers: [], rows: [] };

/* ============================================================================
          🔥 UNIFORM API MAPPER (Maps endpoint to global object and UI status icon)
      ============================================================================ */
const apiStatusMap = {
  emp: { storage: () => empData, elId: 'empDatabase', type: 'db' },
  pb: { storage: () => pbData, elId: 'pbDatabase', type: 'db' },
  sbg: { storage: () => sbgData, elId: 'sbgDatabase', type: 'db' },
  sbgexp: { storage: () => sbgExpData, elId: 'sbgexpDatabase', type: 'db' },
  dg: { storage: () => dgData, elId: 'dgDatabase', type: 'db' },
  hsd: { storage: () => hsdData, elId: 'hsdDatabase', type: 'db' },
  eb: { storage: () => ebData, elId: 'ebDatabase', type: 'db' },
  duty: { storage: () => dutyData, elId: 'dutyDatabase', type: 'db' },
  coff: { storage: () => coffData, elId: 'coffDatabase', type: 'db' },
  esr: { storage: () => esrData, elId: 'esrDatabase', type: 'db' },
  txn: { storage: () => txnData, elId: 'txnDatabase', type: 'db' },
  it: { storage: () => itData, elId: 'itDatabase', type: 'data' },
  cpc: { storage: () => cpcData, elId: 'cpcDatabase', type: 'data' },
  qtrs: { storage: () => qtrsData, elId: 'qtrDatabase', type: 'data' },
  city: { storage: () => cityData, elId: 'cityDatabase', type: 'data' },
  comm: { storage: () => commData, elId: 'commDatabase', type: 'data' },
  holidays: { storage: () => holidaysData, elId: 'holidaysDatabase', type: 'data' }
};

const dbMappings = [
  { api: 'emp', id: 'EmpDB', name: 'Employee Database' },
  { api: 'pb', id: 'PBDB', name: 'Pay Bill Database' },
  { api: 'sbg', id: 'BudgetDB', name: 'SBG Budget' },
  { api: 'sbgexp', id: 'SBGexpenditureDB', name: 'SBG Expenditure Logs' },
  { api: 'dg', id: 'DGlog', name: 'Diesel Generator Logs' },
  { api: 'hsd', id: 'HSDlog', name: 'HSD Consumption Logs' },
  { api: 'eb', id: 'EBlog', name: 'Electricity Bill Logs' },
  { api: 'duty', id: 'DutyChart', name: 'Duty Chart Details' },
  { api: 'coff', id: 'CoffDB', name: 'Leaves' },
  { api: 'holidays', id: 'Holidays', name: 'Holidays List' },
  { api: 'esr', id: 'ESRDB', name: 'ESR Database' },
  { api: 'txn', id: 'TxNDB', name: 'Transmission Logs' },
  { api: 'cpc', id: 'CPC7DB', name: 'Pay Matrix' },
  { api: 'qtrs', id: 'QtrsRateDB', name: 'Qtrs Rate List' },
  { api: 'city', id: 'CityZoneDB', name: 'City Zone List' },
  { api: 'comm', id: 'CommFactDB', name: 'Commutation Factor' },
  { api: 'it', id: 'ITDB', name: 'IT Reference' }
];

// 🔥 Lookup map
const dbNameMap = Object.fromEntries(dbMappings.map(({ api, name }) => [api, name]));

/* ============================================================================
          ⚡ OPTIMIZED TABLE LOADER (Designed for cached {"headers":[], "rows":[]} data)
      ============================================================================ */
async function loadTable(api, tableId, shouldRender = true) {
  console.log(`⏳ ${dbNameMap[api] || api} ✅`);
  const config = apiStatusMap[api];

  try {
    const res = await fetch(`https://office-management-f425.onrender.com/${api}`);

    if (!res.ok) {
      console.error(`❌ API route failed: ${api}`);
      if (config) updateStatus(config.elId, config.type, false);
      return;
    }

    const result = await res.json();

    if (config) {
      let dataRows = [];
      let headers = [];

      /* =====================================
            🔥 FORMAT 1
            { headers, rows }
            ===================================== */

      if (result && Array.isArray(result.headers) && Array.isArray(result.rows)) {
        headers = result.headers;
        dataRows = result.rows;
      } else if (result && Array.isArray(result.data) && result.data.length) {
        /* =====================================
            🔥 FORMAT 2
            { success:true, data:[...] }
            ===================================== */
        headers = Object.keys(result.data[0]);

        dataRows = result.data.map((obj) => headers.map((h) => obj[h]));
      } else if (Array.isArray(result) && result.length) {
        /* =====================================
            🔥 FORMAT 3
            [ {...}, {...} ]
            ===================================== */
        headers = Object.keys(result[0]);

        dataRows = result.map((obj) => headers.map((h) => obj[h]));
      }

      /* =====================================
            🔥 SAVE
            ===================================== */

      config.storage().headers = headers;
      config.storage().rows = dataRows;
    }

    if (config) {
      updateStatus(config.elId, config.type, true);
    }

    if (!shouldRender) return;

    const table = document.getElementById(tableId);
    if (!table) return;

    const currentData = config.storage();
    const thead = `<thead><tr>${currentData.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${currentData.rows.map((row) => `<tr>${row.map((v) => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>`;

    table.innerHTML = thead + tbody;
  } catch (err) {
    console.error(`❌ Network error loading table context (${api}):`, err);
    if (config) updateStatus(config.elId, config.type, false);
  }
}

/* ============================================================================
          ⚡ POST-LOGIN BATCH TABLE RENDERER (Paints cached memory to DOM)
      ============================================================================ */
function renderDatabaseTables(onlyDashboard = false) {
  dbMappings.forEach((mapping) => {
    // If we are only doing immediate render, skip everything but the dashboard
    if (onlyDashboard && mapping.id !== 'BudgetDB') return;

    const table = document.getElementById(mapping.id);
    const config = apiStatusMap[mapping.api];
    if (!table || !config) return;

    const data = config.storage();
    if (!data.rows.length) return;

    /* =====================================
          🔥 BUILD THEAD
          ===================================== */

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    (data.headers || []).forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header ?? '';
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    /* ==================🔥 BUILD TBODY================ */

    const tbody = document.createElement('tbody');
    (data.rows || []).forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((val) => {
        const td = document.createElement('td');
        td.textContent = val ?? '';
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    /* =====================🔥 REPLACE TABLE CONTENT================= */

    table.innerHTML = '';
    table.appendChild(thead);
    table.appendChild(tbody);
  });
}

/* ============================================================================
        ⚡ IMPROVED BATCH LOADER (Returns Promise)
      ============================================================================ */
async function loadData() {
  const apis = Object.keys(apiStatusMap);

  // 🔥 FIX: Wipe local memory before fetching
  apis.forEach((api) => {
    const storage = apiStatusMap[api].storage();
    storage.headers = [];
    storage.rows = [];
  });

  const timestamp = Date.now();

  const results = await Promise.allSettled(apis.map((api) => fetch(`https://office-management-f425.onrender.com/${api}?t=${timestamp}`).then((r) => r.json())));

  apis.forEach((api, index) => {
    const result = results[index];
    const config = apiStatusMap[api];

    if (result.status === 'fulfilled' && config) {
      const data = result.value;
      if (data && data.headers && data.rows) {
        config.storage().headers = data.headers;
        config.storage().rows = data.rows;
        updateStatus(config.elId, config.type, true);
      }
    } else {
      console.error(`❌ Sync failed for: ${api}`);
      if (config) updateStatus(config.elId, config.type, false);
    }
  });

  console.log('✅ Runtime cache fully hydrated.');
  return true;
}

/* =====================================================
      🔥 SMOOTH DISABLE PULL TO REFRESH
      ===================================================== */
let startY = 0;

document.addEventListener(
  'touchstart',
  (e) => {
    startY = e.touches[0].clientY;
  },
  { passive: false }
);

document.addEventListener(
  'touchmove',
  (e) => {
    const y = e.touches[0].clientY;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // 1. Only prevent if we are at the very top
    // 2. Only prevent if the user is pulling DOWN (y > startY)
    // 3. Only prevent if the target is NOT inside a scrollable div
    const isAtTop = scrollTop <= 0;
    const isPullingDown = y > startY;

    // Check if the target is a scrollable area (like your tables)
    // If the target has 'overflow: auto/scroll', we should let it handle its own touch
    const target = e.target;
    const isInsideScrollable = target.closest('.data-table') || target.closest('.scroll-container');

    if (isAtTop && isPullingDown && !isInsideScrollable) {
      e.preventDefault();
    }
  },
  { passive: false }
);

async function shortcut() {
  const station = id('loginStationDropdown');
  const user = id('loginUserDropdown');
  const password = id('loginPasswordInput');
  const loginBtn = id('loginBtn');
  if (!station || !user || !password || !loginBtn) {
    console.warn('❌ Login elements not found');
    return;
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  station.value = 'AV KARWAR';
  station.dispatchEvent(new Event('change'));
  await wait(100);

  user.value = 'MASTER';
  user.dispatchEvent(new Event('change'));
  await wait(100);

  password.focus();
  password.value = 'master@11051993';
  password.dispatchEvent(new Event('input'));
  await wait(100);
  loginBtn.click();
}

/* ==========================================================
            🔥 LATCH REPAINT STATES & STAGED APPLICATION APP LUNAR TIMERS
         ========================================================== */
window.appState = 'UNINITIALIZED'; // 'UNINITIALIZED' | 'FETCHING' | 'READY'
window.isUserLoggedIn = false;
window.visualProgress = 0;
window.backgroundLoadPromise = null;

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.appState === 'READY' && window.isUserLoggedIn) {
    completeLoader();
  }
});

/* =========================================
            🔥 DOM CONTENT LOADING INITIALIZER
         ========================================= */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Chart !== 'undefined') {
    Chart.register(xAxisPillPlugin);
    Chart.register(columnLabelPlugin);
  }

  // 🔥 Load internet/local time once
  await initAppTime();

  requestAnimationFrame(() => {
    renderIcons();

    id('todayDate').textContent = getTodayFormatted();

    startDigitalClock();
  });

  const loginPage = id('loginPage');
  const mainPage = id('mainPage');

  if (loginPage) loginPage.style.display = 'flex';
  if (mainPage) mainPage.style.display = 'none';

  // Prime authentication profile
  await fetch('https://office-management-f425.onrender.com/refresh/emp', { method: 'POST' });
  await loadTable('emp', 'EmpDB', false);

  populateloginStationDropdown();

  await fetch('https://office-management-f425.onrender.com/refresh/holidays', { method: 'POST' });
  await loadTable('holidays', 'Holidays', false);
  window.holidayLookup = buildHolidayLookup();

  // Background loading
  window.backgroundLoadPromise = loadAllData();
});

if (!sessionStorage.getItem('reloaded')) {
  window.addEventListener(
    'error',
    (e) => {
      if (e.target && e.target.tagName === 'LINK' && e.target.href.includes('favicon.ico')) {
        sessionStorage.setItem('reloaded', 'true');
        location.reload();
      }
    },
    true
  );
}

// ===============================================================================
//                                    🔥Login Script Engine (High-Speed O(N))
// ===============================================================================
function getUserMap() {
  const headers = empData.headers;
  const rows = empData.rows;
  if (!headers || !rows) return {};

  const idx = {
    station: headers.indexOf('Station'),
    user: headers.indexOf('Employee Name'),
    hris: headers.indexOf('HRIS'),
    initial: headers.indexOf('Initials'),
    pass: headers.indexOf('Password'),
    dept: headers.indexOf('Section')
  };

  const map = {};
  const len = rows.length;

  for (let i = 0; i < len; i++) {
    const r = rows[i];
    map[r[idx.user]] = {
      station: r[idx.station],
      user: r[idx.user],
      hris: String(r[idx.hris]).trim(),
      initial: r[idx.initial]?.trim().toUpperCase(),
      name: r[idx.user],
      password: String(r[idx.pass]).trim(),
      department: r[idx.dept]
    };
  }
  return map;
}

function getStations() {
  const users = Object.values(getUserMap());
  const stations = new Set();
  for (let i = 0; i < users.length; i++) {
    if (users[i].station) stations.add(users[i].station);
  }
  return [...stations];
}

let globalEmployeeObserver = null;

function applyStation_UserControl(loginStation, user, userRole) {
  const role = userRole?.trim().toUpperCase();

  const isRestrictedUser = !['MASTER', 'ADMIN', 'ENGG'].includes(role);

  // =========================================
  // STATION DROPDOWNS
  // =========================================
  const stationDropdowns = qsa('.stationDropdown');

  for (let i = 0; i < stationDropdowns.length; i++) {
    const stationEl = stationDropdowns[i];

    stationEl.value = loginStation;

    stationEl.dispatchEvent(new Event('change'));

    stationEl.disabled = isRestrictedUser;
  }

  // =========================================
  // WAIT FOR EMPLOYEE DROPDOWNS TO POPULATE
  // =========================================
  setTimeout(() => {
    const employeeDropdowns = qsa('.employeeDropdown');

    for (let i = 0; i < employeeDropdowns.length; i++) {
      const empEl = employeeDropdowns[i];

      const optionExists = [...empEl.options].some((opt) => String(opt.value) === String(user));

      if (optionExists) {
        empEl.value = String(user);

        empEl.dispatchEvent(new Event('change'));
      }

      empEl.disabled = isRestrictedUser;
    }
  }, 300);

  // =========================================
  // OBSERVER
  // =========================================
  if (!globalEmployeeObserver) {
    globalEmployeeObserver = new MutationObserver(() => {
      const targets = qsa('.employeeDropdown');

      for (let j = 0; j < targets.length; j++) {
        targets[j].disabled = isRestrictedUser;
      }
    });

    globalEmployeeObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

function populateloginStationDropdown() {
  const dropdown = id('loginStationDropdown');
  if (!dropdown) return;

  let html = '<option value="" hidden>Select Station</option>';
  const stations = getStations();
  for (let i = 0; i < stations.length; i++) {
    html += `<option value="${stations[i]}">${stations[i]}</option>`;
  }
  dropdown.innerHTML = html;
  id('loginUserDropdown').disabled = true;
}

function populateloginUserDropdown(station) {
  const dropdown = id('loginUserDropdown');
  if (!dropdown) return;

  let html = '<option value="" hidden>Select User</option>';
  const roles = ['MASTER', 'ENGG', 'ADMIN'];
  for (let i = 0; i < roles.length; i++) {
    html += `<option value="${roles[i]}">🔑 ${roles[i]}</option>`;
  }

  const users = Object.values(getUserMap());
  const filteredUsers = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].station === station) {
      filteredUsers.push(users[i]);
      html += `
              <option value="${users[i].hris}">
                👨‍💼 ${users[i].user}-(${users[i].hris})
              </option>`;
    }
  }

  dropdown.innerHTML = html;
  window.userList = filteredUsers;
}

on('loginStationDropdown', 'change', () => {
  const station = id('loginStationDropdown').value;
  if (!station) return;
  id('loginUserDropdown').disabled = false;
  populateloginUserDropdown(station);
});

on('loginUserDropdown', 'change', () => {
  const user = id('loginUserDropdown').value;
  if (!user || !window.userList) return;
  const record = window.userList.find((u) => String(u.hris) === String(user));
  if (record && id('SalSlipPage_Emp')) id('SalSlipPage_Emp').value = record.name;
});

const pwdEl = id('loginPasswordInput');
const toggle = id('togglePassword');
const stationEl = id('loginStationDropdown');
const userEl = id('loginUserDropdown');
const loginBtn = id('loginBtn');
const capsWarning = id('capsWarning');
const errormsg = id('loginError');

const loginControls = [toggle, pwdEl, stationEl, userEl];
const eventsList = ['click', 'keydown', 'keyup', 'blur', 'focus'];

for (let i = 0; i < loginControls.length; i++) {
  const ctrl = loginControls[i];
  if (!ctrl) continue;

  for (let j = 0; j < eventsList.length; j++) {
    ctrl.addEventListener(eventsList[j], handleEvents);
  }
  ctrl.addEventListener('change', () => {
    errormsg.textContent = '';
  });
  ctrl.addEventListener('input', () => {
    errormsg.textContent = '';
  });
}

function handleEvents(e) {
  const type = e.type;
  if (type === 'click' && e.target.closest('#togglePassword')) {
    const isHidden = pwdEl.type === 'password';
    pwdEl.type = isHidden ? 'text' : 'password';
    toggle.querySelector('i').textContent = isHidden ? 'visibility' : 'visibility_off';
    pwdEl.style.fontSize = isHidden ? '13px' : '20px';
    pwdEl.style.letterSpacing = isHidden ? '1px' : '1.7px';
    return;
  }

  if (type === 'keydown' && e.key === 'Enter') {
    if (!stationEl.value) return stationEl.focus();
    if (!userEl.value) return userEl.focus();
    loginBtn.click();
    return;
  }

  if (e.target === pwdEl) {
    if ((type === 'keydown' || type === 'keyup' || type === 'focus' || type === 'click') && typeof e.getModifierState === 'function') {
      capsWarning.classList.toggle('show', e.getModifierState('CapsLock'));
    } else if (type === 'blur') {
      capsWarning.classList.remove('show');
    }
  }
}

/* ============================================================================
        🔥 UNIFIED LOGIN & INITIALIZATION ENGINE
      ============================================================================ */

on('loginBtn', 'click', async () => {
  const station = stationEl?.value?.trim();
  const user = userEl?.value?.trim();
  const password = pwdEl?.value?.trim();

  errormsg.textContent = '';
  if (!station) return (errormsg.textContent = '❌ Please select a station');
  if (!user) return (errormsg.textContent = '❌ Please select a user');
  if (!password) return (errormsg.textContent = '❌ Please enter your password');

  loginBtn.disabled = true;
  showLoader();
  updateLoader(5, 'Authenticating...', 'login');

  try {
    const res = await fetch('https://office-management-f425.onrender.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station, user, password })
    });

    const data = await res.json();

    if (data.success) {
      window.currentStation = station;
      window.currentInitial = data.initial || '';
      // 2. Perform Login Success Pipeline
      await loginSuccess(data.user, data.displayName || data.user, station, data.role, data.hris);
    } else {
      hideLoader();
      errormsg.textContent = data.message;
    }
  } catch (err) {
    console.error(err);
    errormsg.textContent = '❌ Server error';
    hideLoader();
  } finally {
    loginBtn.disabled = false;
  }
});

async function loginSuccess(user, displayName, loginStation, userRole, hris) {
  showLoader();

  updateLoader(10, 'Login successful, synchronizing data...', 'lock_open');

  window.isUserLoggedIn = true;
  window.currentUser = user;

  // LOGIN STATE
  document.body.classList.add('logged-in');

  // 🔥 ALWAYS START COLLAPSED
  localStorage.setItem('sidebarCollapsed', 'true');
  syncSidebarUI(true);

  // USER UI
  id('welcomeUser').textContent = `Welcome ${displayName}`;

  // LOAD DATA
  await loadAllData();

  if (window.appState === 'READY') {
    await handlePostDataInitialization();
    applyStation_UserControl(loginStation, hris, userRole);
    completeLoader();
  }

  // FINAL REVEAL
  id('loginPage').style.display = 'none';

  const app = qs('.app');

  app.style.display = 'flex';

  requestAnimationFrame(() => {
    app.classList.add('loaded');
  });

  id('mainPage').style.display = 'flex';
}

async function handlePostDataInitialization() {
  try {
    //updateLoader(98, 'Finalizing Workspace...', 'settings');

    // 1. Background Refresh (Optional, non-blocking)
    //fetch('https://office-management-f425.onrender.com/refresh/all', { method: 'POST' }).catch((e) => console.warn('Refresh skipped'));

    // 2. Initial UI Bindings
    initUI();
    initAfterData();
    initPostSetup();
    applyUserAccess(window.currentUser);

    // 3. Render
    await new Promise((resolve) => requestAnimationFrame(resolve));
    renderDatabaseTables(true); // Only Dashboard

    // 4. Routing & Pipeline
    if (['MASTER', 'ADMIN'].includes(String(window.currentUser || '').toUpperCase())) {
      show('DashBoard');
    } else {
      show('EmpPage');
    }
    syncSelect('station', window.currentStation);
    filters.station = window.currentStation;

    const zone = getCityZone(window.currentStation) || {
      ta: '',
      hra: ''
    };

    ['PayBillPage', 'EmpPage'].forEach((page) => {
      const taZone = id(`${page}_TAZone`);
      const hraZone = id(`${page}_HRAZone`);

      if (taZone) taZone.value = zone.ta || '';
      if (hraZone) hraZone.value = zone.hra || '';
    });

    applyFilters();
    refreshPBView('view');
    lockRequirementTableForUser(window.currentUser);
    completeLoader();
    requestIdleCallback(() => renderDatabaseTables(false));
  } catch (err) {
    console.error('❌ Init Error:', err);
    showCustomAlert('❌ Initialization failed.');
    throw err;
  }
}

function lockRequirementTableForUser(user, isLocked = false) {
  const reqContainer = id('dutyRequirementTable');
  if (!reqContainer) return;

  const table = reqContainer.querySelector('table');
  const selects = table?.querySelectorAll('.req-select');
  if (!selects) return;

  const role = user?.trim().toUpperCase();
  const currentInitial = (window.currentInitial || user).trim().toUpperCase();
  const checkDutyMode = id('dutyModeSwitch')?.checked;

  for (let i = 0; i < selects.length; i++) {
    const select = selects[i];
    const emp = (select.dataset.emp || '').trim().toUpperCase();
    const isCurrentUser = emp === currentInitial;
    const td = select.closest('td');
    const lieu = td?.querySelector('.lieu-input');

    if (isLocked) {
      select.disabled = true;
      if (lieu) lieu.disabled = true;
      td.classList.add('disabled-cell');
      continue;
    }

    if (role === 'MASTER') {
      if (!checkDutyMode) {
        select.disabled = false;
        if (lieu) lieu.disabled = select.value !== 'C/O';
        td.classList.remove('disabled-cell');
      } else {
        select.disabled = true;
        if (lieu) lieu.disabled = true;
        td.classList.add('disabled-cell');
      }
      continue;
    }

    select.disabled = !isCurrentUser;
    if (lieu) {
      lieu.disabled = !(isCurrentUser && select.value === 'C/O');
    }
    td.classList.toggle('disabled-cell', !isCurrentUser);
  }
}

/* ============================================================================
          🔐 ACCESS RULES DEF MATRIX MATRIX
      ============================================================================ */
const ACCESS_RULES = {
  ADMIN: ['DashBoard', 'EmpPage', 'PayBillPage', 'SalarySlipPage', 'ITPage', 'PensionPage', 'BudgetPage'],
  ENGG: ['EmpPage', 'SalarySlipPage', 'DGlogPage', 'HSDlogPage', 'ElectricityPage', 'DutyPage', 'ESRPage', 'TxNPage'],
  MASTER: ['ALL'],
  DEFAULT: ['SalarySlipPage', 'EmpPage', 'DutyPage']
};

function applyUserAccess(user) {
  const buttons = qsa('.menu-btn');
  const bLen = buttons.length;
  if (!bLen) return;

  const role = user?.trim().toUpperCase();
  const access = ACCESS_RULES[role] || ACCESS_RULES.DEFAULT;

  const userMap = getUserMap();
  const record = userMap[user];
  const dept = (record?.department || '').trim().toUpperCase();
  const isRestrictedUser = !['MASTER', 'ADMIN', 'ENGG'].includes(role);

  const dutyExcel = id('DutyexcelBtn');
  const dutyPrint = id('DutyprintBtn');

  for (let i = 0; i < bLen; i++) {
    const btn = buttons[i];
    const page = btn.getAttribute('data-page');

    let isVisible = access.includes('ALL') || access.includes(page);

    if (page === 'DutyPage') {
      if (role === 'MASTER' || role === 'ENGG') {
        isVisible = true;
        if (dutyExcel) dutyExcel.disabled = false;
        if (dutyPrint) dutyPrint.disabled = false;
      } else if (role === 'ADMIN') {
        isVisible = false;
      } else {
        isVisible = dept.indexOf('ENGINEERING') !== -1;
      }
    }

    if (isRestrictedUser && page === 'DashBoard') {
      isVisible = false;
      if (dutyExcel) dutyExcel.disabled = true;
      if (dutyPrint) dutyPrint.disabled = true;
    }

    btn.style.display = isVisible ? 'flex' : 'none';
  }

  const dashboard = id('DashBoard');
  const empPage = id('EmpPage');

  if (!['MASTER', 'ADMIN'].includes(role)) {
    if (dashboard) dashboard.style.display = 'none';
    if (empPage) empPage.style.display = 'block';

    for (let i = 0; i < bLen; i++) {
      buttons[i].classList.remove('active');
    }

    const empBtn = qs('.menu-btn[data-page="EmpPage"]');
    if (empBtn) empBtn.classList.add('active');
  } else {
    if (dashboard) dashboard.style.display = 'block';
  }
}

/* ============================================================================
          ⚡ OPTIMIZED UI INITIALIZATION (Batched over repaint boundaries)
      ============================================================================ */
function initUI() {
  loadSidebarState();
  initMenu();
  initSalaryToggle();
  initDutyModeToggle();

  requestAnimationFrame(() => {
    initButtons();
  });
}

/* ============================================================================
          ⚡ OPTIMIZED AFTER-DATA COMPILATION (Eliminates layout thrashing)
      ============================================================================ */
function initAfterData() {
  initDropdowns(dutyData);

  requestAnimationFrame(() => {
    updateAndRenderDAA();
    moveIndicator();
    renderFromDropdowns();
    loadDGList();
  });
}

function initButtons() {
  const configs = [
    ['PBeditBtn', 'Edit', 'Save', 'edit', 'upload'],
    ['PBaddBtn', 'Add', 'Save', 'plus', 'upload']
  ];

  for (let i = 0; i < configs.length; i++) {
    const [btnId, def, act, dIcon, aIcon] = configs[i];
    setupPBToggleButton(btnId, {
      defaultText: def,
      activeText: act,
      defaultIcon: dIcon,
      activeIcon: aIcon,
      className: 'upload-mode'
    });
  }

  setupSBGToggleButton('SBGaddBtn', { defaultText: 'Add', activeText: 'Save', defaultIcon: 'plus', activeIcon: 'upload', className: 'upload-mode' }, 'add');
  setupSBGToggleButton('SBGeditBtn', { defaultText: 'Edit', activeText: 'Update', defaultIcon: 'edit', activeIcon: 'upload', className: 'upload-mode' }, 'edit');
}

function initPostSetup() {
  disableGroups(['.SSaction-group button', '.ITaction-group button', '.Pensionaction-group button']);
  loadCommutationOptions();
  updatePensionUI();
}

function disableGroups(selectors) {
  for (let i = 0; i < selectors.length; i++) {
    const targets = qsa(selectors[i]);
    for (let j = 0; j < targets.length; j++) {
      targets[j].disabled = true;
    }
  }
}

/* ============================================================================
          ⚡ HIGH-SPEED CLOCK ENGINE (Cached options object to lower memory usage)
      ============================================================================ */
let appTime = null;

async function getInternetTime() {
  try {
    const res = await fetch('https://office-management-f425.onrender.com/time');

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    console.log('🌐 Server time :', data.serverTime);

    return new Date(data.serverTime);
  } catch (err) {
    console.warn('⚠ Server time unavailable, using local time', err);

    return new Date();
  }
}

async function initAppTime() {
  appTime = await getInternetTime();

  setInterval(() => {
    appTime = new Date(appTime.getTime() + 1000);
  }, 1000);
}

function startDigitalClock() {
  const clock = id('digitalClock');
  if (!clock) return;

  const formatter = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  function update() {
    if (!appTime) return;

    clock.textContent = formatter.format(appTime);
  }

  update();
  setInterval(update, 1000);
}

function getTodayFormatted() {
  const now = appTime || new Date();

  return `${now.toLocaleString('en-US', {
    month: 'long'
  })}-${String(now.getDate()).padStart(2, '0')}, ${now.getFullYear()}`;
}
/* ============================================================================
          ⚡ CACHED HARDWARE GRAPHICS BADGE SYSTEM
      ============================================================================ */
function updateDBBadge() {
  const icons = qsa('.dashboard-footer-database .material-symbols-outlined');
  const total = icons.length;

  const badge = id('dbBadge');
  const db = id('DatabaseIcon');

  if (!badge || !db) return;

  // RESET
  badge.classList.remove('blink');
  db.classList.remove('db-sync', 'db-rotate');

  // DEFAULT RED
  badge.style.background = '#db0707';
  badge.style.color = '#fff';

  // NO DATABASES
  if (!total) {
    badge.textContent = '0/0';

    db.textContent = 'database_off';
    db.style.color = '#db0707';
    return;
  }

  let success = 0;
  let isSyncing = false;

  icons.forEach((icon) => {
    const txt = icon.textContent.trim();

    // SUCCESS
    if (txt === 'database' || txt === 'data_check') {
      success++;
    }

    // SYNCING
    if (txt === 'sync' || icon.classList.contains('db-sync')) {
      isSyncing = true;
    }
  });

  // BADGE TEXT
  badge.textContent = `${success}/${total}`;

  // ONLY APPLY HSL IF THERE IS SUCCESS
  if (success > 0) {
    const percent = success / total;
    const hue = percent * 120;

    badge.style.background = `hsl(${hue}, 80%, 45%)`;
    badge.style.color = hue > 60 ? '#000' : '#fff';
  }

  // SYNCING
  if (isSyncing) {
    badge.classList.add('blink');

    db.textContent = 'sync';
    db.style.color = '#2196f3';

    db.classList.add('db-sync', 'db-rotate');
    return;
  }

  // DATABASE STATUS
  if (success === 0) {
    db.textContent = 'database_off';
    db.style.color = '#db0707';
  } else if (success < total) {
    db.textContent = 'database_search';
    db.style.color = '#eb9534';
  } else {
    db.textContent = 'database';
    db.style.color = '#00b01d';
  }
}

function updateStatus(id, type = 'db', isSuccess = true) {
  const el = document.getElementById(id);
  if (!el) return;

  if (isSuccess) {
    el.textContent = type === 'db' ? 'database' : 'data_check';
    el.style.color = '#16a34a';
  } else {
    el.textContent = type === 'db' ? 'database_off' : 'data_alert';
    el.style.color = '#dc2626';
  }
  updateDBBadge();
}

function setSyncStatus(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = 'sync';
  el.style.color = '#eab308';
  el.classList.add('syncing');
  updateDBBadge();
}

function clearSyncStatus(id, type = 'db', isSuccess = true) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove('syncing');
  updateStatus(id, type, isSuccess);
}

function showLoader() {
  const loader = id('globalLoader');
  if (!loader) return;

  loader.style.display = 'flex';
  requestAnimationFrame(() => {
    loader.classList.remove('hidden');
  });
  document.body.classList.remove('loaded');
}

function hideLoader() {
  const loader = id('globalLoader');
  if (!loader) return;

  loader.classList.add('hidden');
  requestAnimationFrame(() => {
    document.body.classList.add('loaded');
  });
  setTimeout(() => {
    loader.style.display = 'none';
  }, 350);
}

function completeLoader() {
  updateLoader(100, 'Completed', 'check_circle');
  setTimeout(() => {
    hideLoader();
  }, 500);
}

function updateLoader(percent, apiName = '', type = 'download') {
  const bar = id('loaderBar');
  const text = id('loaderPercent');
  const api = id('loaderApiName');
  const status = id('loaderStatus');
  const icon = id('loaderIcon');

  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${Math.round(percent)}%`;
  if (api) api.textContent = apiName;
  if (status) status.classList.toggle('sync', type === 'sync');
  if (icon) icon.textContent = type === 'sync' ? 'sync' : 'download';
}

function showCustomAlert(message) {
  const modal = id('customAlert');
  const msgBox = id('customAlertMsg');
  const header = id('customAlertHeader');
  if (!modal || !msgBox || !header) return;
  // 🔥 RESET CLASSES
  header.classList.remove('success', 'error', 'warning', 'info');
  /* ================🔥 DETECT ALERT TYPE====== */

  let title = '🔔 Alert Message';
  // ❌ ERROR
  if (message.includes('❌') || message.toLowerCase().includes('error')) {
    header.classList.add('error');
    title = '🔔 Error Message';
  }

  // ⚠️ WARNING / NO CHANGE
  else if (message.includes('⚠️') || message.includes('ℹ️') || message.includes('🚫') || message.toLowerCase().includes('no changes')) {
    header.classList.add('warning');
    title = '🔔 Notice Message';
  }

  // ✅ SUCCESS
  else if (message.includes('✅') || message.toLowerCase().includes('success')) {
    header.classList.add('success');
    title = '🔔 Success Message';
  } else {
    header.classList.add('info'); // 🔵 DEFAULT
  }

  header.innerHTML = title; // 🔥 SET HEADER TITLE
  msgBox.innerHTML = message; // 🔥 SET MESSAGE
  modal.classList.remove('hidden'); // 🔥 SHOW MODAL
}

id('customAlertOk')?.addEventListener('click', () => {
  id('customAlert')?.classList.add('hidden');
});

/* ============================================================================
          ⚡ HIGH-SPEED PARALLEL PRE-FETCH DATA PIPELINE (Asynchronous Task Engine)
      ============================================================================ */
async function loadAllData() {
  if (window.appState !== 'UNINITIALIZED') return;
  window.appState = 'FETCHING';

  const baseUrl = 'https://office-management-f425.onrender.com';

  const tasks = [
    [
      'Loading Duty Chart & Leave Database...',
      async () => {
        await syncDutyChartToCoffList();
      },
      null
    ],
    ['Loading ESR Logs...', () => loadTable('esr', 'ESRDB', false), '/refresh/esr'],
    ['Loading Transmission Logs...', () => loadTable('txn', 'TxNDB', false), '/refresh/txn'],
    [
      'Loading Pay Bill Database...',
      async () => {
        await Promise.all([loadTable('pb', 'PBDB', false), loadTable('cpc', 'CPC7DB', false)]);
        buildEmpDBWithCalc();
        initFilters();
        await syncPBtoSBG();
        buildSBGMenuListsForChart();
      },
      '/refresh/pb' // Example: refreshes both PB and CPC
    ],
    ['Loading DG Log...', () => loadTable('dg', 'DGlog', false), '/refresh/dg'],
    ['Loading HSD Log...', () => loadTable('hsd', 'HSDlog', false), '/refresh/hsd'],
    ['Loading Electricity Log...', () => loadTable('eb', 'EBlog', false), '/refresh/eb'],
    ['Loading SBG Database...', () => loadTable('sbg', 'BudgetDB', false), '/refresh/sbg'],
    ['Loading SBG Expenditure Database...', () => loadTable('sbgexp', 'SBGexpenditureDB', false), '/refresh/sbgexp'],
    [
      'Preparing Budget Matrix...',
      () => {
        loadBudgetMonthDropdown();
        renderBudgetfromPBData();
        renderFilterMainBudgetExpTable();
      },
      null
    ],
    [
      'Loading Reference Data...',
      async () => {
        await Promise.all([loadTable('qtrs', 'QtrsRateDB', false), loadTable('city', 'CityZoneDB', false), loadTable('comm', 'CommFactDB', false), loadTable('it', 'ITDB', false), loadTable('cpc', 'CPC7DB', false)]);
      },
      '/refresh/reference'
    ]
  ];

  const totalTasks = tasks.length;
  window.visualProgress = 0;

  function animateProgress(target, apiName) {
    return new Promise((resolve) => {
      const start = window.visualProgress;
      const diff = target - start;
      const duration = 200;
      let startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        window.visualProgress = start + diff * (1 - Math.pow(1 - progress, 3));
        if (window.isUserLoggedIn) updateLoader(window.visualProgress, apiName, 'sync');
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  for (let i = 0; i < totalTasks; i++) {
    const [title, task, endpoint] = tasks[i];
    const targetPercent = ((i + 1) / totalTasks) * 100;

    // 1. Refresh specific data if endpoint exists
    if (endpoint) {
      try {
        await fetch(`${baseUrl}${endpoint}`, { method: 'POST' });
      } catch (e) {
        console.warn(`Refresh skipped for ${endpoint}`);
      }
    }

    // 2. Perform the load task and animate progress
    await Promise.all([animateProgress(targetPercent, title), Promise.resolve().then(task)]);
  }

  window.appState = 'READY';
  if (window.isUserLoggedIn) await handlePostDataInitialization();
}

function renderIcons() {
  if (typeof lucide === 'undefined') return;

  qsa('i[data-lucide]').forEach((el) => (el.innerHTML = ''));

  lucide.createIcons({
    icons: lucide.icons,
    nameAttr: 'data-lucide',
    attrs: { 'stroke-width': 2 }
  });
}

/* =========================
            🔥 UNIVERSAL DATE UTILITY
            ========================= */
function makeEmpKey(name, hris) {
  return `${String(name || '').trim()}|${String(hris || '').trim()}`;
}

/* =======================================================================
      🔥🔥🔥🔥SELECT DROPDOWN UPDATION & SYNCH WITH ALL SELECT🔥🔥🔥🔥
      ========================================================================== */
let filters = {
  station: '',
  employee: '',
  fy: '',
  month: ''
};

const selectMap = {
  station: ['EmpPage_Station', 'SalSlipPage_Station', 'ITPage_Station', 'PensionPage_Station', 'PayBillPage_Station', 'BudgetPage_Station', 'EBPage_Station', 'DGPage_Station', 'HSDPage_Station'],
  employee: ['EmpPage_Emp', 'ITPage_Emp', 'PensionPage_Emp', 'SalSlipPage_Emp', 'PayBillPage_Emp'],
  fy: ['PayBillPage_FY', 'ITPage_FY', 'SalSlipPage_FY', 'BudgetPage_FY', 'EBPage_FY', 'DGPage_FY', 'HSDPage_FY'],
  month: ['PayBillPage_SalMonth', 'SalSlipPage_SalMonth']
};

function syncSelect(group, value) {
  selectMap[group].forEach((idStr) => {
    const el = id(idStr);
    if (el) el.value = value;
  });
}

function handleStationChange(sourceId) {
  const station = id(sourceId).value;

  if (!station || station === filters.station) return;

  const daInput = id('PayBillPage_DA%');
  const daPercent = Number(daInput?.value) || 0;

  let percent = zone.hra === 'X' ? 28 : zone.hra === 'Y' ? 18 : 8;

  if (daPercent >= 50) {
    percent += 2;
  } else if (daPercent >= 25) {
    percent += 1;
  }

  const hraPercentInput = id('PayBillPage_HRA%');

  if (hraPercentInput) {
    hraPercentInput.value = percent;
  }

  // =====================================
  // 🔥 NOW APPLY FILTERS
  // =====================================

  syncSelect('station', station);

  filters.station = station;

  applyFilters();

  // =====================================
  // 🔥 RESET EMPLOYEE
  // =====================================

  filters.employee = '';

  setValueSelect('employee', '');

  selectMap.employee.forEach((eid) => {
    const el = id(eid);

    if (el) {
      el.selectedIndex = -1;
    }
  });

  requestAnimationFrame(() => {
    recalculateAllRows();
    refreshPBView('view');
  });
}

selectMap.station.forEach((fid) => {
  on(fid, 'change', () => handleStationChange(fid));
});

[...selectMap.fy, ...selectMap.month].forEach((fid) => {
  on(fid, 'change', () => refreshPBView('view'));
});

function getValue(type) {
  for (let elId of selectMap[type]) {
    let el = id(elId); // ✅ correct
    if (el && el.value) return el.value;
  }
  return '';
}

function setValueSelect(type, value) {
  selectMap[type].forEach((eid) => {
    let el = id(eid);
    if (el) el.value = value;
  });
}

function getFinancialYear(monthStr) {
  // Example: Apr-2025
  let [mon, year] = monthStr.split('-');
  year = parseInt(year);

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

  let m = months[mon];

  if (m >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

function updateAllSelects(type, dataSet, selectedValue) {
  const labelMap = {
    fy: 'Select FY',
    month: 'Select Month',
    station: 'Select Station',
    employee: 'Select Employee'
  };

  let values = [...dataSet];

  // ================= SORT =================
  if (type === 'fy' || type === 'month') {
    values.sort((a, b) => {
      const order = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

      let [ma, ya] = String(a).split('-');
      let [mb, yb] = String(b).split('-');

      ya = parseInt(ya);
      yb = parseInt(yb);

      if (ya !== yb) {
        return ya - yb;
      }

      return order.indexOf(ma) - order.indexOf(mb);
    });
  } else {
    values.sort();
  }

  // ================= FINAL VALUE =================
  let finalValue = '';

  if (type === 'employee') {
    finalValue = selectedValue || '';
  } else {
    let valid = values.includes(selectedValue);
    finalValue = valid ? selectedValue : '';
  }

  // ================= UPDATE SELECTS =================
  selectMap[type].forEach((eid) => {
    let select = id(eid);

    if (!select) return;

    // 🔥 RESET
    select.innerHTML = '';

    // ================= DEFAULT OPTION =================
    const defaultOpt = document.createElement('option');

    defaultOpt.value = '';

    defaultOpt.textContent = labelMap[type] || 'Select';

    defaultOpt.hidden = true;

    defaultOpt.selected = !finalValue;

    select.appendChild(defaultOpt);

    // ================= OPTIONS GENERATION=================
    if (type === 'employee') {
      values.forEach((item) => {
        const emp = JSON.parse(item);

        const opt = document.createElement('option');

        opt.value = emp.hris; // HRIS
        opt.textContent = emp.name; // Employee Name

        if (String(emp.hris) === String(finalValue)) {
          opt.selected = true;
        }

        select.appendChild(opt);
      });
    } else {
      values.forEach((val) => {
        const opt = document.createElement('option');

        opt.value = val;
        opt.textContent = val;

        if (val === finalValue) {
          opt.selected = true;
        }

        select.appendChild(opt);
      });
    }
    // 🔥 IMPORTANT FIX
    select.value = finalValue || '';
  });

  return finalValue;
}

function cleanCity(city) {
  if (!city) return '';

  return String(city)
    .replace(/^(AIR|AV|DD|HPT|LRS|CBS|LPT)\s*/i, '') // remove prefix
    .trim()
    .toLowerCase();
}

function getCityZone(city) {
  if (!cityData || !cityData.headers || !cityData.rows) return {};

  const rows = cityData.rows;

  const cleanInput = cleanCity(city).replace(/\s+/g, '');

  /* ================= NORMAL MATCH ================= */

  for (let r of rows) {
    const dbCity = cleanCity(r[0]).replace(/\s+/g, '');

    if (dbCity === cleanInput || dbCity.includes(cleanInput) || cleanInput.includes(dbCity)) {
      return {
        ta: r[2], // TA Zone
        hra: r[1] // HRA Zone
      };
    }
  }

  /* ================= FALLBACK: OTHER ================= */

  for (let r of rows) {
    const dbCityRaw = String(r[0]).trim().toLowerCase();

    if (dbCityRaw === 'other') {
      return {
        ta: r[2],
        hra: r[1]
      };
    }
  }

  /* ================= NOT FOUND ================= */

  return {};
}

function applyFilters() {
  if (!pbData.headers) return;

  const { headers, rows } = pbData;

  const idx = {
    station: headers.indexOf('Pay Drawn Station'),
    emp: headers.indexOf('Employee Name'),
    hris: headers.indexOf('HRIS'),
    month: headers.indexOf('Salary Month')
  };

  const sets = {
    station: new Set(),
    employee: new Set(),

    // 🔥 MODULE FY SETS
    fy: {
      PayBillPage_FY: new Set(),
      ITPage_FY: new Set(),
      SalSlipPage_FY: new Set(),
      BudgetPage_FY: new Set(),
      EBPage_FY: new Set(),
      DGPage_FY: new Set(),
      HSDPage_FY: new Set()
    }
  };

  const valid = {
    employee: new Set(),
    fy: new Set(),
    month: new Set()
  };

  const addedEmployees = new Set();
  const addedValidEmployees = new Set();

  // =========================
  // EMPLOYEE MASTER MAP
  // =========================
  const empHeaders = window.empCalcHeaders;

  const empNameIdx = empHeaders.indexOf('Employee Name');
  const empHRISIdx = empHeaders.indexOf('HRIS');

  const empMasterMap = new Map();

  window.empCalcRows.forEach((row) => {
    const empHRIS = String(row[empHRISIdx] || '').trim();

    if (!empHRIS) return;

    empMasterMap.set(empHRIS, {
      name: String(row[empNameIdx] || '').trim(),
      hris: empHRIS
    });
  });

  rows.forEach((r) => {
    const station = r[idx.station];
    const emp = String(r[idx.emp] || '').trim();
    const hris = String(r[idx.hris] || '').trim();
    const month = r[idx.month];
    const fy = getFinancialYear(month);

    ['PayBillPage_FY', 'ITPage_FY', 'SalSlipPage_FY'].forEach((idStr) => {
      sets.fy[idStr].add(fy);
    });

    sets.station.add(station);

    // FILTERED EMPLOYEE LIST
    if (!filters.station || station === filters.station) {
      if (!addedValidEmployees.has(hris)) {
        addedValidEmployees.add(hris);

        const empMaster = empMasterMap.get(hris);

        if (empMaster) {
          valid.employee.add(JSON.stringify(empMaster));
        } else {
          // fallback
          valid.employee.add(
            JSON.stringify({
              name: emp,
              hris: hris
            })
          );
        }
      }

      valid.fy.add(fy);
    }

    if ((isAddMode && getFinancialYear(filters.month || month) === fy) || (!isAddMode && fy === filters.fy)) {
      valid.month.add(month);
    }
  });

  // ================= FY + EMP VALIDATION =================
  if (filters.station) {
    // 🔥 KEEP SELECT FY DEFAULT
    if (!filters.fy || filters.fy === '' || filters.fy === 'Select FY') {
      filters.fy = 'Select FY';
      disableAllButtons();
    } else {
      enableAllButtons();
    }
    toggleSBGButtons('pbData');
  }

  // ================= MONTH =================
  if (isAddMode && filters.month) {
    valid.month.add(String(filters.month).trim());
  }

  const monthOrder = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

  const sortedMonths = [...valid.month].sort((a, b) => {
    const [ma, ya] = a.split('-');
    const [mb, yb] = b.split('-');
    return ya - yb || monthOrder.indexOf(ma) - monthOrder.indexOf(mb);
  });

  // =====================================
  // 🔥 FORCE ADD MONTH
  // =====================================

  if (isAddMode && window.forcePBMonth && valid.month.has(window.forcePBMonth)) {
    filters.month = window.forcePBMonth;
  } else if (!isAddMode && !valid.month.has(filters.month)) {
    filters.month = sortedMonths.at(-1) || '';
  }

  /* =====================================
        🔥 MODULE FY DATASETS
        ===================================== */

  function populateFYFromDataset(selectId, dataObj) {
    const select = id(selectId);

    if (!select) return;

    const rows = dataObj?.rows || [];
    const headers = dataObj?.headers || [];

    /* =====================================
          🔥 UNIVERSAL FY COLUMN DETECTION
          ===================================== */

    const possibleColumns = ['Date', 'Salary Month', 'Month-Year', 'Month', 'Bill Month', 'Financial Month'];

    let idxDate = -1;

    // EXACT MATCH
    for (let i = 0; i < possibleColumns.length; i++) {
      idxDate = headers.findIndex((h) => String(h).trim().toLowerCase() === possibleColumns[i].toLowerCase());

      if (idxDate !== -1) break;
    }

    // PARTIAL FALLBACK
    if (idxDate === -1) {
      idxDate = headers.findIndex((h) => {
        const col = String(h).trim().toLowerCase();

        return col.includes('date') || col.includes('month');
      });
    }

    /* =====================================
          🚫 NO VALID COLUMN
          ===================================== */

    if (idxDate === -1) {
      //console.warn(`❌ No valid FY column found for ${selectId}`, headers);
      return;
    }

    /* =====================================
          🔥 BUILD FY SET
          ===================================== */

    const fySet = new Set();

    for (let i = 0; i < rows.length; i++) {
      const value = String(rows[i][idxDate] || '').trim();
      if (!value) continue;
      let fy = '';
      const parts = value.split('-');

      /* =====================================
            🔥 DD-MM-YYYY
            ===================================== */

      if (parts.length === 3 && parts[2].length === 4) {
        const mm = parseInt(parts[1], 10);
        const yyyy = parseInt(parts[2], 10);
        fy = mm >= 4 ? `${yyyy}-${String(yyyy + 1).slice(-2)}` : `${yyyy - 1}-${String(yyyy).slice(-2)}`;
      } else {
        /* =====================================
            🔥 MON-YYYY
            ===================================== */
        fy = getFinancialYear(value);
      }

      if (fy) {
        fySet.add(fy);
      }
    }

    /* =====================================
          🔥 SORT FY
          ===================================== */

    const sortedFY = [...fySet].sort((a, b) => {
      const ay = parseInt(a.split('-')[0], 10);
      const by = parseInt(b.split('-')[0], 10);
      return ay - by;
    });

    /* =====================================
          🔥 RENDER SELECT
          ===================================== */

    select.innerHTML = `
            <option value="Select FY" hidden>
              Select FY
            </option>
          `;

    sortedFY.forEach((fy) => {
      const opt = document.createElement('option');
      opt.value = fy;
      opt.textContent = fy;
      if (fy === filters.fy) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    /* =====================================
          🔥 DEFAULT VALUE
          ===================================== */

    select.value = filters.fy && filters.fy !== '' ? filters.fy : 'Select FY';
  }
  updateMonthDropdown(sortedMonths);

  // ================= FINAL DROPDOWNS =================
  filters.station = updateAllSelects('station', sets.station, filters.station);
  filters.employee = updateAllSelects('employee', valid.employee, filters.employee);
  // 🔥 PAY BILL / SALARY
  populateFYFromDataset('PayBillPage_FY', pbData);
  populateFYFromDataset('ITPage_FY', pbData);
  populateFYFromDataset('SalSlipPage_FY', pbData);
  populateFYFromDataset('BudgetPage_FY', sbgExpData);
  populateFYFromDataset('EBPage_FY', ebData);
  populateFYFromDataset('DGPage_FY', dgData);
  populateFYFromDataset('HSDPage_FY', hsdData);
  toggleDropdowns();

  function updateMonthDropdown(months) {
    selectMap.month.forEach((eid) => {
      const select = id(eid);

      if (!select) return;

      // =====================================
      // 🔥 SAVE CURRENT VALUE
      // =====================================

      const forcedValue = isAddMode && window.forcePBMonth ? window.forcePBMonth : filters.month;

      // =====================================
      // 🔥 RESET OPTIONS
      // =====================================

      select.innerHTML = `
              <option value="Select Month" hidden>
                Select Month
              </option>
            `;

      // =====================================
      // 🔥 ADD MONTHS
      // =====================================

      months.forEach((val) => {
        const opt = document.createElement('option');

        opt.value = val;

        opt.textContent = val;

        // 🔥 FORCE SELECT
        if (String(val).trim() === String(forcedValue).trim()) {
          opt.selected = true;
        }

        select.appendChild(opt);
      });

      // =====================================
      // 🔥 FORCE VALUE
      // =====================================

      if (forcedValue && forcedValue !== '') {
        select.value = forcedValue;
      } else {
        select.value = 'Select Month';
      }

      // =====================================
      // 🔥 FINAL SAFETY
      // =====================================

      const optionIndex = [...select.options].findIndex((o) => String(o.value).trim() === String(forcedValue).trim());

      if (optionIndex >= 0) {
        select.selectedIndex = optionIndex;
      }
    });
  }

  function toggleDropdowns() {
    const hasStation = !!filters.station;
    const hasFY = !!filters.fy && filters.fy !== 'Select FY';

    selectMap.fy.forEach((eid) => {
      const el = id(eid);
      if (!el) return;
      el.disabled = !hasStation;
      if (!hasStation) el.value = '';
    });

    selectMap.employee.forEach((eid) => {
      const el = id(eid);
      if (!el) return;
      el.disabled = !hasStation;
      if (!hasStation) el.value = '';
    });

    selectMap.month.forEach((eid) => {
      const el = id(eid);

      if (!el) return;

      // 🔥 NEVER RESET DURING ADD MODE
      if (isAddMode) {
        el.disabled = false;

        return;
      }

      el.disabled = !hasFY;

      if (!hasFY) {
        el.value = 'Select Month';
      }
    });
  }
}

function updateStationHeaders(station) {
  qsa('.DAAheader-Station').forEach((h3) => {
    h3.textContent = station || '';
  });
}

function initGlobalEvents() {
  Object.entries(selectMap).forEach(([type, ids]) => {
    ids.forEach((eid) => {
      const el = id(eid);
      if (!el) return;

      el.addEventListener('change', () => {
        const value = el.value;
        filters[type] = value;

        // 🔁 Sync all same-type dropdowns
        setValueSelect(type, value);

        // 🔄 Apply filters once
        applyFilters();

        // 🎯 Type-specific actions
        handleTypeEffects(type, value);

        //console.log(type, value);
      });
    });
  });

  function handleTypeEffects(type, value) {
    switch (type) {
      case 'station':
        updateStationHeaders(value);
        break;

      case 'employee':
        fillEmpDetails(value);
        break;
    }

    // 🔥 Call once instead of 4 times
    SyncAllPage();
  }
}

async function initFilters() {
  applyFilters();
  initGlobalEvents();
}

function buildPrintHeader(doc, station = '') {
  const header = doc.createElement('table');
  header.style.width = '100%';
  header.style.borderCollapse = 'collapse';
  header.style.marginBottom = '6px';
  header.style.borderBottom = 'solid 2px black'; // ✅ FIXED

  header.innerHTML = `
                <tr>
                  <!-- LOGO -->
                  <td style="width:70px; text-align:left;border-right:none !important">
                    <img
                      src="https://lh3.googleusercontent.com/d/1sQffx9-cScAEVjVIB_joxX2IMyKYKQ6l"
                      style="width:60px;height:60px;"
                    />
                  </td>

                  <!-- TEXT -->
                  <td style="text-align:center;border-left:none !important;border-right:none !important">
                    <div style="font-size:12px;font-weight:bold;">PRASAR BHARATI</div>
                    <div style="font-size:12px;font-weight:bold;">INDIA'S PUBLIC SERVICE BROADCASTER</div>
                    <div style="font-size:12px;font-weight:bold;">ALL INDIA RADIO</div>
                    <div style="font-size:12px;font-weight:bold;">${station || ''}</div>
                  </td>

                  <!-- EMPTY -->
                  <td style="width:70px;border-left:none !important"></td>
                </tr>
              `;

  return header;
}

/* =====================================================
        🔥 SHOW CONFIRM
        ===================================================== */

function showConfirmBox({
  title = 'Confirmation',

  icon = '⚠️',

  message = 'Are you sure?',

  subMessage = '',

  yesText = 'Yes',

  noText = 'No',

  yesColor = '#ef4444',

  onYes = () => {},

  onNo = () => {}
} = {}) {
  const modal = id('logoutConfirm');

  if (!modal) return;

  /* ===============================================
          🔥 HEADER
          =============================================== */

  const header = modal.querySelector('.custom-alert-header');

  if (header) {
    header.innerHTML = icon + ' ' + title;
  }

  /* ===============================================
          🔥 BODY
          =============================================== */

  const body = modal.querySelector('.custom-alert-body');

  if (body) {
    body.innerHTML = `

              <div
                style="
                  font-size:60px;
                  margin-bottom:14px;
                "
              >
                ${icon}
              </div>

              <div
                style="
                  font-size:14px;
                  font-weight:700;
                  margin-bottom:10px;
                "
              >
                ${message}
              </div>

              <div
                style="
                  opacity:.7;
                  font-size:13px;
                "
              >
                ${subMessage}
              </div>

            `;
  }

  /* ===============================================
          🔥 BUTTONS
          =============================================== */

  const yesBtn = id('logoutYesBtn');

  const noBtn = id('logoutNoBtn');

  if (yesBtn) {
    yesBtn.textContent = yesText;

    yesBtn.style.background = yesColor;
  }

  if (noBtn) {
    noBtn.textContent = noText;
  }

  /* ===============================================
          🔥 CALLBACKS
          =============================================== */

  confirmYesCallback = onYes;

  confirmNoCallback = onNo;

  /* ===============================================
          🔥 SHOW
          =============================================== */

  modal.classList.remove('hidden');
}

/* =====================================================
        🔥 CLOSE CONFIRM
        ===================================================== */

function closeConfirmBox() {
  id('logoutConfirm')?.classList.add('hidden');
}

/* =====================================================
        🔥 YES BUTTON
        ===================================================== */

id('logoutYesBtn')?.addEventListener('click', () => {
  closeConfirmBox();

  confirmYesCallback?.();
});

/* =====================================================
        🔥 NO BUTTON
        ===================================================== */

id('logoutNoBtn')?.addEventListener('click', () => {
  closeConfirmBox();

  confirmNoCallback?.();
});

/* =====================================================
      🔥 LOGOUT BUTTON
      ===================================================== */

id('logoutBtn')?.addEventListener('click', () => {
  const noBtn = id('logoutNoBtn');
  if (noBtn) noBtn.style.display = 'block';

  showConfirmBox({
    title: 'Logout Confirmation',
    icon: '🔐',
    message: 'Do you want to Logout?',
    subMessage: 'Your current session will be closed.',
    yesText: 'Logout',
    noText: 'Cancel',
    yesColor: '#ef4444',

    // 🔥 Mark this callback as async so you can use await if needed
    onYes: async () => {
      try {
        /* =====================================
                🔥 1. CLEAR JS DATA CACHES
                ===================================== */
        // Reset your global data objects
        window.pbData = { headers: [], rows: [] };
        window.dgData = { headers: [], rows: [] };
        window.ebData = { headers: [], rows: [] };
        window.sbgData = { headers: [], rows: [] };

        // Reset filters
        filters = { station: '', year: '' };

        /* =====================================
                🔥 2. CLEAR BROWSER STORAGE
                ===================================== */
        localStorage.clear();
        sessionStorage.clear();

        /* =====================================
                🔥 3. UI RESET & RELOAD
                ===================================== */
        document.body.classList.remove('logged-in');

        // A hard reload is the cleanest way to clear all memory
        window.location.reload();
      } catch (err) {
        console.error('Logout failed:', err);
        window.location.reload(); // Still reload even if error occurs
      }
    }
  });
});
