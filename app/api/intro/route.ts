import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { resume, jd } = await request.json();
    console.log('[打招呼API] 接收到请求, resume 类型:', typeof resume, '长度:', resume?.length);
    console.log('[打招呼API] jd 类型:', typeof jd, '长度:', jd?.length);

    if (!resume || typeof resume !== 'string' || !resume.trim()) {
      console.error('[打招呼API] 简历数据为空或无效, resume类型:', typeof resume, '长度:', resume?.length);
      return NextResponse.json(
        { error: '调用大模型失败: 缺少简历数据' },
        { status: 400 }
      );
    }

    const resumeText = resume.trim();
    const jdText = jd && typeof jd === 'string' ? jd.trim() : '';
    console.log('[打招呼API] resumeText 长度:', resumeText.length, 'jdText 长度:', jdText.length);

    const apiKey = (process.env.DASHSCOPE_API_KEY || "").trim();
    if (!apiKey) {
      console.warn('[打招呼API] 未配置 API Key，返回 Mock 数据');
      return NextResponse.json({
        introText: `您好呀！看到咱们在招 ${jdText ? jdText.slice(0, 30) + '...' : ''} 岗位，感觉跟我之前的经历特别契合~

我之前在过往项目中积累了丰富的实战经验，对从 0 到 1 破局还挺有心得的。不知道咱们目前还看机会吗？希望能发份完整简历给您过目看看~`
      });
    }

    console.log("=== Intro API Key 前5位 ===", apiKey.substring(0, 5));
    console.log("=== 清洗后的 Key 长度 ===", apiKey.length);

    const prompt = `你现在是一位情商极高、沟通能力极强的求职者，正在 BOSS 直聘等聊天软件上给 HR 发送第一条打招呼信息。请根据【原始简历】和【目标岗位 JD】，生成一段极具"人味儿"和亲和力的破冰话术。

【绝对红线】：
1. **拒绝 AI 味和书面语**：绝对不能使用"此外"、"曾主导"、"助力贵司"、"综上所述"、"实现了...的增长"这种生硬的公文词汇。
2. **拒绝复述 JD**：不要生硬地抄写 JD 里的长句（比如不要说"看到贵司正在寻找能够基于用户洞察...的人才"）。

【话术结构与语气要求】：
1. **口语化开场**：像真人微信聊天一样自然（例如："您好呀！看到咱们在招 XX 岗位，感觉跟我之前的经历特别契合~"）。
2. **大白话秀肌肉**：把简历里最匹配的 1-2 个数据，用日常交流的口吻说出来。（例如："我之前在果壳做社群，把用户从 5000 做到了 3万多，流水也带到了百万级别，对从 0 到 1 破局还挺有心得的。"）
3. **低压迫感结尾**：用亲和且礼貌的方式探寻机会（例如："不知道咱们目前还看机会吗？希望能发份完整简历给您过目看看~"）。
4. **篇幅限制**：控制在 80-100 字左右，分 2 段，极简，易读。

${jdText ? `目标岗位 JD：\n${jdText}\n\n` : ''}用户简历：
${resumeText}

请务必严格按照 JSON 格式返回，不要包含其他无关内容！`;
    console.log('[自我介绍API] 拼接后 prompt 总长度:', prompt.length);

    const payload = JSON.stringify({
      model: 'qwen-plus',
      messages: [
        {
          role: 'system',
          content: '你是一个情商极高的求职者，必须严格按照JSON格式返回数据。'
        },
        {
          role: 'user',
          content: String(prompt)
        }
      ],
      temperature: 0.8,
          max_tokens: 4096
    });
    console.log('[自我介绍API] 发送给 Qwen 的 payload 总长度:', payload.length);
    console.log('[自我介绍API] 发送给 Qwen 的 messages[0].content 长度:', prompt.length);

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: payload
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Qwen API 返回错误:', response.status, errorText);
      return NextResponse.json(
        { error: `调用大模型失败: API 返回状态码 ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Qwen API 返回内容为空:', JSON.stringify(data));
      return NextResponse.json(
        { error: '调用大模型失败: API 返回内容为空' },
        { status: 500 }
      );
    }

    return NextResponse.json({ introText: content.trim() });
  } catch (error: any) {
    const errMsg = error.message || error.toString();
    console.error("🚨 后端大模型调用崩溃，返回 Mock 数据:", errMsg);
    return NextResponse.json({
      introText: `您好呀！看到咱们在招的岗位，感觉跟我之前的经历特别契合~

我之前在过往项目中积累了丰富的实践经验，对从 0 到 1 破局还挺有心得的。不知道咱们目前还看机会吗？希望能发份完整简历给您过目看看~`
    });
  }
}