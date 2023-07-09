const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const db = new sqlite3.Database('db.db');
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('form');
});

app.post('/submit', (req, res) => {
  const { cost, date, from_time, to_time, accessibility, interest } = req.body;
  const dayOfWeek = new Date(date).getDay();

  const isAccessible = accessibility === 'true' ? 'Yes' : 'No';

  const query = `SELECT * FROM cities WHERE cost = ? AND ',' || closedWeek || ',' NOT LIKE '%,' || ? || ',%' AND accessibility = ? AND timeFrom = ? AND timeTill = ?`;

  db.all(
    query,
    [cost, dayOfWeek, isAccessible, from_time, to_time],
    (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).send('Internal Server Error');
        return;
      }

      console.log("results[0]", results);

      if (!results.length) return res.status(400).send('No results found');

      const selectedInterests = Array.isArray(interest) ? interest : [interest];

      const filteredResults = results.filter(result => {
        const dbInterests = result.interest.split(',').map(interest => interest.trim());
        return selectedInterests.some(selectedInterest => dbInterests.includes(selectedInterest));
      });

      if (filteredResults.length === 0) {
        return res.status(400).send('No results found for the selected interests');
      }

      const csvWriter = createCsvWriter({
        path: 'output.csv',
        header: Object.keys(filteredResults[0]).map(column => ({ id: column, title: column }))
      });

      csvWriter.writeRecords(filteredResults)
        .then(() => {
          console.log('CSV file created successfully!');
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=output.csv');
          res.download('output.csv');
        })
        .catch(error => {
          console.error('Error creating CSV file:', error);
          res.status(500).send('Internal Server Error');
        });
    }
  );
});

app.listen(3003, () => {
  console.log('Server is running on port 3003');
});
