import { calculateWithWasteReuse } from '../utils/calculationEngine';

describe('Requirement 17: Harga + Waste calculation (Fractional Billing)', () => {
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

  test('1000 / 6000 -> 1/4 -> Rp57.500', () => {
    const summary = calculateForLength(1000);
    expect(summary.totalHargaPlusWaste).toBe(57500);
  });

  test('2000 / 6000 -> 1/2 -> Rp115.000', () => {
    const summary = calculateForLength(2000);
    expect(summary.totalHargaPlusWaste).toBe(115000);
  });

  test('3000 / 6000 -> 1/2 -> Rp115.000', () => {
    const summary = calculateForLength(3000);
    expect(summary.totalHargaPlusWaste).toBe(115000);
  });

  test('3750 / 6000 -> 3/4 -> Rp172.500', () => {
    const summary = calculateForLength(3750);
    expect(summary.totalHargaPlusWaste).toBe(172500);
    const result = calculateWithWasteReuse([{barangId: 'barang_1', kodeItem: 'A', panjangJadi: 3750, jumlahKeperluan: 1}], 0, dummyBarangList);
    expect(result.itemDetails[0].subtotal).toBe(172500);
    expect(result.totalEstimasi).toBe(172500);
    // Harga Real wajib tetap tidak berubah (linear)
    expect(summary.totalHargaReal).toBe(143750);
  });

  test('4500 / 6000 -> 3/4 -> Rp172.500', () => {
    const summary = calculateForLength(4500);
    expect(summary.totalHargaPlusWaste).toBe(172500);
    const result = calculateWithWasteReuse([{barangId: 'barang_1', kodeItem: 'A', panjangJadi: 3750, jumlahKeperluan: 1}], 0, dummyBarangList);
    expect(result.itemDetails[0].subtotal).toBe(172500);
    expect(result.totalEstimasi).toBe(172500);
  });

  test('5000 / 6000 -> 1 -> Rp230.000', () => {
    const summary = calculateForLength(5000);
    expect(summary.totalHargaPlusWaste).toBe(230000);
  });

  test('6000 / 6000 -> 1 -> Rp230.000', () => {
    const summary = calculateForLength(6000);
    expect(summary.totalHargaPlusWaste).toBe(230000);
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
