# Push Notification Preview

推播通知預覽工具，用來快速撰寫活動標籤、標題、副標與發送時間，並在手機通知列表樣式中預覽最多 5 則推播文案。

## Features

- 建立、預覽與刪除推播通知
- 載入範例通知
- 複製整理後的推播文案
- 使用 Gemini 產生 CTR 導向的文案潤飾建議
- Production build 後可由 Express server 提供靜態檔案

## Requirements

- Node.js 24+
- Corepack
- pnpm 10.x（由 `packageManager` 指定）

## Getting Started

```bash
corepack pnpm install
corepack pnpm run dev
```

開發伺服器預設使用 `http://localhost:3000`，若 port 被占用，Vite 會自動尋找下一個可用 port。

## Gemini API Key

AI 文案潤飾會透過同源的 `/api/polish-copy` 端點呼叫 Gemini。建議在伺服器環境設定：

```bash
GEMINI_API_KEY=your_api_key
```

可選擇用 `GEMINI_MODEL` 覆寫模型名稱，預設為 `gemini-3-flash-preview`。

若伺服器沒有設定 `GEMINI_API_KEY`，使用者點擊 AI 潤飾時會被提示輸入 Gemini API key。這個 key 只會用於當次同源 API 請求，不會存入瀏覽器 `localStorage`。

## Scripts

```bash
corepack pnpm run dev      # 啟動 Vite dev server
corepack pnpm run check    # TypeScript type check
corepack pnpm run build    # 建置前端與 Express server
corepack pnpm run start    # 啟動 production server
corepack pnpm run preview  # 預覽 Vite build
```

## Deployment

`corepack pnpm run build` 會輸出：

- `dist/public`：前端靜態檔案
- `dist/index.js`：Express server bundle

Production 啟動：

```bash
corepack pnpm run start
```

伺服器會讀取 `PORT` 環境變數，未設定時使用 `3000`。
