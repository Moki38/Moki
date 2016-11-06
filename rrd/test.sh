#!/bin/bash

#set -x

RRDDIR="/data/moki/rrd"
OUTDIR="/data/moki/public/rrd"

VALUE=$1
 
#define the desired colors for the graphs
COLOR="#CC0000"

cd $RRDDIR
for i in `ls -1 *.rrd | cut -f1 -d. `
do

if [[ $i == solar* ]]
then
  echo COLOR="#0000CC"
fi


echo $i $COLOR

done

