#!/bin/bash

# Print a start message for the setup process.
echo "Creating Lung Tumor Platform..."

# Create backend application directories.
mkdir -p backend/app/api
mkdir -p backend/app/services
mkdir -p backend/app/models
mkdir -p backend/checkpoints
mkdir -p backend/uploads
mkdir -p backend/outputs

# Create frontend application directories.
mkdir -p frontend/src/api
mkdir -p frontend/src/pages
mkdir -p frontend/src/components
mkdir -p frontend/public

# Create root project files.
touch README.md
touch .gitignore
touch docker-compose.yml

# Create backend project files.
touch backend/Dockerfile
touch backend/requirements.txt
touch backend/app/__init__.py
touch backend/app/main.py
touch backend/app/api/__init__.py
touch backend/app/api/routes.py
touch backend/app/services/__init__.py
touch backend/app/services/inference_service.py
touch backend/app/services/export_service.py
touch backend/app/models/__init__.py
touch backend/app/models/unet2d.py

# Create frontend project files.
touch frontend/Dockerfile
touch frontend/package.json
touch frontend/src/App.tsx
touch frontend/src/api/client.ts
touch frontend/src/pages/UploadPage.tsx
touch frontend/src/pages/ResultsPage.tsx
touch frontend/src/components/SliceViewer.tsx
touch frontend/src/components/OverlayViewer.tsx
touch frontend/src/components/MetricsPanel.tsx

# Print a success message after all folders and files are created.
echo "Project structure created successfully!"
