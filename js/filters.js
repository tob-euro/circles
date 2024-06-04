import { Body, Composite } from 'matter-js';
import { updateTextPosition, allCircles } from './circles.js';
import { world } from './world.js';

export let previousActiveTags = [];

// Function to set previousActiveTags
export function setPreviousActiveTags(tags) {
    previousActiveTags = tags;
}

// Define filters for different pages
const filterDefinitions = {
    "index.html": {
        Activity: ["Art Exhibition", "Live Concert", "DJ", "Workshop"],
        Stage: ["Space Stage", "Vessel Stage", "Astral Stage", "Beach Stage", "Amphi Stage"],
        Timeline: ["22.06.23", "23.06.23", "24.06.23"]
    },
    "news.html": {
        News: ["Experiences", "Footprints", "Festival Life", "Beyond the Festival"],
        Countdown: ["78:13:21:34"]
    }
};

// Quadratic easing function
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// Function to generate filters in HTML
function generateFiltersHTML(filters) {
    const filtersContainer = document.querySelector('.filters');
    filtersContainer.innerHTML = ''; // Clear existing content

    for (const [category, tags] of Object.entries(filters)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.textContent = category;
        filtersContainer.appendChild(categoryDiv);

        if (category === "Countdown") {
            const countdownDiv = document.createElement('div');
            countdownDiv.className = 'timeline-bar';

            const timelineDiv = document.createElement('div');
            timelineDiv.className = 'timeline';

            const countdownText = document.createElement('div');
            countdownText.textContent = tags[0]; // Assuming only one countdown value
            timelineDiv.appendChild(countdownText);
            countdownDiv.appendChild(timelineDiv);

            filtersContainer.appendChild(countdownDiv);
        } else {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'tags';

            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.setAttribute('data-category', category.toLowerCase());
                tagElement.setAttribute('data-tag', tag);
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });

            filtersContainer.appendChild(tagsContainer);
        }
    }
}

// Function to activate a filter tag
export function activateTag(tagElement) {
    console.log("activateTag called for:", tagElement);
    const isActive = tagElement.classList.contains('active');
    const category = tagElement.getAttribute('data-category');
    
    // Deactivate other tags in the same category
    const otherTags = document.querySelectorAll(`.tag[data-category="${category}"]`);
    otherTags.forEach(tag => tag.classList.remove('active'));

    // Toggle the clicked tag if it was not active
    if (!isActive) {
        tagElement.classList.add('active');
    }

    console.log("Tag active state:", tagElement.classList.contains('active'));
    // Apply filters after activating the tag
    applyFilters();
}

export function activateTags(tags) {
    console.log("activateTags called with:", tags);
    const tagElements = document.querySelectorAll('.filters .tag');
    tagElements.forEach(tagElement => {
        const tagCategory = tagElement.getAttribute('data-category');
        const tagValue = tagElement.getAttribute('data-tag');

        if (tags.includes(tagValue)) {
            const categoryTags = document.querySelectorAll(`.filters .tag[data-category="${tagCategory}"]`);
            categoryTags.forEach(categoryTag => {
                categoryTag.classList.remove('active');
            });

            tagElement.classList.add('active');
        }
    });

    applyFilters();
}

// Function to apply filters to the Matter.js world
export function applyFilters() {
    const activeTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));
    console.log("Active tags:", activeTags);

    if (activeTags.length === 0) {
        // Show all circles if no tags are active
        allCircles.forEach(circle => {
            if (!Composite.allBodies(world).includes(circle)) {
                Composite.add(world, circle);
                animateBodyAppearance(circle);
            }
        });
    } else {
        allCircles.forEach(circle => {
            const isActive = activeTags.every(tag => circle.tags.includes(tag));
            console.log("Circle:", circle, "Is active:", isActive);
            if (isActive) {
                if (!Composite.allBodies(world).includes(circle)) {
                    Composite.add(world, circle);
                    animateBodyAppearance(circle);
                }
            } else {
                animateBodyDisappearance(circle);
            }
        });
    }
}

export function restorePreviousActiveTags() {
    console.log("restorePreviousActiveTags called");
    const allTags = document.querySelectorAll('.tag');
    allTags.forEach(tag => {
        tag.classList.remove('active');
        if (previousActiveTags.includes(tag.getAttribute('data-tag'))) {
            tag.classList.add('active');
        }
    });
    applyFilters();
}

// Function to animate the body's appearance
export function animateBodyAppearance(circle) {
    const duration = 550; // Duration in ms
    const maxRadius = circle.originalRadius; // Target radius
    const startRadius = circle.circleRadius;
    const startTime = Date.now();

    // Lock the angle to prevent rotation
    Body.setAngle(circle, 0);
    circle.isStatic = false;
    circle.inertia = Infinity;

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
        Body.scale(circle, scale, scale);

        // Update the sprite scaling
        circle.render.sprite.xScale = circle.originalXScale * easedProgress;
        circle.render.sprite.yScale = circle.originalYScale * easedProgress;

        if (progress < 1) {
            requestAnimationFrame(grow);
        } else {
            // Ensure the circle is exactly the original size
            circle.circleRadius = maxRadius;
            Body.scale(circle, maxRadius / circle.circleRadius, maxRadius / circle.circleRadius);
            circle.render.sprite.xScale = circle.originalXScale;
            circle.render.sprite.yScale = circle.originalYScale;

            // Lock the angle to prevent rotation
            Body.setAngle(circle, 0);
            circle.isStatic = false;
            circle.inertia = Infinity;
            
            if (circle.textElement) {
                circle.textElement.style.transform = 'scale(1)';
                updateTextPosition(circle); // Final position update
            }
            circle.isStatic = false;
            circle.inertia = Infinity;
        }
    }

    requestAnimationFrame(grow);
}

// Function to animate the body's disappearance
export function animateBodyDisappearance(circle) {
    const duration = 450; // Duration in ms
    const minRadius = 1; // Minimum radius before removing the body
    const startRadius = circle.circleRadius;
    const startTime = Date.now();

    circle.isStatic = true;

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

// Event listener for filters
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1);
    const filters = filterDefinitions[currentPage];
    if (filters) {
        generateFiltersHTML(filters);
    }

    // Remove any existing listeners
    const filtersElement = document.querySelector('.filters');
    const newFiltersElement = filtersElement.cloneNode(true);
    filtersElement.parentNode.replaceChild(newFiltersElement, filtersElement);

    // Add event listener for tag activation
    newFiltersElement.addEventListener('click', (event) => {
        console.log("Tag clicked:", event.target);
        if (event.target.classList.contains('tag')) {
            activateTag(event.target);
        }
    });
});


