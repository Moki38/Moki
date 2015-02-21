#!/bin/sh -e

#set -x 

#cd /data/moki
#killall -q -9 mjpg_streamer
#sleep 2

cd /data/moki/mjpg-streamer/mjpg-streamer-experimental
./mjpg_streamer -i "./input_uvc.so -n -f 5 -r 1280x720 -d /dev/video0" -o "./output_http.so  -n -w /usr/local/www -p 8080" &
./mjpg_streamer -i "./input_uvc.so -n -f 5 -r 1280x720 -d /dev/video1" -o "./output_http.so  -n -w /usr/local/www -p 8081" &

cd /data/moki
/usr/bin/node server.js >> /data/moki/server.log 2>&1

exit 0
