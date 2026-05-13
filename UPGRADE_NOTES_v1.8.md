# v1.8 升級說明

## 已檢查並完成

1. **Phonics Sounds 單獨頁面**
   - 新增「音素」頂部導覽。
   - 內建 44 個音素，按圖片風格分類：短元音、長元音、R 元音、雙元音、單輔音、複合單音。
   - 可顯示所有分類或單一分類。
   - 音素卡片包含大音素、音素符號、相關單詞、高亮音素、聽音按鈕。
   - UI 加入 Duolingo 風格的大卡片、圓角、亮色、按鈕式操作。

2. **後台獨立管理 Phonics Sounds**
   - 新增 Phonics Sounds 管理頁。
   - 可新增、修改、刪除分類。
   - 可新增、修改、刪除音素。
   - 可改音素、音素符號、發音文字、相關單詞、關聯單元、停啟用與音檔 URL。

3. **停用原本學習功能**
   - 頂部導覽已移除「學習」。
   - 首頁「開始」改為前往音素頁。
   - 學習地圖點擊單元後進入音素頁，之後可以按目前單元練習。

4. **重做遊戲區**
   - 舊遊戲不再顯示。
   - 暫時只保留第一個遊戲：聽音素發音，選擇對應音素。
   - 支援目前單元 / 全部單元。
   - 一關 10 題。
   - 有開始、再聽一次、跳過、離開、重新開始。
   - 答對自動下一題，答錯進錯題本。

5. **音素音檔持久保存**
   - 新增 `src/services/audioStorageService.js` 實際上傳流程。
   - Supabase：上傳到 `phonics-audio` bucket。
   - Firebase：上傳到 Firebase Storage 的 `phonics-audio/` 路徑。
   - 上傳完成後，URL 會寫入 `audioLibrary`，並保存到 Supabase `site_content` 或 Firebase `siteContent/main`。
   - 前台播放順序：後台音檔 URL → public/audio → 瀏覽器語音 fallback。

## 新增檔案

- `src/data/phonicsSounds.js`
- `src/services/audioStorageService.js`
- `database/supabase_storage_audio.sql`
- `storage.rules`
- `UPGRADE_NOTES_v1.8.md`

## 需要重新部署

更新 GitHub 後，請確認 GitHub Actions 重新 build 成功。
