# Phonics Adventure v1.2 升級摘要

這版依照「遊戲化學習地圖 + Learn → Practice → Game → Read → Check」方向，進一步升級了網站原型。

## 主要新增功能

1. **Phonics Island 首頁升級**
   - 新增 4 個首頁大按鈕：開始學習 / 複習練習 / 玩遊戲 / 我的進度
   - 更明確的學習地圖說明與任務提示

2. **新增 Review 複習練習頁**
   - 我的 Phonics Passport
   - 今日任務
   - 常練單字
   - 錯題自動複習

3. **單元流程固定化**
   - 每個單元顯示 Learn → Practice → Game → Read → Check 的流程條

4. **新增單元化互動練習**
   - Alphabet: Letter Sound Board
   - Short Vowels: 短母音分類遊戲
   - CVC: 互動拼讀板
   - Word Families: Word Family Train
   - Magic E: Magic E 動畫區
   - 其他音型：Pattern Explorer

5. **新增閱讀橋樑**
   - 在 Learn 頁面加入 Read 閱讀小橋樑
   - 學完單元後，可直接讀相關小故事

6. **新增單元檢核**
   - Check 區塊提供完成任務提示
   - 完成單元可獲得星星與徽章進度

7. **新增兩個可操作遊戲**
   - Word Train
   - Magic E Lab

8. **學生進度與獎勵系統升級**
   - 星星數
   - 完成單元數
   - 連續學習天數
   - 總練習次數
   - 徽章收藏

9. **家長 / 教師功能示意區**
   - 進度查看
   - 錯題查看
   - 指派單元
   - 匯出報告（示意）

10. **Letter sound 修正保留**
    - 仍使用 phonics sound map，不會再直接把字母讀成 A/B/C 的字母名稱

## 注意事項

- 目前發音仍以瀏覽器 speechSynthesis 為主，不同電腦 / 瀏覽器聲音會略有差異。
- 若要更精準的 phonics 發音，建議下一步改用真人錄製 mp3 音檔。
- 本版不需要重新修改 Supabase SQL 結構，沿用原本的 `student_progress` 表即可。
