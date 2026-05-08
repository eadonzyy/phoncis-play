# Phonics Adventure v1.4 升級摘要

## 本版新增

### 1. 教師後台
- 新增「教師」分頁。
- 支援教師 Email 白名單：`VITE_TEACHER_EMAILS`。
- 教師可查看：
  - 班級名稱
  - 指派單元
  - 示範學生名單
  - 目前登入帳號錯題
  - 目前登入帳號星星與進度
- 教師可編輯班級任務說明與指派單元。

### 2. 管理員音檔上傳管理
- 管理員後台新增「音檔管理」。
- 可上傳 mp3 到以下類別：
  - letters：字母音，例如 `a`
  - sounds：音型，例如 `sh`, `ai`, `ar`
  - words：單字，例如 `cat`, `rain`
  - phrases：句子或片語
- 上傳後可立即試聽、刪除、保存。
- 播放順序：後台上傳音檔 → `public/audio` 音檔 → 瀏覽器語音備援。

### 3. 管理員後台擴充
- 新增「教師設定」。
- 可編輯教師 Email 名單。
- 可設定班級名稱與教師任務說明。

### 4. GitHub Actions 更新
- workflow 新增：
  - `VITE_ADMIN_EMAILS`
  - `VITE_TEACHER_EMAILS`

### 5. Supabase SQL 更新
- `database/supabase_admin.sql` 新增 `teacher_users` 表與 RLS policy。
- `database/supabase_v1_4_notes.sql` 加入音檔儲存建議。

## 重要提醒

GitHub Pages 是靜態網站，瀏覽器無法直接把上傳的 mp3 寫回 GitHub repo。v1.4 的後台音檔上傳會把小型 mp3 轉成 data URL 保存到網站內容資料。大量音檔建議使用：

1. 直接放入 `public/audio/` 後重新部署；或
2. 下一版改用 Supabase Storage。

## GitHub 需要新增的 Variables

Repository → Settings → Secrets and variables → Actions → Variables：

```text
VITE_ADMIN_EMAILS=你的管理員email
VITE_TEACHER_EMAILS=你的教師email
```

如果同一個 email 同時是管理員和教師，可以兩邊都填同一個。
