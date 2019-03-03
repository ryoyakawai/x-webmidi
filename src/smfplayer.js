"use strict";

export class SmfPlayer {
  constructor() {
    this.smfPlayerCore = new SmfPlayerCore();
    this.smfParser = new SmfParser();
    this.parsedMidi = null;
    this.latency = 1000; // unit is msec
  }
  init(output, latency) {
    this.setLatency(latency);
    this.smfPlayerCore.init(this.parsedMidi, this.latency, 0, output);
  }
  setLatency(latency) {
    this.latency = latency;
  }
  stopPlay() {
    this.smfPlayerCore.stopPlay();
  }
  allSoundOff() {
    this.smfPlayerCore.allSoundOff();
  }
  async startPlay(url, output, latency = 0) {
    let midi_binary = await this.setGetMidiFile(url);
    this.parsedMidi = this.smfParser.parse(midi_binary);
    this.init(output, latency);

    this.smfPlayerCore.allSoundOff();
    this.smfPlayerCore.startPlay();
    //this.smfPlayerCore.startPlay2();
  }
  setGetMidiFile(url) {
    var file_url = url;
    var xhr = new XMLHttpRequest();

    // to update to fetch
    return new Promise( (resolve, reject) => {
      xhr.responseType = "arraybuffer";
      xhr.open('GET', file_url, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200){
          var arrayBuffer=xhr.response;
          var midi_binary = "";
          if (arrayBuffer) {
            var byteArray = new Uint8Array(arrayBuffer);
            for(var i=0; i<byteArray.byteLength; i++) {
              midi_binary+=String.fromCharCode(byteArray[i]);
            }
            resolve(midi_binary);
          }
        }
      };
      xhr.onprogress = (event) => {
        var progress = parseInt(100*(event.loaded/event.total), 10);
        console.info("[progress] ", progress);
      };
      xhr.send(null);
    });
  }
}

class SmfPlayerCore {
  constructor() {
    this.mOut = null;
    this.nsx1Mode=false;
    this.rsrv=[];
    this.midiFile = null;
    this.latency = 1000; // (msec)

    this.trackStates = [];
    this.beatsPerMinute = 120;
    this.ticksPerBeat = null;
    this.channelCount = 16;
    this.timerId = 0;
    this.deltaTiming = 0;
    this.nextEventInfo = null;
    this.samplesToNextEvent = 0;
    this.finished = false;
    this.nowPlaying = false;
    this.position = 0;

    this.lastSendTiming = 0;

    this.eventTime = 0;
    this.startTime = 0;
    this.interval = 0;

    this.forwading = false;
    this.duration = 0;
    this._handlingEvents = false;
    this.eventNo = 0;
    this.posMoving = false;
  }
  init(midiFile, latency, eventNo, output) {
    this.mOut = output;
    this.midiFile = midiFile;
    this.ticksPerBeat = this.midiFile.header.ticksPerBeat;
    this.latency = latency;
    this.eventNo = eventNo;
    this.lastSendTiming = this.latency;

    this.getFirstEvent();
  }
  getFirstEvent() {
    this.eventNo = 0;
    for (var i = 0; i < this.midiFile.tracks.length; i++) {
      this.trackStates[i] = {
        'nextEventIndex': 0,
        'ticksToNextEvent': (
          this.midiFile.tracks[i].length ?
            this.midiFile.tracks[i][0].deltaTime :
            null
        )
      };
    }
    this._getNextEvent();
  }
  moveEvent(type) {
    var playing=this.nowPlaying;
    switch(type) {
    case "eventNo":
      break;
    case "forward":
      this.allSoundOff();
      this.stopPlayOnly();
      for(var i=0; i<100; i++) {
        this._getNextEvent();
      }
      break;
    case "backward":
      this.allSoundOff();
      var targetEventNo=this.eventNo;
      this.stopPlayOnly();
      this.getFirstEvent();
      while(this.eventNo<targetEventNo-100) {
        this._getNextEvent();
      }
      break;
    case "zero":
      this.allSoundOff();
      this.stopPlayOnly();
      this.getFirstEvent();
      if(this.nowPlaying==true) {
        this.changeFinished(false);
        this.startPlay();
      }
      break;
    }
    if(playing==true) {
      this.changeFinished(false);
      this.startPlay();
    }
  }
  _getNextEvent() {
    let num = 0;
    this.eventNo += 1;
    var ticksToNextEvent = null;
    var nextEventTrack = null;
    var nextEventIndex = null;
    for (var i = 0; i < this.trackStates.length; i++) {
      if ( this.trackStates[i].ticksToNextEvent != null
           && (ticksToNextEvent == null || this.trackStates[i].ticksToNextEvent < ticksToNextEvent)
         ) {
        ticksToNextEvent = this.trackStates[i].ticksToNextEvent;
        nextEventTrack = i;
        nextEventIndex = this.trackStates[i].nextEventIndex;
      }
    }

    if (nextEventTrack != null) {
      // consume event from that track
      var nextEvent = this.midiFile.tracks[nextEventTrack][nextEventIndex];
      if (this.midiFile.tracks[nextEventTrack][nextEventIndex + 1]) {
        this.trackStates[nextEventTrack].ticksToNextEvent += this.midiFile.tracks[nextEventTrack][nextEventIndex + 1].deltaTime;
      } else {
        this.trackStates[nextEventTrack].ticksToNextEvent = null;
      }
      this.trackStates[nextEventTrack].nextEventIndex += 1;
      // advance timings on all tracks by ticksToNextEvent
      for (var i = 0; i < this.trackStates.length; i++) {
        if (this.trackStates[i].ticksToNextEvent != null) {
          this.trackStates[i].ticksToNextEvent -= ticksToNextEvent;
        }
      }
      this.nextEventInfo = {
        'ticksToEvent': ticksToNextEvent,
        'event': nextEvent,
        'track': nextEventTrack
      };
      var beatsToNextEvent = ticksToNextEvent / this.ticksPerBeat;
      var secondsToNextEvent = beatsToNextEvent / (this.beatsPerMinute / 60);
    }
    else {
      this.nextEventInfo = null;
      this.samplesToNextEvent = null;
      this.finished = true;
    }
  }
  __getNextEvent() {
    this.eventNo += 1;
    var ticksToNextEvent = null;
    var nextEventTrack = null;
    var nextEventIndex = null;
    for (var i = 0; i < this.trackStates.length; i++) {
      if ( this.trackStates[i].ticksToNextEvent != null
           && (ticksToNextEvent == null || this.trackStates[i].ticksToNextEvent < ticksToNextEvent)
         ) {
        ticksToNextEvent = this.trackStates[i].ticksToNextEvent;
        nextEventTrack = i;
        nextEventIndex = this.trackStates[i].nextEventIndex;
      }
    }

    if (nextEventTrack != null) {
      // consume event from that track
      var nextEvent = this.midiFile.tracks[nextEventTrack][nextEventIndex];
      if (this.midiFile.tracks[nextEventTrack][nextEventIndex + 1]) {
        this.trackStates[nextEventTrack].ticksToNextEvent += this.midiFile.tracks[nextEventTrack][nextEventIndex + 1].deltaTime;
      } else {
        this.trackStates[nextEventTrack].ticksToNextEvent = null;
      }
      this.trackStates[nextEventTrack].nextEventIndex += 1;
      // advance timings on all tracks by ticksToNextEvent
      for (var i = 0; i < this.trackStates.length; i++) {
        if (this.trackStates[i].ticksToNextEvent != null) {
          this.trackStates[i].ticksToNextEvent -= ticksToNextEvent;
        }
      }
      this.nextEventInfo = {
        'ticksToEvent': ticksToNextEvent,
        'event': nextEvent,
        'track': nextEventTrack
      };
      var beatsToNextEvent = ticksToNextEvent / this.ticksPerBeat;
      var secondsToNextEvent = beatsToNextEvent / (this.beatsPerMinute / 60);
    }
    else {
      this.nextEventInfo = null;
      this.samplesToNextEvent = null;
      this.finished = true;
    }
  }
  _handleEvent() {
    // add absolite timestamp, and send msaage a little bit faster
    let rightNow = window.performance.now();
    //console.log(rightNow, this.startTime + this.eventTime, rightNow - this.startTime - this.eventTime);
    let time_of_diff = rightNow - this.startTime - this.eventTime; // in msec
    let time_to_play = this.startTime + this.eventTime; // in msec
    if((this.startTime + this.eventTime ) <= rightNow) {
      if(this.finished == true)  {
        this.allSoundOff();
        return;
      }
      var event = this.nextEventInfo.event;
      this.deltaTiming = this.nextEventInfo.ticksToEvent;
      this.eventTime += this.deltaTiming * this.interval;

      if(checkMessage.bind(this)(event)) {
        //this._sendToDevice(event.raw, this.eventTime);
        //this._sendToDevice(event.raw);
        this._sendToDevice(event.raw, 100 + (time_to_play)/1000);
        //this._sendToDevice(event.raw, 5 + time_of_diff/1000);
      }

      // Original
      this._getNextEvent();
      if(this.nextEventInfo!=null) {
        var nEvent = this.nextEventInfo.event;
        // Recursion
        if(nEvent.deltaTime==0 && this.finished===false) {
          clearInterval(this.timerId);
          this._handleEvent();
        }
        if(this.finished==false) {
          this.startPlay();
        }
      }
    }
    function checkMessage(event) {
      switch(event.type) {
      case "meta":
        if(event.subtype == "setTempo") {
          console.info("[Change Tempo] ", ~~(60000000/event.microsecondsPerBeat));
          console.info("[Change Interval] ", (event.microsecondsPerBeat/1000)/this.ticksPerBeat, event.microsecondsPerBeat);
          this.interval = (event.microsecondsPerBeat/1000)/this.ticksPerBeat;
          clearTimeout(this.timerId);
          if(this.finished == false) {
            this.startPlay();
          }
        }
        else {
          console.info("[meta] " + event.subtype + " : " + event.text + " : "
                       + event.key + " : " + event.scale + " : " + this.eventTime);
        }
        break;
      case "channel":
      case "sysEx":
      case "dividedSysEx":
        var sendFl=true;
        if(event.type=="sysEx") {
          var gsSysEx=[0xF0, 0x41, 0x10, 0x42, 0x12];
          if(event.raw.slice(0, gsSysEx.length).join(" ") == gsSysEx.join(" ")) {
            sendFl=false;
            for(var i=0, out=[], msg=event.raw; i<msg.length; i++) out.push(msg[i].toString(16));
            console.info("[Skip GS SYSEX] ", out.join(" "));
          }
        }

        // for dividedSysEx
        if(event.type=="sysEx") {
          if(event.raw[0] == 0xf0 && event.raw[event.raw.length-1]!=0xf7) {
            this.rsrv = event.raw;
            sendFl = false;
          }
        }
        if(event.type == "dividedSysEx") {
          event.raw.shift();
          console.log(event.raw, this.rsrv);
          Array.prototype.push.apply(this.rsrv, event.raw);
          if(this.rsrv[this.rsrv.length-1] == 0xf7) {
            event.raw = this.rsrv;
            this.rsrv = [];
          }
          else {
            sendFl = false;
          }
        }
        /*
        if(sendFl === true) {
          //this._sendToDevice(event.raw, this.startTime + this.eventTime);
          this._sendToDevice(event.raw, this.startTime + this.position);
        }
        */
        break;
      }
      this.eventTime += this.interval;
      return sendFl;
    }
  }
  _sendToDevice(msg, time = 0) {
    if(this.posMoving == true) {
      return;
    }

    this.dispEventMonitor(msg, null, this.latency);

    var sb1 = msg[0].toString(16).substr(0,1);
    var sb2 = msg[0].toString(16).substr(1,1);
    var ch = parseInt(sb2, 16);
/*
    if(ch<16 && (sb1==8 || sb1==9)) {
      if(typeof chInfo!="undefined" && chInfo[ch].on==false) {
        return;
      }
    }
    if(typeof this.mOut.virtual != "undefined" && this.mOut.virtual === true) {
      timing = this.latency;
    }
*/
    this.mOut.send(msg, time);
  }

  startPlay2() {
    this._handleEvent2.bind(this)();
  }

  startPlay() {
    clearInterval(this.timerId);
    if(this.startTime==0) {
      this.setStartTime();
      this.setGM();
    }
    if(this.finished == false) {
      this.nowPlaying = true;
      let ret = true;
      let count = 0;
      var self = this;

      this.timerId = setInterval( () => {
        self._handleEvent.bind(self)();
        if(self.finished == true) {
          clearInterval(self.timerId);
          self.stopPlay.bind(self)();
        }
      }, this.interval);
    }
  }
  stopPlayOnly() {
    this.nowPlaying=false;
    clearInterval(this.timerId);
    this.allSoundOff();
  }
  stopPlay() {
    this.stopPlayOnly();
    console.log("[Stoped SMF]");
    this.changeUiStop();
  }
  changeUiStop() {
  }
  dispEventMonitor(msg, type, latency) {
  }
  changeFinished(status) {
    this.finished=status;
    clearInterval(this.timerId);
  }
  setStartTime() {
    this.startTime = window.performance.now();
    this.eventTime = 0;
    console.log("[setStartTime]", this.startTime);
  }
  allSoundOff() {
    for(var i=0; i<16; i++) {
      var fb="0xb"+i.toString(16);
      //this._sendToDevice([fb, 0x78, 0x00], this.startTime + this.eventTime);
      this._sendToDevice([fb, 0x78, 0x00], 0);
    }
  }
  revertPitchBend() {
    for(var i=0; i<16; i++) {
      var fb="0xe"+i.toString(16);
      this._sendToDevice([fb, 0x00, 0x00], this.startTime + this.eventTime);
    }
  }
  setGM() {
    console.log("[Set GM]");
    this._sendToDevice([0xf0, 0x7e, 0x7f, 0x09, 0x01, 0xf7], 0); // GM System ON
  }
}


/**
 *  Copyright (c) 2010, Matt Westcott & Ben Firshman
 *  Copyright (c) 2014 Ryoya KAWAI
 *
 *  See LICENSE for more information.
 *
 * forked from https://github.com/gasman/jasmid
 *
 **/

class SmfParser {
  constructor() {
     this.totalTime = 0;
     this.lastDeltaTime = 0;
  }
  parse(data) {
    var stream = this.Stream(data);
    var tracks = [];
    var channels = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
    var systems = [];
    var headerChunk = this.readChunk(stream);
    if (headerChunk.id != 'MThd' || headerChunk.length != 6) {
      throw "Bad .mid file - header not found";
    }
    var headerStream = this.Stream(headerChunk.data);
    var formatType = headerStream.readInt16();
    var trackCount = headerStream.readInt16();
    var timeDivision = headerStream.readInt16();

    if (timeDivision & 0x8000) {
      throw "Expressing time division in SMTPE frames is not supported yet";
    } else {
      var ticksPerBeat = timeDivision;
    }

    var header = {
      formatType: formatType,
      trackCount: trackCount,
      ticksPerBeat: ticksPerBeat
    };
    for (var i = 0; i < header.trackCount; i++) {
      tracks[i] = [];
      var trackChunk = this.readChunk(stream);
      if (trackChunk.id != 'MTrk') {
        throw "Unexpected chunk - expected MTrk, got "+ trackChunk.id;
      }
      var trackStream = this.Stream(trackChunk.data);
      this.totalTime = 0;
      while (!trackStream.eof()) {
        var event = this.readEvent(trackStream);
        if(event!=null) {
          tracks[i].push(event);
          if(event.type=="channel") {
            channels[event.channel].push(event);
          } else {
            systems.push(event);
          }
        }
      }
    }
    return {
      header : header,
      tracks : tracks,
      systems : systems,
      channels : channels
    };
  }
  Stream(str) {
    var position = 0;

    function read(length) {
      var result = str.substr(position, length);
      position += length;
      return result;
    }

    /* read a big-endian 32-bit integer */
    function readInt32() {
      var result = (
        (str.charCodeAt(position) << 24)
          + (str.charCodeAt(position + 1) << 16)
          + (str.charCodeAt(position + 2) << 8)
          + str.charCodeAt(position + 3));
      position += 4;
      return result;
    }

    /* read a big-endian 16-bit integer */
    function readInt16() {
      var result = (
        (str.charCodeAt(position) << 8)
          + str.charCodeAt(position + 1));
      position += 2;
      return result;
    }

    /* read an 8-bit integer */
    function readInt8(signed) {
      var result = str.charCodeAt(position);
      if (signed && result > 127) result -= 256;
      position += 1;
      return result;
    }

    function eof() {
      return position >= str.length;
    }

    /* read a MIDI-style variable-length integer
       (big-endian value in groups of 7 bits,
       with top bit set to signify that another byte follows)
    */
    function readVarInt() {
      var result = 0;
      while (true) {
        var b = readInt8();
        if (b & 0x80) {
          result += (b & 0x7f);
          result <<= 7;
        } else {
          /* b is the last byte */
          return result + b;
        }
      }
    }

    function convertBinHex(data, length) {
      var out=[];
      for(var i=0; i<length; i++) {
        if(typeof data!="undefined") out.push(data.charCodeAt(i));
      }
      return out;
    }

    return {
      eof: eof,
      read: read,
      readInt32: readInt32,
      readInt16: readInt16,
      readInt8: readInt8,
      readVarInt: readVarInt,
      convertBinHex: convertBinHex
    };
  }
  // midifile.js
  readChunk(stream) {
    var id = stream.read(4);
    var length = stream.readInt32();
    return {
      'id': id,
      'length': length,
      'data': stream.read(length)
    };
  }
  readEvent(stream) {
    var event = {};
    event.deltaTime = stream.readVarInt();
    this.totalTime += event.deltaTime;
    //console.log(this.totalTime);
    var eventTypeByte = stream.readInt8();
    if ((eventTypeByte & 0xf0) == 0xf0) {
      /* system / meta event */
      if (eventTypeByte == 0xff) {
        /* meta event */
        event.type = 'meta';
        var subtypeByte = stream.readInt8();
        var length = stream.readVarInt();
        switch(subtypeByte) {
        case 0x00:
          event.subtype = 'sequenceNumber';
          if (length != 2) throw "Expected length for sequenceNumber event is 2, got " + length;
          event.number = stream.readInt16();
          event.raw = [ 0x00, event.numner ];
          return event;
        case 0x01:
          event.subtype = 'text';
          event.text = stream.read(length);
          event.raw = [ 0x01, length ];
          event.raw=event.raw.concat(stream.convertBinHex(event.text, length));
          return event;
        case 0x02:
          event.subtype = 'copyrightNotice';
          event.text = stream.read(length);
          event.raw = [ 0x02, length ];
          event.raw=event.raw.concat(stream.convertBinHex(event.text, length));
          return event;
        case 0x03:
          event.subtype = 'trackName';
          event.text = stream.read(length);
          event.raw = [ 0x03, length ];
          event.raw=event.raw.concat(stream.convertBinHex(event.text, length));
          return event;
        case 0x04:
          event.subtype = 'instrumentName';
          event.text = stream.read(length);
          event.raw = [ 0x04, length ];
          event.raw=event.raw.concat(stream.convertBinHex(event.text, length));
          return event;
        case 0x05:
          event.subtype = 'lyrics';
          event.text = stream.read(length);
          event.raw = [ 0x05, length ];
          event.raw=event.raw.concat(stream.convertBinHex(event.text, length));
          return event;
        case 0x06:
          event.subtype = 'marker';
          event.text = stream.read(length);
          event.raw = [ 0x06, length ];
          event.raw=event.raw.concat(stream.convertBinHex(event.data, length));
          return event;
        case 0x07:
          event.subtype = 'cuePoint';
          event.text = stream.read(length);
          event.raw = [ 0x07, length ];
          event.raw=event.raw.concat(stream.convertBinHex(event.text, length));
          return event;
        case 0x20:
          event.subtype = 'midiChannelPrefix';
          event.raw = '0x20';
          if (length != 1) throw "Expected length for midiChannelPrefix event is 1, got " + length;
          event.channel = stream.readInt8();
          event.raw = [ 0x20, event.channel ];
          return event;
        case 0x2f:
          event.subtype = 'endOfTrack';
          event.raw = '0x2f';
          if (length != 0) throw "Expected length for endOfTrack event is 0, got " + length;
          event.raw = [ 0x2f ];
          return event;
        case 0x51:
          event.subtype = 'setTempo';
          if (length != 3) throw "Expected length for setTempo event is 3, got " + length;
          var d1=stream.readInt8(), d2=stream.readInt8(), d3=stream.readInt8();
          event.microsecondsPerBeat = (
            (d1 << 16) + (d2 << 8) + d3
          );
          console.log("[setTempo:]", event.microsecondsPerBeat);
          event.raw = [ 0x2f, d1, d2, d3 ];
          return event;
        case 0x54:
          event.subtype = 'smpteOffset';
          if (length != 5) throw "Expected length for smpteOffset event is 5, got " + length;
          var hourByte = stream.readInt8();
          event.frameRate = {
            0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30
          }[hourByte & 0x60];
          var d1=hourByte, d2= stream.readInt8(), d3=stream.readInt8(), d4=stream.readInt8(), d5=stream.readInt8();
          event.hour = d1 & 0x1f;
          event.min = d2;
          event.sec = d3;
          event.frame = d4;
          event.subframe = d4;
          event.raw = [ 0x54, d1, d2, d3, d4, d5 ];
          return event;
        case 0x58:
          event.subtype = 'timeSignature';
          if (length != 4) throw "Expected length for timeSignature event is 4, got " + length;
          var d1=stream.readInt8(), d2=stream.readInt8(), d3=stream.readInt8(), d4=stream.readInt8();
          event.numerator = d1;
          event.denominator = Math.pow(2, d2);
          event.metronome = d3;
          event.thirtyseconds = d4;
          event.raw = [ 0x58, d1, d2, d3, d4 ];
          return event;
        case 0x59:
          event.subtype = 'keySignature';
          if (length != 2) throw "Expected length for keySignature event is 2, got " + length;
          var d1=stream.readInt8(), d2=stream.readInt8();
          event.key = d1>127 ? d1 : d1-256;
          event.scale = d2;
          event.raw = [ 0x59, event.key, event.scale];
          return event;
        case 0x7f:
          event.subtype = 'sequencerSpecific';
          event.data = stream.read(length);
          event.raw = [ 0x7f, length ];
          event.raw=event.raw.concat(stream.convertBinHex(event.data, length));
          return event;
          return null;
        default:
          // console.log("Unrecognised meta event subtype: " + subtypeByte);
          event.subtype = 'unknown';
          event.data = stream.read(length);
          return event;
        }
        event.data = stream.read(length);
        return event;
      } else if (eventTypeByte == 0xf0) {
        event.type = 'sysEx';
        var length = stream.readVarInt();
        event.data = stream.read(length);
        //event.raw = [ 0xf0, length ];
        event.raw = [ 0xf0 ];
        event.raw=event.raw.concat(stream.convertBinHex(event.data, length));
        return event;
      } else if (eventTypeByte == 0xf7) {
        event.type = 'dividedSysEx';
        var length = stream.readVarInt();
        event.data = stream.read(length);
        event.raw = [ 0xf7, event.data ];
        return event;
      } else {
        throw "Unrecognised MIDI event type byte: " + eventTypeByte;
      }
    } else {
      /* channel event */
      var param1;
      if ((eventTypeByte & 0x80) == 0) {
        /*
          running status - reuse lastEventTypeByte as the event type.
          eventTypeByte is actually the first parameter
        */
        param1 = eventTypeByte;
        eventTypeByte = this.lastEventTypeByte;
      } else {
        param1 = stream.readInt8();
        this.lastEventTypeByte = eventTypeByte;
      }
      var eventType = eventTypeByte >> 4;
      event.channel = eventTypeByte & 0x0f;
      event.type = 'channel';
      switch (eventType) {
      case 0x08:
        event.subtype = 'noteOff';
        event.noteNumber = param1;
        event.velocity = stream.readInt8();
        event.raw = [parseInt('0x8'+event.channel.toString(16), 16), event.noteNumber, event.velocity];
        return event;
      case 0x09:
        event.noteNumber = param1;
        event.velocity = stream.readInt8();
        if (event.velocity == 0) {
          event.subtype = 'noteOff';
        } else {
          event.subtype = 'noteOn';
        }
        event.raw = [parseInt('0x9'+parseInt(event.channel, 10).toString(16), 16), event.noteNumber, event.velocity];
        return event;
      case 0x0a:
        event.subtype = 'noteAftertouch';
        event.noteNumber = param1;
        event.amount = stream.readInt8();
        event.raw = [parseInt('0xa'+parseInt(event.channel, 10).toString(16), 16), event.noteNumber, event.amount];
        return event;
      case 0x0b:
        event.subtype = 'controller';
        event.controllerType = param1;
        event.value = stream.readInt8();
        event.raw = [parseInt('0xb'+parseInt(event.channel, 10).toString(16), 16), event.controllerType, event.value];
        return event;
      case 0x0c:
        event.subtype = 'programChange';
        event.programNumber = param1;
        event.raw = [parseInt('0xc'+parseInt(event.channel, 10).toString(16), 16), event.programNumber];
        return event;
      case 0x0d:
        event.subtype = 'channelAftertouch';
        event.amount = param1;
        event.raw = [parseInt('0xd'+parseInt(event.channel, 10).toString(16), 16), event.amount];
        return event;
      case 0x0e:
        event.subtype = 'pitchBend';
        event.value = param1 + (stream.readInt8() << 7);
        var msb=event.value & 0x7f;
        var lsb=event.value >>> 7;
        event.raw = [parseInt('0xe'+parseInt(event.channel, 10).toString(16), 16), msb, lsb];
        return event;
      default:
        throw "Unrecognised MIDI event type: " + eventType;
        /*
          console.log("Unrecognised MIDI event type: " + eventType);
          stream.readInt8();
          event.subtype = 'unknown';
          return event;
        */
      }
    }
  }
}
