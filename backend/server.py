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
    hargamodal: Optional[str] = None
    beratbatang: Optional[str] = None
    minWelding: Optional[str] = "50"
    hargamodal: str
    hargajasa: Optional[str] = None
    ukuran: Optional[str] = None
    foto: Optional[str] = None
    createdBy: Optional[str] = None
    lastUpdatedBy: Optional[str] = None

class BarangCreate(BarangBase):
    pass

class BarangResponse(BarangBase):
    id: str
    lastUpdatedbarang: str
    lastUpdatedharga: str
    createdAt: str

class EstimasiItem(BaseModel):
    barangId: str
    kodeItem: Optional[str] = None
    namaBarang: str
    jenisBentuk: Optional[str] = None
    ukuranMentah: Optional[str] = None
    panjangMentah: float
    panjangJadi: float
    jenisBahan: Optional[str] = None
    beratJenis: Optional[str] = None
    minWelding: Optional[str] = None
    jumlahKeperluan: int
    volume: Optional[str] = None
    hargaSatuan: float
    subtotal: float
    beratPerBatang: Optional[float] = None
    beratTotal: Optional[float] = None
    luasPermukaan: Optional[float] = None
    luasPermukaanTotal: Optional[float] = None
    breakdown: Optional[dict] = None
    usedExistingWaste: Optional[float] = 0

class EstimasiCreate(BaseModel):
    namaClient: Optional[str] = None
    lokasi: Optional[str] = None
    kontakPerson: Optional[str] = None
    namaEstimasi: str
    panjangRuangan: Optional[float] = None
    lebarRuangan: Optional[float] = None
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
    lokasi: Optional[str] = None
    kontakPerson: Optional[str] = None
    panjangRuangan: Optional[float] = None
    lebarRuangan: Optional[float] = None
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
        "exp": datetime.now(timezone.utc).timestamp() + 300  # 5 minutes expiration
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
        "id": str(int(datetime.now(timezone.utc).timestamp() * 1000)),
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
    updated_by = current_user.get("name") or current_user.get("username") or current_user.get("role") or "System"
    
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
    
    update_data = {
        **data.model_dump(),
        "ukuran": ukuran,
        "lastUpdatedBy": updated_by,
        "lastUpdatedbarang": now
    }
    
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

# ========================= INIT DATA =========================

@api_router.post("/init")
async def initialize_data():
    """Initialize default data (users and barang)"""
    
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
                "jenisBentuk": "balok",
                "ukuran": "6000 × 40 × 40 mm",
                "panjang": "6000",
                "lebar": "40",
                "tinggi": "40",
                "ketebalan": "2",
                "jenisBahan": "Baja ST37",
                "beratJenis": "7850",
                "beratbatang": "18.5",
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
                "jenisBentuk": "tabung",
                "ukuran": "Ø50 × 6000 mm",
                "panjang": "6000",
                "diameter": "50",
                "ketebalan": "3",
                "jenisBahan": "Baja ST37",
                "beratJenis": "7850",
                "beratbatang": "22.8",
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
                "jenisBentuk": "plat",
                "ukuran": "2400 × 1200 × t6 mm",
                "panjangPlat": "2400",
                "lebarPlat": "1200",
                "ketebalanPlat": "6",
                "jenisBahan": "Baja ST37",
                "beratJenis": "7850",
                "beratbatang": "135.4",
                "minWelding": "50",
                "hargamodal": "850000",
                "hargajasa": "150000",
                "createdBy": "System",
                "lastUpdatedBy": "System",
                "lastUpdatedbarang": now,
                "lastUpdatedharga": now,
                "createdAt": now
            }
        ]
        await db.barang.insert_many(default_barang)
        logger.info("Default barang created")
    
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
        await initialize_data()
    except Exception as e:
        logger.error(f"Error initializing data: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
