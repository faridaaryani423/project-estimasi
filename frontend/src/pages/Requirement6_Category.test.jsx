import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BarangCombobox, { groupAndSortBarang } from '../components/BarangCombobox';

// Setup mocks untuk JSDOM
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();
  window.HTMLElement.prototype.setPointerCapture = jest.fn();
  window.HTMLElement.prototype.releasePointerCapture = jest.fn();
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('Requirement 6: Category Grouping + Alphabetical Sorting', () => {
  const sampleBarang = [
    { id: '1', nama: 'Z-Plate Stainless', kategoriBarang: 'Stainless', ukuran: '100x100' },
    { id: '2', nama: 'A-Pipe Stainless', kategoriBarang: 'Stainless', ukuran: '2 inch' },
    { id: '3', nama: 'M-Beam Besi', kategoriBarang: 'Besi', ukuran: 'WF 200' },
    { id: '4', nama: 'B-Hollow Besi', kategoriBarang: 'Besi', ukuran: '40x40' },
    { id: '5', nama: 'K-Siku Baja', kategoriBarang: 'Baja', ukuran: '50x50' },
    { id: '6', nama: 'C-Canal Baja', kategoriBarang: 'Baja', ukuran: 'C-150' },
    { id: '7', nama: 'Uncategorized Zinc', kategoriBarang: '', ukuran: '0.8mm' },
    { id: '8', nama: 'Baut Mur Null', kategoriBarang: null, ukuran: 'M10' },
    { id: '9', nama: 'Aluminium Rod', kategoriBarang: 'Aluminium', ukuran: '1 inch' },
  ];

  test('groupAndSortBarang mengelompokkan kategori, mengurutkan alfabetis case-insensitive, dan fallback Lainnya di akhir', () => {
    const grouped = groupAndSortBarang(sampleBarang);

    // Kategori harus terurut: Aluminium, Baja, Besi, Stainless, dan Lainnya di paling akhir
    const categoryNames = grouped.map((g) => g.category);
    expect(categoryNames).toEqual(['Aluminium', 'Baja', 'Besi', 'Stainless', 'Lainnya']);

    // Periksa kategori Baja (C-Canal, K-Siku)
    const bajaGroup = grouped.find((g) => g.category === 'Baja');
    expect(bajaGroup.items.map((i) => i.nama)).toEqual(['C-Canal Baja', 'K-Siku Baja']);

    // Periksa kategori Besi (B-Hollow, M-Beam)
    const besiGroup = grouped.find((g) => g.category === 'Besi');
    expect(besiGroup.items.map((i) => i.nama)).toEqual(['B-Hollow Besi', 'M-Beam Besi']);

    // Periksa kategori Stainless (A-Pipe, Z-Plate)
    const stainlessGroup = grouped.find((g) => g.category === 'Stainless');
    expect(stainlessGroup.items.map((i) => i.nama)).toEqual(['A-Pipe Stainless', 'Z-Plate Stainless']);

    // Periksa kategori Lainnya (Baut Mur Null, Uncategorized Zinc)
    const lainnyaGroup = grouped.find((g) => g.category === 'Lainnya');
    expect(lainnyaGroup.items.map((i) => i.nama)).toEqual(['Baut Mur Null', 'Uncategorized Zinc']);
  });

  test('BarangCombobox UI merender tombol dan menampilkan barang yang dipilih', () => {
    const handleSelect = jest.fn();
    render(
      <BarangCombobox
        barangList={sampleBarang}
        value="4"
        onSelect={handleSelect}
      />
    );

    // Tombol combobox menampilkan barang yang terpilih (id: 4 -> B-Hollow Besi)
    const triggerBtn = screen.getByRole('combobox');
    expect(triggerBtn).toHaveTextContent('B-Hollow Besi');
  });

  test('BarangCombobox UI menampilkan (barang manual) jika value adalah __manual__', () => {
    render(
      <BarangCombobox
        barangList={sampleBarang}
        value="__manual__"
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('(barang manual)');
  });
});
