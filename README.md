# 進金生能源服務 HTML 簡報

這個專案將 `富邦能源_進金生能源簡介20260611.pptx` 轉成可用瀏覽器播放與編修的 HTML 簡報。

## 高階摘要

- `stp-strategy.html`：台灣再生能源市場 STP 策略的視覺化網頁版，針對進能服南區事業部業務開發落地使用。
- `edp-om-strategy.html`：EDP O&M 維運策略 v6 的四年落地儀表板與圖像化網頁版。
- `edp-om-strategy-report-v6.md`：EDP O&M 維運策略 v6 原始完整報告。
- `logistics-btm-case-study.html`：大型電商物流中心 BTM 儲能業務案例，整理成業務可分享的網頁簡報。

## 使用方式

1. 開啟 `index.html`。
2. 點選 `編輯模式`。
3. 直接點文字修改內容；選取元素後可用上方小把手移動、右下角把手調整尺寸。
4. 修改會自動存在目前瀏覽器的 localStorage。
5. 可用 `下載 HTML` 匯出目前頁面狀態。

## 檔案結構

- `index.html`：入口頁。
- `styles.css`：簡報與編輯介面樣式。
- `app.js`：播放、編輯、儲存與匯出功能。
- `slides-data.js`：由 PPTX 轉出的投影片資料。
- `assets/`：由 PPTX 抽出的圖片素材。
- `tools/convert_pptx.py`：重新轉換 PPTX 的工具。

## 重新產生簡報資料

```powershell
& "C:\Users\davidyeh\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools\convert_pptx.py
```

轉換器會從桌面讀取最新符合 `*20260611.pptx` 的簡報。
