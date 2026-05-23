# Grover Platform - Frontend

React + TypeScript frontend application for the Grover platform with role-based access control (RBAC) and granular permissions.

## 🚀 Features

- **Modern Stack**: React 18 + TypeScript + Vite
- **Authentication**: Login with JWT token rotation
- **Force Password Change**: One-time password system with real-time validation
- **RBAC System**: Granular permissions for different modules
- **Grover Theming**: Dark theme with orange accents (#ff6b35)
- **Responsive Design**: Mobile-friendly UI

## 📋 Password Requirements

The system enforces strong password requirements:
- **8-12 characters** in length
- At least **1 uppercase letter** (A-Z)
- At least **1 number** (0-9)
- At least **1 special character** (!@#$%^&*()_+-=[]{};':"\\|,.<>/?)

## 🏗️ Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/              # Authentication components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PasswordChangeForm.tsx
│   │   │   ├── PasswordRequirements.tsx
│   │   │   └── ForgotPasswordPage.tsx      # NEW: Password recovery
│   │   ├── users/             # User management components (Admin)
│   │   │   ├── UserListPage.tsx
│   │   │   ├── UserDetailPage.tsx
│   │   │   ├── UserCreateForm.tsx
│   │   │   ├── UserEditForm.tsx
│   │   │   ├── UserActivityLog.tsx
│   │   │   └── RoleManagement.tsx
│   │   ├── workflow/          # Workflow components
│   │   │   ├── contracts/
│   │   │   ├── completion/
│   │   │   └── prefabrication/
│   │   ├── layout/            # Layout components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── RoleBasedRoute.tsx
│   │   │   └── ForbiddenPage.tsx
│   │   └── common/            # Shared components
│   │       ├── PasswordInput.tsx
│   │       └── ErrorMessage.tsx
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   └── usePasswordValidation.ts
│   ├── services/              # API services
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   └── workflow.service.ts
│   ├── stores/                # Zustand stores
│   │   ├── authStore.ts
│   │   └── userStore.ts
│   ├── types/                 # TypeScript types
│   │   ├── auth.types.ts
│   │   ├── permissions.types.ts
│   │   └── user.types.ts
│   └── styles/
│       └── grover-theme.css   # Global theme
└── ...
```

### Permission Modules

The frontend implements granular permissions matching the backend:

- **users**: read, create, update, delete, manage (Admin only module)
- **contracts**: read, create, update, delete, approve, import
- **subsystems**: read, create, update, delete, generateBom, allocateNetwork
- **network**: read, createPool, updatePool, deletePool, allocate, viewMatrix
- **completion**: read, scan, assignPallet, reportMissing, decideContinue, complete
- **prefabrication**: read, receiveOrder, configure, verify, assignSerial, complete
- **notifications**: receiveAlerts, sendManual, configureTriggers

## 🆕 New Features

### User Management Module (Admin Only)
- **UserListPage** - Table with pagination, filtering, and sorting
- **UserDetailPage** - View user profile and activity history
- **UserCreateForm** - Create new users with automatic email notifications
- **UserEditForm** - Edit user data and roles
- **UserActivityLog** - View and export user activity (CSV)
- **RoleManagement** - Manage user roles and permissions

### Authentication Improvements
- **ForgotPasswordPage** - Public password recovery page
  - User enters email/username
  - System sends new temporary password
  - Automatic redirect to change password on login
- **Improved Error Messages**:
  - "Konto nie istnieje" - Account doesn't exist
  - "Błędne hasło" - Wrong password
  - "Twoje konto zostało zablokowane" - Account blocked

### Workflow Components
- Contract creation and management
- Subsystem configuration (12 types)
- Completion workflow (scanning, pallets, missing items)
- Prefabrication workflow (device configuration, serial numbers)

## 🛠️ Setup

### Prerequisites

- Node.js 18+ and npm
- Backend API running (default: http://localhost:3000)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update API URL in .env if needed
# VITE_API_BASE_URL=http://localhost:3000/api
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at http://localhost:5173

## 🔐 Authentication Flow

1. **Login**: User enters username and password
2. **Check Password Change**: If `forcePasswordChange = true`, redirect to password change form
3. **Password Change**: User must enter a new password meeting all requirements
4. **Email Confirmation**: User receives email with new credentials
5. **Dashboard**: User is redirected to dashboard with permissions loaded

## 🎨 Theming

The application uses a dark theme with Grover branding:

```css
--primary-color: #ff6b35;      /* Orange accent */
--bg-dark: #1a1a1a;            /* Dark background */
--bg-card: #252525;            /* Card background */
--text-primary: #ffffff;       /* Primary text */
--text-secondary: #a0aec0;     /* Secondary text */
```

## 📡 API Integration

### Endpoints Used

- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user with permissions

### Token Management

The app uses JWT with automatic token refresh:
- Access tokens stored in localStorage
- Refresh tokens used for automatic renewal
- Expired tokens trigger automatic refresh
- Failed refresh redirects to login

## 🔒 Permission Checking

### Using the usePermissions Hook

```tsx
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
  const { hasPermission, isAdmin } = usePermissions();

  return (
    <>
      {hasPermission('contracts', 'create') && (
        <button>Create Contract</button>
      )}
      
      {isAdmin() && (
        <button>Admin Only</button>
      )}
    </>
  );
}
```

### Protected Routes

```tsx
<RoleBasedRoute 
  requiredPermission={{ module: 'contracts', action: 'read' }}
>
  <ContractsPage />
</RoleBasedRoute>
```

## 🧪 Testing

To test the application:

1. **Backend Setup**: Ensure backend is running with the database migration applied
2. **Create Test User**: Use backend to create a user with `forcePasswordChange = true`
3. **Login**: Test login flow
4. **Password Change**: Verify real-time validation works
5. **Email**: Check if password change email is sent
6. **Permissions**: Verify sidebar shows only accessible modules

## 🛡️ Filtrowanie błędów rozszerzeń przeglądarki

Frontend filtruje globalne błędy pochodzące z rozszerzeń przeglądarki (np. AdGuard, uBlock), aby nie były ponownie logowane jako błędy aplikacji.

- Utility: `src/utils/isExtensionError.ts`
- Globalne handlery: `src/main.tsx` (`error`, `unhandledrejection`)
- React boundary: `src/components/common/ErrorBoundary.tsx`

Filtrowane są m.in. źródła i komunikaty:
- `chrome-extension://`, `moz-extension://`, `safari-extension://`
- `document-start.js`
- `Could not establish connection`
- `Receiving end does not exist`

## 📦 Build

```bash
# Production build
npm run build

# Output will be in dist/ directory
# Serve with any static file server
```

## 🚢 Deployment

The frontend can be deployed to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

Environment variables needed:
- `VITE_API_BASE_URL`: Backend API URL

## 🐛 Troubleshooting

### Build Errors

If you encounter TypeScript errors:
```bash
npm run build
```

### API Connection Issues

1. Check `.env` file has correct `VITE_API_BASE_URL`
2. Ensure backend is running
3. Check CORS settings in backend

### Login Issues

1. Verify user exists in database
2. Check browser console for errors
3. Verify JWT tokens are being stored in localStorage

## 📝 License

MIT

---

**Grover Platform** © 2025 Cr@ck8502PL

## 👥 Contributors

- Crack8502pl
