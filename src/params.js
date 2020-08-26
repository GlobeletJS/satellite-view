import * as yawgl from 'yawgl';

export function setParams(userParams) {
  const params = {};

  params.getPixelRatio = (userParams.pixelRatio)
    ? () => userParams.pixelRatio
    : () => window.devicePixelRatio;
  // NOTE: getPixelRatio() returns the result of an object getter,
  //       NOT the property value at the time of getPixelRatio definition
  //  Thus, getPixelRatio will mirror any changes in the parent object

  params.globeRadius = userParams.globeRadius || 6371;

  params.maps = Array.isArray(userParams.map)
    ? userParams.map
    : [userParams.map];
  params.nMaps = params.maps.length;

  if (userParams.gl instanceof WebGLRenderingContext) {
    params.gl = userParams.gl;
  } else {
    const canvas = addCanvas(userParams.container);
    params.gl = yawgl.getExtendedContext(canvas);
  }

  return params;
}

// Fill a supplied DIV with a background Canvas for rendering
function addCanvas(parentElement) {
  const child = document.createElement('canvas');

  Object.assign(child.style, {
    "width": "100%",
    "height": "100%",
    "display": "inline-block",
    "position": "absolute",
    "top": 0,
    "left": 0,
    "z-index": 0,
  });

  parentElement.appendChild(child);
  return child;
}
