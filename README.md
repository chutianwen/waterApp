# Water App

A React Native application for managing water sales and customer transactions.

## Features

- Customer Management
  - Add and edit customers
  - Track customer balances
  - View customer transaction history
  - Search customers by name or membership ID

- Transaction Processing
  - Record water purchases
  - Add funds to customer accounts
  - Support for regular and alkaline water
  - Real-time balance updates

- Authentication & Security
  - Admin-only access
  - Secure authentication with Firebase
  - Role-based permissions

## Prerequisites

- Node.js >= 18
- npm or yarn
- React Native development environment setup
- Firebase account and project

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd waterApp
```

2. Install dependencies:
```bash
npm install
```

3. Firebase Setup:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Download your service account key:
     - Go to Project Settings > Service Accounts
     - Click "Generate New Private Key"
     - Save as `service-account-key.json` in project root

4. Create your first admin user:
```bash
npx ts-node --esm scripts/createAdmin.ts your-email@example.com your-password
```

5. Set up Firebase Security Rules:
   - Go to Firestore Database > Rules
   - Copy and paste the security rules from `firebase-rules.md`

## Running the App

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

## Project Structure

```
waterApp/
├── src/
│   ├── screens/          # Screen components
│   ├── services/         # Firebase and other services
│   ├── contexts/         # React Context providers
│   ├── types/           # TypeScript type definitions
│   └── components/      # Reusable components
├── scripts/             # Admin scripts
└── firebase-rules.md    # Firestore security rules
```

## Dependencies

- React Native: 0.73.5
- React: 18.2.0
- TypeScript: 5.0.4
- Firebase Auth: ^21.7.1
- Firebase Firestore: ^21.7.1
- React Navigation: ^7.x
- React Native Vector Icons: ^10.2.0
- AsyncStorage: ^2.1.0

## Security

- All sensitive files are listed in .gitignore
- Authentication is required for all operations
- Admin-only write permissions
- Secure Firebase rules implementation

## Development Commands

```bash
# Run on iOS simulator
npx react-native run-ios --simulator="iPhone 16 Pro"

# Create admin user
npx ts-node --esm scripts/createAdmin.ts email password

# Make existing user admin
npx ts-node --esm scripts/makeAdmin.ts USER_UID
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details


## Development Utilities

### Finding Simulator Data
To locate the app's data directory in the iOS simulator:
```bash
find ~/Library/Developer/CoreSimulator -name "waterapp_data" 2>/dev/null
```
### Installing Google Auth libraries or running TypeScript scripts with --esm can cause issues if Metro and Node.js are using different module systems.
If you installed a Google Auth library that uses ESM, your package.json may now include "type": "module".
Change "type": "module" to "type": "commonjs" in package.json to fix the issue.


### If there's import error with waves under the codes
```bash
npm list react-native 
``` 
To check if React Native (react-native@0.73.5) is installed correctly

### If there's import error with waves under the codes
```bash
npm list react-native 
npm install --save-dev @types/react-native
``` 
To check if React Native (react-native@0.73.5) is installed correctly

npx react-native start --reset-cache

## Troubleshooting Common Issues

### Module Resolution and TypeScript Configuration Issues

#### Problem Description
After installing Firebase Admin SDK or other Google Auth libraries, you might encounter these errors:
1. `Module '"react"' has no exported member 'useState'`
2. `Module '"react-native"' has no exported member 'View'` (or other components)
3. TypeScript errors about module resolution

#### Root Cause
This issue occurs due to conflicting module systems between:
- React Native (which uses CommonJS)
- Firebase Admin SDK (which uses ESM)
- TypeScript configuration (which needs to handle both)

The conflict happens because:
1. Firebase Admin SDK and some Google Auth libraries are ESM-only
2. React Native's TypeScript configuration expects CommonJS
3. The `package.json` "type" field might get changed to "module" during Google Auth installation

#### Symptoms
1. TypeScript errors in React/React Native imports
2. Components and hooks showing as undefined
3. Metro bundler failing to resolve modules
4. TypeScript complaining about module resolution strategy

#### Solutions

1. **Correct TypeScript Configuration**
```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "target": "esnext",
    "module": "commonjs",
    "lib": ["esnext"],
    "allowJs": true,
    "jsx": "react-native",
    "noEmit": true,
    "isolatedModules": true,
    "strict": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

2. **Package.json Configuration**
- Ensure "type" is set to "commonjs":
```json
{
  "type": "commonjs"
}
```

3. **Clean Installation Steps**
```bash
# Remove existing modules and caches
rm -rf node_modules
rm package-lock.json

# Reinstall dependencies
npm install

# Clear Metro bundler cache
npx react-native start --reset-cache

# For iOS, reinstall pods
cd ios && pod install && cd ..
```

4. **Import Syntax**
Use proper ES6 imports (avoid `require()`):
```typescript
// Correct
import React, {useState} from 'react';
import {View, Text} from 'react-native';

// Incorrect - Don't use require
const React = require('react');
const {useState} = React;
```

#### Prevention
1. Always keep `"type": "commonjs"` in package.json
2. Use proper ES6 import syntax
3. Maintain correct TypeScript configuration
4. When adding new packages that use ESM:
   - Check their module system compatibility
   - Update TypeScript configuration if needed
   - Clear caches and reinstall dependencies

#### Additional Notes
- If using Firebase Admin SDK scripts, you might need to run them with `--esm` flag:
```bash
npx ts-node --esm scripts/createAdmin.ts email password
```
- For scripts that need ESM, consider creating a separate `tsconfig.scripts.json` with ESM configuration

