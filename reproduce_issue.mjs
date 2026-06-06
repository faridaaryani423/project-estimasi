import * as calc from './frontend/src/utils/calculationEngine.js';

const { calculateDetailedBreakdown } = calc;

// Mock barang object
const barang = {
    jenisBentuk: 'balok',
    panjang: 6000,
    lebar: 50,
    tinggi: 50,
    beratJenis: 7850,
    nama: 'Besi Hollow'
};

const panjangJadi = 12000;
const jumlah = 2;

// Mock the context of itemDetails construction
const breakdown = calculateDetailedBreakdown(barang, panjangJadi, jumlah);

const itemDetail = {
    barangId: 'mock-id',
    kodeItem: 'MOCK-001',
    namaBarang: barang.nama,
    jenisBentuk: barang.jenisBentuk,
    panjangJadi,
    jumlah,
    breakdown: breakdown
};

const payloadBefore = JSON.stringify(itemDetail);
console.log('Byte length before trimming:', Buffer.byteLength(payloadBefore));

// Current trimming assumption
const trimmedItemDetail = JSON.parse(JSON.stringify(itemDetail));
if (trimmedItemDetail.breakdown && trimmedItemDetail.breakdown.parts) {
    delete trimmedItemDetail.breakdown.parts;
}

const payloadAfter = JSON.stringify(trimmedItemDetail);
console.log('Byte length after trimming (removed "parts"):', Buffer.byteLength(payloadAfter));

console.log('Sample breakdown keys:', Object.keys(breakdown || {}).slice(0, 10));
console.log('Full breakdown (first level) keys:', Object.keys(breakdown || {}));
if (breakdown && breakdown.parts) {
    console.log('Parts count:', breakdown.parts.length);
    if (breakdown.parts.length > 0) {
        console.log('Sample part keys:', Object.keys(breakdown.parts[0]));
    }
}
