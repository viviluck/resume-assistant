import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 });
    }

    console.log('[DOCX解析API] 收到文件:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    const text = result.value.trim();

    console.log('[DOCX解析API] 提取文本长度:', text.length);
    console.log('[DOCX解析API] 文本预览:', text.slice(0, 100));

    if (!text || text.length < 10) {
      return NextResponse.json({
        text: '',
        warning: 'Word 文档提取结果为空',
      });
    }

    return NextResponse.json({
      text,
      debug: {
        fileName: file.name,
        fileSize: file.size,
        extractedLength: text.length,
      },
    });

  } catch (error: any) {
    console.error('[DOCX解析API] 失败:', error);
    return NextResponse.json({
      error: 'Word 文档解析失败: ' + (error?.message || '未知错误'),
    }, { status: 500 });
  }
}
