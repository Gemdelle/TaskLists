const express = require('express');
const { client, executePossibleAdminCommand } = require('./twitch');
const fs = require('fs');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;

let chatMessages = [];
app.use(cors());
app.use(express.json());

const codesFilePath = './data/codes.json';

function readCodes() {
    if (fs.existsSync(codesFilePath)) {
        return JSON.parse(fs.readFileSync(codesFilePath, 'utf8'));
    } else {
        return [];
    }
}

function removeCode(code) {
    const currentCodes = readCodes();
    const index = currentCodes.indexOf(code);
    if (index !== -1) {
        currentCodes.splice(index, 1);
        fs.writeFileSync(codesFilePath, JSON.stringify(currentCodes, null, 2));
    }
}

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    chatMessages.push({ user: tags['display-name'], message });
});

app.get('/api/chat', (req, res) => {
    res.json(chatMessages);
});

app.post('/api/adopt', (req, res) => {
    const { id, username, pet_name, birthday, code } = req.body;

    if (!id || !username || !pet_name || !birthday || !code) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const currentUsername = username.toLowerCase();
    const availableCodes = readCodes();

    if (!availableCodes.includes(code)) {
        return res.status(400).json({ error: 'Invalid or used code' });
    }

    removeCode(code);

    const message = `!adopt ${id} ${username} ${pet_name} ${birthday}`;
    executePossibleAdminCommand(message, currentUsername, (responseMessage) => {
        res.status(200).json({ message: responseMessage });
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
