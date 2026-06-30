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

  const [isHargaJasaEnabled, setIsHargaJasaEnabled] = React.useState(!!item.hargajasaManual);

  return (
    <div className="mt-2 p-4 bg-sky-50 rounded-lg border border-sky-200 space-y-4">
      <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Detail Barang Manual</p>

      {/* Nama Barang */}
      <div className="space-y-1">
        <Label className="text-xs">Nama Barang <span className="text-red-500">*</span></Label>
        <Input placeholder="Contoh: Besi UNP 100" {...f('namaManual')} />
      </div>

      {/* Supplier */}
      <div className="space-y-1">
        <Label className="text-xs">Supplier</Label>
        <Input placeholder="Contoh: CV. Besi Jaya" {...f('supplierManual')} />
      </div>

      {/* Jenis Bentuk */}
      <div className="space-y-2">
        <Label className="text-xs">Jenis Bentuk Barang <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-5 gap-2">
          {['balok', 'tabung', 'wf', 'plat', 'custom'].map((bentuk) => (
            <label key={bentuk} className="flex items-center gap-1 cursor-pointer">
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
      {jenisBentuk !== 'custom' && (
      <div className="space-y-2">
        <Label className="text-xs">Ukuran Barang (mm) <span className="text-red-500">*</span></Label>
        {jenisBentuk === 'balok' && (
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-[10px] text-gray-500">Panjang</Label><Input type="number" placeholder="1000" {...f('panjangManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Lebar</Label><Input type="number" placeholder="600" {...f('lebarManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Tinggi</Label><Input type="number" placeholder="750" {...f('tinggiManual')} /></div>
          </div>
        )}
        {jenisBentuk === 'tabung' && (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px] text-gray-500">Diameter</Label><Input type="number" placeholder="500" {...f('diameterManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Panjang</Label><Input type="number" placeholder="1000" {...f('panjangManual')} /></div>
          </div>
        )}
        {jenisBentuk === 'wf' && (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px] text-gray-500">Tinggi (H)</Label><Input type="number" placeholder="200" {...f('tinggiWFManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Lebar Flange (B)</Label><Input type="number" placeholder="100" {...f('lebarFlangeManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Tebal Web (tw)</Label><Input type="number" placeholder="5.5" {...f('ketebalanWebManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Tebal Flange (tf)</Label><Input type="number" placeholder="8" {...f('ketebalanFlangeManual')} /></div>
          </div>
        )}
        {jenisBentuk === 'plat' && (
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-[10px] text-gray-500">Panjang</Label><Input type="number" placeholder="6000" {...f('panjangPlatManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Lebar</Label><Input type="number" placeholder="1500" {...f('lebarPlatManual')} /></div>
            <div><Label className="text-[10px] text-gray-500">Ketebalan</Label><Input type="number" placeholder="6" {...f('ketebalanPlatManual')} /></div>
          </div>
        )}
      </div>
      )}

      {/* Ketebalan */}
      {!['wf', 'plat', 'custom'].includes(jenisBentuk) && (
        <div className="space-y-1">
          <Label className="text-xs">Ketebalan Barang (mm) <span className="text-red-500">*</span></Label>
          <Input type="number" placeholder="5" {...f('ketebalanManual')} />
        </div>
      )}

      {/* Informasi Material */}
      {jenisBentuk !== 'custom' && (
      <div className="border-t border-sky-200 pt-3 space-y-3">
        <h3 className="text-xs font-semibold text-gray-900">Informasi Material</h3>
        <div className="grid grid-cols-2 gap-3">
          {jenisBentuk !== 'custom' && (
            <div className="space-y-1">
              <Label className="text-xs">Jenis Bahan <span className="text-red-500">*</span></Label>
              <Input placeholder="Contoh: Baja ST37" {...f('jenisBahanManual')} />
            </div>
          )}
          {jenisBentuk !== 'custom' && (
            <div className="space-y-1">
              <Label className="text-xs">Berat Jenis (kg/m³) <span className="text-red-500">*</span></Label>
              <Input type="number" placeholder="7850" {...f('beratJenisManual')} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Berat per Batang (kg) <span className="text-red-500">*</span></Label>
            <Input type="number" placeholder="50" {...f('beratbatangManual')} />
          </div>
          {jenisBentuk !== 'custom' && (
            <div className="space-y-1">
              <Label className="text-xs">Min. Ukuran Welding (mm) <span className="text-red-500">*</span></Label>
              <Input type="number" placeholder="50" {...f('minWeldingManual')} />
            </div>
          )}
        </div>
      </div>
      )}

      {/* Harga */}
      <div className="border-t border-sky-200 pt-3 space-y-3">
        {/* Satuan Harga Modal Custom per user request */}
        {jenisBentuk !== 'custom' && (
        <div className="space-y-1">
          <Label className="text-xs">Satuan Harga Modal</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`satuanHargaModalManual-${index}`}
                value="batang"
                checked={item.satuanHargaModalManual !== 'kg'}
                onChange={(e) => onItemChange(index, 'satuanHargaModalManual', e.target.value)}
                className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-gray-700">Per Batang</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`satuanHargaModalManual-${index}`}
                value="kg"
                checked={item.satuanHargaModalManual === 'kg'}
                onChange={(e) => onItemChange(index, 'satuanHargaModalManual', e.target.value)}
                className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-gray-700">Per Kg</span>
            </label>
          </div>
        </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Harga Modal (Rp) <span className="text-red-500">*</span></Label>
            <Input type="number" placeholder="500000" {...f('hargamodalManual')} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                id={`hargaJasaCheckbox-${index}`}
                checked={isHargaJasaEnabled}
                onChange={(e) => {
                  setIsHargaJasaEnabled(e.target.checked);
                  if (!e.target.checked) onItemChange(index, 'hargajasaManual', '');
                }}
                className="w-3.5 h-3.5 text-sky-600 rounded focus:ring-sky-500"
              />
              <Label htmlFor={`hargaJasaCheckbox-${index}`} className="text-xs cursor-pointer">Harga Jasa (Rp) {isHargaJasaEnabled && <span className="text-red-500">*</span>}</Label>
            </div>
            <Input
              type="number"
              placeholder="500000"
              {...f('hargajasaManual')}
              disabled={!isHargaJasaEnabled}
              required={isHargaJasaEnabled}
              className="disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>
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