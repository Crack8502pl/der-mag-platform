# User Management Module Documentation

## Overview
Comprehensive user management system for administrators to manage platform users. Includes user CRUD operations, role management, password reset, and user activity tracking.

## Features

### 1. User List & Search
- **Advanced Search**: Search by name, email, username
- **Filtering**: Filter by role and active status
- **Sorting**: Sort by any column (ID, name, email, username, created date, last login)
- **Pagination**: 30 users per page with navigation

### 2. User Creation
Admin can create new users by providing:
- First name and last name (min 2 characters each)
- Email (unique among active users)
- Username/Login (min 3 characters, unique among active users)
- Phone number (optional)
- Role selection
- Initial password (min 8 characters)

**Email Notification**: Automatically sent to new user with credentials and password policy.

### 3. User Editing
Admin can update:
- First and last name
- Email
- Phone number
- Role assignment

**Note**: Username cannot be changed after creation.

### 4. Password Reset
Admin can reset user password by:
- Entering a new password manually
- System sets `forcePasswordChange: true` flag
- User receives email with new password
- User must change password on next login

### 5. User Activation/Deactivation
**Deactivation**:
- Sets `active: false`
- Optional reason for deactivation
- User cannot login (sees "Twoje konto zostało zablokowane")
- Email/username exempt from uniqueness checks

**Activation**:
- Sets `active: true`
- User can login again
- Email/username must be unique

### 6. User Deletion
**Soft Delete**:
- Sets `deleted_at` timestamp
- Sets `active: false`
- User data preserved in database
- Email/username exempt from uniqueness checks
- Cannot be restored via UI (requires direct database access)

### 7. Login Error Messages
Clear, specific error messages:
- **"Konto nie istnieje"** - Username not found
- **"Błędne hasło"** - Incorrect password
- **"Twoje konto zostało zablokowane"** - Account deactivated

### 8. Forgot Password
Users can recover their password:
1. Enter email or username
2. System generates new secure password
3. Sets `forcePasswordChange: true`
4. Sends email with new password
5. Shows generic message: "Jeśli konto istnieje, wysłaliśmy instrukcje na podany adres email"

**Security**: Generic message doesn't reveal if account exists.

## API Endpoints

### User Management
```
GET    /api/users                       # List users with filters
GET    /api/users/:id                   # Get user details
POST   /api/users                       # Create new user
PUT    /api/users/:id                   # Update user
DELETE /api/users/:id                   # Soft delete user

POST   /api/users/:id/reset-password    # Reset password
POST   /api/users/:id/deactivate        # Deactivate user
POST   /api/users/:id/activate          # Activate user
PUT    /api/users/:id/role              # Change user role

GET    /api/users/:id/activity          # User activity log
GET    /api/users/:id/permissions       # User permissions
```

### Authentication
```
POST   /api/auth/login                  # Login with username/password
POST   /api/auth/forgot-password        # Request password reset
POST   /api/auth/change-password        # Change own password
```

## Database Schema

### Users Table
```sql
users (
  id                    SERIAL PRIMARY KEY,
  username              VARCHAR(50) UNIQUE NOT NULL,
  email                 VARCHAR(100) UNIQUE NOT NULL,
  password              VARCHAR(255) NOT NULL,
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  phone                 VARCHAR(20),
  role_id               INTEGER REFERENCES roles(id),
  active                BOOLEAN DEFAULT true,
  last_login            TIMESTAMP,
  force_password_change BOOLEAN DEFAULT true,
  password_changed_at   TIMESTAMP,
  deleted_at            TIMESTAMP,  -- NEW: Soft delete
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
)
```

### Indexes
- `idx_users_deleted_at` on `deleted_at` for faster queries
- Unique constraints on `username` and `email` (enforced at app level for active users only)

## Email Templates

### User Creation Email (`user-created-with-password.hbs`)
Sent when admin creates a new user. Includes:
- Welcome message
- System URL
- Username
- Password
- Password policy requirements
- Support email

### Password Reset Email (`password-reset-with-password.hbs`)
Sent when password is reset. Includes:
- Reset notification
- Username
- New password
- Password policy requirements
- Support email

**Sender**: `smokip@der-mag.pl`

## Password Policy
Users must create passwords with:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character (!@#$%^&* etc.)

## Security Features

### Authentication
- All user management endpoints require admin role
- JWT-based authentication
- Token rotation for security

### Soft Delete
- Deleted users cannot login
- Email/username can be reused by new users
- Data preserved for audit purposes

### Password Security
- Passwords hashed with bcrypt
- Force password change on first login
- Force password change after admin reset

### Activity Logging
- All user operations logged (placeholder - to be implemented)
- Tracks: user creation, updates, password changes, login attempts

## UI Components

### UserListPage
Main management interface with:
- Search bar
- Role and status filters
- User count display
- Sortable table
- Action dropdown menu per user
- Pagination controls

### Modals
- **UserCreateModal**: Create new user
- **UserEditModal**: Edit user details
- **ResetPasswordModal**: Reset password
- **DeactivateUserModal**: Deactivate with reason

### UserStatusBadge
Visual indicator showing:
- Active/Inactive status (green/red)
- Password change required (yellow)

## User Workflows

### Creating a User
1. Admin clicks "Dodaj użytkownika"
2. Fills in form (name, email, username, role, password)
3. System validates inputs
4. User created with `forcePasswordChange: true`
5. Email sent to user with credentials
6. Admin sees success message

### Resetting Password
1. Admin clicks "Resetuj hasło" on user
2. Enters new password
3. System sets `forcePasswordChange: true`
4. Email sent to user
5. User must change password on next login

### Deactivating User
1. Admin clicks "Dezaktywuj" on user
2. Optionally enters reason
3. User account blocked (`active: false`)
4. User cannot login

### Forgot Password (User Self-Service)
1. User clicks "Zapomniałeś hasła?" on login page
2. Enters email or username
3. System generates new password
4. Email sent if account exists
5. Generic success message shown
6. User logs in with new password
7. Forced to change password

## Configuration

### Environment Variables
```env
# Email Configuration
SMTP_HOST=smtp.nazwa.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@your-domain.pl
SMTP_PASSWORD=your-password

EMAIL_FROM_NAME=Der-Mag Platform
EMAIL_FROM_ADDRESS=smokip@der-mag.pl

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3001

# Support email
SUPPORT_EMAIL=smokip@der-mag.pl
```

## Migration

Run database migration to add soft delete support:

```bash
# Using psql
psql $DB_CONNECTION_STRING -f backend/scripts/migrations/20260106_add_user_soft_delete.sql

# Or using npm script (if configured)
npm run migrate
```

## Permissions

All user management features require `admin` role. Regular users can only:
- View their own profile
- Change their own password

## Best Practices

### For Administrators
1. Use strong passwords when creating users
2. Document reason when deactivating users
3. Review user activity logs regularly
4. Remove inactive users after appropriate period
5. Verify email addresses before creating accounts

### For Developers
1. Always use soft delete, never hard delete
2. Log all user management operations
3. Validate inputs on both frontend and backend
4. Use parameterized queries to prevent SQL injection
5. Hash passwords before storage
6. Clear sensitive data from logs

## Troubleshooting

### Email Not Sending
- Check SMTP configuration in .env
- Verify SMTP credentials
- Check email service logs
- Test with email service provider's test tool

### User Cannot Login After Creation
- Verify user is active (`active: true`)
- Check if user is deleted (`deleted_at IS NULL`)
- Verify password was set correctly
- Check for account lock from too many failed attempts

### Uniqueness Constraint Violation
- Only active, non-deleted users must have unique email/username
- Deleted users (`deleted_at IS NOT NULL`) are exempt
- Inactive users can have duplicate emails/usernames if deleted

### Password Reset Not Working
- Check email delivery
- Verify `forcePasswordChange` flag is set
- Confirm password meets policy requirements

## Future Enhancements

### Planned Features
1. User activity log implementation with filtering
2. Export user list to CSV/Excel
3. Bulk user operations (import, deactivate, delete)
4. User profile pictures
5. Two-factor authentication
6. Password expiration policy
7. Login attempt tracking and account lockout
8. User self-registration (if needed)
9. Advanced permission editor
10. User groups/teams

### Database Optimizations
1. Add full-text search indexes for better performance
2. Partition users table by active status
3. Archive old deleted users
4. Add materialized view for user statistics

## Testing

### Manual Test Scenarios
1. Create user with valid data
2. Create user with duplicate email (should fail)
3. Edit user information
4. Reset user password
5. Deactivate user and verify cannot login
6. Activate deactivated user
7. Soft delete user
8. Test forgot password flow
9. Test all filter combinations
10. Test pagination with different page sizes
11. Test sorting by each column
12. Test search with various terms

### Automated Tests (To Be Implemented)
- Unit tests for UserController methods
- Integration tests for API endpoints
- E2E tests for UI workflows
- Email template rendering tests
- Security tests for authorization

## Support

For issues or questions:
- Email: smokip@der-mag.pl
- Check logs in `backend/logs/` directory
- Review error messages in browser console (F12)

## License
MIT License - See LICENSE file for details
