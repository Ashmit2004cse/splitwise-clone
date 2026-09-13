const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
};

if (!serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key) {
  throw new Error("Firebase environment variables are missing");
}

const app = admin.initializeApp({
  credential: admin.cert(serviceAccount),
});

const db = getFirestore(app);

console.log("=================================");
console.log("FIREBASE FILE LOADED");
console.log("Firebase DB available:", !!db);
console.log("Firebase project:", serviceAccount.project_id);
console.log("=================================");

module.exports = {
  admin,
  db,
};