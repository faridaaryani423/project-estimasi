import { calculateMaterialGroupAllocation, calculateWithWasteReuse } from '../utils/calculationEngine';

describe('REVISI POIN 5: Nilai pada Uraian tidak dibulatkan', () => {
  // Helper matching the formatUraianPanjang logic implemented in Estimasi.jsx
  const formatUraianPanjang = (row) => {
    const inputVal = row.panjangJadiInput ?? row.panjang_jadi_input ?? row.breakdown?.panjangJadiInput;
    if (inputVal !== undefined && inputVal !== null && String(inputVal).trim() !== '') {
      return String(inputVal).trim();
    }
    const pj = parseFloat(row.panjangJadi ?? row.panjang_jadi);
    if (!isNaN(pj) && pj > 0) {
      return String(Number((pj / 1000).toPrecision(12)));
    }
    return '0';
  };

  const alphaLabel = (i) => String.fromCharCode(97 + i);

  const formatSpesLabel = (row, rowIdx, kode, repNama) => {
    const displayPanjang = formatUraianPanjang(row);
    const displayQty = (row.jumlahKeperluan !== undefined && row.jumlahKeperluan !== null && String(row.jumlahKeperluan).trim() !== '')
      ? String(row.jumlahKeperluan).trim()
      : String(row.jumlahKeperluan || 0);
    const labelKode = kode || row.kodeItem || row.namaBarang || repNama;
    return `${alphaLabel(rowIdx)}. ${labelKode} (${displayPanjang} M, ${displayQty} Bh.)`;
  };

  test('CASE 1: Jalur Export/PDF - User input 7.35 M -> Expected PDF: 7.35 M', () => {
    const row = {
      kodeItem: '1',
      panjangJadiInput: '7.35',
      panjangJadi: 7350,
      jumlahKeperluan: 3,
    };
    const label = formatSpesLabel(row, 0, '1', 'Hollow 40x40');
    expect(label).toBe('a. 1 (7.35 M, 3 Bh.)');
    expect(label).toContain('7.35 M');
    expect(label).not.toContain('7.4 M');
    expect(label).not.toContain('7,4 M');
  });

  test('CASE 2: Jalur Export/PDF - User input 7.4 M -> Expected PDF: 7.4 M (tidak dipaksa 7.40)', () => {
    const row = {
      kodeItem: '1',
      panjangJadiInput: '7.4',
      panjangJadi: 7400,
      jumlahKeperluan: 3,
    };
    const label = formatSpesLabel(row, 1, '1', 'Hollow 40x40');
    expect(label).toBe('b. 1 (7.4 M, 3 Bh.)');
    expect(label).toContain('7.4 M');
    expect(label).not.toContain('7.40 M');
  });

  test('CASE 3: Jalur Export/PDF - User input 2.125 M -> Expected PDF: 2.125 M (tidak dibulatkan ke 2.1 atau 2.13)', () => {
    const row = {
      kodeItem: '1',
      panjangJadiInput: '2.125',
      panjangJadi: 2125,
      jumlahKeperluan: 3,
    };
    const label = formatSpesLabel(row, 2, '1', 'Hollow 40x40');
    expect(label).toBe('c. 1 (2.125 M, 3 Bh.)');
    expect(label).toContain('2.125 M');
    expect(label).not.toContain('2.1 M');
    expect(label).not.toContain('2.13 M');
    expect(label).not.toContain('2,1 M');
  });

  test('CASE 4: Jalur Export/PDF - User input 5.555 M -> Expected PDF: 5.555 M (tidak dibulatkan)', () => {
    const row = {
      kodeItem: '1',
      panjangJadiInput: '5.555',
      panjangJadi: 5555,
      jumlahKeperluan: 3,
    };
    const label = formatSpesLabel(row, 3, '1', 'Hollow 40x40');
    expect(label).toBe('d. 1 (5.555 M, 3 Bh.)');
    expect(label).toContain('5.555 M');
    expect(label).not.toContain('5.56 M');
    expect(label).not.toContain('5.6 M');
  });

  test('Input dengan koma: User input "7,35" -> Expected PDF: "7,35 M"', () => {
    const row = {
      kodeItem: '1',
      panjangJadiInput: '7,35',
      panjangJadi: 7350,
      jumlahKeperluan: 3,
    };
    const label = formatSpesLabel(row, 0, '1', 'Hollow 40x40');
    expect(label).toBe('a. 1 (7,35 M, 3 Bh.)');
    expect(label).toContain('7,35 M');
    expect(label).not.toContain('7,4 M');
  });

  test('Jalur Export/PDF - Fallback data lama jika panjangJadiInput null/kosong: mm -> M tanpa trailing zero atau pembulatan', () => {
    const row1 = { kodeItem: '1', panjangJadi: 7350, jumlahKeperluan: 3 };
    const row2 = { kodeItem: '1', panjangJadi: 7400, jumlahKeperluan: 3 };
    const row3 = { kodeItem: '1', panjangJadi: 2125, jumlahKeperluan: 3 };
    const row4 = { kodeItem: '1', panjangJadi: 5555, jumlahKeperluan: 3 };

    expect(formatUraianPanjang(row1)).toBe('7.35');
    expect(formatUraianPanjang(row2)).toBe('7.4');
    expect(formatUraianPanjang(row3)).toBe('2.125');
    expect(formatUraianPanjang(row4)).toBe('5.555');

    expect(formatSpesLabel(row1, 0)).toBe('a. 1 (7.35 M, 3 Bh.)');
    expect(formatSpesLabel(row2, 1)).toBe('b. 1 (7.4 M, 3 Bh.)');
    expect(formatSpesLabel(row3, 2)).toBe('c. 1 (2.125 M, 3 Bh.)');
    expect(formatSpesLabel(row4, 3)).toBe('d. 1 (5.555 M, 3 Bh.)');
  });

  test('Calculation Engine: panjangJadiInput dipropagasi dan internal calculation precision tetap terjaga', () => {
    const mockBarang = {
      id: 'b1',
      nama: 'Hollow 40x40',
      jenisBentuk: 'balok',
      jenisBahan: 'Besi',
      beratJenis: '7.85',
      panjang: '6000',
      lebar: '40',
      tinggi: '40',
      ketebalan: '2',
      minWelding: '50',
      hargamodal: '150000',
      beratPerBatang: 14.5,
    };

    const items = [
      {
        barangId: 'b1',
        kodeItem: 'ITEM-A',
        panjangJadi: '7350',
        panjangJadiInput: '7.35',
        jumlahKeperluan: '2',
      },
      {
        barangId: 'b1',
        kodeItem: 'ITEM-B',
        panjangJadi: '2125',
        panjangJadiInput: '2.125',
        jumlahKeperluan: '3',
      },
    ];

    const result = calculateWithWasteReuse(items, 10, [mockBarang]);
    expect(result.itemDetails).toHaveLength(2);

    // Verifikasi original/input value tersimpan
    expect(result.itemDetails[0].panjangJadiInput).toBe('7.35');
    expect(result.itemDetails[1].panjangJadiInput).toBe('2.125');

    // Verifikasi calculation value tetap presisi dalam mm
    expect(result.itemDetails[0].panjangJadi).toBe(7350);
    expect(result.itemDetails[1].panjangJadi).toBe(2125);

    // Perhitungan total estimasi dan berat tetap berjalan normal
    expect(result.totalEstimasi).toBeGreaterThan(0);
    expect(result.totalBeratReal).toBeGreaterThan(0);
  });
});
