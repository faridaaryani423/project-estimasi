import * as engine from "./frontend/src/utils/calculationEngine.js";
const { calculateMaterialGroupAllocation } = engine;

const barang = { 
  nama: "pipa hitam 3\" x 3.8mm", 
  hargamodal: "762300", 
  hargajasa: "0", 
  beratbatang: "50.82", 
  minWelding: "50" 
};

const groupItems = [
  { namaBarang: "G1", panjangJadi: 12000, jumlahKeperluan: 2 },
  { namaBarang: "G2", panjangJadi: 10000, jumlahKeperluan: 2 },
  { namaBarang: "G3", panjangJadi: 9000, jumlahKeperluan: 2 },
  { namaBarang: "G4", panjangJadi: 8000, jumlahKeperluan: 2 },
  { namaBarang: "G5", panjangJadi: 7000, jumlahKeperluan: 2 },
  { namaBarang: "G6", panjangJadi: 5000, jumlahKeperluan: 2 },
  { namaBarang: "G7", panjangJadi: 4000, jumlahKeperluan: 2 }
];

try {
  const result = calculateMaterialGroupAllocation(barang, groupItems);
  const output = {
    kebutuhanBahan: result.kebutuhanBahan,
    panjangRealTerpakai: result.panjangRealTerpakai,
    waste: result.waste,
    totalTitikWelding: result.totalTitikWelding,
    totalHargaReal: result.summary.totalHargaReal,
    totalHargaPemakaian: result.summary.totalHargaPemakaian,
    barCount: result.barAllocations.length
  };
  console.log(JSON.stringify(output, null, 2));
} catch (e) {
  console.error(e);
}
