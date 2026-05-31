# Employee Code Feature Implementation

## Overview

This document describes the implementation of the employee code feature for users in the Grover Platform system.

## Changes Summary

### 1. CSS Fix - Subsystems Table Alignment

**File:** `frontend/src/components/subsystems/SubsystemListPage.css`

**Changes:**
- Added `vertical-align: middle` to `.subsystems-table th` (table headers)
- Changed `vertical-align: middle` to `vertical-align: top` for `.subsystems-table td` (table cells)

**Purpose:** Ensures consistent vertical alignment of table cells, preventing lines from appearing at different heights.

---

### 2. Backend Changes

#### 2.1 Database Migration

**File:** `backend/scripts/migrations/20260107_add_employee_code.sql`

**Changes:**
- Updated to support VARCHAR(5) instead of VARCHAR(3)
- Added logic to alter existing column if it already exists
- Maintains unique index on employee_code (partial index for non-null values)

**SQL:**
```sql
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'employee_code') THEN
    ALTER TABLE users ADD COLUMN employee_code VARCHAR(5);
  ELSE
    ALTER TABLE users ALTER COLUMN employee_code TYPE VARCHAR(5);
  END IF;
END $$;
```

#### 2.2 User Entity

**File:** `backend/src/entities/User.ts`

**Changes:**
- Updated `employeeCode` field from VARCHAR(3) to VARCHAR(5)

```typescript
@Column({ name: 'employee_code', type: 'varchar', length: 5, unique: true, nullable: true })
employeeCode: string;
```

#### 2.3 Employee Code Generator Service (NEW)

**File:** `backend/src/services/EmployeeCodeGenerator.ts`

**Purpose:** Generates unique employee codes based on first and last names.

**Algorithm:**
1. **Level 1 (3 chars):** [1 letter from first name][2 letters from last name] - e.g., "RKR" from "Remigiusz Krakowski"
2. **Level 2 (4 chars):** [2 letters from first name][2 letters from last name] - e.g., "REKR"
3. **Level 3 (5 chars):** [3 letters from first name][2 letters from last name] - e.g., "REMKR"
4. **Level 4 (5 chars):** [2 letters from first name][1 letter from last name][2 digits] - e.g., "REK01" to "REK99"

**Features:**
- Automatic uppercase conversion
- Supports Polish characters (Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż)
- Removes non-letter characters (numbers, hyphens, etc.)
- Checks for uniqueness at each level
- Validation method for manual code entry
- Availability checking for existing users

**Methods:**
- `generate(firstName, lastName)` - Generates unique code
- `validateCode(code)` - Validates format (3-5 chars, uppercase letters and digits only)
- `isCodeAvailable(code, excludeUserId?)` - Checks if code is available

#### 2.4 User Controller

**File:** `backend/src/controllers/UserController.ts`

**Changes:**

1. **Imports:**
   - Added import for `EmployeeCodeGenerator`

2. **Create Method (`POST /api/users`):**
   - Removed old `generateEmployeeCode` method
   - Uses `EmployeeCodeGenerator.generate()` for automatic code generation
   - Supports optional manual `employeeCode` in request body
   - Validates manual codes using `EmployeeCodeGenerator.validateCode()`
   - Checks uniqueness before creating user

3. **Update Method (`PUT /api/users/:id`):**
   - Added support for updating `employeeCode`
   - Validates new codes
   - Checks uniqueness (excluding current user)
   - Allows clearing code by passing `null` or empty string

4. **List Methods:**
   - Already included `employeeCode` in response (no changes needed)

---

### 3. Frontend Changes

#### 3.1 Type Definitions

**File:** `frontend/src/types/admin.types.ts`

**Changes:**
- Added `employeeCode?: string` to `User` interface
- Added `employeeCode?: string` to `CreateUserDto` interface

#### 3.2 User List Page

**File:** `frontend/src/components/users/UserListPage.tsx`

**Changes:**
1. Added `employeeCode?: string` to local `User` interface
2. Added "Kod" (Code) column header after "Login" column
3. Added employeeCode display in table body:
   ```tsx
   <td>
     <code>{user.employeeCode || '-'}</code>
   </td>
   ```
4. Updated colspan in empty state from 9 to 10

#### 3.3 User Create Modal

**File:** `frontend/src/components/users/UserCreateModal.tsx`

**Changes:**
1. Added `employeeCode: ''` to form state
2. Updated `handleChange` to automatically convert employeeCode to uppercase
3. Added employeeCode field to form (optional):
   ```tsx
   <div className="form-group">
     <label htmlFor="employeeCode">Kod pracownika (opcjonalnie)</label>
     <input
       type="text"
       id="employeeCode"
       name="employeeCode"
       value={formData.employeeCode}
       onChange={handleChange}
       className="input"
       maxLength={5}
       placeholder="Auto-generowany"
     />
     <small className="form-help">
       3-5 znaków (wielkie litery). Pozostaw puste dla automatycznego generowania.
     </small>
   </div>
   ```
4. Updated submit logic to only include employeeCode if not empty

#### 3.4 User Edit Modal

**File:** `frontend/src/components/users/UserEditModal.tsx`

**Changes:**
1. Added `employeeCode?: string` to local `User` interface
2. Added `employeeCode: user.employeeCode || ''` to form state
3. Updated `handleChange` to automatically convert employeeCode to uppercase
4. Added employeeCode field to form (editable):
   ```tsx
   <div className="form-group">
     <label htmlFor="employeeCode">Kod pracownika</label>
     <input
       type="text"
       id="employeeCode"
       name="employeeCode"
       value={formData.employeeCode}
       onChange={handleChange}
       className="input"
       maxLength={5}
       placeholder="Brak kodu"
     />
     <small className="form-help">
       3-5 znaków (wielkie litery)
     </small>
   </div>
   ```
5. Updated submit logic to include employeeCode (or null if empty)

---

## Testing

### Unit Tests

**File:** `backend/tests/unit/services/EmployeeCodeGenerator.test.ts`

Created comprehensive test suite covering:
- All 4 levels of code generation
- Collision handling
- Uppercase conversion
- Polish character support
- Short name handling
- Validation logic
- Code availability checking

### Manual Testing Steps

1. **Run Database Migration:**
   ```bash
   cd backend
   psql -U your_user -d your_database -f scripts/migrations/20260107_add_employee_code.sql
   ```

2. **Verify Schema:**
   ```sql
   SELECT column_name, data_type, character_maximum_length, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'employee_code';
   ```
   Expected: VARCHAR(5), nullable

3. **Test Code Generation:**
   - Create new user without specifying code → Should auto-generate
   - Create new user with manual code → Should accept valid code
   - Try creating user with invalid code → Should reject
   - Try creating user with duplicate code → Should reject

4. **Test Code Editing:**
   - Edit existing user, change code → Should update
   - Edit existing user, clear code → Should allow clearing
   - Edit with duplicate code → Should reject

5. **Test UI:**
   - View users list → Should display codes in "Kod" column
   - Create user modal → Should have optional code field
   - Edit user modal → Should have editable code field

---

## API Examples

### Create User with Auto-Generated Code

```bash
POST /api/users
{
  "username": "rkrakowski",
  "email": "r.krakowski@example.com",
  "firstName": "Remigiusz",
  "lastName": "Krakowski",
  "roleId": 1,
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "username": "rkrakowski",
    "employeeCode": "RKR",
    ...
  }
}
```

### Create User with Manual Code

```bash
POST /api/users
{
  "username": "jkowalski",
  "email": "j.kowalski@example.com",
  "firstName": "Jan",
  "lastName": "Kowalski",
  "employeeCode": "JK001",
  "roleId": 1,
  "password": "SecurePass123"
}
```

### Update User's Code

```bash
PUT /api/users/123
{
  "employeeCode": "NEWCD"
}
```

### Clear User's Code

```bash
PUT /api/users/123
{
  "employeeCode": null
}
```

---

## Validation Rules

### Employee Code Format:
- Length: 3-5 characters
- Characters: Uppercase letters (A-Z, Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż) and digits (0-9)
- Uniqueness: Must be unique across all active users
- Nullable: Yes (codes are optional)

### Error Messages:
- `INVALID_EMPLOYEE_CODE` - Invalid format
- `EMPLOYEE_CODE_EXISTS` - Code already in use
- `EMPLOYEE_CODE_GENERATION_FAILED` - Unable to generate unique code

---

## Migration Notes

### For Existing Users:

The migration adds the column but does NOT automatically generate codes for existing users. To generate codes for existing users, you can run:

```sql
-- This would need to be done via application logic
-- to handle collisions properly
UPDATE users 
SET employee_code = NULL 
WHERE employee_code IS NULL;
```

Then use the application API or admin panel to update users individually.

---

## Future Enhancements

1. **Batch Code Generation:** Add endpoint to generate codes for all users without codes
2. **Code History:** Track changes to employee codes
3. **Custom Patterns:** Allow admins to define custom code generation patterns
4. **Import/Export:** Support for importing codes from CSV
5. **Code Reservation:** Ability to reserve codes before user creation

---

## Files Modified

### Backend:
- `backend/src/entities/User.ts`
- `backend/src/controllers/UserController.ts`
- `backend/scripts/migrations/20260107_add_employee_code.sql`

### Backend (New):
- `backend/src/services/EmployeeCodeGenerator.ts`
- `backend/tests/unit/services/EmployeeCodeGenerator.test.ts`

### Frontend:
- `frontend/src/types/admin.types.ts`
- `frontend/src/components/users/UserListPage.tsx`
- `frontend/src/components/users/UserCreateModal.tsx`
- `frontend/src/components/users/UserEditModal.tsx`
- `frontend/src/components/subsystems/SubsystemListPage.css`

---

## Breaking Changes

None. This is a backward-compatible addition. The `employeeCode` field is optional and nullable.

---

## Support

For issues or questions, contact the development team or create an issue in the repository.
