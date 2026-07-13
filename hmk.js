/**
 * hmk.js
 * -----------------------------------------------------------------------
 * 6100 sayılı Hukuk Muhakemeleri Kanunu (HMK) hükümlerine uygun süre
 * hesaplama kuralları.
 *
 * İlgili maddeler:
 *   HMK m.90 - Sürelerin başlangıcı: Tebliğ/tefhim günü hesaba katılmaz,
 *              süre ertesi gün işlemeye başlar.
 *   HMK m.91 - Sürelerin bitişi: Hafta/ay olarak belirlenen sürelerde son
 *              günün nasıl bulunacağı.
 *   HMK m.93 - Tatil günleri: Sürenin son gününün adlî tatile/resmî
 *              tatile denk gelmesi hâlinde süre, tatili takip eden ilk iş
 *              günü sonuna kadar uzar.
 *
 * Bu modül yalnızca hesaplama mantığını içerir; DOM veya Trello SDK ile
 * doğrudan etkileşime girmez.
 * -----------------------------------------------------------------------
 */

/* global DateUtils, Holidays */

(function initHmkModule(root) {
  const DU = typeof DateUtils !== 'undefined' ? DateUtils : root.DateUtils;
  const HD = typeof Holidays !== 'undefined' ? Holidays : root.Holidays;

  /** Tebligat türleri */
  const TEBLIGAT_TURU = {
    E_TEBLIGAT: 'e-teblig',
    TEFHIM: 'tefhim',
    FIZIKI: 'fiziki',
  };

  /** Süre birimleri */
  const SURE_BIRIMI = {
    GUN: 'gun',
    HAFTA: 'hafta',
    AY: 'ay',
  };

  /**
   * Tebligat türüne göre "tebliğ edilmiş sayılan tarihi" hesaplar.
   *
   * - E-Tebliğ: Elektronik Tebligat Yönetmeliği m.9/5 uyarınca, tebligat
   *   muhatabın elektronik adresine ulaştığı tarihten itibaren 5. günün
   *   sonunda yapılmış sayılır. Bu nedenle girilen tarihe 5 gün eklenir.
   * - Tefhim / Fiziki Tebliğ: Tebliğ/tefhim bizzat o gün gerçekleşmiş
   *   sayılır; ayrıca gün eklenmez. (HMK m.90 sadece bu günün süre
   *   hesabına katılmayacağını düzenler, bu fonksiyonda değil,
   *   calculateSureBaslangici() içinde uygulanır.)
   *
   * @param {Date} girilenTarih - Kullanıcının girdiği başlangıç tarihi
   *   (E-Tebliğ'de gönderim/EYS'e ulaşma tarihi; Tefhim/Fiziki'de bizzat
   *   tebliğ/tefhim tarihi).
   * @param {string} tebligatTuru - TEBLIGAT_TURU değerlerinden biri
   * @returns {Date} Tebliğ edilmiş sayılan tarih
   */
  function calculateTebligEdilmisSayilanTarih(girilenTarih, tebligatTuru) {
    switch (tebligatTuru) {
      case TEBLIGAT_TURU.E_TEBLIGAT:
        return DU.addDays(girilenTarih, 5);
      case TEBLIGAT_TURU.TEFHIM:
      case TEBLIGAT_TURU.FIZIKI:
        return DU.normalizeDate(girilenTarih);
      default:
        throw new Error(`Bilinmeyen tebligat türü: ${tebligatTuru}`);
    }
  }

  /**
   * HMK m.90 uyarınca sürenin başlangıç gününü hesaplar: tebliğ/tefhim
   * edilmiş sayılan günün ertesi günü.
   * @param {Date} tebligEdilmisSayilanTarih
   * @returns {Date}
   */
  function calculateSureBaslangici(tebligEdilmisSayilanTarih) {
    return DU.addDays(tebligEdilmisSayilanTarih, 1);
  }

  /**
   * HMK m.91 uyarınca, süre başlangıcından itibaren belirtilen miktar ve
   * birimde süre ekleyerek "ham" (tatil kontrolü yapılmamış) son günü
   * hesaplar.
   *
   * - Gün: Süre başlangıcına (miktar - 1) gün eklenir; çünkü süre
   *   başlangıç günü zaten sürenin 1. günüdür (örn. 7 günlük süre,
   *   başlangıç + 6 gün sonra biter).
   * - Hafta: Süre, son haftanın süre başlangıcı ile aynı gününde sona
   *   erer (HMK m.91/1). Bu, (miktar x 7 - 1) gün eklenerek elde edilir.
   * - Ay: Süre, başladığı tarihe tekabül eden ayın günün de sona erer;
   *   o ayda böyle bir gün yoksa ayın son günü esas alınır (HMK m.91/2).
   *   Ay eklerken, süre başlangıcının kendisi 1. gün sayıldığından ayrıca
   *   1 çıkarma yapılmaz; HMK m.91/2 doğrudan "başladığı güne tekabül
   *   eden günde biter" der (örn. 1 Şubat başlayan 1 aylık süre 1 Mart'ta
   *   biter).
   *
   * @param {Date} sureBaslangici
   * @param {number} miktar
   * @param {string} birim - SURE_BIRIMI değerlerinden biri
   * @returns {Date} Tatil kontrolü uygulanmamış son gün
   */
  function calculateHamSonGun(sureBaslangici, miktar, birim) {
    if (!Number.isFinite(miktar) || miktar <= 0) {
      throw new Error('Süre miktarı pozitif bir sayı olmalıdır.');
    }

    switch (birim) {
      case SURE_BIRIMI.GUN:
        return DU.addDays(sureBaslangici, miktar - 1);
      case SURE_BIRIMI.HAFTA:
        return DU.addDays(sureBaslangici, miktar * 7 - 1);
      case SURE_BIRIMI.AY:
        return DU.addMonths(sureBaslangici, miktar);
      default:
        throw new Error(`Bilinmeyen süre birimi: ${birim}`);
    }
  }

  /**
   * HMK m.93 uyarınca, son günün hafta sonu veya resmî tatile denk
   * gelmesi hâlinde süreyi bunu takip eden ilk iş gününe uzatır.
   * Ardışık tatil/haftasonu günleri varsa (örn. bayram + hafta sonu),
   * ilk çalışma gününe kadar ileri gidilir.
   *
   * @param {Date} hamSonGun
   * @returns {{ sonGun: Date, uzatildiMi: boolean, uzatmaNedenleri: string[], missingReligiousData: boolean }}
   */
  function adjustForWeekendAndHolidays(hamSonGun) {
    let candidate = DU.normalizeDate(hamSonGun);
    const uzatmaNedenleri = [];
    let missingReligiousData = false;
    let uzatildiMi = false;

    // Sonsuz döngüye karşı güvenlik sınırı (pratikte hiçbir zaman
    // aşılmaz; ardışık tatil zinciri Türkiye'de en fazla ~5-6 gündür).
    const MAX_ITER = 30;
    let iter = 0;

    while (iter < MAX_ITER) {
      const holidayCheck = HD.isOfficialHoliday(candidate);
      if (holidayCheck.missingReligiousData) {
        missingReligiousData = true;
      }

      if (DU.isWeekend(candidate)) {
        uzatildiMi = true;
        uzatmaNedenleri.push(`${DU.formatDateTR(candidate)} hafta sonuna denk geliyor`);
        candidate = DU.addDays(candidate, 1);
        iter += 1;
        continue;
      }

      if (holidayCheck.isHoliday) {
        uzatildiMi = true;
        uzatmaNedenleri.push(`${DU.formatDateTR(candidate)} "${holidayCheck.name}" resmî tatiline denk geliyor`);
        candidate = DU.addDays(candidate, 1);
        iter += 1;
        continue;
      }

      break;
    }

    return { sonGun: candidate, uzatildiMi, uzatmaNedenleri, missingReligiousData };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      TEBLIGAT_TURU,
      SURE_BIRIMI,
      calculateTebligEdilmisSayilanTarih,
      calculateSureBaslangici,
      calculateHamSonGun,
      adjustForWeekendAndHolidays,
    };
  } else {
    root.HMK = {
      TEBLIGAT_TURU,
      SURE_BIRIMI,
      calculateTebligEdilmisSayilanTarih,
      calculateSureBaslangici,
      calculateHamSonGun,
      adjustForWeekendAndHolidays,
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
