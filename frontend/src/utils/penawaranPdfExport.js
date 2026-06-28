// src/utils/penawaranPdfExport.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { getItemsWeightTotals } from './penawaranCalculations';
import { buildGroupedItemsByBarang } from './penawaranGrouping';
import { fmtNumber, fmtRupiah, formatDateTime } from './penawaranFormatters';

// ──────────────────────────────────────────────────────────────────────
// EXPORT PDF – PENAWARAN SINGKAT (per estimasi, harga per M²)
// ──────────────────────────────────────────────────────────────────────
const exportToPDFSingkat = (penawaran) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginL = 15;
  const marginR = 15;

  const totalHargaJual = Number(penawaran.totalHarga || 0);
  const estimasiList = penawaran.estimasiList || [];

  // ── Header ────────────────────────────────────────────────────────
  doc.setFillColor(246, 248, 251);
  doc.rect(marginL, 8, pageWidth - marginL - marginR, 26, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT PENAWARAN HARGA', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Penawaran Singkat – Harga per Dimensi Kerja', pageWidth / 2, 20, { align: 'center' });

  doc.text(`No. : ${penawaran.nomorPenawaran}`, marginL + 1, 26);
  doc.text(
    `Tanggal : ${new Date(penawaran.createdAt).toLocaleDateString('id-ID')}`,
    pageWidth - marginR,
    26,
    { align: 'right' }
  );
  doc.text(`Proyek : ${penawaran.namaProject || '-'}`, marginL + 1, 31);
  doc.text(`Client : ${penawaran.clientNama || '-'}`, pageWidth / 2, 31);
  doc.text(`Lokasi : ${penawaran.lokasiProject || '-'}`, marginL + 1, 35);

  if (estimasiList.length > 0) {
    doc.text(
      `Estimasi : ${estimasiList.map((e) => e.nomor || e.nomorEstimasi).join(', ')}`,
      pageWidth - marginR,
      31,
      { align: 'right' }
    );
  }

  doc.setLineWidth(0.3);
  doc.line(marginL, 38, pageWidth - marginR, 38);

  // ── Build table body ────────────────────────────────────────────
  const tableBody = [];

  estimasiList.forEach((est, idx) => {
    const dimensiKerja = Number(est.dimensiKerja || 0);
    const hargaPerM2 = Number(est.hargaJualPerM2 || 0);
    const subtotal = Number(
      est.subtotalJual ||
        (dimensiKerja > 0 && hargaPerM2 > 0 ? Math.round(dimensiKerja * hargaPerM2) : 0)
    );

    tableBody.push([
      {
        content: idx + 1,
        styles: { halign: 'center', fontSize: 8 },
      },
      {
        content: (est.nama || est.namaEstimasi || est.nomor || '-').toUpperCase(),
        styles: { fontSize: 8, fontStyle: 'bold' },
      },
      {
        content:
          dimensiKerja > 0
            ? dimensiKerja.toLocaleString('id-ID', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : '-',
        styles: { halign: 'center', fontSize: 8 },
      },
      {
        content: hargaPerM2 > 0 ? fmtRupiah(hargaPerM2) : '-',
        styles: { halign: 'right', fontSize: 8 },
      },
      {
        content: subtotal > 0 ? fmtRupiah(subtotal) : '-',
        styles: { halign: 'right', fontSize: 8 },
      },
    ]);

    // Sub-baris: daftar barang dalam estimasi
    const items = penawaran.items || [];
    const estNomor = est.nomor || est.nomorEstimasi || '';
    const estItems = items.filter((item) => item.fromEstimasi === estNomor);
    const displayItems = estItems.length > 0 ? estItems : [];
    const seen = new Set();
    displayItems.forEach((item) => {
      const nama = item.namaBarang || item.namaManual || '-';
      if (!seen.has(nama)) {
        seen.add(nama);
        tableBody.push([
          { content: '', styles: { fontSize: 7 } },
          {
            content: `  • ${nama}${item.kodeItem ? `  [${item.kodeItem}]` : ''}`,
            colSpan: 4,
            styles: { fontSize: 7, textColor: [120, 120, 120] },
          },
        ]);
      }
    });
  });

  // Grand Total
  tableBody.push([
    { content: '', styles: { fontStyle: 'bold', fillColor: [235, 245, 235] } },
    {
      content: 'TOTAL PENAWARAN',
      colSpan: 3,
      styles: { fontStyle: 'bold', halign: 'right', fillColor: [235, 245, 235] },
    },
    {
      content: fmtRupiah(totalHargaJual),
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: [235, 245, 235],
        textColor: [20, 120, 60],
        fontSize: 9,
      },
    },
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['No', 'Item Pekerjaan', 'Volume (M²)', 'Harga Satuan (Rp/M²)', 'Total Harga (Rp)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [229, 231, 235],
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      lineColor: [200, 200, 200],
      lineWidth: 0.15,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [252, 252, 255] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 38, halign: 'right' },
      4: { cellWidth: 34, halign: 'right' },
    },
    margin: { left: marginL, right: marginR },
  });

  // ── Ringkasan ────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 6;
  if (finalY < pageHeight - 25) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Dimensi Kerja Total: ${fmtNumber(penawaran.totalDimensiKerja || 0, 2)} M²   |   ` +
        `Welding: ${penawaran.totalTitikWelding || 0} titik`,
      marginL,
      finalY
    );
    doc.setTextColor(0, 0, 0);
  }

  // ── Footer ───────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dicetak: ${formatDateTime()}   Hal. ${i} / ${totalPages}`,
      pageWidth - marginR,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  doc.save(`PenawaranSingkat_${penawaran.nomorPenawaran.replace(/\//g, '-')}.pdf`);
  toast.success('PDF Singkat berhasil diexport!');
};

// ──────────────────────────────────────────────────────────────────────
// EXPORT PDF – PENAWARAN DETAIL (per barang, harga per Kg)
// ──────────────────────────────────────────────────────────────────────
const exportToPDFDetail = (penawaran) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginL = 15;
  const marginR = 15;

  const totalHargaJual = Number(penawaran.totalHarga || 0);
  const weightTotals = getItemsWeightTotals(penawaran.items || []);

  // ── Header ────────────────────────────────────────────────────────
  doc.setFillColor(246, 248, 251);
  doc.rect(marginL, 8, pageWidth - marginL - marginR, 26, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT PENAWARAN HARGA', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Rincian Item dan Harga per Material', pageWidth / 2, 20, { align: 'center' });

  doc.text(`No. : ${penawaran.nomorPenawaran}`, marginL + 1, 26);
  doc.text(
    `Tanggal : ${new Date(penawaran.createdAt).toLocaleDateString('id-ID')}`,
    pageWidth - marginR,
    26,
    { align: 'right' }
  );
  doc.text(`Proyek : ${penawaran.namaProject || '-'}`, marginL + 1, 31);
  doc.text(`Client : ${penawaran.clientNama || '-'}`, pageWidth / 2, 31);
  doc.text(`Lokasi : ${penawaran.lokasiProject || '-'}`, marginL + 1, 35);

  if (penawaran.estimasiList?.length > 0) {
    doc.text(
      `Estimasi : ${penawaran.estimasiList.map((e) => e.nomor || e.nomorEstimasi).join(', ')}`,
      pageWidth - marginR,
      31,
      { align: 'right' }
    );
  }

  doc.setLineWidth(0.3);
  doc.line(marginL, 38, pageWidth - marginR, 38);

  // ── Build items dari groupedItems ────────────────────────────────
  const items = penawaran.items || [];
  const groupedItems = buildGroupedItemsByBarang(items);

  const tableBody = [];

  groupedItems.forEach((group, idx) => {
    const isManualRow = !group.barangId || group.barangId === '__manual__';

    // Ambil hargaJualPerUnit & subtotalJual yang sudah tersimpan
    const matchedItems = items.filter((it) =>
      isManualRow ? it.namaBarang === group.namaBarang : it.barangId === group.barangId
    );
    const hargaJualPerUnit = matchedItems.length > 0
      ? Number(matchedItems[0].hargaJualPerUnit || 0)
      : 0;
    const groupSubtotalJual = matchedItems.reduce(
      (s, it) => s + Number(it.subtotalJual || 0),
      0
    );

    const volume = isManualRow
      ? Number(matchedItems[0]?.jumlahKeperluan || 0)
      : group.totalBeratMaterial;
    const satuan = isManualRow
      ? (matchedItems[0]?.satuanManual || 'Ls')
      : 'Kg';

    tableBody.push([
      {
        content: idx + 1,
        styles: { halign: 'center', fontSize: 8 },
      },
      {
        content: group.namaBarang,
        styles: { fontSize: 8 },
      },
      {
        content:
          volume > 0
            ? volume.toLocaleString('id-ID', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : '-',
        styles: { halign: 'center', fontSize: 8 },
      },
      {
        content: satuan,
        styles: { halign: 'center', fontSize: 8, textColor: [100, 100, 100] },
      },
      {
        content: hargaJualPerUnit > 0 ? fmtRupiah(hargaJualPerUnit) : '-',
        styles: { halign: 'right', fontSize: 8 },
      },
      {
        content: groupSubtotalJual > 0 ? fmtRupiah(groupSubtotalJual) : '-',
        styles: { halign: 'right', fontSize: 8 },
      },
    ]);
  });

  // Grand Total
  tableBody.push([
    { content: '', styles: { fontStyle: 'bold', fillColor: [235, 245, 235] } },
    {
      content: 'TOTAL PENAWARAN',
      colSpan: 4,
      styles: { fontStyle: 'bold', halign: 'right', fillColor: [235, 245, 235] },
    },
    {
      content: fmtRupiah(totalHargaJual),
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: [235, 245, 235],
        textColor: [20, 120, 60],
        fontSize: 9,
      },
    },
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['No', 'Item Pekerjaan', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Total Harga (Rp)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [229, 231, 235],
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      lineColor: [200, 200, 200],
      lineWidth: 0.15,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [252, 252, 255] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 34, halign: 'right' },
      5: { cellWidth: 34, halign: 'right' },
    },
    margin: { left: marginL, right: marginR },
  });

  // ── Ringkasan berat ──────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 6;
  if (finalY < pageHeight - 25) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Berat Real: ${fmtNumber(weightTotals.real, 2)} Kg   |   ` +
        `Dimensi Kerja: ${fmtNumber(penawaran.totalDimensiKerja || 0, 2)} M²   |   ` +
        `Welding: ${penawaran.totalTitikWelding || 0} titik`,
      marginL,
      finalY
    );
    doc.setTextColor(0, 0, 0);
  }

  // ── Footer ───────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dicetak: ${formatDateTime()}   Hal. ${i} / ${totalPages}`,
      pageWidth - marginR,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  doc.save(`PenawaranDetail_${penawaran.nomorPenawaran.replace(/\//g, '-')}.pdf`);
  toast.success('PDF Detail berhasil diexport!');
};

// ──────────────────────────────────────────────────────────────────────
// Entry point: routing berdasarkan tipePenawaran
// ──────────────────────────────────────────────────────────────────────
export const exportToPDF = (penawaran) => {
  if (penawaran.tipePenawaran === 'detail') {
    exportToPDFDetail(penawaran);
  } else {
    exportToPDFSingkat(penawaran);
  }
};