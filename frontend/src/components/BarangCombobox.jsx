import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';

export const groupAndSortBarang = (barangList = []) => {
  const groupsMap = {};

  barangList.forEach((barang) => {
    let kat = (barang.kategoriBarang || '').trim();
    if (!kat) {
      kat = 'Lainnya';
    }
    if (!groupsMap[kat]) {
      groupsMap[kat] = [];
    }
    groupsMap[kat].push(barang);
  });

  // Urutkan kategori secara konsisten:
  // Kategori alfabetis case-insensitive, dengan "Lainnya" selalu di posisi paling akhir jika ada kategori lain
  const sortedCategories = Object.keys(groupsMap).sort((a, b) => {
    const isALainnya = a.toLowerCase() === 'lainnya';
    const isBLainnya = b.toLowerCase() === 'lainnya';
    if (isALainnya && !isBLainnya) return 1;
    if (!isALainnya && isBLainnya) return -1;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });

  // Di dalam setiap kategori, urutkan barang secara alfabetis case-insensitive
  return sortedCategories.map((category) => {
    const items = [...groupsMap[category]].sort((a, b) => {
      const nameA = (a.nama || '').trim();
      const nameB = (b.nama || '').trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
    return {
      category,
      items,
    };
  });
};

const BarangCombobox = ({ barangList = [], value, onSelect, disabled, isDisabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = barangList.find((b) => String(b.id) === String(value));

  const groupedBarang = useMemo(() => {
    return groupAndSortBarang(barangList);
  }, [barangList]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected
            ? selected.nama
            : value === '__manual__'
            ? '(barang manual)'
            : 'Pilih atau ketik barang...'}
          <ChevronsUpDown className="ml-2 w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Ketik nama barang..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="px-4 py-3 text-sm">
                <p className="text-gray-500 mb-2">"{search}" tidak ditemukan</p>
                <button
                  className="w-full text-left text-sky-600 font-medium hover:underline"
                  onClick={() => {
                    onSelect('__manual__', search.trim());
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  + Pakai "{search}" sebagai barang manual
                </button>
              </div>
            </CommandEmpty>

            {groupedBarang.map(({ category, items }) => (
              <CommandGroup key={category} heading={category}>
                {items.map((barang) => {
                  const itemDisabled = isDisabled ? isDisabled(barang.id) : false;
                  return (
                    <CommandItem
                      key={barang.id}
                      value={`${barang.nama} ${category} ${barang.ukuran || ''}`}
                      disabled={itemDisabled}
                      onSelect={() => {
                        if (itemDisabled) return;
                        onSelect(String(barang.id), '');
                        setSearch('');
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 w-4 h-4 ${
                          String(value) === String(barang.id) ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <div>
                        <p className="font-medium">{barang.nama}</p>
                        <p className="text-xs text-gray-500">
                          {barang.jenisBentuk === 'custom' ? `Custom (${barang.satuan || 'Bh'})` : barang.ukuran}
                        </p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default BarangCombobox;