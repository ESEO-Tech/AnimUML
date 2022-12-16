#!/bin/sh

for url in $(egrep -o '"(http[^"]*)"' zero-md.min.js | sed -e 's/^"//;s/"$//') ; do
	wget $url
done

