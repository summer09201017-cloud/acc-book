# CLAUDE.md

> 給未來 Claude 的工作守則。讀完這份就能直接接手，不用重看整個 codebase。

## 專案是什麼

跨平台**個人記帳 PWA**，Vite + React 18 + TypeScript。
資料夾叫 `記帳CLI`，但實作是網頁，不是 CLI（命名為歷史遺留）。
資料儲存：**IndexedDB（Dexie）**，schema 版本 = 3（DB 版本 2，已加 `budgets`）。

## 一句話架構

`ExpenseProvider` 用 `dexie-react-hooks` 訂閱 DB → `App` 依視窗寬度切換手機 5-tab 版 / 桌機雙欄版 → 手機版透過 **FAB + Modal** 新增紀錄；桌機版兩欄並排。

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
├── App.tsx                       根元件，含手機/桌機雙佈局 + 編輯 Modal
├── main.tsx
├── index.css                     全域樣式（含 tab bar / FAB / modal / category tile / 月份切換 / 暗色模式）
├── db/
│   ├── schema.ts                 型別 + SCHEMA_VERSION（含 Category.iconName 選填欄位）
│   ├── db.ts                     Dexie 實例：transactions / categories / budgets / meta
│   ├── defaultCategories.ts      13 個預設類別 + V1 對照表 + CATEGORY_COLOR_PALETTE
│   └── migration.ts              localStorage v1 → IndexedDB v2 自動遷移
├── context/
│   └── ExpenseContext.tsx        封裝 DB + categories + budgets + toast；useLiveQuery 即時訂閱
├── hooks/
│   ├── useActiveTab.ts           tab 持久化到 localStorage
│   └── useTheme.ts               light/dark 持久化到 localStorage
├── utils/
│   ├── expression.ts             安全運算式評估（120+80*2）
│   ├── dateRange.ts              YYYY-MM-DD 月份/區間工具
│   └── dataIO.ts                 匯入/匯出 JSON
├── components/
│   ├── TabBar.tsx                5-tab 底部欄（手機）
│   ├── Fab.tsx                   浮動新增鈕（手機）
│   ├── Modal.tsx                 彈窗（Esc 關閉、鎖卷動）
│   ├── Toast.tsx                 通知（含復原按鈕）
│   ├── Dashboard.tsx             收入/支出/結餘卡
│   ├── TodayHintCard.tsx         今日已花 / 本月剩 N 天均 Y
│   ├── MonthSummaryCard.tsx      本月 vs 上月同期
│   ├── BudgetProgressCard.tsx    本月分類預算進度條
│   ├── DailyTrendCard.tsx        每日趨勢折線
│   ├── PieChartCard.tsx          分類圓餅
│   ├── CategoryIcon.tsx          ★ 共用：emoji 優先、lucide icon 為 fallback
│   ├── CategoryManagerCard.tsx   ★ 設定頁：自訂分類 CRUD + 圖示/顏色選擇器
│   ├── TransactionForm.tsx       新增/編輯表單（含 quick amount 50/100/500/1000）
│   ├── TransactionList.tsx       紀錄列表（長按複製、編輯、刪除 Undo）
│   └── tabs/
│       ├── TodayTab.tsx          TodayHint + MonthSummary + Dashboard + Budget + 最近 5 筆
│       ├── RecordsTab.tsx        月份切換 + 搜尋 + 類型/分類篩選 + 全部紀錄
│       ├── ChartsTab.tsx         趨勢折線 + 圓餅
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
  iconName?: string;         // lucide-react 元件名（CategoryIcon 認得的白名單）
  bgColor: string;           // #FFE4B5（圓底）
  group: string;             // 日常 / 享樂 / 健康 / 成長 / 其他 / 固定 / 額外 / 理財
  isBuiltin: boolean;        // 預設類別 = true，UI 不允許刪除（但可改顏色/圖示）
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
key/value 雜項；目前只用 `migrationFromV1Done`。

## 遷移規則（v1 → v2）

第一次啟動觸發 `runMigrationIfNeeded()`：
1. 若 `meta.migrationFromV1Done === true`，跳過。
2. 若 `categories` 表為空，先 seed 13 個預設類別。
3. 讀 `localStorage["expense-transactions"]`，依 `V1_CATEGORY_MAP`（food→飲食…）轉成新 `Transaction`，找不到對應就丟到「其他」。
4. 把 v1 原始 JSON **備份**到 `localStorage["expense-transactions-v1-backup"]` 後，移除 live key。
5. 設 `meta.migrationFromV1Done = true`。

備份永遠不刪 — 遇到資料疑慮可手動還原。

## 5-tab 結構（手機版）

| key | 中文 | emoji | 內容 |
|---|---|---|---|
| `today` | 今日 | 📝 | TodayHint + MonthSummary + Dashboard + Budget + 最近 5 筆 |
| `records` | 明細 | 📋 | 月份切換 + 搜尋 + 類型/分類篩選 + 全部紀錄 |
| `charts` | 圖表 | 📊 | 每日趨勢折線 + 分類圓餅 |
| `reports` | 報告 | 📄 | 本月 vs 上月、Top 5 分類、Top 5 單筆 |
| `settings` | 設定 | ⚙️ | 外觀（淺/深色） + 分類管理 + 資料備份 + 分類預算 |

桌機版（`min-width: 768px`）走原本的兩欄佈局，**不顯示 tab bar / FAB**。
所有 tab 改動只影響手機 UI。

## CategoryIcon 與圖示策略

`CategoryIcon` 是顯示分類圓底的唯一元件。**規則**：
1. `emoji` 非空白 → 顯示 emoji
2. 否則查 `ICON_REGISTRY[iconName]` → 顯示 lucide icon
3. 否則 → 顯示 `HelpCircle`

`ICON_REGISTRY`（`src/components/CategoryIcon.tsx`）是手動 curate 的白名單（約 50 個），保證 tree-shaking 有效。新增 icon 要同時 import + 加進 registry。

預設 13 個類別都同時帶 `emoji + iconName`，所以即使使用者把 emoji 清空仍有合理 fallback。自訂類別建立時可二擇一。

## 已完成功能

- 🟢 5-tab 導覽 + IndexedDB（Dexie）
- 🟢 13 個預設分類 + 自訂 emoji + lucide icon fallback
- 🟢 **自訂分類**（新增 / 編輯 / 刪除；預設類別只能改外觀，刪自訂時 transactions 自動轉到「其他」）
- 🟢 新增紀錄含算式預覽（`120+80*2`）
- 🟢 編輯紀錄（點鉛筆 icon）
- 🟢 刪除紀錄含 5 秒 Undo toast
- 🟢 **長按紀錄複製到今天**（500ms，跳過按鈕區塊）
- 🟢 快速金額按鈕（50/100/500/1000，純整數可累加）
- 🟢 月份切換器（明細 tab，含「全部 / 回到本月」）
- 🟢 備註/日期/金額關鍵字搜尋 + 分類 chip 多選 + 類型切換
- 🟢 暗色模式（手動切換、`localStorage` 持久化、index.html 預載防閃爍）
- 🟢 今日花費 / 本月剩 N 天均 Y 提示卡
- 🟢 本月 vs 上月、Top 5 分類、Top 5 單筆報告
- 🟢 每日趨勢折線 + 分類圓餅
- 🟢 分類預算 + 進度條 + 80%/100% 顏色變化
- 🟢 匯入/匯出 JSON（合併策略：相同 id 略過；類別以 type|name 配對；budget 比較 updatedAt）
- 🟢 千分位顯示

## 常用指令

```bash
npm install        # 安裝
npm run dev        # 開發（http://localhost:5173）
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

## Roadmap

✅ Week 1 完成：5-tab + IndexedDB 遷移 + 類別 schema v2 + FAB + 彩色圓底。
✅ Week 2 完成（記帳體驗）：編輯 / Undo 刪除 / 長按複製 / 快速金額 / 月份切換 / 搜尋。
✅ Week 3 部分完成：報告 tab、每日趨勢、分類預算、匯出/匯入、自訂分類、暗色模式。

### 未做（Week 3 收尾）
- 帳戶 + 轉帳交易（schema 需擴 `Account` 表）
- 自訂數字鍵盤（含運算預覽 — 目前只在文字框內顯示預覽）
- 月度熱力圖（GitHub 草地風）
- 重複/訂閱規則（自動加每月固定支出）
- PIN 鎖 / WebAuthn
- PWA 離線（manifest 已備好，差 service worker）

## 已知限制 / 該知道的坑

- **手機 emoji 跨平台不一致**：iOS / Windows / Android 的 🍱 長得不一樣 — 改用 lucide icon 可解但放棄 emoji 的趣味。
- **bundle 大小**：recharts + lucide 全套讓 build 約 730KB（gzip 213KB）。`CategoryIcon` 用白名單 import 控制 lucide 的 footprint。Week 3 PWA 化前再評估 manualChunks 切 vendor。
- **沒有 PIN/雲端同步**：記帳很私密但目前裸奔。
- **`crypto.randomUUID` 兼容**：在 `migration.ts` 與 `ExpenseContext.tsx` 都加了 fallback。
- **沒有測試**：bug fix 與 schema migration 改動要靠手動驗證 + `npm run build` 的 TS 檢查。

## 給未來 Claude 的提醒

- 動 schema 的「索引欄位」一定要寫 migration 並升 `db.version(N).stores(...)` + 寫 upgrade 函數；非索引選填欄位（如 `iconName`）只要更新 type 即可。
- 加新 tab 不要超過 5 個（iOS HIG 上限）；若需要更多次層級，做成 settings 內的子頁。
- 顯示分類記得用 `CategoryIcon`，搜尋時若還看到硬寫 `cat.emoji` 直接代換。
- 若用戶提及「CLI」相關，提醒這是網頁專案（資料夾命名誤導）。
