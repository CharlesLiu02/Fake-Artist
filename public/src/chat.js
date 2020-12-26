//Updates chat and DOM
const outputMessage = (text) => {
    const parent = document.querySelector('#events')
    const elem = document.createElement('li')
    // If bot message, don't use username. Otherwise, display username too
    if (text.username === '') {
        elem.innerHTML = text.text
        elem.style = "color: blue;"
    } else {
        elem.innerHTML = text.username + ": " + text.text.trim()
    }
    parent.appendChild(elem)
    elem.scrollIntoView()
    document.querySelector('#chat').focus()
}

const onChatSubmitted = (socket) => (e) => {
    e.preventDefault()
    const input = document.querySelector('#chat')
    const text = input.value
    input.value = ''
    socket.emit('chat message', text)
}

socket.on('message', outputMessage)

document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted(socket))