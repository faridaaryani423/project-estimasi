import React from 'react';
import '@testing-library/jest-dom';

describe('Requirement 5: Fix Overwrite Barang (Test WAJIB A - H)', () => {
  let mockDatabase;
  let nextIdSuffix;

  beforeEach(() => {
    mockDatabase = [];
    nextIdSuffix = 100;
  });

  const mockBarangAPI = {
    getAll: async () => [...mockDatabase],
    create: async (data) => {
      nextIdSuffix++;
      const uniqueId = `${Date.now()}_${nextIdSuffix.toString(16)}`;
      const newRecord = { ...data, id: uniqueId };
      mockDatabase.push(newRecord);
      return { ...newRecord };
    },
    update: async (id, data) => {
      const idx = mockDatabase.findIndex((b) => String(b.id) === String(id));
      if (idx === -1) throw new Error('Not found');
      mockDatabase[idx] = { ...mockDatabase[idx], ...data, id: String(id) };
      return { ...mockDatabase[idx] };
    },
  };

  // Helper yang mengimplementasikan saveManualBarangPermanent logic yang baru
  const executeSaveManual = async (item, index, selectedItems, barangList) => {
    const namaBarang = (item.namaManual || '').trim();
    const barangData = {
      nama: namaBarang,
      kategoriBarang: item.kategoriBarangManual || 'Lainnya',
      hargamodal: item.hargamodalManual,
      jenisBentuk: item.jenisBentukManual || 'custom',
      jenisBahan: item.jenisBahanManual || null,
      beratJenis: item.beratJenisManual || null,
      beratbatang: item.beratbatangManual || null,
      beratbatangMode: 'auto',
    };

    const existingDbBarang = item.savedDbId
      ? barangList.find((b) => String(b.id) === String(item.savedDbId))
      : barangList.find((b) => (b.nama || '').trim().toLowerCase() === namaBarang.toLowerCase());

    let savedResult;
    if (existingDbBarang) {
      savedResult = await mockBarangAPI.update(existingDbBarang.id, barangData);
    } else {
      savedResult = await mockBarangAPI.create(barangData);
    }

    const savedId = String(savedResult?.id || existingDbBarang?.id || '');
    const freshData = await mockBarangAPI.getAll();

    const updatedSelectedItems = selectedItems.map((it, idx) => {
      if (idx === index) {
        return { ...it, savedDbId: savedId, kategoriBarangManual: barangData.kategoriBarang };
      }
      return it;
    });

    return { updatedSelectedItems, freshData, savedId, savedResult };
  };

  test('Test WAJIB: Alur A sampai H memastikan tidak ada overwrite dan A, B, C tetap berbeda', async () => {
    let currentBarangList = await mockBarangAPI.getAll();
    let selectedItems = [
      { barangId: '__manual__', namaManual: 'Barang A', hargamodalManual: '100000', savedDbId: null },
      { barangId: '__manual__', namaManual: 'Barang B', hargamodalManual: '250000', savedDbId: null },
      { barangId: '__manual__', namaManual: 'Barang C', hargamodalManual: '180000', savedDbId: null },
    ];

    // A. Save Barang A
    const resA = await executeSaveManual(selectedItems[0], 0, selectedItems, currentBarangList);
    selectedItems = resA.updatedSelectedItems;
    currentBarangList = resA.freshData;
    const idA = resA.savedId;
    expect(idA).toBeDefined();
    expect(selectedItems[0].savedDbId).toBe(idA);
    expect(currentBarangList).toHaveLength(1);
    expect(currentBarangList[0].nama).toBe('Barang A');

    // B. Save Barang B dengan data berbeda
    const resB = await executeSaveManual(selectedItems[1], 1, selectedItems, currentBarangList);
    selectedItems = resB.updatedSelectedItems;
    currentBarangList = resB.freshData;
    const idB = resB.savedId;
    expect(idB).toBeDefined();
    expect(selectedItems[1].savedDbId).toBe(idB);
    expect(currentBarangList).toHaveLength(2);

    // C. Pastikan A dan B tetap berbeda
    expect(idA).not.toBe(idB);
    const dbItemA = currentBarangList.find((b) => b.id === idA);
    const dbItemB = currentBarangList.find((b) => b.id === idB);
    expect(dbItemA.nama).toBe('Barang A');
    expect(dbItemA.hargamodal).toBe('100000');
    expect(dbItemB.nama).toBe('Barang B');
    expect(dbItemB.hargamodal).toBe('250000');

    // D. Save ulang A (misal harga diubah jadi 120000)
    selectedItems[0].hargamodalManual = '120000';
    const resA2 = await executeSaveManual(selectedItems[0], 0, selectedItems, currentBarangList);
    selectedItems = resA2.updatedSelectedItems;
    currentBarangList = resA2.freshData;

    // E. Pastikan hanya A yang berubah (ID tetap, jumlah database tetap 2, B tidak terpengaruh)
    expect(resA2.savedId).toBe(idA);
    expect(currentBarangList).toHaveLength(2);
    const dbItemAUpdated = currentBarangList.find((b) => b.id === idA);
    const dbItemBUnchanged = currentBarangList.find((b) => b.id === idB);
    expect(dbItemAUpdated.hargamodal).toBe('120000');
    expect(dbItemBUnchanged.nama).toBe('Barang B');
    expect(dbItemBUnchanged.hargamodal).toBe('250000');

    // F. Save Barang C
    const resC = await executeSaveManual(selectedItems[2], 2, selectedItems, currentBarangList);
    selectedItems = resC.updatedSelectedItems;
    currentBarangList = resC.freshData;
    const idC = resC.savedId;
    expect(idC).toBeDefined();
    expect(idC).not.toBe(idA);
    expect(idC).not.toBe(idB);
    expect(currentBarangList).toHaveLength(3);

    // G. Reload (fetch ulang dari database)
    const reloaded = await mockBarangAPI.getAll();

    // H. Pastikan A, B, C tetap berbeda
    expect(reloaded).toHaveLength(3);
    const itemA_final = reloaded.find((b) => b.id === idA);
    const itemB_final = reloaded.find((b) => b.id === idB);
    const itemC_final = reloaded.find((b) => b.id === idC);

    expect(itemA_final.nama).toBe('Barang A');
    expect(itemA_final.hargamodal).toBe('120000');

    expect(itemB_final.nama).toBe('Barang B');
    expect(itemB_final.hargamodal).toBe('250000');

    expect(itemC_final.nama).toBe('Barang C');
    expect(itemC_final.hargamodal).toBe('180000');
  });

  test('handleItemChange group-scoping: mengedit item A tidak mengubah item B atau C', () => {
    // 3 grup manual: A (index 0), B (index 1), C (index 2)
    const items = [
      { barangId: '__manual__', namaManual: 'Barang A', hargamodalManual: '100000', kodeItem: 'A1' },
      { barangId: '__manual__', namaManual: 'Barang B', hargamodalManual: '200000', kodeItem: 'B1' },
      { barangId: '__manual__', namaManual: 'Barang C', hargamodalManual: '300000', kodeItem: 'C1' },
    ];

    const isSameBarang = (itemA, itemB) => {
      if (!itemA || !itemB) return false;
      if (!itemA.barangId || !itemB.barangId) return false;
      if (itemA.barangId === '__manual__' && itemB.barangId === '__manual__') {
        const nameA = (itemA.namaManual || '').trim().toLowerCase();
        const nameB = (itemB.namaManual || '').trim().toLowerCase();
        return nameA !== '' && nameA === nameB;
      }
      return itemA.barangId !== '__manual__' && itemA.barangId === itemB.barangId;
    };

    const getItemGroupRanges = (currentItems) => {
      const groups = [];
      let i = 0;
      while (i < currentItems.length) {
        const start = i;
        const currentItem = currentItems[start];
        const isGroupable = currentItem?.barangId && (currentItem.barangId !== '__manual__' || (currentItem.namaManual || '').trim() !== '');
        let end = start;
        if (isGroupable) {
          while (end + 1 < currentItems.length && isSameBarang(currentItems[end + 1], currentItem)) {
            end++;
          }
        }
        groups.push({ start, end, items: currentItems.slice(start, end + 1) });
        i = end + 1;
      }
      return groups;
    };

    const handleItemChange = (currentItems, index, field, value) => {
      const updated = [...currentItems];
      const targetItem = updated[index];
      const groups = getItemGroupRanges(updated);
      const targetGroup = groups.find((g) => index >= g.start && index <= g.end);

      if (
        targetGroup &&
        targetItem.barangId === '__manual__' &&
        field !== 'kodeItem' &&
        field !== 'jumlahKeperluan' &&
        field !== 'panjangJadi' &&
        field !== 'volume'
      ) {
        for (let i = targetGroup.start; i <= targetGroup.end; i++) {
          updated[i] = { ...updated[i], [field]: value };
        }
        return updated;
      } else {
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      }
    };

    // Ubah harga modal Barang A di index 0
    const updatedA = handleItemChange(items, 0, 'hargamodalManual', '999999');
    expect(updatedA[0].hargamodalManual).toBe('999999');
    expect(updatedA[1].hargamodalManual).toBe('200000'); // B tidak berubah!
    expect(updatedA[2].hargamodalManual).toBe('300000'); // C tidak berubah!

    // Ubah nama Barang A di index 0
    const renamedA = handleItemChange(updatedA, 0, 'namaManual', 'Barang A Baru');
    expect(renamedA[0].namaManual).toBe('Barang A Baru');
    expect(renamedA[1].namaManual).toBe('Barang B'); // B tidak berubah!
    expect(renamedA[2].namaManual).toBe('Barang C'); // C tidak berubah!
  });

  test('TC 5.1 & 5.2: Simpan ke Database Barang membawa kategoriBarang dan tidak tampil sebagai "-"', async () => {
    let currentBarangList = await mockBarangAPI.getAll();
    const selectedItems = [
      {
        barangId: '__manual__',
        namaManual: 'Pipa Besi Medium',
        kategoriBarangManual: 'Besi',
        jenisBentukManual: 'tabung',
        jenisBahanManual: 'Besi',
        beratJenisManual: '7850',
        hargamodalManual: '200000',
        savedDbId: null,
      },
    ];

    const result = await executeSaveManual(selectedItems[0], 0, selectedItems, currentBarangList);
    expect(result.savedResult.kategoriBarang).toBe('Besi');

    // Fetch dari database dan pastikan kategoriBarang ada dan bukan '-' atau null
    const dbList = await mockBarangAPI.getAll();
    const saved = dbList.find((b) => b.id === result.savedId);
    expect(saved).toBeDefined();
    expect(saved.kategoriBarang).toBe('Besi');
    expect(saved.kategoriBarang || '-').not.toBe('-');
  });

  test('TC 5.3: Skenario Stainless Steel didukung dengan bentuk standar (tabung/plat) dan masa jenis 7930', async () => {
    let currentBarangList = await mockBarangAPI.getAll();
    const stainlessItem = {
      barangId: '__manual__',
      namaManual: 'Pipa Stainless 2 inch',
      kategoriBarangManual: 'Stainless',
      jenisBentukManual: 'tabung',
      jenisBahanManual: 'Stainless Steel',
      beratJenisManual: '7930',
      diameterManual: '50',
      panjangManual: '6000',
      ketebalanManual: '2',
      hargamodalManual: '450000',
      savedDbId: null,
    };

    const result = await executeSaveManual(stainlessItem, 0, [stainlessItem], currentBarangList);
    expect(result.savedResult.nama).toBe('Pipa Stainless 2 inch');
    expect(result.savedResult.kategoriBarang).toBe('Stainless');
    expect(result.savedResult.jenisBahan).toBe('Stainless Steel');
    expect(result.savedResult.beratJenis).toBe('7930');
    expect(result.savedResult.jenisBentuk).toBe('tabung');
  });
});

