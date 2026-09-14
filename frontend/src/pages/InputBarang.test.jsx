import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InputBarang from './InputBarang';
import { barangAPI, materialAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/services/api', () => ({
  barangAPI: {
    getAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: '123' }),
    update: jest.fn().mockResolvedValue({ id: '123' }),
    delete: jest.fn().mockResolvedValue({ success: true })
  },
  materialAPI: {
    getAll: jest.fn().mockResolvedValue([
      { id: 'mat-baja', namaMaterial: 'Baja', masaJenis: 7850 },
      { id: 'mat-alum', namaMaterial: 'Aluminium', masaJenis: 2700 }
    ])
  }
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({ currentUser: { token: 'mock-token' } })
}));

describe('Requirement 4: InputBarang Behavioral UI Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: { token: 'mock-token' } });
    barangAPI.getAll.mockResolvedValue([]);
    materialAPI.getAll.mockResolvedValue([
      { id: 'mat-baja', namaMaterial: 'Baja', masaJenis: 7850 },
      { id: 'mat-alum', namaMaterial: 'Aluminium', masaJenis: 2700 }
    ]);
  });

  const renderComponent = async (openModal = true) => {
    render(<InputBarang />);
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
    if (openModal) {
      fireEvent.click(screen.getByTestId('add-barang-button'));
    }
  };

  test('1. AUTO calculation & dimension changes recalculation', async () => {
    await renderComponent();

    const panjangInput = screen.getByTestId('panjang-input');
    const lebarInput = screen.getByTestId('lebar-input');
    const tinggiInput = screen.getByTestId('tinggi-input');
    const materialSelect = screen.getByTestId('jenisBahan-select');
    const beratInput = screen.getByTestId('beratbatang-input');

    // Initial Balok input: 1000 x 1000 x 10 mm, Baja (7850 kg/m3)
    fireEvent.change(panjangInput, { target: { value: '1000' } });
    fireEvent.change(lebarInput, { target: { value: '1000' } });
    fireEvent.change(tinggiInput, { target: { value: '10' } });
    fireEvent.change(materialSelect, { target: { value: 'Baja' } });

    // Should be automatically calculated: 1000 * 1000 * 10 * 7850 / 1e9 = 78.5
    expect(beratInput.value).toBe('78.5');

    // Recalculate: change tinggi to 20 -> 157
    fireEvent.change(tinggiInput, { target: { value: '20' } });
    expect(beratInput.value).toBe('157');

    // Recalculate: change tinggi to 30 -> 235.5
    fireEvent.change(tinggiInput, { target: { value: '30' } });
    expect(beratInput.value).toBe('235.5');
  });

  test('2. Manual override, dimension change protection, and Hitung Otomatis restoration', async () => {
    await renderComponent();

    const panjangInput = screen.getByTestId('panjang-input');
    const lebarInput = screen.getByTestId('lebar-input');
    const tinggiInput = screen.getByTestId('tinggi-input');
    const materialSelect = screen.getByTestId('jenisBahan-select');
    const beratInput = screen.getByTestId('beratbatang-input');

    fireEvent.change(panjangInput, { target: { value: '1000' } });
    fireEvent.change(lebarInput, { target: { value: '1000' } });
    fireEvent.change(tinggiInput, { target: { value: '30' } });
    fireEvent.change(materialSelect, { target: { value: 'Baja' } });

    expect(beratInput.value).toBe('235.5');

    // Manual Override to 160
    fireEvent.change(beratInput, { target: { value: '160' } });
    expect(beratInput.value).toBe('160');

    // "Hitung Otomatis" button appears
    const hitungOtomatisBtn = screen.getByRole('button', { name: /Hitung Otomatis/i });
    expect(hitungOtomatisBtn).toBeInTheDocument();

    // Perubahan dimensi saat manual: change tinggi to 40, weight must stay 160
    fireEvent.change(tinggiInput, { target: { value: '40' } });
    expect(beratInput.value).toBe('160');

    // Click "Hitung Otomatis" -> restores AUTO mode and calculates based on current dims
    fireEvent.click(hitungOtomatisBtn);
    expect(beratInput.value).toBe('314'); // 1000 * 1000 * 40 * 7850 / 1e9 = 314

    // "Hitung Otomatis" button disappears
    expect(screen.queryByRole('button', { name: /Hitung Otomatis/i })).not.toBeInTheDocument();

    // Subsequent dimension change automatically recalculates
    fireEvent.change(tinggiInput, { target: { value: '50' } });
    expect(beratInput.value).toBe('392.5');
  });

  test('3. Material change AUTO vs MANUAL', async () => {
    await renderComponent();

    const panjangInput = screen.getByTestId('panjang-input');
    const lebarInput = screen.getByTestId('lebar-input');
    const tinggiInput = screen.getByTestId('tinggi-input');
    const materialSelect = screen.getByTestId('jenisBahan-select');
    const beratInput = screen.getByTestId('beratbatang-input');

    fireEvent.change(panjangInput, { target: { value: '1000' } });
    fireEvent.change(lebarInput, { target: { value: '1000' } });
    fireEvent.change(tinggiInput, { target: { value: '40' } });
    fireEvent.change(materialSelect, { target: { value: 'Baja' } }); // 7850

    expect(beratInput.value).toBe('314');

    // Change Material in AUTO mode -> recalculates to Aluminium (2700)
    fireEvent.change(materialSelect, { target: { value: 'Aluminium' } });
    expect(beratInput.value).toBe('108'); // 1000 * 1000 * 40 * 2700 / 1e9 = 108

    // Override manually to 500
    fireEvent.change(beratInput, { target: { value: '500' } });
    expect(beratInput.value).toBe('500');

    // Change Material in MANUAL mode back to Baja -> weight remains protected at 500
    fireEvent.change(materialSelect, { target: { value: 'Baja' } });
    expect(beratInput.value).toBe('500');
  });

  test('4. Legacy data & Edit AUTO vs MANUAL', async () => {
    barangAPI.getAll.mockResolvedValueOnce([
      {
        id: 'item-legacy-auto',
        nama: 'Plat Besi Auto',
        jenisBentuk: 'balok',
        panjang: '1000',
        lebar: '1000',
        tinggi: '10',
        jenisBahan: 'Baja',
        beratJenis: '7850',
        beratbatang: '' // Legacy empty -> auto
      },
      {
        id: 'item-legacy-manual',
        nama: 'Besi Custom Legacy',
        jenisBentuk: 'balok',
        panjang: '1000',
        lebar: '1000',
        tinggi: '10',
        jenisBahan: 'Baja',
        beratJenis: '7850',
        beratbatang: '400' // Legacy with existing value -> manual
      },
      {
        id: 'item-saved-manual',
        nama: 'Saved Manual Item',
        jenisBentuk: 'balok',
        panjang: '1000',
        lebar: '1000',
        tinggi: '10',
        jenisBahan: 'Baja',
        beratJenis: '7850',
        beratbatangMode: 'manual',
        beratbatang: '500'
      }
    ]);

    await renderComponent(false);

    // Edit Legacy Auto (item 0)
    fireEvent.click(screen.getByTestId('edit-button-0'));
    const beratInput = screen.getByTestId('beratbatang-input');
    const tinggiInput = screen.getByTestId('tinggi-input');

    // Legacy auto is auto mode, so "Hitung Otomatis" button is NOT present
    expect(screen.queryByRole('button', { name: /Hitung Otomatis/i })).not.toBeInTheDocument();
    
    // Changing dimension recalculates weight
    fireEvent.change(tinggiInput, { target: { value: '20' } });
    expect(beratInput.value).toBe('157');

    // Edit Legacy Manual (item 1)
    fireEvent.click(screen.getByTestId('edit-button-1'));
    expect(beratInput.value).toBe('400');
    expect(screen.getByRole('button', { name: /Hitung Otomatis/i })).toBeInTheDocument();
    // Dimension change does NOT overwrite manual weight
    fireEvent.change(tinggiInput, { target: { value: '20' } });
    expect(beratInput.value).toBe('400');

    // Edit Saved Manual (item 2)
    fireEvent.click(screen.getByTestId('edit-button-2'));
    expect(beratInput.value).toBe('500');
    expect(screen.getByRole('button', { name: /Hitung Otomatis/i })).toBeInTheDocument();
    fireEvent.change(tinggiInput, { target: { value: '20' } });
    expect(beratInput.value).toBe('500');
  });

  test('5. Custom shape regression test (does not use berat per batang)', async () => {
    await renderComponent();

    // Select 'custom' radio button
    fireEvent.click(screen.getByTestId('radio-custom'));

    // Custom items do not render balok dimension inputs or beratbatang
    expect(screen.queryByTestId('panjang-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('beratbatang-input')).not.toBeInTheDocument();
  });

  test('6. TC 4.7 verification: Item saved with AUTO weight 314 kg reloaded/edited stays in AUTO mode and updates when dimensions change', async () => {
    barangAPI.getAll.mockResolvedValueOnce([
      {
        id: 'item-auto-314',
        nama: 'Plat Besi 314',
        jenisBentuk: 'balok',
        panjang: '1000',
        lebar: '1000',
        tinggi: '40',
        jenisBahan: 'Baja',
        beratJenis: '7850',
        beratbatang: '314',
        beratbatangMode: 'auto'
      },
      {
        id: 'item-auto-no-mode-314',
        nama: 'Plat Besi Legacy 314',
        jenisBentuk: 'balok',
        panjang: '1000',
        lebar: '1000',
        tinggi: '40',
        jenisBahan: 'Baja',
        beratJenis: '7850',
        beratbatang: '314'
        // beratbatangMode missing/undefined
      }
    ]);

    await renderComponent(false);

    // Test item 0 with explicit beratbatangMode: 'auto'
    fireEvent.click(screen.getByTestId('edit-button-0'));
    const beratInput0 = screen.getByTestId('beratbatang-input');
    const tinggiInput0 = screen.getByTestId('tinggi-input');

    expect(beratInput0.value).toBe('314');
    expect(screen.queryByRole('button', { name: /Hitung Otomatis/i })).not.toBeInTheDocument();

    // Changing dimension automatically updates weight from 314 to 392.5 (tinggi: 50)
    fireEvent.change(tinggiInput0, { target: { value: '50' } });
    expect(beratInput0.value).toBe('392.5');

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /Batal/i }));

    // Test item 1 with legacy/undefined beratbatangMode but weight equals calculateBerat (314)
    fireEvent.click(screen.getByTestId('edit-button-1'));
    const beratInput1 = screen.getByTestId('beratbatang-input');
    const tinggiInput1 = screen.getByTestId('tinggi-input');

    expect(beratInput1.value).toBe('314');
    expect(screen.queryByRole('button', { name: /Hitung Otomatis/i })).not.toBeInTheDocument();

    // Changing dimension automatically updates weight from 314 to 235.5 (tinggi: 30)
    fireEvent.change(tinggiInput1, { target: { value: '30' } });
    expect(beratInput1.value).toBe('235.5');
  });
});

