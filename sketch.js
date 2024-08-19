let faceapi;
let detections = [];
let video;
let canvas;
let socket;

const WEBSOCKET_URL = "ws://localhost:8081/";

function setup() {
  canvas = createCanvas(480, 360);
  canvas.id("canvas");

  video = createCapture(VIDEO);
  video.id("video");
  video.size(width, height);

  const faceOptions = {
    withLandmarks: true,
    withExpressions: true,
    withDescriptors: true,
    minConfidence: 0.5,
  };

  faceapi = ml5.faceApi(video, faceOptions, faceReady);

  initializeWebSocket();
}

function initializeWebSocket() {
  socket = new WebSocket(WEBSOCKET_URL);

  socket.onopen = () => console.log("WebSocket connection established");
  socket.onmessage = (event) =>
    console.log("WebSocket message received:", event.data);
  socket.onerror = (error) => console.error("WebSocket error:", error);
  socket.onclose = () => console.log("WebSocket connection closed");
}

function faceReady() {
  faceapi.detect(gotFaces);
}

function gotFaces(error, result) {
  if (error) {
    console.error(error);
    return;
  }

  detections = result;

  clear();
  drawDetections(detections);

  if (detections.length > 0) {
    const expressions = detections[0].expressions;
    const thresholds = {
      neutral: 90, // 1
      happy: 90, // 2
      angry: 90, // 3
      sad: 90, // 5
      surprised: 90, // 6
      fearful: 90, // 7
    };

    const emotion = determineEmotion(expressions, thresholds);
    if (emotion) {
      sendToServer(emotion);
    }
  }

  faceapi.detect(gotFaces); // Continue detecting
}

function determineEmotion(expressions, thresholds) {
  // Check if 'disgusted' is above the threshold and map it to 'angry'
  if (expressions.disgusted * 100 >= thresholds.angry) {
    return "4"; // Map 'disgusted' to 'angry' (4)
  }

  // Check other emotions and map to numerical values
  for (let [emotion, threshold] of Object.entries(thresholds)) {
    if (expressions[emotion] * 100 >= threshold) {
      switch (emotion) {
        case "neutral":
          return "1"; // Neutral
        case "happy":
          return "2"; // Happy
        case "angry":
          return "3"; // Angry
        case "sad":
          return "5"; // Sad
        case "surprised":
          return "6"; // Surprised
        case "fearful":
          return "7"; // Fearful
        default:
          return null;
      }
    }
  }

  return null; // Return null if no emotion exceeds the threshold
}

function drawDetections(detections) {
  drawBoundingBoxes(detections);
  drawLandmarks(detections);
  drawExpressions(detections, 20, 250, 14);
}

//test
function drawBoundingBoxes(detections) {
  detections.forEach((detection) => {
    const { _x, _y, _width, _height } = detection.alignedRect._box;
    stroke(44, 169, 225);
    strokeWeight(1);
    noFill();
    rect(_x, _y, _width, _height);
  });
}

function drawLandmarks(detections) {
  detections.forEach((detection) => {
    const points = detection.landmarks.positions;
    points.forEach((landmark) => {
      // Renamed 'point' to 'landmark'
      stroke(44, 169, 225);
      strokeWeight(3);
      point(landmark._x, landmark._y); // Use p5.js's point function here
    });
  });
}

function drawExpressions(detections, x, y, textYSpace) {
  if (detections.length > 0) {
    const { neutral, happy, angry, sad, disgusted, surprised, fearful } =
      detections[0].expressions;
    textFont("Helvetica Neue");
    textSize(14);
    noStroke();
    fill(44, 169, 225);

    text(`neutral: ${nf(neutral * 100, 2, 2)}%`, x, y); // 1
    text(`happiness: ${nf(happy * 100, 2, 2)}%`, x, y + textYSpace); // 2
    text(`anger: ${nf(angry * 100, 2, 2)}%`, x, y + textYSpace * 2); // 3
    text(`sad: ${nf(sad * 100, 2, 2)}%`, x, y + textYSpace * 3); // 5
    text(`disgusted: ${nf(disgusted * 100, 2, 2)}%`, x, y + textYSpace * 4); // 4
    text(`surprised: ${nf(surprised * 100, 2, 2)}%`, x, y + textYSpace * 5); // 6
    text(`fear: ${nf(fearful * 100, 2, 2)}%`, x, y + textYSpace * 6); // 7
  } else {
    const labels = [
      "neutral", // 1
      "happiness", // 2
      "anger", // 3
      "disgusted", // 4
      "sad", // 5
      "surprised", // 6
      "fear", // 7
    ];
    labels.forEach((label, index) => {
      text(`${label}:`, x, y + textYSpace * index);
    });
  }
}

function sendToServer(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("Sending data to server:", data);
    socket.send(data);
  } else {
    console.error("WebSocket is not open. Unable to send data.");
  }
}
