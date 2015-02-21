#!/bin/bash

DATE=$(date +"%2w")

cd /motion/cam1
avconv -y -i *.jpg -r 10 -vcodec libx264 -q:v 20 -vf crop=1280:720,scale=iw:ih timelapse_$DATE.mp4
find /motion/cam1/*.jpg -type f -ctime +3 -exec rm{}\;

cd /motion/cam2
avconv -y -i *.jpg -r 10 -vcodec libx264 -q:v 20 -vf crop=1280:720,scale=iw:ih timelapse_$DATE.mp4
find /motion/cam2/*.jpg -type f -ctime +3 -exec rm{}\;

#cd /motion/cam3
#avconv -y -i *.jpg -r 10 -vcodec libx264 -q:v 20 -vf crop=1280:720,scale=iw:ih timelapse_$DATE.mp4
#find /motion/cam3/*.jpg -type f -ctime +3 -exec rm{}\;

