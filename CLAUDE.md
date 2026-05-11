# CLAUDE.md

> 給未來 Claude 的工作守則。讀完這份就能直接接手，不用重看整個 codebase。

## 專案是什麼

跨平台**個人記帳 PWA**，Vite + React 18 + TypeScript。
資料夾叫 `記帳CLI`，但實作是網頁，不是 CLI（命名為歷史遺留）。
資料儲存：**IndexedDB（Dexie）**，schema 版本 = 3（DB 版本 2，已加 `budgets`）。

## 一句話架構

`ExpenseProvider` 用 `dexie-react-hooks` 訂閱 DB → `App` 走 **tab-driven 單一資料源** + 一個共用底部 tab bar（手機 & 桌機都顯示）→ 桌機在 `today` tab 額外渲染豐富雙欄 dashboard，其他 tab 與手機共用 `mobile-main` 單欄佈局 → 新增紀錄走 **FAB + Modal**（桌機 today 把表單常駐，FAB 自動隱藏）。

## 技術棧

| 層 | 工具 |
|---|---|
| 構建 | Vite 5 |
| UI | React 18 + TypeScript 5 |
| 圖表 | recharts |
| icon | lucide-react |
| 儲存 | Dexie 4（IndexedDB 包裝）+ dexie-react-hooks |
| 樣式 | 純 CSS（`src/index.css`）+ CSS variables（含 `[data-theme="dark"]` 暗色模式） |

無 ESLint / Prettier / 測試框架。

## 目錄結構

```
src/
├── App.tsx                       根元件，tab-driven 內容 + desktop-rich today 雙欄 + 編輯 Modal
├── main.tsx
├── vite-env.d.ts                 vite/client + vite-plugin-pwa（react）型別參考
├── index.css                     全域樣式（含 tab bar / FAB / modal / category tile / 月份切換 / 暗色模式 / 熱力圖 / update prompt）
├── db/
│   ├── schema.ts                 型別 + SCHEMA_VERSION（含 Category.iconName 選填欄位）
│   ├── db.ts                     Dexie 實例：transactions / categories / budgets / meta
│   ├── defaultCategories.ts      30 個預設類別（emoji-only）+ BUILTIN_RENAMES + V1 對照 + 色盤
│   └── migration.ts              v1→v2 + builtin refresh + builtin top-up
├── context/
│   └── ExpenseContext.tsx        封裝 DB + categories + budgets + toast + pendingRecordDate；useLiveQuery 即時訂閱
├── hooks/
│   ├── useActiveTab.ts           tab 持久化到 localStorage
│   └── useTheme.ts               light/dark 持久化到 localStorage
├── utils/
│   ├── expression.ts             安全運算式評估（120+80*2）
│   ├── dateRange.ts              YYYY-MM-DD 月份/週/月區間工具（含 sameDayLastMonth）
│   └── dataIO.ts                 匯入/匯出 JSON / CSV
├── components/
│   ├── TabBar.tsx                5-tab 底部欄（手機 + 桌機）
│   ├── Fab.tsx                   浮動新增鈕（手機 + 桌機非 today tab）
│   ├── Modal.tsx                 彈窗（Esc 關閉、鎖卷動）
│   ├── Toast.tsx                 通知（含復原按鈕）
│   ├── UpdatePrompt.tsx          PWA 新版偵測 + 立即更新 / 離線就緒提示
│   ├── Dashboard.tsx             收入/支出/結餘卡
│   ├── TodayHintCard.tsx         今日已花 / 本週已花 / 本月預算剩餘或可用餘額
│   ├── MonthSummaryCard.tsx      本月 vs 上月同期
│   ├── BudgetProgressCard.tsx    本月分類預算進度條
│   ├── DailyTrendCard.tsx        每日趨勢折線（recharts，走 lazyCharts 動態載入）
│   ├── PieChartCard.tsx          分類圓餅（recharts，走 lazyCharts 動態載入）
│   ├── lazyCharts.tsx            React.lazy + Suspense 包 DailyTrend / PieChart；推遲 recharts chunk
│   ├── HeatmapCard.tsx           365 天 GitHub 風支出熱力圖；點格子→ requestRecordDate 跳 Records
│   ├── RecordsCalendar.tsx       Records tab 內的月曆元件（每格收支餘 / 筆數）
│   ├── CategoryIcon.tsx          ★ 共用：emoji 優先、lucide icon 為 fallback
│   ├── CategoryManagerCard.tsx   ★ 設定頁：自訂分類 CRUD + 圖示/顏色選擇器
│   ├── TransactionForm.tsx       新增/編輯表單（含 quick amount 50/100/500/1000）
│   ├── TransactionList.tsx       紀錄列表（長按複製、編輯、刪除 Undo）
│   └── tabs/
│       ├── TodayTab.tsx          TodayHint + MonthSummary + Dashboard + Budget + 最近 5 筆
│       ├── RecordsTab.tsx        月份切換 + 快速日期篩選 + 搜尋 + 類型/分類篩選 + 日曆/列表 + 複製上月同日按鈕
│       ├── ChartsTab.tsx         熱力圖 + 趨勢折線 + 圓餅（接 onJumpToDate 回呼）
│       ├── ReportsTab.tsx        本月 vs 上月、Top 5 分類、Top 5 單筆
│       └── SettingsTab.tsx       外觀切換 + 分類管理 + 資料備份 + 分類預算
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
   - **Phase 3 降級孤兒**：spec 已不再列入的 builtin（例：歷史中曾經短暫存在的 `飲料 / 服飾 / 房租`）改成 `isBuiltin: false`，使用者可在管理頁編輯/刪除
   - 設 `builtinRefreshV2Done = true`

3. **Builtin top-up**（每次啟動都跑、idempotent）：比對 `DEFAULT_CATEGORIES` 與現有 `categories`，依 `type|name` 補上缺的內建分類。已有相同名稱的（含使用者自訂）視為使用者擁有，**不覆寫**。

備份永遠不刪 — 遇到資料疑慮可手動還原。

## 5-tab 結構（手機版）

| key | 中文 | emoji | 內容 |
|---|---|---|---|
| `today` | 今日 | 📝 | 今日已花 / 本週已花 / 預算剩餘 + MonthSummary + Dashboard + Budget + 最近 5 筆 |
| `records` | 紀錄 | 📋 | 預設日曆模式；月份切換 + 今天/本週/本月/上月快速篩選 + 搜尋 + 類型/分類篩選 + 列表 |
| `charts` | 圖表 | 📊 | 每日趨勢折線 + 分類圓餅 |
| `reports` | 報告 | 📄 | 本月 vs 上月、Top 5 分類、Top 5 單筆 |
| `settings` | 設定 | ⚙️ | 外觀（淺/深色） + 分類管理 + 資料備份 + 分類預算 |

桌機版（`min-width: 768px`）**也顯示底部 tab bar**（置中、限寬 760px）。其中 `today` tab 額外渲染豐富雙欄 dashboard（`desktop-rich` class 開關），其他 tab 與手機共用 `mobile-main` 單欄內容，置中限寬。`FAB` 在桌機 today tab 隱藏（因 TransactionForm 已常駐），其他 tab 顯示。
手機版分類 chip 在 Records 內採橫向滑動，避免把日曆擠到首屏之外。

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
- 🟢 Builtin refresh / top-up 兩段式同步機制（升級時自動補新 builtin、改名 / 重整外觀 / 降級孤兒）

**分類系統**
- 🟢 30 個預設分類（20 expense + 10 income，emoji-only）
- 🟢 自訂分類 CRUD（新增 / 編輯 / 刪除；刪自訂時 transactions 自動轉到「其他」）
- 🟢 Built-in 保護：UI 隱藏刪除鈕 + Context 拒絕；外觀（emoji/icon/color）放行
- 🟢 `CategoryIcon` 共用元件（emoji 優先、lucide icon fallback、HelpCircle 兜底）

**記帳體驗**
- 🟢 算式預覽（`120+80*2` 自動算出）
- 🟢 快速金額按鈕（50/100/500/1000 累加）
- 🟢 編輯紀錄（鉛筆 icon → Modal）
- 🟢 刪除紀錄 5 秒 Undo toast
- 🟢 長按紀錄複製到今天（500ms，跳過按鈕區）
- 🟢 **複製上月同日**按鈕：在 Records 日曆當日摘要列上，一鍵把上月同日紀錄整批複製到選定日，自動 clamp 短月份（3/31 → 2/28），5 秒 Undo
- 🟢 千分位顯示

**檢視與分析**
- 🟢 今日已花 / 本週已花 / 本月預算剩餘或可用餘額提示卡
- 🟢 本月 vs 上月同期摘要
- 🟢 共享月份切換器（Records → Today/Charts/Reports 同步）+ 今天/本週/本月/上月快速日期篩選 + 備註/日期/金額搜尋 + 分類 chip 多選 + 類型切換
- 🟢 Records 預設日曆模式；月曆每格顯示當日收入 / 支出 / 餘額 / 筆數，月份總計也顯示收支餘，點日期看當日摘要與紀錄
- 🟢 每日趨勢折線（手機 / 桌機）+ 分類圓餅（手機 / 桌機）
- 🟢 **365 天熱力圖**（Charts tab）：純 CSS grid（不依賴 recharts），5 級色階、月份標籤、暗色模式對應深綠 → 亮綠；點格子 → 跳 Records 指定日 + 日曆模式
- 🟢 報告：本月 vs 上月、Top 5 分類、Top 5 單筆
- 🟢 分類預算 + 進度條 + 80% / 100% 顏色警示

**設定與資料**
- 🟢 暗色模式（手動切換、`localStorage` 持久化、`index.html` 預載防閃爍）
- 🟢 匯入/匯出 JSON（id 重複略過、類別以 `type|name` 配對、budget 比較 `updatedAt`）
- 🟢 匯入/匯出 CSV（交易明細對接 Excel / Sheets；相同 id 略過）
- 🟢 桌機版接上 TodayHint / MonthSummary / BudgetProgress / DailyTrend / PieChart / 選定月紀錄；桌機 today 以外 tab 走 mobile-main 單欄

**PWA / 效能**
- 🟢 PWA manifest + maskable icon + `vite-plugin-pwa` service worker
- 🟢 **PWA 新版提示**：`registerType: 'prompt'` + `UpdatePrompt` 元件用 `useRegisterSW` 偵測 `needRefresh`，顯示頂部更新 banner；同時每 30 分鐘 `registration.update()` poll 一次；首次離線就緒會跳 5 秒「已可離線使用」提示
- 🟢 **recharts 動態 import**：`lazyCharts.tsx` 用 `React.lazy` 包 `DailyTrendCard` / `PieChartCard`，搭配 `vite.config.ts` 的 `manualChunks: { recharts: ['recharts'] }`；initial JS 從 ~218KB gz 降到 ~63KB gz，recharts 變成 156KB gz 的 async chunk

## 常用指令

```bash
npm install        # 安裝
npm run dev        # 開發（預設 http://localhost:9999；若被占用 Vite 會自動遞增）
npm run build      # tsc -b && vite build（CI 等同檢查）
npm run preview    # 預覽 build 結果
```

或本機雙擊 `start.bat`（純英文選單）。

## 設計慣例（讀懂這幾條再動手）

1. **資料寫入只走 ExpenseContext**：不要在元件直接呼叫 `db.transactions.add()`。需要新動作就在 Context 加方法。
2. **顯示分類圖示一律用 `<CategoryIcon category={...} />`**：不要再到處硬寫 `<span>{cat.emoji}</span>`，否則自訂的純 icon 類別會壞掉。
3. **手機版佈局改動限縮在 `@media (max-width: 768px)` 與 mobile-only 元件**：別動到 `.desktop-main` 區塊。
4. **新增持久化資料先動 schema**：bump `SCHEMA_VERSION`、寫 migration、再改 UI。Dexie 只 declare 索引欄位，所以加「非索引」選填欄位（如 `Category.iconName`）不需要 db.version() bump。
5. **預設類別不要硬刪**：`isBuiltin: true` 表示預設；UI 上隱藏刪除鈕，Context 的 `deleteCategory` 也直接 return null 拒絕。改外觀（emoji/icon/color）放行，改 type/name/group 不放行。
6. **暗色模式覆寫遵循 CSS 變數**：絕大多數元件用 `var(--card-bg)` 等變數，dark theme 只 override 變數即可；只有少數寫死的 `#f3f4f6` 等需要明確 override（已在 index.css 底部處理）。
7. **註解寫 why，不寫 what**：好命名 + 型別已足以說明 what。

## Roadmap — 已完成 vs 真正待做（詳見 `docs/ROADMAP.md`）

> Week 1 / 2 / 3 的「按週切」標籤已退役；下面只記現況與下一批工作。避免把已落地功能重新排回 roadmap。

### 已完成（不要再排進下一輪）

- **手機 5-tab / 桌機共用 tab bar / desktop-rich today / FAB + Modal**：主框架已成形，仍要維持最多 5 個手機 tab。
- **IndexedDB + migration**：Dexie、`useLiveQuery`、v1 localStorage 匯入、builtin refresh/top-up 都已落地。
- **分類系統**：30 個內建分類、自訂分類 CRUD、builtin 保護、`CategoryIcon` 共用顯示策略都已完成。
- **記帳操作**：算式預覽、快速金額、編輯、刪除 Undo、長按複製、複製上月同日、千分位顯示已完成。
- **紀錄基礎能力**：Records tab 已有共享月份切換、預設日曆模式、每日收支餘、點日期看當日摘要與紀錄、今天/本週/本月/上月快速篩選、搜尋、收入/支出切換、分類 chip 多選、清除篩選。
- **分析**：TodayHint、MonthSummary、BudgetProgress、DailyTrend、PieChart、365 天熱力圖（含跨 tab 跳轉）、Reports（本月 vs 上月 / Top 5 分類 / Top 5 單筆）、分類預算（含 80% / 100% 顏色警示）已完成。
- **設定與資料**：暗色模式、JSON/CSV 匯入匯出、桌機版補齊所有卡片已完成。
- **PWA / 效能**：manifest + maskable icon + service worker、PWA 新版偵測 + 立即更新 banner + 離線就緒提示、recharts 拆 async chunk（initial ~63KB gz）、桌機 navbar 與 mobile-main 共用。

### 真正待做（依 CP 值與開發時間排序）

| 優先 | 功能 | 估時 | 判斷 |
|---|---|---:|---|
| 1 | Vitest + migration / dataIO / expression 測試 | 4-6h | 後面 recurring / 帳戶 / 轉帳都會動 schema，沒測試先補，下次改 migration 比較不會手抖 |
| 2 | 重複交易規則（recurring） | 8-12h | 加 `RecurringRule` 表 + 啟動 catch-up；Netflix、房租、薪資、保險、電話費最省手動，使用者留存核心 |
| 3 | 連續記帳天數 streak + 「每日可花」估算 | 3-5h | 遊戲化 + 預算 ÷ 剩餘天數自動顯示，CP 值高（小改動、大感受） |
| 4 | PIN 鎖（純前端 SHA-256） | 4-6h | 「防旁人打開」門檻，明確說不是端對端加密 |
| 5 | 訂閱偵測（金額 + 商家 + 週期啟發式） | 6-8h | recurring 之後再做才順，能自動建議建立規則 |
| 6 | 帳戶 + 轉帳交易 | 10-16h | 現金/信用卡/銀行分流剛需，但 schema 與 UI 工程量大 |
| 7 | WebAuthn / Passkey 解鎖 | 6-8h | 比 PIN 更安全，但要先有 PIN fallback 給不支援 device |
| 8 | 語音輸入（Web Speech API） | 6-10h | 「早餐九十五」一句搞定，趣味性 + 速度雙贏；行動裝置才能用，先當 progressive enhancement |
| 9 | 自然語言搜尋（「上週超過 500 的吃」） | 8-12h | 規則 parser 即可，不必上 LLM |
| 10 | AI 分類建議（規則 + 可選 LLM） | 8-12h | 由商家 / 備註自動猜分類，先規則後 AI；走 BYO API key |

### 有趣但先放後面

- 分帳 / 多人結算（12-15h）：朋友聚餐分帳，設計成單機可記、雲端 opt-in。
- 月底圖卡報告（可分享 PNG）（10-15h）：社群好玩，但核心記帳價值不高。
- 多幣別 + 線下匯率快取（12-15h）：旅行 / 海外消費才用得到，市場較窄。
- OCR 收據（20-30h）：展示效果強但錯誤修正 UX 很重。
- 鎖屏 widget / quick action：PWA 上能做的有限，等 Web App API 補強。

### 暫緩 / 不建議現在做

- **第 6 個 tab（日曆獨立頁）**：Records tab 預設日曆模式已涵蓋，維持 5-tab。
- **自訂數字鍵盤**：目前文字框 + 算式預覽已夠快，ROI 不高。
- **內建雲端同步**：「無後端、純 PWA + IndexedDB」是賣點之一；如果真的要做，建議走 user-supplied 同步（WebDAV / GDrive / iCloud Drive）而不是自建。

## 已知限制 / 該知道的坑

- **手機 emoji 跨平台不一致**：iOS / Windows / Android 的 🍱 長得不一樣 — 改用 lucide icon 可解但放棄 emoji 的趣味。
- **bundle 大小**：recharts 已拆 async chunk（initial ~63KB gz、recharts ~156KB gz lazy）。500KB 警告剩在 recharts 自己這塊，是進圖表頁才會載，可接受。lucide 仍走 `CategoryIcon` 白名單控制 footprint。
- **沒有 PIN/雲端同步**：記帳很私密但目前裸奔；roadmap 排在第 4 項。
- **`crypto.randomUUID` 兼容**：在 `migration.ts` 與 `ExpenseContext.tsx` 都加了 fallback。
- **沒有測試**：bug fix、schema migration、dataIO 改動仍靠手動驗證 + `npm run build` 的 TS 檢查；roadmap 第 1 優先補 Vitest。
- **PWA 更新仰賴 SW poll**：`UpdatePrompt` 每 30 分鐘呼叫 `registration.update()`，加上首次掛載 10 秒後再 poke 一次；長開頁仍可能延遲偵測新版，但比 `autoUpdate` 靜默切換已可控很多。

## 給未來 Claude 的提醒

- 動 schema 的「索引欄位」一定要寫 migration 並升 `db.version(N).stores(...)` + 寫 upgrade 函數；非索引選填欄位（如 `iconName`）只要更新 type 即可。
- 加新 tab 不要超過 5 個（iOS HIG 上限）；若需要更多次層級，做成 settings 內的子頁。
- 顯示分類記得用 `CategoryIcon`，搜尋時若還看到硬寫 `cat.emoji` 直接代換。
- **新增 chart-like 元件**：如果用到 recharts，請走 `lazyCharts.tsx` 包 `React.lazy` + `Suspense`，不要直接 import；否則會把 recharts 拉進 initial bundle。
- **跨 tab 跳轉**：要從 A tab 控制 B tab 的內部狀態，先看能不能透過 `ExpenseContext` 暫存（如 `pendingRecordDate` 模式），不要用 `window` event 或 localStorage hack。
- **PWA 更新流程**：不要把 `registerType` 改回 `autoUpdate`，會讓使用者「看不到新版」的問題回來。新功能上線後若要強制使用者更新，請考慮在 `UpdatePrompt` 加分級提醒（例如 minor / major）。
- 若用戶提及「CLI」相關，提醒這是網頁專案（資料夾命名誤導）。
