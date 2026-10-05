import React from 'react';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock('jspdf', () => jest.fn());
jest.mock('jspdf-autotable', () => jest.fn());

import EditEstimasi from '../pages/EditEstimasi';
import { barangAPI, estimasiAPI, materialAPI } from '@/services/api';
import {
  buildDraftPayload,
  sanitizeTouchedItems,
  hydrateEstimasiItem,
  toNumberOrNull,
  toIntegerOrZero,
} from '@/utils/estimasiPayload';
import { calculateWithWasteReuse } from '@/utils/calculationEngine';

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
  useParams: () => ({ id: 'draft-identity-test' }),
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
}));

jest.mock('@/components/ui/calendar', () => ({ Calendar: () => null }));

describe('Requirement: Draft Item Identity Preservation Test Suite', () => {
  const masterBarangList = [
    {
      id: 10,
      nama: 'Besi Hollow 40x40',
      jenisBentuk: 'balok',
      hargamodal: 150000,
      hargajasa: 10000,
      panjang: 6000,
      satuan: 'Btg',
      satuanHargaModal: 'batang',
      supplier: 'Supplier Baja Utama',
    },
    {
      id: 11,
      nama: 'Pipa Seamless 2 inch',
      jenisBentuk: 'tabung',
      hargamodal: 220000,
      hargajasa: 15000,
      panjang: 6000,
      diameter: 50.8,
      satuan: 'Btg',
      satuanHargaModal: 'batang',
      supplier: 'Mega Baja',
    },
    {
      id: 20,
      nama: 'Engsel Pintu Heavy Duty',
      jenisBentuk: 'custom',
      hargamodal: 75000,
      hargajasa: 0,
      satuan: 'Bh',
      satuanHargaModal: 'unit',
      supplier: 'Aksesoris Teknik',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    barangAPI.getAll.mockResolvedValue(masterBarangList);
    materialAPI.getAll.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 1: DB Item A & B reload as DB items
  // ──────────────────────────────────────────────────────────────────────────
  test('Case 1: Multiple database items (Item A & Item B) preserve database identity through save and reload', () => {
    const rawFormItems = [
      {
        barangId: '10',
        isManual: false,
        kodeItem: 'A1',
        panjangJadi: '2000',
        panjangJadiInput: '2',
        jumlahKeperluan: '4',
      },
      {
        barangId: '11',
        isManual: false,
        kodeItem: 'B1',
        panjangJadi: '1500',
        panjangJadiInput: '1.5',
        jumlahKeperluan: '6',
      },
    ];

    const getEffectiveBarang = (id) => masterBarangList.find((b) => String(b.id) === String(id));

    // 1. Serialization (Autosave payload)
    const sanitized = sanitizeTouchedItems(rawFormItems, getEffectiveBarang);
    expect(sanitized).toHaveLength(2);
    expect(sanitized[0].barangId).toBe('10');
    expect(sanitized[0].isManual).toBe(false);
    expect(sanitized[0].savedDbId).toBe('10');
    expect(sanitized[0].namaBarang).toBe('Besi Hollow 40x40');

    expect(sanitized[1].barangId).toBe('11');
    expect(sanitized[1].isManual).toBe(false);
    expect(sanitized[1].savedDbId).toBe('11');
    expect(sanitized[1].namaBarang).toBe('Pipa Seamless 2 inch');

    // 2. Hydration (Reopening in EditEstimasi)
    const hydrated0 = hydrateEstimasiItem(sanitized[0], masterBarangList);
    const hydrated1 = hydrateEstimasiItem(sanitized[1], masterBarangList);

    expect(hydrated0.barangId).toBe('10');
    expect(hydrated0.isManual).toBe(false);
    expect(hydrated0.namaManual).toBe('');
    expect(hydrated0.savedDbId).toBe('10');

    expect(hydrated1.barangId).toBe('11');
    expect(hydrated1.isManual).toBe(false);
    expect(hydrated1.namaManual).toBe('');
    expect(hydrated1.savedDbId).toBe('11');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 2: Interleaved sequence: DB Item 1 + Manual Item + DB Item 2
  // ──────────────────────────────────────────────────────────────────────────
  test('Case 2: Interleaved sequence (DB Item 1, Manual Item, DB Item 2) preserves distinct identities', () => {
    const rawItems = [
      {
        barangId: '10',
        isManual: false,
        kodeItem: 'COL-1',
        panjangJadi: '3000',
        panjangJadiInput: '3',
        jumlahKeperluan: '2',
      },
      {
        barangId: '__manual__',
        isManual: true,
        namaManual: 'Plat Bracket Custom 10mm',
        hargamodalManual: '85000',
        jenisBentukManual: 'plat',
        panjangPlatManual: '300',
        lebarPlatManual: '200',
        ketebalanPlatManual: '10',
        jumlahKeperluan: '8',
      },
      {
        barangId: '11',
        isManual: false,
        kodeItem: 'PIPE-1',
        panjangJadi: '2500',
        panjangJadiInput: '2.5',
        jumlahKeperluan: '4',
      },
    ];

    const getEffectiveBarang = (id) => masterBarangList.find((b) => String(b.id) === String(id));
    const sanitized = sanitizeTouchedItems(rawItems, getEffectiveBarang);

    // Verify sanitized payload
    expect(sanitized[0].barangId).toBe('10');
    expect(sanitized[0].isManual).toBe(false);

    expect(sanitized[1].barangId).toBe('__manual__');
    expect(sanitized[1].isManual).toBe(true);
    expect(sanitized[1].namaBarang).toBe('Plat Bracket Custom 10mm');

    expect(sanitized[2].barangId).toBe('11');
    expect(sanitized[2].isManual).toBe(false);

    // Verify hydrated state
    const hydratedItems = sanitized.map((item) => hydrateEstimasiItem(item, masterBarangList));

    expect(hydratedItems[0].barangId).toBe('10');
    expect(hydratedItems[0].isManual).toBe(false);

    expect(hydratedItems[1].barangId).toBe('__manual__');
    expect(hydratedItems[1].isManual).toBe(true);
    expect(hydratedItems[1].namaManual).toBe('Plat Bracket Custom 10mm');
    expect(hydratedItems[1].panjangPlatManual).toBe('300');

    expect(hydratedItems[2].barangId).toBe('11');
    expect(hydratedItems[2].isManual).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 3: Manual items reload as manual items
  // ──────────────────────────────────────────────────────────────────────────
  test('Case 3: Standalone manual items reload cleanly with all manual dimensions and properties preserved', () => {
    const rawManualItem = {
      barangId: '__manual__',
      isManual: true,
      namaManual: 'Besi Beton Khusus 16mm',
      hargamodalManual: '95000',
      satuanHargaModalManual: 'batang',
      hargajasaManual: '5000',
      jenisBentukManual: 'tabung',
      diameterManual: '16',
      panjangManual: '12000',
      supplierManual: 'Supplier Khusus Cilegon',
      panjangJadi: '3000',
      panjangJadiInput: '3',
      jumlahKeperluan: '5',
    };

    const sanitized = sanitizeTouchedItems([rawManualItem], () => null);
    expect(sanitized[0].barangId).toBe('__manual__');
    expect(sanitized[0].isManual).toBe(true);
    expect(sanitized[0].namaBarang).toBe('Besi Beton Khusus 16mm');
    expect(sanitized[0].jenisBentuk).toBe('tabung');
    expect(sanitized[0].diameterManual).toBe(16);
    expect(sanitized[0].panjangManual).toBe(12000);
    expect(sanitized[0].supplier).toBe('Supplier Khusus Cilegon');

    const hydrated = hydrateEstimasiItem(sanitized[0], masterBarangList);
    expect(hydrated.barangId).toBe('__manual__');
    expect(hydrated.isManual).toBe(true);
    expect(hydrated.namaManual).toBe('Besi Beton Khusus 16mm');
    expect(hydrated.diameterManual).toBe('16');
    expect(hydrated.panjangManual).toBe('12000');
    expect(hydrated.supplierManual).toBe('Supplier Khusus Cilegon');
    expect(hydrated.jenisBentukManual).toBe('tabung');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 4: DB Custom Item retains DB ID and isManual: false
  // ──────────────────────────────────────────────────────────────────────────
  test('Case 4: Custom database item (jenisBentuk: custom) strictly retains database ID and isManual: false', () => {
    // Master barang item 20 is "Engsel Pintu Heavy Duty" (jenisBentuk: custom)
    const rawCustomDbItem = {
      barangId: '20',
      isManual: false,
      savedDbId: '20',
      jumlahKeperluan: '25',
    };

    const getEffectiveBarang = (id) => masterBarangList.find((b) => String(b.id) === String(id));
    const sanitized = sanitizeTouchedItems([rawCustomDbItem], getEffectiveBarang);

    expect(sanitized[0].barangId).toBe('20');
    expect(sanitized[0].isManual).toBe(false);
    expect(sanitized[0].savedDbId).toBe('20');
    expect(sanitized[0].namaBarang).toBe('Engsel Pintu Heavy Duty');
    expect(sanitized[0].jenisBentuk).toBe('custom');
    expect(sanitized[0].hargaSatuan).toBe(75000);
    expect(sanitized[0].subtotal).toBe(25 * 75000);

    const hydrated = hydrateEstimasiItem(sanitized[0], masterBarangList);
    expect(hydrated.barangId).toBe('20');
    expect(hydrated.isManual).toBe(false);
    expect(hydrated.namaManual).toBe(''); // Must not become manual
    expect(hydrated.savedDbId).toBe('20');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 5: Partial draft reloads as DB item without crash
  // ──────────────────────────────────────────────────────────────────────────
  test('Case 5: Partial draft with empty or null panjangJadi and zero jumlahKeperluan reloads as DB item', () => {
    const rawPartialItem = {
      barangId: '10',
      isManual: false,
      kodeItem: 'TEST-PARTIAL',
      panjangJadi: '',
      panjangJadiInput: '',
      jumlahKeperluan: '',
      volume: '',
    };

    const getEffectiveBarang = (id) => masterBarangList.find((b) => String(b.id) === String(id));
    const sanitized = sanitizeTouchedItems([rawPartialItem], getEffectiveBarang);

    expect(sanitized[0].barangId).toBe('10');
    expect(sanitized[0].isManual).toBe(false);
    expect(sanitized[0].panjangJadi).toBeNull(); // Numeric sanitizer guarantees null, not empty string!
    expect(sanitized[0].jumlahKeperluan).toBe(0);

    const hydrated = hydrateEstimasiItem(sanitized[0], masterBarangList);
    expect(hydrated.barangId).toBe('10');
    expect(hydrated.isManual).toBe(false);
    expect(hydrated.panjangJadi).toBe('');
    expect(hydrated.panjangJadiInput).toBe('');
    expect(hydrated.jumlahKeperluan).toBe('0');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 6: Calculation engine processes reloaded draft preserving item types
  // ──────────────────────────────────────────────────────────────────────────
  test('Case 6: Final calculation engine execution with reloaded draft items preserves item types and calculations', () => {
    const apiDraftItems = [
      {
        barangId: '10',
        isManual: false,
        kodeItem: 'BEAM-1',
        namaBarang: 'Besi Hollow 40x40',
        panjangJadi: 2000,
        jumlahKeperluan: 3,
        jenisBentuk: 'balok',
      },
      {
        barangId: '20',
        isManual: false,
        namaBarang: 'Engsel Pintu Heavy Duty',
        panjangJadi: null,
        jumlahKeperluan: 10,
        jenisBentuk: 'custom',
      },
      {
        barangId: '__manual__',
        isManual: true,
        namaManual: 'Karet Bantalan Custom',
        namaBarang: 'Karet Bantalan Custom',
        panjangJadi: null,
        jumlahKeperluan: 4,
        jenisBentukManual: 'custom',
        jenisBentuk: 'custom',
        hargamodalManual: '25000',
        hargaSatuan: 25000,
      },
    ];

    // Hydrate all items as done when opening EditEstimasi
    const hydratedList = apiDraftItems.map((item) => hydrateEstimasiItem(item, masterBarangList));

    // Verify hydrated types
    expect(hydratedList[0].isManual).toBe(false);
    expect(hydratedList[0].barangId).toBe('10');

    expect(hydratedList[1].isManual).toBe(false);
    expect(hydratedList[1].barangId).toBe('20');

    expect(hydratedList[2].isManual).toBe(true);
    expect(hydratedList[2].barangId).toBe('__manual__');

    // Run through calculation engine
    const luasPekerjaan = 10;
    const calcResult = calculateWithWasteReuse(hydratedList, luasPekerjaan, masterBarangList);

    expect(calcResult.itemDetails).toHaveLength(3);

    // Item 0: Hollow (bar/beam calculation)
    const hollowDetail = calcResult.itemDetails[0];
    expect(hollowDetail.barangId).toBe('10');
    expect(hollowDetail.namaBarang).toBe('Besi Hollow 40x40');
    expect(hollowDetail.subtotalMaterial).toBeGreaterThan(0);

    // Item 1: Custom DB item (direct unit quantity)
    const engselDetail = calcResult.itemDetails[1];
    expect(String(engselDetail.barangId)).toBe('20');
    expect(engselDetail.namaBarang).toBe('Engsel Pintu Heavy Duty');
    expect(engselDetail.jumlahKeperluan).toBe(10);
    expect(engselDetail.subtotalMaterial).toBe(10 * 75000);

    // Item 2: Custom manual item (direct unit quantity)
    const manualDetail = calcResult.itemDetails[2];
    expect(manualDetail.barangId).toBe('__manual__');
    expect(manualDetail.namaBarang).toBe('Karet Bantalan Custom');
    expect(manualDetail.jumlahKeperluan).toBe(4);
    expect(manualDetail.subtotalMaterial).toBe(4 * 25000);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INTEGRATION TEST: Full EditEstimasi page load and autosave cycle
  // ──────────────────────────────────────────────────────────────────────────
  test('Integration: EditEstimasi loads draft with mixed items and auto-saves without altering identities', async () => {
    const existingDraft = {
      id: 'draft-identity-test',
      status: 'draft',
      namaEstimasi: 'Estimasi Proyek Kantor Identity Test',
      namaClient: 'PT Sinergi Mandiri',
      lokasi: 'Jakarta Selatan',
      items: [
        {
          urutan: 1,
          barangId: '10',
          isManual: false,
          namaBarang: 'Besi Hollow 40x40',
          kodeItem: 'H-01',
          panjangJadi: 2500,
          jumlahKeperluan: 4,
          savedDbId: '10',
        },
        {
          urutan: 2,
          barangId: '20',
          isManual: false,
          namaBarang: 'Engsel Pintu Heavy Duty',
          panjangJadi: null,
          jumlahKeperluan: 12,
          jenisBentuk: 'custom',
          savedDbId: '20',
        },
        {
          urutan: 3,
          barangId: '__manual__',
          isManual: true,
          namaBarang: 'Braket Plat Khusus',
          namaManual: 'Braket Plat Khusus',
          panjangJadi: null,
          jumlahKeperluan: 6,
          jenisBentukManual: 'plat',
          hargamodalManual: '45000',
        },
      ],
    };

    estimasiAPI.getAll.mockResolvedValue([existingDraft]);
    estimasiAPI.getById.mockResolvedValue(existingDraft);
    estimasiAPI.update.mockResolvedValue({ ...existingDraft, id: 'draft-identity-test' });

    render(<EditEstimasi />);

    // Wait for data load
    await waitFor(() => {
      expect(estimasiAPI.getAll).toHaveBeenCalled();
    });

    // Check that form input has been populated
    await waitFor(() => {
      expect(screen.getByDisplayValue('Estimasi Proyek Kantor Identity Test')).toBeInTheDocument();
    });

    // Trigger draft autosave by triggering buildDraftPayload with the hydrated items
    const getEffectiveBarang = (id) => masterBarangList.find((b) => String(b.id) === String(id));
    const hydratedFromApi = existingDraft.items.map((it) => hydrateEstimasiItem(it, masterBarangList));
    const autosavePayload = buildDraftPayload(
      {
        namaEstimasi: existingDraft.namaEstimasi,
        namaClient: existingDraft.namaClient,
        lokasi: existingDraft.lokasi,
      },
      hydratedFromApi,
      getEffectiveBarang
    );

    // Verify autosave payload preserves exact identities
    expect(autosavePayload.items[0].barangId).toBe('10');
    expect(autosavePayload.items[0].isManual).toBe(false);
    expect(autosavePayload.items[0].savedDbId).toBe('10');

    expect(autosavePayload.items[1].barangId).toBe('20');
    expect(autosavePayload.items[1].isManual).toBe(false);
    expect(autosavePayload.items[1].savedDbId).toBe('20');

    expect(autosavePayload.items[2].barangId).toBe('__manual__');
    expect(autosavePayload.items[2].isManual).toBe(true);
    expect(autosavePayload.items[2].namaBarang).toBe('Braket Plat Khusus');
  });
});
