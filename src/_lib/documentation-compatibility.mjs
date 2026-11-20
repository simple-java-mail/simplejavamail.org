const names = { smime: 'S/MIME', openpgp: 'OpenPGP', mime: 'MIME', eml: 'EML', smtp: 'SMTP', dsn: 'DSN', id: 'ID', cid: 'CID', html: 'HTML', url: 'URL', urls: 'URLs', crlf: 'CRLF', icalendar: 'iCalendar', vevent: 'vEvent', outlook: 'Outlook' };

export function featuresCompatibility(targets) {
  if (!targets || typeof targets !== 'object' || Array.isArray(targets)) throw new Error('Features compatibility requires the current legacy mapping');
  return {
    targets,
    links: Object.entries(targets).map(([id, href]) => ({
      id, href,
      label: id.replace(/^section-/, '').split('-').map((word, index) => names[word] || (index === 0 ? word[0].toUpperCase() + word.slice(1) : word)).join(' '),
    })),
  };
}
