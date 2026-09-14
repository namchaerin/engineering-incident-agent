import { Injectable } from '@nestjs/common';
import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private splitIntoChunks(content: string) {
    return content
      .split(/\n\s*\n/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);
  }

}
