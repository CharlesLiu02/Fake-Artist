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

var pos = {x: 0, y: 0}

const updateBoard = (canvas) => {
    const ctx = canvas.getContext('2d')

    //New position from mouse event
    const setPosition = (e) => {
        const {top, left} = canvas.getBoundingClientRect()
        const {clientX, clientY} = e
        pos.x = clientX - left
        pos.y = clientY - top
    }

    const draw = (e) => {
        //Checks that mouse left button is pressed
        if (e.buttons !== 1) {
            return
        }
        ctx.beginPath();

        ctx.lineWidth = 2
        ctx.linecap = 'round'
        ctx.strokeStyle = 'black'
        
        //From
        ctx.moveTo(pos.x, pos.y)
        setPosition(e)
        //To
        ctx.lineTo(pos.x, pos.y)
        //Draws line
        ctx.stroke()
    }

    return {setPosition, draw}
}

(() => {
    const socket = io()
    const canvas = document.querySelector('canvas')
    const {width} = canvas.getBoundingClientRect()
    canvas.width = width
    const heightRatio = 0.67
    canvas.height = canvas.width * heightRatio

    const resizeCanvas = (e) => {
        const {width} = canvas.getBoundingClientRect()
        canvas.width = width
        const heightRatio = 0.67
        canvas.height = canvas.width * heightRatio
    }

    socket.on('message', log)

    document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(socket))

    const {setPosition} = updateBoard(canvas)
    const {draw} = updateBoard(canvas)

    window.addEventListener('resize', resizeCanvas)
    document.addEventListener('mousemove', draw)
    document.addEventListener('mousedown', setPosition)
    document.addEventListener('mouseenter', setPosition)
})();