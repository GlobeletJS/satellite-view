'use strict';

import * as yawgl from 'yawgl';
import { initMap } from "./map.js";
import * as satelliteView from "../../dist/satellite-view.bundle.js";
const degrees = 180.0 / Math.PI;

const radius = 6371;

export function main() {
  initMap().then(setup).catch(console.log);
}

function setup(map) {
  var requestID;
  const camPosition = new Float64Array(3);

  // Get links to lon/lat/alt inputs and display div
  const coordInput = document.getElementById("coordInput");

  const container = document.getElementById("globe");
  const view = yawgl.initView(container, 25.0);

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    "width": "100%",
    "height": "100%",
    "display": "inline-block",
    "position": "absolute",
    "top": 0,
    "left": 0,
    "z-index": 0,
  });
  container.appendChild(canvas);
  const gl = yawgl.getExtendedContext(canvas);

  const renderer = satelliteView.init({
    gl,
    globeRadius: radius,
    map: map.texture,
  });

  coordInput.addEventListener("input", getCoords, false);
  getCoords();

  function getCoords() {
    let coords = coordInput.elements;
    camPosition[0] = coords["lon"].value / degrees;
    camPosition[1] = coords["lat"].value / degrees;
    camPosition[2] = coords["alt"].value;

    // Start a rendering loop. Cancel running loops to avoid memory leaks
    cancelAnimationFrame(requestID);
    requestID = requestAnimationFrame(animate);
  }

  function animate(time) {
    let resized = view.changed();
    map.setPosition(camPosition, radius, view);
    map.draw();
    renderer.draw(camPosition, view.maxRay, true);

    if (map.loaded() < 1.0) requestAnimationFrame(animate);
  }
}
