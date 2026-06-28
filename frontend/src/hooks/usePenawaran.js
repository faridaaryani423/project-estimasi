// src/hooks/usePenawaran.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { estimasiAPI, penawaranAPI } from '@/services/api';
import {
  collectSelectedEstimasiItems,
  getItemsWeightTotals,
  getEstimasiDimensiKerja,
  getItemWeightStats,
} from '@/utils/penawaranCalculations';
import { buildGroupedItemsByBarang } from '@/utils/penawaranGrouping';

const INITIAL_CLIENT_FORM = {
  namaProject: '',
  lokasiProject: '',
  clientNama: '',
  clientKontak: '',
};

export const usePenawaran = () => {
  // ── State ──────────────────────────────────────────────────────
  const [penawaranList, setPenawaranList] = useState([]);
  const [estimasiList, setEstimasiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedPenawaran, setSelectedPenawaran] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [clientForm, setClientForm] = useState(INITIAL_CLIENT_FORM);
  const [selectedEstimasiIds, setSelectedEstimasiIds] = useState([]);
  const [hargaJualMap, setHargaJualMap] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editingPenawaranId, setEditingPenawaranId] = useState(null);
  const [penawaranMode, setPenawaranMode] = useState(null);

  // ── Load Data ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [penawaranData, estimasiData] = await Promise.all([
        penawaranAPI.getAll(),
        estimasiAPI.getAll(),
      ]);
      setPenawaranList(penawaranData);
      setEstimasiList(estimasiData);
    } catch (error) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Client Form ────────────────────────────────────────────────
  const handleClientFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setClientForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  // ── Estimasi Selection ─────────────────────────────────────────
  const toggleEstimasiSelection = useCallback((estId) => {
    setSelectedEstimasiIds((prev) =>
      prev.includes(estId) ? prev.filter((id) => id !== estId) : [...prev, estId]
    );
  }, []);

  // ── Build Preview Data ─────────────────────────────────────────
  const buildPreviewData = useCallback(
    (mode, ids = selectedEstimasiIds, form = clientForm) => {
      const selectedEstimasi = estimasiList.filter((e) => ids.includes(e.id));
      const allItems = collectSelectedEstimasiItems(selectedEstimasi);
      const groupedArray = buildGroupedItemsByBarang(allItems);

      const weightTotals = getItemsWeightTotals(allItems);
      const totalLuasPermukaan = selectedEstimasi.reduce(
        (sum, est) => sum + (est.totalLuasPermukaan || 0),
        0
      );
      const totalTitikWelding = selectedEstimasi.reduce(
        (sum, est) => sum + (est.totalTitikWelding || 0),
        0
      );
      const totalDimensiKerja = selectedEstimasi.reduce(
        (sum, est) => sum + getEstimasiDimensiKerja(est),
        0
      );

      // ── Mode Singkat: satu baris per Estimasi ─────────────────────
      if (mode === 'singkat') {
        const estimasiGroups = selectedEstimasi.map((est) => {
          const dimensiKerja = getEstimasiDimensiKerja(est);
          const barangList = (est.items || []).map((item) => ({
            namaBarang: item.namaBarang || item.namaManual || '-',
            kodeItem: item.kodeItem || '',
          }));
          const subtotalEst = (est.items || []).reduce((s, item) => {
            const val = parseFloat(
              item.breakdown?.summary?.totalHargaReal || item.subtotal || 0
            );
            return s + val;
          }, 0);
          return {
            id: est.id,
            nomor: est.nomorEstimasi,
            nama: est.namaEstimasi,
            dimensiKerja,
            barangList,
            subtotal: subtotalEst,
          };
        });

        const initialPrices = {};
        estimasiGroups.forEach((eg, idx) => {
          initialPrices[idx] =
            eg.dimensiKerja > 0 ? Math.round(eg.subtotal / eg.dimensiKerja) : 0;
        });

        return {
          prices: initialPrices,
          data: {
            clientInfo: { ...form },
            estimasiList: selectedEstimasi.map((e) => ({
              id: e.id,
              nomor: e.nomorEstimasi,
              nama: e.namaEstimasi,
            })),
            estimasiGroups,
            groupedItems: groupedArray,
            originalItems: allItems,
            totalBeratReal: weightTotals.real,
            totalBeratWaste: weightTotals.waste,
            totalLuasPermukaan,
            totalTitikWelding,
            totalDimensiKerja,
          },
        };
      }

      // ── Mode Detail: per Estimasi → per Item, harga per Kg ─────────
      {
        let globalIdx = 0;
        const detailGroups = selectedEstimasi.map((est) => {
          const items = (est.items || []).map((item) => {
            const weightStats = getItemWeightStats(item);
            const beratMaterial = Number(weightStats.material || 0);
            const isManual = !!item.isManual;

            // Volume: berat material untuk non-manual, jumlah untuk manual
            const volume = isManual
              ? Number(item.jumlahKeperluan || 0)
              : beratMaterial;

            const satuanVolume = isManual
              ? (item.satuanManual || 'Ls')
              : 'Kg';

            // Harga modal per unit:
            // - non-manual: totalHargaReal / beratMaterial → per Kg
            // - manual: subtotal / jumlahKeperluan
            const subtotalItem = Number(
              item.breakdown?.summary?.totalHargaReal || item.subtotal || 0
            );
            const hargaPerUnit =
              volume > 0 ? Math.round(subtotalItem / volume) : 0;

            const currentIdx = globalIdx++;

            return {
              globalIdx: currentIdx,
              namaBarang: item.namaBarang || item.namaManual || '-',
              kodeItem: item.kodeItem || '',
              volume,
              satuanVolume,
              isManual,
              hargaModal: hargaPerUnit,
              subtotalModal: subtotalItem,
            };
          });

          const subtotalEst = items.reduce((s, i) => s + i.subtotalModal, 0);

          return {
            id: est.id,
            nomor: est.nomorEstimasi,
            nama: est.namaEstimasi,
            items,
            subtotal: subtotalEst,
          };
        });

        const initialPrices = {};
        groupedArray.forEach((group, idx) => {
          // You can also use a default derived from modal, or just let it be 0 if the user prefers
          // For now, let's pre-fill with a suggested hargaJual, or just 0
          initialPrices[idx] = 0; // The UI uses formatRupiah, we can initialize to 0 or leave it
        });

        return {
          prices: initialPrices,
          data: {
            clientInfo: { ...form },
            estimasiList: selectedEstimasi.map((e) => ({
              id: e.id,
              nomor: e.nomorEstimasi,
              nama: e.namaEstimasi,
            })),
            detailGroups,
            groupedItems: groupedArray,
            originalItems: allItems,
            totalBeratReal: weightTotals.real,
            totalBeratWaste: weightTotals.waste,
            totalLuasPermukaan,
            totalTitikWelding,
            totalDimensiKerja,
          },
        };
      }
    },
    [estimasiList, selectedEstimasiIds, clientForm]
  );

  // ── Update Selection from Preview ──────────────────────────────
  const updateEstimasiSelectionFromPreview = useCallback(
    (estId) => {
      const newSelection = selectedEstimasiIds.includes(estId)
        ? selectedEstimasiIds.filter((id) => id !== estId)
        : [...selectedEstimasiIds, estId];

      if (newSelection.length === 0) {
        toast.error('Minimal pilih 1 estimasi!');
        return;
      }

      setSelectedEstimasiIds(newSelection);

      const { prices, data } = buildPreviewData(penawaranMode, newSelection);

      // Reset harga ke nilai awal dari build baru (indeks berubah)
      setHargaJualMap({ ...prices });
      setPreviewData(data);
    },
    [selectedEstimasiIds, buildPreviewData, penawaranMode]
  );

  // ── Open Preview ───────────────────────────────────────────────
  const handleOpenPreview = useCallback(
    (mode) => {
      if (selectedEstimasiIds.length === 0) {
        toast.error('Pilih minimal 1 estimasi!');
        return;
      }
      setPenawaranMode(mode);
      const { prices, data } = buildPreviewData(mode);
      setHargaJualMap(prices);
      setPreviewData(data);
      setShowCreateDialog(false);
      setShowPreview(true);
    },
    [selectedEstimasiIds, buildPreviewData]
  );

  // ── Handle Harga Jual Change ───────────────────────────────────
  const handleHargaJualChange = useCallback((idx, rawValue) => {
    const num = parseInt(String(rawValue).replace(/\D/g, ''), 10) || 0;
    setHargaJualMap((prev) => ({ ...prev, [idx]: num }));
  }, []);

  // ── Confirm Create/Update ──────────────────────────────────────
  const confirmCreatePenawaran = useCallback(
    async (getItemHargaJualFn) => {
      try {
        setSaving(true);

        let totalHarga = 0;
        let estimasiListToSave = previewData.estimasiList;
        let itemsToSave = previewData.originalItems;

        if (penawaranMode === 'singkat' && previewData?.estimasiGroups) {
          // Singkat: total = sum(dimensiKerja × hargaJual) per estimasi
          estimasiListToSave = previewData.estimasiGroups.map((eg, idx) => {
            const hj = getItemHargaJualFn(idx);
            const subtotal = hj > 0 ? Math.round(eg.dimensiKerja * hj) : 0;
            totalHarga += subtotal;
            return {
              ...previewData.estimasiList.find(e => e.id === eg.id),
              dimensiKerja: eg.dimensiKerja,
              hargaJualPerM2: hj,
              subtotalJual: subtotal
            };
          });
        } else if (penawaranMode === 'detail' && previewData?.groupedItems) {
          // Detail: user inputs hargaJual in UI based on groupedItems index
          // We need to inject this into the raw itemsToSave list
          itemsToSave = itemsToSave.map(item => {
            const isManualRow = item.isManual || item.isManualItem || !item.barangId;
            const groupIdx = previewData.groupedItems.findIndex(
              (g) => {
                if (isManualRow) return g.namaBarang === (item.namaBarang || item.namaManual);
                return g.barangId === item.barangId;
              }
            );
            const hj = groupIdx >= 0 ? getItemHargaJualFn(groupIdx) : 0;
            const weightStats = getItemWeightStats(item);
            const beratMaterial = Number(weightStats.material || 0);
            const volume = item.isManual ? Number(item.jumlahKeperluan || 0) : beratMaterial;
            const subtotal = hj > 0 ? Math.round(volume * hj) : 0;
            
            totalHarga += subtotal;
            
            return {
              ...item,
              hargaJualPerUnit: hj,
              subtotalJual: subtotal
            };
          });
        }

        const penawaranData = {
          ...previewData.clientInfo,
          estimasiIds: selectedEstimasiIds,
          estimasiList: estimasiListToSave,
          items: itemsToSave,
          totalHarga: Math.round(totalHarga),
          totalBerat: Math.round(previewData.totalBeratReal * 100) / 100,
          totalLuasPermukaan:
            Math.round(previewData.totalLuasPermukaan * 100) / 100,
          totalTitikWelding: previewData.totalTitikWelding,
          totalDimensiKerja:
            Math.round((previewData.totalDimensiKerja || 0) * 100) / 100,
          tipePenawaran: penawaranMode || 'singkat',
        };

        const savedPenawaran = editMode
          ? await penawaranAPI.update(editingPenawaranId, penawaranData)
          : await penawaranAPI.create(penawaranData);

        await loadData();
        setShowPreview(false);
        resetCreateForm();

        const modeLabel = penawaranMode === 'detail' ? 'Detail' : 'Singkat';
        toast.success(
          editMode
            ? `Penawaran ${modeLabel} ${savedPenawaran.nomorPenawaran} berhasil diupdate!`
            : `Penawaran ${modeLabel} ${savedPenawaran.nomorPenawaran} berhasil dibuat!`
        );
      } catch (error) {
        toast.error(
          `Gagal ${editMode ? 'update' : 'membuat'} penawaran: ` + error.message
        );
      } finally {
        setSaving(false);
      }
    },
    [
      previewData,
      selectedEstimasiIds,
      penawaranMode,
      editMode,
      editingPenawaranId,
      loadData,
    ]
  );

  // ── Reset Form ─────────────────────────────────────────────────
  const resetCreateForm = useCallback(() => {
    setClientForm(INITIAL_CLIENT_FORM);
    setSelectedEstimasiIds([]);
    setHargaJualMap({});
    setPreviewData(null);
    setPenawaranMode(null);
    setEditMode(false);
    setEditingPenawaranId(null);
  }, []);

  // ── Edit Penawaran ─────────────────────────────────────────────
  const handleEditPenawaran = useCallback(
    (penawaran) => {
      setEditMode(true);
      setEditingPenawaranId(penawaran.id || penawaran._id);
      setPenawaranMode(penawaran.tipePenawaran || 'singkat');

      setClientForm({
        namaProject: penawaran.namaProject || '',
        lokasiProject: penawaran.lokasiProject || '',
        clientNama: penawaran.clientNama || '',
        clientKontak: penawaran.clientKontak || '',
      });

      const estIds = penawaran.estimasiIds || [];
      setSelectedEstimasiIds(estIds);
      setShowCreateDialog(true);
    },
    []
  );

  // ── Delete Penawaran ───────────────────────────────────────────
  const handleDeletePenawaran = useCallback(
    async (penawaranId) => {
      try {
        await penawaranAPI.delete(penawaranId);
        await loadData();
        toast.success('Penawaran berhasil dihapus!');
      } catch (error) {
        toast.error('Gagal menghapus penawaran: ' + error.message);
      }
    },
    [loadData]
  );

  // ── Filtered List ──────────────────────────────────────────────
  const filteredPenawaranList = useMemo(() => {
    if (!searchQuery.trim()) return penawaranList;
    const q = searchQuery.toLowerCase();
    return penawaranList.filter(
      (p) =>
        p.nomorPenawaran?.toLowerCase().includes(q) ||
        p.namaProject?.toLowerCase().includes(q) ||
        p.clientNama?.toLowerCase().includes(q)
    );
  }, [penawaranList, searchQuery]);

  return {
    // Data
    penawaranList,
    filteredPenawaranList,
    estimasiList,
    loading,
    saving,

    // View state
    selectedPenawaran,
    setSelectedPenawaran,
    showDetail,
    setShowDetail,
    showCreateDialog,
    setShowCreateDialog,
    showPreview,
    setShowPreview,
    previewData,
    searchQuery,
    setSearchQuery,

    // Form
    clientForm,
    handleClientFormChange,
    selectedEstimasiIds,
    toggleEstimasiSelection,
    hargaJualMap,
    handleHargaJualChange,
    editMode,
    penawaranMode,
    setPenawaranMode,

    // Actions
    handleOpenPreview,
    updateEstimasiSelectionFromPreview,
    confirmCreatePenawaran,
    handleEditPenawaran,
    handleDeletePenawaran,
    resetCreateForm,
    loadData,
  };
};