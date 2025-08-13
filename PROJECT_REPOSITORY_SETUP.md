# Project Repository Setup Guide

## Overview
The Project Repository is a new feature that allows administrators to add and manage yearly projects. Projects are organized by year and can include teacher information, project details, and optional student information.

## Features
- **Add Projects**: Form to add new projects with year, teacher, project name, description, and optional students
- **Year-wise Organization**: Projects are automatically organized by year
- **Collapsible Years**: Current year is always expanded, other years can be collapsed/expanded
- **Teacher Integration**: Links to existing teachers in the system
- **Responsive Design**: Works on desktop and mobile devices

## Backend Setup

### 1. MongoDB Collection Setup
Run the setup script to create the required collection and indexes:

```bash
cd backend
node setup_yearly_projects.js
```

This will create:
- `yearly_projects` collection
- Indexes on `year`, `teacherName`, `createdAt`
- Compound index on `year + createdAt`

### 2. API Endpoints
The following endpoints are automatically added to `api_server.py`:

- `GET /api/yearly-projects` - Get all projects
- `POST /api/yearly-projects` - Add new project
- `PUT /api/yearly-projects/<id>` - Update project
- `DELETE /api/yearly-projects/<id>` - Delete project

### 3. Database Schema
```javascript
{
  year: Number,              // Required: Project year
  teacherName: String,        // Required: Teacher name
  projectName: String,        // Required: Project title
  projectDescription: String, // Required: Project description
  students: String,           // Optional: Student names (comma separated)
  createdAt: String,          // Auto-generated: ISO timestamp
  updatedAt: String           // Auto-generated: ISO timestamp (on updates)
}
```

## Frontend Setup

### 1. New Files Created
- `frontend/src/pages/ProjectRepository.js` - Main component
- `frontend/src/pages/ProjectRepository.css` - Styling

### 2. Navigation Integration
- Added "Project Repository" link to navbar
- Route: `/project-repository`
- Positioned between "Teachers' Overview" and "FAQs"

### 3. Features
- **Add Project Button**: Blue "+" button in top-right corner
- **Modal Form**: Clean, responsive form for adding projects
- **Year Selection**: Dropdown with last 10 years
- **Teacher Selection**: Dropdown with all available teachers
- **Project Details**: Name and description fields
- **Students Field**: Optional field for student names
- **Year-wise Display**: Projects grouped by year with collapsible sections

## Usage

### Adding a Project
1. Navigate to Project Repository page
2. Click "+ Add Project" button
3. Select year from dropdown
4. Select teacher from dropdown
5. Enter project name
6. Enter project description
7. Optionally enter student names
8. Click "Submit"

### Viewing Projects
- Projects are automatically organized by year
- Current year is always expanded
- Click on year headers to expand/collapse other years
- Each project shows:
  - Project title
  - Teacher name (as a blue badge)
  - Project description
  - Students (if provided)
  - Date added

## Technical Details

### State Management
- Uses React hooks (`useState`, `useEffect`)
- Local state for form fields and UI state
- API calls to backend for CRUD operations

### Responsive Design
- Mobile-first approach
- Responsive grid layouts
- Touch-friendly interactions
- Optimized for all screen sizes

### Error Handling
- Form validation for required fields
- API error handling with retry functionality
- User-friendly error messages

## Dependencies
- **Frontend**: React, Axios, React Router
- **Backend**: Flask, PyMongo, CORS
- **Database**: MongoDB

## Future Enhancements
- Project editing and deletion
- Project search and filtering
- Project categories/tags
- File attachments
- Project status tracking
- Export functionality

## Troubleshooting

### Common Issues
1. **Collection not found**: Run the setup script
2. **API errors**: Check backend logs and MongoDB connection
3. **Form not submitting**: Verify all required fields are filled
4. **Teachers not loading**: Check if teachers collection exists

### Debug Steps
1. Check browser console for frontend errors
2. Check backend logs for API errors
3. Verify MongoDB connection and collection existence
4. Test API endpoints directly with tools like Postman

## Support
For issues or questions about the Project Repository feature, check the backend logs and browser console for error messages.
