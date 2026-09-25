import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EstimasiForm from './EstimasiForm';
import { BrowserRouter } from 'react-router-dom';
import * as api from '@/services/api';

jest.mock('@/services/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: '1' }),
}));

describe('Requirement 12: Mekanisme Nomor / Urutan Item (Reorder)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.barangAPI.getAll.mockResolvedValue([
      { id: '1', nama: 'Pipa Hitam', jenisBentuk: 'batang', panjang: 6000, hargaModal: 100000, jenisBahan: 'Besi' },
      { id: '2', nama: 'Besi', jenisBentuk: 'batang', panjang: 6000, hargaModal: 150000, jenisBahan: 'Besi' },
      { id: '3', nama: 'Base Plate', jenisBentuk: 'plat', panjangPlat: 2400, lebarPlat: 1200, hargaModal: 200000, jenisBahan: 'Besi' },
      { id: '4', nama: 'Sipil', jenisBentuk: 'custom', hargaModal: 50000, jenisBahan: 'Lainnya' },
      { id: '5', nama: 'Angkur', jenisBentuk: 'batang', panjang: 6000, hargaModal: 120000, jenisBahan: 'Besi' }
    ]);
  });

  const setup = async () => {
    render(
      <BrowserRouter>
        <EstimasiForm />
      </BrowserRouter>
    );

    await screen.findByText(/Tambah Item/i);
    const btnTambah = screen.getByText(/Tambah Item/i);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(btnTambah);
    }
  };

  test('User dapat mengubah urutan dengan input nomor dan menggeser item lain dengan benar', async () => {
    await setup();
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } }); // Pipa Hitam
    fireEvent.change(selects[1], { target: { value: '2' } }); // Besi
    fireEvent.change(selects[2], { target: { value: '3' } }); // Base Plate
    fireEvent.change(selects[3], { target: { value: '4' } }); // Sipil
    fireEvent.change(selects[4], { target: { value: '5' } }); // Angkur
    
    const orderInputs = screen.getAllByTitle('Ubah nomor dan tekan Enter');
    expect(orderInputs).toHaveLength(5);
    
    expect(orderInputs[0].value).toBe('1');
    expect(orderInputs[1].value).toBe('2');
    expect(orderInputs[2].value).toBe('3');
    expect(orderInputs[3].value).toBe('4');
    expect(orderInputs[4].value).toBe('5');
    
    // Ubah Angkur (item 5) menjadi 2
    fireEvent.change(orderInputs[4], { target: { value: '2' } });
    fireEvent.blur(orderInputs[4]);
    
    const newSelects = screen.getAllByRole('combobox');
    expect(newSelects[0].value).toBe('1'); // Pipa Hitam
    expect(newSelects[1].value).toBe('5'); // Angkur
    expect(newSelects[2].value).toBe('2'); // Besi
    expect(newSelects[3].value).toBe('3'); // Base Plate
    expect(newSelects[4].value).toBe('4'); // Sipil
    
    const newOrderInputs = screen.getAllByTitle('Ubah nomor dan tekan Enter');
    expect(newOrderInputs[0].value).toBe('1');
    expect(newOrderInputs[1].value).toBe('2');
    expect(newOrderInputs[2].value).toBe('3');
    expect(newOrderInputs[3].value).toBe('4');
    expect(newOrderInputs[4].value).toBe('5');
  });

  test('Ubah item nomor 4 menjadi nomor 1', async () => {
    await setup();
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } }); 
    fireEvent.change(selects[1], { target: { value: '2' } }); 
    fireEvent.change(selects[2], { target: { value: '3' } }); 
    fireEvent.change(selects[3], { target: { value: '4' } }); 
    fireEvent.change(selects[4], { target: { value: '5' } }); 
    
    const orderInputs = screen.getAllByTitle('Ubah nomor dan tekan Enter');
    
    fireEvent.change(orderInputs[3], { target: { value: '1' } });
    fireEvent.blur(orderInputs[3]);
    
    const newSelects = screen.getAllByRole('combobox');
    expect(newSelects[0].value).toBe('4'); 
    expect(newSelects[1].value).toBe('1'); 
    expect(newSelects[2].value).toBe('2'); 
    expect(newSelects[3].value).toBe('3'); 
    expect(newSelects[4].value).toBe('5'); 
  });

  test('Pastikan satu group/detail bergerak sebagai satu kesatuan', async () => {
    render(
      <BrowserRouter>
        <EstimasiForm />
      </BrowserRouter>
    );

    await screen.findByText(/Tambah Item/i);
    const btnTambah = screen.getByText(/Tambah Item/i);
    
    fireEvent.click(btnTambah);
    fireEvent.click(btnTambah);
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } });
    fireEvent.change(selects[1], { target: { value: '2' } });
    fireEvent.change(selects[2], { target: { value: '2' } });
    
    const orderInputs = screen.getAllByTitle('Ubah nomor dan tekan Enter');
    expect(orderInputs).toHaveLength(2); 
    
    fireEvent.change(orderInputs[1], { target: { value: '1' } });
    fireEvent.blur(orderInputs[1]);
    
    const newSelects = screen.getAllByRole('combobox');
    expect(newSelects[0].value).toBe('2');
    expect(newSelects[1].value).toBe('2');
    expect(newSelects[2].value).toBe('1');
    
    const newOrderInputs = screen.getAllByTitle('Ubah nomor dan tekan Enter');
    expect(newOrderInputs[0].value).toBe('1');
    expect(newOrderInputs[1].value).toBe('2');
  });
});
