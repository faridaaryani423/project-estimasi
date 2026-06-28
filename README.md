# Project Estimasi Hegar

This repository contains the source code for the **Project Estimasi Hegar** application. The project is divided into a React frontend and a Python FastAPI backend.

## Directory Structure

```text
project-estimasi/
├── backend/                  # Python FastAPI Backend
│   ├── tests/                # Unit and integration tests
│   ├── .env                  # Environment variables for backend
│   ├── Dockerfile            # Docker configuration for backend
│   ├── requirements.txt      # Python dependencies
│   └── server.py             # Main FastAPI application server
│
├── frontend/                 # React Frontend (Create React App + Tailwind)
│   ├── public/               # Public assets
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable React components (UI, Forms)
│   │   ├── contexts/         # React contexts for state management
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility libraries and helpers
│   │   ├── pages/            # Page components (Dashboard, Estimasi, dll)
│   │   ├── services/         # API integration services (api.js)
│   │   ├── utils/            # Calculation engine and utilities
│   │   ├── App.js            # Main application component
│   │   └── index.js          # Entry point
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── craco.config.js       # CRACO configuration for Tailwind
│   ├── Dockerfile            # Docker configuration for frontend
│   ├── package.json          # Node.js dependencies and scripts
│   └── README.md             # Frontend specific documentation
│
├── docker-compose.yml        # Docker Compose configuration to run the stack
├── Dockerfile.backend        # Alternate Dockerfile for backend
└── Dockerfile.frontend       # Alternate Dockerfile for frontend
```

## Key Components

### Frontend (`frontend/`)
- **Pages**: 
  - `EstimasiForm.jsx`: Form input to calculate material needs, waste, and costs.
  - `EditEstimasi.jsx`: Edit existing estimations.
  - `Estimasi.jsx`: Displays all estimations and performs cost recalculations.
  - `Penawaran.jsx`: Generates price quotes (Detail and Singkat modes) and PDFs.
  - `InputBarang.jsx`: Manage material inventory and prices.
  - `Dashboard.jsx`: Overall dashboard view.
  - `Login.jsx`: User authentication.
- **Utils**:
  - `calculationEngine.js`: Core logic for calculating material allocation, waste optimization, and costs based on dimensions and material lengths.

### Backend (`backend/`)
- **`server.py`**: A FastAPI server that handles:
  - MongoDB database connections and CRUD operations.
  - User authentication and role management.
  - Endpoints for `Barang`, `Estimasi`, `Penawaran`, and `User`.
