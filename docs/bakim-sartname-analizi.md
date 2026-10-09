# Bakım ve adam-saat şartnamesi — uygulama analizi

Tarih: 9 Ekim 2026. Kaynak: [kullanıcının verdiği şartname](requirements/bakim-adam-saat-sartnamesi-2026-10-09.txt). Bu belge mevcut pilotla karşılaştırmayı ve geliştirme kararlarını kaydeder; yeni şartnamenin uygulamaya alınmış veya yayımlanmış olduğunu göstermez.

**Hedef yalnız `maintenance-test` dalı ve `vagontakip-test` Worker'ıdır. Kullanıcı onayı olmadan `main` veya canlı uygulama değiştirilmez.** Mevcut test kayıtları silinmez.

## Onaylanan bilgiler ve açık konu

- Personel, ayrı bir listeden **tek tek seçilecek**. Kişi sayısı seçimlerden hesaplanacak. Atölye personeli ile uygulamaya giriş yapan kullanıcılar ayrı kavramlardır; personelin uygulama hesabı olması gerekmez.
- Hafta sonu çalışma düzeni hafta içindeki vardiya düzeniyle aynı olacak.
- Kullanıcının ilk bildirdiği saatler, sonraki 1. vardiya düzeltmesiyle aşağıdadır. Saatler Türkiye saatidir; 3. vardiya belirtilen günün 00:00'ında başlar.
- Kullanıcı, yemek molasının 30 dakika olduğunu ve başka mola bulunmadığını belirtti. Mola başlangıç saatleri henüz verilmedi.

| Vardiya | Başlangıç | Bitiş | Molalar düşülmeden geçen süre |
| --- | --- | --- | --- |
| 1. Vardiya | 08:00 | 16:00 | 480 dakika / 8 saat |
| 2. Vardiya | 13:30 | Netleştiriliyor | İlk mesaj 20:50, düzeltme mesajı 14:30 |
| 3. Vardiya | 00:00 | 08:00 | 480 dakika / 8 saat |

**2. vardiyanın bitişi ve mola başlangıç saatleri henüz kesinleşmedi.** İlk bildirilen 13:30–20:50 aralığı 440 dakikaydı ve varsayılan 450 net dakikadan kısaydı. Sonraki düzeltmede 13:30–14:30 yazıldı; bu bir saatlik aralık olduğundan kullanıcının 13:30–21:30 mu kastettiği soruldu, cevap bekleniyor. 1. ve 3. vardiya, 30 dakika yemek molasıyla 450 net dakikadır. Mola başlangıçları uydurulmaz. Sabit mola yoksa günlük kayıtta gerçek mola aralığı seçilebilecek; kısmi kayıplar bu aralıklara göre hesaplanacak.

1. ve 2. vardiyanın saatleri örtüşür. Farklı kişiler bu vardiyalarda çalışabilir; aynı kişi aynı zaman diliminde iki kez planlanamaz veya iki faaliyete atanamaz.

## Mevcut pilot ile yeni kapsamın farkı

| Konu | Mevcut uygulama | Yeni şartnamenin gerektirdiği davranış |
| --- | --- | --- |
| Standart iş yükü | 49 iş kalemi, bir kişi için standart dakika × adet / 60 | Aynı temel hesap; aktiflik ve tarihsel standart sürümleri eklenir. Yeni raporda yeni bir 49 kalemlik süre listesi verilmemiştir. |
| İşin geçen süresi | Bitiş − başlangıç | Ayrı gösterilmeye devam eder; bütün geçen süre otomatik olarak herkesin çalıştığı süre kabul edilmez. |
| Fiilî toplam işçilik | Geçen dakika × sabit ekip sayısı / 60 | İş emrine katılan gerçek personelin zaman aralıklarından hesaplanır; katılım değişiklikleri desteklenir. |
| Bekleme kaybı | Bekleme dakikası × iş emrinin tüm ekibi / 60 | Başlangıç, bitiş ve gerçekten bekleyen kişiler seçilir; iş emri ekibi varsayılan olabilir. |
| Çakışma kontrolü | Toplam bekleme, iş emrinin süresini aşamaz | Aynı kişinin iş, bekleme, vagonsuzluk veya diğer faaliyetlerde çakışması sunucuda engellenir. |
| Günlük kapasite | Günlük durum/personel kaydı yok | Tarih + vardiya için tek günlük durum; sahadaki planlı kişiler, net vardiya ve vagonsuzluk aralıkları kaydedilir. |
| Vagonsuzluk | Ayrı kayıp kaydı yok | Tam ve kısmi vardiya kayıpları, neden ve ilgili personel-zaman üzerinden ayrı raporlanır. |
| Yardımcı faaliyet | Ayrı fiilî faaliyet kaydı yok | Hazırlık, güvenlik, temizlik/5S, ekipman bakımı ve diğer faaliyetler gerçek zaman/personelle kaydedilir. |
| Rapor dönemi | İstanbul saatine göre başlangıç ayı | Aylık, haftalık ve özel tarih aralığı; sürelerin dönem sınırlarında doğru paylaştırılması gerekir. |
| Yönetim paneli | İş yükü, bakım sayısı, bekleme ve verimlilik | Kapasite, dört ayrı KPI, yardımcı faaliyetler, açıklanamayan kapasite, neden dağılımı ve performans eklenir. |
| Sıfır payda | Bazı alanlarda çizgi gösterilir | Ekran, PDF ve Excel'de “Hesaplanamadı” gösterilir. |
| Veri yapısı | Durable Object içinde bir JSON snapshot; bakım dizileri | Yeni bakım alanı ilişkisel tablolara ve benzersiz bağlantılara taşınmalıdır; SQLite altyapısı kullanmak tek başına bu gereksinimi karşılamaz. |

Karşılaştırılan kaynaklar: [ortak hesap modülü](../shared/maintenance.ts), [sunucu doğrulamaları](../server/maintenance.ts), [veri saklama](../server/database.ts), [bakım arayüzü ve raporları](../client/src/Maintenance.tsx).

## Hesaplama modeli

Hesaplar tek ortak, sürümlenmiş modülden gelecek. Sunucu kaydederken doğrulayacak; ekran, Excel ve PDF aynı sonuçları kullanacak. Ara aşamalarda yuvarlama yapılmayacak.

| Gösterge | Kaynak ve formül |
| --- | --- |
| Standart iş yükü | Σ(adet × kayıt anındaki tek kişilik standart dakika) / 60 |
| İş emrinin geçen süresi | Bitiş − başlangıç; takvim süresidir |
| Fiilî toplam işçilik | İş emrine ayrılmış, molalar dışındaki personel-zaman / 60; bakım içi bekleme bu toplamın içindedir |
| Bekleme kaybı | Σ(gerçek bekleme dakikası × gerçekten bekleyen kişi sayısı) / 60 |
| Net işçilik | Fiilî toplam işçilik − bekleme kaybı |
| Standart hedef süre | Standart iş yükü × 60 / belirtilen ekip sayısı; değişen ekipte tek sabit süre gerçek süre tahmini gibi sunulmaz |
| Planlı kapasite | Dönemde kaydedilmiş günlük vardiyaların fiilen planlı personel-zaman toplamı / 60 |
| Vagonsuzluk kaybı | Σ(vagonsuz geçen net dakika × ilgili kişi sayısı) / 60 |
| Yardımcı faaliyet | Kaydedilmiş yardımcı faaliyet personel-zamanı / 60 |
| Kapasite kullanım oranı | Standart iş yükü / planlı kapasite × 100 |
| Vagonsuzluk kayıp oranı | Vagonsuzluk kaybı / planlı kapasite × 100 |
| Bakım içi bekleme oranı | Bakım içi bekleme kaybı / planlı kapasite × 100 |
| Net verimlilik | Standart iş yükü / net işçilik × 100 |
| Beklemeler dahil verimlilik | Standart iş yükü / fiilî toplam işçilik × 100 |

Çift sayımın önlenmesi için kişi başına birbirini dışlayan zaman kategorileri tutulacak: bakım çalışması, bakım içi bekleme, vagonsuzluk, hazırlık/güvenlik, temizlik/5S, yardımcı ve diğer faaliyetler. Fiilî toplam bakım işçiliği, bakım çalışması + bakım içi beklemeden türetilecek. Kapasite mutabakatında fiilî toplam ile bekleme tekrar birlikte toplanmayacak.

Standart iş yükü gerçek zaman kategorilerinden biri değildir. Kapasite bakiyesi hesaplanırken standart iş yükü düşülmez. Açıklanamayan kapasite yalnız aynı kişi-zaman esasına sahip kayıtlarda planlı kapasite − birbirini dışlayan fiilî kategoriler olarak hesaplanır; kalan süre otomatik yardımcı faaliyet yapılmaz. Pozitif açıklanamayan süre veya negatif bakiye veri kontrolü uyarısı doğurur. Eksik/karşılaştırılamaz kayıtlar için hesaplanmış gibi sıfır gösterilmez.

Şartnamedeki “3 kişi × 22 gün × 7,5 saat” bir kabul örneğidir; her aya otomatik 22 iş günü veya üç kişi atanmaz. Tatil, izin ve vardiyada bulunmayan kişiler kapasiteye eklenmez. Boş bir takvimden kapasite tahmin edilmez.

## Yeni kayıtlar ve ilişkiler

Yeni bakım alanında aşağıdaki varlıklar ve benzersiz kimlik bağlantıları gerekir:

| Kayıt | Temel ilişkiler ve amaç |
| --- | --- |
| Personel | Sabit kişi kimliği, görüntülenecek ad, aktiflik; geçmiş kayıt silinmeden pasifleştirme |
| Vardiya tanımı | Saatler, mola aralıkları, net süre ve yürürlük dönemi; eski vardiyalar kendi değerlerini korur |
| Günlük atölye durumu | Tarih + vardiya benzersizliği; o güne ait planlanan gerçek kişiler ve süreler |
| Vardiya durum aralıkları | Tam/kısmi vagonsuzluk, neden, başlangıç–bitiş ve ilgili kişiler |
| İş kalemi standardı | İş tanımı, aktiflik, geçerlilik aralığı ve tek kişilik dakika |
| Bakım iş emri | Vagon, başlangıç–bitiş, amir, günlük vardiya bağlantısı, formül sürümü ve denetim bilgisi |
| Bakım iş kalemleri | İş emrine bağlantı, adet, kullanılan standardın kimliği ve dakika snapshot'ı |
| Personel katılımı | Kimin hangi aralıkta iş emrine katıldığı; sabit ekip zorunluluğunu kaldırır |
| Bakım içi bekleme | İş emrine bağlantı, neden, saat aralığı ve gerçekten bekleyen kişiler |
| Atölye faaliyeti | Tür, saat aralığı, kişiler ve varsa iş emri bağlantısı |

Şartnamenin altı temel tablosu, kişi bazında kontrolü sağlayacak personel ve katılım ilişkileriyle tamamlanacak. Kullanıcının “tek tek personel seçimi” cevabı bu gereksinimi doğrulamıştır. Kişi sayısını elle değiştirerek farklı kişiler varmış gibi çakışma atlanamaz.

Tarih-saat UTC olarak saklanacak, ekranda Europe/Istanbul kullanılacak. Aralıklar başlangıç dahil/bitiş hariç değerlendirilecek; 10:00'da biten iş ve 10:00'da başlayan sonraki iş çakışmaz. Mola ve çalışma aralıkları aynı takvim esasına göre değerlendirilecek. Bekleyen kişiler, o sırada ilgili iş emrine atanmış kişilerden seçilecek. Geçersiz kayıtların kontrolü yalnız tarayıcıya bırakılmayacak.

Yeni vagon + bakım birlikte kaydetme akışı korunacak: ilişkisel geçiş iki kaydın atomik oluşturulmasını bozmamalı; geçersiz bakımda tek başına vagon yazılmamalı. Yetki, sürüm kontrolü, denetim kaydı ve test/canlı veri ayrımı korunacak.

## Eski test kayıtlarının korunması

Mevcut kayıtlarda kişi kimlikleri, bekleme başlangıç–bitişleri ve günlük vardiya bağlantısı yoktur. Bunlar tahmin edilerek doldurulmaz.

- Mevcut bakım kayıtları eski hesap kuralı/sürümüyle okunabilir kalır; sonuçları sessizce değişmez.
- Eski kaydın yalnız toplu ekip sayısı biliniyorsa kişi bazında çakışma kontrolünden geçmiş gibi gösterilmez.
- Yeni kapsam için yeni kayıtlar sürüm 2 kurallarıyla doğrulanır. Eski bir kaydı dönüştürmek gerekiyorsa gerçek kişiler, saatler ve vardiya kullanıcı tarafından tamamlanır.
- Kayıt anındaki iş kalemi standardı korunur; sonraki katalog değişikliği geçmiş iş yükünü değiştirmez.
- Eski kayıtların günlük kapasiteyle karşılaştırılamayan gerçek süreleri mutabakata dahil edilmez veya eksik kayıt uyarısıyla ayrılır. Bunlardan otomatik faaliyet/personel kaydı üretilmez.
- Geçiş sırasında veri sıfırlanmaz. Kodun geri dönüşü de geçmiş veritabanını eski bir dosyayla değiştirmek anlamına gelmez.

## Anlamı kesinleştirilecek durumlar

Vardiya saatleri ve molalar, yeni zaman hesabı için şu an açık olan temel bilgidir. Ayrıca arayüz/rapor uygulanırken şu ayrımlar görünür hale getirilmelidir:

- **Yeni vagon gelmedi** ile **bakım yapılabilecek hiçbir vagon yoktu** farklı durumlardır. Önceki günden kalan vagon çalışılabilir durumdaysa, yeni sevk olmaması tek başına bütün vardiyayı vagonsuz kayıp yapmaz. Günlük form gerçek bakım imkânını ve kayıp aralıklarını kaydedecek biçimde adlandırılmalıdır.
- Tam vardiya boyunca ilgili kişiler vagonsuz kayıp yazıldıysa aynı kişilere aynı vardiyada bakım, bekleme veya yardımcı faaliyet yazılamaz. Bazıları temizlik yapıyorsa onlar için temizlik, diğerleri için gerçek kayıp kaydedilir.
- Yeni raporda standart **tamamlanan** iş yükünün hangi tarihte döneme yazılacağı kesinleşmelidir. Mevcut pilot başlangıç ayını kullanır. Öneri, tamamlanma tarihinde standart çıktıyı bir kez yazmak; fiilî kişi-zamanı ise rapor aralığıyla kesişen süre kadar dağıtmaktır. Bu yaklaşım burada öneridir, henüz uygulanmış veya kullanıcı tarafından ayrıca onaylanmış kural değildir.

## Uygulama sırası ve doğrulama

1. Vardiya/net süre bilgisini kesinleştir; personel ve vardiya tanımları ile ilişkisel veri geçişini hazırla.
2. Günlük durum, katılım, faaliyet ve bekleme aralıklarını tek kişi-zaman doğrulamasına bağla; ortak hesap modülünü sürümle.
3. Mobil günlük durum/personel seçim ekranlarını ve mevcut vagon + bakım akışını güncelle; yönetim paneline yeni göstergeleri ekle.
4. Aynı ortak sonuçlardan tarih aralığı, Excel, PDF ve yazdırma raporlarını üret.
5. Kabul, yetki, veri geçişi, çakışma ve mobil akış testlerini tamamla; yalnız test Worker'a yayımla, kullanıcı denemesine aç.

Şartnamedeki 13 kabul testi uygulama tesliminden önce gerçek test paketine eklenecek. Aşağıdaki sonuçlar **bu analizde bağımsız aritmetik kontrolüyle** doğrulanmıştır; yeni uygulama davranışının veya kabul testlerinin tamamlandığı anlamına gelmez.

| Kabul örneği | Beklenen gösterim |
| --- | --- |
| 16 × 5 dakika / 60 | 1,33 A/S |
| 302 dakika × 3 kişi / 60 | 15,10 A/S |
| 31 dakika × 3 kişi / 60 | 1,55 A/S |
| 15,10 − 1,55 | 13,55 A/S |
| 9,50 / 13,55 × 100 | %70,11 |
| 9,50 / 15,10 × 100 | %62,91 |
| 3 kişi × 7,5 saat | 22,50 A/S |
| 4 tam vardiya × 22,50 A/S | 90,00 A/S |
| 3 kişi × 22 gün × 7,5 saat | 495,00 A/S |
| 90 / 495 × 100 | %18,18 |
| 125 / 495 × 100 | %25,25 |
| Ek aylık bekleme KPI'sı: 18,50 / 495 × 100 | %3,74 |

Ek gerçek testler: farklı ekip katılımı, yalnız bir kişinin beklemesi, ortak kişi içeren/içermeyen çakışmalar, bitişte başlayan komşu aralıklar, mola ve rapor dönemi sınırları, vardiya değişiklikleri, mükerrer tarih + vardiya, sıfır kapasite/net işçilik, geçmiş standart korunması, aynı anda kayıt istekleri, eksik eski kayıt ve atomik vagon + bakım kaydı. Ekran/Excel/PDF değerlerinin aynı olması ayrıca doğrulanacak.

## Bu analizin yayın durumu

Uygulama kodu, hesap formülleri ve çalışan test sitesi bu belge hazırlanırken değiştirilmedi. Uygulama testi/derlemesi çalıştırılmadı; kaynak metnin aktarımı, aritmetik örnekler, belge bağlantıları ve Git diff kontrol edildi. Yeni şartname uygulaması, vardiya bilgisi netleştikten sonraki geliştirme işidir. Canlı yayın onayı verilmemiştir.
