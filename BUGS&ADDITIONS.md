## 🐞 Bug 4: Upload Photo Not Working

**Steps to Reproduce**
1. Go to **Profile Settings**.  
2. Upload a new profile photo.  

**Expected Result**  
- Photo should upload and appear in profile.  

**Actual Result**  
- Upload fails with:  

Failed to upload image: APIError: The request does not have valid authentication credentials for the operation.


**Logs / Errors**  
- Error trace confirms auth failure inside `updateEmployeeProfile`.  

**Fix Recommendation**  
- Check storage bucket permissions in Supabase.  
- Ensure upload request includes `Authorization` header.  
- Refresh token if expired.

---

## 🐞 Bug 5: Supporting Documents Browse Button (UI Issue)

**Steps to Reproduce**
1. Go to **Supporting Documents Section**.  
2. View the **Browse** button.  

**Expected Result**  
- Text should be horizontally centered.  

**Actual Result**  
- Text is misaligned (not centered).  

**Logs / Errors**  
- None (UI-only issue).  

**Fix Recommendation**  
- Update CSS for file input button:  
```css
input[type="file"]::file-selector-button {
  text-align: center;
  justify-content: center;
}

Common Root Cause (Bugs 1–4)

API consistently fails with:
APIError: The request does not have valid authentication credentials for the operation.

Indicates invalid, expired, or missing token.

Frontend logs show token present:
MyRequests - token present: true
but backend rejects it.

___________________________________________________________________________________________________

# 🚀 New Feature: Document Preview in Dashboards

## 🎯 Goal
Allow both **users** and **admins** to preview attached documents directly in their dashboard interfaces without downloading them.

---

## 📌 Feature Details

### 1. User Dashboard
- When a user uploads or attaches a supporting document, the file should display as a **clickable preview** card.  
- Supported preview types:
  - **PDF** → inline PDF viewer.  
  - **Images (JPG/PNG/WebP)** → thumbnail preview with zoom option.  
  - **Other formats (DOCX, XLSX, etc.)** → show file icon + filename, provide download option only.  

### 2. Admin Dashboard
- Admins should see all user-uploaded supporting documents.  
- Same preview functionality as user dashboard.  
- Admin should have additional **"Download"** and **"Delete"** actions on documents.

---

## 📂 UI/UX Requirements
- Display attached documents as cards in a **document grid/list**.  
- Each card should show:
  - File icon / thumbnail.  
  - Filename.  
  - File type & size.  
  - Actions: Preview, Download, (Admin only: Delete).  

- Preview should open in a **modal viewer** without leaving the dashboard.  

---

## 🔐 Access Control
- Users can only see their **own attached documents**.  
- Admin can see **all users' attached documents**.  

---

## 🧑‍💻 Technical Notes
- Store file metadata in DB: `id`, `userId`, `filename`, `fileType`, `fileSize`, `storageUrl`.  
- Use Supabase Storage signed URLs for secure preview access.  
- Integrate PDF.js for PDF previews.  
- Use `<img>` tag or viewer library for image previews.

---

## 👤 Admin Account Setup
Create a default admin account for testing:
- **Email:** `admin@example.com`  
- **Password:** `admin123`  
- **Role:** `admin`  

---

✅ This ensures both **users** and **admins** can preview documents seamlessly, with proper access controls in place.

_____________________________________________________________________________________________________________________________

# 🚀 New Feature: Document Notifier – Data Import/Export

## 🎯 Goal
Enable **admins** to import and export document notifier data (e.g., expiry dates, assigned users, reminders) in **XML** and **CSV** formats for bulk management.

---

## 📌 Feature Details

### 1. Import Data (XML / CSV)
- Admin can upload a **CSV** or **XML** file containing document notifier records.  
- System should:
  - Parse the file.  
  - Validate data structure and required fields.  
  - Show a preview before saving (list of rows to be imported, with validation errors highlighted).  
  - Insert valid records into the database.  
  - Skip/flag invalid rows and show error messages.  

**Required fields for each record:**  
- `documentId` or `documentName`  
- `userId` (owner/assignee)  
- `expiryDate`  
- `notificationFrequency` (e.g., weekly, monthly, custom)  
- `status` (active/inactive)  

### 2. Export Data (XML / CSV)
- Admin can export **all document notifier data** or apply filters (date range, department, user, status).  
- Export formats:
  - **CSV** → Easy to open in Excel/Google Sheets.  
  - **XML** → Structured data for integration with external systems.  

### 3. Admin UI Requirements
- In **Admin Dashboard → Document Notifier Section**, add:
  - **Import Button** → Choose file (CSV/XML).  
  - **Export Button** → Dropdown with options:
    - Export All (CSV)  
    - Export All (XML)  
    - Export Filtered (CSV/XML).  

- After import → show **success/failure summary**.  
- After export → automatically download the file.

---

## 🧑‍💻 Technical Notes
- **Parsing Libraries**:
  - CSV → `papaparse` (frontend) or `fast-csv` (backend).  
  - XML → `xml2js` or `fast-xml-parser`.  
- **Validation Layer**:
  - Ensure `expiryDate` is in correct format (ISO 8601).  
  - Ensure `userId` exists in users table.  
- **Export**:
  - Fetch DB records.  
  - Convert to selected format.  
  - Stream/download as file.

---

## 🔐 Access Control
- Only **admin users** (role = admin) can import/export notifier data.  
- Regular employees cannot access this feature.  

---

✅ With this feature, admins can **bulk upload notifications** and **export records** for reporting or backup purposes.

