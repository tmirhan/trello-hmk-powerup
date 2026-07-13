/**
 * dateUtils.js
 * -----------------------------------------------------------------------
 * Timezone-safe date yardımcı fonksiyonları.
 *
 * NOT: Tüm tarihler "yerel takvim günü" olarak ele alınır. JavaScript'in
 * Date nesnesi saat bilgisi de tuttuğu için, saat dilimi (timezone)
 * kaymalarından kaynaklanan hatalardan kaçınmak amacıyla:
 *   - Tarihler daima saat 12:00 (öğlen) olarak normalize edilir. Böylece
 *     DST (yaz saati) geçişlerinde bile gün asla bir önceki/sonraki güne
 *     kaymaz.
 *   - Tarih karşılaştırmaları ve formatlamalar bu normalize edilmiş
 *     değerler üzerinden yapılır.
 * -----------------------------------------------------------------------
 */

/* eslint-disable no-unused-vars */

/**
 * Bir Date nesnesini, saatini öğlene (12:00:00.000) sabitleyerek
 * timezone kaymalarına karşı güvenli hale getirir.
 * @param {Date} date
 * @returns {Date} Yeni, normalize edilmiş Date nesnesi
 */
function normalizeDate(date) {
  const d = new Date(date.getTime());
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * yyyy-MM-dd (HTML <input type="date"> formatı) veya DD.MM.YYYY formatındaki
 * bir metni güvenli bir Date nesnesine çevirir.
 * @param {string} value
 * @returns {Date}
 */
function parseDateInput(value) {
  if (!value) {
    throw new Error('Geçersiz tarih girişi: boş değer.');
  }

  // HTML date input formatı: YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return normalizeDate(new Date(Number(y), Number(m) - 1, Number(d)));
  }

  // Türkçe format: DD.MM.YYYY
  const trMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (trMatch) {
    const [, d, m, y] = trMatch;
    return normalizeDate(new Date(Number(y), Number(m) - 1, Number(d)));
  }

  throw new Error(`Tanınmayan tarih biçimi: ${value}`);
}

/**
 * Date nesnesini HTML <input type="date"> için gereken YYYY-MM-DD biçimine çevirir.
 * @param {Date} date
 * @returns {string}
 */
function toISODateString(date) {
  const d = normalizeDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Date nesnesini kullanıcıya gösterilecek DD.MM.YYYY biçimine çevirir.
 * @param {Date} date
 * @returns {string}
 */
function formatDateTR(date) {
  const d = normalizeDate(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Bir tarihe belirtilen sayıda gün ekler (negatif değer çıkarma anlamına gelir).
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const d = normalizeDate(date);
  d.setDate(d.getDate() + days);
  return normalizeDate(d);
}

/**
 * Bir tarihe belirtilen sayıda ay ekler. HMK m.91/2 uyarınca, hedef ayda
 * aynı gün mevcut değilse (örn. 31 Ocak + 1 Ay = 28/29 Şubat), ayın son
 * günü esas alınır.
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
function addMonths(date, months) {
  const d = normalizeDate(date);
  const originalDay = d.getDate();

  const targetMonthIndex = d.getMonth() + months;
  const targetDate = new Date(d.getFullYear(), targetMonthIndex, 1, 12, 0, 0, 0);

  const lastDayOfTargetMonth = getLastDayOfMonth(targetDate);

  const day = Math.min(originalDay, lastDayOfTargetMonth);
  targetDate.setDate(day);

  return normalizeDate(targetDate);
}

/**
 * Bir tarihe belirtilen sayıda hafta ekler (7 gün x hafta sayısı).
 * HMK m.91/1 uyarınca haftalık süreler, son haftanın başlangıç günü ile
 * aynı gün adında sona erer; bu doğal olarak 7 gün ekleme ile sağlanır.
 * @param {Date} date
 * @param {number} weeks
 * @returns {Date}
 */
function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

/**
 * Verilen ayın son gününü döndürür.
 * @param {Date} date - Ayı belirlemek için kullanılan herhangi bir tarih
 * @returns {number} Ayın son günü (28, 29, 30 veya 31)
 */
function getLastDayOfMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Bir sonraki ayın 0. günü, bu ayın son günüdür.
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Bir tarihin haftasonu (Cumartesi veya Pazar) olup olmadığını kontrol eder.
 * @param {Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
  const day = normalizeDate(date).getDay(); // 0=Pazar, 6=Cumartesi
  return day === 0 || day === 6;
}

/**
 * İki tarihin aynı takvim gününe denk gelip gelmediğini kontrol eder.
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
function isSameDate(a, b) {
  const da = normalizeDate(a);
  const db = normalizeDate(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * Bugünün tarihini (saat bileşeni sıfırlanmış / öğlene sabitlenmiş) döndürür.
 * @returns {Date}
 */
function today() {
  return normalizeDate(new Date());
}

// Node/CommonJS ve tarayıcı (global window) ortamlarının her ikisinde de
// çalışabilmesi için basit bir dışa aktarım köprüsü.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeDate,
    parseDateInput,
    toISODateString,
    formatDateTR,
    addDays,
    addMonths,
    addWeeks,
    getLastDayOfMonth,
    isWeekend,
    isSameDate,
    today,
  };
} else {
  window.DateUtils = {
    normalizeDate,
    parseDateInput,
    toISODateString,
    formatDateTR,
    addDays,
    addMonths,
    addWeeks,
    getLastDayOfMonth,
    isWeekend,
    isSameDate,
    today,
  };
}
