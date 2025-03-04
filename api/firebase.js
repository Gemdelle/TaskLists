const dotenv = require('dotenv');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch } = require('firebase/firestore');

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROYECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const addCodesToFirestore = async () => {
    const codes = [
        "NngU7euYL", "p7nBqkwg0", "eECYo9HDn", "4wiTPqIPz", "D09xRaN0x",
        "FlomcE83p", "rS5bAf2DS", "8uHs3SfCL", "f6bMALO8P", "CCaF21GOM",
        "mYm8elPDz", "M2nHMRkbj", "i5db8fMu0", "cpl6qmn3W", "fNMHCM2OU",
        "Sei6BqRKk", "eJfrp8xly", "NhVWn5XP3", "PBw6nfuOY", "5ZiJE3DpB",
        "T66IHz5Jm", "cX5DIZM0B", "JjNj8Sx6f", "RY19aaO8W", "73QltN5V4",
        "vhD6xeAdM", "33CapJv38", "zsCdc5ZdC", "sfsqusAcZ"
    ];

    const codesCollectionRef = collection(db, 'codes');

    const batch = writeBatch(db);

    codes.forEach(code => {
        const codeDocRef = doc(codesCollectionRef, code);
        batch.set(codeDocRef, { code });
    });

    try {
        await batch.commit();
        console.log('Codes added to Firestore successfully!');
    } catch (error) {
        console.error('Error adding codes to Firestore: ', error);
    }
};

addCodesToFirestore();

module.exports = { db };
