# Doğrulama

Bu belge ilk kurulumun tarihsel doğrulama sonuçlarını içerir. Güncel bakım pilotu ve yayın durumu için [geliştirme raporuna](gelistirme-raporu.md) bakın.

6 Ekim 2026 tarihinde Node.js 24, yerel Cloudflare Workers runtime ve Chromium üzerinde doğrulandı.

- Üretim TypeScript/Vite derlemesi tamamlandı.
- 21 sunucu testi geçti: parola/oturum, rol ve kayıt yetkileri, GitHub şifreleme, eşzamanlı yazma ve güvenli başlangıç davranışları.
- Gerçek yerel Worker ve derlenmiş arayüz üzerinde üç Playwright uçtan uca testi geçti.
- İki kullanıcı oturumuyla ortak kayıt ekleme ve düzenleme, eski sürüm çakışması, yönetici silmesi, yetkisiz istekler ve oturum iptali kontrol edildi.
- 320, 390 ve 1440 piksel genişliklerinde genel bakış, vagonlar ve yönetim sayfaları görüntülendi; yatay taşma veya tarayıcı çalışma hatası bulunmadı.
- Excel dosyası üç çalışma sayfasında 128 vagon, 2 parça ve 7 demirbaş içerdi.
- PWA manifesti ve gerçek 192/512 piksel PNG ikonları, yalnız uygulama dosyalarını tutan service worker, çevrimdışı sayfa yenileme ve salt okunur kayıtlar doğrulandı.
- Testler kendi geçici kayıtlarını ve hesaplarını temizledi. Aktarılan özgün 137 kayıt testlerden sonra başlangıç kopyasıyla aynıydı.

Cloudflare hesabına erişim bağları henüz mevcut olmadığından üretim yayını ve canlı GitHub API bağlantısı doğrulanmadı. Fiziksel Android/iPhone cihaz testi yapılmadı; yukarıdaki mobil kontroller Chromium ekran ve dokunma emülasyonuyla yürütüldü. Canlı giriş ve kayıt yazma kontrolü yayın sonrasında yapılmalıdır.

## GitHub bağlantısı düzeltmesi

Cloudflare Workers'ın gerçek yerel runtime'ında, nesne alanına saklanan native `fetch` fonksiyonunu nesne metodu olarak çağırmanın `Illegal invocation` hatası verdiği yeniden üretildi. GitHub bağlantısı artık fonksiyonu global receiver ile çağırıyor. Gerçek `GitHubStore` istek yolu aynı runtime'da yerel HTTP hedefine başarılı `200` yanıtı aldı. Bu kontrol GitHub'ın üretim erişim tokenını doğrulamaz.

Veritabanı veya yapılandırma hatası, parola kontrolünden önce oluşursa giriş denemesi sayacı geri alınır; yanlış parola denemeleri korunur. Bu düzeltmeler için regresyon testleri eklendi.
