import type { Message, TokenUsage } from '../../types/message.ts';
import { COMPACT_THRESHOLD, MAX_CONVERSATION_MESSAGES } from '../../constants/common.ts';
import { summarizeConversation } from './summary.ts';
import { truncateMessages } from './truncate.ts';
import { BudgetManager } from './budget.ts';
import { selectCompactionStrategy, type CompactionStrategy } from './strategies.ts';

export interface CompactionOptions {
  maxMessages?: number;
  targetTokens?: number;
  preserveSystemMessages?: boolean;
  preserveRecentMessages?: number;
  strategy?: CompactionStrategy;
}

export interface CompactionResult {
  messages: Message[];
  removedCount: number;
  summary: string;
  tokenSavings: number;
}

export class ConversationCompactor {
  private budgetManager: BudgetManager;

  constructor(budgetManager?: BudgetManager) {
    this.budgetManager = budgetManager ?? new BudgetManager();
  }

  compact(messages: Message[], options: CompactionOptions = {}): CompactionResult {
    if (messages.length <= COMPACT_THRESHOLD) {
      return {
        messages,
        removedCount: 0,
        summary: '',
        tokenSavings: 0,
      };
    }

    const strategy = options.strategy ?? selectCompactionStrategy(messages);
    const maxMessages = options.maxMessages ?? MAX_CONVERSATION_MESSAGES;
    const preserveRecent = options.preserveRecentMessages ?? 10;
    const preserveSystem = options.preserveSystemMessages ?? true;

    const systemMessages = preserveSystem
      ? messages.filter((m) => m.type === 'system')
      : [];

    const nonSystemMessages = messages.filter((m) => m.type !== 'system');

    const recentMessages = nonSystemMessages.slice(-preserveRecent);
    const olderMessages = nonSystemMessages.slice(0, -preserveRecent);

    const originalCount = nonSystemMessages.length;

    switch (strategy) {
      case 'summarize': {
        const summary = summarizeConversation(olderMessages);
        const summaryMessage: Message = {
          type: 'system',
          role: 'system',
          content: summary,
          subtype: 'compact',
          timestamp: Date.now(),
        };

        const result = [...systemMessages, summaryMessage, ...recentMessages];

        if (result.length > maxMessages) {
          const truncated = truncateMessages(result, maxMessages, { preserveSystem });
          return {
            messages: truncated,
            removedCount: originalCount - truncated.length + 1,
            summary,
            tokenSavings: this.estimateTokenSavings(olderMessages.length),
          };
        }

        return {
          messages: result,
          removedCount: originalCount - recentMessages.length,
          summary,
          tokenSavings: this.estimateTokenSavings(originalCount - recentMessages.length),
        };
      }

      case 'truncate': {
        const result = truncateMessages(messages, maxMessages, {
          preserveSystem,
          preserveRecent: preserveRecent,
        });

        return {
          messages: result,
          removedCount: messages.length - result.length,
          summary: '',
          tokenSavings: this.estimateTokenSavings(messages.length - result.length),
        };
      }

      case 'hybrid':
      default: {
        const summary = summarizeConversation(olderMessages);
        const summaryMessage: Message = {
          type: 'system',
          role: 'system',
          content: summary,
          subtype: 'compact',
          timestamp: Date.now(),
        };

        const truncated = truncateMessages(
          [...systemMessages, summaryMessage, ...recentMessages],
          maxMessages,
          { preserveSystem: true },
        );

        return {
          messages: truncated,
          removedCount: originalCount - truncated.length + 1,
          summary,
          tokenSavings: this.estimateTokenSavings(originalCount - truncated.length),
        };
      }
    }
  }

  shouldCompact(messages: Message[]): boolean {
    return messages.length > COMPACT_THRESHOLD;
  }

  getBudgetManager(): BudgetManager {
    return this.budgetManager;
  }

  private estimateTokenSavings(messagesRemoved: number): number {
    return messagesRemoved * 200;
  }
}
