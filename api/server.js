const express = require('express');
const twitchClient = require('./twitch');
const app = express();
const port = process.env.PORT || 3000;

let chatMessages = [];

twitchClient.on('message', (channel, tags, message, self) => {
    if(self) return;
    chatMessages.push({ user: tags['display-name'], message });
});


app.get('/api/chat', (req, res) => {
    res.json(chatMessages);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
