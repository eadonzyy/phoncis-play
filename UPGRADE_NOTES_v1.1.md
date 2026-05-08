# Phonics Adventure v1.1 升級說明

## 主要修正

### 1. Letter sound 不再讀成字母名稱
原本點擊 `a` 時，程式直接呼叫瀏覽器語音讀 `a`，所以會讀成字母名 A。

現在改成：

- `src/data/sounds.js`：新增完整 A-Z phonics sound 映射表。
- `src/utils/speech.js`：新增 `speakPhonicsSound()`、`speakBlendWord()`、`speakPattern()`。
- 點擊字母時會播放近似 phonics sound + 代表單字，例如：`a /æ/ apple`、`b /b/ bear`。

> 注意：瀏覽器內建語音不是專業真人 phonics 音檔，不同電腦/瀏覽器會有些差異。這版已避免直接讀字母名稱。若之後要更準，可把 `speakPhonicsSound()` 改成播放真人 mp3。

## 新增功能

### 2. Letter Sound Board
在 Alphabet Sounds 單元新增 A-Z 字母音板，每張卡包含：

- 小寫字母
- IPA 音標
- 圖片 emoji
- 代表單字
- 點擊播放 phonics sound

### 3. Sound Monster 聽音選字母遊戲
在「遊戲」頁新增第一個可真正互動的遊戲：

- 點「播放聲音」
- 聽 phonics sound
- 從 4 個字母中選答案
- 答錯會自動加入錯題本

### 4. 錯題本
在「進度」頁新增錯題本：

- 記錄錯選的字母音
- 可點擊重新播放正確聲音
- 支援清空錯題
- 錯題會同步到 Supabase 的 `student_progress.data` 中

### 5. 可點擊故事文字
閱讀區的故事句子現在可以點單字發音，不只限於 focus words。

## 更新後如何部署到 GitHub

1. 用新版檔案覆蓋 GitHub Repository 內原本檔案。
2. 確認 `.env` 不要上傳。
3. 保留 GitHub Secrets / Variables：
   - `VITE_SYNC_PROVIDER=supabase`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Commit changes。
5. 到 GitHub Actions 重新 Run workflow，或直接 push 後自動部署。

## 不需要重新執行 Supabase SQL
這次只改前端與 JSON 進度資料結構，仍然使用同一張 `student_progress` 表，不需要重建 Supabase database。
