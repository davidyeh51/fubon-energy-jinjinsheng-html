const tiers = [
  {
    code: "M",
    name: "電廠巡檢維修",
    price: "180,000 元/MW",
    pr: "PR >= 80",
    promise: "參考值，不保證",
    content: "定期巡檢、清潔、故障排除、零件更換。",
  },
  {
    code: "OM",
    name: "電廠營運及修繕",
    price: "360,000 元/MW",
    pr: "PR >= 82",
    promise: "保證，需改善計畫",
    content: "M + 遠端監控、妥善率保證、預防性維護。",
  },
  {
    code: "AM",
    name: "電廠資產管理",
    price: "600,000 元/MW",
    pr: "PR >= 84",
    promise: "保證 + 賠償條款",
    content: "OM + PR 保證、財務級報告、保發電量合約管理。",
  },
];

const portfolio = [
  { year: 2026, m: 48, om: 39, am: 12, capacity: 330, rate: 300000 },
  { year: 2027, m: 39, om: 44, am: 16, capacity: 610, rate: 330000 },
  { year: 2028, m: 30, om: 46, am: 23, capacity: 690, rate: 360000 },
  { year: 2029, m: 23, om: 47, am: 30, capacity: 640, rate: 390000 },
];

const marginMix = [
  { name: "維運服務", revenue: 50, margin: 30, contribution: 15 },
  { name: "工程修繕", revenue: 25, margin: 25, contribution: 6.25 },
  { name: "維運工程", revenue: 25, margin: 15, contribution: 3.75 },
];

const annualProfit = [
  { year: 2026, revenue: 0.99, gross: 0.248, sga: 0.099, net: 0.149, cumulative: 0.149 },
  { year: 2027, revenue: 2.01, gross: 0.502, sga: 0.201, net: 0.301, cumulative: 0.45 },
  { year: 2028, revenue: 2.49, gross: 0.623, sga: 0.249, net: 0.373, cumulative: 0.823 },
  { year: 2029, revenue: 2.49, gross: 0.623, sga: 0.249, net: 0.373, cumulative: 1.197 },
];

const headcount = [
  { year: 2026, people: 15, note: "維持" },
  { year: 2027, people: 25, note: "+10" },
  { year: 2028, people: 28, note: "+3" },
  { year: 2029, people: 26, note: "-2" },
];

const risks = [
  {
    id: "F-1",
    level: "high",
    title: "15% 淨利率成立",
    body: "2026 年實際淨利率需 >= 12%，2027 年達 15%。若失準，收入目標與 margin 假設同步重算。",
  },
  {
    id: "G-3",
    level: "high",
    title: "AM 層級 PR 可達 84",
    body: "2026 年 AM 試點場站需先達 PR >= 82，並有明確上升趨勢朝 84 推進。",
  },
  {
    id: "B-1",
    level: "high",
    title: "一年招募培訓 10 名工程師",
    body: "2027 年從 15 人擴至 25 人，是容量放大的組織壓力點。",
  },
  {
    id: "F-2",
    level: "high",
    title: "三業務線營收佔比成立",
    body: "維運服務 50%、工程修繕 25%、維運工程 25% 需用過去兩季實績拆分驗證。",
  },
  {
    id: "B-3",
    level: "high",
    title: "平台 2026 Q4 前整合",
    body: "進能服平台是 AM 可稽核報告與 PR 保證的技術支撐。",
  },
  {
    id: "B-7",
    level: "medium",
    title: "毛利率 5 年內提升至 28-30%",
    body: "靠平台自動化、SOP、集中採購與 PT200 降本，縮小第六章利潤缺口。",
  },
];

const milestones = [
  { date: "2026/06/30", title: "M0 現況盤點 + 財務基線", body: "拆分三業務線毛利率，回測現有場站 PR 分布，驗證 F-1、F-2、G-1。" },
  { date: "2026/07/31", title: "M1 平台商務確認", body: "確認進能服平台合作與競爭關係不阻礙落地。" },
  { date: "2026/11/30", title: "M2 AM 試點 + PR82 中間檢查", body: "2-3 個 OM 場站升級 AM 試點，追蹤 PR 與 PT200 介入前後差異。" },
  { date: "2026/12/31", title: "M3 市場意向 + 淨利首次回測", body: "2026 年實際淨利率需 >= 12%；若低於 10%，F-1 立即重評。" },
  { date: "2027/03/31", title: "M4 首件 AM 合約", body: "合約 PR 保證先設定 82，再分階段提升到 84。" },
  { date: "2027/12/31", title: "M5 年度驗證", body: "淨利率 >= 13%，累計淨利 >= 0.45 億。" },
];

function formatRate(value) {
  return `${Math.round(value / 10000)} 萬/MW`;
}

function renderTiers() {
  const root = document.querySelector("#tierGrid");
  root.innerHTML = tiers
    .map(
      (tier) => `
        <article class="tier-card">
          <header>
            <div>
              <span class="code">${tier.code}</span>
              <h3>${tier.name}</h3>
            </div>
            <span class="price">${tier.price}</span>
          </header>
          <div class="body">
            <p>${tier.content}</p>
            <dl>
              <dt>PR 目標</dt><dd>${tier.pr}</dd>
              <dt>承諾性質</dt><dd>${tier.promise}</dd>
            </dl>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPortfolio() {
  const root = document.querySelector("#portfolioMix");
  root.innerHTML = portfolio
    .map(
      (row) => `
        <div class="stack-row">
          <div class="stack-year">${row.year}</div>
          <div class="stack-track" aria-label="${row.year} M ${row.m}%, OM ${row.om}%, AM ${row.am}%">
            <div class="stack-segment m" style="width:${row.m}%">M ${row.m}%</div>
            <div class="stack-segment om" style="width:${row.om}%">OM ${row.om}%</div>
            <div class="stack-segment am" style="width:${row.am}%">AM ${row.am}%</div>
          </div>
          <div class="stack-meta">${row.capacity}MW / ${formatRate(row.rate)}</div>
        </div>
      `
    )
    .join("");
}

function renderMarginMix() {
  const root = document.querySelector("#marginMix");
  root.innerHTML = marginMix
    .map(
      (row) => `
        <div class="bar-line">
          <strong>${row.name}</strong>
          <div class="bar-track">
            <div class="bar-fill" style="width:${row.contribution * 5}%"></div>
          </div>
          <span>${row.contribution}%</span>
        </div>
      `
    )
    .join("");
}

function renderWaterfall() {
  const steps = [
    { name: "營收", value: 100, className: "" },
    { name: "COGS", value: 75, className: "cost" },
    { name: "毛利", value: 25, className: "" },
    { name: "SG&A", value: 10, className: "sga" },
    { name: "淨利", value: 15, className: "" },
  ];
  document.querySelector("#profitWaterfall").innerHTML = steps
    .map(
      (step) => `
        <div class="waterfall-step">
          <strong>${step.name}</strong>
          <div class="waterfall-track">
            <div class="waterfall-fill ${step.className}" style="width:${step.value}%"></div>
          </div>
          <span>${step.value}%</span>
        </div>
      `
    )
    .join("");
}

function renderAnnualProfit() {
  const maxRevenue = Math.max(...annualProfit.map((row) => row.revenue));
  document.querySelector("#annualProfit").innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>年度</th>
          <th>收入</th>
          <th>毛利</th>
          <th>營業費用</th>
          <th>淨利</th>
          <th>累計淨利</th>
          <th>收入規模</th>
        </tr>
      </thead>
      <tbody>
        ${annualProfit
          .map(
            (row) => `
              <tr>
                <td><strong>${row.year}</strong></td>
                <td>${row.revenue.toFixed(2)} 億</td>
                <td>${row.gross.toFixed(3)} 億</td>
                <td>${row.sga.toFixed(3)} 億</td>
                <td><strong>${row.net.toFixed(3)} 億</strong></td>
                <td>${row.cumulative.toFixed(3)} 億</td>
                <td class="spark-cell">
                  <div class="spark-track">
                    <div class="spark-fill" style="width:${(row.revenue / maxRevenue) * 100}%"></div>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderVerticalBars(selector, rows, valueKey, suffix, maxValue) {
  document.querySelector(selector).innerHTML = rows
    .map(
      (row) => `
        <div class="vbar">
          <div class="vbar-fill" style="height:${(row[valueKey] / maxValue) * 210}px">${row[valueKey]}${suffix}</div>
          <div class="vbar-year">${row.year}</div>
        </div>
      `
    )
    .join("");
}

function renderRisks() {
  document.querySelector("#riskGrid").innerHTML = risks
    .map(
      (risk) => `
        <article class="risk-card ${risk.level}">
          <span class="tag">${risk.id} / ${risk.level === "high" ? "最高優先" : "中高優先"}</span>
          <h3>${risk.title}</h3>
          <p>${risk.body}</p>
        </article>
      `
    )
    .join("");
}

function renderTimeline() {
  document.querySelector("#timeline").innerHTML = milestones
    .map(
      (item) => `
        <article class="timeline-item">
          <div class="timeline-date">${item.date}</div>
          <div>
            <h3>${item.title}</h3>
            <p>${item.body}</p>
          </div>
        </article>
      `
    )
    .join("");
}

renderTiers();
renderPortfolio();
renderMarginMix();
renderWaterfall();
renderAnnualProfit();
renderVerticalBars("#capacityBars", portfolio, "capacity", "MW", 700);
renderVerticalBars("#headcountBars", headcount, "people", "人", 30);
renderRisks();
renderTimeline();
