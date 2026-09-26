const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');
const fs = require('fs');

const generateTestPDF = () => {
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
    return num.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDigits,
    });
  };

  // 1. Header on Page 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ESTIMASI HARGA DAN PEMAKAIAN BAHAN2', marginL, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const leftLabels = [
    { label: 'Product', value: 'Structure Type C Two Bedroom' },
    { label: 'Customer', value: 'Bpk. Wayan Sardita' },
    { label: 'Perusahaan', value: '' },
    { label: 'Alamat', value: 'Ulaman Resort, Tabanan           / Bali' },
    { label: 'Proyek', value: '' },
    { label: 'Dimensi', value: '                   X' },
  ];

  const rightLabels = [
    { label: 'Tanggal', value: '09/03/2026' },
    { label: 'No. Bukti', value: 'EST-2603-00177' },
    { label: 'No. Order', value: '' },
    { label: '', value: '' },
    { label: 'Estimator', value: 'ARIFIN' },
  ];

  let curY = 16.5;
  leftLabels.forEach(({ label, value }) => {
    doc.text(label, marginL, curY);
    doc.text(':', marginL + 22, curY);
    if (value) doc.text(value, marginL + 25, curY);
    curY += 4.2;
  });

  let rightY = 12;
  rightLabels.forEach(({ label, value }) => {
    if (label) {
      doc.text(label, marginL + 130, rightY);
      doc.text(':', marginL + 148, rightY);
      if (value) doc.text(value, marginL + 151, rightY);
    }
    rightY += 4.2;
  });

  // Table Body
  const tableBody = [];

  // Group 1: Pipa Hitam 5"
  tableBody.push([
    {
      content: '09/03/2026   BENTENG BARU\nPipa Hitam Ø 5” X 6.6 mm (Ukr Std : 6 M / Berat Std : 130,2 Kg ) Harga Satuan : Rp. 1.953.000 / Btg',
      colSpan: 10,
      styles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 6.5, halign: 'left', cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 } }
    }
  ]);

  for (let i = 1; i <= 90; i++) {
    let spes = '';
    if (i === 1) spes = 'a. Rafter1R ( 24 M, 6 Bh. )';
    else if (i === 2) spes = 'b. Rafter1R ( 19 M, 2 Bh. )';
    else if (i === 3) spes = 'c. Gordeng1R ( 18 M, 4 Bh. )';
    else if (i === 4) spes = 'd. Gordeng1R ( 16 M, 2 Bh. )';

    let usage = '6';
    let pSisa = '-';
    let bSisa = '-';
    let bReal = '130,2';
    let bWaste = '130,2';
    let hWaste = '1.953.000';
    let hReal = '1.953.000';
    let pot = 'Gordeng1R.(6)';

    if (i === 65) {
      usage = '5,95'; pSisa = '0,04'; bSisa = '1,09'; bReal = '129,11';
      pot = 'RLantai.(4,95) Gordeng1R (1) Gordeng1R (0) Gordeng1R (0)';
    } else if (i === 85) {
      usage = '3,5'; pSisa = '2,5'; bSisa = '54,25'; bReal = '75,95'; hReal = '1.464.750';
      pot = 'T.(3,5)';
    }

    tableBody.push([
      spes,
      `${i} .   ${usage}`,
      pSisa,
      bSisa,
      bReal,
      bWaste,
      '-',
      hWaste,
      hReal,
      pot,
    ]);
  }

  // Subtotal Group 1
  const subStyle = { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] };
  tableBody.push([
    { content: 'SUB TOTAL', styles: { ...subStyle, halign: 'left' } },
    { content: '521,19', styles: { ...subStyle, halign: 'right' } },
    { content: '18,78', styles: { ...subStyle, halign: 'right' } },
    { content: '408,24', styles: { ...subStyle, halign: 'right' } },
    { content: '11.309,76', styles: { ...subStyle, halign: 'right' } },
    { content: '11.718', styles: { ...subStyle, halign: 'right' } },
    { content: '-', styles: { ...subStyle, halign: 'center' } },
    { content: '175.770.000', styles: { ...subStyle, halign: 'right' } },
    { content: '173.817.000', styles: { ...subStyle, halign: 'right' } },
    { content: '', styles: subStyle },
  ]);

  // Grand Total
  tableBody.push([
    { content: 'GRAND TOTAL', styles: { ...subStyle, halign: 'left' } },
    { content: '1.304,99', styles: { ...subStyle, halign: 'right' } },
    { content: '26,78', styles: { ...subStyle, halign: 'right' } },
    { content: '747,92', styles: { ...subStyle, halign: 'right' } },
    { content: '14.385,46', styles: { ...subStyle, halign: 'right' } },
    { content: '15.133,38', styles: { ...subStyle, halign: 'right' } },
    { content: '-', styles: { ...subStyle, halign: 'center' } },
    { content: '287.708.700', styles: { ...subStyle, halign: 'right' } },
    { content: '284.654.550', styles: { ...subStyle, halign: 'right' } },
    { content: '', styles: subStyle },
  ]);

  tableBody.push([
    { content: 'HARGA/SATUAN', styles: { ...subStyle, halign: 'left' } },
    { content: '', styles: subStyle },
    { content: '', styles: subStyle },
    { content: '', styles: subStyle },
    { content: '', styles: subStyle },
    { content: '', styles: subStyle },
    { content: '', styles: subStyle },
    { content: '287.708.700', styles: { ...subStyle, halign: 'right' } },
    { content: '284.654.550', styles: { ...subStyle, halign: 'right' } },
    { content: '', styles: subStyle },
  ]);

  autoTable(doc, {
    startY: 40,
    head: [[
      'Spesifikasi / Uraian',
      'Pemakaian',
      'Panjang\nSisa',
      'Berat\nSisa',
      'Berat\nReal',
      'Berat\n+ Waste',
      'Luas\n(M2)',
      'Harga\n+ Waste',
      'Harga\nReal',
      'Potongan',
    ]],
    body: tableBody,
    theme: 'grid',
    tableWidth: tableAvailWidth,
    showHead: 'everyPage',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
    },
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.1, bottom: 1.1, left: 1, right: 1 },
      overflow: 'linebreak',
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: sharedColStyles,
    margin: { top: 8, bottom: 12, left: marginL, right: marginR },
  });

  const totalPages = doc.internal.getNumberOfPages();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const footerDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(footerDate, marginL, pageHeight - 5);
    doc.text(`Hal.   ${i}`, pageWidth - marginR, pageHeight - 5, { align: 'right' });
  }

  fs.writeFileSync('scratch/reference_matched.pdf', Buffer.from(doc.output('arraybuffer')));
  console.log(`Generated ${totalPages} pages matching reference!`);
};

generateTestPDF();
