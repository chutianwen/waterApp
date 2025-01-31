# Firebase Security Rules

Copy and paste these rules into your Firebase Console > Firestore Database > Rules tab:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is an admin
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // Prices collection - readable by authenticated users, writable by admins
    match /prices/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Customers collection - readable by authenticated users, writable by admins
    match /customers/{customerId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Transactions collection - readable by authenticated users, writable by admins
    match /transactions/{transactionId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Admin users collection - only admins can read/write
    match /admins/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

These rules implement the following security model:

1. **Authentication Required**
   - All operations require authentication
   - No public access is allowed

2. **Admin Role**
   - Only admin users can write data
   - Admin status is determined by presence in the `admins` collection

3. **Collections Access**
   - `prices`: Read by authenticated users, write by admins
   - `customers`: Read by authenticated users, write by admins
   - `transactions`: Read by authenticated users, write by admins
   - `admins`: Read by authenticated users, write by admins

4. **Default Deny**
   - All other collections and operations are denied by default 