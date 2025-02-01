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

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- React Native development environment setup
- Firebase account and project

### Installation

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

### Running the App

#### iOS
```bash
npm run ios
```

#### Android
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

## Development Commands

```bash
# Run on iOS simulator
npx react-native run-ios --simulator="iPhone 16 Pro"

# Create admin user
npx ts-node --esm scripts/createAdmin.ts email password

# Make existing user admin
npx ts-node --esm scripts/makeAdmin.ts USER_UID
```

## Troubleshooting Guide

### Module Resolution and TypeScript Configuration Issues

#### Problem Description
After installing Firebase Admin SDK or other Google Auth libraries, you might encounter these errors:
1. `Module '"react"' has no exported member 'useState'`
2. `Module '"react-native"' has no exported member 'View'` (or other components)
3. TypeScript errors about module resolution
4. Lots of import errors regarding React and React Native in the src code

#### Root Cause
This issue occurs due to conflicting module systems:

1. **React Native (CommonJS)**
   - Uses CommonJS traditionally with `require()`
   - Metro Bundler supports ESM
   - Babel transpiles import to require() when needed

2. **Firebase Admin SDK (ESM)**
   - ESM-only, no support for require()
   - Incompatible with Metro's CommonJS expectations

3. **Module System Conflicts**
   - Firebase Admin SDK and Google Auth libraries are ESM-only
   - React Native's TypeScript configuration expects CommonJS
   - package.json "type" field conflicts

#### Solutions

1. **TypeScript Configuration**
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
```json
{
  "type": "commonjs"
}
```

3. **Clean Installation Process**
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

4. **Correct Import Syntax**
```typescript
// Correct
import React, {useState} from 'react';
import {View, Text} from 'react-native';

// Incorrect - Don't use require
const React = require('react');
const {useState} = React;
```

### Common Development Issues

#### XCode Indexing Issues
If XCode keeps spinning on "indexing":
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```
Then reopen XCode and rebuild.

#### Metro Bundler Issues
Reset Metro cache:
```bash
npx react-native start --reset-cache
```

#### React Native Installation Check
Verify React Native installation:
```bash
npm list react-native
npm install --save-dev @types/react-native
```

#### iOS Simulator Data Location
Find app data in simulator:
```bash
find ~/Library/Developer/CoreSimulator -name "waterapp_data" 2>/dev/null
```

## Technical Details

### Dependencies

- React Native: 0.73.5
- React: 18.2.0
- TypeScript: 5.0.4
- Firebase Auth: ^21.7.1
- Firebase Firestore: ^21.7.1
- React Navigation: ^7.x
- React Native Vector Icons: ^10.2.0
- AsyncStorage: ^2.1.0

### Security Features

- All sensitive files are listed in .gitignore
- Authentication required for all operations
- Admin-only write permissions
- Secure Firebase rules implementation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
