#!/bin/bash

DATE=$(date +"%Y-%m-%d_%H%M%S")

#/usr/bin/fswebcam -q -r 1280x720 -d /dev/video0 /motion/cam1/$DATE.jpg > /dev/null 2>&1
wget http://10.10.10.6:8080?action=snapshot -O /motion/cam1/$DATE.jpg > /dev/null 2>&1
ln -sf /motion/cam1/$DATE.jpg /motion/cam1/lastsnap.jpg 

wget http://10.10.10.6:8081?action=snapshot -O /motion/cam2/$DATE.jpg > /dev/null 2>&1
#/usr/bin/fswebcam -q -r 1280x720 -d /dev/video1 /motion/cam2/$DATE.jpg > /dev/null 2>&1
ln -sf /motion/cam2/$DATE.jpg /motion/cam2/lastsnap.jpg 

wget http://10.10.10.6:8082?action=snapshot -O /motion/cam3/$DATE.jpg > /dev/null 2>&1
#/usr/bin/fswebcam -q -r 1280x720 -d /dev/video2 /motion/cam3/$DATE.jpg > /dev/null 2>&1
ln -sf /motion/cam3/$DATE.jpg /motion/cam3/lastsnap.jpg 
