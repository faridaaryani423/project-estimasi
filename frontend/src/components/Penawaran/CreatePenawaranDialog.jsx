// src/components/Penawaran/CreatePenawaranDialog.jsx

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Check } from 'lucide-react';
import { calculateCorrectTotal } from '@/utils/penawaranCalculations';

export const CreatePenawaranDialog = ({ hook }) => {
  const {
    showCreateDialog,
    setShowCreateDialog,
    editMode,
    saving,
    clientForm,
    handleClientFormChange,
    selectedEstimasiIds,
    toggleEstimasiSelection,
    handleOpenPreview,
    resetCreateForm,
    estimasiList,
  } = hook;

  return (
    <Dialog
      open={showCreateDialog}
      onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetCreateForm();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Penawaran' : 'Buat Penawaran Baru'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informasi Client */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Informasi Client</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Nama Project <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="namaProject"
                  data-testid="nama-project-input"
                  value={clientForm.namaProject}
                  onChange={handleClientFormChange}
                  placeholder="Kanopi Rumah"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Lokasi <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="lokasiProject"
                  data-testid="lokasi-project-input"
                  value={clientForm.lokasiProject}
                  onChange={handleClientFormChange}
                  placeholder="Jakarta"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Nama Client <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="clientNama"
                  data-testid="client-nama-input"
                  value={clientForm.clientNama}
                  onChange={handleClientFormChange}
                  placeholder="Budi"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  No. Kontak <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="clientKontak"
                  data-testid="client-kontak-input"
                  value={clientForm.clientKontak}
                  onChange={handleClientFormChange}
                  placeholder="08123456"
                />
              </div>
            </div>
          </div>

          {/* Pilih Estimasi */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">
              Pilih Estimasi{' '}
              <span className="text-sm font-normal text-gray-500">
                ({selectedEstimasiIds.length} dipilih)
              </span>
            </h3>
            {estimasiList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Tidak ada estimasi.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {estimasiList.map((est) => {
                  const isSelected = selectedEstimasiIds.includes(est.id);
                  return (
                    <div
                      key={est.id}
                      className={`p-3 border rounded-lg cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-gray-200 hover:border-sky-300'
                      }`}
                      onClick={() => toggleEstimasiSelection(est.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                            isSelected ? 'bg-sky-500 border-sky-500' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-sky-600 text-white text-xs font-bold rounded">
                              {est.nomorEstimasi}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(est.createdAt).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <h4 className="font-medium mt-1">{est.namaEstimasi}</h4>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {est.items?.length || 0} item
                            </span>
                            <span className="text-sm font-bold text-gray-600">
                              Estimasi: Rp {calculateCorrectTotal(est).toLocaleString('id-ID')}
                            </span>
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

        <DialogFooter className="gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateDialog(false);
              resetCreateForm();
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleOpenPreview('singkat')}
            disabled={selectedEstimasiIds.length === 0 || saving}
            data-testid="create-penawaran-singkat"
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editMode ? 'Update Penawaran Singkat' : 'Buat Penawaran Singkat'}
          </Button>
          <Button
            onClick={() => handleOpenPreview('detail')}
            disabled={selectedEstimasiIds.length === 0 || saving}
            data-testid="create-penawaran-detail"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editMode ? 'Update Penawaran Detail' : 'Buat Penawaran Detail'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};