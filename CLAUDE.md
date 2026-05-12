# CLAUDE.md

> 給未來 Claude 的工作守則。讀完這份就能直接接手，不用重看整個 codebase。

## 專案是什麼

跨平台**個人記帳 PWA**，Vite + React 18 + TypeScript。
資料夾叫 `記帳CLI`，但實作是網頁，不是 CLI（命名為歷史遺留）。
資料儲存：**IndexedDB（Dexie）**，schema 版本 = 4（DB 版本 3，已加 `budgets / templates / recurringRules`）。

## 一句話架構

`ExpenseProvider` 用 `dexie-react-hooks` 訂閱 DB → `App` 走 **tab-driven 單一資料源** + 一個共用底部 tab bar（手機 & 桌機都顯示）→ 桌機在 `today` tab 額外渲染豐富雙欄 dashboard，其他 tab 與手機共用 `mobile-main` 單欄佈局 → 新增紀錄走 **FAB + Modal**（桌機 today 把表單常駐，FAB 自動隱藏）。

## 技術棧

| 層 | 工具 |
|---|---|
| 構建 | Vite 5 |
| UI | React 18 + TypeScript 5 |
| 圖表 | recharts |
| icon | lucide-react |
| OCR | tesseract.js（chi_tra + eng，dynamic import） |
| 儲存 | Dexie 4（IndexedDB 包裝）+ dexie-react-hooks |
| 樣式 | 純 CSS（`src/index.css`）+ CSS variables（含 `[data-theme="dark"]` 暗色模式、`--primary` accent） |

無 ESLint / Prettier / 測試框架。

## 目錄結構

```
src/
├── App.tsx                       根元件，tab-driven + desktop-rich today 雙欄 + 編輯 Modal + 掛 useNightlyReminder / useRecurringCatchup
├── main.tsx
├── vite-env.d.ts                 vite/client + vite-plugin-pwa（react）型別 + __APP_BUILD__
├── index.css                     全域樣式（tab bar / FAB / modal / category tile / 月份切換 / 暗色 / 熱力圖 / update prompt / accent / OCR / voice）
├── db/
│   ├── schema.ts                 型別 + SCHEMA_VERSION=4（Template + RecurringRule）
│   ├── db.ts                     Dexie 實例：transactions / categories / budgets / templates / recurringRules / meta（v3 stores）
│   ├── defaultCategories.ts      30 個預設類別（emoji-only）+ BUILTIN_RENAMES + V1 對照 + 色盤
│   └── migration.ts              v1→v2 + builtin refresh + builtin top-up
├── context/
│   └── ExpenseContext.tsx        封裝 DB + categories + budgets + templates + recurringRules + toast + pendingRecordDate；useLiveQuery 即時訂閱
├── hooks/
│   ├── useActiveTab.ts           tab 持久化到 localStorage
│   ├── useTheme.ts               light/dark 持久化到 localStorage
│   ├── useSettings.ts            haptic / nightlyReminder / accentColor / accentCustomHex（含 darkenHex 工具）；module-level listeners 廣播
│   ├── useNightlyReminder.ts     23:30 沒記帳就跳 Notification（opt-in）
│   └── useRecurringCatchup.ts    啟動時 idempotent 為每條 RecurringRule 補齊到今天的紀錄
├── utils/
│   ├── expression.ts             安全運算式評估（120+80*2）
│   ├── dateRange.ts              YYYY-MM-DD 月份/週/月區間（含 sameDayLastMonth、calcStreakDays）
│   ├── dataIO.ts                 匯入/匯出 JSON / CSV
│   ├── recurring.ts              `enumerateOccurrences` — 給 catch-up 用的日期列舉（月/週、clamp 短月）
│   ├── voiceParse.ts             中文語音 → { amount, note }（含 CJK numerals 轉阿拉伯）
│   └── receiptOcr.ts             tesseract.js dynamic import + parseReceiptText（總計關鍵字 + 民國年 + 金額候選排序）
├── components/
│   ├── TabBar.tsx                5-tab 底部欄（手機 + 桌機）
│   ├── Fab.tsx                   浮動新增鈕（手機 + 桌機非 today tab）
│   ├── Modal.tsx                 彈窗（Esc 關閉、鎖卷動）
│   ├── Toast.tsx                 通知（含復原按鈕）
│   ├── UpdatePrompt.tsx          PWA 新版偵測（5 分鐘 poll + visibilitychange / focus / pageshow）+ 立即更新 / 離線就緒提示
│   ├── Dashboard.tsx             收入/支出/結餘卡
│   ├── TodayHintCard.tsx         今日 / 本週 / 預算剩餘 + streak 連續天數 + 本月 mood badge
│   ├── MonthSummaryCard.tsx      本月 vs 上月同期
│   ├── BudgetProgressCard.tsx    本月分類預算進度條
│   ├── DailyTrendCard.tsx        每日趨勢折線（recharts，走 lazyCharts）
│   ├── PieChartCard.tsx          分類圓餅（recharts，走 lazyCharts）
│   ├── lazyCharts.tsx            React.lazy + Suspense 包 DailyTrend / PieChart
│   ├── HeatmapCard.tsx           365 天 GitHub 風熱力圖；點格子→ requestRecordDate 跳 Records
│   ├── RecordsCalendar.tsx       Records tab 內月曆（每格收支餘 / 筆數）
│   ├── CategoryIcon.tsx          ★ 共用：emoji 優先、lucide icon 為 fallback
│   ├── CategoryManagerCard.tsx   設定頁：自訂分類 CRUD + 圖示/顏色選擇器
│   ├── TemplateManagerCard.tsx   設定頁：常用範本（早餐 65、咖啡 130）CRUD；表單頂端用 chip 套用
│   ├── RecurringRuleCard.tsx     設定頁：每月 / 每週重複交易規則 CRUD + 啟用開關
│   ├── TransactionForm.tsx       新增/編輯表單（quick amount + 算式 + 範本 chip + 🎤 語音 + 📷 OCR）
│   ├── TransactionList.tsx       紀錄列表（長按複製、編輯、刪除 Undo）
│   └── tabs/
│       ├── TodayTab.tsx          TodayHint + MonthSummary + Dashboard + Budget + 最近 5 筆
│       ├── RecordsTab.tsx        月份切換 + 快速日期篩選 + 搜尋 + 類型/分類篩選 + 日曆/列表 + 複製上月同日
│       ├── ChartsTab.tsx         熱力圖 + 趨勢折線 + 圓餅（接 onJumpToDate）
│       ├── ReportsTab.tsx        本月 vs 上月、Top 5 分類、Top 5 商家/關鍵字、Top 5 單筆
│       └── SettingsTab.tsx       外觀（明暗 + 10 色 accent + 自訂 hex + 檢查更新 + 建置版本）+ 體驗（haptic + 夜間提醒）+ 分類 + 範本 + 重複規則 + 資料 + 預算
└── types/index.ts                re-export schema.ts（向後相容）
```

## 資料 Schema

### `Category`
```ts
{
  id: string;                // UUID
  type: 'income' | 'expense';
  name: string;              // 飲食、交通…
  emoji: string;             // 🍱 — 預設可視化；空字串時 fallback 到 iconName
  iconName?: string;         // lucide-react 元件名（CategoryIcon 認得的白名單）；built-in 不再帶
  bgColor: string;           // #FFE4B5（圓底）
  group: string;             // 日常 / 享樂 / 健康 / 成長 / 固定 / 家庭 / 公益 / 額外 / 理財 / 其他
  isBuiltin: boolean;        // 預設類別 = true，UI 不允許刪除（但可改顏色/圖示/emoji）
  sortOrder: number;
}
```

### `Transaction`
```ts
{
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;        // ref Category.id
  date: string;              // YYYY-MM-DD
  note: string;
  createdAt: number;         // epoch ms，做次序輔助
}
```

### `Budget`
```ts
{
  categoryId: string;        // primary key
  monthlyLimit: number;
  updatedAt: number;
}
```

### `Template`（schema v4 加入）
```ts
{
  id: string;
  label: string;             // 早餐 / 星巴克 中杯…
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  sortOrder: number;
  createdAt: number;
}
```

### `RecurringRule`（schema v4 加入）
```ts
{
  id: string;
  label: string;             // Netflix / 房租 / 薪資
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  frequency: 'monthly' | 'weekly';
  dayOfMonth?: number;       // 1-28（monthly 用，clamp 到當月最後一天）
  weekday?: number;          // 0(日)..6(六)（weekly 用）
  startDate: string;         // YYYY-MM-DD
  endDate?: string;
  lastGeneratedFor?: string; // 最近一次補上的日期；catch-up 用來判斷增量
  enabled: boolean;
  createdAt: number;
}
```

### `AppMeta`
key/value 雜項；目前用 `migrationFromV1Done` 與 `builtinRefreshV2Done`。

## 遷移與 Builtin 同步

`runMigrationIfNeeded()` 啟動時跑三件事：

1. **v1 → v2**（`migrationFromV1Done` 為 false 時跑一次）
   - 若 `categories` 表為空，先 seed 全部 `DEFAULT_CATEGORIES`（目前 30 個）
   - 讀 `localStorage["expense-transactions"]`，依 `V1_CATEGORY_MAP` 轉成 `Transaction`，找不到對應丟「其他」
   - 把 v1 原始 JSON **備份**到 `localStorage["expense-transactions-v1-backup"]`
   - 設 `migrationFromV1Done = true`，順帶設 `builtinRefreshV2Done = true`（新用戶不用跑 refresh）

2. **Builtin refresh**（`builtinRefreshV2Done` 為 false 時跑一次）三 phase：
   - **Phase 1 改名**：依 `BUILTIN_RENAMES` 把舊名 builtin 改成新名（例：`學習 → 教育`、`薪水 → 薪資`），保留 `id` 不打斷 transactions/budgets
   - **Phase 2 重整外觀**：把所有對得上的 builtin 的 `emoji / bgColor / group / sortOrder` 覆寫成新 spec，並清掉 `iconName`（builtin 改走 emoji-only）
   - **Phase 3 降級孤兒**：spec 已不再列入的 builtin 改成 `isBuiltin: false`，使用者可在管理頁編輯/刪除
   - 設 `builtinRefreshV2Done = true`

3. **Builtin top-up**（每次啟動都跑、idempotent）：比對 `DEFAULT_CATEGORIES` 與現有 `categories`，依 `type|name` 補上缺的內建分類。已有相同名稱的（含使用者自訂）視為使用者擁有，**不覆寫**。

備份永遠不刪 — 遇到資料疑慮可手動還原。

`templates / recurringRules` 是 schema v4 才加的，新增是純 Dexie `version(3).stores(...)`，沒寫資料 upgrade 函數（舊用戶兩張表是空的就行）。

## 5-tab 結構（手機版）

| key | 中文 | emoji | 內容 |
|---|---|---|---|
| `today` | 今日 | 📝 | 今日已花 / 本週已花 / 預算剩餘 + streak + mood + MonthSummary + Dashboard + Budget + 最近 5 筆 |
| `records` | 紀錄 | 📋 | 預設日曆模式；月份切換 + 今天/本週/本月/上月快速篩選 + 搜尋 + 類型/分類篩選 + 列表 |
| `charts` | 圖表 | 📊 | 365 天熱力圖 + 每日趨勢折線 + 分類圓餅 |
| `reports` | 報告 | 📄 | 本月 vs 上月、Top 5 分類、Top 5 商家/關鍵字、Top 5 單筆 |
| `settings` | 設定 | ⚙️ | 外觀（明暗 + accent + 檢查更新 + 建置版本）+ 體驗（haptic + 夜間提醒）+ 分類 + 範本 + 重複規則 + 資料 + 預算 |

桌機版（`min-width: 768px`）**也顯示底部 tab bar**（置中、限寬 760px）。其中 `today` tab 額外渲染豐富雙欄 dashboard（`desktop-rich` class 開關），其他 tab 與手機共用 `mobile-main` 單欄內容，置中限寬。`FAB` 在桌機 today tab 隱藏（因 TransactionForm 已常駐），其他 tab 顯示。
手機版分類 chip 在 Records 內採橫向滑動，避免把日曆擠到首屏之外。
TransactionForm 的 `.form-row` 在 `max-width: 520px` 改成 column，這樣金額拿到全寬，下面的 `.input-action-row`（🎤 語音 + 📷 OCR）也跟著全寬不被擠。

**跨 tab 導覽**：`ChartsTab` 的熱力圖點格子 → `requestRecordDate(date)` 寫進 Context → `App.Shell` 切到 `records` tab → `RecordsTab` 在 effect 中讀取 `pendingRecordDate`、自動定位該日 + 切回日曆模式、清空 pending。沒有用 window event，純 Context state。

## CategoryIcon 與圖示策略

`CategoryIcon` 是顯示分類圓底的唯一元件。**規則**：
1. `emoji` 非空白 → 顯示 emoji
2. 否則查 `ICON_REGISTRY[iconName]` → 顯示 lucide icon
3. 否則 → 顯示 `HelpCircle`

`ICON_REGISTRY`（`src/components/CategoryIcon.tsx`）是手動 curate 的白名單（約 50 個），保證 tree-shaking 有效。新增 icon 要同時 import + 加進 registry。

**Built-in 一律 emoji**（沒有 `iconName`），所以使用者若把 builtin 的 emoji 清空，會看到 `HelpCircle` — 這是接受的取捨。自訂類別仍可在 emoji / lucide icon 之間二選一。

## 已完成功能

**核心架構**
- 🟢 5-tab 手機 + 桌機共用 tab bar（桌機 today 走 desktop-rich 雙欄、其他 tab 共用 mobile-main 單欄），FAB + Modal 新增
- 🟢 IndexedDB（Dexie 4）+ `useLiveQuery` 即時訂閱
- 🟢 v1（localStorage）→ v2（IndexedDB）資料遷移，含原始 JSON 備份永久保留
- 🟢 Builtin refresh / top-up 兩段式同步機制

**分類系統**
- 🟢 30 個預設分類（20 expense + 10 income，emoji-only）
- 🟢 自訂分類 CRUD（刪自訂時 transactions 自動轉到「其他」）
- 🟢 Built-in 保護：UI 隱藏刪除鈕 + Context 拒絕；外觀（emoji/icon/color）放行
- 🟢 `CategoryIcon` 共用元件（emoji 優先、lucide icon fallback、HelpCircle 兜底）

**記帳體驗**
- 🟢 算式預覽（`120+80*2`）
- 🟢 快速金額按鈕（50/100/500/1000 累加）
- 🟢 編輯紀錄、5 秒 Undo 刪除、長按複製、千分位顯示
- 🟢 **複製上月同日**：Records 日曆當日摘要列一鍵批複（短月自動 clamp）+ 5 秒 Undo
- 🟢 **常用範本**（Templates）：Settings 建一次（早餐 65 / 咖啡 130 / 捷運 20…），TransactionForm 頂端 chip 一點就帶
- 🟢 **重複交易規則**（RecurringRule）：每月 / 每週固定支出收入；啟動時 `useRecurringCatchup` idempotent 補齊到今天，`lastGeneratedFor` 防雙寫
- 🟢 **語音記帳**：Web Speech API（zh-TW）+ `parseVoiceCommand` 把中文數字（「九十五」）轉阿拉伯，自動填金額/備註
- 🟢 **OCR 收據**：tesseract.js（chi_tra+eng）dynamic import；`parseReceiptText` 排序總計關鍵字優先 + 民國年支援；多個金額候選做成 chip 讓使用者挑

**檢視與分析**
- 🟢 今日 / 本週 / 預算剩餘提示卡，含 streak 連續記帳天數 + 本月 mood badge（🎉 / 😌 / 😬 / 🔥）
- 🟢 本月 vs 上月同期摘要
- 🟢 共享月份切換器（Records → Today/Charts/Reports）+ 今天/本週/本月/上月快速篩選 + 備註/日期/金額搜尋 + 分類 chip 多選 + 類型切換
- 🟢 Records 預設日曆模式；月曆每格收支餘 + 筆數
- 🟢 每日趨勢折線 + 分類圓餅（手機 / 桌機）
- 🟢 **365 天熱力圖**（Charts tab）：純 CSS grid、5 級色階、暗色模式對應深綠 → 亮綠；點格子跳 Records
- 🟢 報告：本月 vs 上月、Top 5 分類、**Top 5 商家/關鍵字**（從備註 tokenize 至少出現 2 次的詞）、Top 5 單筆
- 🟢 分類預算 + 進度條 + 80% / 100% 顏色警示
- 🟢 **夜間提醒**：23:30 還沒記帳就跳 Notification（opt-in，需通知權限）

**設定與資料**
- 🟢 暗色模式（手動切換、`localStorage` 持久化、`index.html` 預載防閃爍）
- 🟢 **10 種預設主題色 + 自訂 hex**（accent）：`--primary` / `--primary-hover` 兩個 CSS var；`darkenHex` 算 custom 的 hover；preload 腳本也支援 custom 防閃爍
- 🟢 觸覺回饋 toggle（`navigator.vibrate`，手機才有效）
- 🟢 匯入/匯出 JSON（id 重複略過、類別以 `type|name` 配對、budget 比較 `updatedAt`）
- 🟢 匯入/匯出 CSV（交易明細對接 Excel / Sheets；相同 id 略過）

**PWA / 效能**
- 🟢 PWA manifest + maskable icon + `vite-plugin-pwa` service worker
- 🟢 **PWA 新版偵測（強化版）**：`registerType: 'prompt'`、5 分鐘 poll + visibilitychange/focus/pageshow 監聽、2 秒首次 poke、`clientsClaim: true`、Settings 內「檢查更新」按鈕 + `__APP_BUILD__` 建置時間顯示。詳見〈PWA 更新流程〉一節
- 🟢 **recharts 動態 import**：`lazyCharts.tsx` + `manualChunks: { recharts: ['recharts'] }`；initial JS ~73 KB gz，recharts ~156 KB gz async
- 🟢 **tesseract.js 完全 lazy**：`recognizeReceipt` 內 `await import('tesseract.js')`，~10MB WASM + chi_tra 只在第一次掃描時下載，不影響 initial bundle

## 常用指令

```bash
npm install        # 安裝
npm run dev        # 開發（預設 http://localhost:9999；被占用 Vite 會自動遞增）
npm run build      # tsc -b && vite build（CI 等同檢查）
npm run preview    # 預覽 build 結果
```

或本機雙擊 `start.bat`（純英文選單）。

## 設計慣例（讀懂這幾條再動手）

1. **資料寫入只走 ExpenseContext**：不要在元件直接呼叫 `db.transactions.add()`。需要新動作就在 Context 加方法。
2. **顯示分類圖示一律用 `<CategoryIcon category={...} />`**：不要再到處硬寫 `<span>{cat.emoji}</span>`。
3. **手機版佈局改動限縮在 `@media (max-width: 768px)` 與 mobile-only 元件**：別動到 `.desktop-main` 區塊。動到 `.form-row` 之類的共用元件記得想想窄機（`max-width: 520px` 已 stack）。
4. **新增持久化資料先動 schema**：bump `SCHEMA_VERSION`、寫 migration、再改 UI。Dexie 只 declare 索引欄位，所以加「非索引」選填欄位不需要 db.version() bump；新增 table 要 bump `db.version(N).stores(...)`。
5. **預設類別不要硬刪**：`isBuiltin: true` 表示預設；UI 上隱藏刪除鈕，Context 的 `deleteCategory` 也直接 return null 拒絕。改外觀（emoji/icon/color）放行，改 type/name/group 不放行。
6. **暗色模式 + accent 都走 CSS 變數**：dark theme 只 override 變數；accent 用 `--primary` / `--primary-hover`；極少數寫死的 `#f3f4f6` 等在 index.css 底部明確 override。
7. **新增 chart-like 元件用 recharts**：請走 `lazyCharts.tsx` 包 `React.lazy` + `Suspense`，不要直接 import；否則 recharts 會被拉進 initial bundle。
8. **新增需要大型 runtime 套件（如 tesseract / 影像處理）**：照 `recognizeReceipt` 的模式 `await import('xxx')` lazy 載入，不要在 module top-level import。
9. **註解寫 why，不寫 what**：好命名 + 型別已足以說明 what。

## PWA 更新流程（為什麼手機看不到新版）

**問題本質**：不是漏 reload，也不是 PWA 壞掉——是 service worker 的「更新偵測」太懶。

原始（已升級）的流程：
1. PWA 用 `registerType: 'prompt'`，新版要使用者點「立即更新」才會套用。
2. 偵測新版只靠兩條腿：瀏覽器內建約 24 小時自查一次 / `UpdatePrompt` 的 30 分鐘 poll。
3. **手機行為跟 PC 不一樣**：PC 留 tab、會手動重整；手機是「打開→記一筆→關掉」，30 分鐘 poll 根本沒機會跑到，瀏覽器內建 24h 又太慢。
4. 結果：手機的 SW 一直拿快取，沒被告知「該換新版了」，banner 自然不會出現。

**升級後的偵測機制**（commit `a9bc5fd`）：

| 變更 | 影響 |
|---|---|
| 5 分鐘 poll（原本 30 分鐘） | 留著的 tab 更快發現新版 |
| 2 秒首次 poll（原本 10 秒） | 一打開就檢查，剛部署完打開就抓得到 |
| `visibilitychange` / `focus` / `pageshow` 監聽 | 手機從別的 app 切回來就立刻檢查——這是手機的關鍵修正 |
| `clientsClaim: true` | 點下「立即更新」後，新 SW 立刻接管所有 tab |
| Settings → 外觀 多一個「檢查更新」按鈕 | 任何時候可以手動逼一次檢查 |
| `__APP_BUILD__`（`vite.config.ts` 注入）+ Settings 顯示「目前建置 YYYY-MM-DD HH:MM (UTC)」 | 用戶能對照知道手機跑哪一版 |

**雞生蛋情境**：新偵測邏輯本身要靠舊 SW 抓到「新 SW 來了」才會生效。如果使用者裝置的 SW 嚴重落後到連這次強化都還沒拿到，要破迴圈：

- **Android / Chrome 手機**：長按瀏覽器網址列的「重新整理」圖示 → 選「硬性重新載入」；或 Chrome → 設定 → 隱私 → 清除瀏覽資料 → 選網域 → 清快取與 cookie。
- **iOS / Safari**：設定 → Safari → 進階 → 網站資料 → 找到網域 → 滑左刪除。
- **PWA 已加到主畫面**：把 PWA 從桌面長按移除，重新從瀏覽器訪問網站 → 再 Add to Home Screen 一次（最暴力但保證新）。

一旦這次拿到強化版 SW，之後打開 PWA 的 2 秒內就會看到更新 banner，不會再卡舊版。

**不要動的事**：
- **不要把 `registerType` 改回 `autoUpdate`**：會回到「靜默切換，使用者一頭霧水為什麼 UI 變了」的問題。
- **不要把 poll 拉得更短**（< 60s）：浪費網路 + 對 dev server 太吵；目前 5 分鐘已經夠用，靠 visibility/focus 補強。

## Roadmap — 已完成 vs 真正待做

### 已完成（不要再排進下一輪）

- **手機 5-tab / 桌機共用 tab bar / desktop-rich today / FAB + Modal**
- **IndexedDB + migration**：Dexie schema v4、v1 localStorage 匯入、builtin refresh/top-up
- **分類系統**：30 內建 + 自訂 CRUD + builtin 保護 + `CategoryIcon`
- **記帳操作**：算式預覽、快速金額、編輯、刪除 Undo、長按複製、複製上月同日、千分位、**常用範本 chip**、**重複交易規則 + 啟動 catch-up**、**🎤 中文語音輸入**、**📷 OCR 收據掃描**
- **紀錄能力**：共享月份切換、日曆模式、每日收支餘、快速日期篩選、搜尋、收入/支出切換、分類 chip 多選、清除篩選
- **分析**：TodayHint（含 streak + mood badge）、MonthSummary、BudgetProgress、DailyTrend、PieChart、365 天熱力圖（跨 tab 跳轉）、Reports（本月 vs 上月 / Top 5 分類 / **Top 5 商家** / Top 5 單筆）、分類預算（80%/100% 警示）
- **設定**：暗色模式、**10 預設 accent + 自訂 hex**、觸覺回饋、**夜間 23:30 連續記帳提醒**、JSON/CSV 匯入匯出、**檢查更新 + 建置版本**
- **PWA / 效能**：manifest + maskable + service worker、**新版偵測強化版**（見〈PWA 更新流程〉）、recharts async chunk（initial ~73KB gz）、tesseract.js 完全 lazy（首掃才下載）

### 真正待做（依 CP 值與開發時間排序）

| 優先 | 功能 | 估時 | 判斷 |
|---|---|---:|---|
| 1 | **Vitest + migration / dataIO / expression / recurring / voiceParse / receiptOcr 測試** | 6-8h | recurring + OCR + voice 都加進來後，沒測試一改 schema 或 parser 就會手抖；先補測試比早做新功能划算 |
| 2 | **PIN 鎖（純前端 SHA-256）** | 4-6h | 「防旁人打開」門檻，明確說不是端對端加密；對私密記帳剛需 |
| 3 | **訂閱偵測（金額 + 商家 + 週期啟發式）** | 6-8h | recurring 已落地，這是最自然的後續：自動建議「這幾筆看起來是訂閱，要不要建規則？」 |
| 4 | **語音 / OCR 後的自動分類建議**（規則版） | 3-4h | voice/OCR 已會填金額/備註，但分類還要使用者挑；用備註關鍵字 → categoryId 字典先做規則版，之後再接 LLM |
| 5 | **自然語言搜尋（「上週超過 500 的吃」）** | 6-8h | 規則 parser 就夠，重用 voiceParse 的 CJK 數字轉換；不用 LLM |
| 6 | **帳戶 + 轉帳交易** | 10-16h | schema bump（加 `Account` + `Transaction.accountId` + `transfer` type）；UI 與報表都要改 |
| 7 | **WebAuthn / Passkey 解鎖** | 6-8h | PIN 之後的升級；先要有 PIN 做 fallback 給不支援 device |
| 8 | **AI 分類建議（BYO API key）** | 8-12h | 第 4 項規則版的升級；走使用者自帶 key，不背 API 帳單 |
| 9 | **月底圖卡分享（PNG canvas）** | 10-15h | 社群感最強但核心記帳價值低；確認上面都做完再排 |

### 有趣但先放後面

- 分帳 / 多人結算（12-15h）：朋友聚餐分帳，單機可記、雲端 opt-in。
- 多幣別 + 線下匯率快取（12-15h）：旅行 / 海外消費才用得到，市場較窄。
- 鎖屏 widget / quick action：PWA 上能做的有限，等 Web App API 補強。

### 暫緩 / 不建議現在做

- **第 6 個 tab（日曆獨立頁）**：Records tab 預設日曆模式已涵蓋，維持 5-tab。
- **自訂數字鍵盤**：目前文字框 + 算式預覽已夠快，ROI 不高。
- **內建雲端同步**：「無後端、純 PWA + IndexedDB」是賣點之一；要做也建議走 user-supplied 同步（WebDAV / GDrive / iCloud Drive）。
- **`registerType: 'autoUpdate'`**：見〈PWA 更新流程〉，靜默切換會回到「為什麼 UI 變了？」的混亂。

## 已知限制 / 該知道的坑

- **手機 emoji 跨平台不一致**：iOS / Windows / Android 的 🍱 長得不一樣。改 lucide icon 可解但失去 emoji 趣味。
- **bundle 大小**：recharts ~156 KB gz lazy（進圖表頁才載）；tesseract.js + WASM + chi_tra ~10 MB **完全從 CDN 載**（第一次 OCR 才會下載），不在 dist/ 裡，但**離線時 OCR 不可用**——這是接受的取捨。
- **沒有 PIN/雲端同步**：記帳很私密但目前裸奔；roadmap P2 在處理。
- **`crypto.randomUUID` 兼容**：在 `migration.ts`、`ExpenseContext.tsx`、`useRecurringCatchup.ts` 都有 fallback。
- **沒有測試**：bug fix、schema migration、parser 改動仍靠手動驗證 + `npm run build` 的 TS 檢查；roadmap P1 補 Vitest。
- **PWA 更新偵測 = client-side polling**：見〈PWA 更新流程〉。沒有後端推播，只能讓 client 在 visibility 事件 + 5 分鐘 poll 時自己 check。
- **語音 / OCR 自動分類還沒做**：voice 跟 OCR 都會填金額 / 備註 / 日期，但分類仍要使用者挑（roadmap P4）。
- **iOS Safari 語音支援不穩**：`webkitSpeechRecognition` 在某些 iOS 版本回傳 false 或啟動就掛；`voiceSupported` 為 false 時不顯示語音按鈕，OCR 不受影響。

## 給未來 Claude 的提醒

- **schema 現在是 v4**：加新 table 要 bump `db.version(N).stores(...)`、寫 upgrade 函數（如果舊資料要轉）；加「非索引」選填欄位（如 `Category.iconName`）只要改 type。
- 加新 tab 不要超過 5 個（iOS HIG 上限）；若需要更多次層級，做成 settings 內的子頁。
- 顯示分類記得用 `CategoryIcon`，搜尋時若還看到硬寫 `cat.emoji` 直接代換。
- **新增 chart-like 元件**：走 `lazyCharts.tsx` 包 `React.lazy` + `Suspense`，不要直接 import recharts。
- **新增大型 runtime 套件**：照 `recognizeReceipt` 的 `await import(...)` 模式，避免 initial bundle 爆掉。
- **跨 tab 跳轉**：要從 A tab 控制 B tab 的內部狀態，先看能不能透過 `ExpenseContext` 暫存（如 `pendingRecordDate` 模式），不要用 `window` event 或 localStorage hack。
- **PWA 更新流程**：見專章。不要改回 `autoUpdate`，不要把 poll 拉到 < 60s。要對抗手機卡舊版，靠的是 visibility/focus 觸發 + 顯式的「檢查更新」按鈕 + `__APP_BUILD__` 對照。
- **TransactionForm 的 voice + OCR**：放在 `.input-action-row`（dashed-pill 樣式）而不是 `.quick-amount-row`，否則窄機會被擠到摺線下。`.form-row` 已在 `max-width: 520px` 變 column，動 form 排版時要記得這條 media query。
- **accent 主題色**：10 預設走 `ACCENT_PALETTE`；自訂走 `accentCustomHex` + `darkenHex(hex)` 算 hover；`index.html` 也要同步預載邏輯不然會閃。
- **catch-up / migration / 任何啟動時跑的 side-effect**：要 idempotent；用 meta 旗標或 `lastGeneratedFor` 防雙寫。
- 若用戶提及「CLI」相關，提醒這是網頁專案（資料夾命名誤導）。
