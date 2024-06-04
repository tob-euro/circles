import { Engine, Render, Runner, Composite, Mouse, MouseConstraint, Events, Vector, Bounds } from 'matter-js';

export const engine = Engine.create();
export const world = engine.world;
engine.gravity.y = false;

export const canvas = document.getElementById('matterCanvas');

export function setCanvasDPI(canvas) {
    const context = canvas.getContext('2d');
    const devicePixelRatio = window.devicePixelRatio || 1;
    const backingStoreRatio = context.webkitBackingStorePixelRatio ||
                              context.mozBackingStorePixelRatio ||
                              context.msBackingStorePixelRatio ||
                              context.oBackingStorePixelRatio ||
                              context.backingStorePixelRatio || 1;
    const ratio = devicePixelRatio / backingStoreRatio;

    if (devicePixelRatio !== backingStoreRatio) {
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = `${oldWidth}px`;
        canvas.style.height = `${oldHeight}px`;

        context.scale(ratio, ratio);
    }
}

setCanvasDPI(canvas);

export const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: "transparent",
        wireframes: false,
        showAngleIndicator: false,
        pixelRatio: window.devicePixelRatio // This ensures the correct pixel ratio
    }
});

Render.run(render);

export const mouse = Mouse.create(render.canvas);
export const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.00075,
        render: {
            visible: false
        }
    }
});
Composite.add(world, mouseConstraint);

export const viewportCentre = {
    x: render.options.width * 0.5,
    y: render.options.height * 0.5
};

export let boundsScaleTarget = 0.5;
export let boundsScale = {
    x: 1,
    y: 1
};

export let isZooming = false;

Events.on(render, 'beforeRender', function() {
    if (isZooming) return;

    var translate;

    var scaleFactor = (mouse.wheelDelta * -0.035) || 0;
    if (scaleFactor !== 0) {
        if ((scaleFactor < 0 && boundsScale.x >= 0.6) || (scaleFactor > 0 && boundsScale.x <= 1.4)) {
            boundsScaleTarget += scaleFactor;
            boundsScaleTarget = Math.min(boundsScaleTarget, 1);
        }
    }

    if (Math.abs(boundsScale.x - boundsScaleTarget) > 0.01) {
        scaleFactor = (boundsScaleTarget - boundsScale.x) * 0.2;
        boundsScale.x += scaleFactor;
        boundsScale.y += scaleFactor;

        render.bounds.max.x = render.bounds.min.x + render.options.width * boundsScale.x;
        render.bounds.max.y = render.bounds.min.y + render.options.height * boundsScale.y;

        translate = {
            x: render.options.width * scaleFactor * -0.5,
            y: render.options.height * scaleFactor * -0.5
        };

        Bounds.translate(render.bounds, translate);

        Mouse.setScale(mouse, boundsScale);
        Mouse.setOffset(mouse, render.bounds.min);
    }

    var deltaCentre = Vector.sub(mouse.absolute, viewportCentre),
        centreDist = Vector.magnitude(deltaCentre);

    if (centreDist > 100) {
        var direction = Vector.normalise(deltaCentre),
            speed = Math.min(10, Math.pow(centreDist - 50, 2) * 0.0002);

        translate = Vector.mult(direction, speed);

        if (render.bounds.min.x + translate.x < 0) translate.x = 0 - render.bounds.min.x;
        if (render.bounds.min.y + translate.y < 0) translate.y = 0 - render.bounds.min.y;
        if (render.bounds.max.x + translate.x > window.innerWidth) translate.x = window.innerWidth - render.bounds.max.x;
        if (render.bounds.max.y + translate.y > window.innerHeight) translate.y = window.innerHeight - render.bounds.max.y;

        Bounds.translate(render.bounds, translate);

        Mouse.setOffset(mouse, render.bounds.min);
    }
});

export function setupEngine() {
    Runner.run(engine);
    Render.run(render);
}