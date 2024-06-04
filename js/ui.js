import { Events, Vector, Bounds, Body } from 'matter-js';
import { render, mouseConstraint, viewportCentre, isZooming, boundsScale, boundsScaleTarget } from './engine.js';
import { getCircleAtPosition } from './circles.js';

export function createCircleDOMElement(circle) {
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

export function updateTextPosition(circle) {
    if (circle.textElement) {
        const { x, y } = circle.position;

        const scaledX = (x - render.bounds.min.x) / boundsScale.x;
        const scaledY = (y - render.bounds.min.y) / boundsScale.y;

        circle.textElement.style.left = `${scaledX}px`;
        circle.textElement.style.top = `${scaledY}px`;
        circle.textElement.style.transform = 'translate(-50%, -50%)';
    }
}

Events.on(engine, 'afterUpdate', function() {
    allCircles.forEach(circle => {
        updateTextPosition(circle);
    });
});

export function animateBodyAppearance(body) {
    // Your animation logic here
}

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

    previousActiveTags = Array.from(document.querySelectorAll('.tag.active')).map(tag => tag.getAttribute('data-tag'));

    activateTags(clickedCircle.tags);

    document.getElementById('close-info-menu').addEventListener('click', closeInfoMenu);
}

export function zoomToCircle(targetCircle) {
    isZooming = true;

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
    let previousActiveTags = [];
    let isDragging = false;
    let startPos = { x: 0, y: 0 };
    const dragThreshold = 5;

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

    function activateTags(tags) {
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
        isZooming = false;

        restorePreviousActiveTags();
    });
    document.getElementById('info-menu').appendChild(closeButton);

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
}
