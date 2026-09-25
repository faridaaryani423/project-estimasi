import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { KategoriSelect } from '@/components/ui/kategori-select';
import { resolveItemSatuan, getEffectiveSatuanOptions } from '@/utils/unitResolver';
import { calculateBerat } from '@/utils/calculationEngine';

const ManualItemForm = ({
  item,
  index,
  onItemChange,        // (index, field, value) => void
  onSavePermanent,     // (index) => Promise<void>
  saving = {},         // { [index]: boolean }
  materials = [],
}) => {
  const jenisBentuk = item.jenisBentukManual || 'custom';

  const f = (field) => ({
    value: item[field] || '',
    onChange: (e) => onItemChange(index, field, e.target.value),
  });

  const lengthF = (field) => ({
    value: (item[field] && !isNaN(item[field])) ? String(item[field] / 1000) : '',
    onChange: (e) => {
      const val = e.target.value;
      onItemChange(index, field, val === '' ? '' : String(Math.round(parseFloat(val) * 1000)));
    },
  });

  const [isHargaJasaEnabled, setIsHargaJasaEnabled] = React.useState(!!item.hargajasaManual);

  React.useEffect(() => {
    setIsHargaJasaEnabled(!!item.hargajasaManual);
  }, [item.hargajasaManual]);

  const handleAutoHitungBeratManual = () => {
    const mockBarang = {
      jenisBentuk,
      panjang: item.panjangManual,
      lebar: item.lebarManual,
      tinggi: item.tinggiManual,
      diameter: item.diameterManual,
      ketebalan: item.ketebalanManual,
      tinggiWF: item.tinggiWFManual,
      lebarFlange: item.lebarFlangeManual,
      ketebalanWeb: item.ketebalanWebManual,
      ketebalanFlange: item.ketebalanFlangeManual,
      panjangPlat: item.panjangPlatManual,
      lebarPlat: item.lebarPlatManual,
      ketebalanPlat: item.ketebalanPlatManual,
      beratJenis: item.beratJenisManual || '7850',
    };
    const calculated = calculateBerat(mockBarang);
    if (calculated > 0) {
      onItemChange(index, 'beratbatangManual', String(calculated));
    }
  };

  const currentSatuan = resolveItemSatuan(item, 'Bh');
  const effectiveSatuanOptions = getEffectiveSatuanOptions(currentSatuan);
  const materialByName = materials.find(
    (material) => material.namaMaterial?.toLowerCase() === item.jenisBahanManual?.toLowerCase()
  );
  const selectedMaterialId = item.materialIdManual || materialByName?.id || '';
  const isMasterMaterial = Boolean(selectedMaterialId);

  return (
    <div className="mt-2 p-4 bg-sky-50 rounded-lg border border-sky-200 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Detail Barang Manual</p>
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
                onChange={(e) => {
                  onItemChange(index, 'jenisBentukManual', e.target.value);
                }}
                className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-gray-700 capitalize">{bentuk}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Nama Barang */}
      <div className="space-y-1">
        <Label className="text-xs">Nama Barang <span className="text-red-500">*</span></Label>
        <Input placeholder="Contoh: Baud HTB M16" {...f('namaManual')} />
      </div>

      {/* Kategori Barang */}
      <div className="space-y-1">
        <Label className="text-xs">Kategori Barang <span className="text-red-500">*</span></Label>
        <KategoriSelect
          name="kategoriBarangManual"
          testId={`kategori-manual-${index}`}
          value={item.kategoriBarangManual || 'Lainnya'}
          onChange={(e) => onItemChange(index, 'kategoriBarangManual', e.target.value)}
          className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Supplier */}
      <div className="space-y-1">
        <Label className="text-xs">Supplier</Label>
        <Input placeholder="Contoh: CV. Baut Sentosa" {...f('supplierManual')} />
      </div>

      {/* Input Khusus Custom (Jumlah & Satuan) */}
      {jenisBentuk === 'custom' ? (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Jumlah <span className="text-red-500">*</span></Label>
            <Input type="number" placeholder="Contoh: 252" {...f('jumlahKeperluan')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Satuan <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <select
                value={currentSatuan}
                onChange={(e) => {
                  onItemChange(index, 'satuanBarangManual', e.target.value);
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {effectiveSatuanOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Dimensi & Ketebalan Non-Custom */}
          <div className="space-y-2">
            <Label className="text-xs">Ukuran Barang <span className="text-red-500">*</span></Label>
            {jenisBentuk === 'balok' && (
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[10px] text-gray-500">Panjang (M)</Label><Input type="number" placeholder="1" {...lengthF('panjangManual')} /></div>
                <div><Label className="text-[10px] text-gray-500">Lebar (mm)</Label><Input type="number" placeholder="600" {...f('lebarManual')} /></div>
                <div><Label className="text-[10px] text-gray-500">Tinggi (mm)</Label><Input type="number" placeholder="750" {...f('tinggiManual')} /></div>
              </div>
            )}
            {jenisBentuk === 'tabung' && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px] text-gray-500">Diameter (mm)</Label><Input type="number" placeholder="500" {...f('diameterManual')} /></div>
                <div><Label className="text-[10px] text-gray-500">Panjang (M)</Label><Input type="number" placeholder="1" {...lengthF('panjangManual')} /></div>
              </div>
            )}
            {jenisBentuk === 'wf' && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px] text-gray-500">Tinggi (H) (mm)</Label><Input type="number" placeholder="200" {...f('tinggiWFManual')} /></div>
                <div><Label className="text-[10px] text-gray-500">Lebar Flange (B) (mm)</Label><Input type="number" placeholder="100" {...f('lebarFlangeManual')} /></div>
                <div><Label className="text-[10px] text-gray-500">Tebal Web (tw) (mm)</Label><Input type="number" placeholder="5.5" {...f('ketebalanWebManual')} /></div>
                <div><Label className="text-[10px] text-gray-500">Tebal Flange (tf) (mm)</Label><Input type="number" placeholder="8" {...f('ketebalanFlangeManual')} /></div>
              </div>
            )}
            {jenisBentuk === 'plat' && (
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[10px] text-gray-500">Panjang (M)</Label><Input type="number" placeholder="6" {...lengthF('panjangPlatManual')} /></div>
                <div><Label className="text-[10px] text-gray-500">Lebar (M)</Label><Input type="number" placeholder="1.5" {...lengthF('lebarPlatManual')} /></div>
                <div><Label className="text-[10px] text-gray-500">Ketebalan (mm)</Label><Input type="number" placeholder="6" {...f('ketebalanPlatManual')} /></div>
              </div>
            )}
          </div>

          {!['wf', 'plat'].includes(jenisBentuk) && (
            <div className="space-y-1">
              <Label className="text-xs">Ketebalan Barang (mm) <span className="text-red-500">*</span></Label>
              <Input type="number" placeholder="5" {...f('ketebalanManual')} />
            </div>
          )}

          {/* Informasi Material Non-Custom */}
          <div className="border-t border-sky-200 pt-3 space-y-3">
            <h3 className="text-xs font-semibold text-gray-900">Informasi Material</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Jenis Bahan <span className="text-red-500">*</span></Label>
                <div className="space-y-1.5">
                  <select
                    className="w-full text-xs h-8 rounded-md border border-input bg-background px-2 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={
                      item.materialIdManual || materialByName?.id || (
                      ['Baja', 'Besi', 'Stainless Steel', 'Aluminium'].includes(item.jenisBahanManual)
                        ? item.jenisBahanManual
                        : (item.jenisBahanManual ? 'Custom' : ''))
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const material = materials.find((entry) => String(entry.id) === String(val));
                      if (material) {
                        onItemChange(index, 'materialIdManual', material.id);
                        onItemChange(index, 'jenisBahanManual', material.namaMaterial);
                        onItemChange(index, 'beratJenisManual', String(material.masaJenis));
                      } else if (val === 'Baja') {
                        onItemChange(index, 'materialIdManual', '');
                        onItemChange(index, 'jenisBahanManual', 'Baja');
                        onItemChange(index, 'beratJenisManual', '7850');
                        if (!item.kategoriBarangManual || item.kategoriBarangManual === 'Lainnya') {
                          onItemChange(index, 'kategoriBarangManual', 'Baja');
                        }
                      } else if (val === 'Besi') {
                        onItemChange(index, 'materialIdManual', '');
                        onItemChange(index, 'jenisBahanManual', 'Besi');
                        onItemChange(index, 'beratJenisManual', '7850');
                        if (!item.kategoriBarangManual || item.kategoriBarangManual === 'Lainnya') {
                          onItemChange(index, 'kategoriBarangManual', 'Besi');
                        }
                      } else if (val === 'Stainless Steel') {
                        onItemChange(index, 'materialIdManual', '');
                        onItemChange(index, 'jenisBahanManual', 'Stainless Steel');
                        onItemChange(index, 'beratJenisManual', '7930');
                        if (!item.kategoriBarangManual || item.kategoriBarangManual === 'Lainnya') {
                          onItemChange(index, 'kategoriBarangManual', 'Stainless');
                        }
                      } else if (val === 'Aluminium') {
                        onItemChange(index, 'materialIdManual', '');
                        onItemChange(index, 'jenisBahanManual', 'Aluminium');
                        onItemChange(index, 'beratJenisManual', '2700');
                        if (!item.kategoriBarangManual || item.kategoriBarangManual === 'Lainnya') {
                          onItemChange(index, 'kategoriBarangManual', 'Aluminium');
                        }
                      } else if (val === 'Custom') {
                        onItemChange(index, 'materialIdManual', '');
                        onItemChange(index, 'jenisBahanManual', '');
                      }
                    }}
                  >
                    <option value="">-- Pilih Bahan --</option>
                    <option value="Baja">Baja (7.850 kg/m³)</option>
                    <option value="Besi">Besi (7.850 kg/m³)</option>
                    <option value="Stainless Steel">Stainless Steel (7.930 kg/m³)</option>
                    <option value="Aluminium">Aluminium (2.700 kg/m³)</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.namaMaterial} ({Number(material.masaJenis).toLocaleString('id-ID')} kg/m³)
                      </option>
                    ))}
                    <option value="Custom">Lainnya / Manual</option>
                  </select>
                  <Input placeholder="Contoh: Baja ST37" {...f('jenisBahanManual')} disabled={isMasterMaterial} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Berat Jenis (kg/m³) <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="7850" {...f('beratJenisManual')} disabled={isMasterMaterial} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Berat per Batang (kg) <span className="text-red-500">*</span></Label>
                  <button
                    type="button"
                    onClick={handleAutoHitungBeratManual}
                    className="text-[10px] text-sky-600 hover:underline"
                  >
                    Hitung Otomatis
                  </button>
                </div>
                <Input type="number" placeholder="50" {...f('beratbatangManual')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min. Ukuran Welding (mm) <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="50" {...f('minWeldingManual')} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Harga */}
      <div className="border-t border-sky-200 pt-3 space-y-3">
        {/* Satuan Harga Modal untuk non-custom */}
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
            <Label className="text-xs">
              {jenisBentuk === 'custom' ? `Harga Satuan / ${item.satuanBarangManual || item.satuanManual || 'Bh'} (Rp)` : 'Harga Modal (Rp)'} <span className="text-red-500">*</span>
            </Label>
            <Input type="number" placeholder="15000" {...f('hargamodalManual')} />
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
              placeholder="50000"
              {...f('hargajasaManual')}
              disabled={!isHargaJasaEnabled}
              required={isHargaJasaEnabled}
              className="disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Subtotal Preview untuk Custom */}
        {jenisBentuk === 'custom' && item.jumlahKeperluan && item.hargamodalManual && (
          <div className="p-2.5 bg-sky-100/60 rounded border border-sky-200 text-xs flex justify-between items-center text-sky-900">
            <span>Subtotal ({item.jumlahKeperluan} {item.satuanBarangManual || item.satuanManual || 'Bh'} × Rp {Number(item.hargamodalManual || 0).toLocaleString('id-ID')}):</span>
            <span className="font-bold text-sm text-sky-800">
              Rp {(Number(item.jumlahKeperluan || 0) * Number(item.hargamodalManual || 0)).toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>

      {/* Tombol aksi */}
      <div className="flex gap-2 pt-2 border-t border-sky-200">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 border-sky-300 text-sky-700 hover:bg-sky-50 text-xs"
          onClick={() => toast.success('Perubahan diterapkan untuk estimasi ini.')}
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
