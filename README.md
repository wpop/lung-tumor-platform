# Lung Tumor Platform

![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white) ![PyTorch 2.6](https://img.shields.io/badge/PyTorch-2.6-EE4C2C?style=flat&logo=pytorch&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white) ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-Planned-2496ED?style=flat&logo=docker&logoColor=white) ![CUDA](https://img.shields.io/badge/CUDA-Enabled-76B900?style=flat&logo=nvidia&logoColor=white) ![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

AI-powered lung tumor segmentation platform using PyTorch, FastAPI and React.

---

## Project Overview

Lung Tumor Platform is a medical imaging web application for automatic lung tumor segmentation on chest CT scans stored as NIfTI (`.nii.gz`) volumes. It supports full-volume uploads, model inference, and interactive inspection of predicted tumor masks.

The backend uses FastAPI and PyTorch to run deep-learning inference with a trained U-Net model. It processes CT volumes slice by slice, generates a predicted mask, exports PNG visualizations, and exposes results through a REST API.

The React frontend provides an interactive medical image viewer for reviewing results. Users can compare the original CT slice with the prediction overlay side by side, navigate through slices, adjust overlay opacity, and download generated outputs.

---

## Screenshots

### Home

![Home](docs/images/01_home.png)

### Prediction Results

![Prediction](docs/images/02_prediction.png)

### Slice Navigation

![Slice Navigation](docs/images/03_slice_navigation.png)

### Download Center

![Download Center](docs/images/04_download_center.png)

---

## Features

- Full-volume U-Net inference
- CUDA GPU support
- NIfTI (`.nii.gz`) upload
- Drag & Drop upload
- Interactive slice viewer
- Original CT and prediction overlay side-by-side
- Slice slider
- Previous / Next navigation
- Overlay opacity control
- Download predicted mask
- Download overlay image
- Case Information panel
- FastAPI REST API
- React + TypeScript frontend

---

## Architecture

```text
React + TypeScript
        |
        v
FastAPI
        |
        v
PyTorch U-Net
        |
        v
Predicted Mask
        |
        v
Interactive Viewer
```

---

## Technology Stack

### Backend

- Python
- PyTorch
- FastAPI
- NumPy
- OpenCV
- NiBabel

### Frontend

- React
- TypeScript
- Vite

### Medical Imaging

- NIfTI
- U-Net

### Deployment

- Docker Compose

---

## Project Structure

```text
lung-tumor-platform/
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |   `-- routes.py
|   |   |-- models/
|   |   |   `-- unet2d.py
|   |   |-- services/
|   |   |   |-- export_service.py
|   |   |   |-- inference_service.py
|   |   |   `-- model_loader.py
|   |   `-- main.py
|   |-- checkpoints/
|   |-- outputs/
|   |-- uploads/
|   |-- Dockerfile
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |   `-- client.ts
|   |   |-- App.css
|   |   |-- App.tsx
|   |   `-- main.tsx
|   |-- Dockerfile
|   |-- package.json
|   `-- vite.config.ts
|-- tools/
|-- docker-compose.yml
`-- README.md
```

---

## Running the Project

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend API: `http://127.0.0.1:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend app: `http://127.0.0.1:5173`

### Docker

Docker Compose runs the local stack with CPU inference by default. GPU-specific Docker configuration has not been added yet.

```bash
cp .env.example .env
docker compose up --build
```

---

## Future Improvements

- GPU-enabled Docker configuration
- AWS deployment
- VTK.js 3D volume rendering
- Cornerstone3D viewer
- DICOM support
- Multi-class segmentation
- Authentication

---

## License

MIT
