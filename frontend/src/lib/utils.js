import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format number with thousands separator (e.g., 1000 -> "1.000")
 */
export const formatNumberWithSeparator = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

/**
 * Format number with decimals and thousands separator
 */
export const formatNumberWithDecimals = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
