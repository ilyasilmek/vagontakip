# GBZ tasarım kimliği ve geri dönüş

Kimlik: teknik, dayanıklı, net. Referans: lokomotif kumanda paneli ve bakım çizelgesi.
Ana renk #182C3A, vurgu #E8B735, zemin #EDF1F2. Başlık IBM Plex Sans Condensed,
gövde IBM Plex Sans. Küçük köşeler, ince çizgiler, işlevsel Lucide ikonları.
GBZ metal plaka ve kısa tren açılışı kullanılır. Hareket azaltma tercihi korunur.
Yapay zekâ etiketleri, emoji, mor gradyan, cam efektleri ve jenerik kart ızgaraları kullanılmaz.
Yeni tasarım ve canlı yayın kullanıcı tarafından onaylanmıştır.

## Eski tasarıma dönmek

Çalışan önceki sürüm `before-gbz-design` Git etiketiyle saklanır.
Yalnızca aşağıdaki arayüz dosyalarını geri yükleyin; veritabanını, sunucu kodunu,
şifreleri veya kullanıcıları önceki sürüme çevirmeyin. Vagon tipi alanları korunur.
Temiz çalışma ağacında:

```sh
git restore --source=before-gbz-design -- client/src/App.tsx client/src/Login.tsx client/src/Collection.tsx client/src/Dashboard.tsx client/src/styles.css client/index.html public/manifest.webmanifest public/icons
npm run build
npm test
```

Sonrasında arayüz değişikliğini yeni bir commit olarak main dalına gönderin.
Cloudflare Git bağlantısı yeni sürümü yayımlar. Geçmişi sıfırlama veya force-push yapmayın.
`data/database.enc.json` dosyasını geri yüklemeyin; güncel kayıtlar korunmalıdır.
