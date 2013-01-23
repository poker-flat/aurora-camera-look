#!/bin/bash

MAG=("d" "i" "x" "y" "z" "h" "f")

# Step up according to elevation
for ((ELEV=0; ELEV<=600; ELEV++))
do
    for ((m=0; m<${#MAG[@]}; m++))
    do
        FILE="2013-02-01_${ELEV}_${MAG[$m]}.csv"
        echo "Checking $FILE..."
        if [ ! -f $FILE ];
        then
            echo "Grabbing; Elev: $ELEV, Mag: ${MAG[$m]}"
            URL="http://www.ngdc.noaa.gov/geomag-web/calculators/calculateIgrfgrid?lat1=65.0&lat2=70.0&lon1=-150.0&lon2=-140&latStepSize=0.1&lonStepSize=0.1&magneticComponent=${MAG[$m]}&startYear=2013&startMonth=2&startDay=1&endYear=2013&endMonth=2&endDay=1&resultFormat=csv&elevation=$ELEV&elevationUnits=K"
            curl "$URL" > tmp.tmp
            mv tmp.tmp $FILE
            sed "s@,,@,@" -i $FILE
            sleep 1
        fi
    done
done
