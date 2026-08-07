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
import { calculateLuasPermukaan, calculateMaterialGroupAllocation, calculateBerat, calculateWithWasteReuse } from '@/utils/calculationEngine';
import { formatNumberWithSeparator } from '@/lib/utils';
import ManualItemForm from '@/components/ManualItemForm';

// ── Template untuk item kosong ─────────────────────────────────────────────────
const emptyItem = () => ({
  barangId: '',
  kodeItem: '',
  panjangJadi: '',
  jumlahKeperluan: '',
  volume: '',
  // ── field barang manual ──
  namaManual: '',
  hargaManual: '',
  hargamodalManual: '',
  satuanHargaModalManual: 'batang',
  hargajasaManual: '',
  jenisBentukManual: 'custom',
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
  satuanBarangManual: 'Bh',
  satuanManual: 'Bh',
});

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
      if (subKey === key) {
        grouped.push(subItem);
      }
    });

    if (key && key !== 'manual_' && key !== 'db_') {
      visited.add(key);
    }
  });

  items.forEach((item) => {
    const key = item.barangId === '__manual__'
      ? `manual_${(item.namaManual || '').trim().toLowerCase()}`
      : `db_${item.barangId}`;
    if (!key || key === 'manual_' || key === 'db_') {
      grouped.push(item);
    }
  });

  return grouped;
};

const EstimasiForm = () => {
  const navigate = useNavigate();
  const importFileRef = useRef(null);

  const [barangList, setBarangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    namaEstimasi: '',
    metodeDimensiKerja: 'langsung', // 'langsung' | 'pxl'
    nilaiDimensiKerja: '',
    satuanDimensiKerja: 'm²',
    panjangRuangan: '',
    lebarRuangan: '',
    luasRuanganInput: '',
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
    const targetItem = updated[index];

    if (
      targetItem &&
      targetItem.barangId === '__manual__' &&
      field !== 'kodeItem' &&
      field !== 'jumlahKeperluan' &&
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
    setSelectedItems([...selectedItems, emptyItem()]);
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
        satuanBarangManual: currentItem.satuanBarangManual,
        jumlahManual: currentItem.jumlahManual,
        beratManual: currentItem.beratManual,
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
      ['Nama Estimasi', '← wajib diisi'],
      ['Nama Client', '← opsional'],     // ← NEW
      ['Lokasi Proyek', '← opsional'],     // ← NEW
      ['Kontak Person', '← opsional'],     // ← NEW
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
        const namaClient = cleanExcelVal(rows[4]?.[1]);    // ← NEW
        const lokasi = cleanExcelVal(rows[5]?.[1]);       // ← NEW
        const kontakPerson = cleanExcelVal(rows[6]?.[1]); // ← NEW
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

  const calculateEstimasi = async () => {
    if (!formData.namaEstimasi) {
      toast.error('Mohon isi nama estimasi!');
      return;
    }

    const effectiveBarangList = barangList.map((b) => getEffectiveBarang(b.id) || b);
    const validItems = [];
    let hasInvalid = false;
    let errorMessage = '';
    const seenCustomManuals = new Set();

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      if (!item.barangId) continue; // Skip completely empty rows that user hasn't touched
      
      const isManual = item.barangId === '__manual__';
      const jb = isManual ? (item.jenisBentukManual || 'custom') : '';
      const isCustomManual = isManual && jb === 'custom';
      const barang = !isManual ? getEffectiveBarang(item.barangId) : null;
      const isCustomDB = !isManual && barang?.jenisBentuk === 'custom';

      // Dedup: items custom manual
      if (isCustomManual) {
        if (seenCustomManuals.has(item.namaManual)) continue;
        seenCustomManuals.add(item.namaManual);
      }

      if (isCustomManual) {
        const check = (val) => val !== undefined && val !== null && String(val).trim() !== '';
        if (!check(item.namaManual)) {
          hasInvalid = true;
          errorMessage = `Baris ${i + 1} (Custom): Nama barang wajib diisi.`;
          break;
        }
        const qty = parseInt(item.jumlahKeperluan);
        if (!qty || qty <= 0) {
          hasInvalid = true;
          errorMessage = `Baris ${i + 1} (Custom): Jumlah wajib diisi lebih dari 0.`;
          break;
        }
        if (!check(item.hargamodalManual)) {
          hasInvalid = true;
          errorMessage = `Baris ${i + 1} (Custom): Harga satuan wajib diisi.`;
          break;
        }
        validItems.push(item);
        continue;
      }

      if (isCustomDB) {
        const qty = parseInt(item.jumlahKeperluan);
        if (!qty || qty <= 0) {
          hasInvalid = true;
          errorMessage = `Baris ${i + 1} ("${barang?.nama}"): Jumlah wajib diisi lebih dari 0.`;
          break;
        }
        validItems.push(item);
        continue;
      }

      // ── Non-Custom Items (Manual or DB) ──
      const jumlahValid = item.jumlahKeperluan && parseInt(item.jumlahKeperluan) > 0;
      if (!jumlahValid) {
        hasInvalid = true;
        errorMessage = `Baris ${i + 1}: Jumlah keperluan harus lebih dari 0.`;
        break;
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

        if (!check(item.jenisBahanManual) || !check(item.beratJenisManual) || !check(item.minWeldingManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Jenis Bahan, Berat Jenis, Min Welding wajib diisi.`; break; }
        if (!check(item.beratbatangManual)) { hasInvalid = true; errorMessage = `Baris ${i + 1} (Manual): Berat per Batang wajib diisi.`; break; }

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
      toast.error('Mohon lengkapi minimal 1 item.');
      return;
    }

    const metodeDimensi = formData.metodeDimensiKerja || 'langsung';
    const luasPekerjaan = (() => {
      if (metodeDimensi === 'pxl') {
        return (parseFloat(formData.panjangRuangan) || 0) * (parseFloat(formData.lebarRuangan) || 0);
      }
      return parseFloat(formData.nilaiDimensiKerja) || parseFloat(formData.luasRuanganInput) || 0;
    })();
    const satuanDimensi = formData.satuanDimensiKerja || 'm²';

    const hasItemWithJasa = validItems.some((item) => {
      if (item.barangId === '__manual__') return false;
      const barang = effectiveBarangList.find((b) => String(b.id) === String(item.barangId));
      return (parseFloat(barang?.hargajasa || 0) || 0) > 0;
    });

    if (hasItemWithJasa && luasPekerjaan <= 0) {
      toast.error('Ada item dengan harga jasa. Isi dimensi kerja agar luas/jumlah pekerjaan dapat dihitung.');
      return;
    }

    try {
      setSaving(true);
      const { itemDetails, totalEstimasi, totalBeratReal, totalLuasPermukaan, totalTitikWelding } =
        calculateWithWasteReuse(validItems, luasPekerjaan, effectiveBarangList);

      const estimasiData = {
        namaEstimasi: formData.namaEstimasi,
        namaClient: formData.namaClient,
        lokasi: formData.lokasi,
        kontakPerson: formData.kontakPerson,
        metodeDimensiKerja: formData.metodeDimensiKerja || 'langsung',
        panjangRuangan: formData.panjangRuangan ? parseFloat(formData.panjangRuangan) : null,
        lebarRuangan: formData.lebarRuangan ? parseFloat(formData.lebarRuangan) : null,
        luasRuanganInput: formData.luasRuanganInput ? parseFloat(formData.luasRuanganInput) : (formData.nilaiDimensiKerja ? parseFloat(formData.nilaiDimensiKerja) : null),
        nilaiDimensiKerja: luasPekerjaan > 0 ? luasPekerjaan : null,
        satuanDimensiKerja: satuanDimensi,
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
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="font-semibold text-gray-800 text-sm">Dimensi Pekerjaan</Label>
                  <p className="text-xs text-gray-500">Tentukan nilai dan satuan dimensi pekerjaan</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-700">
                    <input
                      type="radio"
                      name="metodeDimensiKerja"
                      value="langsung"
                      checked={formData.metodeDimensiKerja !== 'pxl'}
                      onChange={handleInputChange}
                      className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="font-medium">Input Langsung</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-700">
                    <input
                      type="radio"
                      name="metodeDimensiKerja"
                      value="pxl"
                      checked={formData.metodeDimensiKerja === 'pxl'}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (!formData.satuanDimensiKerja) {
                          setFormData((prev) => ({ ...prev, satuanDimensiKerja: 'm²' }));
                        }
                      }}
                      className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="font-medium">Hitung dari P × L (m)</span>
                  </label>
                </div>
              </div>

              {formData.metodeDimensiKerja === 'pxl' ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-gray-600">Panjang (m)</Label>
                      <Input
                        name="panjangRuangan"
                        type="number"
                        value={formData.panjangRuangan}
                        onChange={(e) => {
                          const p = e.target.value;
                          const l = formData.lebarRuangan;
                          const calc = (parseFloat(p) || 0) * (parseFloat(l) || 0);
                          setFormData((prev) => ({
                            ...prev,
                            panjangRuangan: p,
                            nilaiDimensiKerja: calc > 0 ? String(Number(calc.toFixed(2))) : '',
                            satuanDimensiKerja: 'm²',
                          }));
                        }}
                        placeholder="Contoh: 10"
                      />
                    </div>
                    <span className="text-gray-400 font-bold self-end mb-2.5">×</span>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-gray-600">Lebar (m)</Label>
                      <Input
                        name="lebarRuangan"
                        type="number"
                        value={formData.lebarRuangan}
                        onChange={(e) => {
                          const l = e.target.value;
                          const p = formData.panjangRuangan;
                          const calc = (parseFloat(p) || 0) * (parseFloat(l) || 0);
                          setFormData((prev) => ({
                            ...prev,
                            lebarRuangan: l,
                            nilaiDimensiKerja: calc > 0 ? String(Number(calc.toFixed(2))) : '',
                            satuanDimensiKerja: 'm²',
                          }));
                        }}
                        placeholder="Contoh: 12"
                      />
                    </div>
                  </div>
                  {formData.nilaiDimensiKerja && (
                    <p className="text-xs text-sky-700 font-medium">
                      Hasil Dimensi: <span className="font-bold">{formData.nilaiDimensiKerja} m²</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-gray-600">Nilai Dimensi</Label>
                    <Input
                      name="nilaiDimensiKerja"
                      type="number"
                      value={formData.nilaiDimensiKerja}
                      onChange={handleInputChange}
                      placeholder="Contoh: 120 atau 8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Satuan Dimensi</Label>
                    <select
                      name="satuanDimensiKerja"
                      value={formData.satuanDimensiKerja || 'm²'}
                      onChange={handleInputChange}
                      className="w-full text-sm h-10 rounded-md border border-input bg-white px-3 py-2 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {['m²', 'm', 'cm', 'mm', 'Unit', 'Set', 'Bh', 'Pcs', 'Box', 'Kg', 'Titik', 'Ls', 'Lot'].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
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
                      {!(
                        (isManual && (item.jenisBentukManual || 'custom') === 'custom') ||
                        (!isManual && getEffectiveBarang(item.barangId)?.jenisBentuk === 'custom')
                      ) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItemRowWithSameBarang(lastIdx)}
                          className="px-3"
                          disabled={!item.barangId}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
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

                  {/* Info stok / custom barang database */}
                  {barangInfo && !isManual && (
                    getEffectiveBarang(item.barangId)?.jenisBentuk === 'custom' ? (
                      <div className="p-3 bg-amber-50 rounded-lg text-sm mt-2 flex items-center justify-between border border-amber-200">
                        <span className="font-medium text-amber-900">Barang Custom / Satuan: <span className="font-bold text-amber-800">{getEffectiveBarang(item.barangId)?.satuan || 'Bh'}</span></span>
                        <span className="text-emerald-700 font-semibold">Rp {parseFloat(getEffectiveBarang(item.barangId)?.hargamodal || 0).toLocaleString('id-ID')} / {getEffectiveBarang(item.barangId)?.satuan || 'Bh'}</span>
                      </div>
                    ) : (
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
                    )
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

                        if (eb.jenisBentuk === 'custom') {
                          return (
                            <div className="mt-3 p-4 bg-white border border-sky-200 rounded-lg space-y-4">
                              <h4 className="text-sm font-semibold text-sky-700">Detail & Edit Barang Custom</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Satuan</Label>
                                  <Input {...field('satuan')} placeholder="pcs / bh / set / box" />
                                </div>
                                <div>
                                  <Label className="text-xs">Harga Satuan / Modal (Rp)</Label>
                                  <Input type="number" {...field('hargamodal')} />
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
                        }

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
                    const curBarang = getEffectiveBarang(cur.barangId);
                    const isCustomDB = curBarang?.jenisBentuk === 'custom';
                    const satuan = curBarang?.satuan || 'Bh';

                    if (isCustomDB) {
                      return (
                        <div key={actualIdx} className="grid grid-cols-2 gap-3 items-end p-3 bg-white rounded-lg border">
                          <div className="space-y-1">
                            <Label className="text-xs">Kode Item</Label>
                            <Input
                              placeholder="B-01"
                              value={cur.kodeItem || ''}
                              onChange={(e) => handleItemChange(actualIdx, 'kodeItem', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Jumlah ({satuan}) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              placeholder="252"
                              value={cur.jumlahKeperluan || ''}
                              onChange={(e) => handleItemChange(actualIdx, 'jumlahKeperluan', e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    }

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