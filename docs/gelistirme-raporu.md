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
| Son özellik commit'i | `6096db4` | `03013a4` |

Güncel vagon numarası giriş biçimi **`1234 5678 901-2` veya `1234 567 901-2`** (orta bölüm üç ya da dört rakam, son bölüm tek hane). Önceki 13 rakam uygulaması aşağıdaki tarihsel kayıtta yer alır.

Kod ve dokümantasyon değişiklikleri GitHub'a kaydedilir. Testte girilen vagon ve bakım kayıtları GitHub veritabanına yazılmaz. Test verisi yayınlar arasında korunur ve canlı veriyle karıştırılmaz. Depo kullanıcı tarafından private yapılmıştır; kullanıcı daha sonra kayıt oluşturup silerek uygulamanın çalıştığını bildirmiştir.

## Kullanıcı iş girişi ve yönetici görünümü (9 Ekim 2026)

Normal kullanıcının Bakım ekranı ve Vagonlar → Bakım ekle penceresi sadeleştirildi. Kullanıcı vagon numarasını, başlangıç/bitiş tarih ve saatlerini, yalnız hesabının postasına tanımlı yapılan işleri, aynı postadan birlikte çalışan kişileri ve isteğe bağlı açıklamayı girer. Serbest ek iş ve ağır bakım dakikaları da girilebilir. Vardiya seçimi, bekleme ve A/S hesapları kullanıcı formunda gösterilmez. İşi yapan kişinin adı istemciden alınmaz; sunucu oturumundaki hesap adından kaydedilir. Yeni vagonla iş birlikte kaydedilebilir.

Yönetici mevcut ayrıntılı bakım operasyonu formunu ve raporlarını kullanır. Kullanıcıların iş girişleri yönetici Bakım ekranında vagon, işi yapan hesap, saat ve iş kalemleriyle listelenir; vagon ayrıntısında geçmiş işleri yapan adlar yalnız yöneticiye gönderilir. Yeni saha iş girişlerinin bilinen iş süreleri seçili ekip sayısıyla çarpılarak ayrıca A/S olarak gösterilir. Süresiz katalog işi varsa toplam A/S eksik işaretlenir. Bu girişler henüz ana atölye raporu hesabına katılmaz; yöneticiye ayrı listede görünür. Kullanıcı iş girişini yönetici operasyonuna dönüştüren ayrı bir onay iş akışı bulunmuyor.

Sunucu, kullanıcıların personel ve vardiya içeren tam atölye verisini ya da yönetici operasyonu oluşturma/düzenleme uçlarını kullanmasını engeller. Vagon bakım özeti kullanıcıya iş ve saatleri gösterir, kişi adlarını sunucu tarafında çıkarır. Eski operasyonlar ve ayrı test verisi korunur.

Doğrulama: TypeScript/Vite/PWA derlemesi ve 73 birim/API testi geçti. Yeni API testi oturum adının kullanılması, sahte aktör bilgisinin reddi, yeni vagonla atomik kayıt, yöneticiye özel liste ve A/S hesabına otomatik eklenmeme davranışını kapsar. `58cfe12` GitHub `maintenance-test` dalına gönderildi. Test Worker sürüm kimliği `b49d8eba-57dc-4c31-8ba2-f5be0d0e433a` ile yayımlandı. Uzak test hesabıyla oturum, önceki kayıt kimliklerinin korunması ve yayımlanan asset eşleşmesi doğrulandı; canlı sayfanın özeti değişmedi. Canlı Worker'a yayın yapılmadı.

Son doğrulanan etkin test Worker yayın kimliği: `b49d8eba-57dc-4c31-8ba2-f5be0d0e433a`. Önceki yayın: `e0abf178-772c-46f2-aeba-493cf63a4a14`. Önceki yayın: `0a68b05b-9948-4f11-acf3-cd782324e8b9`; daha önceki yayın: `7b2bf0d8-5014-4074-84b5-9df79b0b9048`; daha önceki yayın: `65dc0336-4370-4206-bd39-ccab7d3a9506`; daha önceki yayın: `bec32b59-0f6a-419b-883c-fe1f0852c88e`; daha önceki yayın: `7b0715ac-d447-4a73-99ee-38bc5abffd9f`; daha önceki yayın: `72866bf7-dac9-4241-a5ae-6b4d434c8f6c`. Önceki açıklayıcı çakışma mesajı yayını: `f399663b-311e-49d4-915c-ad89cb01cdbb`. Önceki bakım formu yayını: `65422038-79fd-493b-a45e-5d3d9d66589e`. Önceki koyu tema düzeltmesi yayını: `4c61aaed-0775-4179-9cdf-91a62ee4be6e`. Önceki vagon bakım listesi yayını: `8e07aa16-bf40-459a-a8d6-eb42c8c1ed54`. Önceki vardiya saati yayını: `6eabd70e-64c5-4ee9-83fc-4cab6b28e8fc`. Önceki personel açılır liste yayını: `be18b336-2af7-457c-bb69-cf6e4ef832bf`. Önceki günlük varsayılan personel yayını: `448ec45f-84de-4ccb-a29a-126f82c7379b`. Önceki tek son hane yayını: `061faf71-1c14-44c1-8aa0-2b1fb103ec38`. Önceki 13 rakam yayını: `96037ab9-7f1e-4a69-bccb-76d76b04647f`. Önceki alan doğrulama yayını: `7670d044-683d-430a-b387-dd39e8f57fe4`. Önceki bakım v2 yayını: `dac7a96d-aeb4-437b-80c7-7c17f5d98305`. Önceki arka plan yayını: `1ba71760-265a-4d1a-bdcd-2ffd564e1f6f`. Önceki birlikte kayıt yayını: `2ddcf0ea-9962-4154-9437-370aba01a278`. Dokümantasyon commitleri uygulama yayını değildir; uygulama dağıtımları aşağıdaki değişiklik ve yayın kayıtlarında belirtilir.

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

1. Vagon ekle açılır ve vagon numarası ile diğer bilgiler girilir; vagon tipi numaradan gösterilir.
2. Aynı giriş akışındaki Bakım ekle düğmesine basılır; vagon numarası hazır gelir.
3. Bakımın başlangıç/bitiş zamanı, aynı postadan birlikte çalışanlar ve yapılan işler girilir. Ek iş ve ağır bakım dakikaları gerektiğinde elle eklenir.
4. Kaydet ile vagon ve yapılan iş kaydı tek sunucu işlemi içinde oluşturulur.

Önce vagonu kaydedip listeden tekrar seçmek gerekmez. Bakım formundan vazgeçmek henüz kaydedilmemiş vagonu da oluşturmaz; ilk forma dönüldüğünde vagon alanları korunur. Geçersiz bakımda yalnız vagonun yazılması önlenir. Bakım ekle seçilmeden normal Kaydet yalnız vagon kaydı oluşturur.

### Mevcut vagonun bakımı

Vagonlar → vagon ayrıntıları → Bakım ekle. Vagon numarası hazır gelir. Kaydedince veya vazgeçince vagon detayına dönülür. Bu yol mevcut vagon için yeni saha iş girişi oluşturur. Yönetici ayrı Bakım bölümünden **Teknik operasyon** formunu da açabilir.

### Raporlama

Bakım operasyonları bölümü ayrı kalır. Rapor, Günlük atölye ve Personel sekmeleri vardır. Ay/hafta/özel aralık, arama ve sıralama; standart iş yükü, kapasite, kayıplar, yardımcı faaliyetler ve verimlilik gösterilir. Excel'de önceki dokuz sayfaya ek olarak **Saha iş girişleri** sayfası bulunur. Bakım detay kartı ve yönetim raporu sistem yazdırma ekranından PDF olarak kaydedilebilir. PDF desteği cihazın yazdırma olanaklarına bağlıdır. İlk sürümün dört sayfalı Excel'i tarihsel davranıştır.

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

Özellik ve doğrulama kaydı: `ff18cda` (`maintenance-test`).

Genel Bakış veya Vagonlar listesinden açılan vagon ayrıntısına, yalnız o vagona ait bakım operasyonlarının listesi eklendi. Her kayıtta bakım başlangıcı/bitişi, vardiya amiri ve yapılan işlerin adı ile adedi görünür. Kayıtlar en yeni başlangıçtan eskiye sıralanır. Bakım Ekle ile kayıt tamamlanınca açık ayrıntı penceresindeki liste otomatik yenilenir. Kayıt yoksa veya bakım verisi yüklenemezse ayrı Türkçe durum mesajı gösterilir; yükleme hatasında yeniden deneme sunulur. Süre, personel ve bekleme ayrıntıları mevcut Bakım operasyonları ekranında kalır. Değişiklik yalnız bakım pilotu etkin olan test uygulamasında görünür; veri şeması ve hesaplamalar değişmedi.

Doğrulama: `npm run build:test` geçti. Ayrı yerel test Worker'ında bakım akış paketinin ilk koşusunda 4/5 senaryo geçti; yeni Genel Bakış doğrulaması yanlış erişilebilir düğme adını kullandığı için başarısız oldu. Test, Genel Bakış'ın sıralama seçicisi ve gerçek vagon düğme adıyla düzeltildi; ilgili senaryo tekrar çalıştırıldığında geçti. Bu senaryo kayıt öncesi boş listeyi, Bakım Ekle sonrasında anlık işi/adedi ve Genel Bakış'tan tekrar açınca kalıcı görünümü doğruladı. `git diff --check` geçti.

Yalnız `vagontakip-test` yayımlandı. Cloudflare API üzerinden etkin sürüm **%100 `8e07aa16-bf40-459a-a8d6-eb42c8c1ed54`** olarak doğrulandı. Uzak giriş, yayımlanan JavaScript ile doğrulanan yerel derlemenin eşleşmesi ve önceki kayıt kimliklerinin korunması kontrol edildi. Canlı sayfanın içerik özeti değişmedi; `main` veya canlı Worker güncellenmedi.


## 9 Ekim 2026 — Koyu temada vagon ve bakım kartlarının okunabilirliği

Özellik ve doğrulama kaydı: `9a29c61` (`maintenance-test`).

Vagonlar listesindeki satır üzerine gelindiğinde açık tema arka planı kullanıldığı için koyu temada açık renkli yazılar okunmuyordu. Vagon ayrıntısına yeni eklenen **Yapılan bakımlar** kartı da açık renkli varsayılan yüzeyle aynı sorunu gösteriyordu. Koyu tema için vagon satırı hover rengi ve bakım kartının yüzeyi koyu renge bağlandı. Açık tema davranışı ve veri/hesaplama kodu değişmedi.

Doğrulama: `npm run build:test` geçti. Ayrı yerel Worker'da hedefli Playwright bakım akışı **1/1 geçti**; koyu temada vagon satırının hover arka planı ile bakım kartı arka planının hesaplanan CSS renkleri doğrulandı. `git diff --check` geçti. Diğer akışlar bu yalnız CSS düzeltmesinde yeniden çalıştırılmadı.

Yalnız `vagontakip-test` yayımlandı. Etkin Cloudflare sürümü **%100 `4c61aaed-0775-4179-9cdf-91a62ee4be6e`** olarak doğrulandı. Test girişi, yayımlanan dosyanın yerel derlemeyle eşleşmesi ve önceki kayıt kimliklerinin korunması doğrulandı. Canlı sayfanın içerik özeti değişmedi; `main` ve canlı Worker güncellenmedi.


## 9 Ekim 2026 — Yeni bakımda 1. Vardiya ve isteğe bağlı iş listesi

Özellik ve doğrulama kaydı: `c2901f2` (`maintenance-test`).

Yeni bakım operasyonu formunda, uygun günlük kayıtlar arasında **1. Vardiya** varsayılan seçilir. Öncelik bugünün 1. Vardiya kaydındadır; yoksa kayıtlı en son 1. Vardiya, hiç yoksa önce bugünün sonra en son uygun vardiya kullanılır. Böylece yalnız 2. Vardiya bulunan atölyelerde form yine açılabilir. Form içinden yeni günlük atölye kaydı oluşturulduğunda da aynı seçim uygulanır. Kullanıcının seçimi ve mevcut bakım kayıtlarının düzenleme değeri korunur.

**Yapılan işler** başlangıçta 49 kalemi göstermez. İş adı aranınca veya kategori seçilince eşleşen işlerin listesi açılır; filtre yoksa yönlendirici Türkçe mesaj görünür. **Seçilenler** düğmesi seçilmiş işleri tekrar görme ve adetlerini değiştirme imkânını korur. Arama veya kategori değişikliği sonuç görünümüne döner. İş kataloğu ve hesaplama kuralları değişmedi.

Doğrulama: `npm run build:test` geçti. Ayrı yerel Worker'da **5/5 bakım akış testi geçti**. Bugünün 1. ve 2. Vardiya kayıtları varken 1. Vardiya varsayılanı, başlangıçta gizli iş listesi, arama ve kategori sonuçları, seçilen işlerin tekrar görünmesi, kayıt akışları ve mevcut vardiya saati hesapları doğrulandı. `git diff --check` geçti.

Yalnız `vagontakip-test` yayımlandı. Etkin Cloudflare sürümü **%100 `65422038-79fd-493b-a45e-5d3d9d66589e`** olarak doğrulandı. Test girişi, yayımlanan dosyanın yerel derlemeyle eşleşmesi ve önceki kayıt kimliklerinin korunması doğrulandı. Canlı sayfanın içerik özeti değişmedi; `main` ve canlı Worker güncellenmedi.


## 9 Ekim 2026 — Personel zaman çakışması için açıklayıcı hata raporu

Özellik ve doğrulama kaydı: `c938194` (`maintenance-test`).

Bakım, bakım içi bekleme, vagonsuzluk veya diğer faaliyetlerde aynı personelin saatleri çakışırsa, sunucu artık ilk çakışma grubundaki personel adlarını (en fazla beş ad), çakışan Türkiye saati aralığını ve iki ilgili kayıt türünü bildirir. Bakım veya bekleme kaydında vagon numarası da görünür. Örneğin iki bakım çakışıyorsa her iki vagon numarası gösterilir. Başka kayıt çiftlerinde de çakışma varsa mesaj bunu belirtir. Mesaj mevcut kaydın gerçekten “aktif” olduğunu iddia etmez; geçmiş kayıt saatleri de çakışabileceğinden önce gerçek bitiş saatlerinin doğrulanmasını, ardından personel veya saatlerin düzeltilmesini ister. İşlem yine sunucuda engellenir; veri/hesaplama kuralları değişmedi. Yeni kişi veya saat bilgileri rapora yazılmadı.

Doğrulama: `npm run typecheck` ve `npm run build:test` geçti. `npm test`: **69/69 geçti**. Sunucu testleri aynı personelin iki vagondaki bakımının, bakım ve vagonsuzluğun, bakım içi bekleme ve faaliyetin çakışmasında hata metninin kişi, zaman ve kaynak kayıtlarını içerdiğini doğruladı. `git diff --check` geçti. İstemci akışı değiştirilmediği için Playwright paketi bu sunucu mesajı değişikliğinde yeniden çalıştırılmadı.

Yalnız `vagontakip-test` yayımlandı. Etkin Cloudflare sürümü **%100 `f399663b-311e-49d4-915c-ad89cb01cdbb`** olarak doğrulandı. Test girişi ve önceki kayıt kimliklerinin korunması doğrulandı; istemci dosyası yerel doğrulanan derlemeyle eşleşti. Canlı sayfanın içerik özeti değişmedi; `main` ve canlı Worker güncellenmedi.


## 9 Ekim 2026 — Çakışma uyarısından ilgili bakım formuna geçiş

Özellik ve doğrulama kaydı: `47eb367` (`maintenance-test`).

Personel-zaman çakışması hatası artık çakışan bakım kayıtlarının kimliklerini yapılandırılmış API alanında da döndürür. Bakım formundaki hata alanı, erişilebilen mevcut kayıtlar için vagon numaralı **bakımını aç** düğmesi gösterir. Düğme en güncel kaydı sunucudan alıp düzenleme formunu mevcut formun üzerinde açar; alt form geçici olarak etkileşime kapanır. Üstteki kayıttan geri dönüldüğünde yeni bakım taslağı (vagon, saat, personel, işler) korunur. İlgili bakım kaydedilirse yeni form açık kalır, eski hata temizlenir ve kullanıcı ilk kaydı yeniden kaydetmeyi deneyebilir. Kayıt silinmişse kullanıcıya yeniden yükleme uyarısı verilir. Numara metninden tahmin yapılmaz; sunucu kayıt kimliği kullanılır. Diğer faaliyet türleri hata metninde görünmeye devam eder ancak vagon formu bağlantısı yalnız bakım kaydı için gösterilir.

İlk uçtan uca test, üst üste açılan iki bakım formunun aynı HTML `id` değerini kullanması nedeniyle üst formdaki Kaydet düğmesinin alt forma bağlandığını yakaladı. Her form örneğine ayrı kimlik verilerek düzeltildi. Bu kimlik değişikliği normal tek form akışında davranışı değiştirmez.

Doğrulama: `npm run build:test` geçti. `npm test`: **69/69 geçti**. Ayrı yerel Worker'da hedefli ilk test 1 başarısız (çift form kimliği), düzeltmeden sonra hedefli test **1/1**, tüm mobil bakım paketi **6/6 geçti**. Çakışma bağlantısından doğru bakımın açılması, iptal sonrası taslağın korunması, ilgili bakımın düzeltilip kaydedilmesi ve ilk taslağın ardından kaydedilmesi doğrulandı. `git diff --check` geçti.

Yalnız `vagontakip-test` yayımlandı. Etkin Cloudflare sürümü **%100 `72866bf7-dac9-4241-a5ae-6b4d434c8f6c`** olarak doğrulandı. Test girişi, önceki kayıt kimliklerinin korunması ve yayımlanan istemcinin yerel derlemeyle eşleşmesi doğrulandı. Canlı sayfanın içerik özeti değişmedi; `main` ve canlı Worker güncellenmedi.

## 9 Ekim 2026 — Hava-Fren iş kataloğu (test)

Özellik commit’i: `be4d7f7`.

Kullanıcının verdiği Fren Postası listesindeki 11 kategori ve 52 iş satırı bakım formuna eklendi. İki kategoride tekrarlanan iş adları, ayrı satırlar olarak korundu. İş adlarının sonundaki `(adet)` kaldırıldı; adet seçimi form alanında kaldı. Yeni katalog yalnız hesabında **Hava-Fren** postası seçili olan kullanıcının iş seçiminde görünür. Diğer postalar için iş seçimi, kendilerine ait katalog eklenene kadar boş görünür. Sunucu da Hava-Fren dışı hesapların bu yeni iş kimlikleriyle kayıt yapmasını engeller.

Eski 49 standart ve önceki bakım kayıtlarının adları/süreleri korunur; düzenlenen eski kayıtta önceden seçilmiş işler gösterilir. Yeni katalogdaki eski işlerle eşleşen standart dakikalar devralındı. Eşleşmeyen işlerin süresi geçici olarak sıfırdır ve arayüzde **Standart süre tanımlanmadı** olarak gösterilir. Bu işler kaydedilebilir; iş yüküne dakika eklenmez ve ilgili iş emri ile rapor döneminde verimlilik hesaplanamaz. Gerçekleşen süre ile fiilî işçilik hesapları devam eder. Standart dakika değerleri daha sonra yönetici tarafından ayrı ayrı tanımlanmalıdır.

Doğrulama: TypeScript denetimi geçti; 71 Vitest testi geçti (katalog satırları, eski standartların korunması, süresiz işin verimlilik sonucuna etkisi dahil). Yerel test Worker’ında yedi Playwright akışı geçti (posta görünürlüğü, iş seçimi, kayıt, düzenleme, rapor ve Excel dahil). `vagontakip-test` Worker yayımlandı (`7b0715ac-d447-4a73-99ee-38bc5abffd9f`); uzaktan giriş, 52 aktif iş ve 11 kategori doğrulandı. Önceki test kayıt kimlikleri korundu, canlı sitenin sayfa özeti aynı kaldı. Canlı Worker ve `main` dalı değişmedi.

## 9 Ekim 2026 — Boş iş listesinin nedeni ve yönlendirme (test)

Özellik commit’i: `96f6bb9`.

Kullanıcı bakım formunda personel seçmesine rağmen iş adı ve kategori listesinin 0 kaldığını bildirdi. Kontrolde katalog seçiminin görevli personelden bağımsız olarak giriş yapan hesabın postasına bağlı olduğu ve test yönetici hesabının posta alanının boş olduğu görüldü. Test yönetici hesabı **Hava-Fren** postasına ayarlandı; önceki bakım kayıtlarına dokunulmadı.

İş kataloğu boş olduğunda bakım formu artık hesabın mevcut postasını gösteriyor ve **Hesabım → Postası → Hava-Fren → Postayı kaydet** adımlarını açıklıyor. Ayrı postaların işlerini birbirine açmama kuralı korunuyor. Yerel testte posta değiştirildiğinde 11 kategorinin ve 52 işin göründüğü Playwright akışı geçti. `vagontakip-test` Worker yayımlandı (`bec32b59-0f6a-419b-883c-fe1f0852c88e`). Uzaktan girişte test yönetici hesabının postası Hava-Fren olarak doğrulandı. Önceki test kayıt kimlikleri korundu; canlı sayfanın özeti değişmedi. Canlı siteye yayın yapılmadı.

## 9 Ekim 2026 — İş listesi uyarısının sadeleştirilmesi (test)

Özellik commit’i: `0deb110`.

Kullanıcının isteğiyle, iş kataloğu boş olduğunda gösterilen uzun posta açıklaması tek cümleye indirildi: “İş akışı girişi yapabilmek için Hesabım menüsünden Posta belirlemesi yapmanız gerekiyor!” Aynı durumu tekrar eden ikinci açıklama kaldırıldı. Katalog görünürlüğü ve kayıt hesapları değişmedi.

Doğrulama: TypeScript denetimi ve test derlemesi geçti; posta görünürlüğünü ve uyarıyı denetleyen Playwright akışı geçti. `vagontakip-test` Worker yayımlandı (`65dc0336-4370-4206-bd39-ccab7d3a9506`). Uzaktan giriş ve yayınlanan dosya doğrulandı; önceki test kayıt kimlikleri korundu ve canlı sayfanın özeti değişmedi. İlk dosya kontrolü geçici önbellek yanıtı nedeniyle başarısız oldu, hemen ardından tekrarlandığında doğrulandı. Canlı site değişmedi.

## 9 Ekim 2026 — Fren işleri kataloğunun tamamına erişim (test)

Özellik commit’i: `8eccc83`.

Kullanıcı 2 kategori ve 12 iş gördüğünü bildirdi. Sunucu kontrolünde Fren Postası listesinin **11 kategori ve 52 iş satırının tamamının aktif** olduğu doğrulandı. Mobil form kontrolünde kategori menüsünde 11 kategori bulundu; “Kol Mekanizmaları İşlemleri” seçimi yalnız bu kategorinin 12 işini gösteriyordu. İşler eksik yüklenmemişti; seçili kategori filtresi ve varsayılan kapalı görünüm tüm listeye erişimi belirsizleştiriyordu.

Formda toplam iş ve kategori sayısı gösterildi. **Tüm işleri göster (52)** düğmesi eklendi; açıldığında 11 kategori ayrı kapalı başlıklar halinde ve her başlıkta iş sayısıyla görünüyor. Arama ve kategori filtresi davranışı korunuyor; form ilk açıldığında uzun liste kendiliğinden görünmüyor. Yerel testte tüm 52 işin ve 11 kategorinin listelendiği, Kol Mekanizmaları kategorisinin 12 iş verdiği doğrulandı. `vagontakip-test` Worker yayımlandı (`7b2bf0d8-5014-4074-84b5-9df79b0b9048`). Yayındaki mobil formda 11 kategori ve 52 işin tamamı sayıldı; önceki test kayıt kimlikleri korundu, canlı sayfa özeti değişmedi. Canlı siteye yayın yapılmadı.

## 9 Ekim 2026 — Eski bakım kaydını düzenlerken Fren kataloğu (test)

Özellik commit’i: `eb6b152`.

Kullanıcının görsellerinde **Bakım operasyonunu düzenle** penceresinde 12 seçili eski iş ve yalnız iki eski kategori görünüyordu. Görselde son yayında eklenen “Tüm işleri göster” düğmesinin bulunmaması, sekmede eski arayüz sürümünün açık olduğunu da gösterdi. Test yönetici hesabıyla aynı 12 işli kayıt güncel test sitesinde açıldığında 52 yeni Fren işi ve seçili 12 eski iş birlikte görünüyordu.

Düzenleme formunda bu ayrım artık “52 yeni + 12 geçmiş iş” olarak yazılır. Giriş yapan hesabın postası Hava-Fren değilse seçili eski işler korunur ve kısa posta uyarısı bunlar görünürken de gösterilir; önceki davranışta eski seçili işler uyarıyı gizliyordu. Eski işlerin adları ve kayıtlı süreleri değiştirilmedi. Yerel Playwright testi, aynı eski kayıtta hem Hava-Fren postasıyla 64 toplam seçeneği hem başka postayla 12 geçmiş seçeneği ve uyarıyı doğruladı. `vagontakip-test` Worker yayımlandı (`0a68b05b-9948-4f11-acf3-cd782324e8b9`). Yayınlanan dosya doğrulandı; önceki test kayıt kimlikleri korundu, canlı sayfanın özeti değişmedi. Canlıya alınmadı.

## 9 Ekim 2026 — Türkçe karakterli kullanıcı adları (test)

Özellik commit’i: `190e0f2`.

Yönetim → Kullanıcı oluşturma ekranında “Kaynakçı” gibi Türkçe harf içeren kullanıcı adları sunucu kuralı yüzünden reddediliyordu. Kullanıcı adı kuralı Türkçe ve İngilizce harfleri, rakamı, nokta, tireyi ve alt çizgiyi kabul edecek şekilde güncellendi. Kullanıcı adı Türkçe büyük/küçük harf kurallarıyla normalize edilir. Girişte mevcut ASCII hesapların eski büyük harfli kullanımına öncelik verilerek uyumluluk korundu. Ad soyad alanı zaten Türkçe karakterleri kabul ediyordu; formda kullanıcı adı için kısa bir açıklama eklendi.

Doğrulama: TypeScript ve test derlemesi geçti; 72 Vitest testi geçti. Testler Türkçe ad oluşturmayı, büyük harfli girişi, tekrar eden kullanıcı adını reddetmeyi ve eski ASCII hesaba büyük harfle girişi kapsıyor. Yerel Cloudflare Worker'da Türkçe kullanıcı oluşturma, büyük harfle giriş ve test hesabını silme başarılı oldu. `vagontakip-test` Worker yayımlandı (`e0abf178-772c-46f2-aeba-493cf63a4a14`). Uzaktan test girişi ve yayınlanan dosya doğrulandı; önceki test kayıt kimlikleri korundu, canlı sayfanın özeti değişmedi. Canlı uygulama değişmedi.

## 10 Ekim 2026 — Vagon tipi ve sade saha iş akışı (test)

Özellik commit’i: `03013a4`. Hedef yalnız `maintenance-test` ve `vagontakip-test`; kullanıcı onayı olmadan canlıya aktarılmaz.

Vagon tipi seçimi giriş formundan kaldırıldı. Tip, girilen numaranın ikinci bloğuna göre sunucuda belirlenir; eşleşme kaynağı [kullanıcının verdiği tablo](requirements/vagon-tipi-kodlari-2026-10-10.txt) ve kod karşılığıdır. Kullanıcının özel kararı uyarınca `4568` kodu **Sgss-w** olur. Bilinmeyen kodda tip boş kalır. Numara girişinde orta blok artık üç veya dört rakam olabilir. Tamamlandı durumu ilk seçildiğinde İstanbul'un o günkü tarihi otomatik atanır; önceden tamamlanan kaydın tarihi korunur. Önceki kayıtların tipleri topluca değiştirilmedi.

Saha bakım girişinde kategori filtresi çıkarıldı; iş adına göre arama ve tümünü/seçilenleri gösterme kaldı. Adet alanı yalnız adı `(adet)` ile biten işler içindir. Mevcut Hava-Fren iş adlarında bu işaret bulunmadığından şimdiki listede işler bir kez işaretlenir. Hem kullanıcı hem yönetici, **Ek iş ekle** ile serbest iş adı ve dakika, **Ağır bakım** ile kendi postasının kataloğundan seçilen iş için ayrı ek dakika girebilir. Bunlar ayrı iş satırları olarak saklanır. Başlangıç/bitiş tarih ve saati formda kalır ve bakım zaman aralığını gösterir; tek başına A/S üretmez. Bilinen iş dakikaları × seçilen kişi sayısı / 60 ile A/S hesaplanır. Süresi belirlenmemiş katalog işinde toplam A/S kesin sayı olarak sunulmaz; bilinen alt toplam ve eksik süre uyarısı görünür.

Birlikte çalışanlar seçimi aynı postaya atanmış aktif hesapları **ve hesap açılmamış aktif personel kayıtlarını** kapsar. Kaydı yapan kişi oturumundan otomatik eklenir. Yöneticinin Personel ekranından kişilerin postasını bir kez belirlemesi gerekir; posta bilinmeyen personel, yanlış ekibe yazılmaması için seçimde gösterilmez. Sunucu başka postadan kişiyi ve başka postanın işini reddeder. Yönetici eski teknik operasyon formuna ayrıca erişebilir. Saha işleri yönetici raporunda ve ayrı Excel sayfasında görünür; ana atölye formül 2 toplamına otomatik karıştırılmaz.

Doğrulama: `npm run build` geçti; `npm test` ile **78/78 birim ve API testi geçti**. Eşleştirme, üç/dört haneli orta blok, otomatik tarih, serbest ve ağır bakım iş dakikaları, aynı posta ve hesap açılmamış personel seçimi API testlerinde kapsandı. Yerel Worker tarayıcı testi çalışma zamanı kilitlenmesi nedeniyle tamamlanamadı. Yalnız `vagontakip-test` Worker sürümü `468edd0b-9387-4527-a5a7-3c60eb8625e5` yayımlandı. Uzak test girişi, önceki kayıt kimliklerinin korunması, yayımlanan arayüzün yerel derlemeyle eşleşmesi ve canlı sayfanın değişmemesi doğrulandı. Gerçek cihazda formun görsel/kullanılabilirlik denemesi henüz kullanıcı tarafından yapılmadı.

## 10 Ekim 2026 — Personel listesi ve posta atamaları (test)

Özellik commit’i: `49f1a5c`. Kullanıcının verdiği 26 kişilik liste test personel kayıtlarına uygulandı. Uygulama hesabı olmayanlar da kendi postasındaki birlikte çalışma listesine girer. Yeni **Tren Teşkil**, **Fren** ve **Büro** posta seçenekleri eklendi. Kullanıcının **Hava&Fren** yazdığı iki kişi, mevcut iş kataloğunun bağlı olduğu **Hava-Fren** postasına atandı; **Fren** ayrı bir postadır ve ona henüz iş kataloğu tanımlı değildir. Listeden çıkarılan üç kişi silinmedi, pasifleştirildi; geçmiş vardiya ve bakım bağlantıları korundu. Postası personel kaydıyla çelişen bir test kullanıcı hesabının postası da eşitlendi; aksi halde o hesap yanlış ekibin seçicisinde görünüyordu. Personel isimleri ve tek tek posta atamaları bu rapora yazılmaz; test veritabanında tutulur.

`npm run build` ve `npm test` (78/78) geçti; `git diff --check` temiz. Test veritabanı ön incelemesinde 29 aktif personel bulundu: verilen 26 kişi mevcut kayıtlarda vardı, üç kişi listeden çıkarılmıştı. **26 posta güncellemesi ve üç pasifleştirme** uygulandı; kimlikler silinmedi. Uzak doğrulamada 26 kişinin aktif ve istenen postada olduğu, kalan üçünün pasif olduğu; önceki vagon, vardiya, bakım ve faaliyet verisinin değişmediği kontrol edildi. Hesap postası düzeltildikten sonra Hava-Fren iş listesi ve aynı posta ekip seçicisi ayrıca doğrulandı. Yalnız `vagontakip-test` Worker sürümü `4f3100b0-badb-4074-989e-b6201a80ba66` yayımlandı. Test girişi, arayüz dosyasının derlemeyle eşleşmesi, önceki kayıt kimliklerinin korunması ve canlı sayfanın değişmemesi doğrulandı. Canlı uygulama ve canlı personel kayıtları değiştirilmedi.

## 10 Ekim 2026 — Tek posta adı ve yönetici planlamasının ayrılması (test)

Özellik commit’i ve dağıtım sonucu doğrulama sonrasında eklenecek. Posta seçimleri kullanıcının verdiği adlarla sınırlandı: Hava&Fren, Boji, Kaynak, Vagonaj, Meydan, Torna, Tren Teşkil ve Büro. Eski Hava-Fren ve Fren kayıtları Hava&Fren'e eşlenir; Hazırlama artık seçim değildir. Geçmiş veriler okunabilsin diye eski posta değerleri saklama doğrulamasında tanınır, ancak yeni hesap/personel girişinde kabul edilmez. Fren iş kataloğu yalnız Hava&Fren postasına bağlı kalır.

Genel bakışta Vagon ekle düğmesinin yanına yalnız yöneticiye görünen **Planlama** düğmesi eklendi. Bu düğme, yöneticiye ait eski teknik operasyon formunu açar: günlük atölye kaydı oluşturma, personel/vardiya katılımı, vardiyalara göre başlangıç/bitiş sınırları, kişi/zaman aralığı ve bakım içi beklemeler burada bulunur. Yönetici Bakım ekle yolu da diğer kullanıcılarla aynı sade saha iş formunu açar. Planlama sayfasında günlük atölye, personel, rapor ve geçmiş teknik operasyonları düzenleme korunur. Teknik operasyon kaydı halen iş kalemi ister; mevcut sunucu formül 2 kayıt kuralı değiştirilmedi.

`npm run build`, `npm test` (79/79) ve `git diff --check` geçti. API testi artık eski Fren/Hava-Fren adlarının yeni hesap postası olarak reddedildiğini ve Hava&Fren'in 52 işlik kataloğu açtığını doğrular. Yerel Worker tarayıcı denemesi çalışma zamanının açılışta çökmesi nedeniyle tamamlanamadı; uzak test arayüzü ayrıca kontrol edilecek. Test veritabanındaki eski posta değerleri yeni ada taşınacak; canlı site ve canlı veri değiştirilmeyecek.
