import { calculateMaterialGroupAllocation } from '../utils/calculationEngine';

describe('Requirement 20: Pola Kolom Potongan Sesuai Hitungan Breakdown Hegar', () => {
  const fmtDec = (val, maxDigits = 2) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    const num = Number(val);
    if (Math.abs(num) < 0.000001) return '-';
    return num.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDigits,
    });
  };

  const formatPotonganStr = (pieces) => {
    return pieces.map((p, pIdx) => {
      const lbl = p.kodeItem || p.label || 'Item';
      const pM = fmtDec((p.length || 0) / 1000, 3);
      return pIdx === 0 ? `${lbl}.(${pM})` : `${lbl} (${pM})`;
    }).join(' ');
  };

  it('1. Memvalidasi format potongan tunggal penuh (6m) -> Nama.(6)', () => {
    const pieces = [{ kodeItem: 'Rafter1R', length: 6000 }];
    expect(formatPotonganStr(pieces)).toBe('Rafter1R.(6)');
  });

  it('2. Memvalidasi format potongan kombinasi 2 item -> Nama1.(P1) Nama2 (P2)', () => {
    const p1 = [{ kodeItem: 'RLantaiR', length: 5000 }, { kodeItem: 'Gordeng1R', length: 1000 }];
    expect(formatPotonganStr(p1)).toBe('RLantaiR.(5) Gordeng1R (1)');

    const p2 = [{ kodeItem: 'RLantai', length: 4950 }, { kodeItem: 'Rafter1R', length: 1000 }];
    expect(formatPotonganStr(p2)).toBe('RLantai.(4,95) Rafter1R (1)');

    const p3 = [{ kodeItem: 'RLantai', length: 4950 }, { kodeItem: 'RLantai', length: 910 }];
    expect(formatPotonganStr(p3)).toBe('RLantai.(4,95) RLantai (0,91)');

    const p4 = [{ kodeItem: 'Gordeng1R', length: 4000 }, { kodeItem: 'RLantai', length: 1550 }];
    expect(formatPotonganStr(p4)).toBe('Gordeng1R.(4) RLantai (1,55)');

    const p5 = [{ kodeItem: 'T', length: 3500 }, { kodeItem: 'RLantai', length: 2500 }];
    expect(formatPotonganStr(p5)).toBe('T.(3,5) RLantai (2,5)');
  });

  it('3. Memvalidasi format potongan berulang dari item yang sama -> Rafter2R.(2) Rafter2R (2) Rafter2R (2)', () => {
    const pieces = [
      { kodeItem: 'Rafter2R', length: 2000 },
      { kodeItem: 'Rafter2R', length: 2000 },
      { kodeItem: 'Rafter2R', length: 2000 },
    ];
    expect(formatPotonganStr(pieces)).toBe('Rafter2R.(2) Rafter2R (2) Rafter2R (2)');
  });

  it('4. Memvalidasi format potongan tunggal dengan sisa -> T.(3,5) dan TR.(3,2)', () => {
    expect(formatPotonganStr([{ kodeItem: 'T', length: 3500 }])).toBe('T.(3,5)');
    expect(formatPotonganStr([{ kodeItem: 'TR', length: 3200 }])).toBe('TR.(3,2)');
  });

  it('5. Memvalidasi simulasi 22 item Group 1 Hitungan Breakdown menghasilkan 90 batang dan pola yang persis', () => {
    const rawGroup1Items = [
      { kodeItem: 'Rafter1R', panjangJadi: 24000, jumlahKeperluan: 6 },
      { kodeItem: 'Rafter1R', panjangJadi: 19000, jumlahKeperluan: 2 },
      { kodeItem: 'Gordeng1R', panjangJadi: 18000, jumlahKeperluan: 4 },
      { kodeItem: 'Gordeng1R', panjangJadi: 16000, jumlahKeperluan: 2 },
      { kodeItem: 'Gordeng1R', panjangJadi: 15000, jumlahKeperluan: 2 },
      { kodeItem: 'Gordeng1R', panjangJadi: 13000, jumlahKeperluan: 2 },
      { kodeItem: 'Gordeng1R', panjangJadi: 12000, jumlahKeperluan: 2 },
      { kodeItem: 'T', panjangJadi: 3500, jumlahKeperluan: 6 },
      { kodeItem: 'T', panjangJadi: 3500, jumlahKeperluan: 8 },
      { kodeItem: 'TR', panjangJadi: 9200, jumlahKeperluan: 2 },
      { kodeItem: 'RLantai', panjangJadi: 570, jumlahKeperluan: 4 },
      { kodeItem: 'RLantai', panjangJadi: 910, jumlahKeperluan: 1 },
      { kodeItem: 'RLantai', panjangJadi: 2500, jumlahKeperluan: 1 },
      { kodeItem: 'RLantai', panjangJadi: 4950, jumlahKeperluan: 5 },
      { kodeItem: 'RLantai', panjangJadi: 1300, jumlahKeperluan: 2 },
      { kodeItem: 'RLantai', panjangJadi: 2500, jumlahKeperluan: 2 },
      { kodeItem: 'RLantai', panjangJadi: 2850, jumlahKeperluan: 1 },
      { kodeItem: 'RLantai', panjangJadi: 8500, jumlahKeperluan: 2 },
      { kodeItem: 'RLantai', panjangJadi: 3500, jumlahKeperluan: 1 },
      { kodeItem: 'RLantai', panjangJadi: 1550, jumlahKeperluan: 8 },
      { kodeItem: 'RLantaiR', panjangJadi: 9000, jumlahKeperluan: 1 },
      { kodeItem: 'RLantaiR', panjangJadi: 5000, jumlahKeperluan: 1 },
    ];

    const barang = {
      namaBarang: 'Pipa Hitam Ø 5” X 6.6 mm',
      panjangMentah: 6000,
      beratPerBatang: 130.2,
      hargaSatuan: 1953000,
      minWelding: 50,
    };

    const result = calculateMaterialGroupAllocation(barang, rawGroup1Items);
    expect(result.barAllocations.length).toBe(90);

    // Periksa batang-batang kombinasi penting
    const bar64Str = formatPotonganStr(result.barAllocations[63].items);
    expect(bar64Str).toBe('RLantaiR.(5) Rafter1R (1)');

    const bar70Str = formatPotonganStr(result.barAllocations[69].items);
    expect(bar70Str).toBe('Gordeng1R.(4) RLantai (1,55)');

    const bar73Str = formatPotonganStr(result.barAllocations[72].items);
    expect(bar73Str).toBe('T.(3,5) RLantai (2,5)');

    const bar85Str = formatPotonganStr(result.barAllocations[84].items);
    expect(bar85Str).toBe('T.(3,5)');

    const bar87Str = formatPotonganStr(result.barAllocations[86].items);
    expect(bar87Str).toBe('TR.(3,2)');
  });
});
