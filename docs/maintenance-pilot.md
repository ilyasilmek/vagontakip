# Bakım operasyonları — ayrı test ortamı

Bu özellik yalnız `maintenance-test` dalında denenir; kullanıcı açıkça onaylamadan `main` dalına birleştirilmez ve üretim Worker'ına dağıtılmaz.

- Üretim: `vagontakip`, GitHub'daki şifreli üretim veritabanı.
- Test: `vagontakip-test`, kendi Cloudflare SQLite Durable Object alanı. Worker adı farklı olduğundan canlı DB binding'ine veya şifreli GitHub dosyasına erişmez. Test config'inde GitHub repo, dal, anahtar veya token bağları bulunmaz.
- Test kaydı yayınlar arasında korunur; test kaydı kalıcı canlı veri olarak kullanılmaz ve onay sonrası üretime aktarılmaz. İlk açılış boş kayıtlarla başlar.
- Test yönetici giriş adı: `testadmin`. Şifresi ortam ayarlarındaki `TEST_ADMIN_PASSWORD` secretından Worker'a bağlanır. Sohbete, kaynak koduna veya loga secret yazılmaz. Worker'a bağlı bir ilk yönetici şifresini değiştirmek mevcut kullanıcının şifresini değiştirmez; Hesabım bölümünü kullanın.

## Yerel doğrulama

Mevcut checkout içinde çalışın. Yeni worktree oluşturmayın. `npm ci --cache /tmp/vagontakip-npm-cache`, `npm run setup:local`, `npm test`, `npm run build:test`, ardından ayrı oturumda `npm run dev:maintenance`. `npm run test:maintenance` gerçek Worker'ı 8788 portunda sınar; testler yalnız kendi operasyonlarını temizler. İsteğe bağlı bütün tarayıcı testleri: `E2E_BASE_URL=http://127.0.0.1:8788 E2E_MAINTENANCE=true npm run test:e2e`.

Yerel `.dev.vars` korunur; yerel test girişini `.local/test-credentials.json` sağlar. Bunlar uzak test ortamının girişinden ayrıdır. Üretim anahtarları yeniden oluşturulmaz.

## Test sürümünü yayınlama

`TEST_ADMIN_PASSWORD`, `CLOUDFLARE_API_TOKEN` ve `CLOUDFLARE_ACCOUNT_ID` ortam bağları hazırken `npm run deploy:test`. Script hedef adını ve veri izolasyonunu doğrular; test arayüzünü derler; yalnız `wrangler.test.jsonc` üzerinden test Worker'ını günceller. Test session secretı ilk yayında rastgele oluşturulur; sonraki yayınlarda korunur. Yerel yapılandırma üretime kopyalanmaz. Secret değerleri yalnız Cloudflare API isteğinin gövdesinde iletilir.

Test URL: https://vagontakip-test.ilyasilmek.workers.dev

Proxy secretıyla canlı test girişini otomatik doğrulamak için `TEST_ADMIN_PASSWORD` hedeflerine `api.cloudflare.com` ve `vagontakip-test.ilyasilmek.workers.dev` eklenmelidir. Var olan secret gereksiniminin hedef değişikliği ortam ayarlarında yapılır.

Canlı sistemde bir kod/asset dağıtımı veya üretim veritabanı değişikliği bu komutun parçası değildir. Private depodaki `maintenance-test` dalına push, pilot CI kontrolünü çalıştırır; `main` production branch'ine push yapılmaz.

## Kullanım ve hesap kuralları

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
