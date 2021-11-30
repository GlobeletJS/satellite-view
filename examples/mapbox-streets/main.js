import * as yawgl from "yawgl";
import { initMap } from "./map.js";
import * as satelliteView from "../../";

const radius = 6371;

export function main() {
  const canvas = document.getElementById("globe");
  const context = yawgl.initContext(canvas);

  initMap(context)
    .then(map => setup(map, context))
    .catch(console.log);
}

function setup(map, context) {
  let requestID;
  const camPosition = new Float64Array(3);

  // Get links to lon/lat/alt inputs and display div
  const coordInput = document.getElementById("coordInput");

  const view = yawgl.initView(context.gl.canvas, 25.0);

  const renderer = satelliteView.init({
    context,
    globeRadius: radius,
    map: map.texture,
    flipY: false,
    units: "degrees",
  });

  coordInput.addEventListener("input", getCoords, false);
  getCoords();

  function getCoords() {
    const coords = coordInput.elements;
    camPosition[0] = coords["lon"].value;
    camPosition[1] = coords["lat"].value;
    camPosition[2] = coords["alt"].value;

    // Start a rendering loop. Cancel running loops to avoid memory leaks
    cancelAnimationFrame(requestID);
    requestID = requestAnimationFrame(animate);
  }

  function animate() {
    view.changed();
    map.draw(camPosition, radius, view);
    renderer.draw(camPosition, view.maxRay, true);

    if (map.loaded() < 1.0) requestAnimationFrame(animate);
  }
}
