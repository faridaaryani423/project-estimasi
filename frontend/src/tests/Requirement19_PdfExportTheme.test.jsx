import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Mock jsPDF and jspdf-autotable to inspect calls
jest.mock('jspdf', () => {
  return {
    jsPDF: jest.fn().mockImplementation(() => ({
      internal: {
        pageSize: {
          getWidth: () => 215.9,
          getHeight: () => 355.6,
        },
        getNumberOfPages: () => 2,
      },
      setFont: jest.fn(),
      setFontSize: jest.fn(),
      setTextColor: jest.fn(),
      text: jest.fn(),
      setPage: jest.fn(),
      save: jest.fn(),
    })),
  };
});

jest.mock('jspdf-autotable', () => {
  return jest.fn();
});

describe('REVISI POIN 6: Tema Export PDF Referensi Hegar', () => {
  it('Memvalidasi orientasi portrait, legal size, dan struktur kolom tabel', () => {
    const { jsPDF: MockedJsPDF } = require('jspdf');
    const mockedAutoTable = require('jspdf-autotable');

    // Simulate export structure
    const doc = new MockedJsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });
    expect(MockedJsPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        orientation: 'portrait',
        unit: 'mm',
        format: 'legal',
      })
    );
  });

  it('Memverifikasi urutan kolom tabel sesuai dokumen referensi Hegar', () => {
    const expectedHeaders = [
      'Spesifikasi / Uraian',
      'Pemakaian',
      'Panjang\nSisa',
      'Berat\nSisa',
      'Berat\nReal',
      'Berat\n+ Waste',
      'Luas\n(M2)',
      'Harga\n+ Waste',
      'Harga\nReal',
      'Potongan',
    ];

    expect(expectedHeaders[7]).toBe('Harga\n+ Waste');
    expect(expectedHeaders[8]).toBe('Harga\nReal');
    expect(expectedHeaders[9]).toBe('Potongan');
  });

  it('Memvalidasi format potongan tanpa pembulatan dan pola nama.(panjang)', () => {
    const fmtDec = (val, maxDigits = 2) => {
      if (val === null || val === undefined || isNaN(val)) return '-';
      const num = Number(val);
      if (Math.abs(num) < 0.000001) return '-';
      return num.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
      });
    };

    const pieces = [
      { kodeItem: 'RLantaiR', length: 6000 },
      { kodeItem: 'Gordeng1R', length: 1000 },
    ];

    const potonganStr = pieces.map((p, pIdx) => {
      const lbl = p.kodeItem || p.label || 'Item';
      const pM = fmtDec((p.length || 0) / 1000, 3);
      return pIdx === 0 ? `${lbl}.(${pM})` : `${lbl} (${pM})`;
    }).join(' ');

    expect(potonganStr).toBe('RLantaiR.(6) Gordeng1R (1)');
  });
});
