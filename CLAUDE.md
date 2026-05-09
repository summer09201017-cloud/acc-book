# CLAUDE.md

> 給未來 Claude 的工作守則。讀完這份就能直接接手，不用重看整個 codebase。

## 專案是什麼

跨平台**個人記帳 PWA**，Vite + React 18 + TypeScript。  
資料夾叫 `記帳CLI`，但實作是網頁，不是 CLI（命名為歷史遺留）。  
資料儲存：**IndexedDB（Dexie）**，schema 版本 = 2。

## 一句話架構

`ExpenseProvider` 用 `dexie-react-hooks` 訂閱 DB → `App` 依視窗寬度切換手機 5-tab 版 / 桌機雙欄版 → 手機版透過 **FAB + Modal** 新增紀錄。

## 技術棧

| 層 | 工具 |
|---|---|
| 構建 | Vite 5 |
| UI | React 18 + TypeScript 5 |
| 圖表 | recharts |
| icon | lucide-react |
| 儲存 | Dexie 4（IndexedDB 包裝）+ dexie-react-hooks |
| 樣式 | 純 CSS（`src/index.css`）+ CSS variables |

無 ESLint / Prettier / 測試框架（之後若加再補）。

## 目錄結構

```
src/
├── App.tsx                     根元件，含手機/桌機雙佈局切換
├── main.tsx
├── index.css                   全域樣式（含 tab bar / FAB / modal / category tile）
├── db/                         ★ 資料層（Week 1 新增）
│   ├── schema.ts               型別 + SCHEMA_VERSION 常數
│   ├── db.ts                   Dexie 實例：transactions / categories / meta
│   ├── defaultCategories.ts    13 個預設類別 + V1 對照表
│   └── migration.ts            localStorage v1 → IndexedDB v2 自動遷移
├── context/
│   └── ExpenseContext.tsx      封裝 DB + categories；useLiveQuery 即時訂閱
├── hooks/
│   └── useActiveTab.ts         tab 持久化到 localStorage
├── components/
│   ├── TabBar.tsx              5-tab 底部欄（手機）
│   ├── Fab.tsx                 浮動新增鈕（手機）
│   ├── Modal.tsx               彈窗（Esc 關閉、鎖卷動）
│   ├── Dashboard.tsx           收入/支出/結餘卡
│   ├── TransactionForm.tsx     新增表單（支援 onSubmitted callback）
│   ├── TransactionList.tsx     紀錄列表（支援 limit/title）
│   ├── PieChartCard.tsx        分類圓餅圖（用 category.bgColor 當切片色）
│   └── tabs/                   各 tab 面板
│       ├── TodayTab.tsx        Dashboard + 最近 5 筆
│       ├── RecordsTab.tsx      全部紀錄
│       ├── ChartsTab.tsx       圖表
│       ├── ReportsTab.tsx      placeholder
│       └── SettingsTab.tsx     placeholder
└── types/index.ts              re-export schema.ts（向後相容）
```

## 資料 Schema（v2）

### `Category`
```ts
{
  id: string;            // UUID
  type: 'income' | 'expense';
  name: string;          // 飲食、交通…
  emoji: string;         // 🍱
  bgColor: string;       // #FFE4B5（淡色，做成圓底）
  group: string;         // 日常 / 享樂 / 健康 / 成長 / 其他 / 固定 / 額外 / 理財
  isBuiltin: boolean;    // true 表示預設類別，UI 上不應允許刪除
  sortOrder: number;
}
```

### `Transaction`
```ts
{
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;    // ref Category.id（v1 的 category 字串已遷移）
  date: string;          // YYYY-MM-DD
  note: string;
  createdAt: number;     // epoch ms，做次序輔助
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
| `today` | 今日 | 📝 | Dashboard + 最近 5 筆 |
| `records` | 明細 | 📋 | 全部紀錄（之後加搜尋/篩選/日曆） |
| `charts` | 圖表 | 📊 | 圓餅（之後加趨勢/熱力） |
| `reports` | 報告 | 📄 | 月比較、Top 5、預算達成（待做） |
| `settings` | 設定 | ⚙️ | 類別管理、預算、匯入/匯出（待做） |

桌機版（`min-width: 768px`）走原本的兩欄佈局，**不顯示 tab bar / FAB**。  
所有 tab 改動只影響手機 UI。

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
2. **顯示分類圖示用 `bgColor` + 圓底**：避免直接拿 emoji 裸著放，視覺一致性靠彩色圓底維持。
3. **手機版佈局改動限縮在 `@media (max-width: 768px)` 與 mobile-only 元件**：別動到 `.desktop-main` 區塊。
4. **新增持久化資料先動 schema**：bump `SCHEMA_VERSION`、寫 migration、再改 UI。
5. **預設類別不要硬刪**：`isBuiltin: true` 的紀錄表示預設，刪除要先轉移引用該類別的所有 transactions。
6. **註解寫 why，不寫 what**：好命名 + 型別已足以說明 what。

## Roadmap

✅ Week 1 已完成：5-tab + IndexedDB 遷移 + 類別 schema v2 + FAB + 彩色圓底。

### Week 2（記帳體驗）
- 編輯紀錄
- 刪除 Undo toast（5 秒）
- 轉帳交易（帳戶間互轉，不算收支） — 需先擴 schema 加 `Account` 表
- 自訂數字鍵盤（含運算預覽 `120 + 80 × 2 = 280`）
- 類別圖示選擇器 UI（schema 已備好，差 UI）

### Week 3（看數字 + 設定）
- 報告 tab：本月 vs 上月、Top 5 支出、預算達成
- 圖表 tab：每日趨勢折線、月度熱力圖
- **分類預算**（不是總預算）+ 進度條 + 80% 黃 / 100% 紅 / 110% 警示
- 重複/訂閱規則（Netflix 每月 5 號自動加 390）
- PIN 鎖 / WebAuthn
- 匯出 / 匯入 JSON、CSV

## 已知限制 / 該知道的坑

- **手機 emoji 跨平台不一致**：iOS / Windows / Android 的 🍱 長得不一樣。將來想要視覺一致再評估 Twemoji（+~200KB）。
- **bundle 偏大**：recharts 讓 build 約 620KB（gzip 185KB）。Week 3 之前不必處理；屆時若要 PWA，再考慮 manualChunks 切 vendor。
- **沒有 PIN/雲端同步**：記帳很私密但目前裸奔，給家人朋友前要先做 Week 3 的 PIN。
- **`crypto.randomUUID` 兼容**：已在 `migration.ts` 與 `ExpenseContext.tsx` 加 fallback，HTTP 環境也能跑。
- **沒有測試**：bug fix 與 schema migration 改動要靠手動驗證 + `npm run build` 的 TS 檢查。

## 給未來 Claude 的提醒

- 動 schema 一定要寫 migration 並升 `SCHEMA_VERSION`，不要直接在 prod 改欄位。
- 加新 tab 不要超過 5 個（iOS HIG 上限）；若需要更多次層級，做成 settings 內的子頁。
- 若用戶提及「CLI」相關，提醒這是網頁專案（資料夾命名誤導）。
