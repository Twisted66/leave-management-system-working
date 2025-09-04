#!/bin/bash

echo "🚀 Deploying Leave Management System to Vercel + Supabase"

# Check if required tools are installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Navigate to frontend directory
cd frontend

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend for production..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful!"
    
    echo "🌐 Deploying to Vercel..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo "📋 Don't forget to:"
        echo "   1. Set up your Supabase project (see DEPLOYMENT_GUIDE.md)"
        echo "   2. Configure environment variables in Vercel dashboard"
        echo "   3. Update Supabase Auth settings with your domain"
        echo "   4. Create your first admin user"
    else
        echo "❌ Deployment failed!"
    fi
else
    echo "❌ Frontend build failed!"
    echo "💡 Try fixing build issues first, then run this script again"
fi