import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';

const BarangCombobox = ({ barangList, value, onSelect, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = barangList.find(b => String(b.id) === String(value));

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

            <CommandGroup>
              {barangList.map(barang => (
                <CommandItem
                  key={barang.id}
                  value={barang.nama}
                  onSelect={() => {
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
                    <p className="text-xs text-gray-500">{barang.ukuran}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default BarangCombobox;