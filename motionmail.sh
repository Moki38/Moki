#!/bin/bash

curdate=`date +"%Y-%m-%d %H:%M:%S"`
attachedPic=$1

#sendEmail -f motion@team-moki.nl -t moki@team-moki.nl -u "Moki Motion" -m "Motion detected - "$curdate 
#sendEmail -f motion@team-moki.nl -t moki@team-moki.nl -u "Moki Motion" -m "Motion detected - "$curdate -a $attachedPic 

#clean up the tmp snapshot dir
#rm -rf /motion/*
