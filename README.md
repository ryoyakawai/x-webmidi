## What is this?
This is a polymer component, and this is a wrapping Web MIDI API.

 - What is MIDI? -> [MIDI@wikipedia](http://en.wikipedia.org/wiki/MIDI)
 - What is Web MIDI API? -> [Web MIDI API@W3C](http://webaudio.github.io/web-midi-api/)
 - What is Polymer? -> [polymer](https://www.polymer-project.org/)

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
Google Chrome to use this component. [Chrome](http://www.google.co.jp/intl/ja/chrome/browser/)  

## Preparation
### Get component
#### bower
```
$ bower install x-webmidi;
```
#### git
```
$ git clone https://github.com/ryoyakawai/x-webmidi.git;
```
### include and import
```
<script src="path/to/webcomponents.js"></script>
<link rel="import" href="x-webmidirequestaccess.html">
<x-webmidirequestaccess sysex="true" input="true" output="true"></x-webmidirequestaccess>
```
> **Parameters in x-webmidirequestaccess tag:**
>
>  -  **`sysex`**: Specify whether sysex is required or not. [`true/false`]
>  - **`input`**: Specify whether to use MIDI input or not. [`true/false`]
>  - **`output`**: Specify whether to use MIDI input or not. [`true/false`]
>
> **Note:**
>
> - include polyfill of Web Component if needed (NOT needed for Google Chrome!!)
> - Import x-webmidi component.

### Set MIDI input dropdown list
```
<x-webmidiinput id="foo"></x-webmidiinput>
```
#### Add eventlistener to obtain MIDI message form selected MIDI input device.
```
window.addEventListener('midi-input-event', function(event) {
  // write what you want to do.
  console.log(event.detail.);
}
```
 - Raw MIDI message from Web MIDI API is in `event.detail.data`.
 - Human readable format, which is parsed from Raw MIDI message, is in `event.detail.property`.

### Set MIDI output dropdown list
```
<x-webmidioutput id="bar"></x-webmidioutput>
```
#### To send MIDI message to selected MIDI device.
**Send by Array format (same format as Web MIDI API):**
```
var midiout=document.getElementById("output-port1");
midiout.sendRawMessage([0x90, 0x45, 0x7f]);
```
**Send by Human-Readable format:**

```
// example to send
var midiout=document.getElementById("output-port1");
midiout.sendHRMessage("noteon", 0, ["D4", 127], 0);
midiout.sendHRMessage("noteon", 0, ["D4", 127], 1000);
```

> **Basic format:**
> `midiout.sendHRMessage(type, ch, param, timestamp);`
>
> **Parameters in `sendHRMessage()` method:**
>
>  -  *(string)* **`type`**: Specify type of channel message of desiring to send. 
> [`noteon/noteoff/programchange/setpitchbendrange/pitchbend/sustain/modulation/allsoundoff/resetallcontroller/allnoteoff`]
>  - *(number)* **`ch`**: Specify which channel to send.
>  - *(array/string)* **`param`**: Specify data of desiring to send.
>> **IMPORTANT:** Parameter format of `param` are defined depends on `type` of message to send.
> | type               | param                                                                             |
> | :------------------| :-------------------------------------------------------------------------------- |
> | noteon             | *(array)* [*(string)note number/(string)intern'l key letter*, *(number)velocity*] |
> | noteof             | *(array)* [*(string)note number/(string)intern'l key letter*, *(number)velocity*] |
> | programchange      | *(number)*                                                                        |
> | setpitchbendrange  | *(array)* [*(number)minimum value*, *(number)max value*]                          |
> | pitchbend          | *(number)*                                                                        |
> | sustain            | *(string)* [`on/off`]                                                             |
> | modulation         | *(number)*                                                                        |
> | allsoundoff        | `null`                                                                            |
> | resetallcontroller | `null`                                                                            |
> | allnoteoff         | `null`                                                                            |

## License
[MIT](http://opensource.org/licenses/MIT)

## Copyright
Copyright (c) 2014 Ryoya Kawai
