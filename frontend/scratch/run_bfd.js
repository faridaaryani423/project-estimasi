
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
  namaBarang: 'Pipa Hitam',
  panjangMentah: 6000,
  beratPerBatang: 130.2,
  hargaSatuan: 1953000,
  minWelding: 50,
};
const res = calculateMaterialGroupAllocation(barang, rawGroup1Items);
console.log(JSON.stringify(res.barAllocations));
