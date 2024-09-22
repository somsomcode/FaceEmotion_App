let faceapi;
let detections = [];
let video;
let canvas;
let webSocketManager; // 웹소켓 관리 인스턴스
let detecting = false;
let detectedExpressions = [];
let resultDiv;
let countdown = 5;
let highestExpressionDiv; // 가장 높은 표정을 표시할 div

const WEBSOCKET_URL = "ws://localhost:8081/";

// 감정에 대응하는 숫자 값 매핑
const emotionToNumber = {
  neutral: 1,
  happy: 2,
  angry: 3,
  disgusted: 4,
  sad: 5,
  surprised: 6,
  fearful: 7,
};

function setup() {
  // 캔버스 생성
  canvas = createCanvas(480, 360);
  canvas.id("canvas");

  // 비디오 캡처
  video = createCapture(VIDEO);
  video.id("video");
  video.size(width, height);

  // 결과를 표시할 div 생성
  resultDiv = createDiv("");
  resultDiv.id("result");
  resultDiv.position(20, height + 20); // 화면 하단에 위치
  resultDiv.style("color", "white");
  resultDiv.style("font-size", "16px");

  // 가장 높은 표정을 표시할 div 생성
  highestExpressionDiv = createDiv("");
  highestExpressionDiv.id("highestExpression");
  highestExpressionDiv.position(20, height - 40); // 비디오 하단에 위치
  highestExpressionDiv.style("color", "white");
  highestExpressionDiv.style("font-size", "24px");

  // Face API 옵션 설정
  const faceOptions = {
    withLandmarks: true,
    withExpressions: true,
    withDescriptors: true,
    minConfidence: 0.5,
  };

  // Face API 초기화
  faceapi = ml5.faceApi(video, faceOptions, faceReady);

  // 웹소켓 관리 인스턴스 생성 및 연결 초기화
  webSocketManager = new WebSocketManager(WEBSOCKET_URL);
  webSocketManager.connect();

  // 버튼 생성 및 클릭 이벤트 처리
  const button = createButton("표정 감정 분석 시작");
  button.id("start-button"); // 버튼에 ID 추가
  button.mousePressed(startDetection);
}

// Face API 준비 완료 시 호출되는 함수
function faceReady() {
  console.log("Face API ready");
}

// 감지 시작 함수
function startDetection() {
  detectedExpressions = []; // 결과 배열 초기화
  detecting = true; // 감지 시작
  countdown = 5; // 카운트다운 초기화

  // 기존 결과 초기화
  resultDiv.html("");
  highestExpressionDiv.html("");

  const interval = setInterval(() => {
    countdown--; // 매초 카운트다운 감소
    if (countdown <= 0) {
      clearInterval(interval); // 타이머 종료
      detecting = false; // 감지 종료
      displayResult(); // 결과 표시
    }
  }, 1000);

  detectFace(); // 얼굴 감지 시작
}

// 얼굴 감지 함수
function detectFace() {
  if (detecting) {
    faceapi.detect(gotFaces);
  }
}

// 얼굴 감지 결과 처리 함수
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
    detectedExpressions.push(expressions);

    // 가장 높은 확률의 표정을 찾기
    let highestExpression = getHighestExpression(expressions);
    highestExpressionDiv.html(
      `Highest Expression: ${highestExpression.name} (${nf(
        highestExpression.value * 100,
        2,
        2
      )}%)`
    );
  }

  detectFace(); // 반복적으로 얼굴 감지
}

// 감정 분석 결과를 화면에 표시하는 함수
function displayResult() {
  if (detectedExpressions.length > 0) {
    const averageExpressions = calculateAverageExpressions(detectedExpressions);
    let highestAverageExpression = getHighestExpression(averageExpressions);

    let resultText = "Emotion Detection Result:<br/>";
    for (let [emotion, value] of Object.entries(averageExpressions)) {
      resultText += `${emotion}: ${nf(value * 100, 2, 2)}%<br/>`;
    }
    //resultDiv.html(resultText); // 결과를 화면 하단에 표시

    // 서버에 가장 높은 평균 감정의 숫자 값을 전송
    const emotionNumber = emotionToNumber[highestAverageExpression.name];
    webSocketManager.sendMessage(emotionNumber);

    // 로컬 스토리지에 결과 저장
    localStorage.setItem(
      "highestAverageExpression",
      JSON.stringify(highestAverageExpression)
    );

    // 5초 후 sum.html로 이동
    setTimeout(() => {
      window.location.href = "load.html";
    }, 1000);
  } else {
    resultDiv.html("No face detected during the detection period.");

    // 5초 후 sum.html로 이동
    setTimeout(() => {
      window.location.href = "load.html";
    }, 5000);
  }
}

// 감정 데이터의 평균 계산 함수
function calculateAverageExpressions(expressionsArray) {
  const average = {};
  const totalFrames = expressionsArray.length;

  expressionsArray.forEach((expressions) => {
    for (let [emotion, value] of Object.entries(expressions)) {
      if (!average[emotion]) {
        average[emotion] = 0;
      }
      average[emotion] += value;
    }
  });

  for (let emotion in average) {
    average[emotion] /= totalFrames;
  }

  return average;
}

// 가장 높은 감정 값을 반환하는 함수
function getHighestExpression(expressions) {
  let highest = { name: "", value: 0 };
  for (let [emotion, value] of Object.entries(expressions)) {
    if (value > highest.value) {
      highest = { name: emotion, value: value };
    }
  }
  return highest;
}

// 얼굴 경계 상자 및 랜드마크 그리기 함수
function drawDetections(detections) {
  drawBoundingBoxes(detections);
  drawLandmarks(detections);
}

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
      stroke(44, 169, 225);
      strokeWeight(3);
      point(landmark._x, landmark._y);
    });
  });
}

// draw 함수에서 카운트다운을 화면에 표시
function draw() {
  // 기존 캔버스 내용을 유지하며 카운트다운을 화면에 표시
  fill(255);
  textSize(32);
  textAlign(RIGHT, TOP);
  text(countdown, width - 20, 20);
}
