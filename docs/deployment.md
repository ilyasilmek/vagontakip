# Cloudflare'da canlı yayın

Bu uygulama tek Cloudflare Worker olarak yayınlanır: React PWA dosyaları ve `/api/*` aynı HTTPS adresindedir. `wrangler.jsonc` Worker adını `vagontakip`, kalıcı koordinasyon nesnesini `VagonDatabase` olarak tanımlar. SQLite tabanlı Durable Object kullanılır; ayrı D1, Pages, R2 veya sunucu kurulumu gerekmez.

## Bu teslimdeki durum

Üretim başlangıç verisi `data/database.enc.json` olarak hazırlanmıştır. Bu dosya ile eşleşen veritabanı anahtarı, oturum anahtarı ve rastgele üretilmiş ilk yönetici şifresi Git'e eklenmeyen `.local/production-secrets.json` içinde bulunur. İlk yönetici giriş bilgileri ayrıca `.local/production-login.json` içindedir. Bunlar mevcut bulut makinesinden güvenli bir anahtar kasasına aktarılmalı ve Worker'a bağlanmalıdır; ortamın silinmesine bırakılmamalıdır.

Kontrol edilen bulut ortamında Cloudflare tokenı ve hesap kimliği bağlı değildi. `api.github.com` ve `api.cloudflare.com` için hazırlanan ortam ağ taslağı kaydedilip uygulanana kadar API erişimi de hazır sayılmaz. Cloudflare yayını ve GitHub'a push kullanıcı tarafından istenmiştir; burada gerekli olan, mevcut olmayan erişim bilgilerini güvenli ayarlara bağlamaktır.

## Gerekli erişim bağları

### Yayın komutunun çalıştığı ortam

| Ad | Tür | Kullanım |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Hedef hesapta Worker yayınlama |
| `CLOUDFLARE_ACCOUNT_ID` | Ortam değişkeni | Hedef Cloudflare hesabını seçme |

Cloudflare tokenını hedef hesapla sınırlayın. Worker yayını için **Account → Workers Scripts → Edit**, hesap keşfi için **Account → Account Settings → Read** yetkisi kullanılır. Hesapta SQLite Durable Objects kullanılabilmelidir. Yalnız `workers.dev` adresiyle yayın için özel alan adı ve DNS yetkileri gerekmez. Ayrı D1 oluşturulmadığından D1 izni istenmez.

Bulut ortamının ağ ayarlarında mevcut izinleri koruyarak `api.cloudflare.com` ve `api.github.com` ekleyin. Yayın sonrası uygulamayı bu ortamdan doğrulamak için oluşan `vagontakip.<hesap-alt-alanı>.workers.dev` adresini de ekleyin. Paket indirme adresleri zaten paket yöneticisi politikasındadır. Cloudflare'da çalışan Worker'ın GitHub erişimi, bu geliştirme ortamının ağ listesinden ayrıdır.

### Cloudflare Worker secrets

| Ad | Gereklilik |
| --- | --- |
| `GITHUB_TOKEN` | Gerçek GitHub fine-grained token; yalnız `ilyasilmek/vagontakip` deposuna **Contents: Read and write** |
| `DB_ENCRYPTION_KEY` | Mevcut `.local/production-secrets.json` içindeki eşleşen anahtar; base64 biçiminde 32 bayt AES anahtarı |
| `SESSION_SECRET` | Aynı güvenli dosyadaki oturum anahtarı; en az 32 karakter |
| `ADMIN_PASSWORD` | Hazırlanan güvenli dosyadaki ilk yönetici şifresi veya sizin seçtiğiniz güçlü şifre; 8–256 karakter |

Token/parola değerlerini sohbet, Git, kaynak kodu, ekran görüntüsü veya komut satırı argümanlarıyla paylaşmayın. Bulut ortamında görünen platform `GH_TOKEN` bağını Worker'a kopyalamayın; platformun Git proxy kimliği Worker'ın GitHub API erişimi için kullanılmaz.

GitHub tokenının hedef depoya erişebildiğinden ve `main` üzerindeki veritabanı dosyasını doğrudan güncelleyebildiğinden emin olun. Branch kuralları doğrudan bu güncellemeyi engelliyorsa uygulama kaydetme hatası gösterir. Tüm hesap/depolara yetki vermek gerekmez.

Varsayılan, secret olmayan Worker değişkenleri `wrangler.jsonc` içinde tanımlıdır:

```text
STORAGE_MODE=github
GITHUB_REPOSITORY=ilyasilmek/vagontakip
GITHUB_BRANCH=main
GITHUB_DATABASE_PATH=data/database.enc.json
ADMIN_USERNAME=admin
```

Üretimde `STORAGE_MODE=local`, `LOCAL_SEED_BASE64` veya geliştirme `.dev.vars` dosyasını kullanmayın. Yerel kurulumun AES anahtarı üretim dosyasını açmaz.

## Yayın adımları

1. Kod ve mevcut şifreli başlangıç dosyası hedef GitHub `main` dalında bulunmalıdır. Düz metin SQLite/JSON dosyalarını veya `.local/` içeriğini push etmeyin.
2. Cloudflare yayın tokenını ve hesap kimliğini komutu çalıştıran ortamın güvenli ayarlarına bağlayın; gerekli ağ değişikliklerini uygulayın.
3. Bağımlılıkları kurun ve Worker'ı yayınlayın:

   ```bash
   npm ci --cache /tmp/vagontakip-npm-cache
   npm run deploy
   ```

   Bu komut derleme, tip kontrolü ve PWA service worker üretimini yapar; ardından Wrangler'ı repo içindeki güvenli yerel cache/log konumlarıyla çalıştırır. Konsoldaki `workers.dev` adresi uygulamanın adresidir.

4. Cloudflare panelinde **Workers & Pages → vagontakip → Settings → Variables and Secrets** altında yukarıdaki dört Worker değerini **Secret** türünde ekleyip uygulayın. İlk yayında bu bağlar henüz yoksa giriş/veri API'si yapılandırma hatası verir; uygulama başlangıç verisini boş veriyle değiştirmez. Alternatif olarak kişisel güvenli terminalinizde Wrangler'ın değerleri gizli isteyen secret komutlarını kullanın:

   ```bash
   node scripts/wrangler.mjs secret put GITHUB_TOKEN
   node scripts/wrangler.mjs secret put DB_ENCRYPTION_KEY
   node scripts/wrangler.mjs secret put SESSION_SECRET
   node scripts/wrangler.mjs secret put ADMIN_PASSWORD
   ```

   Mevcut `DB_ENCRYPTION_KEY` değerini kullanın; yeni rastgele anahtar üretmeyin. Anahtarların değerlerini terminal geçmişine yazmayın.

   Bu ortamda hazırlanan üç değeri dosyadan doğrudan yüklemek için, Worker yayınlandıktan sonra `node scripts/wrangler.mjs secret bulk .local/production-secrets.json` kullanabilirsiniz. `GITHUB_TOKEN` ayrıca bağlanmalıdır. Bu özel dosyayı GitHub'a eklemeyin.

5. HTTPS adresini açın. İlk veritabanı erişiminde henüz kullanıcı yoksa `ADMIN_USERNAME` ve `ADMIN_PASSWORD` ile yönetici oluşturulur ve şifreli dosya GitHub'da güncellenir. **Yönetim** ekranından gerçek ekip hesaplarını oluşturun. `ADMIN_PASSWORD` yalnız ilk hesabı oluşturur; sonradan bu secretı değiştirmek mevcut hesabın şifresini sıfırlamaz. Şifre değişikliği uygulamadan yapılır.
6. İki bağımsız cihazla bir kayıt oluşturup ikinci cihazda yenilendiğini doğrulayın. Yönetici düzenleme/silmesini ve sıradan hesabın silme yetkisi olmadığını kontrol edin. Ardından Android/iPhone ana ekran kurulumunu deneyin.

Yalnız `GET /api/health` yanıtının başarılı olması giriş veya GitHub'a yazma erişiminin doğrulandığı anlamına gelmez. Canlı doğrulama gerçek giriş ve geçici bir kaydın oluşturulup silinmesini içermelidir. Otomatik E2E testleri üretim URL'sine yönlendirilmez; yerel test için README yönergelerini kullanın.

## Güvenli güncelleme ve geri yükleme

Kod değişikliğini doğruladıktan sonra `npm run deploy` ile Worker'ı güncelleyin. Normal kod dağıtımı mevcut şifreli dosyayı ve kullanıcıları yeniden oluşturmaz. `npm run data:encrypt` ilk şifreli başlangıç dosyası hazırlamak içindir; mevcut dosyaya yeniden uygulanmaz ve üzerine yazmayı reddeder.

Her başarılı veri değişikliği GitHub'da şifreli dosyanın yeni sürümünü oluşturur. Geri yükleme gerektiğinde önce güncel şifreli dosyayı ve eşleşen anahtarı güvenli yedekleyin; seçilen eski dosyayı aynı konuma yeni bir GitHub commit'i ile geri getirin. Kod ve veri geçmişine force-push uygulamayın. Sunucu sonraki okumalarda GitHub'daki dosyayı yeniden alır. Dosya silinir veya bulunamazsa boş veritabanı oluşturulmaz; yönetici dosyayı geri yüklemelidir.

`DB_ENCRYPTION_KEY` tek başına değiştirilirse mevcut dosya açılamaz. Anahtar dönüşümü mevcut veriyi doğrulayarak yeniden şifrelemeyi ve Worker bağını birlikte güncellemeyi gerektirir; geçmiş şifreli sürümlerin açılması için eski anahtarların güvenli yedeği de gerekir. `SESSION_SECRET` değiştirilmesi mevcut oturumları geçersiz kılar.

GitHub deposunun otomatik Cloudflare Git dağıtımını ayrıca bağlarsanız yalnız veritabanı commit'lerinin tekrar kod dağıtımı tetiklememesini sağlayın. Uygulamanın ortak veri güncellemeleri için kodu tekrar derlemek gerekmez.

## Sık karşılaşılan engeller

| Belirti | Kontrol |
| --- | --- |
| Bulut makinesinde `CONNECT ... 403` / `Forbidden` | Ortamın ilgili hedef alan adına ağ izni uygulanmış mı? |
| Wrangler hesap/kimlik doğrulama hatası | Yayın tokenı, hesap kimliği ve hedef hesap izinleri hazır mı? |
| `CONFIGURATION_REQUIRED` | Worker'ın dört gerekli secretı doğru türde bağlanmış mı? |
| `DATABASE_NOT_INITIALIZED` / `DATABASE_REMOVED` | Şifreli dosya belirtilen repo, dal ve yolda mevcut mu? |
| `DATABASE_DECRYPTION_FAILED` | Worker anahtarı mevcut üretim dosyasının anahtarıyla eşleşiyor mu? |
| `GITHUB_UNAVAILABLE` / `GITHUB_WRITE_FAILED` | Worker'ın ayrı GitHub tokenı geçerli mi, depo erişimi/Contents yetkisi/main kuralları ve API limitleri uygun mu? |
| `REVISION_CONFLICT` | Başka kullanıcı kaydı güncelledi; güncel kaydı alıp değişikliği tekrar uygulayın. |

İnceleme sırasında secret değerlerini, oturum çerezlerini veya düz metin veritabanını loglamayın. GitHub veya Cloudflare erişimi düzeltilince aynı işlemi tekrar doğrulayın; yalnız başarısız bir ağ çağrısından yeni token ihtiyacı sonucu çıkarmayın.
