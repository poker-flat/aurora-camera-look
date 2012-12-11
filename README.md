Aurora Camera Look Angle
========================

This software listens on a UDP port for ULTRA ELTAS messages, decomposes the
messages to obtain a position of a rocket in mid-flight. The software then
calculates where the rocket should be in 10 seconds and projects that point
100km above the earth to generate a camera look angle for ground based
observers.

Dependencies
============

This project uses Node:

    URL: http://nodejs.org/download/

To install dependences, use NPM:

    $ [sudo] curl http://npmjs.org/install.sh | sh

Requires Mocha for testing:

    $ [sudo] npm install mocha

Requires Winston for logging:

    $ [sudo] npm install winston

Requires nconf for configuration:

    $ [sudo] npm install nconf

Configuration
=============

$ cp config.json.example config.json

Options
-------
env - one of "development" or "production"
ultra:host - the IP address to bind the server to when listening for SIPS/ULTRA
             UDP traffic (default "localhost")
ultra:port - the port to listen for the SIPS/ULTRA UDP traffic (default: 41234)
http:host - the IP address to bind the HTTP server (default: "localhost")
http:port - the port to bind the HTTP server (default: 8080)
log:dir - the directory where the logs should be kept (default: "logs/")
log:maxsize - the maximum size in bytes of the log file. Files will be renamed
              to file#.log (i.e., logfile1.log, logfile2.log, etc.)
              (default: 2097152)
log:json - true if you want to log all data as JSON. false otherwise.
           (default: false)

Run the server
==============

$ node server

Test with the client
====================

$ node client

Run unit tests
==============

$ mocha

