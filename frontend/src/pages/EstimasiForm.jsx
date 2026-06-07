import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calculator, Plus, Trash2, Send, Zap, Download, Loader2, FileUp, Settings } from 'lucide-react';
import { barangAPI, estimasiAPI } from '@/services/api';
import * as XLSX from 'xlsx';
import BarangCombobox from '@/components/BarangCombobox';
import { calculateLuasPermukaan, calculateMaterialGroupAllocation } from '@/utils/calculationEngine';
import { formatNumberWithSeparator } from '@/lib/utils';
import ManualItemForm from '@/components/ManualItemForm';

// ── Template untuk item kosong ─────────────────────────────────────────────────
const emptyItem = () => ({
  barangId: '',
  kodeItem: '',
  panjangJadi: '',
  jumlahKeperluan: '',
  volume: '',
  // ── field barang manual (sama persis seperti InputBarang) ──
  namaManual: '',
  hargaManual: '',          // harga jual (dipakai kalkulasi)
  supplierManual: '',
  jenisBentukManual: 'balok',
  // balok
  panjangManual: '',
  lebarManual: '',
  tinggiManual: '',
  // tabung
  diameterManual: '',
  // balok + tabung
  ketebalanManual: '',
  // wf
  tinggiWFManual: '',
  lebarFlangeManual: '',
  ketebalanWebManual: '',
  ketebalanFlangeManual: '',
  // plat
  panjangPlatManual: '',
  lebarPlatManual: '',
  ketebalanPlatManual: '',
  // material
  jenisBahanManual: '',
  beratJenisManual: '',
  beratbatangManual: '',
  minWeldingManual: '',
  // harga lanjutan
  hargamodalManual: '',
  hargajasaManual: '',
});

const EstimasiForm = () => {
  const navigate = useNavigate();
  const importFileRef = useRef(null);

  const [barangList, setBarangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    namaEstimasi: '',
    panjangRuangan: '',
    lebarRuangan: '',
    namaClient: '',
    lokasi: '',
    kontakPerson: '',
  });
  const [selectedItems, setSelectedItems] = useState([emptyItem()]);

  // ── State untuk barang dari database ─────────────────────────────────────────
  const [localBarangOverrides, setLocalBarangOverrides] = useState({});
  const [savingBarang, setSavingBarang] = useState({});
  const [expandedBarang, setExpandedBarang] = useState({});

  // ── State untuk barang manual ─────────────────────────────────────────────────
  const [savingManualBarang, setSavingManualBarang] = useState({});

  useEffect(() => {
    loadBarang();
  }, []);

  const loadBarang = async () => {
    try {
      setLoading(true);
      const data = await barangAPI.getAll();
      setBarangList(data);
    } catch (error) {
      toast.error('Gagal memuat daftar barang');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const addItemRow = () => {
    setSelectedItems([...selectedItems, emptyItem()]);
  };

  const addItemRowWithSameBarang = (index) => {
    const currentItem = selectedItems[index];
    const newItem = {
      ...emptyItem(),
      barangId: currentItem.barangId,
    };
    const updatedItems = [
      ...selectedItems.slice(0, index + 1),
      newItem,
      ...selectedItems.slice(index + 1),
    ];
    setSelectedItems(updatedItems);
  };

  const removeItemRow = (index) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== index));
    }
  };

  const removeAllItemsWithSameBarang = (barangId) => {
    const remaining = selectedItems.filter((item) => item.barangId !== barangId);
    if (remaining.length === 0) {
      // Jangan sampai list kosong, biarkan minimal 1 baris
      setSelectedItems([emptyItem()]);
    } else {
      setSelectedItems(remaining);
    }
  };

  const getSelectedBarangIds = () => {
    const selectedIds = new Set();
    selectedItems.forEach((item, index) => {
      if (item.barangId && item.barangId !== '__manual__') {
        const isFirstOccurrence = selectedItems.findIndex((si) => si.barangId === item.barangId) === index;
        if (isFirstOccurrence) selectedIds.add(item.barangId);
      }
    });
    return selectedIds;
  };

  const isBarangDisabled = (barangId, currentIndex) => {
    const selectedIds = getSelectedBarangIds();
    const currentBarangId = selectedItems[currentIndex]?.barangId;
    return selectedIds.has(barangId.toString()) && currentBarangId !== barangId.toString();
  };

  const getSelectedBarangInfo = (barangId) => {
    if (!barangId || barangId === '__manual__') return null;
    const barang = getEffectiveBarang(barangId);
    if (!barang) return null;
    return {
      nama: barang.nama,
      panjangMentah: barang.jenisBentuk === 'plat' ? barang.panjangPlat : barang.panjang,
      minWelding: barang.minWelding || 0,
    };
  };

  const handleBarangSelect = (index, barangId, namaManual = '') => {
    const updated = [...selectedItems];
    updated[index] = {
      ...updated[index],
      barangId,
      namaManual: barangId === '__manual__' ? namaManual : '',
      hargaManual: '',
    };
    setSelectedItems(updated);
  };

  // ── Download & Import Excel ───────────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const formDataRows = [
      ['TEMPLATE IMPORT ESTIMASI MATERIAL'],
      ['Petunjuk: Isi kolom putih. Hapus baris contoh (baris 13-15) sebelum import.'],
      [''],
      ['Nama Estimasi',     '← wajib diisi'],
      ['Nama Client',       '← opsional'],     // ← NEW
      ['Lokasi Proyek',     '← opsional'],     // ← NEW
      ['Kontak Person',     '← opsional'],     // ← NEW
      ['Panjang Ruangan (m)', '← opsional'],
      ['Lebar Ruangan (m)', '← opsional'],
      [''],
      ['No', 'Nama Barang *', 'Kode Item', 'Panjang Jadi (mm)', 'Jumlah *', 'Harga Manual (Rp)'],
      ['', '(lihat sheet Daftar Barang)', '(bebas, misal A-01)', '(kosongkan jika barang manual)', '', '(isi jika barang tidak ada di Daftar Barang)'],
      ['1', 'Hollow 40x40x1.8', 'A-01', '600', '15', ''],
      ['2', 'Hollow 40x40x1.8', 'A-02', '800', '10', ''],
      ['3', 'Barang Tidak Ada Di Daftar', 'C-01', '', '3', '750000'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(formDataRows);
    ws1['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 22 }, { wch: 10 }, { wch: 25 }];

    const daftarHeader = [
      ['DAFTAR BARANG TERSEDIA'],
      ['Salin nama barang persis seperti di kolom "Nama Barang" pada sheet Form Estimasi'],
      [''],
      ['No', 'Nama Barang', 'Jenis Bahan', 'Panjang Stok (mm)', 'Min Welding (mm)'],
    ];
    const daftarRows = barangList.map((b, i) => [
      i + 1, b.nama, b.jenisBahan || '-', b.jenisBentuk === 'plat' ? b.panjangPlat : b.panjang, b.minWelding || 0,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([...daftarHeader, ...daftarRows]);
    ws2['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Form Estimasi');
    XLSX.utils.book_append_sheet(wb, ws2, 'Daftar Barang');
    XLSX.writeFile(wb, 'Template_Import_Estimasi.xlsx');
    toast.success('Template berhasil didownload!');
  };

  const importFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const namaEstimasi = String(rows[3]?.[1] || '').trim();
        const namaClient = String(rows[4]?.[1] || '').trim();    // ← NEW
        const lokasi = String(rows[5]?.[1] || '').trim();       // ← NEW
        const kontakPerson = String(rows[6]?.[1] || '').trim(); // ← NEW
        const panjangRuangan = String(rows[7]?.[1] || '').trim();
        const lebarRuangan = String(rows[8]?.[1] || '').trim();

        if (!namaEstimasi) {
          toast.error('Nama Estimasi wajib diisi di template!');
          e.target.value = '';
          return;
        }

        const notFoundNames = [];
        const items = [];

        for (let i = 13; i < rows.length; i++) {
          const row = rows[i];
          const namaBarang = String(row[1] || '').trim();
          const kodeItem = String(row[2] || '').trim();
          const panjangJadi = String(row[3] || '').trim();
          const jumlah = String(row[4] || '').trim();
          const hargaManual = String(row[5] || '').trim();

          if (!namaBarang || !jumlah || parseInt(jumlah) <= 0) continue;

          const matched = barangList.find((b) => b.nama.toLowerCase() === namaBarang.toLowerCase());

          if (matched) {
            if (!panjangJadi || parseFloat(panjangJadi) <= 0) {
              toast.warning(`Baris ${i + 1}: "${namaBarang}" butuh Panjang Jadi (mm).`);
              continue;
            }
            items.push({ ...emptyItem(), barangId: String(matched.id), kodeItem, panjangJadi, jumlahKeperluan: jumlah });
          } else {
            notFoundNames.push(namaBarang);
            items.push({ ...emptyItem(), barangId: '__manual__', kodeItem, jumlahKeperluan: jumlah, namaManual: namaBarang, hargaManual });
          }
        }

        if (items.length === 0) {
          toast.error('Tidak ada item valid yang bisa diimport!');
          e.target.value = '';
          return;
        }

        setFormData((prev) => ({ ...prev, namaEstimasi, namaClient, lokasi, kontakPerson, panjangRuangan, lebarRuangan }));
        setSelectedItems(items);
        toast.success(`Berhasil import ${items.length} item!`);
        if (notFoundNames.length > 0) {
          toast.warning(`${notFoundNames.length} barang tidak ditemukan di daftar, dijadikan manual: ${[...new Set(notFoundNames)].join(', ')}`);
        }
      } catch (err) {
        toast.error('Gagal membaca file: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Kalkulasi utama ───────────────────────────────────────────────────────────
  const calculateWithWasteReuse = (validItems, luasPekerjaan) => {
    const materialItems = validItems.filter((item) => item.barangId && item.barangId !== '__manual__');
    const manualItems = validItems.filter((item) => item.barangId === '__manual__');

    let totalEstimasi = 0, totalBeratReal = 0, totalLuasPermukaan = 0, totalTitikWelding = 0;
    const itemDetails = [];
    const groupMap = new Map();
    const groupOrder = [];

    materialItems.forEach((item) => {
      if (!groupMap.has(item.barangId)) {
        const barang = getEffectiveBarang(item.barangId);
        if (!barang) return;
        const group = { barangId: item.barangId, barang, items: [] };
        groupMap.set(item.barangId, group);
        groupOrder.push(group);
      }
      groupMap.get(item.barangId).items.push(item);
    });

    groupOrder.forEach((group) => {
      const allocation = calculateMaterialGroupAllocation(group.barang, group.items, luasPekerjaan);
      totalEstimasi += allocation.itemBreakdown.reduce((sum, entry) => sum + (entry.subtotal || 0), 0);
      totalBeratReal += allocation.summary.totalBeratReal || 0;
      totalLuasPermukaan += group.items.reduce((sum, item) => {
        const qty = parseInt(item.jumlahKeperluan) || 0;
        return sum + calculateLuasPermukaan(group.barang) * qty;
      }, 0);
      totalTitikWelding += allocation.totalTitikWelding || 0;

      allocation.itemBreakdown.forEach((entry) => {
        const sourceItem = group.items.find((item, index) => index + 1 === entry.itemNo) || group.items[0];
        const itemSpecificGuides = (allocation.cuttingGuide || []).filter((guide) => {
          if (typeof guide?.itemNo !== 'undefined') return Number(guide.itemNo) === Number(entry.itemNo);
          if (Array.isArray(guide?.pieces)) return guide.pieces.some((piece) => Number(piece?.itemNo) === Number(entry.itemNo));
          return false;
        });

        itemDetails.push({
          barangId: sourceItem.barangId,
          kodeItem: entry.kodeItem || sourceItem.kodeItem || null,
          namaBarang: entry.namaBarang || group.barang.nama,
          jenisBentuk: group.barang.jenisBentuk || 'balok',
          ukuranMentah: group.barang.ukuran,
          panjangMentah: allocation.summary.stockLength,
          panjangJadi: entry.panjangJadi,
          jenisBahan: group.barang.jenisBahan,
          beratJenis: group.barang.beratJenis,
          minWelding: group.barang.minWelding,
          jumlahKeperluan: entry.jumlahKeperluan,
          volume: sourceItem.volume || null,
          hargaSatuan: allocation.summary.hargaSatuan,
          hargaJasa: Math.round(parseFloat(group.barang.hargajasa || 0) || 0),
          luasPekerjaan,
          subtotalMaterial: Math.round(entry.subtotalMaterial),
          subtotalMaterialPemakaian: Math.round(entry.subtotalMaterialPemakaian),
          subtotalMaterialWaste: Math.round(entry.subtotalMaterialWaste),
          subtotalJasa: Math.round(entry.subtotalJasa),
          subtotal: Math.round(entry.subtotal),
          beratPerBatang: allocation.summary.beratStandar,
          beratTotal: entry.beratReal,
          beratWaste: entry.beratWaste,
          luasPermukaan: calculateLuasPermukaan(group.barang),
          luasPermukaanTotal: calculateLuasPermukaan(group.barang) * (parseInt(entry.jumlahKeperluan) || 0),
          breakdown: {
            kebutuhanBahan: allocation.kebutuhanBahan,
            panjangRealTerpakai: allocation.panjangRealTerpakai,
            waste: allocation.waste,
            wastePercentage: allocation.wastePercentage,
            totalTitikWelding: allocation.totalTitikWelding,
            cuttingGuide: itemSpecificGuides,
            barAllocations: allocation.barAllocations || [],
            needsWelding: allocation.needsWelding,
            summary: allocation.summary,
          },
          usedExistingWaste: 0,
        });
      });
    });

    // ✅ Manual items — tidak ter-comment lagi
    const manualDetails = manualItems.map((item) => {
      const jumlahKeperluan = parseInt(item.jumlahKeperluan) || 0;
      const hargaJual = parseFloat(item.hargaManual || 0) || 0;
      const subtotal = hargaJual * jumlahKeperluan;
      totalEstimasi += subtotal;

      return {
        barangId: '__manual__',
        kodeItem: item.kodeItem || null,
        isManual: true,
        namaBarang: item.namaManual || 'Barang Manual',
        jenisBentuk: item.jenisBentukManual || 'manual',
        supplier: item.supplierManual || null,
        jenisBahan: item.jenisBahanManual || 'Manual',
        beratJenis: item.beratJenisManual || null,
        beratbatang: item.beratbatangManual || null,
        minWelding: item.minWeldingManual || null,
        ukuranMentah: null,
        panjangMentah: 0,
        panjangJadi: 0,
        jumlahKeperluan,
        volume: null,
        hargaSatuan: Math.round(parseFloat(item.hargamodalManual || 0) || 0),
        hargaJual: Math.round(hargaJual),
        hargaJasa: Math.round(parseFloat(item.hargajasaManual || 0) || 0),
        luasPekerjaan: 0,
        subtotalMaterial: Math.round(subtotal),
        subtotalMaterialPemakaian: Math.round(subtotal),
        subtotalMaterialWaste: 0,
        subtotalJasa: 0,
        subtotal: Math.round(subtotal),
        beratPerBatang: 0,
        beratTotal: 0,
        beratWaste: 0,
        luasPermukaan: 0,
        luasPermukaanTotal: 0,
        breakdown: {
          kebutuhanBahan: 0,
          panjangRealTerpakai: 0,
          waste: 0,
          wastePercentage: 0,
          totalTitikWelding: 0,
          cuttingGuide: [],
          barAllocations: [],
          needsWelding: false,
        },
        usedExistingWaste: 0,
      };
    });

    return {
      itemDetails: [...itemDetails, ...manualDetails].filter(Boolean),
      totalEstimasi,
      totalBeratReal,
      totalLuasPermukaan,
      totalTitikWelding,
    };
  };

  const calculateEstimasi = async () => {
    if (!formData.namaEstimasi) {
      toast.error('Mohon isi nama estimasi!');
      return;
    }

    const validItems = selectedItems.filter((item) => {
      const jumlahValid = item.jumlahKeperluan && parseInt(item.jumlahKeperluan) > 0;
      if (!item.barangId || !jumlahValid) return false;
      if (item.barangId === '__manual__') {
        const namaValid = (item.namaManual || '').trim().length > 0;
        const hargaValid = parseFloat(item.hargaManual || 0) > 0;
        return namaValid && hargaValid;
      }
      return item.panjangJadi && parseFloat(item.panjangJadi) > 0;
    });

    if (validItems.length === 0) {
      toast.error('Mohon lengkapi item. Untuk barang manual: nama barang, harga jual, dan jumlah wajib diisi.');
      return;
    }

    const luasPekerjaan = formData.panjangRuangan && formData.lebarRuangan
      ? parseFloat(formData.panjangRuangan) * parseFloat(formData.lebarRuangan)
      : 0;

    const hasItemWithJasa = validItems.some((item) => {
      if (item.barangId === '__manual__') return false;
      const barang = barangList.find((b) => String(b.id) === String(item.barangId));
      return (parseFloat(barang?.hargajasa || 0) || 0) > 0;
    });

    if (hasItemWithJasa && luasPekerjaan <= 0) {
      toast.error('Ada item dengan harga jasa. Isi panjang dan lebar ruangan agar luas pekerjaan dapat dihitung.');
      return;
    }

    try {
      setSaving(true);
      const { itemDetails, totalEstimasi, totalBeratReal, totalLuasPermukaan, totalTitikWelding } =
        calculateWithWasteReuse(validItems, luasPekerjaan);

      const estimasiData = {
        namaEstimasi: formData.namaEstimasi,
        namaClient: formData.namaClient,
        lokasi: formData.lokasi,
        kontakPerson: formData.kontakPerson,
        panjangRuangan: formData.panjangRuangan ? parseFloat(formData.panjangRuangan) : null,
        lebarRuangan: formData.lebarRuangan ? parseFloat(formData.lebarRuangan) : null,
        luasRuangan: luasPekerjaan > 0 ? luasPekerjaan : null,
        items: itemDetails,
        totalEstimasi: Math.round(totalEstimasi),
        totalBeratReal: Math.round(totalBeratReal * 100) / 100,
        totalLuasPermukaan: Math.round(totalLuasPermukaan * 100) / 100,
        totalTitikWelding,
      };

      const newEstimasi = await estimasiAPI.create(estimasiData);
      toast.success(`Estimasi ${newEstimasi.nomorEstimasi} berhasil!`);
      navigate('/estimasi');
    } catch (error) {
      toast.error('Gagal menyimpan estimasi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Helper barang dari database ───────────────────────────────────────────────
  const getEffectiveBarang = (barangId) => {
    const base = barangList.find((b) => String(b.id) === String(barangId));
    if (!base) return null;
    return { ...base, ...(localBarangOverrides[barangId] || {}) };
  };

  const handleBarangFieldChange = (barangId, field, value) => {
    setLocalBarangOverrides((prev) => ({
      ...prev,
      [barangId]: { ...(prev[barangId] || {}), [field]: value },
    }));
  };

  const saveBarangForEstimasi = (barangId) => {
    toast.success('Perubahan diterapkan untuk estimasi ini saja.');
    setExpandedBarang((prev) => ({ ...prev, [barangId]: false }));
  };

  const saveBarangPermanent = async (barangId) => {
    const effectiveBarang = getEffectiveBarang(barangId);
    if (!effectiveBarang) return;
    try {
      setSavingBarang((prev) => ({ ...prev, [barangId]: true }));
      await barangAPI.update(barangId, effectiveBarang);
      setBarangList((prev) =>
        prev.map((b) => (String(b.id) === String(barangId) ? { ...b, ...effectiveBarang } : b))
      );
      setLocalBarangOverrides((prev) => {
        const next = { ...prev };
        delete next[barangId];
        return next;
      });
      toast.success('Barang berhasil disimpan permanen!');
      setExpandedBarang((prev) => ({ ...prev, [barangId]: false }));
    } catch (error) {
      toast.error('Gagal menyimpan permanen: ' + error.message);
    } finally {
      setSavingBarang((prev) => ({ ...prev, [barangId]: false }));
    }
  };

  // ── Simpan barang manual ke database ─────────────────────────────────────────
  const saveManualBarangPermanent = async (index) => {
    const item = selectedItems[index];
    if (!item || item.barangId !== '__manual__') return;

    const namaBarang = (item.namaManual || '').trim();
    const hargaJual = parseFloat(item.hargaManual || 0);

    if (!namaBarang) {
      toast.error('Nama barang wajib diisi sebelum menyimpan ke database.');
      return;
    }
    if (!hargaJual || hargaJual <= 0) {
      toast.error('Harga jual wajib diisi sebelum menyimpan ke database.');
      return;
    }

    const barangData = {
      nama: namaBarang,
      jenisBentuk: item.jenisBentukManual || 'custom',
      panjang: item.panjangManual || null,
      lebar: item.lebarManual || null,
      tinggi: item.tinggiManual || null,
      diameter: item.diameterManual || null,
      ketebalan: item.ketebalanManual || null,
      tinggiWF: item.tinggiWFManual || null,
      lebarFlange: item.lebarFlangeManual || null,
      ketebalanWeb: item.ketebalanWebManual || null,
      ketebalanFlange: item.ketebalanFlangeManual || null,
      panjangPlat: item.panjangPlatManual || null,
      lebarPlat: item.lebarPlatManual || null,
      ketebalanPlat: item.ketebalanPlatManual || null,
      jenisBahan: item.jenisBahanManual || null,
      beratJenis: item.beratJenisManual || null,
      beratbatang: item.beratbatangManual || null,
      minWelding: item.minWeldingManual || '50',
      hargamodal: item.hargamodalManual || item.hargaManual || null,
      hargajasa: item.hargajasaManual || null,
      supplier: item.supplierManual || null,
      foto: null,
    };

    try {
      setSavingManualBarang((prev) => ({ ...prev, [index]: true }));
      await barangAPI.create(barangData);
      // Reload daftar barang supaya langsung muncul di combobox
      const data = await barangAPI.getAll();
      setBarangList(data);
      toast.success(`Barang "${namaBarang}" berhasil disimpan ke database!`);
    } catch (error) {
      toast.error('Gagal menyimpan ke database: ' + error.message);
    } finally {
      setSavingManualBarang((prev) => ({ ...prev, [index]: false }));
    }
  };

  // ── Komponen form manual item ────────────────────────────────────────────────
  // Didefinisikan di dalam EstimasiForm agar bisa akses saveManualBarangPermanent & savingManualBarang
  // const ManualItemForm = ({ item, index }) => {
  //   const jenisBentuk = item.jenisBentukManual || 'balok';
  //   const f = (field) => ({
  //     value: item[field] || '',
  //     onChange: (e) => handleItemChange(index, field, e.target.value),
  //   });

  //   return (
  //     <div className="mt-2 p-4 bg-sky-50 rounded-lg border border-sky-200 space-y-4">
  //       <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Detail Barang Manual</p>

  //       {/* Baris 1: Nama & Supplier */}
  //       <div className="grid grid-cols-2 gap-3">
  //         <div className="space-y-1">
  //           <Label className="text-xs">Nama Barang <span className="text-red-500">*</span></Label>
  //           <Input placeholder="Contoh: Besi UNP 100" {...f('namaManual')} />
  //         </div>
  //         <div className="space-y-1">
  //           <Label className="text-xs">Supplier</Label>
  //           <Input placeholder="Contoh: CV. Besi Jaya" {...f('supplierManual')} />
  //         </div>
  //       </div>

  //       {/* Jenis Bentuk */}
  //       <div className="space-y-1">
  //         <Label className="text-xs">Jenis Bentuk</Label>
  //         <div className="flex gap-4 flex-wrap">
  //           {['balok', 'tabung', 'wf', 'plat', 'custom'].map((bentuk) => (
  //             <label key={bentuk} className="flex items-center gap-1.5 cursor-pointer">
  //               <input
  //                 type="radio"
  //                 name={`jenisBentukManual-${index}`}
  //                 value={bentuk}
  //                 checked={jenisBentuk === bentuk}
  //                 onChange={(e) => handleItemChange(index, 'jenisBentukManual', e.target.value)}
  //                 className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
  //               />
  //               <span className="text-xs font-medium text-gray-700 capitalize">{bentuk}</span>
  //             </label>
  //           ))}
  //         </div>
  //       </div>

  //       {/* Dimensi */}
  //       <div className="space-y-1">
  //         <Label className="text-xs">Dimensi (mm)</Label>
  //         {jenisBentuk === 'balok' && (
  //           <div className="grid grid-cols-4 gap-2">
  //             <Input type="number" placeholder="Panjang" {...f('panjangManual')} />
  //             <Input type="number" placeholder="Lebar" {...f('lebarManual')} />
  //             <Input type="number" placeholder="Tinggi" {...f('tinggiManual')} />
  //             <Input type="number" placeholder="Ketebalan" {...f('ketebalanManual')} />
  //           </div>
  //         )}
  //         {jenisBentuk === 'tabung' && (
  //           <div className="grid grid-cols-3 gap-2">
  //             <Input type="number" placeholder="Diameter" {...f('diameterManual')} />
  //             <Input type="number" placeholder="Panjang" {...f('panjangManual')} />
  //             <Input type="number" placeholder="Ketebalan" {...f('ketebalanManual')} />
  //           </div>
  //         )}
  //         {jenisBentuk === 'wf' && (
  //           <div className="grid grid-cols-4 gap-2">
  //             <div><Label className="text-[10px] text-gray-500">Tinggi (H)</Label><Input type="number" placeholder="200" {...f('tinggiWFManual')} /></div>
  //             <div><Label className="text-[10px] text-gray-500">Flange (B)</Label><Input type="number" placeholder="100" {...f('lebarFlangeManual')} /></div>
  //             <div><Label className="text-[10px] text-gray-500">Web (tw)</Label><Input type="number" placeholder="5.5" {...f('ketebalanWebManual')} /></div>
  //             <div><Label className="text-[10px] text-gray-500">Flange (tf)</Label><Input type="number" placeholder="8" {...f('ketebalanFlangeManual')} /></div>
  //           </div>
  //         )}
  //         {jenisBentuk === 'plat' && (
  //           <div className="grid grid-cols-3 gap-2">
  //             <Input type="number" placeholder="Panjang" {...f('panjangPlatManual')} />
  //             <Input type="number" placeholder="Lebar" {...f('lebarPlatManual')} />
  //             <Input type="number" placeholder="Ketebalan" {...f('ketebalanPlatManual')} />
  //           </div>
  //         )}
  //         {jenisBentuk === 'custom' && (
  //           <Input type="number" placeholder="Panjang" {...f('panjangManual')} />
  //         )}
  //       </div>

  //       {/* Informasi Material */}
  //       {jenisBentuk !== 'custom' && (
  //         <div className="grid grid-cols-2 gap-2">
  //           <div className="space-y-1">
  //             <Label className="text-xs">Jenis Bahan</Label>
  //             <Input placeholder="Baja ST37" {...f('jenisBahanManual')} />
  //           </div>
  //           <div className="space-y-1">
  //             <Label className="text-xs">Berat Jenis (kg/m³)</Label>
  //             <Input type="number" placeholder="7850" {...f('beratJenisManual')} />
  //           </div>
  //           <div className="space-y-1">
  //             <Label className="text-xs">Berat/Batang (kg)</Label>
  //             <Input type="number" placeholder="50" {...f('beratbatangManual')} />
  //           </div>
  //           <div className="space-y-1">
  //             <Label className="text-xs">Min. Welding (mm)</Label>
  //             <Input type="number" placeholder="50" {...f('minWeldingManual')} />
  //           </div>
  //         </div>
  //       )}

  //       {/* Harga */}
  //       <div className="grid grid-cols-3 gap-2">
  //         <div className="space-y-1">
  //           <Label className="text-xs">Harga Modal (Rp)</Label>
  //           <Input type="number" placeholder="500000" {...f('hargamodalManual')} />
  //         </div>
  //         <div className="space-y-1">
  //           <Label className="text-xs">Harga Jual (Rp) <span className="text-red-500">*</span></Label>
  //           <Input type="number" placeholder="750000" {...f('hargaManual')} />
  //         </div>
  //         <div className="space-y-1">
  //           <Label className="text-xs">Harga Jasa (Rp)</Label>
  //           <Input type="number" placeholder="100000" {...f('hargajasaManual')} />
  //         </div>
  //       </div>

  //       {/* Info kalkulasi */}
  //       <div className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
  //         <Zap className="w-3 h-3 shrink-0" />
  //         Barang manual dihitung berdasarkan Harga Jual × Jumlah. Pastikan nama barang dan harga jual sudah benar.
  //       </div>

  //       {/* ── DUA TOMBOL AKSI BARANG MANUAL ── */}
  //       <div className="flex gap-2 pt-2 border-t border-sky-200">
  //         <Button
  //           type="button"
  //           variant="outline"
  //           size="sm"
  //           className="flex-1 border-sky-300 text-sky-700 hover:bg-sky-50 text-xs"
  //           onClick={() => toast.success('Perubahan diterapkan untuk estimasi ini saja.')}
  //         >
  //           Gunakan untuk Estimasi Ini
  //         </Button>
  //         <Button
  //           type="button"
  //           size="sm"
  //           className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
  //           onClick={() => saveManualBarangPermanent(index)}
  //           disabled={savingManualBarang[index]}
  //         >
  //           {savingManualBarang[index] ? (
  //             <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Menyimpan...</>
  //           ) : (
  //             'Simpan ke Database Barang'
  //           )}
  //         </Button>
  //       </div>
  //     </div>
  //   );
  // };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Buat Estimasi Baru</h1>
          <p className="text-gray-600">Hitung kebutuhan material proyek Anda</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/estimasi')}>
          Kembali ke List
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Form Pembuatan Estimasi
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-1" /> Download Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => importFileRef.current?.click()}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <FileUp className="w-4 h-4 mr-1" /> Import Excel
                </Button>
                <input ref={importFileRef} type="file" accept=".xlsx, .xls" className="hidden" onChange={importFromExcel} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ── Info Proyek ── */}
            <div className="space-y-2">
              <Label>Nama Estimasi <span className="text-red-500">*</span></Label>
              <Input name="namaEstimasi" value={formData.namaEstimasi} onChange={handleInputChange} placeholder="Contoh: Rangka Kanopi" />
            </div>
            <div className="space-y-2">
              <Label>Nama Client</Label>
              <Input name="namaClient" value={formData.namaClient} onChange={handleInputChange} placeholder="Contoh: PT. Maju Jaya" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lokasi Proyek</Label>
                <Input name="lokasi" value={formData.lokasi} onChange={handleInputChange} placeholder="Contoh: Jakarta Selatan" />
              </div>
              <div className="space-y-2">
                <Label>Kontak Person</Label>
                <Input name="kontakPerson" value={formData.kontakPerson} onChange={handleInputChange} placeholder="Contoh: 08123456789 (Budi)" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dimensi Kerja</Label>
              <div className="flex items-center gap-3">
                <Input name="panjangRuangan" type="number" value={formData.panjangRuangan} onChange={handleInputChange} placeholder="Panjang (m)" />
                <span className="text-gray-500 font-semibold">×</span>
                <Input name="lebarRuangan" type="number" value={formData.lebarRuangan} onChange={handleInputChange} placeholder="Lebar (m)" />
              </div>
              {formData.panjangRuangan && formData.lebarRuangan && (
                <p className="text-sm text-blue-600 font-medium">
                  Luas: {(parseFloat(formData.panjangRuangan) * parseFloat(formData.lebarRuangan)).toFixed(2)} m²
                </p>
              )}
            </div>

            {/* ── Daftar Item ── */}
            <div className="flex items-center justify-between border-t pt-4">
              <h3 className="text-base font-semibold text-gray-900">Pilih Barang</h3>
              <Button onClick={addItemRow} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Tambah
              </Button>
            </div>

            {selectedItems.map((item, index) => {
              const barangInfo = getSelectedBarangInfo(item.barangId);
              const isGroupableBarang = item.barangId && item.barangId !== '__manual__';
              const isSameBarangAsPrevious = isGroupableBarang && index > 0 && item.barangId === selectedItems[index - 1].barangId;

              if (isSameBarangAsPrevious) return null;

              let itemNumber = 1;
              for (let i = 0; i < index; i++) {
                if (i === 0 || selectedItems[i].barangId !== selectedItems[i - 1].barangId) itemNumber++;
              }

              const itemsWithSameBarang = [item];
              if (isGroupableBarang) {
                for (let i = index + 1; i < selectedItems.length; i++) {
                  if (selectedItems[i].barangId === item.barangId && item.barangId !== '') {
                    itemsWithSameBarang.push(selectedItems[i]);
                  } else {
                    break;
                  }
                }
              }
              const lastItemIndex = index + itemsWithSameBarang.length - 1;
              const isManual = item.barangId === '__manual__';

              return (
                <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold">Item #{itemNumber}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItemRowWithSameBarang(lastItemIndex)}
                        className="px-3"
                        disabled={!item.barangId}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          isManual
                            ? removeItemRow(index)
                            : removeAllItemsWithSameBarang(item.barangId)
                        }
                        className="px-3 text-red-500 hover:bg-red-50 hover:border-red-300"
                        title="Hapus barang ini beserta seluruh kodenya"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pilih Barang <span className="text-red-500">*</span></Label>
                      <BarangCombobox
                        barangList={barangList}
                        value={item.barangId}
                        onSelect={(barangId, namaManual) => handleBarangSelect(index, barangId, namaManual)}
                        isDisabled={(barangId) => isBarangDisabled(barangId, index)}
                      />

                      {/* Form manual dengan dua tombol */}
                      {isManual && (
                        <ManualItemForm
                          item={item}
                          index={index}
                          onItemChange={handleItemChange}
                          onSavePermanent={saveManualBarangPermanent}
                          saving={savingManualBarang}
                        />
                      )}
                    </div>
                  </div>

                  {barangInfo && !isManual && (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm">
                      <span className="font-medium">Stok:</span> {formatNumberWithSeparator(barangInfo.panjangMentah)} mm
                      {barangInfo.minWelding > 0 && (
                        <span className="ml-3">
                          <span className="font-medium">Min Welding:</span> {formatNumberWithSeparator(barangInfo.minWelding)} mm
                        </span>
                      )}
                    </div>
                  )}

                  {/* Sub-item (panjang jadi + jumlah) untuk barang dari database */}
                  {!isManual && itemsWithSameBarang.map((subItem, subIdx) => {
                    const actualIndex = index + subIdx;
                    return (
                      <div key={actualIndex} className="grid grid-cols-3 gap-3 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Kode Item</Label>
                          <Input
                            placeholder="A-01"
                            value={subItem.kodeItem || ''}
                            onChange={(e) => handleItemChange(actualIndex, 'kodeItem', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Panjang Jadi (mm) <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            placeholder="600"
                            value={subItem.panjangJadi || ''}
                            onChange={(e) => handleItemChange(actualIndex, 'panjangJadi', e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Jumlah <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              placeholder="10"
                              value={subItem.jumlahKeperluan || ''}
                              onChange={(e) => handleItemChange(actualIndex, 'jumlahKeperluan', e.target.value)}
                            />
                          </div>
                          {itemsWithSameBarang.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="text-red-500 hover:bg-red-50 shrink-0"
                              onClick={() => removeItemRow(actualIndex)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Kode item + jumlah untuk barang manual */}
                  {isManual && (
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Kode Item</Label>
                        <Input
                          placeholder="C-01"
                          value={item.kodeItem || ''}
                          onChange={(e) => handleItemChange(index, 'kodeItem', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Jumlah <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          placeholder="3"
                          value={item.jumlahKeperluan || ''}
                          onChange={(e) => handleItemChange(index, 'jumlahKeperluan', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Toggle edit detail barang dari database */}
                  {item.barangId && !isManual && (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBarang((prev) => ({ ...prev, [item.barangId]: !prev[item.barangId] }))
                        }
                        className="text-xs text-sky-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <Settings className="w-3 h-3" />
                        {expandedBarang[item.barangId] ? 'Tutup Detail Barang' : 'Lihat & Edit Detail Barang'}
                        {localBarangOverrides[item.barangId] && (
                          <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">Diubah</span>
                        )}
                      </button>

                      {expandedBarang[item.barangId] && (() => {
                        const eb = getEffectiveBarang(item.barangId);
                        if (!eb) return null;
                        const field = (f) => ({
                          value: eb[f] ?? '',
                          onChange: (e) => handleBarangFieldChange(item.barangId, f, e.target.value),
                          className: 'input-focus',
                        });

                        return (
                          <div className="mt-3 p-4 bg-white border border-sky-200 rounded-lg space-y-4">
                            <h4 className="text-sm font-semibold text-sky-700">Detail & Edit Barang</h4>

                            <div className="space-y-2">
                              <Label className="text-xs text-gray-500 uppercase tracking-wide">Dimensi (mm)</Label>
                              {eb.jenisBentuk === 'balok' && (
                                <div className="grid grid-cols-3 gap-2">
                                  <div><Label className="text-xs">Panjang</Label><Input type="number" {...field('panjang')} /></div>
                                  <div><Label className="text-xs">Lebar</Label><Input type="number" {...field('lebar')} /></div>
                                  <div><Label className="text-xs">Tinggi</Label><Input type="number" {...field('tinggi')} /></div>
                                  <div className="col-span-3"><Label className="text-xs">Ketebalan</Label><Input type="number" {...field('ketebalan')} /></div>
                                </div>
                              )}
                              {eb.jenisBentuk === 'tabung' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div><Label className="text-xs">Diameter</Label><Input type="number" {...field('diameter')} /></div>
                                  <div><Label className="text-xs">Panjang</Label><Input type="number" {...field('panjang')} /></div>
                                  <div className="col-span-2"><Label className="text-xs">Ketebalan</Label><Input type="number" {...field('ketebalan')} /></div>
                                </div>
                              )}
                              {eb.jenisBentuk === 'wf' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div><Label className="text-xs">Tinggi (H)</Label><Input type="number" {...field('tinggiWF')} /></div>
                                  <div><Label className="text-xs">Lebar Flange (B)</Label><Input type="number" {...field('lebarFlange')} /></div>
                                  <div><Label className="text-xs">Tebal Web (tw)</Label><Input type="number" {...field('ketebalanWeb')} /></div>
                                  <div><Label className="text-xs">Tebal Flange (tf)</Label><Input type="number" {...field('ketebalanFlange')} /></div>
                                </div>
                              )}
                              {eb.jenisBentuk === 'plat' && (
                                <div className="grid grid-cols-3 gap-2">
                                  <div><Label className="text-xs">Panjang</Label><Input type="number" {...field('panjangPlat')} /></div>
                                  <div><Label className="text-xs">Lebar</Label><Input type="number" {...field('lebarPlat')} /></div>
                                  <div><Label className="text-xs">Ketebalan</Label><Input type="number" {...field('ketebalanPlat')} /></div>
                                </div>
                              )}
                              {eb.jenisBentuk === 'custom' && (
                                <div><Label className="text-xs">Panjang</Label><Input type="number" {...field('panjang')} /></div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-gray-500 uppercase tracking-wide">Material</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div><Label className="text-xs">Jenis Bahan</Label><Input {...field('jenisBahan')} placeholder="Baja ST37" /></div>
                                <div><Label className="text-xs">Berat Jenis (kg/m³)</Label><Input type="number" {...field('beratJenis')} placeholder="7850" /></div>
                                <div><Label className="text-xs">Berat/Batang (kg)</Label><Input type="number" {...field('beratbatang')} /></div>
                                <div><Label className="text-xs">Min. Welding (mm)</Label><Input type="number" {...field('minWelding')} /></div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-gray-500 uppercase tracking-wide">Harga</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div><Label className="text-xs">Harga Modal (Rp)</Label><Input type="number" {...field('hargamodal')} /></div>
                                <div><Label className="text-xs">Harga Jasa (Rp)</Label><Input type="number" {...field('hargajasa')} /></div>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1 border-sky-300 text-sky-700 hover:bg-sky-50"
                                onClick={() => saveBarangForEstimasi(item.barangId)}
                              >
                                Simpan untuk Estimasi Ini
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => saveBarangPermanent(item.barangId)}
                                disabled={savingBarang[item.barangId]}
                              >
                                {savingBarang[item.barangId] ? (
                                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Menyimpan...</>
                                ) : (
                                  'Simpan Permanen'
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Footer tombol ── */}
            <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/estimasi')} disabled={saving}>
                Batal
              </Button>
              <Button onClick={calculateEstimasi} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Simpan Estimasi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EstimasiForm;