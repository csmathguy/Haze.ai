import type { Skill, PrismaClient } from "@taxes/db";

export interface SkillCreateInput {
  name: string;
  version?: string;
  description?: string;
  category?: string;
  inputSchema?: string;
  outputSchema?: string;
  executionMode?: string;
  permissions?: string;
}

export interface SkillUpdateInput {
  name?: string;
  version?: string;
  description?: string;
  category?: string;
  inputSchema?: string;
  outputSchema?: string;
  executionMode?: string;
  permissions?: string;
  status?: string;
}

export async function listSkills(prisma: PrismaClient): Promise<Skill[]> {
  return prisma.skill.findMany({
    where: {
      status: "active"
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

export async function getSkill(prisma: PrismaClient, id: string): Promise<Skill | null> {
  return prisma.skill.findUnique({
    where: { id }
  });
}

export async function createSkill(prisma: PrismaClient, data: SkillCreateInput): Promise<Skill> {
  return prisma.skill.create({
    data: {
      name: data.name,
      version: data.version || "1.0.0",
      description: data.description,
      category: data.category,
      inputSchema: data.inputSchema,
      outputSchema: data.outputSchema,
      executionMode: data.executionMode || "agent",
      permissions: data.permissions,
      status: "active"
    }
  });
}

export async function updateSkill(
  prisma: PrismaClient,
  id: string,
  data: SkillUpdateInput
): Promise<Skill> {
  return prisma.skill.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.version !== undefined ? { version: data.version } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.inputSchema !== undefined ? { inputSchema: data.inputSchema } : {}),
      ...(data.outputSchema !== undefined ? { outputSchema: data.outputSchema } : {}),
      ...(data.executionMode !== undefined ? { executionMode: data.executionMode } : {}),
      ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
      ...(data.status !== undefined ? { status: data.status } : {})
    }
  });
}
