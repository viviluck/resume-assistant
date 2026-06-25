import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { resume, jd, mode } = await request.json();
    const isKillerOnly = mode === 'killer';

    if (!resume || typeof resume !== 'string' || !resume.trim()) {
      return NextResponse.json(
        { error: '调用大模型失败: 缺少简历数据' },
        { status: 400 }
      );
    }

    const resumeText = resume.trim();
    const jdText = jd && typeof jd === 'string' ? jd.trim() : '';

    const apiKey = (process.env.DASHSCOPE_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: '调用大模型失败: 未配置 DASHSCOPE_API_KEY 环境变量' },
        { status: 500 }
      );
    }

    console.log("=== Interview API Key 前5位 ===", apiKey.substring(0, 5));
    console.log("=== 清洗后的 Key 长度 ===", apiKey.length);

    const prompt = isKillerOnly
      ? `你现在是一家顶尖公司的苛刻业务线负责人。你非常挑剔，绝不听废话。请对比用户的【原始简历】和【目标岗位 JD】，敏锐地揪出用户经验中的**缺失、水分或不匹配之处**。

请生成 **5 到 6 个**极具压迫感和针对性的面试连环问，每次请求请随机侧重不同角度，确保多样性和随机性。

问题维度必须包含但不限于以下 3 种：
1. **刺探虚实**：专门针对简历中看似华丽的数据或项目，提问底层逻辑，拆穿可能的"水分"。
2. **场景高压**：假设一个 JD 中提到的极端业务困境，问候选人如何破局。
3. **连环追问**：设计一个主问题后，紧跟 1-2 个极其尖锐的子问题（例如："你说你负责了 X，那当 Y 发生冲突时你具体保哪个？为什么？"）。

你必须严格按照以下 JSON 结构输出，只能输出纯净的 JSON 对象，不要包含任何 Markdown 代码块标记（如 \`\`\`json），不要有任何前言后语：

{
  "夺命高频连环问": [
    {
      "question": "面试连环问题目",
      "hiddenAgenda": "面试官的潜台词和真正怀疑的点",
      "fatalMistake": "作死回答示范",
      "perfectAnswer": "反杀话术"
    }
  ]
}

(严格遵守：必须输出 5-6 道题。所有字符串文本中禁止使用英文双引号，一律使用中文双引号。)

${jdText ? `目标岗位 JD：\n${jdText}\n\n` : ''}用户简历：
${resumeText}

请务必严格按照上述 JSON 结构返回，不要包含其他无关内容！`
      : `你现在是一家顶尖公司的苛刻业务线负责人。你非常挑剔，绝不听废话。请对比用户的【原始简历】和【目标岗位 JD】，敏锐地揪出用户经验中的**缺失、水分或不匹配之处**。

系统将根据你的分析生成两个板块：
1. 「毒舌面试实战舱」：用于面试模拟
2. 「夺命高频连环问」：用于展示面试连环追问

请生成 **5 到 6 个**极具攻击性的压力面试题，每次请求请随机侧重不同角度，确保多样性和随机性。

问题维度必须包含但不限于以下 3 种：
1. **刺探虚实**：专门针对简历中看似华丽的数据或项目，提问底层逻辑，拆穿可能的"水分"。
2. **场景高压**：假设一个 JD 中提到的极端业务困境，问候选人如何破局。
3. **连环追问**：设计一个主问题后，紧跟 1-2 个极其尖锐的子问题（例如："你说你负责了 X，那当 Y 发生冲突时你具体保哪个？为什么？"）。

你必须严格按照以下 JSON 结构输出，只能输出纯净的 JSON 对象，不要包含任何 Markdown 代码块标记（如 \`\`\`json），不要有任何前言后语：

{
  "总体评价": {
    "内容": "用一段极其犀利、一针见血的话，直接点出这份简历在应对该 JD 时的最大硬伤或隐患。语气要冷酷、专业。"
  },
  "面试题": [
    {
      "问题": "这里写出极具攻击性的面试题，直击软肋",
      "毒舌潜台词": "一句话解释面试官问这个问题到底在怀疑什么",
      "STAR破局思路": {
        "Situation(情境)": "指导用户如何把过去的经历包装成与提问相关的高难度情境",
        "Task(任务)": "明确用户在该情境下需要完成的核心目标",
        "Action(行动)": "重点！指导用户用哪些专业动作来填补简历上的空白，强调方法论",
        "Result(结果)": "提醒用户用什么样的数据或可复用经验来强力反击"
      }
    }
  ],
  "夺命高频连环问": [
    {
      "question": "面试连环问题目",
      "hiddenAgenda": "面试官的潜台词和真正怀疑的点",
      "fatalMistake": "作死回答示范",
      "perfectAnswer": "反杀话术"
    }
  ]
}

(严格遵守：必须输出 5-6 道面试题，以及 5-6 道夺命高频连环问。所有字符串文本中禁止使用英文双引号，一律使用中文双引号。)

${jdText ? `目标岗位 JD：\n${jdText}\n\n` : ''}用户简历：
${resumeText}

请务必严格按照上述 JSON 结构返回，不要包含其他无关内容！`;

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: [
            {
              role: 'system',
              content: '你是一个苛刻的业务线负责人，必须严格按照JSON格式返回数据。\n\n### 严格 JSON 输出限制\n1. 所有键名必须用英文双引号包裹。\n2. 禁用 ```json 代码块标记，直接输出裸 JSON。\n3. 输出前不要有任何前言后语。\n4. 每次生成请随机侧重不同角度，确保题目多样性和随机性。'
            },
            {
              role: 'user',
              content: String(prompt)
            }
          ],
          temperature: 0.9,
          max_tokens: 4096
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Interview Qwen API 返回错误:', response.status, errorText);
      return NextResponse.json(
        { error: `调用大模型失败: API 返回状态码 ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Interview Qwen API 返回内容为空:', JSON.stringify(data));
      return NextResponse.json(
        { error: '调用大模型失败: API 返回内容为空' },
        { status: 500 }
      );
    }

    // 尝试从返回的 JSON 中提取夺命高频连环问
    let killerQuestions: any[] | null = null;
    try {
      const raw = content.trim().replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const braceStart = raw.indexOf('{');
      const braceEnd = raw.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd > braceStart) {
        const jsonStr = raw.substring(braceStart, braceEnd + 1).replace(/([{,]\s*)([a-zA-Z_\u4e00-\u9fa5]+)\s*:/g, '$1"$2":');
        const parsed = JSON.parse(jsonStr);
        if (parsed['夺命高频连环问'] && Array.isArray(parsed['夺命高频连环问'])) {
          killerQuestions = parsed['夺命高频连环问'];
        }
      }
    } catch (_) {
      // 选择性提取，失败不影响主内容
    }

    return NextResponse.json({
      interviewText: content.trim(),
      killerQuestions: killerQuestions
    });
  } catch (error: any) {
    const errMsg = error.message || error.toString();
    console.error("🚨 后端大模型调用崩溃:", error);
    return NextResponse.json(
      {
        error: "大模型 API 调用失败",
        details: errMsg,
        cause: error.cause ? error.cause.toString() : "未知网络原因 (可能是未配置代理或超时)"
      },
      { status: 500 }
    );
  }
}