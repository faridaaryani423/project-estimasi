import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Calculator, Plus, Trash2, Send, Zap,
  Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { barangAPI, estimasiAPI } from '@/services/api';
import { calculateLuasPermukaan, calculateMaterialGroupAllocation, calculateWithWasteReuse } from '@/utils/calculationEngine';
import { formatNumberWithSeparator } from '@/lib/utils';
import BarangCombobox from '@/components/BarangCombobox';

const EditEstimasi = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [barangList, setBarangList]   = useState([]);
  const [estimasi, setEstimasi]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [formData, setFormData]       = useState({
    namaEstimasi: '',
    panjangRuangan: '',
    lebarRuangan: '',
  });
  const [selectedItems, setSelectedItems] = useState([
    { barangId: '', kodeItem: '', panjangJadi: '', jumlahKeperluan: '', volume: '', namaManual: '', hargaManual: '' },
  ]);

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

      // Cari estimasi berdasarkan id dari URL
      const found = semuaEstimasi.find((e) => String(e.id) === String(id));
      if (!found) {
        toast.error('Estimasi tidak ditemukan!');
        navigate('/estimasi');
        return;
      }

      setEstimasi(found);
      setFormData({
        namaEstimasi: found.namaEstimasi,
        panjangRuangan: found.panjangRuangan?.toString() || '',
        lebarRuangan: found.lebarRuangan?.toString() || '',
      });
      setSelectedItems(
        found.items?.map((item) => ({
          barangId: item.barangId?.toString() ||
            barangData.find((b) => b.nama === item.namaBarang)?.id?.toString() || '',
          kodeItem: item.kodeItem || '',
          panjangJadi: item.isManual ? '' : item.panjangJadi?.toString() || '',
          jumlahKeperluan: item.jumlahKeperluan?.toString() || '',
          volume: item.volume?.toString() || '',
          namaManual: item.isManual ? item.namaBarang : '',
          hargaManual: item.isManual ? item.hargaSatuan?.toString() : '',
        }))
      );
    } catch (error) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers form (sama persis seperti di Estimasi.jsx) ──────────
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
      barangId: selectedItems[index].barangId,
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

  const getSelectedBarangInfo = (barangId) => {
    if (!barangId) return null;
    const barang = barangList.find((b) => String(b.id) === String(barangId));
    if (!barang) return null;
    return {
      panjangMentah: barang.jenisBentuk === 'plat' ? barang.panjangPlat : barang.panjang,
      minWelding: barang.minWelding || 0,
    };
  };

  const getSelectedBarangIds = () => {
    const ids = new Set();
    selectedItems.forEach((item, index) => {
      if (item.barangId) {
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
      const b = barangList.find((b) => String(b.id) === String(item.barangId));
      return (parseFloat(b?.hargajasa || 0) || 0) > 0;
    });

    if (hasJasa && luasPekerjaan <= 0) {
      toast.error('Isi dimensi ruangan — ada item yang punya harga jasa!');
      return;
    }

    try {
      setSaving(true);

      // Pakai fungsi kalkulasi yang sama dari Estimasi.jsx
      const { itemDetails, totalEstimasi, totalBeratReal, totalLuasPermukaan, totalTitikWelding } =
        calculateWithWasteReuse(validItems, luasPekerjaan, barangList);

      const payload = {
        namaEstimasi: formData.namaEstimasi,
        panjangRuangan: formData.panjangRuangan ? parseFloat(formData.panjangRuangan) : null,
        lebarRuangan: formData.lebarRuangan ? parseFloat(formData.lebarRuangan) : null,
        luasRuangan: luasPekerjaan > 0 ? luasPekerjaan : null,
        items: itemDetails,
        totalEstimasi: Math.round(totalEstimasi),
        totalBeratReal: Math.round(totalBeratReal * 100) / 100,
        totalLuasPermukaan: Math.round(totalLuasPermukaan * 100) / 100,
        totalTitikWelding,
      };

      const updated = await estimasiAPI.update(id, payload);
      toast.success(`Estimasi ${updated.nomorEstimasi} berhasil diupdate!`);
      navigate('/estimasi');           // ← balik ke halaman list
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
        <span className="text-gray-900 font-medium">
          Edit {estimasi?.nomorEstimasi}
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Edit Estimasi</h1>
        <p className="text-gray-500 text-sm">{estimasi?.nomorEstimasi} · {estimasi?.namaEstimasi}</p>
      </div>

      {/* Card: Nama + Dimensi */}
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
            const barangInfo = getSelectedBarangInfo(item.barangId);
            const isGroupable = item.barangId && item.barangId !== '__manual__';
            const isSameAsPrev = isGroupable && index > 0 && item.barangId === selectedItems[index - 1].barangId;
            if (isSameAsPrev) return null;

            const itemsWithSame = [item];
            if (isGroupable) {
              for (let i = index + 1; i < selectedItems.length; i++) {
                if (selectedItems[i].barangId === item.barangId) itemsWithSame.push(selectedItems[i]);
                else break;
              }
            }
            const lastIdx = index + itemsWithSame.length - 1;
            const isManual = item.barangId === '__manual__';

            return (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Item #{index + 1}</Label>
                  <Button
                    type="button" variant="outline" size="sm"
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

                {isManual && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
                    <div className="space-y-1">
                      <Label className="text-xs">Nama Barang</Label>
                      <Input
                        value={item.namaManual || ''}
                        onChange={(e) => handleItemChange(index, 'namaManual', e.target.value)}
                        placeholder="Contoh: Besi UNP 100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Harga Jual (Rp)</Label>
                      <Input
                        type="number"
                        value={item.hargaManual || ''}
                        onChange={(e) => handleItemChange(index, 'hargaManual', e.target.value)}
                      />
                    </div>
                  </div>
                )}

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

                {itemsWithSame.map((cur, sub) => {
                  const actualIdx = index + sub;
                  const curInfo = getSelectedBarangInfo(cur.barangId);
                  const curManual = cur.barangId === '__manual__';
                  return (
                    <div key={actualIdx} className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-3 bg-white rounded-lg border">
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
                              type="button" variant="ghost" size="sm"
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
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Tombol aksi — sticky di bawah */}
      <div className="sticky bottom-4 flex gap-3 justify-end bg-white/80 backdrop-blur-sm p-4 rounded-xl border shadow-md">
        <Button
          variant="outline"
          onClick={() => navigate('/estimasi')}
          disabled={saving}
        >
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

export default EditEstimasi;