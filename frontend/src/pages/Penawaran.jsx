import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { FileText, Plus, Download, FileSpreadsheet, Trash2, Eye, Zap, Weight, Ruler, Calculator, Check, Loader2, Edit, Search } from 'lucide-react';
import { estimasiAPI, penawaranAPI } from '@/services/api';
import { formatNumberWithSeparator } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Penawaran = () => {
  const [penawaranList, setPenawaranList] = useState([]);
  const [estimasiList, setEstimasiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPenawaran, setSelectedPenawaran] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [clientForm, setClientForm] = useState({
    namaProject: '',
    lokasiProject: '',
    clientNama: '',
    clientKontak: ''
  });
  const [selectedEstimasiIds, setSelectedEstimasiIds] = useState([]);
  const [hargaJualMap, setHargaJualMap] = useState({}); // { itemIndex: customPrice }
  const [editMode, setEditMode] = useState(false);
  const [editingPenawaranId, setEditingPenawaranId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const formatRupiah = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Math.round(Number(value) || 0);
    return numeric.toLocaleString('id-ID');
  };

  const unformatRupiah = (value) => {
    return String(value || '').replace(/[^\d]/g, '');
  };

  const getItemSubtotalModal = (group) => {
    const hargaModal = Number(group?.hargaModal || 0) || 0;
    const qty = Number(group?.totalBahan || 0) || 0;
    return Math.round(hargaModal * qty);
  };

  const getItemHargaJual = (itemIndex) => {
    return Math.round(Number(hargaJualMap[itemIndex] || 0) || 0);
  };

  const getItemSubtotalJual = (group, itemIndex) => {
    const hargaJual = getItemHargaJual(itemIndex);
    return Math.round(Number(group.totalBahan || 0) * hargaJual);
  };

  const getEstimasiDimensiKerja = (estimasi) => {
    const direct = parseFloat(estimasi?.luasRuangan);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const panjang = parseFloat(estimasi?.panjangRuangan) || 0;
    const lebar = parseFloat(estimasi?.lebarRuangan) || 0;
    return panjang * lebar;
  };

  const getResolvedItemDimensiKerja = (item, estimasiDimensiKerja) => {
    const itemDimensi = parseFloat(item?.luasPekerjaan);
    if (Number.isFinite(itemDimensi) && itemDimensi > 0) return itemDimensi;
    if (Number.isFinite(estimasiDimensiKerja) && estimasiDimensiKerja > 0) return estimasiDimensiKerja;
    return 0;
  };

  const collectSelectedEstimasiItems = (selectedEstimasi) => {
    return selectedEstimasi.flatMap(est => {
      const estimasiDimensiKerja = getEstimasiDimensiKerja(est);
      return (est.items || []).map(item => ({
        ...item,
        fromEstimasi: est.nomorEstimasi,
        luasPekerjaan: getResolvedItemDimensiKerja(item, estimasiDimensiKerja)
      }));
    });
  };

  const isManualItem = (item) => {
    return !!item?.isManual || item?.barangId === '__manual__' || item?.jenisBahan === 'Manual';
  };

  const getItemBahanValue = (item) => {
    return isManualItem(item)
      ? (parseInt(item?.jumlahKeperluan) || 0)
      : (item?.breakdown?.kebutuhanBahan || 0);
  };

  const getItemWeldingStats = (item) => {
    const guides = item?.breakdown?.cuttingGuide || [];
    const totalFromBreakdown = parseInt(item?.breakdown?.totalTitikWelding) || 0;
    const totalFromGuides = guides.reduce((sum, guide) => sum + (parseInt(guide?.titikWelding) || 0), 0);
    const weldingPointsPerItem = parseInt(item?.breakdown?.summary?.weldingPointsPerItem) || 0;
    const qty = parseInt(item?.jumlahKeperluan) || 0;
    const totalFromSummary = weldingPointsPerItem > 0 ? weldingPointsPerItem * (qty || 1) : 0;
    const hasWeldingGuide = guides.some((guide) =>
      (parseInt(guide?.titikWelding) || 0) > 0 ||
      Array.isArray(guide?.pieces) ||
      typeof guide?.itemNo !== 'undefined'
    );

    const total = totalFromBreakdown || totalFromGuides || totalFromSummary || 0;
    const isWelding = !!item?.breakdown?.needsWelding || total > 0 || hasWeldingGuide;

    return { isWelding, total, guides };
  };

  const getItemWeightStats = (item) => {
    if (isManualItem(item)) {
      return { real: 0, waste: 0, material: 0 };
    }

    const beratPerBatang = parseFloat(item?.beratPerBatang || 0) || 0;
    const panjangMentah = parseFloat(item?.panjangMentah || 0) || 0;
    const wastePanjang = parseFloat(item?.breakdown?.waste || 0) || 0;
    const panjangRealTerpakai = parseFloat(item?.breakdown?.panjangRealTerpakai || 0) || 0;
    const fallbackBeratTotal = parseFloat(item?.beratTotal || 0) || 0;

    // New formula: Berat + waste = (panjang real + panjang waste) / panjang per batang × berat per batang
    if (beratPerBatang > 0 && panjangMentah > 0) {
      if (panjangRealTerpakai > 0 || wastePanjang > 0) {
        const totalPanjang = panjangRealTerpakai + wastePanjang;
        const totalBeratMaterial = (totalPanjang / panjangMentah) * beratPerBatang;
        const waste = (wastePanjang / panjangMentah) * beratPerBatang;
        const real = Math.max(totalBeratMaterial - waste, 0);
        return { real, waste, material: totalBeratMaterial };
      } else {
        // Fallback to old calculation if breakdown data not available
        const kebutuhanBahan = parseFloat(item?.breakdown?.kebutuhanBahan || 0) || 0;
        const material = kebutuhanBahan > 0 ? (beratPerBatang * kebutuhanBahan) : fallbackBeratTotal;
        const waste = wastePanjang > 0 ? ((beratPerBatang / panjangMentah) * wastePanjang) : 0;
        const real = Math.max(material - waste, 0);
        return { real, waste, material };
      }
    }

    return { real: 0, waste: 0, material: fallbackBeratTotal };
  };

  const getItemsWeightTotals = (items = []) => {
    return items.reduce((acc, item) => {
      const stats = getItemWeightStats(item);
      acc.real += stats.real;
      acc.waste += stats.waste;
      return acc;
    }, { real: 0, waste: 0 });
  };

  const sumMetricValues = (values = []) => {
    return values.reduce((sum, value) => sum + (Number(value) || 0), 0);
  };

  const buildGroupedItemsByBarang = (items = []) => {
    const groupedItems = {};

    items.forEach((item) => {
      if (!groupedItems[item.barangId]) {
        groupedItems[item.barangId] = {
          barangId: item.barangId,
          namaBarang: item.namaBarang,
          panjangMentah: item.panjangMentah,
          panjangJadi: item.panjangJadi,
          dimensiKerjaValues: [],
          bahanValues: [],
          weldingValues: [],
          wasteValues: [],
          representativeItem: null,
          hargaModal: 0,
          totalBahan: 0,
          totalWelding: 0,
          totalWaste: 0,
          totalSubtotal: 0,
          count: 0
        };
      }

      const group = groupedItems[item.barangId];
      const dimensiKerjaItem = parseFloat(item.luasPekerjaan || 0);
      if (Number.isFinite(dimensiKerjaItem) && dimensiKerjaItem > 0) {
        group.dimensiKerjaValues.push(dimensiKerjaItem);
      }

      group.bahanValues.push(getItemBahanValue(item));
      group.weldingValues.push(getItemWeldingStats(item).total);
      group.wasteValues.push(item.breakdown?.waste || 0);

      // Non-manual item carries group-level breakdown produced by allocation engine.
      if (!group.representativeItem && !isManualItem(item) && item?.breakdown) {
        group.representativeItem = item;
        group.hargaModal = Number(item?.hargaSatuan || 0) || 0;
      }

      group.totalSubtotal += item.subtotal || 0;
      group.count += 1;
    });

    return Object.values(groupedItems).map((group) => {
      const representative = group.representativeItem;

      // For material groups, use one representative row to avoid duplicated group totals.
      const totalBahan = representative
        ? (Number(getItemBahanValue(representative)) || 0)
        : sumMetricValues(group.bahanValues);
      const totalWelding = representative
        ? (Number(getItemWeldingStats(representative).total) || 0)
        : sumMetricValues(group.weldingValues);
      const totalWaste = representative
        ? (Number(representative?.breakdown?.waste) || 0)
        : sumMetricValues(group.wasteValues);
      const hargaModal = representative ? (Number(group.hargaModal || representative?.hargaSatuan || 0) || 0) : 0;

      return {
        ...group,
        totalBahan,
        totalWelding,
        totalWaste,
        hargaModal
      };
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [penawaranData, estimasiData] = await Promise.all([
        penawaranAPI.getAll(),
        estimasiAPI.getAll()
      ]);
      setPenawaranList(penawaranData);
      setEstimasiList(estimasiData);
    } catch (error) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClientFormChange = (e) => {
    const { name, value } = e.target;
    setClientForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleEstimasiSelection = (estId) => {
    setSelectedEstimasiIds(prev => 
      prev.includes(estId) ? prev.filter(id => id !== estId) : [...prev, estId]
    );
  };

  const updateEstimasiSelectionFromPreview = (estId) => {
    const newSelection = selectedEstimasiIds.includes(estId) 
      ? selectedEstimasiIds.filter(id => id !== estId) 
      : [...selectedEstimasiIds, estId];
    
    setSelectedEstimasiIds(newSelection);
    
    // Recalculate preview data
    if (newSelection.length === 0) {
      toast.error('Minimal pilih 1 estimasi!');
      return;
    }
    
    const selectedEstimasi = estimasiList.filter(e => newSelection.includes(e.id));
    const allItems = collectSelectedEstimasiItems(selectedEstimasi);

    const groupedArray = buildGroupedItemsByBarang(allItems);
    
    // Preserve existing harga jual or use subtotal
    const updatedPrices = {};
    groupedArray.forEach((group, idx) => {
      const qty = Number(group.totalBahan || 0) || 0;
      const defaultUnitPrice = qty > 0 ? Math.round(Number(group.totalSubtotal || 0) / qty) : 0;
      updatedPrices[idx] = Math.round(Number(hargaJualMap[idx] || defaultUnitPrice) || 0);
    });
    setHargaJualMap(updatedPrices);

    // Calculate totals
    const weightTotals = getItemsWeightTotals(allItems);
    const totalBeratReal = weightTotals.real;
    const totalBeratWaste = weightTotals.waste;
    const totalLuasPermukaan = selectedEstimasi.reduce((sum, est) => sum + (est.totalLuasPermukaan || 0), 0);
    const totalTitikWelding = selectedEstimasi.reduce((sum, est) => sum + (est.totalTitikWelding || 0), 0);
    const totalDimensiKerja = selectedEstimasi.reduce((sum, est) => sum + getEstimasiDimensiKerja(est), 0);

    setPreviewData({
      clientInfo: { ...clientForm },
      estimasiList: selectedEstimasi.map(e => ({ id: e.id, nomor: e.nomorEstimasi, nama: e.namaEstimasi })),
      groupedItems: groupedArray,
      originalItems: allItems,
      totalBeratReal,
      totalBeratWaste,
      totalLuasPermukaan,
      totalTitikWelding,
      totalDimensiKerja
    });
  };

  const handleHargaJualChange = (itemIndex, value) => {
    const unformatted = unformatRupiah(value);
    const numValue = parseFloat(unformatted) || 0;
    setHargaJualMap(prev => ({ ...prev, [itemIndex]: numValue }));
  };

  const showPreviewPenawaran = () => {
    if (!clientForm.namaProject || !clientForm.lokasiProject || !clientForm.clientNama || !clientForm.clientKontak) {
      toast.error('Mohon lengkapi semua data client!');
      return;
    }
    if (selectedEstimasiIds.length === 0) {
      toast.error('Pilih minimal 1 estimasi!');
      return;
    }

    const selectedEstimasi = estimasiList.filter(e => selectedEstimasiIds.includes(e.id));
    const allItems = collectSelectedEstimasiItems(selectedEstimasi);

    const groupedArray = buildGroupedItemsByBarang(allItems);
    
    // Initialize hargaJualMap with subtotals per group
    const initialPrices = {};
    groupedArray.forEach((group, idx) => {
      const qty = Number(group.totalBahan || 0) || 0;
      initialPrices[idx] = qty > 0 ? Math.round(Number(group.totalSubtotal || 0) / qty) : 0;
    });
    setHargaJualMap(initialPrices);

    // Calculate totals
    const weightTotals = getItemsWeightTotals(allItems);
    const totalBeratReal = weightTotals.real;
    const totalBeratWaste = weightTotals.waste;
    const totalLuasPermukaan = selectedEstimasi.reduce((sum, est) => sum + (est.totalLuasPermukaan || 0), 0);
    const totalTitikWelding = selectedEstimasi.reduce((sum, est) => sum + (est.totalTitikWelding || 0), 0);
    const totalDimensiKerja = selectedEstimasi.reduce((sum, est) => sum + getEstimasiDimensiKerja(est), 0);

    setPreviewData({
      clientInfo: { ...clientForm },
      estimasiList: selectedEstimasi.map(e => ({ id: e.id, nomor: e.nomorEstimasi, nama: e.namaEstimasi })),
      groupedItems: groupedArray,
      originalItems: allItems,
      totalBeratReal,
      totalBeratWaste,
      totalLuasPermukaan,
      totalTitikWelding,
      totalDimensiKerja
    });
    
    setShowCreateDialog(false);
    setShowPreview(true);
  };

  const confirmCreatePenawaran = async () => {
    try {
      setSaving(true);
      
      // Calculate total from hargaJualMap
      const totalHarga = (previewData?.groupedItems || []).reduce((sum, group, idx) => {
        const hj = getItemHargaJual(idx);
        return sum + (hj > 0 ? Number(group.totalBahan || 0) * hj : 0);
      }, 0);

      const penawaranData = {
        ...previewData.clientInfo,
        estimasiIds: selectedEstimasiIds,
        estimasiList: previewData.estimasiList,
        items: previewData.originalItems,
        totalHarga: Math.round(totalHarga),
        totalBerat: Math.round(previewData.totalBeratReal * 100) / 100,
        totalLuasPermukaan: Math.round(previewData.totalLuasPermukaan * 100) / 100,
        totalTitikWelding: previewData.totalTitikWelding,
        totalDimensiKerja: Math.round((previewData.totalDimensiKerja || 0) * 100) / 100
      };

      const savedPenawaran = editMode
        ? await penawaranAPI.update(editingPenawaranId, penawaranData)
        : await penawaranAPI.create(penawaranData);
      await loadData();
      setShowPreview(false);
      resetCreateForm();
      toast.success(
        editMode
          ? `Penawaran ${savedPenawaran.nomorPenawaran} berhasil diupdate!`
          : `Penawaran ${savedPenawaran.nomorPenawaran} berhasil dibuat!`
      );
    } catch (error) {
      toast.error(`Gagal ${editMode ? 'update' : 'membuat'} penawaran: ` + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setClientForm({ namaProject: '', lokasiProject: '', clientNama: '', clientKontak: '' });
    setSelectedEstimasiIds([]);
    setHargaJualMap({});
    setPreviewData(null);
    setEditMode(false);
    setEditingPenawaranId(null);
  };

  const handleEditPenawaran = (penawaran) => {
    setClientForm({
      namaProject: penawaran.namaProject || '',
      lokasiProject: penawaran.lokasiProject || '',
      clientNama: penawaran.clientNama || '',
      clientKontak: penawaran.clientKontak || ''
    });
    setSelectedEstimasiIds(penawaran.estimasiIds || []);
    setHargaJualMap({});
    setPreviewData(null);
    setEditMode(true);
    setEditingPenawaranId(penawaran.id);
    setShowCreateDialog(true);
    toast.info(`Edit mode: ${penawaran.nomorPenawaran}`);
  };

  const deletePenawaran = async (id) => {
    const pnw = penawaranList.find(p => p.id === id);
    if (!confirm(`Hapus penawaran ${pnw?.nomorPenawaran}?`)) return;
    
    try {
      await penawaranAPI.delete(id);
      await loadData();
      toast.success('Penawaran berhasil dihapus!');
    } catch (error) {
      toast.error('Gagal menghapus penawaran: ' + error.message);
    }
  };

  const viewDetail = (penawaran) => {
    const groupedArray = buildGroupedItemsByBarang(penawaran.items || []);

    // Convert to array and add to penawaran object
    const weightTotals = getItemsWeightTotals(penawaran.items || []);

    const detailWithGrouped = {
      ...penawaran,
      totalBeratReal: weightTotals.real,
      totalBeratWaste: weightTotals.waste,
      totalDimensiKerja: penawaran.totalDimensiKerja || 0,
      groupedItems: groupedArray
    };
    setSelectedPenawaran(detailWithGrouped);
    setShowDetail(true);
  };

  const exportToPDF = (penawaran) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginL = 10;
    const marginR = 10;

    const weightTotals = getItemsWeightTotals(penawaran.items || []);
    const luasKerja = Number(penawaran.totalDimensiKerja || 0);
    const totalHargaJual = Number(penawaran.totalHarga || 0);
    const totalHargaModal = (penawaran.items || []).reduce((sum, item) => sum + (Number(item.subtotal || 0) || 0), 0);
    const jualRatio = totalHargaModal > 0 ? (totalHargaJual / totalHargaModal) : 1;

    const fmtN = (v, d = 0) => Number(v || 0).toLocaleString('id-ID', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
    const fmtRp = (v) => `Rp. ${fmtN(v)}`;

    const printHeader = () => {
      doc.setFillColor(246, 248, 251);
      doc.rect(marginL, 7, pageWidth - marginL - marginR, 23, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('SURAT PENAWARAN DAN PEMAKAIAN BAHAN', pageWidth / 2, 12, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Rincian Pemakaian Batang, Berat, dan Biaya per Material', pageWidth / 2, 16, { align: 'center' });

      doc.setFontSize(8);
      doc.text(`Tanggal : ${new Date(penawaran.createdAt).toLocaleDateString('id-ID')}`, pageWidth - marginR, 12, { align: 'right' });
      doc.text(`No. Bukti : ${penawaran.nomorPenawaran}`, pageWidth - marginR, 17, { align: 'right' });
      doc.text(`Nama Proyek : ${penawaran.namaProject || '-'}`, marginL + 2, 17);
      doc.text(`Client : ${penawaran.clientNama || '-'} (${penawaran.clientKontak || '-'})`, marginL + 2, 22);
      doc.text(`Lokasi : ${penawaran.lokasiProject || '-'}`, marginL + 78, 22);
      if (luasKerja > 0) {
        doc.text(`Dimensi Kerja : ${fmtN(luasKerja, 2)} m²`, marginL + 2, 27);
      }
      if (penawaran.estimasiList?.length > 0) {
        doc.text(`Estimasi : ${penawaran.estimasiList.map((e) => e.nomor).join(', ')}`, pageWidth - marginR, 27, { align: 'right' });
      }

      doc.setLineWidth(0.3);
      doc.line(marginL, 31, pageWidth - marginR, 31);
    };

    let startY = 35;
    const ensurePageSpace = (requiredHeight = 20) => {
      if (startY > pageHeight - requiredHeight) {
        doc.addPage();
        startY = 15;
        printHeader();
        startY = 35;
      }
    };

    const groups = {};
    const groupOrder = [];
    (penawaran.items || []).forEach((item) => {
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
      const panjangMentah = Number(summary.stockLength || repItem.panjangMentah || 6000);
      const panjangMentahM = panjangMentah / 1000;
      const beratStandar = Number(summary.beratStandar || repItem.beratPerBatang || 0);
      const hargaSatuan = Number(summary.hargaSatuan || repItem.hargaSatuan || 0);
      const hargaSatuanJual = hargaSatuan * jualRatio;
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
              wasteReusable: guide.wasteReusable ?? (sisaMm >= minWelding),
              items: pieces.length > 0
                ? pieces.map((p) => ({
                    label: p.label || guide.label || `Item${p.itemNo ?? gIdx + 1}`,
                    kodeItem: p.kodeItem || null,
                    itemNo: p.itemNo ?? gIdx + 1,
                    length: p.length ?? panjangTerpakaiMm
                  }))
                : [{
                    label: group.rows[gIdx % group.rows.length]?.kodeItem ||
                      group.rows[gIdx % group.rows.length]?.namaBarang ||
                      `Item${gIdx + 1}`,
                    kodeItem: group.rows[gIdx % group.rows.length]?.kodeItem || null,
                    itemNo: gIdx + 1,
                    length: panjangTerpakaiMm
                  }]
            };
          });
        } else {
          barAllocations = group.rows.flatMap((row, rIdx) => {
            const kebutuhan = Number(row.breakdown?.kebutuhanBahan || 1);
            const panjangReal = Number(row.breakdown?.panjangRealTerpakai || 0);
            const wasteTotal = Number(row.breakdown?.waste || 0);
            const panjangPerBatang = kebutuhan > 0 ? (panjangReal / kebutuhan) : panjangMentah;
            const sisaPerBatang = kebutuhan > 0 ? (wasteTotal / kebutuhan) : 0;

            return Array.from({ length: kebutuhan }, (_, i) => ({
              batangNo: rIdx * kebutuhan + i + 1,
              panjangTerpakai: panjangPerBatang,
              sisa: i === kebutuhan - 1 ? sisaPerBatang : 0,
              wasteReusable: sisaPerBatang >= minWelding,
              items: [{
                label: row.kodeItem || row.namaBarang || `Item${rIdx + 1}`,
                kodeItem: row.kodeItem || null,
                itemNo: rIdx + 1,
                length: panjangPerBatang
              }]
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
          `  Harga Jual : ${fmtRp(hargaSatuanJual)} / Btg`;

      doc.setFillColor(238, 242, 247);
      doc.rect(marginL, startY - 2.8, pageWidth - marginL - marginR, 4.3, 'F');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(matLabel, marginL + 1.2, startY);
      startY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(
        `${new Date(penawaran.createdAt).toLocaleDateString('id-ID')}   ${penawaran.namaProject || '-'}`,
        marginL,
        startY
      );
      startY += 3.5;

      if (repItem.isManual) {
        const qty = group.rows.reduce((s, r) => s + (Number(r.jumlahKeperluan) || 0), 0);
        const subtotalModal = group.rows.reduce((s, r) => s + (Number(r.subtotal) || 0), 0);
        const subtotalJual = subtotalModal * jualRatio;
        const hargaSatuanJualManual = qty > 0 ? (subtotalJual / qty) : (Number(repItem.hargaSatuan || 0) * jualRatio);

        autoTable(doc, {
          startY,
          head: [['No', 'Nama Barang', 'Qty', 'Harga Jual', 'Subtotal Jual']],
          body: [[1, repItem.namaBarang, qty, fmtRp(hargaSatuanJualManual), fmtRp(subtotalJual)]],
          theme: 'grid',
          headStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold', fontSize: 6.5 },
          styles: { fontSize: 6.5, cellPadding: 1.5 },
          margin: { left: marginL, right: marginR }
        });

        grandHargaReal += subtotalJual;
        grandHargaPlusWaste += subtotalJual;
        startY = doc.lastAutoTable.finalY + 5;
        return;
      }

      const tableBody = [];
      const barsByItem = new Map();
      barAllocations.forEach((bar) => {
        (bar.items || []).forEach((piece) => {
          const itemNo = piece.itemNo;
          if (!barsByItem.has(itemNo)) barsByItem.set(itemNo, []);
          const existing = barsByItem.get(itemNo);
          if (!existing.find((b) => b.batangNo === bar.batangNo)) {
            existing.push(bar);
          }
        });
      });

      const alphaLabel = (i) => String.fromCharCode(97 + i);

      group.rows.forEach((row, rowIdx) => {
        const itemNo = rowIdx + 1;
        const barsForItem = barsByItem.get(itemNo) || [];
        const panjangJadiM = (Number(row.panjangJadi) || 0) / 1000;
        const qty = Number(row.jumlahKeperluan) || 0;
        const kode = row.kodeItem || row.namaBarang || repItem.namaBarang;
        const spesLabel = `${alphaLabel(rowIdx)}. ${kode} ( ${fmtN(panjangJadiM, 1)} M, ${qty} Bh. )`;
        const luasPek = Number(row.luasPekerjaan) > 0 ? fmtN(row.luasPekerjaan, 2) : '-';

        if (barsForItem.length === 0) {
          const rowHargaJual = Number(row.hargaSatuan || 0) * jualRatio;
          tableBody.push([
            spesLabel,
            '-',
            '-',
            '-',
            '-',
            '-',
            luasPek,
            fmtRp(rowHargaJual),
            fmtRp(rowHargaJual)
          ]);
          return;
        }

        barsForItem.forEach((bar, bIdx) => {
          const panjangTerpakaiMm = Number(bar.panjangTerpakai ?? 0);
          const sisaMm = Number(bar.sisa ?? 0);
          const sisaM = sisaMm / 1000;

          const usageRatio = panjangMentah > 0 ? (panjangTerpakaiMm / panjangMentah) : 1;
          const billedRatio = usageRatio <= 0.5 ? 0.5 : usageRatio <= 0.75 ? 0.75 : 1;
          const hargaPemakaian = billedRatio * hargaSatuan;
          const hargaPemakaianJual = hargaPemakaian * jualRatio;
          const hargaSatuanJualBar = hargaSatuan * jualRatio;
          const beratReal = panjangMentah > 0 ? ((panjangTerpakaiMm / panjangMentah) * beratStandar) : 0;
          const beratSisa = beratStandar - beratReal;

          tableBody.push([
            bIdx === 0 ? spesLabel : '',
            `${bIdx + 1} .  ${fmtN(panjangTerpakaiMm / 1000, 0)}`,
            sisaM > 0 ? fmtN(sisaM, 2) : '-',
            fmtN(beratSisa, 2),
            fmtN(beratReal, 2),
            fmtN(beratStandar, 2),
            luasPek,
            fmtRp(hargaPemakaianJual),
            fmtRp(hargaSatuanJualBar)
          ]);
        });
      });

      const stBeratReal = Number(summary.totalBeratReal || 0);
      const stBeratWaste = Number(summary.totalBeratWaste || 0);
      const fallbackBeratMaterial = group.rows.reduce((s, row) => s + (Number(row.beratTotal || 0) || 0), 0);
      const stBeratRealFinal = stBeratReal > 0 ? stBeratReal : Math.max(fallbackBeratMaterial - stBeratWaste, 0);
      const stBeratPlusWaste = stBeratRealFinal + stBeratWaste;
      const stHargaReal = Number(summary.totalHargaReal || group.rows.reduce((s, row) => s + (Number(row.subtotal || 0) || 0), 0));
      const stHargaPemakaian = Number(summary.totalHargaPemakaian || stHargaReal);
      const stHargaRealJual = stHargaReal * jualRatio;
      const stHargaPemakaianJual = stHargaPemakaian * jualRatio;
      const stSisaMm = barAllocations.reduce((s, b) => s + (Number(b.sisa ?? 0)), 0);

      grandBeratSisa += stBeratWaste;
      grandBeratReal += stBeratRealFinal;
      grandBeratPlusWaste += stBeratPlusWaste;
      grandHargaPlusWaste += stHargaRealJual;
      grandHargaReal += stHargaPemakaianJual;

      const subTotalStyle = { fontStyle: 'bold', fillColor: [240, 240, 240] };
      tableBody.push([
        {
          content: `SUB TOTAL   ${fmtN(barAllocations.length)} Btg`,
          colSpan: 2,
          styles: { ...subTotalStyle, halign: 'left' }
        },
        { content: stSisaMm > 0 ? fmtN(stSisaMm / 1000, 2) : '-', styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtN(stBeratWaste, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtN(stBeratRealFinal, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtN(stBeratPlusWaste, 2), styles: { ...subTotalStyle, halign: 'right' } },
        { content: '-', styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtRp(stHargaPemakaianJual), styles: { ...subTotalStyle, halign: 'right' } },
        { content: fmtRp(stHargaRealJual), styles: { ...subTotalStyle, halign: 'right' } }
      ]);

      autoTable(doc, {
        startY,
        head: [[
          'Spesifikasi / Uraian',
          'Pemakaian',
          'Panjang\nSisa',
          'Berat\nSisa',
          'Berat\nReal',
          'Berat\n+ Waste',
          'Luas\n(M2)',
          'Harga\nJual',
          'Subtotal\nJual'
        ]],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [215, 220, 227],
          textColor: [20, 20, 20],
          fontStyle: 'bold',
          fontSize: 6.5,
          halign: 'center',
          lineColor: [130, 130, 130],
          lineWidth: 0.1
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1.3,
          overflow: 'linebreak',
          lineColor: [150, 150, 150],
          lineWidth: 0.08
        },
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
          8: { cellWidth: 22, halign: 'right' }
        },
        margin: { left: marginL, right: marginR }
      });

      startY = doc.lastAutoTable.finalY + 5;
    });

    ensurePageSpace(35);

    const gtStyle = { fontStyle: 'bold', fillColor: [180, 210, 255], halign: 'right' };
    autoTable(doc, {
      startY,
      body: [[
        { content: 'GRAND TOTAL', colSpan: 2, styles: { ...gtStyle, halign: 'right' } },
        { content: '-', styles: gtStyle },
        { content: fmtN(grandBeratSisa || weightTotals.waste, 2), styles: gtStyle },
        { content: fmtN(grandBeratReal || weightTotals.real, 2), styles: gtStyle },
        { content: fmtN((grandBeratPlusWaste || (weightTotals.real + weightTotals.waste)), 2), styles: gtStyle },
        { content: fmtN(penawaran.totalDimensiKerja || 0, 2), styles: gtStyle },
        { content: fmtRp(grandHargaReal || totalHargaJual), styles: gtStyle },
        { content: fmtRp(totalHargaJual), styles: gtStyle }
      ]],
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 16 },
        2: { cellWidth: 14 },
        3: { cellWidth: 24 },
        4: { cellWidth: 16 },
        5: { cellWidth: 16 },
        6: { cellWidth: 18 },
        7: { cellWidth: 24 },
        8: { cellWidth: 24 }
      },
      margin: { left: marginL, right: marginR }
    });

    const footerY = doc.lastAutoTable.finalY + 6;
    if (footerY < pageHeight - 8) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`TOTAL PENAWARAN: ${fmtRp(totalHargaJual)}`, pageWidth - marginR, footerY, { align: 'right' });
    }

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

    doc.save(`Penawaran_${penawaran.nomorPenawaran.replace(/\//g, '-')}.pdf`);
    toast.success('PDF berhasil diexport!');
  };

  const exportToExcel = (penawaran) => {
    const wb = XLSX.utils.book_new();
    const weightTotals = getItemsWeightTotals(penawaran.items || []);
    const headerData = [
      ['SURAT PENAWARAN'], [penawaran.nomorPenawaran], [''],
      ['Informasi Project'],
      ['Nama Project', penawaran.namaProject],
      ['Lokasi', penawaran.lokasiProject],
      ['Client', penawaran.clientNama],
      ['Kontak', penawaran.clientKontak],
      ['Tanggal', new Date(penawaran.createdAt).toLocaleDateString('id-ID')],
      ['Estimasi', penawaran.estimasiList?.map(e => e.nomor).join(', ')],
      [''], ['Detail Item']
    ];
    
    const itemsHeader = ['No', 'Nama Barang', 'Panjang Stok', 'Panjang Jadi', 'Jumlah', 'Kebutuhan Bahan', 'Welding', 'Waste %', 'Harga'];
    const itemsData = penawaran.items?.map((item, idx) => {
      const manual = isManualItem(item);
      const weldingStats = getItemWeldingStats(item);
      return [
        idx + 1,
        item.namaBarang,
        manual ? '-' : item.panjangMentah,
        manual ? '-' : item.panjangJadi,
        item.jumlahKeperluan,
        getItemBahanValue(item),
        weldingStats.isWelding ? weldingStats.total : '-',
        manual ? '-' : Math.round(item.breakdown?.wastePercentage || 0),
        item.subtotal || 0
      ];
    }) || [];

    const weldingHeader = ['No', 'Barang', 'Ref', 'Komposisi Potong/Sambung', 'Titik', 'Sisa (mm)', 'Status Sisa'];
    const weldingData = (penawaran.items || []).flatMap((item, idx) => {
      const weldingStats = getItemWeldingStats(item);
      if (!weldingStats.isWelding) return [];
      if (weldingStats.guides.length === 0) {
        return [[
          `${idx + 1}.1`,
          item.namaBarang,
          'Item 1',
          'Detail komposisi tidak tersedia',
          weldingStats.total || 0,
          Math.round(item.breakdown?.waste || 0),
          '-'
        ]];
      }

      return weldingStats.guides.map((guide, guideIdx) => ([
        `${idx + 1}.${guideIdx + 1}`,
        item.namaBarang,
        `Item ${guide.itemNo || (guideIdx + 1)}`,
        guide.breakdownStr || '-',
        guide.titikWelding ?? item.breakdown?.summary?.weldingPointsPerItem ?? weldingStats.total ?? 0,
        guide.waste || 0,
        guide.wasteNote || '-'
      ]));
    });
    
    const summaryData = [[''], ['Ringkasan'], ['Total Berat Real (kg)', Number(weightTotals.real || 0).toFixed(2)],
      ['Total Berat Waste (kg)', Number(weightTotals.waste || 0).toFixed(2)],
      ['Dimensi Kerja (m²)', Math.round((penawaran.totalDimensiKerja || 0) * 100) / 100],
      ['Luas Permukaan (m²)', penawaran.totalLuasPermukaan || 0],
      ['Total Welding', penawaran.totalTitikWelding || 0], [''], ['TOTAL', penawaran.totalHarga || 0]];

    const excelRows = [...headerData, itemsHeader, ...itemsData];
    if (weldingData.length > 0) {
      excelRows.push(['']);
      excelRows.push(['Detail Hasil Welding']);
      excelRows.push(weldingHeader);
      excelRows.push(...weldingData);
    }
    excelRows.push(...summaryData);

    const ws = XLSX.utils.aoa_to_sheet(excelRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Penawaran');
    XLSX.writeFile(wb, `Penawaran_${penawaran.nomorPenawaran.replace(/\//g, '-')}.xlsx`);
    toast.success('Excel berhasil diexport!');
  };

  const filteredPenawaranList = penawaranList.filter((penawaran) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const estimasiNumbers = (penawaran.estimasiList || [])
      .map((estimasi) => estimasi.nomor || estimasi.nomorEstimasi || '')
      .join(' ');

    return [
      penawaran.nomorPenawaran,
      penawaran.namaProject,
      penawaran.lokasiProject,
      penawaran.clientNama,
      penawaran.clientKontak,
      estimasiNumbers,
      penawaran.totalHarga,
    ]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  return (
    <div className="space-y-6 fade-in" data-testid="penawaran-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Penawaran</h1>
          <p className="text-base text-gray-600">Buat penawaran dari estimasi yang sudah dibuat</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="create-penawaran-button"
          className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Buat Penawaran
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Penawaran</p>
                <p className="text-2xl font-bold text-gray-900">{penawaranList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Nilai</p>
                <p className="text-lg font-bold text-emerald-600">
                  Rp {penawaranList.reduce((sum, p) => sum + (p.totalHarga || 0), 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Estimasi Tersedia</p>
                <p className="text-2xl font-bold text-gray-900">{estimasiList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Daftar Penawaran</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari penawaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-600" />
              <p className="text-gray-500 mt-2">Memuat data...</p>
            </div>
          ) : penawaranList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Belum ada penawaran</p>
            </div>
          ) : filteredPenawaranList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">Penawaran tidak ditemukan</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-sm text-sky-600 hover:underline mt-1"
              >
                Reset pencarian
              </button>
            </div>
          ) : (
            <Table data-testid="penawaran-table">
              <TableHeader>
                <TableRow>
                  <TableHead>No. Penawaran</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Estimasi</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPenawaranList.map((penawaran) => (
                  <TableRow key={penawaran.id}>
                    <TableCell><span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">{penawaran.nomorPenawaran}</span></TableCell>
                    <TableCell className="font-medium">{penawaran.namaProject}</TableCell>
                    <TableCell>{penawaran.clientNama}</TableCell>
                    <TableCell className="text-xs text-gray-600">{penawaran.estimasiList?.map(e => e.nomor).join(', ')}</TableCell>
                    <TableCell className="font-bold text-emerald-600">Rp {(penawaran.totalHarga || 0).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-sm text-gray-500">{new Date(penawaran.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => viewDetail(penawaran)} className="hover:bg-blue-50" title="Detail"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditPenawaran(penawaran)} className="hover:bg-amber-50" title="Edit"><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => exportToPDF(penawaran)} className="hover:bg-red-50" title="PDF"><Download className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => exportToExcel(penawaran)} className="hover:bg-green-50" title="Excel"><FileSpreadsheet className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deletePenawaran(penawaran.id)} className="hover:bg-red-50" title="Hapus"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editMode ? 'Edit Penawaran' : 'Buat Penawaran Baru'}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Informasi Client</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Project <span className="text-red-500">*</span></Label>
                  <Input name="namaProject" data-testid="nama-project-input" value={clientForm.namaProject} onChange={handleClientFormChange} placeholder="Kanopi Rumah"/>
                </div>
                <div className="space-y-2">
                  <Label>Lokasi <span className="text-red-500">*</span></Label>
                  <Input name="lokasiProject" data-testid="lokasi-project-input" value={clientForm.lokasiProject} onChange={handleClientFormChange} placeholder="Jakarta"/>
                </div>
                <div className="space-y-2">
                  <Label>Nama Client <span className="text-red-500">*</span></Label>
                  <Input name="clientNama" data-testid="client-nama-input" value={clientForm.clientNama} onChange={handleClientFormChange} placeholder="Budi"/>
                </div>
                <div className="space-y-2">
                  <Label>No. Kontak <span className="text-red-500">*</span></Label>
                  <Input name="clientKontak" data-testid="client-kontak-input" value={clientForm.clientKontak} onChange={handleClientFormChange} placeholder="08123456"/>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Pilih Estimasi <span className="text-sm font-normal text-gray-500">({selectedEstimasiIds.length} dipilih)</span></h3>
              {estimasiList.length === 0 ? (
                <div className="text-center py-8 text-gray-500"><FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p className="text-sm">Tidak ada estimasi.</p></div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {estimasiList.map((est) => {
                    const isSelected = selectedEstimasiIds.includes(est.id);
                    return (
                      <div key={est.id}
                        className={`p-3 border rounded-lg cursor-pointer ${isSelected ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-sky-300'}`}
                        onClick={() => toggleEstimasiSelection(est.id)}>
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${isSelected ? 'bg-sky-500 border-sky-500' : 'border-gray-300'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-sky-600 text-white text-xs font-bold rounded">{est.nomorEstimasi}</span>
                              <span className="text-xs text-gray-500">{new Date(est.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                            </div>
                            <h4 className="font-medium mt-1">{est.namaEstimasi}</h4>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-gray-500">{est.items?.length || 0} item</span>
                              <span className="text-sm font-bold text-gray-600">Estimasi: Rp {(est.totalEstimasi || 0).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetCreateForm(); }} disabled={saving}>Batal</Button>
            <Button onClick={showPreviewPenawaran} disabled={selectedEstimasiIds.length === 0 || saving} data-testid="confirm-create-penawaran"
              className="bg-gradient-to-r from-sky-600 to-cyan-600">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editMode ? 'Lanjut ke Preview Update' : 'Lanjut ke Preview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => { 
        if (!open) {
          setShowPreview(false);
          setShowCreateDialog(true); // Back to create dialog
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-sky-600" />
              Preview Penawaran
            </DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Nama Project</p><p className="font-medium">{previewData.clientInfo.namaProject}</p></div>
                <div><p className="text-xs text-gray-500">Lokasi</p><p className="font-medium">{previewData.clientInfo.lokasiProject}</p></div>
                <div><p className="text-xs text-gray-500">Client</p><p className="font-medium">{previewData.clientInfo.clientNama}</p></div>
                <div><p className="text-xs text-gray-500">Kontak</p><p className="font-medium">{previewData.clientInfo.clientKontak}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-500">Estimasi</p><p className="font-medium">{previewData.estimasiList.map(e => e.nomor).join(', ')}</p></div>
              </div>

              {/* Summary Cards */}
              {/* <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 rounded-lg text-center">
                  <Weight className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                  <p className="text-xs text-gray-600">Berat Real</p>
                  <p className="font-bold">{Number(previewData.totalBeratReal || 0).toFixed(2)} kg</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <Weight className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                  <p className="text-xs text-gray-600">Berat Waste</p>
                  <p className="font-bold">{Number(previewData.totalBeratWaste || 0).toFixed(2)} kg</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <Ruler className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-xs text-gray-600">Dimensi Kerja</p>
                  <p className="font-bold">{Math.round((previewData.totalDimensiKerja || 0) * 100) / 100} m²</p>
                </div>
                {/* <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <Zap className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                  <p className="text-xs text-gray-600">Welding</p>
                  <p className="font-bold">{previewData.totalTitikWelding || 0} titik</p>
                </div> */}
                {/* <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <Calculator className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="font-bold text-emerald-600 text-sm">
                    Rp {(previewData.groupedItems || []).reduce((sum, group, idx) => {
                      const unitPrice = Number(hargaJualMap[idx] || 0) || 0;
                      const qty = Number(group.totalBahan || 0) || 0;
                      return sum + (unitPrice * qty);
                    }, 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div> } */}

              {/* Items Table with Harga Jual Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-semibold">Detail Item & Harga Jual</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Edit className="w-4 h-4" />
                        Kelola Estimasi ({selectedEstimasiIds.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 max-h-[400px] overflow-y-auto" align="end">
                      <div className="space-y-3">
                        <div className="font-semibold text-sm border-b pb-2">
                          Pilih Estimasi
                        </div>
                        {estimasiList.map((est) => {
                          const isSelected = selectedEstimasiIds.includes(est.id);
                          return (
                            <div
                              key={est.id}
                              className={`p-2 border rounded cursor-pointer transition-colors ${
                                isSelected ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-sky-300'
                              }`}
                              onClick={() => updateEstimasiSelectionFromPreview(est.id)}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                                  isSelected ? 'bg-sky-500 border-sky-500' : 'border-gray-300'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="px-2 py-0.5 bg-sky-600 text-white text-xs font-bold rounded">
                                      {est.nomorEstimasi}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(est.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                    </span>
                                  </div>
                                  <h4 className="font-medium text-sm mt-1">{est.namaEstimasi}</h4>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-xs text-gray-500">{est.items?.length || 0} item</span>
                                    <span className="text-xs font-medium text-gray-600">
                                      Rp {(est.totalEstimasi || 0).toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {/* Total Section - style tabel seperti gambar */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Nama Barang</TableHead>
                        <TableHead className="text-center">Dimensi Kerja</TableHead>
                        <TableHead className="text-center">Bahan</TableHead>
                        <TableHead className="text-center">Welding</TableHead>
                        <TableHead className="text-center">Waste</TableHead>
                        <TableHead className="text-right">Harga Modal</TableHead>
                        <TableHead className="text-right">Subtotal Modal</TableHead>
                        <TableHead className="text-right w-48">Harga Jual</TableHead>
                        <TableHead className="text-right">Subtotal Jual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.groupedItems.map((group, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-center">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{group.namaBarang}</div>
                            <div className="text-xs text-gray-500">
                              {formatNumberWithSeparator(group.panjangMentah)} mm × {formatNumberWithSeparator(group.panjangJadi)} mm ({group.count} item)
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {group.dimensiKerjaValues?.length > 0 ? (
                              <>
                                <div className="text-sm">{[...new Set(group.dimensiKerjaValues.map(v => Number(v).toFixed(2)))].join(' + ')}</div>
                                <div className="text-xs font-medium text-gray-600">m²</div>
                              </>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">{group.totalBahan}</TableCell>
                          <TableCell className="text-center">
                            {group.totalWelding > 0 ? (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                                {group.totalWelding}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-gray-600">
                              {formatNumberWithSeparator(Math.round(group.totalWaste))} mm
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-600">
                            {group.hargaModal > 0 ? `Rp ${group.hargaModal.toLocaleString('id-ID')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-600">
                            {group.hargaModal > 0 ? `Rp ${getItemSubtotalModal(group).toLocaleString('id-ID')}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={formatRupiah(hargaJualMap[idx] || '')}
                              onChange={(e) => handleHargaJualChange(idx, e.target.value)}
                              placeholder="Harga jual"
                              className="text-right font-bold"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            Rp {getItemSubtotalJual(group, idx).toLocaleString('id-ID')}
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow className="bg-gray-50 border-t-2 font-bold">
                        <TableCell colSpan={7} className="text-right text-gray-500">
                          TOTAL
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          Rp {previewData.groupedItems
                            .reduce((sum, group) => sum + getItemSubtotalModal(group), 0)
                            .toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {previewData.groupedItems.some((group, idx) => getItemHargaJual(idx) > 0)
                            ? `Rp ${previewData.groupedItems
                                .reduce((sum, group, idx) => {
                                  const hargaJual = getItemHargaJual(idx);
                                  return sum + (hargaJual > 0 ? Number(group.totalBahan || 0) * hargaJual : 0);
                                }, 0)
                                .toLocaleString('id-ID')}`
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                {/* <TableRow className="bg-gray-50 border-t-2 font-bold"> */}
                  {/* kosongin kolom sebelum subtotal modal */}
                  {/* <TableCell colSpan={7}></TableCell> */}

                  {/* Total Subtotal Modal */}
                  {/* <TableCell className="text-right text-gray-900">
                    Rp {previewData.groupedItems
                      .reduce((s, g) => s + getItemSubtotalModal(g), 0)
                      .toLocaleString('id-ID')}
                  </TableCell> */}

                  {/* kosongin kolom harga jual */}
                  {/* <TableCell></TableCell> */}

                  {/* Total Subtotal Jual */}
                  {/* <TableCell className="text-right text-emerald-600">
                    {previewData.groupedItems.some((g, idx) => getItemHargaJual(idx) > 0)
                      ? `Rp ${previewData.groupedItems
                          .reduce((s, g, idx) => {
                            const hj = getItemHargaJual(idx);
                            return s + (hj > 0 ? Number(g.totalBahan || 0) * hj : 0);
                          }, 0)
                          .toLocaleString('id-ID')}`
                      : '-'
                    }
                  </TableCell>
                </TableRow> */} 
                {/* <div className="border rounded-lg overflow-hidden">
                  <Table>
                    {/* <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-right">Harga Modal</TableHead>
                        <TableHead className="text-right">Sub Total Modal</TableHead>
                        <TableHead className="text-right">Harga Jual</TableHead>
                        <TableHead className="text-right">Sub Total Jual</TableHead>
                      </TableRow>
                    </TableHeader> */}
                    {/* <TableBody> */}
                      {/* {previewData.groupedItems.map((group, idx) => {
                        const hargaJual = getItemHargaJual(idx);
                        const subtotalJual = hargaJual > 0
                          ? Number(group.totalBahan || 0) * hargaJual
                          : null;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-right text-gray-600">
                              {group.hargaModal > 0 ? `Rp ${group.hargaModal.toLocaleString('id-ID')}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {group.hargaModal > 0 ? `Rp ${getItemSubtotalModal(group).toLocaleString('id-ID')}` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              {hargaJual > 0 ? `Rp ${hargaJual.toLocaleString('id-ID')}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {subtotalJual !== null ? `Rp ${subtotalJual.toLocaleString('id-ID')}` : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })} */}
                      {/* <TableRow className="bg-gray-50 border-t-2 font-bold">
                        <TableCell className="text-right text-gray-500 text-sm">Total Harga Modal</TableCell>
                        <TableCell className="text-right text-gray-900">
                          Rp {previewData.groupedItems
                            .reduce((s, g) => s + getItemSubtotalModal(g), 0)
                            .toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right text-gray-500 text-sm">Total Harga Jual</TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {previewData.groupedItems.some((g, idx) => getItemHargaJual(idx) > 0)
                            ? `Rp ${previewData.groupedItems
                                .reduce((s, g, idx) => {
                                  const hj = getItemHargaJual(idx);
                                  return s + (hj > 0 ? Number(g.totalBahan || 0) * hj : 0);
                                }, 0)
                                .toLocaleString('id-ID')}`
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div> */} 
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { 
              setShowPreview(false); 
              setShowCreateDialog(true);
            }} disabled={saving}>
              Kembali
            </Button>
            <Button onClick={confirmCreatePenawaran} disabled={saving}
              className="bg-gradient-to-r from-emerald-600 to-green-600">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editMode ? 'Konfirmasi & Update Penawaran' : 'Konfirmasi & Buat Penawaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded">{selectedPenawaran?.nomorPenawaran}</span>
              Detail Penawaran
            </DialogTitle>
          </DialogHeader>
          {selectedPenawaran && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Nama Project</p><p className="font-medium">{selectedPenawaran.namaProject}</p></div>
                <div><p className="text-xs text-gray-500">Lokasi</p><p className="font-medium">{selectedPenawaran.lokasiProject}</p></div>
                <div><p className="text-xs text-gray-500">Client</p><p className="font-medium">{selectedPenawaran.clientNama}</p></div>
                <div><p className="text-xs text-gray-500">Kontak</p><p className="font-medium">{selectedPenawaran.clientKontak}</p></div>
                {selectedPenawaran.estimasiList?.length > 0 && (
                  <div className="col-span-2"><p className="text-xs text-gray-500">Estimasi</p><p className="font-medium">{selectedPenawaran.estimasiList.map(e => e.nomor).join(', ')}</p></div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 rounded-lg text-center"><Weight className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="text-xs text-gray-600">Berat Real</p><p className="font-bold">{Number(selectedPenawaran.totalBeratReal || 0).toFixed(2)} kg</p></div>
                <div className="p-3 bg-blue-50 rounded-lg text-center"><Ruler className="w-5 h-5 mx-auto text-blue-600 mb-1" /><p className="text-xs text-gray-600">Dimensi Kerja</p><p className="font-bold">{Math.round((selectedPenawaran.totalDimensiKerja || 0) * 100) / 100} m²</p></div>
                <div className="p-3 bg-orange-50 rounded-lg text-center"><Weight className="w-5 h-5 mx-auto text-orange-600 mb-1" /><p className="text-xs text-gray-600">Berat Waste</p><p className="font-bold">{Number(selectedPenawaran.totalBeratWaste || 0).toFixed(2)} kg</p></div>
                <div className="p-3 bg-purple-50 rounded-lg text-center"><Calculator className="w-5 h-5 mx-auto text-purple-600 mb-1" /><p className="text-xs text-gray-600">Total</p><p className="font-bold text-emerald-600 text-sm">Rp {(selectedPenawaran.totalHarga || 0).toLocaleString('id-ID')}</p></div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead className="text-center">Dimensi Kerja</TableHead>
                    <TableHead className="text-center">Bahan</TableHead>
                    <TableHead className="text-center">Welding</TableHead>
                    <TableHead className="text-center">Waste</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPenawaran.groupedItems?.map((group, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{group.namaBarang}</div>
                        <div className="text-xs text-gray-500">
                          {group.panjangMentah} mm × {group.panjangJadi} mm ({group.count} item)
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {group.dimensiKerjaValues?.length > 0 ? (
                          <>
                            <div className="text-sm">{[...new Set(group.dimensiKerjaValues.map(v => Number(v).toFixed(2)))].join(' + ')}</div>
                            <div className="text-xs font-medium text-gray-600">m²</div>
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">{group.totalBahan}</TableCell>
                      <TableCell className="text-center">
                        {group.totalWelding > 0 ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                            {group.totalWelding}
                          </span>
                        ) : '-'}
                      </TableCell>
                      {/* <TableCell className="text-center">
                        <span className="text-xs text-gray-600">
                          {Math.round(group.totalWaste * 100) / 100} mm
                        </span>
                      </TableCell> */}
                      <TableCell className="text-right font-medium text-emerald-600">
                        {getItemHargaJual(idx) > 0
                          ? `Rp ${(Number(group.totalBahan || 0) * getItemHargaJual(idx)).toLocaleString('id-ID')}`
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => exportToExcel(selectedPenawaran)} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
                <Button onClick={() => exportToPDF(selectedPenawaran)} className="gap-2 bg-gradient-to-r from-red-500 to-pink-500"><Download className="w-4 h-4" /> PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Penawaran;
