// Import necessary Matter.js modules
const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Mouse, World, Events, Vector, Common, Body, Composites, Bounds } = Matter;

// Enable the matter-attractors plugin
Matter.use('matter-attractors');

// Get the canvas element
const canvas = document.getElementById('matterCanvas');

// Create the Matter.js engine
const engine = Engine.create();
const world = engine.world;

// Disable gravity in the Y direction
engine.gravity.y = false;

// Create the renderer
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: "transparent",
        wireframes: false,
        pixelRatio: window.devicePixelRatio
    }
});

// Run the renderer
Render.run(render);

const allCircles = [];
let walls = [];
let isPinching = false;
let initialDistance = null;
let boundsScaleTarget = 1;
let boundsScale = { x: 1, y: 1 };

// Function to create walls
function createWalls() {
    Composite.remove(world, walls);
    const width = window.innerWidth;
    const height = window.innerHeight;

    walls = [
        Bodies.rectangle(width / 2, -25, width, 50, { isStatic: true, render: { visible: false } }), // Top wall
        Bodies.rectangle(width / 2, height + 25, width, 50, { isStatic: true, render: { visible: false } }), // Bottom wall
        Bodies.rectangle(-25, height / 2, 50, height, { isStatic: true, render: { visible: false } }), // Left wall
        Bodies.rectangle(width + 25, height / 2, 50, height, { isStatic: true, render: { visible: false } }) // Right wall
    ];

    Composite.add(world, walls);
}
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

// Event listeners for touch events to handle pinch zoom
canvas.addEventListener('gesturestart', (event) => {
    event.preventDefault();
    initialDistance = event.scale;
    isPinching = true;
}, { passive: false });

canvas.addEventListener('gesturechange', (event) => {
    if (isPinching) {
        event.preventDefault();
        const scaleFactor = initialDistance / event.scale; // Invert the scaleFactor

        boundsScaleTarget *= scaleFactor;
        boundsScaleTarget = Math.max(0.3, Math.min(boundsScaleTarget, 1)); // Ensure boundsScaleTarget does not exceed 1

        initialDistance = event.scale;

        const mouse = mouseConstraint.mouse;
        const mousePosition = { x: mouse.absolute.x, y: mouse.absolute.y };
        const previousBounds = { ...render.bounds };
        const scaleFactorDelta = (boundsScaleTarget - boundsScale.x) * 0.075;
        boundsScale.x += scaleFactorDelta;
        boundsScale.y += scaleFactorDelta;

        const dx = (mousePosition.x - previousBounds.min.x) / (previousBounds.max.x - previousBounds.min.x);
        const dy = (mousePosition.y - previousBounds.min.y) / (previousBounds.max.y - previousBounds.min.y);

        render.bounds.min.x = mousePosition.x - dx * (render.bounds.max.x - render.bounds.min.x);
        render.bounds.min.y = mousePosition.y - dy * (render.bounds.max.y - render.bounds.min.y);
        render.bounds.max.x = render.bounds.min.x + render.options.width * boundsScale.x;
        render.bounds.max.y = render.bounds.min.y + render.options.height * boundsScale.y;

        const translate = {
            x: mousePosition.x - (previousBounds.min.x + (previousBounds.max.x - previousBounds.min.x) * dx),
            y: mousePosition.y - (previousBounds.min.y + (previousBounds.max.y - previousBounds.min.y) * dy)
        };

        Bounds.translate(render.bounds, translate);

        const wallBuffer = 50; // Buffer to ensure we stay within the walls
        if (render.bounds.min.x < -wallBuffer) {
            const translateX = -wallBuffer - render.bounds.min.x;
            render.bounds.min.x += translateX;
            render.bounds.max.x += translateX;
        }
        if (render.bounds.min.y < -wallBuffer) {
            const translateY = -wallBuffer - render.bounds.min.y;
            render.bounds.min.y += translateY;
            render.bounds.max.y += translateY;
        }
        if (render.bounds.max.x > window.innerWidth + wallBuffer) {
            const translateX = window.innerWidth + wallBuffer - render.bounds.max.x;
            render.bounds.min.x += translateX;
            render.bounds.max.x += translateX;
        }
        if (render.bounds.max.y > window.innerHeight + wallBuffer) {
            const translateY = window.innerHeight + wallBuffer - render.bounds.max.y;
            render.bounds.min.y += translateY;
            render.bounds.max.y += translateY;
        }

        Mouse.setScale(mouse, boundsScale);
        Mouse.setOffset(mouse, render.bounds.min);

        allCircles.forEach(circle => {
            updateTextPosition(circle);
        });
    }
}, { passive: false });

canvas.addEventListener('gestureend', (event) => {
    event.preventDefault();
    isPinching = false;
    initialDistance = null;
}, { passive: false });


// Event listener for wheel events to handle panning
canvas.addEventListener('wheel', (event) => {
    if (isPinching) return; // Do nothing if currently pinching

    const delta = { x: event.deltaX, y: event.deltaY };
    let newMinX = render.bounds.min.x + delta.x;
    let newMinY = render.bounds.min.y + delta.y;
    let newMaxX = render.bounds.max.x + delta.x;
    let newMaxY = render.bounds.max.y + delta.y;

    const wallBuffer = 50; // Buffer to ensure we stay within the walls
    if (newMinX < -wallBuffer) {
        delta.x = -wallBuffer - render.bounds.min.x;
        newMinX = -wallBuffer;
        newMaxX = render.bounds.max.x + delta.x;
    }
    if (newMinY < -wallBuffer) {
        delta.y = -wallBuffer - render.bounds.min.y;
        newMinY = -wallBuffer;
        newMaxY = render.bounds.max.y + delta.y;
    }
    if (newMaxX > window.innerWidth + wallBuffer) {
        delta.x = window.innerWidth + wallBuffer - render.bounds.max.x;
        newMinX = render.bounds.min.x + delta.x;
        newMaxX = window.innerWidth + wallBuffer;
    }
    if (newMaxY > window.innerHeight + wallBuffer) {
        delta.y = window.innerHeight + wallBuffer - render.bounds.max.y;
        newMinY = render.bounds.min.y + delta.y;
        newMaxY = window.innerHeight + wallBuffer;
    }

    Bounds.translate(render.bounds, { x: delta.x, y: delta.y });
    Mouse.setOffset(mouse, render.bounds.min);

    event.preventDefault();
}, { passive: false });

// Center the view initially
Render.lookAt(render, { min: { x: 0, y: 0 }, max: { x: window.innerWidth, y: window.innerHeight } });

Events.on(render, 'beforeRender', () => {
    const mouse = mouseConstraint.mouse;

    // Define edge thresholds
    const thresholds = { top: 100, bottom: 100, side: 100 };
    const navMenu = document.querySelector('.navigation');
    const navHeight = navMenu ? navMenu.clientHeight : 0;
    const topBoundary = navHeight + thresholds.top;
    const bottomBoundary = render.options.height - thresholds.bottom;
    const leftBoundary = thresholds.side;
    const rightBoundary = render.options.width - thresholds.side;

    let direction = { x: 0, y: 0 };
    let speed = 0;

    if (mouseConstraint.body) {
        if (mouse.absolute.x < leftBoundary) {
            direction.x = -1;
            speed = 10 * (1 - (mouse.absolute.x / thresholds.side));
        } else if (mouse.absolute.x > rightBoundary) {
            direction.x = 1;
            speed = 10 * (1 - ((render.options.width - mouse.absolute.x) / thresholds.side));
        }

        if (mouse.absolute.y < topBoundary) {
            direction.y = -1;
            speed = 10 * (1 - ((mouse.absolute.y - navHeight) / thresholds.top));
        } else if (mouse.absolute.y > bottomBoundary) {
            direction.y = 1;
            speed = 10 * (1 - ((render.options.height - mouse.absolute.y) / thresholds.bottom));
        }

        if (direction.x !== 0 || direction.y !== 0) {
            const translate = Vector.mult(direction, speed);
            if (render.bounds.min.x + translate.x < 0) translate.x = 0 - render.bounds.min.x;
            if (render.bounds.min.y + translate.y < 0) translate.y = 0 - render.bounds.min.y;
            if (render.bounds.max.x + translate.x > window.innerWidth) translate.x = window.innerWidth - render.bounds.max.x;
            if (render.bounds.max.y + translate.y > window.innerHeight) translate.y = window.innerHeight - render.bounds.max.y;

            Bounds.translate(render.bounds, translate);
            Mouse.setOffset(mouse, render.bounds.min);

            allCircles.forEach(circle => {
                updateTextPosition(circle);
            });
        }
    }
});

// Add mouse drag control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.00075,
        render: { visible: false }
    }
});
Composite.add(world, mouseConstraint);

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

// Function to generate HTML for filters
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
                dateElement.setAttribute('data-category', 'timeline');

                const timelineBar = document.createElement('div');
                timelineBar.className = 'timeline-bar';
                timelineBar.setAttribute('data-date', tag);

                // Create 24 ticks for the timeline bar
                for (let i = 0; i < 24; i++) {
                    const tick = document.createElement('div');
                    tick.className = 'tick tag';
                    tick.setAttribute('data-time', `${((i * 60) % 3600) / 60}`);
                    tick.setAttribute('data-category', 'tick');
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

// Variables to handle tick selection
let selectedTicks = [];
let startTick = null;
let isSelecting = false;

// Mouse event handlers for tick selection
function handleMouseDown(event) {
    const timelineBar = event.target.closest('.timeline-bar');
    if (!timelineBar || !event.target.classList.contains('tick')) return;

    startTick = event.target;
    isSelecting = true;

    // Toggle the active state
    if (startTick.classList.contains('active')) {
        startTick.classList.remove('active');
        selectedTicks = selectedTicks.filter(tick => tick !== startTick);
        isSelecting = false; // Stop selecting if it's just a click to toggle off
    } else {
        startTick.classList.add('active');
        selectedTicks.push(startTick);
    }

    event.preventDefault(); // Prevent any default behavior
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

// Apply styles to ticks based on their active state
function applyTickStyles() {
    const ticks = document.querySelectorAll('.tick');
    ticks.forEach(tick => {
        tick.style.backgroundColor = tick.classList.contains('active') ? 'tomato' : 'var(--tag-color)';
    });
}

// Filter the timeline based on selected ticks
function filterTimeline() {
    if (selectedTicks.length === 0) {
        console.error('No ticks selected');
        return;
    }

    const startTick = selectedTicks[0];
    const endTick = selectedTicks[selectedTicks.length - 1];

    if (!startTick || !endTick) {
        console.error('Start or end tick is undefined');
        return;
    }

    const startTime = parseInt(startTick.getAttribute('data-time'), 10);
    const endTime = parseInt(endTick.getAttribute('data-time'), 10);

    const ticks = Array.from(document.querySelectorAll('.tick'));
    const activeTicks = ticks.filter(tick => {
        const tickTime = parseInt(tick.getAttribute('data-time'), 10);
        return tickTime >= startTime && tickTime <= endTime;
    });

    ticks.forEach(tick => {
        const tickTime = parseInt(tick.getAttribute('data-time'), 10);
        tick.classList.toggle('active', tickTime >= startTime && tickTime <= endTime);
    });

    applyTickStyles();
    console.log('Active ticks:', activeTicks);
    applyFilters();
}

// Update filters based on the selected tab
function updateFilters(tab) {
    const filters = filterDefinitions[tab];
    generateFiltersHTML(filters);
}

// Function to activate tags of the clicked circle
function activateTags(tags) {
    // Deactivate all tags first
    document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('active'));

    // Activate the tags passed in the argument
    tags.forEach(tag => {
        const tagElement = document.querySelector(`.tag[data-tag="${tag}"]`);
        if (tagElement) {
            tagElement.classList.add('active');
        }
    });
}


// Function to create or update card with dynamic background color
function createOrUpdateCard(cardElement) {
    const imgElement = cardElement.querySelector('img');
    const cardBgElement = cardElement.querySelector('.card-bg');
    const carddElement = cardElement.querySelector('.card');
    const cardButtons = cardElement.querySelector('.buttons');

    if (imgElement) {
        imgElement.addEventListener('load', () => {
            getDominantColorFromImage(imgElement.src, function(dominantColor) {
                const colorString = `rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.7)`;
                if (cardElement) {
                    cardElement.style.backgroundColor = colorString;
                }
                if (cardBgElement) {
                    cardBgElement.style.background = colorString;
                }
                if (cardButtons) {
                    cardButtons.style.backgroundColor = colorString;
                }
            });
        });
    }
}


document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    document.getElementById('news-link').addEventListener('click', function() {
        showNewsTab();
        setActiveLink('news-link');
        updateFilters('news');
    });

    document.getElementById('index-link').addEventListener('click', function() {
        hideNewsTab();
        setActiveLink('index-link');
        updateFilters('index');
    });

    document.getElementById('close-news-tab').addEventListener('click', function() {
        hideNewsTab();
        setActiveLink('index-link');
        updateFilters('index');
    });

    document.querySelector('.filters').addEventListener('click', (event) => {
        if (event.target.classList.contains('tag')) {
            activateTag(event.target);
        }
    });

    fetchNewsData();

    // Add click event listener for expand/collapse functionality
    document.querySelectorAll('.read-more').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            const articleId = this.getAttribute('data-article-id');
            expandCard(articleId);
        });
    });
});

function initializePage() {
    setActiveLink('index-link');
    const newsTab = document.getElementById('news-tab');
    const navigation = document.querySelector('.navigation');
    newsTab.classList.remove('show');
    newsTab.classList.add('hide');
    newsTab.style.display = 'none';
    navigation.classList.remove('expanded');
    updateFilters('index');
}

function fetchNewsData() {
    fetch('../content/news.json')
    .then(response => response.json())
        .then(data => {
            const featuredContainer = document.getElementById('featured-stories');
            const allNewsContainer = document.getElementById('all-news');

            data.forEach(article => {
                const card = document.createElement('div');
                card.className = 'card';
                card.id = article.id;
                card.setAttribute('data-original-content', card.innerHTML);

                const contentHtml = article.content.replace(/\n/g, '<br>');

                card.innerHTML = `
                    <div class="title-info-container">
                        <h2>${article.title}</h2>
                        <div class="info">
                            <span class="tag">${article.tag}</span>
                            <span class="date">${article.date}</span>
                        </div>
                    </div>
                    <img src="${article.image}" alt="${article.title}">
                    <div class="card-bg">
                        <div class="card-content">
                            <span class="content">${contentHtml}</span>
                        </div>
                    </div>
                    <div class="buttons">
                        <button class="share" onclick="window.open('${article.share_url}', '_blank')">Share</button>
                        <button class="read-more" data-article-id="${article.id}">Read more →</button>
                    </div>
                `;

                if (article.isFeatured) {
                    featuredContainer.appendChild(card);
                } else {
                    allNewsContainer.appendChild(card);
                }

                createOrUpdateCard(card);
            });

            document.querySelectorAll('.read-more').forEach(button => {
                button.addEventListener('click', function(event) {
                    event.stopPropagation();
                    const articleId = this.getAttribute('data-article-id');
                    expandCard(articleId);
                });
            });
        })
        .catch(error => console.error('Error fetching news data:', error));
}


function expandCard(articleId) {
    const card = document.getElementById(articleId);
    if (card) {
        card.classList.add('expanded');

        const cardBgElement = card.querySelector('.card-bg');
        const cardElement = card;

        // Ensure card background color is inherited from card-bg
        if (cardBgElement) {
            const computedStyle = getComputedStyle(cardBgElement);
            const bgColor = computedStyle.backgroundColor;
            cardElement.style.backgroundColor = bgColor;
        }

        fetch('../content/news.json')
            .then(response => response.json())
            .then(data => {
                const article = data.find(article => article.id === articleId);
                if (article) {
                    card.innerHTML = `
                        <div class="card-content">
                            <button class="close-btn" onclick="collapseCard('${articleId}')">×</button>
                            <h1>${article.title}</h1>
                        </div>
                        <img src="${article.image}" alt="${article.title}" class="article-image">
                        <div class="article-text">
                            <p>${article.content.replace(/\n/g, '<br>')}</p>
                        </div>
                        <div class="buttons">
                            <button class="share" onclick="window.open('${article.share_url}', '_blank')">Share</button>
                        </div>
                    `;
                }
            })
            .catch(error => console.error('Error loading article:', error));
    }
}

function collapseCard(articleId) {
    const card = document.getElementById(articleId);
    if (card) {
        card.classList.remove('expanded');
        const originalContent = card.getAttribute('data-original-content');
        if (originalContent) {
            card.innerHTML = originalContent;
        }

        card.querySelector('.read-more').addEventListener('click', function(event) {
            event.stopPropagation();
            expandCard(articleId);
        });

        createOrUpdateCard(card);
    }
}


// Function to create or update card with dynamic background color
function createOrUpdateCard(cardElement) {
    const imgElement = cardElement.querySelector('img');
    const cardBgElement = cardElement.querySelector('.card-bg');
    const cardButtons = cardElement.querySelectorAll('.buttons button'); // Select all buttons

    if (imgElement) {
        imgElement.addEventListener('load', () => {
            getDominantColorFromImage(imgElement.src, function(dominantColor) {
                const colorString = `rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.7)`;
                if (cardBgElement) {
                    cardBgElement.style.backgroundColor = colorString;
                }
                // Apply background color to all buttons
                cardButtons.forEach(button => {
                    button.style.backgroundColor = colorString;
                });
            });
        });
    }
}


function showNewsTab() {
    const newsTab = document.getElementById('news-tab');
    const navigation = document.querySelector('.navigation');
    newsTab.style.display = 'block';
    navigation.classList.add('expanded');
    setTimeout(() => {
        newsTab.classList.add('show');
        newsTab.classList.remove('hide');
    });
}

function hideNewsTab() {
    const newsTab = document.getElementById('news-tab');
    const navigation = document.querySelector('.navigation');
    newsTab.classList.add('hide');
    newsTab.classList.remove('show');
    setTimeout(() => {
        newsTab.style.display = 'none';
        navigation.classList.remove('expanded');
    }, 500);
}

function setActiveLink(activeId) {
    const menuLinks = document.querySelectorAll('.menu nav ul li a');
    menuLinks.forEach(link => {
        link.classList.toggle('active', link.id === activeId);
    });
}


// Function to activate or deactivate a tag
function activateTag(tagElement) {
    const isActive = tagElement.classList.contains('active');
    const category = tagElement.getAttribute('data-category');

    if (category === 'timeline' || category === 'tick') {
        tagElement.classList.toggle('active');
    } else {
        const otherTags = document.querySelectorAll(`.tag[data-category="${category}"]`);
        otherTags.forEach(tag => tag.classList.remove('active'));
        if (!isActive) {
            tagElement.classList.add('active');
        }
    }
    applyFilters(); // Apply filters after activating the tag
}

// Apply filters based on active tags
function applyFilters() {
    const activeTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));

    allCircles.forEach(circle => {
        const isActive = activeTags.every(tag => circle.tags.includes(tag));
        if (isActive) {
            if (!Composite.allBodies(world).includes(circle)) {
                Composite.add(world, circle);
                Body.set(circle, { isStatic: false });
                animateBodyAppearance(circle);
            }
        } else {
            if (Composite.allBodies(world).includes(circle)) {
                animateBodyDisappearance(circle);
            }
        }
    });
}

// Restore previously active tags
function restorePreviousActiveTags() {
    const allTags = document.querySelectorAll('.tag');
    allTags.forEach(tag => {
        tag.classList.toggle('active', previousActiveTags.includes(tag.getAttribute('data-tag')));
    });
    applyFilters();
}

// Initialize filters on DOM content loaded
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
function addCircle(x, y, radius, textureUrl, text, supText, infoContent, tags, relatedNews = [], relatedArtists = []) {
    fitSprite(textureUrl, radius * 2, function (circularTexture) {
        const mass = (Math.PI * radius)/(radius*0.75); // Mass proportional to the area of the circle

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
        circle.relatedNews = relatedNews; // Add related news
        circle.relatedArtists = relatedArtists; // Add related artists

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
const ZOOM_DURATION = 3000; // Duration of the zoom in milliseconds
const TARGET_POSITION = { x: window.innerWidth / 6, y: window.innerHeight / 1.5 }; // Target position to center the circle

let isZooming = false; // Flag to disable zooming and panning during info display
let clickedCircleCard = null;

function zoomToCircle(targetCircle) {
    isZooming = true; // Disable further zooming and panning

    const startBounds = { ...render.bounds };
    const startTime = performance.now();

    function animateZoom(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / ZOOM_DURATION, 1);

        // Calculate the dynamic target bounds based on the circle's current position
        const finalPosition = targetCircle.position;
        const endBounds = calculateTargetBounds(targetCircle, finalPosition);

        const interpolatedBounds = interpolateBounds(startBounds, endBounds, progress);

        render.bounds.min.x = interpolatedBounds.min.x;
        render.bounds.min.y = interpolatedBounds.min.y;
        render.bounds.max.x = interpolatedBounds.max.x;
        render.bounds.max.y = interpolatedBounds.max.y;

        Render.lookAt(render, {
            min: { x: render.bounds.min.x, y: render.bounds.min.y },
            max: { x: render.bounds.max.x, y: render.bounds.max.y }
        });

        // Gradually slow down time
        engine.timing.timeScale = 1 - progress;

        // Update text positions during zoom
        allCircles.forEach(circle => {
            updateTextPosition(circle, render.bounds);
        });

        if (progress < 1) {
            requestAnimationFrame(animateZoom);
        } else {
            isZooming = false; // Enable zooming and panning again
        }
    }

    requestAnimationFrame(animateZoom);

    // Show the info menu
    showInfoMenu(targetCircle);

    // Activate relevant tags in the filters menu
    activateTags(targetCircle.tags);

    // Apply filters immediately to hide circles that don't match
    applyFilters();

    // Extract and apply the dominant color to the info menu
    getDominantColorFromImage(targetCircle.render.sprite.texture, function(dominantColor) {
        const colorString = `rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.7)`;
        const infoMenu = document.getElementById('info-menu');
        infoMenu.style.backgroundColor = colorString;
        infoMenu.style.backdropFilter = 'blur(30px)'; // Ensure backdrop filter is applied
    });

    // Create and position the circle card container
    createCircleCardContainer(targetCircle);
}

function createCircleCardContainer(circle) {
    const overlayContainer = document.getElementById('overlay-container');

    // Remove the existing card if any
    if (clickedCircleCard) {
        overlayContainer.removeChild(clickedCircleCard);
    }

    // Create a new card container
    const cardContainer = document.createElement('div');
    cardContainer.className = 'circle-card';
    
    const { x, y } = circle.position;23

    // Calculate the position without scaling
    const scaledX = (x - render.bounds.min.x) / boundsScale.x;
    const scaledY = (y - render.bounds.min.y) / boundsScale.y;

    cardContainer.style.left = `${scaledX}px`;
    cardContainer.style.top = `${scaledY}px`;

    // Optionally, you can add more content to the cardContainer here

    overlayContainer.appendChild(cardContainer);

    // Store the reference to the created card
    clickedCircleCard = cardContainer;
}

// Function to get the dominant color from an image
function getDominantColorFromImage(imageSrc, callback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageSrc;

    img.onload = function() {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img);
        let selectedColor = palette[0];

        // Find the first dark color in the palette
        for (let color of palette) {
            if (isDark(color)) {
                selectedColor = color;
                break;
            }
        }
        callback(selectedColor);
    };
}

function isDark(color) {
    // Convert RGB to YIQ to determine the brightness
    const yiq = ((color[0] * 299) + (color[1] * 587) + (color[2] * 114)) / 1000;
    return yiq < 200;
}

function calculateTargetBounds(targetCircle, finalPosition) {
    const circleRadius = targetCircle.circleRadius;

    // Calculate the zoom scale to ensure the circle fits within the target bounds
    const scaleX = window.innerWidth / (circleRadius * 1 * ZOOM_TARGET_SCALE);
    const scaleY = window.innerHeight / (circleRadius * 1 * ZOOM_TARGET_SCALE);
    const scale = Math.min(scaleX, scaleY);

    const min = {
        x: finalPosition.x - TARGET_POSITION.x / scale,
        y: finalPosition.y - TARGET_POSITION.y / scale
    };
    const max = {
        x: min.x + window.innerWidth / scale,
        y: min.y + window.innerHeight / scale
    };

    return { min, max };
}


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


function showInfoMenu(targetCircle) {
    const infoMenu = document.getElementById('info-menu');
    const infoContent = document.getElementById('info-content');
    const circleCardContainer = document.getElementById('circle-card');

    // Store the original velocity and angular velocity
    targetCircle.originalVelocity = { x: targetCircle.velocity.x, y: targetCircle.velocity.y };
    targetCircle.originalAngularVelocity = targetCircle.angularVelocity;

    // Hide the circle's text element
    targetCircle.textElement.classList.add('hidden');

    // Update the info menu content
    infoContent.innerHTML = targetCircle.infoContent;

    // Populate related news
    const relatedNewsContainer = document.querySelector('.related-news-cards');
    relatedNewsContainer.innerHTML = ''; // Clear existing content
    if (targetCircle.relatedNews) {
        targetCircle.relatedNews.forEach(newsId => {
            const article = newsArticles[newsId];
            if (article) {
                const newsCard = createRelatedNewsCard(article);
                relatedNewsContainer.appendChild(newsCard);
            }
        });
    }

    // Update and display the circle card container
    circleCardContainer.innerHTML = `
        <div class="cutout"></div>
        <h2>${targetCircle.text}</h2>
        <p>Additional details about the circle can be added here.</p>
    `;
    circleCardContainer.style.display = 'block';

    // Show the info menu with CSS animation
    infoMenu.style.display = 'block'; // Make it part of the layout
    setTimeout(() => {
        infoMenu.classList.add('show');
        infoMenu.classList.remove('hidden');
        circleCardContainer.classList.add('show');
        circleCardContainer.classList.remove('hidden');
    }, 0); // Small delay to ensure the display change takes effect

    // Expand the navigation height
    document.querySelector('.navigation').classList.add('expanded');

    // Add close button functionality
    document.getElementById('close-info-menu').addEventListener('click', closeInfoMenu);
}


let newsArticles = {};

fetch('./content/news.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(article => {
            newsArticles[article.id] = article;
        });
    })
    .catch(error => console.error('Error loading news articles:', error));


    function createRelatedNewsCard(article) {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = article.id;
        card.setAttribute('data-original-content', card.innerHTML);
    
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
                <button class="read-more" data-article-id="${article.id}">Read more →</button>
            </div>
        `;
    
        return card;
    }

function createRelatedArtistCircle(artist) {
    const circle = document.createElement('div');
    circle.className = 'artist-circle';
    circle.style.backgroundImage = `url(${artist.image})`;
    circle.style.width = '50px'; // Adjust size as needed
    circle.style.height = '50px';
    circle.style.borderRadius = '50%';
    circle.style.backgroundSize = 'cover';
    circle.style.backgroundPosition = 'center';
    circle.setAttribute('data-artist-id', artist.id); // Add data attribute to identify the artist

    return circle;
}

// Function to close the info menu
function closeInfoMenu() {
    const infoMenu = document.getElementById('info-menu');
    const circleCardContainer = document.getElementById('circle-card');

    infoMenu.classList.add('hide');
    infoMenu.classList.remove('show');
    circleCardContainer.classList.add('hide');
    circleCardContainer.classList.remove('show');

    setTimeout(() => {
        infoMenu.style.display = 'none'; // Remove from layout after animation
        circleCardContainer.style.display = 'none';
    }, 500); // Match the transition duration in CSS

    if (clickedCircle) {
        clickedCircle.textElement.classList.remove('hidden');
        clickedCircle = null;
    }

    // Restore previous active tags
    restorePreviousActiveTags();

    // Collapse the navigation height
    document.querySelector('.navigation').classList.remove('expanded');

    // Apply filters to restore the circles
    applyFilters();

    // Update text positions
    allCircles.forEach(circle => {
        updateTextPosition(circle, render.bounds);
    });

    // Gradually restore time scale without altering velocities
    let progress = 0;
    const restoreTimeScale = () => {
        progress = Math.min(progress + 0.05, 1);
        engine.timing.timeScale = progress;

        if (progress < 1) {
            requestAnimationFrame(restoreTimeScale);
        }
    };
    requestAnimationFrame(restoreTimeScale);
}



document.getElementById('close-info-menu').addEventListener('click', closeInfoMenu);

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
            zoomToCircle(circle);
        }
    }
});

function getRandomPosition(radius) {
    const x = Math.random() * (window.innerWidth - 2 * radius) + radius;
    const y = Math.random() * (window.innerHeight - 2 * radius) + radius;
    return { x, y };
}

// Function to load JSON data
async function loadCirclesData() {
    try {
        const response = await fetch('./content/circles.json'); // Update the path as needed
        const circlesData = await response.json();

        circlesData.forEach(data => {
            const position = getRandomPosition(data.radius);
            addCircle(position.x, position.y, data.radius, data.textureUrl, data.text, data.supText, data.infoContent, data.tags, data.relatedNews, data.relatedArtists);
        });
    } catch (error) {
        console.error('Error loading circles data:', error);
    }
}


// Call the function to load and add circles
loadCirclesData();

// Initial walls creation
createWalls();

// Run the engine and renderer
Runner.run(engine);
Render.run(render);
