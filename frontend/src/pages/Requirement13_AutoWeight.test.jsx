import { calculateBerat } from '../utils/calculationEngine';

describe('Requirement 13 - Auto Weight Calculation', () => {
  test('Pipa Kotak (balok) hollow valid', () => {
    // Panjang 6000mm, Lebar 100mm, Tinggi 100mm, Ketebalan 5mm
    // Outer Volume: 6 * 0.1 * 0.1 = 0.06 m3
    // Inner Volume: 6 * (100 - 10) * (100 - 10) mm -> 6 * 0.09 * 0.09 = 0.0486 m3
    // Hollow Volume: 0.06 - 0.0486 = 0.0114 m3
    // Berat: 0.0114 * 7850 = 89.49
    const barang = {
      jenisBentuk: 'balok',
      panjang: '6000',
      lebar: '100',
      tinggi: '100',
      ketebalan: '5',
      beratJenis: '7850',
    };
    const berat = calculateBerat(barang);
    expect(berat).toBeCloseTo(89.49, 1);
  });

  test('Pipa Bulat (tabung) hollow valid', () => {
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

  test('Pipa Bulat (tabung) dengan ketebalan 0 (solid)', () => {
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
