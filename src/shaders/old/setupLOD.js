const nMaps = process.argv[2];

console.log(setupLOD(nMaps));

function setupLOD(nLod) {
  // Define function signature, with pre-defined constant
  var selector = `const int nLod = ${nLod};
vec4 sampleLOD(samplers[${nLod}], coords[${nLod}]) {
  return `;

  // Sample from the highest LOD that includes the coordinate
  for (let i = nLod - 1; i > 0; i--) {
    selector += `inside(coords[${i}])
    ? texture2d(samplers[${i}], coords[${i}])
    : `;
  }
  // Add default to lowest LOD
  selector += `texture2d(samplers[0], coords[0]);`;
  
  // Close the function block
  selector += `
}`

  return selector;
}
