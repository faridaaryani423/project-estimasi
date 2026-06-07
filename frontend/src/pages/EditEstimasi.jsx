import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Calculator, Plus, Trash2, Send, Zap,
  Loader2, ChevronLeft, ChevronRight, Settings
} from 'lucide-react';
import { barangAPI, estimasiAPI } from '@/services/api';
import { calculateLuasPermukaan, calculateMaterialGroupAllocation, calculateWithWasteReuse } from '@/utils/calculationEngine';
import { formatNumberWithSeparator } from '@/lib/utils';
import BarangCombobox from '@/components/BarangCombobox';
import ManualItemForm from '@/components/ManualItemForm';

const emptyItem = () => ({
  barangId: '',
  kodeItem: '',
  panjangJadi: '',
  jumlahKeperluan: '',
  volume: '',
  namaManual: '',
  hargaManual: '',
  hargamodalManual: '',
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
            panjangJadi: isItemManual ? '' : item.panjangJadi?.toString() || '',
            jumlahKeperluan: item.jumlahKeperluan?.toString() || '',
            volume: item.volume?.toString() || '',
            // Manual fields
            namaManual: isItemManual ? (item.namaBarang || '') : '',
            hargaManual: isItemManual ? ((item.hargaJual || item.hargaSatuan) ?? '').toString() : '',
            hargamodalManual: isItemManual ? (item.hargaSatuan ?? '').toString() : '',
            hargajasaManual: isItemManual ? (item.hargaJasa ?? '').toString() : '',
            jenisBentukManual: isItemManual ? (item.jenisBentuk || 'custom') : 'balok',
            supplierManual: isItemManual ? (item.supplier || '') : '',
            jenisBahanManual: isItemManual
              ? (item.jenisBahan !== 'Manual' ? item.jenisBahan || '' : '')
              : '',
            beratJenisManual: isItemManual ? (item.beratJenis?.toString() || '') : '',
            beratbatangManual: isItemManual ? (item.beratbatang?.toString() || '') : '',
            minWeldingManual: isItemManual ? (item.minWelding?.toString() || '') : '',
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
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const addItemRow = () => {
    setSelectedItems([
      ...selectedItems,
      { barangId: '', kodeItem: '', panjangJadi: '', jumlahKeperluan: '', volume: '', namaManual: '', hargaManual: '' },
    ]);
  };

  const addItemRowWithSameBarang = (index) => {
    const newItem = {
      barangId:        selectedItems[index].barangId,
      kodeItem: '', panjangJadi: '', jumlahKeperluan: '',
      volume: '', namaManual: '', hargaManual: '',
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
      jenisBahan: item.jenisBahanManual || '-',
      beratJenis: item.beratJenisManual || '0',
      hargamodal: item.hargamodalManual || item.hargaManual || '0',
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

    const validItems = selectedItems.filter((item) => {
      const jumlahValid = item.jumlahKeperluan && parseInt(item.jumlahKeperluan) > 0;
      if (!item.barangId || !jumlahValid) return false;
      if (item.barangId === '__manual__') {
        return (item.namaManual || '').trim().length > 0 && parseFloat(item.hargaManual || 0) > 0;
      }
      return item.panjangJadi && parseFloat(item.panjangJadi) > 0;
    });

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
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" /> Detail Estimasi
          </CardTitle>
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
            const isGroupable    = item.barangId && item.barangId !== '__manual__';
            const isSameAsPrev   = isGroupable && index > 0 && item.barangId === selectedItems[index - 1].barangId;
            if (isSameAsPrev) return null;

            const itemsWithSame = [item];
            if (isGroupable) {
              for (let i = index + 1; i < selectedItems.length; i++) {
                if (selectedItems[i].barangId === item.barangId) itemsWithSame.push(selectedItems[i]);
                else break;
              }
            }
            const lastIdx  = index + itemsWithSame.length - 1;
            const isManual = item.barangId === '__manual__';

            return (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Item #{index + 1}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItemRowWithSameBarang(lastIdx)}
                    disabled={!item.barangId}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
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
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
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

                {/* Sub-item (kode / panjang jadi / jumlah) */}
                {itemsWithSame.map((cur, sub) => {
                  const actualIdx = index + sub;
                  const curInfo   = getSelectedBarangInfo(cur.barangId);
                  const curManual = cur.barangId === '__manual__';
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
                      {!curManual && (
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
                      )}
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

                {/* ── Toggle Lihat & Edit Detail Barang (hanya untuk barang database) ── */}
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
                            {eb.jenisBentuk === 'custom' && (
                              <div><Label className="text-xs">Panjang</Label><Input type="number" {...field('panjang')} /></div>
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