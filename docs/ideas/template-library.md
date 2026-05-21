# 概念優化與釐清：推播通知範本庫 (Template Library)

## 1. 問題陳述 (Problem Statement)
**我們如何設計一個能跨裝置同步、高效且直覺的推播通知範本庫，讓行銷與營運人員能夠一鍵儲存範本、隨時套用並進行分類管理，同時在 Google Sheets / Apps Script 後端離線或未設定時提供友善的提示？**

## 2. 建議方向 (Recommended Direction)
本功能將區分為前端 UI、API 整合層及雲端儲存庫三個部分：
1. **前端 UI (Client UI)**: 
   - 在左側編輯區上方新增一個使用 Radix UI Collapsible 實作的「📚 範本庫」摺疊區塊（預設收合）。展開後以 Grid 佈局顯示範本卡片，支援以「使用次數」或「建立時間」排序。
   - 在已新增通知列表的每一項右側新增一個「存為範本」的按鈕（📌 圖示）。點擊時彈出使用專案現有 `Dialog` 元件製作的命名彈窗，讓使用者確認或自訂範本名稱，並以 `sonner` 顯示 Toast 成功提示。
   - 套用範本時，會將值填入對應的 Form，並自動收合範本庫、切換右側預覽 Tab 到該類型。
2. **API 整合層 (API Integration)**:
   - 前端發送請求時，將檢查環境變數 `VITE_TEMPLATES_API_URL`。如果未設定或 API 呼叫失敗，將顯示明確的警告 Toast，不降級至本地 localStorage（完全依賴 Google Sheets）。
   - 包含的 API 方法有：取得所有範本 (`getAll`)、儲存範本 (`save`)、刪除範本 (`delete`)、增加使用次數 (`incrementUsed`)。
3. **雲端儲存庫 (Cloud Storage)**:
   - 使用 Google Sheets 作為資料庫，包含欄位 `id`, `name`, `tag`, `title`, `subtitle`, `category`, `createdAt`, `usedCount`。
   - 提供一個 Google Apps Script 的程式碼參考檔案 `reference/google_apps_script.js`，包含後端處理邏輯（DoGet, DoPost）。

## 3. 關鍵假設與驗證 (Key Assumptions to Validate)
- [x] **假設 1**：當 `VITE_TEMPLATES_API_URL` 未設定時，我們僅提示警告，不使用 `localStorage` 作為備份。 -> *已由使用者確認*。
- [x] **假設 2**：儲存範本彈窗採用專案現有的 `Dialog`（或 `ManusDialog`）進行命名編輯。 -> *已由使用者確認*。
- [x] **假設 3**：我們需要在專案中提供獨立的 `google_apps_script.js` 參考檔案，並附上部署教學。 -> *已由使用者確認*。
- [ ] **假設 4**：Google Apps Script Web App 的 CORS 設定是否正確？我們需要設計符合前端 fetch CORS 規範的 Apps Script 回傳 Header。

## 4. 最簡可行產品範圍 (MVP Scope)
### 包含 (In-Scope)
- 在左側編輯區頂端新增「📚 範本庫」摺疊面板。
- 範本列表卡片：顯示範本名稱、通知類型 Badge、標題預覽，並提供「套用」與「刪除（含二次確認）」按鈕。
- 範本列表排序：依「使用次數」或「建立時間」排序。
- 在已新增通知的列表項目右側加入「📌 存為範本」按鈕。
- 點擊「📌」後，彈出 `Dialog` 輸入框（預設名稱為 `[標籤] + 標題前10字`），確認後儲存。
- 呼叫 Apps Script API 來持久化資料，限制上限 50 筆範本。
- 若 API 失敗或變數未設定，以 Toast 提示錯誤，但不影響基本編輯功能。
- 在 `reference/google_apps_script.js` 中實作 Apps Script 的範本程式碼。

### 不包含 (Out-of-Scope)
- 本機 `localStorage` 備份儲存。
- 範本搜尋功能（因上限 50 筆，直接以列表與排序呈現即可）。
- 多使用者權限管理（目前以 Anyone 存取方式，符合開啟即用需求）。

## 5. 開放問題 (Open Questions)
- 暫無其他開放問題。
