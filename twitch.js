require('dotenv').config();
const tmi = require('tmi.js');
const fs = require('fs');
const pets = require('./pets.json');
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
                total_tasks: 0,
                sublist: []
            }
        };
        fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
    }
}

function executePossibleAdminCommand(message, currentUsername, messageDispatcher) {
    const progressCommandPattern = /^!progress (\w+)$/;
    const emojiCommandPattern = /^!emoji (\w+)$/;
    const foodCommandPattern = /^!(froot_loops|bubbaloo|ferrero_rocher) (\w+)$/;
    const inventoryCommandPattern = /^!inventory (\w+)$/;
    const adoptCommandPattern = /^!adopt (\d+) (\w+) (\d{4}-\d{2}-\d{2})$/;
    const petnameCommandPattern = /^!petname (\w+)$/;
    const petCommandPattern = /^!pet$/;
    const feedCommandPattern = /^!feed (\w+)$/;
    const listCommandPattern = /^!list (\w+),(\d+)$/;
    const sublistCommandPattern = /^!sublist (\w+),(\w+),(\d+)$/;
    const incrementListCommandPattern = /^!\+\+l$/;
    const listViewCommandPattern = /^!list$/;

    const command = message.split(' ')[0];

    switch (true) {

        case progressCommandPattern.test(message):
            const [, usernameProgress] = message.match(progressCommandPattern);
            initializeUserProgressIfNotPresent(usernameProgress);
            if (progress[usernameProgress]) {
                const userProgress = progress[usernameProgress];
                console.log(pets[userProgress.pet][userProgress.actual_level]);
            } else {
                console.log(`No progress found for username: ${usernameProgress}`);
            }
            break;

        case emojiCommandPattern.test(message):
            const [, emoji] = message.match(emojiCommandPattern);
            const usernameForEmoji = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForEmoji]) {
                progress[usernameForEmoji].emoji = emoji;

                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                console.log(`Emoji updated for ${usernameForEmoji}: ${emoji}`);
            } else {
                console.log(`No progress found for username: ${usernameForEmoji}`);
            }
            break;

        case foodCommandPattern.test(message):
            const [, food, usernameForFood] = message.match(foodCommandPattern);
            initializeUserProgressIfNotPresent(usernameForFood);
            if (progress[usernameForFood]) {
                if (progress[usernameForFood].inventory.hasOwnProperty(food)) {
                    progress[usernameForFood].inventory[food]++;
                } else {
                    console.log(`Food item ${food} not found in inventory for ${usernameForFood}`);
                }

                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                console.log(`Food item ${food} incremented for ${usernameForFood}`);
            } else {
                console.log(`No progress found for username: ${usernameForFood}`);
            }
            break;

        case inventoryCommandPattern.test(message):
            const [, usernameForInventory] = message.match(inventoryCommandPattern);
            initializeUserProgressIfNotPresent(usernameForInventory);
            if (progress[usernameForInventory]) {
                const userInventory = progress[usernameForInventory].inventory;
                let inventoryStr = `Inventory for ${usernameForInventory}: `;
                for (const [item, quantity] of Object.entries(userInventory)) {
                    inventoryStr += `${item}: ${quantity}, `;
                }
                console.log(inventoryStr.slice(0, -2)); // Remove trailing comma and space
            } else {
                console.log(`No progress found for username: ${usernameForInventory}`);
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
                console.log(`Pet adopted for ${usernameForAdopt}:`, progress[usernameForAdopt].pet);
            } else {
                console.log(`No progress found for username: ${usernameForAdopt}`);
            }
            break;

        case petnameCommandPattern.test(message):
            const [, petName] = message.match(petnameCommandPattern);
            const usernameForPetName = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForPetName] && progress[usernameForPetName].pet) {
                progress[usernameForPetName].pet.name = petName;

                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                console.log(`Pet name updated for ${usernameForPetName}: ${petName}`);
                messageDispatcher(`Pet name updated for ${usernameForPetName}: ${petName}`)
            } else {
                console.log(`No pet found for username: ${usernameForPetName}`);
            }
            break;

        case petCommandPattern.test(message):
            const usernameForPet = currentUsername;
            if (progress[usernameForPet] && progress[usernameForPet].pet) {
                const pet = progress[usernameForPet].pet;
                let petStr = `Pet details for ${usernameForPet}: `;
                for (const [key, value] of Object.entries(pet)) {
                    petStr += `${key}: ${value}, `;
                }
                let petStatusMessage = petStr.slice(0, -2);
                console.log(petStatusMessage);
                let currentUserPetId = progress[usernameForPet].pet.id;
                let currentUserPetLevel = progress[usernameForPet].pet.level;
                console.log(pets[currentUserPetId][currentUserPetLevel]);
                messageDispatcher(petStatusMessage)
                messageDispatcher(pets[currentUserPetId][currentUserPetLevel])
            } else {
                console.log(`No pet found for username: ${usernameForPet}`);
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
                            console.log(`Unknown food item: ${foodToFeed}`);
                            return;
                    }

                    progress[usernameForFeed].pet.hunger = Math.min(progress[usernameForFeed].pet.hunger + hungerIncrement, 100);

                    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                    console.log(`Food item ${foodToFeed} used for ${usernameForFeed}. New hunger value: ${progress[usernameForFeed].pet.hunger}`);
                } else {
                    console.log(`No ${foodToFeed} left in inventory or inventory not found for ${usernameForFeed}`);
                }
            } else {
                console.log(`No progress found for username: ${usernameForFeed}`);
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
                console.log(`List created for ${usernameForList}:`, progress[usernameForList].list);
            } else {
                console.log(`No progress found for username: ${usernameForList}`);
            }
            break;

        case sublistCommandPattern.test(message):
            const [, listNameForSublist, sublistName, sublistTotalTasks] = message.match(sublistCommandPattern);
            const usernameForSublist = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForSublist] && progress[usernameForSublist].list &&
                progress[usernameForSublist].list.name === listNameForSublist) {

                progress[usernameForSublist].list.sublist.push({
                    name: sublistName,
                    total_tasks: parseInt(sublistTotalTasks)
                });

                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
                console.log(`Sublist item added to ${listNameForSublist} for ${usernameForSublist}:`, progress[usernameForSublist].list.sublist);
            } else {
                console.log(`List ${listNameForSublist} not found for username: ${usernameForSublist}`);
            }
            break;

        case incrementListCommandPattern.test(message):
            const usernameForIncrement = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForIncrement]) {
                const userList = progress[usernameForIncrement].list;

                if (userList && userList.sublist.length > 0) {
                    const firstSublistItem = userList.sublist.find(item => item.total_tasks < 10);
                    if (firstSublistItem) {
                        firstSublistItem.total_tasks++;
                        console.log(`Incremented total_tasks for sublist item:`, firstSublistItem);
                    } else {
                        console.log(`No sublist item with total_tasks < 10 found. Incrementing list total_tasks.`);
                        userList.total_tasks++;
                    }
                } else {
                    console.log(`Sublist is empty or not found. Incrementing list total_tasks.`);
                    userList.total_tasks++;
                }

                fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
            } else {
                console.log(`No progress found for username: ${usernameForIncrement}`);
            }
            break;

        case listViewCommandPattern.test(message):
            const usernameForListView = currentUsername;
            initializeUserProgressIfNotPresent(currentUsername);
            if (progress[usernameForListView] && progress[usernameForListView].list) {
                const userList = progress[usernameForListView].list;
                let listStr = `List details for ${usernameForListView}: Name: ${userList.name}, Total Tasks: ${userList.total_tasks}`;

                if (userList.sublist.length > 0) {
                    listStr += `, Sublist: [`;
                    userList.sublist.forEach(sublistItem => {
                        listStr += `Name: ${sublistItem.name}, Total Tasks: ${sublistItem.total_tasks}; `;
                    });
                    listStr = listStr.slice(0, -2);
                    listStr += `]`;
                } else {
                    listStr += `, Sublist: Empty`;
                }

                console.log(listStr);
            } else {
                console.log(`No list found for username: ${usernameForListView}`);
            }
            break;

        default:
            console.log(`Unknown command: ${message}`);
            break;
    }
}

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    console.log(`${tags['display-name']}: ${message}`);
    if(tags['display-name'] === 'Gemdelle'){
    }

    executePossibleAdminCommand(message.toLowerCase(), tags['display-name'].toLowerCase(), (message)=>{
        client.say(channel, `${message}`)
    })

    // if (message.toLowerCase() === '!hi') {
    //     client.say(channel, `!v Hello, ${tags['display-name']}!`);
    // }
});

client.on('disconnected', (reason) => {
    console.log(`Disconnected: ${reason}`);
});

client.on('reconnect', () => {
    console.log('Reconnecting...');
});

module.exports = client;
