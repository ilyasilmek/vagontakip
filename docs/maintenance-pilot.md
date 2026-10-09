# Bakım operasyonları — ayrı test ortamı

Bu özellik yalnız `maintenance-test` dalında denenir; kullanıcı açıkça onaylamadan `main` dalına birleştirilmez ve üretim Worker'ına dağıtılmaz.

- Üretim: `vagontakip`, GitHub'daki şifreli üretim veritabanı.
- Test: `vagontakip-test`, kendi Cloudflare SQLite Durable Object alanı. Worker adı farklı olduğundan canlı DB binding'ine veya şifreli GitHub dosyasına erişmez. Test config'inde GitHub repo, dal, anahtar veya token bağları bulunmaz.
- Test kaydı yayınlar arasında korunur; test kaydı kalıcı canlı veri olarak kullanılmaz ve onay sonrası üretime aktarılmaz. İlk açılış boş kayıtlarla başlar.
- Test yönetici giriş adı: `testadmin`. Şifresi ortam ayarlarındaki `TEST_ADMIN_PASSWORD` secretından Worker'a bağlanır. Sohbete, kaynak koduna veya loga secret yazılmaz. Worker'a bağlı bir ilk yönetici şifresini değiştirmek mevcut kullanıcının şifresini değiştirmez; Hesabım bölümünü kullanın.

## Yerel doğrulama

Mevcut checkout içinde çalışın. Yeni worktree oluşturmayın. `npm ci --cache /tmp/vagontakip-npm-cache`, `npm run setup:local`, `npm test`, `npm run build:test`, ardından ayrı oturumda `npm run dev:maintenance`. `npm run test:maintenance` gerçek Worker'ı 8788 portunda sınar; testler yalnız kendi operasyonlarını temizler. İsteğe bağlı bütün tarayıcı testleri: `E2E_BASE_URL=http://127.0.0.1:8788 E2E_MAINTENANCE=true npm run test:e2e`.

SQL birim testleri Node.js 22.13+ veya bu ortamda doğrulanan Node.js 24 üzerinde çalışır. Node.js 22.12 kullanılıyorsa yerleşik SQLite modülü için test komutunu `NODE_OPTIONS=--experimental-sqlite npm test` olarak çalıştırın.

Yerel `.dev.vars` korunur; yerel test girişini `.local/test-credentials.json` sağlar. Bunlar uzak test ortamının girişinden ayrıdır. Üretim anahtarları yeniden oluşturulmaz.

## Test sürümünü yayınlama

`TEST_ADMIN_PASSWORD`, `CLOUDFLARE_API_TOKEN` ve `CLOUDFLARE_ACCOUNT_ID` ortam bağları hazırken `npm run deploy:test`. Script hedef adını ve veri izolasyonunu doğrular; test arayüzünü derler; yalnız `wrangler.test.jsonc` üzerinden test Worker'ını günceller. Test session secretı ilk yayında rastgele oluşturulur; sonraki yayınlarda korunur. Yerel yapılandırma üretime kopyalanmaz. Secret değerleri yalnız Cloudflare API isteğinin gövdesinde iletilir.

Test URL: https://vagontakip-test.ilyasilmek.workers.dev

Proxy secretıyla canlı test girişini otomatik doğrulamak için `TEST_ADMIN_PASSWORD` hedeflerine `api.cloudflare.com` ve `vagontakip-test.ilyasilmek.workers.dev` eklenmelidir. Var olan secret gereksiniminin hedef değişikliği ortam ayarlarında yapılır.

Canlı sistemde bir kod/asset dağıtımı veya üretim veritabanı değişikliği bu komutun parçası değildir. Private depodaki `maintenance-test` dalına push, pilot CI kontrolünü çalıştırır; `main` production branch'ine push yapılmaz.

## Kullanım ve hesap kuralları

### Güncel sürüm 2

9 Ekim 2026'da personel-zaman ve günlük kapasite modeli eklendi. Önce **Bakım → Personel** bölümünde gerçek personeli tanımlayın (yönetici). Sonra **Günlük atölye → Günlük kayıt ekle** ile tarihi, vardiyayı ve sahadaki planlı kişileri seçin. İzinli/raporlu kişileri seçmeyin. Kişi başına katılım saatleri gerektiğinde değiştirilebilir; kapasite yalnız kaydedilmiş vardiyalardan gelir.

| Vardiya | Saat | Yemek molası | Net süre |
| --- | --- | --- | --- |
| 1. Vardiya | 08:00–16:00 | 12:00–12:30 | 7,5 saat |
| 2. Vardiya | 13:30–21:30 | 17:00–17:30 | 7,5 saat |

Hafta sonu da aynı vardiya düzenidir. 3. vardiya yeni seçeneklerde yoktur. Vardiya ayarlarının değişmesi eski günlük kaydın saatlerini değiştirmez.

Bakım formunda günlük vardiya bağlantısı, gerçek ekip, iş emri başlangıç–bitişi, iş checklist'i, bekleme başlangıç–bitişi ve gerçekten bekleyen kişiler seçilir. Ekip değişiyorsa ayrı personel/zaman aralığı eklenir. Bakım formunun içinden günlük atölye kaydı da oluşturulabilir. Yemek molaları fiilî işçilikten ve kayıplardan düşülür; bekleme iş emrindeki gerçek katılıma bağlıdır.

“Bakım yapılacak vagon var mı?” önceki günden kalan vagonu da kapsar. Vagon yoksa neden zorunludur. Tam vardiya boyunca bütün planlı personel vagonsuzsa ilgili seçim kayıp kayıtlarını otomatik oluşturur. Bazı kişiler yardımcı iş yapıyorsa tam vardiya seçimini kaldırın; **Faaliyet / kayıp ekle** ile gerçek kişiler ve aralıkları ayrı girin. Kısmi vagonsuzluk, hazırlık/güvenlik, temizlik/5S ve yardımcı/diğer faaliyetler bu ekrandan kaydedilir.

Standart iş yükü, kayıt anındaki tek kişilik standart dakika × adet / 60'tır. Fiilî toplam işçilik, molalar dışındaki bakım katılım personel-zamanından gelir; bekleme bunun içindedir. Net işçilik = fiilî toplam − gerçek bekleme kaybı. Kapasite, vagonsuzluk ve yardımcı faaliyetler kendi personel-zaman kayıtlarından hesaplanır. Aynı kişinin çakışan işleri ve kayıpları sunucuda engellenir; farklı kişiler aynı saatlerde farklı işlerde çalışabilir.

Rapor ekranı aylık, haftalık veya özel tarih aralığıyla kullanılabilir. Standart çıktı tamamlanma tarihinde bir kez sayılır; fiilî süre dönem sınırlarına paylaştırılır. Dönemde tamamlanan iş emirlerinin grup verimliliği bu emirlerin bütün işçiliğine bölünür. KPI yüzdeleri toplanmaz; açıklanamayan kapasite yardımcı faaliyet sayılmaz. Payda sıfırsa “Hesaplanamadı” gösterilir. Ekran, dokuz sayfalı Excel ve yazdırılabilir yönetim/bakım PDF'si aynı ortak hesap modülünü kullanır. İş standardı değişiklikleri tarihsel sürüm oluşturur; eski kayıt snapshot'ları korunur.

Yeni veriler test Durable Object içinde SQL tablolarında, gerçek yabancı anahtar/personel bağlantılarıyla tutulur. Başlık ve revision alanları ilgili kayıt satırlarının JSON sütunlarıdır; kişi, iş kalemi ve zaman katılımları ayrı ilişkilere ayrılmıştır. Vagon + bakım ve tüm değişiklikler SQL transaction içinde birlikte yazılır. İlk geçiş eski KV snapshot'ını silmez; v1 bakım kayıtları ayrı, okunabilir bölümde korunur ve kimlik/saat bilgileri uydurularak yeni kapasite hesabına katılmaz.

Eski kod sürümünü doğrudan yayımlamak yeni SQL kayıtlarını okuyamaz. Geri dönüş gerekiyorsa mevcut SQL okuyucusunu koruyan yeni bir arayüz/formül geri alma commit'i hazırlanır; eski KV snapshot'ı güncel verinin yerine konmaz. Bu geçiş test içindir; canlı saklama modeli henüz değiştirilmez.

### İlk pilotun tarihsel hesapları

Aşağıdaki açıklama sürüm 1 içindir; yeni kayıtlar yukarıdaki sürüm 2 kurallarını kullanır.

Bakım bölümünde vagon numarası, başlangıç/bitiş tarih-saati (Türkiye UTC+3), vardiya, amir, sabit ekip sayısı (varsayılan 3), 49 kalemden seçilen işler ve adetleri, beklemeler ve açıklama girilir. Aynı vagonun her bakımı ayrı operasyondur; eski iş standartları kayıt anında saklanır.

- Standart iş yükü: dakika × adet / 60; tek kişilik standarttır. Hesapta yuvarlama yapılmaz; gösterimde iki ondalık kullanılır.
- Gerçekleşen süre: bitiş − başlangıç; beklemeleri içerir.
- Fiili toplam A/S: gerçekleşen saat × personel.
- Bekleme kaybı A/S: bekleme saati × personel; tüm ekip etkilenir.
- Net çalışma A/S: fiili toplam − bekleme kaybı.
- Tahmini süre: standart iş yükü / personel; bekleme dahil olmayan tahmindir.
- Net verimlilik: standart iş yükü / net çalışma A/S × 100.
- Beklemeler dahil verimlilik: standart iş yükü / fiili toplam A/S × 100.
- Net çalışma sıfırsa net verimlilik tanımsızdır ve `—` gösterilir. %100 üstü verimlilik geçerli olabilir.

Aylık rapor ayı bakımın İstanbul saatine göre başlangıç ayıdır; ay sınırını aşan bir operasyon başlangıç ayında bütün olarak sayılır. Vagon başı ortalama, bakım operasyonu başına iş yüküdür; benzersiz vagon sayısı ayrıca gösterilir. Bu ilk pilotta personel sayısı operasyon boyunca sabittir; vardiya/personel değişimi ve aylara süre paylaştırma yapılmaz.

Bekleme toplamı gerçek süreyi aşamaz; bitiş başlangıçtan sonra olmalı, ekip ve iş adetleri pozitif tam sayı olmalıdır. Kaydetme sırasında kimlik, standart süre veya hesaplanmış toplamlar istemciden kabul edilmez. Düzenlemede revision kontrolü yapılır. Kullanıcılar kayıt ekleyip düzenleyebilir; yalnız yöneticiler silebilir.

Aylık özet, operasyonlar, yapılan işler ve beklemeler Excel'e indirilir. Detay kartındaki Yazdır / PDF düğmesi sistem yazdırma ekranını açar; PDF olarak kaydedilebilir. Mobil tarayıcıdaki sistem yazdırma desteği cihaza bağlıdır. Canlı giriş ve canlı veriler test için kullanılmaz.

## Vagon detayından bakım girişi denemesi

Yalnız test ortamında Vagonlar → vagon ayrıntıları → Bakım ekle, vagon numarası hazır gelen bakım formunu açar. Kaydet veya vazgeç sonrasında vagon detayına dönülür; bakım operasyonları ve rapor bölümü ayrı kalır. Bakım kaydı vagonun durumunu otomatik değiştirmez. Geçişte geri tuşu yalnız üstteki bakım formunu kapatır.

Bu denemeden önceki test arayüzü `a030984` commitidir. Kullanıcı isterse yalnız bu arayüz değişikliği geri alınabilir; test verileri silinmez. Kullanıcının açık onayı olmadan ana uygulamaya veya main dalına taşıma yapılmaz.

Yeni vagon girişinde de Bakım ekle kullanılabilir: vagon alanları doldurulduktan sonra bakım formuna geçilir, Vagon ve bakımı kaydet ile tek API işlemi içinde iki kayıt oluşturulur. İlk forma geri dönmek girilen vagon bilgilerini korur. Bakım formundan vazgeçmek hiçbir kaydı oluşturmaz. Sunucuda vagon ve bakım doğrulaması birlikte yapılır; geçersiz bakımda vagon da yazılmaz. Bakım ekle seçilmeden normal Kaydet yalnız vagon oluşturur. Bu akış da yalnız pilot ortamındadır.
