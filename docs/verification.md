# Doğrulama

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
