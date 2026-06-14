import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const candidateAiRootDirs = [
  process.env.AI_ASSET_DIR ? path.resolve(process.env.AI_ASSET_DIR) : null,
  path.resolve(process.cwd(), 'src', 'ai'),
  path.resolve(process.cwd(), 'dist', 'ai'),
].filter(Boolean) as string[];

export type PromptBundle = {
  systemPrompt: string;
  outputInstructions: string;
  resources: Array<{ name: string; content: string }>;
};

const readUtf8 = async (filePath: string) => {
  return (await readFile(filePath, 'utf8')).trim();
};

const findAiRootDir = async () => {
  for (const aiRootDir of candidateAiRootDirs) {
    try {
      await readUtf8(path.join(aiRootDir, 'prompts', 'system.prompt.md'));
      await readUtf8(path.join(aiRootDir, 'prompts', 'output.instructions.md'));
      await readdir(path.join(aiRootDir, 'resources'));
      return aiRootDir;
    } catch {
      // Try the next candidate; src/ai remains the primary manual replacement location.
    }
  }

  throw new Error('AI prompt/resource files are missing. Expected src/ai/prompts and src/ai/resources.');
};

export const loadPromptBundle = async (): Promise<PromptBundle> => {
  const aiRootDir = await findAiRootDir();
  const promptsDir = path.join(aiRootDir, 'prompts');
  const resourcesDir = path.join(aiRootDir, 'resources');

  const [systemPrompt, outputInstructions, resourceNames] = await Promise.all([
    readUtf8(path.join(promptsDir, 'system.prompt.md')),
    readUtf8(path.join(promptsDir, 'output.instructions.md')),
    readdir(resourcesDir),
  ]);

  const resources = await Promise.all(
    resourceNames
      .filter((name) => name.endsWith('.md'))
      .sort()
      .map(async (name) => ({
        name,
        content: await readUtf8(path.join(resourcesDir, name)),
      }))
  );

  return {
    systemPrompt,
    outputInstructions,
    resources,
  };
};
