# Akash Portfolio · Production Asset & Video Checklist

This document details all required video files, high-resolution media placeholders, and editorial items for **Abdikhaliq Abdi / Akash (`@SG_AKASH`)**, UoN medical student leader, UNSA Head of Public Service, and Northern Kenya CBO founder.

---

## 1. Video Reels (TikTok / Field Dispatches)
The application currently renders TikTok embed iframes with fallback poster images (`phone-poster-cover`). To replace or add custom local video files for offline hosting, place the following MP4 files in `/public/assets/videos/`:

1. **`video-1.mp4`**
   - **Context**: Campus Advocacy & Hostel Drive dispatch (`@SG_AKASH`).
   - **Target Duration**: 15–30 seconds.
   - **Aspect Ratio**: 9:16 Vertical.
2. **`video-2.mp4`**
   - **Context**: UNSA Public Service campus address & town halls.
   - **Target Duration**: 20–45 seconds.
   - **Aspect Ratio**: 9:16 Vertical.
3. **`video-3.mp4`**
   - **Context**: Leadership reflections and Northern Kenya community service.
   - **Target Duration**: 15–30 seconds.
   - **Aspect Ratio**: 9:16 Vertical.

---

## 2. High-Resolution Photography Slots
All current photographs are sourced from the uploaded package in `/public/assets/aistudio/`:
- **Hero Portrait**: `hero-portrait_10ea5f30.jpg`
- **About Portrait**: `about-portrait_57be4fc8.jpg`
- **Photo of Us (Brother Section)**: `about-brother` (Dedicated Brother Tribute section on the About page. To add real photo of the two of you: place image at `/public/assets/aistudio/about-brother.jpg` and update `src` in `src/media.ts`)
- **Candid Cluster**: `candid-1_45d9e56.jpg`, `candid-2_8a2b53c.jpg`, `candid-3_498b25e.jpg`, `candid-4_387f21a.jpg`
- **Leadership Victory Proof**: `leadership-achievement-4_86e9ddb8.jpg` (563x324 non-upscaled e-vote tally card)

---

## 3. Text Placeholders & Content Verification
- **Brother & Family Reference**: Added in About Chapter 01 ("Growing up alongside my brother and family in Northern Kenya...").
- **Instagram Handle**: `@akash_icekid` integrated into the direct contact channels.
- **Liquid Spill Shader**: GPU-accelerated WebGL fragment shader (`PaintTransition.tsx`) active for all page transitions and water effect triggers.
