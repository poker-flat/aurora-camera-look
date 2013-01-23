#!/usr/bin/env python

import os
import sys
import pg
import uuid
import password

try:
    db = pg.DB('mag', 'localhost', 5432, user=password.UN, passwd=password.PW)
except:
    print 'Bad connection parameters to the database, exiting...'
    raise

for elevation in xrange(100, 601): # need 100km to 600km elevation
    for mag_component in ['d', 'i', 'x', 'y', 'z', 'h', 'f']:
        with open('2013-02-01_%s_%s.csv' % (elevation, mag_component), 'r') as f:
            buf = f.readlines()

            print "Processing elevation %s with magnetic component %s..." % (elevation, mag_component)
            
            for line in buf:
                if line.startswith('#') or line.startswith('\n'):
                    continue
                if line.startswith('<'):
                    raise Exception('Malformed data!!! File: %s' % (f.name,))

                line_arr = line.split(',')
                lat = float(line_arr[1])
                lon = float(line_arr[2])

                # check to see if the row already exists
                # (will be true most of the time)
                try:
                    result = db.get('mag', {
                        'date': '2013-02-01',
                        'elevation': elevation,
                        'lat': lat,
                        'lon': lon
                        }, ['elevation', 'lat', 'lon', 'date']
                    )
                except:
                    result = None

                values = {
                    'date': '2013-02-01',
                    'elevation': elevation,
                    'lat': lat,
                    'lon': lon
                }
                if result:
                    values['id'] = result['id']
                else:
                    values['id'] = uuid.uuid4()

                if 'd' in mag_component:
                    if result and result['declination']: continue
                    values['declination'] = line_arr[3]
                elif 'i' in mag_component:
                    if result and result['inclination']: continue
                    values['inclination'] = line_arr[3]
                elif 'x' in mag_component:
                    if result and result['x']: continue
                    values['x'] = line_arr[3]
                elif 'y' in mag_component:
                    if result and result['y']: continue
                    values['y'] = line_arr[3]
                elif 'z' in mag_component:
                    if result and result['z']: continue
                    values['z'] = line_arr[3]
                elif 'h' in mag_component:
                    if result and result['horizontal_intensity']: continue
                    values['horizontal_intensity'] = line_arr[3]
                elif 'f' in mag_component:
                    if result and result['total_intensity']: continue
                    values['total_intensity'] = line_arr[3]
                else:
                    raise Exception("Unknown mag_component `%s'..." % (mag_component,))
                
                try:
                    # row does not exist
                    if result == None:
                        db.insert('mag', values)
                    else:
                        db.update('mag', values, key='id')
                except:
                    raise

db.close()

