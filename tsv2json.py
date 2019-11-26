import csv
import json
from collections import defaultdict
from datetime import datetime
'''
fileid
filename
dataset_name
dataverse_level_1_id
dataverse_level_1_alias
dataverse_level_1_friendly_name
dataverse_level_2_id
dataverse_level_2_alias
dataverse_level_2_friendly_name
dataverse_level_3_id
dataverse_level_3_alias
dataverse_level_3_friendly_name
subjects
file_creation_date
file_publication_date
dataset_publication_date
'''
data = defaultdict(dict)
dates = defaultdict(dict)
oldest_date = "9999-12-31"
final = {}
final['name'] = 'root'
final['children'] = []
seen = defaultdict(dict)
with open('data/files_big.tsv', newline='') as tsvfile:
#with open('data/files.tsv', newline='') as tsvfile:
    reader = csv.DictReader(tsvfile, delimiter="\t")
    rows = [row for row in reader]
    for row in rows:
        fileid = row['fileid']
        #print(fileid)
        filename = row['filename']
        dv1name = row['dataverse_level_1_friendly_name']
        dv1id = row['dataverse_level_1_id']
        dv2name = row['dataverse_level_2_friendly_name']
        dv2id = row['dataverse_level_2_id']
        dv3name = row['dataverse_level_3_friendly_name']
        dv3id = row['dataverse_level_3_id']
        dv3alias = row['dataverse_level_3_alias']
        dspubdate = row['dataset_publication_date']
        dates[dv1name] = '0000-00-00'
        if dspubdate > dates[dv1name]:
            dates[dv1name] = dspubdate
        if oldest_date > dspubdate:
            oldest_date = dspubdate
        #print(fileid, dv3alias)
        if dv3alias == 'glw_3':
            continue
        if dv3alias == 'ABDAssessments_Malawi':
            continue
        if dv3alias == 'ABDAssessments_India':
            continue
        if dv3alias == 'ABDAssessments_Mali':
            continue
        title = row['dataset_name']
        #print("%-20s > %-20s > %-20s > %-20s > %-20s" % (dv1name[:20], dv2name[:20], dv3name[:20], title[:20], filename[:20]))
        if dv3name:
            if seen[dv1name + dv2name + dv3name + title]:
                data[dv1name][dv2name][dv3name][title] += 1
            else:
                if not data[dv1name].get(dv2name):
                    data[dv1name][dv2name] = {}
                if not data[dv1name].get(dv2name).get(dv3name):
                    data[dv1name][dv2name][dv3name] = {}
                data[dv1name][dv2name][dv3name] = {}
                data[dv1name][dv2name][dv3name][title] = 1
                seen[dv1name + dv2name + dv3name + title] = 1
        elif dv2name:
            if seen[dv1name + dv2name + title]:
                data[dv1name][dv2name][title] += 1
            else:
                if not data[dv1name].get(dv2name):
                    data[dv1name][dv2name] = {}
                data[dv1name][dv2name][title] = 1
                seen[dv1name + dv2name + title] = 1
        else:
            if seen[dv1name + title]:
                data[dv1name][title] += 1
            else:
                data[dv1name][title] = 1
                seen[dv1name + title] = 1
        dates[dv1name] = dspubdate
data_out = json.dumps(data, indent=2)
#print(data_out)
#print('oldest date', oldest_date)
#exit(1)
#for child_of_root in data:
# for key, value in ourNewDict.items():

# cor is "child of root"
for corkey, corval in data.items():
    #print(corkey)
    level1 = {}
    #level1['name'] = corkey + '-level1'
    level1['name'] = corkey
    level1['date'] = dates[corkey]
    timestamp_format = '%Y-%m-%d %H:%M:%S.%f'
    t1 = datetime.strptime(oldest_date, timestamp_format)
    t2 = datetime.strptime(dates[corkey], timestamp_format)
    days = t2 - t1
    level1['diff'] = days.days
    level1['children'] = []
    # gcor = "grandchild of root"
    for gcorkey, gcorval in corval.items():
        #print(gcorkey)
        # ggcor = "great grandchild of root"
        level2 = {}
        level2['children'] = []
        if isinstance(gcorval,dict):
#        #if gcorval.items():
            for ggcorkey, ggcorval in gcorval.items():
                #print('ggcorkey:', ggcorkey)
                level3 = {}
                level3['children'] = []
                if isinstance(ggcorval,dict):
                    for gggcorkey, gggcorval in ggcorval.items():
                        level4 = {}
                        level4['name'] = gggcorkey
                        level3['children'].append(level4)
                #level3['name'] = ggcorkey + '-level3'
                level3['name'] = ggcorkey
                level2['children'].append(level3)
        #print(gcorkey)
        #level2 = {}
        #level2['name'] = gcorkey + '-level2'
        level2['name'] = gcorkey
        #level1['children'] = []
        #if (level2):
        #    level1['children'].append(level2)
        level1['children'].append(level2)
#            level2 = {}
    final['children'].append(level1)

# assume 365 days for now
def get_num_invisible_children(num_days):
    if num_days < 100:
        #return 200
        return 8
    if num_days < 120:
        #return 20
        return 4
    else:
        return 0

#days_in_a_year = 365
days_of_invisible_circles = 365
#days_of_invisible_circles = 182
invisible_child = {}
invisible_child['name'] = 'middle child'
#for i in range(1, days_in_a_year):
for i in range(1, days_of_invisible_circles):
    invisible = {}
    invisible['name'] = "invisible"
    invisible['debug'] = "invisible" + str(i)
    invisible['diff'] = i
    invisible['children'] = []
    num_children = get_num_invisible_children(i)
    if num_children > 0:
        for i in range(1, get_num_invisible_children(i)):
            invisible['children'].append(invisible_child)
        final['children'].append(invisible)
final_out = json.dumps(final, indent=2)
print(final_out)
