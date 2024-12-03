let faceapi;
let detections = [];
let expressionDataArray = []; // 30초 동안 감지된 표정 데이터를 저장할 배열
let countdown; // 타이머 변수

const video = document.getElementById("videoInput");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const expressionResultElement = document.getElementById("expressionResult");
const finalExpressionResultElement = document.getElementById("finalExpressionResult");
const timerElement = document.getElementById("timer"); // 타이머 요소

// 타이머 시간을 상단에서 설정
const TIMER_DURATION = 10; // 타이머 시간을 수정하려면 이 값을 변경

// 페이지 로드 시 카메라 자동 시작
window.onload = function() {
    startFaceRecognition();
};

// 표정 인식이 시작되면 호출되는 함수
startButton.addEventListener("click", () => {
    startButton.disabled = true;
    stopButton.disabled = false;
    expressionDataArray = []; // 표정 데이터 배열 초기화
    startCountdown(); // 타이머 시작
});

// 표정 인식 중지
stopButton.addEventListener("click", () => {
    stopRecognition();
});

// 타이머 시작 함수 (TIMER_DURATION초 카운트다운)
function startCountdown() {
  let timeLeft = TIMER_DURATION;
  timerElement.innerText = timeLeft;

  countdown = setInterval(() => {
      timeLeft--;
      timerElement.innerText = timeLeft;

      if (timeLeft <= 0) {
          console.log("타이머 완료, stopRecognition 호출"); // 디버그 로그
          stopRecognition(); // 시간이 0이 되면 표정 인식 중지
      }
  }, 1000);
}

// 표정 인식을 중지하는 함수
function stopRecognition() {
  clearInterval(countdown); // 타이머 정지
  startButton.disabled = false;
  stopButton.disabled = true;

  // 감정 분석 완료 후 페이지 이동
  analyzeFinalEmotion().then(() => {
    console.log("페이지 이동 준비 중...");

    // 페이지 이동을 딜레이 시켜서 분석 완료 후 실행
    setTimeout(() => {
        window.location.assign("gpt.html"); // 페이지 이동 강제화
        console.log("페이지 이동 중..."); // 디버그 로그
    }, 1000); // 1초 딜레이
  });
}

// face-api.js 표정 인식 시작
async function startFaceRecognition() {
    try {
        video.srcObject = await navigator.mediaDevices.getUserMedia({
            video: {}
        });

        const faceOptions = {
            withLandmarks: true,
            withExpressions: true,
            withDescriptors: false,
            minConfidence: 0.5,
        };

        faceapi = ml5.faceApi(video, faceOptions, () => {
            detectFaces(); // 얼굴 인식 시작
        });
    } catch (error) {
        console.error("카메라 시작 실패:", error);
    }
}

function detectFaces() {
    faceapi.detect((error, result) => {
        if (error) {
            console.log(error);
            return;
        }

        detections = result;
        if (detections.length > 0) {
            const expressions = detections[0].expressions;

            // 각 표정을 퍼센트로 변환
            const expressionPercentages = {
                neutral: (expressions.neutral * 100).toFixed(2),
                happy: (expressions.happy * 100).toFixed(2),
                angry: (expressions.angry * 100).toFixed(2),
                sad: (expressions.sad * 100).toFixed(2),
                disgusted: (expressions.disgusted * 100).toFixed(2),
                surprised: (expressions.surprised * 100).toFixed(2),
                fearful: (expressions.fearful * 100).toFixed(2),
            };

            expressionResultElement.innerHTML = `
                Neutral: ${expressionPercentages.neutral}%<br>
                Happy: ${expressionPercentages.happy}%<br>
                Angry: ${expressionPercentages.angry}%<br>
                Sad: ${expressionPercentages.sad}%<br>
                Disgusted: ${expressionPercentages.disgusted}%<br>
                Surprised: ${expressionPercentages.surprised}%<br>
                Fearful: ${expressionPercentages.fearful}%
            `;

            expressionDataArray.push(expressions); // 표정 데이터를 배열에 저장
        }

        faceapi.detect(detectFaces); // 지속적인 감지
    });
}

// 종합 감정 분석 함수
async function analyzeFinalEmotion() {
  const averagedExpressions = {
      neutral: 0,
      happy: 0,
      angry: 0,
      sad: 0,
      disgusted: 0,
      surprised: 0,
      fearful: 0,
  };

  expressionDataArray.forEach((expressions) => {
      averagedExpressions.neutral += expressions.neutral;
      averagedExpressions.happy += expressions.happy;
      averagedExpressions.angry += expressions.angry;
      averagedExpressions.sad += expressions.sad;
      averagedExpressions.disgusted += expressions.disgusted;
      averagedExpressions.surprised += expressions.surprised;
      averagedExpressions.fearful += expressions.fearful;
  });

  const totalFrames = expressionDataArray.length;
  for (let key in averagedExpressions) {
      averagedExpressions[key] = (averagedExpressions[key] / totalFrames) * 100;
  }

  const finalExpression = Object.keys(averagedExpressions).reduce((a, b) =>
      averagedExpressions[a] > averagedExpressions[b] ? a : b
  );

  const expressionMapping = {
      neutral: 0,
      angry: 1,
      disgusted: 1,
      fearful: 2,
      happy: 3,
      sad: 4,
      surprised: 5
  };

  const mappedExpression = expressionMapping[finalExpression]; // 매핑된 숫자 값

  // 로컬 스토리지에 최종 표정 결과 저장
  const faceData = {
      face_emotion: mappedExpression, // 숫자로 변환된 표정 결과
      face_score: averagedExpressions[finalExpression].toFixed(2) // 퍼센트 값
  };

  localStorage.setItem('faceData', JSON.stringify(faceData)); // 로컬 스토리지에 저장

  // 결과가 0일 경우 안내
  if (mappedExpression === 0) {
      alert("인식된 표정이 없습니다. 다시 시작해 주세요.");
        location.reload(); // 페이지 새로 고침
  }

}

