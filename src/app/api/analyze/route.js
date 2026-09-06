import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { repositoryProvider } from '@/../lib/github/RepositoryProvider';
import { scrapeLiveUrl } from '@/../lib/scraper/liveUrl';
import { analyzeProjectData } from '@/../lib/gemini/projectUnderstanding';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { url, github } = await request.json();

    if (!url || !github) {
      return NextResponse.json({ error: 'URL and GitHub repository are required' }, { status: 400 });
    }

    // Create project record
    const project = await prisma.project.create({
      data: { url, githubUrl: github }
    });

    // 1. Scrape Live URL
    const liveData = await scrapeLiveUrl(url);

    // 2. Fetch and analyze GitHub repo
    const repoInfo = await repositoryProvider.fetchRepository(github);
    const files = await repositoryProvider.getFiles(repoInfo.repoPath);
    const history = await repositoryProvider.getHistory(repoInfo.repoPath);

    // Save project source info
    await prisma.projectSource.create({
      data: {
        projectId: project.id,
        fileCount: files.length,
        hotspots: JSON.stringify(files.slice(0, 10)), // Simplification for MVP
      }
    });

    // 3. Gemini Project Understanding
    const profileData = await analyzeProjectData(liveData, files, history);

    // Save project profile
    await prisma.projectProfile.create({
      data: {
        projectId: project.id,
        title: profileData.title || 'Unknown Project',
        type: profileData.type || 'Unknown Type',
        purpose: profileData.purpose || '',
        mainFeatures: JSON.stringify(profileData.mainFeatures || []),
        aiComponents: JSON.stringify(profileData.aiComponents || []),
        tools: JSON.stringify(profileData.tools || []),
        externalServices: JSON.stringify(profileData.externalServices || [])
      }
    });

    return NextResponse.json({ projectId: project.id, success: true });
  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
