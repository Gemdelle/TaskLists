const express = require('express');
const { client, executePossibleAdminCommand } = require('./twitch');
const fs = require('fs');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;

const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');
const {db} = require("./firebase");

let chatMessages = [];
app.use(cors());
app.use(express.json());


client.on('message', (channel, tags, message, self) => {
    if (self) return;
    chatMessages.push({ user: tags['display-name'], message });
});

app.get('/api/chat', (req, res) => {
    res.json(chatMessages);
});

async function getCodesFromFirestore() {
    const codesRef = collection(db, 'codes');
    const snapshot = await getDocs(codesRef);
    const codes = snapshot.docs.map(doc => doc.id);
    return codes;
}

function removeCodeFromFirestore(code) {
    const codesRef = collection(db, 'codes');
    const codeDocRef = doc(codesRef, code);
    return deleteDoc(codeDocRef);
}

app.post('/api/adopt', async (req, res) => {
    const { id, username, pet_name, birthday, code } = req.body;

    if (!id || !username || !pet_name || !birthday || !code) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const currentUsername = username.toLowerCase();

    try {
        const availableCodes = await getCodesFromFirestore();

        if (!availableCodes.includes(code)) {
            return res.status(400).json({ error: 'Invalid or used code' });
        }

        await removeCodeFromFirestore(code);

        const message = `!adopt ${id} ${username} ${pet_name} ${birthday}`;
        executePossibleAdminCommand(message, currentUsername, (responseMessage) => {
            res.status(200).json({ message: responseMessage });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
