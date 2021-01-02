const path = require('path');
const http = require('http');
const express = require('express')
// Express initializes app to be a function handler that can be supplied to an HTTP server
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server)
const formatMessage = require("../utils/messages");
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require("../utils/users")
const randomInteger = require("../utils/info")

const PORT = process.env.PORT || 8080

// Used for accessing html, stylesheets, and JS files
const clientPath = path.join(__dirname, '../public')

// Serving public files, set static folder
app.use(express.static(clientPath))

// Defined a route handler / that gets called when at website home
app.get('/', (req, res) => {
    res.sendFile(path.resolve(clientPath + '/menu.html'));
});

const botName = ''

const roomToTurns = new Map()
const roomToCategories = new Map()
const roomToUsers = new Map()
const roomToWord = new Map()
const roomToChooser = new Map()
const roomToPicked = new Map()
const roomToHost = new Map()

// socket.emit -> single socket
// io.emit -> all sockets
// socket.broadcast.emit -> all sockets besides the current one
io.on('connection', (socket) => {
    socket.on('join room', ({username, room}) => {
        if (!roomToHost.get(room)) {
            roomToHost.set(room, username)
        }
        const user = userJoin(socket.id, username, room)

        var roomUsers = roomToUsers.get(room)
        if (!roomUsers) {
            roomToUsers.set(room, [])
        } else {
            roomUsers.push(username)
            roomToUsers.set(room, roomUsers)
        }

        socket.join(user.room)
        roomToTurns.set(room, 0)
        // Change to add more initial categories
        var initialCategoriesList
        if (!roomToCategories.get(room)) {
            initialCategoriesList = ["Animals", "Household Objects", "Food"]
        } else {
            initialCategoriesList = roomToCategories.get(room)
        }
        roomToCategories.set(room, initialCategoriesList)

        //Welcome current user
        socket.emit('message', formatMessage(botName, "Welcome to Fake Artist!"))

        // Broadcast when a user connects
        socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat`))

        // Send users and room info
        io.to(user.room).emit('room users', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
    })

    // Handling chat messaging
    socket.on('chat message', (text) => {
        const user = getCurrentUser(socket.id)
        io.to(user.room).emit('message', formatMessage(user.username, text))
    })

    socket.on('add category', (text) => {
        const user = getCurrentUser(socket.id)
        var roomCategories = roomToCategories.get(user.room)
        roomCategories.push(text)
        roomToCategories.set(user.room, roomCategories)
        console.log(roomToCategories)
        io.emit('add category', text)
    })

    socket.on('start game', () => io.to(getCurrentUser(socket.id).room).emit('start game'))
    socket.on('room users', () => {
        const user = getCurrentUser(socket.id)
        io.to(user.room).emit('room users', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
    })

    // Handling setting up host
    socket.on('get host', () => {
        const user = getCurrentUser(socket.id)
        if (user.username === roomToHost.get(user.room)) {
            console.log("host: ", user.username)
            io.to(socket.id).emit('get host')
        }
    })

    // Handling setting up initial info
    socket.on('set up', () => {
        const room = getCurrentUser(socket.id).room
        const categories = roomToCategories.get(room)
        console.log(roomToCategories)
        const category = categories[randomInteger(0, categories.length - 1)]
        info = {
            category: category
        }
        io.to(room).emit('set up', info)
    })

    // Handling picking a word
    socket.on('pick word', () => {
        const user = getCurrentUser(socket.id)
        var roomUsers = roomToUsers.get(user.room)
        if (!roomToPicked.get(user.room) && user.username === roomUsers[0]) {
            roomToPicked.set(user.room, true)
            const currentPicker = roomUsers.splice(0, 1)[0]
            roomToUsers.set(user.room, roomUsers)
            console.log("current picker: ", currentPicker, "user: ", user.username)

            io.to(socket.id).emit('pick word')
        }
    })

    socket.on('submit word', ({word, username}) => {
        const room = getCurrentUser(socket.id).room
        if (!roomToChooser.get(room) || roomToChooser.get(room) === {}) {
            const chooser = {word: word, username: username}
            roomToChooser.set(room, chooser)
        }
        if (!roomToWord.get(room)) {
            const numUsers = getRoomUsers(getCurrentUser(socket.id).room).length - 1 
            const wordList = []
            for (let i = 0; i < numUsers; i++) {
                wordList.push(word)
            }
            if (numUsers < 7) {
                const index = randomInteger(0, numUsers)
                wordList[index] = 'X'
            } else {
                const index1 = randomInteger(0, numUsers)
                const index2 = randomInteger(0, numUsers)
                while (index2 === index1) {
                    index2 = randomInteger(0, numUsers)
                }
                wordList[index1] = 'X'
                wordList[index2] = 'X'
            }
            roomToWord.set(room, wordList)
        }
        io.to(room).emit('submit word')
    })

    socket.on('display word', () => {
        const user = getCurrentUser(socket.id)
        const chooser = roomToChooser.get(user.room)
        if (user.username === chooser.username) {
            io.to(socket.id).emit('display word', chooser.word)
        } else {
            const newWordList = roomToWord.get(user.room)
            const userWord = newWordList.splice(0, 1)
            roomToWord.set(user.room, newWordList)
            io.to(socket.id).emit('display word', userWord)
        }
    })

    socket.on('finished turn', () => {
        //update turn number and send start turn to corresponding room with the right user based on which turn
        const users = getRoomUsers(getCurrentUser(socket.id).room)
        const index = roomToTurns.get(users[0].room)
        console.log(index)
        // if (index >= 0) {
            const currentUser = users[index % (users.length)]
            // console.log(index, currentUser.username)
            roomToTurns.set(currentUser.room, roomToTurns.get(currentUser.room) + 1)
            io.to(currentUser.room).emit('start turn', currentUser)
        // } else {
        //     roomToTurns.set(getCurrentUser(socket.id).room, roomToTurns.get(getCurrentUser(socket.id).room) + 1)
        // }
    })

    socket.on('draw', (data) => {
        io.emit('draw', data)
    })

    socket.on('disconnect', () => {
        const user = userLeave(socket.id)
        if (user) {
            roomToUsers.set(user.room, getRoomUsers(user.room))
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the game`))
            // Send users and room info
            io.to(user.room).emit('room users', {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        }
    })
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});