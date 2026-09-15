import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const KATEGORI_OPTIONS = [
  'Baja',
  'Besi',
  'Stainless',
  'Kaca',
  'Aksesoris',
  'Aluminium',
  'Lainnya',
];

export function KategoriSelect({ value, onChange, className, id, name, testId }) {
  const isCustom = value && !KATEGORI_OPTIONS.includes(value) && value !== 'TAMBAH_BARU';
  const [showInput, setShowInput] = useState(isCustom);

  return showInput ? (
    <div className="flex gap-2">
      <Input
        id={id}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder="Ketik kategori baru..."
        autoFocus
        className={className}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        style={{ height: 'inherit', minHeight: '36px' }} // Attempt to match select/input height automatically
        onClick={() => {
          setShowInput(false);
          onChange({ target: { name, value: '' } });
        }}
        title="Batal"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  ) : (
    <select
      id={id}
      name={name}
      data-testid={testId}
      value={value || ''}
      onChange={(e) => {
        if (e.target.value === 'TAMBAH_BARU') {
          setShowInput(true);
          onChange({ target: { name, value: '' } });
        } else {
          onChange(e);
        }
      }}
      className={className}
    >
      <option value="">-- Pilih Kategori --</option>
      {KATEGORI_OPTIONS.map((cat) => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
      <option value="TAMBAH_BARU" className="font-semibold text-sky-600">+ Tambah Kategori Baru...</option>
    </select>
  );
}
