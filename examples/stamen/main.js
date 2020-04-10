'use strict';

import { initView } from 'yawgl';
import { initMaps } from "./map.js";
import * as satelliteView from "../../dist/satellite-view.bundle.js";
const degrees = 180.0 / Math.PI;

const mapParams = {
  tileSize: 256,
  maxZoom: 23,
  width: 1024,
  height: 1024,
}
const radius = 6371;

export function main() {
  var maps, requestID;
  const camPosition = new Float64Array(3);

  // Get links to lon/lat/alt inputs and display div
  const coordInput = document.getElementById("coordInput");
  const container = document.getElementById("globe");
  const view = initView(container, 25.0);

  // Setup coordinates interaction
  maps = initMaps(mapParams);

  const renderer = satelliteView.init({
    container: container, 
    globeRadius: radius,
    map: maps.textures,
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
    maps.setPosition(camPosition, radius, view);
    maps.draw();
    renderer.draw(camPosition, view.maxRay, true);

    if (maps.loaded() < 1.0) requestAnimationFrame(animate);
  }
}
