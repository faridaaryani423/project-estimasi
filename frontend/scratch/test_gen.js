const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');
const fs = require('fs');

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

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.text('ESTIMASI HARGA DAN PEMAKAIAN BAHAN2', marginL, 12);

const tableBody = [];
tableBody.push([
  {
    content: '09/03/2026   BENTENG BARU\nPipa Hitam Ø 5” X 6.6 mm (Ukr Std : 6 M / Berat Std : 130,2 Kg ) Harga Satuan : Rp. 1.953.000 / Btg',
    colSpan: 10,
    styles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 6.5, halign: 'left' }
  }
]);

for (let i = 1; i <= 60; i++) {
  tableBody.push([
    i <= 5 ? 'a. Rafter1R ( 24 M, 6 Bh. )' : '',
    i + ' .   6',
    '-',
    '-',
    '130,2',
    '130,2',
    '-',
    '1.953.000',
    '1.953.000',
    'RLantaiR.(6)'
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

const totalPages = doc.internal.getNumberOfPages();
console.log('Total pages generated:', totalPages);
fs.writeFileSync('scratch/test_out.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('PDF written successfully!');
