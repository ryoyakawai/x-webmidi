# x-webmidi
## Live Demo
[http://ryoyakawai.github.io/x-webmidi/](http://ryoyakawai.github.io/x-webmidi/)

## What is this?
This is a polymer component, and this is a wrapping Web MIDI API.

 - What is MIDI? -> [MIDI@wikipedia](http://en.wikipedia.org/wiki/MIDI)
 - What is Web MIDI API? -> [Web MIDI API@W3C](http://webaudio.github.io/web-midi-api/)
 - What is Polymer? -> [polymer](https://www.polymer-project.org/)

![x-webmidi image](https://raw.githubusercontent.com/ryoyakawai/x-webmidi/gh-pages/src/images/screenshot.png)

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
### Requirements
 - [Bower](http://bower.io/)  
  - Please install bower as following [this instruction](http://bower.io/#install-bower) before to start using this component.

### Get component
#### bower
```shell
$ bower install x-webmidi;
```
#### git
```shell
$ git clone https://github.com/ryoyakawai/x-webmidi.git;
$ cd x-webmidi;
```
### include and import
```html
<script src="path/to/webcomponents.js"></script>
<link rel="import" href="x-webmidirequestaccess.html">
<x-webmidirequestaccess sysex="true" input="true" output="true"></x-webmidirequestaccess>
```
> **Parameters in x-webmidirequestaccess tag:**
>
>  -  **`sysex`**: Specify whether sysex is required or not. [true / false]
>  - **`input`**: Specify whether to use MIDI input or not. [true / false]
>  - **`output`**: Specify whether to use MIDI input or not. [true / false]
>
> **Note:**
>
> - include polyfill of Web Component if needed (NOT needed for Google Chrome!!)
> - Import x-webmidi component.

### MIDI input
#### Basic Demo
 - input
  - [Code] [https://github.com/ryoyakawai/x-webmidi/blob/master/inputsample.html](https://github.com/ryoyakawai/x-webmidi/blob/gh-pages/inputsample.html)
  - [Live Demo] [http://ryoyakawai.github.io/x-webmidi/inputsample.html](http://ryoyakawai.github.io/x-webmidi/inputsample.html)
 - input & output
  - [Code] [https://github.com/ryoyakawai/x-webmidi/blob/master/inoutsample.html](https://github.com/ryoyakawai/x-webmidi/blob/gh-pages/inoutsample.html)
  - [Live Demo] [http://ryoyakawai.github.io/x-webmidi/inpotsample.html](http://ryoyakawai.github.io/x-webmidi/inoutsample.html)

#### Set MIDI input dropdown list.
```html
<x-webmidiinput id="foo-input" autoselect="input-devicename-foo" autoreselect="true"></x-webmidiinput>
```
 - Specifying device name as parameter ` autoselect` enables to be selected the device automatically when the device is connected.


#### Add eventlistener to obtain MIDI message form selected MIDI input device.
```js
window.addEventListener('midiin-event:foo-input', event => {
  // write what you want to do.
  console.log(event.detail.);
}
```
 - Format of event name: `midiin-event:<ID which corresponds with x-webmidiinput>`
 - Raw MIDI message from Web MIDI API is in `event.detail.data`.
 - Human readable format, which is parsed from Raw MIDI message, is in `event.detail.property`.



### MIDI output
#### Basic Demo
 - input
  - [Code] [https://github.com/ryoyakawai/x-webmidi/blob/master/outputsample.html](https://github.com/ryoyakawai/x-webmidi/blob/gh-pages/outputsample.html)
  - [Live Demo] [http://ryoyakawai.github.io/x-webmidi/outputsample.html](http://ryoyakawai.github.io/x-webmidi/outputsample.html)

#### Set MIDI output dropdown list.
```html
<x-webmidioutput id="foo-output"  autoselect="output-devicename-foo" autoreselect="true"></x-webmidioutput>
```
 - Specifying device name as parameter ` autoselect` enables to be selected the device automatically when the device is connected.


#### To send MIDI message to selected MIDI device.
**Send by Array format (same format as Web MIDI API):**
```js
let midiout=document.querySelector("#foo-output");
midiout.sendRawMessage([0x90, 0x45, 0x7f]);
```
**Send by Human-Readable format:**

```js
// using int'l format
let midiout=document.querySelector("#foo-output");
midiout.sendHRMessage("noteon", 0, ["D4", 127], 0);
midiout.sendHRMessage("noteoff", 0, ["D4", 127], 1000);
```
```js
// using note number format
let midiout=document.querySelector("#foo-output");
midiout.sendHRMessage("noteon", 0, [62, 127], 0);
midiout.sendHRMessage("noteoff", 0, [62, 127], 1000);

// or ("d4" is 62 in international MIDI key number)
midiout.sendHRMessage("noteon", 0, ["d4", 127], 0);
midiout.sendHRMessage("noteoff", 0, ["d4", 127], 1000);
```

> **Basic format:**
> `midiout.sendHRMessage(type, ch, param, timestamp);`
>
> **Parameters in `sendHRMessage()` method:**
>
>  -  *(string)* **`type`**: Specify type of channel message of desiring to send. (For more detail is in table below.)
>  - *(number)* **`ch`**: Specify which channel to send. (Accepts format both in hexadecimal and in decimal.)
>  - *(array/string)* **`param`**: Specify data of desiring to send.
>
> **IMPORTANT:** Parameter format of `param` are defined depends on `type` of message to send.
>
>| type               | param                                                                            |
| :------------------| :-------------------------------------------------------------------------------- |
| noteon             | *(array)* [*(string)* note number / (string) int'l key format, *(number)* velocity] |
| noteoff            | *(array)* [*(string)* note number / (string) int'l key format, *(number)* velocity] |
| programchange      | *(number)*                                                                        |
| setpitchbendrange  | *(array)* [*(number)* minimum value, *(number)* max value]                        |
| pitchbend          | *(number)*                                                                        |
| sustain            | *(string)* [`on / off`]                                                           |
| modulation         | *(number)*                                                                        |
| allsoundoff        | `null`                                                                            |
| resetallcontroller | `null`                                                                            |
| allnoteoff         | `null`                                                                            |


## License
Apache License, Version 2.0


## Copyright
Copyright (c) 2014 Ryoya Kawai
