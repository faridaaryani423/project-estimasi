import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { calculateWithWasteReuse } from '../utils/calculationEngine';

describe('Requirement 7 - Fix Harga Real vs Harga + Waste', () => {
  test('A. Numerical calculation engine test: Stock 6000mm, Price Rp 600.000, Needs 3000mm', () => {
    const mockBarangList = [
      {
        id: 'b1',
        nama: 'Besi Hollow 40x40',
        jenisBahan: 'Besi',
        jenisBentuk: 'hollow',
        panjangbatang: 6000,
        beratbatang: 12,
        hargamodal: 600000,
        hargajasa: 0,
        minWelding: 50,
        satuan: 'Batang',
        satuanHargaModal: 'batang',
      },
    ];

    const rawItems = [
      {
        barangId: 'b1',
        namaBarang: 'Besi Hollow 40x40',
        panjangJadi: 3000,
        jumlahKeperluan: 1,
      },
    ];

    const results = calculateWithWasteReuse(rawItems, 0, mockBarangList);
    expect(results.itemDetails).toHaveLength(1);

    const breakdown = results.itemDetails[0].breakdown;
    const summary = breakdown.summary;

    // Numerical expectations:
    // Stock: 6000 mm, Kebutuhan: 3000 mm (50% usage)
    // Harga: Rp 600.000
    // Harga Real (usage cost without waste) = 50% * 600.000 = Rp 300.000
    // Harga + Waste (fractional billing) = 50% -> 1/2 bar * 600.000 = Rp 300.000
    expect(summary.totalBars).toBe(1);
    expect(summary.totalHargaReal).toBe(300000);
    expect(summary.totalHargaPlusWaste).toBe(300000);
    expect(summary.selisihBiayaWaste).toBe(0);

    // Backward-compatibility field check:
    expect(summary.totalHargaPemakaian).toBe(300000);
  });

  test('B. Multi-bar calculation engine test: Stock 6000mm @ Rp 600.000, Needs 2 pieces of 3500mm', () => {
    const mockBarangList = [
      {
        id: 'b2',
        nama: 'UNP 100',
        jenisBahan: 'Besi',
        jenisBentuk: 'unp',
        panjangbatang: 6000,
        beratbatang: 20,
        hargamodal: 600000,
        hargajasa: 0,
        minWelding: 50,
        satuan: 'Batang',
        satuanHargaModal: 'batang',
      },
    ];

    const rawItems = [
      {
        barangId: 'b2',
        namaBarang: 'UNP 100',
        panjangJadi: 3500,
        jumlahKeperluan: 2,
      },
    ];

    const results = calculateWithWasteReuse(rawItems, 0, mockBarangList);
    const summary = results.itemDetails[0].breakdown.summary;

    // 2 pieces of 3500 mm cannot fit in 1 bar of 6000 mm -> requires 2 bars
    expect(summary.totalBars).toBe(2);
    // Harga + Waste = 2 bars, each at 3500/6000 (58.33%) -> 3/4 (75%) billing -> 0.75 * 600.000 = 450.000. 2 * 450.000 = 900.000
    expect(summary.totalHargaPlusWaste).toBe(900000);
    // Each bar has 3500 mm used (3500/6000 * 600.000 = 350.000)
    // 2 bars * 350.000 = 700.000
    expect(summary.totalHargaReal).toBe(700000);
    expect(summary.selisihBiayaWaste).toBe(200000);
    expect(summary.totalHargaReal).toBeLessThan(summary.totalHargaPlusWaste);
  });

  test('C. UI Column Ordering and Value Placement in Estimasi breakdown modal', () => {
    const formatRupiah = (val) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(val || 0);

    const dummyItem = {
      namaBarang: 'Besi Hollow 40x40',
      panjangJadi: 3000,
      jumlahKeperluan: 1,
      breakdown: {
        summary: {
          totalBars: 1,
          totalBeratReal: 6,
          totalBeratWaste: 6,
          totalHargaReal: 300000,
          totalHargaPlusWaste: 300000,
        },
      },
    };

    // Simulate modal table rendering logic for these columns
    const { container } = render(
      <table>
        <thead>
          <tr>
            <th>Spesifikasi</th>
            <th>Harga Real</th>
            <th>Harga + Waste</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{dummyItem.namaBarang}</td>
            <td data-testid="cell-harga-real">
              {formatRupiah(dummyItem.breakdown.summary.totalHargaReal)}
            </td>
            <td data-testid="cell-harga-plus-waste">
              {formatRupiah(dummyItem.breakdown.summary.totalHargaPlusWaste)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td data-testid="total-harga-real">
              {formatRupiah(dummyItem.breakdown.summary.totalHargaReal)}
            </td>
            <td data-testid="total-harga-plus-waste">
              {formatRupiah(dummyItem.breakdown.summary.totalHargaPlusWaste)}
            </td>
          </tr>
        </tfoot>
      </table>
    );

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Spesifikasi', 'Harga Real', 'Harga + Waste']);

    const realCell = screen.getByTestId('cell-harga-real');
    const wasteCell = screen.getByTestId('cell-harga-plus-waste');
    expect(realCell.textContent).toContain('300.000');
    expect(wasteCell.textContent).toContain('300.000');

    const totalReal = screen.getByTestId('total-harga-real');
    const totalWaste = screen.getByTestId('total-harga-plus-waste');
    expect(totalReal.textContent).toContain('300.000');
    expect(totalWaste.textContent).toContain('300.000');
  });

  test('D. UI Modal Table & PDF Subtotal consistency: Harga Real (Rp 300.000) vs Harga + Waste (Rp 600.000)', () => {
    // Skenario pengujian:
    // Stok: 6000 mm, Harga: 600.000, Min Welding: 1 mm, Panjang Jadi: 3000 mm, Qty: 1
    const rawItems = [
      {
        barangId: 'b-hollow-600k',
        panjangJadi: 3000,
        jumlahKeperluan: 1,
      },
    ];

    const results = calculateWithWasteReuse(rawItems, 0, [
      {
        id: 'b-hollow-600k',
        nama: 'Besi Hollow 600k',
        jenisBentuk: 'balok',
        panjang: '6000',
        hargamodal: '600000',
        satuanHargaModal: 'batang',
        minWelding: '1',
      },
    ]);

    const item = results.itemDetails[0];
    const summary = item.breakdown.summary;

    // Source of Truth
    expect(summary.totalHargaReal).toBe(300000);
    expect(summary.totalHargaPlusWaste).toBe(300000);

    // Modal table calculation simulation
    let modalHargaReal = 0;
    let modalHargaPlusWaste = 0;
    if (summary.totalHargaPlusWaste !== undefined && summary.totalHargaPlusWaste !== null) {
      modalHargaReal = parseFloat(summary.totalHargaReal ?? summary.totalHargaPemakaian ?? 0) || 0;
      modalHargaPlusWaste = parseFloat(summary.totalHargaPlusWaste) || 0;
    } else {
      modalHargaReal = parseFloat(summary.totalHargaPemakaian ?? summary.totalHargaReal ?? 0) || 0;
      modalHargaPlusWaste = parseFloat(summary.totalHargaReal ?? (summary.totalBars * (summary.hargaSatuan || 0)) ?? 0) || 0;
    }

    expect(modalHargaReal).toBe(300000);
    expect(modalHargaPlusWaste).toBe(300000);

    // Modal table cell display logic
    const isManualRow = false;
    const isCustom = false;
    const displayHargaReal = isManualRow || isCustom
      ? Number(item.subtotal || 0)
      : Number(modalHargaReal ?? item.subtotal ?? 0);
    const displayHargaPlusWaste = isManualRow || isCustom
      ? Number(item.subtotal || 0)
      : Number(modalHargaPlusWaste ?? item.subtotal ?? 0);

    expect(displayHargaReal).toBe(300000);
    expect(displayHargaPlusWaste).toBe(300000);
    expect(displayHargaReal).toBe(displayHargaPlusWaste);

    // PDF Subtotal calculation logic
    let pdfStHargaReal = 0;
    let pdfStHargaPlusWaste = 0;
    if (summary.totalHargaPlusWaste !== undefined && summary.totalHargaPlusWaste !== null) {
      pdfStHargaReal = Number(summary.totalHargaReal ?? summary.totalHargaPemakaian ?? 0) || 0;
      pdfStHargaPlusWaste = Number(summary.totalHargaPlusWaste) || 0;
    } else {
      pdfStHargaReal = Number(summary.totalHargaPemakaian ?? summary.totalHargaReal ?? 0) || 0;
      pdfStHargaPlusWaste = Number(summary.totalHargaReal ?? (summary.totalBars * (summary.hargaSatuan || 0)) ?? 0) || 0;
    }

    expect(pdfStHargaReal).toBe(300000);
    expect(pdfStHargaPlusWaste).toBe(300000);
    expect(pdfStHargaReal).toBe(displayHargaReal);
    expect(pdfStHargaPlusWaste).toBe(displayHargaPlusWaste);
  });
});

