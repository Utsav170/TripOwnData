const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();

const excelFilePath = './ga.xlsx';
const databaseFilePath = './db.db';

const workbook = xlsx.readFile(excelFilePath);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

const db = new sqlite3.Database(databaseFilePath);

db.serialize(() => {
  // Drop the table if it already exists
  db.run('DROP TABLE IF EXISTS cities');

  // Create a new table
  db.run('CREATE TABLE cities (id INTEGER PRIMARY KEY, name TEXT, address TEXT, lat TEXT, long TEXT, description TEXT, symbolName TEXT, cost TEXT, closedWeek TEXT, timeFrom TEXT, timeTill TEXT, accessibility TEXT, interest TEXT, additional TEXT)');

  // Prepare the insert statement
  const insertStmt = db.prepare('INSERT INTO cities (name, address, lat, long, description, symbolName, cost, closedWeek, timeFrom, timeTill, accessibility, interest, additional) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  jsonData.forEach((row, idx) => {
    if (idx === 0) return;
    const [, , name, address, lat, long, description, symbolName, cost, closedWeek, timeFrom, timeTill, accessibility, interest, additional] = row;

    insertStmt.run(name, address, lat, long, description, symbolName, cost, closedWeek, timeFrom, timeTill, accessibility, interest, additional);
  });

  insertStmt.finalize();
  db.close();
});

console.log('Data inserted successfully!');
