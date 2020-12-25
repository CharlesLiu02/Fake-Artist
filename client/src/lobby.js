//Adds custom category
const log = (text) => {
    const parent = document.querySelector('#customs')
    const elem = document.createElement('li')
    elem.innerHTML = text
    parent.appendChild(elem)
    parent.scrollTop = parent.scrollHeight;
}

const onCategorySubmitted = (socket) => (e) => {
    e.preventDefault()
    const input = document.querySelector('#custom')
    const text = input.value
    input.value = ''
    socket.emit('add category', text)
}

//Initial request to server
const onStart = (socket) => (e) => {
    e.preventDefault()
    socket.emit('start game')
}

//Handle switching pages for all users
const doStart = () => {
    console.log("here")
    location.replace("main.html")
}

(() => {
    // socket.on('add category', log)

    // document.querySelector('#custom-form').addEventListener('submit', onCategorySubmitted(socket))
    document.getElementById('start-btn').addEventListener('click', onStart(socket))
})()