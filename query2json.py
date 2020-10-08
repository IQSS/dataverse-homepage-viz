import csv
import json
import psycopg2
import sys
from psycopg2 import sql
from collections import defaultdict
from datetime import datetime

data = defaultdict(dict)
dates = defaultdict(dict)
subjects = defaultdict(dict)
titles = defaultdict(dict)

def getSubjects(x):
        cur = connection.cursor()
        queryString1 = """ select string_agg(cvv.strvalue, '; ') from dataverseSubjects ds join controlledvocabularyvalue cvv on
        ds.controlledvocabularyvalue_id = cvv.id
        join dataverse dv on dv.id = ds.dataverse_id
        where dv.alias = '""" + x +"'"
        cur.execute(queryString1)
        row = cur.fetchone()
        return row

oldest_date = datetime.strptime('9999-12-31', '%Y-%m-%d')
final = {}
final['name'] = 'root'
final['children'] = []
seen = defaultdict(dict)

#get DB connection params from a file
with open('params.txt') as f:
    params = json.load(f)

databaseName = params["db"]
passwordString = params["password"]
port = params["port"]
type = params["type"]
host = params["host"]
user = params["user"]

#For dev databases, "subject" is 20.
subString = 'and dsfsub.datasetfieldtype_id=20'
#For Harvard's database, "subject" is 19.
if type == 'production':
    subString = 'and dsfsub.datasetfieldtype_id=19'

try:
    connection = psycopg2.connect(user = user,
                                  password = passwordString,
                                  host = host,
                                  port = port,
                                  database = databaseName)

    cur = connection.cursor()

    queryString1 = """WITH RECURSIVE tree (id, dtype, owner_id, level, id_path) AS (
    SELECT  id, dtype, owner_id, -1, ARRAY[id]
    FROM    dvobject
    WHERE   owner_id in (select id from dvobject where owner_id is null)
    AND     dtype='Dataverse'

    UNION ALL

    SELECT  dvo.id, dvo.dtype, dvo.owner_id, t0.level + 1,
        (CASE dvo.dtype
        WHEN 'Dataverse' THEN ARRAY_APPEND(t0.id_path, dvo.id)
        ELSE id_path
        END)
    FROM    dvobject dvo
            INNER JOIN tree t0 ON t0.id = dvo.owner_id
), maxVersion as (select id  from datasetversion where
concat(datasetversion.dataset_id,':', datasetversion.versionnumber
	   + (.01 * datasetversion.minorversionnumber)) in
(select concat(datasetversion.dataset_id,':',
			   max(datasetversion.versionnumber
				   + (.01 * datasetversion.minorversionnumber))) as max
from datasetversion
join dataset on dataset.id = datasetversion.dataset_id
where versionstate='RELEASED'
and dataset.harvestingclient_id is null
group by dataset_id)), filedatefilter as (select id from dvobject where dtype='DataFile'
-- Make sure the file is published.
and publicationdate is not NULL
)
select
    -- ID of the file
    dvo.id as fileid,
    fmd.label as filename,
    -- Strip out newlines and tabs in dataset titles.
    regexp_replace(dsfv.value, '[\r\n\t]+', ' ', 'g' ) as dataset_name,
    -- Dataverses that are direct children of the root dataverse.
    tree.id_path[1] as dataverse_level_1_id,
    level1dv.alias as dataverse_level_1_alias,
    level1dv.name as dataverse_level_1_friendly_name,
    -- Dataverses that are grandchildren of the root dataverse.
    level2dv.id as dataverse_level_2_id,
    level2dv.alias as dataverse_level_2_alias,
    level2dv.name as dataverse_level_2_friendly_name,
    -- Dataverses that are grandchildren of the root dataverse.
    level3dv.id as dataverse_level_3_id,
    level3dv.alias as dataverse_level_3_alias,
    level3dv.name as dataverse_level_3_friendly_name,
    level4dv.id as dataverse_level_4_id,
    level4dv.alias as dataverse_level_4_alias,
    level4dv.name as dataverse_level_4_friendly_name,
    -- Separate multiple subjects with a delimeter.
    string_agg(cvv.strvalue, '; ') AS subjects,
    -- Dataset publication date.
    dsv.releasetime as dataset_publication_date,
    dvods.identifier as dataset_identifier
    -- File creation date.
    --dvo.createdate as file_creation_date,
    -- File publication date.
    --dvo.publicationdate as file_publication_date
from filemetadata fmd, datasetversion dsv,
datasetfieldvalue dsfv, datasetfield dsf,
datasetfield dsfsub, datasetfield_controlledvocabularyvalue dsfcvv,
controlledvocabularyvalue cvv, dvobject dvo, dvobject dvods,
dataverse level1dv, dataset, maxversion, filedatefilter, tree
left outer join dataverse level2dv on tree.id_path[2] = level2dv.id
left outer join dataverse level3dv on tree.id_path[3] = level3dv.id
left outer join dataverse level4dv on tree.id_path[4] = level4dv.id
where fmd.datasetversion_id = dsv.id
and dsv.dataset_id = dataset.id
and tree.id = dvo.id
and tree.id_path[1] = level1dv.id
and dsv.id = dsf.datasetversion_id
and dsf.id = dsfv.datasetfield_id
and fmd.datafile_id = dvo.id
and dsf.datasetfieldtype_id=1
-- We added dsfsub and dsfcvv to get subjects.
and dsfsub.datasetversion_id = dsv.id """

    queryString2 = """ and dsfsub.id = dsfcvv.datasetfield_id
and cvv.datasetfieldtype_id = dsfsub.datasetfieldtype_id
and dsfcvv.controlledvocabularyvalues_id = cvv.id
-- Make sure the dataset is published.
and dsv.releasetime is not NULL
-- Get the latest published version of the dataset...
and dsv.id = maxversion.id
-- ... done getting the latest published version of the dataset.
and dvo.id = filedatefilter.id
and dvods.id = dataset.id

GROUP BY
-- Group by all the fields above *except* subject for the string_agg above.
fileid,
filename,
dataset_name,
dataverse_level_1_id,
dataverse_level_1_alias,
dataverse_level_1_friendly_name,
dataverse_level_2_id,
dataverse_level_2_alias,
dataverse_level_2_friendly_name,
dataverse_level_3_id,
dataverse_level_3_alias,
dataverse_level_3_friendly_name,
dataverse_level_4_id,
dataverse_level_4_alias,
dataverse_level_4_friendly_name,
dataset_publication_date,
dataset_identifier
order by dataset_publication_date desc; """

    queryString = queryString1 + subString + queryString2

    cur.execute(queryString)

    while 1:

        row = cur.fetchone()
        if row == None:
            break

        fileid = row[0]
        filename = str(row[1])
        dv1name = str(row[5])
        dv1alias = str(row[4])
        dv1id = row[3]
        dv2name = str(row[8])
        dv2id = row[6]
        dv2alias = str(row[7])
        dv3name = str(row[11])
        dv3id = row[9]
        dv3alias = str(row[10])
        dv4name = str(row[14])
        dv4id = row[12]
        dv4alias = str(row[13])
        dspubdate = row[16]
        subjectString = str(row[15])
        dates[dv1alias] = datetime.strptime('1900-01-01', '%Y-%m-%d')
        dataset_identifier = row[17]
        title = str(row[2])
        fileid = row[0]

        if dspubdate > dates[dv1alias]:
            dates[dv1alias] = dspubdate

        if oldest_date > dspubdate:
            oldest_date = dspubdate

        titles[dataset_identifier] = title
        titles[dv1alias] = dv1name
        titles[dv2alias] = dv2name
        titles[dv3alias] = dv3name
        titles[dv4alias] = dv4name

        dates[dataset_identifier] = dspubdate.strftime('%Y-%m-%d')
        dates[dv1alias] = dspubdate
        dates[dv2alias] = dspubdate.strftime('%Y-%m-%d')
        dates[dv3alias] = dspubdate.strftime('%Y-%m-%d')
        dates[dv4alias] = dspubdate.strftime('%Y-%m-%d')

        subjects[dataset_identifier] = subjectString
        if dv1alias != 'None':
            subjects[dv1alias] = getSubjects(dv1alias)
        if dv2alias != 'None':
            subjects[dv2alias] = getSubjects(dv2alias)
        if dv3alias != 'None':
            subjects[dv3alias] = getSubjects(dv3alias)
        if dv4alias != 'None':
            subjects[dv4alias] = getSubjects(dv4alias)

        #print("%-20s > %-20s > %-20s > %-20s > %-20s" % (dv1name[:20], dv2name[:20], dv3name[:20], title[:20], filename[:20]))
        if dv4alias != 'None':
            if seen[dv1alias + dv2alias + dv3alias + dv4alias + dataset_identifier]:
                data[dv1alias][dv2alias][dv3alias][dv4alias][dataset_identifier] += 1
            else:
                if not data[dv1alias].get(dv2alias):
                    data[dv1alias][dv2alias] = {}
                if not data[dv1alias].get(dv2alias).get(dv3alias):
                    data[dv1alias][dv2alias][dv3alias] = {}
                if not data[dv1alias].get(dv2alias).get(dv3alias).get(dv4alias):
                    data[dv1alias][dv2alias][dv3alias][dv4alias] = {}
                data[dv1alias][dv2alias][dv3alias][dv4alias] = {}
                data[dv1alias][dv2alias][dv3alias][dv4alias][dataset_identifier] = 1
                seen[dv1alias + dv2alias + dv3alias + dv4alias  + dataset_identifier] = 1
        elif dv3alias != 'None':
            if seen[dv1alias + dv2alias + dv3alias + dataset_identifier]:
                data[dv1alias][dv2alias][dv3alias][dataset_identifier] += 1
            else:
                if not data[dv1alias].get(dv2alias):
                    data[dv1alias][dv2alias] = {}
                if not data[dv1alias].get(dv2alias).get(dv3alias):
                    data[dv1alias][dv2alias][dv3alias] = {}
                data[dv1alias][dv2alias][dv3alias][dataset_identifier] = 1
                seen[dv1alias + dv2alias + dv3alias + dataset_identifier] = 1
        elif dv2alias != "None":
            if seen[dv1alias + dv2alias + dataset_identifier]:
                data[dv1alias][dv2alias][dataset_identifier] += 1
            else:
                if not data[dv1alias].get(dv2alias):
                    data[dv1alias][dv2alias] = {}
                data[dv1alias][dv2alias][dataset_identifier] = 1
                seen[dv1alias + dv2alias + dataset_identifier] = 1
        else:
            if seen[dv1alias + dataset_identifier]:
                data[dv1alias][dataset_identifier] += 1
            else:
                data[dv1alias][dataset_identifier] = 1
                seen[dv1alias + dataset_identifier] = 1


    for corkey, corval in data.items():
        timestamp_format = '%Y-%m-%d'
        level1 = {}
        level1['name'] = titles[corkey]

        level1['subjects'] = subjects[corkey]
        level1['identifier']=corkey
        t1 = oldest_date
        t2 = dates[corkey]
        days = t2 - t1
        level1['diff'] = days.days
        level1['children'] = []
        level1['date'] = t2.strftime('%Y-%m-%d')

        for gcorkey, gcorval in corval.items():
            level2 = {}
            level2['children'] = []
            level2['date'] = dates[gcorkey]
            level2['subjects'] = subjects[gcorkey]
            level2['identifier']=gcorkey
            if isinstance(gcorval,dict):
                for ggcorkey, ggcorval in gcorval.items():
                    #print('ggcorkey:', ggcorkey)
                    level3 = {}
                    level3['children'] = []
                    level3['date'] = dates[ggcorkey]
                    level3['subjects'] = subjects[ggcorkey]
                    level3['identifier']=ggcorkey
                    if isinstance(ggcorval,dict):
                        for gggcorkey, gggcorval in ggcorval.items():
                            level4 = {}
                            level4['name'] = titles[gggcorkey]
                            level4['children'] = []
                            level4['identifier']=gggcorkey
                            l4Date = dates[gggcorkey]
                            level4['date'] = l4Date
                            level4['subjects'] = subjects[gggcorkey]
                            if isinstance(gggcorval,dict):
                                for ggggcorkey, ggggcorval in gggcorval.items():
                                    level5 = {}
                                    level5['name'] = titles[ggggcorkey]
                                    level5['identifier']=ggggcorkey
                                    pubDate =  dates[ggggcorkey]
                                    level5['pubDate'] = pubDate
                                    level4['children'].append(level5)
                            level3['children'].append(level4)
                    level3['name'] = titles[ggcorkey]
                    level2['children'].append(level3)
            level2['name'] = titles[gcorkey]
            level1['children'].append(level2)
        final['children'].append(level1)

# Serializing json
    json_object = json.dumps(final, indent=2, sort_keys=True, default=str)

    import os.path
    directory = './data/'
    filename = "data.json"
    file_path = os.path.join(directory, filename)
    if not os.path.isdir(directory):
        os.mkdir(directory)
    outfile = open(file_path, "w")
    outfile.write(json_object)
    outfile.close()


except (Exception, psycopg2.Error) as error :
        print ("Error processing data visualization json file see details:", error)
        print('Error on line {}'.format(sys.exc_info()[-1].tb_lineno), type(error).__name__, error)
finally:
        #closing database connection.
            print("Visualization data updated in file data.json")
            if(connection):
                cur.close()
                connection.close()
                print("PostgreSQL connection is closed")
