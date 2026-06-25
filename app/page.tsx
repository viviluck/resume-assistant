"use client";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Cloud, FileText, Sparkles, AlertCircle, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── 类型定义 ───────────────────────────────────
interface JdAnalysis {
  coreKeywords: string[];
  hardSkills: string[];
  softSkills: string[];
  hiddenHurdles: string[];
  rolePositioning: string;
  dailyWorkflow: string[];
  coreChallenge: string;
  survivalGuide: string;
}

interface MatchAssessment {
  matchScore: number;
  matchReport: string;
}

interface TailoredResume {
  optimizedContent: string;
}

interface StarStory {
  question: string;
  tag: string;
  s: string;
  t: string;
  a: string;
  r: string;
  hook?: string;
}

interface UserPersona {
  coreTraits: string[];
  workStyle: string;
  careerMotivation: string;
  growthPotential: string;
}

interface ApiResponse {
  jdAnalysis: JdAnalysis;
  matchAssessment: MatchAssessment;
  tailoredResume: TailoredResume;
  starStories?: StarStory[];
  userPersona?: UserPersona;
}

type TabType = 'jdAnalysis' | 'matchAssessment' | 'atsCheck' | 'icebreaker';

// ─── 全局JSON安全提取器 ─────────────────────────
const safeParseJSON = (data: any): any => {
  if (typeof data !== 'string') return data;
  try {
    const cleaned = data.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return data;
  }
};

// ─── 批注文字渲染器 ────────────────────────────
const annotationRegex = /(\[👉.*?\]|\[💡.*?\])/g;
const AnnotationText = ({ children }: { children: React.ReactNode }) => {
  const processChild = (child: React.ReactNode, key: number): React.ReactNode => {
    if (typeof child === 'string') {
      const parts = child.split(annotationRegex);
      if (parts.length === 1) return child;
      return parts.map((part, i) => {
        if (part.match(annotationRegex)) {
          return (
            <span key={`${key}-${i}`} className="text-slate-400 text-xs italic ml-1">
              {part}
            </span>
          );
        }
        return part;
      });
    }
    if (React.isValidElement(child)) {
      const typedChild = child as React.ReactElement<{ children?: React.ReactNode }>;
      if (typedChild.props?.children) {
        return React.cloneElement(typedChild, {
          ...typedChild.props,
          children: React.Children.map(typedChild.props.children, (c, i) => processChild(c, i)) as React.ReactNode,
        } as React.Attributes & { children?: React.ReactNode });
      }
    }
    return child;
  };

  return (
    <span>
      {React.Children.map(children, (child, index) => processChild(child, index))}
    </span>
  );
};

// ─── 打字机 Hook ────────────────────────────────
function useTypewriter(text: string, speed: number = 12, enabled: boolean = true) {
  const [displayText, setDisplayText] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayText(text);
      return;
    }
    indexRef.current = 0;
    setDisplayText('');
    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayText(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  const isTyping = enabled && displayText.length < (text || '').length;
  return { displayText, isTyping };
}

// ─── Premium 浅色 AI 加载圆环 (Indigo-600 发光呼吸环) ──────
function PremiumLoader({ text = 'AI 深度思考中...' }: { text?: string }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-5"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="relative w-20 h-20">
        {/* 外层发光呼吸圆环 */}
        <motion.div
          className="absolute inset-0 rounded-full border-[3px] border-indigo-600/30"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* 中层旋转光环 */}
        <motion.div
          className="absolute inset-0 rounded-full border-[3px] border-transparent"
          style={{
            borderTopColor: 'rgb(79, 70, 229)',
            borderRightColor: 'rgb(99, 102, 241)',
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
        {/* 中心脉冲核心 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-3 h-3 bg-indigo-600 rounded-full"
            style={{ boxShadow: '0 0 16px rgba(79,70,229,0.6), 0 0 32px rgba(79,70,229,0.3)' }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.7, 1.2, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        {/* 外层辉光 */}
        <motion.div
          className="absolute -inset-4 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)' }}
          animate={{ opacity: [0, 0.7, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <p className="text-sm text-slate-500 font-medium">{text}</p>
    </motion.div>
  );
}

// ─── Markdown 打字机渲染组件 ───────────────────
function TypewriterMarkdown({
  rawText,
  enabled = true,
  speed = 10,
  className = '',
}: {
  rawText: string;
  enabled?: boolean;
  speed?: number;
  className?: string;
}) {
  const { displayText, isTyping } = useTypewriter(rawText, speed, enabled);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3" style={{ fontSize: '1.125rem' }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold text-indigo-600 mt-4 mb-2" style={{ fontSize: '1rem' }}>
              {children}
            </h4>
          ),
          strong: ({ children }) => (
            <strong className="text-indigo-700 font-bold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-amber-600 font-bold not-italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="pl-5 space-y-1.5 my-2">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="text-slate-700">{children}</li>
          ),
          p: ({ children }) => (
            <p className="text-slate-700 mb-2">{children}</p>
          ),
          a: ({ href, children }) => {
            if (href && href.startsWith('AI思路：')) {
              const thought = href.replace('AI思路：', '');
              return (
                <span className="relative group inline-block ml-2 cursor-help align-middle z-50">
                  <span className="text-amber-500 hover:text-amber-600 transition-colors text-lg">
                    {children}
                  </span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-gray-900 text-white text-sm leading-relaxed rounded-xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 shadow-2xl pointer-events-none z-[9999]">
                    <span className="font-bold text-amber-400 block mb-1">💡 AI 优化思路</span>
                    {thought}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></span>
                  </span>
                </span>
              );
            }
            return <a href={href} className="text-indigo-600 hover:underline">{children}</a>;
          },
        }}
      >
        {displayText}
      </ReactMarkdown>
      {isTyping && (
        <motion.span
          className="inline-block w-2 h-4 bg-indigo-500 ml-0.5 align-middle rounded-sm"
          animate={{ opacity: [0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
    </div>
  );
}

// ─── STAR 卡片展开 Hook ───────────────────────
function useStarExpand() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggle = useCallback((idx: number) => {
    setExpandedIndex(prev => prev === idx ? null : idx);
  }, []);

  return { expandedIndex, toggle };
}

// ─── STAR 故事卡片组件 ─────────────────────────
function StarStoryCard({ story, index }: { story: StarStory; index: number }) {
  const { expandedIndex, toggle } = useStarExpand();
  const isOpen = expandedIndex === index;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md bg-white">
      <button
        onClick={() => toggle(index)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-7 h-7 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-xs font-bold text-amber-600 shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{story.question}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-xs text-gray-500">
              {story.tag}
            </span>
          </div>
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 text-gray-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="star-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-50 space-y-3">
              <div className="pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Situation (情境)</p>
                <p className="text-sm text-gray-700 leading-relaxed">{story.s}</p>
              </div>
              {story.t && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Task (任务)</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{story.t}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Action (行动)</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{story.a}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Result (结果)</p>
                <p className="text-sm text-gray-700 leading-relaxed">{story.r}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 卡片容器变体 ──────────────────────────────
const cardSlideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

// ─── 主组件 ────────────────────────────────────
export default function Home() {
  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('jdAnalysis');
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [introText, setIntroText] = useState<string | null>(null);
  const [introLoading, setIntroLoading] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);
  const [resumeInputMode, setResumeInputMode] = useState<'text' | 'file'>('text');
  const [interviewText, setInterviewText] = useState<string | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [crammingText, setCrammingText] = useState<string | null>(null);
  const [crammingParsed, setCrammingParsed] = useState<any>(null);
  const [crammingLoading, setCrammingLoading] = useState(false);
  const [crammingError, setCrammingError] = useState<string | null>(null);
  const [atsText, setAtsText] = useState<string | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);
  const [killerQuestions, setKillerQuestions] = useState<any[] | null>(null);
  const [killerQuestionsLoading, setKillerQuestionsLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [tailoredResume, setTailoredResume] = useState("");
  const [jdAnalysis, setJdAnalysis] = useState<JdAnalysis | null>(null);
  const [userPersona, setUserPersona] = useState<UserPersona | null>(null);
  const [resumeRegenerating, setResumeRegenerating] = useState(false);
  const [accordionOpenIndex, setAccordionOpenIndex] = useState<number | null>(null);
  const [starStories, setStarStories] = useState<StarStory[]>([]);

  // 打字机开关：首次加载完成后启用
  const [resumeTypewriterReady, setResumeTypewriterReady] = useState(false);
  const [interviewTypewriterReady, setInterviewTypewriterReady] = useState(false);
  const [introTypewriterReady, setIntroTypewriterReady] = useState(false);
  const [crammingTypewriterReady, setCrammingTypewriterReady] = useState(false);
  const [atsTypewriterReady, setAtsTypewriterReady] = useState(false);
  const [matchReportTypewriterReady, setMatchReportTypewriterReady] = useState(false);

  // 当 apiResponse 变化时触发打字机
  useEffect(() => {
    if (apiResponse?.tailoredResume?.optimizedContent) {
      setResumeTypewriterReady(false);
      setTimeout(() => setResumeTypewriterReady(true), 100);
    }
  }, [apiResponse?.tailoredResume?.optimizedContent]);

  useEffect(() => {
    if (apiResponse?.matchAssessment?.matchReport) {
      setMatchReportTypewriterReady(false);
      setTimeout(() => setMatchReportTypewriterReady(true), 100);
    }
  }, [apiResponse?.matchAssessment?.matchReport]);

  useEffect(() => {
    if (interviewText) {
      setInterviewTypewriterReady(false);
      setTimeout(() => setInterviewTypewriterReady(true), 100);
    }
  }, [interviewText]);

  useEffect(() => {
    if (introText) {
      setIntroTypewriterReady(false);
      setTimeout(() => setIntroTypewriterReady(true), 100);
    }
  }, [introText]);

  useEffect(() => {
    if (crammingText) {
      setCrammingTypewriterReady(false);
      setTimeout(() => setCrammingTypewriterReady(true), 100);
    }
  }, [crammingText]);

  useEffect(() => {
    if (atsText) {
      setAtsTypewriterReady(false);
      setTimeout(() => setAtsTypewriterReady(true), 100);
    }
  }, [atsText]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        const extracted = fullText.trim();
        setResumeText(extracted);
      } catch (err) {
        console.error('[PDF解析] 失败:', err);
        setResumeText('');
        alert('PDF 解析失败，请确认文件为可提取文字的 PDF（非扫描件）');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setResumeText(text);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
    accept: { 'text/*': ['.txt', '.md'], 'application/pdf': ['.pdf'] }
  });

  const handleGenerate = async () => {
    if (!jdText.trim() || !resumeText.trim()) {
      alert('请填写目标岗位JD和上传简历文本');
      return;
    }

    setIsLoading(true);
    setApiResponse(null);
    setErrorText(null);
    setCrammingText(null);
    setCrammingError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd: jdText, resume: resumeText }),
      });
      const data = await response.json();
      console.log("=== API 原始全量返回 ===", data);

      if (!response.ok || data.error) {
        setErrorText(data.error || '分析失败，请重试');
        return;
      }

      setApiResponse(data);
      setTailoredResume(data.tailoredResume?.optimizedContent || "");
      if (data.starStories && Array.isArray(data.starStories)) {
        setStarStories(data.starStories);
      } else {
        setStarStories([]);
      }
      if (data.jdAnalysis) {
        setJdAnalysis(data.jdAnalysis);
      } else {
        setJdAnalysis(null);
      }
      setUserPersona(data.userPersona || null);
    } catch (error) {
      console.error("❌ 前端请求彻底失败:", error);
      alert(`请求失败，请按 F12 查看控制台。报错详情: ${error instanceof Error ? error.message : error}`);
      setErrorText(error instanceof Error ? error.message : '网络请求失败，请检查连接后重试');
    } finally {
      setIsLoading(false);
    }

    // 自动请求核心技能抱佛脚数据
    try {
      const crammingRes = await fetch('/api/cramming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText.trim(), jd: jdText.trim() }),
      });
      const crammingData = await crammingRes.json();
      if (!crammingRes.ok || crammingData.error) {
        setCrammingError(crammingData.error || '抱佛脚数据请求失败');
        return;
      }
      setCrammingText(crammingData.crammingText);
      setCrammingParsed(crammingData.crammingData || null);
    } catch (error) {
      console.error("❌ 前端请求彻底失败:", error);
      alert(`请求失败，请按 F12 查看控制台。报错详情: ${error instanceof Error ? error.message : error}`);
      setCrammingError(error instanceof Error ? error.message : '网络请求失败，请检查连接后重试');
    }
  };

  const handleGenerateIntro = async () => {
    if (!resumeText.trim()) {
      alert('请先输入简历内容');
      return;
    }
    setIntroLoading(true);
    setIntroText(null);
    setIntroError(null);
    try {
      const response = await fetch('/api/intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText.trim(), jd: jdText.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setIntroError(data.error || '生成自我介绍失败，请重试');
        return;
      }
      setIntroText(data.introText);
    } catch (error) {
      console.error('自我介绍生成失败:', error);
      setIntroError(error instanceof Error ? error.message : '网络请求失败，请检查连接后重试');
    } finally {
      setIntroLoading(false);
    }
  };

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(section);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      alert('复制失败，请手动选择文本复制');
    }
  };

  const handleCopyResume = () => {
    if (!tailoredResume) return;
    const plainText = tailoredResume
      .replace(/\\n/g, '\n')
      .replace(/([^\n])(##+)\s/g, '$1\n\n')
      .replace(/([^\n])\s+-\s+/g, '$1\n- ')
      .replace(/\*\*/g, '')
      .replace(/\[💡\]\(AI思路：.*?\)/g, '')
      .replace(/（👉 契合 JD：.*?）/g, '');
    navigator.clipboard.writeText(plainText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRegenerateResume = async () => {
    if (!resumeText.trim()) {
      alert('请先输入简历内容');
      return;
    }
    setResumeRegenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd: jdText.trim(), resume: resumeText.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        console.error('定制简历重新生成失败:', data.error);
        return;
      }
      setApiResponse(data);
      setTailoredResume(data.tailoredResume?.optimizedContent || "");
      if (data.starStories && Array.isArray(data.starStories)) {
        setStarStories(data.starStories);
      } else {
        setStarStories([]);
      }
      if (data.jdAnalysis) {
        setJdAnalysis(data.jdAnalysis);
      } else {
        setJdAnalysis(null);
      }
    } catch (error) {
      console.error("❌ 前端请求彻底失败:", error);
      alert(`请求失败，请按 F12 查看控制台。报错详情: ${error instanceof Error ? error.message : error}`);
    } finally {
      setResumeRegenerating(false);
    }
  };

  const handleGenerateInterview = async () => {
    if (!resumeText.trim()) {
      alert('请先输入简历内容');
      return;
    }
    setInterviewLoading(true);
    setInterviewText(null);
    setInterviewError(null);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText.trim(), jd: jdText.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setInterviewError(data.error || '生成面试预测失败，请重试');
        return;
      }
      setInterviewText(data.interviewText);
      if (data.killerQuestions && Array.isArray(data.killerQuestions)) {
        setKillerQuestions(data.killerQuestions);
      }
    } catch (error) {
      console.error('面试预测生成失败:', error);
      setInterviewError(error instanceof Error ? error.message : '网络请求失败，请检查连接后重试');
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleGenerateCramming = async () => {
    if (!resumeText.trim()) {
      alert('请先输入简历内容');
      return;
    }
    setCrammingLoading(true);
    setCrammingText(null);
    setCrammingError(null);
    try {
      const response = await fetch('/api/cramming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText.trim(), jd: jdText.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setCrammingError(data.error || '生成技能指南失败，请重试');
        return;
      }
      setCrammingText(data.crammingText);
      setCrammingParsed(data.crammingData || null);
    } catch (error) {
      console.error('技能指南生成失败:', error);
      setCrammingError(error instanceof Error ? error.message : '网络请求失败，请检查连接后重试');
    } finally {
      setCrammingLoading(false);
    }
  };

  const handleGenerateAts = async () => {
    if (!resumeText.trim()) {
      alert('请先输入简历内容');
      return;
    }
    setAtsLoading(true);
    setAtsText(null);
    setAtsError(null);
    try {
      const response = await fetch('/api/ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText.trim(), jd: jdText.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setAtsError(data.error || 'ATS 模拟分析失败，请重试');
        return;
      }
      setAtsText(data.atsText);
    } catch (error) {
      console.error('ATS 模拟分析失败:', error);
      setAtsError(error instanceof Error ? error.message : '网络请求失败，请检查连接后重试');
    } finally {
      setAtsLoading(false);
    }
  };

  const handleRegenerateKillerQuestions = async () => {
    if (!resumeText.trim()) return;
    setKillerQuestionsLoading(true);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText.trim(), jd: jdText.trim(), mode: 'killer' }),
      });
      const data = await response.json();
      if (response.ok && data.killerQuestions && Array.isArray(data.killerQuestions)) {
        setKillerQuestions(data.killerQuestions);
      }
    } catch (error) {
      console.error('夺命高频连环问重新生成失败:', error);
    } finally {
      setKillerQuestionsLoading(false);
    }
  };

  // 夺命高频连环问：简历就绪后自动获取第一份数据
  useEffect(() => {
    if (resumeText.trim() && !killerQuestions && !killerQuestionsLoading) {
      handleRegenerateKillerQuestions();
    }
  }, [resumeText]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'jdAnalysis', label: 'JD 深度解析' },
    { key: 'matchAssessment', label: '匹配度评估' },
    { key: 'icebreaker', label: '💬 破冰话术' },
    { key: 'atsCheck', label: '🤖 ATS 机筛模拟' },
  ];

  // ─── 公共 Markdown 强力清洗函数 ──────────────────
  // 暴力正则：手撕反斜杠、强制劈开 Markdown 标题、修复列表格式
  const cleanMarkdown = (raw: string) => {
    let cleanContent = raw
      .replace(/>/g, '\n\n')
      .replace(/>">">/g, '')
      .replace(/>">/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\\/g, '')
      .replace(/### /g, '\n\n### ')
      .replace(/#### /g, '\n\n#### ')
      .replace(/([^\n])\s+-\s+/g, '$1\n- ')
      .replace(/"{1,}/g, '')
      .replace(/>">/g, '')
      .replace(/\\\s*/g, '')
      .replace(/"/g, '')
      .replace(/\n{3,}/g, '\n\n');
    return cleanContent;
  };

  const renderTabContent = () => {
    if (!apiResponse) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400">
          <Sparkles className="w-12 h-12 mb-4 opacity-20" />
          <p>请输入 JD 和简历，点击「开启求职助推器」查看结果</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'jdAnalysis':
        const rawJdData: any = apiResponse.jdAnalysis || {};
        console.log("=== JD解析收到的真实数据 ===", rawJdData);
        let parsedJD = {};
        try {
          const cleanData = typeof rawJdData === 'string' ? rawJdData.replace(/```json/g, '').replace(/```/g, '') : rawJdData;
          parsedJD = typeof cleanData === 'string' ? JSON.parse(cleanData) : (cleanData || {});
        } catch (e) {
          console.error("JD数据解析失败", e);
        }
        const coreKeywords = (parsedJD as any)?.coreKeywords || (parsedJD as any)?.['核心关键词'] || [];
        const hardSkills = (parsedJD as any)?.hardSkills || (parsedJD as any)?.['硬技能要求'] || (parsedJD as any)?.['硬技能'] || [];
        const softSkills = (parsedJD as any)?.softSkills || (parsedJD as any)?.['软技能要求'] || (parsedJD as any)?.['软技能'] || [];
        const hiddenHurdles = (parsedJD as any)?.hiddenHurdles || (parsedJD as any)?.['隐藏要求'] || (parsedJD as any)?.['hiddenRequirements'] || (parsedJD as any)?.['隐藏要求解析'] || [];
        const safeKeywords = Array.isArray(coreKeywords) ? coreKeywords : [];
        const safeHardSkills = Array.isArray(hardSkills) ? hardSkills : [];
        const safeSoftSkills = Array.isArray(softSkills) ? softSkills : [];
        const safeHurdles = Array.isArray(hiddenHurdles) ? hiddenHurdles : [];
        const renderContent = (content: any, renderAs: 'tags' | 'list' = 'tags') => {
          if (!content || (Array.isArray(content) && content.length === 0)) {
            return <span className="text-slate-400 italic bg-slate-50 px-3 py-1 rounded-md text-sm">暂未提取到相关信息</span>;
          }
          if (renderAs === 'list') {
            return <ul className="list-disc pl-5 space-y-1">{(content as string[]).map((item, i) => <li key={i} className="text-sm text-slate-700">{item}</li>)}</ul>;
          }
          return <div className="flex flex-wrap gap-2">{(content as string[]).map((item, i) => <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm">{item}</span>)}</div>;
        };
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                核心关键词
              </h3>
              <div className="flex flex-wrap gap-2">
                {safeKeywords.length > 0 ? (
                  safeKeywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm">
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic bg-slate-50 px-3 py-1 rounded-md text-sm">暂未提取到相关信息</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                硬技能要求
              </h3>
              <div className="flex flex-wrap gap-2">
                {safeHardSkills.length > 0 ? (
                  safeHardSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic bg-slate-50 px-3 py-1 rounded-md text-sm">暂未提取到相关信息</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                软技能要求
              </h3>
              <div className="flex flex-wrap gap-2">
                {safeSoftSkills.length > 0 ? (
                  safeSoftSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-sm">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic bg-slate-50 px-3 py-1 rounded-md text-sm">暂未提取到相关信息</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                隐藏要求
              </h3>
              <div className="flex flex-wrap gap-2">
                {safeHurdles.length > 0 ? (
                  safeHurdles.map((hurdle, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm">
                      {hurdle}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic bg-slate-50 px-3 py-1 rounded-md text-sm">暂未提取到相关信息</span>
                )}
              </div>
            </div>
          </div>
        );

      case 'matchAssessment':
        const maData = apiResponse.matchAssessment || {} as MatchAssessment;
        const { matchScore: rawScore, matchReport } = maData;
        const matchScoreVal = typeof rawScore === 'number' ? rawScore : 0;
        const cleanedReport = matchReport ? cleanMarkdown(matchReport) : '';
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                  <circle
                    cx="64" cy="64" r="56"
                    stroke={matchScoreVal >= 80 ? '#10b981' : matchScoreVal >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12" fill="none" strokeLinecap="round"
                    strokeDasharray={`${matchScoreVal * 3.52} 352`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-slate-800">{matchScoreVal}</span>
                </div>
              </div>
              <p className="mt-4 text-slate-500 text-sm">综合匹配度评分</p>
            </div>
            {cleanedReport ? (
              <div className="prose max-w-none text-sm leading-relaxed [&>p]:mb-3 [&>ul]:my-2 [&>ul>li]:mb-2 [&>ul>li>p]:my-0 [&>h3]:mt-4 [&>h3]:mb-2 [&>h4]:mt-3 [&>h4]:mb-1" style={{ wordBreak: 'break-word' }}>
                <TypewriterMarkdown
                  rawText={cleanedReport}
                  enabled={matchReportTypewriterReady}
                  speed={8}
                />
              </div>
            ) : (
              <div className="text-center text-slate-400 py-4">暂无详细评估报告</div>
            )}
          </div>
        );

      case 'icebreaker':
        if (introLoading) return <PremiumLoader text="正在为你定制破冰话术..." />;
        if (introError) {
          return (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
              <p className="text-red-500 text-sm text-center whitespace-pre-wrap break-all">{introError}</p>
            </div>
          );
        }
        if (!introText) {
          return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-sm mb-2">生成一段发给 HR 的求职破冰话术</p>
              <p className="text-xs text-slate-400 mb-6">点击下方按钮开始生成</p>
              <button
                onClick={handleGenerateIntro}
                disabled={introLoading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <Mic className="w-4 h-4" />
                生成一分钟自我介绍（破冰话术）
              </button>
            </div>
          );
        }
        const iceText = typeof introText === 'string' ? introText : '生成失败，请重试';
        let displayMessage = iceText;
        try {
          const cleanData = iceText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanData);
          displayMessage = parsed.message || parsed.text || iceText;
        } catch (e) {
          displayMessage = iceText;
        }
        return (
          <div>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Mic className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">一分钟自我介绍（破冰话术）</h3>
              </div>
              <div className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                <TypewriterMarkdown
                  rawText={displayMessage}
                  enabled={introTypewriterReady}
                  speed={10}
                />
              </div>
              <button onClick={handleGenerateIntro} className="mt-4 text-indigo-600 text-xs hover:text-indigo-800 underline">
                重新生成
              </button>
            </div>
          </div>
        );

      case 'atsCheck':
        if (atsLoading) return <PremiumLoader text="ATS 机筛模拟分析中..." />;
        if (atsError) {
          return (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
              <p className="text-red-500 text-sm text-center whitespace-pre-wrap break-all">{atsError}</p>
            </div>
          );
        }
        if (!atsText) {
          return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="text-5xl mb-4">🤖</div>
              <p className="text-sm mb-2">模拟企业 ATS 系统对简历的扫描评分</p>
              <p className="text-xs text-slate-400 mb-6">点击下方按钮开始分析</p>
              <button
                onClick={handleGenerateAts}
                disabled={atsLoading}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
              >
                开始 ATS 机筛模拟
              </button>
            </div>
          );
        }
        const atsClean = cleanMarkdown(atsText);
        let atsData: any = null;
        try {
          let raw = atsText;
          // 暴力清洗：移除 markdown 代码块标记
          raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
          // 处理键名无双引号的非法 JSON（如 { ATS_机筛存活率: 68 }）
          raw = raw.replace(/([{,]\s*)([a-zA-Z_\u4e00-\u9fa5]+)\s*:/g, '$1"$2":');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && (parsed['ATS_机筛存活率'] || parsed.ats_score)) {
            atsData = parsed;
          }
        } catch (e) {
          // not JSON, use markdown rendering
        }
        return (
          <div className="bg-white border border-slate-200/60 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <h3 className="font-bold text-slate-800 text-base">ATS 机筛模拟分析</h3>
            </div>
            {atsData ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-5 mb-6 border border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">综合匹配评分</h3>
                    <p className="text-xs text-slate-500 mt-1">基于机器语义及硬性关键词提取</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-black tracking-tight ${
                      (atsData['ATS_机筛存活率'] || atsData.ats_score) >= 80 ? 'text-emerald-500' :
                      (atsData['ATS_机筛存活率'] || atsData.ats_score) >= 60 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {atsData['ATS_机筛存活率'] || atsData.ats_score || 0}
                    </span>
                    <span className="text-slate-400 font-medium">/ 100</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-xs">✅</span>
                      成功捕获的核心关键词
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(atsData['成功捕获的核心关键词'] || atsData.matched_keywords || []).length > 0 ? (
                        (atsData['成功捕获的核心关键词'] || atsData.matched_keywords).map((kw: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 rounded-md text-xs font-medium shadow-sm">
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-600/60">未识别到明显匹配项</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                    <h4 className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-2">
                      <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-xs">❌</span>
                      缺失的致命关键词
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(atsData['缺失的致命关键词'] || atsData.missing_fatal_keywords || []).length > 0 ? (
                        (atsData['缺失的致命关键词'] || atsData.missing_fatal_keywords).map((kw: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-white border border-rose-200 text-rose-700 rounded-md text-xs font-medium shadow-sm">
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-rose-600/60">表现完美，无明显缺失</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <span>💡</span> ATS 排版避坑指南
                  </h4>
                  <p className="text-sm text-blue-700/90 leading-relaxed">
                    {atsData['ATS_排版避坑指南'] || atsData.ats_format_guidance}
                  </p>
                </div>
              </div>
            ) : (
              <div className="prose max-w-none text-sm leading-snug [&>p]:mb-2 [&>ul]:my-1 [&>ul>li]:my-0 [&>ul>li>p]:my-0 [&>h3]:mt-4 [&>h3]:mb-2 [&>h4]:mt-3 [&>h4]:mb-1" style={{ wordBreak: 'break-word' }}>
                <TypewriterMarkdown
                  rawText={atsClean}
                  enabled={atsTypewriterReady}
                  speed={10}
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Premium 浅色卡片 className ─────────────────
  const cardClass = 'bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ─── Header ─── */}
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                ResumeAI
              </h1>
              <p className="text-xs text-slate-500">智能求职助手</p>
            </div>
          </div>
        </motion.header>

        {/* 顶部区域：左右两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入区与操作区 */}
          <motion.div
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* JD 卡片 */}
            <motion.div
              className={cardClass}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">目标岗位 JD</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="请粘贴目标岗位的招聘要求..."
                className="w-full h-40 px-4 py-3 bg-gray-50 border border-transparent focus:border-gray-200 focus:bg-white focus:ring-0 rounded-xl resize-none transition-all text-slate-800 placeholder-gray-400"
              />
            </motion.div>

            {/* 简历卡片 */}
            <motion.div
              className={cardClass}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider">简历内容</label>
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setResumeInputMode('text')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      resumeInputMode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-700'
                    }`}
                  >
                    纯文本输入
                  </button>
                  <button
                    onClick={() => setResumeInputMode('file')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      resumeInputMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-700'
                    }`}
                  >
                    上传简历文件
                  </button>
                </div>
              </div>

              {resumeInputMode === 'text' ? (
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="请在此粘贴您的简历文字..."
                  className="w-full h-52 px-4 py-3 bg-gray-50 border border-transparent focus:border-gray-200 focus:bg-white focus:ring-0 rounded-xl resize-none transition-all text-slate-800 placeholder-gray-400"
                />
              ) : (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Cloud className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-gray-500' : 'text-gray-300'}`} />
                  <p className="text-slate-500 mb-2">
                    {isDragging ? '释放文件以上传' : '拖拽文件到此处，或点击选择文件'}
                  </p>
                  <p className="text-sm text-slate-400">支持 .txt, .md, .pdf 格式</p>
                  {resumeText && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">已加载简历内容（{resumeText.length} 字符）</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* 左侧主操作按钮：常驻显示 */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || !jdText || !resumeText}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-lg shadow-sm transition-all duration-300 transform flex items-center justify-center gap-2
                ${isLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : (!jdText || !resumeText)
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-lg hover:-translate-y-0.5'
                }`}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin text-xl">⏳</span>
                  <span>正在深度解析与生成...</span>
                </>
              ) : (tailoredResume || jdAnalysis) ? (
                <>
                  <span className="text-xl">🔄</span>
                  <span>重新生成全案</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🚀</span>
                  <span>开启求职助推器</span>
                </>
              )}
            </button>
          </motion.div>

          {/* ─── 右侧结果区 ─── */}
          <motion.div
            className={`${cardClass} p-0`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {errorText ? (
              <div className="flex flex-col items-center justify-center h-96 p-8">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-red-600 font-semibold text-lg text-center mb-2">分析失败</p>
                <p className="text-red-500 text-sm text-center whitespace-pre-wrap break-all">{errorText}</p>
              </div>
            ) : (
              <>
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                        activeTab === tab.key
                          ? 'text-slate-900 border-slate-900'
                          : 'text-gray-400 border-transparent hover:text-gray-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="p-8">{renderTabContent()}</div>
              </>
            )}
          </motion.div>
        </div>

        {/* 底部区域：全宽长内容区 */}
        <div className="flex flex-col gap-8 w-full">

          {/* 🔍 JD 深度透视与画像解码 模块 */}
          {jdAnalysis && (
            <motion.div
              key="jd-analysis-module"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-white border border-slate-200/60 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 mt-6 mb-6"
            >
              <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-xl">
                  🕵️‍♂️
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">岗位内部画像解码</h3>
                  <p className="text-xs text-slate-500 mt-0.5">透过八股文，还原该岗位入职后的真实生存状态</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-blue-500 text-lg">🎯</span>
                      <h4 className="font-bold text-slate-800">真实工作定位</h4>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {jdAnalysis.rolePositioning || (jdAnalysis as any)['真实工作定位'] || (jdAnalysis as any)['role_positioning'] || '正在深入挖掘岗位真实定位，请稍候或重试...'}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-indigo-500 text-lg">⏱️</span>
                      <h4 className="font-bold text-slate-800">真实的一天 (Day-to-Day)</h4>
                    </div>
                    <ul className="space-y-3">
                      {(jdAnalysis.dailyWorkflow || (jdAnalysis as any)['真实的一天'] || (jdAnalysis as any)['daily_workflow'] || ['暂无具体日常工作推测，建议重新生成分析']).map((task, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-indigo-400 mt-0.5 shrink-0">✅</span>
                          <span className="leading-relaxed">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100/50 hover:border-rose-200 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-rose-500 text-lg">🔥</span>
                      <h4 className="font-bold text-slate-800">核心背锅点 / 推进难点</h4>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {jdAnalysis.coreChallenge || (jdAnalysis as any)['核心背锅点'] || (jdAnalysis as any)['core_challenge'] || '正在分析岗位潜在风险...'}
                    </p>
                  </div>

                  <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100/50 hover:border-emerald-200 transition-colors h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-emerald-500 text-lg">🛡️</span>
                      <h4 className="font-bold text-slate-800">试用期生存指南</h4>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {jdAnalysis.survivalGuide || (jdAnalysis as any)['试用期生存指南'] || (jdAnalysis as any)['survival_guide'] || '正在生成保命建议...'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 📝 深度定制简历 模块 */}
          {!tailoredResume ? (
            <div className="w-full bg-white border border-gray-100 rounded-2xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] mt-6 relative transition-all">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xl">
                    📝
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">深度定制简历</h3>
                    <p className="text-xs text-gray-400 mt-0.5">采用大厂标准 XYZ 法则深度精修</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {tailoredResume && (
                    <button
                      onClick={handleCopyResume}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
                    >
                      <span>{isCopied ? '✅' : '📋'}</span>
                      {isCopied ? '已复制' : '复制文本'}
                    </button>
                  )}

                  {tailoredResume && (
                    <button
                      onClick={handleGenerate}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${isLoading
                          ? 'bg-indigo-50/50 text-indigo-300 cursor-not-allowed'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95'
                        }`}
                    >
                      <span className={`${isLoading ? 'animate-spin' : ''}`}>
                        {isLoading ? '⏳' : '🔄'}
                      </span>
                      {isLoading ? '正在重塑' : '重新生成'}
                    </button>
                  )}
                </div>
              </div>

              <div className="py-12 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-2xl mb-4 text-gray-400 shadow-sm">
                  📄
                </div>
                <p className="text-gray-900 font-medium text-lg">板块已就绪</p>
                <p className="text-gray-400 text-sm mt-1">请输入 JD 与简历并点击上方按钮，生成后将在此处展示</p>
              </div>
            </div>
          ) : (() => {
            const parsedResume = safeParseJSON(tailoredResume);
            let resumeContent = tailoredResume;

            if (parsedResume && typeof parsedResume === 'object') {
              if (parsedResume['总体评价'] || parsedResume['面试题']) {
                return (
                  <motion.div
                    key="tailored-resume-error"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-white border border-amber-200/60 rounded-2xl p-8 shadow-sm mt-6"
                  >
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center text-2xl mb-4">⚠️</div>
                      <h3 className="font-bold text-slate-800 text-lg mb-2">数据格式异常</h3>
                      <p className="text-sm text-slate-500 max-w-md">
                        检测到返回的简历内容格式异常，请点击下方按钮重新生成正确的简历数据。
                      </p>
                      <button
                        onClick={handleGenerate}
                        className="mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 transition-all"
                      >
                        🔄 重新生成
                      </button>
                    </div>
                  </motion.div>
                );
              }
              const extracted = parsedResume.optimizedContent ||
                parsedResume.content ||
                parsedResume.text ||
                parsedResume.message ||
                '';
              if (extracted) {
                resumeContent = extracted;
              }
            } else if (typeof parsedResume === 'string' && parsedResume !== tailoredResume) {
              resumeContent = parsedResume;
            }

            const finalResume = (resumeContent || "")
              .split('>')
              .join('\n\n')
              .replace(/\\-/g, '-')
              .replace(/\\n/g, '\n');
            return (
            <motion.div
              key="tailored-resume-display-module"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-white border border-gray-100 rounded-2xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-all duration-300 mt-6"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xl">
                    📝
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">深度定制简历</h3>
                    <p className="text-xs text-gray-400 mt-0.5">采用大厂标准 XYZ 法则深度精修</p>
                  </div>
                </div>

                {tailoredResume && (
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isLoading
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95'
                      }`}
                  >
                    <span className={`${isLoading ? 'animate-spin' : ''}`}>
                      {isLoading ? '⏳' : '🔄'}
                    </span>
                    {isLoading ? '正在重塑...' : '重新生成'}
                  </button>
                )}
              </div>

              <div className="prose prose-slate max-w-none
                prose-p:text-slate-600 prose-li:text-slate-700 prose-li:my-1
                prose-strong:text-indigo-600 prose-strong:font-bold
                prose-h3:text-lg prose-h3:font-bold prose-h3:text-slate-800 prose-h3:mt-6 prose-h3:mb-3 prose-h3:pb-2 prose-h3:border-b prose-h3:border-slate-100
                marker:text-indigo-400
              ">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="text-slate-800 mb-3 leading-relaxed">
                        <AnnotationText>{children}</AnnotationText>
                      </p>
                    ),
                    li: ({ children }) => (
                      <li className="text-slate-700 my-1">
                        <AnnotationText>{children}</AnnotationText>
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-indigo-600 font-bold">
                        <AnnotationText>{children}</AnnotationText>
                      </strong>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3 pb-2 border-b border-slate-100">
                        <AnnotationText>{children}</AnnotationText>
                      </h3>
                    ),
                  }}
                  remarkPlugins={[remarkGfm]}
                >
                  {finalResume}
                </ReactMarkdown>
              </div>
            </motion.div>
            );
          })()}

          {/* ─── 毒舌面试实战舱 ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full bg-white border border-gray-100 rounded-2xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] mt-6 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-xl">
                  👹
                  </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">毒舌面试实战舱</h3>
                  <p className="text-xs text-gray-400 mt-0.5">你的专属压力面试模拟器</p>
                </div>
              </div>
              {interviewText && (
                <button
                  onClick={() => handleCopy(interviewText, 'interview')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all"
                >
                  {copyFeedback === 'interview' ? '✅ 复制成功！' : '📋 一键复制'}
                </button>
              )}
            </div>
            <div>
              {interviewLoading ? (
                <PremiumLoader text="毒舌面试官正在准备犀利问题..." />
              ) : interviewError ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                  <p className="text-red-500 text-sm text-center whitespace-pre-wrap break-all">{interviewError}</p>
                </div>
              ) : !interviewText ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="text-5xl mb-4">😈</div>
                  <p className="text-sm mb-2">让毒舌面试官基于你的简历和 JD，生成压力面试题</p>
                  <p className="text-xs text-slate-400 mb-6">请先完成上方简历分析后，点击下方按钮开始</p>
                  <button
                    onClick={handleGenerateInterview}
                    className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3 text-base"
                  >
                    ⚡ 简历已就绪，请求毒舌面试官拷问
                  </button>
                </div>
              ) : (
                <div>
                  {(() => {
                    const parsedInterview = safeParseJSON(interviewText);
                    if (parsedInterview && typeof parsedInterview === 'object' && parsedInterview['总体评价']) {
                      const 总体评价 = parsedInterview['总体评价'];
                      const 面试题 = Array.isArray(parsedInterview['面试题']) ? parsedInterview['面试题'] : [];
                      return (
                        <div>
                          <div className="bg-white border border-slate-200/60 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                              <span className="text-2xl">👹</span>
                              <h3 className="font-bold text-slate-800 text-lg">毒舌面试实战舱</h3>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 mb-6">
                              <h4 className="font-bold text-rose-700 mb-2">致命点评</h4>
                              <p className="text-sm text-rose-600 leading-relaxed">
                                {总体评价['内容'] || 总体评价 || '评价解析中...'}
                              </p>
                            </div>
                            <div className="space-y-4">
                              {面试题.map((q, index) => (
                                <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                                  <p className="font-bold text-slate-800 mb-3">Q: {q['问题'] || q.question}</p>
                                  {q['毒舌潜台词'] && (
                                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3 border border-amber-100">
                                      <span className="font-bold">💡 毒舌潜台词：</span>
                                      {q['毒舌潜台词']}
                                    </div>
                                  )}
                                  <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                                    <span className="font-bold text-indigo-600">破局思路：</span>
                                    {q['STAR破局思路']?.['Action(行动)'] || q.answer || '暂无思路'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-6 pt-4 border-t border-orange-200 flex justify-center">
                            <button
                              onClick={handleGenerateInterview}
                              disabled={interviewLoading}
                              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                              {interviewLoading ? '重新生成中...' : '😈 换一批问题继续拷打'}
                            </button>
                          </div>
                        </div>
                      );
                    }
                    const interviewCleaned = cleanMarkdown(interviewText);
                    return (
                      <div>
                        <div
                          className="prose max-w-none text-sm leading-snug [&>p]:mb-2 [&>ul]:my-1 [&>ul>li]:my-0 [&>ul>li>p]:my-0 [&>h3]:mt-4 [&>h3]:mb-2 [&>h4]:mt-3 [&>h4]:mb-1"
                          style={{ wordBreak: 'break-word' }}
                        >
                          <TypewriterMarkdown
                            rawText={interviewCleaned}
                            enabled={interviewTypewriterReady}
                            speed={8}
                          />
                        </div>
                        <div className="mt-6 pt-4 border-t border-orange-200 flex justify-center">
                          <button
                            onClick={handleGenerateInterview}
                            disabled={interviewLoading}
                            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                          {interviewLoading ? '重新生成中...' : '😈 换一批问题继续拷打'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 🔥 夺命高频连环问 - 手风琴面板 */}
          <div className="mt-8 pt-6 border-t border-orange-100">
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-rose-500 rounded-xl flex items-center justify-center text-lg shadow-md">
                  🔥
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">夺命高频连环问</h3>
                  <p className="text-xs text-slate-400 mt-0.5">点击题目展开 → 先看毒舌拆解，后看反杀话术</p>
                </div>
              </div>
              <button
                onClick={handleRegenerateKillerQuestions}
                disabled={killerQuestionsLoading || !resumeText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all disabled:opacity-50"
              >
                <span className={killerQuestionsLoading ? "animate-spin inline-block" : ""}>🔄</span>
                {killerQuestionsLoading ? '毒舌生成中...' : '换一批'}
              </button>
            </div>
            <div className="space-y-3">
              {killerQuestionsLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">正在基于你的简历生成毒舌连环问...</div>
              ) : killerQuestions && killerQuestions.length > 0 ? (
                killerQuestions.map((item, idx) => {
                  const isOpen = accordionOpenIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
                    >
                      <button
                        onClick={() => setAccordionOpenIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left bg-gradient-to-r from-slate-50 to-white hover:from-red-50 hover:to-orange-50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-800 leading-snug">
                            {item.question}
                          </span>
                        </div>
                        <svg
                          className={`w-5 h-5 flex-shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div
                        className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <div className="px-5 pb-5 pt-2 space-y-3 border-t border-slate-100">
                          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm">😈</span>
                              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">HR 潜台词</span>
                            </div>
                            <p className="text-sm text-purple-800 leading-relaxed">{item.hiddenAgenda}</p>
                          </div>
                          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm">❌</span>
                              <span className="text-xs font-bold text-red-700 uppercase tracking-wide">作死回答</span>
                            </div>
                            <p className="text-sm text-red-700 leading-relaxed">{item.fatalMistake}</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm">💊</span>
                              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">反杀话术</span>
                            </div>
                            <p className="text-sm text-emerald-800 leading-relaxed font-medium">{item.perfectAnswer}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <p className="text-sm mb-1">暂无数据</p>
                  <p className="text-xs">请先上传简历并开启求职助推器，然后点击上方「换一批」按钮生成</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── 核心技能抱佛脚 ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow mt-8"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center text-xl shadow-md">
                🚑
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">核心技能抱佛脚</h2>
                <p className="text-xs text-slate-500">基于简历与 JD 差距生成的面试急救指南</p>
              </div>
            </div>
            {crammingText && (
              <button
                onClick={() => handleCopy(crammingText, 'cramming')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all"
              >
                {copyFeedback === 'cramming' ? '✅ 复制成功！' : '📋 一键复制'}
              </button>
            )}
          </div>
          <div>
            {crammingLoading ? (
              <PremiumLoader text="急救导师正在准备速成指南..." />
            ) : crammingError ? (
              <div className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                <p className="text-red-500 text-sm text-center whitespace-pre-wrap break-all">{crammingError}</p>
              </div>
            ) : crammingText ? (
              <div>
                {crammingParsed && typeof crammingParsed === 'object' && crammingParsed['核心技能缺口'] ? (
                  <div className="space-y-4 mt-4 text-sm break-words whitespace-pre-wrap">
                    <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                      <h4 className="font-bold text-red-700 text-base mb-2 flex items-center gap-2">
                        <span>🎯</span> 核心技能缺口：{crammingParsed['核心技能缺口']}
                      </h4>
                      <p className="text-red-600 mb-3 leading-relaxed">{crammingParsed['解释']}</p>
                      <div className="bg-white/80 p-3 rounded-lg text-slate-700 border border-red-100/50">
                        <span className="font-bold">💡 大白话：</span>{crammingParsed['大白话解释']}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                      <h4 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                        <span>📚</span> 极速充电资源
                      </h4>
                      <ul className="list-disc pl-5 space-y-2 text-blue-800">
                        <li><span className="font-semibold">B站/视频搜索词：</span> {crammingParsed['极速充电资源']?.['B站/视频搜索词']}</li>
                        <li><span className="font-semibold">优质博主/公众号：</span> {crammingParsed['极速充电资源']?.['优质博主/公众号']}</li>
                      </ul>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                      <h4 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
                        <span>⚡</span> 3天速成动作
                      </h4>
                      <div className="space-y-3 text-emerald-800">
                        <div className="flex gap-2"><span className="font-bold whitespace-nowrap">Day 1:</span> <p>{crammingParsed['3天速成动作']?.['Day 1']}</p></div>
                        <div className="flex gap-2"><span className="font-bold whitespace-nowrap">Day 2:</span> <p>{crammingParsed['3天速成动作']?.['Day 2']}</p></div>
                        <div className="flex gap-2"><span className="font-bold whitespace-nowrap">Day 3:</span> <p>{crammingParsed['3天速成动作']?.['Day 3']}</p></div>
                      </div>
                    </div>
                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                      <h4 className="font-bold text-amber-700 mb-2 flex items-center gap-2">
                        <span>🎙️</span> 面试话术兜底
                      </h4>
                      <p className="text-amber-800 leading-relaxed italic">
                        &ldquo;{crammingParsed['面试话术兜底']}&rdquo;
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="prose max-w-none text-sm leading-snug [&>p]:mb-2 [&>ul]:my-1 [&>ul>li]:my-0 [&>ul>li>p]:my-0 [&>h3]:mt-4 [&>h3]:mb-2 [&>h4]:mt-3 [&>h4]:mb-1"
                    style={{ wordBreak: 'break-word' }}
                  >
                    <TypewriterMarkdown
                      rawText={cleanMarkdown(crammingText)}
                      enabled={crammingTypewriterReady}
                      speed={10}
                    />
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-orange-200 flex justify-center">
                  <button
                    onClick={handleGenerateCramming}
                    disabled={crammingLoading}
                    className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    🔄 重新生成抱佛脚指南
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <div className="text-5xl mb-4">🚑</div>
                <p className="text-sm mb-2">等待分析完成后，这里将展示技能急救指南</p>
                <p className="text-xs text-slate-400">请先点击「开启求职助推器」</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── STAR 故事库 ─── */}
          {!starStories || starStories.length === 0 ? (
            <div className="w-full bg-white border border-gray-100 rounded-2xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] mt-6 relative transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-xl">
                  📖
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">专属 STAR 故事库</h3>
                  <p className="text-xs text-gray-400 mt-0.5">高频行为面试题实战答题模板</p>
                </div>
              </div>
              <div className="py-12 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-2xl mb-4 text-gray-400 shadow-sm">
                  💡
                </div>
                <p className="text-gray-900 font-medium text-lg">故事库已就绪</p>
                <p className="text-gray-400 text-sm mt-1">请输入 JD 与简历并生成，你的专属面试故事将在此处展示</p>
              </div>
            </div>
          ) : (
            <motion.div
              key="star-stories-module"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-white border border-gray-100 rounded-2xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-all duration-300 mt-6 relative"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-xl">
                  📖
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">专属 STAR 故事库</h3>
                  <p className="text-xs text-gray-400 mt-0.5">高频行为面试题（HR面/业务面）实战答题模板</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {starStories.map((story, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 hover:border-emerald-200 transition-colors flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4 gap-4">
                      <h4 className="font-bold text-slate-800 text-base leading-snug">Q: {story.question}</h4>
                      <span className="inline-flex shrink-0 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-md">
                        {story.tag}
                      </span>
                    </div>

                    <div className="space-y-5 mt-4 text-sm text-slate-600 leading-relaxed flex-grow">
                      <div className="flex gap-3">
                        <span className="font-black text-slate-300 text-lg leading-none shrink-0 mt-0.5">S</span>
                        <p><strong className="text-slate-700 font-medium">情境：</strong>{story.s}</p>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-black text-slate-300 text-lg leading-none shrink-0 mt-0.5">T</span>
                        <p><strong className="text-slate-700 font-medium">任务：</strong>{story.t}</p>
                      </div>
                      <div className="flex gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <span className="font-black text-emerald-400 text-lg leading-none shrink-0 mt-0.5 drop-shadow-sm">A</span>
                        <p><strong className="text-slate-800 font-bold">行动：</strong>{story.a}</p>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-black text-orange-400 text-lg leading-none shrink-0 mt-0.5 drop-shadow-sm">R</span>
                        <p><strong className="text-slate-800 font-bold">结果：</strong>{story.r}</p>
                      </div>
                    </div>

                    {story.hook && (
                      <div className="mt-6 pt-4 border-t border-emerald-100/50">
                        <div className="inline-flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                          <span className="text-amber-500 font-bold shrink-0">💡 引导追问:</span>
                          <span className="text-amber-700 text-xs font-medium leading-relaxed italic">{story.hook}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}