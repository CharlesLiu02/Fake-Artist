const createRoom = () => {
    // Generate room code
    const code = Math.random().toString(36).substr(2, 5)
    document.getElementById("room").value = code
    console.log("here")
}

document.getElementById('create-btn').addEventListener('click', createRoom)