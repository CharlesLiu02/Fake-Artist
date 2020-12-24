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

(() => {
    const socket = io()
    const canvas = document.querySelector('canvas')

    const onClick = (e) => {
        const {x, y} = getClickCoordinates(canvas, e)
    }

    socket.on('message', log)

    document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(socket))

    canvas.addEventListener('click', onClick)
})();