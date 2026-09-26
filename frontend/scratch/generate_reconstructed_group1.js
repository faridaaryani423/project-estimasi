const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');
const fs = require('fs');
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

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });
const pageWidth  = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const marginL = 8;
const marginR = 8;
const tableAvailWidth = pageWidth - marginL - marginR;

const sharedColStyles = {
  0: { cellWidth: 50, halign: 'left' },
  1: { cellWidth: 15, halign: 'center' },
  2: { cellWidth: 12, halign: 'right' },
  3: { cellWidth: 12, halign: 'right' },
  4: { cellWidth: 13, halign: 'right' },
  5: { cellWidth: 14, halign: 'right' },
  6: { cellWidth: 11, halign: 'center' },
  7: { cellWidth: 20, halign: 'right' },
  8: { cellWidth: 20, halign: 'right' },
  9: { cellWidth: tableAvailWidth - (50 + 15 + 12 + 12 + 13 + 14 + 11 + 20 + 20), halign: 'left' },
};

const fmtN = (v, d = 0) =>
  Number(v || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDec = (val, maxDigits = 2) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 0.000001) return '-';
  return num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: maxDigits });
};
const alphaLabel = (idx) => {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  if (idx < 26) return letters[idx];
  const q = Math.floor(idx / 26) - 1;
  const r = idx % 26;
  return `${letters[q]}${letters[r]}`;
};

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.text('ESTIMASI HARGA DAN PEMAKAIAN BAHAN2', marginL, 12);

const tableBody = [];
tableBody.push([
  {
    content: '09/03/2026   BENTENG BARU\nPipa Hitam Ø 5” X 6.6 mm (Ukr Std : 6 M / Berat Std : 130,2 Kg ) Harga Satuan : Rp. 1.953.000 / Btg',
    colSpan: 10,
    styles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 6.5, halign: 'left', cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 } }
  }
]);

const totalRows = Math.max(rawGroup1Items.length, result.barAllocations.length);

for (let rIdx = 0; rIdx < totalRows; rIdx++) {
  let spesLabel = '';
  if (rIdx < rawGroup1Items.length) {
    const item = rawGroup1Items[rIdx];
    spesLabel = `${alphaLabel(rIdx)}.  ${item.kodeItem}  ( ${fmtDec(item.panjangJadi / 1000, 2)} M,  ${item.jumlahKeperluan} Bh. )`;
  }

  let barNo = rIdx + 1;
  let usage = '-';
  let pSisa = '-';
  let bSisa = '-';
  let bReal = '-';
  let bWaste = '-';
  let hWaste = '-';
  let hReal = '-';
  let pot = '';

  if (rIdx < result.barAllocations.length) {
    const bar = result.barAllocations[rIdx];
    barNo = bar.batangNo || (rIdx + 1);
    const pTerpakaiM = bar.panjangTerpakai / 1000;
    const sisaM = bar.sisa / 1000;
    const beratStd = barang.beratPerBatang;
    const beratReal = (bar.panjangTerpakai / barang.panjangMentah) * beratStd;
    const beratSisa = Math.max(0, beratStd - beratReal);

    const usageRatio = bar.panjangTerpakai / barang.panjangMentah;
    const billedRatio = usageRatio <= 0.5 ? 0.5 : usageRatio <= 0.75 ? 0.75 : 1;
    const hargaReal = billedRatio * barang.hargaSatuan;

    usage = `${barNo} .   ${fmtDec(pTerpakaiM, 2)}`;
    pSisa = sisaM > 0.001 ? fmtDec(sisaM, 2) : '-';
    bSisa = beratSisa > 0.01 ? fmtDec(beratSisa, 2) : '-';
    bReal = fmtDec(beratReal, 2);
    bWaste = fmtDec(beratStd, 2);
    hWaste = fmtN(barang.hargaSatuan);
    hReal = fmtN(hargaReal);

    const pieces = bar.items || [];
    pot = pieces.map((p, pIdx) => {
      const lbl = p.kodeItem || p.label || 'Item';
      const pM = fmtDec((p.length || 0) / 1000, 3);
      return pIdx === 0 ? `${lbl}.(${pM})` : `${lbl} (${pM})`;
    }).join(' ');
  }

  tableBody.push([
    spesLabel,
    usage,
    pSisa,
    bSisa,
    bReal,
    bWaste,
    '-',
    hWaste,
    hReal,
    pot
  ]);
}

autoTable(doc, {
  startY: 40,
  head: [[
    'Spesifikasi / Uraian', 'Pemakaian', 'Panjang\nSisa', 'Berat\nSisa',
    'Berat\nReal', 'Berat\n+ Waste', 'Luas\n(M2)',
    'Harga\n+ Waste', 'Harga\nReal', 'Potongan'
  ]],
  body: tableBody,
  theme: 'grid',
  tableWidth: tableAvailWidth,
  showHead: 'everyPage',
  headStyles: {
    fillColor: [255, 255, 255], textColor: [0, 0, 0],
    fontStyle: 'bold', fontSize: 6.5, halign: 'center', valign: 'middle',
    lineColor: [0, 0, 0], lineWidth: 0.15
  },
  styles: {
    fontSize: 6.5, cellPadding: { top: 1.1, bottom: 1.1, left: 1, right: 1 },
    overflow: 'linebreak', lineColor: [0, 0, 0], lineWidth: 0.1,
    textColor: [0, 0, 0], fillColor: [255, 255, 255]
  },
  alternateRowStyles: { fillColor: [255, 255, 255] },
  columnStyles: sharedColStyles,
  margin: { top: 8, bottom: 12, left: marginL, right: marginR }
});

fs.writeFileSync('frontend/scratch/group1_reconstructed.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('Generated reconstructed PDF successfully!');
