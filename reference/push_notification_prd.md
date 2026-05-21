## **範本庫（Template Library）**

### **儲存範本**

* 在每則「已新增通知」的列表項目右側，新增「存為範本」按鈕（📌 圖示）。

* 點擊後，以通知的 tag、title、subtitle、category 作為範本內容儲存（不儲存 sendTime）。

* 每個範本儲存時自動記錄「建立時間」與「使用次數」（使用次數初始值 \= 0）。

* 範本名稱預設為標籤＋標題前 10 字，用戶可在儲存彈窗中修改。

* 儲存後顯示短暫的成功提示（Toast），不跳 alert。

### **範本管理**

* 在左側編輯區頂部新增「📚 範本庫」摺疊區塊（預設收合）。

* 展開後以卡片方式列出所有已儲存範本，每張卡片顯示：範本名稱、通知類型（Badge）、標題預覽（前 20 字）。

* 每張卡片操作按鈕：「套用」（將範本內容填入左側表單）、「刪除」（需二次確認）。

* 套用範本後自動關閉範本庫，並將右側預覽 Tab 切換至對應類型。

* 套用次數 \+1，範本列表可按「使用次數」或「建立時間」排序。

### **雲端持久化儲存**

**儲存方案：Google Sheets \+ Apps Script Web App**

**架構說明：**

* 前端（Render）透過 fetch 呼叫 Apps Script Web App（HTTPS endpoint）。

* Apps Script 作為免費的中介 API 層，讀寫掛載的 Google Sheets 工作表。

* Google Sheets 作為資料庫，一列代表一筆範本。

**Sheets 設定：**

* 新建一份專用 Sheets，命名建議：「推播通知範本庫」。

* 工作表名稱：範本。

* 欄位順序（A–H）：id、name、tag、title、subtitle、category、createdAt、usedCount。

**Apps Script API Endpoints：**

| Method | action 參數 | 說明 |
| ----- | ----- | ----- |
| GET | getAll | 取得所有範本 |
| POST | save | 新增一筆範本 |
| POST | delete | 依 id 刪除範本 |
| POST | incrementUsed | 依 id 將 usedCount \+1 |

**部署設定：**

* 執行身分：我（你自己的 Google 帳號）。

* 誰可以存取：所有人（Anyone）← 不需登入即可直接使用，符合「開啟即用」需求。

* 部署後取得 Web App URL，填入前端環境變數 VITE\_TEMPLATES\_API\_URL。

**資料結構（每列欄位）：**

{ id, name, tag, title, subtitle, category, createdAt, usedCount }

* 上限：最多儲存 50 筆範本（Sheets 無實際限制，軟性上限由前端控制）；達上限時提示用戶刪除舊範本。

* 跨裝置同步：任何裝置開啟工具，皆可看到同一份雲端範本庫。

* 載入時機：工具開啟時自動 fetch 一次；每次存入／刪除後同步更新本地快取。

* 離線處理：API 失敗時顯示錯誤 Toast，不影響主要文案編輯功能。

