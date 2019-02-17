"use strict";

export class xWebMIDI {
  constructor() {
    this.sysex = false;
    this.midiAccess = {};
    this.midi = { inputs: new Array(), outputs: new Array() };
    this.midiAccess = {};
    this.ready = { input: false, output: false };
    this.timerId = { input: 0, output: 0 };
    this.autoselect = "";
    this.autoreselect = true;
    this.additionalid = "";
    this.midiAccess = {};
    this.inputIdx = "false";
    this.outputIdx = "false";
    this.pfmNow = 0;
    this.pitchBendRange = { min:0, max:16384, center:8192 }; // Apple DLS Synth
    //    this.targetDomId = { input: "", output: ""};
      
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
  }
  convertKey2Itnl(keyno) {
    return this.key2Itnl[parseInt(keyno)];
  }
  convertItnl2Key(itnl) {
    return this.itnl2Key[itnl];
  }
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
    console.log(access);
    this.midiAccess = access;
    this.midiAccess.ready = {
      input: true,
      output: true
    };
    if(typeof this.midiAccess.addOptions == "undefined") {
      this.midiAccess.addOptions = this.addOptions.bind(this);
    }
    access.onstatechange=function(event){
      let portList;
      if(event.port.type=="input") portList=this.midi.inputs;
      if(event.port.type=="output") portList=this.midi.outputs;
      let exist=false, Idx=false;
      let i=0;
      for(let portIdx in portList) {
        if(portList[portIdx].id==event.port.id) {
          exist=true;
          portList[portIdx]=event.port;
          Idx=i;
        }
        if(exist==true) break;
        i++;
      }
      if(exist==false) {
        if(portList==false) portList=[];
        let Idx=0, ex_portIdx=0;
        for(let portIdx in portList) {
          if(typeof portList[Idx]=="undefined") {
            break;
          }
          Idx++;
        }
        portList[Idx]=event.port;
      }
      if(event.port.type=="input") this.midi.inputs = portList;
      if(event.port.type=="output") this.midi.outputs = portList;

      this.fire("x-webmidi:"+event.port.type+"-updated", {"idx": Idx, "member": (exist==true ? "old" : "new"), "port": event.port});
    }.bind(this);
    let inputIterator=access.inputs.values();
    for(let o=inputIterator.next(); !o.done; o=inputIterator.next()) {
      if(this.midi.inputs.length==0) this.midi.inputs = [];
      this.midi.inputs.push(o.value);
    }

    let outputIterator = access.outputs.values();
    for(let o=outputIterator.next(); !o.done; o=outputIterator.next()) {
      if(this.midi.outputs === false) this.midi.outputs=[];
      this.midi.outputs.push(o.value);
    }
    
    this.ready.input = true;
    this.ready.output = true;
  }
  fire(value) {
    console.log(value);
  }
  addAdditionalDevice(midiType, additionalDevice, elemId, exSelected, autoSelect) {
    let result = { autoselected: false, idx: false };
    let idx = 99999;
    switch(midiType) {
    case 'input':
      this.midi.inputs[idx]=additionalDevice;
      result = this.addOptions(midiType, 'add', { idx: idx, port: additionalDevice }, elemId, exSelected, autoSelect);
      break;
    case 'output':
      this.midi.outputs[idx]=additionalDevice;
      result = this.addOptions(midiType, 'add', { idx: idx, port: additionalDevice }, elemId, exSelected, autoSelect);
      break;
    }
    return result;
  }
  appendFileImport(type) {
    /*
      let href;
      switch(type) {
      case "input":
      href="x-webmidiinput.html";
      break;
      case "output":
      href="x-webmidioutput.html";
      break;
      }
      let elem=document.createElement("link");
      elem.rel="import";
      elem.href=href;
      document.body.appendChild(elem);
    */
  }
  addOptions(midiType, updateType, detail, selectElemId, exSelected, autoSelect) {
    let elem = document.getElementById(selectElemId);
    let ports, result={"autoselected": false, "idx":false};
    let addIdx=detail.idx;
    switch(midiType) {
    case 'output':
      ports = this.midi.outputs;
      break;
    case 'input':
      ports = this.midi.inputs;
      break;
    }
    let out;
    switch(updateType) {
    case 'add':
      if(addIdx=='all') {
        let i=0;
        for(let idx in ports) {
          out = appendOption(ports[idx].name, i, selectElemId, autoSelect);
          if(out.autoselected === true) result=out;
          i++;
        }
      }
      else if(typeof addIdx == 'number'){
        result = appendOption(detail.port.name, addIdx, selectElemId, autoSelect);
      }
      break;
    case 'update':
      result = updateOption(ports[addIdx].state, addIdx, selectElemId, exSelected);
      break;
    }
    function appendOption(name, idx, selectElemId, autoSelect) {
      let selectElem = document.getElementById(selectElemId);
      selectElem.appendChild((new Option(name, idx)));
      let out=false, outIdx=false;
      if(name.match(new RegExp(autoSelect))!=null) {
        let op_idx="";
        for(let i=0; i<selectElem.options.length; i++) {
          if(parseInt(selectElem.options[i].value, 10)==parseInt(idx, 10)) {
            op_idx=i;
            idx=selectElem.options[i].value;
            break;
          }
        }
        selectElem.selectedIndex=op_idx; 
        out=true; outIdx=idx;
      };
      return {"autoselected": out, "idx":outIdx};
    };
    let updateOption = (updateType, idx, selectElem, exSelected) => {
      let out=false, outIdx=false;
      let i=0;
      for(let tmp_op_idx in selectElem.options) {
        if(selectElem.options[tmp_op_idx].value==idx) {
          if(updateType=="disconnected") {
            selectElem.options[tmp_op_idx].setAttribute("hidden", "hidden");
            if(selectElem.selectedIndex==tmp_op_idx) {
              selectElem.selectedIndex=0;
            }
          } else 
            if(updateType=="connected") {
              selectElem.options[tmp_op_idx].removeAttribute("hidden");
              if(exSelected==true) {
                selectElem.selectedIndex=i;
                out=true; outIdx=selectElem.options[tmp_op_idx].value;
              }
            }
        }
        i++;
      }
      return {"autoselected": out, "idx":outIdx};
    };
    return result;
  }
  //
  //
  // for input  
  initInput(elemId) {
    //this.targetDomId.input = elemId;
    var self = this;
    var timerId = setInterval(function(){
      var result = { autoselected: false, idx: false };
      //var mididom=document.getElementsByTagName("x-webmidirequestaccess");
      var mididom = document.getElementById(elemId);
      if(self.midiAccess.ready.input==true) {
        clearInterval(timerId);
        //var elem = self.$["midiin"];
        //result = self.midiAccess.addOptions("input", "add", {"idx": "all"}, elem, null, self.autoselect);
        result = self.midiAccess.addOptions("input", "add", {"idx": "all"}, elemId, null, self.autoselect);
        if(result.autoselected===true) {
          // fire setMIDIINDevice
          var target = {"value":result.idx};
          self.setMIDIINDevice.bind(self)(target);
          self.fire("midiin-autoselected:"+self.id, {"idx": result.idx});
        }
        document.getElementById(elemId).addEventListener("change", function(event){
          self.setMIDIINDevice.bind(self)(event.target);
        });
        /*
        self.$["midiin"].addEventListener("change", function(event){
          self.setMIDIINDevice.bind(self)(event.target);
        });
        self.midiAccess.addEventListener("x-webmidi:input-updated", function(event){
          var result={"autoselected": false, "idx":false};
          var port=event.detail.port, detail=event.detail;
          var elem = self.$["midiin"];
          var selected = false;
          switch(detail.member) {
          case "new":
            result=self.midiAccess.addOptions("input", "add", detail, elemId, selected, self.autoselect);
            break;
          case "old":
            if(self.autoreselect==false && port.state=="disconnected") {
              if(self.inputIdx!="false") {
                self.midiAccess.midi.inputs[self.inputIdx].onmidimessage=null;
                self.inputIdx="false";
              }
            }
            if(detail.idx==self.inputIdx
               || detail.port.name==self.autoselect) {
              selected=true;
            }
            result=self.midiAccess.addOptions("input", "update", detail, "", selected, self.autoselect);
            break;
          }
          if(result.autoselected===true) {
            // fire setMIDIINDevice
            var target={"value":result.idx}
            self.setMIDIINDevice.bind(self)(target);
            self.fire("midiin-autoselected:"+self.id, {"idx": result.idx});
          }
        });
        // add aditional input
        if(self.additionalid!="") {
          var virtualElem=document.getElementById(self.additionalid);
          var additionalInput=virtualElem.getInput();
          var result=self.midiAccess.addAdditionalDevice("input", additionalInput, elem, "", self.autoselect);
          self.$["virtual-input"].appendChild(virtualElem.getElement());
          if(result.autoselected===true) {
            // fire setMIDIINDevice
            var target = {"value":result.idx};
            self.setMIDIINDevice.bind(self)(target);
            self.fire("midiin-autoselected:"+self.id, {"idx": result.idx});
          }
        }
*/
      }
    }, 100);
  }
  // for input
  setMIDIINDevice(target){
    var Idx=target.value;
    //var inputs=this.midi.midiAccess.inputs;
    var inputs=this.midi.inputs;
    //if(this.inputIdx!="false") {
    if(this.inputIdx!="false" || Idx=="" || Idx=="false" || Idx===false) {
      inputs[this.inputIdx].onmidimessage=null; // delete ex-input
      this.inputIdx="false";
    }
    for(let key in inputs) {
      if(key==Idx) {
        if(typeof inputs[key]!="undefined" && inputs[key]!==null) {
          if(typeof inputs[key].onmidimessage=="function") {
            // TODO: Input parameter should be in array format to be able to obtain message from multiple input devices.
            console.log("[ERROR] alredy selected");
          } else {
            inputs[key].onmidimessage=this.onMIDIMessage.bind(this); // set new input
            this.inputIdx=Idx; // set new input to object property
          }
        }
      }
    }
    this.fire("midiinput-updated:"+this.id, {"inputIdx": this.inputIdx});

    // disp virtual input
    if(this.inputIdx!="false" && typeof inputs[Idx].virtual!="undefined") {
      this.$["virtual-input"].className=this.$["virtual-input"].className.replace("none", "");
      setTimeout(function(){
        //this.$["virtual-input"].style.setProperty("opacity", 1);
        document.getElementById("virtual-input").style.setProperty("opacity", 1);
      }.bind(this),10);
    } else  {
      this.$["virtual-input"].style.setProperty("opacity", 0);
      setTimeout(function(){
        if(this.$["virtual-input"].className.match(/none/)==null) this.$["virtual-input"].className+=" none";
      }.bind(this),600);
    }
  }
  // for input
  onMIDIMessage(event){
    var d16=[];
    var p_d16=this.parseMIDIMessage(event.data);
    p_d16.device=this.midiAccess.midi.inputs[this.inputIdx];
    p_d16.device.Idx=this.inputIdx;
    
    for(var i=0; i<event.data.length; i++) {
      d16.push("0x"+("0"+event.data[i].toString(16)).slice(-2));
    }
    if(p_d16.type!="notObject") this.fire("midiin-event:"+this.id, p_d16);
    this.updateInputIndicator.bind(this)();
  }
  // for input
  updateInputIndicator() {
    // indicator
    if(this.$["midiin"].className.match("midiactive")==null) {
      this.$["midiin"].className=this.$["midiin"].className.replace(/^\s+|\s+$/g, "")+" midiactive";
    }
    let exTimerId = this.timerId.input;
    this.timerId.input = setTimeout(function() {
      clearTimeout(exTimerId);
      this.$["midiin"].className=this.$["midiin"].className.replace("midiactive", "").replace(/^\s+|\s+$/g, "");
    }.bind(this), 300);
  }

  //
  //
  // for output
  initOutput(elemId) {
    //this.targetDomId.output = elemId;
    var self = this;
/*
    var timerId=setInterval(function(){
      var result={"autoselected": false, "idx":false};
      //var mididom=document.getElementsByTagName("x-webmidirequestaccess");
      var mididom = document.getElementById(elemId);
      self.midiAccess=self.midi;
      if(self.midiAccess.ready.input==true) {
        clearInterval(timerId);
        var elem=self.$["midiin"];
        result=self.midiAccess.addOptions("input", "add", {"idx": "all"}, elem, null, self.autoselect);
        if(result.autoselected===true) {
          // fire setMIDIINDevice
          var target={"value":result.idx}
          self.setMIDIINDevice.bind(self)(target);
          self.fire("midiin-autoselected:"+self.id, {"idx": result.idx});
        }
        self.$["midiin"].addEventListener("change", function(event){
          self.setMIDIINDevice.bind(self)(event.target);
        });
        self.midiAccess.addEventListener("x-webmidi:input-updated", function(event){
          var result={"autoselected": false, "idx":false};
          var port=event.detail.port, detail=event.detail;
          var elem=self.$["midiin"];
          var selected=false
          switch(detail.member) {
          case "new":
            result=self.midiAccess.addOptions("input", "add", detail, elem, selected, self.autoselect);
            break;
          case "old":
            if(self.autoreselect==false && port.state=="disconnected") {
              if(self.inputIdx!="false") {
                self.midiAccess.midi.inputs[self.inputIdx].onmidimessage=null;
                self.inputIdx="false";
              }
            }
            if(detail.idx==self.inputIdx
               || detail.port.name==self.autoselect) {
              selected=true;
            }
            result=self.midiAccess.addOptions("input", "update", detail, elem, selected, self.autoselect);
            break;
          }
          if(result.autoselected===true) {
            // fire setMIDIINDevice
            var target={"value":result.idx}
            self.setMIDIINDevice.bind(self)(target);
            self.fire("midiin-autoselected:"+self.id, {"idx": result.idx});
          }
        });
        // add aditional input
        if(self.additionalid!="") {
          var virtualElem=document.getElementById(self.additionalid);
          var additionalInput=virtualElem.getInput();
          var result=self.midiAccess.addAdditionalDevice("input", additionalInput, elem, "", self.autoselect);
          self.$["virtual-input"].appendChild(virtualElem.getElement());
          if(result.autoselected===true) {
            // fire setMIDIINDevice
            var target={"value":result.idx}
            self.setMIDIINDevice.bind(self)(target);
            self.fire("midiin-autoselected:"+self.id, {"idx": result.idx});
          }
        }
      }
    }, 100);
    */
  }
  // for output
  setMIDIOUTDevice(target) {
    var Idx=target.value;
    var outputs=this.midiAccess.midi.outputs;
    if(Idx=="" || Idx=="false" || Idx===false) {
      this.outputIdx="false";
    } else {
      for(let key in outputs) {
        if(key==Idx) {
          if(typeof outputs[key]!="undefined" && outputs[key]!==null) {
            this.outputIdx=Idx; // set new output
          }
        }
      }
    }
    this.fire("midioutput-updated:"+this.id, {"outputIdx": this.outputIdx});

    // disp virtual output
    if(this.outputIdx!="false" && typeof outputs[Idx].virtual!="undefined") {
      this.$["virtual-output"].className=this.$["virtual-output"].className.replace("none", "");
      setTimeout(function(){
        this.$["virtual-output"].style.setProperty("opacity", 1);
      }.bind(this), 10);
    } else  {
      this.$["virtual-output"].style.setProperty("opacity", 0);
      setTimeout(function(){
        if(this.$["virtual-output"].className.match(/none/)==null) this.$["virtual-output"].className+=" none";
      }.bind(this), 600);
    }
  }
  // for output
  checkOutputIdx() {
    if(this.outputIdx==="false") {
      console.log("output port is NOT selected.");
      return "false";
    }
    return "true";
  }
  // for output
  updateOutputIndicator() {
    // indicator
    if(this.$["midiout"].className.match("midiactive")==null) {
      this.$["midiout"].className=this.$["midiout"].className.replace(/^\s+|\s+$/g, "")+" midiactive";
    }
    let exTimerId = this.timerId.output;
    this.timerId.output = setTimeout(function(){
      clearTimeout(exTimerId);
      this.$["midiout"].className=this.$["midiout"].className.replace("midiactive", "").replace(/^\s+|\s+$/g, "");
    }.bind(this), 300);
  }
  // for output
  sendRawMessage(msg, timestamp) {
    //this.midiAccess.midi.outputs[this.outputIdx];
    if(this.checkOutputIdx()=="false") {
      return;
    }
    if(typeof timestamp==="undefined") {
      timestamp=0;
    }
    this.initializePerformanceNow();
    var sendTimestamp=this.pfmNow+timestamp;
    if(this.midiAccess.midi.outputs[this.outputIdx].virtual==true) {
      sendTimestamp=timestamp;
    }
    this.midiAccess.midi.outputs[this.outputIdx].send(msg, sendTimestamp);
    // indicator
    this.updateOutputIndicator.bind(this)();
  }
  sendHRMessage(type, ch, param, timestamp) { //hex format
    if(this.checkOutputIdx()=="false") {
      return;
    }
    var msg=false;
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
        param[0]=this.midiAccess.convertItnl2Key(param[0].toUpperCase());
      }
      var key=param[0];
      if(param[0]!=parseInt(param[0])) {
        key=this.convertItnl2Key(param[0].toUpperCase());
      }
      //msg=["0x9"+ch, param[0], param[1]];
      msg=["0x9"+ch, key, param[1]];
      break;
    case "noteoff":
      if(typeof param!="object") {
        console.log("[noteoff: Parameter Error:param must be object] "+param);
        return;
      }
      if(typeof param[0]=="string") {
        param[0]=this.midiAccess.convertItnl2Key(param[0].toUpperCase());
      }
      var key=param[0];
      if(param[0]!=parseInt(param[0])) {
        key=this.convertItnl2Key(param[0].toUpperCase());
      }
      msg=["0x8"+ch, key, param[1]];
      break;
    case "programchange":
      msg=["0xc"+ch, param];
      break;
    case "setpitchbendrange":
      if(typeof param!="object") {
        console.log("[setpitchbendvalue: Parameter Error:param must be object] "+param);
        return;
      }
      msg=false;
      this.pitchBendRange={"min":param[0], "max":param[1], "center":(param[0]+param[1]+1)/2};
      break;
    case "pitchbend":
      if(typeof param!="number") {
        console.log("[pitchbend: Parameter Error:param must be object] "+param);
        return;
      }
      var value = param < this.pitchBendRange.min ? this.pitchBendRange.min : param > this.pitchBendRange.max ? this.pitchBendRange.max : param;
      var msb=(~~(value/128));
      var lsb=(value%128);
      msg=["0xe"+ch, lsb, msb];
      break;
    case "sustain":
      var msg=["0xb"+ch, 0x40, 0x00];
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
      var value = param < 0 ? 0 : param > 127 ? 127 : param;
      var msg=["0xb"+ch, 0x01, value];
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
      var sendTimestamp=this.pfmNow+timestamp;
      if(this.midiAccess.midi.outputs[this.outputIdx].virtual==true) {
        sendTimestamp=timestamp;
      }
      this.midiAccess.midi.outputs[this.outputIdx].send(msg, sendTimestamp);
      // indicator
      this.updateOutputIndicator.bind(this)();
    }
  }

}
