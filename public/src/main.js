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
    socket.emit('submit word', {word, username})
}

const socket = io()
var isDraw = false

// Join room
socket.emit('join room', {username, room})

// Start the game if host
socket.emit('get host')
socket.on('get host', () => {
    socket.emit('finished turn')
})

// Set up category and player color
socket.emit('set up')
socket.on('set up', (info) => {
    document.getElementById('category').innerText = info.category
})

// Set up word
socket.emit('pick word')
socket.on('pick word', () => {
    togglePopup()
})

// Show word
socket.on('submit word', () => {
    socket.emit('display word')
})

socket.on('display word', (word) => document.getElementById('word').innerText = word)

// Get room and users
socket.on('room users', ({room, users}) => {
    displayUsers(users)
})

// Start turn
socket.on('start turn', (user) => {
    const userList = document.getElementById("players").getElementsByTagName("li")
    // Resetting highlight
    for (let i = 0; i < userList.length; i++) {
        userList[i].style.color = "black"
        userList[i].style.fontWeight = "normal"
    }
    if (user.username === username) {
        isDraw = true
    }
    // Highlighting current user
    for (let i = 0; i < userList.length; i++) {
        if (userList[i].innerText === user.username) {
            console.log(userList[i].innerText)
            userList[i].style.color = "blue"
            userList[i].style.fontWeight = "bold"
            break
        }
    }
})

document.getElementById('submit-btn').addEventListener('click', submitWord)
