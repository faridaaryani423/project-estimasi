import { calculateWithWasteReuse } from '../utils/calculationEngine';

describe('Global Waste Reuse per Material Group', () => {
  const dummyBaja = {
    id: 'baja_1',
    nama: 'Baja 6M',
    jenisBentuk: 'balok',
    panjang: 6000,
    lebar: 10,
    tinggi: 10,
    beratJenis: 7850,
    minWelding: 50,
    hargamodal: 100000,
  };

  const dummyStainless = {
    id: 'st_1',
    nama: 'Stainless 6M',
    jenisBentuk: 'balok',
    panjang: 6000,
    lebar: 10,
    tinggi: 10,
    beratJenis: 7850,
    minWelding: 50,
    hargamodal: 200000,
  };

  const dummyHollow40 = {
    id: 'h40',
    nama: 'Hollow 40x40',
    jenisBentuk: 'balok',
    panjang: 6000,
    lebar: 40,
    tinggi: 40,
    ketebalan: 2,
    beratJenis: 7850,
    minWelding: 50,
    hargamodal: 150000,
  };

  const dummyHollow50 = {
    id: 'h50',
    nama: 'Hollow 50x50',
    jenisBentuk: 'balok',
    panjang: 6000,
    lebar: 50,
    tinggi: 50,
    ketebalan: 2,
    beratJenis: 7850,
    minWelding: 50,
    hargamodal: 180000,
  };

  const barangList = [dummyBaja, dummyStainless, dummyHollow40, dummyHollow50];

  test('Test 1 — leftover digunakan: A=4000, B=1500 -> 1 Batang', () => {
    const validItems = [
      {
        barangId: 'baja_1',
        kodeItem: 'A',
        panjangJadi: 4000,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'baja_1',
        kodeItem: 'B',
        panjangJadi: 1500,
        jumlahKeperluan: 1,
      },
    ];

    const result = calculateWithWasteReuse(validItems, 0, barangList);
    const itemA = result.itemDetails.find((i) => i.kodeItem === 'A');
    const itemB = result.itemDetails.find((i) => i.kodeItem === 'B');

    // Both should use the same group / same allocation result logically, but since they are merged in calculateWithWasteReuse, let's check the details:
    const barAllocations = itemA.breakdown.barAllocations;
    expect(barAllocations.length).toBe(1);
    expect(barAllocations[0].sisa).toBe(500); // 6000 - 4000 - 1500 = 500

    const individualCuts = itemA.breakdown.individualCuts;
    expect(individualCuts.length).toBe(2);
    
    // Sort to match BFD order (4000 then 1500)
    const cuts = [...individualCuts].sort((a,b) => b.length - a.length);
    expect(cuts[0].length).toBe(4000);
    expect(cuts[0].sourceType).toBe('new_bar');
    expect(cuts[0].sourceBar).toBe(1);
    
    expect(cuts[1].length).toBe(1500);
    expect(cuts[1].sourceType).toBe('leftover');
    expect(cuts[1].sourceBar).toBe(1);
  });

  test('Test 2 — leftover tidak cukup: A=5000, B=2000 -> 2 Batang', () => {
    const validItems = [
      {
        barangId: 'baja_1',
        kodeItem: 'A',
        panjangJadi: 5000,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'baja_1',
        kodeItem: 'B',
        panjangJadi: 2000,
        jumlahKeperluan: 1,
      },
    ];

    const result = calculateWithWasteReuse(validItems, 0, barangList);
    const itemA = result.itemDetails.find((i) => i.kodeItem === 'A');
    
    const barAllocations = itemA.breakdown.barAllocations;
    expect(barAllocations.length).toBe(2);
    
    // Check remaining of the two bars: one should have 1000, the other 4000
    const sisa = barAllocations.map(b => b.sisa).sort((a,b) => a-b);
    expect(sisa).toEqual([1000, 4000]);
  });

  test('Test 3 — material berbeda (Baja vs Stainless)', () => {
    const validItems = [
      {
        barangId: 'baja_1', // Leftover 2000
        kodeItem: 'Baja',
        panjangJadi: 4000,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'st_1', // Butuh 1500
        kodeItem: 'Stainless',
        panjangJadi: 1500,
        jumlahKeperluan: 1,
      },
    ];

    const result = calculateWithWasteReuse(validItems, 0, barangList);
    const bajaDetail = result.itemDetails.find((i) => i.kodeItem === 'Baja');
    const stDetail = result.itemDetails.find((i) => i.kodeItem === 'Stainless');
    
    expect(bajaDetail.breakdown.barAllocations.length).toBe(1);
    expect(bajaDetail.breakdown.barAllocations[0].sisa).toBe(2000);

    expect(stDetail.breakdown.barAllocations.length).toBe(1);
    expect(stDetail.breakdown.barAllocations[0].sisa).toBe(4500);
  });

  test('Test 4 — spesifikasi berbeda (Hollow 40 vs Hollow 50)', () => {
    const validItems = [
      {
        barangId: 'h40', // Leftover 2000
        kodeItem: 'A',
        panjangJadi: 4000,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'h50', // Butuh 1500
        kodeItem: 'B',
        panjangJadi: 1500,
        jumlahKeperluan: 1,
      },
    ];

    const result = calculateWithWasteReuse(validItems, 0, barangList);
    const h40 = result.itemDetails.find((i) => i.kodeItem === 'A');
    const h50 = result.itemDetails.find((i) => i.kodeItem === 'B');
    
    expect(h40.breakdown.barAllocations.length).toBe(1);
    expect(h40.breakdown.barAllocations[0].sisa).toBe(2000);

    expect(h50.breakdown.barAllocations.length).toBe(1);
    expect(h50.breakdown.barAllocations[0].sisa).toBe(4500);
  });

  test('Test 5 — beberapa cut menggunakan leftover yang sama', () => {
    const validItems = [
      {
        barangId: 'baja_1',
        kodeItem: 'Init',
        panjangJadi: 3000,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'baja_1',
        kodeItem: 'A',
        panjangJadi: 1000,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'baja_1',
        kodeItem: 'B',
        panjangJadi: 1500,
        jumlahKeperluan: 1,
      },
      {
        barangId: 'baja_1',
        kodeItem: 'C',
        panjangJadi: 500,
        jumlahKeperluan: 1,
      },
    ];

    const result = calculateWithWasteReuse(validItems, 0, barangList);
    const firstDetail = result.itemDetails[0];
    
    const individualCuts = firstDetail.breakdown.individualCuts;
    
    expect(firstDetail.breakdown.barAllocations.length).toBe(1);
    expect(firstDetail.breakdown.barAllocations[0].sisa).toBe(0);

    // Cuts remaining lengths should be 3000, 2000, 500, 0
    // Based on length sorted BFD, the order of cuts might be 3000, 1500, 1000, 500
    // so remaining: 3000 -> 1500 -> 500 -> 0.
    const sisaCuts = individualCuts.map(c => c.sisaSetelahCutting);
    expect(sisaCuts).toContain(0);
    expect(sisaCuts).toContain(500);
  });
});
