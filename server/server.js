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

// socket.emit -> single socket
// io.emit -> all sockets
// socket.broadcast.emit -> all sockets besides the current one
io.on('connection', (socket) => {
    socket.on('join room', ({username, room}) => {
        var isHost = false
        if (getRoomUsers(room).length === 0) {
            isHost = true
        }
        const user = userJoin(socket.id, username, room, isHost)

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
        const initialCategoriesList = ["Animals", "Household Objects", "Food"]

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
        const users = getRoomUsers(getCurrentUser(socket.id).room)
        io.to(getCurrentUser(socket.id).room).emit('get host', users.filter((user) => user.isHost))
        console.log(users.filter((user) => user.isHost).username)
    })

    // Handling setting up initial info
    socket.on('set up', () => {
        const room = getCurrentUser(socket.id).room
        const categories = roomToCategories.get(room)
        const category = categories[randomInteger(0, categories.length - 1)]
        info = {
            category: category
            // TODO: choose word
        }
        io.to(room).emit('set up', info)
    })

    // Handling picking a word
    socket.on('pick word', () => {
        const user = getCurrentUser(socket.id)
        var roomUsers = roomToUsers.get(user.room)
        if (user.username === roomUsers[0]) {
            const currentPicker = roomUsers.splice(roomUsers.length - 1, 1)[0]
            roomToUsers.set(user.room, roomUsers)
            console.log(currentPicker)

            io.to(getCurrentUser(socket.id).room).emit('pick word', (currentPicker))
        }
    })

    socket.on('submit word', (word) => io.to(getCurrentUser(socket.id).room).emit('submit word', word))

    socket.on('finished turn', () => {
        //update turn number and send start turn to corresponding room with the right user based on which turn
        const users = getRoomUsers(getCurrentUser(socket.id).room)
        const index = roomToTurns.get(users[0].room) - 1
        if (index >= 0) {
            const currentUser = users[index % (users.length)]
            console.log(index, currentUser.username)
            roomToTurns.set(currentUser.room, roomToTurns.get(currentUser.room) + 1)
            io.to(currentUser.room).emit('start turn', currentUser)
        } else {
            roomToTurns.set(getCurrentUser(socket.id).room, roomToTurns.get(getCurrentUser(socket.id).room) + 1)
        }
    })

    socket.on('draw', (data) => {
        io.emit('draw', data)
    })

    socket.on('disconnect', () => {
        const user = userLeave(socket.id)
        roomToUsers.set(user.room, getRoomUsers(user.room))
        if (user) {
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