const canvas = document.querySelector('canvas')

const ctx = canvas.getContext('2d');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)); // Asynchronous sleep

var rect = canvas.getBoundingClientRect();

let data = new Queue();

let painting = false;

async function startPosition(e) {
    if (isDraw) {
        if (painting === false) {
            socket.emit('draw', {
                'x1': e.clientX - rect.left,
                'y1': e.clientY - rect.top,
                'x2': e.clientX - rect.left,
                'y2': e.clientY - rect.top,
                'start': true
            });
        }
        await sleep(1);
        painting = true;
    }
}

function finishedPosition() {
    if (isDraw) {
        painting = false;
        ctx.beginPath();
    }
}

async function draw(e) {
    if (isDraw) {
        if (!painting) return;

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        let delta = {'start': false};

        delta['x1'] = e.clientX - rect.left;
        delta['y1'] = e.clientY - rect.top;
        // ctx.lineTo(delta['x1'], delta['y1']);
        // ctx.stroke();
        // ctx.beginPath();
        delta['x2'] = e.clientX - rect.left;
        delta['y2'] = e.clientY - rect.top;
        delta['color'] = color
        // ctx.moveTo(delta['x2'], delta['y2']);

        socket.emit('draw', delta);

        await sleep(1);
    }
}

socket.on('draw', in_delta => {
    data.enqueue(in_delta)
})

async function draw_queue() {
    if (data.isEmpty()) return;
    
    let in_delta = data.dequeue();
    let x1 = in_delta['x1'];
    let y1 = in_delta['y1'];
    let x2 = in_delta['x2'];
    let y2 = in_delta['y2'];
    let color = in_delta['color']
    let start = in_delta['start'];
    if (start) {
        ctx.moveTo(x2, y2);
        ctx.beginPath();
    }
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

canvas.addEventListener("mousedown", startPosition);
canvas.addEventListener("mouseup", () => {
    finishedPosition()
    if (isDraw) {
        socket.emit("finished turn")
        isDraw = false
    }
})
canvas.addEventListener("mousemove", draw);
canvas.addEventListener('mouseout', finishedPosition);
setInterval(draw_queue, 1);