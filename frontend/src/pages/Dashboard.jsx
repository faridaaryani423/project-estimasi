import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, Calculator, ShoppingCart, Loader2 } from 'lucide-react';
import { barangAPI, estimasiAPI, penawaranAPI } from '@/services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBarang: 0,
    totalNilai: 0,
    estimasiBulanIni: 0,
    totalPenawaran: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const [barangData, estimasiData, penawaranData] = await Promise.all([
          barangAPI.getAll(),
          estimasiAPI.getAll(),
          penawaranAPI.getAll()
        ]);
        
        const totalBarang = barangData.length;
        const totalNilai = barangData.reduce((sum, item) => sum + (parseFloat(item.harga) || 0), 0);
        const estimasiBulanIni = estimasiData.length;
        const totalPenawaran = penawaranData.length;

        setStats({ totalBarang, totalNilai, estimasiBulanIni, totalPenawaran });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Total Barang',
      value: stats.totalBarang,
      icon: Package,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Nilai Inventori',
      value: `Rp ${stats.totalNilai.toLocaleString('id-ID')}`,
      icon: ShoppingCart,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Estimasi Bulan Ini',
      value: stats.estimasiBulanIni,
      icon: Calculator,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-violet-50'
    },
    {
      title: 'Pertumbuhan',
      value: '+12%',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-8 fade-in" data-testid="dashboard-container">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-base text-gray-600">Selamat datang di Sistem Manajemen Inventori</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <span className="ml-2 text-gray-600">Memuat data...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="card-hover" data-testid={`stat-card-${index}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-gray-700" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-xl">Aktivitas Terbaru</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                      <div className="w-2 h-2 rounded-full bg-sky-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Barang baru ditambahkan</p>
                        <p className="text-xs text-gray-500">{item} jam yang lalu</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-xl">Ringkasan Estimasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50">
                    <span className="text-sm font-medium text-gray-700">Estimasi Selesai</span>
                    <span className="text-lg font-bold text-emerald-600">{stats.estimasiBulanIni}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50">
                    <span className="text-sm font-medium text-gray-700">Penawaran</span>
                    <span className="text-lg font-bold text-amber-600">{stats.totalPenawaran}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50">
                    <span className="text-sm font-medium text-gray-700">Total Project</span>
                    <span className="text-lg font-bold text-blue-600">{stats.estimasiBulanIni + stats.totalPenawaran}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
