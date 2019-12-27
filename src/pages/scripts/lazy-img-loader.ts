async function supportsWebp():Promise<boolean> {
	const img = new Image();
	return new Promise(resolve => {
		img.onload = function () {resolve((img.width > 0) && (img.height > 0));};
		img.onerror = function () {resolve(false);};
		img.src = "data:image/webp;base64," + "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
	});
}

(async () => {
	const supportsWebpKnownPromise = supportsWebp();
	window.addEventListener('load', () => {
		supportsWebpKnownPromise.then(supportsWebpKnown => {
			// console.debug('document loaded, webp supported: ' + supportsWebpKnown);
			document.querySelectorAll('img[data-src]')
				.forEach(img => img.setAttribute('src',
					img.hasAttribute('data-src-webp') && supportsWebpKnown
						? img.getAttribute('data-src-webp')
						: img.getAttribute('data-src')));
		});
	}, false);
})();