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

// socket.emit -> single socket
// io.emit -> all sockets
// socket.broadcast.emit -> all sockets besides the current one
io.on('connection', (socket) => {
    socket.on('join room', ({username, room}) => {
        const user = userJoin(socket.id, username, room)

        socket.join(user.room)

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
    // socket.on('start game', () => io.emit('start game'))
    socket.on('draw', (data) => {
        io.emit('draw', data)
    })

    socket.on('disconnect', () => {
        const user = userLeave(socket.id)
        if (user) {
            io.to(user.room).emit('message', formatMessage(botName, `${user} has left the game`))
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