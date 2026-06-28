// src/components/Penawaran/DetailPenawaranDialog.jsx

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Weight, Ruler, Calculator, Download, FileSpreadsheet } from 'lucide-react';
import { buildGroupedItemsByBarang } from '@/utils/penawaranGrouping';

export const DetailPenawaranDialog = ({ hook, onExportPDF, onExportExcel }) => {
  const { showDetail, setShowDetail, selectedPenawaran } = hook;

  if (!selectedPenawaran) {
    return (
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl" />
      </Dialog>
    );
  }

  const isSingkat = selectedPenawaran.tipePenawaran !== 'detail';
  const items = selectedPenawaran.items || [];
  const estimasiList = selectedPenawaran.estimasiList || [];

  // Untuk mode Detail: rebuild groupedItems dari items tersimpan
  const groupedItems = isSingkat ? [] : buildGroupedItemsByBarang(items);

  // ── Tabel Singkat: per estimasi ──────────────────────────────────
  const TabelSingkat = () => {
    const totalHarga = Number(selectedPenawaran.totalHarga || 0);
    const totalDimensiKerja = Number(selectedPenawaran.totalDimensiKerja || 0);

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">No</TableHead>
            <TableHead>Item Pekerjaan</TableHead>
            <TableHead className="text-center">Volume (M²)</TableHead>
            <TableHead className="text-right">Harga Satuan (Rp/M²)</TableHead>
            <TableHead className="text-right">Total Harga (Rp)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimasiList.map((est, idx) => {
            const hargaPerM2 = Number(est.hargaJualPerM2 || 0);
            const dimensiKerja = Number(est.dimensiKerja || 0);
            const subtotal = Number(est.subtotalJual || (dimensiKerja > 0 && hargaPerM2 > 0 ? Math.round(dimensiKerja * hargaPerM2) : 0));
            return (
              <TableRow key={idx}>
                <TableCell className="text-center">{idx + 1}</TableCell>
                <TableCell>
                  <div className="font-medium uppercase">{est.nama || est.namaEstimasi}</div>
                  <div className="text-xs text-sky-600">{est.nomor || est.nomorEstimasi}</div>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {dimensiKerja > 0 ? `${Number(dimensiKerja).toFixed(2)} M²` : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {hargaPerM2 > 0 ? `Rp ${hargaPerM2.toLocaleString('id-ID')}` : '-'}
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-600">
                  {subtotal > 0 ? `Rp ${subtotal.toLocaleString('id-ID')}` : '-'}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-gray-50 border-t-2 font-bold">
            <TableCell colSpan={2} className="text-right text-gray-500">TOTAL</TableCell>
            <TableCell className="text-center text-gray-600">
              {totalDimensiKerja > 0 ? `${totalDimensiKerja.toFixed(2)} M²` : '-'}
            </TableCell>
            <TableCell />
            <TableCell className="text-right text-emerald-600">
              Rp {totalHarga.toLocaleString('id-ID')}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  // ── Tabel Detail: per barang (dibangun ulang dari items) ─────────
  const TabelDetail = () => {
    const totalHarga = Number(selectedPenawaran.totalHarga || 0);

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">No</TableHead>
            <TableHead>Nama Barang</TableHead>
            <TableHead className="text-center">Berat (Kg)</TableHead>
            <TableHead className="text-center">Bahan</TableHead>
            <TableHead className="text-right">Harga Jual / Kg</TableHead>
            <TableHead className="text-right">Subtotal Jual (Rp)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedItems.map((group, idx) => {
            const isManualRow = !group.barangId || group.barangId === '__manual__';

            // Ambil hargaJualPerUnit & subtotalJual dari item tersimpan
            const matchedItems = items.filter(it =>
              isManualRow ? it.namaBarang === group.namaBarang : it.barangId === group.barangId
            );
            const hargaJualPerUnit = matchedItems.length > 0
              ? Number(matchedItems[0].hargaJualPerUnit || 0)
              : 0;
            const subtotalJual = matchedItems.reduce((s, it) => s + Number(it.subtotalJual || 0), 0);

            const volume = isManualRow
              ? Number(matchedItems[0]?.jumlahKeperluan || 0)
              : group.totalBeratMaterial;
            const satuan = isManualRow
              ? (matchedItems[0]?.satuanManual || 'Ls')
              : 'Kg';

            return (
              <TableRow key={idx}>
                <TableCell className="text-center">{idx + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{group.namaBarang}</div>
                  {!isManualRow && group.panjangMentah > 0 && (
                    <div className="text-xs text-gray-500">
                      {group.panjangMentah} mm × {group.panjangJadi} mm ({group.count} item)
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center font-medium text-blue-600">
                  {volume > 0 ? `${Number(volume).toFixed(2)} ${satuan}` : '-'}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {group.totalBahan > 0 ? group.totalBahan : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {hargaJualPerUnit > 0
                    ? `Rp ${hargaJualPerUnit.toLocaleString('id-ID')}`
                    : '-'}
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-600">
                  {subtotalJual > 0
                    ? `Rp ${subtotalJual.toLocaleString('id-ID')}`
                    : '-'}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-gray-50 border-t-2 font-bold">
            <TableCell colSpan={5} className="text-right text-gray-500">TOTAL</TableCell>
            <TableCell className="text-right text-emerald-600">
              Rp {totalHarga.toLocaleString('id-ID')}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  return (
    <Dialog open={showDetail} onOpenChange={setShowDetail}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded">
              {selectedPenawaran.nomorPenawaran}
            </span>
            Detail Penawaran
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded ${
                isSingkat
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isSingkat ? 'Singkat' : 'Detail'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Nama Project</p>
              <p className="font-medium">{selectedPenawaran.namaProject}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lokasi</p>
              <p className="font-medium">{selectedPenawaran.lokasiProject}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="font-medium">{selectedPenawaran.clientNama}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Kontak</p>
              <p className="font-medium">{selectedPenawaran.clientKontak}</p>
            </div>
            {estimasiList.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Estimasi</p>
                <p className="font-medium">
                  {estimasiList.map((e) => e.nomor || e.nomorEstimasi).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg text-center">
              <Weight className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs text-gray-600">Berat Real</p>
              <p className="font-bold">
                {Number(selectedPenawaran.totalBerat || selectedPenawaran.totalBeratReal || 0).toFixed(2)} kg
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <Ruler className="w-5 h-5 mx-auto text-blue-600 mb-1" />
              <p className="text-xs text-gray-600">Dimensi Kerja</p>
              <p className="font-bold">
                {Math.round((selectedPenawaran.totalDimensiKerja || 0) * 100) / 100} m²
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-center">
              <Weight className="w-5 h-5 mx-auto text-orange-600 mb-1" />
              <p className="text-xs text-gray-600">Total Item</p>
              <p className="font-bold">
                {isSingkat ? estimasiList.length : groupedItems.length} jenis
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <Calculator className="w-5 h-5 mx-auto text-purple-600 mb-1" />
              <p className="text-xs text-gray-600">Total Penawaran</p>
              <p className="font-bold text-emerald-600 text-sm">
                Rp {(selectedPenawaran.totalHarga || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            {isSingkat ? <TabelSingkat /> : <TabelDetail />}
          </div>

          {/* Export Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onExportExcel(selectedPenawaran)}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
            <Button
              onClick={() => onExportPDF(selectedPenawaran)}
              className="gap-2 bg-gradient-to-r from-red-500 to-pink-500"
            >
              <Download className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};