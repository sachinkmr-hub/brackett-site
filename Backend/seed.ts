import * as dotenv from 'dotenv';
dotenv.config();

import { db } from './src/db/index.js';
import { users, workspaces, workspaceMembers, questions } from './src/db/schema.js';
import { hashPassword } from './src/utils/hash.js';

async function seed() {
  console.log('🌱 Starting DB seed...');

  try {
    const passwordHash = await hashPassword('password123');

    // 1. Create User
    const [user] = await db.insert(users).values({
      email: 'founder@brakett.test',
      passwordHash,
      name: 'Brakett Founder'
    }).returning();
    console.log(`✅ Created User: ${user.email}`);

    // 2. Create Workspace
    const [workspace] = await db.insert(workspaces).values({
      name: 'Acme Corp',
      slug: 'acme-corp',
      createdByUserId: user.id
    }).returning();
    console.log(`✅ Created Workspace: ${workspace.name}`);

    // 3. Add to Workspace Members
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner'
    });
    console.log(`✅ Added User to Workspace Members`);

    // 4. Create Sample Question
    const [question] = await db.insert(questions).values({
      workspaceId: workspace.id,
      createdByUserId: user.id,
      title: 'How do we track user onboarding effectively?',
      longDescription: 'We need a solid way to know when users drop off during the website onboarding flow.',
      category: 'Product',
      priority: 'high',
      status: 'open'
    }).returning();
    console.log(`✅ Created Question: ${question.title}`);

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
