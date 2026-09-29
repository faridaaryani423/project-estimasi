import { calculateWithWasteReuse, getBilledBarPrice, getFullBarPrice } from '../utils/calculationEngine';

describe('Requirement 17: Harga Real quarter billing and Harga + Waste full-bar billing', () => {
  const dummyBarangList = [
    {
      id: 'barang_1',
      nama: 'Besi 6M',
      jenisBentuk: 'balok',
      panjang: 6000,
      lebar: 10,
      tinggi: 10,
      beratJenis: 7850,
      minWelding: 50,
      hargamodal: 230000,
      satuanHargaModal: 'batang'
    }
  ];

  const calculateForLength = (length) => {
    return calculateWithWasteReuse([
      {
        barangId: 'barang_1',
        kodeItem: 'A',
        panjangJadi: length,
        jumlahKeperluan: 1,
      }
    ], 0, dummyBarangList).itemDetails[0].breakdown.summary;
  };

  test('1000 / 6000 -> Harga Real 1/4, Harga + Waste 1 batang', () => {
    const summary = calculateForLength(1000);
    expect(summary.totalHargaReal).toBe(57500);
    expect(summary.totalHargaPlusWaste).toBe(230000);
  });

  test('2000 / 6000 -> Harga Real 1/2, Harga + Waste 1 batang', () => {
    const summary = calculateForLength(2000);
    expect(summary.totalHargaReal).toBe(115000);
    expect(summary.totalHargaPlusWaste).toBe(230000);
  });

  test('3000 / 6000 -> Harga Real 1/2, Harga + Waste 1 batang', () => {
    const summary = calculateForLength(3000);
    expect(summary.totalHargaReal).toBe(115000);
    expect(summary.totalHargaPlusWaste).toBe(230000);
  });

  test('3750 / 6000 -> Harga Real 3/4, Harga + Waste 1 batang', () => {
    const summary = calculateForLength(3750);
    expect(summary.totalHargaReal).toBe(172500);
    expect(summary.totalHargaPlusWaste).toBe(230000);
    const result = calculateWithWasteReuse([{barangId: 'barang_1', kodeItem: 'A', panjangJadi: 3750, jumlahKeperluan: 1}], 0, dummyBarangList);
    expect(result.itemDetails[0].subtotal).toBe(230000);
    expect(result.totalEstimasi).toBe(230000);
  });

  test('4500 / 6000 -> Harga Real 3/4, Harga + Waste 1 batang', () => {
    const summary = calculateForLength(4500);
    expect(summary.totalHargaReal).toBe(172500);
    expect(summary.totalHargaPlusWaste).toBe(230000);
    const result = calculateWithWasteReuse([{barangId: 'barang_1', kodeItem: 'A', panjangJadi: 3750, jumlahKeperluan: 1}], 0, dummyBarangList);
    expect(result.itemDetails[0].subtotal).toBe(230000);
    expect(result.totalEstimasi).toBe(230000);
  });

  test('5000 / 6000 -> Harga Real 1, Harga + Waste 1 batang', () => {
    const summary = calculateForLength(5000);
    expect(summary.totalHargaReal).toBe(230000);
    expect(summary.totalHargaPlusWaste).toBe(230000);
  });

  test('6000 / 6000 -> Harga Real 1, Harga + Waste 1 batang', () => {
    const summary = calculateForLength(6000);
    expect(summary.totalHargaReal).toBe(230000);
    expect(summary.totalHargaPlusWaste).toBe(230000);
  });

  test('Harga material aktual Rp324.000 memakai quarter rounding', () => {
    const barangList = [{
      ...dummyBarangList[0],
      nama: 'Pipa Kotak 50 x 50 x 2 mm',
      hargamodal: 324000,
      panjang: 6000,
    }];

    const calculateForActualPrice = (length) => calculateWithWasteReuse([
      { barangId: 'barang_1', panjangJadi: length, jumlahKeperluan: 1 },
    ], 0, barangList).itemDetails[0].breakdown.summary.totalHargaPlusWaste;

    expect([1000, 2000, 3000, 4000, 5000, 6000].map(calculateForActualPrice))
      .toEqual([324000, 324000, 324000, 324000, 324000, 324000]);
  });

  test('A=4000 + B=1500 pada satu batang -> Harga + Waste = Rp230.000 (100% dari 1 bar)', () => {
    const result = calculateWithWasteReuse([
      {
        barangId: 'barang_1',
        kodeItem: 'A',
        panjangJadi: 4000,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'barang_1',
        kodeItem: 'B',
        panjangJadi: 1500,
        jumlahKeperluan: 1,
      }
    ], 0, dummyBarangList);

    const summary = result.itemDetails[0].breakdown.summary;
    // Total usage is 5500. 5500 / 6000 = 91.67% -> bills at 100% -> Rp230.000
    expect(summary.totalBars).toBe(1);
    expect(summary.totalHargaPlusWaste).toBe(230000);

    const detailA = result.itemDetails.find(i => i.kodeItem === 'A');
    const detailB = result.itemDetails.find(i => i.kodeItem === 'B');
    
    // Subtotal material (Harga + Waste) for both items should sum to exactly 230000
    const totalSubtotalMaterial = detailA.subtotalMaterial + detailB.subtotalMaterial;
    expect(totalSubtotalMaterial).toBe(230000);
  });

  test('Acceptance Hegar: Pipa Hitam 6M, 134M total usage -> 22.5 real bars and 23 full bars', () => {
    const barangList = [{
      id: 'pipa-hitam-4-6',
      nama: 'Pipa Hitam Ø 4” X 6 mm',
      jenisBentuk: 'balok',
      panjang: 6000,
      beratbatang: 96,
      hargamodal: 1440000,
      satuanHargaModal: 'batang',
      minWelding: 1,
    }];
    const result = calculateWithWasteReuse([
      { barangId: 'pipa-hitam-4-6', kodeItem: 'Rafter2R', panjangJadi: 18000, jumlahKeperluan: 5 },
      { barangId: 'pipa-hitam-4-6', kodeItem: 'Rafter2R', panjangJadi: 12000, jumlahKeperluan: 1 },
      { barangId: 'pipa-hitam-4-6', kodeItem: 'Rafter2R', panjangJadi: 8000, jumlahKeperluan: 4 },
    ], 0, barangList);
    const summary = result.itemDetails[0].breakdown.summary;

    expect(summary.totalBars).toBe(23);
    expect(summary.totalHargaReal).toBe(32400000);
    expect(summary.totalHargaPlusWaste).toBe(33120000);
    expect(summary.totalBeratReal).toBe(2144);
    expect(summary.totalBeratWaste).toBe(64);
    expect(summary.totalWasteLength).toBe(4000);

    const bars = result.itemDetails[0].breakdown.barAllocations;
    const pdfHargaReal = bars.reduce(
      (sum, bar) => sum + getBilledBarPrice(bar.panjangTerpakai, summary.stockLength, summary.hargaSatuan),
      0
    );
    const pdfHargaPlusWaste = bars.reduce(
      (sum) => sum + getFullBarPrice(summary.hargaSatuan),
      0
    );
    expect(pdfHargaReal).toBe(summary.totalHargaReal);
    expect(pdfHargaPlusWaste).toBe(summary.totalHargaPlusWaste);
  });

  test('Regression for Revision #5: Global leftover reuse still works (Individual Cuts have sourceType and sourceBar)', () => {
    const result = calculateWithWasteReuse([
      {
        barangId: 'barang_1',
        kodeItem: 'A',
        panjangJadi: 4000,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'barang_1',
        kodeItem: 'B',
        panjangJadi: 1500,
        jumlahKeperluan: 1,
      }
    ], 0, dummyBarangList);

    const individualCuts = result.itemDetails[0].breakdown.individualCuts;
    expect(individualCuts.length).toBe(2);
    
    const sortedCuts = [...individualCuts].sort((a,b) => b.length - a.length);
    expect(sortedCuts[0].length).toBe(4000);
    expect(sortedCuts[0].sourceType).toBe('new_bar');
    
    expect(sortedCuts[1].length).toBe(1500);
    expect(sortedCuts[1].sourceType).toBe('leftover');
    expect(sortedCuts[1].sourceBar).toBe(sortedCuts[0].sourceBar);
  });
});
