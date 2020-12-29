const path = require('path');
const http = require('http');
const express = require('express')
// Express initializes app to be a function handler that can be supplied to an HTTP server
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server)
const formatMessage = require("../utils/messages");
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require("../utils/users")

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

        socket.join(user.room)
        roomToTurns.set(room, 0)

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

    // socket.on('add category', (text) => io.emit('add category', text))
    socket.on('start game', () => io.to(getCurrentUser(socket.id).room).emit('start game'))
    socket.on('room users', () => {
        const user = getCurrentUser(socket.id)
        io.to(user.room).emit('room users', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
    })

    socket.on('get host', () => {
        const users = getRoomUsers(getCurrentUser(socket.id).room)
        io.to(getCurrentUser(socket.id).room).emit('get host', users.filter((user) => user.isHost))
    })

    socket.on('finished turn', () => {
        // const users = getRoomUsers(getCurrentUser(socket.id).room)
        // console.log(users)
        // for (let i = 0; i < users.length; i++) {
        //     if (users[i].turnNumber === turnNumber) {
        //         io.to(users[i].room).emit('start turn', users[i])
        //         users[i].turnNumber = users[i].turnNumber + 1
        //     }
        // }
        //update turn number and send start turn to corresponding room with the right user based on which turn
        const users = getRoomUsers(getCurrentUser(socket.id).room)
        const index = roomToTurns.get(users[0].room) - 1
        if (index >= 0) {
            const currentUser = users[index % (users.length)]
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