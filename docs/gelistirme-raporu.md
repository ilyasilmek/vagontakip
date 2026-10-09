# Vagon Takip — Geliştirme ve test raporu

Bu rapor, uygulamanın kurulumu ve mevcut bakım pilotunda yapılan değişiklikleri, doğrulama sonuçlarını ve yayın durumunu bir arada tutar. Yeni değişiklikler aynı rapora eklenir; önceki kayıtlar silinmez. Parola, token, kişisel kayıt dökümleri ve şifreli veritabanının içeriği rapora yazılmaz.

## Güncel durum

**Bakım geliştirmesi hâlâ test aşamasındadır. Kullanıcının açık onayı olmadan `main` dalına birleştirilmez veya canlı Worker'a yayımlanmaz.** Test yayını için verilen izin, canlı yayın izni değildir.

| Konu | Canlı uygulama | Bakım test uygulaması |
| --- | --- | --- |
| Adres | https://vagontakip.ilyasilmek.workers.dev | https://vagontakip-test.ilyasilmek.workers.dev |
| Cloudflare Worker | `vagontakip` | `vagontakip-test` |
| GitHub dalı | `main` | `maintenance-test` |
| Veri kaydı | GitHub'daki şifreli `data/database.enc.json` | Ayrı Cloudflare SQLite Durable Object alanı |
| Bakım operasyonları | Pilot henüz aktarılmadı | Etkin |
| Son özellik commit'i | `6096db4` | `7bfa358` |

Güncel vagon numarası giriş biçimi **`1234 5678 901-2` (12 rakam, son bölüm tek hane)**. Önceki 13 rakam uygulaması aşağıdaki tarihsel kayıtta yer alır.

Kod ve dokümantasyon değişiklikleri GitHub'a kaydedilir. Testte girilen vagon ve bakım kayıtları GitHub veritabanına yazılmaz. Test verisi yayınlar arasında korunur ve canlı veriyle karıştırılmaz. Depo kullanıcı tarafından private yapılmıştır; kullanıcı daha sonra kayıt oluşturup silerek uygulamanın çalıştığını bildirmiştir.

Son doğrulanan etkin test Worker yayın kimliği: `8e07aa16-bf40-459a-a8d6-eb42c8c1ed54`. Önceki vardiya saati yayını: `6eabd70e-64c5-4ee9-83fc-4cab6b28e8fc`. Önceki personel açılır liste yayını: `be18b336-2af7-457c-bb69-cf6e4ef832bf`. Önceki günlük varsayılan personel yayını: `448ec45f-84de-4ccb-a29a-126f82c7379b`. Önceki tek son hane yayını: `061faf71-1c14-44c1-8aa0-2b1fb103ec38`. Önceki 13 rakam yayını: `96037ab9-7f1e-4a69-bccb-76d76b04647f`. Önceki alan doğrulama yayını: `7670d044-683d-430a-b387-dd39e8f57fe4`. Önceki bakım v2 yayını: `dac7a96d-aeb4-437b-80c7-7c17f5d98305`. Önceki arka plan yayını: `1ba71760-265a-4d1a-bdcd-2ffd564e1f6f`. Önceki birlikte kayıt yayını: `2ddcf0ea-9962-4154-9437-370aba01a278`. Dokümantasyon commitleri uygulama yayını değildir; uygulama dağıtımları aşağıdaki değişiklik ve yayın kayıtlarında belirtilir.

9 Ekim 2026'da yeni bakım/adam-saat şartnamesi alındı. [Şartname analizi](bakim-sartname-analizi.md) ve [kaynak metin](requirements/bakim-adam-saat-sartnamesi-2026-10-09.txt) repoya kaydedildi. Kullanıcının son cevabıyla iki vardiya ve yemek molaları kesinleşti; sürüm 2 geliştirmesi aşağıda kayıtlıdır. İlk pilotun hesap tablosu tarihsel sürüm 1 davranışını anlatır. Güncel yayın durumu sürüm 2 bölümünde belirtilir.

## Kurulum ve canlı uygulamada tamamlanan işler

| Değişiklik | Sonuç | Kaynak |
| --- | --- | --- |
| Temel PWA ve ortak kayıt altyapısı | Türkçe React/TypeScript arayüzü; Worker API; şifreli GitHub veritabanı; vagon, parça ve demirbaş yönetimi | `550d405` |
| GitHub bağlantısı düzeltmesi | Workers native fetch çağrısı düzeltildi; sunucu/veritabanı hatasında yanlış parola sayacı gereksiz tüketilmiyor | `21aa568` |
| Cloudflare kurulum ve yayın | Worker adı mevcut uygulamayla eşleştirildi; güvenli ortam bağlarıyla yayın yapıldı | `862a064`, [yayın yönergeleri](deployment.md) |
| GBZ görünümü ve açılış | Demiryolu teması, tren açılışı ve vagon tipi alanı; açılış animasyonu kullanıcı geri bildirimleriyle düzenlendi | `b5e1254`, `5b5cfb5` |
| Posta seçimi | Hesap posta alanı ve yönetici düzenlemesi eklendi | `672685c` |
| Tema seçimi | Sistem, açık ve koyu tema tercihi; koyu temada detay etiketleri iyileştirildi | `aaeafa8`, `37c8efc` |
| Listelerde sıralama | Son kaydedilen başta olmak üzere sıralama seçenekleri eklendi | `30f992e` |
| Vagon ve posta seçenekleri | Vagon tipine `Sgss-w`, posta listesine `Torna` eklendi | `30f992e` |
| PWA geri tuşu | Önce açık pencerenin kapanması ve ardından sayfalar arasında geri dönüş sağlandı; kayıt sürerken pencere korunuyor | `30f992e` |
| Açılış animasyonu tercihi | Hesabım üzerinden açılıp kapanır; kapalıysa uygulama açılışında tren animasyonu gösterilmez | `6096db4` |

Bu bölüm geçmişte canlıya alınan uygulama özelliklerini özetler. Bakım pilotu için verilen sonraki test izinleri bunlardan ayrı değerlendirilir.

## İlk bakım pilotunun hesap kuralları (sürüm 1)

Kullanıcının verdiği 49 iş kalemi, standart dakika ve kategori değerleri varsayılan katalog olarak eklendi. Standart süreler **tek kişi** içindir. Hesaplar ara aşamalarda yuvarlanmaz; ekranda en fazla iki ondalık gösterilir.

| Gösterge | Hesap |
| --- | --- |
| Standart iş yükü | İşlerin standart dakikası × adet toplamı / 60 |
| Gerçekleşen fiili süre | Bitiş − başlangıç; beklemeler dahil |
| Fiili toplam adam-saat | Gerçekleşen saat × ekip sayısı |
| Bekleme kaybı | Bekleme saati × ekip sayısı; tüm ekip etkilenir |
| Net çalışma adam-saat | Fiili toplam − bekleme kaybı |
| Tahmini süre | Standart adam-saat / ekip sayısı |
| Net verimlilik | Standart adam-saat / net çalışma adam-saat × 100 |
| Beklemeler dahil verimlilik | Standart adam-saat / fiili toplam adam-saat × 100 |

Örnek: 3,75 A/S standart iş, 3 kişilik ekip ve 09:00–11:00 arası operasyon için tahmini süre 75 dakika; gerçekleşen süre 120 dakika; fiili toplam 6 A/S'dir. 30 dakika bekleme, 1,5 A/S kayıp ve 4,5 A/S net çalışma verir. Net verimlilik %83,33; beklemeler dahil verimlilik %62,5'tir.

Aynı vagonun her bakım ziyareti ayrı operasyondur. Ekip sayısı varsayılan 3'tür ve değiştirilebilir. Tarihler Türkiye saatine göre girilir; rapor ayı başlangıç zamanının İstanbul ayıdır. Ay sınırını geçen operasyon başlangıç ayında bütünüyle sayılır. Ortalama iş yükü operasyon başına hesaplanır; benzersiz vagon sayısı ayrıca gösterilir. Operasyon içinde değişen ekip sayısı ve aylara süre paylaştırma bu pilotun kapsamına alınmadı.

## Test sürümünde yapılan değişikliklerin geçmişi

| Commit | Değişiklik | Doğrulama / durum |
| --- | --- | --- |
| `e85f8a2` | Ayrı Worker ve veri alanı; 49 iş kalemi; bakım ekleme, düzenleme ve yönetici silmesi; beklemeler, aylık özet ve grafik; Excel ve yazdırılabilir PDF | Tip kontrolü ve derleme geçti. 43 hesaplama/API testi ve o aşamadaki 8 tarayıcı testi geçti. Test giriş ve geçici kayıt ekleme/okuma/silme uzak ortamda doğrulandı. |
| `c475d48` | Telefonda checkbox ve metin yan yana; kategori grupları; seçilen işler filtresi; adet için − / +; dar iç kaydırmanın kaldırılması | Telefon görünümü incelendi. Seçim, filtre, adet, kayıt, Excel ve PDF akışı geçti. |
| `d20937d` | Serbest vardiya yazısı yerine 1. Vardiya, 2. Vardiya, 3. Vardiya seçenekleri | Tip kontrolü ve derleme geçti; yayımlanan dosyalardaki seçenekler doğrulandı. Eski kayıtların vardiya değeri düzenleme sırasında korunuyor. |
| `a030984` | Güncellemeden sonra Excel raporunun eski dinamik dosyayı araması düzeltildi; Excel bileşeni açılışta yükleniyor | Sonradan Excel dosyasına erişim engellendiğinde açık sayfadan rapor indirildi. Bakım, genel Excel ve PWA testleri geçti. Kullanıcı Excel'in düzeldiğini bildirdi. |
| `c145368` | Vagon detayına Bakım ekle; numara hazır geliyor; kaydetme/vazgeçme vagon detayına dönüyor; üst form için geri tuşu, odak ve kapatma yönetimi | 4 bakım/gezinme testi geçti. Test yayını doğrulandı. Bakım bölümü ayrı tutuldu. |
| `d2e4c96` | Yeni Vagon ekle formuna Bakım ekle; vagon ve bakım tek son kaydetmede birlikte oluşturuluyor | 44 hesaplama/API testi ve 5 bakım/gezinme testi geçti. Uzak testte iki kayıt oluşturulup tekrar okundu; yalnız geçici kontrol kayıtları silindi. |

## Tek arka plan görseli denemesi

Kullanıcının sağladığı kulüp görseli, yalnız test uygulamasının oturum açılmış çalışma sayfalarında tek bir dekoratif arka plan olarak eklendi. Döşeme veya tekrar yoktur; görsel ekranın içerik alanına ortalanır ve oranı korunarak sığdırılır. Görsele dokunmak kontrolleri engellemez. Orijinal JPEG değiştirilmedi; kareli köşeler CSS ile dairesel sınırın dışında gizlenir.

Açık temada opaklık %5,5, koyu temada %8'dir. Menü, üst/alt gezinme, giriş formu ve modal yüzeyleri korunur. Arka plan yazdırma/PDF çıktısında gösterilmez. Dosya `public/images/club-watermark.jpg` olarak repoda tutulur ve PWA statik önbelleğine dahil edilir.

Doğrulama: TypeScript/Vite derlemesi başarılı. Yerel Chromium'da 390×844 telefon görünümü açık/koyu temalarda, 1440×900 masaüstü görünümü kontrol edildi. Tek görsel, kare oran, düşük opaklık ve yatay taşma olmaması doğrulandı. Bakım formu açıldı, alanına yazılıp vazgeçildi; kayıt oluşturulmadı. Yazdırma görünümünde arka planın gizlendiği doğrulandı. Telefon ekran görüntüleri görsel olarak incelendi. Bu yalnız arayüz değişikliği olduğundan hesaplama/API paketi yeniden çalıştırılmadı; önceki sonuçlar yukarıda korunur.

Yayın tamamlandı: özellik commit’i `af96372`, hedef yalnız `vagontakip-test`, sürüm `1ba71760-265a-4d1a-bdcd-2ffd564e1f6f`. Uzak sayfanın yeni arayüz dosyası, görselin orijinal dosyayla aynı olduğu ve arka plan CSS’si doğrulandı. Test sağlık kontrolü `ok: true`, `storage: local`; canlı sağlık kontrolü `ok: true`, `storage: github` döndü. Kullanıcı onayı olmadan `main` ve canlı Worker değiştirilmez.

## 9 Ekim 2026 — yeni şartname analizi

Kullanıcının verdiği nihai yazılım şartnamesi mevcut hesap, API, veri saklama ve bakım arayüzüyle karşılaştırıldı. Kaynak metin ve ayrıntılı [analiz belgesi](bakim-sartname-analizi.md) repoya eklendi. Yeni kapsam; ayrı günlük vardiya kapasitesi, gerçek kişiler ve katılım aralıkları, bekleyen kişi seçimi, tam/kısmi vagonsuzluk, yardımcı faaliyetler, dört ayrı KPI, açıklanamayan kapasite, ilişkisel veri yapısı ve tarih aralığı raporlarıdır. Standart iş yükü, gerçek personel-zaman kategorileriyle aynı toplama katılmaz.

Kullanıcı ayrı personel listesinden tek tek seçimi ve hafta sonunun aynı vardiya düzeninde çalışmasını onayladı. 1. vardiya 08:00–16:00, 3. vardiya 00:00–08:00; yemek molası 30 dakika, başka mola yok. 2. vardiyanın bitişi ve mola başlangıçları netleştiriliyor. Yanlış varsayımın özellikle kısmi kayıp hesabını etkilemesi nedeniyle bu saatler uydurulmadı.

Bağımsız aritmetik kontrolünde şartnamedeki sayısal örnekler doğru çıktı: 1,33; 15,10; 1,55; 13,55 A/S, %70,11 ve %62,91 verimlilik; 22,50 ve 90,00 A/S vagonsuzluk; 495,00 A/S kapasite; %18,18, %25,25 ve %3,74 oranlar. Bu sonuçlar yeni uygulama kabul testlerinin geçtiği anlamına gelmez. Belge bağlantıları, kaynak metin aktarımı ve Git diff kontrol edildi; yalnız dokümantasyon değiştiğinden uygulama testleri/derlemesi çalıştırılmadı.

Eski test kayıtlarında gerçek kişi kimlikleri ve bekleme saatleri yoktur. Geçişte bunlar tahmin edilmeyecek, eski hesap sonuçları sessizce değiştirilmeyecek; analiz belgesinde sürümlü geçiş planı kaydedildi. Uygulama kodu ve çalışan test sürümü bu analiz kaydında değiştirilmedi; yeni dağıtım yapılmadı. Hedef yalnız `maintenance-test`; `main` ve canlı Worker değiştirilmedi.

## 9 Ekim 2026 — personel-zaman, günlük kapasite ve rapor sürümü 2

Kullanıcının kesinleştirdiği saatler: **1. Vardiya 08:00–16:00, yemek 12:00–12:30; 2. Vardiya 13:30–21:30, yemek 17:00–17:30**. Hafta sonu aynı düzen; iki vardiya da 450 dakika / 7,5 net saattir. 3. vardiya yeni seçeneklerden kaldırıldı; tarihsel kayıtlar korundu.

Personel uygulama hesabından ayrı tanımlanır; vardiya, bakım ve beklemelerde tek tek seçilir. Günlük atölye ekranında sahadaki planlı kişiler, gerçek katılım saatleri, vagon durumu, tam/kısmi vagonsuzluk nedeni ve yardımcı faaliyetler kaydedilir. Bakım formunun içinden de günlük durum oluşturulabilir. Sabit ekip varsayımı kaldırıldı; değişen ekibe ayrı kişi/zaman katılımı yazılabilir. Bekleme kaybı yalnız gerçekten bekleyen kişilere aittir. Yemek molaları kapasite, işçilik ve kayıplardan çıkarılır.

Ortak hesap modülü sürüm 2 olarak eklendi; hesaplar kişi-milisaniye üzerinden toplanıp sonuçta saate çevrilir. Ara yuvarlama yapılmaz. Standart çıktı tamamlanma tarihinde bir kez yazılır; gerçek süre rapor dönemine paylaştırılır. Grup verimliliği dönemde tamamlanan iş emirlerinin bütün işçiliğini kullanır. Kapasite kullanım, vagonsuzluk ve bekleme oranları ayrıdır. Standart iş yükü kapasite mutabakatına gerçek zaman kategorisi gibi katılmaz; açıklanamayan kapasite otomatik yardımcı faaliyet yapılmaz. Sıfır paydada “Hesaplanamadı” gösterilir.

Yeni personel, vardiya, günlük durum, katılım, standart sürümü, iş emri/kalem, bekleme ve faaliyet tabloları ayrı test Durable Object SQL alanında gerçek yabancı anahtarlarla ilişkilendirildi. Başlık/revision alanları ilgili SQL satırlarının JSON sütunlarında, alt kayıt ve personel bağlantıları ayrı tablolardadır. Core vagon/veri bilgisi ile yeni bakım tabloları tek SQL transaction içinde yazılır; vagon + bakım akışı atomik kalır. İlk geçiş eski KV snapshot'ını silmez. Kişi kimliği/bekleme saati bilinmeyen eski kayıtlar ayrı okunabilir bölümde korunur ve yeni kapasite mutabakatına katılmaz.

Sunucu; mükerrer tarih + vardiya, çakışan personel planı, bakım/bekleme/vagonsuzluk/faaliyet çakışması, bekleyen kişinin gerçek iş emri katılımı ve zaman sınırlarını doğrular. Farklı kişiler aynı saatlerde çalışabilir; bitişte başlayan komşu aralıklar çakışmaz. Yetki, aynı-origin, revision ve denetim kayıtları korunur. Personel ve vardiya/standart ayarları yöneticinindir; herkes operasyon kaydı oluşturup düzenleyebilir, silme yöneticinindir. Standart değişikliği tarihsel sürüm oluşturur; eski bakım snapshot'ları değişmez.

Mobil ekranlar, özel tarih aralığı/ay/hafta, yönetim göstergeleri, vagon/iş türü çıktıları, dokuz sayfalı Excel ve yazdırılabilir bakım/yönetim PDF'si eklendi. Arka planın stacking context'i nedeniyle günlük pencerenin Kaydet düğmesinin alt gezinme arkasında kalması mobil kontrolde tespit edilip düzeltildi. Kayıt sürerken Escape, kapat düğmesi ve arka alan tıklaması pencereyi kapatmaz.

Doğrulama: TypeScript ve test arayüzü derlemesi başarılı. **68 birim/sunucu testi geçti** (önceki 44 + yeni 16 hesap/sınır ve 8 SQL/API testi). Şartnamedeki 13 kabul örneği, ek kişi-zaman/mola/dönem sınırları, ilişkisel kalıcılık, eski KV geçişi, SQL hatasında iki kaydın birlikte geri alınması, eşzamanlı çakışma ve yetki kontrolleri kapsam içindedir.

**Dört güncel bakım Playwright testi geçti**: günlük kayıt ve gerçek personel seçimi, tek kişinin beklemesi, düzenleme/kalıcılık, ekran–Excel sayısal eşleşmesi, PDF üretimi, mevcut vagondan bakım, yeni vagon + bakım birlikte kayıt, geri tuşu, personel ekleme, 2. vardiya saatleri ve tam/kısmi vagonsuzluk/yardımcı faaliyet. Geniş pakette diğer **yedi test de geçti**: ortak API/yetki, telefon kayıt/Excel, iki gezinme testi, PWA, animasyon tercihi ve tema. Geniş paketin ilk çalıştırmasında iki yeni bakım testinin hatalı başlık/label seçicileri başarısızdı; seçiciler gerçek arayüz etiketleriyle düzeltildi ve dört bakım testi birlikte tekrar başarıyla çalıştırıldı. Sonuç, tek bir son 11-test koşusu gibi sunulmaz. Yerel kontroller Chromium telefon emülasyonundadır; cihazdaki gerçek kullanıcı denemesi sonraki adımdır.

Ek görsel kontrol: 390×844 açık/koyu tema günlük kayıt ekranları incelendi; Kaydet düğmesinin üstte ve tıklanabilir olduğu doğrulandı. Bu görüntülerde yalnız GET yanıtına üç örnek personel eklendi; bu görsel kontrol yeni kayıt yazmadı. Gerçek kayıt akışları yukarıdaki tarayıcı testlerinde ayrıca sınandı.

Yayın tamamlandı: özellik commit'i `08e84d0`, hedef yalnız `vagontakip-test`. Kod dağıtım kimliği `b03d90c3-65a9-4f34-809a-020c64e7d2ef`; mevcut güvenli yönetici parola bağı güncellendikten sonra Cloudflare API üzerinden %100 etkin olduğu doğrulanan son sürüm `dac7a96d-aeb4-437b-80c7-7c17f5d98305`. Uzak test hesabı girişi, formül sürümü 2, iki vardiya ve mola saatleri, mevcut vagon/parça/demirbaş ve eski bakım kayıtlarının korunması doğrulandı. Uzak arayüz dosyası doğrulanan yerel derlemeyle birebir aynı. Test sağlığı `ok: true`, `storage: local`; canlı sağlığı `ok: true`, `storage: github`. Canlı sayfanın yayın öncesi/sonrası özeti aynı kaldı. Uzak doğrulama yeni personel veya operasyon kaydı oluşturmadı.

Kod ve bu rapor `maintenance-test` dalında GitHub'a kaydedildi; `main`, canlı Worker ve canlı kayıtlar değiştirilmedi. Geri dönüş eski KV snapshot'ını güncel veri yerine koyarak yapılmaz; SQL okuyucusunu koruyan yeni geri alma commit'i gerekir.

## Güncel kullanıcı akışları

### Yeni vagon ve bakım birlikte

1. Vagon ekle açılır ve vagon bilgileri girilir.
2. Aynı giriş akışındaki Bakım ekle düğmesine basılır; vagon numarası hazır gelir.
3. Günlük atölye vardiyası seçilir/oluşturulur; gerçek personel, başlangıç/bitiş, yapılan işler ve bekleyen kişiler doldurulur.
4. Vagon ve bakımı kaydet ile iki kayıt tek sunucu işlemi içinde oluşturulur.

Önce vagonu kaydedip listeden tekrar seçmek gerekmez. Bakım formundan vazgeçmek henüz kaydedilmemiş vagonu da oluşturmaz; ilk forma dönüldüğünde vagon alanları korunur. Geçersiz bakımda yalnız vagonun yazılması önlenir. Bakım ekle seçilmeden normal Kaydet yalnız vagon kaydı oluşturur.

### Mevcut vagonun bakımı

Vagonlar → vagon ayrıntıları → Bakım ekle. Vagon numarası hazır gelir. Kaydedince veya vazgeçince vagon detayına dönülür. Bu yol mevcut vagon için yalnız yeni bakım operasyonu oluşturur.

### Raporlama

Bakım operasyonları bölümü ayrı kalır. Rapor, Günlük atölye ve Personel sekmeleri vardır. Ay/hafta/özel aralık, arama ve sıralama; standart iş yükü, kapasite, kayıplar, yardımcı faaliyetler ve verimlilik gösterilir. Excel dokuz sayfadır: Yönetim özeti, Günlük atölye, Bakım operasyonları, Yapılan işler, Beklemeler, Personel katılımı, Faaliyet ve kayıplar, Performans, Eski kayıt açıklaması. Bakım detay kartı ve yönetim raporu sistem yazdırma ekranından PDF olarak kaydedilebilir. PDF desteği cihazın yazdırma olanaklarına bağlıdır. İlk sürümün dört sayfalı Excel'i tarihsel davranıştır.

## Önceki doğrulamalar ve sınırlar (sürüm 1)

Son veri kaydetme değişikliği `d2e4c96` için (arka plan denemesinin ayrı doğrulamaları yukarıda):

- TypeScript kontrolü ve test arayüzü derlemesi başarılı.
- 44 birim/sunucu testi başarılı: hesap kuralları, yetki, kayıt doğrulaması, birlikte kayıtta hata halinde hiçbir kayıt oluşmaması ve kalıcılık dahil.
- Seçilen 5 Playwright testi başarılı: bakım kayıt/rapor akışı, mevcut vagondan bakım, yeni vagonla birlikte kayıt ve geri tuşu/gezinme.
- Uzak testte test hesabı girişi, vagon + bakım oluşturma, iki kaydı tekrar okuma ve geçici kayıt temizliği başarılı.
- Canlı sağlık kontrolü `ok: true`, `storage: github`; test sağlık kontrolü önceki yayınlarda `ok: true`, `storage: local` olarak doğrulandı.

Son sürümde tüm tarayıcı paketi yeniden çalıştırılmış gibi yorumlanmamalıdır: 8 testin tamamı ilk pilotta geçti; son değişiklikte ilgili 5 test çalıştırıldı. Mobil kontroller Chromium telefon emülasyonu ile yapıldı. Kullanıcı da gerçek telefonunda görünüm, vardiya ve Excel geri bildirimlerini verdi.

Bu raporun ilk eklenmesinde uygulama testleri tekrar çalıştırılmadı; yalnız dokümantasyon değişti. Eski [doğrulama belgesi](verification.md) ilk kurulumun tarihsel sonuçlarını içerir; güncel kapsam bu rapordadır.

## Geri dönüş ve bekleyen karar

Kullanıcı uygun bulmazsa arayüz değişikliği yeni bir geri alma commit'iyle geri alınabilir. Güncel veritabanı eski bir sürümle değiştirilmez; geçmiş sıfırlanmaz ve force-push yapılmaz. Vagon detayından bakım denemesinden önceki pilot `a030984`; yeni vagonla birlikte kayıt eklenmeden önceki pilot `c145368` commitidir.

**Canlıya geçiş onayı henüz verilmedi.** Kullanıcı denemeyi tamamlayıp açıkça onay verirse üretim veri modeli, bakım özelliği yapılandırması, geçiş doğrulaması ve canlı yayın ayrıca ele alınır. Test sürümünün dağıtımı tek başına üretimi etkinleştirmez.

## Rapor güncelleme kuralı ve dokümantasyon kaydı

Bu rapor repoya eklendi; README üzerinden bağlantı verildi. Kök `AGENTS.md`, sonraki her anlamlı kod, yapılandırma, yayın veya kullanıcı akışı değişikliğinde raporun aynı commit içinde güncellenmesini zorunlu kılar. Her yeni kayıtta ne değiştiği, doğrulamanın gerçekten çalıştırılan kapsamı, yayın ortamı ve kalan sınırlamalar belirtilir. Güncel durum ve kullanıcı akışı değişmişse ilgili bölümler de yenilenir. Canlıya geçiş onayı verilmedikçe test aşaması uyarısı korunur.

## 9 Ekim 2026 — Eksik seçimlerin alan üzerinde Türkçe gösterilmesi

Özellik ve doğrulama kaydı: `59be8c2` (`maintenance-test`).

Kullanıcının bildirdiği `Array must contain at least 1 element(s)` mesajı, bakım formundaki boş iş veya personel dizileri için genel Zod doğrulamasından geliyordu. Test arayüzü artık kaydetmeden önce yapılan işler, personel/vardiya katılımı, her katılımın görevli personeli, her beklemenin personeli ve faaliyet personelini kontrol eder. Eksik bölüm kırmızı çerçeveyle işaretlenir ve kendi altında Türkçe açıklama gösterilir. İlk eksik bölüm kaydırılıp odaklanır; doğru seçim yapıldığında o bölümün uyarısı kaldırılır. Kontrol başarısızsa sunucuya kayıt isteği gönderilmez ve form içeriği korunur. Hiç katılım yoksa Kaydet düğmesi de açıklamayı gösterebilmek için kullanılabilir.

İş ve personel grupları erişilebilir hata açıklamasıyla ilişkilendirildi; açık/koyu tema renkleri tanımlandı. Tüm personeli pasif olan listede de seçilebilir personel bulunmadığı açıkça belirtilir. Sunucudaki ilgili minimum dizi doğrulamaları Türkçeleştirildi; istemci kontrolü atlandığında da İngilizce mesaj dönmez. Diğer zaman/çakışma ve hesap kuralları değişmedi; günlük kayıt için yeni bir zorunlu personel koşulu eklenmedi.

Doğrulama:
- `npm test`: **69/69 geçti**. Yeni API testi boş işler, boş katılım, boş görevli ve boş bekleyen personel için Türkçe hata döndüğünü ve operasyon oluşturulmadığını doğrular.
- `npm run build:test`: TypeScript, Vite ve PWA üretimi geçti.
- `npm run test:maintenance`: **4/4 geçti**. Mobil senaryolarda boş iş/görevli/bekleyen/faaliyet personeli uyarıları, ilk eksik gruba odak, düzeltmeyle uyarının kalkması ve eksik seçimde kayıt isteği gönderilmemesi denendi; normal kayıt/düzenleme, birleşik vagon-bakım, geri dönüş ve rapor akışları da geçti.
- `git diff --check`: geçti.

Yayın yalnız `vagontakip-test` Worker'ına yapıldı. Gizli anahtar bağının korunması sonrasındaki etkin sürüm Cloudflare API üzerinden **%100 `7670d044-683d-430a-b387-dd39e8f57fe4`** olarak doğrulandı. Uzak testte giriş, yayımlanan JavaScript dosyasının doğrulanan yerel derlemeyle birebir eşleşmesi ve yayın öncesindeki vagon/parça/demirbaş/personel/günlük/bakım/faaliyet/eski bakım kayıt kimliklerinin korunması kontrol edildi. Uzak doğrulama yeni operasyon kaydı oluşturmadı. Canlı sayfanın yayın öncesi/sonrası içerik özeti aynı kaldı; `main` dalına veya canlı Worker'a yayın yapılmadı.

## 9 Ekim 2026 — Kullanıcının verdiği personel listesinin test verisine eklenmesi

Kullanıcının verdiği **29 personel adı**, yalnız test Worker'ındaki Personel bölümüne mevcut yetkili API üzerinden aktif kayıt olarak eklendi. Eklemeden önce Türkçe büyük/küçük harf ve boşluk farkları dikkate alınarak mevcut isimlerle karşılaştırıldı: **29 yeni kayıt, 0 mevcut eşleşme, 0 yeniden etkinleştirme**. İsimler kullanıcının verdiği biçimde korundu; personel adları, kayıt kimlikleri ve giriş bilgileri bu rapora veya izlenen dosyalara eklenmedi. Manuel personel ekleme/düzenleme/pasifleştirme işlevleri kullanılmaya devam eder. Pasifleştirme geçmiş bakım kayıtlarını silmez.

Uzak API'den liste yeniden okunarak 29 ismin her birinin tek aktif kayıt olarak bulunduğu doğrulandı. Önceden bulunan personel kimlikleri korundu; günlük vardiyalar, operasyonlar, faaliyetler, eski bakım kayıtları, vardiya/standart tanımları ve vagon/parça/demirbaş kayıtları işlem öncesiyle karşılaştırıldı ve değişmediği doğrulandı.

Bu işlem test verisi güncellemesidir; uygulama kodu değiştirilmedi, Worker yayını yapılmadı, canlı veriye dokunulmadı. Kod değişmediği için derleme ve test paketleri tekrar çalıştırılmadı; doğrulama gerçek test API'sindeki kayıt sonrası okuma ve koruma kontrolleridir. Personel verileri ayrı Cloudflare test deposunda kalır; yalnız bu değişiklik raporu GitHub'a kaydedilir.

## 9 Ekim 2026 — Vagon numarası için rakam ve biçim kontrolü

Özellik ve doğrulama kaydı: `a0cd1a8` (`maintenance-test`).

Kullanıcının belirttiği `.... .... ...-..` biçimi **4 + 4 + 3 + 2 = 13 rakam** olarak uygulandı. Vagon, bakım ve parça girişindeki vagon numarası alanları ortak bileşene bağlandı. Yazma veya yapıştırmada yalnız `0–9` rakamları alınır; boşluklar ve tire otomatik eklenir. Örnek: `1234567890123` → `1234 5678 901-23`. Baştaki sıfırlar korunur, 13 rakamı aşan giriş alınmaz ve mobil sayısal klavye istenir. Boşluk/tire yanından geri silme ve ileri silme, bitişik rakamı kaldırarak biçimlendirmede takılmayı önler; düzenleme sırasında imleç rakam konumunu korur.

Eksik numarada ilgili alan kırmızı çerçeveyle işaretlenir ve Türkçe 13 rakam uyarısı gösterilir. Kaydetme ve yeni vagon formundan Bakım ekle geçişi, eksik numarada tarayıcı form doğrulamasıyla engellenir. Parça formundaki isteğe bağlı vagon numarası boş bırakılabilir; doldurulursa aynı biçim aranır.

Mevcut veriler topluca dönüştürülmedi. Eski bir numara değiştirilmeden başka alanların düzenlenmesi veya eski vagona bakım eklenmesi mümkündür; kullanıcı numarayı değiştirirse yeni biçime geçirilir. Tarihsel kayıtlar ve içe aktarma/API uyumluluğu için sunucu şemaları değiştirilmedi; bu kural yeni/değiştirilen arayüz girişlerine uygulanır.

Doğrulama:
- `npm run build:test`: TypeScript, Vite ve PWA üretimi geçti.
- Tüm yerel pilot Playwright paketi: **11/11 geçti**. Bakım/birleşik vagon senaryosuna harfli yapıştırmayı ayıklama, boşluk/tire ekleme, başlangıç sıfırları, ayırıcı yanından Backspace/Delete ve eksik numarayla Bakım ekle geçişinin engellenmesi eklendi. Normal vagon kaydı, bakım, düzenleme, Excel, API yetkileri, gezinme, çevrimdışı PWA, animasyon ve tema akışları da geçti.
- `git diff --check`: geçti. Bu değişiklikte sunucu hesapları değişmediğinden birim/API paketleri yeniden çalıştırılmadı.

Yayın yalnız `vagontakip-test` Worker'ına yapıldı. Gizli anahtar bağı işleminden sonra etkin sürüm Cloudflare API üzerinden **%100 `96037ab9-7f1e-4a69-bccb-76d76b04647f`** olarak doğrulandı. Uzak testte giriş ve yayımlanan JavaScript dosyasının doğrulanan yerel derlemeyle birebir eşleşmesi kontrol edildi. Yayın öncesindeki personel (önceki 29 kişilik ekleme dahil), vagon, parça, demirbaş, günlük vardiya, operasyon, faaliyet ve eski bakım kayıtlarının kimlikleri korundu. Uzak doğrulama yeni kayıt oluşturmadı. Canlı sayfanın yayın öncesi/sonrası içerik özeti aynı kaldı; `main` dalına veya canlı Worker'a yayın yapılmadı.

## 9 Ekim 2026 — Vagon numarasının son bölümünün tek haneye indirilmesi

Özellik ve doğrulama kaydı: `a64e357` (`maintenance-test`).

Kullanıcının düzeltmesiyle yeni/değiştirilen numaralarda biçim `.... .... ...-.`, yani **4 + 4 + 3 + 1 = 12 rakam** oldu. Ortak giriş bileşeninin rakam sınırı, son grubu, form deseni, örnek metni ve Türkçe uyarıları `1234 5678 901-2` biçimine güncellendi. Vagon, bakım ve parça ekranları aynı bileşeni kullanır. Eski kayıtları aynen koruma, sayısal klavye, otomatik boşluk/tire, başlangıç sıfırları ve ayırıcı yanından silme davranışları devam eder.

Doğrulama:
- `npm run build:test`: TypeScript, Vite ve PWA üretimi geçti.
- İlk mobil bakım paketi: 3 geçti, 1 imleç testinin zamanlaması nedeniyle başarısız oldu. Test, otomatik imleç yerleştirmesi tamamlandıktan sonra konumunu ayarlayacak şekilde düzeltildi.
- İlk tekrar: eski yerel Worker'ın ana sayfası 404 döndüğünden 4 senaryo başlangıçta başarısız oldu; API sağlığı çalışıyordu. Mevcut yerel veri silinmeden, ayrı yerel durum ve port ile yeni Worker başlatıldı; ana sayfa 200 doğrulandı.
- Yeni yerel oturumda `E2E_MAINTENANCE=true E2E_BASE_URL=http://127.0.0.1:8790 npx playwright test tests/maintenance.spec.ts`: **4/4 geçti**. 12 rakamla kayıt, fazla rakamı sınırlandırma, harfli yapıştırma, sıfırlar, ayırıcıdan silme, eksik numara uyarısı ve birleşik bakım/vagon akışı doğrulandı.
- `git diff --check`: geçti. Diğer paketler bu küçük arayüz düzeltmesinde yeniden çalıştırılmadı.

İlk test sonucunu değerlendirmeden başlayan yayın yardımcı süreci sonlandırıldı; zaten başlamış alt süreç yalnız test Worker'ını yükledi. Son dört kontrol geçtikten sonra standart test yayın yardımcı süreci yeniden çalıştırılarak yayın tamamlandı. Canlı yayın izni kullanılmadı, `main` değişmedi. Cloudflare API üzerinden etkin sürüm **%100 `061faf71-1c14-44c1-8aa0-2b1fb103ec38`** olarak doğrulandı. Uzak giriş, yayımlanan JavaScript ile doğrulanan yerel derlemenin birebir eşleşmesi, önceki personel/vagon/parça/demirbaş/günlük/bakım/faaliyet/eski bakım kayıt kimliklerinin korunması ve canlı sayfanın içerik özetinin değişmediği kontrol edildi. Uzak doğrulama yeni kayıt oluşturmadı.

## 9 Ekim 2026 — Günlük atölyede aktif personelin otomatik seçilmesi

Özellik ve doğrulama kaydı: `e11d926` (`maintenance-test`).

Yeni günlük atölye formunda tüm aktif personel, vardiyanın başlangıç/bitiş saatleriyle otomatik seçili gelir ve personel listesi doğrudan görünür. Kullanıcı o vardiyada çalışmayan kişilerin seçimini kaldırabilir veya geri ekleyebilir; kapasite önizlemesi buna göre güncellenir. Tarih/vardiya değişince kullanıcının kaldırdığı kişiler tekrar seçilmez, kalan kişilerin saatleri yeni vardiyaya taşınır. Pasif personel yeni kayda otomatik alınmaz. Mevcut günlük kayıt düzenlenirken kayıtlı katılım listesi korunur; geçmiş kayıtlar veya personel verileri topluca değiştirilmez. Bakım formundan açılan yeni günlük kayıt aynı varsayılanı kullanır. Kullanım kılavuzu buna göre güncellendi.

Doğrulama:
- `npm run build:test`: TypeScript, Vite ve PWA üretimi geçti.
- Mobil bakım paketi ilk denemede 3 geçti, yeni testteki doğrulama çağrısının yazım hatası nedeniyle 1 başarısız oldu; test çağrısı düzeltildi.
- `E2E_MAINTENANCE=true E2E_BASE_URL=http://127.0.0.1:8791 npx playwright test tests/maintenance.spec.ts`: son çalıştırma **4/4 geçti**. Aktif listenin başlangıçta tamamen seçili olması, personel çıkarınca kapasitenin azalması, vardiya değiştirmede çıkarılan kişinin tekrar seçilmemesi ve kayıt/bakım/rapor akışları doğrulandı. Önceki denemelerin pasifleştirilmiş personeli yeni varsayılan listeye alınmadı.
- `git diff --check`: geçti. Sunucu/hesap modeli değişmediği için diğer paketler yeniden çalıştırılmadı.

Yalnız `vagontakip-test` yayımlandı. Gizli anahtar bağı işleminden sonra etkin test sürümü Cloudflare API üzerinden **%100 `448ec45f-84de-4ccb-a29a-126f82c7379b`** olarak doğrulandı. Uzak giriş ve yayımlanan JavaScript dosyasının doğrulanan yerel derlemeyle eşleşmesi kontrol edildi. Önceki personel/vagon/parça/demirbaş/günlük/bakım/faaliyet/eski bakım kayıt kimlikleri korundu; uzak doğrulama yeni kayıt oluşturmadı. Canlı sayfanın içerik özeti yayın öncesiyle aynı kaldı; `main` veya canlı Worker güncellenmedi.

## 9 Ekim 2026 — Bakım personelinin açılır listeden seçilmesi

Özellik ve doğrulama kaydı: `bd5ef22` (`maintenance-test`).

Kullanıcının istediği gibi bakım formunda görevli personel checkbox tablosu yerine açılır listeden seçilir. Seçilen her kişi altındaki **Seçili personel** alanına eklenir; × düğmesiyle kaldırılır ve yeniden seçilebilir hale gelir. Açılır liste Türkçe alfabetik sıradadır, seçili kişileri tekrar sunmaz; yeni seçime yalnız ilgili günlük vardiyada planlı aktif kişiler alınır. Seçili kişi sayısı ve hata açıklamaları korunur; mobil görünümde isimler satıra sığacak şekilde sarılır.

Yeni bakımda veya yeni personel/zaman aralığında ekip boş başlar. Günlük atölye kaydını bakım formundan oluşturmak da bütün atölye personelini otomatik bakım ekibine eklemez. Mevcut bakım düzenlemesinde kayıtlı ekip ve gerektiğinde pasif kişilerin tarihsel seçimi korunur. Vardiya kaydı değiştirilirse seçili ekipten yalnız yeni vardiyada planlı kişiler tutulur. Bekleme personeli de aynı açılır liste/seçili isimler düzenini kullanır; bekleme eklenirken görevli ekibin mevcut varsayılan seçimi korunur. Günlük atölye listesinin tüm aktif personeli otomatik seçmesi ve bağımsız faaliyet ekranı değiştirilmedi.

Doğrulama: `npm run build:test` TypeScript/Vite/PWA üretimi geçti. Ayrı yerel pilotta (`127.0.0.1:8792`) **4/4 mobil bakım akış testi geçti**. Yeni ekibin boş başlaması, personeli tek tek ekleme/kaldırma/yeniden ekleme, seçilmiş kişinin açılır listeden çıkarılması, boş seçim için Türkçe hata, kayıtlı ekibin düzenlemede korunması, ekip/bekleme hesapları, Excel/PDF, birleşik vagon-bakım ve geri dönüş akışları doğrulandı. `git diff --check` geçti. Sunucu/hesap şemaları değiştirilmediği için diğer paketler bu arayüz değişikliğinde yeniden çalıştırılmadı.

Yalnız `vagontakip-test` yayımlandı. Gizli anahtar bağı işleminden sonra etkin test sürümü Cloudflare API üzerinden **%100 `be18b336-2af7-457c-bb69-cf6e4ef832bf`** olarak doğrulandı. Uzak giriş ve yayımlanan JavaScript dosyasının doğrulanan yerel derlemeyle eşleşmesi kontrol edildi. Önceki personel/vagon/parça/demirbaş/günlük/bakım/faaliyet/eski bakım kayıt kimlikleri korundu; uzak doğrulama yeni kayıt oluşturmadı. Canlı sayfanın içerik özeti yayın öncesiyle aynı kaldı; `main` veya canlı Worker güncellenmedi.

## 9 Ekim 2026 — İş emri saatlerinin seçili vardiyalara göre güncellenmesi

Özellik ve doğrulama kaydı: `7bfa358` (`maintenance-test`).

Vardiya kaydı seçiminde ekip katılımı değişirken üstteki iş emri saatleri aynı kaldığından, yeni katılım iş emrinin dışında kalabiliyordu. Artık günlük vardiya kaydı seçme, ekip/vardiya aralığı ekleme ve kaldırma işlemleri, iş emri başlangıcını seçili günlük kayıtların en erken başlangıcına ve bitişini en geç bitişine ayarlar. Aynı gün yalnız 1. vardiya **08:00–16:00**, yalnız 2. vardiya **13:30–21:30**, ikisi birlikte **08:00–21:30** olur; ekleme sırası sonucu değiştirmez. Sınırlar sabit saatlerden değil kayıtlı günlük vardiyanın gerçek tarih/saatlerinden alınır.

Yeni ekip aralığı artık üstteki iş emrinin bütün saatlerini kopyalamaz; kendi vardiyasının başlangıç ve bitişiyle oluşturulur. Yeni aralıkta mümkünse henüz kullanılmamış son günlük vardiya önerilir; kullanıcı açılır listeden değiştirebilir. Saatleri elle düzenleme sürer; vardiya seçimi/ekleme/kaldırmada üst sınırlar yeniden otomatik hesaplanır. Var olan bakım kaydını yalnız açmak kayıtlı saatleri değiştirmez. Personel değiştirme veya ekip saatlerini elle düzenleme, üst saatleri kendiliğinden sıfırlamaz. Kayıtlı veriler topluca değiştirilmedi. Zaman/çakışma ve mola doğrulamaları korunur; mevcut bekleme saatleri sessizce taşınmaz.

Testler numara girişindeki ayrı bir imleç yarışını da gösterdi: gecikmeli `requestAnimationFrame` imleç hareketi, hızlı tümünü seçip yeni değer girerken seçimi bozabiliyordu. İmleç konumu artık React güncellemesinin layout aşamasında eşzamanlı uygulanır; sonraki girişin seçimine gecikmiş işlem müdahale etmez. Rakam biçimi ve eski numaraları koruma kuralı değişmedi.

Doğrulama:
- `npm run build:test`: son TypeScript/Vite/PWA üretimi geçti.
- İlk bakım paketi 3 geçti/2 başarısız: yeni testin vardiya seçicisi düzeltildi; birleşik vagon testi numara alanındaki imleç yarışını gösterdi. Sonraki çalışma 4 geçti/1 başarısız oldu; numara yarışı layout güncellemesine taşınarak düzeltildi.
- Son ayrı yerel pilotta (`127.0.0.1:8794`) **5/5 bakım akış testi geçti**. Tek vardiya seçimi, ikinci vardiya ekleme, ekiplerin kendi saatleri, vardiya kaldırma, ters sırada ekleme ve iki vardiyalı kaydın API tarafından başarıyla kabul edilmesi doğrulandı. Günlük varsayılan personel, açılır ekip seçimi, bekleme/işçilik hesabı, Excel/PDF, mevcut ve birleşik vagon-bakım, sayısal numara değiştirme ve geri dönüş akışları da geçti.
- `git diff --check`: geçti. Sunucu/hesap modeli değişmediğinden diğer paketler yeniden çalıştırılmadı.

Yalnız `vagontakip-test` yayımlandı. Gizli anahtar bağı işleminden sonra etkin test sürümü Cloudflare API üzerinden **%100 `6eabd70e-64c5-4ee9-83fc-4cab6b28e8fc`** olarak doğrulandı. Uzak giriş ve yayımlanan JavaScript dosyasının doğrulanan yerel derlemeyle eşleşmesi kontrol edildi. Önceki personel/vagon/parça/demirbaş/günlük/bakım/faaliyet/eski bakım kayıt kimlikleri korundu; uzak doğrulama yeni kayıt oluşturmadı. Canlı sayfanın içerik özeti yayın öncesiyle aynı kaldı; `main` veya canlı Worker güncellenmedi.


## 9 Ekim 2026 — Vagon ayrıntılarında yapılan bakım işleri

Genel Bakış veya Vagonlar listesinden açılan vagon ayrıntısına, yalnız o vagona ait bakım operasyonlarının listesi eklendi. Her kayıtta bakım başlangıcı/bitişi, vardiya amiri ve yapılan işlerin adı ile adedi görünür. Kayıtlar en yeni başlangıçtan eskiye sıralanır. Bakım Ekle ile kayıt tamamlanınca açık ayrıntı penceresindeki liste otomatik yenilenir. Kayıt yoksa veya bakım verisi yüklenemezse ayrı Türkçe durum mesajı gösterilir; yükleme hatasında yeniden deneme sunulur. Süre, personel ve bekleme ayrıntıları mevcut Bakım operasyonları ekranında kalır. Değişiklik yalnız bakım pilotu etkin olan test uygulamasında görünür; veri şeması ve hesaplamalar değişmedi.

Doğrulama: `npm run build:test` geçti. Ayrı yerel test Worker'ında bakım akış paketinin ilk koşusunda 4/5 senaryo geçti; yeni Genel Bakış doğrulaması yanlış erişilebilir düğme adını kullandığı için başarısız oldu. Test, Genel Bakış'ın sıralama seçicisi ve gerçek vagon düğme adıyla düzeltildi; ilgili senaryo tekrar çalıştırıldığında geçti. Bu senaryo kayıt öncesi boş listeyi, Bakım Ekle sonrasında anlık işi/adedi ve Genel Bakış'tan tekrar açınca kalıcı görünümü doğruladı. `git diff --check` geçti.

Yalnız `vagontakip-test` yayımlandı. Cloudflare API üzerinden etkin sürüm **%100 `8e07aa16-bf40-459a-a8d6-eb42c8c1ed54`** olarak doğrulandı. Uzak giriş, yayımlanan JavaScript ile doğrulanan yerel derlemenin eşleşmesi ve önceki kayıt kimliklerinin korunması kontrol edildi. Canlı sayfanın içerik özeti değişmedi; `main` veya canlı Worker güncellenmedi.
