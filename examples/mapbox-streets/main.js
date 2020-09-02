'use strict';

import * as yawgl from 'yawgl';
import { initMap } from "./map.js";
import * as satelliteView from "../../dist/satellite-view.bundle.js";
const degrees = 180.0 / Math.PI;

const radius = 6371;

export function main() {
  const canvas = document.getElementById("globe");
  const gl = yawgl.getExtendedContext(canvas);

  initMap(gl)
    .then(map => setup(map, gl))
    .catch(console.log);
}

function setup(map, gl) {
  var requestID;
  const camPosition = new Float64Array(3);

  // Get links to lon/lat/alt inputs and display div
  const coordInput = document.getElementById("coordInput");

  const view = yawgl.initView(gl.canvas, 25.0);

  const renderer = satelliteView.init({
    gl,
    globeRadius: radius,
    map: map.texture,
    flipY: false,
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
    map.draw(camPosition, radius, view);
    renderer.draw(camPosition, view.maxRay, true);

    if (map.loaded() < 1.0) requestAnimationFrame(animate);
  }
}
