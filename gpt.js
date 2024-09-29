const startButton = document.getElementById('startButton');
const recognizedTextElement = document.getElementById('recognizedText');
const gptResponseElement = document.getElementById('gptResponse');
const timerElement = document.getElementById('timer'); // 타이머 요소
const userInput = document.getElementById('userInput');

const GPT_API_URL = "https://main-activity.com/gpt"; // GPT 호출 주소

// 음성 인식 설정
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "ko-KR"; // 한국어로 설정
recognition.continuous = true; // 연속 인식 활성화
recognition.interimResults = false; // 중간 결과는 표시하지 않음

const TIMER_DURATION = 15; // 타이머 시간 저장 (초 단위)
let countdown = null; // 타이머 카운트다운 저장할 변수
let finalTranscript = ''; // 음성 인식된 최종 텍스트 저장 변수
let isRecognizing = false; // 음성 인식이 진행 중인지 여부
let timeLeft = TIMER_DURATION; // 타이머 시간 저장

// 타이머 초기화 및 시작 함수
function startTimer() {
    if (countdown !== null) {
        return; // 타이머가 이미 실행 중이면 다시 시작하지 않음
    }

    timerElement.innerText = timeLeft; // 초기 타이머 값 설정

    countdown = setInterval(() => {
        if (isRecognizing) { // 음성 인식이 진행 중일 때만 타이머가 감소함
            timeLeft--;
            timerElement.innerText = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(countdown); // 타이머 종료
                countdown = null; // 타이머 변수를 초기화
                recognition.stop(); // 타이머가 0이 되면 음성 인식 종료
            }
        }
    }, 1000);
}

// 타이머 및 음성 인식 중지 함수
function stopTimer() {
    clearInterval(countdown); // 타이머 종료
    countdown = null; // 타이머 변수를 초기화
    timeLeft = TIMER_DURATION; // 타이머 리셋
    timerElement.innerText = timeLeft; // UI에서 타이머 리셋
}

// 음성 인식이 시작되면 호출되는 함수
startButton.addEventListener('click', () => {
    if (!isRecognizing) {
        // 음성 인식이 중지된 상태면 시작
        if (timeLeft === TIMER_DURATION || countdown === null) {
            finalTranscript = ''; // 이전 인식 결과 초기화
            timeLeft = TIMER_DURATION; // 타이머 리셋
            startTimer(); // 타이머 시작
        }

        recognition.start(); // 음성 인식 시작
        isRecognizing = true;

        // 버튼 비활성화 및 텍스트 변경
        startButton.disabled = true;
        startButton.innerText = "녹음 중..."; // 중지라는 단어 대신 녹음 중...으로 표시
    }
});

// 음성 인식 시작 시 녹음 중... 메시지 표시
recognition.onstart = () => {
    recognizedTextElement.innerText = "음성 인식 중...";
};

// 음성 인식 결과를 처리하는 함수
recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    finalTranscript += lastResult[0].transcript; // 음성 인식된 텍스트를 추가로 저장
    recognizedTextElement.innerText = finalTranscript; // 실시간으로 업데이트
};

// 음성 인식이 종료되면 GPT에 텍스트 자동 전송
recognition.onend = () => {
    isRecognizing = false;
    stopTimer(); // 타이머 종료

    // 버튼을 다시 활성화하고 텍스트를 복구
    startButton.disabled = false;
    startButton.innerText = "녹음 시작";

    if (finalTranscript.trim()) {
        sendTextToGPT(finalTranscript); // 음성 인식된 텍스트를 GPT에 전송
    }
};

// GPT API에 요청을 보내는 함수 (서버에서 데이터 받아오기)
async function sendTextToGPT(text) {
    try {
        const response = await fetch(GPT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }), // 음성 인식된 최종 텍스트 전송
        });

        const data = await response.json();
        gptResponseElement.innerText = data.response;

        const gptData = {
            gpt_emotion: data.emotionNum,
            gpt_score: data.percent
        };

        localStorage.setItem('gptData', JSON.stringify(gptData));
        console.log('Stored emotionNum:', data.emotionNum);
        console.log('Stored percent:', data.percent);

    } catch (error) {
        console.error("GPT 요청 실패:", error);
        gptResponseElement.innerText = "GPT 응답을 가져오는 데 실패했습니다.";
    }
}
