import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calculator, Plus, Trash2, Weight, Ruler, Pencil, Download, Eye, Loader2, Search, User, MapPin, Phone } from 'lucide-react';
import { estimasiAPI } from '@/services/api';
import { formatNumberWithSeparator } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Estimasi = () => {
  const navigate = useNavigate();

  const [estimasiList, setEstimasiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingEstimasi, setViewingEstimasi] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isInitialized = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const estimasiData = await estimasiAPI.getAll();
      setEstimasiList(estimasiData);

      if (estimasiData.length > 0 && !isInitialized.current) {
        setViewingEstimasi(estimasiData[estimasiData.length - 1]);
        isInitialized.current = true;
      }
    } catch (error) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEstimasi = (est) => {
    navigate(`/estimasi/edit/${est.id}`);
  };

  const handleViewEstimasi = (est) => {
    setViewingEstimasi(est);
    setTimeout(() => {
      document.getElementById('detail-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteEstimasi = async (id) => {
    const est = estimasiList.find((e) => e.id === id);
    if (!confirm(`Hapus estimasi ${est?.nomorEstimasi}?`)) return;
    try {
      await estimasiAPI.delete(id);
      await loadData();
      if (viewingEstimasi?.id === id) {
        const remaining = estimasiList.filter((e) => e.id !== id);
        setViewingEstimasi(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
      toast.success('Estimasi berhasil dihapus!');
    } catch (error) {
      toast.error('Gagal menghapus estimasi: ' + error.message);
    }
  };

  const filteredEstimasiList = estimasiList.filter((est) => {
    const q = searchQuery.toLowerCase();
    return (
      est.namaEstimasi?.toLowerCase().includes(q) ||
      est.nomorEstimasi?.toLowerCase().includes(q) ||
      est.createdBy?.toLowerCase().includes(q) ||
      est.namaClient?.toLowerCase().includes(q) ||
      est.lokasi?.toLowerCase().includes(q) ||
      est.kontakPerson?.toLowerCase().includes(q)
    );
  });

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const exportEstimasiToPDF = (est) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginL = 10;
    const marginR = 10;

    const luasKerja =
      Number(est.luasRuangan || 0) ||
      (parseFloat(est.panjangRuangan || 0) || 0) * (parseFloat(est.lebarRuangan || 0) || 0);

    const fmtN = (v, d = 0) =>
      Number(v || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
    const fmtRp = (v) => `Rp. ${fmtN(v)}`;

    const printHeader = () => {
      doc.setFillColor(246, 248, 251);
      doc.rect(marginL, 7, pageWidth - marginL - marginR, 20, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTIMASI HARGA DAN PEMAKAIAN BAHAN', pageWidth / 2, 12, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Rincian Pemakaian Batang, Berat, dan Biaya per Material', pageWidth / 2, 16, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Tanggal : ${new Date(est.createdAt).toLocaleDateString('id-ID')}`, pageWidth - marginR, 12, { align: 'right' });
      doc.text(`No. Bukti : ${est.nomorEstimasi}`, pageWidth - marginR, 17, { align: 'right' });
      doc.text(`Nama Proyek : ${est.namaEstimasi}`, marginL + 2, 17);
      if (est.namaClient) doc.text(`Client : ${est.namaClient}`, marginL + 2, 22);
      if (luasKerja > 0) {
        doc.text(
          `Dimensi Kerja : ${est.panjangRuangan || '-'} × ${est.lebarRuangan || '-'} m  (${Number(luasKerja).toFixed(2)} m²)`,
          pageWidth - marginR,
          22,
          { align: 'right' }
        );
      }
      doc.setLineWidth(0.3);
      doc.line(marginL, 28, pageWidth - marginR, 28);
    };

    let startY = 32;

    const ensurePageSpace = (requiredHeight = 20) => {
      if (startY > pageHeight - requiredHeight) {
        doc.addPage();
        startY = 15;
        printHeader();
        startY = 32;
      }
    };

    const groups = {};
    const groupOrder = [];
    (est.items || []).forEach((item) => {
      const key = item.isManual ? `manual-${item.namaBarang}` : String(item.barangId);
      if (!groups[key]) {
        groups[key] = { key, rows: [], isManual: !!item.isManual };
        groupOrder.push(key);
      }
      groups[key].rows.push(item);
    });

    let grandBeratSisa = 0;
    let grandBeratReal = 0;
    let grandBeratPlusWaste = 0;
    let grandHargaPlusWaste = 0;
    let grandHargaReal = 0;

    printHeader();

    groupOrder.forEach((key) => {
      const group = groups[key];
      const repItem = group.rows[0];
      const lastItem = group.rows[group.rows.length - 1];
      const summary = lastItem?.breakdown?.summary || {};
      const panjangMentah = summary.stockLength || 6000;
      const panjangMentahM = panjangMentah / 1000;
      const beratStandar = summary.beratStandar || repItem.beratPerBatang || 0;
      const hargaSatuan = summary.hargaSatuan || repItem.hargaSatuan || 0;
      const minWelding = summary.minWelding ?? 50;
      let barAllocations = lastItem?.breakdown?.barAllocations || [];

      if (barAllocations.length === 0) {
        const allGuides = group.rows.flatMap((row) => row.breakdown?.cuttingGuide || []);
        if (allGuides.length > 0) {
          barAllocations = allGuides.map((guide, gIdx) => {
            const pieces = guide.pieces || [];
            const panjangTerpakaiMm = guide.panjangTerpakai ?? pieces.reduce((s, p) => s + (p.length || 0), 0);
            const sisaMm = guide.waste ?? guide.sisa ?? 0;
            return {
              batangNo: gIdx + 1,
              panjangTerpakai: panjangTerpakaiMm,
              sisa: sisaMm,
              wasteReusable: guide.wasteReusable ?? sisaMm >= minWelding,
              items: pieces.length > 0 ? pieces.map((p) => ({
                label: p.label || guide.label || `Item${p.itemNo ?? gIdx + 1}`,
                kodeItem: p.kodeItem || null,
                itemNo: p.itemNo ?? gIdx + 1,
                length: p.length ?? panjangTerpakaiMm,
              })) : [{
                label: group.rows[gIdx % group.rows.length]?.kodeItem || group.rows[gIdx % group.rows.length]?.namaBarang || `Item${gIdx + 1}`,
                kodeItem: group.rows[gIdx % group.rows.length]?.kodeItem || null,
                itemNo: gIdx + 1,
                length: panjangTerpakaiMm,
              }],
            };
          });
        } else {
          barAllocations = group.rows.flatMap((row, rIdx) => {
            const kebutuhan = row.breakdown?.kebutuhanBahan || 1;
            const panjangReal = row.breakdown?.panjangRealTerpakai || 0;
            const wasteTotal = row.breakdown?.waste || 0;
            const panjangPerBatang = kebutuhan > 0 ? panjangReal / kebutuhan : panjangMentah;
            const sisaPerBatang = kebutuhan > 0 ? wasteTotal / kebutuhan : 0;
            return Array.from({ length: kebutuhan }, (_, i) => ({
              batangNo: rIdx * kebutuhan + i + 1,
              panjangTerpakai: panjangPerBatang,
              sisa: i === kebutuhan - 1 ? sisaPerBatang : 0,
              wasteReusable: sisaPerBatang >= minWelding,
              items: [{
                label: row.kodeItem || row.namaBarang || `Item${rIdx + 1}`,
                kodeItem: row.kodeItem || null,
                itemNo: rIdx + 1,
                length: panjangPerBatang,
              }],
            }));
          });
        }
      }

      ensurePageSpace(45);

      const matLabel = repItem.isManual
        ? repItem.namaBarang
        : `${repItem.namaBarang}` +
          (repItem.jenisBahan ? ` (${repItem.jenisBahan})` : '') +
          `  (Ukr Std : ${panjangMentahM} M / Berat Std : ${fmtN(beratStandar, 2)} Kg)` +
          `  Harga Satuan : ${fmtRp(hargaSatuan)} / Btg`;

      doc.setFillColor(238, 242, 247);
      doc.rect(marginL, startY - 2.8, pageWidth - marginL - marginR, 4.3, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(matLabel, marginL + 1.2, startY);
      startY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${new Date(est.createdAt).toLocaleDateString('id-ID')}   ${est.namaEstimasi}`, marginL, startY);
      startY += 3.5;

      if (repItem.isManual) {
        const qty = group.rows.reduce((s, r) => s + (r.jumlahKeperluan || 0), 0);
        const subtotal = group.rows.reduce((s, r) => s + (r.subtotal || 0), 0);
        autoTable(doc, {
          startY,
          head: [['No', 'Nama Barang', 'Qty', 'Harga Satuan', 'Subtotal']],
          body: [[1, repItem.namaBarang, qty, fmtRp(repItem.hargaSatuan), fmtRp(subtotal)]],
          theme: 'grid',
          headStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold', fontSize: 6.5 },
          styles: { fontSize: 6.5, cellPadding: 1.5 },
          margin: { left: marginL, right: marginR },
        });
        grandHargaReal += subtotal;
        grandHargaPlusWaste += subtotal;
        startY = doc.lastAutoTable.finalY + 5;
        return;
      }

      const tableBody = [];
      const barsByItem = new Map();
      barAllocations.forEach((bar) => {
        (bar.items || []).forEach((piece) => {
          const iNo = piece.itemNo;
          if (!barsByItem.has(iNo)) barsByItem.set(iNo, []);
          const existing = barsByItem.get(iNo);
          if (!existing.find((b) => b.batangNo === bar.batangNo)) existing.push(bar);
        });
      });

      const alphaLabel = (i) => String.fromCharCode(97 + i);

      group.rows.forEach((row, rowIdx) => {
        const itemNo = rowIdx + 1;
        const barsForItem = barsByItem.get(itemNo) || [];
        const panjangJadiM = (row.panjangJadi || 0) / 1000;
        const qty = row.jumlahKeperluan || 0;
        const kode = row.kodeItem || row.namaBarang || repItem.namaBarang;
        const spesLabel = `${alphaLabel(rowIdx)}. ${kode} ( ${fmtN(panjangJadiM, 1)} M, ${qty} Bh. )`;
        const luasPek = row.luasPekerjaan > 0 ? fmtN(row.luasPekerjaan, 2) : '-';

        if (barsForItem.length === 0) {
          tableBody.push([spesLabel, '-', '-', '-', '-', '-', luasPek, fmtRp(row.hargaSatuan), fmtRp(row.hargaSatuan), '-']);
          return;
        }

        barsForItem.forEach((bar, bIdx) => {
          const panjangTerpakaiMm = bar.panjangTerpakai ?? 0;
          const sisaMm = bar.sisa ?? 0;
          const sisaM = sisaMm / 1000;
          const usageRatio = panjangMentah > 0 ? panjangTerpakaiMm / panjangMentah : 1;
          const billedRatio = usageRatio <= 0.5 ? 0.5 : usageRatio <= 0.75 ? 0.75 : 1;
          const hargaPemakaian = billedRatio * hargaSatuan;
          const beratReal = (panjangTerpakaiMm / panjangMentah) * beratStandar;
          const beratSisa = beratStandar - beratReal;
          const pieces = bar.items || [];
          const potonganStr = pieces
            .map((p, pIdx) => {
              const lbl = p.kodeItem || p.label || `Item${p.itemNo}`;
              const pM = fmtN((p.length || 0) / 1000, 2);
              return pIdx === 0 ? `${lbl}.(${pM})` : `${lbl} (${pM})`;
            })
            .join(' ');

          tableBody.push([
            bIdx === 0 ? spesLabel : '',
            `${bIdx + 1} .  ${fmtN(panjangTerpakaiMm / 1000, 0)}`,
            sisaM > 0 ? fmtN(sisaM, 2) : '-',
            fmtN(beratSisa, 2),
            fmtN(beratReal, 2),
            fmtN(beratStandar, 2),
            luasPek,
            fmtRp(hargaPemakaian),
            fmtRp(hargaSatuan),
            potonganStr,
          ]);
        });
      });

      const stBeratReal = summary.totalBeratReal || 0;
      const stBeratWaste = summary.totalBeratWaste || 0;
      const stBeratPlusWaste = stBeratReal + stBeratWaste;
      const stHargaReal = summary.totalHargaReal || 0;
      const stHargaPemakaian = summary.totalHargaPemakaian || 0;
      const stSisaMm = barAllocations.reduce((s, b) => s + (b.sisa ?? 0), 0);

      grandBeratSisa += stBeratWaste;
      grandBeratReal += stBeratReal;
      grandBeratPlusWaste += stBeratPlusWaste;
      grandHargaPlusWaste += stHargaReal;
      grandHargaReal += stHargaPemakaian;

      const subTotalStyle = { fontStyle: 'bold', fillColor: [240, 240, 240] };
      tableBody.push([
        { content: `SUB TOTAL   ${fmtN(barAllocations.length)} Btg`, colSpan: 2, styles: { ...subTotalStyle, halign: 'left' } },
        { content: stSisaMm > 0 ? fmtN(stSisaMm / 1000, 2) : '-', styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtN(stBeratWaste, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtN(stBeratReal, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtN(stBeratPlusWaste, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: '-', styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtRp(stHargaPemakaian), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtRp(stHargaReal), styles: { ...subTotalStyle, halign: 'right' } },
        { content: '', styles: subTotalStyle },
      ]);

      autoTable(doc, {
        startY,
        head: [[
          'Spesifikasi / Uraian', 'Pemakaian', 'Panjang\nSisa', 'Berat\nSisa',
          'Berat\nReal', 'Berat\n+ Waste', 'Luas\n(M2)',
          'Harga\n+ Waste', 'Harga\nReal', 'Potongan',
        ]],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [215, 220, 227], textColor: [20, 20, 20],
          fontStyle: 'bold', fontSize: 6.5, halign: 'center',
          lineColor: [130, 130, 130], lineWidth: 0.1,
        },
        styles: { fontSize: 6.5, cellPadding: 1.3, overflow: 'linebreak', lineColor: [150, 150, 150], lineWidth: 0.08 },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: {
          0: { cellWidth: 48 },
          1: { cellWidth: 16, halign: 'center' },
          2: { cellWidth: 12, halign: 'right' },
          3: { cellWidth: 12, halign: 'right' },
          4: { cellWidth: 12, halign: 'right' },
          5: { cellWidth: 14, halign: 'right' },
          6: { cellWidth: 12, halign: 'right' },
          7: { cellWidth: 22, halign: 'right' },
          8: { cellWidth: 22, halign: 'right' },
          9: { cellWidth: 'auto' },
        },
        margin: { left: marginL, right: marginR },
      });

      startY = doc.lastAutoTable.finalY + 5;
    });

    ensurePageSpace(25);
    const gtStyle = { fontStyle: 'bold', fillColor: [180, 210, 255], halign: 'right' };
    autoTable(doc, {
      startY,
      body: [
        [
          { content: 'GRAND TOTAL', colSpan: 2, styles: { ...gtStyle, halign: 'right' } },
          { content: '-', styles: gtStyle },
          { content: fmtN(grandBeratSisa, 2), styles: gtStyle },
          { content: fmtN(grandBeratReal, 2), styles: gtStyle },
          { content: fmtN(grandBeratPlusWaste, 2), styles: gtStyle },
          { content: '-', styles: gtStyle },
          { content: fmtRp(grandHargaReal), styles: gtStyle },
          { content: fmtRp(grandHargaPlusWaste), styles: gtStyle },
          { content: '', styles: { fillColor: [180, 210, 255] } },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 8 }, 1: { cellWidth: 16 }, 2: { cellWidth: 14 },
        3: { cellWidth: 24 }, 4: { cellWidth: 16 }, 5: { cellWidth: 16 },
        6: { cellWidth: 18 }, 7: { cellWidth: 24 }, 8: { cellWidth: 'auto' },
      },
      margin: { left: marginL, right: marginR },
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}   Hal. ${i} / ${totalPages}`,
        pageWidth - marginR,
        pageHeight - 5,
        { align: 'right' }
      );
    }

    doc.save(`Estimasi_${est.nomorEstimasi.replace(/\//g, '-')}.pdf`);
    toast.success('PDF berhasil diexport!');
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 fade-in" data-testid="estimasi-container">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Estimasi Material</h1>
          <p className="text-base text-gray-600">Daftar riwayat perhitungan kebutuhan material</p>
        </div>
        <Button onClick={() => navigate('/estimasi/new')} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4 mr-2" /> Buat Estimasi
        </Button>
      </div>

      <div className="space-y-6">
        {/* Tabel List */}
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Riwayat Estimasi</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Cari estimasi, client, lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600" />
                  <p className="text-sm text-gray-500 mt-2">Memuat...</p>
                </div>
              ) : estimasiList.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Belum ada estimasi</p>
              ) : filteredEstimasiList.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    Tidak ada hasil untuk <span className="font-medium">"{searchQuery}"</span>
                  </p>
                  <button onClick={() => setSearchQuery('')} className="text-xs text-sky-600 hover:underline mt-1">
                    Reset pencarian
                  </button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nomor</TableHead>
                      <TableHead>Nama Estimasi</TableHead>
                      {/* ── KOLOM BARU ── */}
                      <TableHead>Client</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Kontak</TableHead>
                      {/* ────────────── */}
                      <TableHead>Dibuat Oleh</TableHead>
                      <TableHead>Diupdate Oleh</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEstimasiList
                      .slice()
                      .reverse()
                      .map((est, index) => {
                        const isViewing = viewingEstimasi?.id === est.id;
                        return (
                          <TableRow key={est.id} className={isViewing ? 'bg-sky-50' : ''}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <span className="px-2 py-0.5 bg-sky-600 text-white text-xs font-bold rounded">
                                {est.nomorEstimasi}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{est.namaEstimasi}</TableCell>

                            {/* ── CLIENT ── */}
                            <TableCell className="text-sm text-gray-700">
                              {est.namaClient ? (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span>{est.namaClient}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>

                            {/* ── LOKASI ── */}
                            <TableCell className="text-sm text-gray-700">
                              {est.lokasi ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span>{est.lokasi}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>

                            {/* ── KONTAK ── */}
                            <TableCell className="text-sm text-gray-700">
                              {est.kontakPerson ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span>{est.kontakPerson}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>

                            <TableCell className="text-sm text-gray-600">
                              <p className="font-medium">{est.createdBy || '-'}</p>
                              <span className="text-xs text-gray-400">{est.createdByRole || '-'}</span>
                              <span className="block text-xs text-gray-400 mt-0.5">
                                {new Date(est.createdAt).toLocaleDateString('id-ID', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                })}{' '}
                                {new Date(est.createdAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                            </TableCell>

                            <TableCell className="text-sm text-gray-600">
                              {est.updatedBy ? (
                                <>
                                  <p className="font-medium text-blue-600">{est.updatedBy}</p>
                                  <span className="text-xs text-gray-400">{est.updatedByRole || '-'}</span>
                                  <span className="block text-xs text-gray-400 mt-0.5">
                                    {new Date(est.updatedAt).toLocaleDateString('id-ID', {
                                      day: '2-digit', month: 'short', year: 'numeric',
                                    })}{' '}
                                    {new Date(est.updatedAt).toLocaleTimeString('id-ID', {
                                      hour: '2-digit', minute: '2-digit',
                                    })}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>

                            <TableCell className="font-semibold text-emerald-600">
                              Rp {(est.totalEstimasi || 0).toLocaleString('id-ID')}
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewEstimasi(est)}
                                  className={`h-7 w-7 p-0 ${isViewing ? 'bg-sky-200' : ''}`}
                                  title="Lihat"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => exportEstimasiToPDF(est)}
                                  className="h-7 w-7 p-0 hover:bg-red-100"
                                  title="PDF"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditEstimasi(est)}
                                  className="h-7 w-7 p-0 hover:bg-blue-100"
                                  title="Edit"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEstimasi(est.id)}
                                  className="h-7 w-7 p-0 hover:bg-red-100"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Section */}
      {viewingEstimasi && (
        <div id="detail-section">
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-sky-600 text-white text-xs font-bold rounded">
                    {viewingEstimasi.nomorEstimasi}
                  </span>
                  {viewingEstimasi.namaEstimasi}
                </CardTitle>
                <Button onClick={() => exportEstimasiToPDF(viewingEstimasi)} className="bg-red-500 hover:bg-red-600">
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
              </div>

              {/* ── INFO CLIENT / LOKASI / KONTAK di bawah judul ── */}
              {(viewingEstimasi.namaClient || viewingEstimasi.lokasi || viewingEstimasi.kontakPerson) && (
                <div className="flex flex-wrap gap-4 mt-2">
                  {viewingEstimasi.namaClient && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <User className="w-4 h-4 text-sky-500 shrink-0" />
                      <span className="font-medium">Client:</span>
                      <span>{viewingEstimasi.namaClient}</span>
                    </div>
                  )}
                  {viewingEstimasi.lokasi && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium">Lokasi:</span>
                      <span>{viewingEstimasi.lokasi}</span>
                    </div>
                  )}
                  {viewingEstimasi.kontakPerson && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-medium">Kontak:</span>
                      <span>{viewingEstimasi.kontakPerson}</span>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* ── Summary Cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Berat */}
                <Card className="bg-emerald-50">
                  <CardContent className="pt-6 flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <Weight className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Berat</p>
                      <p className="text-sm font-bold">
                        {(() => {
                          const totalBeratMaterial = (viewingEstimasi.items || []).reduce((sum, item) => {
                            const beratPerBatang = parseFloat(item.beratPerBatang || 0) || 0;
                            const totalBarang = parseFloat(item.breakdown?.kebutuhanBahan || 0) || 0;
                            const fallbackBeratTotal = parseFloat(item.beratTotal || 0) || 0;
                            const rowBerat =
                              beratPerBatang > 0 && totalBarang > 0
                                ? beratPerBatang * totalBarang
                                : fallbackBeratTotal;
                            return sum + rowBerat;
                          }, 0);
                          const totalBeratWaste = (viewingEstimasi.items || []).reduce((sum, item) => {
                            const beratPerBatang = parseFloat(item.beratPerBatang || 0) || 0;
                            const panjangMentah = parseFloat(item.panjangMentah || 0) || 0;
                            const wastePanjang = parseFloat(item.breakdown?.waste || 0) || 0;
                            if (beratPerBatang <= 0 || panjangMentah <= 0 || wastePanjang <= 0) return sum;
                            return sum + (beratPerBatang / panjangMentah) * wastePanjang;
                          }, 0);
                          const totalBeratReal = Math.max(totalBeratMaterial - totalBeratWaste, 0);
                          return `Real ${Number(totalBeratReal).toFixed(2)} kg | Waste ${Number(totalBeratWaste).toFixed(2)} kg`;
                        })()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dimensi */}
                <Card className="bg-blue-50">
                  <CardContent className="pt-6 flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Ruler className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Dimensi Kerja</p>
                      <p className="text-lg font-bold">
                        {(() => {
                          const luasKerja =
                            Number(viewingEstimasi.luasRuangan || 0) ||
                            (parseFloat(viewingEstimasi.panjangRuangan || 0) || 0) *
                              (parseFloat(viewingEstimasi.lebarRuangan || 0) || 0);
                          return Number(luasKerja).toFixed(2);
                        })()}{' '}
                        m²
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Total */}
                <Card className="bg-purple-50">
                  <CardContent className="pt-6 flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <Calculator className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-lg font-bold text-emerald-600">
                        Rp {(viewingEstimasi.totalEstimasi || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dibuat / Diupdate */}
                <Card className="bg-amber-50">
                  <CardContent className="pt-6 space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Dibuat Oleh</p>
                      <p className="text-sm font-bold">{viewingEstimasi.createdBy || '-'}</p>
                      <p className="text-xs text-gray-400">{viewingEstimasi.createdByRole || '-'}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(viewingEstimasi.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}{' '}
                        {new Date(viewingEstimasi.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {viewingEstimasi.updatedBy && (
                      <div className="pt-2 border-t border-amber-100">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Diupdate Oleh</p>
                        <p className="text-sm font-bold text-blue-600">{viewingEstimasi.updatedBy}</p>
                        <p className="text-xs text-gray-400">{viewingEstimasi.updatedByRole || '-'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(viewingEstimasi.updatedAt).toLocaleDateString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}{' '}
                          {new Date(viewingEstimasi.updatedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── Tabel Detail Material ── */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Dimensi Kerja</TableHead>
                    <TableHead>Bahan</TableHead>
                    <TableHead>Panjang Real</TableHead>
                    <TableHead>Panjang Waste</TableHead>
                    <TableHead>Berat Sisa</TableHead>
                    <TableHead>Berat Real</TableHead>
                    <TableHead>Berat + Waste</TableHead>
                    <TableHead>Harga + Waste</TableHead>
                    <TableHead>Harga Real</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const groupedItems = {};
                    const resolvedDimensiKerja =
                      Number(viewingEstimasi.luasRuangan || 0) ||
                      (parseFloat(viewingEstimasi.panjangRuangan || 0) || 0) *
                        (parseFloat(viewingEstimasi.lebarRuangan || 0) || 0);

                    viewingEstimasi.items?.forEach((item, itemIdx) => {
                      const groupingKey = item.isManual ? `manual-${itemIdx}` : item.barangId;
                      if (!groupedItems[groupingKey]) {
                        groupedItems[groupingKey] = {
                          ...item,
                          totalBahan: 0,
                          totalJumlah: 0,
                          finalWaste: 0,
                          finalWastePercentage: 0,
                          finalPanjangReal: 0,
                          finalBeratReal: 0,
                          finalBeratPlusWaste: 0,
                          finalHargaReal: 0,
                          finalHargaPlusWaste: 0,
                          count: 0,
                          lastItemIndex: -1,
                        };
                      }
                      const group = groupedItems[groupingKey];
                      group.totalBahan += item.breakdown?.kebutuhanBahan || 0;
                      group.totalJumlah += item.jumlahKeperluan || 0;
                      if (itemIdx >= group.lastItemIndex) {
                        group.finalWaste = item.breakdown?.waste || 0;
                        group.finalWastePercentage = item.breakdown?.wastePercentage || 0;
                        group.finalPanjangReal = item.breakdown?.panjangRealTerpakai || 0;
                        const totalBeratReal = parseFloat(item.breakdown?.summary?.totalBeratReal || 0) || 0;
                        const totalBeratWaste = parseFloat(item.breakdown?.summary?.totalBeratWaste || 0) || 0;
                        const totalHargaReal = parseFloat(item.breakdown?.summary?.totalHargaPemakaian || 0) || 0;
                        const totalHargaPlusWaste = parseFloat(item.breakdown?.summary?.totalHargaReal || 0) || 0;
                        group.finalBeratReal = totalBeratReal;
                        group.finalBeratPlusWaste = totalBeratReal + totalBeratWaste;
                        group.finalHargaReal = totalHargaReal;
                        group.finalHargaPlusWaste = totalHargaPlusWaste;
                        group.lastItemIndex = itemIdx;
                      }
                      group.count++;
                    });

                    const groupedValues = Object.values(groupedItems);
                    const totals = groupedValues.reduce(
                      (acc, group) => {
                        const isManualRow =
                          !!group.isManual ||
                          group.barangId === '__manual__' ||
                          group.jenisBahan === 'Manual';
                        if (!isManualRow) {
                          acc.panjangReal += Number(group.finalPanjangReal || 0);
                          acc.panjangWaste += Number(group.finalWaste || 0);
                          acc.beratReal += Number(group.finalBeratReal || 0);
                          acc.beratPlusWaste += Number(group.finalBeratPlusWaste || 0);
                          acc.beratSisa += Math.max(
                            Number(group.finalBeratPlusWaste || 0) - Number(group.finalBeratReal || 0),
                            0
                          );
                        }
                        acc.hargaPlusWaste += Number(
                          isManualRow ? group.subtotal || 0 : group.finalHargaPlusWaste || 0
                        );
                        acc.hargaReal += Number(
                          isManualRow ? group.subtotal || 0 : group.finalHargaReal || 0
                        );
                        return acc;
                      },
                      { panjangReal: 0, panjangWaste: 0, beratReal: 0, beratPlusWaste: 0, beratSisa: 0, hargaPlusWaste: 0, hargaReal: 0 }
                    );

                    const rows = groupedValues.map((group, idx) => {
                      const isManualRow =
                        !!group.isManual ||
                        group.barangId === '__manual__' ||
                        group.jenisBahan === 'Manual';
                      const wastePercentage = group.finalWastePercentage || 0;

                      return (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            {group.namaBarang}
                            <br />
                            <span className="text-xs text-gray-500">{group.jenisBahan}</span>
                          </TableCell>
                          <TableCell>
                            {isManualRow ? '-' : `${formatNumberWithSeparator(group.panjangMentah)} mm`}
                          </TableCell>
                          <TableCell>
                            {!isManualRow && resolvedDimensiKerja > 0 ? (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                {Number(resolvedDimensiKerja).toFixed(2)} m²
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-purple-600">
                            {isManualRow ? group.totalJumlah : group.totalBahan}
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-700">
                            {isManualRow
                              ? '-'
                              : `${formatNumberWithSeparator(Math.round(group.finalPanjangReal || 0))} mm`}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {isManualRow
                              ? '-'
                              : `${formatNumberWithSeparator(Math.round(group.finalWaste))} mm (${Math.round(wastePercentage)}%)`}
                          </TableCell>
                          <TableCell className="font-semibold text-cyan-700">
                            {isManualRow
                              ? '-'
                              : `${Number(Math.max((group.finalBeratPlusWaste || 0) - (group.finalBeratReal || 0), 0)).toFixed(2)} kg`}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-700">
                            {isManualRow ? '-' : `${Number(group.finalBeratReal || 0).toFixed(2)} kg`}
                          </TableCell>
                          <TableCell className="font-semibold text-indigo-700">
                            {isManualRow ? '-' : `${Number(group.finalBeratPlusWaste || 0).toFixed(2)} kg`}
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            {isManualRow
                              ? `Rp ${(group.subtotal || 0).toLocaleString('id-ID')}`
                              : `Rp ${Number(group.finalHargaPlusWaste || 0).toLocaleString('id-ID')}`}
                          </TableCell>
                          <TableCell className="font-semibold text-amber-700">
                            {isManualRow
                              ? `Rp ${(group.subtotal || 0).toLocaleString('id-ID')}`
                              : `Rp ${Number(group.finalHargaReal || 0).toLocaleString('id-ID')}`}
                          </TableCell>
                        </TableRow>
                      );
                    });

                    rows.push(
                      <TableRow key="totals-row" className="bg-gray-50">
                        <TableCell colSpan={5} className="text-right font-bold">
                          TOTAL
                        </TableCell>
                        <TableCell className="font-bold text-emerald-700">
                          {formatNumberWithSeparator(Math.round(totals.panjangReal || 0))} mm
                        </TableCell>
                        <TableCell className="font-bold text-red-700">
                          {formatNumberWithSeparator(Math.round(totals.panjangWaste || 0))} mm
                        </TableCell>
                        <TableCell className="font-bold text-cyan-700">
                          {Number(totals.beratSisa || 0).toFixed(2)} kg
                        </TableCell>
                        <TableCell className="font-bold text-blue-700">
                          {Number(totals.beratReal || 0).toFixed(2)} kg
                        </TableCell>
                        <TableCell className="font-bold text-indigo-700">
                          {Number(totals.beratPlusWaste || 0).toFixed(2)} kg
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">
                          Rp {Math.round(totals.hargaPlusWaste || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="font-bold text-amber-700">
                          Rp {Math.round(totals.hargaReal || 0).toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    );

                    return rows;
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Estimasi;