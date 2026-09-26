const { calculateMaterialGroupAllocation } = require('../src/utils/calculationEngine');

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
console.log('Total bars:', result.barAllocations.length);

const fmtDec = (val, maxDigits = 2) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 0.000001) return '-';
  return num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: maxDigits });
};

result.barAllocations.forEach((bar, idx) => {
  const pieces = bar.items || [];
  const potonganStr = pieces.map((p, pIdx) => {
    const lbl = p.kodeItem || p.label || 'Item';
    const pM = fmtDec((p.length || 0) / 1000, 3);
    return pIdx === 0 ? `${lbl}.(${pM})` : `${lbl} (${pM})`;
  }).join(' ');

  if (idx >= 63) {
    console.log(`Bar ${idx + 1} (used: ${bar.panjangTerpakai / 1000}m, sisa: ${bar.sisa / 1000}m): ${potonganStr}`);
  }
});
