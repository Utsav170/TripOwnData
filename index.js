const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const XlsxPopulate = require('xlsx-populate');

const db = new sqlite3.Database('db.db');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('assets'));

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('form');
});

app.post('/submit', (req, res) => {
  const { cost, date, from_time, to_time, accessibility, interest } = req.body;
  const dayOfWeek = new Date(date).getDay();

  const isAccessible = accessibility === 'true' ? 'Yes' : 'No';

  const query = `SELECT * FROM cities WHERE cost = ? AND ',' || closedWeek || ',' NOT LIKE '%,' || ? || ',%' AND accessibility = ?`;

  db.all(
    query,
    [cost, dayOfWeek, isAccessible],
    (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).send('Internal Server Error');
        return;
      }

      if (!results.length) return res.status(400).send('No results found');

      console.log({results})
      const selectedInterests = Array.isArray(interest) ? interest : [interest];
      const filteredResults = results.filter(result => {
        const dbInterests = result.interest.split(',').map(interest => interest.trim());
        const isTimeInRange = Number(result.timeFrom) <= Number(from_time) && Number(result.timeTill) >= Number(to_time);
        return selectedInterests.some(selectedInterest => dbInterests.includes(selectedInterest)) && isTimeInRange;
      });

      if (filteredResults.length === 0) {
        return res.status(400).send('No results found');
      }

      // Create XLSX file using xlsx-populate
      XlsxPopulate.fromBlankAsync()
        .then(workbook => {
          const sheet = workbook.sheet(0);
          const headers = Object.keys(filteredResults[0]);

          // Write headers
          headers.forEach((header, columnIndex) => {
            sheet.cell(1, columnIndex + 1).value(header);
          });

          // Write data
          filteredResults.forEach((result, rowIndex) => {
            headers.forEach((header, columnIndex) => {
              sheet.cell(rowIndex + 2, columnIndex + 1).value(result[header]);
            });
          });

          // Generate buffer from workbook
          return workbook.outputAsync();
        })
        .then(buffer => {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename=output.xlsx');
          res.send(buffer);
        })
        .catch(error => {
          console.error('Error creating XLSX file:', error);
          res.status(500).send('Internal Server Error');
        });
    }
  );
});

app.listen(3003, () => {
  console.log('Server is running on port 3003');
});
