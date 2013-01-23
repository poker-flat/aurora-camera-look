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

low = int(sys.argv[1])
high = int(sys.argv[2])

if low < 100 or low > 601:
    raise Exception("First argument cannot be less than 100 or greater than 601")
high = int(sys.argv[2])
if high < 100 or high > 601:
    raise Exception("Second argument cannot be less than 100 or greater than 601")

for elevation in xrange(low, high): # need 100km to 600km elevation
    try:
        with open('2013-02-01_%s_d.csv' % (elevation,)) as f:
            buf_d = f.readlines()
        with open('2013-02-01_%s_i.csv' % (elevation,)) as f:
            buf_i = f.readlines()
        with open('2013-02-01_%s_x.csv' % (elevation,)) as f:
            buf_x = f.readlines()
        with open('2013-02-01_%s_y.csv' % (elevation,)) as f:
            buf_y = f.readlines()
        with open('2013-02-01_%s_z.csv' % (elevation,)) as f:
            buf_z = f.readlines()
        with open('2013-02-01_%s_h.csv' % (elevation,)) as f:
            buf_h = f.readlines()
        with open('2013-02-01_%s_f.csv' % (elevation,)) as f:
            buf_f = f.readlines()
    except:
        raise

    print "Processing elevation %s..." % (elevation,)
    
    # This assumes all buffers contain the same number of lines and they are
    # formatted the same way, meaning, indicies 0, 1, and 2 are the same for
    # each line, with index 3 being the key value for each
    for d, i, x, y, z, h, f in map(None, buf_d, buf_i, buf_x, buf_y, buf_z, buf_h, buf_f):
        #print d, i, x, y, z, h, f
        if d.startswith('#') or d.startswith('\n'):
            continue;
        if d.startswith('<'):
            raise Exception('Malformed data!!! In group elevation: %s mag d' % (elevation,))
        if i.startswith('<'):
            raise Exception('Malformed data!!! In group elevation: %s mag i' % (elevation,))
        if x.startswith('<'): 
            raise Exception('Malformed data!!! In group elevation: %s mag x' % (elevation,))
        if y.startswith('<'):
            raise Exception('Malformed data!!! In group elevation: %s mag y' % (elevation,))
        if z.startswith('<'):
            raise Exception('Malformed data!!! In group elevation: %s mag z' % (elevation,))
        if h.startswith('<'):
            raise Exception('Malformed data!!! In group elevation: %s mag h' % (elevation,))
        if f.startswith('<'):
            raise Exception('Malformed data!!! In group elevation: %s mag f' % (elevation,))
        d = d.split(',')
        i = i.split(',')
        x = x.split(',')
        y = y.split(',')
        z = z.split(',')
        h = h.split(',')
        f = f.split(',')
        if  d[1] != i[1] or d[2] != i[2] or \
            d[1] != x[1] or d[2] != x[2] or \
            d[1] != y[1] or d[2] != y[2] or \
            d[1] != z[1] or d[2] != z[2] or \
            d[1] != h[1] or d[2] != h[2] or \
            d[1] != f[1] or d[2] != f[2]:
                raise Exception('Lat and Lon not same for all mags in elevation: %s' % (elevation,))

        lat = float(d[1])
        lon = float(d[2])

        # check to see if the row already exists
        try:
            result = db.get('mag', {
                'date': '2013-02-01',
                'elevation': elevation,
                'lat': lat,
                'lon': lon
                }, ['elevation', 'lat', 'lon', 'date']
            )
            if result:
                continue
        except:
            pass

        values = {
            'id': uuid.uuid4(),
            'date': '2013-02-01',
            'elevation': elevation,
            'lat': lat,
            'lon': lon,
            'declination': d[3],
            'inclination': i[3],
            'x': x[3],
            'y': y[3],
            'z': z[3],
            'horizontal_intensity': h[3],
            'total_intensity': f[3]
        }

        try:
            db.insert('mag', values)
            multi_values = []
        except:
            raise

db.close()

