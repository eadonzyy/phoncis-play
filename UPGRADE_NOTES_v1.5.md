# Phonics Adventure v1.5 升級摘要

## 已完成

### 1. 單元管理升級
- 後台「單元管理」改成下拉選擇單元，不再一次顯示全部單元。
- 每個單元可新增、刪除、啟用、停用。
- 每個單元可管理獨立項目：
  - letter sound
  - pattern
  - word
  - story
- 點擊項目即可直接編輯：
  - 類型
  - 啟用 / 停用
  - label
  - patterns
  - words
  - storyTitle
- 可將啟用項目同步到單元的 patterns / words。

### 2. 音頻管理升級
- 可選擇「按單元上傳」或「全部單元上傳」。
- 可選擇分類：
  - letters
  - sounds
  - words
  - phrases
- 打開分類或單元後，會顯示現有項目與建議檔案路徑。
- 可上傳 mp3，並立即在線試聽。
- 可匯出 `phonics-audio-manifest.json`。
- 可匯出 `audio-github-upload-paths.txt`，用於把音檔放到 GitHub 對應資料夾。

## GitHub 自動保存音檔限制

GitHub Pages 是靜態網站，瀏覽器前端不能直接把本機 mp3 寫入 GitHub repo。
要做到真正「上傳後自動保存到 GitHub 對應文件夾」，需要：

1. GitHub API
2. GitHub App 或 Fine-grained token
3. Serverless backend / Edge Function 作為安全代理

不能把 GitHub token 放在前端，否則任何人都能拿到 token 修改你的 repo。

本版本採用安全做法：
- 小型音檔可暫存在 Supabase site_content / localStorage 的 data URL 中，立即試聽。
- 大量正式音檔建議按匯出的路徑放入 `public/audio/...` 後重新部署。

### 3. 遊戲與 AI 功能
- 遊戲頁可選「目前單元」或「全部單元」。
- 遊戲題目會根據選定範圍的 patterns / words 產生。
- 新增 AI 輔助內容區：
  - 產生小故事
  - 產生練習題
  - 根據範圍自動抓取單字與音型
- 目前 AI 是本機規則版，不需要 API key。
- 若要接真正 AI，建議使用 `VITE_AI_PROXY_URL` 指向自己的安全後端，不要在 GitHub Pages 前端放 API key。

## 部署
上傳覆蓋 GitHub repo 後，GitHub Actions 會重新部署。若有設定管理員/教師 email，請確認 GitHub Variables 包含：

- `VITE_ADMIN_EMAILS`
- `VITE_TEACHER_EMAILS`
- `VITE_SYNC_PROVIDER`
