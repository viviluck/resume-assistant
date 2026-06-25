import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = await pdf(arrayBuffer);
    
    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error('[PDF解析API] 失败:', error);
    return NextResponse.json({ error: 'PDF 解析失败' }, { status: 500 });
  }
}