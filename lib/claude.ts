import Anthropic from '@anthropic-ai/sdk';
import { AnimationState } from './types';

export async function getPetResponse(
  userMessage: string,
  petName: string,
  apiKey: string
): Promise<{ reply: string; animationState: AnimationState }> {
  const client = new Anthropic({ apiKey });

  const systemPrompt = `你是一只可爱的宠物，名字叫 ${petName}。
用简短、可爱、符合宠物性格的方式回应主人（1-2句话）。
同时根据这句回复想表达的动作和情绪，选择最合适的动画状态。

必须以 JSON 格式回复：{"reply": "...", "animationState": "..."}

animationState 选项：
- idle: 平静、普通回复、撒娇发呆
- happy: 开心、满足、被夸奖
- excited: 非常兴奋、想玩、想跑、强烈期待
- sad: 难过、委屈、求安慰、认错
- wave: 打招呼、回应呼唤、告别、欢迎主人
- headbang: 跳舞、摇摆、特别 high、搞怪庆祝

优先让 animationState 和 reply 的语气动作一致，不要随机选择。`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') throw new Error('No text response from Claude');

  const jsonMatch = textContent.text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Could not extract JSON from Claude response`);

  let parsed: { reply: string; animationState: string };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse Claude JSON response`);
  }

  const validStates: AnimationState[] = ['idle', 'happy', 'excited', 'sad', 'wave', 'headbang'];
  const animationState: AnimationState = validStates.includes(parsed.animationState as AnimationState)
    ? (parsed.animationState as AnimationState)
    : 'idle';

  return { reply: parsed.reply, animationState };
}
