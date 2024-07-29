require('dotenv').config();
const tmi = require('tmi.js');
const fs = require('fs');
const pets = require('../pets.json');
let progress = {};
const progressFilePath = './progress.json';

if (fs.existsSync(progressFilePath)) {
    progress = JSON.parse(fs.readFileSync(progressFilePath, 'utf8'));
}

const client = new tmi.Client({
    options: { debug: true }, // Enable debugging
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: process.env.TWITCH_BOT_USERNAME,
        password: process.env.TWITCH_BOT_TOKEN
    },
    channels: [ process.env.TWITCH_CHANNEL ]
});

client.connect();

client.on('connected', (address, port) => {
    console.log(`Connected to ${address}:${port}`);
});

function initializeUserProgressIfNotPresent(username) {
    if (!progress[username]) {
        progress[username] = {
            emoji: "",
            inventory: {
                froot_loops: 0,
                bubbaloo: 0,
                ferrero_rocher: 0
            },
            pet: {
                id: null,
                name: "",
                birthday: "",
                level: 1,
                type: "plant",
                hunger: 100,
                actual_xp: 0,
                total_xp: 1000
            },
            list: {
                name: "",
                current_tasks: 0,
                total_tasks: 0,
                sublist: []
            }
        };
        fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
    }
}

function incrementXP(usernameForIncrement) {
    progress[usernameForIncrement].pet.actual_xp++;

    const pet = progress[usernameForIncrement].pet;
    if (pet.actual_xp >= pet.total_xp) {
        pet.level++;
        pet.total_xp = pet.level === 2 ? 3000 : pet.level === 3 ? 5000 : pet.total_xp;
    }
    return pet;
}

function executePossibleUserCommand(message, currentUsername, messageDispatcher) {
    const emojiCommandPattern = /^!emoji \p{Emoji}$/u;
    const progressCommandPattern = /^!progress (\w+)$/;
    const inventoryCommandPattern = /^!inventory$/;
    const petnameCommandPattern = /^!petname (\w+)$/;
    const petCommandPattern = /^!pet$/;
    const feedCommandPattern = /^!feed (\w+)$/;
    const listCommandPattern = /^!list "([^"]+)" (\d+)$/;
    const sublistCommandPattern = /^!sublist "([^"]+)" (\d+)$/;
    const incrementListCommandPattern = /^!l\+\+$/;
    const listViewCommandPattern = /^!list$/;

    const command = message.split(' ')[0];

    switch (true) {
        case progressCommandPattern.test(message):
            const [, usernameProgress] = message.match(progressCommandPattern);
            initializeUserProgressIfNotPresent(usernameProgress);
            if (progress[usernameProgress]) {
                const userProgress = progress[usernameProgress];
                messageDispatcher(`📊 **Progress for ${usernameProgress}:**\n` +
                    `  - **Level:** ${userProgress.pet.level}\n` +
                    `  - **XP:** ${userProgress.pet.actual_xp}/${userProgress.pet.total_xp}`);
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameProgress}**`);
            }
            break;

        case emojiCommandPattern.test(message):
            const [, emoji] = message.match(emojiCommandPattern);
            const usernameForEmoji = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForEmoji]) {
                progress[usernameForEmoji].emoji = emoji;
                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                messageDispatcher(`✨ **Emoji updated for ${usernameForEmoji}:** ${emoji}`);
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForEmoji}**`);
            }
            break;

        case inventoryCommandPattern.test(message):
            const usernameForInventory = currentUsername;
            initializeUserProgressIfNotPresent(usernameForInventory);
            if (progress[usernameForInventory]) {
                const userInventory = progress[usernameForInventory].inventory;
                let inventoryStr = `🎒 **Inventory for ${usernameForInventory}:**\n`;
                for (const [item, quantity] of Object.entries(userInventory)) {
                    inventoryStr += `  - **${item}:** ${quantity}\n`;
                }
                messageDispatcher(inventoryStr.trim());
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForInventory}**`);
            }
            break;

        case petnameCommandPattern.test(message):
            const [, petName] = message.match(petnameCommandPattern);
            const usernameForPetName = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForPetName] && progress[usernameForPetName].pet) {
                progress[usernameForPetName].pet.name = petName;
                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                messageDispatcher(`🦴 **Pet name updated for ${usernameForPetName}:** ${petName}`);
            } else {
                messageDispatcher(`❌ **No pet found for username: ${usernameForPetName}**`);
            }
            break;

        case petCommandPattern.test(message):
            const usernameForPet = currentUsername;
            if (progress[usernameForPet] && progress[usernameForPet].pet) {
                const pet = progress[usernameForPet].pet;
                let petStr = `🐾 **Pet details for ${usernameForPet}:**\n`;
                for (const [key, value] of Object.entries(pet)) {
                    petStr += `  - **${key}:** ${value}\n`;
                }
                messageDispatcher(petStr.trim());
                let currentUserPetId = pet.id;
                let currentUserPetLevel = pet.level;
                messageDispatcher(pets[currentUserPetId][currentUserPetLevel])
            } else {
                messageDispatcher(`❌ **No pet found for username: ${usernameForPet}**`);
            }
            break;

        case feedCommandPattern.test(message):
            const [, foodToFeed] = message.match(feedCommandPattern);
            const usernameForFeed = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForFeed]) {
                if (progress[usernameForFeed].inventory.hasOwnProperty(foodToFeed) &&
                    progress[usernameForFeed].inventory[foodToFeed] > 0) {

                    progress[usernameForFeed].inventory[foodToFeed]--;
                    let hungerIncrement = 0;
                    switch (foodToFeed) {
                        case 'froot_loops':
                            hungerIncrement = 3;
                            break;
                        case 'bubbaloo':
                            hungerIncrement = 8;
                            break;
                        case 'ferrero_rocher':
                            hungerIncrement = 12;
                            break;
                        default:
                            messageDispatcher(`⚠️ **Unknown food item: ${foodToFeed}**`);
                            return;
                    }

                    progress[usernameForFeed].pet.hunger = Math.min(progress[usernameForFeed].pet.hunger + hungerIncrement, 100);
                    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                    messageDispatcher(`🍽️ **Food item ${foodToFeed} used for ${usernameForFeed}.**\n` +
                        `  - **New Hunger Value:** ${progress[usernameForFeed].pet.hunger}`);
                } else {
                    messageDispatcher(`❌ **No ${foodToFeed} left in inventory or inventory not found for ${usernameForFeed}**`);
                }
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForFeed}**`);
            }
            break;

        case listCommandPattern.test(message):
            const [, listName, totalTasks] = message.match(listCommandPattern);
            const usernameForList = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForList]) {
                progress[usernameForList].list = {
                    name: listName,
                    total_tasks: parseInt(totalTasks),
                    sublist: []
                };
                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                messageDispatcher(`📝 **List created for ${usernameForList}:**\n` +
                    `  - **List Name:** ${listName}\n` +
                    `  - **Total Tasks:** ${totalTasks}`);
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForList}**`);
            }
            break;

        case sublistCommandPattern.test(message):
            const [, sublistName, sublistTotalTasks] = message.match(sublistCommandPattern);
            const usernameForSublist = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForSublist] && progress[usernameForSublist].list) {

                progress[usernameForSublist].list.sublist.push({
                    name: sublistName,
                    current_tasks: 0,
                    total_tasks: parseInt(sublistTotalTasks)
                });
                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                messageDispatcher(`🔢 **Sublist item added to ${progress[usernameForSublist].list.name} for ${usernameForSublist}:**\n` +
                    `  - **Name:** ${sublistName}\n` +
                    `  - **Total Tasks:** ${sublistTotalTasks}`);
            } else {
                messageDispatcher(`❌ **List not found for username: ${usernameForSublist}**`);
            }
            break;

        case incrementListCommandPattern.test(message):
            const usernameForIncrement = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForIncrement]) {
                const userList = progress[usernameForIncrement].list;

                if (userList && userList.sublist.length > 0) {
                    const firstSublistItem = userList.sublist.find(item => item.current_tasks < item.total_tasks);
                    if (firstSublistItem) {
                        firstSublistItem.current_tasks++;
                        const pet = incrementXP(usernameForIncrement);

                        if (firstSublistItem.current_tasks === firstSublistItem.total_tasks) {
                            userList.current_tasks = userList.sublist.filter(item => item.current_tasks === item.total_tasks).length;
                            userList.total_tasks = userList.sublist.length;
                        }

                        messageDispatcher(`🔄 **Updated sublist item:**\n` +
                            `  - **Name:** ${firstSublistItem.name}\n` +
                            `  - **Current Tasks:** ${firstSublistItem.current_tasks}\n` +
                            `  - **Total Tasks:** ${firstSublistItem.total_tasks}\n` +
                            `  - **Pet XP:** ${pet.actual_xp}/${pet.total_xp}\n` +
                            `  - **Pet Level:** ${pet.level}`);
                    } else {
                        messageDispatcher(`⚠️ **No sublist item with current tasks < total tasks found. Incrementing list total tasks.**`);
                        userList.total_tasks++;
                    }
                } else {
                    if (userList.current_tasks === undefined) {
                        userList.current_tasks = 0;
                    }
                    if (userList.current_tasks < userList.total_tasks) {
                        userList.current_tasks++;
                        const pet = incrementXP(usernameForIncrement);

                        messageDispatcher(`🔄 **Updated list current tasks:**\n` +
                            `  - **Current Tasks:** ${userList.current_tasks}\n` +
                            `  - **Total Tasks:** ${userList.total_tasks}\n` +
                            `  - **Pet XP:** ${pet.actual_xp}/${pet.total_xp}\n` +
                            `  - **Pet Level:** ${pet.level}`);
                    } else {
                        messageDispatcher(`⚠️ **List current tasks have reached the total tasks.**`);
                    }
                }

                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForIncrement}**`);
            }
            break;

        case listViewCommandPattern.test(message):
            const usernameForListView = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForListView] && progress[usernameForListView].list) {
                const userList = progress[usernameForListView].list;
                let listStr = `📋 List details for ${usernameForListView}:\n` +
                    ` "${userList.name}" ${userList.current_tasks || 0}/${userList.total_tasks}`;

                if (userList.sublist.length > 0) {
                    listStr += `\n  - Sublist:\n`;
                    userList.sublist.forEach(sublistItem => {
                        listStr += ` "${sublistItem.name}" ${sublistItem.current_tasks}/${sublistItem.total_tasks}\n`;
                    });
                } else {
                    listStr += `\n  - **Sublist:** Empty`;
                }

                messageDispatcher(listStr.trim());
            } else {
                messageDispatcher(`❌ **No list found for username: ${usernameForListView}**`);
            }
            break;

        default:
            messageDispatcher(`⚠️ **Unknown command: ${message}**`);
            break;
    }
}

function executePossibleAdminCommand(message, currentUsername, messageDispatcher) {
    const foodCommandPattern = /^!(froot_loops|bubbaloo|ferrero_rocher) (\w+)$/;
    const adoptCommandPattern = /^!adopt (\d+) (\w+) (\d{4}-\d{2}-\d{2})$/;

    switch (true) {
        case foodCommandPattern.test(message):
            const [, food, usernameForFood] = message.match(foodCommandPattern);
            initializeUserProgressIfNotPresent(usernameForFood);
            if (progress[usernameForFood]) {
                if (progress[usernameForFood].inventory.hasOwnProperty(food)) {
                    progress[usernameForFood].inventory[food]++;
                    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                    messageDispatcher(`🍽️ **Food item ${food} incremented for ${usernameForFood}.**`);
                } else {
                    messageDispatcher(`❌ **Food item ${food} not found in inventory for ${usernameForFood}**`);
                }
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForFood}**`);
            }
            break;

        case adoptCommandPattern.test(message):
            const [, id, usernameForAdopt, birthday] = message.match(adoptCommandPattern);
            initializeUserProgressIfNotPresent(usernameForAdopt);
            if (progress[usernameForAdopt] && pets[id]) {
                progress[usernameForAdopt].pet = {
                    id: parseInt(id),
                    name: "",
                    birthday: birthday,
                    level: 1,
                    type: pets[id].type,
                    hunger: 100,
                    actual_xp: 0,
                    total_xp: 1000
                };
                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                messageDispatcher(`🎉 **Pet adopted for ${usernameForAdopt}:**\n` +
                    `  - **ID:** ${id}\n` +
                    `  - **Type:** ${pets[id].type}\n` +
                    `  - **Birthday:** ${birthday}`);
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForAdopt} or pet ID ${id} not found**`);
            }
            break;

        default:
            executePossibleUserCommand(message, currentUsername, messageDispatcher);
            break;
    }
}

client.on('message', (channel, tags, message, self) => {
    if (self || tags['display-name'] === "Nightbot" || !message.startsWith('!')) return;
    let responseAlreadyGiven = false;

    if (tags['display-name'] === 'Gemdelle' || tags['display-name'] === "gemy_bot") {
        executePossibleAdminCommand(message.toLowerCase(), tags['display-name'].toLowerCase(), (message) => {
            console.log(message);
            client.say(channel, `${message}`);
            responseAlreadyGiven = true;
        });
        return;
    }

    executePossibleUserCommand(message.toLowerCase(), tags['display-name'].toLowerCase(), (message) => {
        if (responseAlreadyGiven) return;
        console.log(message);
        client.say(channel, `${message}`);
    });
});

client.on('disconnected', (reason) => {
    console.log(`Disconnected: ${reason}`);
});

client.on('reconnect', () => {
    console.log('Reconnecting...');
});

module.exports = {
    client,
    executePossibleAdminCommand,
    // other exports
};