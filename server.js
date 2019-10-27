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

//Array of state abbreviations to populate next and prev buttons:
var states = ['AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN',
              'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ',
              'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA',
              'WI', 'WV', 'WY'];


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
                // Modify values of variables at the top of the file:
                response = response.replace("!!!coal_count!!!", rows.coal_sum);
                response = response.replace("!!!natural_gas_count!!!", rows.natural_gas_sum);
                response = response.replace("!!!nuclear_count!!!", rows.nuclear_sum);
                response = response.replace("!!!petroleum_count!!!", rows.petroleum_sum);
                response = response.replace("!!!renewable_count!!!", rows.renewable_sum);

                //Retrieve data for the table at the bottom of the file:
                let query = "SELECT * ";
                query = query + "FROM Consumption WHERE year=? "; 
                query = query + "GROUP BY year, state_abbreviation ";
                query = query + "Order BY state_abbreviation";
                db.all(query, ["2017"], (err, rows) =>
                {
                    if (err)
                    {
                        console.log("Error retrieving data from database");
                    }   //if
                    else
                    {
                        //Modify values for the table at the bottom of the file:
                        let data = "";
                        for (let i = 0; i < rows.length; i++)
                        {
                            data = data + "<tr>\n";
                            data = data + "    <td>" + rows[i].state_abbreviation + "</td>\n"; //State
                            data = data + "    <td>" + rows[i].coal + "</td>\n"; //Coal
                            data = data + "    <td>" + rows[i].natural_gas + "</td>\n"; //Natural_gas
                            data = data + "    <td>" + rows[i].nuclear + "</td>\n"; //Nuclear
                            data = data + "    <td>" + rows[i].petroleum + "</td>\n"; //Petroleum
                            data = data + "    <td>" + rows[i].renewable + "</td>\n"; //Renewable
                            data = data + "</tr>\n";
                        }   //for
                        
                        response = response.replace("<!-- Data to be inserted here -->", data);
                        WriteHtml(res, response);
                    }   //else
                }); //db.all
            }   //else
        }); //db.get

    }).catch((err) => {
        Write404Error(res);
    }); //catch
}); //app.get

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
        let query = "SELECT * ";
        query = query + "FROM Consumption natural join States ";
        query = query + "WHERE state_abbreviation = ? ";
        query = query + "ORDER BY year";
        db.all(query, [req.params.selected_state], (err, rows) =>
        {
            if (err)
            {
                let msg = "Error: could not retrieve data from database";
                Write404Error(res, msg);
            }   //if
            else if (rows.length < 1)
            {
                let msg = "Error: no data for state ";
                msg = msg + req.params.selected_state;
                Write404Error(res, msg);
            }   //else if
            else
            {
                // Modify values of variables at the top of the file:
                let coal_counts = "[" + rows[0].coal;
                let natural_gas_counts = "[" + rows[0].natural_gas;
                let nuclear_counts = "[" + rows[0].nuclear;
                let petroleum_counts = "[" + rows[0].petroleum;
                let renewable_counts = "[" + rows[0].renewable;
                for (let i = 1; i < rows.length; i++)
                {
                    coal_counts = coal_counts + ", " + rows[i].coal;
                    natural_gas_counts = natural_gas_counts + ", " + rows[i].natural_gas;
                    nuclear_counts = nuclear_counts + ", " + rows[i].nuclear;
                    petroleum_counts = petroleum_counts + ", " + rows[i].petroleum;
                    renewable_counts = renewable_counts + ", " + rows[i].renewable;
                }   //for
                coal_counts = coal_counts + "]";
                natural_gas_counts = natural_gas_counts + "]";
                nuclear_counts = nuclear_counts + "]";
                petroleum_counts = petroleum_counts + "]";
                renewable_counts = renewable_counts + "]";

                response = response.replace("!!!state!!!", rows[0].state_abbreviation);
                response = response.replace("!!!coal_counts!!!", coal_counts);
                response = response.replace("!!!natural_gas_counts!!!", natural_gas_counts);
                response = response.replace("!!!nuclear_counts!!!", nuclear_counts);
                response = response.replace("!!!petroleum_counts!!!", petroleum_counts);
                response = response.replace("!!!renewable_counts!!!", renewable_counts);

                //Modify header to include state name:
                response = response.replace("!!!Header!!!", rows[0].state_name);
                //Modify title to include state abbreviation:
                response = response.replace("!!!state_abbreviation!!!", req.params.selected_state);
                //Modify prev and next buttons here
                let index = states.indexOf(req.params.selected_state);
                let prev = (index - 1 + states.length) % states.length;
                let next = (index + 1) % states.length;
                response = response.replace("!!!prev!!!", states[prev]);
                response = response.replace("!!!next!!!", states[next]);
                //Send the proper html when buttons are clicked:
                //NOT DONE YET

                //Modify values for the table at the bottom of the file:
                let data = "";
                for (let i = 0; i < rows.length; i++)
                {
                    let total = rows[i].coal + rows[i].natural_gas + rows[i].nuclear;
                    total = total + rows[i].petroleum + rows[i].renewable;
                    data = data + "<tr>\n";
                    data = data + "    <td>" + rows[i].year + "</td>\n"; //Year
                    data = data + "    <td>" + rows[i].coal + "</td>\n"; //Coal
                    data = data + "    <td>" + rows[i].natural_gas + "</td>\n"; //Natural_gas
                    data = data + "    <td>" + rows[i].nuclear + "</td>\n"; //Nuclear
                    data = data + "    <td>" + rows[i].petroleum + "</td>\n"; //Petroleum
                    data = data + "    <td>" + rows[i].renewable + "</td>\n"; //Renewable
                    data = data + "    <td>" + total + "</td>\n"; //Total
                    data = data + "</tr>\n";
                }   //for
                
                response = response.replace("<!-- Data to be inserted here -->", data);

                WriteHtml(res, response);
            }   //else
        }); //db.all
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

function Write404Error(res, msg) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write(msg);
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}


var server = app.listen(port);
