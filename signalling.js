var pc = null;
var dc = null;
if (mozRTCPeerConnection) {
  pc = new mozRTCPeerConnection();
}
if (pc) {
  dc = pc.createDataChannel("data", {ordered: true});
  pc.onsignalingstatechange = function() {
    console.log("signalingstate: " + pc.signalingState);
  };
}

function displayError(error) {
  var errdiv = document.getElementById("error");
  errdiv.firstChild.textContent = error;
  errdiv.style.className = "";
  toggleButtons(false);
}

function toggleButtons(visible) {
  document.getElementById("buttons").className = (visible ? "": "hidden");
}

function createOffer() {
  if (!pc) {
    return;
  }
  toggleButtons(false);
  var d = document.getElementById("codecontainer");
  d.className = "";
  var codeDiv = document.getElementById("code");
  // Actually generate an offer
  pc.createOffer(function(offer) {
    pc.setLocalDescription(offer, function() {
      new QRCode(codeDiv, offer.sdp);
    },
                           function(err) {
                             displayError("Error setting local offer.");
                           });
  },
                 function(error) {
                   displayError("Couldn't create an offer");
                 });
}

function createAnswer() {
  if (!pc) {
    return;
  }
  toggleButtons(false);
  document.getElementById("cameracontainer").className = "hidden";
  var d = document.getElementById("codecontainer");
  document.getElementById("createoffertext").className = "hidden";
  document.getElementById("createanswertext").className = "";
  d.className = "";
  var codeDiv = document.getElementById("code");
  // Actually generate an answer
  pc.createAnswer(function(answer) {
    pc.setLocalDescription(answer, function() {
      new QRCode(codeDiv, answer.sdp);
    },
                 function(error) {
                   displayError("Couldn't set local answer");
                 });
    },
                 function(error) {
                   displayError("Couldn't create an answer");
                 });
}

function createSessionDescription(type, sdp) {
  var o = {type: type, sdp: sdp};
  if (mozRTCSessionDescription) {
    return new mozRTCSessionDescription(o);
  }
  return null;
}

function readQR(callback) {
  if (!pc) {
    return;
  }
  toggleButtons(false);
  qrcode.callback = callback;
  var camDiv = document.getElementById("cameracontainer");
  camDiv.className = "";
  var v = document.getElementById("video");
  var out = document.getElementById("qr-canvas");
  //XXX: should wait on canplay or something in case it's not ready
  var w = v.videoWidth;
  var h = v.videoHeight;
  console.log("%d x %d", w, h);
  out.setAttribute("width", w);
  out.setAttribute("height", h);
  out.style.width = w + "px";
  out.style.height = h + "px";
  v.setAttribute("width", w);
  v.setAttribute("height", h);
  v.style.width = w + "px";
  v.style.height = h + "px";
  var outcx = out.getContext("2d");
  outcx.clearRect(0, 0, w, h);
  function capture() {
    outcx.drawImage(v, 0, 0, w, h);
    try {
      qrcode.decode();
    } catch (e) {
      setTimeout(capture, 250);
    }
  }
  setTimeout(capture, 250);
}

function readOffer() {
  console.log("readOffer");
  readQR(function(data) {
    console.log(data);
    pc.setRemoteDescription(createSessionDescription("offer", data),
                            function() {
                              createAnswer();
                            },
                            function() {
                              reportError("Error setting offer from other side.");
                            });
  });
}

function readAnswer() {
  console.log("readAnswer");
  document.getElementById("readoffertext").className = "hidden";
  document.getElementById("readanswertext").className = "";
  readQR(function(data) {
    console.log(data);
    pc.setRemoteDescription(createSessionDescription("answer", data),
                            function() {
                              console.log("Success!");
                            },
                            function() {
                              reportError("Error setting answer from other side.");
                            });
  });
}

function getUserMedia(constraints, callback, errback) {
  if (navigator.getUserMedia) {
    navigator.getUserMedia(constraints, callback, errback);
  } else if (navigator.mozGetUserMedia) {
    navigator.mozGetUserMedia(constraints, callback, errback);
  } else if (navigator.webkitGetUserMedia) {
    navigator.webkitGetUserMedia(constraints, callback, errback);
  } else {
    errback("No getUserMedia");
  }
}

function checkPrerequisites() {
  if (pc) {
    // Need a camera to read the QR code
    getUserMedia({video: true},
                 function (stream) {
                   var v = document.getElementById("video");
                   if ("mozSrcObject" in v) {
                     v.mozSrcObject = stream;
                   } else if (window.webkitURL) {
                     v.src = window.webkitURL.createObjectURL(stream);
                   }
                   v.play();
                   toggleButtons(true);
                 },
                 function (err) {
                   displayError("No camera available");
                 });
  } else {
    displayError("Your browser doesn't support WebRTC");
  }
}

addEventListener("DOMContentLoaded", function() {
  document.getElementById("create").addEventListener("click", createOffer);
  document.getElementById("read").addEventListener("click", readOffer);
  document.getElementById("offerdone").addEventListener("click", readAnswer);
  checkPrerequisites();
});
