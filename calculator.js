/**
 * calculator.js
 * -----------------------------------------------------------------------
 * hmk.js, holidays.js ve dateUtils.js modüllerini bir araya getirerek
 * kullanıcı arayüzünün ihtiyaç duyduğu tam hesaplamayı üreten üst düzey
 * (orchestration) modül.
 * -----------------------------------------------------------------------
 */

/* global DateUtils, HMK */

(function initCalculatorModule(root) {
  const DU = typeof DateUtils !== 'undefined' ? DateUtils : root.DateUtils;
  const H = typeof HMK !== 'undefined' ? HMK : root.HMK;

  /**
   * @typedef {Object} SureHesaplamaGirdisi
   * @property {Date} baslangicTarihi - Kullanıcının girdiği ham tarih
   *   (E-Tebliğ'de gönderim tarihi, Tefhim/Fiziki'de tebliğ/tefhim tarihi)
   * @property {string} tebligatTuru - HMK.TEBLIGAT_TURU değerlerinden biri
   * @property {number} sureMiktari - Pozitif sayı
   * @property {string} sureBirimi - HMK.SURE_BIRIMI değerlerinden biri
   */

  /**
   * @typedef {Object} SureHesaplamaSonucu
   * @property {Date} baslangicTarihi
   * @property {string} tebligatTuru
   * @property {Date} tebligEdilmisSayilanTarih
   * @property {Date} sureBaslangici
   * @property {number} sureMiktari
   * @property {string} sureBirimi
   * @property {Date} hamSonGun
   * @property {Date} sonGun
   * @property {boolean} tatilNedeniyleUzatildi
   * @property {string[]} uzatmaNedenleri
   * @property {boolean} dinTatiliVerisiEksik
   */

  /**
   * Tüm HMK süre hesaplamasını uçtan uca gerçekleştirir.
   * @param {SureHesaplamaGirdisi} girdi
   * @returns {SureHesaplamaSonucu}
   */
  function hesaplaSure(girdi) {
    const { baslangicTarihi, tebligatTuru, sureMiktari, sureBirimi } = girdi;

    if (!(baslangicTarihi instanceof Date) || Number.isNaN(baslangicTarihi.getTime())) {
      throw new Error('Geçersiz başlangıç tarihi.');
    }
    if (!Object.values(H.TEBLIGAT_TURU).includes(tebligatTuru)) {
      throw new Error('Lütfen bir tebligat türü seçin.');
    }
    if (!Object.values(H.SURE_BIRIMI).includes(sureBirimi)) {
      throw new Error('Geçersiz süre birimi.');
    }
    if (!Number.isFinite(sureMiktari) || sureMiktari <= 0) {
      throw new Error('Lütfen geçerli bir süre miktarı girin.');
    }

    const tebligEdilmisSayilanTarih = H.calculateTebligEdilmisSayilanTarih(
      baslangicTarihi,
      tebligatTuru
    );

    const sureBaslangici = H.calculateSureBaslangici(tebligEdilmisSayilanTarih);

    const hamSonGun = H.calculateHamSonGun(sureBaslangici, sureMiktari, sureBirimi);

    const { sonGun, uzatildiMi, uzatmaNedenleri, missingReligiousData } =
      H.adjustForWeekendAndHolidays(hamSonGun);

    return {
      baslangicTarihi: DU.normalizeDate(baslangicTarihi),
      tebligatTuru,
      tebligEdilmisSayilanTarih,
      sureBaslangici,
      sureMiktari,
      sureBirimi,
      hamSonGun,
      sonGun,
      tatilNedeniyleUzatildi: uzatildiMi,
      uzatmaNedenleri,
      dinTatiliVerisiEksik: missingReligiousData,
    };
  }

  /**
   * Tebligat türü değerini kullanıcıya gösterilecek okunur metne çevirir.
   * @param {string} tebligatTuru
   * @returns {string}
   */
  function tebligatTuruEtiketi(tebligatTuru) {
    switch (tebligatTuru) {
      case H.TEBLIGAT_TURU.E_TEBLIGAT:
        return 'E-Tebliğ';
      case H.TEBLIGAT_TURU.TEFHIM:
        return 'Tefhim';
      case H.TEBLIGAT_TURU.FIZIKI:
        return 'Fiziki Tebliğ';
      default:
        return tebligatTuru;
    }
  }

  /**
   * Süre birimini kullanıcıya gösterilecek okunur metne çevirir.
   * @param {number} miktar
   * @param {string} birim
   * @returns {string}
   */
  function sureEtiketi(miktar, birim) {
    const birimMetni = { gun: 'Gün', hafta: 'Hafta', ay: 'Ay' }[birim] || birim;
    return `${miktar} ${birimMetni}`;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { hesaplaSure, tebligatTuruEtiketi, sureEtiketi };
  } else {
    root.Calculator = { hesaplaSure, tebligatTuruEtiketi, sureEtiketi };
  }
})(typeof window !== 'undefined' ? window : globalThis);
