#!/bin/bash
# Deployment script for IDP Platform to EC2
# Excludes macOS metadata files and deploys cleanly

set -e

EC2_HOST="13.42.36.97"
SSH_KEY="$HOME/.ssh/idp-demo-key-new.pem"

echo "=== IDP Platform Deployment Script ==="
echo ""

# Function to deploy backend
deploy_backend() {
    echo "📦 Packaging backend (excluding macOS files)..."
    cd backend

    # Use COPYFILE_DISABLE to prevent ._* files
    COPYFILE_DISABLE=1 tar -czf /tmp/backend-source.tar.gz \
        --exclude='venv' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='.git' \
        --exclude='idp.db' \
        --exclude='._*' \
        --exclude='.DS_Store' \
        .

    cd ..

    echo "📤 Uploading backend to EC2..."
    scp -i "$SSH_KEY" /tmp/backend-source.tar.gz "ec2-user@$EC2_HOST:/home/ec2-user/idp/"

    echo "🔨 Building and deploying backend..."
    ssh -i "$SSH_KEY" "ec2-user@$EC2_HOST" << 'ENDSSH'
cd /home/ec2-user/idp
rm -rf backend-build
mkdir -p backend-build
cd backend-build
tar -xzf ../backend-source.tar.gz

echo "Building backend Docker image..."
docker build --no-cache -t idp-backend:latest .

echo "Restarting backend..."
cd ..
docker-compose stop backend
docker-compose rm -f backend
docker-compose up -d backend

# Clean up ._* files just in case
docker exec idp-backend find /app/app/templates -name "._*" -type f -delete 2>/dev/null || true

echo "⏳ Waiting for backend to be ready..."
sleep 5

echo "🔄 Running database migrations..."
docker exec idp-backend alembic upgrade head || \
  docker exec idp-backend python -c "from app.core.database import init_db; init_db(); print('✅ Database initialized')"

echo "✅ Backend deployed!"
ENDSSH

    echo "✅ Backend deployment complete!"
}

# Function to deploy frontend
deploy_frontend() {
    echo "📦 Packaging frontend (excluding macOS files)..."
    cd frontend

    # Use COPYFILE_DISABLE to prevent ._* files
    COPYFILE_DISABLE=1 tar -czf /tmp/frontend-source.tar.gz \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.git' \
        --exclude='._*' \
        --exclude='.DS_Store' \
        .

    cd ..

    echo "📤 Uploading frontend to EC2..."
    scp -i "$SSH_KEY" /tmp/frontend-source.tar.gz "ec2-user@$EC2_HOST:/home/ec2-user/idp/"

    echo "🔨 Building and deploying frontend..."
    ssh -i "$SSH_KEY" "ec2-user@$EC2_HOST" << 'ENDSSH'
cd /home/ec2-user/idp
rm -rf frontend-build
mkdir -p frontend-build
cd frontend-build
tar -xzf ../frontend-source.tar.gz

echo "Building frontend Docker image..."
docker build --no-cache -t idp-frontend:latest .

echo "Restarting frontend..."
cd ..
docker-compose stop frontend
docker-compose rm -f frontend
docker-compose up -d frontend

echo "✅ Frontend deployed!"
ENDSSH

    echo "✅ Frontend deployment complete!"
}

# Main menu
case "${1:-both}" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    both)
        deploy_backend
        deploy_frontend
        ;;
    *)
        echo "Usage: $0 [backend|frontend|both]"
        exit 1
        ;;
esac

echo ""
echo "=== Deployment Complete! ==="
echo "🌐 Frontend: https://kris-idp.org"
echo "🔌 Backend API: https://kris-idp.org/api/v1"
echo ""
echo "✅ Database migrations applied automatically"
echo "💡 Remember to hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
