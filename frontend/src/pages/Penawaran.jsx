// src/pages/Penawaran.jsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  Plus,
  Download,
  FileSpreadsheet,
  Trash2,
  Eye,
  Edit,
  Search,
  Calculator,
  Loader2,
} from 'lucide-react';
import { usePenawaran } from '@/hooks/usePenawaran';
import { formatNumberWithSeparator } from '@/lib/utils';
import { getItemSubtotalJualByMode } from '@/utils/penawaranCalculations';
import { exportToPDF } from '@/utils/penawaranPdfExport';
import { exportToExcel } from '@/utils/penawaranExcelExport';

// Import komponen terpisah
import { PenawaranStatsCards } from '@/components/Penawaran/PenawaranStatsCards';
import { CreatePenawaranDialog } from '@/components/Penawaran/CreatePenawaranDialog';
import { PreviewPenawaranDialog } from '@/components/Penawaran/PreviewPenawaranDialog';
import { DetailPenawaranDialog } from '@/components/Penawaran/DetailPenawaranDialog';

const Penawaran = () => {
  const hook = usePenawaran();

  const handleExportPDF = (penawaran) => {
    exportToPDF(penawaran);
  };

  return (
    <div className="space-y-6 fade-in" data-testid="penawaran-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Penawaran
          </h1>
          <p className="text-base text-gray-600">
            Buat penawaran dari estimasi yang sudah dibuat
          </p>
        </div>
        <Button
          onClick={() => hook.setShowCreateDialog(true)}
          data-testid="create-penawaran-button"
          className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" /> Buat Penawaran
        </Button>
      </div>

      {/* Stats Cards */}
      <PenawaranStatsCards
        totalPenawaran={hook.penawaranList.length}
        totalNilai={hook.penawaranList.reduce((s, p) => s + (p.totalHarga || 0), 0)}
        totalEstimasi={hook.estimasiList.length}
      />

      {/* Daftar Penawaran */}
      <Card className="card-hover">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Daftar Penawaran
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari penawaran..."
                value={hook.searchQuery}
                onChange={(e) => hook.setSearchQuery(e.target.value)}
                className="pl-9 bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hook.loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-600" />
              <p className="text-gray-500 mt-2">Memuat data...</p>
            </div>
          ) : hook.filteredPenawaranList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {hook.penawaranList.length === 0
                  ? 'Belum ada penawaran'
                  : 'Penawaran tidak ditemukan'}
              </p>
            </div>
          ) : (
            <Table data-testid="penawaran-table">
              <TableHeader>
                <TableRow>
                  <TableHead>No. Penawaran</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Estimasi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hook.filteredPenawaranList.map((penawaran) => (
                  <TableRow key={penawaran.id}>
                    <TableCell>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                        {penawaran.nomorPenawaran}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {penawaran.namaProject}
                    </TableCell>
                    <TableCell>{penawaran.clientNama}</TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {penawaran.estimasiList?.map((e) => e.nomor).join(', ')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs font-bold rounded ${
                          penawaran.tipePenawaran === 'detail'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {penawaran.tipePenawaran === 'detail' ? 'Detail' : 'Singkat'}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600">
                      Rp {(penawaran.totalHarga || 0).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(penawaran.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            hook.setSelectedPenawaran(penawaran);
                            hook.setShowDetail(true);
                          }}
                          className="hover:bg-blue-50"
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => hook.handleEditPenawaran(penawaran)}
                          className="hover:bg-amber-50"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportPDF(penawaran)}
                          className="hover:bg-red-50"
                          title="PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportToExcel(penawaran)}
                          className="hover:bg-green-50"
                          title="Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => hook.handleDeletePenawaran(penawaran.id)}
                          className="hover:bg-red-50"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreatePenawaranDialog hook={hook} />
      <PreviewPenawaranDialog hook={hook} />
      <DetailPenawaranDialog
        hook={hook}
        onExportPDF={handleExportPDF}
        onExportExcel={exportToExcel}
      />
    </div>
  );
};

export default Penawaran;