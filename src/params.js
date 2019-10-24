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
  params.mapWidth = params.maps[0].canvas.width;
  params.mapHeight = params.maps[0].canvas.height;

  params.canvas = addCanvas(userParams.container);

  return params;
}

// Fill a supplied DIV with a background Canvas for rendering
function addCanvas(parentElement) {
  var child = document.createElement('canvas');
  // Could use Object.assign, but not supported by Android Webview?
  setStyles(child, {
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

function setStyles(element, styles) {
  Object.keys(styles).forEach(key => {
    element.style[key] = styles[key];
  });
  return element;
}
