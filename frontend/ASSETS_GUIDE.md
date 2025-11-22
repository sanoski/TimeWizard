# VRS Time Wizard - Assets Guide
## Icon & Image Configuration

**Version:** 1.2.0  
**Last Updated:** November 22, 2025

---

## 📁 Asset File Structure

```
/app/frontend/assets/images/
├── icon.png              # Main app icon (1024x1024)
├── adaptive-icon.png     # Android adaptive icon (1024x1024)
├── splash-image.png      # Splash screen image (recommended: 1284x2778)
├── favicon.png           # Web favicon (48x48 or 192x192)
└── app-image.png         # Optional: In-app branding image
```

---

## 🎨 Required Assets

### **1. icon.png**
- **Size:** 1024x1024 pixels
- **Format:** PNG with transparency
- **Purpose:** Main app icon shown on home screen
- **Used in:** `app.json` → `icon`
- **Path:** `./assets/images/icon.png`

### **2. adaptive-icon.png**
- **Size:** 1024x1024 pixels
- **Format:** PNG with transparency
- **Purpose:** Android adaptive icon (foreground layer)
- **Used in:** `app.json` → `android.adaptiveIcon.foregroundImage`
- **Path:** `./assets/images/adaptive-icon.png`
- **Background Color:** `#2563eb` (blue) - defined in app.json

**Note:** For adaptive icons, keep important elements in the center ~66% of the image. The outer areas may be cropped on different Android launchers.

### **3. splash-image.png**
- **Size:** Flexible (recommended: 1284x2778 or smaller centered image)
- **Format:** PNG with transparency
- **Purpose:** Loading screen when app launches
- **Used in:** 
  - `app.json` → `splash.image`
  - `app.json` → `plugins.expo-splash-screen.image`
- **Path:** `./assets/images/splash-image.png`
- **Settings:**
  - `resizeMode`: "contain"
  - `backgroundColor`: "#ffffff"
  - `imageWidth`: 200 (rendered width)

### **4. favicon.png**
- **Size:** 48x48 or 192x192 pixels
- **Format:** PNG
- **Purpose:** Browser tab icon (web version)
- **Used in:** `app.json` → `web.favicon`
- **Path:** `./assets/images/favicon.png`

---

## 🔧 Configuration References

### **app.json Configuration**

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#2563eb"
      }
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-image.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ],
    "splash": {
      "image": "./assets/images/splash-image.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    }
  }
}
```

---

## 📝 Naming Conventions

**IMPORTANT:** Always use lowercase with hyphens for consistency:

✅ **Correct:**
- `icon.png`
- `adaptive-icon.png`
- `splash-image.png`

❌ **Incorrect (causes issues):**
- `Icon.png` (capital letters)
- `adaptive_icon.png` (underscores)
- `splashImage.png` (camelCase)
- `splash image.png` (spaces)

---

## 🖼️ Image Specifications

### **Icon Design Guidelines:**

1. **Transparency:** Use transparent background for icon.png and adaptive-icon.png
2. **Safe Area:** Keep important content in center ~66% for adaptive icons
3. **Simplicity:** Clear, recognizable design at small sizes
4. **Brand Colors:** Match app theme (#2563eb blue)

### **Splash Screen Design:**

1. **Simple Logo:** Just the logo/icon, no text clutter
2. **Centered:** Will be centered on white background
3. **Aspect Ratio:** Square or slightly vertical works best
4. **File Size:** Keep under 500KB for fast loading

### **Current Theme:**
- Primary Color: `#2563eb` (blue)
- Background: `#ffffff` (white)
- Theme: Railroad/MOW focus

---

## 🔄 Replacing Assets

### **Step-by-Step Process:**

1. **Prepare New Images:**
   - Create all required sizes (1024x1024 for icons)
   - Use PNG format with transparency
   - Optimize file sizes (use tools like TinyPNG)
   - Follow naming conventions exactly

2. **Backup Old Assets:**
   ```bash
   cd /app/frontend/assets/images
   mkdir backup
   cp icon.png adaptive-icon.png splash-image.png favicon.png backup/
   ```

3. **Replace Images:**
   ```bash
   # Copy your new images (must be named correctly)
   cp ~/your-new-icon.png icon.png
   cp ~/your-new-adaptive-icon.png adaptive-icon.png
   cp ~/your-new-splash.png splash-image.png
   cp ~/your-new-favicon.png favicon.png
   ```

4. **Verify File Names:**
   ```bash
   ls -la
   # Ensure exact names match: icon.png, adaptive-icon.png, splash-image.png, favicon.png
   ```

5. **Clear Cache & Rebuild:**
   ```bash
   cd /app/frontend
   rm -rf .expo node_modules/.cache
   npx expo start --clear
   ```

6. **Test on Device:**
   - Install on physical device
   - Check icon appears correctly
   - Launch app to see splash screen
   - Verify no broken image errors

---

## 🐛 Common Issues & Solutions

### **Issue 1: Icon not showing**
**Cause:** File name mismatch or wrong path  
**Solution:** 
- Check exact spelling in app.json
- Ensure lowercase with hyphens
- Path must be `./assets/images/icon.png`

### **Issue 2: Adaptive icon cropped incorrectly**
**Cause:** Important content too close to edges  
**Solution:**
- Keep logo/text in center ~66% of canvas
- Test with Android preview tools

### **Issue 3: Splash screen doesn't appear**
**Cause:** Image too large or wrong format  
**Solution:**
- Optimize PNG file size
- Check resizeMode is "contain"
- Ensure backgroundColor is set

### **Issue 4: Changes not visible**
**Cause:** Metro cache or old build  
**Solution:**
```bash
rm -rf .expo node_modules/.cache
npx expo start --clear
```

---

## 🔍 Verification Checklist

Before building APK, verify:

- [ ] All files named correctly (lowercase, hyphens)
- [ ] All files in `/app/frontend/assets/images/`
- [ ] icon.png is 1024x1024 PNG
- [ ] adaptive-icon.png is 1024x1024 PNG
- [ ] splash-image.png exists and is PNG
- [ ] favicon.png exists
- [ ] app.json references match exactly
- [ ] Tested on device via Expo Go
- [ ] No console errors about missing assets
- [ ] Icon appears correctly on home screen
- [ ] Splash screen shows properly

---

## 📦 Building with New Assets

### **EAS Build:**
```bash
cd /app/frontend
eas build --platform android --profile production
```

**Notes:**
- Assets are bundled into APK automatically
- No need to manually include images
- Cache is cleared during EAS build
- All paths are resolved from app.json

---

## 🎨 Recommended Tools

### **Image Creation:**
- **Figma:** Design icons and splash screens
- **Canva:** Quick logo creation
- **Photoshop/GIMP:** Professional editing

### **Optimization:**
- **TinyPNG:** Compress without quality loss
- **Squoosh:** Online image optimizer
- **ImageOptim:** Mac app for optimization

### **Preview:**
- **Android Asset Studio:** Preview adaptive icons
- **Expo Go:** Test on real device
- **Expo Web:** Quick browser preview

---

## 📋 Quick Reference

### **File Name Checklist:**
```
✅ icon.png
✅ adaptive-icon.png
✅ splash-image.png
✅ favicon.png
```

### **app.json Paths:**
```json
{
  "icon": "./assets/images/icon.png",
  "adaptiveIcon.foregroundImage": "./assets/images/adaptive-icon.png",
  "splash.image": "./assets/images/splash-image.png",
  "web.favicon": "./assets/images/favicon.png"
}
```

### **Quick Test:**
```bash
# Verify files exist
ls -la /app/frontend/assets/images/*.png

# Check naming
find /app/frontend/assets/images -name "*.png" -type f

# Clear cache and restart
cd /app/frontend && rm -rf .expo && npx expo start --clear
```

---

## 🔗 Additional Resources

- [Expo Icon Guidelines](https://docs.expo.dev/guides/app-icons/)
- [Android Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
- [Splash Screen Guide](https://docs.expo.dev/guides/splash-screens/)

---

**Last Updated:** November 22, 2025  
**App Version:** 1.2.0  
**Status:** ✅ Ready for Asset Replacement
