const xlsx = require('xlsx');

const workbook = xlsx.readFile('./links/Juegos_SWITCH.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log(JSON.stringify(rows.slice(0, 5), null, 2));
