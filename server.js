const express = require('express');
const twitchClient = require('./twitch');
const app = express();
const port = process.env.PORT || 3000;

let chatMessages = [];

// Store chat messages in memory
twitchClient.on('message', (channel, tags, message, self) => {
    if(self) return;
    chatMessages.push({ user: tags['display-name'], message });
});

// API endpoint to get chat messages
app.get('/chat', (req, res) => {
    res.json(chatMessages);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
