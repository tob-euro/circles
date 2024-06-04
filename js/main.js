const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Mouse, World, Events, Vector, Common, Body, Composites, Bounds } = Matter;

const allCircles = []; // Declare globally


// Create engine
const engine = Engine.create();
const world = engine.world;
engine.gravity.y = false;

const canvas = document.getElementById('matterCanvas');

// Function to handle DPI scaling
function setCanvasDPI(canvas) {
    const context = canvas.getContext('2d');
    const devicePixelRatio = window.devicePixelRatio || 1;
    const backingStoreRatio = context.webkitBackingStorePixelRatio ||
                              context.mozBackingStorePixelRatio ||
                              context.msBackingStorePixelRatio ||
                              context.oBackingStorePixelRatio ||
                              context.backingStorePixelRatio || 1;
    const ratio = devicePixelRatio / backingStoreRatio;

    if (devicePixelRatio !== backingStoreRatio) {
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = `${oldWidth}px`;
        canvas.style.height = `${oldHeight}px`;

        context.scale(ratio, ratio);
    }
}
setCanvasDPI(canvas);

const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: "transparent",
        wireframes: false,
        showAngleIndicator: false,
        pixelRatio: window.devicePixelRatio // This ensures the correct pixel ratio
    }
});

Render.run(render);

// Add mouse drag control
var mouse = Mouse.create(render.canvas),
    mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.00075,
            render: {
                visible: false
            }
        }
    });
Composite.add(world, mouseConstraint);


const scaleFactor = 4;

function fitSprite(imageUrl, diameter, callback) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const img = new Image();
    canvas.width = canvas.height = diameter * scaleFactor;

    img.onload = () => {
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const scaledWidth = img.naturalWidth * scale;
        const scaledHeight = img.naturalHeight * scale;
        const xOffset = (canvas.width - scaledWidth) / 2;
        const yOffset = (canvas.height - scaledHeight) / 2;

        context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
        context.clip();
        context.drawImage(img, xOffset, yOffset, scaledWidth, scaledHeight);

        callback(canvas.toDataURL());
    };
    img.src = imageUrl;
}



function addCircle(x, y, radius, textureUrl, text, supText, infoContent, tags) {
    fitSprite(textureUrl, radius * 2, function (circularTexture) {
        const circle = Bodies.circle(x, y, radius, {
            restitution: 0.5,
            inertia: Infinity,  // Prevent rotation
            frictionAir: 0.05,
            render: {
                sprite: {
                    texture: circularTexture,
                    xScale: 1 / scaleFactor,
                    yScale: 1 / scaleFactor
                }
            }
        });
        circle.infoContent = infoContent;
        circle.tags = tags;
        circle.text = text;
        circle.supText = supText;
        circle.originalRadius = radius;
        circle.originalXScale = circle.render.sprite.xScale;
        circle.originalYScale = circle.render.sprite.yScale;

        Composite.add(world, circle);
        createCircleDOMElement(circle);
        allCircles.push(circle); // Add to global array

        // Animate the circle appearance
        animateBodyAppearance(circle);
    });
}


// Function to create a text element and associate it with a circle
function createCircleDOMElement(circle) {
    const overlayContainer = document.getElementById('overlay-container');
    
    const textContainer = document.createElement('div');
    textContainer.className = 'overlay-text';
    
    const textElement = document.createElement('span');
    textElement.textContent = circle.text;
    
    const supElement = document.createElement('sup');
    supElement.className = 'superscript';
    supElement.textContent = circle.supText;
    
    textElement.appendChild(supElement);
    textContainer.appendChild(textElement);
    
    overlayContainer.appendChild(textContainer);

    circle.textElement = textContainer;

    updateTextPosition(circle);
}

// Function to update the position of the text element based on the circle's position
function updateTextPosition(circle) {
    if (circle.textElement) {
        const { x, y } = circle.position;

        // Calculate the position without scaling the text
        const scaledX = (x - render.bounds.min.x) / boundsScale.x;
        const scaledY = (y - render.bounds.min.y) / boundsScale.y;

        // Update the position of the text element without scaling
        circle.textElement.style.left = `${scaledX}px`;
        circle.textElement.style.top = `${scaledY}px`;
        circle.textElement.style.transform = 'translate(-50%, -50%)'; // Center the text without scaling
    }
}

// Update text positions during each render
Events.on(engine, 'afterUpdate', function() {
    allCircles.forEach(circle => {
        updateTextPosition(circle);
    });
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UI.JS

let clickedCircle = null;
let previousActiveTags = [];
let isDragging = false;
let startPos = { x: 0, y: 0 };
const dragThreshold = 5; // Adjust the threshold for what constitutes a drag

// Function to find the circle at the given position
function getCircleAtPosition(position) {
    return allCircles.find(circle => Matter.Vertices.contains(circle.vertices, position));
}

// Constants for zoom target
const ZOOM_TARGET_SCALE = 4; // The scale you want the circle to fill
const ZOOM_DURATION = 1000; // Duration of the zoom in milliseconds
const TARGET_POSITION = { x: window.innerWidth / 7, y: window.innerHeight / 1.5 }; // Target position to center the circle

let isZooming = false; // Flag to disable zooming and panning during info display

// Function to smoothly zoom and pan to a target circle and display info
function zoomToCircle(targetCircle) {
    isZooming = true; // Disable further zooming and panning

    const startBounds = { ...render.bounds };
    const endBounds = calculateTargetBounds(targetCircle);

    const startTime = performance.now();

    function animateZoom(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / ZOOM_DURATION, 1);

        const interpolatedBounds = interpolateBounds(startBounds, endBounds, progress);

        render.bounds.min.x = interpolatedBounds.min.x;
        render.bounds.min.y = interpolatedBounds.min.y;
        render.bounds.max.x = interpolatedBounds.max.x;
        render.bounds.max.y = interpolatedBounds.max.y;

        Render.lookAt(render, {
            min: { x: render.bounds.min.x, y: render.bounds.min.y },
            max: { x: render.bounds.max.x, y: render.bounds.max.y }
        });

        if (progress < 1) {
            requestAnimationFrame(animateZoom);
        } else {
            // After zooming is complete, show the info menu
            showInfoMenu(targetCircle);
        }
    }

    requestAnimationFrame(animateZoom);
}

// Function to calculate target bounds to center and zoom into the circle
function calculateTargetBounds(targetCircle) {
    const circlePosition = targetCircle.position;
    const circleRadius = targetCircle.circleRadius * ZOOM_TARGET_SCALE;

    const min = {
        x: circlePosition.x - TARGET_POSITION.x / ZOOM_TARGET_SCALE,
        y: circlePosition.y - TARGET_POSITION.y / ZOOM_TARGET_SCALE
    };
    const max = {
        x: min.x + window.innerWidth / ZOOM_TARGET_SCALE,
        y: min.y + window.innerHeight / ZOOM_TARGET_SCALE
    };

    return { min, max };
}

// Function to interpolate between start and end bounds
function interpolateBounds(start, end, t) {
    return {
        min: {
            x: start.min.x + (end.min.x - start.min.x) * t,
            y: start.min.y + (end.min.y - start.min.y) * t
        },
        max: {
            x: start.max.x + (end.max.x - start.max.x) * t,
            y: start.max.y + (end.max.y - start.max.y) * t
        }
    };
}

// Modify the existing mouseup event to call zoomToCircle
Matter.Events.on(mouseConstraint, 'mouseup', function(event) {
    const mousePosition = event.mouse.position;
    const circle = getCircleAtPosition(mousePosition);
    if (circle && circle.mouseDown) {
        circle.mouseDown = false;
        if (!isDragging) {
            console.log('Circle clicked:', circle);
            zoomToCircle(circle); // Call zoomToCircle instead of toggleInfoMenu
        }
    }
});


// Attach the mouse events for click and drag detection
Matter.Events.on(mouseConstraint, 'mousedown', function(event) {
    const mousePosition = event.mouse.position;
    const circle = getCircleAtPosition(mousePosition);
    if (circle) {
        startPos = { x: mousePosition.x, y: mousePosition.y };
        isDragging = false;
        circle.mouseDown = true;
        console.log('Mouse down on circle:', circle);
    }
});

Matter.Events.on(mouseConstraint, 'mousemove', function(event) {
    const mousePosition = event.mouse.position;
    allCircles.forEach(circle => {
        if (circle.mouseDown) {
            const dx = mousePosition.x - startPos.x;
            const dy = mousePosition.y - startPos.y;
            if (Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
                isDragging = true;
                console.log('Dragging circle:', circle);
            }
        }
    });
});

Matter.Events.on(mouseConstraint, 'mouseup', function(event) {
    const mousePosition = event.mouse.position;
    const circle = getCircleAtPosition(mousePosition);
    if (circle && circle.mouseDown) {
        circle.mouseDown = false;
        if (!isDragging) {
            console.log('Circle clicked:', circle);
            toggleInfoMenu(circle);
        }
    }
});
// Function to show the info menu
function showInfoMenu(clickedCircle) {
    const infoMenu = document.getElementById('info-menu');
    const infoContent = document.getElementById('info-content');

    // Set the clicked circle as static
    Matter.Body.setStatic(clickedCircle, true);
    clickedCircle.textElement.classList.add('hidden'); // Hide the circle's text element

    // Update the info menu content
    infoContent.innerHTML = clickedCircle.infoContent;
    infoMenu.classList.add('show');

    // Create a new element to show the clicked circle image and content
    const newElement = document.createElement('div');
    newElement.id = 'clicked-circle-element';
    newElement.className = 'clicked-circle';
    newElement.style.backgroundImage = `url(${clickedCircle.render.sprite.texture})`;

    const contentElement = document.createElement('div');
    contentElement.className = 'clicked-circle-content';
    contentElement.innerHTML = clickedCircle.infoContent;
    newElement.appendChild(contentElement);

    document.body.appendChild(newElement);

    // Save current active tags
    previousActiveTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));

    // Activate relevant tags in the filters menu
    activateTags(clickedCircle.tags);

    // Add close button functionality
    document.getElementById('close-info-menu').addEventListener('click', closeInfoMenu);
}

// Function to activate tags in the filters menu
function activateTags(tags) {
    const tagElements = document.querySelectorAll('.filters .tag');
    tagElements.forEach(tagElement => {
        const tagCategory = tagElement.getAttribute('data-category');
        const tagValue = tagElement.getAttribute('data-tag');

        // If the tag value is in the clicked circle's tags, activate it
        if (tags.includes(tagValue)) {
            // Deactivate all tags in the same category first
            const categoryTags = document.querySelectorAll(`.filters .tag[data-category="${tagCategory}"]`);
            categoryTags.forEach(categoryTag => {
                categoryTag.classList.remove('active');
            });

            // Activate the relevant tag
            tagElement.classList.add('active');
        }
    });

    // Apply filters based on the newly activated tags
    applyFilters();
}

// Close button functionality
const closeButton = document.createElement('button');
closeButton.className = 'close-btn';

closeButton.addEventListener('click', () => {
    const infoMenu = document.getElementById('info-menu');
    if (clickedCircle) {
        Body.setStatic(clickedCircle, false);
        clickedCircle.textElement.classList.remove('hidden');
        clickedCircle.textElement.classList.remove('active');
        clickedCircle = null;

        const existingElement = document.getElementById('clicked-circle-element');
        if (existingElement) {
            existingElement.remove();
        }
    }
    infoMenu.classList.remove('show');
    isZooming = false

    // Restore previous active tags
    restorePreviousActiveTags();
});
document.getElementById('info-menu').appendChild(closeButton);

// Function to restore previous active tags
function restorePreviousActiveTags() {
    const allTags = document.querySelectorAll('.tag');
    allTags.forEach(tag => {
        tag.classList.remove('active');
        if (previousActiveTags.includes(tag.getAttribute('data-tag'))) {
            tag.classList.add('active');
        }
    });
    applyFilters();
}

addCircle(0, 550, 50, '../content/images/pic1.jpg', 'Caroline Polachek', 'US', '<h1>Perfume Genius</h1><p>Artist Info Here...</p>', ['Live Concert', 'Vessel Stage']);
addCircle(150, 500, 50, '../content/images/pic2.jpg', 'FKA Twigs', 'UK', '<h1>Kate NV</h1><p>Artist Info Here...</p>', ['Live Concert', 'Beach Stage']);
addCircle(300, 700, 50, '../content/images/pic3.jpg', 'Weyes Blood', 'US', '<h1>Weyes Blood</h1><p>Artist Info Here...</p>', ['Art Exhibition', 'Astral Stage']);
addCircle(350, 400, 50, '../content/images/pic4.jpg', 'Kate NV', 'RU', '<h1>A.G. Cook</h1><p>Artist Info Here...</p>', ['DJ', 'Space Stage']);
addCircle(450, 450, 50, '../content/images/pic5.jpg', 'Perfume Genius', 'US', '<h1>Caroline Polachek</h1><p>Artist Info Here...</p>', ['Workshop', 'Amphi Stage']);


let walls = [];

// Function to create walls
function createWalls() {
    // Remove existing walls
    Composite.remove(world, walls);
    
    // Create new walls
    const width = window.innerWidth;
    const height = window.innerHeight;

    walls = [
        Bodies.rectangle(width / 2, -25, width, 50, { isStatic: true }), // top
        Bodies.rectangle(width / 2, height + 25, width, 50, { isStatic: true }), // bottom
        Bodies.rectangle(-25, height / 2, 50, height, { isStatic: true }), // left
        Bodies.rectangle(width + 25, height / 2, 50, height, { isStatic: true }) // right
    ];

    // Add new walls to the world
    Composite.add(world, walls);
}

// Initial walls creation
createWalls();

// Handle window resize
window.addEventListener('resize', () => {
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;

    setCanvasDPI(canvas); // Reapply DPI scaling
    createWalls(); // Recreate walls with new dimensions

    // Update render bounds to match new dimensions
    render.bounds.min.x = 0;
    render.bounds.min.y = 0;
    render.bounds.max.x = window.innerWidth;
    render.bounds.max.y = window.innerHeight;

    // Center the view
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: window.innerWidth, y: window.innerHeight }
    });
});
// Get the center of the viewport
const viewportCentre = {
    x: render.options.width * 0.5,
    y: render.options.height * 0.5
};

// Set render bounds
render.bounds.min.x = 0;
render.bounds.min.y = 0;
render.bounds.max.x = window.innerWidth;
render.bounds.max.y = window.innerHeight;


// Keep track of current bounds scale (view zoom)
let boundsScaleTarget = 0.5;
let boundsScale = {
    x: 1,
    y: 1
};

// Center the view at the start
Render.lookAt(render, {
    min: { x: 0, y: 0 },
    max: { x: window.innerWidth, y: window.innerHeight }
});


// Set render bounds
render.bounds.min.x = 0;
render.bounds.min.y = 0;
render.bounds.max.x = window.innerWidth;
render.bounds.max.y = window.innerHeight;

    // Disable zooming and panning during info display
Events.on(render, 'beforeRender', function() {
    if (isZooming) return; // Disable zooming and panning when info menu is displayed

    var mouse = mouseConstraint.mouse,
        translate;

    // Mouse wheel controls zoom
    var scaleFactor = (mouse.wheelDelta * -0.035) || 0;
    if (scaleFactor !== 0) {
        if ((scaleFactor < 0 && boundsScale.x >= 0.6) || (scaleFactor > 0 && boundsScale.x <= 1.4)) {
            boundsScaleTarget += scaleFactor;
            // Cap the boundsScaleTarget to a maximum of 1
            boundsScaleTarget = Math.min(boundsScaleTarget, 1);
        }
    }

    // If scale has changed
    if (Math.abs(boundsScale.x - boundsScaleTarget) > 0.01) {
        // Smoothly tween scale factor
        scaleFactor = (boundsScaleTarget - boundsScale.x) * 0.2;
        boundsScale.x += scaleFactor;
        boundsScale.y += scaleFactor;

        // Scale the render bounds
        render.bounds.max.x = render.bounds.min.x + render.options.width * boundsScale.x;
        render.bounds.max.y = render.bounds.min.y + render.options.height * boundsScale.y;

        // Translate so zoom is from center of view
        translate = {
            x: render.options.width * scaleFactor * -0.5,
            y: render.options.height * scaleFactor * -0.5
        };

        Bounds.translate(render.bounds, translate);

        // Update mouse
        Mouse.setScale(mouse, boundsScale);
        Mouse.setOffset(mouse, render.bounds.min);
    }

    // Get vector from mouse relative to center of viewport
    var deltaCentre = Vector.sub(mouse.absolute, viewportCentre),
        centreDist = Vector.magnitude(deltaCentre);

    // Translate the view if mouse has moved over 50px from the center of viewport
    if (centreDist > 100) {
        // Create a vector to translate the view, allowing the user to control view speed
        var direction = Vector.normalise(deltaCentre),
            speed = Math.min(10, Math.pow(centreDist - 50, 2) * 0.0002);

        translate = Vector.mult(direction, speed);

        // Prevent the view from zooming out of bounds
        if (render.bounds.min.x + translate.x < 0) translate.x = 0 - render.bounds.min.x;
        if (render.bounds.min.y + translate.y < 0) translate.y = 0 - render.bounds.min.y;
        if (render.bounds.max.x + translate.x > window.innerWidth) translate.x = window.innerWidth - render.bounds.max.x;
        if (render.bounds.max.y + translate.y > window.innerHeight) translate.y = window.innerHeight - render.bounds.max.y;

        // Move the view
        Bounds.translate(render.bounds, translate);

        // We must update the mouse too
        Mouse.setOffset(mouse, render.bounds.min);
    }
});

// Run the engine and renderer
Runner.run(engine);
Render.run(render);