// src/utils/penawaranFormatters.js

export const formatRupiah = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Math.round(Number(value) || 0);
  return numeric.toLocaleString('id-ID');
};

export const unformatRupiah = (value) => {
  return String(value || '').replace(/[^\d]/g, '');
};

export const fmtNumber = (value, decimals = 0) => {
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatNumberWithSeparator = (value) => {
  if (!value) return '0';
  return Number(value).toLocaleString('id-ID');
};

export const fmtRupiah = (value) => `Rp ${fmtNumber(value)}`;

export const formatDateTime = () => {
  const now = new Date();
  return `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;
};