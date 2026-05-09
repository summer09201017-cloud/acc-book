# Roadmap & 功能優先級

> 站在 Week 1-3 完成的基礎上，規劃下一波要做什麼、按 CP 值排序。

## 目前優缺點摘要

### 強項
- 資料層乾淨：寫入只走 `ExpenseContext`，`useLiveQuery` 即時訂閱
- v1→v2 migration 安全：原始 JSON 永遠保留 backup
- 預設類別保護：`isBuiltin` lock + 刪除時 transactional reassign 到「其他」
- `CategoryIcon` 白名單 import，控 lucide bundle
- 暗色模式 inline 預載防閃爍 + CSS variables 全域生效
- UX 細節：5 秒 Undo / 長按複製 / 算式預覽 / 快速金額 / 月份切換 / 千分位

### 主要缺口
- **沒 service worker**：manifest 已備好但離線/可安裝體驗 0
- **沒測試**：schema migration 只能手測 + tsc
- **沒 PIN / 加密**：金額在 DevTools 裸奔
- **沒雲端同步**：換手機從零開始
- **bundle 730KB**：recharts 整套吃太多
- **沒帳戶 / 轉帳**：對「現金 vs 信用卡」分流弱
- **沒重複規則**：訂閱類每月手動很煩
- **月份切換只在 Records tab**：Charts/Reports/Today 鎖本月
- **桌機版被冷落**：Week 2/3 新卡片只接到手機

## 功能優先級（CP 值排序）

### 🟢 CP 爆表

| # | 功能 | 工時 | 備註 |
|---|------|------|------|
| 1 | Service Worker + 可安裝 PWA | 1-2h | manifest 已備，加 `vite-plugin-pwa` 一行配置 |
| 2 | 跨 tab 月份切換器共享 | 4-6h | 月份 state 提到 Context |
| 3 | CSV 匯出 / 匯入 | 3-4h | dataIO 已有 JSON，多寫一支 converter |
| 4 | 重複交易規則（Recurring） | 8-12h | 加 `RecurringRule` 表 + 啟動時 catch-up |
| 5 | 桌機版接上新卡片 + RWD 整理 | 4-6h | 已寫好的卡片直接放進 desktop 右欄 |

### 🟡 CP 中

| # | 功能 | 工時 | 備註 |
|---|------|------|------|
| 6 | 帳戶 + 轉帳交易 | 10-16h | schema bump，加 `Account` 表 + 第三類型 `transfer` |
| 7 | PIN / WebAuthn 解鎖 | 10-14h | 開機 PIN gate |
| 8 | 月度熱力圖（GitHub 草地） | 8h | 365 天方塊 |
| 9 | 訂閱偵測（金額+頻率） | 8-10h | 自動建議建立 recurring rule |
| 10 | Vitest + migration/dataIO 測試 | 4-6h | 保命 |
| 11 | recharts 動態 import / manualChunks | 4h | 首頁 bundle 砍 30%+ |

### 🔵 CP 低但有趣

| # | 功能 | 工時 | 備註 |
|---|------|------|------|
| 12 | 語音輸入（Web Speech API） | 6-10h | 「九十五元拿鐵」→ 自動填表 |
| 13 | OCR 收據（Tesseract.js） | 20-30h | demo 殺手級但最重 |
| 14 | AI 分類建議（規則 + LLM） | 8-12h | 輸入備註自動猜分類 |
| 15 | 多幣別 + 匯率 | 12-15h | exchangerate.host |
| 16 | 打卡 streak / 徽章 | 6-8h | 對自律差的有黏著度 |
| 17 | 月底自動生成圖片報告 | 10-15h | html2canvas → 可分享卡片 |

## 建議節奏

- **Sprint A（一個週末）**：#1 PWA → #2 全域月份 → #3 CSV → #5 桌機補卡片
- **Sprint B（兩個週末）**：#4 recurring → #11 bundle 切片 → #10 測試
- **Sprint C（看心情）**：#8 熱力圖 + #9 訂閱偵測 + #12 語音 — 三個「眼睛一亮」型功能
