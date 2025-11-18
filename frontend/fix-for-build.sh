#!/bin/bash

echo "🔧 Fixing VRS Time Wizard for EAS Build..."

# Update packages to match Expo SDK
echo "📦 Updating packages to correct versions..."
npx expo install --fix

# Deduplicate dependencies
echo "🔄 Deduplicating dependencies..."
npm dedupe

echo "✅ Fixes applied!"
echo ""
echo "Now run: eas build --platform android --profile production"
