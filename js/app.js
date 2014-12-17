/**
 *  Copyright 2014 Ryoya KAWAI
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 **/

window.addEventListener("polymer-ready", function(){
    document.getElementById("midiMsgB").addEventListener("click", function(event){
        var midiin=document.getElementById("input-port-01");
        var msg=document.getElementById("midiMsg").value;
        var ret=midiin.parseMIDIMessage(msg.split(" "));
        var disp=document.getElementById("result");
        var out=[];
        out.push("[Type] "+ret.type);
        out.push("[subType] "+ret.property.subType);
        out.push("[channel] "+ret.property.channel);
        out.push("[noteNum] "+ret.property.noteNumber);
        out.push("[velocity] "+ret.property.velocity);
        out.push("[raw] "+ret.property.raw.join(" "));

        disp.innerText=out.join("\n");
    });

    var voice=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    window.addEventListener("midioutput-updated:output-port-01", function(){
        var midiout=document.getElementById("output-port-01");
        
        // display control-area
        var elem=document.getElementById("controlarea");
        elem.style.setProperty("display", "block");
        elem.style.setProperty("visibility", "visible");
        elem.style.setProperty("opacity", "1");
        elem.style.removeProperty("margin-top");
        
        elem=document.querySelector(".select-device");
        elem.style.setProperty("opacity", "0");
        setTimeout(function(){
            document.querySelector(".select-device").style.setProperty("display", "none");
        }, 600);
        
        elem=document.querySelector(".cover");
        elem.style.setProperty("display", "none");

        // update programchange name
        updateProgramChange();
        
        // virtual keyboard
        var midiout=document.getElementById("output-port-01");
        var fkey=document.getElementById("flatkey");
        fkey.setMIDIAccess(midiout.midiAccess);
        if(midiout.checkOutputIdx!="false") {
            fkey.setMidiDevice(midiout.getOutputDevice());
        }
        document.getElementById("changeChValue").addEventListener("change", function(event){
            var ch=(parseInt(event.target.value)).toString(16);
            fkey.setChannel(ch);
            document.getElementById("prgChange").value=voice[parseInt("0x"+ch)];
            updateProgramChange();
        });
    });

    // for fireTriText
    document.getElementById("fireTri").addEventListener("click", function() {
        var midiout=document.getElementById("output-port-01");
        var ch=(parseInt(document.getElementById("changeChValue").value)-1).toString(16);

        midiout.sendHRMessage("programchange", ch, 12);
        
        midiout.sendHRMessage("noteon", ch, ["D4", 127], 0);
        midiout.sendHRMessage("noteoff", ch, ["D4", 0], 120);

        midiout.sendHRMessage("noteon", ch, ["A4", 127], 120);
        midiout.sendHRMessage("noteoff", ch, ["A4", 0], 240);

        midiout.sendHRMessage("noteon", ch, ["D5", 127], 240);
        midiout.sendHRMessage("noteoff", ch, ["d5", 0], 360);

        midiout.sendHRMessage("programchange", ch, voice[parseInt("0x"+ch)], 360);
    });

    // for Play sound with ProgramChnge
    document.getElementById("prgChange").addEventListener("mouseup", function(event){
        var midiout=document.getElementById("output-port-01");
        var val=event.target.value;
        var ch=(parseInt(document.getElementById("changeChValue").value)-1).toString(16);
        voice[parseInt("0x"+ch)]=parseInt(event.target.value);
        document.getElementById("voicename").innerText=val+". "+voiceList.getGMVoiceName("instruments", val);
        midiout.sendHRMessage("programchange", ch, parseInt(val));
    });

    // normal
    document.getElementById("fireMidi").addEventListener("click", function(event){
        var ch=(parseInt(document.getElementById("changeChValue").value)-1).toString(16);
        sendCDEFG(ch);
    });

    // with sustain
    document.getElementById("fireMidiSustain").addEventListener("click", function(event){
        var ch=(parseInt(document.getElementById("changeChValue").value)-1).toString(16);
        sendCDEFG(ch, "sustain");
    });

    // with pitchbend
    document.getElementById("fireMidiBend").addEventListener("click", function(event){
        var midiout=document.getElementById("output-port-01");
        var ch=(parseInt(document.getElementById("changeChValue").value)-1).toString(16);
        midiout.sendHRMessage("setpitchbendrange", ch, [0, 16383]);
        midiout.sendHRMessage("noteon", ch, [72, 120], 0);
        var val=midiout.pitchBendRange.center;
        var d=1;
        var timerId=setInterval(function() {
                val = val + d*64;
            if(val>=midiout.pitchBendRange.max) {
                d=-1;
            } else if(val<=midiout.pitchBendRange.min) {
                d=1;
                clearInterval(timerId);
                midiout.sendHRMessage("noteoff", ch, [72, 120], 0);
                midiout.sendHRMessage("pitchbend", ch, midiout.pitchBendRange.center, 0);
            }
            if(val>midiout.pitchBendRange.min && val<midiout.pitchBendRange.max) {
                midiout.sendHRMessage("pitchbend", ch, val, 0);
            }
            document.getElementById("bendvalue").innerHTML=val;
        }, 10);
    });

    // with modulation
    document.getElementById("fireMidiMod").addEventListener("click", function() {
        var midiout=document.getElementById("output-port-01");
        var ch=(parseInt(document.getElementById("changeChValue").value)-1).toString(16);
        midiout.sendHRMessage("noteon", ch, [72, 120], 0);
        var val=0;
        var d=1;
        var t=null;
        t=setInterval(function() {
            val=val+1+d*2;
            if(val>=127) {
                d=-1;
            } else if(val<=0) {
                clearInterval(t);
                midiout.sendHRMessage("noteoff", ch, [72, 120], 0);
            }
            midiout.sendHRMessage("modulation", ch, val, 0);
            document.getElementById("modvalue").innerHTML=val;
        }, 50);
    });  
    function updateProgramChange() {
        // update programchange name
        var slider=document.getElementById("prgChange");
        var event = document.createEvent("MouseEvents");
        event.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        event.target=slider;
        slider.dispatchEvent(event);
    }
    function sendCDEFG(ch, type) {
        var midiout=document.getElementById("output-port-01");
        switch(type) {
          case "sustain":
            midiout.sendHRMessage("sustain", ch, "on", 0);
            midiout.sendHRMessage("sustain", ch, "off", 3000);
            break;
        }
        midiout.sendHRMessage("noteon", ch, [72, 60], 0);
        midiout.sendHRMessage("noteoff", ch, [72, 60], 500);
        
        midiout.sendHRMessage("noteon", ch, [74, 80], 500);
        midiout.sendHRMessage("noteoff", ch, [74, 80], 1000);
        
        midiout.sendHRMessage("noteon", ch, [76, 100], 1000);
        midiout.sendHRMessage("noteoff", ch, [76, 100], 1500);
        
        midiout.sendHRMessage("noteon", ch, [77, 120], 1500);
        midiout.sendHRMessage("noteoff", ch, [77, 120], 2000);
        
        midiout.sendHRMessage("noteon", ch, [79, 127], 2000);
        midiout.sendHRMessage("noteoff", ch, [79, 127], 2500);
    }

    document.getElementById("sendRaw").addEventListener("click", function() {
        var midiout=document.getElementById("output-port-01");
        var ch=(document.getElementById("changeChValue").value-1).toString(16);

        midiout.sendRawMessage(["0x9"+ch, 72, 60], 0);
        midiout.sendRawMessage(["0x8"+ch, 72, 60], 500);

        midiout.sendRawMessage(["0x9"+ch, 74, 80], 500);
        midiout.sendRawMessage(["0x8"+ch, 74, 80], 1000);

        midiout.sendRawMessage(["0x9"+ch, 76, 100], 1000);
        midiout.sendRawMessage(["0x8"+ch, 76, 100], 1500);

        midiout.sendRawMessage(["0x9"+ch, 77, 120], 1500);
        midiout.sendRawMessage(["0x8"+ch, 77, 120], 2000);

        midiout.sendRawMessage(["0x9"+ch, 79, 127], 2000);
        midiout.sendRawMessage(["0x8"+ch, 79, 127], 2500);

    });

});
