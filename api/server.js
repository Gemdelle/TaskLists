const express = require('express');
const { client, executePossibleAdminCommand } = require('./twitch');
const app = express();
const port = process.env.PORT || 3000;

let chatMessages = [];
app.use(express.json());
client.on('message', (channel, tags, message, self) => {
    if(self) return;
    chatMessages.push({ user: tags['display-name'], message });
});


app.get('/api/chat', (req, res) => {
    res.json(chatMessages);
});

app.post('/api/adopt', (req, res) => {
    const { id, username, pet_name, birthday, code } = req.body;

    if (!id || !username || !pet_name || !birthday) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = `!adopt ${id} ${username} ${birthday}`;
    const currentUsername = username.toLowerCase();

    executePossibleAdminCommand(message, currentUsername, (responseMessage) => {
        res.status(200).json({ message: responseMessage });
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
