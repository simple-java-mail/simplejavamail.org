document.querySelectorAll('.section-link + h2, .section-link + h3, h2.with-back-to-top')
    .forEach(function (header) {
    var space = document.createElement('span');
    space.innerHTML = '&nbsp;&nbsp;&nbsp;';
    header.appendChild(space);
    var anchor = document.createElement('a');
    anchor.innerText = 'back';
    anchor.className = 'link_top';
    anchor.href = '#navigation';
    header.appendChild(anchor);
});

//# sourceMappingURL=back-to-top.js.map
