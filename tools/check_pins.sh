#!/bin/bash

# If we're checking only for global variable definitions of pins, then
# file ordering doesn't matter. This is because:
#
# var a = b;
# var b = 7;
#
# will be accepted by jshint, just 'a' will evaluate to 'undefined'.
# Awkward, but at least it means we can have pins.js included at any
# point in the clump of files and it won't give us false positives.

cat js/*.js | jshint -c tools/jshint.conf - | grep "not defined"
if [ "$?" == 0 ]; then
    exit 1
fi
exit 0
