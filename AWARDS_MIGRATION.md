# Awards System Migration: Local Files to Image URLs

## Overview
The awards system has been migrated from storing local image files to storing image URLs in MongoDB. This change eliminates the need for local file storage and makes the system more scalable.

## Changes Made

### Frontend Changes

#### 1. AwardModal.js
- **Before**: File upload input for local images
- **After**: URL input field for image links
- **Added**: URL validation to ensure valid image URLs
- **Benefits**: No file size limits, no local storage needed

#### 2. ProjectRepository.js
- **Before**: FormData with file upload
- **After**: JSON payload with image URL
- **Added**: Proper Content-Type headers for JSON requests
- **Benefits**: Simpler data handling, better error handling

#### 3. AwardsGallery.js
- **Before**: Dynamic asset loading from local files
- **After**: Direct image URL rendering
- **Added**: Error handling for broken image links
- **Benefits**: More reliable image display, fallback for broken links

### Backend Changes

#### 1. API Endpoint (/api/awards POST)
- **Before**: File upload handling with local storage
- **After**: JSON data handling with URL storage
- **Added**: URL validation on backend
- **Benefits**: No file system dependencies, better security

#### 2. Database Schema
- **Before**: `imageFilename`, `relativePath` fields
- **After**: `imageUrl` field
- **Benefits**: Simpler schema, no file path management

## Database Collection: `awards`

### New Schema
```json
{
  "_id": "ObjectId",
  "awardName": "string",
  "imageUrl": "string (URL)",
  "createdAt": "ISO date string"
}
```

### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "awardName": "Best Research Paper 2024",
  "imageUrl": "https://example.com/awards/best-paper-2024.jpg",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## Benefits of This Migration

1. **Scalability**: No local storage limits
2. **Reliability**: Images served from CDN or reliable sources
3. **Maintenance**: No file system management needed
4. **Performance**: Faster loading from optimized image URLs
5. **Security**: No file upload vulnerabilities
6. **Flexibility**: Easy to change image sources

## Usage

### Adding a New Award
1. Click "+ Add" → "+ Add Award"
2. Enter award name
3. Enter image URL (must be a valid HTTP/HTTPS URL)
4. Click "Upload Award"

### Image URL Requirements
- Must be a valid HTTP or HTTPS URL
- Should point to an actual image file
- Recommended formats: JPG, PNG, GIF, WebP
- Should be publicly accessible

## Error Handling

### Frontend
- URL validation before submission
- Image loading error handling
- Fallback text for broken images

### Backend
- URL format validation
- Database error handling
- Proper HTTP status codes

## Migration Notes

- Existing awards with local files will need to be manually migrated
- Old `imageFilename` and `relativePath` fields are no longer used
- The `awards` collection structure has been simplified
