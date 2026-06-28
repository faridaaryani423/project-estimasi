// src/utils/penawaranCalculations.js

export const MANUAL_ITEM_ID = '__manual__';
export const MANUAL_ITEM_TYPE = 'Manual';

export const isManualItem = (item) => {
  return (
    !!item?.isManual ||
    item?.barangId === MANUAL_ITEM_ID ||
    item?.jenisBahan === MANUAL_ITEM_TYPE
  );
};

export const getItemBahanValue = (item) => {
  return isManualItem(item)
    ? parseInt(item?.jumlahKeperluan) || 0
    : item?.breakdown?.kebutuhanBahan || 0;
};

export const getItemWeldingStats = (item) => {
  const guides = item?.breakdown?.cuttingGuide || [];
  const totalFromBreakdown = parseInt(item?.breakdown?.totalTitikWelding) || 0;
  const totalFromGuides = guides.reduce(
    (sum, guide) => sum + (parseInt(guide?.titikWelding) || 0),
    0
  );
  const weldingPointsPerItem =
    parseInt(item?.breakdown?.summary?.weldingPointsPerItem) || 0;
  const qty = parseInt(item?.jumlahKeperluan) || 0;
  const totalFromSummary =
    weldingPointsPerItem > 0 ? weldingPointsPerItem * (qty || 1) : 0;
  const hasWeldingGuide = guides.some(
    (guide) =>
      (parseInt(guide?.titikWelding) || 0) > 0 ||
      Array.isArray(guide?.pieces) ||
      typeof guide?.itemNo !== 'undefined'
  );

  const total = totalFromBreakdown || totalFromGuides || totalFromSummary || 0;
  const isWelding = !!item?.breakdown?.needsWelding || total > 0 || hasWeldingGuide;

  return { isWelding, total, guides };
};

export const getItemWeightStats = (item) => {
  if (isManualItem(item)) {
    const fallbackBeratTotal = parseFloat(item?.beratTotal || 0) || 0;
    return { real: fallbackBeratTotal, waste: 0, material: fallbackBeratTotal };
  }

  const beratPerBatang = parseFloat(item?.beratPerBatang || 0) || 0;
  const panjangMentah = parseFloat(item?.panjangMentah || 0) || 0;
  const wastePanjang = parseFloat(item?.breakdown?.waste || 0) || 0;
  const panjangRealTerpakai =
    parseFloat(item?.breakdown?.panjangRealTerpakai || 0) || 0;
  const fallbackBeratTotal = parseFloat(item?.beratTotal || 0) || 0;

  if (beratPerBatang > 0 && panjangMentah > 0) {
    if (panjangRealTerpakai > 0 || wastePanjang > 0) {
      const totalPanjang = panjangRealTerpakai + wastePanjang;
      const totalBeratMaterial = (totalPanjang / panjangMentah) * beratPerBatang;
      const waste = (wastePanjang / panjangMentah) * beratPerBatang;
      const real = Math.max(totalBeratMaterial - waste, 0);
      return { real, waste, material: totalBeratMaterial };
    } else {
      const kebutuhanBahan =
        parseFloat(item?.breakdown?.kebutuhanBahan || 0) || 0;
      const material =
        kebutuhanBahan > 0 ? beratPerBatang * kebutuhanBahan : fallbackBeratTotal;
      const waste =
        wastePanjang > 0 ? (beratPerBatang / panjangMentah) * wastePanjang : 0;
      const real = Math.max(material - waste, 0);
      return { real, waste, material };
    }
  }

  return { real: 0, waste: 0, material: fallbackBeratTotal };
};

export const getItemsWeightTotals = (items = []) => {
  return items.reduce(
    (acc, item) => {
      const stats = getItemWeightStats(item);
      acc.real += stats.real;
      acc.waste += stats.waste;
      return acc;
    },
    { real: 0, waste: 0 }
  );
};

export const getEstimasiDimensiKerja = (estimasi) => {
  const direct = parseFloat(estimasi?.luasRuangan);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const panjang = parseFloat(estimasi?.panjangRuangan) || 0;
  const lebar = parseFloat(estimasi?.lebarRuangan) || 0;
  return panjang * lebar;
};

export const getResolvedItemDimensiKerja = (item, estimasiDimensiKerja) => {
  const itemDimensi = parseFloat(item?.luasPekerjaan);
  if (Number.isFinite(itemDimensi) && itemDimensi > 0) return itemDimensi;
  if (Number.isFinite(estimasiDimensiKerja) && estimasiDimensiKerja > 0)
    return estimasiDimensiKerja;
  return 0;
};

export const collectSelectedEstimasiItems = (selectedEstimasi) => {
  return selectedEstimasi.flatMap((est) => {
    const estimasiDimensiKerja = getEstimasiDimensiKerja(est);
    return (est.items || []).map((item) => ({
      ...item,
      fromEstimasi: est.nomorEstimasi,
      luasPekerjaan: getResolvedItemDimensiKerja(item, estimasiDimensiKerja),
    }));
  });
};

export const sumMetricValues = (values = []) => {
  return values.reduce((sum, value) => sum + (Number(value) || 0), 0);
};

// Sinkron dengan tampilan halaman Estimasi
export const calculateCorrectTotal = (estimasi) => {
  if (!estimasi || !estimasi.items)
    return Math.round(estimasi?.totalEstimasi || 0);

  const groupedItems = {};
  estimasi.items.forEach((item, itemIdx) => {
    const isManualRow = isManualItem(item);
    const groupingKey = isManualRow
      ? `manual-${item.namaBarang}`
      : item.barangId;

    if (!groupedItems[groupingKey]) {
      groupedItems[groupingKey] = {
        ...item,
        finalHargaPlusWaste: 0,
        count: 0,
        lastItemIndex: -1,
      };
    }

    const group = groupedItems[groupingKey];
    if (isManualRow && group.count > 0) {
      group.subtotal = (group.subtotal || 0) + (item.subtotal || 0);
    }
    if (itemIdx >= group.lastItemIndex) {
      group.finalHargaPlusWaste =
        parseFloat(item.breakdown?.summary?.totalHargaReal || 0) || 0;
      group.lastItemIndex = itemIdx;
    }
    group.count++;
  });

  const total = Object.values(groupedItems).reduce((acc, group) => {
    const isManualRow = isManualItem(group);
    return acc + Number(
      isManualRow ? group.subtotal || 0 : group.finalHargaPlusWaste || 0
    );
  }, 0);

  return Math.round(total);
};

// ── Helper untuk subtotal jual berdasarkan mode ──────────────────
export const getItemSubtotalModal = (group) => {
  const hargaModal = Number(group?.hargaModal || 0) || 0;
  const qty = Number(group?.totalBahan || 0) || 0;
  return Math.round(hargaModal * qty);
};

// Singkat = per m² × dimensi kerja (ringkas, cukup isi luas)
export const getItemSubtotalJualSingkat = (group, hargaJual) => {
  const totalDimensi = (group.dimensiKerjaValues || []).reduce(
    (s, v) => s + (Number(v) || 0),
    0
  );
  return Math.round(totalDimensi * Number(hargaJual || 0));
};

// Detail = per batang × jumlah bahan (rinci per jenis material)
export const getItemSubtotalJualDetail = (group, hargaJual) => {
  return Math.round(Number(group.totalBeratMaterial || 0) * Number(hargaJual || 0));
};

export const getItemSubtotalJualByMode = (group, hargaJual, mode) => {
  return mode === 'detail'
    ? getItemSubtotalJualDetail(group, hargaJual)
    : getItemSubtotalJualSingkat(group, hargaJual);
};