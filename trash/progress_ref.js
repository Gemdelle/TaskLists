// //user command -> visualize the ranking by actual_xp, 1 linea por user example <emoji>Gemdelle<emoji> !progress
// {
//     "Gemdelle": {
//     "emoji": "",//user command -> actualiza emoji !emoji <emoji>
//         "inventory": {
//         //admin command -> credit food !<food>  <username>(\w+)
//         //user command -> visualize food !inventory
//         "froot_loops": 0, //+3 hungry
//             "bubbaloo": 0, //+8 hungry
//             "ferrero_rocher": 0 //+12 hungry
//     },
//     "pet": {
//         //admin command -> create pet !adopt <id> <username> <birthday>
//         //user command -> give name pet !petname <name>
//         //user command -> visualize pet !pet
//         //user command -> feed pet !feed  <food>(\w+) //+x hungry, -1 food
//         "id": 1,
//             "name": "",
//             "birthday": "",//Date
//             "level": 1,
//             "type": "plant",
//             "hunger": 100, //-1 por hora
//             "actual_xp": 0, //+1 por sublevel completado
//             "total_xp": 1000
//     },
//     //user command -> !list <list_name> <total_tasks>
//     //user command -> !sublist <total_tasks>
//     //user command -> !++l
//     //user command -> !list
//     "list": {
//         "name": "",
//             "total_tasks": 0, //si hay sublist, las total_task son el lenght de la sublist.
//             "sublist": [
//             {
//                 "name": "",
//                 "total_tasks": 0
//             }
//         ]
//     }
//
// }
// }