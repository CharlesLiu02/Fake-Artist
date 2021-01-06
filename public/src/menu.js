const createRoom = () => {
    // Generate room code
    const code = Math.random().toString(36).substr(2, 5)
    document.getElementById("room").value = code
}

document.getElementById('create-btn').addEventListener('click', createRoom)