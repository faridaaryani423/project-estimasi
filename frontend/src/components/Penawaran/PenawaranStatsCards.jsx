// src/components/Penawaran/PenawaranStatsCards.jsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calculator, FileSpreadsheet } from 'lucide-react';

export const PenawaranStatsCards = ({ totalPenawaran, totalNilai, totalEstimasi }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Penawaran</p>
              <p className="text-2xl font-bold text-gray-900">{totalPenawaran}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50 to-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Nilai</p>
              <p className="text-lg font-bold text-emerald-600">
                Rp {(totalNilai || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Estimasi Tersedia</p>
              <p className="text-2xl font-bold text-gray-900">{totalEstimasi}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};