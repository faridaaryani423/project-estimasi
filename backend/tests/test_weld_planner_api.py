"""
Weld Planner API Tests
Tests for: Auth, Barang CRUD, Estimasi CRUD, Penawaran CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"
        
    def test_login_user_success(self):
        """Test user login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "user",
            "password": "user123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["user"]["username"] == "user"
        assert data["user"]["role"] == "user"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        
    def test_get_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = login_response.json()["token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        
    def test_get_me_without_token(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401


class TestBarang:
    """Barang CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_get_barang_list(self, auth_token):
        """Test getting list of barang"""
        response = requests.get(f"{BASE_URL}/api/barang", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have default barang from init
        assert len(data) >= 4, "Should have at least 4 default barang items"
        
    def test_get_barang_without_auth(self):
        """Test getting barang without authentication"""
        response = requests.get(f"{BASE_URL}/api/barang")
        assert response.status_code == 401
        
    def test_create_barang_balok(self, auth_token):
        """Test creating a new barang with balok type"""
        barang_data = {
            "nama": "TEST_Besi Hollow 50x50",
            "jenisBentuk": "balok",
            "panjang": "6000",
            "lebar": "50",
            "tinggi": "50",
            "jenisBahan": "Baja ST37",
            "beratJenis": "7850",
            "minWelding": "60",
            "harga": "200000"
        }
        
        response = requests.post(f"{BASE_URL}/api/barang", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=barang_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["nama"] == "TEST_Besi Hollow 50x50"
        assert data["jenisBentuk"] == "balok"
        assert "id" in data
        assert "ukuran" in data
        assert "6000 × 50 × 50 mm" in data["ukuran"]
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/barang", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        barang_list = get_response.json()
        created_barang = next((b for b in barang_list if b["id"] == data["id"]), None)
        assert created_barang is not None, "Created barang should be in list"
        
    def test_create_barang_tabung(self, auth_token):
        """Test creating a new barang with tabung type"""
        barang_data = {
            "nama": "TEST_Pipa Besi 3 inch",
            "jenisBentuk": "tabung",
            "panjang": "6000",
            "diameter": "75",
            "ketebalan": "4",
            "jenisBahan": "Baja ST37",
            "beratJenis": "7850",
            "minWelding": "50",
            "harga": "250000"
        }
        
        response = requests.post(f"{BASE_URL}/api/barang", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=barang_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["jenisBentuk"] == "tabung"
        assert "Ø75" in data["ukuran"]
        
    def test_update_barang(self, auth_token):
        """Test updating a barang"""
        # First create a barang
        create_data = {
            "nama": "TEST_Update Barang",
            "jenisBentuk": "balok",
            "panjang": "5000",
            "lebar": "30",
            "tinggi": "30",
            "jenisBahan": "Baja ST37",
            "beratJenis": "7850",
            "harga": "100000"
        }
        create_response = requests.post(f"{BASE_URL}/api/barang", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=create_data
        )
        barang_id = create_response.json()["id"]
        
        # Update the barang
        update_data = {
            "nama": "TEST_Updated Barang Name",
            "jenisBentuk": "balok",
            "panjang": "5500",
            "lebar": "35",
            "tinggi": "35",
            "jenisBahan": "Baja SS400",
            "beratJenis": "7850",
            "harga": "120000"
        }
        update_response = requests.put(f"{BASE_URL}/api/barang/{barang_id}", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_data
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["nama"] == "TEST_Updated Barang Name"
        assert updated["harga"] == "120000"
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/barang", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        barang_list = get_response.json()
        found = next((b for b in barang_list if b["id"] == barang_id), None)
        assert found["nama"] == "TEST_Updated Barang Name"
        
    def test_delete_barang(self, auth_token):
        """Test deleting a barang"""
        # First create a barang
        create_data = {
            "nama": "TEST_Delete Barang",
            "jenisBentuk": "balok",
            "panjang": "4000",
            "lebar": "25",
            "tinggi": "25",
            "jenisBahan": "Baja ST37",
            "beratJenis": "7850",
            "harga": "80000"
        }
        create_response = requests.post(f"{BASE_URL}/api/barang", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=create_data
        )
        barang_id = create_response.json()["id"]
        
        # Delete the barang
        delete_response = requests.delete(f"{BASE_URL}/api/barang/{barang_id}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify deletion with GET
        get_response = requests.get(f"{BASE_URL}/api/barang", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        barang_list = get_response.json()
        found = next((b for b in barang_list if b["id"] == barang_id), None)
        assert found is None, "Deleted barang should not be in list"


class TestEstimasi:
    """Estimasi CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_get_estimasi_list(self, auth_token):
        """Test getting list of estimasi"""
        response = requests.get(f"{BASE_URL}/api/estimasi", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_create_estimasi(self, auth_token):
        """Test creating a new estimasi"""
        estimasi_data = {
            "namaEstimasi": "TEST_Rangka Kanopi",
            "items": [
                {
                    "barangId": "1",
                    "namaBarang": "Besi Hollow 40x40",
                    "jenisBentuk": "balok",
                    "ukuranMentah": "6000 × 40 × 40 mm",
                    "panjangMentah": 6000,
                    "panjangJadi": 1000,
                    "jenisBahan": "Baja ST37",
                    "beratJenis": "7850",
                    "minWelding": "50",
                    "jumlahKeperluan": 10,
                    "hargaSatuan": 150000,
                    "subtotal": 300000,
                    "beratPerBatang": 5.5,
                    "beratTotal": 11.0,
                    "luasPermukaan": 0.5,
                    "luasPermukaanTotal": 1.0,
                    "breakdown": {
                        "kebutuhanBahan": 2,
                        "needsWelding": False,
                        "waste": 1000,
                        "wastePercentage": 8.3
                    }
                }
            ],
            "totalEstimasi": 300000,
            "totalBeratReal": 11.0,
            "totalLuasPermukaan": 1.0,
            "totalTitikWelding": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/estimasi", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=estimasi_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["namaEstimasi"] == "TEST_Rangka Kanopi"
        assert "id" in data
        assert "nomorEstimasi" in data
        assert data["nomorEstimasi"].startswith("EST/")
        assert len(data["items"]) == 1
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/estimasi", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        estimasi_list = get_response.json()
        found = next((e for e in estimasi_list if e["id"] == data["id"]), None)
        assert found is not None
        
    def test_update_estimasi(self, auth_token):
        """Test updating an estimasi"""
        # First create
        create_data = {
            "namaEstimasi": "TEST_Update Estimasi",
            "items": [],
            "totalEstimasi": 0,
            "totalBeratReal": 0,
            "totalLuasPermukaan": 0,
            "totalTitikWelding": 0
        }
        create_response = requests.post(f"{BASE_URL}/api/estimasi", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=create_data
        )
        estimasi_id = create_response.json()["id"]
        
        # Update
        update_data = {
            "namaEstimasi": "TEST_Updated Estimasi Name",
            "items": [],
            "totalEstimasi": 500000,
            "totalBeratReal": 25.0,
            "totalLuasPermukaan": 2.5,
            "totalTitikWelding": 5
        }
        update_response = requests.put(f"{BASE_URL}/api/estimasi/{estimasi_id}", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_data
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["namaEstimasi"] == "TEST_Updated Estimasi Name"
        assert updated["totalEstimasi"] == 500000
        
    def test_delete_estimasi(self, auth_token):
        """Test deleting an estimasi"""
        # First create
        create_data = {
            "namaEstimasi": "TEST_Delete Estimasi",
            "items": [],
            "totalEstimasi": 0
        }
        create_response = requests.post(f"{BASE_URL}/api/estimasi", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=create_data
        )
        estimasi_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/estimasi/{estimasi_id}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/estimasi", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        estimasi_list = get_response.json()
        found = next((e for e in estimasi_list if e["id"] == estimasi_id), None)
        assert found is None


class TestPenawaran:
    """Penawaran CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_get_penawaran_list(self, auth_token):
        """Test getting list of penawaran"""
        response = requests.get(f"{BASE_URL}/api/penawaran", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_create_penawaran(self, auth_token):
        """Test creating a new penawaran"""
        penawaran_data = {
            "namaProject": "TEST_Kanopi Rumah",
            "lokasiProject": "Jakarta Selatan",
            "clientNama": "Budi Santoso",
            "clientKontak": "081234567890",
            "estimasiIds": ["1"],
            "estimasiList": [
                {"id": "1", "nomor": "EST/202501/1234", "nama": "Rangka Kanopi"}
            ],
            "items": [
                {
                    "barangId": "1",
                    "namaBarang": "Besi Hollow 40x40",
                    "panjangMentah": 6000,
                    "panjangJadi": 1000,
                    "jumlahKeperluan": 10,
                    "hargaSatuan": 150000,
                    "subtotal": 300000
                }
            ],
            "totalHarga": 300000,
            "totalBerat": 11.0,
            "totalLuasPermukaan": 1.0,
            "totalTitikWelding": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/penawaran", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=penawaran_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["namaProject"] == "TEST_Kanopi Rumah"
        assert "id" in data
        assert "nomorPenawaran" in data
        assert data["nomorPenawaran"].startswith("PNW/")
        assert data["status"] == "draft"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/penawaran", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        penawaran_list = get_response.json()
        found = next((p for p in penawaran_list if p["id"] == data["id"]), None)
        assert found is not None
        
    def test_delete_penawaran(self, auth_token):
        """Test deleting a penawaran"""
        # First create
        create_data = {
            "namaProject": "TEST_Delete Penawaran",
            "lokasiProject": "Bandung",
            "clientNama": "Test Client",
            "clientKontak": "08999999",
            "estimasiIds": [],
            "estimasiList": [],
            "items": [],
            "totalHarga": 0
        }
        create_response = requests.post(f"{BASE_URL}/api/penawaran", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json=create_data
        )
        penawaran_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/penawaran/{penawaran_id}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/penawaran", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        penawaran_list = get_response.json()
        found = next((p for p in penawaran_list if p["id"] == penawaran_id), None)
        assert found is None


class TestInit:
    """Test data initialization"""
    
    def test_init_endpoint(self):
        """Test the /init endpoint creates default data"""
        response = requests.post(f"{BASE_URL}/api/init")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


# Cleanup fixture to remove TEST_ prefixed data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup after tests
    try:
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            token = login_response.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Cleanup barang
            barang_response = requests.get(f"{BASE_URL}/api/barang", headers=headers)
            if barang_response.status_code == 200:
                for barang in barang_response.json():
                    if barang.get("nama", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/barang/{barang['id']}", headers=headers)
            
            # Cleanup estimasi
            estimasi_response = requests.get(f"{BASE_URL}/api/estimasi", headers=headers)
            if estimasi_response.status_code == 200:
                for est in estimasi_response.json():
                    if est.get("namaEstimasi", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/estimasi/{est['id']}", headers=headers)
            
            # Cleanup penawaran
            penawaran_response = requests.get(f"{BASE_URL}/api/penawaran", headers=headers)
            if penawaran_response.status_code == 200:
                for pnw in penawaran_response.json():
                    if pnw.get("namaProject", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/penawaran/{pnw['id']}", headers=headers)
    except Exception as e:
        print(f"Cleanup error: {e}")
