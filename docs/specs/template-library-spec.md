# Spec: 推播通知範本庫 (Template Library)

## Objective
提供推播通知範本的「儲存、管理、套用與雲端同步」功能。用戶能將常使用的通知儲存為範本，並同步存於 Google Sheets 中，便於隨時套用，省去重複輸入的繁瑣步驟。

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Radix UI (Collapsible, Dialog, Alert Dialog)
- **Backend**: Google Apps Script Web App (API integration via `fetch`)
- **Database**: Google Sheets
- **State & Utilities**: Lucide React (Icons), Sonner (Toasts)

## Commands
- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **TypeScript Check**: `npm run check`
- **Format Code**: `npm run format`

## Project Structure
新增與變更的檔案結構如下：
```
client/src/
  ├── components/
  │   └── ui/                     # 系統現有的 Radix/Tailwind 元件
  ├── hooks/
  │   └── useTemplates.ts         # [NEW] 負責處理範本的 API 讀寫與快取狀態
  └── pages/
      └── Home.tsx                # [MODIFY] 整合範本庫 UI 與套用邏輯
reference/
  └── google_apps_script.js       # [NEW] Apps Script Web App 參考腳本及部署指引
```

## Code Style
1. **命名規範**：元件與檔名使用 PascalCase，變數與函式使用 camelCase，API 回傳資料結構與 Google Sheets 欄位對齊：
   - 欄位：`id`, `name`, `tag`, `title`, `subtitle`, `category`, `createdAt`, `usedCount`
2. **範例程式碼樣式**：
   ```typescript
   export interface Template {
     id: string;
     name: string;
     tag: string;
     title: string;
     subtitle: string;
     category: string;
     createdAt: string;
     usedCount: number;
   }
   ```
3. **錯誤處理**：所有的 API 呼叫必須有 `try-catch` 包裝，並在 catch 時以 `toast.error` 提示。

## Testing Strategy
1. **本機手動測試**：
   - 在未設定 `VITE_TEMPLATES_API_URL` 時，確認網頁開啟時提示警告 Toast，且範本庫無法使用。
   - 透過 Mock API 或是實際部署一個測試用的 Apps Script Web App URL，測試 `getAll`、`save`、`delete` 及 `incrementUsed` 四大動作。
   - 驗證上限 50 筆的阻擋邏輯。
   - 驗證範本卡片「套用」後是否成功填入表單、自動切換預覽 Tab，且「套用次數 +1」。
   - 驗證「刪除」時是否會觸發二次確認彈窗。

## Boundaries
- **Always**:
  - API 失敗時顯示明確的 Toast 警告，但不影響推播編輯功能（優雅降級）。
  - 對刪除操作進行二次確認（可以使用 `AlertDialog`）。
  - 在前端做範本上限（50筆）的檢查。
- **Ask first**:
  - 修改現有的全域變數或 Context。
- **Never**:
  - 使用 `localStorage` 作為備份儲存（已依使用者指示完全依賴 Google Sheets）。
  - 將敏感資訊或 API 密鑰直接寫死在程式碼中。

## Success Criteria
- [ ] 頁面左側上方成功新增「📚 範本庫」摺疊區塊，展開後能顯示已存範本。
- [ ] 已新增通知列表的每一項右側皆有「📌 存為範本」按鈕。
- [ ] 點擊「存為範本」會顯示 Dialog，讓使用者能編輯預設的範本名稱，確認後送出。
- [ ] 點擊「套用」能成功填入編輯表單，收合範本庫，並將右側預覽 Tab 切換至對應類型，且 API incrementUsed 被正確觸發（usedCount 增加）。
- [ ] 點擊「刪除」會顯示二次確認 Dialog，確認後會從雲端 Sheets 刪除該範本並重新整理列表。
- [ ] 範本列表能依「使用次數（降序）」或「建立時間（降序）」進行排序。
- [ ] 專案中提供 `reference/google_apps_script.js` 檔案，內含完整的 Google Apps Script 實作程式碼與部署流程。

## Open Questions
無
