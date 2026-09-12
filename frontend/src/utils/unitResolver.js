/**
 * Unit Resolver Utility for Project Estimasi
 * 
 * Memastikan prinsip Exact Value Preservation untuk satuan barang custom:
 * - Mempertahankan nilai persis yang dipilih/disimpan user (contoh: "Pcs", "batang", "Btg", "Set", dll.)
 * - Menghindari asumsi heuristik bahwa string "batang" selalu merupakan data legacy/salah
 * - Memisahkan secara tegas satuan display user dengan satuan harga modal (internal calculation)
 */

export const STANDARD_SATUAN_OPTIONS = [
  'Bh',
  'Pcs',
  'Set',
  'Unit',
  'Box',
  'Kg',
  'Btg',
  'M',
  'M²',
  'Ls',
];

/**
 * Menyelesaikan satuan barang display dari item estimasi atau master barang
 * dengan urutan prioritas canonical deterministik (tanpa mengubah casing atau mendiskualifikasi nilai).
 * 
 * @param {Object} item - Objek item estimasi atau barang
 * @param {string} fallback - Nilai default jika semua field kosong (default: 'Bh')
 * @returns {string} Exact unit value
 */
export function resolveItemSatuan(item, fallback = 'Bh') {
  if (!item) return fallback;

  // Prioritas 1: Canonical manual display field
  // Prioritas 2: Synonym manual display field
  // Prioritas 3: Storage/DB canonical unit field
  // Prioritas 4: Storage payload alternative field
  // Prioritas 5: Matched master DB barang field (jika ada)
  const raw =
    item.satuanBarangManual ??
    item.satuanManual ??
    item.satuan ??
    item.satuanBarang ??
    (typeof item.barangFromDB?.satuan === 'string' ? item.barangFromDB.satuan : null);

  if (raw !== null && raw !== undefined) {
    const trimmed = String(raw).trim();
    if (trimmed !== '') {
      return trimmed;
    }
  }

  return fallback;
}

/**
 * Menghasilkan daftar opsi satuan dropdown yang memastikan currentSatuan
 * (misalnya "batang", "Roll", dsb.) selalu ada dan dapat dipilih/ditampilkan di UI.
 * 
 * @param {string} currentSatuan - Satuan saat ini yang aktif
 * @returns {string[]} Array opsi satuan
 */
export function getEffectiveSatuanOptions(currentSatuan) {
  const trimmed = currentSatuan ? String(currentSatuan).trim() : '';
  if (!trimmed) {
    return STANDARD_SATUAN_OPTIONS;
  }

  // Jika currentSatuan sudah ada di STANDARD_SATUAN_OPTIONS (exact match), gunakan standard
  if (STANDARD_SATUAN_OPTIONS.includes(trimmed)) {
    return STANDARD_SATUAN_OPTIONS;
  }

  // Jika belum ada (misal: "batang", "Roll", "Lembar"), sisipkan di urutan pertama
  return [trimmed, ...STANDARD_SATUAN_OPTIONS];
}
