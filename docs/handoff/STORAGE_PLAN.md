# DMI College Hostel Management PWA — Cloud Storage Specification

## 1. Storage Buckets Overview

The application utilizes two dedicated cloud storage buckets (e.g. Supabase Storage / AWS S3 / Google Cloud Storage):

| Bucket Name | Content | Max Stored File Size | Permissions |
| :--- | :--- | :--- | :--- |
| `student-photos` | Student profile ID photos | **1 MB** (1,048,576 bytes) | Public Read, Authenticated Student Write |
| `student-letters` | Official student leave request letters | **2 MB** (2,097,152 bytes) | Authenticated Read (Student, Staff, Warden, Leadership) |

---

## 2. Photo Compression & Validation Pipeline

The client-side image processing utility (`src/lib/utils/imageCompressor.js`) enforces:

1. **Input Size Gate**:
   - Maximum raw input size: **15 MB** (`WORKFLOW_CONFIG.maxPhotoInputBytes`).
   - Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`.
2. **Auto-Compression Engine**:
   - Resizes source image to a square 400x400px canvas (`WORKFLOW_CONFIG.photoOutputPx`).
   - Iteratively adjusts JPEG/WebP compression quality (starting at 0.85 down to 0.50) until file size is ≤ **1 MB**.
   - Generates a Base64/Blob output ready for upload.
3. **Switchable Operation**:
   - When policy is set to `"auto_compress"`: Client automatically compresses images up to 15 MB down to ≤ 1 MB without rejecting the user.
   - When policy is set to `"reject"`: Client strictly rejects any input file exceeding 1 MB upfront.

---

## 3. Storage Security & File Upload Verification

When replacing mock base64 storage with cloud bucket storage:
1. Server verifies MIME type using magic number inspection (preventing arbitrary executable file uploads).
2. Generate deterministic storage path: `students/{studentId}/avatar.webp`.
3. Store URL in `students.photo_url` column in PostgreSQL.
