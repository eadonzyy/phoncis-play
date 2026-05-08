# Phonics Adventure v1.3 升級摘要

本次版本依照你的新需求，進一步加入：

## 已完成項目

### 1) 真人音檔架構
- 已加入「真人 mp3 優先、speechSynthesis 備援」機制。
- 新增音檔資料夾說明：`public/audio/README.md`
- 支援以下路徑：
  - `public/audio/letters/*.mp3`
  - `public/audio/sounds/*.mp3`
  - `public/audio/words/*.mp3`
  - `public/audio/phrases/*.mp3`

### 2) 更完整的 12 個 phonics 單元內容
- 已補強 12 個完整單元：
  1. Alphabet Sounds
  2. Short Vowels
  3. CVC Blending
  4. Word Families
  5. Consonant Blends
  6. Consonant Digraphs
  7. Silent E / Magic E
  8. Long Vowels
  9. Vowel Teams
  10. R-Controlled Vowels
  11. Diphthongs
  12. Endings & Syllables
- 每個單元現在都包含：
  - description
  - patterns
  - words
  - learnTips
  - blendingSet
  - magicEPairs
  - 對應 storyTitle

### 3) 管理員登入 / 後台管理
- 新增管理員後台頁面。
- 管理員可編輯：
  - 版本號
  - 首頁文案
  - 單元內容（新增 / 刪除 / 修改）
  - 故事內容
  - 遊戲設定
  - 管理員 Email 名單
- 預設可透過 `.env` 裡的 `VITE_ADMIN_EMAILS` 設定第一批管理員。

### 4) 遊戲區 UI 調整
- 改為 **一次只顯示一個遊戲**。
- 使用切換按鈕 / 遊戲選擇器切換不同遊戲。

### 5) 首頁頂端加入版本號
- Hero 區已加入版本號 badge。

### 6) 登入 / 註冊移到最上方
- 已移除原本大塊「登入與同步」卡片。
- 改為右上角精簡登入 / 註冊。
- 登入後會顯示使用者名稱。
- 點擊使用者名稱可看到登出選項。

### 7) 移除多餘首頁區塊
- 已移除原本占畫面的第二、第三大區塊。
- 將資訊整合到：
  - Hero 區
  - 使用者選單
  - 進度頁

### 8) 互動拼讀板 / Magic E 跟隨單元變化
- 互動拼讀板現在會讀取該單元的 `blendingSet`
- Magic E 現在會讀取該單元的 `magicEPairs`
- 管理員可在後台修改它們

## 另外新增
- `database/supabase_admin.sql`
  - 可建立 `site_content` 與 `admin_users` 表
  - 後台內容可同步到 Supabase

## 建議你下一步做
1. 在 `.env` 設定：
   - `VITE_SYNC_PROVIDER=supabase`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_ADMIN_EMAILS=你的 email`
2. 在 Supabase SQL Editor 執行：
   - `database/supabase_admin.sql`
3. 把真人 mp3 上傳到 `public/audio/` 指定資料夾。
4. 重新部署到 GitHub Pages。

## 注意
- 這版是「完整可展示原型 + 可持續擴充的後台架構」。
- 如果你下一版要更正式，建議再做：
  - 真正的學生 / 教師角色分流
  - 後台表單驗證
  - 單元排序拖拉
  - 檔案上傳式音檔管理
  - 真正錄音評分功能
