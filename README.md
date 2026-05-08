# Phonics Adventure 英文自然發音冒險島

> v1.1 更新：修正 Letter Sound 讀成字母名稱的問題，新增 A-Z 字母音板、Sound Monster 聽音選字母遊戲、錯題本與可點擊故事文字。詳見 `UPGRADE_NOTES_v1.1.md`。


這是一個給小學生學習 Phonics 的 React + Vite 網站原型，包含：

- 學習地圖
- 完整 Phonics 單元資料
- 互動拼讀板
- Magic E 動畫區
- 單字卡朗讀
- 遊戲入口
- 可拼讀故事
- 學習進度與星星
- Supabase / Firebase / 本機儲存三種同步模式
- GitHub Pages 部署 workflow

---

## 1. 本機啟動

```bash
npm install
cp .env.example .env
npm run dev
```

預設 `.env` 是：

```env
VITE_SYNC_PROVIDER=local
```

這表示先用瀏覽器 localStorage 儲存進度，不需要雲端服務，也可以先測試畫面和功能。

---

## 2. Supabase 是否能直接使用？

如果你已經註冊 Supabase，通常可以直接使用，但必須完成以下三件事：

1. 已建立 Supabase Project。
2. 已取得 Project URL 和 anon public key。
3. 已在 SQL Editor 執行 `database/supabase.sql`，建立 `student_progress` 表格與 RLS 權限。

完成後，把 `.env` 改成：

```env
VITE_SYNC_PROVIDER=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### Supabase 設定步驟

1. 打開 Supabase Dashboard。
2. 進入你的 Project。
3. 左側選單進入 **Project Settings > API**。
4. 複製：
   - Project URL
   - Project API keys 裡的 anon public key
5. 左側進入 **SQL Editor**。
6. 貼上並執行 `database/supabase.sql`。
7. 左側進入 **Authentication > Providers**。
8. 開啟 Email provider。
9. 本機執行：

```bash
npm run dev
```

10. 用網站上的 Email / Password 註冊學生帳號。

注意：anon key 會出現在前端，這是 Supabase 前端專案的正常做法，但你的資料表必須開啟 RLS，否則會有資料外洩風險。本專案提供的 SQL 已經開啟 RLS。

---

## 3. Firebase 註冊與配置流程

如果你不用 Supabase，可以改用 Firebase。Firebase 比較適合第一版小學生學習網站，因為 Authentication + Firestore + 離線快取都很容易整合。

### A. 建立 Firebase 專案

1. 進入 Firebase Console。
2. 點 **Add project / 新增專案**。
3. 輸入專案名稱，例如：`phonics-adventure`。
4. Google Analytics 可先關閉，之後再開也可以。
5. 建立專案。

### B. 註冊 Web App

1. 進入 Project Overview。
2. 點 Web 圖示 `</>`。
3. App nickname 輸入：`phonics-adventure-web`。
4. 先不要勾選 Firebase Hosting，因為本專案用 GitHub Pages。
5. 點 Register app。
6. 複製 Firebase config。

你會看到類似：

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  projectId: "...",
  storageBucket: "...appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

把它填入 `.env`：

```env
VITE_SYNC_PROVIDER=firebase
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

### C. 開啟 Authentication

1. 左側選單進入 **Build > Authentication**。
2. 點 **Get started**。
3. 進入 **Sign-in method**。
4. 啟用 **Email/Password**。
5. 儲存。

### D. 建立 Firestore Database

1. 左側選單進入 **Build > Firestore Database**。
2. 點 **Create database**。
3. 選擇離你使用者較近的 region。
4. 初期可選 production mode，然後貼上本專案的安全規則。
5. 建立資料庫。

### E. 設定 Firestore 安全規則

進入 Firestore 的 Rules，把內容替換成 `firestore.rules`：

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/private/progress {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

這代表每個學生只能讀寫自己的進度。

### F. 測試 Firebase 同步

```bash
npm run dev
```

1. 打開網站。
2. 用 Email / Password 註冊。
3. 完成一個單元。
4. 換瀏覽器或換電腦登入同一帳號。
5. 確認星星與完成進度會同步。

---

## 4. 發布到 GitHub Pages

### A. 建立 GitHub repo

```bash
git init
git add .
git commit -m "Initial Phonics Adventure website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### B. 設定 GitHub Pages

1. 進入 GitHub repo。
2. 打開 **Settings > Pages**。
3. Source 選擇 **GitHub Actions**。
4. 本專案已提供 `.github/workflows/deploy.yml`。
5. push 到 main 後，GitHub Actions 會自動 build 並發布。

### C. 設定 GitHub Secrets / Variables

如果用 Supabase：

- Repository Settings > Secrets and variables > Actions
- Variables 新增：
  - `VITE_SYNC_PROVIDER` = `supabase`
- Secrets 新增：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

如果用 Firebase：

- Variables 新增：
  - `VITE_SYNC_PROVIDER` = `firebase`
- Secrets 新增：
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

注意：Vite 的 `VITE_` 變數會被打包到前端，因此 Firebase config 和 Supabase anon key 不是傳統意義上的後端密鑰。真正保護資料的是 Firestore Rules 或 Supabase RLS。

---

## 5. 專案結構

```txt
phonics-adventure/
  .github/workflows/deploy.yml
  database/supabase.sql
  firestore.rules
  src/
    App.jsx
    main.jsx
    styles.css
    data/phonics.js
    services/
      firebaseService.js
      localService.js
      supabaseService.js
      syncService.js
  .env.example
  index.html
  package.json
  vite.config.js
```

---

## 6. 下一步建議

第一版可以先完成：

1. Supabase 或 Firebase 登入
2. 學習地圖
3. 單字卡音檔替換成真人錄音
4. CVC 拼讀遊戲
5. Magic E 遊戲
6. 錯題本
7. 教師查看學生進度頁

之後可以再做：

- 班級代碼登入
- 教師派發任務
- 家長報告
- 錄音跟讀
- 單字音檔 CDN
- 更多 decodable readers

## v1.4 新功能

- 新增教師後台：教師可查看班級概況、指派單元、查看目前帳號錯題。
- 新增管理員音檔上傳管理：可在後台上傳 letters / sounds / words / phrases 類別 mp3。
- 新增環境變數：`VITE_ADMIN_EMAILS`、`VITE_TEACHER_EMAILS`。
- 若使用 Supabase 後台雲端內容管理，請執行 `database/supabase_admin.sql`。

GitHub Pages 是靜態網站；後台上傳音檔會保存成 data URL。大量音檔建議放入 `public/audio/` 後重新部署，或改接 Supabase Storage。
