/**
 * popup.js
 * -----------------------------------------------------------------------
 * Popup arayüzünün davranışını yönetir:
 *   - Form alanlarını okur / doğrular
 *   - calculator.js üzerinden hesaplama yapar
 *   - Sonucu ekranda gösterir
 *   - "Hesapla ve Uygula" ile hesaplanan son günü Trello kartının
 *     Due Date alanına REST API üzerinden yazar
 *
 * Bu popup hem card-buttons hem board-buttons hem de show-settings
 * capability'lerinden açılabilir. Kart bağlamı yoksa (board-buttons /
 * show-settings), "Hesapla ve Uygula" adımı devre dışı bırakılır; yalnızca
 * "Hesapla" ile önizleme yapılabilir.
 * -----------------------------------------------------------------------
 */

/* global TrelloPowerUp, DateUtils, HMK, Calculator */

(function () {
  // ÖNEMLİ: t.getRestApi() appKey/appName olmadan çalışmaz (throw eder).
  // Bu değer power-up.js'deki TRELLO_API_KEY / APP_NAME ile BİREBİR AYNI
  // olmalıdır — ikisini de aynı anda güncelleyin.
  var TRELLO_API_KEY = 'BURAYA_TRELLO_API_KEYINIZI_YAZIN';
  var APP_NAME = 'HMK Süre Hesaplama';

  var t = TrelloPowerUp.iframe({
    appKey: TRELLO_API_KEY,
    appName: APP_NAME,
  });

  // ---- DOM referansları -------------------------------------------------
  const els = {
    tebligatRadios: document.querySelectorAll('input[name="tebligatTuru"]'),
    baslangicTarihi: document.getElementById('baslangicTarihi'),
    tebligatHint: document.getElementById('tebligatHint'),
    sureMiktari: document.getElementById('sureMiktari'),
    sureBirimiRadios: document.querySelectorAll('input[name="sureBirimi"]'),
    quickButtons: document.querySelectorAll('.quick-btn'),
    hesaplaBtn: document.getElementById('hesaplaBtn'),
    hesaplaUygulaBtn: document.getElementById('hesaplaUygulaBtn'),
    errorMessage: document.getElementById('errorMessage'),
    noCardNote: document.getElementById('noCardNote'),
    resultBox: document.getElementById('resultBox'),
    resBaslangic: document.getElementById('resBaslangic'),
    resTebligatTuru: document.getElementById('resTebligatTuru'),
    resTebligTarihi: document.getElementById('resTebligTarihi'),
    resSureBaslangici: document.getElementById('resSureBaslangici'),
    resSure: document.getElementById('resSure'),
    resSonGun: document.getElementById('resSonGun'),
    extendNote: document.getElementById('extendNote'),
    missingDataWarning: document.getElementById('missingDataWarning'),
    applyStatus: document.getElementById('applyStatus'),
  };

  // ---- Kart bağlamı kontrolü --------------------------------------------
  // board-buttons / show-settings üzerinden açıldıysa context.card olmaz.
  const context = t.getContext();
  const hasCardContext = !!(context && context.card);

  if (!hasCardContext) {
    els.noCardNote.hidden = false;
    els.hesaplaUygulaBtn.hidden = true;
  }

  // ---- Başlangıç durumu ---------------------------------------------------
  els.baslangicTarihi.value = DateUtils.toISODateString(DateUtils.today());
  updateTebligatHint();

  let lastResult = null;

  // ---- Olay dinleyicileri --------------------------------------------------
  els.tebligatRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      updateButtonsEnabled();
      updateTebligatHint();
      hideResult();
    });
  });

  [els.baslangicTarihi, els.sureMiktari].forEach((input) => {
    input.addEventListener('input', () => {
      hideResult();
    });
  });

  els.sureBirimiRadios.forEach((radio) => {
    radio.addEventListener('change', hideResult);
  });

  els.quickButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const miktar = btn.getAttribute('data-miktar');
      const birim = btn.getAttribute('data-birim');
      els.sureMiktari.value = miktar;
      els.sureBirimiRadios.forEach((radio) => {
        radio.checked = radio.value === birim;
      });
      hideResult();
    });
  });

  els.hesaplaBtn.addEventListener('click', () => {
    runCalculation();
  });

  els.hesaplaUygulaBtn.addEventListener('click', () => {
    const result = runCalculation();
    if (result && hasCardContext) {
      applyToTrelloCard(result);
    }
  });

  // ---- Yardımcı fonksiyonlar ------------------------------------------------

  function getSelectedRadioValue(radios) {
    for (const radio of radios) {
      if (radio.checked) return radio.value;
    }
    return null;
  }

  function updateButtonsEnabled() {
    const tebligatSecili = getSelectedRadioValue(els.tebligatRadios) !== null;
    els.hesaplaBtn.disabled = !tebligatSecili;
    els.hesaplaUygulaBtn.disabled = !tebligatSecili;
  }

  function updateTebligatHint() {
    const secilen = getSelectedRadioValue(els.tebligatRadios);
    const hints = {
      'e-teblig':
        'Elektronik Tebligat Yönetmeliği uyarınca girilen tarihe 5 gün eklenerek tebliğ tarihi bulunur; süre bir sonraki gün başlar.',
      tefhim: 'HMK m.90 uyarınca tefhim günü hesaba katılmaz; süre ertesi gün başlar.',
      fiziki: 'HMK m.90 uyarınca tebliğ günü hesaba katılmaz; süre ertesi gün başlar.',
    };
    els.tebligatHint.textContent = secilen ? hints[secilen] : '';
  }

  function hideResult() {
    els.resultBox.hidden = true;
    els.applyStatus.hidden = true;
    lastResult = null;
  }

  function showError(message) {
    els.errorMessage.textContent = message;
    els.errorMessage.hidden = false;
  }

  function clearError() {
    els.errorMessage.hidden = true;
    els.errorMessage.textContent = '';
  }

  /**
   * Formdaki verileri okuyup hesaplamayı çalıştırır ve sonucu ekranda
   * gösterir. Başarılıysa hesaplama sonucunu döndürür, hata varsa null
   * döndürür.
   * @returns {Object|null}
   */
  function runCalculation() {
    clearError();

    try {
      const tebligatTuru = getSelectedRadioValue(els.tebligatRadios);
      if (!tebligatTuru) {
        showError('Lütfen bir tebligat türü seçin.');
        return null;
      }

      const baslangicTarihi = DateUtils.parseDateInput(els.baslangicTarihi.value);
      const sureMiktari = Number(els.sureMiktari.value);
      const sureBirimi = getSelectedRadioValue(els.sureBirimiRadios);

      const result = Calculator.hesaplaSure({
        baslangicTarihi,
        tebligatTuru,
        sureMiktari,
        sureBirimi,
      });

      renderResult(result);
      lastResult = result;
      return result;
    } catch (err) {
      showError(err.message || 'Hesaplama sırasında bir hata oluştu.');
      return null;
    }
  }

  function renderResult(result) {
    els.resBaslangic.textContent = DateUtils.formatDateTR(result.baslangicTarihi);
    els.resTebligatTuru.textContent = Calculator.tebligatTuruEtiketi(result.tebligatTuru);
    els.resTebligTarihi.textContent = DateUtils.formatDateTR(result.tebligEdilmisSayilanTarih);
    els.resSureBaslangici.textContent = DateUtils.formatDateTR(result.sureBaslangici);
    els.resSure.textContent = Calculator.sureEtiketi(result.sureMiktari, result.sureBirimi);
    els.resSonGun.textContent = DateUtils.formatDateTR(result.sonGun);

    if (result.tatilNedeniyleUzatildi) {
      els.extendNote.hidden = false;
      els.extendNote.textContent =
        'Not (HMK m.93): Hesaplanan ham son gün ' +
        DateUtils.formatDateTR(result.hamSonGun) +
        ' tarihiydi; ancak ' +
        result.uzatmaNedenleri.join(', ') +
        ' olduğundan süre ilk iş gününe uzatılmıştır.';
    } else {
      els.extendNote.hidden = true;
    }

    els.missingDataWarning.hidden = !result.dinTatiliVerisiEksik;

    els.resultBox.hidden = false;
    els.applyStatus.hidden = true;
  }

  /**
   * Hesaplanan son günü, Trello REST API üzerinden kartın Due Date
   * alanına yazar.
   * @param {Object} result
   */
  function applyToTrelloCard(result) {
    els.applyStatus.hidden = false;
    els.applyStatus.className = 'apply-status';
    els.applyStatus.textContent = 'Trello kartına yazılıyor...';

    // 1) Önce mevcut bir token var mı bak (client.getToken()).
    // 2) Yoksa client.authorize() ile yetkilendirme akışını başlat. Bu
    //    çağrı gerçek bir DOM click event handler'ı içinden yapıldığı
    //    için (bkz. Trello dokümantasyonu: "Don't call client.authorize
    //    from a capability handler!") tarayıcı popup engelleyicisine
    //    takılmaz.
    t.getRestApi()
      .getToken()
      .then((token) => {
        if (token) return token;
        return t.getRestApi().authorize({ scope: 'read,write', expiration: 'never' });
      })
      .then((token) => {
        const dueISO = result.sonGun.toISOString();

        return t.card('id').then((card) => {
          const url =
            `https://api.trello.com/1/cards/${card.id}` +
            `?due=${encodeURIComponent(dueISO)}` +
            `&key=${encodeURIComponent(TRELLO_API_KEY)}` +
            `&token=${encodeURIComponent(token)}`;

          return fetch(url, { method: 'PUT' });
        });
      })
      .then((response) => {
        if (!response || !response.ok) {
          throw new Error('Trello API isteği başarısız oldu (HTTP ' + (response ? response.status : '—') + ').');
        }
        return response.json();
      })
      .then(() => {
        // Rozet gösterimi için Power-Up'a özel paylaşımlı veriyi de
        // güncelle (card-badges tarafından okunur).
        return t.set('card', 'shared', 'hmkSonGun', DateUtils.formatDateTR(lastResult.sonGun));
      })
      .then(() => {
        els.applyStatus.className = 'apply-status success';
        els.applyStatus.textContent =
          '✓ Son gün (' + DateUtils.formatDateTR(lastResult.sonGun) + ') kartın Bitiş Tarihi alanına yazıldı.';
      })
      .catch((err) => {
        els.applyStatus.className = 'apply-status error';
        if (err && err.name === 'AuthDeniedError') {
          els.applyStatus.textContent = 'Yetkilendirme iptal edildi. Kartı güncellemek için izin vermeniz gerekir.';
        } else {
          els.applyStatus.textContent =
            'Hata: Kart güncellenemedi. ' + (err && err.message ? err.message : 'Lütfen tekrar deneyin.');
        }
      });
  }

  // İlk yükleme durumunu ayarla
  updateButtonsEnabled();

  t.sizeTo('body').done();
})();
