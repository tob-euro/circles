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
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

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
function activateTag(tagElement) {
    const category = tagElement.getAttribute('data-category');
    
    // Deactivate other tags in the same category
    const otherTags = document.querySelectorAll(`.tag[data-category="${category}"]`);
    otherTags.forEach(tag => {
        if (tag !== tagElement) {
            tag.classList.remove('active');
        }
    });

    // Toggle the clicked tag
    tagElement.classList.toggle('active');

    // Apply filters after activating the tag
    applyFilters();
}

// Function to apply filters to the Matter.js world
function applyFilters() {
    const activeTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));

    if (activeTags.length === 0) {
        // If no tags are active, show all circles
        allCircles.forEach(circle => {
            if (!Composite.allBodies(world).includes(circle)) {
                Composite.add(world, circle);
                animateBodyAppearance(circle);
            }
        });
    } else {
        allCircles.forEach(circle => {
            const isActive = circle.tags.some(tag => activeTags.includes(tag));
            if (isActive) {
                if (!Composite.allBodies(world).includes(circle)) {
                    Composite.add(world, circle);
                    animateBodyAppearance(circle);
                }
            } else {
                // Animate the body disappearance
                animateBodyDisappearance(circle);
            }
        });
    }
}

// Function to animate the body's appearance
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
function animateBodyDisappearance(circle) {
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
    const currentPage =  path.substring(path.lastIndexOf('/') + 1);
    const filters = filterDefinitions[currentPage];
    if (filters) {
        generateFiltersHTML(filters);
    }

    // Add event listener for tag activation
    document.querySelector('.filters').addEventListener('click', (event) => {
        if (event.target.classList.contains('tag')) {
            activateTag(event.target);
        }
    });
});