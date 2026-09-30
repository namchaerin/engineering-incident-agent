import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DocumentsService } from '../documents/documents.service.js';

@Injectable()
export class AgentService {
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly documentsService: DocumentsService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async ask(question: string) {
    const tools: OpenAI.Responses.Tool[] = [
      {
        type: 'function',
        name: 'search_documents',
        description:
          'Search engineering incident reports, runbooks, and architecture documents.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query used to find relevant documents.',
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
        strict: true,
      },
      {
        type: 'function',
        name: 'get_incident',
        description:
          'Retrieve a specific incident report when the user provides an incident ID such as INC-2026-001.',
        parameters: {
          type: 'object',
          properties: {
            incidentId: {
              type: 'string',
              description: 'Incident ID such as INC-2026-001.',
            },
          },
          required: ['incidentId'],
          additionalProperties: false,
        },
        strict: true,
      },
    ];

    const firstResponse = await this.openai.responses.create({
      model: 'gpt-5-mini',
      instructions: `
      You are an engineering incident assistant.
      
      Available tools:
      
      - search_documents:
        Use for semantic questions about engineering knowledge,
        troubleshooting, architecture, previous incidents, and runbooks.
      
      - get_incident:
        Use when the user asks for a specific incident by incident ID.
      
      Choose the most appropriate tool for the request.
      
      Do not invent information.
      Do not claim access to tools or systems that are not actually provided.
`,
      input: question,
      tools,
    });

    const functionCall = firstResponse.output.find(
      (item) => item.type === 'function_call',
    );

    if (!functionCall || functionCall.type !== 'function_call') {
      return {
        answer: firstResponse.output_text,
        toolCalls: [],
      };
    }

    const args = JSON.parse(functionCall.arguments);

    let toolOutput: unknown;
    let sources: unknown[] = [];

    if (functionCall.name === 'search_documents') {
      const searchResults = await this.documentsService.search(args.query, 3);

      toolOutput = searchResults.map((result) => ({
        title: result.title,
        fileName: result.fileName,
        content: result.content,
        distance: result.distance,
      }));

      sources = searchResults.map((result) => ({
        title: result.title,
        fileName: result.fileName,
        distance: result.distance,
      }));
    }

    if (functionCall.name === 'get_incident') {
      const incident = await this.documentsService.getIncident(args.incidentId);

      toolOutput = incident ?? {
        error: `Incident ${args.incidentId} was not found.`,
      };

      if (incident) {
        sources = [
          {
            title: incident.title,
            fileName: incident.fileName,
          },
        ];
      }
    }

    const finalResponse = await this.openai.responses.create({
      model: 'gpt-5-mini',
      instructions: `
      You are an engineering incident assistant.
      
      Answer using only information returned by the tools.
      Do not invent information.
      If the requested information is not available, say so.
      Do not claim that you can access tools or systems that are not provided.
      `,
      previous_response_id: firstResponse.id,
      input: [
        {
          type: 'function_call_output',
          call_id: functionCall.call_id,
          output: JSON.stringify(toolOutput),
        },
      ],
      tools,
    });

    return {
      answer: finalResponse.output_text,
      toolCalls: [
        {
          name: functionCall.name,
          arguments: args,
        },
      ],
      sources,
    };
  }

  private async executeTool(name: string, args: Record<string, unknown>) {
    if (name === 'search_documents') {
      const query = args.query as string;

      const results = await this.documentsService.search(query, 3);

      return {
        output: results.map((result) => ({
          title: result.title,
          fileName: result.fileName,
          content: result.content,
          distance: result.distance,
        })),
        sources: results.map((result) => ({
          title: result.title,
          fileName: result.fileName,
          distance: result.distance,
        })),
      };
    }

    if (name === 'get_incident') {
      const incidentId = args.incidentId as string;

      const incident = await this.documentsService.getIncident(incidentId);

      return {
        output: incident ?? {
          error: `Incident ${incidentId} was not found.`,
        },
        sources: incident
          ? [
              {
                title: incident.title,
                fileName: incident.fileName,
              },
            ]
          : [],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  }
}
