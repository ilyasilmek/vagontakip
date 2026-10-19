# Vagon Takip

Başka bir geliştiriciye veya AI aracına devir için: [Ayrıntılı AI devir rehberi](docs/AI-DEVIR-REHBERI.md). Güncel mimari, bütün ekran ve tuşlar, hesaplar, kayıt modeli, GitHub/Cloudflare görevleri, güvenli erişim envanteri, kurulum, yayın ve veri taşıma sınırlarını içerir.

Güncel değişiklikler, test sonuçları ve test/canlı yayın durumu: [Geliştirme raporu](docs/gelistirme-raporu.md).

Yeni bakım/adam-saat şartnamesinin karşılaştırması ve kesinleşen vardiya kuralları: [Şartname analizi](docs/bakim-sartname-analizi.md). Yalnız testteki personel, günlük atölye ve rapor ekranlarının kullanımı: [Bakım pilotu](docs/maintenance-pilot.md).

Vagon, parça ve demirbaş kayıtlarını telefondan yönetmek için Türkçe PWA. Aynı uygulama Android, iPhone ve masaüstü tarayıcılarında açılır; destekleyen telefonlarda ana ekrana kurulabilir. Windows programından aktarılan başlangıç verisinde 128 vagon, 2 parça ve 7 demirbaş bulunur.

Uygulama React ve TypeScript ile hazırlanmıştır. Cloudflare Worker giriş işlemlerini ve API'yi sağlar. Ortak veritabanı bu GitHub deposundaki **şifreli** `data/database.enc.json` dosyasıdır; tüm cihazlar veriye aynı Worker üzerinden erişir.

## Kullanım

Canlı uygulamanın HTTPS adresini açın ve yöneticinizin verdiği kullanıcı adı ile şifreyi girin. Kendi kendine hesap açma yoktur; yönetici ekip hesaplarını oluşturur.

- **Genel bakış:** kayıt sayıları, vagon durumları ve üç sayfalı Excel raporu.
- **Vagonlar:** vagon numarası, giriş/kanal/tamamlanma tarihleri, durum ve açıklama.
- **Parçalar:** tür, marka, adet, seri numarası, vagon numarası, sökülme/sevk/dönüş tarihleri ve arıza açıklaması.
- **Demirbaşlar:** tür, marka, adet ve seri numarası.
- **Hesabım:** şifre değiştirme, çıkış ve telefona yükleme yönergeleri.

Listelerde arama, durum filtresi ve görünen kayıtları CSV olarak indirme bulunur. Vagon durumları `Bekliyor`, `Parça bekliyor`, `Bakım devam ediyor` ve `Tamamlandı` şeklindedir. Yeni kayıt veya tarih/durum değişikliğinde tarih sırası doğrulanır; tamamlanan vagon için tamamlanma tarihi gerekir.

| İşlem | Kullanıcı | Yönetici |
| --- | --- | --- |
| Tüm operasyon kayıtlarını görüntüleme ve rapor indirme | Evet | Evet |
| Vagon, parça ve demirbaş ekleme/düzenleme | Evet | Evet |
| Operasyon kaydı silme | Hayır | Evet |
| Ekip hesabı oluşturma, rol ve şifre değiştirme, pasifleştirme/silme | Hayır | Evet |
| İşlem geçmişini görüntüleme | Hayır | Evet |

Yönetici **Yönetim** ekranından kullanıcıları ve işlem geçmişini yönetir; operasyon kayıtlarını ilgili listelerden düzenler veya siler. Son aktif yöneticinin silinmesi ya da yetkisinin kaldırılması engellenir. Kullanıcının silinmesi, daha önce oluşturduğu operasyon kayıtlarını silmez. Şifreler en az 8 karakter olmalıdır.

## Telefona kurulum

1. Canlı HTTPS adresini telefonun tarayıcısında açın.
2. Android'de Chrome/Edge menüsünden **Uygulamayı yükle / Ana ekrana ekle** seçin; uygulamadaki **Telefona yükle** düğmesi de desteklenen tarayıcıda yükleme isteğini açar.
3. iPhone/iPad'de Safari'de **Paylaş → Ana Ekrana Ekle → Ekle** seçin.

Uygulama mağazası veya APK gerekmez. Kurulum seçeneği telefonun tarayıcı desteğine bağlıdır; uygulama normal tarayıcıda da kullanılabilir. İlk açılış ve giriş için internet gerekir.

## Ortak veriler ve çevrimdışı kullanım

Başarılı ekleme, düzenleme ve silmeler, GitHub'da şifreli dosya için bir commit oluşturur. Telefona uygulama kurmak ayrı bir veritabanı oluşturmaz. Açık ve görünür ekranlar yaklaşık **15 saniyede bir** yenilenir; uygulamaya dönüldüğünde ve bağlantı geri geldiğinde de güncel kayıtlar alınır.

Aynı kayıt iki kişi tarafından düzenlenirse eski sürüme dayanan ikinci işlem reddedilir ve güncel bilgilerin yüklenmesi istenir. GitHub'a yazma başarısız olduğunda uygulama işlemi kaydedilmiş göstermez.

Daha önce giriş yapılmış cihazda son alınan operasyon kayıtları çevrimdışı görüntülenebilir. Çevrimdışıyken yeni giriş, ekleme, düzenleme, silme ve hesap işlemleri yapılamaz; bekleyen bir çevrimdışı değişiklik kuyruğu yoktur. Cihazdaki bu kopya son alınan veridir. Hesap erişiminin kaldırılması çevrimdışı kopyayı uzaktan silemez; paylaşılan telefonlarda çevrimiçiyken çıkış yapın. Çıkış cihazdaki uygulama veri kopyasını temizler.

## Yerel geliştirme

Node.js **22.12 veya üzeri** kullanın. Mevcut checkout içinde çalışın; bulut görevi zaten ayrı ortamda yürür.

```bash
npm ci --cache /tmp/vagontakip-npm-cache
npm run setup:local
npm run build
npm run dev:api
```

Uygulama `http://localhost:8787` adresinde açılır. Yerel kurulum `.dev.vars` ve `.local/test-credentials.json` dosyalarını Git takibi dışında oluşturur; test giriş bilgilerini yalnız kendi güvenli yerel oturumunuzda kullanın. Yerel şifreler ve veriler üretimden ayrıdır. Kurulum mevcut `.dev.vars` dosyasını korur.

Arayüz üzerinde anında yenilenerek çalışmak için API açıkken ikinci terminalde `npm run dev` çalıştırın ve `http://localhost:5173` adresini kullanın. PWA service worker'ı üretim derlemesinde oluşturulur; çevrimdışı davranışı 8787 adresindeki derlenmiş uygulamada doğrulayın.

Yeni bir checkout yerel başlangıç verisi yoksa boş kayıtlarla başlar. Windows SQLite dosyasını geliştirme için aktarmak isterseniz kurulumdan **önce** şu komutu çalıştırın; kaynak salt okunur açılır ve mevcut çıktı üzerine yazılmaz:

```bash
npm run import:sqlite -- --source /kaynak/vagonlar.db --output .local/seed.json
```

128/2/7 kayıtlı üretim başlangıç verisi zaten şifrelenmiştir. Mevcut üretim dosyasını yeniden üretmeyin; `.local/production-secrets.json` içindeki mevcut anahtar olmadan bu dosya açılamaz.

## Doğrulama ve yayın

```bash
npm run typecheck
npm test
npm run build
# Yerel API 8787 portunda açıkken:
npm run test:e2e
```

Tarayıcı testleri geçici kayıtlar/hesaplar oluşturup kendi oluşturduklarını temizler; yalnız localhost hedeflerine izin verir. Sistem Chromium'u yoksa önce `npx playwright install chromium` çalıştırın. Kapsam ve test çalıştırma ayrıntıları [tests/README.md](tests/README.md) içindedir.

Cloudflare hesabı ve güvenli erişim bağları hazır olduğunda `npm run deploy` arayüzü derler ve Worker'ı yayınlar. **Canlı yayın için gereken bağlar ve mevcut eksikler** [docs/deployment.md](docs/deployment.md) dosyasında açıklanmıştır. GitHub'a kod eklemek tek başına çalışan bir canlı uygulama oluşturmaz.

## Verinin korunması ve sınırlar

Bu depo kullanıcı tarafından private yapılmıştır. Operasyon kayıtları, kullanıcı parola özetleri ve işlem geçmişi AES-256-GCM şifreli dosyanın içinde tutulur. GitHub erişim tokenı, yönetici şifresi, oturum anahtarı ve veritabanı anahtarı yalnız sunucu secrets ayarlarında bulunur; tarayıcı koduna veya Git'e eklenmez. Yerel `.local/` ve `.dev.vars` dosyaları izlenmez. Veritabanı anahtarını güvenli ve kalıcı olarak yedekleyin; kaybolursa GitHub'daki şifreli veri kurtarılamaz.

GitHub ortak veritabanının kalıcı kaynağıdır; Cloudflare Durable Object yazmaları sıraya koyar ve sunucu kopyasını tutar. Tek şifreli dosya, küçük ekiplerin iş akışına uygundur. Her değişiklik GitHub API ve commit gerektirir; API/hizmet limitleri veya kesintileri kayıt işlemlerini etkiler. Güncellemeler periyodik yenilemeyle gelir. Görünen işlem geçmişi son 5.000 olayı tutar; eski şifreli sürümler Git geçmişinde kalır. Telefonun tuttuğu çevrimdışı operasyon kopyası cihazın tarayıcı depolamasındadır ve cihaz güvenliğiyle korunmalıdır.
