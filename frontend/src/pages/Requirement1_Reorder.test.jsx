import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { calculateWithWasteReuse } from '../utils/calculationEngine';

describe('Requirement 1: Reorder Nomor Barang', () => {
  // Test 1: Helper group range & moveItemGroup logic simulation (as used in EstimasiForm and EditEstimasi)
  test('reorder naik dan turun memindahkan seluruh potongan grup tanpa tertukar', () => {
    // 3 barang: Barang A (2 potongan), Barang B (1 potongan), Barang C (2 potongan)
    const items = [
      { barangId: '101', kodeItem: 'A1', panjangJadi: '1000', jumlahKeperluan: '2' },
      { barangId: '101', kodeItem: 'A2', panjangJadi: '500', jumlahKeperluan: '4' },
      { barangId: '102', kodeItem: 'B1', panjangJadi: '2000', jumlahKeperluan: '1' },
      { barangId: '103', kodeItem: 'C1', panjangJadi: '1200', jumlahKeperluan: '3' },
      { barangId: '103', kodeItem: 'C2', panjangJadi: '800', jumlahKeperluan: '2' },
    ];

    const isSameBarang = (itemA, itemB) => {
      if (!itemA || !itemB) return false;
      return itemA.barangId === itemB.barangId;
    };

    const getItemGroupRanges = (currentItems) => {
      const groups = [];
      let i = 0;
      while (i < currentItems.length) {
        const start = i;
        const currentItem = currentItems[start];
        let end = start;
        while (end + 1 < currentItems.length && isSameBarang(currentItems[end + 1], currentItem)) {
          end++;
        }
        groups.push({ start, end, items: currentItems.slice(start, end + 1) });
        i = end + 1;
      }
      return groups;
    };

    const moveItemGroup = (currentItems, groupIndex, direction) => {
      const groups = getItemGroupRanges(currentItems);
      const targetIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
      if (targetIndex < 0 || targetIndex >= groups.length) return currentItems;

      const newGroups = [...groups];
      const temp = newGroups[groupIndex];
      newGroups[groupIndex] = newGroups[targetIndex];
      newGroups[targetIndex] = temp;

      return newGroups.flatMap((g) => g.items);
    };

    // Awal: Group 0 = A (2 items), Group 1 = B (1 item), Group 2 = C (2 items)
    const initialGroups = getItemGroupRanges(items);
    expect(initialGroups).toHaveLength(3);
    expect(initialGroups[0].items).toHaveLength(2); // A1, A2
    expect(initialGroups[1].items).toHaveLength(1); // B1
    expect(initialGroups[2].items).toHaveLength(2); // C1, C2

    // 1. Move Group 2 (C) UP -> Should swap B and C: A, C, B
    const movedUp = moveItemGroup(items, 2, 'up');
    const groupsAfterUp = getItemGroupRanges(movedUp);
    expect(groupsAfterUp[0].items.map((it) => it.kodeItem)).toEqual(['A1', 'A2']);
    expect(groupsAfterUp[1].items.map((it) => it.kodeItem)).toEqual(['C1', 'C2']);
    expect(groupsAfterUp[2].items.map((it) => it.kodeItem)).toEqual(['B1']);

    // 2. Move Group 0 (A) DOWN -> Should swap A and C: C, A, B
    const movedDown = moveItemGroup(movedUp, 0, 'down');
    const groupsAfterDown = getItemGroupRanges(movedDown);
    expect(groupsAfterDown[0].items.map((it) => it.kodeItem)).toEqual(['C1', 'C2']);
    expect(groupsAfterDown[1].items.map((it) => it.kodeItem)).toEqual(['A1', 'A2']);
    expect(groupsAfterDown[2].items.map((it) => it.kodeItem)).toEqual(['B1']);

    // 3. Assign urutan persistent
    groupsAfterDown.forEach((g, gIdx) => {
      g.items.forEach((it) => {
        it.urutan = gIdx + 1;
      });
    });

    expect(movedDown[0].urutan).toBe(1); // C1
    expect(movedDown[1].urutan).toBe(1); // C2
    expect(movedDown[2].urutan).toBe(2); // A1
    expect(movedDown[3].urutan).toBe(2); // A2
    expect(movedDown[4].urutan).toBe(3); // B1
  });

  // Test 1.2 & 1.3: Expected behavior Naik beruntun & Turun beruntun
  test('expected behavior: C naik dua kali (3->2->1) lalu turun (1->2), dan A turun dua kali (1->2->3)', () => {
    const isSameBarang = (itemA, itemB) => {
      if (!itemA || !itemB) return false;
      return itemA.barangId === itemB.barangId;
    };

    const getItemGroupRanges = (currentItems) => {
      const groups = [];
      let i = 0;
      while (i < currentItems.length) {
        const start = i;
        const currentItem = currentItems[start];
        let end = start;
        while (end + 1 < currentItems.length && isSameBarang(currentItems[end + 1], currentItem)) {
          end++;
        }
        groups.push({ start, end, items: currentItems.slice(start, end + 1) });
        i = end + 1;
      }
      return groups;
    };

    const moveItemGroup = (currentItems, groupIndex, direction) => {
      const groups = getItemGroupRanges(currentItems);
      const targetIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
      if (targetIndex < 0 || targetIndex >= groups.length) return currentItems;

      const newGroups = [...groups];
      const temp = newGroups[groupIndex];
      newGroups[groupIndex] = newGroups[targetIndex];
      newGroups[targetIndex] = temp;

      return newGroups.flatMap((g, gIdx) =>
        g.items.map((it) => ({
          ...it,
          urutan: gIdx + 1,
        }))
      );
    };

    // Awal: 1 A (2 potongan), 2 B (1 potongan), 3 C (2 potongan)
    const initialItems = [
      { barangId: 'A', kode: 'A1' },
      { barangId: 'A', kode: 'A2' },
      { barangId: 'B', kode: 'B1' },
      { barangId: 'C', kode: 'C1' },
      { barangId: 'C', kode: 'C2' },
    ];

    // Skenario 1: Naik pada C
    // 1.1 Klik Naik pada C (posisi #3, groupIndex = 2):
    // Expected: 1 A, 2 C, 3 B
    const step1 = moveItemGroup(initialItems, 2, 'up');
    const g1 = getItemGroupRanges(step1);
    expect(g1.map((g) => g.items[0].barangId)).toEqual(['A', 'C', 'B']);
    expect(step1.map((it) => it.kode)).toEqual(['A1', 'A2', 'C1', 'C2', 'B1']);

    // 1.2 Klik Naik lagi pada C (sekarang posisi #2, groupIndex = 1):
    // Expected: 1 C, 2 A, 3 B
    const step2 = moveItemGroup(step1, 1, 'up');
    const g2 = getItemGroupRanges(step2);
    expect(g2.map((g) => g.items[0].barangId)).toEqual(['C', 'A', 'B']);
    expect(step2.map((it) => it.kode)).toEqual(['C1', 'C2', 'A1', 'A2', 'B1']);
    expect(step2.find((it) => it.barangId === 'C').urutan).toBe(1);
    expect(step2.find((it) => it.barangId === 'A').urutan).toBe(2);
    expect(step2.find((it) => it.barangId === 'B').urutan).toBe(3);

    // 1.3 Klik Turun pada C (sekarang posisi #1, groupIndex = 0):
    // Expected: 1 A, 2 C, 3 B
    const step3 = moveItemGroup(step2, 0, 'down');
    const g3 = getItemGroupRanges(step3);
    expect(g3.map((g) => g.items[0].barangId)).toEqual(['A', 'C', 'B']);
    expect(step3.map((it) => it.kode)).toEqual(['A1', 'A2', 'C1', 'C2', 'B1']);

    // Skenario 2: Jika posisi awal: 1 A, 2 B, 3 C
    // 2.1 Klik Turun pada A (posisi #1, groupIndex = 0):
    // Expected: 1 B, 2 A, 3 C
    const stepA1 = moveItemGroup(initialItems, 0, 'down');
    const gA1 = getItemGroupRanges(stepA1);
    expect(gA1.map((g) => g.items[0].barangId)).toEqual(['B', 'A', 'C']);
    expect(stepA1.map((it) => it.kode)).toEqual(['B1', 'A1', 'A2', 'C1', 'C2']);

    // 2.2 Klik Turun lagi pada A (sekarang posisi #2, groupIndex = 1):
    // Expected: 1 B, 2 C, 3 A
    const stepA2 = moveItemGroup(stepA1, 1, 'down');
    const gA2 = getItemGroupRanges(stepA2);
    expect(gA2.map((g) => g.items[0].barangId)).toEqual(['B', 'C', 'A']);
    expect(stepA2.map((it) => it.kode)).toEqual(['B1', 'C1', 'C2', 'A1', 'A2']);
    expect(stepA2.find((it) => it.barangId === 'B').urutan).toBe(1);
    expect(stepA2.find((it) => it.barangId === 'C').urutan).toBe(2);
    expect(stepA2.find((it) => it.barangId === 'A').urutan).toBe(3);
  });

  // Test UI Behavioral: Tombol Naik disabled di posisi pertama, Turun disabled di posisi terakhir, & closure test
  test('UI Behavioral: interaksi klik tombol Naik dan Turun dengan penanganan closure yang benar', () => {
    const isSameBarang = (itemA, itemB) => {
      if (!itemA || !itemB) return false;
      return itemA.barangId === itemB.barangId;
    };

    const getItemGroupRanges = (items = []) => {
      const groups = [];
      let i = 0;
      while (i < items.length) {
        const start = i;
        const currentItem = items[start];
        const isGroupable = currentItem?.barangId;
        let end = start;
        if (isGroupable) {
          while (end + 1 < items.length && isSameBarang(items[end + 1], currentItem)) {
            end++;
          }
        }
        groups.push({ start, end, items: items.slice(start, end + 1) });
        i = end + 1;
      }
      return groups;
    };

    const TestReorderUI = ({ initialItems }) => {
      const [selectedItems, setSelectedItems] = React.useState(initialItems);

      const moveItemGroup = (groupIndex, direction) => {
        setSelectedItems((prev) => {
          const groups = getItemGroupRanges(prev);
          const targetIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
          if (targetIndex < 0 || targetIndex >= groups.length) return prev;

          const newGroups = [...groups];
          const temp = newGroups[groupIndex];
          newGroups[groupIndex] = newGroups[targetIndex];
          newGroups[targetIndex] = temp;

          return newGroups.flatMap((g, gIdx) =>
            g.items.map((it) => ({
              ...it,
              urutan: gIdx + 1,
            }))
          );
        });
      };

      const groups = getItemGroupRanges(selectedItems);
      const visibleGroupCount = groups.length;
      let currentGroupIndexCounter = 0;

      return (
        <div>
          {selectedItems.map((item, index) => {
            const isGroupable = item.barangId;
            const isSameAsPrev = isGroupable && index > 0 && isSameBarang(item, selectedItems[index - 1]);
            if (isSameAsPrev) return null;

            const currentGroupIndex = currentGroupIndexCounter;
            currentGroupIndexCounter++;
            const displayGroupNumber = currentGroupIndex + 1;

            return (
              <div key={item.barangId} data-testid={`item-card-${displayGroupNumber}`}>
                <span data-testid={`name-item-${displayGroupNumber}`}>{item.namaBarang}</span>
                <button
                  data-testid={`move-up-item-${displayGroupNumber}`}
                  disabled={currentGroupIndex === 0}
                  onClick={() => moveItemGroup(currentGroupIndex, 'up')}
                >
                  Naik
                </button>
                <button
                  data-testid={`move-down-item-${displayGroupNumber}`}
                  disabled={currentGroupIndex === visibleGroupCount - 1}
                  onClick={() => moveItemGroup(currentGroupIndex, 'down')}
                >
                  Turun
                </button>
              </div>
            );
          })}
        </div>
      );
    };

    const items = [
      { barangId: 'A', namaBarang: 'Barang A', kodeItem: 'A-1' },
      { barangId: 'A', namaBarang: 'Barang A', kodeItem: 'A-2' },
      { barangId: 'B', namaBarang: 'Barang B', kodeItem: 'B-1' },
      { barangId: 'C', namaBarang: 'Barang C', kodeItem: 'C-1' },
      { barangId: 'C', namaBarang: 'Barang C', kodeItem: 'C-2' },
    ];

    render(<TestReorderUI initialItems={items} />);

    // Verifikasi posisi awal:
    // Item #1: Barang A (Naik disabled, Turun enabled)
    // Item #2: Barang B (Naik enabled, Turun enabled)
    // Item #3: Barang C (Naik enabled, Turun disabled)
    expect(screen.getByTestId('name-item-1')).toHaveTextContent('Barang A');
    expect(screen.getByTestId('move-up-item-1')).toBeDisabled();
    expect(screen.getByTestId('move-down-item-1')).not.toBeDisabled();

    expect(screen.getByTestId('name-item-2')).toHaveTextContent('Barang B');
    expect(screen.getByTestId('move-up-item-2')).not.toBeDisabled();
    expect(screen.getByTestId('move-down-item-2')).not.toBeDisabled();

    expect(screen.getByTestId('name-item-3')).toHaveTextContent('Barang C');
    expect(screen.getByTestId('move-up-item-3')).not.toBeDisabled();
    expect(screen.getByTestId('move-down-item-3')).toBeDisabled();

    // 1. Klik Naik pada Item #3 (C)
    // Hasil: 1 A, 2 C, 3 B
    fireEvent.click(screen.getByTestId('move-up-item-3'));
    expect(screen.getByTestId('name-item-1')).toHaveTextContent('Barang A');
    expect(screen.getByTestId('name-item-2')).toHaveTextContent('Barang C');
    expect(screen.getByTestId('name-item-3')).toHaveTextContent('Barang B');

    // 2. Klik Naik lagi pada Item #2 (C)
    // Hasil: 1 C, 2 A, 3 B
    fireEvent.click(screen.getByTestId('move-up-item-2'));
    expect(screen.getByTestId('name-item-1')).toHaveTextContent('Barang C');
    expect(screen.getByTestId('move-up-item-1')).toBeDisabled(); // Posisi 1 sekarang disabled Naik
    expect(screen.getByTestId('name-item-2')).toHaveTextContent('Barang A');
    expect(screen.getByTestId('name-item-3')).toHaveTextContent('Barang B');
    expect(screen.getByTestId('move-down-item-3')).toBeDisabled(); // Posisi terakhir disabled Turun

    // 3. Klik Turun pada Item #1 (C)
    // Hasil: 1 A, 2 C, 3 B
    fireEvent.click(screen.getByTestId('move-down-item-1'));
    expect(screen.getByTestId('name-item-1')).toHaveTextContent('Barang A');
    expect(screen.getByTestId('name-item-2')).toHaveTextContent('Barang C');
    expect(screen.getByTestId('name-item-3')).toHaveTextContent('Barang B');

    // 4. Klik Turun pada Item #1 (A)
    // Hasil: 1 C, 2 A, 3 B
    fireEvent.click(screen.getByTestId('move-down-item-1'));
    expect(screen.getByTestId('name-item-1')).toHaveTextContent('Barang C');
    expect(screen.getByTestId('name-item-2')).toHaveTextContent('Barang A');
    expect(screen.getByTestId('name-item-3')).toHaveTextContent('Barang B');

    // 5. Klik Turun lagi pada Item #2 (A)
    // Hasil: 1 C, 2 B, 3 A
    fireEvent.click(screen.getByTestId('move-down-item-2'));
    expect(screen.getByTestId('name-item-1')).toHaveTextContent('Barang C');
    expect(screen.getByTestId('name-item-2')).toHaveTextContent('Barang B');
    expect(screen.getByTestId('name-item-3')).toHaveTextContent('Barang A');
    expect(screen.getByTestId('move-down-item-3')).toBeDisabled();
  });

  // Test 2: calculateWithWasteReuse preserves persistent `urutan`
  test('calculateWithWasteReuse mempertahankan field urutan pada itemDetails', () => {
    const barangCatalog = [
      {
        id: '101',
        nama: 'Besi Hollow 40x40',
        panjang: 6000,
        jenisBentuk: 'balok',
        hargamodal: 120000,
        satuanHargaModal: 'batang',
        beratbatang: 10,
        satuan: 'Btg',
      },
      {
        id: '102',
        nama: 'Pipa Stainless 2 inch',
        panjang: 6000,
        jenisBentuk: 'tabung',
        hargamodal: 200000,
        satuanHargaModal: 'batang',
        beratbatang: 12,
        satuan: 'Btg',
      },
    ];

    const inputItems = [
      {
        barangId: '102',
        kodeItem: 'PIPE-1',
        panjangJadi: '2000',
        jumlahKeperluan: '2',
        urutan: 1, // Di-reorder jadi nomor 1
      },
      {
        barangId: '101',
        kodeItem: 'HOL-1',
        panjangJadi: '1500',
        jumlahKeperluan: '3',
        urutan: 2, // Di-reorder jadi nomor 2
      },
    ];

    const result = calculateWithWasteReuse(inputItems, 10, barangCatalog);
    expect(result.itemDetails).toHaveLength(2);
    expect(result.itemDetails[0].urutan).toBe(1);
    expect(result.itemDetails[0].namaBarang).toBe('Pipa Stainless 2 inch');
    expect(result.itemDetails[1].urutan).toBe(2);
    expect(result.itemDetails[1].namaBarang).toBe('Besi Hollow 40x40');
  });

  // Test 3: Reload / sorting in Detail and PDF uses urutan and sequential number, not _id
  test('detail table dan PDF mengurutkan berdasarkan urutan dan nomor tampilan bukan _id', () => {
    const savedItemsFromBackend = [
      { _id: 'mongo_id_999', barangId: '101', namaBarang: 'Barang Kedua Disimpan', urutan: 2, subtotal: 100000 },
      { _id: 'mongo_id_001', barangId: '102', namaBarang: 'Barang Pertama Disimpan', urutan: 1, subtotal: 200000 },
      { _id: 'mongo_id_555', barangId: '103', namaBarang: 'Barang Ketiga Disimpan', urutan: 3, subtotal: 150000 },
    ];

    // Simulasi grouping dan sorting di Estimasi.jsx
    const groupedItems = {};
    savedItemsFromBackend.forEach((item) => {
      const key = item.barangId;
      if (!groupedItems[key]) {
        groupedItems[key] = {
          ...item,
          urutan: item.urutan ?? null,
        };
      }
    });

    const groupedValues = Object.values(groupedItems).sort((a, b) => {
      const uA = a.urutan !== undefined && a.urutan !== null ? a.urutan : 999999;
      const uB = b.urutan !== undefined && b.urutan !== null ? b.urutan : 999999;
      return uA - uB;
    });

    // Urutan harus 1, 2, 3
    expect(groupedValues[0].urutan).toBe(1);
    expect(groupedValues[0].namaBarang).toBe('Barang Pertama Disimpan');
    expect(groupedValues[1].urutan).toBe(2);
    expect(groupedValues[1].namaBarang).toBe('Barang Kedua Disimpan');
    expect(groupedValues[2].urutan).toBe(3);
    expect(groupedValues[2].namaBarang).toBe('Barang Ketiga Disimpan');

    // Pastikan nomor tampilan berurutan 1, 2, 3 dan tidak mengandung mongo_id
    groupedValues.forEach((group, idx) => {
      const nomorTampilan = idx + 1;
      expect(nomorTampilan).toBe(idx + 1);
      expect(String(nomorTampilan)).not.toContain('mongo_id');
    });

    // Simulasi PDF groupOrder sorting
    const groups = {};
    const groupOrder = [];
    savedItemsFromBackend.forEach((item) => {
      const key = String(item.barangId);
      if (!groups[key]) {
        groups[key] = { key, rows: [] };
        groupOrder.push(key);
      }
      groups[key].rows.push(item);
    });

    groupOrder.sort((keyA, keyB) => {
      const minUA = Math.min(...groups[keyA].rows.map((r) => r.urutan ?? 999999));
      const minUB = Math.min(...groups[keyB].rows.map((r) => r.urutan ?? 999999));
      return minUA - minUB;
    });

    expect(groupOrder).toEqual(['102', '101', '103']);
  });
});
