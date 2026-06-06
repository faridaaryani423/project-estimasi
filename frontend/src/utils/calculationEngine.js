// Calculation Engine for Estimasi - dengan logika Welding + Waste Reuse

/**
 * Calculate berat per batang based on shape and material
 */
export const calculateBerat = (barang) => {
  const beratJenis = parseFloat(barang.beratJenis) || 7850;
  const jenisBentuk = barang.jenisBentuk || 'balok';
  let volume = 0;

  try {
    if (jenisBentuk === 'balok') {
      const p = parseFloat(barang.panjang) / 1000;
      const l = parseFloat(barang.lebar) / 1000;
      const t = parseFloat(barang.tinggi) / 1000;
      volume = p * l * t;
    } else if (jenisBentuk === 'tabung') {
      const r = (parseFloat(barang.diameter) / 2) / 1000;
      const panjang = parseFloat(barang.panjang) / 1000;
      volume = Math.PI * r * r * panjang;
    } else if (jenisBentuk === 'wf') {
      const H = parseFloat(barang.tinggiWF) / 1000;
      const B = parseFloat(barang.lebarFlange) / 1000;
      const tw = parseFloat(barang.ketebalanWeb) / 1000;
      const tf = parseFloat(barang.ketebalanFlange) / 1000;
      const panjang = parseFloat(barang.panjang) / 1000 || 1;
      const webArea = H * tw;
      const flangeArea = 2 * B * tf;
      volume = (webArea + flangeArea) * panjang;
    } else if (jenisBentuk === 'plat') {
      const p = parseFloat(barang.panjangPlat) / 1000;
      const l = parseFloat(barang.lebarPlat) / 1000;
      const t = parseFloat(barang.ketebalanPlat) / 1000;
      volume = p * l * t;
    } else if (jenisBentuk === 'custom') {
      const panjang = parseFloat(barang.panjang) / 1000;
      const ketebalan = parseFloat(barang.ketebalan) / 1000;
      volume = panjang * ketebalan * ketebalan;
    }

    const berat = volume * beratJenis;
    return Math.round(berat * 100) / 100;
  } catch (e) {
    return 0;
  }
};

/**
 * Calculate luas permukaan for painting
 */
export const calculateLuasPermukaan = (barang) => {
  const jenisBentuk = barang.jenisBentuk || 'balok';
  let luasPermukaan = 0;

  try {
    if (jenisBentuk === 'balok') {
      const p = parseFloat(barang.panjang) / 1000;
      const l = parseFloat(barang.lebar) / 1000;
      const t = parseFloat(barang.tinggi) / 1000;
      luasPermukaan = 2 * (p * l + p * t + l * t);
    } else if (jenisBentuk === 'tabung') {
      const r = (parseFloat(barang.diameter) / 2) / 1000;
      const panjang = parseFloat(barang.panjang) / 1000;
      luasPermukaan = (2 * Math.PI * r * r) + (2 * Math.PI * r * panjang);
    } else if (jenisBentuk === 'wf') {
      const H = parseFloat(barang.tinggiWF) / 1000;
      const B = parseFloat(barang.lebarFlange) / 1000;
      const panjang = parseFloat(barang.panjang) / 1000 || 1;
      luasPermukaan = (4 * B + 2 * H) * panjang;
    } else if (jenisBentuk === 'plat') {
      const p = parseFloat(barang.panjangPlat) / 1000;
      const l = parseFloat(barang.lebarPlat) / 1000;
      luasPermukaan = 2 * p * l;
    } else if (jenisBentuk === 'custom') {
      const panjang = parseFloat(barang.panjang) / 1000;
      const ketebalan = parseFloat(barang.ketebalan) / 1000;
      luasPermukaan = 4 * panjang * ketebalan;
    }

    return Math.round(luasPermukaan * 100) / 100;
  } catch (e) {
    return 0;
  }
};

/**
 * Get panjang mentah dari barang berdasarkan jenis bentuk
 */
const getPanjangMentah = (barang) => {
  const jenisBentuk = barang.jenisBentuk || 'balok';
  if (jenisBentuk === 'plat') {
    return parseFloat(barang.panjangPlat) || 0;
  }
  return parseFloat(barang.panjang) || 0;
};

/**
 * Build all required pieces for each item.
 */
const buildPieceRequirements = (panjangTarget, jumlah, panjangMentah) => {
  const pieces = [];
  const needsWelding = panjangTarget > panjangMentah;
  const fullBarsPerItem = Math.floor(panjangTarget / panjangMentah);
  const remainderPerItem = panjangTarget % panjangMentah;
  const weldingPointsPerItem = Math.max(fullBarsPerItem + (remainderPerItem > 0 ? 1 : 0) - 1, 0);

  for (let itemNo = 1; itemNo <= jumlah; itemNo++) {
    let pieceNo = 1;

    if (!needsWelding) {
      pieces.push({
        itemNo,
        pieceNo,
        length: panjangTarget,
        pieceType: 'potongan'
      });
      continue;
    }

    for (let i = 0; i < fullBarsPerItem; i++) {
      pieces.push({
        itemNo,
        pieceNo,
        length: panjangMentah,
        pieceType: 'full'
      });
      pieceNo++;
    }

    if (remainderPerItem > 0) {
      pieces.push({
        itemNo,
        pieceNo,
        length: remainderPerItem,
        pieceType: 'potongan'
      });
    }
  }

  return {
    pieces,
    needsWelding,
    fullBarsPerItem,
    remainderPerItem,
    weldingPointsPerItem
  };
};

/**
 * Best Fit Decreasing allocator:
 * 1) Sort pieces from largest to smallest
 * 2) For each piece, choose the bar with the smallest remaining length that still fits
 */
const allocatePiecesBestFitDecreasing = (pieces, panjangMentah) => {
  const sortedPieces = [...pieces].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    if (a.itemNo !== b.itemNo) return a.itemNo - b.itemNo;
    return a.pieceNo - b.pieceNo;
  });

  const bars = [];
  const pieceToBarMap = [];

  for (let i = 0; i < sortedPieces.length; i++) {
    const piece = sortedPieces[i];
    let bestBarIndex = -1;
    let bestRemainingAfterCut = Infinity;

    for (let barIdx = 0; barIdx < bars.length; barIdx++) {
      const bar = bars[barIdx];
      if (bar.remaining >= piece.length) {
        const remainingAfterCut = bar.remaining - piece.length;
        if (remainingAfterCut < bestRemainingAfterCut) {
          bestRemainingAfterCut = remainingAfterCut;
          bestBarIndex = barIdx;
        }
      }
    }

    if (bestBarIndex === -1) {
      bars.push({
        barNo: bars.length + 1,
        remaining: panjangMentah,
        pieces: []
      });
      bestBarIndex = bars.length - 1;
    }

    const selectedBar = bars[bestBarIndex];
    selectedBar.remaining -= piece.length;

    const assignedPiece = {
      ...piece,
      barNo: selectedBar.barNo,
      source: selectedBar.pieces.length === 0
        ? (piece.length === panjangMentah ? 'full' : 'potongan')
        : 'reusable waste'
    };

    selectedBar.pieces.push(assignedPiece);
    pieceToBarMap.push(assignedPiece);
  }

  return { bars, pieceToBarMap };
};

/**
 * Build cutting guide per item (welding flow)
 */
const buildWeldingGuide = (jumlah, panjangTarget, weldingPointsPerItem, pieceToBarMap, bars, minWelding) => {
  const guides = [];

  for (let itemNo = 1; itemNo <= jumlah; itemNo++) {
    const pieces = pieceToBarMap
      .filter(piece => piece.itemNo === itemNo)
      .sort((a, b) => a.pieceNo - b.pieceNo)
      .map(piece => ({
        pieceNo: piece.pieceNo,
        length: piece.length,
        source: piece.source,
        barNo: piece.barNo
      }));

    const relatedBars = [...new Set(pieces.map(piece => piece.barNo))];
    const wasteOnRelatedBars = relatedBars.reduce((sum, barNo) => {
      const bar = bars.find(item => item.barNo === barNo);
      return sum + (bar ? bar.remaining : 0);
    }, 0);
    const breakdownStr = pieces
      .map(piece => `${piece.length}(${piece.source === 'full' ? 'full' : piece.source === 'reusable waste' ? 'reusable' : 'potongan'})`)
      .join(' + ');

    guides.push({
      itemNo,
      panjangTarget,
      titikWelding: weldingPointsPerItem,
      pieces,
      breakdownStr,
      waste: wasteOnRelatedBars,
      wasteReusable: wasteOnRelatedBars >= minWelding,
      wasteNote: wasteOnRelatedBars >= minWelding
        ? `${wasteOnRelatedBars}mm (reusable)`
        : `${wasteOnRelatedBars}mm (non-reusable)`
    });
  }

  return guides;
};

/**
 * Build cutting guide per bar (non-welding flow)
 */
const buildNonWeldingGuide = (bars, panjangTarget, panjangMentah, minWelding) => {
  return bars.map(bar => {
    const totalCut = bar.pieces.reduce((sum, piece) => sum + piece.length, 0);
    const breakdownStr = bar.pieces.map(piece => `${piece.length}mm`).join(' + ');
    return {
      batangNo: bar.barNo,
      potongan: bar.pieces.length,
      ukuranPotongan: `${panjangTarget} mm`,
      panjangTerpakai: totalCut,
      waste: bar.remaining,
      wastePercentage: (bar.remaining / panjangMentah) * 100,
      wasteReusable: bar.remaining >= minWelding,
      breakdownStr: breakdownStr || `${panjangTarget} mm`
    };
  });
};

/**
 * Build explicit breakdown per item so allocation is easy to read.
 */
const buildItemBreakdown = (jumlah, panjangTarget, pieceToBarMap, bars, minWelding, needsWelding, weldingPointsPerItem) => {
  const itemBreakdown = [];

  for (let itemNo = 1; itemNo <= jumlah; itemNo++) {
    const pieces = pieceToBarMap
      .filter(piece => piece.itemNo === itemNo)
      .sort((a, b) => a.pieceNo - b.pieceNo)
      .map(piece => ({
        pieceNo: piece.pieceNo,
        length: piece.length,
        barNo: piece.barNo,
        source: piece.source
      }));

    const barsUsed = [...new Set(pieces.map(piece => piece.barNo))].sort((a, b) => a - b);
    const relatedBarsWaste = barsUsed.reduce((sum, barNo) => {
      const bar = bars.find(item => item.barNo === barNo);
      return sum + (bar ? bar.remaining : 0);
    }, 0);

    const uraian = pieces
      .map(piece => `${piece.length}mm -> batang ${piece.barNo} (${piece.source})`)
      .join(' | ');

    itemBreakdown.push({
      itemNo,
      panjangTarget,
      titikWelding: needsWelding ? weldingPointsPerItem : 0,
      barsUsed,
      pieces,
      uraian,
      sisaPadaBatangTerkait: relatedBarsWaste,
      sisaReusable: relatedBarsWaste >= minWelding
    });
  }

  return itemBreakdown;
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getUsageBasedBarPrice = (usedLength, stockLength, hargaSatuan) => {
  if (usedLength <= 0 || stockLength <= 0) return 0;
  const usageRatio = usedLength / stockLength;
  const billedRatio = usageRatio <= 0.5 ? 0.5 : usageRatio <= 0.75 ? 0.75 : 1;
  return billedRatio * hargaSatuan;
};

/**
 * Calculate a full allocation summary for a single material group.
 * Uses a fixed 6 m stock length and Best Fit Decreasing packing.
 */
export const calculateMaterialGroupAllocation = (barang, groupItems = [], luasPekerjaan = 0) => {
  const stockLength = 6000;
  const hargaSatuan = parseFloat(barang?.hargamodal || 0) || 0;
  const parsedMinWelding = parseFloat(barang?.minWelding);
  const minWelding = Number.isFinite(parsedMinWelding) && parsedMinWelding >= 0 ? parsedMinWelding : 50;
  const beratStandar = parseFloat(barang?.beratbatang || 0) > 0
    ? parseFloat(barang.beratbatang)
    : calculateBerat(barang);
  const hargaJasa = parseFloat(barang?.hargajasa || 0) || 0;
  const namaBarang = barang?.nama || 'Barang';

  const normalizedItems = (groupItems || []).filter((item) => {
    const qty = parseInt(item?.jumlahKeperluan) || 0;
    const panjangJadi = parseFloat(item?.panjangJadi) || 0;
    return qty > 0 && panjangJadi > 0;
  });

  if (normalizedItems.length === 0) {
    return {
      kebutuhanBahan: 0,
      panjangRealTerpakai: 0,
      waste: 0,
      wastePercentage: 0,
      totalTitikWelding: 0,
      needsWelding: false,
      cuttingGuide: [],
      itemBreakdown: [],
      barWasteList: [],
      pieceToBarMap: [],
      barAllocations: [],
      summary: {
        stockLength,
        hargaSatuan,
        beratStandar,
        totalBars: 0,
        totalUsedLength: 0,
        totalWasteLength: 0,
        totalHargaReal: 0,
        totalHargaPemakaian: 0,
        selisihBiayaWaste: 0,
        totalBeratReal: 0,
        totalBeratWaste: 0
      }
    };
  }

  const pieces = [];
  normalizedItems.forEach((item, itemIndex) => {
    const qty = parseInt(item.jumlahKeperluan) || 0;
    const pieceLength = parseFloat(item.panjangJadi) || 0;
    const kodeItem = item.kodeItem || null;
    const label = item.namaManual || item.namaBarang || kodeItem || `Item ${itemIndex + 1}`;
    let pieceNoCounter = 1;

    for (let unitNo = 1; unitNo <= qty; unitNo++) {
      let remainingLength = pieceLength;

      // Split long target lengths into valid stock-sized cuts.
      while (remainingLength > 0) {
        const cutLength = Math.min(remainingLength, stockLength);
        pieces.push({
          itemNo: itemIndex + 1,
          pieceNo: pieceNoCounter,
          length: cutLength,
          pieceType: cutLength === stockLength ? 'full' : 'potongan',
          kodeItem,
          label
        });
        pieceNoCounter += 1;
        remainingLength -= cutLength;
      }
    }
  });

  const { bars, pieceToBarMap } = allocatePiecesBestFitDecreasing(pieces, stockLength);
  const totalBars = bars.length;
  const totalUsedLength = pieces.reduce((sum, piece) => sum + piece.length, 0);
  const totalWasteLength = Math.max((totalBars * stockLength) - totalUsedLength, 0);
  const totalBeratReal = (totalUsedLength / stockLength) * beratStandar;
  const totalBeratWaste = Math.max((totalBars * beratStandar) - totalBeratReal, 0);
  const barUsedLengthMap = new Map(
    bars.map((bar) => [
      bar.barNo,
      bar.pieces.reduce((sum, piece) => sum + piece.length, 0)
    ])
  );
  const barHargaPemakaianMap = new Map(
    bars.map((bar) => {
      const usedLength = barUsedLengthMap.get(bar.barNo) || 0;
      return [bar.barNo, getUsageBasedBarPrice(usedLength, stockLength, hargaSatuan)];
    })
  );
  const totalHargaReal = totalBars * hargaSatuan;
  const totalHargaPemakaian = [...barHargaPemakaianMap.values()].reduce((sum, value) => sum + value, 0);
  const selisihBiayaWaste = Math.max(totalHargaReal - totalHargaPemakaian, 0);
  // Keep BFD allocation, but follow requirement-table welding definition per item.
  const totalTitikWelding = normalizedItems.reduce((sum, item) => {
    const qty = parseInt(item?.jumlahKeperluan) || 0;
    const targetLength = parseFloat(item?.panjangJadi) || 0;
    if (qty <= 0 || targetLength <= stockLength) return sum;

    const fullBarsPerItem = Math.floor(targetLength / stockLength);
    const remainderPerItem = targetLength % stockLength;
    const weldingPointsPerItem = Math.max(fullBarsPerItem + (remainderPerItem > 0 ? 1 : 0) - 1, 0);
    return sum + (weldingPointsPerItem * qty);
  }, 0);

  const barAllocations = bars.map((bar) => {
    const usedLength = bar.pieces.reduce((sum, piece) => sum + piece.length, 0);
    const hargaPemakaian = barHargaPemakaianMap.get(bar.barNo) || 0;
    const breakdownStr = bar.pieces
      .map((piece) => `${piece.label} ${piece.length}mm`)
      .join(' + ');

    return {
      batangNo: bar.barNo,
      items: bar.pieces.map((piece) => ({
        itemNo: piece.itemNo,
        pieceNo: piece.pieceNo,
        kodeItem: piece.kodeItem,
        label: piece.label,
        length: piece.length,
        source: piece.pieceType,
        barNo: bar.barNo
      })),
      breakdownStr,
      panjangTerpakai: round2(usedLength),
      sisa: round2(bar.remaining),
      beratReal: round2((usedLength / stockLength) * beratStandar),
      beratSisa: round2(beratStandar - ((usedLength / stockLength) * beratStandar)),
      hargaReal: round2(hargaSatuan),
      hargaPemakaian: round2(hargaPemakaian),
      selisihBiayaWaste: round2(hargaSatuan - hargaPemakaian),
      titikWelding: Math.max(bar.pieces.length - 1, 0),
      wasteReusable: bar.remaining >= minWelding,
      wasteNote: bar.remaining >= minWelding
        ? `${round2(bar.remaining)}mm (reusable)`
        : `${round2(bar.remaining)}mm (non-reusable)`
    };
  });

  const itemBreakdown = normalizedItems.map((item, itemIndex) => {
    const itemPieces = pieceToBarMap
      .filter((piece) => piece.itemNo === itemIndex + 1)
      .sort((a, b) => a.pieceNo - b.pieceNo);
    const itemUsedLength = itemPieces.reduce((sum, piece) => sum + piece.length, 0);
    const itemBarNos = [...new Set(itemPieces.map((piece) => piece.barNo))].sort((a, b) => a - b);
    const costShareRatio = totalUsedLength > 0 ? (itemUsedLength / totalUsedLength) : 0;
    const itemMaterialFullCost = itemBarNos.reduce((sum, barNo) => {
      const barUsedLength = barUsedLengthMap.get(barNo) || 0;
      if (barUsedLength <= 0) return sum;

      const itemUsedOnBar = itemPieces
        .filter((piece) => piece.barNo === barNo)
        .reduce((pieceSum, piece) => pieceSum + piece.length, 0);

      return sum + ((itemUsedOnBar / barUsedLength) * hargaSatuan);
    }, 0);
    const materialPemakaianCost = itemBarNos.reduce((sum, barNo) => {
      const barUsedLength = barUsedLengthMap.get(barNo) || 0;
      if (barUsedLength <= 0) return sum;

      const barHargaPemakaian = barHargaPemakaianMap.get(barNo) || 0;
      const itemUsedOnBar = itemPieces
        .filter((piece) => piece.barNo === barNo)
        .reduce((pieceSum, piece) => pieceSum + piece.length, 0);

      return sum + ((itemUsedOnBar / barUsedLength) * barHargaPemakaian);
    }, 0);
    const materialWasteCost = Math.max(itemMaterialFullCost - materialPemakaianCost, 0);
    const itemRealWeight = (itemUsedLength / stockLength) * beratStandar;
    const itemWasteWeight = totalUsedLength > 0 ? totalBeratWaste * costShareRatio : 0;
    const subtotalJasa = hargaJasa > 0 && luasPekerjaan > 0 ? hargaJasa * luasPekerjaan : 0;
    const subtotal = materialPemakaianCost + subtotalJasa;

    return {
      barangId: item.barangId,
      kodeItem: item.kodeItem || null,
      namaBarang: item.namaBarang || namaBarang,
      itemNo: itemIndex + 1,
      panjangJadi: parseFloat(item.panjangJadi) || 0,
      jumlahKeperluan: parseInt(item.jumlahKeperluan) || 0,
      panjangTerpakai: round2(itemUsedLength),
      batangTerpakai: itemBarNos.length,
      barNosUsed: itemBarNos,
      pieces: itemPieces.map((piece) => ({
        itemNo: piece.itemNo,
        pieceNo: piece.pieceNo,
        length: piece.length,
        barNo: piece.barNo,
        source: piece.source,
        label: piece.label
      })),
      uraian: itemPieces.map((piece) => `${piece.length}mm -> batang ${piece.barNo}`).join(' | '),
      beratReal: round2(itemRealWeight),
      beratWaste: round2(itemWasteWeight),
      subtotalMaterial: round2(itemMaterialFullCost),
      subtotalMaterialPemakaian: round2(materialPemakaianCost),
      subtotalMaterialWaste: round2(materialWasteCost),
      subtotalJasa: round2(subtotalJasa),
      subtotal: round2(subtotal)
    };
  });

  const cuttingGuide = barAllocations.map((bar) => ({
    batangNo: bar.batangNo,
    potongan: bar.items.length,
    ukuranPotongan: `${stockLength} mm`,
    panjangTerpakai: bar.panjangTerpakai,
    waste: bar.sisa,
    wastePercentage: totalBars > 0 ? round2((bar.sisa / stockLength) * 100) : 0,
    wasteReusable: bar.wasteReusable,
    breakdownStr: bar.breakdownStr,
    wasteNote: bar.wasteNote,
    titikWelding: bar.titikWelding,
    pieces: bar.items
  }));

  return {
    kebutuhanBahan: totalBars,
    panjangRealTerpakai: round2(totalUsedLength),
    waste: round2(totalWasteLength),
    wastePercentage: totalBars > 0 ? round2((totalWasteLength / (totalBars * stockLength)) * 100) : 0,
    totalTitikWelding,
    needsWelding: totalTitikWelding > 0,
    cuttingGuide,
    itemBreakdown,
    barWasteList: barAllocations.map((bar) => ({ barNo: bar.batangNo, waste: bar.sisa })),
    pieceToBarMap: pieceToBarMap.map((piece) => ({
      itemNo: piece.itemNo,
      pieceNo: piece.pieceNo,
      length: piece.length,
      barNo: piece.barNo,
      source: piece.source,
      label: piece.label
    })),
    barAllocations,
    summary: {
      stockLength,
      minWelding,
      hargaSatuan,
      beratStandar,
      totalBars,
      totalUsedLength: round2(totalUsedLength),
      totalWasteLength: round2(totalWasteLength),
      totalBeratReal: round2(totalBeratReal),
      totalBeratWaste: round2(totalBeratWaste),
      totalHargaReal: round2(totalHargaReal),
      totalHargaPemakaian: round2(totalHargaPemakaian),
      selisihBiayaWaste: round2(selisihBiayaWaste),
      totalPieces: pieces.length
    }
  };
};

/**
 * MAIN FUNCTION: Calculate detailed breakdown with greedy Best Fit Decreasing waste reuse
 */
export const calculateDetailedBreakdown = (barang, panjangJadi, jumlahKeperluan) => {
  const jumlah = parseInt(jumlahKeperluan) || 0;
  const panjangMentah = getPanjangMentah(barang);
  const panjangTarget = parseFloat(panjangJadi) || 0;
  const minWelding = parseFloat(barang.minWelding) || 50;

  if (jumlah === 0 || panjangTarget === 0 || panjangMentah === 0) {
    return {
      kebutuhanBahan: 0,
      panjangRealTerpakai: 0,
      waste: 0,
      wastePercentage: 0,
      totalTitikWelding: 0,
      cuttingGuide: [],
      itemBreakdown: [],
      barWasteList: [],
      pieceToBarMap: [],
      needsWelding: false
    };
  }

  const requirements = buildPieceRequirements(panjangTarget, jumlah, panjangMentah);
  const { bars, pieceToBarMap } = allocatePiecesBestFitDecreasing(requirements.pieces, panjangMentah);

  const totalBatangUsed = bars.length;
  const totalPanjangTerpakai = requirements.pieces.reduce((sum, piece) => sum + piece.length, 0);
  const totalWaste = bars.reduce((sum, bar) => sum + bar.remaining, 0);
  const totalPanjangMentah = totalBatangUsed * panjangMentah;
  const itemBreakdown = buildItemBreakdown(
    jumlah,
    panjangTarget,
    pieceToBarMap,
    bars,
    minWelding,
    requirements.needsWelding,
    requirements.weldingPointsPerItem
  );

  if (requirements.needsWelding) {
    const cuttingGuide = buildWeldingGuide(
      jumlah,
      panjangTarget,
      requirements.weldingPointsPerItem,
      pieceToBarMap,
      bars,
      minWelding
    );

    return {
      kebutuhanBahan: totalBatangUsed,
      panjangRealTerpakai: totalPanjangTerpakai,
      waste: totalWaste,
      wastePercentage: totalPanjangMentah > 0 ? (totalWaste / totalPanjangMentah) * 100 : 0,
      totalTitikWelding: requirements.weldingPointsPerItem * jumlah,
      needsWelding: true,
      cuttingGuide,
      itemBreakdown,
      barWasteList: bars.map(bar => ({ barNo: bar.barNo, waste: bar.remaining })),
      pieceToBarMap: pieceToBarMap.map(piece => ({
        itemNo: piece.itemNo,
        pieceNo: piece.pieceNo,
        length: piece.length,
        barNo: piece.barNo,
        source: piece.source
      })),
      summary: {
        panjangMentah,
        panjangTarget,
        fullBarsPerItem: requirements.fullBarsPerItem,
        remainderPerItem: requirements.remainderPerItem,
        weldingPointsPerItem: requirements.weldingPointsPerItem,
        jumlahItem: jumlah,
        totalBatang: totalBatangUsed,
        finalWaste: totalWaste,
        minWelding,
        totalPieces: requirements.pieces.length
      }
    };
  }

  const cuttingGuide = buildNonWeldingGuide(bars, panjangTarget, panjangMentah, minWelding);
  return {
    kebutuhanBahan: totalBatangUsed,
    panjangRealTerpakai: totalPanjangTerpakai,
    waste: totalWaste,
    wastePercentage: totalPanjangMentah > 0 ? (totalWaste / totalPanjangMentah) * 100 : 0,
    totalTitikWelding: 0,
    needsWelding: false,
    pcsPerBatang: Math.floor(panjangMentah / panjangTarget),
    cuttingGuide,
    itemBreakdown,
    barWasteList: bars.map(bar => ({ barNo: bar.barNo, waste: bar.remaining })),
    pieceToBarMap: pieceToBarMap.map(piece => ({
      itemNo: piece.itemNo,
      pieceNo: piece.pieceNo,
      length: piece.length,
      barNo: piece.barNo,
      source: piece.source
    })),
    summary: {
      panjangMentah,
      panjangTarget,
      jumlahItem: jumlah,
      totalBatang: totalBatangUsed,
      pcsPerBatang: Math.floor(panjangMentah / panjangTarget),
      totalPieces: requirements.pieces.length
    }
  };
};

/**
 * Calculate comprehensive estimasi with all features
 */
export const calculateComprehensiveEstimasi = (barang, jumlahKeperluan) => {
  const parsedBeratBatang = parseFloat(barang?.beratbatang || 0);
  const beratPerBatang = parsedBeratBatang > 0 ? parsedBeratBatang : calculateBerat(barang);
  const qty = parseInt(jumlahKeperluan) || 0;
  const beratTotal = beratPerBatang * qty;
  const luasPermukaan = calculateLuasPermukaan(barang);
  const luasPermukaanTotal = luasPermukaan * qty;
  
  return {
    beratPerBatang,
    beratTotal,
    luasPermukaan,
    luasPermukaanTotal
  };
};

// Tambahkan di bawah calculationEngine.js
// (barangList perlu dioper sebagai parameter karena ini bukan React component)

export const calculateWithWasteReuse = (validItems, luasPekerjaan, barangList) => {
  const materialItems = validItems.filter(
    (item) => item.barangId && item.barangId !== '__manual__'
  );
  const manualItems = validItems.filter((item) => item.barangId === '__manual__');

  let totalEstimasi = 0;
  let totalBeratReal = 0;
  let totalLuasPermukaan = 0;
  let totalTitikWelding = 0;
  const itemDetails = [];
  const groupMap = new Map();
  const groupOrder = [];

  materialItems.forEach((item) => {
    if (!groupMap.has(item.barangId)) {
      const barang = barangList.find((b) => String(b.id) === String(item.barangId));
      if (!barang) return;
      const group = { barangId: item.barangId, barang, items: [] };
      groupMap.set(item.barangId, group);
      groupOrder.push(group);
    }
    groupMap.get(item.barangId).items.push(item);
  });

  groupOrder.forEach((group) => {
    const allocation = calculateMaterialGroupAllocation(
      group.barang,
      group.items,
      luasPekerjaan
    );
    totalEstimasi += allocation.itemBreakdown.reduce(
      (sum, entry) => sum + (entry.subtotal || 0),
      0
    );
    totalBeratReal += allocation.summary.totalBeratReal || 0;
    totalLuasPermukaan += group.items.reduce((sum, item) => {
      const qty = parseInt(item.jumlahKeperluan) || 0;
      return sum + calculateLuasPermukaan(group.barang) * qty;
    }, 0);
    totalTitikWelding += allocation.totalTitikWelding || 0;

    allocation.itemBreakdown.forEach((entry) => {
      const sourceItem =
        group.items.find((_, index) => index + 1 === entry.itemNo) || group.items[0];
      const itemSpecificGuides = (allocation.cuttingGuide || []).filter((guide) => {
        if (typeof guide?.itemNo !== 'undefined')
          return Number(guide.itemNo) === Number(entry.itemNo);
        if (Array.isArray(guide?.pieces))
          return guide.pieces.some((p) => Number(p?.itemNo) === Number(entry.itemNo));
        return false;
      });

      itemDetails.push({
        barangId: sourceItem.barangId,
        kodeItem: entry.kodeItem || sourceItem.kodeItem || null,
        namaBarang: entry.namaBarang || group.barang.nama,
        jenisBentuk: group.barang.jenisBentuk || 'balok',
        ukuranMentah: group.barang.ukuran,
        panjangMentah: allocation.summary.stockLength,
        panjangJadi: entry.panjangJadi,
        jenisBahan: group.barang.jenisBahan,
        beratJenis: group.barang.beratJenis,
        minWelding: group.barang.minWelding,
        jumlahKeperluan: entry.jumlahKeperluan,
        volume: sourceItem.volume || null,
        hargaSatuan: allocation.summary.hargaSatuan,
        hargaJasa: Math.round(parseFloat(group.barang.hargajasa || 0) || 0),
        luasPekerjaan,
        subtotalMaterial: Math.round(entry.subtotalMaterial),
        subtotalMaterialPemakaian: Math.round(entry.subtotalMaterialPemakaian),
        subtotalMaterialWaste: Math.round(entry.subtotalMaterialWaste),
        subtotalJasa: Math.round(entry.subtotalJasa),
        subtotal: Math.round(entry.subtotal),
        beratPerBatang: allocation.summary.beratStandar,
        beratTotal: entry.beratReal,
        beratWaste: entry.beratWaste,
        luasPermukaan: calculateLuasPermukaan(group.barang),
        luasPermukaanTotal:
          calculateLuasPermukaan(group.barang) * (parseInt(entry.jumlahKeperluan) || 0),
        breakdown: {
          kebutuhanBahan: allocation.kebutuhanBahan,
          panjangRealTerpakai: allocation.panjangRealTerpakai,
          waste: allocation.waste,
          wastePercentage: allocation.wastePercentage,
          totalTitikWelding: allocation.totalTitikWelding,
          cuttingGuide: itemSpecificGuides,
          barAllocations: allocation.barAllocations || [],
          needsWelding: allocation.needsWelding,
          summary: allocation.summary,
        },
        usedExistingWaste: 0,
      });
    });
  });

  const manualDetails = manualItems.map((item) => {
    const jumlahKeperluan = parseInt(item.jumlahKeperluan) || 0;
    const hargaJual = parseFloat(item.hargaManual || 0) || 0;
    const subtotal = hargaJual * jumlahKeperluan;
    totalEstimasi += subtotal;
    return {
      barangId: '__manual__',
      kodeItem: item.kodeItem || null,
      isManual: true,
      namaBarang: item.namaManual || 'Barang Manual',
      jenisBentuk: 'manual',
      ukuranMentah: null,
      panjangMentah: 0,
      panjangJadi: 0,
      jenisBahan: 'Manual',
      beratJenis: null,
      minWelding: null,
      jumlahKeperluan,
      volume: null,
      hargaSatuan: Math.round(hargaJual),
      hargaJasa: 0,
      luasPekerjaan: 0,
      subtotalMaterial: Math.round(subtotal),
      subtotalMaterialPemakaian: Math.round(subtotal),
      subtotalMaterialWaste: 0,
      subtotalJasa: 0,
      subtotal: Math.round(subtotal),
      beratPerBatang: 0,
      beratTotal: 0,
      beratWaste: 0,
      luasPermukaan: 0,
      luasPermukaanTotal: 0,
      breakdown: {
        kebutuhanBahan: 0,
        panjangRealTerpakai: 0,
        waste: 0,
        wastePercentage: 0,
        totalTitikWelding: 0,
        cuttingGuide: [],
        itemBreakdown: [],
        needsWelding: false,
      },
      usedExistingWaste: 0,
    };
  });

  return {
    itemDetails: [...itemDetails, ...manualDetails].filter(Boolean),
    totalEstimasi,
    totalBeratReal,
    totalLuasPermukaan,
    totalTitikWelding,
  };
};