import { calculateWithWasteReuse } from '../utils/calculationEngine';

describe('Requirement 16: Harga Real calculation', () => {
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

  test('6000 mm, price 230000, usage 3750 mm -> Rp143.750', () => {
    const validItems = [
      {
        barangId: 'barang_1',
        kodeItem: 'A',
        panjangJadi: 3750,
        jumlahKeperluan: 1,
      }
    ];

    const result = calculateWithWasteReuse(validItems, 0, dummyBarangList);
    const detail = result.itemDetails[0];
    
    // Check global summary if needed, but item breakdown should have it too
    // subtotalMaterialPemakaian represents the usage-based cost (Harga Real)
    expect(detail.breakdown.summary.totalHargaReal).toBe(143750);
    expect(detail.subtotalMaterialPemakaian).toBe(143750);
  });

  test('6000 mm, price 230000, usage 3000 mm -> Rp115.000', () => {
    const validItems = [
      {
        barangId: 'barang_1',
        kodeItem: 'A',
        panjangJadi: 3000,
        jumlahKeperluan: 1,
      }
    ];

    const result = calculateWithWasteReuse(validItems, 0, dummyBarangList);
    const detail = result.itemDetails[0];
    
    expect(detail.breakdown.summary.totalHargaReal).toBe(115000);
    expect(detail.subtotalMaterialPemakaian).toBe(115000);
  });

  test('A=4000 + B=1500 dari satu stock 6000 -> Harga Real berdasarkan 5500/6000', () => {
    const validItems = [
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
    ];

    const result = calculateWithWasteReuse(validItems, 0, dummyBarangList);
    
    // total usage = 5500. 5500/6000 * 230000 = 210833.33 -> rounded to 210833
    const expectedTotal = Math.round((5500 / 6000) * 230000);
    
    const detailA = result.itemDetails.find(i => i.kodeItem === 'A');
    // They share the same breakdown summary
    expect(detailA.breakdown.summary.totalHargaReal).toBeCloseTo(expectedTotal, 0);

    // Summing their individual usages should match the total
    const totalSubtotal = result.itemDetails.reduce((sum, item) => sum + item.subtotalMaterialPemakaian, 0);
    expect(totalSubtotal).toBeCloseTo(expectedTotal, 0);

    // B yang menggunakan leftover tidak dianggap membeli batang baru:
    // So totalBars should be 1
    expect(detailA.breakdown.summary.totalBars).toBe(1);
    
    // Total cost shouldn't be 2 * 230000
    expect(detailA.breakdown.summary.totalHargaReal).not.toBe(460000);
  });
});
