const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./firebase.json");

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
  admin: admin,
  db: db,
};