// Get username and room from URL
const {username, room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
})

const displayUsers = (users) => {
    const userList = document.querySelector('#players')
    userList.innerHTML = `
        ${users.map((user) => `<li>${user.username}</li>`).join('')}`
}

function togglePopup(){
    document.getElementById("popup-1").classList.toggle("active");
}

const submitWord = (e) => {
    e.preventDefault()
    const word = document.getElementById('word-form-input').value
    togglePopup()
    socket.emit('submit word', word)
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
    const startBtn = document.getElementById("start-btn")
    if (startBtn && host[0].username !== username) {
        startBtn.style.display = "none"
    }
})

// Set up category
socket.emit('set up')
socket.on('set up', (info) => {
    document.getElementById('category').innerText = info.category
})

// Set up word
socket.emit('pick word')
socket.on('pick word', (currentPicker) => {
    console.log(currentPicker, username)
    if (currentPicker === username) {
        togglePopup()
        console.log("here")
    }
})

// Show word
socket.on('submit word', (word) => {
    document.getElementById('word').innerText = word
})

// Get room and users
socket.on('room users', ({room, users}) => {
    displayUsers(users)
})

// Start turn
socket.on('start turn', (user) => {
    const userList = document.getElementById("players").getElementsByTagName("li")
    // Resetting highlight
    for (let i = 0; i < userList.length; i++) {
        userList[i].style.backgroundColor = "#83d4ec"
    }
    if (user.username === username) {
        isDraw = true
    }
    // Highlighting current user
    for (let i = 0; i < userList.length; i++) {
        if (userList[i].innerText === user.username) {
            userList[i].style.backgroundColor = "#e0ffdd"
        }
    }
})

document.getElementById('submit-btn').addEventListener('click', submitWord)
