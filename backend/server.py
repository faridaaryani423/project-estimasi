from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime, timezone
import jwt
import hashlib
import re
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'weld-planner-secret-key-2024')
JWT_ALGORITHM = "HS256"

app = FastAPI(title="Weld Planner API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========================= MODELS =========================

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    name: str
    email: str
    role: str

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    email: str
    role: str = "user"

class PasswordUpdate(BaseModel):
    password: str

class BarangBase(BaseModel):
    nama: str
    kategoriBarang: Optional[str] = None
    jenisBentuk: str = "balok"
    panjang: Optional[str] = None
    lebar: Optional[str] = None
    tinggi: Optional[str] = None
    diameter: Optional[str] = None
    ketebalan: Optional[str] = None
    tinggiWF: Optional[str] = None
    lebarFlange: Optional[str] = None
    ketebalanWeb: Optional[str] = None
    ketebalanFlange: Optional[str] = None
    panjangPlat: Optional[str] = None
    lebarPlat: Optional[str] = None
    ketebalanPlat: Optional[str] = None
    supplier: Optional[str] = None
    jenisBahan: Optional[str] = None   # ✅ ubah dari str → Optional[str]
    beratJenis: Optional[str] = None   # ✅ ubah dari str → Optional[str]
    materialId: Optional[str] = None
    hargamodal: Optional[str] = None
    satuanHargaModal: Optional[str] = "batang"
    beratbatang: Optional[str] = None
    beratbatangMode: Optional[str] = None
    minWelding: Optional[str] = "50"
    hargajasa: Optional[str] = None
    satuan: Optional[str] = "batang"
    ukuran: Optional[str] = None
    foto: Optional[str] = None
    createdBy: Optional[str] = None
    lastUpdatedBy: Optional[str] = None
    lastUpdatedByHarga: Optional[str] = None
    lastUpdatedbarang: Optional[str] = None
    lastUpdatedharga: Optional[str] = None

class BarangCreate(BarangBase):
    pass

class BarangResponse(BarangBase):
    id: str
    lastUpdatedbarang: Optional[str] = None
    lastUpdatedharga: Optional[str] = None
    lastUpdatedBy: Optional[str] = None
    lastUpdatedByHarga: Optional[str] = None
    createdAt: str

class MaterialBase(BaseModel):
    namaMaterial: str
    masaJenis: float

class MaterialCreate(MaterialBase):
    pass

class MaterialResponse(MaterialBase):
    id: str
    createdAt: str
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None
    lastUpdatedBy: Optional[str] = None

class EstimasiItem(BaseModel):
    barangId: str
    urutan: Optional[int] = None
    kodeItem: Optional[str] = None
    isManual: Optional[bool] = None
    namaBarang: str
    jenisBentuk: Optional[str] = None
    supplier: Optional[str] = None
    ukuranMentah: Optional[str] = None
    panjangMentah: Optional[float] = 0
    panjangJadi: Optional[float] = 0
    jenisBahan: Optional[str] = None
    beratJenis: Optional[str] = None
    beratbatang: Optional[str] = None
    minWelding: Optional[str] = None
    jumlahKeperluan: int
    volume: Optional[str] = None
    satuan: Optional[str] = None
    satuanBarang: Optional[str] = None
    hargaSatuan: float
    hargaJual: Optional[float] = None
    hargaJasa: Optional[float] = None
    hargaModal: Optional[float] = None
    luasPekerjaan: Optional[float] = None
    subtotalMaterial: Optional[float] = None
    subtotalMaterialPemakaian: Optional[float] = None
    subtotalMaterialWaste: Optional[float] = None
    subtotalJasa: Optional[float] = None
    subtotal: float
    beratPerBatang: Optional[float] = None
    beratTotal: Optional[float] = None
    beratWaste: Optional[float] = None
    luasPermukaan: Optional[float] = None
    luasPermukaanTotal: Optional[float] = None
    breakdown: Optional[dict] = None
    usedExistingWaste: Optional[float] = 0
    panjangManual: Optional[str] = None
    lebarManual: Optional[str] = None
    tinggiManual: Optional[str] = None
    diameterManual: Optional[str] = None
    ketebalanManual: Optional[str] = None
    tinggiWFManual: Optional[str] = None
    lebarFlangeManual: Optional[str] = None
    ketebalanWebManual: Optional[str] = None
    ketebalanFlangeManual: Optional[str] = None
    panjangPlatManual: Optional[str] = None
    lebarPlatManual: Optional[str] = None
    ketebalanPlatManual: Optional[str] = None
    jenisBentukManual: Optional[str] = None
    supplierManual: Optional[str] = None
    jenisBahanManual: Optional[str] = None
    beratJenisManual: Optional[str] = None
    beratbatangManual: Optional[str] = None
    minWeldingManual: Optional[str] = None
    hargamodalManual: Optional[str] = None
    hargajasaManual: Optional[str] = None
    satuanManual: Optional[str] = None
    satuanBarangManual: Optional[str] = None
    satuanHargaModalManual: Optional[str] = None
    hargaManual: Optional[str] = None
    # Penawaran pricing fields
    fromEstimasi: Optional[str] = None
    hargaJualPerUnit: Optional[float] = None
    subtotalJual: Optional[float] = None
    namaManual: Optional[str] = None

class EstimasiCreate(BaseModel):
    namaClient: Optional[str] = None
    perusahaan: Optional[str] = None
    lokasi: Optional[str] = None
    kontakPerson: Optional[str] = None
    namaEstimasi: str
    namaProyek: Optional[str] = None
    noOrder: Optional[str] = None
    metodeDimensiKerja: Optional[str] = 'pxl'
    panjangRuangan: Optional[float] = None
    lebarRuangan: Optional[float] = None
    luasRuanganInput: Optional[float] = None
    satuanDimensiKerja: Optional[str] = 'm²'
    nilaiDimensiKerja: Optional[float] = None
    luasRuangan: Optional[float] = None
    items: List[EstimasiItem]
    totalEstimasi: float
    totalBeratReal: Optional[float] = 0
    totalLuasPermukaan: Optional[float] = 0
    totalTitikWelding: Optional[int] = 0

class EstimasiResponse(BaseModel):
    id: str
    nomorEstimasi: str
    namaEstimasi: str
    namaClient: Optional[str] = None
    perusahaan: Optional[str] = None
    lokasi: Optional[str] = None
    kontakPerson: Optional[str] = None
    namaProyek: Optional[str] = None
    noOrder: Optional[str] = None
    metodeDimensiKerja: Optional[str] = 'pxl'
    panjangRuangan: Optional[float] = None
    lebarRuangan: Optional[float] = None
    luasRuanganInput: Optional[float] = None
    satuanDimensiKerja: Optional[str] = 'm²'
    nilaiDimensiKerja: Optional[float] = None
    luasRuangan: Optional[float] = None
    items: List[EstimasiItem]
    totalEstimasi: float
    totalBeratReal: Optional[float] = 0
    totalLuasPermukaan: Optional[float] = 0
    totalTitikWelding: Optional[int] = 0
    createdAt: str
    createdBy: Optional[str] = None
    createdByRole: Optional[str] = None
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None
    updatedByRole: Optional[str] = None

class EstimasiRef(BaseModel):
    id: str
    nomor: str
    nama: str
    # Penawaran pricing fields (Singkat mode)
    dimensiKerja: Optional[float] = None
    hargaJualPerM2: Optional[float] = None
    subtotalJual: Optional[float] = None

class PenawaranCreate(BaseModel):
    namaProject: str
    lokasiProject: str
    clientNama: str
    clientKontak: str
    estimasiIds: List[str]
    estimasiList: List[EstimasiRef]
    items: List[EstimasiItem]
    totalHarga: float
    totalBerat: Optional[float] = 0
    totalLuasPermukaan: Optional[float] = 0
    totalTitikWelding: Optional[int] = 0
    totalDimensiKerja: Optional[float] = 0
    tipePenawaran: str = "singkat"

class PenawaranResponse(BaseModel):
    id: str
    nomorPenawaran: str
    namaProject: str
    lokasiProject: str
    clientNama: str
    clientKontak: str
    estimasiIds: List[str]
    estimasiList: List[EstimasiRef]
    items: List[EstimasiItem]
    totalHarga: float
    totalBerat: Optional[float] = 0
    totalLuasPermukaan: Optional[float] = 0
    totalTitikWelding: Optional[int] = 0
    totalDimensiKerja: Optional[float] = 0
    tipePenawaran: str = "singkat"
    createdAt: str
    updatedAt: Optional[str] = None
    status: str = "draft"

# ========================= HELPERS =========================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_unique_number(prefix: str) -> str:
    now = datetime.now(timezone.utc)
    import random
    return f"{prefix}/{now.strftime('%Y%m')}/{random.randint(1000, 9999)}"

def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + 7200  # 2 hours expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(credentials.credentials)

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ========================= AUTH ROUTES =========================

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"username": data.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user["password"] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["username"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ========================= USER ROUTES =========================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users

@api_router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, current_user: dict = Depends(get_admin_user)):
    existing_user = await db.users.find_one({"username": data.username}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = {
        "id": str(int(datetime.now(timezone.utc).timestamp() * 1000)),
        "username": data.username,
        "password": hash_password(data.password),
        "name": data.name,
        "email": data.email,
        "role": data.role,
    }

    await db.users.insert_one(user)
    return {key: value for key, value in user.items() if key != "password"}

@api_router.put("/users/{user_id}/password")
async def update_user_password(user_id: str, data: PasswordUpdate, current_user: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hash_password(data.password)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Password updated"}

# ========================= BARANG ROUTES =========================

@api_router.get("/barang", response_model=List[BarangResponse])
async def get_barang(current_user: dict = Depends(get_current_user)):
    barang_list = await db.barang.find({}, {"_id": 0}).to_list(1000)
    return barang_list

@api_router.post("/barang", response_model=BarangResponse)
async def create_barang(data: BarangCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    updated_by = current_user.get("name") or current_user.get("username") or current_user.get("role") or "System"
    
    # Generate ukuran string based on jenisBentuk
    ukuran = ""
    if data.jenisBentuk == "balok":
        ukuran = f"{data.panjang} × {data.lebar} × {data.tinggi} mm"
    elif data.jenisBentuk == "tabung":
        ukuran = f"Ø{data.diameter} × {data.panjang} mm"
    elif data.jenisBentuk == "wf":
        ukuran = f"WF {data.tinggiWF} × {data.lebarFlange} × {data.ketebalanWeb} × {data.ketebalanFlange} mm"
    elif data.jenisBentuk == "plat":
        ukuran = f"{data.panjangPlat} × {data.lebarPlat} × t{data.ketebalanPlat} mm"
    elif data.jenisBentuk == "custom":
        ukuran = f"{data.panjang} × t{data.ketebalan} mm"
    
    barang = {
        "id": f"{int(datetime.now(timezone.utc).timestamp() * 1000)}_{uuid.uuid4().hex[:6]}",
        **data.model_dump(),
        "ukuran": ukuran,
        "createdBy": updated_by,
        "lastUpdatedBy": updated_by,
        "lastUpdatedbarang": now,
        "lastUpdatedharga": now,
        "createdAt": now
    }
    
    await db.barang.insert_one(barang)
    del barang["_id"]
    return barang

@api_router.put("/barang/{barang_id}", response_model=BarangResponse)
async def update_barang(barang_id: str, data: BarangCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate ukuran string
    ukuran = ""
    if data.jenisBentuk == "balok":
        ukuran = f"{data.panjang} × {data.lebar} × {data.tinggi} mm"
    elif data.jenisBentuk == "tabung":
        ukuran = f"Ø{data.diameter} × {data.panjang} mm"
    elif data.jenisBentuk == "wf":
        ukuran = f"WF {data.tinggiWF} × {data.lebarFlange} × {data.ketebalanWeb} × {data.ketebalanFlange} mm"
    elif data.jenisBentuk == "plat":
        ukuran = f"{data.panjangPlat} × {data.lebarPlat} × t{data.ketebalanPlat} mm"
    elif data.jenisBentuk == "custom":
        ukuran = f"{data.panjang} × t{data.ketebalan} mm"

    data_dict = data.model_dump()

    update_data = {
        **data_dict,
        "ukuran": ukuran,
    }

    # Gunakan timestamp dari frontend jika ada, supaya hanya field yang benar-benar berubah yang terupdate.
    # Jika frontend tidak mengirim timestamp (None), pertahankan nilai existing di DB.
    fields_to_keep_if_none = ["lastUpdatedbarang", "lastUpdatedharga", "lastUpdatedBy", "lastUpdatedByHarga"]
    for field in fields_to_keep_if_none:
        if update_data.get(field) is None:
            del update_data[field]   # hapus dari $set agar MongoDB tidak menimpa nilai lama
    
    result = await db.barang.find_one_and_update(
        {"id": barang_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Barang not found")
    
    del result["_id"]
    return result

@api_router.delete("/barang/{barang_id}")
async def delete_barang(barang_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.barang.delete_one({"id": barang_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Barang not found")
    return {"message": "Barang deleted"}

# ========================= ESTIMASI ROUTES =========================

@api_router.get("/estimasi", response_model=List[EstimasiResponse])
async def get_estimasi(current_user: dict = Depends(get_current_user)):
    estimasi_list = await db.estimasi.find({}, {"_id": 0}).to_list(1000)
    return estimasi_list

@api_router.post("/estimasi", response_model=EstimasiResponse)
async def create_estimasi(data: EstimasiCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    created_by = current_user.get("username") or "Unknown"
    created_by_role = current_user.get("role") or "user"
    
    estimasi = {
        "id": str(int(datetime.now(timezone.utc).timestamp() * 1000)),
        "nomorEstimasi": generate_unique_number("EST"),
        **data.model_dump(),
        "createdAt": now,
        "createdBy": created_by,
        "createdByRole": created_by_role,
        "updatedAt": None,
        "updatedBy": None,
        "updatedByRole": None
    }
    
    await db.estimasi.insert_one(estimasi)
    del estimasi["_id"]
    return estimasi

@api_router.put("/estimasi/{estimasi_id}", response_model=EstimasiResponse)
async def update_estimasi(estimasi_id: str, data: EstimasiCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    updated_by = current_user.get("username") or "Unknown"
    updated_by_role = current_user.get("role") or "user"
    
    update_data = {
        **data.model_dump(),
        "updatedAt": now,
        "updatedBy": updated_by,
        "updatedByRole": updated_by_role
    }
    
    result = await db.estimasi.find_one_and_update(
        {"id": estimasi_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Estimasi not found")
    
    del result["_id"]
    return result

@api_router.delete("/estimasi/{estimasi_id}")
async def delete_estimasi(estimasi_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.estimasi.delete_one({"id": estimasi_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Estimasi not found")
    return {"message": "Estimasi deleted"}

# ========================= PENAWARAN ROUTES =========================

@api_router.get("/penawaran", response_model=List[PenawaranResponse])
async def get_penawaran(current_user: dict = Depends(get_current_user)):
    penawaran_list = await db.penawaran.find({}, {"_id": 0}).to_list(1000)
    return penawaran_list

@api_router.post("/penawaran", response_model=PenawaranResponse)
async def create_penawaran(data: PenawaranCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    penawaran = {
        "id": str(int(datetime.now(timezone.utc).timestamp() * 1000)),
        "nomorPenawaran": generate_unique_number("PNW"),
        **data.model_dump(),
        "createdAt": now,
        "updatedAt": None,
        "status": "draft"
    }
    
    await db.penawaran.insert_one(penawaran)
    del penawaran["_id"]
    return penawaran

@api_router.put("/penawaran/{penawaran_id}", response_model=PenawaranResponse)
async def update_penawaran(penawaran_id: str, data: PenawaranCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()

    update_data = {
        **data.model_dump(),
        "updatedAt": now
    }

    result = await db.penawaran.find_one_and_update(
        {"id": penawaran_id},
        {"$set": update_data},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="Penawaran not found")

    del result["_id"]
    return result

@api_router.delete("/penawaran/{penawaran_id}")
async def delete_penawaran(penawaran_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.penawaran.delete_one({"id": penawaran_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Penawaran not found")
    return {"message": "Penawaran deleted"}

# ========================= MATERIAL ROUTES =========================

@api_router.get("/materials", response_model=List[MaterialResponse])
async def get_materials(current_user: dict = Depends(get_current_user)):
    materials_list = await db.materials.find({}, {"_id": 0}).to_list(1000)
    return materials_list

@api_router.post("/materials", response_model=MaterialResponse)
async def create_material(data: MaterialCreate, current_user: dict = Depends(get_current_user)):
    cleaned_name = data.namaMaterial.strip()
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Nama material wajib diisi")

    if data.masaJenis is None or data.masaJenis <= 0:
        raise HTTPException(status_code=400, detail="Masa jenis harus lebih besar dari 0")

    # Pencegahan duplikat nama material secara case-insensitive
    existing = await db.materials.find_one(
        {"namaMaterial": {"$regex": f"^{re.escape(cleaned_name)}$", "$options": "i"}},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Jenis material dengan nama tersebut sudah ada")

    now = datetime.now(timezone.utc).isoformat()
    user_name = current_user.get("name") or current_user.get("username") or "System"

    material = {
        "id": str(int(datetime.now(timezone.utc).timestamp() * 1000)),
        "namaMaterial": cleaned_name,
        "masaJenis": float(data.masaJenis),
        "createdBy": user_name,
        "lastUpdatedBy": user_name,
        "createdAt": now,
        "updatedAt": now
    }

    await db.materials.insert_one(material)
    del material["_id"]
    return material

@api_router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(material_id: str, data: MaterialCreate, current_user: dict = Depends(get_current_user)):
    cleaned_name = data.namaMaterial.strip()
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Nama material wajib diisi")

    if data.masaJenis is None or data.masaJenis <= 0:
        raise HTTPException(status_code=400, detail="Masa jenis harus lebih besar dari 0")

    # Cegah duplikat terhadap dokumen material lain
    existing = await db.materials.find_one(
        {
            "id": {"$ne": material_id},
            "namaMaterial": {"$regex": f"^{re.escape(cleaned_name)}$", "$options": "i"}
        },
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Jenis material dengan nama tersebut sudah ada")

    now = datetime.now(timezone.utc).isoformat()
    user_name = current_user.get("name") or current_user.get("username") or "System"

    update_data = {
        "namaMaterial": cleaned_name,
        "masaJenis": float(data.masaJenis),
        "updatedAt": now,
        "lastUpdatedBy": user_name
    }

    result = await db.materials.find_one_and_update(
        {"id": material_id},
        {"$set": update_data},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="Material not found")

    del result["_id"]
    return result

@api_router.delete("/materials/{material_id}")
async def delete_material(material_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.materials.delete_one({"id": material_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"message": "Material deleted"}


# ========================= INIT DATA =========================

async def _do_initialize_data():
    """Core logic for initializing default data (users and barang). Can be called from startup or API."""
    
    # Check if users exist
    user_count = await db.users.count_documents({})
    if user_count == 0:
        default_users = [
            {
                "id": "1",
                "username": "admin",
                "password": hash_password("admin123"),
                "name": "Administrator",
                "email": "admin@company.com",
                "role": "admin"
            },
            {
                "id": "2",
                "username": "user",
                "password": hash_password("user123"),
                "name": "User Biasa",
                "email": "user@company.com",
                "role": "user"
            }
        ]
        await db.users.insert_many(default_users)
        logger.info("Default users created")
    
    # Check if barang exist
    barang_count = await db.barang.count_documents({})
    if barang_count == 0:
        now = datetime.now(timezone.utc).isoformat()
        default_barang = [
            {
                "id": "1",
                "nama": "Besi Hollow 40x40",
                "kategoriBarang": "Besi",
                "jenisBentuk": "balok",
                "ukuran": "6000 × 40 × 40 mm",
                "panjang": "6000",
                "lebar": "40",
                "tinggi": "40",
                "ketebalan": "2",
                "jenisBahan": "Baja ST37",
                "beratJenis": "7850",
                "beratbatang": "18.5",
                "beratbatangMode": "auto",
                "minWelding": "50",
                "hargamodal": "150000",
                "hargajasa": "50000",
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "lastUpdatedbarang": now,
                "lastUpdatedharga": now,
                "createdAt": now
            },
            {
                "id": "2",
                "nama": "Pipa Besi 2 inch",
                "kategoriBarang": "Besi",
                "jenisBentuk": "tabung",
                "ukuran": "Ø50 × 6000 mm",
                "panjang": "6000",
                "diameter": "50",
                "ketebalan": "3",
                "jenisBahan": "Baja ST37",
                "beratJenis": "7850",
                "beratbatang": "22.8",
                "beratbatangMode": "auto",
                "minWelding": "40",
                "hargamodal": "180000",
                "hargajasa": "60000",
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "lastUpdatedbarang": now,
                "lastUpdatedharga": now,
                "createdAt": now
            },
            {
                "id": "3",
                "nama": "WF 200x100",
                "kategoriBarang": "Baja",
                "jenisBentuk": "wf",
                "ukuran": "WF 200 × 100 × 5.5 × 8 mm",
                "panjang": "12000",
                "tinggiWF": "200",
                "lebarFlange": "100",
                "ketebalanWeb": "5.5",
                "ketebalanFlange": "8",
                "jenisBahan": "Baja SS400",
                "beratJenis": "7850",
                "beratbatang": "238",
                "beratbatangMode": "auto",
                "minWelding": "100",
                "hargamodal": "2500000",
                "hargajasa": "500000",
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "lastUpdatedbarang": now,
                "lastUpdatedharga": now,
                "createdAt": now
            },
            {
                "id": "4",
                "nama": "Plat Besi 6mm",
                "kategoriBarang": "Besi",
                "jenisBentuk": "plat",
                "ukuran": "2400 × 1200 × t6 mm",
                "panjangPlat": "2400",
                "lebarPlat": "1200",
                "ketebalanPlat": "6",
                "jenisBahan": "Baja ST37",
                "beratJenis": "7850",
                "beratbatang": "135.4",
                "beratbatangMode": "auto",
                "minWelding": "50",
                "hargamodal": "850000",
                "hargajasa": "150000",
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "lastUpdatedbarang": now,
                "lastUpdatedharga": now,
                "createdAt": now
            },
            {
                "id": "5",
                "nama": "Pipa Stainless 2 inch",
                "kategoriBarang": "Stainless",
                "jenisBentuk": "tabung",
                "ukuran": "Ø50 × 6000 mm",
                "panjang": "6000",
                "diameter": "50",
                "ketebalan": "2",
                "jenisBahan": "Stainless Steel",
                "beratJenis": "7930",
                "beratbatang": "14.96",
                "beratbatangMode": "auto",
                "minWelding": "40",
                "hargamodal": "450000",
                "hargajasa": "80000",
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "lastUpdatedbarang": now,
                "lastUpdatedharga": now,
                "createdAt": now
            },
            {
                "id": "6",
                "nama": "Plat Stainless 2mm",
                "kategoriBarang": "Stainless",
                "jenisBentuk": "plat",
                "ukuran": "2400 × 1200 × t2 mm",
                "panjangPlat": "2400",
                "lebarPlat": "1200",
                "ketebalanPlat": "2",
                "jenisBahan": "Stainless Steel",
                "beratJenis": "7930",
                "beratbatang": "45.68",
                "beratbatangMode": "auto",
                "minWelding": "50",
                "hargamodal": "1200000",
                "hargajasa": "200000",
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "lastUpdatedbarang": now,
                "lastUpdatedharga": now,
                "createdAt": now
            }
        ]
        await db.barang.insert_many(default_barang)
        logger.info("Default barang created")
    else:
        # Migrate existing barang without kategoriBarang or Stainless items
        now = datetime.now(timezone.utc).isoformat()
        cursor = db.barang.find({
            "$or": [
                {"kategoriBarang": None},
                {"kategoriBarang": ""},
                {"kategoriBarang": {"$exists": False}}
            ]
        })
        async for doc in cursor:
            nama_lower = (doc.get("nama") or "").lower()
            kat = "Besi"
            if "stainless" in nama_lower:
                kat = "Stainless"
            elif "wf" in nama_lower or "baja" in nama_lower:
                kat = "Baja"
            elif "kaca" in nama_lower:
                kat = "Kaca"
            elif "alum" in nama_lower:
                kat = "Aluminium"
            await db.barang.update_one({"_id": doc["_id"]}, {"$set": {"kategoriBarang": kat}})

        # Ensure default Stainless Steel exists if none present
        stainless_count = await db.barang.count_documents({"nama": {"$regex": "stainless", "$options": "i"}})
        if stainless_count == 0:
            default_stainless = [
                {
                    "id": "5",
                    "nama": "Pipa Stainless 2 inch",
                    "kategoriBarang": "Stainless",
                    "jenisBentuk": "tabung",
                    "ukuran": "Ø50 × 6000 mm",
                    "panjang": "6000",
                    "diameter": "50",
                    "ketebalan": "2",
                    "jenisBahan": "Stainless Steel",
                    "beratJenis": "7930",
                    "beratbatang": "14.96",
                    "beratbatangMode": "auto",
                    "minWelding": "40",
                    "hargamodal": "450000",
                    "hargajasa": "80000",
                    "createdBy": "System",
                    "lastUpdatedBy": "System",
                    "lastUpdatedbarang": now,
                    "lastUpdatedharga": now,
                    "createdAt": now
                },
                {
                    "id": "6",
                    "nama": "Plat Stainless 2mm",
                    "kategoriBarang": "Stainless",
                    "jenisBentuk": "plat",
                    "ukuran": "2400 × 1200 × t2 mm",
                    "panjangPlat": "2400",
                    "lebarPlat": "1200",
                    "ketebalanPlat": "2",
                    "jenisBahan": "Stainless Steel",
                    "beratJenis": "7930",
                    "beratbatang": "45.68",
                    "beratbatangMode": "auto",
                    "minWelding": "50",
                    "hargamodal": "1200000",
                    "hargajasa": "200000",
                    "createdBy": "System",
                    "lastUpdatedBy": "System",
                    "lastUpdatedbarang": now,
                    "lastUpdatedharga": now,
                    "createdAt": now
                }
            ]
            await db.barang.insert_many(default_stainless)
            logger.info("Default stainless barang added")

    # Check if materials exist (hanya inisialisasi jika masih kosong, jangan overwrite existing)
    material_count = await db.materials.count_documents({})
    if material_count == 0:
        now = datetime.now(timezone.utc).isoformat()
        default_materials = [
            {
                "id": "1",
                "namaMaterial": "Baja",
                "masaJenis": 7850.0,
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "createdAt": now,
                "updatedAt": now
            },
            {
                "id": "2",
                "namaMaterial": "Besi",
                "masaJenis": 7850.0,
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "createdAt": now,
                "updatedAt": now
            },
            {
                "id": "3",
                "namaMaterial": "Stainless Steel",
                "masaJenis": 7930.0,
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "createdAt": now,
                "updatedAt": now
            },
            {
                "id": "4",
                "namaMaterial": "Aluminium",
                "masaJenis": 2700.0,
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "createdAt": now,
                "updatedAt": now
            }
        ]
        await db.materials.insert_many(default_materials)
        logger.info("Default materials created")


@api_router.post("/init")
async def initialize_data():
    """Initialize default data via API endpoint (users and barang)"""
    await _do_initialize_data()
    return {"message": "Data initialized"}

# ========================= SETUP =========================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Initialize data on startup
    try:
        await _do_initialize_data()
    except Exception as e:
        logger.error(f"Error initializing data: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
