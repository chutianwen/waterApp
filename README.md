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