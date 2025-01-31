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
  process.exit(1);
}

async function makeUserAdmin(uid: string) {
  try {
    // Verify the user exists
    const user = await admin.auth().getUser(uid);
    
    // Add the user to the admins collection
    await admin.firestore().collection('admins').doc(uid).set({
      email: user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('\nSuccessfully made user an admin!');
    console.log('----------------------------------------');
    console.log('User ID:', uid);
    console.log('Email:', user.email);
    console.log('----------------------------------------');
    console.log('You can now log in to the app with this account.\n');
  } catch (error: any) {
    console.error('Error making user admin:', error);
    if (error?.code === 'auth/user-not-found') {
      console.log('\nUser not found. Please check the UID and try again.');
    }
  } finally {
    process.exit();
  }
}

// Get UID from command line arguments
const uid = process.argv[2];

if (!uid) {
  console.error('Please provide the user UID');
  console.log('Usage: ts-node makeAdmin.ts <uid>');
  process.exit(1);
}

makeUserAdmin(uid); 