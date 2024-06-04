import { Events, Body, Render } from 'matter-js';
import { render, mouseConstraint, state } from './world.js';
import { getCircleAtPosition, allCircles } from './circles.js';
import { restorePreviousActiveTags, activateTags, setPreviousActiveTags } from './filters.js';

let clickedCircle = null;
let isDragging = false;
let startPos = { x: 0, y: 0 };
const dragThreshold = 5; // Adjust the threshold for what constitutes a drag

export function showInfoMenu(clickedCircle) {
    const infoMenu = document.getElementById('info-menu');
    const infoContent = document.getElementById('info-content');

    Body.setStatic(clickedCircle, true);
    clickedCircle.textElement.classList.add('hidden');

    infoContent.innerHTML = clickedCircle.infoContent;
    infoMenu.classList.add('show');

    const newElement = document.createElement('div');
    newElement.id = 'clicked-circle-element';
    newElement.className = 'clicked-circle';
    newElement.style.backgroundImage = `url(${clickedCircle.render.sprite.texture})`;

    const contentElement = document.createElement('div');
    contentElement.className = 'clicked-circle-content';
    contentElement.innerHTML = clickedCircle.infoContent;
    newElement.appendChild(contentElement);

    document.body.appendChild(newElement);

    setPreviousActiveTags(Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag')));

    activateTags(clickedCircle.tags);


}

// Constants for zoom target
const ZOOM_TARGET_SCALE = 4; // The scale you want the circle to fill
const ZOOM_DURATION = 1000; // Duration of the zoom in milliseconds
const TARGET_POSITION = { x: window.innerWidth / 7, y: window.innerHeight / 1.5 }; // Target position to center the circle

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

export function zoomToCircle(targetCircle) {
    state.isZooming = true;

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
            showInfoMenu(targetCircle);
        }
    }

    requestAnimationFrame(animateZoom);
}

export function setupUI() {
    let clickedCircle = null;
    let isDragging = false;
    let startPos = { x: 0, y: 0 };
    const dragThreshold = 5;

    Events.on(mouseConstraint, 'mouseup', function(event) {
        const mousePosition = event.mouse.position;
        const circle = getCircleAtPosition(mousePosition);
        if (circle && circle.mouseDown) {
            circle.mouseDown = false;
            if (!isDragging) {
                zoomToCircle(circle);
            }
        }
    });

    Events.on(mouseConstraint, 'mousedown', function(event) {
        const mousePosition = event.mouse.position;
        const circle = getCircleAtPosition(mousePosition);
        if (circle) {
            startPos = { x: mousePosition.x, y: mousePosition.y };
            isDragging = false;
            circle.mouseDown = true;
        }
    });

    Events.on(mouseConstraint, 'mousemove', function(event) {
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

    Events.on(mouseConstraint, 'mouseup', function(event) {
        const mousePosition = event.mouse.position;
        const circle = getCircleAtPosition(mousePosition);
        if (circle && circle.mouseDown) {
            circle.mouseDown = false;
            if (!isDragging) {
                toggleInfoMenu(circle);
            }
        }
    });

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
        state.isZooming = false;

        restorePreviousActiveTags();
    });
    document.getElementById('info-menu').appendChild(closeButton);
}
