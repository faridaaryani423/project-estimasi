import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Package, Pencil, Trash2, Plus, Upload, Loader2, Search } from 'lucide-react';
import { barangAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const InputBarang = () => {
  const { currentUser } = useAuth();
  const [barangList, setBarangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isHargaJasaEnabled, setIsHargaJasaEnabled] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    jenisBentuk: 'balok', // balok, tabung, wf, plat, custom
    panjang: '',
    lebar: '',
    tinggi: '',
    diameter: '',
    ketebalan: '',
    // WF specific
    tinggiWF: '',
    lebarFlange: '',
    ketebalanWeb: '',
    ketebalanFlange: '',
    // Plat specific
    panjangPlat: '',
    lebarPlat: '',
    ketebalanPlat: '',
    // Material info
    jenisBahan: '',
    beratJenis: '', // kg/m3
    beratbatang: '', // kg per batang
    minWelding: '', // minimum panjang untuk welding (mm)
    hargamodal: '',
    satuanHargaModal: 'batang',
    hargajasa: '',
    supplier: '',   // ← BARU
    foto: null
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [originalData, setOriginalData] = useState(null); // menyimpan data asli saat edit

  useEffect(() => {
    loadBarangData();
  }, []);

  const loadBarangData = async () => {
    try {
      setLoading(true);
      const data = await barangAPI.getAll();
      setBarangList(data);
    } catch (error) {
      toast.error('Gagal memuat data barang: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Format file harus .jpg atau .jpeg');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, foto: reader.result }));
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Field-field yang termasuk "data barang" (bukan harga)
  const BARANG_FIELDS = [
    'nama', 'jenisBentuk', 'panjang', 'lebar', 'tinggi', 'diameter', 'ketebalan',
    'tinggiWF', 'lebarFlange', 'ketebalanWeb', 'ketebalanFlange',
    'panjangPlat', 'lebarPlat', 'ketebalanPlat',
    'jenisBahan', 'beratJenis', 'beratbatang', 'minWelding', 'supplier', 'foto'
  ];

  // Field-field yang termasuk "harga"
  const HARGA_FIELDS = ['hargamodal', 'satuanHargaModal', 'hargajasa'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);

      const user = currentUser?.name || currentUser?.username || 'System';
      const now = new Date().toISOString();

      // Deteksi apakah field barang atau harga yang berubah (hanya saat edit)
      let updateBarang = !editMode; // kalau tambah baru, update keduanya
      let updateHarga  = !editMode;

      if (editMode && originalData) {
        // Cek apakah ada field barang yang berubah
        updateBarang = BARANG_FIELDS.some(
          (f) => String(formData[f] ?? '') !== String(originalData[f] ?? '')
        );
        // Cek apakah ada field harga yang berubah
        updateHarga = HARGA_FIELDS.some(
          (f) => String(formData[f] ?? '') !== String(originalData[f] ?? '')
        );
      }

      const barangData = {
        nama: formData.nama,
        jenisBentuk: formData.jenisBentuk,
        panjang: formData.panjang || null,
        lebar: formData.lebar || null,
        tinggi: formData.tinggi || null,
        diameter: formData.diameter || null,
        ketebalan: formData.ketebalan || null,
        tinggiWF: formData.tinggiWF || null,
        lebarFlange: formData.lebarFlange || null,
        ketebalanWeb: formData.ketebalanWeb || null,
        ketebalanFlange: formData.ketebalanFlange || null,
        panjangPlat: formData.panjangPlat || null,
        lebarPlat: formData.lebarPlat || null,
        ketebalanPlat: formData.ketebalanPlat || null,
        jenisBahan: formData.jenisBahan,
        beratJenis: formData.beratJenis,
        beratbatang: formData.beratbatang || null,
        minWelding: formData.minWelding || '50',
        hargamodal: formData.hargamodal,
        hargajasa: formData.hargajasa || null,
        supplier: formData.supplier || null,
        foto: formData.foto,
        createdBy: currentUser?.name || currentUser?.username || 'System',
        // Update timestamp hanya untuk bagian yang benar-benar berubah
        ...(updateBarang && {
          lastUpdatedbarang: now,
          lastUpdatedBy: user
        }),
        ...(updateHarga && {
          lastUpdatedharga: now,
          lastUpdatedByHarga: user
        })
      };

      if (editMode) {
        await barangAPI.update(editId, barangData);
        toast.success('Barang berhasil diupdate!');
      } else {
        await barangAPI.create(barangData);
        toast.success('Barang berhasil ditambahkan!');
      }

      await loadBarangData();
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      toast.error('Gagal menyimpan barang: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    const data = {
      nama: item.nama,
      jenisBentuk: item.jenisBentuk || 'balok',
      panjang: item.panjang || '',
      lebar: item.lebar || '',
      tinggi: item.tinggi || '',
      diameter: item.diameter || '',
      ketebalan: item.ketebalan || '',
      tinggiWF: item.tinggiWF || '',
      lebarFlange: item.lebarFlange || '',
      ketebalanWeb: item.ketebalanWeb || '',
      ketebalanFlange: item.ketebalanFlange || '',
      panjangPlat: item.panjangPlat || '',
      lebarPlat: item.lebarPlat || '',
      ketebalanPlat: item.ketebalanPlat || '',
      jenisBahan: item.jenisBahan || '',
      beratJenis: item.beratJenis || '',
      beratbatang: item.beratbatang || '',
      minWelding: item.minWelding || '',
      hargamodal: item.hargamodal || '',
      hargajasa: item.hargajasa || '',
      supplier: item.supplier || '',
      foto: item.foto
    };
    setFormData(data);
    setOriginalData(data); // simpan snapshot data awal untuk perbandingan
    setFotoPreview(item.foto);
    setEditMode(true);
    setEditId(item.id);
    setIsHargaJasaEnabled(!!item.hargajasa);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus barang ini?')) return;
    
    try {
      await barangAPI.delete(id);
      await loadBarangData();
      toast.success('Barang berhasil dihapus!');
    } catch (error) {
      toast.error('Gagal menghapus barang: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      jenisBentuk: 'balok',
      panjang: '',
      lebar: '',
      tinggi: '',
      diameter: '',
      ketebalan: '',
      tinggiWF: '',
      lebarFlange: '',
      ketebalanWeb: '',
      ketebalanFlange: '',
      panjangPlat: '',
      lebarPlat: '',
      ketebalanPlat: '',
      jenisBahan: '',
      beratJenis: '',
      beratbatang: '',
      minWelding: '',
      hargamodal: '',
      hargajasa: '',
      supplier: '',
      foto: null
    });
    setFotoPreview(null);
    setIsHargaJasaEnabled(false);
    setEditMode(false);
    setEditId(null);
    setOriginalData(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  // Search state and filtering logic
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBarangList = barangList.filter(item =>
    item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.jenisBentuk && item.jenisBentuk.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.jenisBahan && item.jenisBahan.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()))  // ← BARU
  );

  return (
    <div className="space-y-6 fade-in" data-testid="input-barang-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Input Barang</h1>
          <p className="text-base text-gray-600">Kelola data barang inventori Anda</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 btn-primary"
              data-testid="add-barang-button"
              onClick={() => resetForm()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Barang
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="barang-form-dialog">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editMode ? 'Edit Barang' : 'Tambah Barang Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Barang <span className="text-red-500">*</span></Label>
                <Input
                  id="nama"
                  name="nama"
                  data-testid="nama-barang-input"
                  value={formData.nama}
                  onChange={handleInputChange}
                  placeholder="Contoh: Hollow 40x40x1.8"
                  required
                  className="input-focus"
                />
              </div>

              {/* ── SUPPLIER ── */}
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  name="supplier"
                  data-testid="supplier-input"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  placeholder="Contoh: CV. Besi Jaya, PT. Sumber Baja"
                  className="input-focus"
                />
              </div>

              <div className="space-y-3">
                <Label>Jenis Bentuk Barang <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-5 gap-3">
                  {['balok', 'tabung', 'wf', 'plat', 'custom'].map((bentuk) => (
                    <label key={bentuk} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jenisBentuk"
                        value={bentuk}
                        data-testid={`radio-${bentuk}`}
                        checked={formData.jenisBentuk === bentuk}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-sm font-medium text-gray-700 capitalize">{bentuk}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.jenisBentuk !== 'custom' && (
                <div className="space-y-2">
                  <Label>Ukuran Barang (mm) <span className="text-red-500">*</span></Label>
                  
                  {formData.jenisBentuk === 'balok' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="panjang" className="text-xs text-gray-600">Panjang</Label>
                      <Input id="panjang" name="panjang" data-testid="panjang-input" type="number" value={formData.panjang} onChange={handleInputChange} placeholder="1000" required className="input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="lebar" className="text-xs text-gray-600">Lebar</Label>
                      <Input id="lebar" name="lebar" data-testid="lebar-input" type="number" value={formData.lebar} onChange={handleInputChange} placeholder="600" required className="input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="tinggi" className="text-xs text-gray-600">Tinggi</Label>
                      <Input id="tinggi" name="tinggi" data-testid="tinggi-input" type="number" value={formData.tinggi} onChange={handleInputChange} placeholder="750" required className="input-focus" />
                    </div>
                  </div>
                )}

                {formData.jenisBentuk === 'tabung' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="diameter" className="text-xs text-gray-600">Diameter</Label>
                      <Input id="diameter" name="diameter" data-testid="diameter-input" type="number" value={formData.diameter} onChange={handleInputChange} placeholder="500" required className="input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="panjang" className="text-xs text-gray-600">Panjang</Label>
                      <Input id="panjang" name="panjang" data-testid="panjang-input" type="number" value={formData.panjang} onChange={handleInputChange} placeholder="1000" required className="input-focus" />
                    </div>
                  </div>
                )}

                {/* removed custom rendering */}

                {formData.jenisBentuk === 'wf' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="tinggiWF" className="text-xs text-gray-600">Tinggi (H)</Label>
                      <Input id="tinggiWF" name="tinggiWF" data-testid="tinggiWF-input" type="number" value={formData.tinggiWF} onChange={handleInputChange} placeholder="200" required className="input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="lebarFlange" className="text-xs text-gray-600">Lebar Flange (B)</Label>
                      <Input id="lebarFlange" name="lebarFlange" data-testid="lebarFlange-input" type="number" value={formData.lebarFlange} onChange={handleInputChange} placeholder="100" required className="input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="ketebalanWeb" className="text-xs text-gray-600">Tebal Web (tw)</Label>
                      <Input id="ketebalanWeb" name="ketebalanWeb" data-testid="ketebalanWeb-input" type="number" value={formData.ketebalanWeb} onChange={handleInputChange} placeholder="5.5" required className="input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="ketebalanFlange" className="text-xs text-gray-600">Tebal Flange (tf)</Label>
                      <Input id="ketebalanFlange" name="ketebalanFlange" data-testid="ketebalanFlange-input" type="number" value={formData.ketebalanFlange} onChange={handleInputChange} placeholder="8" required className="input-focus" />
                    </div>
                  </div>
                )}

                {formData.jenisBentuk === 'plat' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="panjangPlat" className="text-xs text-gray-600">Panjang</Label>
                      <Input id="panjangPlat" name="panjangPlat" data-testid="panjangPlat-input" type="number" value={formData.panjangPlat} onChange={handleInputChange} placeholder="6000" required className="input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="lebarPlat" className="text-xs text-gray-600">Lebar</Label>
                      <Input id="lebarPlat" name="lebarPlat" data-testid="lebarPlat-input" type="number" value={formData.lebarPlat} onChange={handleInputChange} placeholder="1500" required className="input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="ketebalanPlat" className="text-xs text-gray-600">Ketebalan</Label>
                      <Input id="ketebalanPlat" name="ketebalanPlat" data-testid="ketebalanPlat-input" type="number" value={formData.ketebalanPlat} onChange={handleInputChange} placeholder="6" required className="input-focus" />
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Ketebalan field only for balok & tabung */}
              {!['wf', 'plat', 'custom'].includes(formData.jenisBentuk) && (
                <div className="space-y-2">
                  <Label htmlFor="ketebalan">Ketebalan Barang (mm) <span className="text-red-500">*</span></Label>
                  <Input id="ketebalan" name="ketebalan" data-testid="ketebalan-input" type="number" value={formData.ketebalan} onChange={handleInputChange} placeholder="5" required className="input-focus" />
                </div>
              )}

              {/* Material Info */}
              {formData.jenisBentuk !== 'custom' && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-gray-900">Informasi Material</h3>
                  <div className="grid grid-cols-2 gap-4">
                  {formData.jenisBentuk !== 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="jenisBahan">Jenis Bahan <span className="text-red-500">*</span></Label>
                      <Input id="jenisBahan" name="jenisBahan" data-testid="jenisBahan-input" value={formData.jenisBahan} onChange={handleInputChange} placeholder="Contoh: Baja ST37, Kayu Jati" required className="input-focus" />
                    </div>
                  )}
                  {formData.jenisBentuk !== 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="beratJenis">Berat Jenis (kg/m³) <span className="text-red-500">*</span></Label>
                      <Input id="beratJenis" name="beratJenis" data-testid="beratJenis-input" type="number" value={formData.beratJenis} onChange={handleInputChange} placeholder="7850" required className="input-focus" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="beratbatang">Berat per Batang (kg) <span className="text-red-500">*</span></Label>
                    <Input id="beratbatang" name="beratbatang" data-testid="beratbatang-input" type="number" value={formData.beratbatang} onChange={handleInputChange} placeholder="50" className="input-focus" required />
                  </div>
                  {formData.jenisBentuk !== 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="minWelding">Min. Ukuran Welding (mm) <span className="text-red-500">*</span></Label>
                      <Input id="minWelding" name="minWelding" data-testid="minWelding-input" type="number" value={formData.minWelding} onChange={handleInputChange} placeholder="50" className="input-focus" required />
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Harga */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hargamodal">Harga Modal (Rp)</Label>
                    <div className="flex gap-3">
                      {formData.jenisBentuk !== 'custom' && (
                        <>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="satuanHargaModal"
                              value="batang"
                              checked={formData.satuanHargaModal !== 'kg'}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="text-xs text-gray-600">Per Batang</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="satuanHargaModal"
                              value="kg"
                              checked={formData.satuanHargaModal === 'kg'}
                              onChange={handleInputChange}
                              className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="text-xs text-gray-600">Per Kg</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                  <Input id="hargamodal" name="hargamodal" type="number" value={formData.hargamodal} onChange={handleInputChange} placeholder="500000" required className="input-focus" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hargaJasaCheckbox"
                      checked={isHargaJasaEnabled}
                      onChange={(e) => {
                        setIsHargaJasaEnabled(e.target.checked);
                        if (!e.target.checked) setFormData(prev => ({ ...prev, hargajasa: '' }));
                      }}
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <Label htmlFor="hargajasa">Harga Jasa (Rp) {isHargaJasaEnabled && <span className="text-red-500">*</span>}</Label>
                  </div>
                  <Input
                    id="hargajasa"
                    name="hargajasa"
                    type="number"
                    value={formData.hargajasa}
                    onChange={handleInputChange}
                    placeholder="500000"
                    required={isHargaJasaEnabled}
                    disabled={!isHargaJasaEnabled}
                    className="input-focus disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foto">Foto Barang (.jpg/.jpeg)</Label>
                <div className="flex items-center gap-4">
                  <Input id="foto" name="foto" data-testid="foto-input" type="file" accept=".jpg,.jpeg" onChange={handleFileChange} className="input-focus" />
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                {fotoPreview && (
                  <div className="mt-3">
                    <img src={fotoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200" />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="cancel-button" disabled={saving}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-barang-button"
                  disabled={saving}
                  className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 btn-primary"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editMode ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Daftar Barang
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 input-focus"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="barang-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Jenis Bentuk</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Jenis Bahan</TableHead>
                  <TableHead>Supplier</TableHead>        {/* ← BARU */}
                  <TableHead>Berat/Batang</TableHead>
                  <TableHead>Harga Modal</TableHead>
                  <TableHead>Harga Jasa</TableHead>
                  <TableHead>Last Update Barang</TableHead>
                  <TableHead>Last Update Harga</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarangList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                      Belum ada data barang. Klik tombol "Tambah Barang" untuk mulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBarangList.map((item, index) => (
                    <TableRow key={item.id} className="table-row" data-testid={`barang-row-${index}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                          {item.jenisBentuk || 'balok'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{item.ukuran}</TableCell>
                      <TableCell className="text-sm text-gray-600">{item.jenisBahan || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-600">{item.supplier || '-'}</TableCell>  {/* ← BARU */}
                      <TableCell className="font-semibold text-blue-600">{item.beratbatang ? `${parseFloat(item.beratbatang).toLocaleString('id-ID')} kg` : '-'}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">Rp {parseFloat(item.hargamodal).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">{item.hargajasa ? `Rp ${parseFloat(item.hargajasa).toLocaleString('id-ID')}` : '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        <div className="space-y-1">
                          <div>
                            {item.lastUpdatedbarang ? new Date(item.lastUpdatedbarang).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {item.lastUpdatedBy ? `oleh ${item.lastUpdatedBy}` : 'oleh -'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        <div className="space-y-1">
                          <div>
                            {item.lastUpdatedharga ? new Date(item.lastUpdatedharga).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {item.lastUpdatedByHarga ? `oleh ${item.lastUpdatedByHarga}` : 'oleh -'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} data-testid={`edit-button-${index}`} className="hover:bg-blue-50 hover:text-blue-600">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} data-testid={`delete-button-${index}`} className="hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InputBarang;