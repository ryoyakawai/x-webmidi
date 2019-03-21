# x-webmidi
## Live Demo
[http://ryoyakawai.github.io/x-webmidi/](http://ryoyakawai.github.io/x-webmidi/)

## What is this?
This is a polymer component, and this is a wrapping Web MIDI API.

 - What is MIDI? -> [MIDI@wikipedia](http://en.wikipedia.org/wiki/MIDI)
 - What is Web MIDI API? -> [Web MIDI API@W3C](http://webaudio.github.io/web-midi-api/)

## Purpose of using this component
MIDI is well defined protocol. But to use the protocol you must learn 7bit code, such as NoteOn: 9nH, NoteOff: 8nH.
With using this component you do NOT have to learn those 7bit code. And also, you do NOT have to know about method in Web MIDI API.
What you need to understand to use this component are HTML and a few JavaScript, which is eventlistener.
Using this component allow you a quick and an easy MIDI application development.

## Supported to send MIDI Message (as is 2014 Dec. 12)

 - NoteOn
 - NoteOff
 - Program Change
 - PitchBend
 - Sustain
 - Modulation
 - AllSoundOff
 - ResetAllController
 - AllNoteOff

## Requirements (as is 2014 Dec 15)
[Google Chrome](http://www.google.co.jp/intl/ja/chrome/browser/) to use this component. 

## Preparation
### Get component
#### Clone this repository

```shell
$ git clone https://github.com/ryoyakawai/x-webmidi.git;
```

### How to use xwebmidi.js

- import xwebmidi.js
- create an instance of xwebmidi.js
- create div element and tell xwebmidi.js that where to add pull down menu input/output device to provide.
- add eventlistener to handle for MIDI input, and send MIDI message against MIDI OUTPUT 

### include and import
```html
<html>
  <head>
    <link rel="stylesheet" href="./xwebmidi.css">
  </head>
  <body>
    INPUT:
    <select id="midiin" class="xwebmidi-select-midi">
      <option value="false">Not Selected</option>
    </select>
    <br>
    OUTPUT:
    <select id="midiout" class="xwebmidi-select-midi">
      <option value="false">Not Selected</option>
    </select>

    <script type="module">
     import { xWebMIDI } from "./xwebmidi.js";
     (async () => {
       const xwm = new xWebMIDI();
       await xwm.requestMIDIAccess(true);
       xwm.initInput('midiin');
       xwm.initOutput('midiout');

       window.addEventListener('midiin-event:midiin', event => {
         console.log(event.detail.data);
         xwm.sendRawMessage(event.detail.data)
       });
     })();
    </script>
  </body>
</html>
```

Note: 
Second parameter of initInput()/initOutput() is `NOT REQURED` parameter. And the parameter for to specifying the class where to update when  MIDI message is incoming/outgoing.

### MIDI input
#### Basic Demo
 - input
  - [Code] [https://github.com/ryoyakawai/x-webmidi/blob/master/inputsample.html](https://github.com/ryoyakawai/x-webmidi/blob/gh-pages/inputsample.html)
  - [Live Demo] [http://ryoyakawai.github.io/x-webmidi/inputsample.html](http://ryoyakawai.github.io/x-webmidi/inputsample.html)
 - input & output
  - [Code] [https://github.com/ryoyakawai/x-webmidi/blob/master/inoutsample.html](https://github.com/ryoyakawai/x-webmidi/blob/gh-pages/inoutsample.html)
  - [Live Demo] [http://ryoyakawai.github.io/x-webmidi/inpotsample.html](http://ryoyakawai.github.io/x-webmidi/inoutsample.html)

### MIDI output
#### Basic Demo
 - input
  - [Code] [https://github.com/ryoyakawai/x-webmidi/blob/master/outputsample.html](https://github.com/ryoyakawai/x-webmidi/blob/gh-pages/outputsample.html)
  - [Live Demo] [http://ryoyakawai.github.io/x-webmidi/outputsample.html](http://ryoyakawai.github.io/x-webmidi/outputsample.html)

## License
Apache License, Version 2.0


## Copyright
Copyright (c) 2014 Ryoya Kawai
