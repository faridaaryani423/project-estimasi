import subprocess
import json
import re

# 1. Run BFD in node
node_script = '''
const { calculateMaterialGroupAllocation } = require('../src/utils/calculationEngine');
const rawGroup1Items = [
  { kodeItem: 'Rafter1R', panjangJadi: 24000, jumlahKeperluan: 6 },
  { kodeItem: 'Rafter1R', panjangJadi: 19000, jumlahKeperluan: 2 },
  { kodeItem: 'Gordeng1R', panjangJadi: 18000, jumlahKeperluan: 4 },
  { kodeItem: 'Gordeng1R', panjangJadi: 16000, jumlahKeperluan: 2 },
  { kodeItem: 'Gordeng1R', panjangJadi: 15000, jumlahKeperluan: 2 },
  { kodeItem: 'Gordeng1R', panjangJadi: 13000, jumlahKeperluan: 2 },
  { kodeItem: 'Gordeng1R', panjangJadi: 12000, jumlahKeperluan: 2 },
  { kodeItem: 'T', panjangJadi: 3500, jumlahKeperluan: 6 },
  { kodeItem: 'T', panjangJadi: 3500, jumlahKeperluan: 8 },
  { kodeItem: 'TR', panjangJadi: 9200, jumlahKeperluan: 2 },
  { kodeItem: 'RLantai', panjangJadi: 570, jumlahKeperluan: 4 },
  { kodeItem: 'RLantai', panjangJadi: 910, jumlahKeperluan: 1 },
  { kodeItem: 'RLantai', panjangJadi: 2500, jumlahKeperluan: 1 },
  { kodeItem: 'RLantai', panjangJadi: 4950, jumlahKeperluan: 5 },
  { kodeItem: 'RLantai', panjangJadi: 1300, jumlahKeperluan: 2 },
  { kodeItem: 'RLantai', panjangJadi: 2500, jumlahKeperluan: 2 },
  { kodeItem: 'RLantai', panjangJadi: 2850, jumlahKeperluan: 1 },
  { kodeItem: 'RLantai', panjangJadi: 8500, jumlahKeperluan: 2 },
  { kodeItem: 'RLantai', panjangJadi: 3500, jumlahKeperluan: 1 },
  { kodeItem: 'RLantai', panjangJadi: 1550, jumlahKeperluan: 8 },
  { kodeItem: 'RLantaiR', panjangJadi: 9000, jumlahKeperluan: 1 },
  { kodeItem: 'RLantaiR', panjangJadi: 5000, jumlahKeperluan: 1 },
];
const barang = {
  namaBarang: 'Pipa Hitam',
  panjangMentah: 6000,
  beratPerBatang: 130.2,
  hargaSatuan: 1953000,
  minWelding: 50,
};
const res = calculateMaterialGroupAllocation(barang, rawGroup1Items);
console.log(JSON.stringify(res.barAllocations));
'''

with open(r'frontend\scratch\run_bfd.js', 'w') as f:
    f.write(node_script)

proc = subprocess.run(['node', r'frontend\scratch\run_bfd.js'], capture_output=True, text=True)
bfd_bars = json.loads(proc.stdout)

# 2. Parse Hegar Reference from breakdown_extracted.txt
with open(r'frontend\scratch\breakdown_extracted.txt', 'r', encoding='utf-8') as f:
    hegar_text = f.read()

# 3. Parse Actual Result from est_4416_extracted.txt
with open(r'frontend\scratch\est_4416_extracted.txt', 'r', encoding='utf-8') as f:
    actual_text = f.read()

print('BFD Bars Count:', len(bfd_bars))

# Let's inspect Bars 64-90 in Hegar vs BFD
hegar_64_90 = [
    ("64", "6", "-", "RLantaiR.(5) Gordeng1R (1)", 130.2, 0, 1953000),
    ("65", "5,95", "0,04", "RLantai.(4,95) Gordeng1R (1) Gordeng1R(0)...", 129.11, 1.09, 1953000),
    ("66", "5,95", "0,04", "RLantai.(4,95) Rafter1R (1)", 129.11, 1.09, 1953000),
    ("67", "5,95", "0,04", "RLantai.(4,95) Rafter1R (1)", 129.11, 1.09, 1953000),
    ("68", "5,86", "0,14", "RLantai.(4,95) RLantai (0,91)", 127.16, 3.04, 1953000),
    ("69", "5,52", "0,48", "RLantai.(4,95) RLantai (0,57)", 119.78, 10.42, 1953000),
    ("70", "5,55", "0,45", "Gordeng1R.(4) RLantai (1,55)", 120.43, 9.77, 1953000),
    ("71", "5,55", "0,45", "Gordeng1R.(4) RLantai (1,55)", 120.43, 9.77, 1953000),
    ("72", "6", "-", "RLantai.(3,5) RLantai (2,5)", 130.2, 0, 1953000),
    ("73", "6", "-", "T.(3,5) RLantai (2,5)", 130.2, 0, 1953000),
    ("74", "6", "-", "T.(3,5) RLantai (2,5)", 130.2, 0, 1953000),
    ("75", "6", "-", "T.(3,5) RLantai (2,5)", 130.2, 0, 1953000),
    ("76", "6", "-", "T.(3,5) RLantai (2,5)", 130.2, 0, 1953000),
    ("77", "5,62", "0,38", "T.(3,5) RLantai (1,55) RLantai (0,57)", 121.95, 8.25, 1953000),
    ("78", "5,62", "0,38", "T.(3,5) RLantai (1,55) RLantai (0,57)", 121.95, 8.25, 1953000),
    ("79", "5,62", "0,38", "T.(3,5) RLantai (1,55) RLantai (0,57)", 121.95, 8.25, 1953000),
    ("80", "5,05", "0,95", "T.(3,5) RLantai (1,55)", 109.58, 20.62, 1953000),
    ("81", "5,05", "0,95", "T.(3,5) RLantai (1,55)", 109.58, 20.62, 1953000),
    ("82", "5,05", "0,95", "T.(3,5) RLantai (1,55)", 109.58, 20.62, 1953000),
    ("83", "4,8", "1,2", "T.(3,5) RLantai (1,3)", 104.16, 26.04, 1953000),
    ("84", "4,8", "1,2", "T.(3,5) RLantai (1,3)", 104.16, 26.04, 1953000),
    ("85", "3,5", "2,5", "T.(3,5)", 75.95, 54.25, 1464750),
    ("86", "3,5", "2,5", "T.(3,5)", 75.95, 54.25, 1464750),
    ("87", "3,2", "2,8", "TR.(3,2)", 69.44, 60.76, 1464750),
    ("88", "3,2", "2,8", "TR.(3,2)", 69.44, 60.76, 1464750),
    ("89", "6", "-", "RLantaiR.(3) Gordeng1R (3)", 130.2, 0, 1953000),
    ("90", "5,85", "0,15", "Gordeng1R.(3) RLantai (2,85)", 126.94, 3.26, 1953000)
]

print('\n--- COMPARISON HEGAR vs BFD (Bars 64 to 90) ---')
for i, h in enumerate(hegar_64_90):
    bar_idx = 63 + i
    b = bfd_bars[bar_idx]
    bfd_pieces = ' + '.join([f"{p['kodeItem']}({p['length']/1000}m)" for p in b['items']])
    print(f"Bar {h[0]}:")
    print(f"  HEGAR: used={h[1]}m, sisa={h[2]}m | {h[3]}")
    print(f"  BFD  : used={b['panjangTerpakai']/1000}m, sisa={b['sisa']/1000}m | {bfd_pieces}")
