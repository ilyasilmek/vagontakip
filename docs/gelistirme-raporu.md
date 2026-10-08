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
| Son özellik commit'i | `6096db4` | `af96372` |

Kod ve dokümantasyon değişiklikleri GitHub'a kaydedilir. Testte girilen vagon ve bakım kayıtları GitHub veritabanına yazılmaz. Test verisi yayınlar arasında korunur ve canlı veriyle karıştırılmaz. Depo kullanıcı tarafından private yapılmıştır; kullanıcı daha sonra kayıt oluşturup silerek uygulamanın çalıştığını bildirmiştir.

Son doğrulanan test Worker yayın kimliği: `1ba71760-265a-4d1a-bdcd-2ffd564e1f6f`. Önceki birlikte kayıt yayını: `2ddcf0ea-9962-4154-9437-370aba01a278`. Dokümantasyon commitleri uygulama yayını değildir; uygulama dağıtımları aşağıdaki değişiklik ve yayın kayıtlarında belirtilir.

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

## Bakım pilotu: onaylanan hesap kuralları

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

## Güncel kullanıcı akışları

### Yeni vagon ve bakım birlikte

1. Vagon ekle açılır ve vagon bilgileri girilir.
2. Aynı giriş akışındaki Bakım ekle düğmesine basılır; vagon numarası hazır gelir.
3. Ekip, vardiya, başlangıç/bitiş, yapılan işler ve beklemeler doldurulur.
4. Vagon ve bakımı kaydet ile iki kayıt tek sunucu işlemi içinde oluşturulur.

Önce vagonu kaydedip listeden tekrar seçmek gerekmez. Bakım formundan vazgeçmek henüz kaydedilmemiş vagonu da oluşturmaz; ilk forma dönüldüğünde vagon alanları korunur. Geçersiz bakımda yalnız vagonun yazılması önlenir. Bakım ekle seçilmeden normal Kaydet yalnız vagon kaydı oluşturur.

### Mevcut vagonun bakımı

Vagonlar → vagon ayrıntıları → Bakım ekle. Vagon numarası hazır gelir. Kaydedince veya vazgeçince vagon detayına dönülür. Bu yol mevcut vagon için yalnız yeni bakım operasyonu oluşturur.

### Raporlama

Bakım operasyonları bölümü ayrı kalır. Ay, arama ve sıralama kontrolleri; standart iş yükü, ekip verimliliği ve bekleme dağılımı gösterilir. Aylık Excel dört sayfadır: Aylık özet, Bakım operasyonları, Yapılan işler, Beklemeler. Bakım detay kartı sistem yazdırma ekranından PDF olarak kaydedilebilir. PDF desteği cihazın yazdırma olanaklarına bağlıdır.

## Son doğrulamalar ve sınırlar

Son veri kaydetme değişikliği `d2e4c96` için (arka plan denemesinin ayrı doğrulamaları yukarıda):

- TypeScript kontrolü ve test arayüzü derlemesi başarılı.
- 44 birim/sunucu testi başarılı: hesap kuralları, yetki, kayıt doğrulaması, birlikte kayıtta hata halinde hiçbir kayıt oluşmaması ve kalıcılık dahil.
- Seçilen 5 Playwright testi başarılı: bakım kayıt/rapor akışı, mevcut vagondan bakım, yeni vagonla birlikte kayıt ve geri tuşu/gezinme.
- Uzak testte test hesabı girişi, vagon + bakım oluşturma, iki kaydı tekrar okuma ve geçici kayıt temizliği başarılı.
- Canlı sağlık kontrolü `ok: true`, `storage: github`; test sağlık kontrolü önceki yayınlarda `ok: true`, `storage: local` olarak doğrulandı.

Son sürümde tüm tarayıcı paketi yeniden çalıştırılmış gibi yorumlanmamalıdır: 8 testin tamamı ilk pilotta geçti; son değişiklikte ilgili 5 test çalıştırıldı. Mobil kontroller Chromium telefon emülasyonu ile yapıldı. Kullanıcı da gerçek telefonunda görünüm, vardiya ve Excel geri bildirimlerini verdi.

Bu raporu eklemek için uygulama testleri tekrar çalıştırılmadı; yalnız dokümantasyon değişti. Eski [doğrulama belgesi](verification.md) ilk kurulumun tarihsel sonuçlarını içerir; güncel kapsam bu rapordadır.

## Geri dönüş ve bekleyen karar

Kullanıcı uygun bulmazsa arayüz değişikliği yeni bir geri alma commit'iyle geri alınabilir. Güncel veritabanı eski bir sürümle değiştirilmez; geçmiş sıfırlanmaz ve force-push yapılmaz. Vagon detayından bakım denemesinden önceki pilot `a030984`; yeni vagonla birlikte kayıt eklenmeden önceki pilot `c145368` commitidir.

**Canlıya geçiş onayı henüz verilmedi.** Kullanıcı denemeyi tamamlayıp açıkça onay verirse üretim veri modeli, bakım özelliği yapılandırması, geçiş doğrulaması ve canlı yayın ayrıca ele alınır. Test sürümünün dağıtımı tek başına üretimi etkinleştirmez.

## Rapor güncelleme kuralı ve dokümantasyon kaydı

Bu rapor repoya eklendi; README üzerinden bağlantı verildi. Kök `AGENTS.md`, sonraki her anlamlı kod, yapılandırma, yayın veya kullanıcı akışı değişikliğinde raporun aynı commit içinde güncellenmesini zorunlu kılar. Her yeni kayıtta ne değiştiği, doğrulamanın gerçekten çalıştırılan kapsamı, yayın ortamı ve kalan sınırlamalar belirtilir. Güncel durum ve kullanıcı akışı değişmişse ilgili bölümler de yenilenir. Canlıya geçiş onayı verilmedikçe test aşaması uyarısı korunur.
