# 真人音檔放置規則

本專案已加入「真人音檔優先、瀏覽器語音備援」架構。

請把 mp3 檔案放在以下資料夾：

- `public/audio/letters/`：單一字母音，例如 `a.mp3`, `b.mp3`
- `public/audio/sounds/`：音型，例如 `sh.mp3`, `th.mp3`, `ai.mp3`
- `public/audio/words/`：單字，例如 `cat.mp3`, `rain.mp3`, `bike.mp3`
- `public/audio/phrases/`：句子或片語（選用）

## 命名方式
- 一律小寫
- 空白改成 `-`
- 只保留英數字與 `-`

範例：
- `Magic Cape` → `magic-cape.mp3`
- `bossy r` → `bossy-r.mp3`

如果找不到對應 mp3，系統會自動回退為瀏覽器的 speechSynthesis 發音。

## v1.4 後台上傳模式

管理員後台現在也提供「音檔管理」：

1. 選擇類別 letters / sounds / words / phrases。
2. 輸入 key，例如 `a`, `sh`, `cat`。
3. 上傳 mp3。
4. 按「儲存網站內容」。

注意：GitHub Pages 是靜態網站，無法在瀏覽器中直接寫入 `public/audio` 檔案；後台上傳會把小型 mp3 轉成 data URL，存入 `site_content`。大量真人音檔建議放到 `public/audio` 後重新部署，或下一版接 Supabase Storage。
