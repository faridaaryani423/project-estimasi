import { calculateBerat, calculateMaterialGroupAllocation } from "../utils/calculationEngine";

describe("Requirement 18: Unit Measurement", () => {
  it("should maintain database inputs as mm (6000) for calculationEngine", () => {
    const mockBarang = { jenisBentuk: "plat", panjangPlat: "6000", lebarPlat: "1500", ketebalanPlat: "6", beratJenis: "7850" };
    const berat = calculateBerat(mockBarang);
    expect(berat).toBeCloseTo(423.9);
  });

  it("should calculate cuts based on integer mm for allocations", () => {
    const barang = { id: 1, nama: "Pipa", jenisBahan: "Besi", jenisBentuk: "tabung", panjang: 6000, diameter: 50, ketebalan: 2, beratbatang: 10, hargamodal: 100000 };
    const items = [ { id: "i1", panjangJadi: 6000, jumlahKeperluan: 1 } ];

    const result = calculateMaterialGroupAllocation(barang, items);
    
    expect(result.cuttingGuide.length).toBe(1);
    expect(result.cuttingGuide[0].waste).toBe(0);
    expect(result.cuttingGuide[0].ukuranPotongan).toBe("6 M"); // Our updated engine formats to M
    expect(result.cuttingGuide[0].breakdownStr).toBe("Item 1 6 M"); 
  });
});
