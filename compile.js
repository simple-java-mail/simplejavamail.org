const fs = require('fs');
const handlebars = require('handlebars');

const inFile = './report1.hbs';
const outFile = './report1.html';

const data = require('./site1.json');

const source = fs.readFileSync(inFile, 'utf8');
const template = handlebars.compile(source, { strict: true });
const result = template(data);

console.log(result);

fs.writeFileSync(outFile, result);
console.log(`File written to ${outFile}`);
