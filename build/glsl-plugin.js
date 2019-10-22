// Plugin for .glsl files: import as template literals
export function glsl() {
  return {
    transform( source, id ) {
      // Confirm filename extension is .glsl
      if ( /\.glsl$/.test( id ) === false ) return;

      // Export the code as a template literal
      const code = "export default `" + source + "`";

      return {
        code: code,
        map: { mappings: '' }, // No map
      };
    }
  };
}
