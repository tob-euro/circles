////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ENGINE.JS

// Import Matter.js modules
const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Mouse, World, Events, Vector, Bounds } = Matter;

// Initialize Matter.js engine and renderer
const engine = Engine.create();
const world = engine.world;
engine.gravity.y = false;

const canvas = document.getElementById('frame');
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: 1505,
        height: 618,
        hasBounds: true,
        wireframes: false,
        background: false,
        pixelRatio: window.devicePixelRatio, // Adjust pixel ratio for better rendering quality
    }
});
Render.run(render);

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
    // Add a border for visual debugging
    // circle.textElement.style.border = '2px solid red';
    
    // Add a click event listener to the text container
    textContainer.addEventListener('click', function() {
        toggleInfoMenu(circle);
    });
    updateTextPosition(circle); // Initial positioning of the text container
}

// Function to update the position of the circle's text element
function updateTextPosition(circle) {
    if (circle.textElement) {
        // Set the size of the box
        const boxWidth = 250; // Adjust the width of the box as needed
        const boxHeight = 40; // Adjust the height of the box as needed
        
        // Update text element position relative to viewport
        const canvasBounds = render.bounds;
        const scaleX = render.options.width / (canvasBounds.max.x - canvasBounds.min.x);
        const scaleY = render.options.height / (canvasBounds.max.y - canvasBounds.min.y);

        const viewportX = (circle.position.x - canvasBounds.min.x) * scaleX;
        const viewportY = (circle.position.y - canvasBounds.min.y) * scaleY;

        circle.textElement.style.width = `${boxWidth}px`;
        circle.textElement.style.height = `${boxHeight}px`;
        circle.textElement.style.left = `${viewportX}px`;
        circle.textElement.style.top = `${viewportY}px`;
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

    previousActiveTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag')); // Save current active tags

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

// // Allow scroll through the canvas
// mouseConstraint.mouse.element.removeEventListener(
//     "mousewheel",
//     mouseConstraint.mouse.mousewheel
// );
// mouseConstraint.mouse.element.removeEventListener(
//     "DOMMouseScroll",
//     mouseConstraint.mouse.mousewheel
// );

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


const boundaryThickness = 50;
const canvasWidth = window.innerWidth;
const canvasHeight = window.innerHeight;
Composite.add(world, [
    Bodies.rectangle(canvasWidth / 2, -boundaryThickness / 2, canvasWidth, boundaryThickness, { isStatic: true, render: { visible: false } }), // Top boundary
    Bodies.rectangle(canvasWidth / 2, canvasHeight + boundaryThickness / 2, canvasWidth, boundaryThickness, { isStatic: true, render: { visible: false } }), // Bottom boundary
    Bodies.rectangle(-boundaryThickness / 2, canvasHeight / 2, boundaryThickness, canvasHeight, { isStatic: true, render: { visible: false } }), // Left boundary
    Bodies.rectangle(canvasWidth + boundaryThickness / 2, canvasHeight / 2, boundaryThickness, canvasHeight, { isStatic: true, render: { visible: false } }) // Right boundary
]);


// Add circles with textures and text
addCircle(0, 150, 150, 'content/images/pic1.jpg', 'Caroline Polachek', 'US', '<h1>Perfume Genius</h1><p>Artist Info Here...</p>', ['Live Concert', 'Vessel Stage']);
addCircle(150, 300, 150, 'content/images/pic2.jpg', 'FKA Twigs', 'UK', '<h1>Kate NV</h1><p>Artist Info Here...</p>', ['Live Concert', 'Beach Stage']);
addCircle(300, 100, 150, 'content/images/pic3.jpg', 'Weyes Blood', 'US', '<h1>Weyes Blood</h1><p>Artist Info Here...</p>', ['Art Exhibition', 'Astral Stage']);
addCircle(350, 200, 150, 'content/images/pic4.jpg', 'Kate NV', 'RU', '<h1>A.G. Cook</h1><p>Artist Info Here...</p>', ['DJ', 'Space Stage']);
addCircle(450, 250, 150, 'content/images/pic5.jpg', 'Perfume Genius', 'US', '<h1>Caroline Polachek</h1><p>Artist Info Here...</p>', ['Workshop', 'Amphi Stage']);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// VIEWPORT.JS
// Get the visible area dimensions

// Get the centre of the viewport
var viewportCentre = {
    x: render.options.width * 0.5,
    y: render.options.height * 0.5
};

// Create limits for the viewport
const extents = {
    min: { x: 0, y: 0 },
    max: { x: canvasWidth, y: canvasHeight }
};

// Keep track of current bounds scale (view zoom)
const boundsScaleTarget = 1;
const boundsScale = {
    x: 1,
    y: 1
};
// Use a render event to control our view
Events.on(render, 'beforeRender', function() {
    const world = engine.world;
    const mouse = mouseConstraint.mouse;
    let translate;

    // Mouse wheel controls zoom
    const scaleFactor = mouse.wheelDelta * -0.1;
    if (scaleFactor !== 0) {
        if ((scaleFactor < 0 && boundsScale.x >= 0.6) || (scaleFactor > 0 && boundsScale.x <= 1.4)) {
            boundsScaleTarget += scaleFactor;
        }
    }

    // If scale has changed
    if (Math.abs(boundsScale.x - boundsScaleTarget) > 0.01) {
        // Smoothly tween scale factor
        const scaleFactor = (boundsScaleTarget - boundsScale.x) * 0.2;
        boundsScale.x += scaleFactor;
        boundsScale.y += scaleFactor;

        // Scale the render bounds
        render.bounds.max.x = render.bounds.min.x + render.options.width * boundsScale.x;
        render.bounds.max.y = render.bounds.min.y + render.options.height * boundsScale.y;

        // Translate so zoom is from centre of view
        translate = {
            x: render.options.width * scaleFactor * -0.5,
            y: render.options.height * scaleFactor * -0.5
        };

        Bounds.translate(render.bounds, translate);

        // Update mouse
        Mouse.setScale(mouse, boundsScale);
        Mouse.setOffset(mouse, render.bounds.min);
    }

    // Get vector from mouse relative to centre of viewport
    const deltaCentre = Vector.sub(mouse.absolute, viewportCentre);
    const centreDist = Vector.magnitude(deltaCentre);

    // Translate the view if mouse has moved over 50px from the centre of viewport
    if (centreDist > 225) {
        // Create a vector to translate the view, allowing the user to control view speed
        const direction = Vector.normalise(deltaCentre);
        const speed = Math.min(10, Math.pow(centreDist - 50, 2) * 0.00007);

        translate = Vector.mult(direction, speed);

        // Prevent the view moving outside the extents
        if (render.bounds.min.x + translate.x < extents.min.x) {
            translate.x = extents.min.x - render.bounds.min.x;
        }

        if (render.bounds.max.x + translate.x > extents.max.x) {
            translate.x = extents.max.x - render.bounds.max.x;
        }

        if (render.bounds.min.y + translate.y < extents.min.y) {
            translate.y = extents.min.y - render.bounds.min.y;
        }

        if (render.bounds.max.y + translate.y > extents.max.y) {
            translate.y = extents.max.y - render.bounds.max.y;
        }

        // Move the view
        Bounds.translate(render.bounds, translate);

        // We must update the mouse too
        Mouse.setOffset(mouse, render.bounds.min);
    }
});

// Run the engine and renderer
Runner.run(engine);
Render.run(render);
