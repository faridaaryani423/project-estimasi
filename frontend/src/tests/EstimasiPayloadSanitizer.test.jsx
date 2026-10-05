import {
  toNumberOrNull,
  toIntegerOrZero,
  toIntegerOrNull,
  sanitizeEstimasiItem,
  sanitizeTouchedItems,
  buildDraftPayload,
  validatePayloadGuard,
} from '../utils/estimasiPayload';

describe('Estimasi Payload Sanitizer Utility', () => {
  describe('toNumberOrNull', () => {
    test('mengembalikan null untuk empty string, null, undefined, dan whitespace', () => {
      expect(toNumberOrNull('')).toBeNull();
      expect(toNumberOrNull(null)).toBeNull();
      expect(toNumberOrNull(undefined)).toBeNull();
      expect(toNumberOrNull('   ')).toBeNull();
    });

    test('mengonversi string angka valid ke tipe number', () => {
      expect(toNumberOrNull('600')).toBe(600);
      expect(toNumberOrNull('0')).toBe(0);
      expect(toNumberOrNull('0.6')).toBe(0.6);
      expect(toNumberOrNull('150000')).toBe(150000);
    });

    test('mendukung format koma desimal', () => {
      expect(toNumberOrNull('0,6')).toBe(0.6);
      expect(toNumberOrNull('12,5')).toBe(12.5);
    });

    test('mengembalikan null untuk nilai non-angka / NaN', () => {
      expect(toNumberOrNull('abc')).toBeNull();
      expect(toNumberOrNull(NaN)).toBeNull();
      expect(toNumberOrNull(Infinity)).toBeNull();
    });

    test('mempertahankan nilai number langsung', () => {
      expect(toNumberOrNull(600)).toBe(600);
      expect(toNumberOrNull(0)).toBe(0);
      expect(toNumberOrNull(12.5)).toBe(12.5);
    });
  });

  describe('toIntegerOrZero & toIntegerOrNull', () => {
    test('toIntegerOrZero mengembalikan integer atau 0 sebagai fallback', () => {
      expect(toIntegerOrZero('15')).toBe(15);
      expect(toIntegerOrZero('')).toBe(0);
      expect(toIntegerOrZero(null)).toBe(0);
      expect(toIntegerOrZero(undefined)).toBe(0);
      expect(toIntegerOrZero('abc')).toBe(0);
    });

    test('toIntegerOrNull mengembalikan integer atau null jika kosong', () => {
      expect(toIntegerOrNull('15')).toBe(15);
      expect(toIntegerOrNull('')).toBeNull();
      expect(toIntegerOrNull(null)).toBeNull();
      expect(toIntegerOrNull(undefined)).toBeNull();
      expect(toIntegerOrNull('abc')).toBeNull();
    });
  });

  describe('sanitizeEstimasiItem', () => {
    test('menghapus field UI-only dan mengonversi numeric fields', () => {
      const rawItem = {
        barangId: '10',
        kodeItem: 'A-01',
        panjangJadi: '600',
        panjangJadiInput: '0.6',
        jumlahKeperluan: '15',
        volume: '',
        hargaManual: '',
        hargamodalManual: '150000',
        panjangManual: '',
        savedDbId: '10',
        urutan: '1',
      };

      const sanitized = sanitizeEstimasiItem(rawItem, 0);

      // UI-only fields tidak boleh ada
      expect(sanitized).not.toHaveProperty('panjangJadiInput');
      expect(sanitized.savedDbId).toBe('10');

      // Numeric fields harus berupa number atau null
      expect(sanitized.panjangJadi).toBe(600);
      expect(typeof sanitized.panjangJadi).toBe('number');
      expect(sanitized.jumlahKeperluan).toBe(15);
      expect(typeof sanitized.jumlahKeperluan).toBe('number');
      expect(sanitized.hargamodalManual).toBe(150000);
      expect(typeof sanitized.hargamodalManual).toBe('number');

      // Field kosong harus null, bukan string kosong
      expect(sanitized.volume).toBeNull();
      expect(sanitized.hargaManual).toBeNull();
      expect(sanitized.panjangManual).toBeNull();
      expect(sanitized.urutan).toBe(1);
    });

    test('panjangJadi belum diisi ("") diubah menjadi null, bukan string kosong', () => {
      const rawItem = {
        barangId: '10',
        panjangJadi: '',
        panjangJadiInput: '',
        jumlahKeperluan: '',
      };

      const sanitized = sanitizeEstimasiItem(rawItem);
      expect(sanitized.panjangJadi).toBeNull();
      expect(sanitized.jumlahKeperluan).toBe(0);
    });
  });

  describe('buildDraftPayload', () => {
    test('membangun draft payload yang aman saat data form belum lengkap', () => {
      const formData = {
        namaEstimasi: 'Draft Proyek Baru',
        panjangRuangan: '',
        lebarRuangan: '',
        namaClient: '',
      };

      const items = [
        {
          barangId: '1',
          panjangJadi: '',
          panjangJadiInput: '',
          jumlahKeperluan: '',
          namaBarang: 'Besi Hollow',
        },
      ];

      const payload = buildDraftPayload(formData, items, () => ({ hargamodal: 100000 }));

      expect(payload.status).toBe('draft');
      expect(payload.namaEstimasi).toBe('Draft Proyek Baru');
      expect(payload.panjangRuangan).toBeNull();
      expect(payload.lebarRuangan).toBeNull();
      expect(payload.items).toHaveLength(1);

      const itemPayload = payload.items[0];
      expect(itemPayload.panjangJadi).toBeNull();
      expect(itemPayload.jumlahKeperluan).toBe(0);
      expect(itemPayload).not.toHaveProperty('panjangJadiInput');
      expect(itemPayload.savedDbId).toBe('1');
      expect(typeof itemPayload.subtotal).toBe('number');
    });

    test('menjaga nilai panjangJadi 600 mm untuk input 0.6 M', () => {
      const formData = { namaEstimasi: 'Kanopi 0.6 M' };
      const items = [
        {
          barangId: '1',
          panjangJadi: '600',
          panjangJadiInput: '0.6',
          jumlahKeperluan: '5',
          hargaManual: '20000',
        },
      ];

      const payload = buildDraftPayload(formData, items);

      expect(payload.items[0].panjangJadi).toBe(600);
      expect(payload.items[0].jumlahKeperluan).toBe(5);
      expect(payload.items[0].hargaManual).toBe(20000);
      expect(payload.items[0].subtotal).toBe(100000);
      expect(payload.totalEstimasi).toBe(100000);
    });
  });
});
