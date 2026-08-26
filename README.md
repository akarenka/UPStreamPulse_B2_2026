# StreamPulse B2 2026

已設定的 Backblaze B2 儲存桶：

- Bucket：`streampulse-videos-2026`
- Bucket ID：`6b0bfe4dcd55004aa6050a17`
- 管理頁：<https://tree-iad1-0003.secure.backblaze.com/b2_browse_files2.htm?bucketId=6b0bfe4dcd55004aa6050a17>
- 預設公開網址：`https://f005.backblazeb2.com/file/streampulse-videos-2026/`

## 開啟方式

- 管理者頁面：雙擊 `index.html`（包含上傳、方案、試算器與分紅後台）。
- 觀眾頁面：雙擊 `viewer.html`（顯示宣傳 Title 與訂閱按鈕，但不顯示上傳功能及管理導覽）。
- 也可以使用 VS Code Live Server 開啟。

## 使用既有 B2 影片

1. 在 Backblaze 管理頁將影片上傳至儲存桶。
2. 複製影片的 Friendly URL。
3. 在 StreamPulse 開啟「上傳影音並自動同步至大廳」。
4. 填寫標題與創作者資料，貼上 Friendly URL，再按確認。

新增的影音清單會保存在瀏覽器 `localStorage`，重新整理後仍會保留。

管理頁也會自動保存上傳表單草稿（標題、創作者、分紅比例、媒體類型與 B2 Friendly URL）。下次重新開啟 `admin.html` 時會自動恢復。瀏覽器基於安全規則不會保存本機檔案選擇，因此若檔案尚未傳到 B2，仍需重新選取檔案；已傳到 B2 的檔案可直接貼回 Friendly URL。

若要接續另一台電腦或舊版本的影音資料，請在管理頁按「接續既有 media.json」並選擇原本的 `media.json`。系統會依 `src` 網址合併並略過重複項目，之後再下載新的 `media.json` 發布即可。

## 首頁內容與直式廣告同步

在 `admin.html` 的首頁主視覺右上角按「編輯版面」，可修改標題、文字、主視覺圖片 URL／本機圖片，以及左右兩側直式廣告媒體與點擊網址。廣告支援圖片或自動靜音循環的 MP4/WebM 影片，也可選擇 5MB 以下的本機檔案；較大的影片應先上傳 B2，再填入公開 HTTPS Friendly URL。內容可以儲存、更換或刪除。

設定完成後按「下載 site-content.json」，再將它放到網站最外層並與 `index.html`、`viewer.html` 一起發布。觀眾頁與載入同一網站的 Android App 會讀取相同的 `site-content.json`。左右直式廣告只在超寬桌面顯示，手機與一般寬度會自動隱藏，避免遮擋影片。

手機與平板會在主視覺下方顯示獨立橫幅廣告，支援圖片、MP4/WebM 影片和點擊網址；大型媒體請使用 B2 公開 HTTPS URL。桌面寬度達到 1024px 後會自動隱藏手機橫幅，改用左右直式廣告。

## 影音分類、創作者 Avatar 與搜尋

管理頁上傳表單可自由輸入任何分類名稱，不提供固定分類清單；影片標題與創作者／頻道名稱只需填寫其中一項。可使用公開圖片 URL 或從手機相簿／電腦選擇 800KB 以下的創作者／頻道 Avatar。這些欄位會包含在下載的 `media.json`。

首頁與觀看頁提供網內搜尋，可同時搜尋影片標題、創作者／頻道名稱與分類，並能搭配影片／音訊及分類篩選。發布新版 `media.json` 後，網站與 Android App 會讀取同一份資料。

觀看頁觀眾可按影音卡片上的編輯圖示，自訂該影片在自己裝置上顯示的標題、創作者／頻道名稱、Avatar URL 與分類。個人自訂資料保存在瀏覽器／App WebView，不會改寫所有觀眾共用的 `media.json`；全站同步修改仍需由管理頁匯出並發布 `media.json`。

「我的影音庫」現在可建立多個自訂播放清單群組。觀眾可自行命名、重新命名、刪除群組，並從影音卡片的資料夾按鈕加入指定群組。群組資料會保存在網站瀏覽器或 Android App WebView；若需要跨手機與跨裝置同步，仍需再串接 Firebase 使用者資料庫。

載入舊版 `media.json` 時，系統會自動補上缺少的標題、頻道、分類、Avatar、類型、縮圖、時長與觀看數欄位，避免舊資料造成新版管理頁或觀看頁顯示錯誤。

## 觀眾個人影音功能

- 私人收藏：使用書籤按鈕加入稍後觀看。
- 最愛影音：使用愛心按鈕建立最愛清單。
- 播放清單：使用清單按鈕排列個人連播內容。
- 自動回播：可切換「關閉」、「單片循環」與「清單連播」。
- 點擊頁首「我的影音庫」可以集中查看、播放或移除項目。

## 完整影音訂閱

- 月繳方案：NT$190，可完整觀看所有影音 1 個月。
- 年繳方案：NT$2,080，可完整觀看所有影音 1 年。
- 免費會員仍可試看前 15 秒；有效訂閱期間解除所有影片的 15 秒限制。
- 目前下載版提供前端訂閱權限與到期日保存示範，不會真的扣款。正式營運必須串接安全金流後端，並由後端驗證付款結果，不能只依賴瀏覽器 localStorage。

這些資料只保存在該觀眾目前使用的瀏覽器，不會公開給其他人。

## GitHub Pages 共用影音目錄

公開網站會在啟動時讀取同一層的 `media.json`。請將 `index.html` 與 `media.json` 一起上傳到 GitHub Repository 最外層，所有觀眾就會看到相同的 Backblaze 影音清單。

新增影片時，在 `media.json` 陣列加入一個項目並 Commit；GitHub Pages 更新後，觀眾重新整理即可看到。不要把 Backblaze 金鑰放入 `media.json`。

管理頁的每張影音卡提供鉛筆「編輯」與垃圾桶「從網站刪除」按鈕。修改後請下載新版 `media.json` 並替換 GitHub 同名檔案。刪除網站卡片不會刪除 Backblaze 原始檔。

## Windows 本機安全端點（已加入）

1. 安裝 [Node.js 18 或更新版本](https://nodejs.org/)。
2. 在 Backblaze 建立只限 `streampulse-videos-2026` 的 Application Key，至少開啟 `writeFiles` 權限。
3. 雙擊 `setup-backblaze.cmd`，依序輸入 `keyID` 與 `applicationKey`。
4. 雙擊 `start-server.cmd`，上傳期間保持黑色視窗開啟。
5. 開啟 `index.html`，選擇本機影音並上傳。

本機端點位址為 `http://127.0.0.1:8787/upload`。可在瀏覽器開啟 `http://127.0.0.1:8787/health` 檢查狀態。

純 HTML 不應保存 Backblaze `keyID` 或 `applicationKey`，否則訪客可以取得金鑰。本專案會將金鑰存入電腦上的 `config.env`，只有本機 Node.js 後端讀取。

請勿上傳或分享產生的 `config.env`。若金鑰曾經外洩，請立即在 Backblaze 刪除該 Application Key 並建立新金鑰。

若儲存桶不是 Public，公開 Friendly URL 無法直接播放；請改用短效下載授權網址，或由後端代理串流。

## 本次修正

- 寫入指定 Bucket 名稱與 Bucket ID。
- 加入 Backblaze 管理頁快捷按鈕。
- 修正本機 Blob 暫存網址被誤稱為 B2 上傳的問題。
- 加入安全上傳 API 接口與錯誤處理。
- 加入零第三方套件的 Windows Node.js 本機上傳後端。
- 加入 `setup-backblaze.cmd` 與 `start-server.cmd` 一鍵設定/啟動工具。
- 驗證 Friendly URL 必須使用 HTTPS。
- 新增影音清單的瀏覽器持久保存。
- 保留原有播放、15 秒試看、訂閱、分紅試算與後台介面。
