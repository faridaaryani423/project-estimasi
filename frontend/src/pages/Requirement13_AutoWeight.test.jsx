import { calculateBerat } from '../utils/calculationEngine';

describe('Requirement 13 - Auto Weight Calculation', () => {
  test('Pipa Kotak (balok) hollow ground truth - 50x100x2.3 mm panjang 6m', () => {
    // Ground truth reference: Pipa Kotak 50 × 100 × 2.3 mm, panjang 6 m = 32.50 kg
    // Area = 2 * (50 + 100) * 2.3 = 690 mm2 = 0.00069 m2
    // Volume = 6 * 0.00069 = 0.00414 m3
    // Berat = 0.00414 * 7850 = 32.499 -> 32.50 kg
    const barang = {
      jenisBentuk: 'balok',
      panjang: '6000',
      lebar: '50',
      tinggi: '100',
      ketebalan: '2.3',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(32.50, 2);
  });

  test('Pipa Kotak (balok) hollow valid - 100x100x5 mm', () => {
    // Panjang 6000mm, Lebar 100mm, Tinggi 100mm, Ketebalan 5mm
    // Area = 2 * (100 + 100) * 5 = 2000 mm2 = 0.002 m2
    // Volume = 6 * 0.002 = 0.012 m3
    // Berat: 0.012 * 7850 = 94.20 kg
    const barang = {
      jenisBentuk: 'balok',
      panjang: '6000',
      lebar: '100',
      tinggi: '100',
      ketebalan: '5',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(94.20, 1);
  });

  test('WF valid - WF 200x100x5.5x8 mm panjang 12m', () => {
    // H = 200mm, B = 100mm, tw = 5.5mm, tf = 8mm, L = 12000mm
    // h_web = 200 - 2 * 8 = 184 mm = 0.184 m
    // webArea = 0.184 * 0.0055 = 0.001012 m2
    // flangeArea = 2 * 0.1 * 0.008 = 0.0016 m2
    // totalArea = 0.002612 m2
    // Volume = 0.002612 * 12 = 0.031344 m3
    // Berat = 0.031344 * 7850 = 246.05 kg
    const barang = {
      jenisBentuk: 'wf',
      panjang: '12000',
      tinggiWF: '200',
      lebarFlange: '100',
      ketebalanWeb: '5.5',
      ketebalanFlange: '8',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(246.05, 2);
  });

  test('WF valid - WF 200x100x5.5x8 mm dengan Panjang Material 6m (6000mm)', () => {
    // H = 200mm, B = 100mm, tw = 5.5mm, tf = 8mm, L = 6000mm (6m)
    // h_web = 200 - (2 * 8) = 184 mm = 0.184 m
    // webArea = 0.184 * 0.0055 = 0.001012 m2
    // flangeArea = 2 * 0.1 * 0.008 = 0.0016 m2
    // totalArea = 0.002612 m2
    // Volume = 0.002612 * 6 = 0.015672 m3
    // Berat = 0.015672 * 7850 = 123.0252 -> 123.03 kg
    const barang = {
      jenisBentuk: 'wf',
      panjang: '6000',
      tinggiWF: '200',
      lebarFlange: '100',
      ketebalanWeb: '5.5',
      ketebalanFlange: '8',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(123.03, 2);
  });

  test('WF valid - desimal Panjang Material 6.5m (6500mm)', () => {
    // Volume = 0.002612 * 6.5 = 0.016978 m3
    // Berat = 0.016978 * 7850 = 133.2882 -> 133.29 kg
    const barang = {
      jenisBentuk: 'wf',
      panjang: '6500',
      tinggiWF: '200',
      lebarFlange: '100',
      ketebalanWeb: '5.5',
      ketebalanFlange: '8',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(133.28, 2);
  });

  test('WF invalid - tanpa panjang atau panjang 0/negatif harus mengembalikan NaN (tidak boleh ada nilai default hardcoded)', () => {
    const barangTanpaPanjang = {
      jenisBentuk: 'wf',
      tinggiWF: '200',
      lebarFlange: '100',
      ketebalanWeb: '5.5',
      ketebalanFlange: '8',
      beratJenis: '7850',
    };
    expect(isNaN(calculateBerat(barangTanpaPanjang))).toBe(true);

    const barangPanjangNol = {
      ...barangTanpaPanjang,
      panjang: '0',
    };
    expect(isNaN(calculateBerat(barangPanjangNol))).toBe(true);

    const barangPanjangNegatif = {
      ...barangTanpaPanjang,
      panjang: '-6000',
    };
    expect(isNaN(calculateBerat(barangPanjangNegatif))).toBe(true);
  });

  test('WF invalid - flange thickness exceeds total height', () => {
    const barang = {
      jenisBentuk: 'wf',
      panjang: '12000',
      tinggiWF: '200',
      lebarFlange: '100',
      ketebalanWeb: '5.5',
      ketebalanFlange: '105', // 2 * 105 = 210 > 200
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(isNaN(berat)).toBe(true);
  });

  test('Stainless Steel otomatis menggunakan density 7930 kg/m3', () => {
    // Plat Stainless: 2.4m x 1.2m x 0.002m = 0.00576 m3
    // Berat = 0.00576 * 7930 = 45.68 kg
    const barang = {
      jenisBentuk: 'plat',
      jenisBahan: 'Stainless Steel',
      panjangPlat: '2400',
      lebarPlat: '1200',
      ketebalanPlat: '2',
      // beratJenis tidak diberikan, harus otomatis 7930
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(45.68, 2);
  });

  test('Pipa Bulat (tabung) hollow valid - tetap PASS regression', () => {
    // Panjang 6000mm, Diameter 100mm, Ketebalan 5mm
    // d = 0.1, d_dalam = 0.09
    // Luas = (PI/4) * (0.1^2 - 0.09^2) = (PI/4) * (0.01 - 0.0081) = (PI/4) * 0.0019 = 0.00149225 m2
    // Volume = 6 * 0.00149225 = 0.0089535 m3
    // Berat = 0.0089535 * 7850 = 70.285
    const barang = {
      jenisBentuk: 'tabung',
      panjang: '6000',
      diameter: '100',
      ketebalan: '5',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(70.28, 1);
  });

  test('Pipa Kotak (balok) dengan ketebalan 0 (solid)', () => {
    // Volume: 6 * 0.1 * 0.1 = 0.06 m3
    // Berat: 0.06 * 7850 = 471
    const barang = {
      jenisBentuk: 'balok',
      panjang: '6000',
      lebar: '100',
      tinggi: '100',
      ketebalan: '0',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(471, 1);
  });

  test('Pipa Bulat (tabung) dengan ketebalan 0 (solid) - tetap PASS regression', () => {
    // Volume: 6 * PI * 0.05^2 = 0.04712 m3
    // Berat: 0.04712 * 7850 = 369.92
    const barang = {
      jenisBentuk: 'tabung',
      panjang: '6000',
      diameter: '100',
      ketebalan: '0',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(369.92, 1);
  });

  test('Pipa Kotak (balok) dengan ketebalan terlalu besar (invalid)', () => {
    // Lebar 100, Ketebalan 50 => l_dalam = 0
    const barang = {
      jenisBentuk: 'balok',
      panjang: '6000',
      lebar: '100',
      tinggi: '100',
      ketebalan: '50',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(isNaN(berat)).toBe(true);
  });

  test('Pipa Bulat (tabung) dengan ketebalan terlalu besar (invalid)', () => {
    // Diameter 100, Ketebalan 60 => d_dalam = -20
    const barang = {
      jenisBentuk: 'tabung',
      panjang: '6000',
      diameter: '100',
      ketebalan: '60',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(isNaN(berat)).toBe(true);
  });

  test('Plat tetap PASS (regression)', () => {
    // Plat: 1.2m x 2.4m x 0.01m = 0.0288 m3
    // Berat = 0.0288 * 7850 = 226.08
    const barang = {
      jenisBentuk: 'plat',
      panjangPlat: '2400',
      lebarPlat: '1200',
      ketebalanPlat: '10',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(226.08, 1);
  });

  test('Custom tetap PASS (regression)', () => {
    // Custom: p * t * t
    // Panjang 1m, ketebalan 10mm -> 1 * 0.01 * 0.01 = 0.0001 m3
    // Berat = 0.0001 * 7850 = 0.785
    const barang = {
      jenisBentuk: 'custom',
      panjang: '1000',
      ketebalan: '10',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(0.79, 1);
  });
});
