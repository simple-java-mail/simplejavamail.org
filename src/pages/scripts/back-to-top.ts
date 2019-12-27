document.querySelectorAll('.section-link + h2, .section-link + h3')
	.forEach(header => {
		const space = document.createElement('span');
		space.innerHTML = '&nbsp;&nbsp;&nbsp;';
		header.appendChild(space);

		const anchor = document.createElement('a');
		anchor.innerText = 'back';
		anchor.className = 'link_top';
		anchor.href = '#navigation';
		header.appendChild(anchor);
	});