import { Injectable } from '@nestjs/common';
import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async findAll() {
    return this.prisma.document.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  async importDocuments() {
    const documentsPath = join(process.cwd(), '../../data/documents');

    const fileNames = await readdir(documentsPath);

    const markdownFiles = fileNames.filter((fileName) =>
      fileName.endsWith('.md'),
    );

    const results = [];

    for (const fileName of markdownFiles) {
      const filePath = join(documentsPath, fileName);
      const content = await readFile(filePath, 'utf-8');

      const title = this.extractTitle(content, fileName);

      const document = await this.prisma.document.upsert({
        where: {
          fileName,
        },
        update: {
          title,
          content,
        },
        create: {
          title,
          fileName,
          content,
        },
      });

      results.push(document);
    }

    return results;
  }

  private extractTitle(content: string, fileName: string) {
    const firstLine = content.split('\n').find((line) => line.startsWith('# '));

    if (firstLine) {
      return firstLine.replace('# ', '').trim();
    }

    return basename(fileName, '.md');
  }

  async createChunks() {
    const documents = await this.prisma.document.findMany();

    const results = [];

    for (const document of documents) {
      const chunks = this.splitIntoChunks(document.content);

      await this.prisma.documentChunk.deleteMany({
        where: {
          documentId: document.id,
        },
      });

      for (let index = 0; index < chunks.length; index++) {
        const chunk = await this.prisma.documentChunk.create({
          data: {
            documentId: document.id,
            chunkIndex: index,
            content: chunks[index],
          },
        });

        results.push(chunk);
      }
    }

    return results;
  }

  private splitIntoChunks(content: string): string[] {
    const lines = content.split('\n');

    const chunks: string[] = [];
    let currentChunk: string[] = [];

    const flushChunk = () => {
      const chunk = currentChunk.join('\n').trim();

      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      currentChunk = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();

      // H1은 Document title 역할이므로 chunk에서 제외
      if (/^# /.test(trimmed)) {
        continue;
      }

      // H2부터 새로운 의미 단위 시작
      if (/^## /.test(trimmed)) {
        flushChunk();
      }

      currentChunk.push(line);
    }

    flushChunk();

    return chunks;
  }

  async getIncident(incidentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        fileName: {
          contains: 'incident',
          mode: 'insensitive',
        },
        OR: [
          {
            title: {
              contains: incidentId,
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: incidentId,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    return document;
  }

  async generateEmbeddings() {
    const chunks = await this.prisma.documentChunk.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    const results = [];

    for (const chunk of chunks) {
      const embedding = await this.embeddingsService.embed(chunk.content);

      const vector = `[${embedding.join(',')}]`;

      await this.prisma.$executeRaw`
      UPDATE "DocumentChunk"
      SET "embedding" = ${vector}::vector
      WHERE "id" = ${chunk.id}
    `;

      results.push({
        chunkId: chunk.id,
        embeddingLength: embedding.length,
      });
    }

    return results;
  }

  async search(query: string, limit = 3) {
    const queryEmbedding = await this.embeddingsService.embed(query);
    const vector = `[${queryEmbedding.join(',')}]`;

    return this.prisma.$queryRaw<
      Array<{
        id: number;
        documentId: number;
        chunkIndex: number;
        content: string;
        title: string;
        fileName: string;
        distance: number;
      }>
    >`
    SELECT
      dc."id",
      dc."documentId",
      dc."chunkIndex",
      dc."content",
      d."title",
      d."fileName",
      dc."embedding" <=> ${vector}::vector AS "distance"
    FROM "DocumentChunk" dc
    JOIN "Document" d
      ON d."id" = dc."documentId"
    WHERE dc."embedding" IS NOT NULL
    ORDER BY dc."embedding" <=> ${vector}::vector
    LIMIT ${limit}
  `;
  }
}
