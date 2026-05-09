# Roadmap & 功能優先級

> 現況版：Week 1-3 的功能已落地，不再用「按週切」整理。這份文件把已完成、主要缺口、下一批真正待做拆開，方便後續接手。

## 已採用：日曆放 Records tab

方案 B 已實作。日曆模式的核心任務是「回看某一天有哪些紀錄」，本質上是明細列表的另一種索引方式，所以放在 Records tab 用「列表 / 日曆」segmented control 最自然。

方案 A 的 365 天熱力圖也有價值，但它是分析視角：適合回答「今年哪段時間花最多」，不適合取代「我要找某天那幾筆」的 Records 場景。建議順序是先做 Records 月曆，再把 Charts tab 的 365 天熱力圖當後續補強。

## 已完成

### 核心架構
- 手機 5-tab、桌機雙欄、FAB + Modal 新增
- IndexedDB（Dexie 4）+ `useLiveQuery` 即時訂閱
- v1 localStorage 到 IndexedDB 遷移，原始 JSON 永久備份
- builtin refresh / top-up，自動改名、重整外觀、補缺少的內建分類

### 分類與資料
- 30 個內建分類（expense 20 + income 10）
- 自訂分類 CRUD
- 內建分類保護：UI 不顯示刪除，Context 也拒絕刪除
- 刪除自訂分類時，既有 transactions 轉到同 type 的「其他」
- 分類預算、budget 匯入合併、`updatedAt` 新資料優先
- JSON 匯出 / 匯入

### 記帳體驗
- 算式預覽
- 快速金額 50 / 100 / 500 / 1000
- 編輯紀錄
- 刪除 5 秒 Undo
- 長按複製到今天
- 千分位顯示

### 檢視與分析
- TodayHint：今日花費 / 本月剩餘日均
- MonthSummary：本月 vs 上月同期
- Dashboard：收入 / 支出 / 結餘
- BudgetProgress：分類預算進度
- DailyTrend：每日趨勢折線
- PieChart：分類圓餅
- Reports：本月 vs 上月、Top 5 分類、Top 5 單筆
- Records tab：共享月份切換、列表/日曆模式、點日期看當日紀錄、搜尋、收入/支出切換、分類 chip 多選、清除篩選

### 設定與 PWA 基礎
- 暗色模式、localStorage 持久化、`index.html` 預載防閃爍
- PWA manifest + maskable icon + service worker
- JSON / CSV 匯入匯出
- 桌機版接上 TodayHint、MonthSummary、BudgetProgress、DailyTrend、PieChart、選定月紀錄
- `start.bat` 本機啟動選單

## 目前優缺點摘要

### 強項
- 資料流清楚：寫入集中在 `ExpenseContext`，元件主要讀 context 狀態
- 離線資料基礎穩：Dexie + migration，比單純 localStorage 耐用
- 手機體驗完整：新增、查找、圖表、設定都有合理位置
- 分類設計有彈性：emoji 優先，也保留 lucide icon fallback
- 記帳摩擦低：算式、快速金額、長按複製與 Undo 都是高頻細節
- 不新增第 6 tab 的方向正確：資訊架構目前仍乾淨

### 主要缺口
- 沒測試：migration、dataIO、expression 這些高風險區只能靠手測
- 沒重複交易：訂閱、薪資、房租仍要手動輸入
- 沒帳戶/轉帳：無法分現金、信用卡、銀行，也無法處理資金移動
- 沒解鎖保護：私密記帳資料容易被同裝置使用者看到
- bundle 偏大：recharts 影響初始載入

## 真正待做：CP 值與開發時間排序

### P0：最先做

| # | 功能 | 估時 | CP 判斷 |
|---|---|---:|---|
| 1 | Vitest + migration/dataIO/expression 測試 | 4-6h | 先保護 migration、JSON/CSV 匯入匯出、運算式；接下來 recurring / 帳戶 / 轉帳都會動 schema |
| 2 | 重複交易規則（Recurring） | 8-12h | 每月固定支出/收入省很多手動，需 schema + catch-up |
| 3 | recharts 動態 import / manualChunks | 4h | 降低初始 bundle，適合 PWA 後續優化 |

### P1：實用但牽動較大

| # | 功能 | 估時 | CP 判斷 |
|---|---|---:|---|
| 4 | PIN / WebAuthn 解鎖 | 10-14h | 隱私價值高，需明確說明是否只是 UI gate |
| 5 | 帳戶 + 轉帳交易 | 10-16h | 對認真記帳很實用，但會牽動 schema、表單、列表、報表 |
| 6 | 訂閱偵測（金額 + 備註 + 週期） | 8-10h | recurring 做完後再做，才能直接轉成規則 |

### P2：有趣、展示感強

| # | 功能 | 估時 | CP 判斷 |
|---|---|---:|---|
| 7 | Charts tab 365 天熱力圖 | 6-8h | 圖表分析感強；做月度/年度熱力圖時用方案 A 補一個 Charts 視角 |
| 8 | 語音輸入（Web Speech API） | 6-10h | 很有趣，適合手機，但中文解析需打磨 |
| 9 | AI 分類建議（規則 + LLM） | 8-12h | 可先用本機規則，LLM 當進階選項 |
| 10 | 月底自動生成圖片報告 | 10-15h | 分享感強，但不是核心記帳剛需 |
| 11 | 多幣別 + 匯率 | 12-15h | 旅行/海外消費族群才高頻 |
| 12 | OCR 收據 | 20-30h | demo 很亮，但辨識錯誤與校正 UX 成本高 |

## Records 日曆模式行為

- 不新增第 6 tab；Records 的月份切換器旁有「列表 / 日曆」segmented control。
- 月曆只看 `monthFilter` 指定月份；從「全部月份」切到日曆時會回到本月。
- 每格顯示日期、當日支出/收入與筆數；支出用深淺表示相對高低。
- 點日期後，下方 `TransactionList` 立即變成該日紀錄。
- 仍沿用既有 `TransactionList`、`CategoryIcon`、`ExpenseContext`；不要在日曆元件直接寫 DB。
- 之後若做「點 365 天熱力圖跳 Records 那天」，需要把 Records 的月份/日期篩選提升為共享 UI state。

## 建議節奏

- Sprint A：測試、Recurring、bundle 切片。
- Sprint B：PIN/WebAuthn、帳戶/轉帳、訂閱偵測。
- Sprint C：Charts 熱力圖、語音輸入、AI 分類建議。

## 暫緩 / 不建議現在做

- 第 6 個 tab：先用 Records 內切換或 Settings 子頁處理，保住 5-tab 架構。
- 自訂數字鍵盤：目前文字框 + 算式預覽已足夠，先把 CSV、PWA、日曆補上更划算。
