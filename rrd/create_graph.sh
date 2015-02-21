#!/bin/bash

RRDDIR="/data/moki/rrd"
OUTDIR="/data/moki/public/rrd"

VALUE=$1
 
#define the desired colors for the graphs
COLOR="#CC0000"

cd $RRDDIR
for i in `ls -1 *.rrd | cut -f1 -d. `
do
 
#hourly
rrdtool graph --slope-mode $OUTDIR/${i}_hourly.png --start -4h \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
LINE:$i$COLOR:"$i" \
GPRINT:$i:MIN:"Min \: %4.2lf" \
GPRINT:$i:MAX:"Max \: %4.2lf" \
GPRINT:$i:LAST:"Current\: %4.2lf"

#daily
rrdtool graph $OUTDIR/${i}_daily.png --start -1d \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
LINE:$i$COLOR:"$i" 

#weekly
rrdtool graph $OUTDIR/${i}_weekly.png --start -1w \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
LINE:$i$COLOR:"$i" 

#monthly
rrdtool graph $OUTDIR/${i}_monthly.png --start -1m \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
LINE:$i$COLOR:"$i" 

#yearly
rrdtool graph $OUTDIR/${i}_yearly.png --start -1y \
DEF:$i=$RRDDIR/$i.rrd:$i:AVERAGE \
LINE:$i$COLOR:"$i" 

done

