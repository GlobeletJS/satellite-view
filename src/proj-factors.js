// Maximum latitude for Web Mercator: 85.0113 degrees. Beware rounding!
const maxMercLat = 2.0 * Math.atan( Math.exp(Math.PI) ) - Math.PI / 2.0;

export function getWebMercatorFactors(camLatitude) {
  // Clip latitude to map limits
  var clipLat = Math.min(Math.max(-maxMercLat, camLatitude), maxMercLat);
  var latErr = camLatitude - clipLat;

  // camera exp(Y), for converting delta latitude to delta Y
  var expY = Math.tan( 0.25 * Math.PI + 0.5 * clipLat );

  return [expY, latErr];
}
