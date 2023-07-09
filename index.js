// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Create a connection to the SQLite database
const db = new sqlite3.Database('your-database.db');

// Create an Express application
const app = express();

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Use body-parser middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Define a route to render the form
app.get('/', (req, res) => {
  res.render('form');
});

// Define a route to handle form submission
app.post('/submit', (req, res) => {
  const { cost, date, from_time, to_time, accessibility } = req.body;

  // Get the weekday from the provided date and map it to a number
  const dayOfWeek = new Date(date).getDay(); // 0 for Sunday, 1 for Monday, and so on

  // Query the database to filter data
  const query = `SELECT * FROM your_table WHERE cost = ? AND ? IN (SELECT CAST(value AS UNSIGNED) FROM (
                  SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(Closed_weekdays, ',', n.n), ',', -1)) AS value
                  FROM your_table
                  JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) n
                  WHERE n.n <= 1 + (LENGTH(Closed_weekdays) - LENGTH(REPLACE(Closed_weekdays, ',', ''))))
                AS closed_weekdays) AND from_time = ? AND to_time = ? AND accessibility = ?`;

  // Execute the query with parameterized values
  db.all(query, [cost, dayOfWeek, from_time, to_time, accessibility], (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).send('Internal Server Error');
      return;
    }

    // Define CSV writer configuration
    const csvWriter = createCsvWriter({
      path: 'output.csv',
      header: Object.keys(results[0]).map(column => ({ id: column, title: column }))
    });

    // Write data to CSV file
    csvWriter.writeRecords(results)
      .then(() => {
        console.log('CSV file created successfully!');
        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=output.csv');
        // Send the file as response
        res.download('output.csv');
      })
      .catch(error => {
        console.error('Error creating CSV file:', error);
        res.status(500).send('Internal Server Error');
      });
  });
});


// Start the server
app.listen(3003, () => {
  console.log('Server is running on port 3003');
});
