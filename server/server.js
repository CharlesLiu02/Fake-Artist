const path = require('path');
const http = require('http');
const express = require('express')
// Express initializes app to be a function handler that can be supplied to an HTTP server
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server)

// Used for accessing html, stylesheets, and JS files
const clientPath = `${__dirname}/../client`;

// Serving public files
app.use(express.static(clientPath))

// Defined a route handler / that gets called when at website home
app.get('/', (req, res) => {
    res.sendFile(path.resolve(clientPath + '/main.html'));
});

var players = []

io.on('connection', (socket) => {
    console.log('A user connected')

    socket.on('message', (text) => io.emit('message', text))
    // socket.on('add category', (text) => io.emit('add category', text))
    // socket.on('start game', () => io.emit('start game'))
    socket.on('draw', (data) => {
        io.emit('draw', data)
    })

    socket.on('player joined', (username) => {
        players.push(username)
        io.emit('update players', players)
    })

    socket.on('disconnect', () => {
        console.log('User disconnected')
    })
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

server.listen(8080, () => {
    console.log('listening on 8080');
});