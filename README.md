# HMK Süre Hesaplama — Trello Power-Up

Trello kartları üzerinde, 6100 sayılı **Hukuk Muhakemeleri Kanunu (HMK)**
hükümlerine (m.90, m.91, m.93) uygun hukuki süre hesaplaması yapan ve
sonucu doğrudan kartın **Bitiş Tarihi (Due Date)** alanına yazan,
production-ready, statik (build gerektirmeyen) bir Trello Power-Up.

## Dosya Yapısı

Tüm dosyalar **kök dizinde**, düz (flat) yapıdadır — hiçbir JavaScript
dosyası `js/` klasörü altında değildir, hiçbir CSS dosyası `css/` klasörü
altında değildir. Bu, önceki sürümlerde yaşanan 404 hatalarını önler.

```
trello-hmk-powerup/
├── connector.html     # Trello'nun "Iframe Connector URL" olarak yüklediği sayfa (görsel içerik yok)
├── index.html          # İnsanlar için genel bilgi sayfası (Trello tarafından KULLANILMAZ)
├── popup.html           # Hesaplayıcı arayüzü (kart/pano butonuyla açılan popup)
├── popup.js               # Popup'ın davranışı + Trello REST API ile Due Date yazma
├── power-up.js             # TrelloPowerUp.initialize() — tüm capability'ler burada
├── calculator.js            # HMK hesaplama modüllerini birleştiren orkestratör (DEĞİŞMEDİ)
├── dateUtils.js               # Timezone-güvenli tarih yardımcıları (DEĞİŞMEDİ)
├── holidays.js                 # Türkiye resmî tatil takvimi (DEĞİŞMEDİ)
├── hmk.js                       # HMK m.90 / m.91 / m.93 hesap mantığı (DEĞİŞMEDİ)
├── manifest.json                 # Belgeleme amaçlı Power-Up meta verisi (referans)
├── style.css                      # Trello tasarım diline uygun ortak stiller
├── vercel.json                     # Vercel: build adımı yok, salt statik dosya servisi
├── package.json                     # Node bağımlılığı yok, yalnızca proje meta verisi
└── README.md                         # Bu dosya
```

`calculator.js`, `dateUtils.js`, `holidays.js`, `hmk.js` içindeki hesaplama
mantığı **hiç değiştirilmemiştir** — yalnızca dosya konumları köke taşınmış
ve Power-Up entegrasyon katmanı (connector, popup, power-up.js) yeniden
yazılmıştır.

## Uygulanan Trello Capability'leri

| Capability | Nerede | Ne yapar |
|---|---|---|
| `card-buttons` | `power-up.js` | Kart arkasında "Hukuki Süre Hesapla" butonu, `popup.html`'i açar |
| `board-buttons` | `power-up.js` | Pano üst çubuğunda aynı hesaplayıcıyı açan buton (kart bağlamı olmadığından yalnızca önizleme yapılabilir, karta yazma devre dışı) |
| `card-badges` | `power-up.js` | Hesaplanan son günü kartın önünde kırmızı rozet olarak gösterir |
| `authorization-status` | `power-up.js` | Trello'ya kullanıcının REST API yetkisi olup olmadığını bildirir |
| `show-settings` | `power-up.js` | Pano ayarları menüsünden açılan pencere; aynı popup'ı (ve yetkilendirme akışını) yeniden kullanır |

---

## Kurulum — Adım Adım

### 1. GitHub'a yükleme

Bu klasörün **içeriğini** (klasörün kendisini değil, içindeki dosyaları)
bir GitHub reposunun **kök dizinine** yükleyin:

```bash
cd trello-hmk-powerup
git init
git add .
git commit -m "HMK Süre Hesaplama Power-Up"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/trello-hmk-powerup.git
git push -u origin main
```

> ⚠️ **Önemli:** `connector.html`, `power-up.js`, `style.css` gibi dosyalar
> repo'nun **doğrudan kök dizininde** olmalı; alt klasör içine
> koymayınız. Aksi hâlde dosya yolları (`power-up.js`, `style.css` vb.)
> 404 verir.

### 2. Vercel'e bağlama

1. https://vercel.com adresinde "Add New… > Project" ile yukarıdaki
   GitHub reposunu içe aktarın.
2. Vercel "Framework Preset" adımında **"Other"** seçili kalmalı (proje
   kökündeki `vercel.json` zaten build/az install komutlarını `null`
   olarak ayarlıyor, bu yüzden Vercel herhangi bir build çalıştırmaz,
   dosyaları olduğu gibi servis eder).
3. "Root Directory" ayarını **değiştirmeyin** (repo kökü kalmalı) —
   dosyalarınız zaten kökte.
4. Deploy edin. Birkaç saniye içinde şu adres aktif olur:
   `https://PROJE_ADI.vercel.app/`

**Doğrulama:** Deploy bittikten sonra tarayıcıda şu adresleri tek tek
açın; hepsi 404 vermemeli, dosya içeriğini (kod/metin) göstermelidir:

- `https://PROJE_ADI.vercel.app/connector.html`
- `https://PROJE_ADI.vercel.app/power-up.js`
- `https://PROJE_ADI.vercel.app/popup.html`
- `https://PROJE_ADI.vercel.app/style.css`

`connector.html`'i doğrudan açtığınızda ekranın boş/siyah görünmesi ve
konsolda `postMessage` origin uyarısı çıkması **normaldir** — bu sayfa
yalnızca Trello'nun kendisi tarafından, bir panonun içinde yüklendiğinde
işlev görür.

### 3. Trello Power-Up oluşturma ve API Key/Token alma

1. https://trello.com/power-ups/admin adresine gidin.
2. **"Yeni bir Power-Up oluştur"** (New) butonuna tıklayın.
3. Formu doldurun:
   - **Power-Up name:** `HMK Süre Hesaplama`
   - **Workspace:** Power-Up'ı kullanacağınız çalışma alanı
   - **Iframe connector URL:**
     ```
     https://PROJE_ADI.vercel.app/connector.html
     ```
     (Kendi Vercel domaininizle değiştirin.)
4. Power-Up oluşturulduktan sonra **"API Key"** sekmesine gidin ve
   **"Generate a new API Key"** butonuna basın. Üretilen anahtarı
   kopyalayın.
5. Aynı sayfada **"Allowed Origins"** alanına Vercel domaininizi ekleyin:
   ```
   https://PROJE_ADI.vercel.app
   ```
6. (İsteğe bağlı, geliştirme/test amaçlı token) Kendi hesabınız için bir
   test token'ı almak isterseniz, API Key satırının sağındaki
   **"Token"** bağlantısına tıklayıp yetki verin — ama not edin: Power-Up
   normal kullanımda her kullanıcının kendi token'ını popup içinden
   "Hesapla ve Uygula" butonuna bastığında otomatik olarak alır; token'ı
   elle üretip koda **yapıştırmanıza gerek yoktur**.

### 4. API anahtarını koda ekleyin

Aldığınız API Key'i **iki dosyaya da aynı şekilde** yazın (ikisi de aynı
değere sahip olmalı):

**`power-up.js`:**
```js
var TRELLO_API_KEY = 'BURAYA_TRELLO_API_KEYINIZI_YAZIN';
```

**`popup.js`:**
```js
var TRELLO_API_KEY = 'BURAYA_TRELLO_API_KEYINIZI_YAZIN';
```

> Neden iki yerde? Trello'nun REST API istemcisi (`t.getRestApi()`),
> hem `power-up.js`'deki `TrelloPowerUp.initialize()` çağrısında hem de
> `popup.js`'deki `TrelloPowerUp.iframe()` çağrısında `appKey`
> parametresinin **senkron ve doğrudan** verilmesini zorunlu kılar;
> aksi hâlde `t.getRestApi()` exception fırlatır. Bu, Trello SDK'sının
> kendi teknik kısıtıdır. API anahtarının herkese açık (public) olması
> zaten tasarım gereğidir — Trello'nun kendi dokümantasyonu da bunu
> açıkça belirtir.

Değişikliği commit edip push edin; Vercel otomatik olarak yeniden deploy
eder.

### 5. Power-Up'ı Workspace'e / panoya ekleme

1. Bir Trello panosu açın.
2. Sağ üstteki menüden **"Power-Ups"** (veya "..." > "Power-Ups") seçin.
3. **"Custom"** sekmesinde, 3. adımda oluşturduğunuz `HMK Süre
   Hesaplama` Power-Up'ını bulup **"Add"** ile panoya ekleyin.

### 6. Test etme

1. Panodaki herhangi bir kartı açın.
2. Kart detayında **"Hukuki Süre Hesapla"** butonunu göreceksiniz —
   tıklayın.
3. Tebligat türünü seçin, tarih ve süreyi girin, **"Hesapla"** ile
   sonucu önizleyin.
4. **"Hesapla ve Uygula"** butonuna basın. İlk kullanımda Trello sizden
   Power-Up'a kartları güncelleme izni (read/write) vermenizi isteyecek
   — bu tek seferlik bir adımdır. İzin verdikten sonra hesaplanan son
   gün, kartın **Bitiş Tarihi** alanına otomatik yazılır ve kartın önünde
   kırmızı bir rozet belirir.
5. Pano üst çubuğundaki **"HMK Süre Hesapla"** butonuyla da aynı
   hesaplayıcıyı, herhangi bir karta bağlı olmadan (yalnızca önizleme
   amaçlı) açabilirsiniz.

---

## Sorun Giderme

| Belirti | Muhtemel sebep / çözüm |
|---|---|
| `GET https://.../js/power-up.js 404` | Dosyalar hâlâ `js/`/`css/` alt klasöründe. Bu sürümde tüm dosyalar kökte olduğundan bu hata **oluşmamalı**; oluşuyorsa GitHub reposunda dosyaların gerçekten kökte olduğunu (bir üst klasöre sarılmadığını) kontrol edin. |
| `connector.html` açıldığında ekran siyah + postMessage origin uyarısı | Normaldir. Bu sayfa yalnızca Trello içinde çalışacak şekilde tasarlanmıştır; doğrudan tarayıcıda test edilemez. |
| "Hukuki Süre Hesapla" butonu kartta görünmüyor | Power-Up'ın panoya eklendiğinden ve `card-buttons` capability'sinin Power-Up admin panelinde kapatılmadığından emin olun. Tarayıcı konsolunda `power-up.js` için 404/exception olup olmadığını kontrol edin. |
| "Hesapla ve Uygula" tıklanınca hiçbir şey olmuyor / hata veriyor | `power-up.js` ve `popup.js` içindeki `TRELLO_API_KEY` değerlerinin **aynı ve gerçek** (placeholder değil) olduğundan emin olun. |
| Yetkilendirme penceresi açılmıyor | Power-Up admin panelindeki **Allowed Origins** alanına Vercel domaininizin eklendiğinden emin olun. |
| Kart Due Date güncellenmiyor ama hata da yok | Trello REST API isteğinin döndürdüğü HTTP durum kodunu görmek için tarayıcı konsolunu (Network sekmesi) kontrol edin; genellikle 401 (token/anahtar hatalı) veya 400 (kart ID hatalı) olur. |

## Önemli Notlar

- **Dinî bayram tarihleri:** Ramazan ve Kurban Bayramı tarihleri Hicri
  takvime göre belirlendiğinden `holidays.js` içindeki
  `RELIGIOUS_HOLIDAYS` tablosunda yalnızca **2025-2027** yılları için
  Diyanet İşleri Başkanlığı kaynaklı doğrulanmış veriler bulunur. Sonraki
  yıllar için tabloya yeni girişler eklemeniz gerekir; aksi hâlde araç,
  arayüzde bir uyarı göstererek yalnızca sabit (millî) tatilleri dikkate
  alır.
- **Arife günleri** (yarım gün resmî tatil) hesaba katılmamıştır; yalnızca
  tam gün resmî tatiller HMK m.93 kapsamında son günü etkiler.
- Bu araç bir **hesaplama yardımcısıdır**, hukuki tavsiye niteliği
  taşımaz. Kritik süreler için sonucu mutlaka manuel olarak teyit edin.
