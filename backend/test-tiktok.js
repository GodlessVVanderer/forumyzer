// Test script for TikTok integration
const forumizeService = require('./services/forumize');

async function testTikTok() {
  console.log('Testing Forumyzer with TikTok video...\n');

  // Test with the provided TikTok URL
  const tiktokUrl = 'https://www.tiktok.com/@chrisandfinck/video/7456431012588047662';
  const videoId = '7456431012588047662';

  try {
    console.log('Test 1: Using full TikTok URL');
    console.log('URL:', tiktokUrl);
    const result1 = await forumizeService(tiktokUrl);
    console.log('✓ Success!');
    console.log('Platform detected:', result1.platform);
    console.log('Total comments:', result1.stats.totalComments);
    console.log('Stats:', JSON.stringify(result1.stats, null, 2));
    console.log('Sample comments:');
    result1.threads.slice(0, 3).forEach((thread, i) => {
      console.log(`  ${i + 1}. [${thread.category}] ${thread.author}: ${thread.text}`);
    });
    console.log('');

    console.log('Test 2: Using video ID only');
    console.log('Video ID:', videoId);
    const result2 = await forumizeService(videoId);
    console.log('✓ Success!');
    console.log('Platform detected:', result2.platform);
    console.log('Total comments:', result2.stats.totalComments);
    console.log('');

    console.log('Test 3: Explicitly specifying platform');
    const result3 = await forumizeService(videoId, 50, 'tiktok');
    console.log('✓ Success!');
    console.log('Platform:', result3.platform);
    console.log('Total comments:', result3.stats.totalComments);
    console.log('');

    console.log('=== All tests passed! ===');
    console.log('');
    console.log('Note: Currently using mock data for TikTok comments.');
    console.log('To use real TikTok data, set one of these environment variables:');
    console.log('  - APIFY_API_TOKEN: For using Apify TikTok Comments Scraper');
    console.log('  - RAPIDAPI_KEY: For using RapidAPI TikTok endpoints');

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testTikTok();
