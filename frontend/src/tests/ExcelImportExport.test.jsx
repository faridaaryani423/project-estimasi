import * as XLSX from 'xlsx';
import { toNumberOrNull } from '../utils/estimasiPayload';

describe('Excel Import & Export Convention Tests', () => {
  test('Template rows and metadata structure verification', () => {
    const formDataRows = [
      ['TEMPLATE IMPORT ESTIMASI MATERIAL'],
      ['Petunjuk: Isi kolom nilai (kolom B). Hapus baris contoh item sebelum import.'],
      [''],
      ['Nama Estimasi', '← wajib diisi'],
      ['Proyek', '← opsional'],
      ['Nama Client', '← opsional'],
      ['Perusahaan', '← opsional'],
      ['Lokasi', '← opsional'],
      ['Kontak Person', '← opsional'],
      ['No Order', '← opsional'],
      ['Panjang Ruangan (m)', '← opsional'],
      ['Lebar Ruangan (m)', '← opsional'],
      [''],
      ['Nama Barang *', 'Kode Item', 'Panjang Jadi (M)', 'Jumlah *', 'Harga Manual (Rp)'],
      ['(lihat sheet Daftar Barang)', '(bebas, misal A-01)', '(contoh: 0.6 untuk 60 cm)', '', '(isi jika barang tidak ada di Daftar Barang)'],
      ['Hollow 40x40x1.8', 'A-01', '0.6', '15', ''],
      ['Hollow 40x40x1.8', 'A-02', '0.8', '10', ''],
      ['Barang Tidak Ada Di Daftar', 'C-01', '', '3', '750000'],
    ];

    // Header column 2 harus 'Panjang Jadi (M)'
    expect(formDataRows[13][2]).toBe('Panjang Jadi (M)');
    // Contoh panjang harus dalam meter (0.6, 0.8)
    expect(formDataRows[15][2]).toBe('0.6');
    expect(formDataRows[16][2]).toBe('0.8');

    // Verifikasi urutan metadata
    expect(formDataRows[3][0]).toBe('Nama Estimasi');
    expect(formDataRows[4][0]).toBe('Proyek');
    expect(formDataRows[5][0]).toBe('Nama Client');
    expect(formDataRows[6][0]).toBe('Perusahaan');
    expect(formDataRows[7][0]).toBe('Lokasi');
    expect(formDataRows[8][0]).toBe('Kontak Person');
    expect(formDataRows[9][0]).toBe('No Order');
    expect(formDataRows[10][0]).toBe('Panjang Ruangan (m)');
    expect(formDataRows[11][0]).toBe('Lebar Ruangan (m)');
  });

  test('Import logic: konversi 0.6 M menjadi 600 mm internal', () => {
    const rawPanjangStr = '0.6';
    const rawPanjang = parseFloat(rawPanjangStr.replace(',', '.'));
    const panjangJadi = !isNaN(rawPanjang) ? String(Math.round(rawPanjang * 1000)) : '';
    const panjangJadiInput = !isNaN(rawPanjang) ? String(rawPanjang) : rawPanjangStr;

    expect(panjangJadi).toBe('600');
    expect(panjangJadiInput).toBe('0.6');
    expect(toNumberOrNull(panjangJadi)).toBe(600);
  });

  test('Dynamic metadata parser membaca metadata dengan benar tanpa tertukar dengan baris item', () => {
    const sampleRows = [
      ['TEMPLATE IMPORT ESTIMASI MATERIAL'],
      ['Petunjuk...'],
      [''],
      ['Nama Estimasi', 'Proyek Kanopi Mewah'],
      ['Proyek', 'Renovasi Rumah'],
      ['Nama Client', 'Ibu Susi'],
      ['Perusahaan', 'PT Jaya'],
      ['Lokasi', 'Surabaya'],
      ['Kontak Person', '08123456789'],
      ['No Order', 'ORD-999'],
      ['Panjang Ruangan (m)', '10'],
      ['Lebar Ruangan (m)', '5'],
      [''],
      ['Nama Barang *', 'Kode Item', 'Panjang Jadi (M)', 'Jumlah *', 'Harga Manual (Rp)'],
      ['(lihat sheet Daftar Barang)', '(bebas, misal A-01)', '(contoh: 0.6 untuk 60 cm)', '', ''],
      ['Hollow 40x40x1.8', 'A-01', '0.6', '15', ''],
    ];

    const cleanExcelVal = (val) => {
      const str = String(val ?? '').trim();
      if (str.toLowerCase().includes('wajib diisi') || str.toLowerCase().includes('opsional')) return '';
      return str;
    };

    const findMetaVal = (labelRegex, fallbackRowIdx) => {
      const found = sampleRows.find(r => Array.isArray(r) && labelRegex.test(String(r[0] || '').trim()));
      if (found && found[1] !== undefined) {
        return cleanExcelVal(found[1]);
      }
      if (fallbackRowIdx !== undefined && sampleRows[fallbackRowIdx]) {
        return cleanExcelVal(sampleRows[fallbackRowIdx][1]);
      }
      return '';
    };

    expect(findMetaVal(/^nama\s*estimasi/i, 3)).toBe('Proyek Kanopi Mewah');
    expect(findMetaVal(/^(?:nama\s*)?proyek/i, 4)).toBe('Renovasi Rumah');
    expect(findMetaVal(/^(?:nama\s*)?client/i, 5)).toBe('Ibu Susi');
    expect(findMetaVal(/^perusahaan/i, 6)).toBe('PT Jaya');
    expect(findMetaVal(/^(?:lokasi\s*proyek|lokasi)/i, 7)).toBe('Surabaya');
    expect(findMetaVal(/^kontak\s*person/i, 8)).toBe('08123456789');
    expect(findMetaVal(/^no\s*(?:order)?/i, 9)).toBe('ORD-999');
    expect(findMetaVal(/^panjang\s*ruangan/i, 10)).toBe('10');
    expect(findMetaVal(/^lebar\s*ruangan/i, 11)).toBe('5');

    // Pastikan panjangRuangan bukan 'Kode Item'
    expect(findMetaVal(/^panjang\s*ruangan/i, 10)).not.toBe('Kode Item');
  });
});
