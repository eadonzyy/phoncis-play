# Phonics Adventure 英文自然發音冒險島

版本：**v1.8.0**

這是一個給小學生使用的 React + Vite Phonics 學習網站，已支援 GitHub Pages、Supabase / Firebase 登入同步、後台內容管理，以及 Supabase Storage / Firebase Storage 真人音檔上傳。

## 本版重點

- 新增獨立 **Phonics Sounds / 音素** 頁面。
- 內建 44 個音素，按短元音、長元音、R 元音、雙元音、單輔音、複合單音分類。
- 音素卡片支援大字體音素、IPA 符號、相關單詞、高亮音素、聽音按鈕。
- 原本「學習」頁已從頂部導覽停用。
- 遊戲區已重做為第一個遊戲：**聽音素發音，選擇對應音素**。
- 一關 10 題，可按目前單元或全部單元練習。
- 後台可管理音素分類、音素內容、啟用/停用、相關單詞、音素符號、音素發音文字與音檔。
- 後台音檔上傳會保存到 Supabase Storage 或 Firebase Storage，並把 URL 寫入網站內容。

## 本機啟動

```bash
npm install
cp .env.example .env
npm run dev
```

預設是本機模式：

```env
VITE_SYNC_PROVIDER=local
```

## Supabase 使用流程

`.env` 範例：

```env
VITE_SYNC_PROVIDER=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_AUDIO_STORAGE_BUCKET=phonics-audio
VITE_ADMIN_EMAILS=your-admin-email@example.com
```

請依序在 Supabase SQL Editor 執行：

```txt
database/supabase.sql
database/supabase_admin.sql
database/supabase_storage_audio.sql
```

然後把你的管理員 email 加入：

```sql
insert into public.admin_users (email)
values ('your-admin-email@example.com')
on conflict (email) do nothing;
```

### Supabase 音檔保存位置

後台上傳音檔後，檔案會保存到：

```txt
Storage bucket: phonics-audio
Path: sounds/<sound-id>/<timestamp>-<sound-id>.mp3
```

網站會把公開 URL 寫入 `site_content.data.audioLibrary`，其他電腦登入後可以讀取同一批音檔。

## Firebase 使用流程

`.env` 範例：

```env
VITE_SYNC_PROVIDER=firebase
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_ADMIN_EMAILS=your-admin-email@example.com
```

Firebase Console 需要啟用：

1. Authentication：Email / Password
2. Firestore Database
3. Storage

把 Firestore Rules 換成本專案的：

```txt
firestore.rules
```

把 Storage Rules 換成本專案的：

```txt
storage.rules
```

Firebase 後台還需要手動建立一筆管理員文件：

```txt
Collection: adminUsers
Document ID: your-admin-email@example.com
Data: { role: "admin" }
```

注意：Document ID 需要與登入 email 完全一致。

## GitHub Pages 發布

1. 把新版檔案 push 到 GitHub。
2. GitHub repository 進入 **Settings > Pages**。
3. Source 選 **GitHub Actions**。
4. 到 **Settings > Secrets and variables > Actions** 新增你的 `VITE_` 變數。

Supabase 至少需要：

```txt
VITE_SYNC_PROVIDER=supabase
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ADMIN_EMAILS
VITE_AUDIO_STORAGE_BUCKET=phonics-audio
```

Firebase 至少需要：

```txt
VITE_SYNC_PROVIDER=firebase
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_EMAILS
```

## 後台入口

登入管理員帳號後，頂部會出現 **管理**。

後台包括：

- Phonics Sounds：管理音素分類與音素卡片。
- 音頻管理：按單元、全部單元、分類上傳音檔。
- 單元管理：下拉選擇單元後再編輯內容。
- 故事管理：新增、刪除、修改可拼讀故事。
- 網站設定：版本號、首頁文字、管理員與教師 email。

## 專案結構

```txt
phonics-adventure/
  database/
    supabase.sql
    supabase_admin.sql
    supabase_storage_audio.sql
  firestore.rules
  storage.rules
  src/
    App.jsx
    data/
      defaultContent.js
      phonicsSounds.js
      sounds.js
    services/
      audioStorageService.js
      contentService.js
      firebaseService.js
      supabaseService.js
      syncService.js
    utils/
      speech.js
  .env.example
  package.json
  vite.config.js
```
