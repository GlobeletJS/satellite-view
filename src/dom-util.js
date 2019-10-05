// Fill a supplied DIV with a background Canvas for rendering
export function addCanvas(parentElement) {
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
