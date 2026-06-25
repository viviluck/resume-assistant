import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 });
    }

    // 调试信息
    const debugInfo = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
    console.log('[PDF解析API] 收到文件:', debugInfo);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('[PDF解析API] 文件大小:', buffer.length, 'bytes');

    const data = await pdf(buffer);
    
    console.log('[PDF解析API] PDF 页数:', data.numpages);
    console.log('[PDF解析API] 每页详情:', data.pages.map((p: any, i: number) => ({ page: i + 1, length: p.length })));
    
    const extracted = (data.text || '').trim();
    console.log('[PDF解析API] 最终提取文本长度:', extracted.length);
    console.log('[PDF解析API] 提取文本前100字符:', extracted.slice(0, 100));

    // 检查提取结果是否有效
    if (!extracted || extracted.length < 10) {
      console.warn('[PDF解析API] 警告: PDF 文字提取结果为空或过短');
      return NextResponse.json({ 
        text: '', 
        debug: { ...debugInfo, numPages: data.numpages, extractedLength: extracted.length },
        warning: 'PDF 未检测到可直接提取的文字，可能是图片型 PDF 或扫描件'
      });
    }

    // 检查是否只有空白字符
    const hasRealContent = /\S/.test(extracted);
    if (!hasRealContent) {
      console.warn('[PDF解析API] 警告: PDF 提取结果只有空白字符');
      return NextResponse.json({ 
        text: '', 
        debug: { ...debugInfo, numPages: data.numpages, extractedLength: extracted.length },
        warning: 'PDF 提取结果只有空白字符，可能是特殊格式 PDF'
      });
    }

    return NextResponse.json({ 
      text: extracted,
      debug: { ...debugInfo, numPages: data.numpages, extractedLength: extracted.length }
    });

  } catch (error: any) {
    console.error('[PDF解析API] 失败:', error);
    console.error('[PDF解析API] 错误详情:', error?.message, error?.stack);
    return NextResponse.json({ 
      error: 'PDF 解析失败: ' + (error?.message || '未知错误'),
    }, { status: 500 });
  }
}
