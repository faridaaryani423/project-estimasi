import { resolveItemSatuan } from './unitResolver';

/**
 * Utility untuk sanitasi payload estimasi sebelum dikirim ke API backend,
 * dan hidrasi item API kembali ke state form secara deterministik.
 * Menjamin integritas identitas barang (Database vs Manual) selalu konsisten.
 */

export const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const normalized =
    typeof value === 'string'
      ? value.replace(',', '.').trim()
      : value;

  if (normalized === '') return null;

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
};

export const toIntegerOrZero = (value) => {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value;
  const number = parseInt(normalized, 10);
  return Number.isFinite(number) ? number : 0;
};

export const toIntegerOrNull = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value;
  const number = parseInt(normalized, 10);
  return Number.isFinite(number) ? number : null;
};

/**
 * Sanitasi 1 baris item estimasi untuk payload API.
 * Menghapus UI-only formatting fields (panjangJadiInput)
 * dan menormalkan numeric fields ke number atau null.
 * Mempertahankan identitas kanonikal (barangId, isManual, savedDbId, dsb).
 */
export const sanitizeEstimasiItem = (item, idx) => {
  if (!item) return item;

  // Pisahkan field representasi UI murni
  const {
    panjangJadiInput,
    kategoriBarangManual,
    ...itemData
  } = item;

  const isManual = item.barangId === '__manual__' || item.isManual === true;
  const canonicalBarangId = isManual ? '__manual__' : (item.barangId ? String(item.barangId) : null);

  const sanitized = {
    ...itemData,
    barangId: canonicalBarangId,
    isManual: Boolean(isManual),
    savedDbId: item.savedDbId ? String(item.savedDbId) : (!isManual && canonicalBarangId ? canonicalBarangId : null),
    namaBarang: item.namaBarang || (isManual ? (item.namaManual || 'Item Manual') : null),

    // Normalisasi panjangJadi: satuan internal mm (misal 600) atau null jika belum diisi
    panjangJadi: toNumberOrNull(item.panjangJadi),
    panjangMentah: toNumberOrNull(item.panjangMentah),
    jumlahKeperluan: toIntegerOrZero(item.jumlahKeperluan),
    urutan: toIntegerOrNull(item.urutan) ?? (idx !== undefined ? idx + 1 : null),
    volume: toNumberOrNull(item.volume),
    hargaSatuan: toNumberOrNull(item.hargaSatuan) ?? 0,
    subtotal: toNumberOrNull(item.subtotal) ?? 0,

    // Manual item fields
    namaManual: isManual ? (item.namaManual || item.namaBarang || '') : '',
    hargaManual: toNumberOrNull(item.hargaManual),
    hargamodalManual: toNumberOrNull(item.hargamodalManual),
    hargajasaManual: toNumberOrNull(item.hargajasaManual),
    panjangManual: toNumberOrNull(item.panjangManual),
    lebarManual: toNumberOrNull(item.lebarManual),
    tinggiManual: toNumberOrNull(item.tinggiManual),
    diameterManual: toNumberOrNull(item.diameterManual),
    ketebalanManual: toNumberOrNull(item.ketebalanManual),
    tinggiWFManual: toNumberOrNull(item.tinggiWFManual),
    lebarFlangeManual: toNumberOrNull(item.lebarFlangeManual),
    ketebalanWebManual: toNumberOrNull(item.ketebalanWebManual),
    ketebalanFlangeManual: toNumberOrNull(item.ketebalanFlangeManual),
    panjangPlatManual: toNumberOrNull(item.panjangPlatManual),
    lebarPlatManual: toNumberOrNull(item.lebarPlatManual),
    ketebalanPlatManual: toNumberOrNull(item.ketebalanPlatManual),
    beratJenisManual: toNumberOrNull(item.beratJenisManual),
    beratbatangManual: toNumberOrNull(item.beratbatangManual),
    minWeldingManual: toNumberOrNull(item.minWeldingManual),

    // Extended/calculated pricing fields
    hargaJual: toNumberOrNull(item.hargaJual),
    hargaJasa: toNumberOrNull(item.hargaJasa),
    hargaModal: toNumberOrNull(item.hargaModal),
    luasPekerjaan: toNumberOrNull(item.luasPekerjaan),
    subtotalMaterial: toNumberOrNull(item.subtotalMaterial),
    subtotalMaterialPemakaian: toNumberOrNull(item.subtotalMaterialPemakaian),
    subtotalMaterialWaste: toNumberOrNull(item.subtotalMaterialWaste),
    subtotalJasa: toNumberOrNull(item.subtotalJasa),
    beratPerBatang: toNumberOrNull(item.beratPerBatang),
    beratTotal: toNumberOrNull(item.beratTotal),
    beratWaste: toNumberOrNull(item.beratWaste),
    luasPermukaan: toNumberOrNull(item.luasPermukaan),
    luasPermukaanTotal: toNumberOrNull(item.luasPermukaanTotal),
    usedExistingWaste: toNumberOrNull(item.usedExistingWaste) ?? 0,
    hargaJualPerUnit: toNumberOrNull(item.hargaJualPerUnit),
    subtotalJual: toNumberOrNull(item.subtotalJual),
  };

  return sanitized;
};

/**
 * Sanitasi list items untuk autosave draft atau final estimasi.
 */
export const sanitizeTouchedItems = (items, getEffectiveBarang) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter((it) => (it.barangId && it.barangId !== '__manual__') || ((it.namaManual || '').trim() !== ''))
    .map((it, idx) => {
      const isManual = it.barangId === '__manual__' || (!it.barangId && it.isManual === true);
      const barang = (!isManual && it.barangId && typeof getEffectiveBarang === 'function')
        ? getEffectiveBarang(it.barangId)
        : null;
      const namaBarang = isManual
        ? (it.namaManual || it.namaBarang || 'Item Manual')
        : (barang?.nama || it.namaBarang || 'Item');
      const jumlahKeperluan = toIntegerOrZero(it.jumlahKeperluan);
      const rawHarga = isManual
        ? (it.hargaManual || it.hargamodalManual || it.hargaSatuan || 0)
        : (it.hargaManual || it.hargamodalManual || barang?.hargamodal || it.hargaSatuan || 0);
      const hargaSatuan = toNumberOrNull(rawHarga) ?? 0;
      const subtotal = jumlahKeperluan * hargaSatuan;

      return sanitizeEstimasiItem(
        {
          ...it,
          barangId: isManual ? '__manual__' : String(it.barangId),
          isManual,
          savedDbId: it.savedDbId ? String(it.savedDbId) : (!isManual && it.barangId ? String(it.barangId) : null),
          namaBarang,
          jenisBentuk: isManual
            ? (it.jenisBentukManual || it.jenisBentuk || 'custom')
            : (barang?.jenisBentuk || it.jenisBentuk || 'balok'),
          supplier: isManual
            ? (it.supplierManual || it.supplier || '')
            : (barang?.supplier || it.supplier || ''),
          satuan: it.satuan || barang?.satuan || 'Bh',
          satuanBarang: it.satuanBarang || barang?.satuan || 'Bh',
          jumlahKeperluan,
          hargaSatuan,
          subtotal,
          urutan: it.urutan || (idx + 1),
        },
        idx
      );
    });
};

/**
 * Helper untuk membangun draft payload yang aman dan ter-sanitasi.
 */
export const buildDraftPayload = (formData, currentItems, getEffectiveBarang) => {
  const metodeDimensi = formData.metodeDimensiKerja || 'langsung';
  const luasPekerjaan = (() => {
    if (metodeDimensi === 'pxl') {
      const p = toNumberOrNull(formData.panjangRuangan) || 0;
      const l = toNumberOrNull(formData.lebarRuangan) || 0;
      return p * l;
    }
    return (
      toNumberOrNull(formData.nilaiDimensiKerja) ||
      toNumberOrNull(formData.luasRuanganInput) ||
      0
    );
  })();

  const satuanDimensi = formData.satuanDimensiKerja || 'm²';
  const touchedItems = sanitizeTouchedItems(currentItems, getEffectiveBarang);
  const totalEstimasi = touchedItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);

  const payload = {
    namaEstimasi: formData.namaEstimasi || 'Draft Estimasi',
    namaProyek: formData.namaProyek || null,
    noOrder: formData.noOrder || null,
    namaClient: formData.namaClient || '-',
    perusahaan: formData.perusahaan || null,
    lokasi: formData.lokasi || '-',
    kontakPerson: formData.kontakPerson || null,
    metodeDimensiKerja: metodeDimensi,
    panjangRuangan: toNumberOrNull(formData.panjangRuangan),
    lebarRuangan: toNumberOrNull(formData.lebarRuangan),
    luasRuanganInput:
      toNumberOrNull(formData.luasRuanganInput) ??
      toNumberOrNull(formData.nilaiDimensiKerja),
    nilaiDimensiKerja: luasPekerjaan > 0 ? luasPekerjaan : null,
    satuanDimensiKerja: satuanDimensi,
    luasRuangan: luasPekerjaan > 0 ? luasPekerjaan : null,
    items: touchedItems,
    totalEstimasi: Math.round(totalEstimasi),
    totalBeratReal: 0,
    totalLuasPermukaan: 0,
    totalTitikWelding: 0,
    status: 'draft',
  };

  validatePayloadGuard(payload);

  return payload;
};

/**
 * Hydrate satu item dari API ke state form (selectedItems) di EditEstimasi.
 * Menjamin identitas barang (Database vs Manual) tidak berubah saat reload draft:
 * 1. Jika barangId cocok dengan ID di barangList -> BARANG DATABASE (isManual: false).
 * 2. Jika barangId === '__manual__' atau isManual === true -> BARANG MANUAL.
 * 3. Barang custom dari DB tetap memiliki barangId asli dan isManual: false.
 */
export const hydrateEstimasiItem = (apiItem, barangList = []) => {
  if (!apiItem) return null;

  const rawBarangId = apiItem.barangId ? String(apiItem.barangId).trim() : '';

  // 1. Cari kecocokan di master barang database berdasarkan ID
  const dbBarangById = rawBarangId && rawBarangId !== '__manual__'
    ? barangList.find((b) => String(b.id) === rawBarangId)
    : null;

  // 2. Evaluasi apakah item merupakan barang manual:
  let isItemManual = false;
  if (rawBarangId === '__manual__') {
    isItemManual = true;
  } else if (dbBarangById) {
    // Ditemukan di DB berdasarkan ID -> PASTI BARANG DATABASE
    isItemManual = false;
  } else if (apiItem.isManual === true) {
    isItemManual = true;
  } else if (!rawBarangId) {
    // Tidak ada barangId: cek apakah namaBarang cocok dengan nama di master DB (backward compatibility)
    const dbBarangByName = apiItem.namaBarang
      ? barangList.find((b) => (b.nama || '').trim().toLowerCase() === String(apiItem.namaBarang).trim().toLowerCase())
      : null;
    isItemManual = !dbBarangByName;
  } else {
    // Ada barangId tapi belum termuat di barangList: jangan ubah jadi manual jika isManual bukan true
    isItemManual = apiItem.isManual === true;
  }

  const matchedDbBarang = dbBarangById || (
    !isItemManual && apiItem.namaBarang
      ? barangList.find((b) => (b.nama || '').trim().toLowerCase() === String(apiItem.namaBarang).trim().toLowerCase())
      : null
  );

  const finalBarangId = isItemManual
    ? '__manual__'
    : (matchedDbBarang ? String(matchedDbBarang.id) : rawBarangId);

  const isCustom = matchedDbBarang?.jenisBentuk === 'custom' || apiItem.jenisBentuk === 'custom';

  const toStr = (v) => (v !== null && v !== undefined ? String(v) : '');

  // Hitung panjangJadiInput untuk UI (meter) jika belum ada
  const panjangJadiMm = toStr(apiItem.panjangJadi || apiItem.panjang_jadi || '');
  const panjangJadiInput = apiItem.panjangJadiInput !== undefined && apiItem.panjangJadiInput !== null && apiItem.panjangJadiInput !== ''
    ? String(apiItem.panjangJadiInput)
    : (panjangJadiMm && !isNaN(Number(panjangJadiMm)) ? String(Number(panjangJadiMm) / 1000) : '');

  return {
    urutan: apiItem.urutan !== undefined && apiItem.urutan !== null ? apiItem.urutan : null,
    barangId: finalBarangId,
    isManual: isItemManual,
    kodeItem: isCustom ? '' : toStr(apiItem.kodeItem),
    panjangJadi: panjangJadiMm,
    panjangJadiInput,
    jumlahKeperluan: toStr(apiItem.jumlahKeperluan ?? ''),
    volume: toStr(apiItem.volume ?? ''),

    // ── Field manual: hanya diisi untuk barang manual atau custom overrides ──
    namaManual: isItemManual
      ? toStr(apiItem.namaManual || apiItem.namaBarang || '')
      : '',
    hargaManual: isItemManual
      ? toStr(apiItem.hargaManual || apiItem.hargamodalManual || apiItem.hargaSatuan || '')
      : '',
    hargamodalManual: isItemManual
      ? toStr(apiItem.hargamodalManual || apiItem.hargaSatuan || '')
      : (matchedDbBarang?.hargamodal ? String(matchedDbBarang.hargamodal) : ''),
    satuanBarangManual: isItemManual
      ? resolveItemSatuan(apiItem, matchedDbBarang?.satuan || 'Bh')
      : (matchedDbBarang?.satuan || 'Bh'),
    satuanManual: isItemManual
      ? resolveItemSatuan(apiItem, matchedDbBarang?.satuan || 'Bh')
      : (matchedDbBarang?.satuan || 'Bh'),
    satuan: isItemManual
      ? resolveItemSatuan(apiItem, matchedDbBarang?.satuan || 'Bh')
      : (matchedDbBarang?.satuan || 'Btg'),
    satuanBarang: isItemManual
      ? resolveItemSatuan(apiItem, matchedDbBarang?.satuan || 'Bh')
      : (matchedDbBarang?.satuan || 'Btg'),
    satuanHargaModalManual: isItemManual
      ? (apiItem.satuanHargaModalManual || (isCustom ? 'unit' : 'batang'))
      : (matchedDbBarang?.satuanHargaModal || 'batang'),
    hargajasaManual: isItemManual
      ? toStr(apiItem.hargajasaManual || apiItem.hargaJasa || '')
      : (matchedDbBarang?.hargajasa ? String(matchedDbBarang.hargajasa) : ''),
    jenisBentukManual: isItemManual ? (apiItem.jenisBentukManual || apiItem.jenisBentuk || 'custom') : '',
    supplierManual: isItemManual ? toStr(apiItem.supplierManual || apiItem.supplier || '') : '',
    jenisBahanManual: isItemManual ? toStr(apiItem.jenisBahanManual || apiItem.jenisBahan || '') : '',
    materialIdManual: isItemManual ? toStr(apiItem.materialId || apiItem.materialIdManual || '') : '',
    beratJenisManual: isItemManual ? toStr(apiItem.beratJenisManual || apiItem.beratJenis || '') : '',
    beratbatangManual: isItemManual ? toStr(apiItem.beratbatangManual || apiItem.beratbatang || '') : '',
    minWeldingManual: isItemManual ? toStr(apiItem.minWeldingManual || apiItem.minWelding || '') : '',
    panjangManual: isItemManual ? toStr(apiItem.panjangManual || apiItem.panjangMentah || '') : '',
    lebarManual: isItemManual ? toStr(apiItem.lebarManual || '') : '',
    tinggiManual: isItemManual ? toStr(apiItem.tinggiManual || '') : '',
    diameterManual: isItemManual ? toStr(apiItem.diameterManual || '') : '',
    ketebalanManual: isItemManual ? toStr(apiItem.ketebalanManual || '') : '',
    tinggiWFManual: isItemManual ? toStr(apiItem.tinggiWFManual || '') : '',
    lebarFlangeManual: isItemManual ? toStr(apiItem.lebarFlangeManual || '') : '',
    ketebalanWebManual: isItemManual ? toStr(apiItem.ketebalanWebManual || '') : '',
    ketebalanFlangeManual: isItemManual ? toStr(apiItem.ketebalanFlangeManual || '') : '',
    panjangPlatManual: isItemManual ? toStr(apiItem.panjangPlatManual || '') : '',
    lebarPlatManual: isItemManual ? toStr(apiItem.lebarPlatManual || '') : '',
    ketebalanPlatManual: isItemManual ? toStr(apiItem.ketebalanPlatManual || '') : '',
    savedDbId: matchedDbBarang ? String(matchedDbBarang.id) : (apiItem.savedDbId ? String(apiItem.savedDbId) : null),
  };
};

/**
 * Debug guard development-only untuk memastikan tidak ada nilai NaN
 * atau tipe numeric yang invalid sebelum request API.
 */
export const validatePayloadGuard = (payload) => {
  if (process.env.NODE_ENV === 'production') return;

  if (!payload) return;

  if (Array.isArray(payload.items)) {
    payload.items.forEach((item, i) => {
      if (typeof item.panjangJadi === 'string' && item.panjangJadi.trim() === '') {
        console.warn(`[PayloadGuard] items[${i}].panjangJadi is an empty string!`);
      }
      if (typeof item.panjangJadi === 'number' && Number.isNaN(item.panjangJadi)) {
        console.warn(`[PayloadGuard] items[${i}].panjangJadi is NaN!`);
      }
      if (typeof item.jumlahKeperluan === 'number' && Number.isNaN(item.jumlahKeperluan)) {
        console.warn(`[PayloadGuard] items[${i}].jumlahKeperluan is NaN!`);
      }
      if ('panjangJadiInput' in item) {
        console.warn(`[PayloadGuard] UI-only field 'panjangJadiInput' was not stripped in items[${i}]`);
      }
    });
  }
};
