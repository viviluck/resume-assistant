import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { resume, jd } = await request.json();

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

    console.log("=== Cramming API Key 前5位 ===", apiKey.substring(0, 5));
    console.log("=== 清洗后的 Key 长度 ===", apiKey.length);

    const prompt = `你现在是一位资深的互联网大厂业务线总监兼求职导师。请对比用户的【原始简历】和【目标岗位 JD】，找出 1-2 个 JD 中明确要求，但用户简历中完全没有体现的技能、业务模型或专业工具。

【核心提取红线（极其重要）】：
1. **精准匹配岗位属性**：必须先判断目标岗位的性质。**绝对禁止**向非研发岗位（如运营、市场、销售）推荐 Python、C++ 等硬核编程语言，除非 JD 中直接出现了这些词。
2. **聚焦业务工具与方法论**：如果非技术岗位的 JD 要求"数据分析/挖掘/用户洞察"，请优先推荐该岗位常用的商业 SaaS 工具（如：神策数据 Sensors Data、GrowingIO、Tableau、飞书多维表格）或业务分析模型（如：RFM用户分层模型、A/B测试、同期群分析、AARRR漏斗）。
3. **符合 3天速成逻辑**：推荐的技能必须是普通人可以通过看视频，在 3 天内掌握核心概念、应用场景和话术的。

你必须返回严格的 JSON，不要包含 markdown 代码块标记。JSON 结构如下：

{
  "核心技能缺口": "填入技能或模型名称",
  "解释": "用一句话说明为什么这个技能/模型对该岗位至关重要",
  "大白话解释": "用最通俗易懂的语言、甚至打比方，向零基础的人解释这个技能或工具到底是什么，它是用来解决什么具体业务问题的。至少100字",
  "极速充电资源": {
    "B站/视频搜索词": "给出能搜到高质量速成教程的精准搜索关键词",
    "优质博主/公众号": "推荐1-2个该垂直领域的干货博主或公众号"
  },
  "3天速成动作": {
    "Day 1": "写明具体的学习动作，例如：了解核心概念与使用场景。至少50字",
    "Day 2": "写明实操动作，例如：看 B 站基础操作演示/拆解经典案例。至少50字",
    "Day 3": "写明输出动作，例如：结合过往经历，口述一个应用该技能的假设方案。至少50字"
  },
  "面试话术兜底": "如果面试官直接问'你没用过这个工具/模型吗？'，请给出一段不卑不亢、强调自己底层逻辑互通和快速学习能力的满分回答话术。至少100字"
}

🔴 最高指令：所有字段必须填入真实内容，绝对禁止为空！绝对不能返回占位符文字！

${jdText ? `目标岗位 JD：\n${jdText}\n\n` : ''}用户简历：
${resumeText}

请务必严格按照 JSON 格式返回，不要包含其他无关内容！`;

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
              content: '你是一个资深业务导师。你必须根据JD和简历的真实内容生成急救指南。所有字段必须填入真实分析内容，严禁返回空值或占位符文字！\n\n### 严格 JSON 输出限制\n你必须且只能返回一个合法的 JSON 对象，严格遵循以下结构，不得更改键名，不得遗漏字段：\n{\n  "核心技能缺口": "技能或模型名称",\n  "解释": "一句话说明",\n  "大白话解释": "通俗解释，至少100字",\n  "极速充电资源": {\n    "B站/视频搜索词": "搜索关键词",\n    "优质博主/公众号": "推荐博主"\n  },\n  "3天速成动作": {\n    "Day 1": "具体学习动作，至少50字",\n    "Day 2": "具体实操动作，至少50字",\n    "Day 3": "具体输出动作，至少50字"\n  },\n  "面试话术兜底": "满分回答话术，至少100字"\n}\n1. 所有键名必须用英文双引号包裹。\n2. 禁用 ```json 代码块标记，直接输出裸 JSON。\n3. 输出前不要有任何前言后语。'
            },
            {
              role: 'user',
              content: String(prompt)
            }
          ],
          temperature: 0.8,
          max_tokens: 4096
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cramming Qwen API 返回错误:', response.status, errorText);
      return NextResponse.json(
        { error: `调用大模型失败: API 返回状态码 ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Cramming Qwen API 返回内容为空:', JSON.stringify(data));
      return NextResponse.json(
        { error: '调用大模型失败: API 返回内容为空' },
        { status: 500 }
      );
    }

    // ========== 大模型原始暴力输出 ==========
    console.log("================= 抱佛脚大模型原始输出 =================");
    console.log(content);
    console.log("====================================================");

    // 清洗 JSON
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    // 修复键名无双引号的非法 JSON（如 { 核心技能缺口: "..." }）
    jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_\u4e00-\u9fa5]+)\s*:/g, '$1"$2":');
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1).trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr: any) {
      console.error('❌ 抱佛脚 JSON.parse 失败:', parseErr.message);
      console.error('❌ 清洗后文本:', jsonStr);
      return NextResponse.json(
        { error: '解析大模型返回的 JSON 失败', details: parseErr.message },
        { status: 500 }
      );
    }

    if (!parsed['核心技能缺口'] || !parsed['面试话术兜底']) {
      const errMsg = '❌ 抱佛脚数据缺少必要字段！原始内容：\n' + content;
      console.error(errMsg);
      return NextResponse.json(
        { error: '大模型返回数据不完整', details: errMsg },
        { status: 500 }
      );
    }

    return NextResponse.json({ crammingText: content.trim(), crammingData: parsed });
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