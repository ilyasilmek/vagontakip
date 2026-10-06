# Ortak veritabanı

Üretimde `database.enc.json`, Cloudflare servisi tarafından okunan ve güncellenen AES-256-GCM şifreli ortak veritabanıdır. Anahtar ve GitHub erişim anahtarı yalnız Cloudflare Worker secret ayarlarında tutulur. Kullanıcı hesaplarının parola özetleri de şifreli dosyanın içindedir.

Bu depo herkese açıktır. Düz metin SQLite, kullanıcı parolası veya şifreleme anahtarı eklemeyin. İçe aktarılan özgün kayıtlar geliştirme sırasında `.local/seed.json` içinde, Git takibinin dışında tutulur. Üretim dosyası `npm run data:encrypt` komutuyla oluşturulur.

Başarılı veri değişiklikleri, aynı dosyanın GitHub commit geçmişinde sürümlenir. Cloudflare nesnesi bütün telefonlara aynı güncel veriyi sunar; satır revision alanı eşzamanlı düzenlemelerde veri kaybını engeller. GitHub veya veri kaydetme işlemi hata verirse uygulama değişikliği kaydedilmiş göstermez.
