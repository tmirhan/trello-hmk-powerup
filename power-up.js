/**
 * power-up.js
 * -----------------------------------------------------------------------
 * Trello Power-Up giriş noktası. connector.html tarafından yüklenir.
 *
 * Uygulanan capability'ler:
 *   - card-buttons        : Kart arkasında "Hukuki Süre Hesapla" butonu
 *   - board-buttons        : Pano üst çubuğunda aynı hesaplayıcıyı açan buton
 *   - card-badges           : Hesaplanan son günü kartın önünde rozet olarak gösterir
 *   - authorization-status  : Trello'ya, kullanıcının REST API için yetki
 *                             verip vermediğini bildirir
 *   - show-settings         : Pano ayarlarındaki "..." menüsünden açılan
 *                             ayarlar/yetkilendirme penceresi
 *
 * ÖNEMLİ — appKey/appName neden burada SABİT tanımlı:
 * Trello'nun REST API istemcisi (t.getRestApi()), yalnızca
 * TrelloPowerUp.initialize(capabilities, { appKey, appName }) çağrısına
 * bu değerler senkron biçimde verildiğinde çalışır; verilmezse exception
 * fırlatır (bkz. Trello REST API Client dokümantasyonu — appKey/appName
 * "required options"). Bu, Trello SDK'sının kendi kısıtıdır; API
 * anahtarının herkese açık (public) olması zaten tasarım gereğidir —
 * Trello'nun kendi dokümantasyonu da "API key is intended to be publicly
 * accessible" der. Aynı değer popup.js içinde de tanımlıdır ve popup
 * açılırken t.popup({ args: { apiKey } }) ile ayrıca "dışarıdan arg"
 * olarak da popup.html'e taşınır.
 * -----------------------------------------------------------------------
 */

/* global TrelloPowerUp */

// >>> BURAYI DOLDURUN: Trello Power-Up API anahtarınız <<<
// https://trello.com/power-ups/admin adresinden alınır.
// popup.js içindeki TRELLO_API_KEY ile BİREBİR AYNI olmalıdır.
var TRELLO_API_KEY = '018c970fc1fe9e550f95c5ec236176ac';
var APP_NAME = 'HMK Süre Hesaplama';
var APP_AUTHOR = 'HMK Süre Hesaplama';

// Harici bir CDN'e bağımlı olmamak (ve olası 404/403 hatalarından
// kaçınmak) için ikon, gömülü (inline) bir SVG data-URI olarak
// tanımlanmıştır.
var ICON_SVG =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' +
      '<circle cx="12" cy="12" r="9" fill="none" stroke="#44546F" stroke-width="2"/>' +
      '<path d="M12 7v5l3.5 2" fill="none" stroke="#44546F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
  );

/**
 * Hesaplama popup'ını açan ortak fonksiyon; hem card-buttons hem
 * board-buttons hem de show-settings tarafından kullanılır.
 * @param {TrelloPowerUp.Iframe} t
 * @returns {Promise}
 */
function openCalculatorPopup(t) {
  return t.popup({
    title: 'HMK Süre Hesaplama',
    url: 'popup.html',
    height: 640,
    args: { apiKey: TRELLO_API_KEY },
  });
}

if (typeof TrelloPowerUp === 'undefined') {
  // power-up.min.js yüklenememiş demektir (ağ hatası ya da 404).
  // Bu noktada yapılabilecek başka bir şey yok; sessizce çık.
  throw new Error('[HMK Power-Up] TrelloPowerUp SDK bulunamadı. power-up.min.js yüklenemedi.');
}

TrelloPowerUp.initialize(
  {
    /**
     * Kart arka yüzünde (card detail) gösterilecek buton(lar).
     */
    'card-buttons': function (t) {
      return [
        {
          icon: ICON_SVG,
          text: 'Hukuki Süre Hesapla',
          callback: function (t) {
            return openCalculatorPopup(t);
          },
        },
      ];
    },

    /**
     * Pano üst çubuğunda gösterilecek buton. Kart bağlamı olmadığından,
     * popup.js içinde "Hesapla ve Uygula" adımı (kartın Due Date alanına
     * yazma) burada devre dışı bırakılır; yalnızca hesaplama/önizleme
     * yapılabilir.
     */
    'board-buttons': function (t) {
      return [
        {
          icon: ICON_SVG,
          text: 'HMK Süre Hesapla',
          callback: function (t) {
            return openCalculatorPopup(t);
          },
        },
      ];
    },

    /**
     * Kart ön yüzünde (küçük rozet) hesaplanmış son günü gösterir.
     * Power-Up'ın kendi sakladığı paylaşımlı veriyi (varsa) okur.
     */
    'card-badges': function (t) {
      return t
        .get('card', 'shared', 'hmkSonGun')
        .then(function (sonGun) {
          if (!sonGun) return [];
          return [
            {
              text: 'HMK Son Gün: ' + sonGun,
              color: 'red',
            },
          ];
        })
        .catch(function () {
          return [];
        });
    },

    /**
     * Trello'ya, bu Power-Up'ın kullanıcı adına Trello REST API'sine
     * erişim için yetkilendirilip yetkilendirilmediğini bildirir.
     * Trello, authorized:false dönerse arayüzde bir "Enable"/yetkilendirme
     * uyarısı gösterir ve tıklanınca show-settings capability'sini açar.
     */
    'authorization-status': function (t) {
      return t
        .getRestApi()
        .isAuthorized()
        .then(function (isAuthorized) {
          return { authorized: !!isAuthorized };
        })
        .catch(function () {
          return { authorized: false };
        });
    },

    /**
     * Pano ayarları ("..." menüsü > Power-Up Ayarları) tıklandığında
     * açılacak pencere. Aynı hesaplayıcı popup'ını, yetkilendirme
     * butonuyla birlikte yeniden kullanır (bkz. popup.js — "Hesapla ve
     * Uygula" butonu, henüz yetki verilmemişse otomatik olarak
     * yetkilendirme akışını başlatır).
     */
    'show-settings': function (t) {
      return t.popup({
        title: 'HMK Süre Hesaplama — Ayarlar',
        url: 'popup.html',
        height: 640,
        args: { apiKey: TRELLO_API_KEY },
      });
    },
  },
  {
    // t.getRestApi() için ZORUNLU seçenekler.
    appKey: TRELLO_API_KEY,
    appName: APP_NAME,
    appAuthor: APP_AUTHOR,
  }
);
