import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
try {
  const serviceAccountPath = join(__dirname, '../service-account-key.json');
  console.log('Looking for service account file at:', serviceAccountPath);
  
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  console.log('Found service account for project:', serviceAccount.project_id);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    storageBucket: `${serviceAccount.project_id}.appspot.com`
  });
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  console.log('\nPlease follow these steps:');
  console.log('1. Go to Firebase Console (https://console.firebase.google.com)');
  console.log('2. Select your project');
  console.log('3. Click the gear icon (Project Settings)');
  console.log('4. Go to Service Accounts tab');
  console.log('5. Click "Generate New Private Key"');
  console.log('6. Save the downloaded file as service-account-key.json in your project root\n');
  process.exit(1);
}

async function createAdminUser(email: string, password: string) {
  try {
    // Create the user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: true,
    });

    // Add the user to the admins collection
    await admin.firestore().collection('admins').doc(userRecord.uid).set({
      email: userRecord.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('\nSuccessfully created admin user!');
    console.log('----------------------------------------');
    console.log('User ID:', userRecord.uid);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('----------------------------------------');
    console.log('You can now log in to the app with these credentials.\n');
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    if (error?.code === 'auth/email-already-exists') {
      console.log('\nThis email is already registered. If you want to make this user an admin:');
      console.log('1. Get the user\'s UID from Firebase Console > Authentication');
      console.log('2. Manually add a document with their UID to the "admins" collection in Firestore\n');
    }
  } finally {
    process.exit();
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Please provide email and password as arguments');
  console.log('Usage: ts-node createAdmin.ts <email> <password>');
  process.exit(1);
}

createAdminUser(email, password); 