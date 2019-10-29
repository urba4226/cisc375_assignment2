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

//Arrays of energy types to populate next and prev buttons:
var energy = ['coal', 'natural_gas', 'nuclear', 'petroleum', 'renewable'];
var fullenergy = ['Coal', 'Natural Gas', 'Nuclear', 'Petroleum', 'Renewable'];


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
        let msg = 'Error: file not found';
        Write404Error(res, msg);
    }); //catch
}); //app.get

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    ReadFile(path.join(template_dir, 'year.html')).then((template) => {
                let response = template;
		// modify `response` here
		var state = 0;
        var table = '';
		var coal_sum = 0;
		var natural_gas_sum = 0;
		var nuclear_sum = 0;
		var petroleum_sum = 0;
		var renewable_sum = 0;

		let query = "SELECT coal, natural_gas, nuclear, petroleum, renewable FROM Consumption WHERE year=?";
		
		db.all(query, [req.params.selected_year], (err, rows) => {
			if(err) {
				console.log("err");
			}
			else {
				
				rows.forEach((row) => {
					var row_sum = row.coal + row.natural_gas + row.nuclear + row.petroleum + row.renewable;
					table += "<tr><td>" + states[state] + "</td><td>" + row.coal + "</td><td>" + row.natural_gas + "</td><td>" + row.nuclear + "</td><td>" + row.petroleum + "</td><td>" + row.renewable + "</td><td>" + row_sum + "</td></tr>"
					
					coal_sum += row.coal;
					natural_gas_sum += row.natural_gas;
					nuclear_sum += row.nuclear;
					petroleum_sum += row.petroleum;
					renewable_sum += row.renewable;
					state++;
				});		
			
				var prevYear = req.params.selected_year - 1;
				var nextYear = parseInt(req.params.selected_year) + 1;

				response = response.toString().replace('<tbody>', '<tbody>' + table);
				response = response.toString().replace('US Energy Consumption</title>', req.params.selected_year + ' US Energy Consumption</title>');
				response = response.toString().replace('National Snapshot', req.params.selected_year + ' National Snapshot');
				response = response.toString().replace('var year', 'var year = ' + req.params.selected_year);
				response = response.toString().replace('var coal_count', 'var coal_count = ' + coal_sum);
				response = response.toString().replace('var natural_gas_count', 'var natural_gas_count = ' + natural_gas_sum);
				response = response.toString().replace('var nuclear_count', 'var nuclear_count = ' + nuclear_sum);
				response = response.toString().replace('var petroleum_count', 'var petroleum_count = ' + petroleum_sum);
				response = response.toString().replace('var renewable_count', 'var renewable_count = ' + renewable_sum );
				
				if(req.params.selected_year == 1960) {
					response = response.toString().replace('">Prev</a>', '/year/1960">Prev</a>');
					response = response.toString().replace('">Next</a>', '/year/' + nextYear + '">Next</a>');
				}
				else if(req.params.selected_year == 2017){
					response = response.toString().replace('">Prev</a>', '/year/' + prevYear + '">Prev</a>');
					response = response.toString().replace('">Next</a>', '/year/2017">Next</a>');
				}
				else {
					response = response.toString().replace('">Prev</a>', '/year/' + prevYear + '">Prev</a>');
					response = response.toString().replace('">Next</a>', '/year/' + nextYear + '">Next</a>');
				}
				WriteHtml(res, response);

			}
		});
    }).catch((err) => {
        let msg = 'Error: file not found';
        Write404Error(res, msg);
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
                response = response.replace("!!!prev_link!!!", '/state/' + states[prev]);
                response = response.replace("!!!next!!!", states[next]);
                response = response.replace("!!!next_link!!!", '/state/' + states[next]);

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
        let msg = 'Error: file not found';
        Write404Error(res, msg);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        // modify `response` here
        let query = "SELECT * ";
        query = query + "FROM Consumption ";
        query = query + "ORDER BY state_abbreviation, year";
        db.all(query, (err, rows) =>
        {
            if (err)
            {
                let msg = "Error: could not retrieve data from database";
                Write404Error(res, msg);
            }   //if
            else if (rows.length < 1)
            {
                let msg = "Error: no data for energy type: ";
                msg = msg + req.params.selected_energy_type;
                Write404Error(res, msg);
            }   //else if
            else
            {
                // Modify values of variables at the top of the file:
                let energy_counts = "{" + rows[0].state_abbreviation + ": [" + rows[0][req.params.selected_energy_type];
                for (let i = 1; i < rows.length; i++)
                {
                    if (rows[i].state_abbreviation != rows[i-1].state_abbreviation)
                    {
                        energy_counts = energy_counts + "], " + rows[i].state_abbreviation;
                        energy_counts = energy_counts +  ": [" + rows[i][req.params.selected_energy_type];
                    }   //if
                    else
                    {
                        energy_counts = energy_counts + ", " + rows[i][req.params.selected_energy_type];
                    }   //else
                }   //for
                energy_counts = energy_counts + "]}";
                let index = energy.indexOf(req.params.selected_energy_type);
                response = response.replace("!!!energy_counts!!!", energy_counts);
                response = response.replace("!!!energy_type!!!", fullenergy[index]);

                //Modify header to include energy type:
                response = response.replace("!!!Header!!!", fullenergy[index]);
                //Modify title to include energy type:
                response = response.replace("!!!Title!!!", fullenergy[index]);
                //Modify prev and next buttons here
                let prev = (index - 1 + energy.length) % energy.length;
                let next = (index + 1) % energy.length;
                response = response.replace("!!!prev!!!", fullenergy[prev]);
                response = response.replace("!!!prev_link!!!", '/energy-type/' + energy[prev]);
                response = response.replace("!!!next!!!", fullenergy[next]);
                response = response.replace("!!!next_link!!!", '/energy-type/' + energy[next]);

                //Modify values for the table at the bottom of the file:
                query = "SELECT * ";
                query = query + "FROM Consumption ";
                query = query + "ORDER BY year, state_abbreviation";
                db.all(query, (err, rows) =>
                {
                    if (err)
                    {
                        let msg = "Error: could not retrieve data from database";
                        Write404Error(res, msg);
                    }   //if
                    else if (rows.length < 1)
                    {
                        let msg = "Error: no data for energy type: ";
                        msg = msg + req.params.selected_energy_type;
                        Write404Error(res, msg);
                    }   //else if
                    else
                    {
                        let total = 0;
                        let data = "<tr>\n";
                        data = data + "    <td>" + rows[0].year + "</td>\n";
                        data = data + "    <td>" + rows[0][req.params.selected_energy_type] + "</td>\n";
                        total = total + rows[0][req.params.selected_energy_type];
                        for (let i = 1; i < rows.length; i++)
                        {
                            //If different year, end the current row and start a new one:
                            if (rows[i].year != rows[i-1].year)
                            {
                                data = data + "    <td>" + total + "</td>\n"; //Total
                                total = 0;
                                data = data + "</tr>\n";
                                data = data + "<tr>\n"
                                data = data + "    <td>" + rows[i].year + "</td>\n"; //Year
                                data = data + "    <td>" + rows[i][req.params.selected_energy_type] + "</td>\n";
                            }   //if
                            else
                            {
                                data = data + "    <td>" + rows[i][req.params.selected_energy_type] + "</td>\n";
                            }   //else
                            total = total + rows[i][req.params.selected_energy_type];
                        }   //for
                        
                        response = response.replace("<!-- Data to be inserted here -->", data);
                        
                        WriteHtml(res, response);
                    }   //else
                }); //db.all
            }   //else
        }); //db.all
    }).catch((err) => {
        let msg = 'Error: file not found';
        Write404Error(res, msg);
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
