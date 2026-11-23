/** Keep application sources embedded for debugging. Dependencies resolve through their source paths. */
export function authoredSourcemaps() {
  return {
    name: 'authored-sourcemaps',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [key, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset') continue;
        if (asset.fileName.endsWith('.css')) {
          delete bundle[key];
          continue;
        }
        if (!asset.fileName.endsWith('.js.map')) continue;
        const map = JSON.parse(String(asset.source));
        map.sourcesContent = map.sourcesContent.map((content, index) =>
          map.sources[index].includes('/node_modules/') ? null : content);
        asset.source = JSON.stringify(map);
      }
    }
  };
}
