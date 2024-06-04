import { Bodies, Composite } from 'matter-js';
import { world, render, boundsScale } from './engine.js';
import { updateTextPosition, createCircleDOMElement, animateBodyAppearance } from './ui.js';

export const allCircles = [];
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

export function addCircle(x, y, radius, textureUrl, text, supText, infoContent, tags) {
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

        animateBodyAppearance(circle);
    });
}

export function getCircleAtPosition(position) {
    return allCircles.find(circle => Matter.Vertices.contains(circle.vertices, position));
}

export function setupCircles() {
    addCircle(0, 550, 50, '../content/images/pic1.jpg', 'Caroline Polachek', 'US', '<h1>Perfume Genius</h1><p>Artist Info Here...</p>', ['Live Concert', 'Vessel Stage']);
    addCircle(150, 500, 50, '../content/images/pic2.jpg', 'FKA Twigs', 'UK', '<h1>Kate NV</h1><p>Artist Info Here...</p>', ['Live Concert', 'Beach Stage']);
    addCircle(300, 700, 50, '../content/images/pic3.jpg', 'Weyes Blood', 'US', '<h1>Weyes Blood</h1><p>Artist Info Here...</p>', ['Art Exhibition', 'Astral Stage']);
    addCircle(350, 400, 50, '../content/images/pic4.jpg', 'Kate NV', 'RU', '<h1>A.G. Cook</h1><p>Artist Info Here...</p>', ['DJ', 'Space Stage']);
    addCircle(450, 450, 50, '../content/images/pic5.jpg', 'Perfume Genius', 'US', '<h1>Caroline Polachek</h1><p>Artist Info Here...</p>', ['Workshop', 'Amphi Stage']);
}