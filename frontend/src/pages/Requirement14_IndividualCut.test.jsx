import { calculateWithWasteReuse } from '../utils/calculationEngine.js';

describe('Requirement 14: Individual Cuts (Revision #4)', () => {

  const dummyBarangList = [
    {
      id: 1,
      nama: 'Besi Hollow 6M',
      jenisBentuk: 'balok',
      panjang: 6000,
      hargamodal: 100000,
      satuanHargaModal: 'batang'
    }
  ];

  test('0.8 M x 1 Bh -> 1 individual cut (DB Item)', () => {
    const item = {
      barangId: 1,
      panjangJadi: 800,
      jumlahKeperluan: 1,
    };

    const res = calculateWithWasteReuse([item], 0, dummyBarangList);
    const breakdown = res.itemDetails[0].breakdown;
    
    expect(breakdown.individualCuts.length).toBe(1);
    expect(breakdown.individualCuts[0].length).toBe(800);
    expect(breakdown.individualCuts[0].sisaSetelahCutting).toBe(5200);
    expect(breakdown.panjangRealTerpakai).toBe(800);
  });

  test('0.8 M x 5 Bh -> 5 individual cuts (DB Item)', () => {
    const item = {
      barangId: 1,
      panjangJadi: 800,
      jumlahKeperluan: 5,
    };

    const res = calculateWithWasteReuse([item], 0, dummyBarangList);
    const breakdown = res.itemDetails[0].breakdown;
    
    expect(breakdown.individualCuts.length).toBe(5);
    expect(breakdown.individualCuts.every(c => c.length === 800)).toBe(true);
    expect(breakdown.individualCuts[4].sisaSetelahCutting).toBe(2000);
    expect(breakdown.panjangRealTerpakai).toBe(4000);
  });

  test('2.0 M x 3 Bh -> 3 individual cuts (DB Item)', () => {
    const item = {
      barangId: 1,
      panjangJadi: 2000,
      jumlahKeperluan: 3,
    };

    const res = calculateWithWasteReuse([item], 0, dummyBarangList);
    const breakdown = res.itemDetails[0].breakdown;
    
    expect(breakdown.individualCuts.length).toBe(3);
    expect(breakdown.individualCuts.every(c => c.length === 2000)).toBe(true);
    expect(breakdown.individualCuts[2].sisaSetelahCutting).toBe(0);
    expect(breakdown.panjangRealTerpakai).toBe(6000);
  });

  test('Manual Item: 0.8 M x 5 Bh -> 5 individual cuts', () => {
    const manualItem = {
      barangId: '__manual__',
      namaManual: 'Hollow Manual',
      jenisBentukManual: 'balok',
      panjangManual: 6000,
      panjangJadi: 800,
      jumlahKeperluan: 5,
      hargamodalManual: 100000,
      satuanHargaModalManual: 'batang',
    };

    const res = calculateWithWasteReuse([manualItem], 0, dummyBarangList);
    const breakdown = res.itemDetails[0].breakdown;
    
    expect(breakdown.individualCuts.length).toBe(5);
    expect(breakdown.individualCuts.every(c => c.length === 800)).toBe(true);
  });
});
