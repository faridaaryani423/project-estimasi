import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Calculator, Plus, Trash2, Send, Zap,
  Loader2, ChevronLeft, ChevronRight, Settings,
  Download, FileUp
} from 'lucide-react';
import { barangAPI, estimasiAPI } from '@/services/api';
import { calculateLuasPermukaan, calculateMaterialGroupAllocation, calculateWithWasteReuse } from '@/utils/calculationEngine';
import { formatNumberWithSeparator } from '@/lib/utils';
import BarangCombobox from '@/components/BarangCombobox';
import ManualItemForm from '@/components/ManualItemForm';
import * as XLSX from 'xlsx';

const emptyItem = () => ({
  barangId: '',
  kodeItem: '',
  panjangJadi: '',
  jumlahKeperluan: '',
  volume: '',
  namaManual: '',
  hargaManual: '',
  hargamodalManual: '',
  satuanHargaModalManual: 'batang',
  hargajasaManual: '',
  jenisBentukManual: 'balok',
  supplierManual: '',
  jenisBahanManual: '',
  beratJenisManual: '',
  beratbatangManual: '',
  minWeldingManual: '',
  panjangManual: '',
  lebarManual: '',
  tinggiManual: '',
  diameterManual: '',
  ketebalanManual: '',
  tinggiWFManual: '',
  lebarFlangeManual: '',
  ketebalanWebManual: '',
  ketebalanFlangeManual: '',
  panjangPlatManual: '',
  lebarPlatManual: '',
  ketebalanPlatManual: '',
});

const groupAdjacentItems = (items) => {
  const grouped = [];
  const visited = new Set();

  items.forEach((item) => {
    const key = item.barangId === '__manual__'
      ? `manual_${(item.namaManual || '').trim().toLowerCase()}`
      : `db_${item.barangId}`;

    if (visited.has(key)) return;

    items.forEach((subItem) => {
      const subKey = subItem.barangId === '__manual__'
        ? `manual_${(subItem.namaManual || '').trim().toLowerCase()}`
        : `db_${subItem.barangId}`;

      if (key === subKey) {
        grouped.push(subItem);
      }
    });

    visited.add(key);
  });

  return grouped;
};

const EditEstimasi = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [barangList, setBarangList] = useState([]);
  const [estimasi, setEstimasi]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const [formData, setFormData] = useState({
    namaEstimasi: '',
    panjangRuangan: '',
    lebarRuangan: '',
    namaClient: '',
    lokasi: '',
    kontakPerson: '',
  });

  const [selectedItems, setSelectedItems] = useState([emptyItem()]);

  // ── State untuk edit detail barang (sama seperti EstimasiForm) ────────────────
  const [localBarangOverrides, setLocalBarangOverrides] = useState({});
  const [savingBarang, setSavingBarang]                 = useState({});
  const [expandedBarang, setExpandedBarang]             = useState({});
  const importFileRef                                   = useRef(null);

  // ── Download & Import Excel ───────────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const formDataRows = [
      ['TEMPLATE IMPORT ESTIMASI MATERIAL'],
      ['Petunjuk: Isi kolom putih. Hapus baris contoh (baris 13-15) sebelum import.'],
      [''],
      ['Nama Estimasi', '← wajib diisi'],
      ['Nama Client', '← opsional'],
      ['Lokasi Proyek', '← opsional'],
      ['Kontak Person', '← opsional'],
      ['Panjang Ruangan (m)', '← opsional'],
      ['Lebar Ruangan (m)', '← opsional'],
      [''],
      ['Nama Barang *', 'Kode Item', 'Panjang Jadi (mm)', 'Jumlah *', 'Harga Manual (Rp)'],
      ['(lihat sheet Daftar Barang)', '(bebas, misal A-01)', '(kosongkan jika barang manual)', '', '(isi jika barang tidak ada di Daftar Barang)'],
      ['Hollow 40x40x1.8', 'A-01', '600', '15', ''],
      ['Hollow 40x40x1.8', 'A-02', '800', '10', ''],
      ['Barang Tidak Ada Di Daftar', 'C-01', '', '3', '750000'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(formDataRows);
    ws1['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 22 }, { wch: 10 }, { wch: 25 }];

    const daftarHeader = [
      ['DAFTAR BARANG TERSEDIA'],
      ['Salin nama barang persis seperti di kolom "Nama Barang" pada sheet Form Estimasi'],
      [''],
      ['Nama Barang', 'Jenis Bahan', 'Panjang Stok (mm)', 'Min Welding (mm)'],
    ];
    const daftarRows = barangList.map((b) => [
      b.nama, b.jenisBahan || '-', b.jenisBentuk === 'plat' ? b.panjangPlat : b.panjang, b.minWelding || 0,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([...daftarHeader, ...daftarRows]);
    ws2['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];

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

        const cleanExcelVal = (val) => {
          const str = String(val || '').trim();
          if (str.toLowerCase().includes('wajib diisi') || str.toLowerCase().includes('opsional')) return '';
          return str;
        };

        const namaEstimasi = cleanExcelVal(rows[3]?.[1]);
        const namaClient = cleanExcelVal(rows[4]?.[1]);
        const lokasi = cleanExcelVal(rows[5]?.[1]);
        const kontakPerson = cleanExcelVal(rows[6]?.[1]);
        const panjangRuangan = cleanExcelVal(rows[7]?.[1]);
        const lebarRuangan = cleanExcelVal(rows[8]?.[1]);

        if (!namaEstimasi) {
          toast.error('Nama Estimasi wajib diisi di template!');
          e.target.value = '';
          return;
        }

        const notFoundNames = [];
        const items = [];

        for (let i = 12; i < rows.length; i++) {
          const row = rows[i];
          const namaBarang = String(row[0] || '').trim();
          const kodeItem = String(row[1] || '').trim();
          const panjangJadi = String(row[2] || '').trim();
          const jumlah = String(row[3] || '').trim();
          const hargaManual = String(row[4] || '').trim();

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
            items.push({ ...emptyItem(), barangId: '__manual__', kodeItem, panjangJadi, jumlahKeperluan: jumlah, namaManual: namaBarang, hargamodalManual: hargaManual });
          }
        }

        if (items.length === 0) {
          toast.error('Tidak ada item valid yang bisa diimport!');
          e.target.value = '';
          return;
        }

        setFormData((prev) => ({ ...prev, namaEstimasi, namaClient, lokasi, kontakPerson, panjangRuangan, lebarRuangan }));
        setSelectedItems(groupAdjacentItems(items));
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

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [barangData, semuaEstimasi] = await Promise.all([
        barangAPI.getAll(),
        estimasiAPI.getAll(),
      ]);

      setBarangList(barangData);

      const found = semuaEstimasi.find((e) => String(e.id) === String(id));
      if (!found) {
        toast.error('Estimasi tidak ditemukan!');
        navigate('/estimasi');
        return;
      }

      setEstimasi(found);
      setFormData({
        namaEstimasi:   found.namaEstimasi || '',
        panjangRuangan: found.panjangRuangan?.toString() || '',
        lebarRuangan:   found.lebarRuangan?.toString()   || '',
        namaClient:     found.namaClient   || '',
        lokasi:         found.lokasi        || '',
        kontakPerson:   found.kontakPerson  || '',
      });

      setSelectedItems(
        found.items?.map((item) => {
          const isItemManual = item.isManual || item.barangId === '__manual__';
          const barangFromDB = !isItemManual
            ? barangData.find((b) => b.nama === item.namaBarang)
            : null;

          return {
            ...emptyItem(),
            barangId: isItemManual
              ? '__manual__'
              : item.barangId?.toString() || barangFromDB?.id?.toString() || '',
            kodeItem: item.kodeItem || '',
            panjangJadi: item.panjangJadi?.toString() || '',
            jumlahKeperluan: item.jumlahKeperluan?.toString() || '',
            volume: item.volume?.toString() || '',
            // Manual fields
            namaManual: isItemManual ? (item.namaBarang || '') : '',
            hargaManual: '', // No longer used
            hargamodalManual: isItemManual ? (item.hargaSatuan ?? '').toString() : '',
            satuanHargaModalManual: isItemManual ? (item.breakdown?.satuanHargaModal || 'batang') : 'batang',
            hargajasaManual: isItemManual ? (item.hargaJasa ?? '').toString() : '',
            jenisBentukManual: isItemManual ? (item.jenisBentuk || 'custom') : 'balok',
            supplierManual: isItemManual ? (item.supplier || '') : '',
            jenisBahanManual: isItemManual
              ? (item.jenisBahan !== 'Manual' ? item.jenisBahan || '' : '')
              : '',
            beratJenisManual: isItemManual ? (item.beratJenis?.toString() || '') : '',
            beratbatangManual: isItemManual ? (item.beratbatang?.toString() || '') : '',
            minWeldingManual: isItemManual ? (item.minWelding?.toString() || '') : '',
            panjangManual: isItemManual ? (item.panjangManual?.toString() || item.panjangMentah?.toString() || '') : '',
            lebarManual: isItemManual ? (item.lebarManual?.toString() || '') : '',
            tinggiManual: isItemManual ? (item.tinggiManual?.toString() || '') : '',
            diameterManual: isItemManual ? (item.diameterManual?.toString() || '') : '',
            ketebalanManual: isItemManual ? (item.ketebalanManual?.toString() || '') : '',
            tinggiWFManual: isItemManual ? (item.tinggiWFManual?.toString() || '') : '',
            lebarFlangeManual: isItemManual ? (item.lebarFlangeManual?.toString() || '') : '',
            ketebalanWebManual: isItemManual ? (item.ketebalanWebManual?.toString() || '') : '',
            ketebalanFlangeManual: isItemManual ? (item.ketebalanFlangeManual?.toString() || '') : '',
            panjangPlatManual: isItemManual ? (item.panjangPlatManual?.toString() || item.panjangMentah?.toString() || '') : '',
            lebarPlatManual: isItemManual ? (item.lebarPlatManual?.toString() || '') : '',
            ketebalanPlatManual: isItemManual ? (item.ketebalanPlatManual?.toString() || '') : '',
          };
        }) || [emptyItem()]
      );
    } catch (error) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers form ─────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    const targetItem = updated[index];
    
    if (
      targetItem &&
      targetItem.barangId === '__manual__' && 
      field !== 'kodeItem' && 
      field !== 'jumlahKeperluan' &&
      field !== 'panjangJadi' &&
      targetItem.namaManual &&
      targetItem.namaManual.trim() !== ''
    ) {
      const oldName = targetItem.namaManual;
      updated.forEach((item, idx) => {
        if (item.barangId === '__manual__' && item.namaManual === oldName) {
          updated[idx] = { ...item, [field]: value };
        }
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setSelectedItems(updated);
  };

  const addItemRow = () => {
    setSelectedItems([
      ...selectedItems,
      { barangId: '', kodeItem: '', panjangJadi: '', jumlahKeperluan: '', volume: '', namaManual: '', hargaManual: '' },
    ]);
  };

  const addItemRowWithSameBarang = (index) => {
    const currentItem = selectedItems[index];
    const newItem = {
      ...emptyItem(),
      barangId: currentItem.barangId,
      ...(currentItem.barangId === '__manual__' ? {
        namaManual: currentItem.namaManual,
        hargaManual: currentItem.hargaManual,
        supplierManual: currentItem.supplierManual,
        jenisBentukManual: currentItem.jenisBentukManual,
        panjangManual: currentItem.panjangManual,
        lebarManual: currentItem.lebarManual,
        tinggiManual: currentItem.tinggiManual,
        diameterManual: currentItem.diameterManual,
        ketebalanManual: currentItem.ketebalanManual,
        tinggiWFManual: currentItem.tinggiWFManual,
        lebarFlangeManual: currentItem.lebarFlangeManual,
        ketebalanWebManual: currentItem.ketebalanWebManual,
        ketebalanFlangeManual: currentItem.ketebalanFlangeManual,
        panjangPlatManual: currentItem.panjangPlatManual,
        lebarPlatManual: currentItem.lebarPlatManual,
        ketebalanPlatManual: currentItem.ketebalanPlatManual,
        jenisBahanManual: currentItem.jenisBahanManual,
        beratJenisManual: currentItem.beratJenisManual,
        beratbatangManual: currentItem.beratbatangManual,
        minWeldingManual: currentItem.minWeldingManual,
        hargamodalManual: currentItem.hargamodalManual,
        satuanHargaModalManual: currentItem.satuanHargaModalManual,
        hargajasaManual: currentItem.hargajasaManual,
      } : {})
    };
    setSelectedItems([
      ...selectedItems.slice(0, index + 1),
      newItem,
      ...selectedItems.slice(index + 1),
    ]);
  };

  const removeItemRow = (index) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== index));
    }
  };

  const removeAllItemsWithSameBarang = (barangId) => {
    const remaining = selectedItems.filter((item) => item.barangId !== barangId);
    if (remaining.length === 0) {
      setSelectedItems([emptyItem()]);
    } else {
      setSelectedItems(remaining);
    }
  };

  const removeAllItemsWithSameManualName = (namaManual, index) => {
    if (!namaManual || namaManual.trim() === '') {
      removeItemRow(index);
      return;
    }
    const remaining = selectedItems.filter(
      (item) => !(item.barangId === '__manual__' && (item.namaManual || '').trim().toLowerCase() === namaManual.trim().toLowerCase())
    );
    if (remaining.length === 0) {
      setSelectedItems([emptyItem()]);
    } else {
      setSelectedItems(remaining);
    }
  };

  const isSameBarang = (itemA, itemB) => {
    if (!itemA || !itemB) return false;
    if (!itemA.barangId || !itemB.barangId) return false;
    if (itemA.barangId === '__manual__' && itemB.barangId === '__manual__') {
      const nameA = (itemA.namaManual || '').trim().toLowerCase();
      const nameB = (itemB.namaManual || '').trim().toLowerCase();
      return nameA !== '' && nameA === nameB;
    }
    return itemA.barangId !== '__manual__' && itemA.barangId === itemB.barangId;
  };

  // ─── Helpers barang (dengan override support) ─────────────────────
  const getEffectiveBarang = (barangId) => {
    const base = barangList.find((b) => String(b.id) === String(barangId));
    if (!base) return null;
    return { ...base, ...(localBarangOverrides[barangId] || {}) };
  };

  const getSelectedBarangInfo = (barangId) => {
    if (!barangId || barangId === '__manual__') return null;
    const barang = getEffectiveBarang(barangId);
    if (!barang) return null;
    return {
      panjangMentah: barang.jenisBentuk === 'plat' ? barang.panjangPlat : barang.panjang,
      minWelding: barang.minWelding || 0,
    };
  };

  const getSelectedBarangIds = () => {
    const ids = new Set();
    selectedItems.forEach((item, index) => {
      if (item.barangId && item.barangId !== '__manual__') {
        const isFirst = selectedItems.findIndex((si) => si.barangId === item.barangId) === index;
        if (isFirst) ids.add(item.barangId);
      }
    });
    return ids;
  };

  const isBarangDisabled = (barangId, currentIndex) => {
    const ids = getSelectedBarangIds();
    const current = selectedItems[currentIndex]?.barangId;
    return ids.has(barangId.toString()) && current !== barangId.toString();
  };

  const handleBarangSelect = (index, barangId, namaManual = '') => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], barangId, namaManual, hargaManual: '' };
    setSelectedItems(updated);
  };

  // ─── Helper edit detail barang (sama persis seperti EstimasiForm) ─
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

  const saveManualBarangPermanent = async (index) => {
    const item = selectedItems[index];
    if (!item || item.barangId !== '__manual__') return;

    const namaBarang = (item.namaManual || '').trim();
    const jb = item.jenisBentukManual || 'custom';
    
    const check = (val) => val !== undefined && val !== null && String(val).trim() !== '';

    if (!namaBarang) return toast.error('Nama barang wajib diisi.');
    
    if (jb === 'balok') {
      if (!check(item.panjangManual)) return toast.error('Panjang wajib diisi.');
      if (!check(item.lebarManual)) return toast.error('Lebar wajib diisi.');
      if (!check(item.tinggiManual)) return toast.error('Tinggi wajib diisi.');
    } else if (jb === 'tabung') {
      if (!check(item.diameterManual)) return toast.error('Diameter wajib diisi.');
      if (!check(item.panjangManual)) return toast.error('Panjang wajib diisi.');
    } else if (jb === 'wf') {
      if (!check(item.tinggiWFManual)) return toast.error('Tinggi (H) wajib diisi.');
      if (!check(item.lebarFlangeManual)) return toast.error('Lebar Flange (B) wajib diisi.');
      if (!check(item.ketebalanWebManual)) return toast.error('Tebal Web (tw) wajib diisi.');
      if (!check(item.ketebalanFlangeManual)) return toast.error('Tebal Flange (tf) wajib diisi.');
    } else if (jb === 'plat') {
      if (!check(item.panjangPlatManual)) return toast.error('Panjang Plat wajib diisi.');
      if (!check(item.lebarPlatManual)) return toast.error('Lebar Plat wajib diisi.');
      if (!check(item.ketebalanPlatManual)) return toast.error('Ketebalan Plat wajib diisi.');
    }

    if (!['wf', 'plat', 'custom'].includes(jb)) {
      if (!check(item.ketebalanManual)) return toast.error('Ketebalan wajib diisi.');
    }

    if (jb !== 'custom') {
      if (!check(item.jenisBahanManual)) return toast.error('Jenis Bahan wajib diisi.');
      if (!check(item.beratJenisManual)) return toast.error('Berat Jenis wajib diisi.');
      if (!check(item.minWeldingManual)) return toast.error('Min. Ukuran Welding wajib diisi.');
      if (!check(item.beratbatangManual)) return toast.error('Berat per Batang wajib diisi.');
    }

    if (!check(item.hargamodalManual)) return toast.error('Harga Modal wajib diisi.');

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
      jenisBahan: item.jenisBahanManual || '-',
      beratJenis: item.beratJenisManual || '0',
      hargamodal: item.hargamodalManual || '0',
      beratbatang: item.beratbatangManual || null,
      minWelding: item.minWeldingManual || '50',
      hargajasa: item.hargajasaManual || null,
      supplier: item.supplierManual || null,
      foto: null,
    };

    try {
      setSavingManualBarang((prev) => ({ ...prev, [index]: true }));
      await barangAPI.create(barangData);
      const data = await barangAPI.getAll();
      setBarangList(data);
      toast.success(`Barang "${namaBarang}" berhasil disimpan ke database!`);
    } catch (error) {
      toast.error('Gagal menyimpan ke database: ' + error.message);
    } finally {
      setSavingManualBarang((prev) => ({ ...prev, [index]: false }));
    }
  };

  const [savingManualBarang, setSavingManualBarang] = useState({});

  // ─── Kalkulasi & simpan ───────────────────────────────────────────
  const handleUpdate = async () => {
    if (!formData.namaEstimasi) {
      toast.error('Mohon isi nama estimasi!');
      return;
    }

    const validItems = [];
    let hasInvalid = false;
    let errorMessage = '';

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      if (!item.barangId) continue;
      
      const isManual = item.barangId === '__manual__';
      const jb = isManual ? (item.jenisBentukManual || 'custom') : '';
      const isCustomShape = isManual && jb === 'custom';

      if (!isCustomShape) {
        const jumlahValid = item.jumlahKeperluan && parseInt(item.jumlahKeperluan) > 0;
        if (!jumlahValid) {
          hasInvalid = true;
          errorMessage = `Baris ${i + 1}: Jumlah keperluan harus lebih dari 0.`;
          break;
        }
      }

      if (isManual) {
        const check = (val) => val !== undefined && val !== null && String(val).trim() !== '';

        if (!check(item.namaManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Nama barang wajib diisi.`; break; }
        
        if (jb === 'balok') {
          if (!check(item.panjangManual) || !check(item.lebarManual) || !check(item.tinggiManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Panjang, Lebar, Tinggi wajib diisi.`; break; }
        } else if (jb === 'tabung') {
          if (!check(item.diameterManual) || !check(item.panjangManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Diameter dan Panjang wajib diisi.`; break; }
        } else if (jb === 'wf') {
          if (!check(item.tinggiWFManual) || !check(item.lebarFlangeManual) || !check(item.ketebalanWebManual) || !check(item.ketebalanFlangeManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Dimensi WF wajib diisi lengkap.`; break; }
        } else if (jb === 'plat') {
          if (!check(item.panjangPlatManual) || !check(item.lebarPlatManual) || !check(item.ketebalanPlatManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Dimensi Plat wajib diisi lengkap.`; break; }
        }

        if (!['wf', 'plat', 'custom'].includes(jb) && !check(item.ketebalanManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Ketebalan wajib diisi.`; break; }

        if (jb !== 'custom') {
          if (!check(item.jenisBahanManual) || !check(item.beratJenisManual) || !check(item.minWeldingManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Jenis Bahan, Berat Jenis, Min Welding wajib diisi.`; break; }
          if (!check(item.beratbatangManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Berat per Batang wajib diisi.`; break; }
        }

        if (!check(item.hargamodalManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Harga Modal wajib diisi.`; break; }

        validItems.push(item);
      } else {
        if (!item.panjangJadi || parseFloat(item.panjangJadi) <= 0) {
          hasInvalid = true;
          errorMessage = `Baris ${i + 1}: Panjang Jadi wajib diisi lebih dari 0.`;
          break;
        }
        validItems.push(item);
      }
    }

    if (hasInvalid) {
      toast.error(errorMessage);
      return;
    }

    if (validItems.length === 0) {
      toast.error('Mohon lengkapi item terlebih dahulu!');
      return;
    }

    const luasPekerjaan =
      formData.panjangRuangan && formData.lebarRuangan
        ? parseFloat(formData.panjangRuangan) * parseFloat(formData.lebarRuangan)
        : 0;

    const hasJasa = validItems.some((item) => {
      if (item.barangId === '__manual__') return false;
      const b = getEffectiveBarang(item.barangId);
      return (parseFloat(b?.hargajasa || 0) || 0) > 0;
    });

    if (hasJasa && luasPekerjaan <= 0) {
      toast.error('Isi dimensi ruangan — ada item yang punya harga jasa!');
      return;
    }

    try {
      setSaving(true);

      const { itemDetails, totalEstimasi, totalBeratReal, totalLuasPermukaan, totalTitikWelding } =
        calculateWithWasteReuse(validItems, luasPekerjaan, barangList);

      const payload = {
        namaEstimasi:   formData.namaEstimasi,
        namaClient:     formData.namaClient   || null,
        lokasi:         formData.lokasi        || null,
        kontakPerson:   formData.kontakPerson  || null,
        panjangRuangan: formData.panjangRuangan ? parseFloat(formData.panjangRuangan) : null,
        lebarRuangan:   formData.lebarRuangan  ? parseFloat(formData.lebarRuangan)   : null,
        luasRuangan:    luasPekerjaan > 0      ? luasPekerjaan                        : null,
        items:          itemDetails,
        totalEstimasi:       Math.round(totalEstimasi),
        totalBeratReal:      Math.round(totalBeratReal * 100) / 100,
        totalLuasPermukaan:  Math.round(totalLuasPermukaan * 100) / 100,
        totalTitikWelding,
      };

      const updated = await estimasiAPI.update(id, payload);
      toast.success(`Estimasi ${updated.nomorEstimasi} berhasil diupdate!`);
      navigate('/estimasi');
    } catch (error) {
      toast.error('Gagal update: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <button
          onClick={() => navigate('/estimasi')}
          className="flex items-center gap-1 hover:text-sky-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Estimasi
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Edit {estimasi?.nomorEstimasi}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Edit Estimasi</h1>
        <p className="text-gray-500 text-sm">{estimasi?.nomorEstimasi} · {estimasi?.namaEstimasi}</p>
      </div>

      {/* Card: Detail Estimasi */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" /> Detail Estimasi
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

          <div className="space-y-2">
            <Label>Nama Estimasi <span className="text-red-500">*</span></Label>
            <Input
              name="namaEstimasi"
              value={formData.namaEstimasi}
              onChange={handleInputChange}
              placeholder="Contoh: Rangka Kanopi"
            />
          </div>

          <div className="space-y-2">
            <Label>Nama Client</Label>
            <Input
              name="namaClient"
              value={formData.namaClient}
              onChange={handleInputChange}
              placeholder="Contoh: PT. Maju Jaya"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lokasi Proyek</Label>
              <Input
                name="lokasi"
                value={formData.lokasi}
                onChange={handleInputChange}
                placeholder="Contoh: Jakarta Selatan"
              />
            </div>
            <div className="space-y-2">
              <Label>Kontak Person</Label>
              <Input
                name="kontakPerson"
                value={formData.kontakPerson}
                onChange={handleInputChange}
                placeholder="Contoh: 08123456789 (Budi)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dimensi Kerja</Label>
            <div className="flex items-center gap-3">
              <Input
                name="panjangRuangan"
                type="number"
                value={formData.panjangRuangan}
                onChange={handleInputChange}
                placeholder="Panjang (m)"
              />
              <span className="text-gray-500 font-semibold">×</span>
              <Input
                name="lebarRuangan"
                type="number"
                value={formData.lebarRuangan}
                onChange={handleInputChange}
                placeholder="Lebar (m)"
              />
            </div>
            {formData.panjangRuangan && formData.lebarRuangan && (
              <p className="text-sm text-blue-600 font-medium">
                Luas: {(parseFloat(formData.panjangRuangan) * parseFloat(formData.lebarRuangan)).toFixed(2)} m²
              </p>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Card: Barang */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Barang</CardTitle>
            <Button onClick={addItemRow} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedItems.map((item, index) => {
            const barangInfo     = getSelectedBarangInfo(item.barangId);
            const isGroupable    = item.barangId && (item.barangId !== '__manual__' || (item.namaManual || '').trim() !== '');
            const isSameAsPrev   = isGroupable && index > 0 && isSameBarang(item, selectedItems[index - 1]);
            if (isSameAsPrev) return null;

            const itemsWithSame = [item];
            if (isGroupable) {
              for (let i = index + 1; i < selectedItems.length; i++) {
                if (isSameBarang(selectedItems[i], item)) itemsWithSame.push(selectedItems[i]);
                else break;
              }
            }
            const lastIdx  = index + itemsWithSame.length - 1;
            const isManual = item.barangId === '__manual__';

            return (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Item #{index + 1}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addItemRowWithSameBarang(lastIdx)}
                      disabled={!item.barangId || (isManual && (item.jenisBentukManual || 'custom') === 'custom')}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        isManual
                          ? removeAllItemsWithSameManualName(item.namaManual, index)
                          : removeAllItemsWithSameBarang(item.barangId)
                      }
                      className="text-red-500 hover:bg-red-50 hover:border-red-300"
                      title="Hapus barang ini beserta seluruh kodenya"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <BarangCombobox
                  barangList={barangList}
                  value={item.barangId}
                  onSelect={(barangId, namaManual) => handleBarangSelect(index, barangId, namaManual)}
                  isDisabled={(barangId) => isBarangDisabled(barangId, index)}
                />

                {/* Form manual (sederhana, hanya nama & harga) */}
                {isManual && (
                  <ManualItemForm
                    item={item}
                    index={index}
                    onItemChange={handleItemChange}
                    onSavePermanent={saveManualBarangPermanent}
                    saving={savingManualBarang}
                  />
                )}

                {/* Info stok barang database */}
                {barangInfo && !isManual && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm mt-2">
                    <span className="font-medium">Stok:</span>{' '}
                    {formatNumberWithSeparator(barangInfo.panjangMentah)} mm
                    {barangInfo.minWelding > 0 && (
                      <span className="ml-3">
                        <span className="font-medium">Min Welding:</span>{' '}
                        {formatNumberWithSeparator(barangInfo.minWelding)} mm
                      </span>
                    )}
                  </div>
                )}

                {/* ── Toggle Lihat & Edit Detail Barang (hanya untuk barang database) ── */}
                {item.barangId && !isManual && (
                  <div className="mt-2">
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
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                          Diubah
                        </span>
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

                          {/* Dimensi */}
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
                                  {/* removed custom rendering */}
                          </div>

                          {/* Material */}
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">Material</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div><Label className="text-xs">Jenis Bahan</Label><Input {...field('jenisBahan')} placeholder="Baja ST37" /></div>
                              <div><Label className="text-xs">Berat Jenis (kg/m³)</Label><Input type="number" {...field('beratJenis')} placeholder="7850" /></div>
                              <div><Label className="text-xs">Berat/Batang (kg)</Label><Input type="number" {...field('beratbatang')} /></div>
                              <div><Label className="text-xs">Min. Welding (mm)</Label><Input type="number" {...field('minWelding')} /></div>
                            </div>
                          </div>

                          {/* Harga */}
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">Harga</Label>
                            <div className="space-y-1 mb-2">
                              <Label className="text-xs">Satuan Harga Modal</Label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`satuanHargaModal-${item.barangId}`}
                                    value="batang"
                                    checked={eb.satuanHargaModal !== 'kg'}
                                    onChange={(e) => handleBarangFieldChange(item.barangId, 'satuanHargaModal', e.target.value)}
                                    className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
                                  />
                                  <span className="text-xs font-medium text-gray-700">Per Batang</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`satuanHargaModal-${item.barangId}`}
                                    value="kg"
                                    checked={eb.satuanHargaModal === 'kg'}
                                    onChange={(e) => handleBarangFieldChange(item.barangId, 'satuanHargaModal', e.target.value)}
                                    className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
                                  />
                                  <span className="text-xs font-medium text-gray-700">Per Kg</span>
                                </label>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><Label className="text-xs">Harga Modal (Rp)</Label><Input type="number" {...field('hargamodal')} /></div>
                              <div><Label className="text-xs">Harga Jasa (Rp)</Label><Input type="number" {...field('hargajasa')} /></div>
                            </div>
                          </div>

                          {/* Tombol aksi */}
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

                {/* Sub-item (panjang jadi + jumlah) untuk barang dari database */}
                {!isManual && itemsWithSame.map((cur, sub) => {
                  const actualIdx = index + sub;
                  const curInfo   = getSelectedBarangInfo(cur.barangId);
                  return (
                    <div
                      key={actualIdx}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-3 bg-white rounded-lg border"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Kode</Label>
                        <Input
                          value={cur.kodeItem || ''}
                          onChange={(e) => handleItemChange(actualIdx, 'kodeItem', e.target.value)}
                          placeholder="A-01"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Panjang Jadi (mm) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={cur.panjangJadi}
                          onChange={(e) => handleItemChange(actualIdx, 'panjangJadi', e.target.value)}
                          placeholder="600"
                        />
                        {curInfo && parseFloat(cur.panjangJadi) > parseFloat(curInfo.panjangMentah) && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Perlu welding
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Jumlah <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={cur.jumlahKeperluan}
                            onChange={(e) => handleItemChange(actualIdx, 'jumlahKeperluan', e.target.value)}
                            placeholder="15"
                            className="flex-1"
                          />
                          {selectedItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemRow(actualIdx)}
                              className="px-3 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Kode item + jumlah untuk barang manual */}
                {isManual && (item.jenisBentukManual || 'custom') !== 'custom' && itemsWithSame.map((cur, sub) => {
                  const actualIdx = index + sub;
                  return (
                    <div key={actualIdx} className="grid grid-cols-3 gap-3 items-end p-3 bg-white rounded-lg border">
                      <div className="space-y-1">
                        <Label className="text-xs">Kode Item</Label>
                        <Input
                          placeholder="C-01"
                          value={cur.kodeItem || ''}
                          onChange={(e) => handleItemChange(actualIdx, 'kodeItem', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Panjang Jadi (mm)</Label>
                        <Input
                          type="number"
                          placeholder="600"
                          value={cur.panjangJadi || ''}
                          onChange={(e) => handleItemChange(actualIdx, 'panjangJadi', e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Jumlah <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            placeholder="5"
                            value={cur.jumlahKeperluan || ''}
                            onChange={(e) => handleItemChange(actualIdx, 'jumlahKeperluan', e.target.value)}
                          />
                        </div>
                        {itemsWithSame.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeItemRow(actualIdx)}
                            className="text-red-500 hover:bg-red-50 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Tombol aksi sticky */}
      <div className="sticky bottom-4 flex gap-3 justify-end bg-white/80 backdrop-blur-sm p-4 rounded-xl border shadow-md">
        <Button variant="outline" onClick={() => navigate('/estimasi')} disabled={saving}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Batal
        </Button>
        <Button
          onClick={handleUpdate}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 min-w-32"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Update Estimasi</>
          )}
        </Button>
      </div>

    </div>
  );
};

export default EditEstimasi