import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 });
    }

    console.log('[OCR API] 收到文件:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    // 读取文件为 base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log('[OCR API] 开始 OCR 识别...');

    const result = await Tesseract.recognize(dataUrl, 'chi_sim+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR API] 识别进度: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text.trim();
    const confidence = result.data.confidence;

    console.log('[OCR API] OCR 识别完成:', {
      textLength: text.length,
      confidence: confidence,
      textPreview: text.slice(0, 100),
    });

    if (!text || text.length < 10) {
      return NextResponse.json({
        text: '',
        warning: 'OCR 识别结果为空，可能是因为图片质量过低或文字不可识别',
        confidence,
      });
    }

    return NextResponse.json({
      text,
      confidence,
      debug: {
        fileName: file.name,
        fileSize: file.size,
        ocrConfidence: confidence,
      },
    });

  } catch (error: any) {
    console.error('[OCR API] 失败:', error);
    return NextResponse.json({
      error: 'OCR 识别失败: ' + (error?.message || '未知错误'),
    }, { status: 500 });
  }
}
