// Get username and room from URL
const {username, room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
})

const displayUsers = (users) => {
    const userList = document.querySelector('#players')
    const displayUsers = []
    for (let i = 0; i < users.length; i++) {
        if (users[i].username !== username) {
            displayUsers.push(`<li>${users[i].username}<span style="display: flex; justify-content: space-around; align-items: stretch;"><div id="color-box"></div><button class="vote-btn" value=${users[i].username} style="display: none;">Vote</button><div id="num-votes"></div></span></li>`)
        } else {
            displayUsers.push(`<li>${users[i].username}<span style="display: flex; justify-content: space-around; align-items: stretch;"><div id="color-box"></div><div id="num-votes"></div></span></li>`)
        }
    }
    userList.innerHTML = `${displayUsers.join('')}`
}

const togglePopup = () => {
    document.getElementById("popup-1").classList.toggle("active");
}

const submitWord = (e) => {
    e.preventDefault()
    const word = document.getElementById('word-form-input').value
    togglePopup()
    socket.emit('submit word', {word, username})
}

const sendVote = (e) => {
    e.preventDefault()
    const votedPlayer = e.srcElement.value
    const voteBtns = document.getElementsByClassName('vote-btn')
    // Hide vote buttons after voting once
    for (let i = 0; i < voteBtns.length; i++) {
        voteBtns[i].style.display = "none"
    }
    socket.emit('receive vote', votedPlayer)
}

const displayColors = (colors) => {
    const players = document.getElementById('players').getElementsByTagName('li')
    if (colors.length !== players.length) {
        console.log("Error: colors length and players length are different")
        return
    }
    for (let i = 0; i < colors.length; i++) {
        for (let j = 0; j < players.length; j++) {
            if (colors[i].username === players[j].innerText) {
                const colorBox = players[j].querySelector("#color-box")
                colorBox.style = "inline"
                colorBox.style.width = "10px"
                colorBox.style.height = "10px"
                colorBox.style.border = "1px black solid"
                colorBox.style.backgroundColor = colors[i].color
                break
            }
        }
    }
}

const startGame = () => {
    // Start the game if host
    socket.emit('get host')

    // Set up category and player color
    socket.emit('set up')

    // Set up word
    socket.emit('pick word')

}

const socket = io()
var isDraw = false
var color

socket.on('get host', () => {
    socket.emit('finished turn')
})

socket.on('set up', (info) => {
    document.getElementById('category').innerText = info.category
    colors = info.colors
    for (let i = 0; i < colors.length; i++) {
        if (username === colors[i].username) {
            color = colors[i].color
            break
        }
    }
    displayColors(colors)
})

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
            userList[i].style.color = "blue"
            userList[i].style.fontWeight = "bold"
            break
        }
    }
})

// Start voting, display buttons and gather votes
socket.on('start voting', () => {
    const voteBtns = document.getElementsByClassName('vote-btn')
    for (let i = 0; i < voteBtns.length; i++) {
        voteBtns[i].style.display = "inline"
        voteBtns[i].onclick = sendVote
    }
})

// Show votes
socket.on('show votes', (votesJson) => {
    const players = document.getElementById('players').getElementsByTagName('li') 
    const votes = new Map(JSON.parse(votesJson));
    for (const [username, numVotes] of votes.entries()) {
        for (let j = 0; j < players.length; j++) {
            if (username === players[j].innerText) {
                const votesBox = players[j].querySelector("#num-votes")
                votesBox.style = "inline-block"
                votesBox.style.width = "10px"
                votesBox.style.height = "10px"
                votesBox.style.marginRight = "40px"
                votesBox.innerText = numVotes
                votesBox.style.color = "red"
                votesBox.style.fontWeight = "bold"
                break
            }
        }
    } 
})

// Start next round with new picker
socket.on('start next round', () => {
    clearCanvas()
    startGame()
})

// Join room
socket.emit('join room', {username, room})

startGame()

document.getElementById('submit-btn').addEventListener('click', submitWord)
