"use strict";

export class xWebMIDI {
  constructor() {
    this.sysex = false;
    this.midiAccess = {};
    this.midi = { inputs: new Array(), outputs: new Array() };
    this.midiAccess = {};
    this.ready = { input: false, output: false };
    this.autoselect = true;
    this.autoreselect = true;
    this.additionalid = "";
    this.midiAccess = {};
    this.inputIdx = "false";
    this.outputIdx = "false";
    this.pfmNow = 0;
    this.pitchBendRange = { min:0, max:16384, center:8192 }; // Apple DLS Synth
    this.targetDomId = { input: null, output: null };
    this.activeTimerId = { input: 0, output: 0 };
    this.activeClassName = { input: 'xwebmidi-port-active', output: 'xwebmidi-port-active' };

    this.itnl2Key = [];
    this.key2Itnl = [];
    const key = {
      "note": ["C", "D", "E", "F", "G", "A", "B"],
      "order": ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    };
    for(let i=24, j=0, number=1; i<=108; i++) {
      this.itnl2Key[key["order"][j]+number]=i;
      this.key2Itnl[i]=key["order"][j]+number;
      j++;
      if(j==key["order"].length) {
        j=0; number++;
      }
    }
    this.itnl2Key["A0"]=21,  this.key2Itnl[21]="A0";
    this.itnl2Key["A#0"]=22, this.key2Itnl[22]="A#0";
    this.itnl2Key["B0"]=23,  this.key2Itnl[23]="B0";

    this.addLinkStyleSheet();
  }
  addLinkStyleSheet() {
    let head_link = document.head.getElementsByTagName("link");
    let isFound = false;
    for(let i in head_link) {
      if(head_link[i].rel == "stylesheet") {
        isFound = true;
        break;
      }
    }
    if(isFound == false) {
      let link_rel_css = document.createElement("link");
      link_rel_css.rel = "stylesheet";
      link_rel_css.href = "./xwebmidi.css";
      document.head.appendChild(link_rel_css);
    }
  }
  initializePerformanceNow() {
    this.pfmNow = window.performance.now();
  }
  convertKey2Itnl(keyno) {
    return this.key2Itnl[parseInt(keyno)];
  }
  convertItnl2Key(itnl) {
    return this.itnl2Key[itnl];
  }
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  /**
   *
   * Web MIDI API
   *
   **/
  async requestMIDIAccess(sysex) {
    this.sysex = sysex;
    if(typeof sysex === "undefined") {
      this.sysex = false;
    }
    return new Promise( async (resolve, reject) => {
      try {
        let options = { sysex: this.sysex };
        let access = await navigator.requestMIDIAccess(options);
        this.successCallback.bind(this)(access);
        resolve();
      } catch(e) {
        this.errorCallback(e);
        reject();
      }
    });
  }
  errorCallback(msg) {
    console.log("[ERROR] ", msg);
  }
  successCallback(access) {
    this.midiAccess = access;

    let inputIterator = access.inputs.values();
    for(let o=inputIterator.next(); !o.done; o=inputIterator.next()) {
      if(this.midi.inputs.length==0) this.midi.inputs = [];
      this.midi.inputs.push(o.value);
    }

    let outputIterator = access.outputs.values();
    for(let o=outputIterator.next(); !o.done; o=outputIterator.next()) {
      if(this.midi.outputs === false) this.midi.outputs=[];
      this.midi.outputs.push(o.value);
    }

    access.onstatechange = this._onStateChange.bind(this);
    this.ready.input = this.ready.output = true;
  }

  /**
   *
   * for MIDI INPUT and OUTPUT Port
   *
   **/
  _onStateChange(event) {
    let portList = this.midi[event.port.type + "s"]; // this.midi["inputs"/"outputs"]
    let port_exists = { status: false, id: 99999999 };
    let exist = false;
    let Idx = false;
    let i = 0;
    // to check whether the informed port's existed in the past
    for(let portIdx in portList) {
      if(portList[portIdx].id == event.port.id) {
        // tagged as OLD due to the port existed in the past
        port_exists = {
          status: true,
          id: portIdx
        };
        portList[portIdx] = event.port;
        break;
      }
    }
    if(port_exists.status == false) {
      let index_max = 0;
      for(let key in portList) {
        if(key < 99999) {
          index_max = key;
        }
      };
      console.log(index_max);
      portList[index_max] = event.port;
      port_exists.id = index_max;
    }

    this.midi[event.port.type + "s"] = portList;

    let value_detail = {idx: port_exists.id, member: (port_exists.status == true ? 'old' : 'new' ), port: event.port};
    switch(event.port.type){
    case 'input':
      this.inputUpdated({detail: value_detail});
      break;
    case 'output':
      this.outputUpdated({detail: value_detail});
      break;
    }
  }
  setSoftwareOutputDeveice(additionalDevice, additionalDeviceName, elemId, exSelected, autoSelect) {
    let _additionalDevice = additionalDevice;
    _additionalDevice.name = additionalDeviceName;
    return this.addAdditionalDevice('output', _additionalDevice, elemId, exSelected, autoSelect);
  }
  addAdditionalDevice(midiType, additionalDevice, elemId, exSelected, autoSelect) {
    let result = { autoselected: false, idx: false };
    let idx = 99999;
    switch(midiType) {
    case 'input':
      this.midi.inputs[idx] = additionalDevice;
      result = this.addOptions.bind(this)(midiType, 'add', { idx: idx, port: additionalDevice }, elemId, exSelected, autoSelect);
      break;
    case 'output':
      this.midi.outputs[idx] = additionalDevice;
      result = this.addOptions.bind(this)(midiType, 'add', { idx: idx, port: additionalDevice }, elemId, exSelected, autoSelect);
      break;
    }
    return result;
  }
  addOptions(midiType, updateType, detail, selectElemId, exSelected, autoSelect) {
    let elem = document.getElementById(selectElemId);
    let ports, result = { autoselected: false, idx:false };
    let addIdx = detail.idx;
    let err = new Error();

    switch(midiType) {
    case 'input':
      ports = this.midi.inputs;
      break;
    case 'output':
      ports = this.midi.outputs;
      break;
    }
    let out;
    switch(updateType) {
    case 'add':
      if(addIdx == 'all') {
        if (midiType == "input") { }
        let i = 0;
        for(let idx in ports) {
          out = this._appendOption.bind(this)(ports[idx].name, i, selectElemId, autoSelect);
          if(out.autoselected === true) result = out;
          i++;
        }
      } else if(typeof addIdx == 'number'){
        result = this._appendOption.bind(this)(detail.port.name, addIdx, selectElemId, autoSelect);
      }
      break;
    case 'update':
      result = this._updateOption.bind(this)(ports[addIdx].state, addIdx, selectElemId, exSelected);
      break;
    }
    return result;
  }
  // only used by addOptions()
  _appendOption(name, idx, selectElemId, autoSelect) {
    let selectElem = document.getElementById(selectElemId);
    let ret = false;
    if(selectElem == null) {
      console.log('[INPUT] Not set inputport.');
    } else {
      selectElem.appendChild((new Option(name, idx)));
      let autoselect = false, selectedIdx = false;
      if(name.match(new RegExp(autoSelect)) != null) {
        let op_idx="";
        for(let i in selectElem.options) {
          if(parseInt(selectElem.options[i].value, 10) == parseInt(idx, 10)) {
            op_idx = i;
            idx = selectElem.options[i].value;
            break;
          }
        }
        selectElem.selectedIndex = op_idx;
        autoselect = true; selectedIdx = idx;
      };
      ret = { autoselected: autoselect, idx: selectedIdx };
    }
    return ret;
  }
  // only used by addOptions()
  _updateOption(updateType, idx, selectElemId, exSelected) {
    let selectElem = document.getElementById(selectElemId);
    let ret = false;
    if(selectElem == null) {
      console.log('[INPUT] Not set inputport.');
    } else {
      let autoselect = false, selectedIdx = false;
      let i = 0;
      for(let tmp_op_idx in selectElem.options) {
        if(selectElem.options[tmp_op_idx].value==idx) {
          if(updateType=="disconnected") {
            selectElem.options[tmp_op_idx].setAttribute("hidden", "hidden");
            if(selectElem.selectedIndex==tmp_op_idx) {
              selectElem.selectedIndex=0;
            }
          } else if(updateType=="connected") {
            selectElem.options[tmp_op_idx].removeAttribute("hidden");
            if(exSelected == true) {
              selectElem.selectedIndex=i;
              autoselect = true; selectedIdx=selectElem.options[tmp_op_idx].value;
            }
          }
        }
        i++;
      }
      ret = { autoselected: autoselect, idx: selectedIdx };
    }
    return ret;
  }


  /**
   *
   * for MIDI INPUT Port
   *
   **/
  initInput(elemId='', activeClassName) {
    if(elemId == '') {
      console.error('[ERROR] initInput(elemId, activeClassName) elemId is required to specify to init.');
      return;
    }
    if(document.getElementById(elemId) == null) {
      console.error('[ERROR] initInput(elemId, activeClassName) :: Specified elemId is not defined in the DOM');
      return;
    }

    this.targetDomId.input = elemId;
    if(typeof activeClassName!= "undefined") this.activeClassName.input = activeClassName;

    document.getElementById(elemId).addEventListener("change", function(event){
      this.setMIDIINDevice.bind(this)(event.target);
    }.bind(this));

    let result = { autoselected: false, idx: false };
    let mididom = document.getElementById(elemId);

    // add 'not selected' option automatically
    let options = mididom.getElementsByTagName("option");
    let not_selected_find = false;
    for(let i=0; i<options.length; i++) {
      if(options[i].value == "false") {
        not_selected_find = true;
      }
    }
    if(!not_selected_find) {
      mididom.appendChild((new Option("Not Selected", "false")));
    }

    result = this.addOptions('input', 'add', { idx: 'all' }, elemId, null, this.autoselect);
    if(result.autoselected === true) {
      let target = { value :result.idx };
      this.setMIDIINDevice.bind(this)(target);
    }
  }
  async setMIDIINDevice(target){
    let Idx = target.value;
    //let inputs=this.midi.midiAccess.inputs;
    let inputs = this.midi.inputs;
    //if(this.inputIdx!="false") {
    if(this.inputIdx != "false" ||
       Idx == "" || Idx == "false" || Idx === false) {
      inputs[this.inputIdx].onmidimessage=null; // delete ex-input
      this.inputIdx="false";
    }
    for(let key in inputs) {
      if(key == Idx) {
        if(typeof inputs[key]!="undefined" && inputs[key]!==null) {
          if(typeof inputs[key].onmidimessage == "function") {
            // TODO: Input parameter should be in array format to be able to obtain message from multiple input devices.
            console.log("[ERROR] alredy selected");
          } else {
            inputs[key].onmidimessage = this.onMIDIMessage.bind(this); // set new input
            this.inputIdx = Idx; // set new input to object property
          }
        }
      }
    }
  }
  inputUpdated(event) {
    let result = { autoselected: false, idx: false };
    let port = event.detail.port;
    let detail = event.detail;
    let elemId = this.targetDomId.input;
    let elem = document.getElementById(elemId);
    let selected = false;
    switch(detail.member) {
    case 'new':
      result = this.addOptions('input', 'add', detail, elemId, selected, this.autoselect);
      break;
    case 'old':
      if(this.autoreselect == false && port.state == "disconnected") {
        if(this.inputIdx != "false") {
          this.midi.inputs[this.inputIdx].onmidimessage = null;
          this.inputIdx = "false";
        }
      }
      if(detail.idx == this.inputIdx
         || detail.port.name == this.autoselect) {
        selected=true;
      }
      result = this.addOptions("input", "update", detail, elemId, selected, this.autoselect);
      break;
    }
    if(result.autoselected === true) {
      let target={ 'value':result.idx };
      this.setMIDIINDevice.bind(this)(target);
    }
  }
  async updateInputIndicator() {
    // indicator
    let target = document.getElementById(this.targetDomId.input);
    window.clearTimeout(this.activeTimerId.input);
    target.classList.remove(this.activeClassName.input);
    await this.sleep(5);
    target.classList.add(this.activeClassName.input);
    this.activeTimerId.input = window.setTimeout(() => {
      target.classList.remove(this.activeClassName.input);
      this.activeTimerId.input = 0;
    }, 600);
  }
  onMIDIMessage(event){
    let d16 = [];
    let p_d16 = this.parseMIDIMessage(event.data);
    p_d16.device = this.midi.inputs[this.inputIdx];
    p_d16.device.Idx = this.inputIdx;
    for(let i=0; i<event.data.length; i++) {
      d16.push("0x"+("0"+event.data[i].toString(16)).slice(-2));
    }
    if(p_d16.type!="notObject") this.fire.bind(this)("midiin-event:" + this.targetDomId.input, p_d16, 'input');
    this.updateInputIndicator.bind(this)();
  }
   // for midi event to fire into DOM
  fire(event_name, values, type) {
    let target = document.getElementById(this.targetDomId[type]);
    let event = document.createEvent('Event');
    event.detail = values;
    event.initEvent(event_name, true, true);
    target.dispatchEvent(event);
  }


  /**
   *
   * for MIDI OUTPUT Port
   *
   **/
  initOutput(elemId='', activeClassName) {
    if(elemId == '') {
      console.error('[ERROR] initOutput(elemId, activeClassName) :: elemId is required to specify to init.');
      return;
    }
    if(document.getElementById(elemId) == null) {
      console.error('[ERROR] initOutput(elemId, activeClassName) :: Specified elemId is not difined in the DOM');
      return;
    }

    this.targetDomId.output = elemId;
    if(typeof activeClassName!= "undefined") this.activeClassName.output = activeClassName;

    document.getElementById(elemId).addEventListener("change", function(event){
      this.setMIDIOUTDevice.bind(this)(event.target);
    }.bind(this));

    let result = { autoselected: false, idx: false };
    let mididom = document.getElementById(elemId);

    // add 'not selected' option automatically
    let options = mididom.getElementsByTagName("option");
    let not_selected_find = false;
    for(let i=0; i<options.length; i++) {
      if(options[i].value == "false") {
        not_selected_find = true;
      }
    }
    if(!not_selected_find) {
      mididom.appendChild((new Option("Not Selected", "false")));
    }

    result = this.addOptions("output", "add", {"idx": "all"}, elemId, null, this.autoselect);
    if(result.autoselected===true) {
      // fire setMIDIOUTDevice
      let target={ value: result.idx };
      this.setMIDIOUTDevice.bind(this)(target);
    }
  }
  async setMIDIOUTDevice(target) {
    let Idx = target.value;
    let outputs = this.midi.outputs;
    if(Idx == "" || Idx == "false" || Idx === false) {
      this.outputIdx="false";
    } else {
      for(let key in outputs) {
        if(key == Idx) {
          if(typeof outputs[key]!="undefined" && outputs[key]!==null) {
            this.outputIdx = Idx; // set new output
          }
        }
      }
    }
  }
  outputUpdated(event) {
    let result = {autoselected: false, idx:false };
    let port = event.detail.port, detail=event.detail;
    let elemId = this.targetDomId.output;
    let elem = document.getElementById(elemId);
    let selected = false;
    switch(detail.member) {
    case "new":
      result = this.addOptions("output", "add", detail, elemId, selected, this.autoselect);
      break;
    case "old":
      if(this.autoreselect == false && port.state == "disconnected") {
        if(this.outputIdx != "false") {
          this.midi.outputs[this.outputIdx].onmidimessage = null;
          this.outputIdx="false";
        }
      }
      if(detail.idx==this.outputIdx
         || detail.port.name==this.autoselect) {
        selected=true;
      }
      result = this.addOptions("output", "update", detail, elemId, selected, this.autoselect);
      break;
    }
    if(result.autoselected === true) {
      // setMIDIOUTDevice
      let target = { value: result.idx };
      this.setMIDIOUTDevice.bind(this)({value: result.idx});
    }
  }
  // for output
  checkOutputIdx() {
    let status = "true";
    if(this.outputIdx === "false") {
      console.error("[ERROR] output port is NOT selected.");
      status = "false";
    }
    return status;
  }
  // for output
  async updateOutputIndicator() {
    // indicator
    let target = document.getElementById(this.targetDomId.output);
    window.clearTimeout(this.activeTimerId.output);
    target.classList.remove(this.activeClassName.output);
    await this.sleep(10);
    target.classList.add(this.activeClassName.output);
    this.activeTimerId.output = window.setTimeout(() => {
      target.classList.remove(this.activeClassName.output);
      this.activeTimerId.output = 0;
    }, 1000);
  }
  sendRawMessage2(msg, time) {
    if(this.checkOutputIdx()=="false") {
      return;
    }
    if(typeof time === "undefined") {
      time = 0;
    }
    //console.log(msg, time);
    this.midi.outputs[this.outputIdx].send(msg, time);
    // indicator
    this.updateOutputIndicator.bind(this)();
  }
  sendRawMessage(msg, timestamp) {
    if(this.checkOutputIdx()=="false") {
      return;
    }
    if(typeof timestamp==="undefined") {
      timestamp = 0;
    }
    this.initializePerformanceNow();
    let sendTimestamp = this.pfmNow + timestamp;
    this.midi.outputs[this.outputIdx].send(msg, sendTimestamp);
    // indicator
    this.updateOutputIndicator.bind(this)();
  }
  sendHRMessage(type, ch, param, timestamp) { //hex format
    if(this.checkOutputIdx()=="false") {
      return;
    }
    let msg = false;
    let key = false;
    if(typeof timestamp==="undefined") timestamp=0;
    if(ch>=10) ch=ch.toString(16);
    type=type.toLowerCase();
    switch(type) {
    case "noteon":
      if(typeof param!="object") {
        console.log("[noteon: Parameter Error:param must be object] "+param);
        return;
      }
      if(typeof param[0]=="string") {
        param[0]=this.convertItnl2Key(param[0].toUpperCase());
      }
      key = param[0];
      if(param[0]!=parseInt(param[0])) {
        key = this.convertItnl2Key(param[0].toUpperCase());
      }
      //msg=["0x9"+ch, param[0], param[1]];
      msg = ["0x9"+ch, key, param[1]];
      break;
    case "noteoff":
      if(typeof param!="object") {
        console.log("[noteoff: Parameter Error:param must be object] "+param);
        return;
      }
      if(typeof param[0]=="string") {
        param[0]=this.convertItnl2Key(param[0].toUpperCase());
      }
      key = param[0];
      if(param[0]!=parseInt(param[0])) {
        key = this.convertItnl2Key(param[0].toUpperCase());
      }
      msg = ["0x8"+ch, key, param[1]];
      break;
    case "programchange":
      msg = ["0xc"+ch, param];
      break;
    case "setpitchbendrange":
      if(typeof param!="object") {
        console.log("[setpitchbendvalue: Parameter Error:param must be object] "+param);
        return;
      }
      msg = false;
      this.pitchBendRange={"min":param[0], "max":param[1], "center":(param[0]+param[1]+1)/2};
      break;
    case "pitchbend":
      if(typeof param!="number") {
        console.log("[pitchbend: Parameter Error:param must be object] "+param);
        return;
      }
      let value = param < this.pitchBendRange.min ? this.pitchBendRange.min : param > this.pitchBendRange.max ? this.pitchBendRange.max : param;
      let msb=(~~(value/128));
      let lsb=(value%128);
      msg=["0xe"+ch, lsb, msb];
      break;
    case "sustain":
      msg=["0xb"+ch, 0x40, 0x00];
      switch(param) {
      case "on":
        msg=["0xb"+ch, 0x40, 0x7f];
        break;
      }
      break;
    case "modulation":
      if(typeof param!="number") {
        console.log("[Parameter Error:param must be number] "+param);
        return;
      }
      value = param < 0 ? 0 : param > 127 ? 127 : param;
      msg=["0xb"+ch, 0x01, value];
      break;
    case "allsoundoff":
      msg=[ "0xb"+ch, 0x78, 0x00 ];
      break;
    case "resetallcontroller":
      msg=[ "0xb"+ch, 0x79, 0x00 ];
      break;
    case "allnoteoff":
      msg=[ "0xb"+ch, 0x7b, 0x00 ];
      break;
    }
    // send message
    if(msg!=false) {
      this.initializePerformanceNow();
      let sendTimestamp=this.pfmNow+timestamp;
      this.midi.outputs[this.outputIdx].send(msg, sendTimestamp);
      // indicator
      this.updateOutputIndicator.bind(this)();
    }
  }
  parseMIDIMessage(msg) {
    let event = { };
    let out = { };
    if(typeof msg !== "object") {
      event.type = "notObject";
      event.subType = "unkown";
      event.data = event.raw;
      event.property = event;
    } else {
      let msg16 = new Array();
      for(let i = 0; i<msg.length; i++) {
        msg16.push(msg[i].toString(16));
      }
      let eventTypeByte = msg[0].toString(16);
      event.raw = msg;

      if(eventTypeByte.substr(0,1) == "f") {
        // System Common Event & System Realtime
        switch(eventTypeByte) {
        case "f0":
          event.type = "systemCommon";
          event.subType = "SysEx";
          break;
        case "f1":
          event.type = "systemCommon";
          event.subType = "midiTimecode";
          break;
        case "f2":
          event.type = "systemCommon";
          event.subType = "songPosition";
          break;
        case "f3":
          event.type = "systemCommon";
          event.subType = "songSelect";
          break;
        case "f4":
          event.type = "systemCommon";
          event.subType = "undefined";
          break;
        case "f5":
          event.type = "systemCommon";
          event.subType = "undefined";
          break;
        case "f6":
          event.type = "systemCommon";
          event.subType = "tuningRequest";
          break;
        case "f7":
          event.type = "systemCommon";
          event.subType = "endOfSystemExclusive";
          break;
        case "f8":
          event.type = "systemRealtime";
          event.subType = "MIDIClock";
          break;
        case "f9":
          event.type = "systemRealtime";
          event.subType = "undefined";
          break;
        case "fa":
          event.type = "systemRealtime";
          event.subType = "start";
          break;
        case "fb":
          event.type = "systemRealtime";
          event.subType = "continue";
          break;
        case "fc":
          event.type = "systemRealtime";
          event.subType = "stop";
          break;
        case "fd":
          event.type = "systemRealtime";
          event.subType = "undefined";
          break;
        case "fe":
          event.type = "systemRealtime";
          event.subType = "activeSensing";
          break;
        case "ff":
          event.type = "systemRealtime";
          event.subType = "reset";
          break;
        default:
          event.subType = "unknown";
          break;
        }
      }
      else {
        // Channel Event
        event.type = "channel";
        event.statusNum = msg16[0].replace("0x", "").substr(0,1).toLowerCase();
        event.channel = parseInt((msg16[0].replace("0x", "").substr(1,1)),16);
        switch(event.statusNum) {
        case "8":
          event.subType = "noteOff";
          event.noteNumber = msg[1];
          event.velocity = msg[2];
          event.frequency = 440.0 * Math.pow(2.0, (event.noteNumber - 69.0) / 12.0);
          event.itnl = this.convertKey2Itnl(parseInt(msg[1]));
          break;
        case "9":
          event.subType = "noteOn";
          event.noteNumber = msg[1];
          event.velocity = msg[2];
          event.frequency = 440.0 * Math.pow(2.0, (event.noteNumber - 69.0) / 12.0);
          event.itnl = this.convertKey2Itnl(parseInt(msg[1]));
          // 0x9x 0xXX 0x00
          if(event.velocity == 0) event.subType = "noteOff";
          break;
        case "a":
          event.subType = "noteAftertouch";
          event.noteNumber = msg[1];
          event.amount = msg[2];
          break;
        case "b":
          event.subType = "controller";
          event.ctrlNo  =  msg[1];
          event.value  =  msg[2];
          switch(event.ctrlNo) {
          case 0x00:
          case "0x00":
            event.ctrlName = "BankSelect";
            event.valueType = "MSB";
            break;
          case 0x20:
          case "0x20":
            event.ctrlName = "BankSelect";
            event.valueType = "LSB";
            break;
          case 0x01:
          case "0x01":
            event.ctrlName = "Modulation";
            event.valueType = "MSB";
            break;
          case 0x21:
          case "0x21":
            event.ctrlName = "Modulation";
            event.valueType = "LSB";
            break;
          case 0x05:
          case "0x05":
            event.ctrlName = "Portament";
            event.valueType = "MSB";
            break;
          case 0x25:
          case "0x25":
            event.ctrlName = "Portament";
            event.valueType = "LSB";
            break;
          case 0x06:
          case "0x06":
            event.ctrlName = "DataEntry";
            event.valueType = "MSB";
            break;
          case 0x26:
          case "0x26":
            event.ctrlName = "DataEntry";
            event.valueType = "LSB";
            break;
          case 0x07:
          case "0x07":
            event.ctrlName = "MainVolume";
            event.valueType = "MSB";
            break;
          case 0x27:
          case "0x27":
            event.ctrlName = "MainVolume";
            event.valueType = "LSB";
            break;
          case 0x10:
          case "0x10":
            event.ctrlName = "PanPot";
            event.valueType = "MSB";
            break;
          case 0x2a:
          case "0x2a":
            event.ctrlName = "PanPot";
            event.valueType = "LSB";
            break;
          case 0x11:
          case "0x11":
            event.ctrlName = "Expression";
            event.valueType = "MSB";
            break;
          case 0x2b:
          case "0x2b":
            event.ctrlName = "Expression";
            event.valueType = "LSB";
            break;
          case 0x40:
          case "0x40":
            event.ctrlName = "Hold";
            event.ctrlStatus = "Off";
            if(event.value>=0x40) event.ctrlStatus = "On";
            break;
          case 0x41:
          case "0x41":
            event.ctrlName = "Portament";
            event.ctrlStatus = "Off";
            if(event.value>=0x40) event.ctrlStatus = "On";
            break;
          case 0x42:
          case "0x42":
            event.ctrlName = "SosTenuto";
            event.ctrlStatus = "Off";
            if(event.value>=0x40) event.ctrlStatus = "On";
            break;
          case 0x43:
          case "0x43":
            event.ctrlName = "SoftPedal";
            event.ctrlStatus = "Off";
            if(event.value>=0x40) event.ctrlStatus = "On";
            break;
          case 0x46:
          case "0x46":
            event.ctrlName = "SoundController1";
            break;
          case 0x47:
          case "0x47":
            event.ctrlName = "SoundController2";
            break;
          case 0x48:
          case "0x48":
            event.ctrlName = "SoundController3";
            break;
          case 0x49:
          case "0x49":
            event.ctrlName = "SoundController4";
            break;
          case 0x50:
          case "0x50":
            event.ctrlName = "SoundController5";
            break;
          case 0x5b:
          case "0x5b":
            event.ctrlName = "effectSendLevel1"; // SendLevel: Reberb
            break;
          case 0x5d:
          case "0x5d":
            event.ctrlName = "effectSendLevel3"; // SendLevel: Chrus
            break;
          case 0x5e:
          case "0x5e":
            event.ctrlName = "effectSendLevel4"; // [XG] ValiationEffect, [SC-88] SendLevel: Delay
            break;
          case 0x60:
          case "0x60":
            event.ctrlName = "DataIncrement";
            break;
          case 0x61:
          case "0x61":
            event.ctrlName = "DataDecrement";
            break;
          case 0x62:
          case "0x62":
            event.ctrlName = "NRPN";
            event.valueType = "LSB";
            break;
          case 0x63:
          case "0x63":
            event.ctrlName = "NRPN";
            event.valueType = "MSB";
            break;
          case 0x64:
          case "0x64":
            event.ctrlName = "RPN";
            event.valueType = "LSB";
            break;
          case 0x65:
          case "0x65":
            event.ctrlName = "RPN";
            event.valueType = "MSB";
            break;
          case 0x78:
          case "0x78":
            event.ctrlName = "AllSoundOff";
            break;
          case 0x79:
          case "0x79":
            event.ctrlName = "ResetAllController";
            break;
          case 0x7b:
          case "0x7b":
            event.ctrlName = "OmniOff";
            break;
          case 0x7c:
          case "0x7c":
            event.ctrlName = "OmniOn";
            break;
          case 0x7e:
          case "0x7e":
            event.ctrlName = "Mono";
            break;
          case 0x7f:
          case "0x7f":
            event.ctrlName = "Poly";
            break;
          default:
            event.ctrlName = "NotDefined";
            break;
          }
          break;
        case "c":
          event.subType = 'programChange';
          event.programNumber = msg[1];
          break;
        case "d":
          event.subType = 'channelAftertouch';
          event.amount = msg[1];
          break;
        case "e":
          event.subType = 'pitchBend';
          let msb = msg[2], lsb = msg[1];
          if( (msg[2]>>6).toString(2) == "1" ) {
            event.value = -1*(((msb-64)<<7) + lsb +1) ;
          } else {
            let bsMsb = msb<<7;
            event.value  =  bsMsb + lsb;
          }
          break;
        default:
          event.subType = "unknown";
          break;
        }
      }
    }
    out = {
      type: event.type,
      subType: event.subType,
      data : event.raw,
      property: event
    };
    return out;
  }

}
