import csv
import json
import psycopg2
import sys
from psycopg2 import sql
from collections import defaultdict
from datetime import datetime
from datetime import date

paramsFileName = sys.argv[1]
outputFileName = sys.argv[2]

data = defaultdict(dict)
dates = defaultdict(dict)
subjects = defaultdict(dict)
titles = defaultdict(dict)

def getSubjects(x):
        cur = connection.cursor()
        queryString1 = """ select cvv.strvalue from dataverseSubjects ds join controlledvocabularyvalue cvv on
        ds.controlledvocabularyvalue_id = cvv.id
        join dataverse dv on dv.id = ds.dataverse_id
        where dv.alias = '""" + x +"'"
        cur.execute(queryString1)
        subjectString = ""
        while 1:
            row = cur.fetchone()
            if row == None:
                break

            rowStr = row[0]
            subjectString = subjectString + " " + rowStr + "; "

        return subjectString

final = {}
final['name'] = 'root'
final['children'] = []
seen = defaultdict(dict)

#get DB connection params from a file
with open(paramsFileName) as f:
    params = json.load(f)

databaseName = params["db"]
port = params["port"]
host = params["host"]
user = params["user"]
password = params["password"]

try:
    connection = psycopg2.connect(user = user,
                                  host = host,
                                  port = port,
                                  password = password,
                                  database = databaseName)

    cur = connection.cursor()

    queryString = """WITH RECURSIVE tree (id, dtype, owner_id, level, id_path) AS (
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
and dsfsub.datasetversion_id = dsv.id
and dsfsub.datasetfieldtype_id = (select id from datasetfieldtype where name = 'subject')
and dsfsub.id = dsfcvv.datasetfield_id
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

        if not(dv1alias in dates):
            dates[dv1alias] = '0000-00-00'

        dataset_identifier = row[17]
        title = str(row[2])
        fileid = row[0]

        pubdateCompare = dspubdate.strftime('%Y-%m-%d')

        if pubdateCompare > dates[dv1alias]:
            dates[dv1alias] = pubdateCompare

        titles[dataset_identifier] = title
        titles[dv1alias] = dv1name
        titles[dv2alias] = dv2name
        titles[dv3alias] = dv3name
        titles[dv4alias] = dv4name

        dates[dataset_identifier] = pubdateCompare
        dates[dv2alias] = pubdateCompare
        dates[dv3alias] = pubdateCompare
        dates[dv4alias] = pubdateCompare

        subjects[dataset_identifier] = subjectString
        if dv1alias != 'None':
            subjects[dv1alias] = str(getSubjects(dv1alias))
        if dv2alias != 'None':
            subjects[dv2alias] = str(getSubjects(dv2alias))
        if dv3alias != 'None':
            subjects[dv3alias] = str(getSubjects(dv3alias))
        if dv4alias != 'None':
            subjects[dv4alias] = str(getSubjects(dv4alias))

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

        level1 = {}
        level1['children'] = []
        level1['name'] = titles[corkey]
        level1['subjects'] = subjects[corkey]
        level1['identifier']=corkey

        timestamp_format = '%Y-%m-%d'
        t1 = datetime.strptime(str(datetime.now().date()), timestamp_format)
        t2 = datetime.strptime(dates[corkey], timestamp_format)

        days = t1 - t2
        level1['diff'] = days.days
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
                            level4['date'] = dates[gggcorkey]
                            level4['subjects'] = subjects[gggcorkey]
                            if isinstance(gggcorval,dict):
                                for ggggcorkey, ggggcorval in gggcorval.items():
                                    level5 = {}
                                    level5['name'] = titles[ggggcorkey]
                                    level5['identifier']=ggggcorkey
                                    level5['pubDate'] = dates[ggggcorkey]
                                    level4['children'].append(level5)
                            level3['children'].append(level4)
                    level3['name'] = titles[ggcorkey]
                    level2['children'].append(level3)
            level2['name'] = titles[gcorkey]
            level1['children'].append(level2)
        final['children'].append(level1)

# Serializing json
    json_object = json.dumps(final, indent=2, sort_keys=True, default=str)

    outfile = open(outputFileName, "w")
    outfile.write(json_object)
    outfile.close()

    print ("Visualization data updated in file " , outputFileName )

except Exception as e :
        print ("Error processing data visualization json file see details: " , e)
        print('Error on line {}'.format(sys.exc_info()[-1].tb_lineno), type(e).__name__, e)
finally:

            if(connection):
                cur.close()
                connection.close()
