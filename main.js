//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// world.js
const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Mouse, World, Events, Vector, Common, Body, Composites, Bounds } = Matter;
Matter.use('matter-attractors'); // Enable the matter-attractors plugin

const allCircles = [];

const canvas = document.getElementById('matterCanvas');

const engine = Engine.create();
const world = engine.world;
engine.gravity.y = false;

const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: "transparent",
        wireframes: false,
        pixelRatio: window.devicePixelRatio // This ensures the correct pixel ratio
    }
});

Render.run(render);

let walls = [];

// Function to create walls
function createWalls() {
    // Remove existing walls
    Composite.remove(world, walls);
    
    // Create new walls
    const width = window.innerWidth;
    const height = window.innerHeight;

    walls = [
        Bodies.rectangle(width / 2, -25, width, 50, { 
            isStatic: true,
            render: { visible: false } 
        }), // top
        Bodies.rectangle(width / 2, height + 25, width, 50, { 
            isStatic: true,
            render: { visible: false } 
        }), // bottom
        Bodies.rectangle(-25, height / 2, 50, height, { 
            isStatic: true,
            render: { visible: false } 
        }), // left
        Bodies.rectangle(width + 25, height / 2, 50, height, { 
            isStatic: true,
            render: { visible: false } 
        }) // right
    ];

    // Add new walls to the world
    Composite.add(world, walls);
}

// Initial walls creation
createWalls();

// Handle window resize
// Handle window resize
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    
    render.options.width = newWidth;
    render.options.height = newHeight;
    render.canvas.width = newWidth;
    render.canvas.height = newHeight;

    createWalls(); // Recreate walls with new dimensions

    // Update render bounds to match new dimensions
    render.bounds.min.x = 0;
    render.bounds.min.y = 0;
    render.bounds.max.x = newWidth;
    render.bounds.max.y = newHeight;

    // Center the view
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: newWidth, y: newHeight }
    });

    // Update positions and scales of all circles
    allCircles.forEach(circle => {
        updateTextPosition(circle);
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
let boundsScaleTarget = 1;
let boundsScale = {x: 1, y: 1};

// Center the view at the start
Render.lookAt(render, {min: { x: 0, y: 0 }, max: { x: window.innerWidth, y: window.innerHeight }});

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

        // Update text positions to ensure they stay in place
        allCircles.forEach(circle => {
            updateTextPosition(circle);
        });
    }

    // Define different edge thresholds
    var topThreshold = 100; // Distance from top edge to start panning
    var bottomThreshold = 100; // Distance from bottom edge to start panning
    var sideThreshold = 100; // Distance from side edges to start panning

    // Get the height of the navigation menu
    var navMenu = document.querySelector('.navigation');
    var navHeight = navMenu ? navMenu.clientHeight : 0;

    // Adjust boundaries to account for the navigation menu
    var topBoundary = navHeight + topThreshold;
    var bottomBoundary = render.options.height - bottomThreshold;
    var leftBoundary = sideThreshold;
    var rightBoundary = render.options.width - sideThreshold;

    // Determine translation direction and speed based on mouse proximity to edges
    var direction = { x: 0, y: 0 };
    var speed = 0;

    if (mouseConstraint.body) { // Only pan the canvas when dragging a circle
        if (mouse.absolute.x < leftBoundary) {
            direction.x = -1;
            speed = 10 * (1 - (mouse.absolute.x / sideThreshold)); // Speed increases as mouse gets closer to the edge
        } else if (mouse.absolute.x > rightBoundary) {
            direction.x = 1;
            speed = 10 * (1 - ((render.options.width - mouse.absolute.x) / sideThreshold)); // Speed increases as mouse gets closer to the edge
        }

        if (mouse.absolute.y < topBoundary) {
            direction.y = -1;
            speed = 10 * (1 - ((mouse.absolute.y - navHeight) / topThreshold)); // Speed increases as mouse gets closer to the edge
        } else if (mouse.absolute.y > bottomBoundary) {
            direction.y = 1;
            speed = 10 * (1 - ((render.options.height - mouse.absolute.y) / bottomThreshold)); // Speed increases as mouse gets closer to the edge
        }

        if (direction.x !== 0 || direction.y !== 0) {
            translate = Vector.mult(direction, speed);

            // Prevent the view from moving out of bounds
            if (render.bounds.min.x + translate.x < 0) translate.x = 0 - render.bounds.min.x;
            if (render.bounds.min.y + translate.y < 0) translate.y = 0 - render.bounds.min.y;
            if (render.bounds.max.x + translate.x > window.innerWidth) translate.x = window.innerWidth - render.bounds.max.x;
            if (render.bounds.max.y + translate.y > window.innerHeight) translate.y = window.innerHeight - render.bounds.max.y;

            // Move the view
            Bounds.translate(render.bounds, translate);

            // We must update the mouse too
            Mouse.setOffset(mouse, render.bounds.min);

            // Update text positions to ensure they stay in place
            allCircles.forEach(circle => {
                updateTextPosition(circle);
            });
        }
    }
});

// Variables to track dragging state
let isDraggingCanvas = false;
let lastMousePosition = null;

// Event listeners for mouse and touch drag events
canvas.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', drag);
window.addEventListener('mouseup', endDrag);
canvas.addEventListener('mouseout', endDrag);

canvas.addEventListener('touchstart', startDrag, { passive: true });
canvas.addEventListener('touchmove', drag, { passive: true });
canvas.addEventListener('touchend', endDrag);
canvas.addEventListener('touchcancel', endDrag);

function startDrag(event) {
    if (mouseConstraint.body) {
        // If a circle is being dragged, do not start canvas dragging
        return;
    }
    isDraggingCanvas = true;
    lastMousePosition = getMousePosition(event);
}

function drag(event) {
    if (!isDraggingCanvas) return;

    const currentMousePosition = getMousePosition(event);
    const delta = {
        x: currentMousePosition.x - lastMousePosition.x,
        y: currentMousePosition.y - lastMousePosition.y
    };

    // Calculate the new bounds
    let newMinX = render.bounds.min.x - delta.x;
    let newMinY = render.bounds.min.y - delta.y;
    let newMaxX = render.bounds.max.x - delta.x;
    let newMaxY = render.bounds.max.y - delta.y;

    // Ensure the new bounds do not go out of the visible canvas area
    if (newMinX < 0) {
        delta.x = render.bounds.min.x;
        newMinX = 0;
        newMaxX = render.bounds.max.x - delta.x;
    }
    if (newMinY < 0) {
        delta.y = render.bounds.min.y;
        newMinY = 0;
        newMaxY = render.bounds.max.y - delta.y;
    }
    if (newMaxX > window.innerWidth) {
        delta.x = render.bounds.max.x - window.innerWidth;
        newMinX = render.bounds.min.x - delta.x;
        newMaxX = window.innerWidth;
    }
    if (newMaxY > window.innerHeight) {
        delta.y = render.bounds.max.y - window.innerHeight;
        newMinY = render.bounds.min.y - delta.y;
        newMaxY = window.innerHeight;
    }

    Bounds.translate(render.bounds, {
        x: -delta.x,
        y: -delta.y
    });

    Mouse.setOffset(mouse, render.bounds.min);

    lastMousePosition = currentMousePosition;
}

function endDrag() {
    isDraggingCanvas = false;
}

function getMousePosition(event) {
    if (event.touches) {
        return {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    } else {
        return {
            x: event.clientX,
            y: event.clientY
        };
    }
}

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

// Stop dragging canvas when mouse is released or out of bounds
Events.on(mouseConstraint, 'enddrag', function() {
    endDrag();
});

// Additional checks to prevent canvas drag if dragging circles
Events.on(mouseConstraint, 'mousedown', function(event) {
    if (event.body) {
        isDraggingCanvas = false;
    }
});

// Update isDraggingCanvas state based on mouseConstraint events
Events.on(mouseConstraint, 'startdrag', function(event) {
    if (event.body) {
        isDraggingCanvas = false;
    }
});

Events.on(mouseConstraint, 'enddrag', function(event) {
    if (event.body) {
        isDraggingCanvas = false;
    }
});



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// filters.js
let previousActiveTags = [];

// Function to set previousActiveTags
function setPreviousActiveTags(tags) {
    previousActiveTags = tags;
}

// Define filters for different pages
const filterDefinitions = {
    "index": {
        Activity: ["Art Exhibition", "Live Concert", "DJ", "Workshop"],
        Stage: ["Space Stage", "Vessel Stage", "Astral Stage", "Beach Stage", "Amphi Stage"],
        Timeline: ["22.06.23", "23.06.23", "24.06.23"]
    },
    "news": {
        News: ["Experiences", "Footprints", "Festival Life", "Beyond the Festival"],
        Countdown: ["78:13:21:34"]
    }
};

function generateFiltersHTML(filters) {
    const filtersContainer = document.querySelector('.filters');
    filtersContainer.innerHTML = ''; // Clear existing content

    for (const [category, tags] of Object.entries(filters)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.textContent = category;
        filtersContainer.appendChild(categoryDiv);

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'tags';

        if (category === 'Timeline') {
            tags.forEach(tag => {
                const timelineItem = document.createElement('div');
                timelineItem.className = 'timeline-item';

                const dateElement = document.createElement('span');
                dateElement.className = 'timeline-date tag';
                dateElement.textContent = tag;
                dateElement.setAttribute('data-category', 'timeline'); // Set data-category

                const timelineBar = document.createElement('div');
                timelineBar.className = 'timeline-bar';
                timelineBar.setAttribute('data-date', tag); // Add data-date attribute

                // Create 24 ticks for the timeline bar
                for (let i = 0; i < 24; i++) {
                    const tick = document.createElement('div');
                    tick.className = 'tick tag';
                    tick.setAttribute('data-time', `${((i * 60) % 3600) / 60}`); // Add data-time attribute
                    tick.setAttribute('data-category', 'tick'); // Set data-category
                    timelineBar.appendChild(tick);
                }

                timelineItem.appendChild(dateElement);
                timelineItem.appendChild(timelineBar);
                tagsContainer.appendChild(timelineItem);
            });
        } else {
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.setAttribute('data-category', category.toLowerCase());
                tagElement.setAttribute('data-tag', tag);
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
        }

        filtersContainer.appendChild(tagsContainer);
    }
}



let selectedTicks = [];
let startTick = null;
let isSelecting = false;

function handleMouseDown(event) {
    const timelineBar = event.target.closest('.timeline-bar');
    if (!timelineBar || !event.target.classList.contains('tick')) return;

    startTick = event.target;
    isSelecting = true;

    // Toggle the active state
    if (startTick.classList.contains('active')) {
        startTick.classList.remove('active');
        selectedTicks = selectedTicks.filter(tick => tick !== startTick);
        isSelecting = false;  // Stop selecting if it's just a click to toggle off
    } else {
        startTick.classList.add('active');
        selectedTicks.push(startTick);
    }

    // Prevent any default behavior that could cause the click event to fire twice
    event.preventDefault();
    applyTickStyles();
}

function handleMouseMove(event) {
    if (!isSelecting) return;

    const timelineBar = event.target.closest('.timeline-bar');
    if (!timelineBar || !event.target.classList.contains('tick')) return;

    const currentTick = event.target;
    const ticks = Array.from(timelineBar.querySelectorAll('.tick'));
    const startIndex = ticks.indexOf(startTick);
    const currentIndex = ticks.indexOf(currentTick);

    ticks.forEach((tick, index) => {
        if ((index >= startIndex && index <= currentIndex) || (index <= startIndex && index >= currentIndex)) {
            tick.classList.add('active');
            if (!selectedTicks.includes(tick)) {
                selectedTicks.push(tick);
            }
        } else {
            tick.classList.remove('active');
            const tickIndex = selectedTicks.indexOf(tick);
            if (tickIndex > -1) {
                selectedTicks.splice(tickIndex, 1);
            }
        }
    });
    applyTickStyles();
}

function handleMouseUp(event) {
    if (!isSelecting) return;

    const timelineBar = event.target.closest('.timeline-bar');
    if (!timelineBar) return;

    isSelecting = false;
    filterTimeline();
}

// Attach event listeners to the document to handle mouse events
document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

function applyTickStyles() {
    const ticks = document.querySelectorAll('.tick');
    ticks.forEach(tick => {
        if (tick.classList.contains('active')) {
            tick.style.backgroundColor = 'tomato';
        } else {
            tick.style.backgroundColor = 'var(--tag-color)';
        }
    });
}

function filterTimeline() {
    // Ensure selectedTicks has elements
    if (selectedTicks.length === 0) {
        console.error('No ticks selected');
        return;
    }

    // Get the start and end times from the selected ticks
    const startTick = selectedTicks[0];
    const endTick = selectedTicks[selectedTicks.length - 1];

    // Ensure startTick and endTick are defined
    if (!startTick || !endTick) {
        console.error('Start or end tick is undefined');
        return;
    }

    const startTime = parseInt(startTick.getAttribute('data-time'), 10);
    const endTime = parseInt(endTick.getAttribute('data-time'), 10);

    // Filter the timeline based on the start and end times
    const ticks = Array.from(document.querySelectorAll('.tick'));
    const activeTicks = ticks.filter(tick => {
        const tickTime = parseInt(tick.getAttribute('data-time'), 10);
        return tickTime >= startTime && tickTime <= endTime;
    });

    // Mark filtered ticks as active
    ticks.forEach(tick => {
        const tickTime = parseInt(tick.getAttribute('data-time'), 10);
        if (tickTime >= startTime && tickTime <= endTime) {
            tick.classList.add('active');
        } else {
            tick.classList.remove('active');
        }
    });

    // Apply styles to the ticks
    applyTickStyles();

    // Do something with the active ticks...
    console.log('Active ticks:', activeTicks);

    // Filter circles based on active ticks
    applyFilters();
}


function updateFilters(tab) {
    const filters = filterDefinitions[tab];
    generateFiltersHTML(filters);
}

// Function to initialize the page
function initializePage() {
    setActiveLink('index-link');
    const newsTab = document.getElementById('news-tab');
    const navigation = document.querySelector('.navigation');
    newsTab.classList.remove('show');
    newsTab.classList.add('hide');
    newsTab.style.display = 'none'; // Hide on load
    navigation.classList.remove('expanded'); // Ensure it's in default state
    updateFilters('index'); // Initialize filters for the index page

    // Fetch and populate news data
    fetch('../content/news.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const featuredContainer = document.getElementById('featured-stories');
            const allNewsContainer = document.getElementById('all-news');

            data.forEach(article => {
                const card = document.createElement('div');
                card.className = 'card';
                card.id = article.id;

                const contentHtml = article.content.replace(/\n/g, '<br>');

                card.innerHTML = `
                    <img src="${article.image}" alt="${article.title}">
                    <div class="card-bg">
                      <h2>${article.title}</h2>
                      <div class="info">
                          <span class="tag">${article.tag}</span>
                          <span class="date">${article.date}</span>
                      </div>
                      <div class="card-content">
                          <span class="content">${contentHtml}</span>
                      </div>
                    </div>
                    <div class="buttons">
                        <button class="share" onclick="window.open('${article.share_url}', '_blank')">Share</button>
                        <button class="read-more" onclick="window.location.href='${article.read_more_url}'">Read more →</button>
                    </div>
                `;

                if (article.isFeatured) {
                    featuredContainer.appendChild(card);
                } else {
                    allNewsContainer.appendChild(card);
                }
            });
        });
}

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    document.getElementById('news-link').addEventListener('click', function() {
        showNewsTab();
        setActiveLink('news-link');
        updateFilters('news'); // Update filters for news tab
    });

    document.getElementById('index-link').addEventListener('click', function() {
        hideNewsTab();
        setActiveLink('index-link');
        updateFilters('index'); // Update filters for index page
    });

    document.getElementById('close-news-tab').addEventListener('click', function() {
        hideNewsTab();
        setActiveLink('index-link');
        updateFilters('index'); // Update filters for index page
    });

    // Add event listener for tag activation
    document.querySelector('.filters').addEventListener('click', (event) => {
        if (event.target.classList.contains('tag')) {
            activateTag(event.target);
        }
    });
});


function showNewsTab() {
    const newsTab = document.getElementById('news-tab');
    const navigation = document.querySelector('.navigation');
    newsTab.style.display = 'block'; // Make it part of the layout
    navigation.classList.add('expanded'); // Expand the navigation height
    setTimeout(() => {
        newsTab.classList.add('show');
        newsTab.classList.remove('hide');
    }); // Small delay to ensure the display change takes effect
}

function hideNewsTab() {
    const newsTab = document.getElementById('news-tab');
    const navigation = document.querySelector('.navigation');
    newsTab.classList.add('hide');
    newsTab.classList.remove('show');
    setTimeout(() => {
        newsTab.style.display = 'none'; // Remove from layout after animation
        navigation.classList.remove('expanded'); // Reset the navigation height
    }, 500); // Match the transition duration in CSS
}

function setActiveLink(activeId) {
    const menuLinks = document.querySelectorAll('.menu nav ul li a');
    menuLinks.forEach(link => {
        if (link.id === activeId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Function to activate or deactivate a tag
function activateTag(tagElement) {
    const isActive = tagElement.classList.contains('active');
    const category = tagElement.getAttribute('data-category');

    if (category === 'timeline' || category === 'tick') {
        // Toggle its active state
        if (!isActive) {
            tagElement.classList.add('active');
        } else {
            tagElement.classList.remove('active');
        }
    } else {
        // Deactivate other tags in the same category
        const otherTags = document.querySelectorAll(`.tag[data-category="${category}"]`);
        otherTags.forEach(tag => tag.classList.remove('active'));

        // Toggle the clicked tag if it was not active
        if (!isActive) {
            tagElement.classList.add('active');
        }
    }
    applyFilters(); // Apply filters after activating the tag
}



function applyFilters() {
    const activeTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));

    if (activeTags.length === 0) {
        // Show all circles if no tags are active
        allCircles.forEach(circle => {
            if (!Composite.allBodies(world).includes(circle)) {
                Composite.add(world, circle);
                Body.set(circle, { isStatic: false });
                animateBodyAppearance(circle);
            }
        });
    } else {
        allCircles.forEach(circle => {
            const isActive = activeTags.every(tag => circle.tags.includes(tag));
            if (isActive) {
                if (!Composite.allBodies(world).includes(circle)) {
                    Composite.add(world, circle);
                    Body.set(circle, { isStatic: false });
                    animateBodyAppearance(circle);
                }
            } else {
                animateBodyDisappearance(circle);
            }
        });
    }
}

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

// Event listener for filters
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1);
    const filters = filterDefinitions[currentPage];

    // Remove any existing listeners
    const filtersElement = document.querySelector('.filters');
    const newFiltersElement = filtersElement.cloneNode(true);
    filtersElement.parentNode.replaceChild(newFiltersElement, filtersElement);

    // Add event listener for tag activation
    newFiltersElement.addEventListener('click', (event) => {
        if (event.target.classList.contains('tag')) {
            activateTag(event.target);
        }
    });
});



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// circle.js
const scaleFactor = 4;
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Quadratic easing function

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
        const mass = (Math.PI * radius)/15; // Mass proportional to the area of the circle

        const circle = Bodies.circle(x, y, radius, {
            restitution: 1,
            inertia: Infinity,  // Prevent rotation
            frictionAir: 0.01,
            mass: mass, // Set mass based on the radius
            render: {
                sprite: {
                    texture: circularTexture,
                    xScale: 1 / scaleFactor,
                    yScale: 1 / scaleFactor
                }
            },
            isStatic: false, // Ensure the circle is not static
            plugin: {
                attractors: [
                    function (bodyA, bodyB) {
                        const distance = Matter.Vector.magnitude(Matter.Vector.sub(bodyA.position, bodyB.position));
                        const forceMagnitude = (0.1 * bodyA.mass * bodyB.mass) / (distance * distance);
                        const force = Matter.Vector.mult(Matter.Vector.normalise(Matter.Vector.sub(bodyB.position, bodyA.position)), forceMagnitude);

                        Matter.Body.applyForce(bodyA, bodyA.position, force);
                        Matter.Body.applyForce(bodyB, bodyB.position, Matter.Vector.neg(force));
                    }
                ]
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


function animateBodyAppearance(circle) {
    const duration = 550; // Duration in ms
    const maxRadius = circle.originalRadius; // Target radius
    const startRadius = circle.circleRadius;
    const startTime = Date.now();

    // Ensure the text element is visible and reset its scale
    if (circle.textElement) {
        circle.textElement.style.display = 'block';
        circle.textElement.classList.remove('hidden');
        circle.textElement.style.transform = `translate(-50%, -50%)`;
    }

    function grow() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easedProgress = easeInOutQuad(progress);

        const newRadius = startRadius + (maxRadius - startRadius) * easedProgress;
        const scale = newRadius / circle.circleRadius;

        // Scale the body
        Body.scale(circle, scale, scale);

        // Reset inertia and angular velocity immediately after scaling
        Body.set(circle, {
            inertia: Infinity,
            angularVelocity: 0,
            angle: 0
        });

        // Update the sprite scaling
        circle.render.sprite.xScale = circle.originalXScale * easedProgress;
        circle.render.sprite.yScale = circle.originalYScale * easedProgress;

        if (progress < 1) {
            requestAnimationFrame(grow);
        } else {
            // Ensure the circle is exactly the original size
            circle.circleRadius = maxRadius;
            Body.scale(circle, maxRadius / circle.circleRadius, maxRadius / circle.circleRadius);

            // Reset inertia and angular velocity again after final scaling
            Body.set(circle, {
                inertia: Infinity,
                angularVelocity: 0,
                angle: 0
            });
            

            circle.render.sprite.xScale = circle.originalXScale;
            circle.render.sprite.yScale = circle.originalYScale;

            if (circle.textElement) {
                circle.textElement.style.transform = 'scale(1)';
                updateTextPosition(circle); // Final position update
            }
        }
    }
    requestAnimationFrame(grow);
}



// Function to animate the body's disappearance
function animateBodyDisappearance(circle) {
    const duration = 450; // Duration in ms
    const minRadius = 1; // Minimum radius before removing the body
    const startRadius = circle.circleRadius;
    const startTime = Date.now();


    function shrink() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easedProgress = easeInOutQuad(1 - progress); // Reverse easing for shrinking

        const newRadius = minRadius + (startRadius - minRadius) * easedProgress;
        const scale = newRadius / circle.circleRadius;
        Body.scale(circle, scale, scale);

        // Update the sprite scaling
        circle.render.sprite.xScale = circle.originalXScale * easedProgress;
        circle.render.sprite.yScale = circle.originalYScale * easedProgress;

        // Also shrink the associated DOM element
        if (circle.textElement) {
            circle.textElement.style.transform = `scale(${easedProgress})`;
            circle.textElement.classList.add('hidden');
            updateTextPosition(circle); // Update the position during animation
        }

        if (progress < 1) {
            requestAnimationFrame(shrink);
        } else {
            Composite.remove(world, circle);
            if (circle.textElement) {
                circle.textElement.style.display = 'none';
            }
        }
    }

    requestAnimationFrame(shrink);
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

        // Update the font size based on the circle's radius
        const baseFontSize = 0.2 * circle.circleRadius; // Base font size proportional to the radius
        const baseSupFontSize = 0.1 * circle.circleRadius; // Base superscript font size proportional to the radius
        const scaledFontSize = baseFontSize / boundsScale.x;
        const scaledSupFontSize = baseSupFontSize / boundsScale.x;

        circle.textElement.style.fontSize = `${scaledFontSize}px`;

        // Update the superscript font size
        const supElement = circle.textElement.querySelector('.superscript');
        if (supElement) {
            supElement.style.fontSize = `${scaledSupFontSize}px`;
        }

        // Center the text without scaling
        circle.textElement.style.transform = 'translate(-50%, -50%)';
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
let startPos = { x: 0, y: 0 };
const dragThreshold = 5; // Adjust the threshold for what constitutes a drag

// Function to find the circle at the given position
function getCircleAtPosition(position) {
    return allCircles.find(circle => Matter.Vertices.contains(circle.vertices, position));
}

// Constants for zoom target
const ZOOM_TARGET_SCALE = 4; // The scale you want the circle to fill
const ZOOM_DURATION = 500; // Duration of the zoom in milliseconds
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
            toggleInfoMenu(circle);
        }
    }
});

// Store original velocities
let originalVelocity = null;
let originalAngularVelocity = null;

// Function to show the info menu
function showInfoMenu(clickedCircle) {
    const infoMenu = document.getElementById('info-menu');
    const infoContent = document.getElementById('info-content');

    // Store the original velocity and angular velocity
    originalVelocity = { x: clickedCircle.velocity.x, y: clickedCircle.velocity.y };
    originalAngularVelocity = clickedCircle.angularVelocity;

    // Set the clicked circle as static
    Matter.Body.setStatic(clickedCircle, true);
    clickedCircle.textElement.classList.add('hidden'); // Hide the circle's text element

    // Update the info menu content
    infoContent.innerHTML = clickedCircle.infoContent;
    infoMenu.classList.add('show');

    // Save current active tags
    previousActiveTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));

    // Activate relevant tags in the filters menu
    activateTags(clickedCircle.tags);

    // Add close button functionality
    document.getElementById('close-info-menu').addEventListener('click', closeInfoMenu);
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



function getRandomPosition(radius) {
    const x = Math.random() * (window.innerWidth - 2 * radius) + radius;
    const y = Math.random() * (window.innerHeight - 2 * radius) + radius;
    return { x, y };
}

const circlesData = [
    { radius: 50, textureUrl: '../content/images/pic1.jpg', text: 'Caroline Polachek', supText: 'US', infoContent: '<h1>Perfume Genius</h1><p>Artist Info Here...</p>', tags: ['Live Concert', 'Vessel Stage', "24.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic1.jpg', text: 'Caroline Polachek', supText: 'US', infoContent: '<h1>Perfume Genius</h1><p>Artist Info Here...</p>', tags: ['Live Concert', 'Vessel Stage', "24.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic1.jpg', text: 'Caroline Polachek', supText: 'US', infoContent: '<h1>Perfume Genius</h1><p>Artist Info Here...</p>', tags: ['Live Concert', 'Vessel Stage', "24.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic1.jpg', text: 'Caroline Polachek', supText: 'US', infoContent: '<h1>Perfume Genius</h1><p>Artist Info Here...</p>', tags: ['Live Concert', 'Vessel Stage', "24.06.23"] },
    { radius: 50, textureUrl: '../content/images/pic2.jpg', text: 'FKA Twigs', supText: 'UK', infoContent: '<h1>Kate NV</h1><p>Artist Info Here...</p>', tags: ['Live Concert', 'Beach Stage', "22.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic3.jpg', text: 'Weyes Blood', supText: 'US', infoContent: '<h1>Weyes Blood</h1><p>Artist Info Here...</p>', tags: ['Art Exhibition', 'Astral Stage', "22.06.23"] },
    { radius: 50, textureUrl: '../content/images/pic3.jpg', text: 'Weyes Blood', supText: 'US', infoContent: '<h1>Weyes Blood</h1><p>Artist Info Here...</p>', tags: ['Art Exhibition', 'Astral Stage', "22.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic3.jpg', text: 'Weyes Blood', supText: 'US', infoContent: '<h1>Weyes Blood</h1><p>Artist Info Here...</p>', tags: ['Art Exhibition', 'Astral Stage', "22.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic3.jpg', text: 'Weyes Blood', supText: 'US', infoContent: '<h1>Weyes Blood</h1><p>Artist Info Here...</p>', tags: ['Art Exhibition', 'Astral Stage', "22.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic4.jpg', text: 'Kate NV', supText: 'RU', infoContent: '<h1>A.G. Cook</h1><p>Artist Info Here...</p>', tags: ['DJ', 'Space Stage', "23.06.23"] },
    { radius: 50, textureUrl: '../content/images/pic4.jpg', text: 'Kate NV', supText: 'RU', infoContent: '<h1>A.G. Cook</h1><p>Artist Info Here...</p>', tags: ['DJ', 'Space Stage', "23.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic4.jpg', text: 'Kate NV', supText: 'RU', infoContent: '<h1>A.G. Cook</h1><p>Artist Info Here...</p>', tags: ['DJ', 'Space Stage', "23.06.23"] },
    { radius: 50, textureUrl: '../content/images/pic4.jpg', text: 'Kate NV', supText: 'RU', infoContent: '<h1>A.G. Cook</h1><p>Artist Info Here...</p>', tags: ['DJ', 'Space Stage', "23.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic5.jpg', text: 'Perfume Genius', supText: 'US', infoContent: '<h1>Caroline Polachek</h1><p>Artist Info Here...</p>', tags: ['Workshop', 'Amphi Stage', "22.06.23"] },
    { radius: 50, textureUrl: '../content/images/pic5.jpg', text: 'Perfume Genius', supText: 'US', infoContent: '<h1>Caroline Polachek</h1><p>Artist Info Here...</p>', tags: ['Workshop', 'Amphi Stage', "22.06.23"] },
    { radius: 30, textureUrl: '../content/images/pic5.jpg', text: 'Perfume Genius', supText: 'US', infoContent: '<h1>Caroline Polachek</h1><p>Artist Info Here...</p>', tags: ['Workshop', 'Amphi Stage', "22.06.23"] },
];

circlesData.forEach(data => {
    const position = getRandomPosition(data.radius);
    addCircle(position.x, position.y, data.radius, data.textureUrl, data.text, data.supText, data.infoContent, data.tags);
});



// Initial walls creation
createWalls();

// Run the engine and renderer
Runner.run(engine);
Render.run(render);