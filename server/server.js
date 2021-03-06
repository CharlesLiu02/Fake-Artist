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

const roomToTurns = new Map() // Keeps track of turns index
const roomToCategories = new Map() // Keeps track of categories
const roomToUsers = new Map() // Keeps track of users for determining word picker
const roomToWord = new Map() // Keeps track of current word
const roomToChooser = new Map() // Keeps track of word picker, makes sure they get the word
const roomToPicker = new Map() // Keeps track of word picker
const roomToHost = new Map() // Keeps track of host
const roomToVotes = new Map() // Keeps track of votes
const roomToFakeArtist = new Map() // Keeps track of fake artist
const roomToColor = new Map() // Keeps track of user colors
const allColors = ['red', 'blue', 'green', '#663399', '#8B4513', "#FF6347", 
                    "#00FFFF", 'black', "#7FFF00", "#FF69B4"]

// socket.emit -> single socket
// io.emit -> all sockets
// socket.broadcast.emit -> all sockets besides the current one
io.on('connection', (socket) => {
    socket.on('join room', ({username, room}) => {
        if (!roomToHost.get(room)) {
            roomToHost.set(room, username)
        }
        if (!roomToColor.get(room)) {
            roomToColor.set(room, [])
        }
        const user = userJoin(socket.id, username, room)

        chooseColor(user)

        var roomUsers = roomToUsers.get(room)
        if (!roomUsers) {
            roomToUsers.set(room, [])
        } else {
            roomUsers.push(username)
            roomToUsers.set(room, roomUsers)
        }

        socket.join(user.room)
        roomToTurns.set(room, 0)
        roomToVotes.set(room, new Map())
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
            io.to(socket.id).emit('get host')
        }
    })

    // Handling setting up initial info
    socket.on('set up', () => {
        const user = getCurrentUser(socket.id)
        const categories = roomToCategories.get(user.room)
        const category = categories[randomInteger(0, categories.length - 1)]
        const colors = roomToColor.get(user.room)
        info = {
            category: category,
            colors: colors
        }
        io.to(user.room).emit('set up', info)
    })

    // Handling making the picker go first
    socket.on('get first', () => {
        const user = getCurrentUser(socket.id)
        var roomUsers = roomToUsers.get(user.room)
        setUpPicker(user, roomUsers)
        if (user.username === roomToPicker.get(user.room)) {
            io.to(socket.id).emit('get first')
        }
    })


    // Handling picking a word
    socket.on('pick word', () => {
        const user = getCurrentUser(socket.id)
        if (user.username === roomToPicker.get(user.room)) {
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
            const index = randomInteger(0, numUsers - 1)
            wordList[index] = 'X'
            // For 2 imposters
            // if (numUsers < 7) {
            //     const index = randomInteger(0, numUsers - 1)
            //     wordList[index] = 'X'
            // } else {
            //     const index1 = randomInteger(0, numUsers)
            //     const index2 = randomInteger(0, numUsers)
            //     while (index2 === index1) {
            //         index2 = randomInteger(0, numUsers)
            //     }
            //     wordList[index1] = 'X'
            //     wordList[index2] = 'X'
            // }
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
            const userWord = newWordList.splice(0, 1)[0]
            if (userWord === 'X') {
                roomToFakeArtist.set(user.room, user.username)
            }
            roomToWord.set(user.room, newWordList)
            io.to(socket.id).emit('display word', userWord)
        }
    })

    socket.on('finished turn', () => {
        //update turn number and send start turn to corresponding room with the right user based on which turn
        const users = getRoomUsers(getCurrentUser(socket.id).room)
        const index = roomToTurns.get(users[0].room)
        // Find what the difference is between picker and host
        const offset = findOffset(users)
        // If everyone has gone twice, start over game
        if (index > users.length * 2 - 1) {
            const room = getCurrentUser(socket.id).room
            resetRoom(room)
            io.to(users[0].room).emit('message', formatMessage(botName, "Time to Vote!"))
            io.to(users[0].room).emit('message', formatMessage(botName, "Waiting for votes..."))
            io.to(room).emit('start voting')
        } else {
            const currentUser = users[(index + offset) % (users.length)]
            console.log(index + offset, currentUser.username)
            roomToTurns.set(currentUser.room, roomToTurns.get(currentUser.room) + 1)
            io.to(currentUser.room).emit('start turn', currentUser)
        }
    })

    socket.on('receive vote', (votedPlayer) => {
        const room  = getCurrentUser(socket.id).room 
        const votes = roomToVotes.get(room)
        if (!votes.get(votedPlayer)) {
            votes.set(votedPlayer, 1)
        } else {
            votes.set(votedPlayer, votes.get(votedPlayer) + 1)
        }
        var numUsersVoted = 0
        for (const [key, value] of votes.entries()) {
            numUsersVoted += value
        }
        if (getRoomUsers(getCurrentUser(socket.id).room).length === numUsersVoted) {
            // Change votes map to JSON to pass as socket io parameter
            let votesJson = JSON.stringify(Array.from(votes));
            io.to(room).emit('show votes', votesJson)
            const maxVotes = getMax(votes)
            // If Fake Artist has the max amount of votes, they lose
            if (maxVotes.length === 1 && roomToFakeArtist.get(room) === maxVotes[0]) {
                io.to(room).emit('message', formatMessage(botName, "Fake Artist has been found!"))
                io.to(room).emit('message', formatMessage(botName, `The Fake Artist was "${roomToFakeArtist.get(room)}".`))
                // TODO: Fake Artist has opportunity to guess
                guessWord(maxVotes[0], room)
            } else {
                io.to(room).emit('message', formatMessage(botName, "Fake Artist Wins!"))
                io.to(room).emit('message', formatMessage(botName, `The Fake Artist was "${roomToFakeArtist.get(room)}".`))
                // restart game
                nextRound(room)
            }
        }
    })

    socket.on('guess word', (word) => {
        const room = getCurrentUser(socket.id).room
        if (word === roomToChooser.get(room).word) {
            io.to(room).emit('message', formatMessage(botName, `"${roomToFakeArtist.get(room)}" guessed the word!`))
        } else {
            io.to(room).emit('message', formatMessage(botName, `"${roomToFakeArtist.get(room)}" guessed "${word}". Incorrect! The word was "${roomToChooser.get(room).word}".`))
        }
        nextRound(room)
    })

    socket.on('draw', (data) => {
        io.emit('draw', data)
    })

    socket.on('disconnect', () => {
        const user = userLeave(socket.id)
        if (user) {
            removeColor(user)
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

const guessWord = (username, room) => {
    io.to(room).emit('message', formatMessage(botName, `"${roomToFakeArtist.get(room)}", please guess the word.`))
    const users = getRoomUsers(room)
    for (let i = 0; i < users.length; i++) {
        if (users[i].username === username) {
            io.to(users[i].id).emit('guess word')
            break
        }
    }
}

const resetRoom = (room) => {
    roomToTurns.set(room, 0)
    roomToPicker.set(room, "")
    roomToWord.set(room, false)
}

const nextRound = (room) => {
    roomToVotes.set(room, new Map())
    roomToChooser.set(room, false)
    io.to(room).emit('message', formatMessage(botName, "New round! Word picker please choose your word."))
    io.to(room).emit('start next round')
}

const chooseColor = (user) => {
    var color = allColors[randomInteger(0, allColors.length - 1)]
    const colors = roomToColor.get(user.room)
    while (colorContains(colors, color)) {
        color = allColors[randomInteger(0, allColors.length - 1)]
    }
    colors.push({username: user.username, color: color})
    roomToColor.set(user.room, colors)
}

const colorContains = (colors, color) => {
    for (let i = 0; i < colors.length; i++) {
        if (colors[i].color === color) {
            return true
        }
    }
    return false
}

const removeColor = (user) => {
    const colors = roomToColor.get(user.room)
    for (let i = 0; i < colors.length; i++) {
        if (user.username === colors[i].username) {
            colors.splice(i, 1)
            break
        }
    }
    roomToColor.set(user.room, colors)
}

const findOffset = (users) => {
    var offset
    for (let i = 0; i < users.length; i++) {
        if (users[i].username === roomToPicker.get(users[0].room)) {
            offset = i
            break
        }
    }
    return offset
}

const setUpPicker = (user, roomUsers) => {
    if ((!roomToPicker.get(user.room) || roomToPicker.get(user.room) === "") && user.username === roomUsers[0]) {
        const currentPicker = roomUsers.splice(0, 1)[0]
        roomToPicker.set(user.room, currentPicker)
        roomToUsers.set(user.room, roomUsers)
        console.log("current picker: ", currentPicker, "user: ", user.username)
    }
}

const getMax = (votes) => {
    const maxArray = []
    const maxVotes = Math.max(...votes.values())
    for (const [key, value] of votes.entries()) {
        if (value === maxVotes) {
            maxArray.push(key)
        }
    }
    return maxArray
}