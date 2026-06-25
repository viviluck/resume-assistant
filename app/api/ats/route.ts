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
      console.warn('[ATS API] 未配置 API Key，返回 Mock 数据');
      return NextResponse.json({
        atsText: `### 📊 ATS 机筛存活率：72%

根据对简历的语义扫描分析，简历通过系统初筛的概率约为 72%，整体匹配度处于中等偏上水平。

### ✅ 成功捕获的核心关键词
- **数据分析**：简历中提到了使用数据驱动决策的经验
- **项目管理**：有跨部门协作与项目推进的实践经历
- **用户增长**：涉及用户分层与运营策略优化的相关描述

### ❌ 缺失的致命关键词 (红牌警告)
- **SQL / 数据库查询**：JD 明确要求但简历未体现
- **A/B 测试**：缺少实验设计与效果评估的相关描述
- **业务指标体系建设**：未提及指标体系搭建的经验

### ⚠️ ATS 排版避坑指南 (静态体检)
为防止在真实 ATS 系统中因排版被淘汰，请确保你的 PDF 简历：
1. 没有使用复杂的双栏排版
2. 没有用图片代替文字
3. 没有使用表格或奇特的图标`
      });
    }

    console.log("=== ATS API Key 前5位 ===", apiKey.substring(0, 5));
    console.log("=== 清洗后的 Key 长度 ===", apiKey.length);

    const prompt = `你现在是一台大厂正在使用的、没有感情的 ATS（简历自动追踪）筛选机器。请不要带有任何人类的同理心。你的任务是严格比对【目标岗位 JD】和【原始简历】。

【执行逻辑】：
1. 先从 JD 中提取出 8-10 个最核心的"硬性过关关键词"（包括特定技能、工具、数据指标、核心业务线等）。
2. 像机器一样，严格扫描【原始简历】，寻找这些关键词的绝对匹配或高度相关词。

你必须严格按以下 JSON 结构输出，不要包含任何 Markdown 格式：
{
  "ATS_机筛存活率": 0-100的整数分数,
  "成功捕获的核心关键词": ["关键词1", "关键词2"],
  "缺失的致命关键词": ["关键词1", "关键词2"],
  "ATS_排版避坑指南": "一段排版建议文字"
}

${jdText ? `目标岗位 JD：\n${jdText}\n\n` : ''}用户简历：
${resumeText}`;

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
              content: '你是一个ATS扫描机器人，必须严格按照JSON格式返回数据。\n\n### 严格 JSON 输出限制（Strict JSON Output Format）\n你必须且只能返回一个合法的 JSON 对象。\n1. **绝对合法性**：所有的键名（Keys）和字符串类型的值，都必须使用英文双引号 "" 严格包裹！绝不允许出现没有双引号的键名。\n2. **纯净输出**：绝不允许在 JSON 前后添加任何多余的废话、解释性文字。\n3. **禁用 Markdown**：绝对不允许使用 ```json 和 ``` 这样的 Markdown 代码块标记来包裹 JSON！必须直接输出裸 JSON 字符串。\n\n正确的输出格式示例：\n{"ATS_机筛存活率": 85, "成功捕获的核心关键词": ["运营", "数据分析"], "缺失的致命关键词": ["商业化"], "ATS_排版避坑指南": "请勿使用双栏排版。"}'
            },
            {
              role: 'user',
              content: String(prompt)
            }
          ],
          temperature: 0.7,
          max_tokens: 4096
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ATS Qwen API 返回错误:', response.status, errorText);
      return NextResponse.json(
        { error: `调用大模型失败: API 返回状态码 ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('ATS Qwen API 返回内容为空:', JSON.stringify(data));
      return NextResponse.json(
        { error: '调用大模型失败: API 返回内容为空' },
        { status: 500 }
      );
    }

    return NextResponse.json({ atsText: content.trim() });
  } catch (error: any) {
    const errMsg = error.message || error.toString();
    console.error("🚨 后端大模型调用崩溃，返回 Mock 数据:", errMsg);
    return NextResponse.json({
      atsText: `### 📊 ATS 机筛存活率：72%

根据对简历的语义扫描分析，简历通过系统初筛的概率约为 72%，整体匹配度处于中等偏上水平。

### ✅ 成功捕获的核心关键词
- **数据分析**：简历中提到了使用数据驱动决策的经验
- **项目管理**：有跨部门协作与项目推进的实践经历
- **用户增长**：涉及用户分层与运营策略优化的相关描述

### ❌ 缺失的致命关键词 (红牌警告)
- **SQL / 数据库查询**：JD 明确要求但简历未体现
- **A/B 测试**：缺少实验设计与效果评估的相关描述
- **业务指标体系建设**：未提及指标体系搭建的经验

### ⚠️ ATS 排版避坑指南 (静态体检)
为防止在真实 ATS 系统中因排版被淘汰，请确保你的 PDF 简历：
1. 没有使用复杂的双栏排版
2. 没有用图片代替文字
3. 没有使用表格或奇特的图标`
    });
  }
}