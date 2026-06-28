// src/utils/penawaranExcelExport.js

import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  isManualItem,
  getItemBahanValue,
  getItemWeldingStats,
  getItemsWeightTotals,
  getItemWeightStats,
} from './penawaranCalculations';
import { buildGroupedItemsByBarang } from './penawaranGrouping';

/**
 * Rebuild estimasiGroups dari data penawaran Singkat tersimpan.
 * Langsung memakai hargaJualPerM2 dan subtotalJual yang sudah disimpan per estimasi.
 */
const buildEstimasiGroupsFromSaved = (penawaran) => {
  const estimasiList = penawaran.estimasiList || [];
  const items = penawaran.items || [];
  const totalHarga = Number(penawaran.totalHarga || 0);
  const totalDimensiKerja = Number(penawaran.totalDimensiKerja || 0);

  if (estimasiList.length === 0) {
    const barangList = items.map((item) => ({
      namaBarang: item.namaBarang || item.namaManual || '-',
      kodeItem: item.kodeItem || '',
    }));
    return [
      {
        nomor: penawaran.nomorPenawaran,
        nama: penawaran.namaProject || '-',
        dimensiKerja: totalDimensiKerja,
        hargaSatuan: totalDimensiKerja > 0 ? Math.round(totalHarga / totalDimensiKerja) : 0,
        totalHarga,
        barangList,
      },
    ];
  }

  return estimasiList.map((est) => {
    const estimasiNomor = est.nomor || est.nomorEstimasi || '';
    const estimasiNama = est.nama || est.namaEstimasi || estimasiNomor;

    const estItems = items.filter((item) => item.fromEstimasi === estimasiNomor);
    const targetItems = estItems.length === 0 ? items : estItems;

    const barangList = [...new Map(
      targetItems.map((item) => [item.namaBarang, {
        namaBarang: item.namaBarang || item.namaManual || '-',
        kodeItem: item.kodeItem || '',
      }])
    ).values()];

    // Gunakan nilai yang sudah tersimpan (dari confirmCreatePenawaran)
    const dimensiKerja = Number(est.dimensiKerja || 0);
    const hargaSatuan = Number(est.hargaJualPerM2 || 0);
    const totalRow = Number(est.subtotalJual ||
      (dimensiKerja > 0 && hargaSatuan > 0 ? Math.round(dimensiKerja * hargaSatuan) : 0));

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

// ── Export Penawaran Singkat (format per estimasi) ────────────────────
const exportSingkatToExcel = (penawaran, wb) => {
  const totalHarga = Number(penawaran.totalHarga || 0);
  const estimasiGroups = buildEstimasiGroupsFromSaved(penawaran);

  const rows = [
    ['SURAT PENAWARAN HARGA'],
    [penawaran.nomorPenawaran],
    [''],
    ['Informasi Project'],
    ['Nama Project', penawaran.namaProject],
    ['Lokasi', penawaran.lokasiProject],
    ['Client', penawaran.clientNama],
    ['Kontak', penawaran.clientKontak],
    ['Tanggal', new Date(penawaran.createdAt).toLocaleDateString('id-ID')],
    ['Estimasi', penawaran.estimasiList?.map((e) => e.nomor).join(', ')],
    [''],
    ['No', 'Item Pekerjaan', 'Volume (M²)', 'Harga Satuan (Rp)', 'Total Harga (Rp)'],
  ];

  estimasiGroups.forEach((eg, idx) => {
    // Baris estimasi utama (bold)
    rows.push([
      idx + 1,
      eg.nama.toUpperCase(),
      eg.dimensiKerja > 0 ? Number(eg.dimensiKerja.toFixed(2)) : '-',
      eg.hargaSatuan > 0 ? eg.hargaSatuan : '-',
      eg.totalHarga > 0 ? eg.totalHarga : '-',
    ]);
    // Sub-baris barang
    eg.barangList.forEach((b) => {
      const label = `  - ${b.namaBarang}${b.kodeItem ? ` (${b.kodeItem})` : ''}`;
      rows.push(['', label, '', '', '']);
    });
  });

  rows.push(['', '', '', 'TOTAL', totalHarga]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Style kolom
  ws['!cols'] = [
    { wch: 6 },
    { wch: 45 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Penawaran Singkat');

  // Sheet ringkasan
  const summaryRows = [
    ['Ringkasan'],
    ['Dimensi Kerja (M²)', Math.round((penawaran.totalDimensiKerja || 0) * 100) / 100],
    ['Total Penawaran', totalHarga],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
};

// ── Export Penawaran Detail (format per estimasi → per item, Kg) ─────
const exportDetailToExcel = (penawaran, wb) => {
  const estimasiList = penawaran.estimasiList || [];
  const items = penawaran.items || [];
  const totalHargaJual = Number(penawaran.totalHarga || 0);
  const totalModal = items.reduce(
    (s, item) =>
      s + Number(item.breakdown?.summary?.totalHargaReal || item.subtotal || 0),
    0
  );
  const jualRatio = totalModal > 0 ? totalHargaJual / totalModal : 1;

  const rows = [
    ['SURAT PENAWARAN HARGA'],
    [penawaran.nomorPenawaran],
    [''],
    ['Nama Project', penawaran.namaProject],
    ['Lokasi', penawaran.lokasiProject],
    ['Client', penawaran.clientNama],
    ['Kontak', penawaran.clientKontak],
    ['Tanggal', new Date(penawaran.createdAt).toLocaleDateString('id-ID')],
    ['Estimasi', estimasiList.map((e) => e.nomor).join(', ')],
    [''],
    ['No', 'Item Pekerjaan', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Total Harga (Rp)'],
  ];

  const groupedItems = buildGroupedItemsByBarang(items);
  
  groupedItems.forEach((group, idx) => {
    const isManualRow = group.representativeItem ? group.representativeItem.isManual : false;
    const volume = isManualRow 
      ? Number(group.representativeItem?.jumlahKeperluan || 0) 
      : group.totalBeratMaterial;
    const satuan = isManualRow ? (group.representativeItem?.satuanManual || 'Ls') : 'Kg';
    
    // Harga jual dan subtotal jual diambil dari item (sudah diset di backend)
    const hargaJualPerUnit = group.representativeItem?.hargaJualPerUnit || items.find(i => i.namaBarang === group.namaBarang)?.hargaJualPerUnit || 0;
    
    // Subtotal jual grup adalah jumlahan dari semua item di dalam grup
    let groupSubtotalJual = 0;
    items.forEach(it => {
      const match = isManualRow 
        ? it.namaBarang === group.namaBarang 
        : it.barangId === group.barangId;
      if (match) {
        groupSubtotalJual += Number(it.subtotalJual || 0);
      }
    });

    rows.push([
      idx + 1,
      group.namaBarang,
      volume > 0 ? Number(volume.toFixed(2)) : '-',
      satuan,
      hargaJualPerUnit > 0 ? hargaJualPerUnit : '-',
      groupSubtotalJual > 0 ? groupSubtotalJual : '-',
    ]);
  });

  rows.push(['', 'TOTAL PENAWARAN', '', '', '', totalHargaJual]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 50 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Penawaran Detail');
};


// ── Entry point utama ─────────────────────────────────────────────────
export const exportToExcel = (penawaran) => {
  const wb = XLSX.utils.book_new();

  if (penawaran.tipePenawaran === 'singkat') {
    exportSingkatToExcel(penawaran, wb);
  } else {
    exportDetailToExcel(penawaran, wb);
  }

  XLSX.writeFile(
    wb,
    `Penawaran_${penawaran.nomorPenawaran.replace(/\//g, '-')}.xlsx`
  );
  toast.success('Excel berhasil diexport!');
};