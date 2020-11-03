# Dataverse Homepage Visualization

A visualization for designed for use on the homepage of [Dataverse](https://www.github.com/iqss/dataverse).

Based on https://gist.github.com/mbostock/7607535

## To Hack on the Visualization:

Python 3 

    python3 -m http.server


Then visit <http://localhost:8000>

## To Update the Data Powering the Homepage Visualization

There are two files that are used to produce the json needed to display the Dataverse Homepage Visualization:

- query2json.py
- params.txt

The python script connects to the database, runs a query to obtain the needed data, converts the output to json, and writes the json to an output file. The params.txt file contains the credentials needed to connect the database. These params are in json format.

An example follows:

{"db": "dvndb",
 "port": 5432,
 "user": "dvnapp",
 "password": "password",
 "host": "127.0.0.1"
}

This update should be run periodically to refresh to data. For example, to run the command every night at midnight:

0 0 * * * python [scriptdir]/query2json.py [paramsdir]/params.txt [datadir]/data.json

Note: Running this script requires the psycopg2 module (PostgreSQL client).
We recommend that you try installing the "binary", pre-built version of the package:
pip install psycopg2-binary
(or "pip3 install psycopg2-binary" if you use python3 and it's
installed separately on your system)
