const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const XlsxPopulate = require('xlsx-populate');
const { formatTime } = require('./utils/common');

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

  let query = `SELECT * FROM cities WHERE 1 = 1`;
  const queryParams = [];

  if (cost && cost <= 100) {
    const upperRange = Number(cost) + 20;
    query += ' AND cost >= ? AND cost <= ?';
    queryParams.push(cost, upperRange);
  } else if (cost && cost === 100) {
    query += ' AND cost > 100';
  }

  if (date) {
    query += ' AND \',\' || closedWeek || \',\' NOT LIKE ?';
    queryParams.push(`%,${dayOfWeek},%`);
  }

  if (accessibility === 'true') {
    query += ' AND accessibility = ?';
    queryParams.push(isAccessible);
  }

  db.all(
    query,
    queryParams,
    (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      if (!results.length) return res.status(400).send('No results found');

      let filteredResults = results;

      if (interest) {
        const selectedInterests = Array.isArray(interest) ? interest : [interest];
        filteredResults = results.filter(result => {
          const dbInterests = result.interest.split(',').map(interest => interest.trim());
          return selectedInterests.some(selectedInterest => dbInterests.includes(selectedInterest));
        });
      }

      if (from_time && to_time) {
        filteredResults = filteredResults.filter(result => {
          const isTimeInRange = (
            (Number(from_time) >= Number(result.timeFrom) && Number(from_time) <= Number(result.timeTill)) ||
            (Number(to_time) >= Number(result.timeFrom) && Number(to_time) <= Number(result.timeTill)) ||
            (Number(from_time) <= Number(result.timeFrom) && Number(to_time) >= Number(result.timeTill)) ||
            result.timeFrom === null && result.timeTill === null
          );
          return isTimeInRange;
        });
      }

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
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const closedWeekArray = (result.closedWeek || '').split(',').map(dayIndex => dayNames[Number(dayIndex)].trim());
            const openDaysArray = dayNames.filter((weekday) => !closedWeekArray.includes(weekday));
            const openDays = openDaysArray.join(', ');

            const fromTime = formatTime(result.timeFrom) || '';
            const toTime = formatTime(result.timeTill) || '';

            const description = `Cost: ${result.cost || 'Free'}\n\nOpen Days: ${openDays}\n\nTime: ${result.timeFrom ? `${fromTime} - ${toTime}` : '24/7'}\n\nWheelchair Accessibility: ${result.accessibility}\n\nInterests: ${result.interest}\n\n${result.description}`; // Separate lines for cost, closedWeek, and description

            result.description = description;
  
            headers.forEach((header, columnIndex) => {
              sheet.cell(rowIndex + 2, columnIndex + 1).value(result[header]);
            });
          });
  
          // Generate buffer from workbook
          return workbook.outputAsync();
        })
        .then(buffer => {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename=trip-wishlist.xlsx');
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
