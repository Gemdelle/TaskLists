require('dotenv').config();
const tmi = require('tmi.js');
const fs = require('fs');
const pets = require('../public/data/pets.json');
const fetch = require('node-fetch');
const {setDoc, getDoc, doc} = require("firebase/firestore");
const {db} = require("./firebase");

const STREAMELEMENTS_API_KEY = process.env.STREAMELEMENTS_API_KEY;
const STREAMER_ID = process.env.STREAMELEMENTS_CHANNEL_ID;

const storeItems = {
    rice: 15,
    tea: 35,
    coffee: 45,
    bug: 50,
    biscuit: 75,
    chicken_wing: 300,
    ball: 10,
    mouse: 10,
    socks: 10,
    piglet: 10
};

const getUserProgress = async (username) => {
    try {
        const docRef = doc(db, "progress", username);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        if (error.code === 'unavailable') {
            console.log('Reintentando conexión...');
            setTimeout(() => {
                getUserProgress(username);
            }, 5000);
        } else {
            console.error("Error getting document:", error);
        }
        return null;
    }
};


const saveUserProgress = async (username, progressData) => {
    try {
        const docRef = doc(db, "progress", username);
        await setDoc(docRef, progressData, { merge: true });
        console.log("Progress saved successfully!");
    } catch (error) {
        console.error("Error saving progress:", error);
    }
};


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

async function getLoyaltyPoints(username) {
    const url = `https://api.streamelements.com/kappa/v2/points/${STREAMER_ID}/${username}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${STREAMELEMENTS_API_KEY}` }
        });
        const data = await response.json();
        return {
            points: data.points || 0,
            rank: data.rank || 0
        };
    } catch (error) {
        console.error('Error al obtener puntos:', error);
        return null;
    }
}

async function updateLoyaltyPoints(username, amount) {
    const url = `https://api.streamelements.com/kappa/v2/points/${STREAMER_ID}/${username}/${amount}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${STREAMELEMENTS_API_KEY}` }
        });
        return response.ok;
    } catch (error) {
        console.error('Error al actualizar puntos:', error);
        return false;
    }
}

async function initializeUserProgressIfNotPresent(username) {
    const userProgress = await getUserProgress(username);
    if (!userProgress) {
        const newProgress = {
            emoji: "",
            inventory: {
                rice: 0,
                tea: 0,
                coffee: 0,
                bug: 0,
                biscuit: 0,
                chicken_wing: 0,
                ball: 0,
                mouse: 0,
                socks: 0,
                piglet: 0
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
        await saveUserProgress(username, newProgress);
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

async function executePossibleUserCommand(message, currentUsername, messageDispatcher) {
    const petCommandPattern = /^!my_eskel$/;
    const storeCommandPattern = /^!store$/;
    const buyRiceCommandPattern = /^!buy_rice$/;

    const inventoryCommandPattern = /^!inventory$/;
    const feedCommandPattern = /^!feed (\w+)$/;

    await initializeUserProgressIfNotPresent(currentUsername);
    const userProgress = await getUserProgress(currentUsername);

    /*
    TODO:
     - Agregar juguetes en el store
     - Agregar mistery box
        - Puede salir objeto random
        - Puede activarse una enfermedad/maldición
        - Pueden salir derlets
     -Agregar el buy de cada comida
     - Juguetes:
        - Reacción positiva: Sube happiness
        - Reacción negativa: Te muerde (sólo mensaje)
        - Reacción negativa: Se puede romper el juguete
        - Accion: Se pueden regalar los juguetes
    - Comida:
        - Reaccion positiva: Sube hunger
        - Reacción negativa: Te muerde (sólo mensaje)
        - Reaccion negativa: Se enferma y perdes derlets(random) para curarlo
        - Reaccion negativa: Se enferma y perdes derlets(random) para curarlo
     -Agregar interacciones:
        - Accion de pet
        - Accion de play
        - Accion llevar al veterinario

     */

    const command = message.split(' ')[0];

    switch (true) {
        case inventoryCommandPattern.test(message):
            if (userProgress) {
                const userInventory = userProgress.inventory;
                let inventoryStr = `🎒 **Inventory for ${currentUsername}:**\n`;
                for (const [item, quantity] of Object.entries(userInventory)) {
                    inventoryStr += `  - **${item}:** ${quantity}\n`;
                }
                messageDispatcher(inventoryStr.trim());
            } else {
                messageDispatcher(`❌ **No progress found for username: ${currentUsername}**`);
            }
            break;

        case petCommandPattern.test(message):
            if (userProgress && userProgress.pet) {
                const pet = userProgress.pet;
                let petStr = `🐾 **Eskel details of ${pet.name}:**\n`;
                for (const [key, value] of Object.entries(pet)) {
                    petStr += `  - **${key}:** ${value}\n`;
                }
                petStr += pets[pet.id][pet.level];
                messageDispatcher(petStr.trim());
            } else {
                messageDispatcher(`❌ **No pet found for username: ${currentUsername}**`);
            }
            break;

        case feedCommandPattern.test(message):
            const [, foodToFeed] = message.match(feedCommandPattern);
            /*TODO
                - validar que tenga comida en el inventario
                - Actualizar hunger
                - restar comida del inventario
             */

            if (userProgress) {
                if (userProgress.inventory.hasOwnProperty(foodToFeed) && userProgress.inventory[foodToFeed] > 0) {
                    userProgress.inventory[foodToFeed]--;

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

                    userProgress.pet.hunger = Math.min(userProgress.pet.hunger + hungerIncrement, 100);

                    await saveUserProgress(currentUsername, userProgress);

                    messageDispatcher(`🍽️ **Food item ${foodToFeed} used for ${currentUsername}.**\n` +
                        `  - **New Hunger Value:** ${userProgress.pet.hunger}`);
                } else {
                    messageDispatcher(`❌ **No ${foodToFeed} left in inventory or inventory not found for ${currentUsername}**`);
                }
            } else {
                messageDispatcher(`❌ **No progress found for username: ${currentUsername}**`);
            }
            break;

        case storeCommandPattern.test(message):
            let storeMessage = '**Store Items:**\n';
            for (const [item, price] of Object.entries(storeItems)) {
                storeMessage += `${item}: ${price} derlets\n`;
            }
            messageDispatcher(storeMessage);
            break;

        case buyRiceCommandPattern.test(message):
            buyRice(currentUsername, messageDispatcher);
            break;

        default:
            messageDispatcher(`⚠️ **Unknown command: ${message}**`);
            break;
    }
}

async function executePossibleAdminCommand(message, currentUsername, messageDispatcher) {
    const foodCommandPattern = /^!(froot_loops|bubbaloo|ferrero_rocher) (\w+)$/;
    const adoptCommandPattern = /^!adopt (\d+) (\w+) (\w+) (\d{4}-\d{2}-\d{2})$/;
    const pointsCommandPattern = /^!points (\w+)$/;
    const addPointsCommandPattern = /^!add_points (\w+) (\d+)$/;
    const removePointsCommandPattern = /^!remove_points (\w+) (\d+)$/;


    switch (true) {
        case foodCommandPattern.test(message):
            const [, food, usernameForFood] = message.match(foodCommandPattern);
            await initializeUserProgressIfNotPresent(usernameForFood);

            const userProgressAddFood = await getUserProgress(usernameForFood);

            if (userProgressAddFood) {
                if (userProgressAddFood.inventory.hasOwnProperty(food)) {
                    userProgressAddFood.inventory[food]++;

                    await saveUserProgress(usernameForFood, userProgressAddFood);

                    messageDispatcher(`🍽️ **Food item ${food} incremented for ${usernameForFood}.**`);
                } else {
                    messageDispatcher(`❌ **Food item ${food} not found in inventory for ${usernameForFood}**`);
                }
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForFood}**`);
            }
            break;

        case adoptCommandPattern.test(message):
            const [, id, usernameForAdopt, petName, birthday] = message.match(adoptCommandPattern);
            await initializeUserProgressIfNotPresent(usernameForAdopt);

            const userProgressAdopt = await getUserProgress(usernameForAdopt);

            if (userProgressAdopt && pets[id]) {
                userProgressAdopt.pet = {
                    id: parseInt(id),
                    name: petName,
                    birthday: birthday,
                    level: 1,
                    type: pets[id].type,
                    hunger: 100,
                    happiness: 100,
                    actual_xp: 0,
                    total_xp: 1000
                };

                await saveUserProgress(usernameForAdopt, userProgressAdopt);

                messageDispatcher(`🎉 **Pet adopted for ${usernameForAdopt}:**\n` +
                    `  - **ID:** ${id}\n` +
                    `  - **Type:** ${pets[id].type}\n` +
                    `  - **Birthday:** ${birthday}`);
            } else {
                messageDispatcher(`❌ **No progress found for username: ${usernameForAdopt} or pet ID ${id} not found**`);
            }
            break;

        case pointsCommandPattern.test(message):
            const [, usernamePuntos] = message.match(pointsCommandPattern);
            getLoyaltyPoints(usernamePuntos).then(userData => {
                if (userData !== null) {
                    messageDispatcher(`🌟[Rank ${userData.rank}] **${usernamePuntos} has ${userData.points} derlets!**`);
                } else {
                    messageDispatcher(`❌ **Error al obtener los puntos de ${usernamePuntos}.**`);
                }
            });
            break;

        case addPointsCommandPattern.test(message):
            const [, targetUser, amount] = message.match(addPointsCommandPattern);
            updateLoyaltyPoints(targetUser, parseInt(amount)).then(success => {
                if (success) {
                    messageDispatcher(`🎁 **${currentUsername} has given ${amount} derlets to ${targetUser}!**`);
                } else {
                    messageDispatcher(`❌ **Error al transferir puntos a ${targetUser}.**`);
                }
            });
            break;

        case removePointsCommandPattern.test(message):
            const [, targetUserRemove, amountRemove] = message.match(removePointsCommandPattern);
            updateLoyaltyPoints(targetUserRemove, -parseInt(amountRemove)).then(success => {
                if (success) {
                    messageDispatcher(`❌ **${currentUsername} has removed ${amountRemove} derlets from ${targetUserRemove}!**`);
                } else {
                    messageDispatcher(`⚠️ **Error al eliminar puntos de ${targetUserRemove}.**`);
                }
            });
            break;

        default:
            await executePossibleUserCommand(message, currentUsername, messageDispatcher);
            break;
    }
}

async function buyRice(username, messageDispatcher) {
    const ricePrice = storeItems.rice;

    const { points } = await getLoyaltyPoints(username);

    if (points < ricePrice) {
        messageDispatcher(`❌ **${username}, you don't have enough derlets to buy rice!**`);
        return;
    }

    const success = await updateLoyaltyPoints(username, -ricePrice);
    if (!success) {
        messageDispatcher(`❌ **Failed to deduct derlets for ${username}.**`);
        return;
    }

    const userProgress = await getUserProgress(username);

    if (userProgress) {
        if (userProgress.inventory.hasOwnProperty('rice')) {
            userProgress.inventory['rice']++;
            await saveUserProgress(username, userProgress);

            messageDispatcher(`✅ **${username} bought 1 rice for ${ricePrice} derlets!**`);
        } else {
            messageDispatcher(`❌ **Failed to add rice to ${username}'s inventory.**`);
            await updateLoyaltyPoints(username, ricePrice);
        }
    } else {
        messageDispatcher(`❌ **No progress found for username: ${username}**`);
        await updateLoyaltyPoints(username, ricePrice);
    }
}

client.on('message', async (channel, tags, message, self) => {
    if (self || tags['display-name'] === "Nightbot" || !message.startsWith('!')) return;
    let responseAlreadyGiven = false;

    if (tags['display-name'] === 'Gemdelle' || tags['display-name'] === "gemy_bot" || tags['display-name'] === "Se0hyunLoL") {
        await executePossibleAdminCommand(message.toLowerCase(), tags['display-name'], (message) => {
            console.log(message);
            client.say(channel, `${message}`);
            responseAlreadyGiven = true;
        });
        return;
    }

    executePossibleUserCommand(message.toLowerCase(), tags['display-name'], (message) => {
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
};