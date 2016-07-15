# buttshock-js

[![Build Status](https://img.shields.io/travis/metafetish/buttshock-js.svg)](https://travis-ci.org/metafetish/buttshock-js)[![npm](https://img.shields.io/npm/v/buttshock.svg)(https://npmjs.com/package/buttshock)

Javascript implementation of serial based control of the following devices:

- [Erostek ET-312B Electrostimulation Device](http://shop.erostek.com/products/ET312B-Power-Unit.html)
- [Erostek ET-232 Electrostimulation Device](http://shop.erostek.com/products/ET232-Power-Unit.html)
- [Estim Systems 2B Electrostimulation Device](http://store.e-stim.co.uk/index.php?main_page=product_info&products_id=17)

API Documentation is available at [http://www.buttshock.com/doc/buttshock-js](http://www.buttshock.com/doc/buttshock-js)

## Buttshock Project Goals

If you're going to shock yourself in the butt (or other places) for
sexual pleasure, don't you want to be able to know exactly what and
how you're doing it? Even if you can't understand it, wouldn't it be
nice for people that do to have access to the knowledge and data they
need to make sure things are safe? Why is the best encryption open
source, but electrostim toys are closed?

The Buttshock project exists to reverse engineer and document
eletrostim devices so that any developer that wants to control their
devices can, via their own code.

Some of the goals of this project include:

- Documenting the communications protocols (serial or otherwise)
- Reverse engineering the firmware (where possible)
- Mapping the circuit boards and creating schematics

## Installation

``` Shell
    $ npm install -g buttshock
```

Package is available on npm at http://npmjs.org/package/buttshock

## Protocol Implementation Details

Documentation for serial link cable construction and more information
about the ET-312B protocol is available at:

https://buttshock.com/doc/et312

This library was developed and tested using a ET-312B running v1.6
firmware. The ET-232 and 2B libraries are untested, but please let us
know if you've used them and they do/don't work!

## Requirements

buttshock-js requires the serialport library if you want to actually
connect via serial. This dependency should be installed via npm.

However, the library is built to abstract the raw box protocols from
the communication medium, so it can pass packets for each box over
whatever medium you like. For instance, you could create a network
class that talks to a daemon that communicates with a serial port, if
needed.

## License

tl;dr: BSD 3-Clause license

Copyright (c) 2016, The Buttshock Project

See LICENSE file for full text.

## Versions

### 0.1.1 (2016-07-12)

- Basic ET312 functionality. Connect, exchange keys, read/write memory

### 0.1.0 (2016-07-08)

- No code. Namesquatting package on npm. I am a horrible person.
