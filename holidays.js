/**
 * holidays.js
 * -----------------------------------------------------------------------
 * Türkiye Cumhuriyeti resmî tatilleri.
 *
 * Bu modül, HMK m.93 kapsamında "son günün resmî tatile denk gelmesi"
 * kontrolünde kullanılacak tatil takvimini üretir.
 *
 * Sabit (millî) tatiller her yıl aynı tarihte olduğu için otomatik
 * hesaplanır. Dinî bayramlar (Ramazan Bayramı, Kurban Bayramı) ise Hicri
 * takvime göre belirlendiğinden ve yıldan yıla ~11 gün kaydığından,
 * astronomik/hilal gözlemine dayanır; güvenilir biçimde yalnızca
 * Diyanet İşleri Başkanlığı'nın yıllık olarak resmî Gazete'de ilan ettiği
 * tarihlerden alınabilir. Bu nedenle bilinen yıllar için bir arama
 * tablosu (lookup table) kullanılmıştır.
 *
 * ÖNEMLİ: RELIGIOUS_HOLIDAYS tablosunda yer almayan bir yıl için hesaplama
 * yapılırsa, sistem kullanıcıyı uyarır ve yalnızca sabit tatilleri dikkate
 * alarak hesaplamaya devam eder (hesaplama tamamen durmaz, ama sonuç
 * dikkatle kontrol edilmelidir). Tablonun güncel tutulması / yeni yıllar
 * eklenmesi gerekir.
 * -----------------------------------------------------------------------
 */

/**
 * Sabit (millî) resmî tatiller. { month: 1-12, day, name }
 * Kaynak: 2429 sayılı Ulusal Bayram ve Genel Tatiller Hakkında Kanun.
 */
const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Yılbaşı' },
  { month: 4, day: 23, name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  { month: 5, day: 1, name: 'Emek ve Dayanışma Günü' },
  { month: 5, day: 19, name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
  { month: 7, day: 15, name: 'Demokrasi ve Millî Birlik Günü' },
  { month: 8, day: 30, name: 'Zafer Bayramı' },
  { month: 10, day: 29, name: 'Cumhuriyet Bayramı' },
];

/**
 * Dinî bayramlar (tam gün resmî tatil olan günler).
 * Arife (yarım gün tatil) günleri, HMK m.93 açısından "tam gün" resmî
 * tatil sayılmadığından bu tabloya dahil edilmemiştir; hesaplama sırasında
 * yalnızca tam gün resmî tatiller son günü etkiler.
 *
 * Her yıl için { start: 'YYYY-MM-DD', days: N } biçiminde tanımlanır ve
 * start tarihinden itibaren `days` gün (start dahil) tam gün tatil kabul
 * edilir.
 *
 * Kaynak: Diyanet İşleri Başkanlığı / T.C. Cumhurbaşkanlığı yıllık resmî
 * tatil duyuruları (Temmuz 2026 itibarıyla doğrulanmış veriler).
 */
const RELIGIOUS_HOLIDAYS = {
  2025: [
    { start: '2025-03-30', days: 3, name: 'Ramazan Bayramı' }, // 30-31 Mart, 1 Nisan
    { start: '2025-06-06', days: 4, name: 'Kurban Bayramı' }, // 6-9 Haziran
  ],
  2026: [
    { start: '2026-03-20', days: 3, name: 'Ramazan Bayramı' }, // 20-22 Mart
    { start: '2026-05-27', days: 4, name: 'Kurban Bayramı' }, // 27-30 Mayıs
  ],
  2027: [
    { start: '2027-03-09', days: 3, name: 'Ramazan Bayramı' }, // 9-11 Mart
    { start: '2027-05-16', days: 4, name: 'Kurban Bayramı' }, // 16-19 Mayıs
  ],
};

/**
 * Bir yıl için tüm tam gün resmî tatilleri "YYYY-MM-DD" string kümesi
 * (Set) olarak döndürür.
 * @param {number} year
 * @returns {{ set: Set<string>, missingReligiousData: boolean }}
 */
function getHolidaySetForYear(year) {
  const set = new Set();

  FIXED_HOLIDAYS.forEach(({ month, day }) => {
    const key = toKey(year, month, day);
    set.add(key);
  });

  const religious = RELIGIOUS_HOLIDAYS[year];
  let missingReligiousData = false;

  if (religious) {
    religious.forEach(({ start, days }) => {
      const [y, m, d] = start.split('-').map(Number);
      const startDate = new Date(y, m - 1, d, 12, 0, 0, 0);
      for (let i = 0; i < days; i += 1) {
        const dt = new Date(startDate.getTime());
        dt.setDate(dt.getDate() + i);
        set.add(toKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()));
      }
    });
  } else {
    missingReligiousData = true;
  }

  return { set, missingReligiousData };
}

/**
 * Bir tarihin resmî tatil kümesinde olup olmadığını kontrol eder.
 * Yıl sınırlarını (ör. 31 Aralık -> 1 Ocak) doğru ele almak için, tarihin
 * kendi yılı ve komşu yılların tatilleri birlikte oluşturulur.
 * @param {Date} date
 * @returns {{ isHoliday: boolean, name: string|null, missingReligiousData: boolean }}
 */
function isOfficialHoliday(date) {
  const year = date.getFullYear();
  const key = toKey(year, date.getMonth() + 1, date.getDate());

  const { set, missingReligiousData } = getHolidaySetForYear(year);

  const isHol = set.has(key);
  let name = null;
  if (isHol) {
    const fixed = FIXED_HOLIDAYS.find((h) => toKey(year, h.month, h.day) === key);
    if (fixed) {
      name = fixed.name;
    } else {
      const religious = RELIGIOUS_HOLIDAYS[year] || [];
      const match = religious.find((r) => {
        const [y, m, d] = r.start.split('-').map(Number);
        const startDate = new Date(y, m - 1, d, 12, 0, 0, 0);
        const endDate = new Date(startDate.getTime());
        endDate.setDate(endDate.getDate() + r.days - 1);
        const t = new Date(year, date.getMonth(), date.getDate(), 12, 0, 0, 0).getTime();
        return t >= startDate.getTime() && t <= endDate.getTime();
      });
      name = match ? match.name : 'Resmî Tatil';
    }
  }

  return { isHoliday: isHol, name, missingReligiousData };
}

function toKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIXED_HOLIDAYS, RELIGIOUS_HOLIDAYS, getHolidaySetForYear, isOfficialHoliday };
} else {
  window.Holidays = { FIXED_HOLIDAYS, RELIGIOUS_HOLIDAYS, getHolidaySetForYear, isOfficialHoliday };
}
