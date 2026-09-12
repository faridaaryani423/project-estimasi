import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Layers, Pencil, Trash2, Plus, Loader2, Search } from 'lucide-react';
import { materialAPI } from '@/services/api';

const JenisMaterial = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    namaMaterial: '',
    masaJenis: ''
  });

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialAPI.getAll();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Gagal memuat data jenis material: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      namaMaterial: '',
      masaJenis: ''
    });
    setEditMode(false);
    setEditId(null);
  };

  const handleEdit = (item) => {
    setFormData({
      namaMaterial: item.namaMaterial,
      masaJenis: item.masaJenis !== undefined && item.masaJenis !== null ? String(item.masaJenis) : ''
    });
    setEditMode(true);
    setEditId(item.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = formData.namaMaterial.trim();
    if (!trimmedName) {
      toast.error('Nama jenis material wajib diisi dan tidak boleh kosong');
      return;
    }

    const masaJenisNum = parseFloat(formData.masaJenis);
    if (isNaN(masaJenisNum) || masaJenisNum <= 0) {
      toast.error('Masa jenis wajib diisi berupa angka dan harus lebih besar dari 0');
      return;
    }

    // Client-side duplicate check
    const isDuplicate = materials.some(m => {
      const matchName = m.namaMaterial && m.namaMaterial.trim().toLowerCase() === trimmedName.toLowerCase();
      if (editMode) {
        return matchName && m.id !== editId;
      }
      return matchName;
    });

    if (isDuplicate) {
      toast.error(`Jenis material "${trimmedName}" sudah ada. Gunakan nama lain.`);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        namaMaterial: trimmedName,
        masaJenis: masaJenisNum
      };

      if (editMode) {
        await materialAPI.update(editId, payload);
        toast.success('Jenis material berhasil diperbarui!');
      } else {
        await materialAPI.create(payload);
        toast.success('Jenis material berhasil ditambahkan!');
      }

      await loadMaterials();
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan jenis material');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item) => {
    setMaterialToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;
    try {
      setDeleting(true);
      await materialAPI.delete(materialToDelete.id);
      toast.success(`Jenis material "${materialToDelete.namaMaterial}" berhasil dihapus`);
      await loadMaterials();
      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
    } catch (error) {
      toast.error('Gagal menghapus material: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredMaterials = materials.filter(item =>
    item.namaMaterial && item.namaMaterial.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in" data-testid="jenis-material-container">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Database Jenis Material</h1>
          <p className="text-base text-gray-600">Master data jenis material dan masa jenis (kg/m³)</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 btn-primary"
              data-testid="add-material-button"
              onClick={() => resetForm()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Jenis Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" data-testid="material-form-dialog">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editMode ? 'Edit Jenis Material' : 'Tambah Jenis Material Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="namaMaterial">
                  Nama Jenis Material <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="namaMaterial"
                  name="namaMaterial"
                  data-testid="nama-material-input"
                  value={formData.namaMaterial}
                  onChange={handleInputChange}
                  placeholder="Contoh: Baja, Besi, Stainless Steel"
                  required
                  className="input-focus"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="masaJenis">
                  Masa Jenis (kg/m³) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="masaJenis"
                  name="masaJenis"
                  type="number"
                  step="any"
                  min="0.001"
                  data-testid="masa-jenis-input"
                  value={formData.masaJenis}
                  onChange={handleInputChange}
                  placeholder="Contoh: 7850"
                  required
                  className="input-focus"
                />
                <p className="text-xs text-gray-500">Nilai harus berupa angka lebih besar dari 0.</p>
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}
                  data-testid="cancel-material-button"
                  disabled={saving}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-material-button"
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

      {/* Material List Card */}
      <Card className="card-hover">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              Daftar Jenis Material
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari jenis material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 input-focus"
                data-testid="search-material-input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="material-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">No</TableHead>
                  <TableHead>Nama Jenis Material</TableHead>
                  <TableHead>Masa Jenis (kg/m³)</TableHead>
                  <TableHead>Terakhir Diperbarui</TableHead>
                  <TableHead className="text-center w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
                        <span>Memuat data material...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      {searchQuery
                        ? `Tidak ada material yang sesuai dengan pencarian "${searchQuery}"`
                        : 'Belum ada data jenis material. Klik tombol "Tambah Jenis Material" untuk mulai.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((item, index) => (
                    <TableRow key={item.id} className="table-row" data-testid={`material-row-${index}`}>
                      <TableCell className="text-center font-medium text-gray-600">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {item.namaMaterial}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 bg-sky-50 text-sky-700 rounded-md font-semibold text-sm">
                          {Number(item.masaJenis).toLocaleString('id-ID')} kg/m³
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        <div className="space-y-0.5">
                          <div>
                            {item.updatedAt || item.createdAt
                              ? new Date(item.updatedAt || item.createdAt).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '-'}
                          </div>
                          {item.lastUpdatedBy && (
                            <div className="text-[11px] text-gray-400">oleh {item.lastUpdatedBy}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            data-testid={`edit-material-${index}`}
                            className="hover:bg-blue-50 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(item)}
                            data-testid={`delete-material-${index}`}
                            className="hover:bg-red-50 hover:text-red-600"
                            title="Hapus"
                          >
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

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jenis Material?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus jenis material{' '}
              <strong className="text-gray-900">{materialToDelete?.namaMaterial}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JenisMaterial;
