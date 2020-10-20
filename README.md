# Dataverse Homepage Visualization

A visualization for designed for use on the homepage of [Dataverse](https://www.github.com/iqss/dataverse).

Based on https://gist.github.com/mbostock/7607535

## To Hack on the Visualization:

Python 3 (preferred)

    python3 -m http.server

Python 2

    python -m SimpleHTTPServer

Then visit <http://localhost:8000>

## To Update the Data Powering the Homepage Visualization

There are two files that are used to produce the json needed to display the Dataverse Homepage Visualization:

- query2json.py
- params.txt

The python script connects to the database, runs a query to obtain the needed data, converts the output to json, and writes the json to an output file. The params.txt file contains the credentials needed to connect the database and a parameter for telling the script whether the database is a production database or a development database. These params are in json format.

An example follows:

{"db": "dvndb",
 "password": "secret",
 "port": 5432,
 "user": "dvnapp",
 "host": "127.0.0.1",
 "type": "production"
}

This update should be run periodically to refresh to data. For example, to run the command every night at midnight:

0 0 * * * python <scriptdir>/query2json.py <paramsdir>/params.txt <datadir>/data.json