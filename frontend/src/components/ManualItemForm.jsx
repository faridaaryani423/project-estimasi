import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ManualItemForm = ({
  item,
  index,
  onItemChange,        // (index, field, value) => void
  onSavePermanent,     // (index) => Promise<void>
  saving = {},         // { [index]: boolean }
}) => {
  const jenisBentuk = item.jenisBentukManual || 'balok';

  const f = (field) => ({
    value: item[field] || '',
    onChange: (e) => onItemChange(index, field, e.target.value),
  });

  return (
    <div className="mt-2 p-4 bg-sky-50 rounded-lg border border-sky-200 space-y-4">
      <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Detail Barang Manual</p>

      {/* Nama & Supplier */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nama Barang <span className="text-red-500">*</span></Label>
          <Input placeholder="Contoh: Besi UNP 100" {...f('namaManual')} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Supplier</Label>
          <Input placeholder="Contoh: CV. Besi Jaya" {...f('supplierManual')} />
        </div>
      </div>

      {/* Jenis Bentuk */}
      <div className="space-y-1">
        <Label className="text-xs">Jenis Bentuk</Label>
        <div className="flex gap-4 flex-wrap">
          {['balok', 'tabung', 'wf', 'plat', 'custom'].map((bentuk) => (
            <label key={bentuk} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`jenisBentukManual-${index}`}
                value={bentuk}
                checked={jenisBentuk === bentuk}
                onChange={(e) => onItemChange(index, 'jenisBentukManual', e.target.value)}
                className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-gray-700 capitalize">{bentuk}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dimensi */}
      <div className="space-y-1">
        <Label className="text-xs">Dimensi (mm)</Label>
        {jenisBentuk === 'balok' && (
          <div className="grid grid-cols-4 gap-2">
            <Input type="number" placeholder="Panjang" {...f('panjangManual')} />
            <Input type="number" placeholder="Lebar" {...f('lebarManual')} />
            <Input type="number" placeholder="Tinggi" {...f('tinggiManual')} />
            <Input type="number" placeholder="Ketebalan" {...f('ketebalanManual')} />
          </div>
        )}
        {jenisBentuk === 'tabung' && (
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" placeholder="Diameter" {...f('diameterManual')} />
            <Input type="number" placeholder="Panjang" {...f('panjangManual')} />
            <Input type="number" placeholder="Ketebalan" {...f('ketebalanManual')} />
          </div>
        )}
        {jenisBentuk === 'wf' && (
          <div className="grid grid-cols-4 gap-2">
            <div><Label className="text-[10px] text-gray-500">Tinggi (H)</Label><Input type="number" placeholder="200" {...f('tinggiWFManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Flange (B)</Label><Input type="number" placeholder="100" {...f('lebarFlangeManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Web (tw)</Label><Input type="number" placeholder="5.5" {...f('ketebalanWebManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Flange (tf)</Label><Input type="number" placeholder="8" {...f('ketebalanFlangeManual')} /></div>
          </div>
        )}
        {jenisBentuk === 'plat' && (
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" placeholder="Panjang" {...f('panjangPlatManual')} />
            <Input type="number" placeholder="Lebar" {...f('lebarPlatManual')} />
            <Input type="number" placeholder="Ketebalan" {...f('ketebalanPlatManual')} />
          </div>
        )}
        {jenisBentuk === 'custom' && (
          <Input type="number" placeholder="Panjang" {...f('panjangManual')} />
        )}
      </div>

      {/* Informasi Material */}
      {jenisBentuk !== 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Jenis Bahan</Label>
            <Input placeholder="Baja ST37" {...f('jenisBahanManual')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Berat Jenis (kg/m³)</Label>
            <Input type="number" placeholder="7850" {...f('beratJenisManual')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Berat/Batang (kg)</Label>
            <Input type="number" placeholder="50" {...f('beratbatangManual')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Min. Welding (mm)</Label>
            <Input type="number" placeholder="50" {...f('minWeldingManual')} />
          </div>
        </div>
      )}

      {/* Harga */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Harga Modal (Rp)</Label>
          <Input type="number" placeholder="500000" {...f('hargamodalManual')} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Harga Jual (Rp) <span className="text-red-500">*</span></Label>
          <Input type="number" placeholder="750000" {...f('hargaManual')} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Harga Jasa (Rp)</Label>
          <Input type="number" placeholder="100000" {...f('hargajasaManual')} />
        </div>
      </div>

      <div className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
        <Zap className="w-3 h-3 shrink-0" />
        Barang manual dihitung berdasarkan Harga Jual × Jumlah.
      </div>

      {/* Tombol aksi */}
      <div className="flex gap-2 pt-2 border-t border-sky-200">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 border-sky-300 text-sky-700 hover:bg-sky-50 text-xs"
          onClick={() => toast.success('Perubahan diterapkan untuk estimasi ini saja.')}
        >
          Gunakan untuk Estimasi Ini
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          onClick={() => onSavePermanent(index)}
          disabled={!!saving[index]}
        >
          {saving[index] ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Menyimpan...</>
          ) : (
            'Simpan ke Database Barang'
          )}
        </Button>
      </div>
    </div>
  );
};

export default ManualItemForm;