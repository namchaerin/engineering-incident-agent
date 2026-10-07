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

    let response = await this.openai.responses.create({
      model: 'gpt-5-mini',
      input: question,
      tools,
      instructions: `
      You are an engineering incident response assistant.
      
      Your available capabilities are limited to:
      - search_documents: Search internal engineering documents such as
        incident reports, runbooks, and architecture documents.
      - get_incident: Retrieve a specific incident report by incident ID.
      
      Use get_incident when the user provides a specific incident ID.
      Use search_documents when internal engineering knowledge is needed.
      
      For general questions that do not require internal information,
      answer directly without using tools.
      
      Important rules:
      - Answer internal engineering questions using only information returned by tools.
      - Do not invent facts that are not present in tool results.
      - Do not claim that you can access systems or capabilities that are not
        provided as tools.
      - Do not claim that you can access logs, metrics, dashboards, Grafana,
        monitoring systems, databases, or external services.
      - Do not offer to perform actions that the available tools cannot perform.
      - If the available documents do not contain the requested information,
        clearly say that the information cannot be confirmed from the available documents.
      - For questions about internal incidents, systems, runbooks, or architecture,
        do not supplement tool results with general engineering knowledge.
      - Do not provide troubleshooting steps, commands, monitoring suggestions,
        metric queries, or operational recommendations unless they are explicitly
        present in the retrieved documents.
      - When requested information is missing, stop after stating that it cannot
        be confirmed from the available documents.
      `,
    });

    const toolCalls = [];
    const sources = [];

    const maxIterations = 5;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const functionCalls = response.output.filter(
        (item) => item.type === 'function_call',
      );

      // 더 이상 Tool 호출이 없으면 최종 답변
      if (functionCalls.length === 0) {
        return {
          answer: response.output_text,
          toolCalls,
          sources,
        };
      }

      const toolOutputs = [];

      for (const functionCall of functionCalls) {
        const args = JSON.parse(functionCall.arguments) as Record<
          string,
          unknown
        >;

        const toolResult = await this.executeTool(functionCall.name, args);

        toolCalls.push({
          name: functionCall.name,
          arguments: args,
        });

        sources.push(...toolResult.sources);

        toolOutputs.push({
          type: 'function_call_output' as const,
          call_id: functionCall.call_id,
          output: JSON.stringify(toolResult.output),
        });
      }

      response = await this.openai.responses.create({
        model: 'gpt-5-mini',
        previous_response_id: response.id,
        input: toolOutputs,
        tools,
        instructions: `
        Continue solving the user's request.
        
        Use additional tools only if they can provide information that has not
        already been obtained.
        
        Answer internal engineering questions using only information returned by tools.
        
        Do not invent facts that are not present in tool results.
        Do not claim access to logs, metrics, dashboards, Grafana,
        monitoring systems, databases, or external services.
        Do not offer to perform actions that the available tools cannot perform.
        
        If the available documents are insufficient,
        clearly say that the requested information cannot be confirmed
        from the available documents.
        
        Important rules:
        - Do not supplement internal engineering answers with general knowledge.
        - Do not provide troubleshooting steps, commands, monitoring suggestions,
          metric queries, or recommendations unless they are explicitly present
          in the tool results.
        - When requested information is missing, simply state that it cannot
          be confirmed from the available documents.
        `,
      });
    }

    return {
      answer: 'Maximum agent iterations reached before completing the request.',
      toolCalls,
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
