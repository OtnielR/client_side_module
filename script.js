const canvas = document.getElementById("canvas")
const downloadCanvas = document.getElementById("download-image")
const map = document.getElementById("map")
const mapContainer = document.getElementById("map-container")
const pinFormContainer = document.getElementById("pin-form-container")
const pinForm = document.getElementById("pin-form")
const locationInput = document.getElementById("location-name")
const connectFormContainer = document.getElementById('connect-form-container')
const connectForm = document.getElementById('connect-form')
const distanceInput = document.getElementById("distance-name")
const modeInput = document.getElementById("mode-name")
const findRouteForm = document.getElementById("find-route-form")
const findRouteFromInput = document.getElementById("find-route-from-input")
const findRouteToInput = document.getElementById("find-route-to-input")
const findRouteContent = document.getElementById("find-route-content")
const overlayLayer = document.getElementById("overlay-layer")
const svgLayer = document.getElementById("svg-layer")
const transportasionMode = {
    train: {
        lineColor: "#33E339",
        speedKm: 120,
        costPerKm: 500,
        gap: 0
    },
    bus: {
        lineColor: "#A83BE8",
        speedKm: 80,
        costPerKm: 100,
        gap: 1
    },
    airplane: {
        lineColor: "#000000",
        speedKm: 800,
        costPerKm: 1000,
        gap: 2
    },
}

let savedPins = JSON.parse(localStorage.getItem("pins")) || []
let savedConnections = JSON.parse(localStorage.getItem("connections")) || []
let currentCords = { x: 0, y: 0}
let currentCordsPercent= { x: 0, y: 0}
let connectionSource = null
let connectionEnd = null
let zoom = 1, posX = 0, posY = 0
let isDragging = false
let isDraggingPin = false
let draggedPin = null
let routeContent = []

function sortRouteContentByFastest() {
    routeContent.sort((a, b) =>  a.totalDuration - b.totalDuration)

    renderRoute()
}

function sortRouteContentByCheapest() {
    routeContent.sort((a, b) =>  a.totalCost - b.totalCost)

    renderRoute()
}

function closeForm (e) {
    const pinActionElements = document.querySelectorAll(".pin-action")
    
    pinFormContainer.style.visibility = `hidden`
    connectFormContainer.style.visibility = `hidden`

    pinActionElements.forEach(e => {
        e.style.borderColor = "#000000"
    })

    connectionSource = null
    connectionEnd = null
}

function deletePin(name) {
    savedPins = savedPins.filter(pin => pin.name !== name)
    localStorage.setItem("pins", JSON.stringify(savedPins))

    savedConnections = savedConnections.filter(conn => conn.from.name !== name)
    savedConnections = savedConnections.filter(conn => conn.to.name !== name)
    localStorage.setItem("connections", JSON.stringify(savedConnections))

    renderAllPins()
    renderAllConnection()
}

function connectPin(name) {
    console.log("pin-conn")
    const pinActionElement = document.getElementById(`action-${name}`)
    pinActionElement.style.borderColor = "#00AAFF"

    if (connectionSource) {
        if (connectionSource.name == name ) {
            connectionSource = null
            pinActionElement.style.borderColor = "#000000"
            return
        }

        connectionEnd = savedPins.find(p => p.name == name)


        let formCoordX = (Number(connectionSource.x) + Number(connectionEnd.x)) / 2
        let formCoordY = Math.min(Number(connectionSource.y), Number(connectionEnd.y)) 

        console.log(formCoordY)

        if (formCoordY < 20) {
            formCoordY += 7.5
        } else {
            formCoordY += 3
        }

        console.log(formCoordX, formCoordY)

        connectFormContainer.style.left = `${formCoordX}%`
        connectFormContainer.style.top = `${formCoordY}%`
        connectFormContainer.style.visibility = "visible"
        connectFormContainer.style.transform = `translateX(-50%)`

    } else {
        pin = savedPins.find(p => p.name == name)

        connectionSource = pin
    }
}

function renderAllPins(){
    overlayLayer.innerHTML = ""

    savedPins.forEach(renderPin)
}

map.addEventListener("dblclick", (e) => {
    const rect = map.getBoundingClientRect()
    const pinFormContainerRect = pinFormContainer.getBoundingClientRect()

    currentCords.x = e.clientX - rect.left
    currentCords.y = e.clientY - rect.top
    currentCordsPercent.x = currentCords.x / rect.width * 100
    currentCordsPercent.y = currentCords.y / rect.height * 100

    let pinFormContainerCordsX = currentCords.x - (pinFormContainerRect.width / 2)
    let pinFormContainerCordsY = currentCords.y - (pinFormContainerRect.height)

    if (currentCords.y < 200) {
        pinFormContainerCordsY += pinFormContainerRect.height * 1.75
    } else {
        pinFormContainerCordsY -= 30
    }
    
    pinFormContainer.style.left = `${pinFormContainerCordsX}px`
    pinFormContainer.style.top = `${pinFormContainerCordsY}px`
    pinFormContainer.style.visibility = `visible`

    locationInput.value = ""
    locationInput.focus()
})

pinForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const name = locationInput.value

    if (savedPins.find(pin => pin.name == name)) {
        alert("Location Already Exist")
        return
    }

    console.log(name)

    const newPin = {
        id: Date.now(),
        x: currentCordsPercent.x,
        y: currentCordsPercent.y,
        name: name
    }

    savedPins.push(newPin)
    localStorage.setItem("pins", JSON.stringify(savedPins))

    renderPin(newPin)
    closeForm()
})

connectForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const distance = distanceInput.value
    const mode = modeInput.value

    const isConnectionExist = savedConnections.find(connection => (connection.mode == mode 
                                            && (connection.from.name == connectionSource.name || connection.to.name == connectionSource.name)
                                            && (connection.to.name == connectionEnd.name || connection.from.name == connectionEnd.name)))

    if (isConnectionExist) {
        alert("Connection mode already exist")
        return
    }

    const connection = {
        from: connectionSource,
        to: connectionEnd,
        distance: distance,
        mode: mode
    }

    const reversedConnection = {
        from: connectionEnd,
        to: connectionSource,
        distance: distance,
        mode: mode
    }

    savedConnections.push(connection)
    savedConnections.push(reversedConnection)

    localStorage.setItem('connections', JSON.stringify(savedConnections))

    renderAllConnection()
    closeForm()
})

findRouteForm.addEventListener("submit", (e) => {
    e.preventDefault()

    let allRoutes = []

    const fromValue = findRouteFromInput.value
    const toValue = findRouteToInput.value

    const startPin = savedPins.find(pin => pin.name == fromValue)
    const endPin = savedPins.find(pin => pin.name == toValue)

    if (!startPin || !endPin) {
        alert("Location not found")
        return
    }

    const queue = [{
        currentLocation: fromValue,
        path: [],
        totalCost: 0,
        totalDuration: 0,
        visited: [fromValue]
    }]

    while (queue.length > 0) {
        let {currentLocation, path, totalCost, totalDuration, visited} = queue.shift()

        if (currentLocation == toValue) {
            allRoutes.push({path: path, totalCost: totalCost, totalDuration: totalDuration})
            continue
        }

        const neighbors = savedConnections.filter(conn => conn.from.name == currentLocation)

        console.log(neighbors)
        console.log(queue)

        neighbors.forEach(conn => {
            if (!visited.includes(conn.to.name)) {
                queue.push({
                    currentLocation: conn.to.name,
                    path: [...path, conn],
                    totalCost: totalCost + (transportasionMode[conn.mode].costPerKm * Number(conn.distance)),
                    totalDuration: totalDuration + (Number(conn.distance) / transportasionMode[conn.mode].speedKm),
                    visited: [...visited, conn.to.name]
                })
            }
        })
    }

    allRoutes.sort((a, b) => a.totalDuration - b.totalDuration)
    allRoutes = allRoutes.splice(0, 10)
    
    routeContent = allRoutes

    renderRoute()

})


function renderPin(pin) {
    const rect = map.getBoundingClientRect()
    const pinElement = document.createElement('div'); 
    pinElement.className = "pin-marker";
    pinElement.id = pin.name
    pinElement.style.position = "absolute";
    pinElement.style.top = `${pin.y}%`;
    pinElement.style.left = `${pin.x}%`;
    pinElement.style.transform = `translate(-50%, -50%)`

    pinElement.addEventListener("mousedown", (e) => {
        console.log(e.target.id)
        console.log(e.target)
        if (e.target.id == "button-delete") {
            console.log("Button Click")
            deletePin(pin.name)
            return
        } else if (e.target.id == "button-connect") {
            connectPin(pin.name)
            return
        }

        console.log("Pin Dragging")
        isDraggingPin = true
        draggedPin = pinElement
    }) 

    pinElement.addEventListener("mouseup", () => {
        isDraggingPin = false
        const xPercent = pinElement.style.left.split("%")[0]
        const yPercent = pinElement.style.top.split("%")[0]

        pinElement.style.top = `${yPercent}%`;
        pinElement.style.left = `${xPercent}%`;

        let pinsSaved = savedPins.map(pin => {
            if (pin.name === pinElement.id) {
                pin.x = xPercent
                pin.y = yPercent
            }

            return pin
        })
        
        localStorage.setItem("pins", JSON.stringify(pinsSaved))

        let connectionsSaved = savedConnections.map(conn => {
            if (conn.from.name == pinElement.id) {
               conn.from.x = xPercent
                conn.from.y = yPercent
            }

            if (conn.to.name == pinElement.id) {
               conn.to.x = xPercent
                conn.to.y = yPercent
            }
            return conn
        })
        
        localStorage.setItem("connections", JSON.stringify(connectionsSaved))

        renderAllPins()
        renderAllConnection()
    })

    pinElement.innerHTML = `
        <div class="pin-icon" id="${pin.name}">
            <div class="pin-action" id="action-${pin.name}">
                <p>${pin.name}</p>
                <button onclick="connectPin('${pin.name}')">
                    <img src="./assets/connection.svg" alt="pin-icon" id="button-connect">
                </button>
                <button onclick="deletePin('${pin.name}')" >
                    <img src="./assets/trash.svg" alt="pin-icon" id="button-delete">
                </button>
            </div>
            <img src="./assets/pin.svg" alt="pin-icon" >
        </div>
    `

    overlayLayer.appendChild(pinElement)
}

function renderAllConnection() {
    svgLayer.innerHTML = ""

    savedConnections.forEach(conn => {
        const p1 = conn.from
        const p2 = conn.to

        if (p1 && p2) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", 'line')
            line.setAttribute("x1", `${p1.x }%`)
            line.setAttribute("y1", `${p1.y + transportasionMode[conn.mode].gap}%`)
            line.setAttribute("x2", `${p2.x }%`)
            line.setAttribute("y2", `${p2.y + transportasionMode[conn.mode].gap}%`)
            line.setAttribute("stroke", transportasionMode[conn.mode].lineColor)
            line.setAttribute("stroke-width", "2")
            svgLayer.appendChild(line)

            const midX = ((Number(p1.x) + Number(p2.x)) / 2) - transportasionMode[conn.mode].gap * 2;
            const midY = (Number(p1.y) + Number(p2.y)) / 2 - 3;

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
            text.setAttribute("x", `${midX}%`)
            text.setAttribute("y", `${midY}%`)
            text.setAttribute("fill", transportasionMode[conn.mode].lineColor)
            text.style.fontSize = "14px"
            text.textContent = `${conn.distance}`
            svgLayer.appendChild(text)
        }
    })

}

window.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
        e.preventDefault()

        console.log(e.deltaY)

        let delta = e.deltaY > 0 ? .9 : 1.1
        zoom *= delta

        if (zoom < 1) {
            zoom = 1
        }

        syncTransform()
    }
}, {passive: false})

window.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault(); 
        
        if (e.key === '-' ) zoom *= 0.9;
        else zoom *= 1.1;

        if (zoom < 1) {
            zoom = 1
        }
        
        syncTransform();
    }
});

function syncTransform() {
    mapContainer.style.setProperty("--zoom", zoom)
    mapContainer.style.setProperty("--x", `${posX}px`)
    mapContainer.style.setProperty("--y", `${posY}px`)
}

window.addEventListener("mousedown", (e) => {isDragging = true})
window.addEventListener("mouseup", (e) => { isDragging = false})
window.addEventListener("mousemove", (e) => {
    const rect = map.getBoundingClientRect()
    console.log("Mouse Move", isDragging)

    if (!isDragging) return

    if (isDraggingPin) {
        console.log(draggedPin)

        const cursorPercentX = (e.clientX - rect.left) / rect.width * 100
        const cursorPercentY = (e.clientY - rect.top) / rect.height * 100

        draggedPin.style.left = `${cursorPercentX}%`
        draggedPin.style.top = `${cursorPercentY}%`

        console.log("Mouse move pin")
        return
    }

    console.log("Mouse Dragging")

    posX += e.movementX
    posY += e.movementY

    syncTransform()
})

function renderRoute() {
    findRouteContent.innerHTML = ""
    routeContent.forEach((route) => {
        console.log(route)
    const routeElement = document.createElement("div")
    routeElement.classList.add("route-content")
    

    const titleContainerElement = document.createElement("div")
    titleContainerElement.classList.add("title-container")

    const titleElement = document.createElement("h3")
    titleElement.innerHTML = `${findRouteFromInput.value} - ${findRouteToInput.value}`

    const pathElement = document.createElement("div")
    pathElement.classList.add("path-container")

    route.path.forEach((path, i) => {
        const textElement = document.createElement("p")
        textElement.innerHTML = `${i+1}. ${path.from.name} - ${path.to.name} (${path.mode})`

        pathElement.appendChild(textElement)
    })

    const durationElement = document.createElement("p")
    durationElement.innerHTML = `${Math.round(route.totalDuration)} h`

    const costElement = document.createElement("h3")
    costElement.innerHTML = `Rp. ${route.totalCost}`

    titleContainerElement.appendChild(titleElement)
    titleContainerElement.appendChild(durationElement)

    routeElement.appendChild(titleContainerElement)
    routeElement.appendChild(pathElement)
    routeElement.appendChild(costElement)

    findRouteContent.appendChild(routeElement)


    })

}

function downloadResult() {
    const ctx = canvas.getContext("2d");
    const mapImg = document.getElementById("map");

    const naturalW = mapImg.naturalWidth;
    const naturalH = mapImg.naturalHeight;
    canvas.width = naturalW;
    canvas.height = naturalH;

    ctx.drawImage(mapImg, 0, 0, naturalW, naturalH);

    const lines = document.querySelectorAll("#svg-layer line");
    lines.forEach(line => {
        const x1 = parseFloat(line.getAttribute("x1")) / 100;
        const y1 = parseFloat(line.getAttribute("y1")) / 100;
        const x2 = parseFloat(line.getAttribute("x2")) / 100;
        const y2 = parseFloat(line.getAttribute("y2")) / 100;
        const color = line.getAttribute("stroke") || "black";

        ctx.beginPath();
        ctx.moveTo(x1 * naturalW, y1 * naturalH);
        ctx.lineTo(x2 * naturalW, y2 * naturalH);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
    });

    savedPins.forEach(pin => {
        const canvasX = pin.x / 100 * naturalW;
        const canvasY = pin.y / 100 * naturalH;


        console.log(canvasX, canvasY)

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 10, 0, Math.PI * 2); 
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();

        const label = pin.name || "";
        if (label) {
            ctx.fillStyle = "black";
            ctx.font = "bold 20px Arial";
            ctx.fillText(label, canvasX + 15, canvasY + 5);
        }
    });

    const link = document.createElement("a");
    link.download = "result.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}



renderAllPins()
renderAllConnection()

