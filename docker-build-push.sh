#!/bin/bash
# Docker Hub Build & Push Script for Forumyzer

# CONFIGURATION - UPDATE THESE
DOCKER_USERNAME="your-dockerhub-username"
IMAGE_NAME="forumyzer-backend"
VERSION="latest"

# Full image tag
IMAGE_TAG="${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"

echo "🐳 Building Docker image for Forumyzer backend..."
echo "Image tag: ${IMAGE_TAG}"

# Build the image
cd backend
docker build -t ${IMAGE_TAG} .

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📤 Pushing to Docker Hub..."
    docker push ${IMAGE_TAG}

    if [ $? -eq 0 ]; then
        echo "✅ Push successful!"
        echo ""
        echo "🚂 Railway Configuration:"
        echo "   1. Go to your Railway project"
        echo "   2. Go to Settings"
        echo "   3. Under 'Deploy', select 'Docker Image'"
        echo "   4. Enter: ${IMAGE_TAG}"
        echo ""
        echo "   Or add to railway.json:"
        echo "   {\"build\": {\"dockerImage\": \"${IMAGE_TAG}\"}}"
    else
        echo "❌ Push failed! Make sure you're logged in:"
        echo "   docker login"
    fi
else
    echo "❌ Build failed!"
fi
