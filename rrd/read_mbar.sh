#!/bin/bash

RRDDIR="/data/moki/rrd"
OUTDIR="/data/moki/public/rrd"

rrdtool fetch rrd/mbar.rrd AVERAGE -s -60m -e -59m | tail -1 | awk '{print $2}'
