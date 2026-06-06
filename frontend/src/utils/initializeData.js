// Initialize default users if not exists
export const initializeUsers = () => {
  const users = localStorage.getItem('users');
  
  if (!users) {
    const defaultUsers = [
      {
        id: 1,
        username: 'admin',
        password: 'admin123',
        name: 'Administrator',
        email: 'admin@company.com',
        role: 'admin'
      },
      {
        id: 2,
        username: 'user',
        password: 'user123',
        name: 'User Biasa',
        email: 'user@company.com',
        role: 'user'
      }
    ];
    
    localStorage.setItem('users', JSON.stringify(defaultUsers));
  }
};

// Initialize default barang data if not exists or empty
export const initializeBarangData = () => {
  const barangData = localStorage.getItem('barangData');
  
  if (!barangData || barangData === '[]') {
    const defaultBarang = [
      {
        id: 1,
        nama: 'Besi Hollow 40x40',
        jenisBentuk: 'balok',
        ukuran: '6000 × 40 × 40 mm',
        panjang: '6000',
        lebar: '40',
        tinggi: '40',
        ketebalan: '2',
        jenisBahan: 'Baja ST37',
        beratJenis: '7850',
        minWelding: '50',
        harga: '150000',
        createdBy: 'System',
        lastUpdatedBy: 'System',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        nama: 'Pipa Besi 2 inch',
        jenisBentuk: 'tabung',
        ukuran: 'Ø50 × 6000 mm',
        panjang: '6000',
        diameter: '50',
        ketebalan: '3',
        jenisBahan: 'Baja ST37',
        beratJenis: '7850',
        minWelding: '40',
        harga: '180000',
        createdBy: 'System',
        lastUpdatedBy: 'System',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        nama: 'WF 200x100',
        jenisBentuk: 'wf',
        ukuran: 'WF 200 × 100 × 5.5 × 8 mm',
        panjang: '12000',
        tinggiWF: '200',
        lebarFlange: '100',
        ketebalanWeb: '5.5',
        ketebalanFlange: '8',
        jenisBahan: 'Baja SS400',
        beratJenis: '7850',
        minWelding: '100',
        harga: '2500000',
        createdBy: 'System',
        lastUpdatedBy: 'System',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 4,
        nama: 'Plat Besi 6mm',
        jenisBentuk: 'plat',
        ukuran: '2400 × 1200 × t6 mm',
        panjangPlat: '2400',
        lebarPlat: '1200',
        ketebalanPlat: '6',
        jenisBahan: 'Baja ST37',
        beratJenis: '7850',
        minWelding: '50',
        harga: '850000',
        createdBy: 'System',
        lastUpdatedBy: 'System',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];
    
    localStorage.setItem('barangData', JSON.stringify(defaultBarang));
    return defaultBarang;
  }
  
  return JSON.parse(barangData);
};

// Generate unique number for estimasi/penawaran
export const generateUniqueNumber = (prefix) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}/${year}${month}/${random}`;
};
