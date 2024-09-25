const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const https = require("https");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
const port = 3000;

// CORS 설정
app.use(cors());

// OpenAI API 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON 파싱 미들웨어 설정
app.use(express.json());

// 감정과 숫자를 매핑하는 객체
const emotionMapping = {
  neutral: 0,
  angry: 1,
  fearful: 2,
  happy: 3,
  sad: 4,
  surprised: 5,
};

// WebSocket으로 메시지 전송 함수
const sendMessageToClients = (message) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// GPT-4 감정 분석 엔드포인트
app.post("/gpt", async (req, res) => {
  const userInput = req.body.text;

  if (!userInput) {
    return res.status(400).json({ error: "No input provided" });
  }

  // 수신된 userInput에 따른 처리
  if ([1, 2, 3, 4, 5].includes(userInput)) {
    console.log(`수신된 값: ${userInput}`);
    sendMessageToClients(userInput); // WebSocket 클라이언트로 값 전송
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `사용자의 발화에서 감정을 분석하세요: "${userInput}". 가능한 감정: neutral, happy, angry, sad, surprised, fearful. 
                    형식: Emotion: [감정], Percent: [퍼센트]%`,
        },
      ],
      max_tokens: 150,
    });

    const gptResponse = completion.choices[0].message.content.trim();
    const emotionMatch = gptResponse.match(/Emotion\s*:\s*(\w+)/);
    const emotion = emotionMatch ? emotionMatch[1].toLowerCase() : "neutral";
    const percentMatch = gptResponse.match(/Percent\s*:\s*([\d.]+)%/);
    const percent = percentMatch ? parseFloat(percentMatch[1]) : 0;

    const emotionNum = emotionMapping[emotion] ?? emotionMapping["neutral"];

    // GPT 분석 결과 반환
    res.json({
      response: gptResponse,
      emotion,
      emotionNum,
      percent,
    });
  } catch (error) {
    console.error("OpenAI API Error:", error.response?.status || error.message);
    res.status(500).json({ error: "Failed to fetch GPT response" });
  }
});

// WebSocket 서버 설정
const server = https.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket 연결 처리
wss.on("connection", (ws) => {
  console.log("WebSocket 클라이언트가 연결되었습니다.");

  // WebSocket 연결 상태 확인 (ping-pong 기법)
  const pingInterval = setInterval(() => {
    if (ws.isAlive === false) {
      console.log("클라이언트 응답 없음, 연결 종료");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }, 30000); // 30초마다 ping

  ws.on("pong", () => {
    ws.isAlive = true; // pong 신호가 오면 클라이언트가 응답하고 있다고 표시
  });

  ws.on("message", (message) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
      console.log("파싱된 메시지:", parsedMessage);

      if (parsedMessage.type === "number" && typeof parsedMessage.value === "number") {
        const responseMessage = `서버가 받은 숫자: ${parsedMessage.value}`;
        ws.send(responseMessage);
      } else {
        ws.send('서버가 받은 메시지는 유효한 숫자가 아닙니다.');
      }
    } catch (error) {
      ws.send('서버가 받은 메시지는 JSON 형식이 아닙니다.');
    }
  });

  ws.on("close", () => {
    console.log("WebSocket 연결이 종료되었습니다.");
    clearInterval(pingInterval); // 연결이 종료되면 ping 타이머 중지
  });

  ws.on("error", (error) => {
    console.error("WebSocket 에러:", error);
  });
});

// 서버 실행
server.listen(port, () => {
  console.log(`Server is run`);
});
