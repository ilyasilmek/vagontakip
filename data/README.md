# Ortak veritabanı

Üretimde `database.enc.json`, Cloudflare servisi tarafından okunan ve güncellenen AES-256-GCM şifreli ortak veritabanıdır. Anahtar ve GitHub erişim anahtarı yalnız Cloudflare Worker secret ayarlarında tutulur. Kullanıcı hesaplarının parola özetleri de şifreli dosyanın içindedir.

Bu depo kullanıcı tarafından private yapılmıştır. Düz metin SQLite, kullanıcı parolası veya şifreleme anahtarı eklemeyin. İçe aktarılan özgün kayıtlar geliştirme sırasında `.local/seed.json` içinde, Git takibinin dışında tutulur. Üretim dosyası `npm run data:encrypt` komutuyla ilk kez oluşturulur; mevcut canlı dosya günlük geliştirme için yeniden üretilmez.

Bakım testinin verisi bu dosyada değil, ayrı Cloudflare SQLite Durable Object alanındadır. Kodun GitHub'a yedeklenmesi test verisini yedeklemez. Ayrıntılı saklama, güvenli anahtar aktarımı ve devir sınırları: [AI devir rehberi](../docs/AI-DEVIR-REHBERI.md).

Başarılı veri değişiklikleri, aynı dosyanın GitHub commit geçmişinde sürümlenir. Cloudflare nesnesi bütün telefonlara aynı güncel veriyi sunar; satır revision alanı eşzamanlı düzenlemelerde veri kaybını engeller. GitHub veya veri kaydetme işlemi hata verirse uygulama değişikliği kaydedilmiş göstermez.
