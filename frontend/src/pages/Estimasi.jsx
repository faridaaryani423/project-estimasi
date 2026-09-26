import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calculator, Plus, Trash2, Weight, Ruler, Pencil, Download, Eye, Loader2, Search, User, MapPin, Phone, Square } from 'lucide-react';
import { estimasiAPI } from '@/services/api';
import { formatNumberWithSeparator } from '@/lib/utils';
import { resolveItemSatuan } from '@/utils/unitResolver';
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

    const nilaiDim =
      est.nilaiDimensiKerja ??
      est.luasRuangan ??
      ((parseFloat(est.panjangRuangan || 0) || 0) * (parseFloat(est.lebarRuangan || 0) || 0));
    const satuanDim = est.satuanDimensiKerja || 'm²';

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

    const cleanText = (txt) => {
      if (txt === null || txt === undefined) return '';
      const str = String(txt).trim();
      const lower = str.toLowerCase();
      if (lower.includes('wajib diisi') || lower.includes('opsional')) return '';
      return str;
    };

    const formatUraianPanjang = (row) => {
      const inputVal = row.panjangJadiInput ?? row.panjang_jadi_input ?? row.breakdown?.panjangJadiInput;
      if (inputVal !== undefined && inputVal !== null && String(inputVal).trim() !== '') {
        return String(inputVal).trim().replace('.', ',');
      }
      const pj = parseFloat(row.panjangJadi ?? row.panjang_jadi);
      if (!isNaN(pj) && pj > 0) {
        return String(Number((pj / 1000).toPrecision(12))).replace('.', ',');
      }
      return '0';
    };

    // ── Header Dokumen (Halaman 1) ──────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ESTIMASI HARGA DAN PEMAKAIAN BAHAN2', marginL, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const leftFields = [
      { label: 'Product', value: cleanText(est.namaEstimasi) },
      { label: 'Customer', value: cleanText(est.namaClient) },
      { label: 'Perusahaan', value: cleanText(est.perusahaan) },
      { label: 'Alamat', value: cleanText(est.lokasi) },
      { label: 'Proyek', value: cleanText(est.namaProyek) },
      {
        label: 'Dimensi',
        value: (() => {
          if (est.panjangRuangan && est.lebarRuangan) {
            return `${est.panjangRuangan} X ${est.lebarRuangan}`;
          }
          if (nilaiDim > 0) {
            return `${Number(nilaiDim).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${satuanDim}`;
          }
          return '                   X';
        })(),
      },
    ];

    const tglStr = est.createdAt
      ? new Date(est.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';
    const rightFields = [
      { label: 'Tanggal', value: tglStr },
      { label: 'No. Bukti', value: cleanText(est.nomorEstimasi) },
      { label: 'No. Order', value: cleanText(est.noOrder) },
      { label: '', value: '' },
      { label: 'Estimator', value: cleanText(est.createdBy) },
    ];

    let leftY = 16.5;
    leftFields.forEach(({ label, value }) => {
      doc.text(label, marginL, leftY);
      doc.text(':', marginL + 22, leftY);
      if (value) doc.text(value, marginL + 25, leftY);
      leftY += 4.2;
    });

    let rightY = 12;
    rightFields.forEach(({ label, value }) => {
      if (label) {
        doc.text(label, marginL + 130, rightY);
        doc.text(':', marginL + 148, rightY);
        if (value) doc.text(value, marginL + 151, rightY);
      }
      rightY += 4.2;
    });

    // ── Pengelompokan Item ──────────────────────────────────────────────────
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

    groupOrder.sort((keyA, keyB) => {
      const minUA = Math.min(...groups[keyA].rows.map((r) => (r.urutan !== undefined && r.urutan !== null ? r.urutan : 999999)));
      const minUB = Math.min(...groups[keyB].rows.map((r) => (r.urutan !== undefined && r.urutan !== null ? r.urutan : 999999)));
      return minUA - minUB;
    });

    const tableBody = [];
    let grandPemakaianM     = 0;
    let grandPanjangSisaM   = 0;
    let grandBeratSisa      = 0;
    let grandBeratReal      = 0;
    let grandBeratPlusWaste = 0;
    let grandHargaPlusWaste = 0;
    let grandHargaReal      = 0;

    groupOrder.forEach((key) => {
      const group    = groups[key];
      const repItem  = group.rows[0];
      const lastItem = group.rows[group.rows.length - 1];
      const summary  = lastItem?.breakdown?.summary || {};
      const alphaLabel = (i) => String.fromCharCode(97 + i);

      const isCustomGroup = group.rows.some(
        (r) =>
          r.jenisBentuk === 'custom' ||
          r.jenisBentukManual === 'custom' ||
          r.breakdown?.isCustom === true ||
          r.breakdown?.summary?.isCustom === true
      );

      const isPlatGroup = !isCustomGroup && group.rows.some(
        (r) => r.jenisBentuk === 'plat' || r.jenisBentukManual === 'plat'
      );

      const dateStr = est.createdAt
        ? new Date(est.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      const supplierRaw = repItem.supplier ? repItem.supplier.trim() : '';
      const supplierLine = supplierRaw ? `${dateStr}   ${supplierRaw}` : (dateStr ? `${dateStr}` : '');

      // ── Custom Items ──
      if (isCustomGroup) {
        const customSatuan = resolveItemSatuan(repItem, 'Bh');
        const customHargaSatuan = parseFloat(repItem.hargaSatuan || repItem.hargaModal || repItem.hargamodal || repItem.hargamodalManual || summary.hargaSatuan || 0) || 0;
        const matLabel = `${repItem.namaBarang}   Harga Satuan : Rp. ${fmtN(customHargaSatuan)} / ${customSatuan}`;
        const bannerContent = supplierLine ? `${supplierLine}\n${matLabel}` : matLabel;

        tableBody.push([
          {
            content: bannerContent,
            colSpan: 10,
            styles: {
              fontStyle: 'bold',
              fillColor: [255, 255, 255],
              textColor: [0, 0, 0],
              fontSize: 6.5,
              halign: 'left',
              cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
            },
          }
        ]);

        let totalCustomQty = 0;
        let totalCustomSubtotal = 0;

        group.rows.forEach((row, rowIdx) => {
          const qty = parseFloat(row.jumlahKeperluan) || 0;
          const rowHarga = parseFloat(row.hargaSatuan || row.hargaModal || customHargaSatuan) || 0;
          const subtotal = parseFloat(row.subtotal) || (qty * rowHarga);
          totalCustomQty += qty;
          totalCustomSubtotal += subtotal;

          const kode = row.kodeItem ? `${row.kodeItem}. ` : '';
          const displayQty = (row.jumlahKeperluan !== undefined && row.jumlahKeperluan !== null && String(row.jumlahKeperluan).trim() !== '')
            ? String(row.jumlahKeperluan).trim()
            : String(qty);
          const spesLabel = `${alphaLabel(rowIdx)}. ${kode}${row.namaBarang || repItem.namaBarang} (${displayQty} ${customSatuan})`;

          tableBody.push([
            spesLabel,
            `${rowIdx + 1} .   ${fmtN(qty)}`,
            '-',
            '-',
            '-',
            '-',
            '-',
            fmtN(subtotal),
            fmtN(subtotal),
            '',
          ]);
        });

        grandPemakaianM     += totalCustomQty;
        grandHargaPlusWaste += totalCustomSubtotal;
        grandHargaReal      += totalCustomSubtotal;

        const subTotalStyle = { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] };
        tableBody.push([
          { content: 'SUB TOTAL', styles: { ...subTotalStyle, halign: 'left' } },
          { content: fmtN(totalCustomQty), styles: { ...subTotalStyle, halign: 'right' } },
          { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
          { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
          { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
          { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
          { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
          { content: fmtN(totalCustomSubtotal), styles: { ...subTotalStyle, halign: 'right' } },
          { content: fmtN(totalCustomSubtotal), styles: { ...subTotalStyle, halign: 'right' } },
          { content: '', styles: subTotalStyle },
        ]);
        return;
      }

      // ── Plat Items ──
      if (isPlatGroup) {
        const platHargaSatuan = parseFloat(summary.hargaSatuan || repItem.hargaSatuan || repItem.hargaModal || 0) || 0;
        const platDimensi = (() => {
          const p = repItem.panjangPlat || summary.panjangPlat;
          const l = repItem.lebarPlat   || summary.lebarPlat;
          const t = repItem.ketebalanPlat || summary.ketebalanPlat;
          if (p && l && t) return `${p} x ${l} x ${t} mm`;
          if (p && l) return `${p} x ${l} mm`;
          return '';
        })();
        const satuanPlat = repItem.satuanHargaModal === 'kg' ? 'Kg' : 'Lembar';
        const matLabelPlat = `${repItem.namaBarang}` +
          (platDimensi ? ` Uk. ${platDimensi}` : '') +
          `   Harga Satuan : Rp. ${fmtN(platHargaSatuan)} / ${satuanPlat}`;
        const bannerContent = supplierLine ? `${supplierLine}\n${matLabelPlat}` : matLabelPlat;

        tableBody.push([
          {
            content: bannerContent,
            colSpan: 10,
            styles: {
              fontStyle: 'bold',
              fillColor: [255, 255, 255],
              textColor: [0, 0, 0],
              fontSize: 6.5,
              halign: 'left',
              cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
            },
          }
        ]);

        let totalPlatQty = 0;
        let totalPlatSubtotal = 0;
        let totalPlatBerat = 0;

        group.rows.forEach((row, rowIdx) => {
          const qty = parseFloat(row.jumlahKeperluan) || 0;
          const rowHarga = parseFloat(row.hargaSatuan || row.hargaModal || platHargaSatuan) || 0;
          const subtotal = parseFloat(row.subtotal) || (qty * rowHarga);
          const beratRow = parseFloat(row.beratTotal || 0) || 0;
          totalPlatQty += qty;
          totalPlatSubtotal += subtotal;
          totalPlatBerat += beratRow;

          const kode = row.kodeItem ? `${row.kodeItem}. ` : '';
          const displayQty = (row.jumlahKeperluan !== undefined && row.jumlahKeperluan !== null && String(row.jumlahKeperluan).trim() !== '')
            ? String(row.jumlahKeperluan).trim()
            : String(qty);
          const spesLabel = `${alphaLabel(rowIdx)}. ${kode}${row.namaBarang || repItem.namaBarang} (${displayQty} Bh.)`;
          const pemakaianVal = beratRow > 0 ? fmtDec(beratRow, 1) : fmtN(qty);

          tableBody.push([
            spesLabel,
            `${rowIdx + 1} .   ${pemakaianVal}`,
            '-',
            '-',
            fmtDec(beratRow, 1),
            fmtDec(beratRow, 1),
            '-',
            fmtN(subtotal),
            fmtN(subtotal),
            '',
          ]);
        });

        grandPemakaianM     += totalPlatBerat > 0 ? totalPlatBerat : totalPlatQty;
        grandBeratReal      += totalPlatBerat;
        grandBeratPlusWaste += totalPlatBerat;
        grandHargaPlusWaste += totalPlatSubtotal;
        grandHargaReal      += totalPlatSubtotal;

        const subTotalStyle = { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] };
        tableBody.push([
          { content: 'SUB TOTAL', styles: { ...subTotalStyle, halign: 'left' } },
          { content: totalPlatBerat > 0 ? fmtDec(totalPlatBerat, 1) : fmtN(totalPlatQty), styles: { ...subTotalStyle, halign: 'right' } },
          { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
          { content: totalPlatBerat > 0 ? fmtDec(totalPlatBerat, 1) : '-', styles: { ...subTotalStyle, halign: 'right' } },
          { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
          { content: totalPlatBerat > 0 ? fmtDec(totalPlatBerat, 1) : '-', styles: { ...subTotalStyle, halign: 'right' } },
          { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
          { content: fmtN(totalPlatSubtotal), styles: { ...subTotalStyle, halign: 'right' } },
          { content: fmtN(totalPlatSubtotal), styles: { ...subTotalStyle, halign: 'right' } },
          { content: '', styles: subTotalStyle },
        ]);
        return;
      }

      // ── Structural Items (batang, pipa, wf dll) ──
      const panjangMentah = summary.stockLength || repItem.panjangMentah || (repItem.panjangManual ? parseFloat(repItem.panjangManual) : 0) || 6000;
      const panjangMentahM = panjangMentah / 1000;
      const beratStandar = summary.beratStandar || repItem.beratPerBatang || 0;
      const hargaSatuan = summary.hargaSatuan || repItem.hargaSatuan || repItem.hargaModal || parseFloat(repItem.hargamodal || repItem.hargamodalManual || 0) || 0;
      const satuanHargaModal = repItem.satuanHargaModal || repItem.breakdown?.satuanHargaModal || 'batang';
      const satuanLabel = satuanHargaModal === 'kg' ? 'Kg' : (repItem.jenisBentuk === 'plat' ? 'Lbr' : 'Btg');
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
              items: pieces.length > 0
                ? pieces.map((p) => ({
                    label: p.label || guide.label || `Item${p.itemNo ?? gIdx + 1}`,
                    kodeItem: p.kodeItem || null,
                    itemNo: p.itemNo ?? gIdx + 1,
                    length: p.length ?? panjangTerpakaiMm,
                  }))
                : [{
                    label: group.rows[gIdx % group.rows.length]?.kodeItem || group.rows[gIdx % group.rows.length]?.namaBarang || `Item${gIdx + 1}`,
                    kodeItem: group.rows[gIdx % group.rows.length]?.kodeItem || null,
                    itemNo: gIdx + 1,
                    length: panjangTerpakaiMm,
                  }],
            };
          });
        } else {
          barAllocations = group.rows.flatMap((row, rIdx) => {
            let kebutuhan = row.breakdown?.kebutuhanBahan || 1;
            let panjangReal = row.breakdown?.panjangRealTerpakai || 0;
            let wasteTotal = row.breakdown?.waste || 0;

            if (row.isManual) {
              const pJadi = parseFloat(row.panjangJadi) || 0;
              const qty = parseInt(row.jumlahKeperluan) || 0;
              panjangReal = pJadi * qty;

              if (panjangMentah > 0 && pJadi > 0) {
                const manualBars = [];
                let currentRemaining = panjangMentah;
                let currentBarPieces = [];

                for (let i = 0; i < qty; i++) {
                  let cutRemaining = pJadi;
                  while (cutRemaining > 0) {
                    const cutLength = Math.min(cutRemaining, panjangMentah);
                    if (currentRemaining < cutLength - 0.01) {
                      manualBars.push({
                        panjangTerpakai: panjangMentah - currentRemaining,
                        sisa: currentRemaining,
                        items: currentBarPieces,
                      });
                      currentRemaining = panjangMentah;
                      currentBarPieces = [];
                    }
                    currentBarPieces.push({
                      label: row.kodeItem || row.namaBarang || `Item${rIdx + 1}`,
                      kodeItem: row.kodeItem || null,
                      itemNo: rIdx + 1,
                      length: cutLength,
                    });
                    currentRemaining -= cutLength;
                    cutRemaining -= cutLength;
                  }
                }
                if (currentBarPieces.length > 0) {
                  manualBars.push({
                    panjangTerpakai: panjangMentah - currentRemaining,
                    sisa: currentRemaining,
                    items: currentBarPieces,
                  });
                }

                return manualBars.map((bar, i) => ({
                  batangNo: rIdx * Math.max(1, manualBars.length) + i + 1,
                  panjangTerpakai: bar.panjangTerpakai,
                  sisa: bar.sisa,
                  wasteReusable: bar.sisa >= minWelding,
                  items: bar.items,
                }));
              } else {
                return [{
                  batangNo: rIdx + 1,
                  panjangTerpakai: panjangReal,
                  sisa: 0,
                  wasteReusable: false,
                  items: Array.from({ length: Math.max(1, qty) }).map(() => ({
                    label: row.kodeItem || row.namaBarang || `Item${rIdx + 1}`,
                    kodeItem: row.kodeItem || null,
                    itemNo: rIdx + 1,
                    length: pJadi || panjangReal,
                  })),
                }];
              }
            }

            const panjangPerBatang = kebutuhan > 0 ? panjangReal / kebutuhan : panjangMentah;
            const sisaPerBatang = kebutuhan > 0 ? wasteTotal / kebutuhan : 0;
            return Array.from({ length: Math.max(1, kebutuhan) }, (_, i) => ({
              batangNo: rIdx * Math.max(1, kebutuhan) + i + 1,
              panjangTerpakai: panjangPerBatang,
              sisa: sisaPerBatang,
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

      // Material Banner
      const hargaSatuanText = hargaSatuan > 0 ? `   Harga Satuan : Rp. ${fmtN(hargaSatuan)} / ${satuanLabel}` : '';
      const matLabel = repItem.isManual
        ? `${repItem.namaBarang}${panjangMentahM > 0 ? ` (Ukr Std : ${fmtDec(panjangMentahM, 2)} M / Berat Std : ${fmtDec(beratStandar, 2)} Kg )` : ''}${hargaSatuanText}`
        : `${repItem.namaBarang}` +
          (repItem.jenisBahan ? ` (${repItem.jenisBahan})` : '') +
          ` (Ukr Std : ${fmtDec(panjangMentahM, 2)} M / Berat Std : ${fmtDec(beratStandar, 2)} Kg )` +
          hargaSatuanText;
      const bannerContent = supplierLine ? `${supplierLine}\n${matLabel}` : matLabel;

      tableBody.push([
        {
          content: bannerContent,
          colSpan: 10,
          styles: {
            fontStyle: 'bold',
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontSize: 6.5,
            halign: 'left',
            cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
          },
        }
      ]);

      const totalRows = Math.max(group.rows.length, barAllocations.length);
      let groupPemakaianM     = 0;
      let groupPanjangSisaM   = 0;
      let groupBeratSisa      = 0;
      let groupBeratReal      = 0;
      let groupBeratPlusWaste = 0;
      let groupHargaReal      = 0;
      let groupHargaPlusWaste = 0;

      for (let rIdx = 0; rIdx < totalRows; rIdx++) {
        // Col 0: Spesifikasi / Uraian
        let spesLabel = '';
        if (rIdx < group.rows.length) {
          const row = group.rows[rIdx];
          const kode = row.kodeItem || row.namaBarang || repItem.namaBarang;
          const displayPanjang = formatUraianPanjang(row);
          const displayQty = (row.jumlahKeperluan !== undefined && row.jumlahKeperluan !== null && String(row.jumlahKeperluan).trim() !== '')
            ? String(row.jumlahKeperluan).trim()
            : String(row.jumlahKeperluan || 0);
          spesLabel = `${alphaLabel(rIdx)}. ${kode} ( ${displayPanjang} M, ${displayQty} Bh. )`;
        }

        // Col 1 to 9: Bar allocation data
        if (rIdx < barAllocations.length) {
          const bar = barAllocations[rIdx];
          const barNo = bar.batangNo || (rIdx + 1);
          const panjangTerpakaiMm = bar.panjangTerpakai ?? 0;
          const panjangTerpakaiM = panjangTerpakaiMm / 1000;
          const sisaMm = bar.sisa ?? Math.max(0, panjangMentah - panjangTerpakaiMm);
          const sisaM = sisaMm / 1000;

          const usageRatio = panjangMentah > 0 ? panjangTerpakaiMm / panjangMentah : 1;
          const billedRatio = usageRatio <= 0.5 ? 0.5 : usageRatio <= 0.75 ? 0.75 : 1;
          const hargaReal = billedRatio * hargaSatuan;
          const hargaPlusWaste = hargaSatuan;
          const beratReal = panjangMentah > 0 ? (panjangTerpakaiMm / panjangMentah) * beratStandar : 0;
          const beratSisa = Math.max(0, beratStandar - beratReal);

          groupPemakaianM     += panjangTerpakaiM;
          groupPanjangSisaM   += sisaM;
          groupBeratSisa      += beratSisa;
          groupBeratReal      += beratReal;
          groupBeratPlusWaste += beratStandar;
          groupHargaReal      += hargaReal;
          groupHargaPlusWaste += hargaPlusWaste;

          const pieces = bar.items || [];
          const potonganStr = pieces.map((p, pIdx) => {
            const lbl = p.kodeItem || p.label || `Item${p.itemNo || (rIdx + 1)}`;
            const pM = fmtDec((p.length || 0) / 1000, 3);
            return pIdx === 0 ? `${lbl}.(${pM})` : `${lbl} (${pM})`;
          }).join(' ');

          tableBody.push([
            spesLabel,
            `${barNo} .   ${fmtDec(panjangTerpakaiM, 2)}`,
            fmtDec(sisaM, 2),
            fmtDec(beratSisa, 2),
            fmtDec(beratReal, 2),
            fmtDec(beratStandar, 2),
            '-',
            fmtN(hargaPlusWaste),
            fmtN(hargaReal),
            potonganStr,
          ]);
        } else {
          tableBody.push([
            spesLabel,
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '',
          ]);
        }
      }

      grandPemakaianM     += groupPemakaianM;
      grandPanjangSisaM   += groupPanjangSisaM;
      grandBeratSisa      += groupBeratSisa;
      grandBeratReal      += groupBeratReal;
      grandBeratPlusWaste += groupBeratPlusWaste;
      grandHargaReal      += groupHargaReal;
      grandHargaPlusWaste += groupHargaPlusWaste;

      // Subtotal row
      const subTotalStyle = { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] };
      tableBody.push([
        { content: 'SUB TOTAL', styles: { ...subTotalStyle, halign: 'left' } },
        { content: fmtDec(groupPemakaianM, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtDec(groupPanjangSisaM, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtDec(groupBeratSisa, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtDec(groupBeratReal, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtDec(groupBeratPlusWaste, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: '-', styles: { ...subTotalStyle, halign: 'center' } },
        { content: fmtN(groupHargaPlusWaste), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtN(groupHargaReal), styles: { ...subTotalStyle, halign: 'right' } },
        { content: '', styles: subTotalStyle },
      ]);
    });

    // ── Grand Total ──────────────────────────────────────────────────────────
    const gtStyle = { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] };
    tableBody.push([
      { content: 'GRAND TOTAL', styles: { ...gtStyle, halign: 'left' } },
      { content: fmtDec(grandPemakaianM, 2), styles: { ...gtStyle, halign: 'right' } },
      { content: fmtDec(grandPanjangSisaM, 2), styles: { ...gtStyle, halign: 'right' } },
      { content: fmtDec(grandBeratSisa, 2), styles: { ...gtStyle, halign: 'right' } },
      { content: fmtDec(grandBeratReal, 2), styles: { ...gtStyle, halign: 'right' } },
      { content: fmtDec(grandBeratPlusWaste, 2), styles: { ...gtStyle, halign: 'right' } },
      { content: '-', styles: { ...gtStyle, halign: 'center' } },
      { content: fmtN(grandHargaPlusWaste), styles: { ...gtStyle, halign: 'right' } },
      { content: fmtN(grandHargaReal), styles: { ...gtStyle, halign: 'right' } },
      { content: '', styles: gtStyle },
    ]);

    const hargaSatuanWaste = nilaiDim > 0 ? grandHargaPlusWaste / Number(nilaiDim) : grandHargaPlusWaste;
    const hargaSatuanReal = nilaiDim > 0 ? grandHargaReal / Number(nilaiDim) : grandHargaReal;

    tableBody.push([
      { content: 'HARGA/SATUAN', styles: { ...gtStyle, halign: 'left' } },
      { content: '', styles: gtStyle },
      { content: '', styles: gtStyle },
      { content: '', styles: gtStyle },
      { content: '', styles: gtStyle },
      { content: '', styles: gtStyle },
      { content: '', styles: gtStyle },
      { content: fmtN(hargaSatuanWaste), styles: { ...gtStyle, halign: 'right' } },
      { content: fmtN(hargaSatuanReal), styles: { ...gtStyle, halign: 'right' } },
      { content: '', styles: gtStyle },
    ]);

    // ── Render Tabel Tunggal Terpadu ─────────────────────────────────────────
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

    // ── Footer Halaman ───────────────────────────────────────────────────────
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

    doc.save(`Estimasi_${(est.nomorEstimasi || 'doc').replace(/\//g, '-')}.pdf`);
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
                      <TableHead>Client</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Kontak</TableHead>
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

                            {/* CLIENT */}
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

                            {/* LOKASI */}
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

                            {/* KONTAK */}
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
                              Rp {Math.round(est?.totalEstimasi || 0).toLocaleString('id-ID')}
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => handleViewEstimasi(est)}
                                  className={`h-7 w-7 p-0 ${isViewing ? 'bg-sky-200' : ''}`}
                                  title="Lihat"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => exportEstimasiToPDF(est)}
                                  className="h-7 w-7 p-0 hover:bg-red-100"
                                  title="PDF"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => handleEditEstimasi(est)}
                                  className="h-7 w-7 p-0 hover:bg-blue-100"
                                  title="Edit"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
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

              {/* INFO CLIENT / LOKASI / KONTAK */}
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
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                            const totalBarang    = parseFloat(item.breakdown?.kebutuhanBahan || 0) || 0;
                            const fallbackBeratTotal = parseFloat(item.beratTotal || 0) || 0;
                            const rowBerat =
                              beratPerBatang > 0 && totalBarang > 0
                                ? beratPerBatang * totalBarang
                                : fallbackBeratTotal;
                            return sum + rowBerat;
                          }, 0);
                          const totalBeratWaste = (viewingEstimasi.items || []).reduce((sum, item) => {
                            const beratPerBatang = parseFloat(item.beratPerBatang || 0) || 0;
                            const panjangMentah  = parseFloat(item.panjangMentah  || 0) || 0;
                            const wastePanjang   = parseFloat(item.breakdown?.waste || 0) || 0;
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

                {/* Dimensi Pekerjaan */}
                <Card className="bg-blue-50">
                  <CardContent className="pt-6 flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Ruler className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Dimensi Pekerjaan</p>
                      <p className="text-lg font-bold">
                        {(() => {
                          const nilai =
                            viewingEstimasi.nilaiDimensiKerja ??
                            viewingEstimasi.luasRuangan ??
                            ((parseFloat(viewingEstimasi.panjangRuangan || 0) || 0) *
                              (parseFloat(viewingEstimasi.lebarRuangan || 0) || 0));
                          const satuan = viewingEstimasi.satuanDimensiKerja || 'm²';
                          return `${Number(nilai || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${satuan}`;
                        })()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* ── LUAS PERMUKAAN CARD (BARU) ── */}
                <Card className="bg-violet-50">
                  <CardContent className="pt-6 flex items-center gap-3">
                    <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                      <Square className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Luas Permukaan</p>
                      <p className="text-lg font-bold text-violet-700">
                        {(() => {
                          // Prioritas 1: pakai totalLuasPermukaan dari backend
                          if (viewingEstimasi.totalLuasPermukaan > 0) {
                            return Number(viewingEstimasi.totalLuasPermukaan).toFixed(2);
                          }
                          // Prioritas 2: jumlahkan luasPermukaanTotal tiap item
                          const total = (viewingEstimasi.items || []).reduce((sum, item) => {
                            return sum + (parseFloat(item.luasPermukaanTotal || 0) || 0);
                          }, 0);
                          return Number(total).toFixed(2);
                        })()} m²
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
                        Rp {Math.round(viewingEstimasi?.totalEstimasi || 0).toLocaleString('id-ID')}
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

              {/* Tabel Detail Material */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead className="text-right">Harga/Satuan</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Dimensi Kerja</TableHead>
                    <TableHead>Bahan</TableHead>
                    <TableHead>Panjang Real</TableHead>
                    <TableHead>Panjang Waste</TableHead>
                    <TableHead>Berat Sisa</TableHead>
                    <TableHead>Berat Real</TableHead>
                    <TableHead>Berat + Waste</TableHead>
                    <TableHead>Luas Permukaan</TableHead>
                    <TableHead>Harga Real</TableHead>
                    <TableHead>Harga + Waste</TableHead>
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
                      const isManualItem = !!item.isManual || item.barangId === '__manual__' || item.jenisBahan === 'Manual';
                      const groupingKey = isManualItem ? `manual-${item.namaBarang}` : item.barangId;
                      if (!groupedItems[groupingKey]) {
                        groupedItems[groupingKey] = {
                          ...item,
                          urutan              : item.urutan !== undefined && item.urutan !== null ? item.urutan : null,
                          totalBahan          : 0,
                          totalJumlah         : 0,
                          finalWaste          : 0,
                          finalWastePercentage: 0,
                          finalPanjangReal    : 0,
                          finalBeratReal      : 0,
                          finalBeratPlusWaste : 0,
                          finalHargaReal      : 0,
                          finalHargaPlusWaste : 0,
                          finalLuasPermukaan  : 0,   // ← BARU
                          count               : 0,
                          lastItemIndex       : -1,
                        };
                      }
                      const group = groupedItems[groupingKey];
                      if (group.urutan === null && item.urutan !== undefined && item.urutan !== null) {
                        group.urutan = item.urutan;
                      }
                      group.totalBahan          += item.breakdown?.kebutuhanBahan || 0;
                      group.totalJumlah         += item.jumlahKeperluan || 0;
                      group.finalLuasPermukaan  += parseFloat(item.luasPermukaanTotal || 0) || 0; // ← BARU
                      if (isManualItem) {
                        const curPanjang = (parseFloat(item.panjangJadi) || 0) * (parseFloat(item.jumlahKeperluan) || 0);
                        if (group.count > 0) {
                          group.subtotal = (group.subtotal || 0) + (item.subtotal || 0);
                          group.finalBeratReal = (group.finalBeratReal || 0) + (item.beratTotal || 0);
                          group.finalPanjangReal = (group.finalPanjangReal || 0) + curPanjang;
                        } else {
                          group.subtotal = item.subtotal || 0;
                          group.finalBeratReal = item.beratTotal || 0;
                          group.finalPanjangReal = curPanjang;
                        }

                        const pMentah = parseFloat(group.panjangMentah) || 0;
                        if (pMentah > 0 && group.finalPanjangReal > 0) {
                          group.totalBahan = Math.ceil(group.finalPanjangReal / pMentah);
                          group.finalWaste = (group.totalBahan * pMentah) - group.finalPanjangReal;
                          group.finalWastePercentage = (group.finalWaste / (group.totalBahan * pMentah)) * 100;
                          group.finalBeratPlusWaste = group.finalBeratReal * ((group.totalBahan * pMentah) / group.finalPanjangReal);
                        } else {
                          group.totalBahan = 0; // Use totalJumlah later
                          group.finalWaste = 0;
                          group.finalWastePercentage = 0;
                          group.finalBeratPlusWaste = group.finalBeratReal;
                        }
                      } else {
                        if (itemIdx >= group.lastItemIndex) {
                          group.finalWaste           = item.breakdown?.waste           || 0;
                          group.finalWastePercentage = item.breakdown?.wastePercentage || 0;
                          group.finalPanjangReal      = item.breakdown?.panjangRealTerpakai || 0;
                          const totalBeratReal       = parseFloat(item.breakdown?.summary?.totalBeratReal       || 0) || 0;
                          const totalBeratWaste      = parseFloat(item.breakdown?.summary?.totalBeratWaste      || 0) || 0;
                          const summary              = item.breakdown?.summary;
                          let totalHargaReal         = 0;
                          let totalHargaPlusWaste    = 0;
                          if (summary) {
                            if (summary.totalHargaPlusWaste !== undefined && summary.totalHargaPlusWaste !== null) {
                              totalHargaReal        = parseFloat(summary.totalHargaReal ?? summary.totalHargaPemakaian ?? 0) || 0;
                              totalHargaPlusWaste   = parseFloat(summary.totalHargaPlusWaste) || 0;
                            } else {
                              totalHargaReal        = parseFloat(summary.totalHargaPemakaian ?? summary.totalHargaReal ?? 0) || 0;
                              totalHargaPlusWaste   = parseFloat(summary.totalHargaReal ?? (summary.totalBars * (summary.hargaSatuan || 0)) ?? 0) || 0;
                            }
                          }
                          group.finalBeratReal       = totalBeratReal;
                          group.finalBeratPlusWaste  = totalBeratReal + totalBeratWaste;
                          group.finalHargaReal       = totalHargaReal;
                          group.finalHargaPlusWaste  = totalHargaPlusWaste;
                          group.lastItemIndex        = itemIdx;
                        }
                      }
                      group.count++;
                    });

                    const groupedValues = Object.values(groupedItems).sort((a, b) => {
                      const uA = a.urutan !== undefined && a.urutan !== null ? a.urutan : 999999;
                      const uB = b.urutan !== undefined && b.urutan !== null ? b.urutan : 999999;
                      return uA - uB;
                    });
                    const totals = groupedValues.reduce(
                      (acc, group) => {
                        const isManualRow =
                          !!group.isManual ||
                          group.barangId === '__manual__' ||
                          group.jenisBahan === 'Manual';

                        acc.panjangReal    += Number(group.finalPanjangReal    || 0);
                        acc.panjangWaste   += Number(group.finalWaste          || 0);
                        
                        acc.beratReal      += Number(group.finalBeratReal      || 0);
                        acc.beratPlusWaste += Number(group.finalBeratPlusWaste || 0);
                        acc.beratSisa      += Math.max(
                          Number(group.finalBeratPlusWaste || 0) - Number(group.finalBeratReal || 0),
                          0
                        );
                        acc.luasPermukaan  += Number(group.finalLuasPermukaan || 0); // ← BARU
                        acc.hargaPlusWaste += Number(isManualRow ? group.subtotal || 0 : group.finalHargaPlusWaste || 0);
                        acc.hargaReal      += Number(isManualRow ? group.subtotal || 0 : group.finalHargaReal      || 0);
                        return acc;
                      },
                      {
                        panjangReal   : 0,
                        panjangWaste  : 0,
                        beratReal     : 0,
                        beratPlusWaste: 0,
                        beratSisa     : 0,
                        luasPermukaan : 0,   // ← BARU
                        hargaPlusWaste: 0,
                        hargaReal     : 0,
                      }
                    );

                    const rows = groupedValues.map((group, idx) => {
                      const isCustom = group.jenisBentuk === 'custom' || group.breakdown?.isCustom === true || group.jenisBentukManual === 'custom';
                      const isManualRow =
                        !!group.isManual ||
                        group.barangId === '__manual__' ||
                        group.jenisBahan === 'Manual';
                      const wastePercentage = group.finalWastePercentage || 0;
                      const effectiveLuasKerja = resolvedDimensiKerja > 0 
                        ? resolvedDimensiKerja : Number(group.luasPekerjaan || 0);

                      // Hitung harga satuan per item group
                      const hargaSatuanGroup = (() => {
                        // Cek dari breakdown summary dulu
                        const fromSummary = parseFloat(group.breakdown?.summary?.hargaSatuan || 0) || 0;
                        if (fromSummary > 0) return fromSummary;
                        // Cek dari field langsung
                        const fromField = parseFloat(group.hargaSatuan || group.hargaModal || group.hargamodal || group.hargamodalManual || 0) || 0;
                        if (fromField > 0) return fromField;
                        return 0;
                      })();
                      const satuanGroup = isCustom
                        ? resolveItemSatuan(group, 'Bh')
                        : (group.satuanHargaModal === 'kg' || group.breakdown?.satuanHargaModal === 'kg' ? 'Kg' : (group.jenisBentuk === 'plat' ? 'Lbr' : 'Btg'));

                      return (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">
                            {group.namaBarang}
                            <br />
                            <span className="text-xs text-gray-500">{group.jenisBahan || (isCustom ? 'Custom' : '-')}</span>
                            {/* Tampilkan supplier, jika kosong tampilkan - */}
                            <br />
                            <span className="text-xs text-sky-600 font-medium">
                              📦 {group.supplier && group.supplier.trim() ? group.supplier : '-'}
                            </span>
                          </TableCell>
                          {/* ── HARGA/SATUAN CELL ── */}
                          <TableCell className="text-right">
                            {hargaSatuanGroup > 0 ? (
                              <span className="font-semibold text-sky-700 text-xs">
                                Rp {Number(hargaSatuanGroup).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-gray-400 font-normal ml-0.5">/ {satuanGroup}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!isCustom && Number(group.panjangMentah) > 0 ? `${formatNumberWithSeparator(group.panjangMentah)} mm` : '-'}
                          </TableCell>
                          <TableCell>
                            {effectiveLuasKerja > 0 ? (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                {Number(effectiveLuasKerja).toFixed(2)} {viewingEstimasi.satuanDimensiKerja || 'm²'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-purple-600">
                            {isCustom ? `${group.totalJumlah} ${resolveItemSatuan(group, 'Bh')}` : (isManualRow && group.totalBahan === 0 ? group.totalJumlah : group.totalBahan)}
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-700">
                            {!isCustom && typeof group.finalPanjangReal === 'number' && group.finalPanjangReal > 0
                              ? `${formatNumberWithSeparator(group.finalPanjangReal / 1000)} M`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {!isCustom && typeof group.finalWaste === 'number' && group.finalWaste > 0
                              ? `${formatNumberWithSeparator(group.finalWaste / 1000)} M (${Math.round(wastePercentage || 0)}%)`
                              : '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-cyan-700">
                            {!isCustom && typeof group.finalBeratPlusWaste === 'number' && typeof group.finalBeratReal === 'number' && (group.finalBeratPlusWaste - group.finalBeratReal) > 0
                              ? `${Number(Math.max((group.finalBeratPlusWaste || 0) - (group.finalBeratReal || 0), 0)).toFixed(2)} kg`
                              : '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-700">
                            {!isCustom && typeof group.finalBeratReal === 'number' && group.finalBeratReal > 0 ? `${Number(group.finalBeratReal).toFixed(2)} kg` : '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-indigo-700">
                            {!isCustom && typeof group.finalBeratPlusWaste === 'number' && group.finalBeratPlusWaste > 0 ? `${Number(group.finalBeratPlusWaste).toFixed(2)} kg` : '-'}
                          </TableCell>

                          {/* ── LUAS PERMUKAAN CELL ── */}
                          <TableCell className="font-semibold text-violet-700">
                            {!isCustom && typeof group.finalLuasPermukaan === 'number' && group.finalLuasPermukaan > 0
                                ? `${Number(group.finalLuasPermukaan).toFixed(2)} m²`
                                : <span className="text-gray-400 text-xs">-</span>}
                          </TableCell>

                          <TableCell className="font-semibold text-emerald-600">
                            {(() => {
                              const val = isManualRow || isCustom ? Number(group.subtotal || 0) : Number(group.finalHargaReal ?? group.subtotal ?? 0);
                              return val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '-';
                            })()}
                          </TableCell>
                          <TableCell className="font-semibold text-amber-700">
                            {(() => {
                              const val = isManualRow || isCustom ? Number(group.subtotal || 0) : Number(group.finalHargaPlusWaste ?? group.subtotal ?? 0);
                              return val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '-';
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    });

                    rows.push(
                      <TableRow key="totals-row" className="bg-gray-50">
                        <TableCell colSpan={6} className="text-right font-bold">
                          TOTAL
                        </TableCell>
                        <TableCell className="font-bold text-emerald-700">
                          {formatNumberWithSeparator((totals.panjangReal || 0) / 1000)} M
                        </TableCell>
                        <TableCell className="font-bold text-red-700">
                          {formatNumberWithSeparator((totals.panjangWaste || 0) / 1000)} M
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
                        {/* ── TOTAL LUAS PERMUKAAN ── */}
                        <TableCell className="font-bold text-violet-700">
                          {totals.luasPermukaan > 0
                            ? `${Number(totals.luasPermukaan).toFixed(2)} m²`
                            : '-'}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">
                          Rp {Math.round(totals.hargaReal || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="font-bold text-amber-700">
                          Rp {Math.round(totals.hargaPlusWaste || 0).toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    );

                    // ── Baris Harga Satuan (Grand Total / Dimensi Kerja) ──────────────
                    const dimensiKerjaValue =
                      Number(viewingEstimasi.nilaiDimensiKerja || 0) ||
                      Number(viewingEstimasi.luasRuangan || 0) ||
                      ((parseFloat(viewingEstimasi.panjangRuangan || 0) || 0) *
                        (parseFloat(viewingEstimasi.lebarRuangan || 0) || 0));
                    const satuanDimensi = viewingEstimasi.satuanDimensiKerja || 'm²';
                    const grandTotalValue = totals.hargaPlusWaste || 0;
                    const hargaSatuanPerDimensi =
                      dimensiKerjaValue > 0 ? grandTotalValue / dimensiKerjaValue : null;
                    const hargaSatuanReal =
                      dimensiKerjaValue > 0 ? (totals.hargaReal || 0) / dimensiKerjaValue : null;

                    if (hargaSatuanPerDimensi !== null) {
                      rows.push(
                        <TableRow key="harga-satuan-row" className="bg-sky-50 border-t-2 border-sky-200">
                          <TableCell colSpan={12} className="text-left font-bold text-sky-800 text-sm tracking-wide">
                            HARGA / SATUAN
                          </TableCell>
                          <TableCell className="font-bold text-emerald-700 text-base text-right">
                            {Math.round(hargaSatuanReal || 0).toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="font-bold text-amber-700 text-base text-right">
                            {Math.round(hargaSatuanPerDimensi).toLocaleString('id-ID')}
                          </TableCell>
                        </TableRow>
                      );

                    }

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