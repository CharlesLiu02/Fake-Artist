// Get username and room from URL
const {username, room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
})

const socket = io()

// Join room
socket.emit('join room', {username, room})


// Get room and users
socket.on('room users', ({room, users}) => {

})