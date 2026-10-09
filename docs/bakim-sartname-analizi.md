# Bakım ve adam-saat şartnamesi — uygulama analizi

Tarih: 9 Ekim 2026. Kaynak: [kullanıcının verdiği şartname](requirements/bakim-adam-saat-sartnamesi-2026-10-09.txt). Bu belge ilk analizdeki pilotla karşılaştırmayı ve sonradan kesinleşen geliştirme kararlarını kaydeder. Gerçek test/yayın durumu [geliştirme raporundadır](gelistirme-raporu.md).

**Hedef yalnız `maintenance-test` dalı ve `vagontakip-test` Worker'ıdır. Kullanıcı onayı olmadan `main` veya canlı uygulama değiştirilmez.** Mevcut test kayıtları silinmez.

## Onaylanan bilgiler

- Personel, ayrı bir listeden **tek tek seçilecek**. Kişi sayısı seçimlerden hesaplanacak. Atölye personeli ile uygulamaya giriş yapan kullanıcılar ayrı kavramlardır; personelin uygulama hesabı olması gerekmez.
- Hafta sonu çalışma düzeni hafta içindeki vardiya düzeniyle aynı olacak.
- Kullanıcının son düzeltmesiyle aşağıdaki iki vardiya geçerlidir. Saatler Türkiye saatidir. 3. vardiya yeni kayıt seçeneklerinden tamamen kaldırılmıştır; eski kayıtların vardiya açıklaması korunur.
- Yemek molası 30 dakikadır, başka mola yoktur. İki vardiya da 450 dakika / 7,5 net saattir.

| Vardiya | Başlangıç | Bitiş | Yemek molası | Net süre |
| --- | --- | --- | --- | --- |
| 1. Vardiya | 08:00 | 16:00 | 12:00–12:30 | 450 dakika |
| 2. Vardiya | 13:30 | 21:30 | 17:00–17:30 | 450 dakika |

Kısmi kayıplar bu gerçek mola aralıklarına göre hesaplanır. Önceki çelişen saatler kullanılmaz. Vardiya ayarları değişse bile daha önce kaydedilmiş günlük durum kendi saat ve molalarını korur.

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

## Uygulanan anlam ayrımları

Vardiya saatleri ve molalar kesinleşmiştir. Arayüz ve raporda şu ayrımlar görünür tutulur:

- **Yeni vagon gelmedi** ile **bakım yapılabilecek hiçbir vagon yoktu** farklı durumlardır. Önceki günden kalan vagon çalışılabilir durumdaysa, yeni sevk olmaması tek başına bütün vardiyayı vagonsuz kayıp yapmaz. Günlük form gerçek bakım imkânını ve kayıp aralıklarını kaydedecek biçimde adlandırılmalıdır.
- Tam vardiya boyunca ilgili kişiler vagonsuz kayıp yazıldıysa aynı kişilere aynı vardiyada bakım, bekleme veya yardımcı faaliyet yazılamaz. Bazıları temizlik yapıyorsa onlar için temizlik, diğerleri için gerçek kayıp kaydedilir.
- Yeni rapor, şartnamedeki **tamamlanan** iş yükü tanımını esas alır: standart çıktı tamamlanma tarihinde bir kez yazılır; fiilî kişi-zaman rapor aralığıyla kesişen süre kadar dağıtılır. Dönemde tamamlanan iş emirlerinin grup verimliliği, bu emirlerin bütün işçiliğini kullanır; yalnız dönemdeki süreye bölünüp yanıltıcı oran üretilmez. Eski pilotun başlangıç ayı davranışı eski kayıt kartlarında korunur.

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

## Analiz ve uygulama durumu

İlk analiz commit'i `e72104b` yalnız belge değişikliğiydi; bu aşamada uygulama kodu/yayını değiştirilmedi. Kullanıcının son vardiya cevabından sonra sürüm 2 geliştirmesi başlatıldı. Yeni kaynaklar [ortak hesap](../shared/workshop.ts), [doğrulama](../server/workshop.ts), [ilişkisel saklama](../server/workshop-storage.ts), [API](../server/workshop-routes.ts), [ekran ve rapor](../client/src/Workshop.tsx) dosyalarıdır. Güncel doğrulama/yayın sonuçları geliştirme raporunda tutulur. Canlı yayın onayı verilmemiştir.
