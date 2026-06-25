import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { jd, resume } = await request.json();
    console.log('[生成API] 接收到请求, jd长度:', jd?.length, 'resume长度:', resume?.length);

    if (!jd || !resume) {
      return NextResponse.json(
        { error: '调用大模型失败: 缺少 JD 或简历数据' },
        { status: 400 }
      );
    }

    const apiKey = (process.env.DASHSCOPE_API_KEY || "").trim();
    if (!apiKey) {
      console.error('[生成API] 严重错误: 未配置 DASHSCOPE_API_KEY 环境变量');
      return NextResponse.json(
        { error: '服务器配置错误: 未配置 API Key' },
        { status: 500 }
      );
    }

    console.log("=== 当前使用的 API Key 前5位 ===", apiKey.substring(0, 5));
    console.log("=== 清洗后的 Key 长度 ===", apiKey.length);

    const prompt = `你是一位资深HR专家，擅长简历优化和岗位匹配分析。

你必须且只能返回合法的 JSON 对象，绝对不要包含任何 markdown 代码块标记（如 \`\`\`json），不要有任何前言后语，必须确保可以用 JSON.parse 直接解析。

🔴 【致命红线：JSON 结构安全 — 最高优先级】：
你输出的必须是合法的 JSON 对象，必须可以通过 JSON.parse 直接解析。以下规则你必须严格遵守：
1. **禁止英文双引号**：在 Markdown 正文（即 \`optimizedContent\` 和 \`matchReport\` 字段内）以及 \`[💡](AI思路：...)\` 的描述中，**绝对禁止**使用任何英文引号 \`"\`，一律改用中文双引号 \`""\` 或单引号 \`''\`！
2. **禁止非法控制字符**：Markdown 正文中禁止出现 ASCII 控制字符（如 \`\x00\`\`\x1f\`）、未转义的换行符（\`\n\`）被嵌入到 JSON 字符串的中间打断解析。
3. **禁止英文逗号/句号导致的解析歧义**：在 \`[💡](AI思路：...)\` 的括号内，只能使用中文标点符号，禁止出现英文逗号 \`,\`、英文句号 \`.\`、英文双引号 \`"\`，防止括号内文本因含有特殊符号而被误判为 JSON 结构分隔符。
4. **返回数据中绝对不得包含任何 HTML 标签**（如 \`<br>\`, \`<div>\`）、乱码字符串（如 \`">">\`）或未转义的反斜杠。只能输出纯净的 Markdown 语法。

请分析以下岗位JD和用户简历，返回以下格式的JSON：

岗位JD：
${jd}

用户简历：
${resume}

🔴【最高指令：禁止交白卷！】：你下面的 JSON 结构中的注释（如 "⚠️禁止为空！真实提取..."）只是格式参考和警告说明，你绝对不能照抄这些文字！你必须根据上方提供的 JD 和简历，生成真实的分析内容填入每一个字段。任何字段如果为空数组 []、空字符串 ""、数字 0，系统会直接崩溃！所有字符串字段必须有 50 字以上的真实详细文本，所有数组字段必须有至少 2 个真实条目。允许使用 markdown 格式，但输出必须是纯净 JSON，不能包含任何 markdown 代码块标记。

请严格按以下 JSON Key 输出，绝对不能遗漏或更改 Key 名：
{
  "tailoredResume": {
    "optimizedContent": "⚠️禁止为空！必须输出300字以上的完整定制版简历Markdown，包含个人总结、核心经历(3段以上)、技能与附加信息三部分。每段经历必须使用XYZ法则+JD匹配提示。使用标准 \\n\\n 换行，绝对禁止使用 > 符号！"
  },
  "jdAnalysis": {
    "coreKeywords": ["⚠️禁止为空！真实提取JD中3-5个核心关键词", "如：用户增长"],
    "hardSkills": ["⚠️禁止为空！真实硬技能", "如：SQL"],
    "softSkills": ["⚠️禁止为空！真实软素质", "如：数据分析"],
    "hiddenHurdles": ["⚠️禁止为空！真实隐性门槛", "如：需要应对业务调整"],
    "rolePositioning": "⚠️禁止为空！结合JD真实职责，写100字以上的岗位定位分析，说明执行层与策略层工作比例",
    "dailyWorkflow": [
      "⚠️禁止为空！真实具体工作流1（50字以上）",
      "真实具体工作流2（50字以上）",
      "真实具体工作流3（50字以上）"
    ],
    "coreChallenge": "⚠️禁止为空！写80字以上的真实核心挑战分析",
    "survivalGuide": "⚠️禁止为空！写80字以上的真实试用期落地建议"
  },
  "userPersona": {
    "coreTraits": ["⚠️禁止为空！真实核心特质标签1", "真实核心特质标签2", "真实核心特质标签3"],
    "workStyle": "⚠️禁止为空！写60字以上的真实工作风格分析",
    "careerMotivation": "⚠️禁止为空！写60字以上的真实职业驱动力分析",
    "growthPotential": "⚠️禁止为空！写60字以上的真实成长潜力评估"
  },
  "matchAssessment": {
    "matchScore": 85,
    "matchReport": "⚠️禁止为空！输出完整的Markdown匹配度报告，必须包含综合匹配度分数、完美命中(2-3条)、致命缺失(1-3条)、提分建议(1-2条)，300字以上"
  },
  "starStories": [
    {
      "question": "⚠️禁止为空！真实面试问题",
      "tag": "考察点",
      "s": "⚠️禁止为空！写120字以上的真实情境描述",
      "t": "⚠️禁止为空！写50字以上的真实任务描述",
      "a": "⚠️禁止为空！写150字以上的真实行动细节",
      "r": "⚠️禁止为空！写50字以上的真实结果和量化数据",
      "hook": "⚠️禁止为空！写30字以上的真实引导追问话术"
    }
  ]
}

要求：
1. coreKeywords 是JD中最核心的关键词（3-5个）
2. hiddenHurdles 是JD中没有明确写出但隐含的要求
3. 所有字段都不能为空！数组必须有至少2个真实条目，字符串必须有至少50字的真实内容
4. 极其重要：所有列表字段（coreKeywords, hardSkills, softSkills, hiddenHurdles, dailyWorkflow）必须严格是 JSON 字符串数组 Array of strings，如 ["item1", "item2"]，绝对不能是单一的逗号分隔字符串 "item1, item2"！

【STAR 故事库生成规则 - 必须遵守】：
你是一位资深的世界500强HR总监。你在生成 \`starStories\` 数组时，必须以【第一人称（我）】撰写，风格要求：**细节丰富、专业沉稳、真实可信**。
**绝对禁止**使用过度夸张的戏剧化词汇（如生死存亡、断崖式、熬通宵、力排众议等）。要把重点放在具体的专业动作、使用的数据/工具、以及解决日常业务真实痛点的过程上。强制包含 \`hook\` 字段。

请严格参考以下【真实高分示例】的语感和颗粒度来生成（必须返回严格的 JSON）：
{
  "starStories": [
    {
      "question": "请分享一次你如何解决棘手业务问题的经历",
      "tag": "问题解决 / 跨部门协作",
      "s": "【情境】去年Q3，我们主导的社群业务遇到了增长瓶颈，核心用户的活跃度连续两个月出现小幅下滑，这直接影响了当季的转化目标完成率。",
      "t": "【任务】由于当时没有额外的市场推广预算，我需要在内部挖掘增长点，目标是在一个月内优化运营策略，让核心用户活跃度回升到基准线。",
      "a": "【行动】我先通过 SQL 提取了过去半年的行为数据，发现流失主要发生在'新手引导期'的第3-5天。为了找到根本原因，我对20位典型流失用户进行了电话调研，确认是内容同质化导致了疲劳。随后，我重新梳理了用户生命周期的触达 SOP，并主导设计了一套基于用户行为分层的积分激励机制。在推进过程中，我与研发团队多次协调，通过砍掉非核心功能，解决了开发排期冲突的问题。",
      "r": "【结果】新机制上线后，新用户的次周留存率稳步提升了15%，整体社群活跃度在一个月内不仅恢复，还实现了20%的环比增长，顺利完成了Q3的转化KPI。",
      "hook": "在刚才提到的跨部门协调中，研发资源起初非常紧张。如果您感兴趣，我可以简单分享一下当时是如何通过'需求优先级矩阵'来说服研发负责人的。"
    }
  ]
}
请记住：去掉浮夸的情绪表达，保留真实的业务颗粒度（数据、工具、具体困难、解决方案）！生成 3 个符合用户简历背景的故事。

所有文本中严格禁止使用英文双引号，一律用中文双引号或单引号。

【匹配度评估的严格规则 - 必须遵守】：
你现在是一位极其严苛的资深大厂 HR 兼数据分析师。请对比用户的【原始简历】和【目标岗位 JD】，输出一份严谨的匹配度评估报告。

【核心打分逻辑（满分 100 分）】：
你必须基于以下三个维度进行评估，并**在内部计算出具体分数后，再输出最终总分**：
1. **硬性技能门槛 (40分)**：JD 明确要求的技能、工具或年限。每缺少一个关键硬技能扣 5-10 分。
2. **核心业务动作重合度 (40分)**：JD 强调的核心工作职责，在简历中是否有对应的实践经验。重合度低则扣分。
3. **数据结果导向 (20分)**：简历中的经验是否有具体、可量化的数据支撑（如增长了XX%，流水达到XX万）。缺乏数据支撑扣分。

【排版与输出严格遵循以下 Markdown 结构 - 这也是 matchReport 字段的内容】：

### 🎯 综合匹配度：[输出一个 0-100 的整数分数]分
*(用一句话总结：为什么给出这个分数？明确指出最拉分或最加分的一点)*

#### ✅ 完美命中 (核心加分项)
*(列出 2-3 个简历与 JD 高度匹配的核心点。必须说明是在简历的哪段经历中找到的对应证据)*
- **[匹配点名称]**：[简述简历中的对应经验]

#### ⚠️ 致命缺失 (主要扣分项)
*(列出 1-3 个 JD 强烈要求，但简历中完全缺失或极其薄弱的关键能力)*
- **[缺失点名称]**：[简述 JD 的要求，并说明简历为什么没有体现]

#### 💡 提分核心建议 (行动指南)
*(给出 1-2 条最能立竿见影提升匹配度的修改建议。例如：补充某项具体数据、将某段经验的侧重点转移等)*
- [具体建议...]

(严格遵守：必须使用无序列表 \`- \` 和加粗 \`**\`，标题严格使用 \`###\` 和 \`####\`。matchReport 的值必须是一个完整的 Markdown 字符串，matchScore 的值必须与报告中声明的分数一致。)

【定制简历生成的严格规则 - 必须遵守】：
你是一位顶尖的职业发展顾问。请为用户深度重写简历。

【核心要求】：
1. XYZ 法则与数据驱动：经历必须具体（做了X，用了Y，达成Z）。
2. JD 强关联：每一条核心经历后面，必须加上 [👉 契合 JD：相关要求] 来明示匹配度。
3. AI 注释：在结尾必须保留 [💡 AI思路：你的优化逻辑] 格式（注意：必须使用方括号括起来，且方括号内不能嵌套任何 Markdown 语法或链接）。

【个人总结核心技能规则】：
在 ## 个人总结 部分，需要输出几个核心技能点，每个技能点用 - 列表列出：
- 这些技能点必须是完全不同的维度（例如：一个是业务策略/方法论，一个是数据分析/工具能力，一个是执行落地/跨部门协同等）。
- 必须高度结合用户原始简历和当前 JD 要求提炼，直接作为求职者简历最顶部的"亮点总结"供 HR 扫视，体现极高匹配度。
- 每个技能点末尾建议标注 [👉 契合 JD：对应JD要求]，并用 [💡 AI思路：你的优化逻辑] 作为批注。

【排版绝对红线】（必须严格遵守的 Markdown 模板）：
1. 标题必须使用 ##。
2. 公司、岗位、时间必须使用 ### 且绝对放在同一行，用竖线分隔！例如：### 北京果壳互动 | 社群运营 | *2021.01 - 2025.02*
3. 列表项必须以 -  开头，且每个列表项必须独立一行。
请严格参考以下【满分输出示例】的格式进行生成：

## 个人总结
拥有超过三年的互联网用户运营经验，擅长基于数据设计策略... [👉 契合 JD：数据敏感度高，能指导运营工作] [💡 AI思路：将原简历的日常描述提炼为JD看重的数据分析能力]

## 核心经历
### 北京果壳互动科技传媒有限公司 | **社群运营** | *2021.01 - 2025.02*
- 主导社群搭建，通过双渠道精准引流，将用户从5000人提升至35000+ [👉 契合 JD：具备用户运营经验] [💡 AI思路：用具体的新增数据突出从零到一的运营能力]
- 制定复购策略，将复购率由35%提升至47% [👉 契合 JD：能够通过数据指导运营] [💡 AI思路：强调复购率这个核心转化指标]

### 学霸君·优学课堂 | **社群运营** | *2020.05 - 2020.12*
- 建立标准化问题解决流程，保证100%问题解决率 [👉 契合 JD：强烈的责任心与沟通能力] [💡 AI思路：用100%这个数据点回应JD对责任心的要求]

## 技能与附加信息
- **数据分析**：熟练使用 Excel, SQL 进行数据提取与整理 [👉 契合 JD：熟练使用办公及数据分析工具] [💡 AI思路：直接对标JD的工具要求]

请务必严格按照 JSON 格式返回，不要包含其他无关内容！
注意：你必须一次性返回完整的 JSON 结构，绝对不能截断！starStories 数组必须包含至少 2 个故事，绝对不能为空！`;

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
              content: `
你是一个高级简历精修专家。

### 核心铁律：绝对禁止捏造事实与数据
1. 严禁凭空捏造数据：绝对不可捏造原始简历中未提及的数值、百分比或节点。
2. 严禁编造具体名词：不可强行添加原简历没有的工具、模型或文档名。

### 专业扩充与零幻觉法则
1. 扩写过程与逻辑：请基于事实扩写【业务流转过程或底层逻辑】，绝不可虚构【产出结果】。
   - 正确范例：用户原话【收集反馈优化产品】，JD要求【跨部门协同】。应专业扩充为：建立从前端用户声音收集到后端产品需求转化的闭环反馈机制，跨部门协同技术团队推动体验迭代。
2. 专业词汇升级：使用高级术语重塑表达，如：体系化建设、全链路、精细化分层、业务闭环、标准化SOP等。
3. 保留1:1逐条映射：必须保持对用户原经历的逐条重写，绝不遗漏原有的真实业务数据和核心动作。
`
            },
            {
              role: 'user',
              content: String(prompt)
            }
          ],
          temperature: 0.7,
          max_tokens: 8192
        })
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

    // ========== 大模型原始暴力输出 ==========
    console.log("================= 大模型原始暴力输出 =================");
    console.log(content);
    console.log("====================================================");

    // === 强化 JSON 脱壳：暴力清洗 + 大括号截取 ===
    let jsonStr = content.trim();

    // 第一步：移除所有 Markdown 代码块标记
    jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    // 第二步：强制截取第一个 { 和最后一个 } 之间的内容
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      console.error('未找到 JSON 起始/结束标记', content);
      return NextResponse.json(
        { error: '调用大模型失败: 返回内容不是 JSON 格式' },
        { status: 500 }
      );
    }
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1).trim();

    // === 修复未转义的控制字符 ===
    {
      let cleaned = '';
      let inQuotes = false;
      let prevChar = '';

      for (let i = 0; i < jsonStr.length; i++) {
        const ch = jsonStr[i];

        if (ch === '"' && prevChar !== '\\') {
          inQuotes = !inQuotes;
          cleaned += ch;
        } else if (inQuotes && ch === '\n') {
          cleaned += '\\n';
        } else if (inQuotes && ch === '\r') {
          cleaned += '\\r';
        } else if (inQuotes && ch === '\t') {
          cleaned += '\\t';
        } else {
          cleaned += ch;
        }

        prevChar = ch;
      }

      jsonStr = cleaned;
    }

    // === 修复字符串值中未转义的英文双引号 ===
    // 大模型可能在 Markdown 文本中误写 " 导致 JSON 结构断裂
    {
      let sanitized = '';
      let inString = false;
      let prevChar = '';

      for (let i = 0; i < jsonStr.length; i++) {
        const ch = jsonStr[i];

        if (ch === '"' && prevChar !== '\\') {
          if (inString) {
            // 当前在字符串内，检查这个 " 是否是真正的结束符
            const rest = jsonStr.substring(i + 1).replace(/[\s\r\n]/g, '');
            if (rest.startsWith(',') || rest.startsWith('}') || rest.startsWith(']') || rest.startsWith(':')) {
              // 下一个有效字符是 JSON 结构符 → 这是正确的字符串结束
              inString = false;
              sanitized += ch;
            } else {
              // 下一个有效字符不是结构符 → 这是未转义的双引号，替换为中文右引号
              sanitized += '\u201D';
            }
          } else {
            inString = true;
            sanitized += ch;
          }
        } else {
          sanitized += ch;
        }

        prevChar = ch;
      }

      jsonStr = sanitized;
    }

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      const errMsg = parseError instanceof Error ? parseError.message : 'Unknown';
      console.error('❌ 后端 JSON.parse 失败:', errMsg);
      console.error('❌ 大模型原始返回全文:', content);
      console.error('❌ 清洗后待解析文本(前800字符):', jsonStr.substring(0, 800));
      return NextResponse.json(
        { error: `调用大模型失败: JSON 解析失败 - ${errMsg}` },
        { status: 500 }
      );
    }

    // ========== 严格校验：缺失字段直接炸出原文 ==========
    if (!result.jdAnalysis) {
      const errMsg = '❌ 大模型返回缺少 jdAnalysis 字段！原始内容：\n' + content;
      console.error(errMsg);
      throw new Error(errMsg);
    }
    if (!result.matchAssessment) {
      const errMsg = '❌ 大模型返回缺少 matchAssessment 字段！原始内容：\n' + content;
      console.error(errMsg);
      throw new Error(errMsg);
    }
    if (!result.tailoredResume) {
      const errMsg = '❌ 大模型返回缺少 tailoredResume 字段！原始内容：\n' + content;
      console.error(errMsg);
      throw new Error(errMsg);
    }

    if (result.starStories && !Array.isArray(result.starStories)) {
      result.starStories = [];
    }

    return NextResponse.json(result);
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