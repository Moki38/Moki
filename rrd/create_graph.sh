#!/bin/bash

RRDDIR="/data/moki/rrd"
OUTDIR="/data/moki/public/rrd"

VALUE=$1
 

cd $RRDDIR
for i in `ls -1 *.rrd | cut -f1 -d. `
do

#define the desired colors for the graphs

COLOR="#CCCC00"

if [[ $i == solar* ]]
then
  COLOR="#00CCCC"
fi
if [[ $i == bmv* ]]
then
  COLOR="#0000CC"
fi


#hourly
if [[ $i == *i ]]
then
rrdtool graph --slope-mode $OUTDIR/${i}_hourly.png -w 800 -h 155 --start -12h \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
CDEF:n=$i,DUP,0,LT,* \
CDEF:p=$i,DUP,0,GT,* \
AREA:n#0000ff \
AREA:p#00ff00 \
LINE:0#000000 \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" \
GPRINT:$i:LAST:"Current\: %4.2lf"
else
rrdtool graph --slope-mode $OUTDIR/${i}_hourly.png -w 800 -h 155 --start -12h \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" \
GPRINT:$i:LAST:"Current\: %4.2lf"
fi
if [[ $i == mbar ]]
then
rrdtool graph --slope-mode $OUTDIR/${i}_hourly.png -w 800 -h 155 --start -1d -u 1050 -l 950 -r \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
GPRINT:$i:LAST:"Current\: %4.2lf"
fi

#daily
if [[ $i == *i ]]
then
rrdtool graph $OUTDIR/${i}_daily.png -w 800 -h 155 --start -1d \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
CDEF:n=$i,DUP,0,LT,* \
CDEF:p=$i,DUP,0,GT,* \
AREA:n#0000ff \
AREA:p#00ff00 \
LINE:0#000000 \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
else
rrdtool graph $OUTDIR/${i}_daily.png -w 800 -h 155 --start -1d \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
fi
if [[ $i == mbar ]]
then
rrdtool graph $OUTDIR/${i}_daily.png -w 800 -h 155 --start -1d -u 1050 -l 950 -r \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
fi

#weekly
if [[ $i == *i ]]
then
rrdtool graph $OUTDIR/${i}_weekly.png -w 800 -h 155 --start -1w \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
CDEF:n=$i,DUP,0,LT,* \
CDEF:p=$i,DUP,0,GT,* \
AREA:n#0000ff \
AREA:p#00ff00 \
LINE:0#000000 \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
else
rrdtool graph $OUTDIR/${i}_weekly.png -w 800 -h 155 --start -1w \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
fi
if [[ $i == mbar ]]
then
rrdtool graph $OUTDIR/${i}_weekly.png -w 800 -h 155 --start -1w -u 1050 -l 950 -r \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
fi

#monthly
if [[ $i == *i ]]
then
rrdtool graph $OUTDIR/${i}_monthly.png -w 800 -h 155 --start -1m \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
CDEF:n=$i,DUP,0,LT,* \
CDEF:p=$i,DUP,0,GT,* \
AREA:n#0000ff \
AREA:p#00ff00 \
LINE:0#000000 \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
else
rrdtool graph $OUTDIR/${i}_monthly.png -w 800 -h 155 --start -1m \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
fi
if [[ $i == mbar ]]
then
rrdtool graph $OUTDIR/${i}_monthly.png -w 800 -h 155 --start -1m -u 1050 -l 950 -r \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
fi

#yearly
if [[ $i == *i ]]
then
rrdtool graph $OUTDIR/${i}_yearly.png -w 800 -h 155 --start -1y \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
CDEF:n=$i,DUP,0,LT,* \
CDEF:p=$i,DUP,0,GT,* \
AREA:n#0000ff \
AREA:p#00ff00 \
LINE:0#000000 \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
else
rrdtool graph $OUTDIR/${i}_yearly.png -w 800 -h 155 --start -1y \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
fi
if [[ $i == mbar ]]
then
rrdtool graph $OUTDIR/${i}_yearly.png -w 800 -h 155 --start -1y -u 1050 -l 950 -r \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
AREA:$i$COLOR \
LINE2:$i#CC0000:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" 
fi
done

