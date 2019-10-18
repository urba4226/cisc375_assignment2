// Built-in Node.js modules
var fs = require('fs')
var path = require('path')

// NPM modules
var express = require('express')
var sqlite3 = require('sqlite3')


var public_dir = path.join(__dirname, 'public');
var template_dir = path.join(__dirname, 'templates');
var db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

var app = express();
var port = 8000;

// open usenergy.sqlite3 database
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

app.use(express.static(public_dir));


// GET request handler for '/'
app.get('/', (req, res) => {
    ReadFile(path.join(template_dir, 'index.html')).then((template) => {
        let response = template;
        // modify `response` here
        let query = "SELECT sum(coal) as coal_sum, ";
        query = query + "sum(natural_gas) as natural_gas_sum, ";
        query = query + "sum(nuclear) as nuclear_sum, ";
        query = query + "sum(petroleum) as petroleum_sum, ";
        query = query + "sum(renewable) as renewable_sum FROM Consumption WHERE year=? GROUP BY year";
        db.get(query, ["2017"], (err, rows) =>
        {
            if (err)
            {
                console.log("Error retrieving data from database");
            }   //if
            else
            {
                console.log("Sum of coal: ", rows.coal_sum);
                console.log("Sum of natural_gas: ", rows.natural_gas_sum);
                console.log("Sum of nuclear: ", rows.nuclear_sum);
                console.log("Sum of petroleum: ", rows.petroleum_sum);
                console.log("Sum of renewable: ", rows.renewable_sum);

                // Modify values of variables at the top of the file:
                response = response.replace("!!!coal_count!!!", rows.coal_sum);
                response = response.replace("!!!natural_gas_count!!!", rows.natural_gas_sum);
                response = response.replace("!!!nuclear_count!!!", rows.nuclear_sum);
                response = response.replace("!!!petroleum_count!!!", rows.petroleum_sum);
                response = response.replace("!!!renewable_count!!!", rows.renewable_sum);

                //Modify values for the table at the bottom of the file:
                data = "";
                data = data + "<td></td>\n"; //State
                data = data + "<td></td>\n"; //Coal
                data = data + "<td></td>\n"; //Natural_gas
                data = data + "<td></td>\n"; //Nuclear
                data = data + "<td></td>\n"; //Petroleum
                data = data + "<td></td>\n"; //Renewable
                response = response.replace("<!-- Data to be inserted here -->", data);
            }   //else
        });
        console.log(response);

        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    ReadFile(path.join(template_dir, 'year.html')).then((template) => {
        let response = template;
        // modify `response` here
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    ReadFile(path.join(template_dir, 'state.html')).then((template) => {
        let response = template;
        // modify `response` here
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        // modify `response` here
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

function ReadFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data.toString());
            }
        });
    });
}

function Write404Error(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Error: file not found');
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}


var server = app.listen(port);
