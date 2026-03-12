#!/bin/bash
# Automate deployment of the Virtual Sommelier backend to Google Cloud Run

set -e

# Load the API key from the server/.env file
if [ -f "server/.env" ]; then
  export $(cat server/.env | grep -v '#' | awk '/=/ {print $1}')
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY is not set in server/.env"
  exit 1
fi
GCP_PROJECT_ID=${1:-"gen-lang-client-0070879771"}

# Build the production frontend first so the server serves the updated UI
echo "Building the frontend for production..."
npm install
npm run build

echo "Deploying standalone Frontend to Google Cloud Run (Project: $GCP_PROJECT_ID)..."
gcloud run deploy spiritsage-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --project $GCP_PROJECT_ID \
  --quiet

echo "Deploying Virtual Sommelier backend to Google Cloud Run (Project: $GCP_PROJECT_ID)..."

cd server
mkdir -p data
cp ../src/data/inventory.json data/inventory.json

# IMPORTANT: Google Cloud Run has a strict 32MB response size limit.
# The React production bundle (with embeddings) can reach ~34MB.
# The Express 'compression' middleware is active in server/index.js to GZIP this down to ~13MB.
# This explicitly installs compression to ensure the deployment always contains it.
echo "Ensuring compression middleware is installed for Cloud Run limits..."
npm install compression --save
npm install

# Copy compiled frontend to server public directory
mkdir -p public
rm -rf public/*
cp -r ../dist/* public/

echo "Submitting build to Cloud Build..."
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/spiritsage-backend

echo "Deploying to Cloud Run..."
gcloud run deploy spiritsage-backend \
  --image gcr.io/$GCP_PROJECT_ID/spiritsage-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=$GEMINI_API_KEY"

echo ""
echo "Deployment complete! Please update your frontend src/hooks/useLiveAPI.js with the provided Cloud Run wss:// URL."
