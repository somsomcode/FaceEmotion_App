// Express 및 OpenAI 설정
const express = require("express");
const cors = require("cors"); // CORS 미들웨어 추가
const OpenAI = require("openai"); // 최신 OpenAI SDK 가져오기
require("dotenv").config();

const app = express();
const port = 3000; // 원하는 포트 번호 설정

// CORS 설정 (모든 도메인 허용)
app.use(cors());

// OpenAI API 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // .env 파일에 OpenAI API 키 저장
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

// GPT-4 감정 분석 엔드포인트
app.post("/gpt", async (req, res) => {
  const userInput = req.body.text;

  if (!userInput) {
    return res.status(400).json({ error: "No input provided" });
  }

  try {
    // GPT-4에 감정 분석을 요청하는 프롬프트 추가
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `사용자의 전체 발화에서 감정을 분석하고 결과를 요약하세요: "${userInput}", 가능한 감정은 neutral, happy, angry, sad, surprised, fearful 입니다. 
                    결과를 다음 형식으로 작성하세요: Emotion: [감정], Percent: [퍼센트 값]%`,
        },
      ],
      max_tokens: 150,
    });

    const gptResponse = completion.choices[0].message.content.trim();

    // Emotion 값을 추출하는 정규 표현식
    const emotionMatch = gptResponse.match(/Emotion\s*:\s*(\w+)/);
    const emotion = emotionMatch ? emotionMatch[1].toLowerCase() : 'neutral';


   // Percent 값 추출
    const percentMatch = gptResponse.match(/Percent\s*:\s*([\d.]+)%/);
    const percent = percentMatch ? parseFloat(percentMatch[1]) : 0;

    // 감정을 숫자로 매핑
    const emotionNum = emotionMapping[emotion] !== undefined ? emotionMapping[emotion] : emotionMapping['neutral'];

    // 분석 결과를 JSON으로 반환
    res.json({
      response: gptResponse,
      emotion: emotion,
      emotionNum: emotionNum, // 숫자로 변환된 감정 값
      percent: percent,
    });

  } catch (error) {
    if (error.response) {
      console.error(
        "OpenAI API Error:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("Error from OpenAI API:", error.message);
    }
    res.status(500).json({ error: "Failed to fetch GPT response" });
  }
});

// 서버 실행
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
