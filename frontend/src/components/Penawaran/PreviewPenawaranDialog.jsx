// src/components/Penawaran/PreviewPenawaranDialog.jsx

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Eye, Edit, Loader2, Check } from 'lucide-react';
import { formatRupiah, formatNumberWithSeparator } from '@/utils/penawaranFormatters';
import { getItemSubtotalModal, getItemSubtotalJualByMode } from '@/utils/penawaranCalculations';
export const PreviewPenawaranDialog = ({ hook }) => {
  const {
    showPreview,
    setShowPreview,
    setShowCreateDialog,
    previewData,
    penawaranMode,
    hargaJualMap,
    handleHargaJualChange,
    selectedEstimasiIds,
    updateEstimasiSelectionFromPreview,
    estimasiList,
    saving,
    confirmCreatePenawaran,
    editMode,
  } = hook;

  const getHargaJual = (idx) => Math.round(Number(hargaJualMap[idx] || 0) || 0);

  // ── Popover Kelola Estimasi ───────────────────────────────────
   const EstimasiPopover = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="w-4 h-4" />
          Kelola Estimasi ({selectedEstimasiIds.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[400px] overflow-y-auto" align="end">
        <div className="space-y-3">
          <div className="font-semibold text-sm border-b pb-2">Pilih Estimasi</div>
          {estimasiList.map((est) => {
            const isSelected = selectedEstimasiIds.includes(est.id);
            return (
              <div
                key={est.id}
                className={`p-2 border rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-gray-200 hover:border-sky-300'
                }`}
                onClick={() => updateEstimasiSelectionFromPreview(est.id)}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      isSelected ? 'bg-sky-500 border-sky-500' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
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
                    <h4 className="font-medium text-sm mt-1">{est.namaEstimasi}</h4>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {est.items?.length || 0} item
                      </span>
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
  );
  // ── Tabel Singkat: per Estimasi bergaya RAB ───────────────────────
  const TableSingkat = () => {
    const groups = previewData?.estimasiGroups || [];
    const totalJual = groups.reduce((sum, eg, idx) => {
      const hj = getHargaJual(idx);
      return sum + (hj > 0 ? Math.round(eg.dimensiKerja * hj) : 0);
    }, 0);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold">Item Pekerjaan &amp; Harga Satuan</h3>
          <EstimasiPopover />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="px-3 py-2 text-center w-10">No</th>
                <th className="px-3 py-2 text-left">Item Pekerjaan</th>
                <th className="px-3 py-2 text-center w-28">Volume</th>
                <th className="px-3 py-2 text-right w-48">Harga Satuan (Rp)</th>
                <th className="px-3 py-2 text-right w-40">Total Harga (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((eg, idx) => {
                const hj = getHargaJual(idx);
                const totalRow = hj > 0 ? Math.round(eg.dimensiKerja * hj) : 0;
                return (
                  <React.Fragment key={eg.id || idx}>
                    {/* Baris header estimasi */}
                    <tr className="border-t border-gray-300 bg-gray-50">
                      <td className="px-3 py-2 text-center font-bold text-gray-800 align-top">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-900 uppercase align-top">
                        {eg.nama}
                        <div className="text-xs font-normal text-sky-600 normal-case">
                          {eg.nomor}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-800 align-top whitespace-nowrap">
                        {eg.dimensiKerja > 0 ? (
                          <>
                            <span>{Number(eg.dimensiKerja).toFixed(2)}</span>
                            <span className="text-xs text-gray-500 ml-1">M²</span>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Input
                          type="text"
                          value={formatRupiah(hargaJualMap[idx] || '')}
                          onChange={(e) => handleHargaJualChange(idx, e.target.value)}
                          placeholder="0"
                          className="text-right font-bold h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600 align-top whitespace-nowrap">
                        {totalRow > 0 ? (
                          totalRow.toLocaleString('id-ID')
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    {/* Sub-baris: daftar barang dalam estimasi */}
                    {eg.barangList.map((b, bIdx) => (
                      <tr key={bIdx} className="border-t border-gray-100 bg-white">
                        <td className="px-3 py-1" />
                        <td className="py-1 text-gray-600 text-xs pl-8" colSpan={4}>
                          <span className="mr-1 text-gray-400">-</span>
                          {b.namaBarang}
                          {b.kodeItem ? (
                            <span className="ml-2 text-gray-400 italic">
                              ({b.kodeItem})
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {/* Baris total */}
              {groups.length > 0 && (
                <tr className="border-t-2 border-gray-400 bg-gray-100">
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-right font-bold text-gray-700"
                  >
                    TOTAL
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">
                    {totalJual > 0 ? (
                      totalJual.toLocaleString('id-ID')
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  // ── Tabel Detail: per Barang ──────────────────────────────────────
  const TableDetail = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-semibold">Detail Item &amp; Harga Jual</h3>
        <EstimasiPopover />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead className="text-center">Dimensi Kerja</TableHead>
              <TableHead className="text-center">Bahan</TableHead>
              <TableHead className="text-center">Berat (kg)</TableHead>
              <TableHead className="text-center">Welding</TableHead>
              <TableHead className="text-center">Waste</TableHead>
              <TableHead className="text-right">Harga Modal</TableHead>
              <TableHead className="text-right">Subtotal Modal</TableHead>
              <TableHead className="text-right w-48">Harga Jual / Kg</TableHead>
              <TableHead className="text-right">
                Subtotal Jual
                <span className="block text-xs font-normal text-emerald-600">
                  (× jml bahan)
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(previewData?.groupedItems || []).map((group, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-center">{idx + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{group.namaBarang}</div>
                  <div className="text-xs text-gray-500">
                    {formatNumberWithSeparator(group.panjangMentah)} mm ×{' '}
                    {formatNumberWithSeparator(group.panjangJadi)} mm ({group.count} item)
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {group.dimensiKerjaValues?.length > 0 ? (
                    <>
                      <div className="text-sm">
                        {[
                          ...new Set(
                            group.dimensiKerjaValues.map((v) => Number(v).toFixed(2))
                          ),
                        ].join(' + ')}
                      </div>
                      <div className="text-xs font-medium text-gray-600">m²</div>
                    </>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {group.totalBahan}
                </TableCell>
                <TableCell className="text-center font-medium text-blue-600">
                  {group.totalBeratMaterial > 0
                    ? formatNumberWithSeparator(group.totalBeratMaterial.toFixed(2))
                    : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {group.totalWelding > 0 ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                      {group.totalWelding}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs text-gray-600">
                    {formatNumberWithSeparator(Math.round(group.totalWaste))} mm
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium text-gray-600">
                  {group.hargaModal > 0
                    ? `Rp ${group.hargaModal.toLocaleString('id-ID')}`
                    : '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-gray-600">
                  {group.hargaModal > 0
                    ? `Rp ${getItemSubtotalModal(group).toLocaleString('id-ID')}`
                    : '-'}
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
                  Rp{' '}
                  {getItemSubtotalJualByMode(
                    group,
                    getHargaJual(idx),
                    penawaranMode
                  ).toLocaleString('id-ID')}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 border-t-2 font-bold">
              <TableCell colSpan={8} className="text-right text-gray-500">
                TOTAL
              </TableCell>
              <TableCell className="text-right text-gray-700">
                Rp{' '}
                {(previewData?.groupedItems || [])
                  .reduce((sum, group) => sum + getItemSubtotalModal(group), 0)
                  .toLocaleString('id-ID')}
              </TableCell>
              <TableCell />
              <TableCell className="text-right text-emerald-600">
                {(previewData?.groupedItems || []).some(
                  (group, idx) => getHargaJual(idx) > 0
                )
                  ? `Rp ${(previewData?.groupedItems || [])
                      .reduce((sum, group, idx) => {
                        const hj = getHargaJual(idx);
                        return (
                          sum +
                          (hj > 0
                            ? getItemSubtotalJualByMode(group, hj, penawaranMode)
                            : 0)
                        );
                      }, 0)
                      .toLocaleString('id-ID')}`
                  : '-'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ── Main Render ───────────────────────────────────────────────
  return (
    <Dialog
      open={showPreview}
      onOpenChange={(open) => {
        if (!open) {
          setShowPreview(false);
          setShowCreateDialog(true);
        }
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-sky-600" />
            Preview Penawaran
            {penawaranMode && (
              <span
                className={`px-2 py-0.5 text-xs font-bold rounded ${
                  penawaranMode === 'detail'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {penawaranMode === 'detail' ? 'Penawaran Detail' : 'Penawaran Singkat'}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {previewData && (
          <div className="space-y-6">
            {/* Info Client */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Nama Project</p>
                <p className="font-semibold text-gray-800">
                  {previewData.clientInfo.namaProject || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Lokasi</p>
                <p className="font-semibold text-gray-800">
                  {previewData.clientInfo.lokasiProject || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Client</p>
                <p className="font-semibold text-gray-800">
                  {previewData.clientInfo.clientNama || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Kontak</p>
                <p className="font-semibold text-gray-800">
                  {previewData.clientInfo.clientKontak || '-'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Estimasi</p>
                <p className="font-semibold text-gray-800">
                  {previewData.estimasiList.map((e) => e.nomor).join(', ')}
                </p>
              </div>
            </div>

            {penawaranMode === 'singkat' ? <TableSingkat /> : <TableDetail />}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowPreview(false);
              setShowCreateDialog(true);
            }}
            disabled={saving}
          >
            Kembali
          </Button>
          <Button
            onClick={() => confirmCreatePenawaran(getHargaJual)}
            disabled={saving}
            className={`bg-gradient-to-r ${
              penawaranMode === 'detail'
                ? 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                : 'from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
            }`}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editMode
              ? `Update Penawaran ${penawaranMode === 'detail' ? 'Detail' : 'Singkat'}`
              : `Konfirmasi & Buat Penawaran ${
                  penawaranMode === 'detail' ? 'Detail' : 'Singkat'
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};