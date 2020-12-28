// Get username and room from URL
const {username, room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
})
console.log(username, room)

const displayUsers = (users) => {
    const userList = document.querySelector('#players')
    userList.innerHTML = `
        ${users.map((user) => `<li>${user.username}</li>`).join('')}`
}

const socket = io()

// Join room
socket.emit('join room', {username, room})

// Get room and users
socket.on('room users', ({room, users}) => {
    displayUsers(users)
})