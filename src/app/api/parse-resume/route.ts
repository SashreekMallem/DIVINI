import { NextRequest, NextResponse } from 'next/server'
const pdfParse = require('pdf-parse')
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            console.error('No file provided')
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        console.log(`Processing file: ${file.name} (${file.type}, ${file.size} bytes)`)

        const buffer = Buffer.from(await file.arrayBuffer())
        let text = ''

        // DOCX Parsing
        if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.endsWith('.docx')
        ) {
            console.log('Parsing mode: DOCX using mammoth')
            try {
                const result = await mammoth.extractRawText({ buffer })
                text = result.value
                if (result.messages?.length) console.warn('Mammoth warnings:', result.messages)
            } catch (docErr: any) {
                console.error('Mammoth Parse Error:', docErr)
                throw new Error('Failed to parse Word document')
            }
        }
        // PDF Parsing (Default fallback)
        else {
            console.log('Parsing mode: PDF using pdf-parse')
            try {
                // Handle potential default export in some bundler environments
                const parseFn = typeof pdfParse === 'function' ? pdfParse : pdfParse.default
                if (typeof parseFn !== 'function') {
                    throw new Error(`pdf-parse library not loaded correctly. Type: ${typeof pdfParse}`)
                }
                const data = await parseFn(buffer)
                text = data.text
            } catch (pdfErr: any) {
                console.error('PDF Parse Error:', pdfErr)
                throw new Error('Failed to parse PDF file. It might be password protected or corrupted.')
            }
        }

        if (!text || text.trim().length === 0) {
            console.warn('Extracted text is empty')
            return NextResponse.json({ error: 'Could not extract any text from this file.' }, { status: 400 })
        }

        return NextResponse.json({
            text: text.trim(),
            fileType: file.type
        })
    } catch (error: any) {
        console.error('Resume Parse API Fatal Error:', error)
        return NextResponse.json({ error: error.message || 'Server failed to parse file' }, { status: 500 })
    }
}
