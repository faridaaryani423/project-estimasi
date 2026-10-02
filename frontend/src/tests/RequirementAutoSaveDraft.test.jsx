import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock('jspdf', () => jest.fn());
jest.mock('jspdf-autotable', () => jest.fn());

import EstimasiForm from '../pages/EstimasiForm';
import EditEstimasi from '../pages/EditEstimasi';
import Estimasi from '../pages/Estimasi';
import { renderHook } from '@testing-library/react';
import { usePenawaran } from '../hooks/usePenawaran';
import { barangAPI, estimasiAPI, materialAPI, penawaranAPI } from '@/services/api';
import { toast } from 'sonner';

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

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'draft-101' }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('@/services/api', () => ({
  barangAPI: { getAll: jest.fn(), update: jest.fn() },
  estimasiAPI: { getAll: jest.fn(), getById: jest.fn(), update: jest.fn(), create: jest.fn(), delete: jest.fn() },
  materialAPI: { getAll: jest.fn() },
  penawaranAPI: { getAll: jest.fn(), create: jest.fn() },
}));

jest.mock('@/components/ui/calendar', () => ({ Calendar: () => null }));

describe('Requirement Auto Save Draft Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    barangAPI.getAll.mockResolvedValue([
      { id: '1', nama: 'Besi Hollow 40x40', jenisBentuk: 'balok', hargamodal: 150000, hargajasa: 0, panjang: 6000 }
    ]);
    materialAPI.getAll.mockResolvedValue([]);
    estimasiAPI.getAll.mockResolvedValue([]);
    penawaranAPI.getAll.mockResolvedValue([]);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    cleanup();
  });

  const renderEstimasiForm = async () => {
    const utils = render(<EstimasiForm />);
    await act(async () => {
      await Promise.resolve();
    });
    return utils;
  };

  // A. Create kosong → tidak membuat Draft
  test('A. Form kosong tidak memicu autosave draft', async () => {
    await renderEstimasiForm();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(estimasiAPI.create).not.toHaveBeenCalled();
    expect(estimasiAPI.update).not.toHaveBeenCalled();
  });

  // B & C & E & J. Isi nama estimasi → POST 1x, perubahan berikutnya PUT ke ID yang sama (No duplicate)
  test('B, C, E, J. Autosave pertama POST 1x, perubahan berikutnya PUT ke draft ID yang sama', async () => {
    estimasiAPI.create.mockResolvedValue({
      id: 'draft-999',
      nomorEstimasi: 'EST/202610/9999',
      status: 'draft',
    });
    estimasiAPI.update.mockResolvedValue({
      id: 'draft-999',
      nomorEstimasi: 'EST/202610/9999',
      status: 'draft',
    });

    await renderEstimasiForm();

    const inputNama = screen.getByPlaceholderText('Contoh: Rangka Kanopi');

    // 1. Ketik nama estimasi (incomplete data: customer & lokasi masih kosong)
    fireEvent.change(inputNama, { target: { name: 'namaEstimasi', value: 'Kanopi Minimalis' } });

    // Tunggu debounce 1.5 detik
    await act(async () => {
      jest.advanceTimersByTime(1600);
      await Promise.resolve();
    });

    // Harus POST 1x dengan status: 'draft' meskipun customer/lokasi belum diisi
    expect(estimasiAPI.create).toHaveBeenCalledTimes(1);
    const postPayload = estimasiAPI.create.mock.calls[0][0];
    expect(postPayload.status).toBe('draft');
    expect(postPayload.namaEstimasi).toBe('Kanopi Minimalis');

    // 2. Ketik perubahan berikutnya (misal isi nomor order)
    const inputOrder = screen.getByPlaceholderText('Contoh: ORD/2026/09/001');
    fireEvent.change(inputOrder, { target: { name: 'noOrder', value: 'ORD-123' } });

    await act(async () => {
      jest.advanceTimersByTime(1600);
      await Promise.resolve();
    });

    // POST TIDAK BOLEH bertambah (tetap 1x)
    expect(estimasiAPI.create).toHaveBeenCalledTimes(1);
    // Harus memanggil PUT ke draft ID yang sama ('draft-999')
    expect(estimasiAPI.update).toHaveBeenCalledTimes(1);
    expect(estimasiAPI.update).toHaveBeenCalledWith('draft-999', expect.objectContaining({
      status: 'draft',
      noOrder: 'ORD-123',
    }));
  });

  // H. Klik Simpan Estimasi dengan data incomplete → validation existing tetap menolak
  test('H. Simpan Estimasi dengan data incomplete ditolak oleh validasi final', async () => {
    await renderEstimasiForm();

    const inputNama = screen.getByPlaceholderText('Contoh: Rangka Kanopi');
    fireEvent.change(inputNama, { target: { name: 'namaEstimasi', value: 'Kanopi Test' } });

    // Klik tombol Simpan Estimasi tanpa mengisi customer dan alamat
    const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
    fireEvent.click(simpanBtn);

    expect(toast.error).toHaveBeenCalledWith('Customer wajib diisi!');
    expect(estimasiAPI.create).not.toHaveBeenCalled();
  });

  // I & J. Lengkapi data → klik Simpan Estimasi → Draft berubah menjadi Final pada ID yang sama
  test('I & J. Finalisasi draft memanggil PUT status final ke ID yang sama tanpa duplicate', async () => {
    estimasiAPI.create.mockResolvedValue({
      id: 'draft-777',
      nomorEstimasi: 'EST/202610/7777',
      status: 'draft',
    });
    estimasiAPI.update.mockResolvedValue({
      id: 'draft-777',
      nomorEstimasi: 'EST/202610/7777',
      status: 'final',
    });

    await renderEstimasiForm();

    // Isi header lengkap
    fireEvent.change(screen.getByPlaceholderText('Contoh: Rangka Kanopi'), { target: { name: 'namaEstimasi', value: 'Kanopi Sukses' } });
    fireEvent.change(screen.getByPlaceholderText('Contoh: Bapak Budi'), { target: { name: 'namaClient', value: 'Pak Budi' } });
    fireEvent.change(screen.getByPlaceholderText('Contoh: Jakarta Selatan'), { target: { name: 'lokasi', value: 'Jakarta' } });

    // Pemicu autosave dulu agar mendapatkan draft ID
    await act(async () => {
      jest.advanceTimersByTime(1600);
      await Promise.resolve();
    });
    expect(estimasiAPI.create).toHaveBeenCalledTimes(1);

    // Sekarang tambahkan item manual custom valid agar lolos validasi item
    const comboboxBtn = screen.getByText('Pilih atau ketik barang...');
    fireEvent.click(comboboxBtn);

    const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
    fireEvent.change(inputSearch, { target: { value: 'Baud Custom' } });

    const manualBtn = await screen.findByText(/\+ Pakai "Baud Custom" sebagai barang manual/i);
    fireEvent.click(manualBtn);

    const qtyInput = screen.getByPlaceholderText(/Contoh: 252/i);
    fireEvent.change(qtyInput, { target: { value: '10' } });

    const hargaInput = screen.getByPlaceholderText('15000');
    fireEvent.change(hargaInput, { target: { value: '5000' } });

    // Simpan Estimasi
    const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
    fireEvent.click(simpanBtn);

    // Tunggu proses simpan
    await act(async () => {
      await Promise.resolve();
    });

    // Harus PUT ke draft-777 dengan status final
    expect(estimasiAPI.update).toHaveBeenCalledWith('draft-777', expect.objectContaining({
      status: 'final',
      namaEstimasi: 'Kanopi Sukses',
      namaClient: 'Pak Budi',
      lokasi: 'Jakarta',
    }));
  });

  // D, K, L. List Estimasi: status Draft & Final badges (termasuk legacy data tanpa status)
  test('D, K, L. List Estimasi menampilkan badge Draft dan Final dengan benar', async () => {
    estimasiAPI.getAll.mockResolvedValue([
      { id: '1', nomorEstimasi: 'EST/001', namaEstimasi: 'Estimasi Draft', status: 'draft', createdAt: new Date().toISOString() },
      { id: '2', nomorEstimasi: 'EST/002', namaEstimasi: 'Estimasi Final', status: 'final', createdAt: new Date().toISOString() },
      { id: '3', nomorEstimasi: 'EST/003', namaEstimasi: 'Estimasi Legacy', createdAt: new Date().toISOString() }, // tanpa status
    ]);

    render(<Estimasi />);

    await waitFor(() => {
      expect(screen.getByText('Estimasi Draft')).toBeInTheDocument();
    });

    // Badge Draft harus ada
    expect(screen.getByText('Draft')).toBeInTheDocument();

    // Badge Final harus ada untuk Estimasi Final dan Estimasi Legacy (default final)
    const finalBadges = screen.getAllByText('Final');
    expect(finalBadges.length).toBeGreaterThanOrEqual(2);
  });

  // F & G. Buka Draft di EditEstimasi → data ter-load dan status tetap Draft
  test('F, G. EditEstimasi memuat draft dan mempertahankan status draft', async () => {
    estimasiAPI.getAll.mockResolvedValue([
      {
        id: 'draft-101',
        nomorEstimasi: 'EST/001',
        namaEstimasi: 'Proyek Draft Sedang Diedit',
        namaClient: 'Budi',
        lokasi: 'Bandung',
        status: 'draft',
        items: []
      }
    ]);

    render(<EditEstimasi />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Proyek Draft Sedang Diedit')).toBeInTheDocument();
    });

    // Badge Draft harus muncul di header edit
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
  });

  // M. Draft tidak muncul sebagai source Penawaran
  test('M. usePenawaran hanya memuat estimasi berstatus final (Draft difilter)', async () => {
    penawaranAPI.getAll.mockResolvedValue([]);
    estimasiAPI.getAll.mockResolvedValue([
      { id: '1', nomorEstimasi: 'EST/001', namaEstimasi: 'Estimasi Final 1', status: 'final' },
      { id: '2', nomorEstimasi: 'EST/002', namaEstimasi: 'Estimasi Draft 1', status: 'draft' },
      { id: '3', nomorEstimasi: 'EST/003', namaEstimasi: 'Estimasi Legacy Final' }, // legacy tanpa status = final
    ]);

    const { result } = renderHook(() => usePenawaran());

    await waitFor(() => {
      expect(result.current.estimasiList.length).toBe(2);
    });

    const ids = result.current.estimasiList.map((e) => e.id);
    expect(ids).toContain('1');
    expect(ids).toContain('3');
    expect(ids).not.toContain('2'); // Draft tidak boleh masuk!
  });
});
