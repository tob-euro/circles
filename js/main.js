////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ENGINE.JS

// Import Matter.js modules
const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Mouse, World, Events, Body, Vector, Bounds } = Matter;

// Initialize Matter.js engine and renderer
const engine = Engine.create();
const world = engine.world;
engine.gravity.y = false;

const canvas = document.getElementById('matterCanvas');
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: 2000,
        height: 2000,
        hasBounds: true,
        wireframes: false,
        background: false,
        pixelRatio: window.devicePixelRatio,
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SHAPES.JS
// Function to create a circular texture from an image
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

// List to maintain all circles
const allCircles = [];

// Function to add a circle with texture, text, and other properties
function addCircle(x, y, radius, textureUrl, text, supText, infoContent, tags) {
    fitSprite(textureUrl, radius * 2, function (circularTexture) {
        const circle = Bodies.circle(x, y, radius, {
            restitution: 0.5, // bounciness
            inertia: Infinity, // Prevent rotation
            frictionAir: 0.05, // Air friction
            render: {
                sprite: {
                    texture: circularTexture,
                    xScale: 1 / scaleFactor,
                    yScale: 1 / scaleFactor
                }
            }
        });
        // Attach properties to the circle
        circle.infoContent = infoContent; // Attach info content to the circle
        circle.tags = tags; // Attach tags to the circle
        circle.text = text; // Store the text for the circle
        circle.supText = supText; // Store the superscript text for the circle

        // Store original size and scales
        circle.originalRadius = radius;
        circle.originalXScale = circle.render.sprite.xScale;
        circle.originalYScale = circle.render.sprite.yScale;

        Composite.add(world, circle);

        createCircleDOMElement(circle);
        allCircles.push(circle); // Add circle to the list of all circles
    });
}

// Helper function to create and link a text element to a circle
function createCircleDOMElement(circle) {
    const overlayContainer = document.getElementById('overlay-container'); // Get the overlay container element
    
    // Create the text container div and add class
    const textContainer = document.createElement('div');
    textContainer.className = 'overlay-text';
    
    // Create the span for main text and the sup for superscript, then append
    const textElement = document.createElement('span');
    textElement.textContent = circle.text;
    
    const supElement = document.createElement('sup');
    supElement.className = 'superscript';
    supElement.textContent = circle.supText;
    
    textElement.appendChild(supElement);
    textContainer.appendChild(textElement);
    
    overlayContainer.appendChild(textContainer); // Append the text container to the overlay container

    circle.textElement = textContainer; // Store reference in the circle object for later use

    // Initial positioning of the text container
    updateTextPosition(circle);
}

// Function to update the position of the circle's text element
function updateTextPosition(circle) {
    if (circle.textElement) {
        // Calculate position relative to the viewport
        const renderBounds = render.bounds;
        const viewWidth = render.canvas.width;
        const viewHeight = render.canvas.height;
        
        const circleX = (circle.position.x - renderBounds.min.x) * viewWidth / (renderBounds.max.x - renderBounds.min.x);
        const circleY = (circle.position.y - renderBounds.min.y) * viewHeight / (renderBounds.max.y - renderBounds.min.y);
        
        // Position the text container to be centered within the circle
        circle.textElement.style.left = `${circleX}px`;
        circle.textElement.style.top = `${circleY}px`;
        circle.textElement.style.transform = `translate(-50%, -50%)`;
    }
}

// Update the text positions based on the circle positions
Events.on(engine, 'afterUpdate', function() {
    Composite.allBodies(world).forEach(function(body) {
        if (body.textElement) {
            updateTextPosition(body);
        }
    });
});



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MOUSE.JS

// Add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.00075,
        render: {
            visible: false
        }
    }
});
World.add(world, mouseConstraint);

// Prevent zooming on scroll but allow panning
mouse.element.addEventListener('wheel', (event) => {
    event.preventDefault();
    
    const scrollSpeed = 1; // Adjust scroll speed if needed
    const { deltaX, deltaY } = event;
    
    // Pan the view by adjusting the render bounds
    render.bounds.min.x += deltaX * scrollSpeed;
    render.bounds.max.x += deltaX * scrollSpeed;
    render.bounds.min.y += deltaY * scrollSpeed;
    render.bounds.max.y += deltaY * scrollSpeed;
    
    // Update render translations
    Render.lookAt(render, {
        min: { x: render.bounds.min.x, y: render.bounds.min.y },
        max: { x: render.bounds.max.x, y: render.bounds.max.y }
    });
}, { passive: false });

// Click and drag detection
let dragging = false;
let clickedCircle = null;

Events.on(mouseConstraint, 'startdrag', function(event) {
    dragging = true;
    clickedCircle = null;
});

Events.on(mouseConstraint, 'enddrag', function(event) {
    dragging = false;
});

canvas.addEventListener('mouseup', function(event) {
    if (!dragging) {
        const mousePosition = mouse.position;
        const clickedBodies = Composite.allBodies(world).filter(function(body) {
            return Matter.Bounds.contains(body.bounds, mousePosition);
        });

        if (clickedBodies.length > 0) {
            const clickedBody = clickedBodies[0];
            toggleInfoMenu(clickedBody);
        }
    }
    dragging = false;
});



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UI.JS

// Function to toggle circle info
function toggleInfoMenu(clickedBody) {
    const infoMenu = document.getElementById('info-menu');
    const infoContent = document.getElementById('info-content');

    Body.setStatic(clickedBody, true);
    clickedCircle = clickedBody;

    infoContent.innerHTML = clickedBody.infoContent;
    infoMenu.classList.add('show');

    clickedBody.textElement.classList.add('hidden');

    const newElement = document.createElement('div');
    newElement.id = 'clicked-circle-element';
    newElement.className = 'clicked-circle';
    newElement.style.backgroundImage = `url(${clickedBody.render.sprite.texture})`;

    const contentElement = document.createElement('div');
    contentElement.className = 'clicked-circle-content';
    contentElement.innerHTML = clickedBody.infoContent;
    newElement.appendChild(contentElement);

    document.body.appendChild(newElement);

    previousActiveTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));// Save current active tags

    activateTags(clickedBody.tags);// Activate relevant tags in the filters menu
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

    // Restore previous active tags
    restorePreviousActiveTags();
});
document.getElementById('info-menu').appendChild(closeButton);

function restorePreviousActiveTags() {
    const tagElements = document.querySelectorAll('.filters .tag');
    tagElements.forEach(tagElement => {
        const tagValue = tagElement.getAttribute('data-tag');
        if (previousActiveTags.includes(tagValue)) {
            tagElement.classList.add('active');
        } else {
            tagElement.classList.remove('active');
        }
    });

    // Apply filters based on the restored tags
    applyFilters();
}

// Add circles with textures and text
addCircle(0, 150, 150, '../content/images/pic1.jpg', 'Caroline Polachek', 'US', '<h1>Perfume Genius</h1><p>Artist Info Here...</p>', ['Live Concert', 'Vessel Stage']);
addCircle(150, 300, 150, '../content/images/pic2.jpg', 'FKA Twigs', 'UK', '<h1>Kate NV</h1><p>Artist Info Here...</p>', ['Live Concert', 'Beach Stage']);
addCircle(300, 100, 150, '../content/images/pic3.jpg', 'Weyes Blood', 'US', '<h1>Weyes Blood</h1><p>Artist Info Here...</p>', ['Art Exhibition', 'Astral Stage']);
addCircle(350, 200, 150, '../content/images/pic4.jpg', 'Kate NV', 'RU', '<h1>A.G. Cook</h1><p>Artist Info Here...</p>', ['DJ', 'Space Stage']);
addCircle(450, 250, 150, '../content/images/pic5.jpg', 'Perfume Genius', 'US', '<h1>Caroline Polachek</h1><p>Artist Info Here...</p>', ['Workshop', 'Amphi Stage']);


// Create walls
Composite.add(world, [
    Bodies.rectangle(1000, -25, 2000, 50, { isStatic: true, render: { visible: false } }),
    Bodies.rectangle(1000, 2025, 2000, 50, { isStatic: true, render: { visible: false } }),
    Bodies.rectangle(-25, 1000, 50, 2000, { isStatic: true, render: { visible: false } }),
    Bodies.rectangle(2025, 1000, 50, 2000, { isStatic: true, render: { visible: false } })
]);


// Run the engine and renderer
Runner.run(engine);
Render.run(render);
