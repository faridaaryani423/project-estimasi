import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EstimasiForm from './EstimasiForm';
import { barangAPI, materialAPI } from '@/services/api';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('@/services/api', () => ({
  barangAPI: { getAll: jest.fn() },
  estimasiAPI: {},
  materialAPI: { getAll: jest.fn() },
}));

jest.mock('@/components/BarangCombobox', () => ({ onSelect }) => (
  <button type="button" onClick={() => onSelect('barang-1', '')}>Pilih material</button>
));

jest.mock('@/components/ui/calendar', () => ({ Calendar: () => null }));

describe('Requirement 21: Kode follows the latest row', () => {
  beforeEach(() => {
    barangAPI.getAll.mockResolvedValue([{
      id: 'barang-1',
      nama: 'Pipa Kotak 50 x 50 x 2 mm',
      jenisBentuk: 'balok',
      panjang: 6000,
      lebar: 50,
      tinggi: 50,
      beratbatang: 10,
      hargamodal: 324000,
      satuanHargaModal: 'batang',
    }]);
    materialAPI.getAll.mockResolvedValue([]);
  });

  test('copies the latest user-edited Kode into each new detail row', async () => {
    render(<EstimasiForm />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pilih material' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Pilih material' }));
    let kodeInputs;
    await waitFor(() => {
      kodeInputs = screen.getAllByPlaceholderText('A-01');
      expect(kodeInputs).toHaveLength(1);
    });
    fireEvent.change(kodeInputs[0], { target: { value: 'Balok' } });

    fireEvent.click(screen.getByTitle('Tambah detail (kode/panjang/jumlah) baru untuk barang yang sama'));
    kodeInputs = screen.getAllByPlaceholderText('A-01');
    expect(kodeInputs[1]).toHaveValue('Balok');

    fireEvent.change(kodeInputs[1], { target: { value: 'A-01' } });
    fireEvent.click(screen.getByTitle('Tambah detail (kode/panjang/jumlah) baru untuk barang yang sama'));
    kodeInputs = screen.getAllByPlaceholderText('A-01');
    expect(kodeInputs[2]).toHaveValue('A-01');

    fireEvent.change(kodeInputs[2], { target: { value: 'B-02' } });
    fireEvent.click(screen.getByTitle('Tambah detail (kode/panjang/jumlah) baru untuk barang yang sama'));
    kodeInputs = screen.getAllByPlaceholderText('A-01');
    expect(kodeInputs[3]).toHaveValue('B-02');
  });
});