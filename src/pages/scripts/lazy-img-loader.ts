window.addEventListener('load', () => {
	document.querySelectorAll('img[data-src]')
		.forEach(img => img.setAttribute('src', img.getAttribute('data-src')));
}, false);