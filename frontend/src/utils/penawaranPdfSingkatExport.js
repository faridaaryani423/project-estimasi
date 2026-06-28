// src/utils/penawaranPdfSingkatExport.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { getEstimasiDimensiKerja } from './penawaranCalculations';
import { fmtNumber, fmtRupiah, formatDateTime } from './penawaranFormatters';

/**
 * Rebuild estimasiGroups dari data penawaran yang tersimpan.
 * Karena data tersimpan hanya memiliki items (flat) dan estimasiList,
 * kita grup items per estimasi menggunakan fromEstimasi field.
 */
const buildEstimasiGroupsFromSaved = (penawaran) => {
  const estimasiList = penawaran.estimasiList || [];
  const items = penawaran.items || [];
  const totalHarga = Number(penawaran.totalHarga || 0);
  const totalDimensiKerja = Number(penawaran.totalDimensiKerja || 0);

  // Hitung harga satuan rata-rata per m² (fallback jika estimasiGroups tidak ada)
  const globalHargaPerM2 =
    totalDimensiKerja > 0 ? Math.round(totalHarga / totalDimensiKerja) : 0;

  // Jika estimasiList kosong, kembalikan satu group dari semua items
  if (estimasiList.length === 0) {
    // Kumpulkan SEMUA barang (tidak dedup)
    const barangList = items.map((item) => ({
      namaBarang: item.namaBarang || item.namaManual || '-',
      kodeItem: item.kodeItem || '',
    }));
    return [
      {
        nomor: penawaran.nomorPenawaran,
        nama: penawaran.namaProject || '-',
        dimensiKerja: totalDimensiKerja,
        hargaSatuan: globalHargaPerM2,
        totalHarga,
        barangList,
      },
    ];
  }

  // Group items per estimasi berdasarkan fromEstimasi field
  return estimasiList.map((est) => {
    const estimasiNomor = est.nomor || est.nomorEstimasi || '';
    const estimasiNama = est.nama || est.namaEstimasi || estimasiNomor;

    // Filter items milik estimasi ini
    const estItems = items.filter(
      (item) => item.fromEstimasi === estimasiNomor
    );

    // Jika tidak ada match fromEstimasi, bagi rata
    const useAllItems = estItems.length === 0;
    const targetItems = useAllItems ? items : estItems;

    // Kumpulkan SEMUA barang (tidak dedup)
    const barangList = targetItems.map((item) => ({
      namaBarang: item.namaBarang || item.namaManual || '-',
      kodeItem: item.kodeItem || '',
    }));

    // Dimensi kerja per estimasi
    const dimensiKerja =
      typeof est.dimensiKerja === 'number'
        ? est.dimensiKerja
        : Number(penawaran.totalDimensiKerja || 0) / Math.max(estimasiList.length, 1);

    // Harga satuan: jika tersimpan, pakai; kalau tidak hitung dari ratio
    const hargaSatuan =
      dimensiKerja > 0
        ? Math.round(totalHarga / Math.max(totalDimensiKerja, 1))
        : globalHargaPerM2;

    const totalRow =
      dimensiKerja > 0 ? Math.round(dimensiKerja * hargaSatuan) : 0;

    return {
      nomor: estimasiNomor,
      nama: estimasiNama,
      dimensiKerja,
      hargaSatuan,
      totalHarga: totalRow,
      barangList,
    };
  });
};

export const exportToPDFSingkat = (penawaran) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginL = 15;
  const marginR = 15;

  // ── Header ──────────────────────────────────────────────────────
  doc.setFillColor(246, 248, 251);
  doc.rect(marginL, 10, pageWidth - marginL - marginR, 28, 'F');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT PENAWARAN HARGA', pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. : ${penawaran.nomorPenawaran}`, marginL + 2, 24);
  doc.text(
    `Tanggal : ${new Date(penawaran.createdAt).toLocaleDateString('id-ID')}`,
    pageWidth - marginR,
    24,
    { align: 'right' }
  );
  doc.text(`Nama Proyek : ${penawaran.namaProject || '-'}`, marginL + 2, 29);
  doc.text(`Client : ${penawaran.clientNama || '-'}`, marginL + 2, 34);
  doc.text(`Lokasi : ${penawaran.lokasiProject || '-'}`, pageWidth / 2, 34);
  if (penawaran.estimasiList?.length > 0) {
    doc.text(
      `Estimasi : ${penawaran.estimasiList.map((e) => e.nomor).join(', ')}`,
      pageWidth - marginR,
      29,
      { align: 'right' }
    );
  }

  doc.setLineWidth(0.3);
  doc.line(marginL, 38, pageWidth - marginR, 38);

  // ── Build estimasi groups ────────────────────────────────────────
  const estimasiGroups = buildEstimasiGroupsFromSaved(penawaran);
  const totalHargaJual = Number(penawaran.totalHarga || 0);

  // ── Table body: per estimasi + sub-list barang ───────────────────
  const tableBody = [];
  estimasiGroups.forEach((eg, idx) => {
    const volDisplay =
      eg.dimensiKerja > 0
        ? fmtNumber(eg.dimensiKerja, 2) + ' M²'
        : '-';

    // Baris header estimasi (bold)
    tableBody.push([
      { content: idx + 1, styles: { fontStyle: 'bold', halign: 'center' } },
      {
        content: eg.nama.toUpperCase(),
        styles: { fontStyle: 'bold' },
      },
      { content: volDisplay, styles: { halign: 'center', fontStyle: 'bold' } },
      {
        content: eg.hargaSatuan > 0 ? fmtRupiah(eg.hargaSatuan) : '-',
        styles: { halign: 'right', fontStyle: 'bold' },
      },
      {
        content: eg.totalHarga > 0 ? fmtRupiah(eg.totalHarga) : '-',
        styles: { halign: 'right', fontStyle: 'bold' },
      },
    ]);

    // Baris sub-item barang
    eg.barangList.forEach((b) => {
      const label = b.namaBarang + (b.kodeItem ? ` (${b.kodeItem})` : '');
      tableBody.push([
        { content: '', styles: { fillColor: [255, 255, 255] } },
        {
          content: `  - ${label}`,
          styles: {
            fontSize: 8,
            textColor: [90, 90, 90],
            fillColor: [255, 255, 255],
          },
        },
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
      ]);
    });
  });

  // Grand total row
  tableBody.push([
    { content: '', styles: { fontStyle: 'bold', fillColor: [235, 245, 235] } },
    {
      content: 'TOTAL PENAWARAN',
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: [235, 245, 235],
      },
      colSpan: 3,
    },
    {
      content: fmtRupiah(totalHargaJual),
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: [235, 245, 235],
        textColor: [20, 120, 60],
      },
    },
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['No', 'Item Pekerjaan', 'Volume', 'Harga Satuan (Rp)', 'Total Harga (Rp)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [229, 231, 235], // gray-200
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      lineColor: [30, 40, 55],
      lineWidth: 0.2,
    },
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 38, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' },
    },
    margin: { left: marginL, right: marginR },
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dicetak: ${formatDateTime()}   Hal. ${i} / ${totalPages}`,
      pageWidth - marginR,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  doc.save(`PenawaranSingkat_${penawaran.nomorPenawaran.replace(/\//g, '-')}.pdf`);
  toast.success('PDF Singkat berhasil diexport!');
};