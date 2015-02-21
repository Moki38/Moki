#!/bin/bash
RRDDIR="/data/moki/rrd/"
OUTDIR="/data/moki/public/rrd"
RRDTOOL=/usr/bin/rrdtool

VALUE=$2

$RRDTOOL update $RRDDIR/$1.rrd N:$2

echo "`date` $1 $2" >> $RRDDIR/update.log
