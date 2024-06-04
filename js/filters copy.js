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
const generateFiltersHTML = filters => {
    const filtersContainer = document.querySelector('.filters');
    filtersContainer.innerHTML = '';

    Object.entries(filters).forEach(([category, tags]) => {
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
    });
};

// Function to activate a filter tag
export const activateTag = tagElement => {
    const category = tagElement.getAttribute('data-category');
    
    document.querySelectorAll(`.tag[data-category="${category}"]`).forEach(tag => {
        if (tag !== tagElement) tag.classList.remove('active');
    });

    tagElement.classList.toggle('active');
    applyFilters();
};

export const activateTags = tags => {
    document.querySelectorAll('.filters .tag').forEach(tagElement => {
        const tagCategory = tagElement.getAttribute('data-category');
        const tagValue = tagElement.getAttribute('data-tag');

        if (tags.includes(tagValue)) {
            document.querySelectorAll(`.filters .tag[data-category="${tagCategory}"]`).forEach(categoryTag => {
                categoryTag.classList.remove('active');
            });

            tagElement.classList.add('active');
        }
    });

    applyFilters();
};

// Function to apply filters to the Matter.js world
export const applyFilters = () => {
    const activeTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));
    console.log("Active tags:", activeTags);

    allCircles.forEach(circle => {
        const isActive = activeTags.length === 0 || activeTags.every(tag => circle.tags.includes(tag));
        console.log("Circle:", circle, "Is active:", isActive);
        if (isActive && !Composite.allBodies(world).includes(circle)) {
            Composite.add(world, circle);
            animateBodyAppearance(circle);
        } else if (!isActive) {
            animateBodyDisappearance(circle);
        }
    });
};

export const restorePreviousActiveTags = () => {
    document.querySelectorAll('.tag').forEach(tag => {
        tag.classList.remove('active');
        if (previousActiveTags.includes(tag.getAttribute('data-tag'))) tag.classList.add('active');
    });
    applyFilters();
};

// Function to animate the body's appearance
export const animateBodyAppearance = circle => {
    const duration = 550;
    const maxRadius = circle.originalRadius;
    const startRadius = circle.circleRadius;
    const startTime = Date.now();

    Body.setAngle(circle, 0);
    circle.isStatic = false;
    circle.inertia = Infinity;

    if (circle.textElement) {
        circle.textElement.style.display = 'block';
        circle.textElement.classList.remove('hidden');
        circle.textElement.style.transform = `translate(-50%, -50%)`;
    }

    const grow = () => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easedProgress = easeInOutQuad(progress);

        const newRadius = startRadius + (maxRadius - startRadius) * easedProgress;
        const scale = newRadius / circle.circleRadius;
        Body.scale(circle, scale, scale);

        circle.render.sprite.xScale = circle.originalXScale * easedProgress;
        circle.render.sprite.yScale = circle.originalYScale * easedProgress;

        if (progress < 1) {
            requestAnimationFrame(grow);
        } else {
            circle.circleRadius = maxRadius;
            Body.scale(circle, maxRadius / circle.circleRadius, maxRadius / circle.circleRadius);
            circle.render.sprite.xScale = circle.originalXScale;
            circle.render.sprite.yScale = circle.originalYScale;

            Body.setAngle(circle, 0);
            circle.isStatic = false;
            circle.inertia = Infinity;

            if (circle.textElement) {
                circle.textElement.style.transform = 'scale(1)';
                updateTextPosition(circle);
            }
        }
    };

    requestAnimationFrame(grow);
};

// Function to animate the body's disappearance
export const animateBodyDisappearance = circle => {
    const duration = 450;
    const minRadius = 1;
    const startRadius = circle.circleRadius;
    const startTime = Date.now();

    circle.isStatic = true;

    const shrink = () => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easedProgress = easeInOutQuad(1 - progress);

        const newRadius = minRadius + (startRadius - minRadius) * easedProgress;
        const scale = newRadius / circle.circleRadius;
        Body.scale(circle, scale, scale);

        circle.render.sprite.xScale = circle.originalXScale * easedProgress;
        circle.render.sprite.yScale = circle.originalYScale * easedProgress;

        if (circle.textElement) {
            circle.textElement.style.transform = `scale(${easedProgress})`;
            circle.textElement.classList.add('hidden');
            updateTextPosition(circle);
        }

        if (progress < 1) {
            requestAnimationFrame(shrink);
        } else {
            Composite.remove(world, circle);
            if (circle.textElement) circle.textElement.style.display = 'none';
        }
    };

    requestAnimationFrame(shrink);
};

// Event listener for filters
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    const filters = filterDefinitions[currentPage];
    if (filters) generateFiltersHTML(filters);

    document.querySelector('.filters').addEventListener('click', event => {
        if (event.target.classList.contains('tag')) activateTag(event.target);
    });
});
