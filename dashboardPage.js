//========================================================================================================================//
//                                               🔥🔥🔥🔥🔥MAIN PAGE DASHBOARD SCRIPT🔥🔥🔥🔥🔥
//========================================================================================================================//

// 🔥 X-Axis Pill Plugin (matches table serial style)
const xAxisPillPlugin = {
  id: 'xAxisPill',

  afterDraw(chart) {
    const {
      ctx,
      scales: { x }
    } = chart;

    ctx.save();

    x.ticks.forEach((tick, i) => {
      const xPos = x.getPixelForTick(i);
      const yPos = x.bottom; // ✅ below axis

      const text = tick.label.toString();

      ctx.font = '11px sans-serif';
      const textWidth = ctx.measureText(text).width;

      const width = 20;
      const height = 18;
      const radius = 6;

      // pill background
      ctx.fillStyle = '#2563eb';

      ctx.beginPath();
      ctx.moveTo(xPos - width / 2 + radius, yPos);
      ctx.lineTo(xPos + width / 2 - radius, yPos);
      ctx.quadraticCurveTo(xPos + width / 2, yPos, xPos + width / 2, yPos + radius);
      ctx.lineTo(xPos + width / 2, yPos + height - radius);
      ctx.quadraticCurveTo(xPos + width / 2, yPos + height, xPos + width / 2 - radius, yPos + height);
      ctx.lineTo(xPos - width / 2 + radius, yPos + height);
      ctx.quadraticCurveTo(xPos - width / 2, yPos + height, xPos - width / 2, yPos + height - radius);
      ctx.lineTo(xPos - width / 2, yPos + radius);
      ctx.quadraticCurveTo(xPos - width / 2, yPos, xPos - width / 2 + radius, yPos);
      ctx.closePath();
      ctx.fill();

      // text
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, xPos, yPos + height / 2);
    });

    ctx.restore();
  }
};

const columnLabelPlugin = {
  id: 'columnLabelPlugin',

  afterDatasetsDraw(chart, args, pluginOptions) {
    if (!pluginOptions || !pluginOptions.enabled) return;

    const { ctx } = chart;

    const {
      numeratorDatasetIndex = 0,
      denominatorDatasetIndex = null,

      mode = 'percent', // "percent" | "value" | "custom"

      color = '#111827',
      font = {
        size: 12,
        family: 'Segoe UI, Arial, sans-serif',
        weight: 'bold'
      },

      minDisplay = 0,

      offsetY = 12, // 🔥 NEW (control height)
      rotate = false, // 🔥 NEW (rotate label)

      formatter
    } = pluginOptions;

    const numerator = chart.data.datasets[numeratorDatasetIndex];
    const denominator = denominatorDatasetIndex !== null ? chart.data.datasets[denominatorDatasetIndex] : null;

    const meta = chart.getDatasetMeta(numeratorDatasetIndex);

    ctx.save();
    ctx.font = `${font.weight || 'normal'} ${font.size || 10}px ${font.family || 'sans-serif'}`;
    ctx.fillStyle = color;
    ctx.textAlign = rotate ? 'left' : 'center';

    meta.data.forEach((bar, i) => {
      const num = numerator.data[i] || 0;

      let total = 0;

      if (denominator) {
        total = num + (denominator.data[i] || 0);
      } else {
        total = chart.data.datasets.reduce((sum, ds) => sum + (ds.data[i] || 0), 0);
      }

      // 🔥 FIX: zero-safe percent
      let percent = 0;
      if (total > 0) {
        percent = (num / total) * 100;
      }

      if (percent < minDisplay && percent !== 0) return;

      let text = ''; // 🔥 FIX: declare text

      // 🔥 MODE HANDLING
      if (mode === 'percent') {
        text = percent.toFixed(0) + '%';
      } else if (mode === 'value') {
        text = num.toLocaleString();
      } else if (mode === 'custom' && formatter) {
        text = formatter({
          value: num,
          percent,
          index: i,
          chart
        });
      }

      const x = bar.x;
      const y = chart.scales.y.getPixelForValue(0) - offsetY;

      ctx.save();

      if (rotate) {
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(text, 0, 0);
      } else {
        ctx.fillText(text, x, y);
      }

      ctx.restore();
    });

    ctx.restore();
  }
};

let currentMode = 'budget';

id('btnBudget').onclick = () => {
  currentMode = 'budget';
  setActiveBtn('btnBudget');

  buildSBGMenuListsForChart(); // 🔥 now handles FY internally

  setActiveYearButton(currentYear); // 🔥 sync UI

  renderSBGCharts(currentYear, filters.station);
};

id('btnSalary').onclick = () => {
  currentMode = 'salary';
  setActiveBtn('btnSalary');

  buildSalaryMenuListsForChart();

  setActiveYearButton(currentYear);

  renderSalaryCharts(currentYear, filters.station);
};

function getCurrentFinancialYear() {
  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth() + 1; // Jan = 1

  // 🔥 FY starts from March
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

function setActiveYearButton(fy) {
  const yearButtons = qsa('#yearList .side-btn');

  if (!yearButtons.length) return; // 🔥 prevent empty case

  yearButtons.forEach((btn) => {
    btn.classList.remove('active');

    if (btn.textContent.trim() === fy) {
      btn.classList.add('active');
    }
  });
}

function setActiveBtn(id) {
  qsa('.chart-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

//==============Table Animation on rerender =============//
function renderWithAnimation(table, html) {
  // 🔥 STEP 1: fade out
  table.classList.remove('show');
  table.classList.add('hide');

  setTimeout(() => {
    // 🔥 STEP 2: replace content AFTER fade out
    table.innerHTML = html;

    // 🔥 force reflow
    void table.offsetHeight;

    // 🔥 STEP 3: fade in
    table.classList.remove('hide');
    table.classList.add('show');
  }, 300); // match CSS duration
}

const BAR_WIDTH = 18; // width of bar
const GAP = 7; // space between columns
const STEP = BAR_WIDTH + GAP;

//==============Auto Width to Max-Width of Chart Div =============//

function setChartWidth(labels) {
  const inner = id('chartInner');
  if (!inner) return;

  const requiredWidth = labels.length * STEP;
  inner.style.width = requiredWidth + 'px';
}

function attachChartMouseLeave(canvas, highlightFn) {
  canvas.addEventListener('mouseleave', () => {
    if (isTableHover) return;

    highlightFn(-1);

    if (!window.barChart) return;

    const chart = window.barChart;
    chart.setActiveElements([]);
    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    chart.update('none');
  });
}

function scrollChartToIndex(index) {
  if (!window.barChart) return;

  const chart = window.barChart;
  const meta = chart.getDatasetMeta(0);
  const bar = meta.data[index];

  if (!bar) return;

  const scrollBox = qs('.chart-scroll');

  const barX = bar.x; // position inside canvas
  const viewLeft = scrollBox.scrollLeft;
  const viewRight = viewLeft + scrollBox.clientWidth;

  // 🔥 if bar is outside view → scroll
  if (barX < viewLeft + 40 || barX > viewRight - 40) {
    scrollBox.scrollTo({
      left: barX - scrollBox.clientWidth / 2,
      behavior: 'smooth'
    });
  }
}

//=============== Highlight Table row on Chart Bar Hover ===========//
function highlightTableRow(index) {
  const rows = qsa('#dashBoardTable tbody tr');
  const container = qs('.table-box');

  rows.forEach((r) => r.classList.remove('highlight'));

  if (!rows[index]) return;

  const row = rows[index];
  row.classList.add('highlight');

  const header = qs('#dashBoardTable thead');
  const headerHeight = header ? header.offsetHeight : 0;

  const rowTop = row.offsetTop;
  const rowBottom = rowTop + row.offsetHeight;

  const viewTop = container.scrollTop;
  const viewBottom = viewTop + container.clientHeight;

  // 🔥 CASE 1: Row hidden behind sticky header (TOP FIX)
  if (rowTop < viewTop + headerHeight + 10) {
    container.scrollTo({
      top: rowTop - headerHeight - 35,
      behavior: 'smooth'
    });
  }

  // 🔥 CASE 2: Row below visible area (BOTTOM FIX)
  else if (rowBottom > viewBottom - 10) {
    container.scrollTo({
      top: rowBottom - container.clientHeight + 35,
      behavior: 'smooth'
    });
  }
}

//================= Table Row Hover effect on Chart ===============//
let isTableHover = false;

const table = id('dashBoardTable');

table.addEventListener('mousemove', (e) => {
  const row = e.target.closest('tr');
  if (!row || !row.parentElement.matches('tbody')) return;

  isTableHover = true;

  const index = Array.from(row.parentElement.children).indexOf(row);

  if (!window.barChart) return;

  const chart = window.barChart;

  const activeElements = [{ datasetIndex: 0, index }];

  chart.setActiveElements(activeElements);

  const meta = chart.getDatasetMeta(0);
  const bar = meta.data[index];

  if (bar) {
    chart.tooltip.setActiveElements(activeElements, {
      x: bar.x,
      y: bar.y
    });
  }

  // 🔥 NEW: scroll chart to bar
  scrollChartToIndex(index);

  chart.update('none');
});

table.addEventListener('mouseleave', () => {
  isTableHover = false;

  if (!window.barChart) return;

  const chart = window.barChart;

  chart.setActiveElements([]);
  chart.tooltip.setActiveElements([], { x: 0, y: 0 });

  // 🔥 clear correct table highlight
  if (currentMode === 'budget') {
    highlightTableRow(-1);
  } else {
    highlightTableRow(-1);
  }

  chart.update('none');
});

//=====================SBG Chart Datas =====================================================//
function buildSBGMenuListsForChart() {
  const headers = sbgData.headers;
  const rows = sbgData.rows;

  const stationRow = rows[0];

  // =========================
  // 🔹 GET CONTAINERS
  // =========================
  const stationContainer = id('stationList');
  const yearContainer = id('yearList');

  const stationItems = stationContainer.querySelector('.side-items');
  const yearItems = yearContainer.querySelector('.side-items');

  // 🔥 CLEAR ONLY ITEMS (not header)
  stationItems.innerHTML = '';
  yearItems.innerHTML = '';

  // =========================
  // 🔹 STATIONS
  // =========================
  const stations = [
    ...new Map(
      stationRow
        .slice(1)
        .map((s) => String(s).trim())
        .filter(Boolean)
        .map((s) => [s.toLowerCase(), s])
    ).values()
  ];

  stations.forEach((st) => {
    const btn = document.createElement('button');
    btn.className = 'side-btn';
    btn.textContent = st;

    btn.onclick = () => {
      stationItems.querySelectorAll('.side-btn').forEach((b) => b.classList.remove('active'));

      btn.classList.add('active');

      filters.station = st;
      renderSBGCharts(currentYear, st);
    };

    stationItems.appendChild(btn); // ✅ FIXED
  });

  // =========================
  // 🔹 YEARS
  // =========================
  const years = [
    ...new Set(
      headers
        .filter((h) => h.includes('(SBG)'))
        .map((h) => h.match(/\d{4}-\d{2}/)?.[0])
        .filter(Boolean)
    )
  ].sort((a, b) => b.localeCompare(a)); // 🔥 newest first

  years.forEach((yr) => {
    const btn = document.createElement('button');
    btn.className = 'side-btn';
    btn.textContent = yr;

    btn.onclick = () => {
      yearItems.querySelectorAll('.side-btn').forEach((b) => b.classList.remove('active'));

      btn.classList.add('active');

      currentYear = yr;
      renderSBGCharts(currentYear, filters.station);
    };

    yearItems.appendChild(btn); // ✅ FIXED
  });

  // =========================
  // 🔥 DEFAULT
  // =========================
  const fy = getCurrentFinancialYear();

  if (years.includes(fy)) {
    currentYear = fy;
  } else {
    currentYear = years[0] || '';
  }

  // 🔥 DEFAULT STATION (CRITICAL FIX)
  const firstStationBtn = stationItems.querySelector('.side-btn');
  if (firstStationBtn) {
    firstStationBtn.classList.add('active');
    filters.station = firstStationBtn.textContent.trim(); // ✅ SET VALUE
  }

  // 🔥 DEFAULT YEAR UI
  const activeYearBtn = [...yearItems.querySelectorAll('.side-btn')].find((btn) => btn.textContent.trim() === currentYear);

  if (activeYearBtn) {
    activeYearBtn.classList.add('active');
  } else {
    yearItems.querySelector('.side-btn')?.classList.add('active');
  }

  // 🔥 FINAL RENDER (now station is valid)
  renderSBGCharts(currentYear, filters.station);
}

function getSBGDataforChart(year, station) {
  const headers = sbgData.headers;
  const rows = sbgData.rows;

  const stationRow = rows[0];
  const dataRows = rows.slice(1);

  let sbgIdx = -1;
  let usedIdx = -1;

  headers.forEach((h, i) => {
    const fy = h.match(/\d{4}-\d{2}/)?.[0];
    const clean = h.toLowerCase();

    if (fy === year && String(stationRow[i]).trim().toLowerCase() === station.toLowerCase()) {
      if (clean.includes('(sbg)') && sbgIdx === -1) sbgIdx = i;
      if (clean.includes('(used)') && usedIdx === -1) usedIdx = i;
    }
  });

  if (sbgIdx === -1) return null;

  const labels = [];
  const sbgArr = [];
  const usedArr = [];

  dataRows.forEach((r) => {
    let sbg = Number(r[sbgIdx]) || 0;
    let used = Number(r[usedIdx]) || 0;

    // 🔥 APPLY ×1000 HERE
    sbg = sbg * 1000;
    used = used * 1000;

    if (sbg > 0 || used > 0) {
      labels.push(r[0]);
      sbgArr.push(sbg);
      usedArr.push(used);
    }
  });

  return { labels, sbgArr, usedArr };
}

function renderdashboardBarChart(year, station) {
  const data = getSBGDataforChart(year, station);
  if (!data) return;

  const { labels, sbgArr, usedArr } = data;

  const remainingArr = sbgArr.map((sbg, i) => Math.max(sbg - usedArr[i], 0));

  const ctx = id('dashboardBarChart');

  if (window.barChart) window.barChart.destroy();

  const serialLabels = labels.map((_, i) => i + 1);

  // 🔥 width control
  requestAnimationFrame(() => {
    setChartWidth(labels);

    if (window.barChart) {
      window.barChart.resize(); // 🔥 force proper sizing
    }
  });

  window.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: serialLabels,
      datasets: [
        {
          label: 'SBG Utilised',
          data: usedArr,
          backgroundColor: '#ff6363',
          hoverBackgroundColor: 'rgba(251,255,0,0.46)',
          stack: 'budget',

          barThickness: BAR_WIDTH,
          maxBarThickness: BAR_WIDTH
        },
        {
          label: 'SBG Available',
          data: remainingArr,
          backgroundColor: '#00ff5e',
          hoverBackgroundColor: 'rgba(251,255,0,0.46)',
          stack: 'budget',

          barThickness: BAR_WIDTH,
          maxBarThickness: BAR_WIDTH
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      layout: { padding: { bottom: 30 } },

      interaction: {
        mode: 'nearest',
        intersect: true
      },

      animation: { duration: 800, easing: 'easeOutCubic' },

      animations: {
        y: {
          from: (ctx) => {
            const chart = ctx.chart;
            const yScale = chart.scales.y;

            // 🔥 safe fallback
            if (yScale.type === 'logarithmic') {
              return chart.chartArea.bottom; // start from bottom
            }

            return yScale.getPixelForValue(0); // normal charts
          },

          delay: (ctx) => ctx.dataIndex * 40,
          duration: 800,
          easing: 'easeOutCubic'
        }
      },

      transitions: {
        active: {
          animation: {
            duration: 0 // ❌ disable animation on hover/update
          }
        },
        resize: {
          animation: {
            duration: 0
          }
        },
        show: {
          animation: {
            duration: 800 // ✅ only initial load
          }
        }
      },

      // 🔥 hover sync (safe)
      onHover: (event, elements) => {
        if (isTableHover) return;

        if (elements.length > 0) {
          const index = elements[0].index;

          highlightTableRow(index);

          // 🔥 ADD THIS (missing)
          scrollChartToIndex(index);
        } else {
          highlightTableRow(-1);
        }
      },

      plugins: {
        legend: { position: 'top' },

        title: {
          display: true,
          text: `${station} - ${year} Budget Overview`,
          font: { size: 12, weight: '600' }
        },

        columnLabelPlugin: {
          enabled: true,

          numeratorDatasetIndex: 0,
          denominatorDatasetIndex: 1,
          rotate: true,
          mode: 'percent',
          offsetY: 14,
          minDisplay: 3
        },

        tooltip: {
          displayColors: false,
          callbacks: {
            title: (ctx) => labels[ctx[0].dataIndex],
            label: (ctx) => {
              const i = ctx.dataIndex;

              const sbg = sbgArr[i];
              const used = usedArr[i];
              const avail = sbg - used;
              const percent = sbg > 0 ? (used / sbg) * 100 : 0;

              return [`Sanctioned: ${formatCurrency(sbg)}`, `Utilised: ${formatCurrency(used)}`, `Available: ${formatCurrency(avail)} (${percent.toFixed(1)}%)`];
            }
          }
        }
      },

      scales: {
        x: {
          stacked: true,
          ticks: { display: false },
          grid: { display: false }

          // 🔥 ensures consistent spacing
          //categoryPercentage: 1.0,
          //barPercentage: 1.0,
        },

        y: {
          type: 'logarithmic',

          grid: {
            display: false // ✅ hides horizontal grid lines
          },

          ticks: {
            padding: 8,
            maxTicksLimit: 6,
            callback: (v) => {
              if (v >= 1e7) return '₹' + v / 1e7 + ' Cr';
              if (v >= 1e5) return '₹' + v / 1e5 + ' L';
              if (v >= 1e3) return '₹' + v / 1e3 + ' K';
              return '₹' + v;
            }
          }
        }
      }
    },

    plugins: [xAxisPillPlugin, columnLabelPlugin]
  });
  attachChartMouseLeave(ctx, highlightTableRow);
}

function renderSBGDashBoardTable(year, station) {
  const data = getSBGDataforChart(year, station);
  if (!data) return;

  const { labels, sbgArr, usedArr } = data;

  const table = id('dashBoardTable');

  let totalSBG = 0;
  let totalUsed = 0;

  let html = `
          <colgroup>
            <col style="width:5%">
            <col style="width:45%">
            <col style="width:15%">
            <col style="width:15%">
            <col style="width:15%">
            <col style="width:5%">
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Budget</th>
              <th>SBG</th>
              <th>Used</th>
              <th>Available)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
        `;

  labels.forEach((label, i) => {
    const sbg = Math.round(sbgArr[i]);
    const used = Math.round(usedArr[i]);
    const available = sbg - used;

    const percent = sbg > 0 ? (used / sbg) * 100 : 0;

    // 🔥 clamp to 0–100 for gradient
    const clamped = Math.max(0, Math.min(percent, 100));

    // 🔥 direct mapping (green → red)
    const hue = 120 * (1 - clamped / 100);

    let color1 = `hsl(${hue}, 80%, 55%)`;
    let color2 = `hsl(${hue}, 80%, 35%)`;

    // 🔥 overflow → strong alert
    if (percent > 100) {
      color1 = '#7f1d1d';
      color2 = '#dc2626';
    }

    const bg = `linear-gradient(135deg, ${color1}, ${color2})`;

    // 🔥 better readability
    const textColor = percent >= 60 ? '#fff' : '#111';
    html += `
            <tr>
              <td class="sno"><span>${i + 1}</span></td>  <!-- 🔥 serial -->
              <td>${label}</td>
              <td>${formatCurrency(sbg)}</td>
              <td>${formatCurrency(used)}</td>
              <td class="${available < 0 ? 'negative' : ''}">
                ${formatCurrency(available)}
              </td>
              <td>
                <span class="percent-pill"
                  style="background:${bg}; color:${textColor}">
                ${percent.toFixed(0)}%
              </span>
              </td>
            </tr>
          `;
  });

  html += `</tbody>`;

  table.innerHTML = html;
  renderWithAnimation(table, html); // 🔥 trigger animation
}

function renderSBGCharts(year, station) {
  renderdashboardBarChart(year, station);
  renderSBGDashBoardTable(year, station);
}

//===============================Salary Chart Datas ==========================================//

function buildSalaryMenuListsForChart() {
  if (!pbData?.rows?.length) return;

  const headers = pbData.headers;
  const rows = pbData.rows;

  const stationIdx = headers.indexOf('Pay Drawn Station');
  const dateIdx = headers.indexOf('Salary Month');

  // 🔹 Stations
  const stations = [...new Set(rows.map((r) => String(r[stationIdx]).trim()).filter(Boolean))];

  const stationDiv = qs('#stationList .side-items');
  stationDiv.innerHTML = '';

  stations.forEach((st) => {
    const btn = document.createElement('button');
    btn.className = 'side-btn';
    btn.textContent = st;

    btn.onclick = () => {
      qsa('#stationList .side-btn').forEach((b) => b.classList.remove('active'));

      btn.classList.add('active');

      filters.station = st;
      renderSalaryCharts(currentYear, st);
    };

    stationDiv.appendChild(btn);
  });

  // 🔹 Years (Mar-based FY)
  const years = [...new Set(rows.map((r) => getFinancialYear(r[dateIdx])).filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const yearDiv = qs('#yearList .side-items');
  yearDiv.innerHTML = '';

  years.forEach((yr) => {
    const btn = document.createElement('button');
    btn.className = 'side-btn';
    btn.textContent = yr;

    btn.onclick = () => {
      qsa('#yearList .side-btn').forEach((b) => b.classList.remove('active'));

      btn.classList.add('active');

      currentYear = yr;
      renderSalaryCharts(currentYear, filters.station);
    };

    yearDiv.appendChild(btn);
  });

  // 🔥 default
  const fy = getCurrentFinancialYear();

  if (years.includes(fy)) {
    currentYear = fy; // 🔥 use current FY if available
  } else {
    currentYear = years[0] || ''; // fallback
  }
  filters.station = stations[0];

  stationDiv.querySelector('.side-btn')?.classList.add('active');
  yearDiv.querySelector('.side-btn')?.classList.add('active');

  renderSalaryCharts(currentYear, filters.station);
}

function getSalaryDataForChart(year, station) {
  const headers = pbData.headers;
  const rows = pbData.rows;

  const nameIdx = headers.indexOf('Employee Name');
  const stationIdx = headers.indexOf('Pay Drawn Station');
  const incomeIdx = headers.indexOf('Net Income');
  const taxIdx = headers.indexOf('Net IT');
  const grossIdx = headers.indexOf('Gross Income');
  const dateIdx = headers.indexOf('Salary Month');

  const empMap = {}; // 🔥 aggregation map

  rows.forEach((r) => {
    const st = String(r[stationIdx]).toLowerCase();
    const fy = getFinancialYear(r[dateIdx]);

    if (st === station.toLowerCase() && fy === year) {
      const name = r[nameIdx] || 'Unknown';
      const income = Number(r[incomeIdx]) || 0;
      const tax = Number(r[taxIdx]) || 0;
      const gross = Number(r[grossIdx]) || 0;

      if (!empMap[name]) {
        empMap[name] = { income: 0, tax: 0, gross: 0 };
      }

      empMap[name].income += income;
      empMap[name].tax += tax;
      empMap[name].gross += gross;
    }
  });

  const labels = Object.keys(empMap);
  const incomeArr = labels.map((n) => empMap[n].income);
  const taxArr = labels.map((n) => empMap[n].tax);
  const grossArr = labels.map((n) => empMap[n].gross);

  const totalIncome = incomeArr.reduce((a, b) => a + b, 0);
  const totalTax = taxArr.reduce((a, b) => a + b, 0);
  const totalGross = grossArr.reduce((a, b) => a + b, 0);

  return {
    labels,
    incomeArr,
    taxArr,
    grossArr,
    totalIncome,
    totalTax,
    totalGross
  };
}

function renderSalaryBarChart(year, station) {
  const data = getSalaryDataForChart(year, station);
  if (!data) return;

  const { labels, incomeArr, taxArr, grossArr, totalIncome, totalTax, totalGross } = data;

  const ctx = id('dashboardBarChart');

  if (window.barChart) window.barChart.destroy();

  const serialLabels = labels.map((_, i) => i + 1);

  // 🔥 width control
  requestAnimationFrame(() => {
    setChartWidth(labels);

    if (window.barChart) {
      window.barChart.resize(); // 🔥 force proper sizing
    }
  });

  // 🔥 split income into tax + remaining
  const remainingArr = incomeArr.map((inc, i) => Math.max(inc - taxArr[i], 0));

  window.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: serialLabels,
      datasets: [
        {
          label: 'Net Income',
          data: remainingArr,
          backgroundColor: '#00ff5e', // blue
          hoverBackgroundColor: 'rgba(251,255,0,0.46)',
          stack: 'salary',

          barThickness: BAR_WIDTH,
          maxBarThickness: BAR_WIDTH
        },
        {
          label: 'Net IT',
          data: taxArr,
          backgroundColor: '#ff6363', // orange
          stack: 'salary',
          hoverBackgroundColor: 'rgba(251,255,0,0.46)',
          barThickness: BAR_WIDTH,
          maxBarThickness: BAR_WIDTH
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      layout: { padding: { bottom: 30 } },

      interaction: {
        mode: 'nearest',
        intersect: true
      },

      animation: { duration: 800, easing: 'easeOutCubic' },

      animations: {
        y: {
          from: (ctx) => {
            const chart = ctx.chart;
            const yScale = chart.scales.y;

            // 🔥 safe fallback
            if (yScale.type === 'logarithmic') {
              return chart.chartArea.bottom; // start from bottom
            }

            return yScale.getPixelForValue(0); // normal charts
          },

          delay: (ctx) => ctx.dataIndex * 40,
          duration: 800,
          easing: 'easeOutCubic'
        }
      },

      transitions: {
        active: {
          animation: {
            duration: 0 // ❌ disable animation on hover/update
          }
        },
        resize: {
          animation: {
            duration: 0
          }
        },
        show: {
          animation: {
            duration: 800 // ✅ only initial load
          }
        }
      },

      // 🔥 hover sync
      onHover: (event, elements) => {
        if (isTableHover) return;

        if (elements.length > 0) {
          const index = elements[0].index;

          highlightTableRow(index);

          // 🔥 ADD THIS (missing)
          scrollChartToIndex(index);
        } else {
          highlightTableRow(-1);
        }
      },

      plugins: {
        legend: { position: 'top' },

        title: {
          display: true,
          text: `${station} - ${year} Salary Overview`,
          font: { size: 12, weight: '600' }
        },

        columnLabelPlugin: {
          enabled: true,
          numeratorDatasetIndex: 0,
          denominatorDatasetIndex: 1,
          mode: 'custom',
          offsetY: 12,
          rotate: true,

          formatter: ({ value }) => formatCurrency(value)
        },

        subtitle: {
          display: true,
          text: `Gross of Station : ${formatCurrency(totalGross)} | TDS Recovered : ${formatCurrency(totalTax)}`
        },

        tooltip: {
          displayColors: false,
          callbacks: {
            title: (ctx) => labels[ctx[0].dataIndex],
            label: (ctx) => {
              const i = ctx.dataIndex;

              return [`Income: ${formatCurrency(incomeArr[i])}`, `IT: ${formatCurrency(taxArr[i])}`];
            }
          }
        }
      },

      scales: {
        x: {
          stacked: true,
          ticks: { display: false },
          grid: { display: false }
        },

        y: {
          stacked: true,
          ticks: {
            padding: 8,
            maxTicksLimit: 6,
            callback: (v) => formatCurrency(v)
          },
          grid: { display: false }
        }
      }
    },

    plugins: [xAxisPillPlugin, columnLabelPlugin]
  });

  // 🔥 FIXED
  attachChartMouseLeave(ctx, highlightTableRow);
}

function renderSalaryDashBoardTable(year, station) {
  const data = getSalaryDataForChart(year, station);
  if (!data) return;

  const { labels, incomeArr, taxArr, grossArr, totalIncome, totalTax, totalGross } = data;

  const table = id('dashBoardTable'); // 🔥 trigger animation

  let html = `
          <colgroup>
            <col style="width:5%">
            <col style="width:44%">
            <col style="width:17%">
            <col style="width:17%">
            <col style="width:12%">
            <col style="width:5%">
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Employee</th>
              <th>Gross Income</th>
              <th>Net Income</th>
              <th>TDS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
        `;
  labels.forEach((name, i) => {
    const income = Math.round(incomeArr[i]);
    const tax = Math.round(taxArr[i]);
    const gross = Math.round(grossArr[i]);

    const percent = income > 0 ? (tax / income) * 100 : 0;

    let color1, color2;

    if (percent > 30) {
      // 🔥 Above threshold → fixed alert
      color1 = '#7f1d1d';
      color2 = '#dc2626';
    } else {
      // 🔥 Normalize 0 → 30 into 0 → 1
      const ratio = Math.max(0, Math.min(percent / 30, 1));

      // 🔥 Smooth transition: Green (120) → Red (0)
      const hue = 120 * (1 - ratio);

      // 🔥 Gradient shades
      color1 = `hsl(${hue}, 85%, 60%)`;
      color2 = `hsl(${hue}, 85%, 40%)`;
    }

    const bg = `linear-gradient(135deg, ${color1}, ${color2})`;

    const textColor = percent >= 20 ? '#fff' : '#111';

    html += `
            <tr>
              <td class="sno"><span>${i + 1}</span></td>  <!-- 🔥 serial -->
              <td title="${name}">${name}</td>
              <td>${formatCurrency(grossArr[i])}</td>
              <td>${formatCurrency(incomeArr[i])}</td>
              <td>${formatCurrency(taxArr[i])}</td>
              <td>
                <span class="percent-pill"
                  style="background:${bg}; color:${textColor}">
                ${percent.toFixed(0)}%
              </span>
              </td>
            </tr>
          `;
  });

  html += `</tbody>`;

  table.innerHTML = html;

  renderWithAnimation(table, html);
}

function renderSalaryCharts(year, station) {
  renderSalaryBarChart(year, station);
  renderSalaryDashBoardTable(year, station);
}

/* ============== SIDEBAR TOGGLE======================== */
/* ============================================================================
        ⚡ UNIFIED SIDEBAR SYNC (Handles both Sidebar & Body Footer)
      ============================================================================ */
function syncSidebarUI(isCollapsed) {
  const sidebar = id('sidebar');
  const app = qs('.app');

  // Apply classes to container elements
  if (sidebar) sidebar.classList.toggle('collapsed', isCollapsed);
  if (app) app.classList.toggle('collapsed', isCollapsed);

  // Apply class to body (for your .dashboard-footer CSS rules)
  document.body.classList.toggle('sidebar-collapsed', isCollapsed);

  // Persist state
  localStorage.setItem('sidebarCollapsed', isCollapsed);
}

/* ============================================================================
        ⚡ TOGGLE ACTION
      ============================================================================ */
function toggleSidebar() {
  const sidebar = id('sidebar');
  // Determine the *new* state based on current state
  const isCollapsed = !sidebar.classList.contains('collapsed');

  syncSidebarUI(isCollapsed);
}

/* ============================================================================
        ⚡ LOAD STATE (Run this on page load)
      ============================================================================ */
function loadSidebarState() {
  const savedState = localStorage.getItem('sidebarCollapsed');

  // If savedState is null (first visit), default to true (collapsed)
  // Otherwise, check if it equals 'true'
  const isCollapsed = savedState === null ? true : savedState === 'true';

  syncSidebarUI(isCollapsed);
}

/* ===========MENU HANDLER (USING HELPERS)====================== */
function initMenu() {
  const buttons = qsa('.menu-btn');
  const pages = qsa('.SectionPage');

  // 🔥 COMMON PAGE SWITCHER
  function openPage(pageId, activeBtn) {
    // hide all pages
    pages.forEach(hide);

    // remove active from all buttons
    buttons.forEach((b) => removeClass(b, 'active'));

    // show selected page
    show(pageId);

    // activate button
    addClass(activeBtn, 'active');

    // 🔥 DUTY PAGE LOGIC
    if (pageId === 'DutyPage') {
      const role = (window.currentUser || '').trim().toUpperCase();
      const isEditRole = ['ENGG', 'MASTER'].includes(role);

      id('dutyRequirementTable')?.style.setProperty('display', isEditRole ? 'none' : 'block');

      id('editableRequirementContainer')?.style.setProperty('display', isEditRole ? 'block' : 'none');

      id('dutyChartTable')?.style.setProperty('display', isEditRole ? 'block' : 'none');

      if (id('dutyRequirementTable')) {
        id('dutyRequirementTable').style.width = isEditRole ? '50%' : '100%';
      }
    }

    // 🔥 DATABASE PAGE
    if (pageId === 'DatabasePage') {
      setTimeout(() => {
        initDatabaseDefault();
        moveIndicator();
      }, 0);
    }
  }

  // 🔥 MENU CLICK
  buttons.forEach((btn) => {
    on(btn, 'click', () => {
      openPage(btn.dataset.page, btn);
    });
  });

  // 🔥 DEFAULT PAGE AFTER LOGIN
  const dashboardBtn = qs('.menu-btn[data-page="DashBoard"]');

  if (dashboardBtn) {
    openPage('DashBoard', dashboardBtn);
  }
}
