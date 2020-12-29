// Get username and room from URL
const {username, room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
})

const displayUsers = (users) => {
    const userList = document.querySelector('#players')
    userList.innerHTML = `
        ${users.map((user) => `<li>${user.username}</li>`).join('')}`
}

const socket = io()
var isDraw = false

// Join room
socket.emit('join room', {username, room})

// Start the game if host
socket.emit('get host')
socket.on('get host', (host) => {
    if (host[0].username === username) {
        socket.emit('finished turn')
    }
})

// Get room and users
socket.on('room users', ({room, users}) => {
    displayUsers(users)
})

// Start turn
socket.on('start turn', (user) => {
    console.log(user.username)
    const userList = document.getElementsByTagName("li")
    // Resetting highlight
    for (let i = 0; i < userList.length; i++) {
        userList[i].style.border = "none"
    }
    if (user.username === username) {
        isDraw = true
    }
    // Highlighting current user
    for (let i = 0; i < userList.length; i++) {
        if (userList[i].value === user.username) {
            userList[i].style.border = "2px solid red"
        }
    }
})
