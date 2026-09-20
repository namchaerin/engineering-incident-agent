import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DocumentsService } from '../documents/documents.service.js';

@Injectable()
export class RagService {
  private readonly openai: OpenAI;

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async ask(question: string) {
    const results = await this.documentsService.search(question, 3);

    const context = results
      .map(
        (result, index) => `
[Source ${index + 1}]
Document: ${result.title}
File: ${result.fileName}

${result.content}
`,
      )
      .join('\n');

    const response = await this.openai.responses.create({
      model: 'gpt-5-mini',
      instructions: `
You are an engineering incident assistant.

Answer the user's question using only the provided context.

Rules:
- Do not invent information that is not in the context.
- If the context is insufficient, say that the available documents do not contain enough information.
- Explain technical causes and actions clearly.
- Cite relevant sources using [Source N].
`,
      input: `
Context:
${context}

Question:
${question}
`,
    });

    return {
      answer: response.output_text,
      sources: results.map((result, index) => ({
        source: index + 1,
        title: result.title,
        fileName: result.fileName,
        distance: result.distance,
      })),
    };
  }
}
