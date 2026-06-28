// src/utils/penawaranGrouping.js

import {
  isManualItem,
  getItemBahanValue,
  getItemWeldingStats,
  sumMetricValues,
  getItemWeightStats,
} from './penawaranCalculations';

export const buildGroupedItemsByBarang = (items = []) => {
  const groupedItems = {};

  items.forEach((item) => {
    const isManualRow = isManualItem(item);
    const groupingKey = isManualRow
      ? `manual-${item.namaBarang}`
      : item.barangId;

    if (!groupedItems[groupingKey]) {
      groupedItems[groupingKey] = {
        barangId: item.barangId,
        namaBarang: item.namaBarang,
        panjangMentah: item.panjangMentah,
        panjangJadi: item.panjangJadi,
        dimensiKerjaValues: [],
        bahanValues: [],
        weldingValues: [],
        wasteValues: [],
        beratMaterialValues: [],
        representativeItem: null,
        hargaModal: 0,
        totalBahan: 0,
        totalWelding: 0,
        totalWaste: 0,
        totalSubtotal: 0,
        count: 0,
      };
    }

    const group = groupedItems[groupingKey];
    const dimensiKerjaItem = parseFloat(item.luasPekerjaan || 0);
    if (Number.isFinite(dimensiKerjaItem) && dimensiKerjaItem > 0) {
      group.dimensiKerjaValues.push(dimensiKerjaItem);
    }

    group.bahanValues.push(getItemBahanValue(item));
    group.weldingValues.push(getItemWeldingStats(item).total);
    group.wasteValues.push(item.breakdown?.waste || 0);
    group.beratMaterialValues.push(getItemWeightStats(item).material || 0);

    if (!group.representativeItem && !isManualRow && item?.breakdown) {
      group.representativeItem = item;
    }

    if (!group.hargaModal) {
      group.hargaModal = Number(item?.hargaModal || item?.hargaSatuan || 0) || 0;
    }

    if (isManualRow) {
      group.totalSubtotal += item.subtotal || 0;
    } else {
      group.totalSubtotal =
        parseFloat(item.breakdown?.summary?.totalHargaReal || 0) || 0;
    }

    group.count += 1;
  });

  return Object.values(groupedItems).map((group) => {
    const representative = group.representativeItem;

    const totalBahan = representative
      ? Number(getItemBahanValue(representative)) || 0
      : sumMetricValues(group.bahanValues);
    const totalWelding = representative
      ? Number(getItemWeldingStats(representative).total) || 0
      : sumMetricValues(group.weldingValues);
    const totalWaste = representative
      ? Number(representative?.breakdown?.waste) || 0
      : sumMetricValues(group.wasteValues);
    const totalBeratMaterial = sumMetricValues(group.beratMaterialValues);

    return {
      ...group,
      totalBahan,
      totalWelding,
      totalWaste,
      totalBeratMaterial,
      hargaModal: group.hargaModal,
    };
  });
};