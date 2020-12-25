//Updates chat
const log = (text) => {
    const parent = document.querySelector('#events')
    const elem = document.createElement('li')
    elem.innerHTML = text
    parent.appendChild(elem)
    parent.scrollTop = parent.scrollHeight;
}

const onChatSubmitted = (socket) => (e) => {
    e.preventDefault()
    const input = document.querySelector('#chat')
    const text = input.value
    input.value = ''
    socket.emit('message', text)
}

const updatePlayers = (players) => {
    var parent = document.querySelector('#players')
    parent.innerHTML = ''
    for (var i = 0; i < players.length; i++) {
        const elem = document.createElement('li')
        elem.innerHTML = "<h4>" + players[i] + "</h4>"
        parent.appendChild(elem)
    }
}

// var pos = {x: 0, y: 0}

// const updateBoard = (canvas) => {
//     const ctx = canvas.getContext('2d')

//     //New position from mouse event
//     const setPosition = (e) => {
//         const {top, left} = canvas.getBoundingClientRect()
//         const {clientX, clientY} = e
//         pos.x = clientX - left
//         pos.y = clientY - top
//     }

//     const draw = (e) => {
//         //Checks that mouse left button is pressed
//         if (e.buttons !== 1) {
//             return
//         }
//         ctx.beginPath();

//         ctx.lineWidth = 2
//         ctx.linecap = 'round'
//         ctx.strokeStyle = 'black'
        
//         //From
//         ctx.moveTo(pos.x, pos.y)
//         setPosition(e)
//         //To
//         ctx.lineTo(pos.x, pos.y)
//         //Draws line
//         ctx.stroke()
//     }

//     return {setPosition, draw}
// }

const socket = io()

socket.on('message', log)
socket.on('update players', updatePlayers)

document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(socket))

var username = prompt("Enter Name:")
socket.emit('player joined', username)