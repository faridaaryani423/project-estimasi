import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import EstimasiForm from '../pages/EstimasiForm';
import EditEstimasi from '../pages/EditEstimasi';
import { barangAPI, estimasiAPI, materialAPI } from '@/services/api';
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

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: '123' }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('@/services/api', () => ({
  barangAPI: { getAll: jest.fn() },
  estimasiAPI: { getById: jest.fn(), update: jest.fn(), create: jest.fn() },
  materialAPI: { getAll: jest.fn() },
}));

jest.mock('@/components/ui/calendar', () => ({ Calendar: () => null }));

describe('Manual Custom Validation in EstimasiForm & EditEstimasi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    barangAPI.getAll.mockResolvedValue([]);
    materialAPI.getAll.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  const renderAndFillFormHeader = async () => {
    render(<EstimasiForm />);
    await waitFor(() => expect(screen.getByPlaceholderText('Contoh: Rangka Kanopi')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Contoh: Rangka Kanopi'), {
      target: { name: 'namaEstimasi', value: 'Estimasi Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('Contoh: Bapak Budi'), {
      target: { name: 'namaClient', value: 'Client Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('Contoh: Jakarta Selatan'), {
      target: { name: 'lokasi', value: 'Bandung' },
    });
  };

  const getBarangComboboxBtn = () => {
    return screen.getByText('Pilih atau ketik barang...');
  };

  describe('EstimasiForm validation', () => {
    test('Custom manual item valid: tidak memunculkan error material wajib', async () => {
      await renderAndFillFormHeader();

      // Select barang manual via BarangCombobox
      const comboboxBtn = getBarangComboboxBtn();
      fireEvent.click(comboboxBtn);

      const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
      fireEvent.change(inputSearch, { target: { value: 'Dop Stainless 1"' } });

      const manualBtn = await screen.findByText(/\+ Pakai "Dop Stainless 1"" sebagai barang manual/i);
      fireEvent.click(manualBtn);

      // Custom fields in ManualItemForm
      const namaInput = screen.getByPlaceholderText(/Contoh: Baud HTB M16/i);
      expect(namaInput).toHaveValue('Dop Stainless 1"');

      const qtyInput = screen.getByPlaceholderText(/Contoh: 252/i);
      fireEvent.change(qtyInput, { target: { value: '10' } });

      const hargaInput = screen.getByPlaceholderText('15000');
      fireEvent.change(hargaInput, { target: { value: '5000' } });

      // Click Simpan Estimasi
      const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
      fireEvent.click(simpanBtn);

      // Verify that "Jenis Bahan, Berat Jenis, Min Welding wajib diisi" is NOT called
      expect(toast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Jenis Bahan, Berat Jenis, Min Welding wajib diisi')
      );
    });

    test('Case normalization: "Custom" diperlakukan sebagai Custom', async () => {
      await renderAndFillFormHeader();

      const comboboxBtn = getBarangComboboxBtn();
      fireEvent.click(comboboxBtn);

      const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
      fireEvent.change(inputSearch, { target: { value: 'Dop Custom' } });

      const manualBtn = await screen.findByText(/\+ Pakai "Dop Custom" sebagai barang manual/i);
      fireEvent.click(manualBtn);

      const radioCustom = screen.getByLabelText(/custom/i);
      fireEvent.click(radioCustom);

      const qtyInput = screen.getByPlaceholderText(/Contoh: 252/i);
      fireEvent.change(qtyInput, { target: { value: '5' } });

      const hargaInput = screen.getByPlaceholderText('15000');
      fireEvent.change(hargaInput, { target: { value: '12000' } });

      const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
      fireEvent.click(simpanBtn);

      expect(toast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Jenis Bahan, Berat Jenis, Min Welding wajib diisi')
      );
    });

    test('Case normalization: "custom" lowercase diperlakukan sebagai Custom', async () => {
      await renderAndFillFormHeader();

      const comboboxBtn = getBarangComboboxBtn();
      fireEvent.click(comboboxBtn);

      const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
      fireEvent.change(inputSearch, { target: { value: 'Dop custom' } });

      const manualBtn = await screen.findByText(/\+ Pakai "Dop custom" sebagai barang manual/i);
      fireEvent.click(manualBtn);

      const radioCustom = screen.getByLabelText(/custom/i);
      fireEvent.click(radioCustom);

      const qtyInput = screen.getByPlaceholderText(/Contoh: 252/i);
      fireEvent.change(qtyInput, { target: { value: '5' } });

      const hargaInput = screen.getByPlaceholderText('15000');
      fireEvent.change(hargaInput, { target: { value: '12000' } });

      const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
      fireEvent.click(simpanBtn);

      expect(toast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Jenis Bahan, Berat Jenis, Min Welding wajib diisi')
      );
    });

    test('Case normalization: " Custom " dengan spasi diperlakukan sebagai Custom', async () => {
      await renderAndFillFormHeader();

      const comboboxBtn = getBarangComboboxBtn();
      fireEvent.click(comboboxBtn);

      const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
      fireEvent.change(inputSearch, { target: { value: 'Dop Stainless' } });

      const manualBtn = await screen.findByText(/\+ Pakai "Dop Stainless" sebagai barang manual/i);
      fireEvent.click(manualBtn);

      const radioCustom = screen.getByLabelText(/custom/i);
      fireEvent.click(radioCustom);

      const qtyInput = screen.getByPlaceholderText(/Contoh: 252/i);
      fireEvent.change(qtyInput, { target: { value: '5' } });

      const hargaInput = screen.getByPlaceholderText('15000');
      fireEvent.change(hargaInput, { target: { value: '12000' } });

      const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
      fireEvent.click(simpanBtn);

      expect(toast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Jenis Bahan, Berat Jenis, Min Welding wajib diisi')
      );
    });

    test('Non-Custom invalid: field material wajib tidak diisi memunculkan error', async () => {
      await renderAndFillFormHeader();

      const comboboxBtn = getBarangComboboxBtn();
      fireEvent.click(comboboxBtn);

      const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
      fireEvent.change(inputSearch, { target: { value: 'Hollow Manual' } });

      const manualBtn = await screen.findByText(/\+ Pakai "Hollow Manual" sebagai barang manual/i);
      fireEvent.click(manualBtn);

      // Select Balok
      const radioBalok = screen.getByLabelText(/balok/i);
      fireEvent.click(radioBalok);

      // Fill Balok dimensions
      const panjangInput = screen.getByPlaceholderText('1');
      fireEvent.change(panjangInput, { target: { value: '6' } });
      const lebarInput = screen.getByPlaceholderText('600');
      fireEvent.change(lebarInput, { target: { value: '40' } });
      const tinggiInput = screen.getByPlaceholderText('750');
      fireEvent.change(tinggiInput, { target: { value: '40' } });
      const tebalInputs = screen.getAllByPlaceholderText('5');
      fireEvent.change(tebalInputs[0], { target: { value: '2' } });

      // In row detail jumlah:
      const jumlahInputs = screen.getAllByPlaceholderText('5');
      fireEvent.change(jumlahInputs[jumlahInputs.length - 1], { target: { value: '2' } });

      // Harga Modal
      const hargaModalInput = screen.getByPlaceholderText('15000');
      fireEvent.change(hargaModalInput, { target: { value: '100000' } });

      // Leave material info empty and try to submit
      const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
      fireEvent.click(simpanBtn);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Jenis Bahan, Berat Jenis, Min Welding wajib diisi')
      );
    });

    test('Non-Custom valid: field material diisi lengkap dapat diproses', async () => {
      await renderAndFillFormHeader();

      const comboboxBtn = getBarangComboboxBtn();
      fireEvent.click(comboboxBtn);

      const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
      fireEvent.change(inputSearch, { target: { value: 'Hollow Manual Lengkap' } });

      const manualBtn = await screen.findByText(/\+ Pakai "Hollow Manual Lengkap" sebagai barang manual/i);
      fireEvent.click(manualBtn);

      // Select Balok
      const radioBalok = screen.getByLabelText(/balok/i);
      fireEvent.click(radioBalok);

      // Fill Balok dimensions
      fireEvent.change(screen.getByPlaceholderText('1'), { target: { value: '6' } });
      fireEvent.change(screen.getByPlaceholderText('600'), { target: { value: '40' } });
      fireEvent.change(screen.getByPlaceholderText('750'), { target: { value: '40' } });
      const tebalInputs = screen.getAllByPlaceholderText('5');
      fireEvent.change(tebalInputs[0], { target: { value: '2' } });

      // Select Material preset (Besi)
      const selectElements = document.querySelectorAll('select');
      let materialSelect = Array.from(selectElements).find(s => s.innerHTML.includes('Besi (7.850 kg/m³)'));
      if (materialSelect) {
        fireEvent.change(materialSelect, { target: { value: 'Besi' } });
      }

      // Fill berat per batang and min welding
      const inputs50 = screen.getAllByPlaceholderText('50');
      fireEvent.change(inputs50[0], { target: { value: '12' } });
      fireEvent.change(inputs50[1], { target: { value: '50' } });

      // Detail row jumlah:
      const jumlahInputs = screen.getAllByPlaceholderText('5');
      fireEvent.change(jumlahInputs[jumlahInputs.length - 1], { target: { value: '2' } });

      // Harga Modal
      fireEvent.change(screen.getByPlaceholderText('15000'), { target: { value: '150000' } });

      const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
      fireEvent.click(simpanBtn);

      // Tidak boleh error jenis bahan/berat jenis/min welding
      expect(toast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Jenis Bahan, Berat Jenis, Min Welding wajib diisi')
      );
    });

    test('Custom invalid: nama kosong memunculkan error Nama barang wajib diisi', async () => {
      await renderAndFillFormHeader();

      const comboboxBtn = getBarangComboboxBtn();
      fireEvent.click(comboboxBtn);

      const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
      fireEvent.change(inputSearch, { target: { value: 'Custom Item' } });

      const manualBtn = await screen.findByText(/\+ Pakai "Custom Item" sebagai barang manual/i);
      fireEvent.click(manualBtn);

      // Kosongkan nama
      const namaInput = screen.getByPlaceholderText(/Contoh: Baud HTB M16/i);
      fireEvent.change(namaInput, { target: { value: '' } });

      const qtyInput = screen.getByPlaceholderText(/Contoh: 252/i);
      fireEvent.change(qtyInput, { target: { value: '10' } });

      const hargaInput = screen.getByPlaceholderText('15000');
      fireEvent.change(hargaInput, { target: { value: '5000' } });

      const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
      fireEvent.click(simpanBtn);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Nama barang wajib diisi')
      );
    });

    test('Custom invalid: jumlah <= 0 memunculkan error Jumlah wajib diisi lebih dari 0', async () => {
      await renderAndFillFormHeader();

      const comboboxBtn = getBarangComboboxBtn();
      fireEvent.click(comboboxBtn);

      const inputSearch = screen.getByPlaceholderText(/Ketik nama barang.../i);
      fireEvent.change(inputSearch, { target: { value: 'Dop Stainless 1"' } });

      const manualBtn = await screen.findByText(/\+ Pakai "Dop Stainless 1"" sebagai barang manual/i);
      fireEvent.click(manualBtn);

      const qtyInput = screen.getByPlaceholderText(/Contoh: 252/i);
      fireEvent.change(qtyInput, { target: { value: '0' } });

      const hargaInput = screen.getByPlaceholderText('15000');
      fireEvent.change(hargaInput, { target: { value: '5000' } });

      const simpanBtn = screen.getByRole('button', { name: /Simpan Estimasi/i });
      fireEvent.click(simpanBtn);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Jumlah wajib diisi lebih dari 0')
      );
    });
  });

  describe('EditEstimasi validation', () => {
    test('Custom manual item valid di EditEstimasi tidak memunculkan error material wajib', async () => {
      estimasiAPI.getById.mockResolvedValue({
        id: '123',
        namaEstimasi: 'Estimasi Edit Test',
        namaClient: 'Client Edit',
        lokasi: 'Jakarta',
        items: [
          {
            barangId: '__manual__',
            isManual: true,
            jenisBentukManual: 'Custom',
            namaManual: 'Dop Stainless 1"',
            jumlahKeperluan: '10',
            hargamodalManual: '5000',
            satuanBarangManual: 'Bh',
            kategoriBarangManual: 'Lainnya',
            jenisBahanManual: '',
            beratJenisManual: '',
            minWeldingManual: '',
            beratbatangManual: '',
          },
        ],
      });

      render(<EditEstimasi />);
      await waitFor(() => expect(screen.getByText(/Edit Estimasi/i)).toBeInTheDocument());

      const updateBtn = screen.getByRole('button', { name: /Update Estimasi/i });
      fireEvent.click(updateBtn);

      expect(toast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Jenis Bahan, Berat Jenis, Min Welding wajib diisi')
      );
    });
  });
});
